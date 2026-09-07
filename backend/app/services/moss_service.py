import asyncio
import json
from pathlib import Path
from threading import Lock
from typing import Any

from moss import DocumentInfo, MossClient, QueryOptions
from sentence_transformers import SentenceTransformer

from app.config import settings


_embedding_model: SentenceTransformer | None = None
_embedding_model_lock = Lock()


def _get_embedding_model() -> SentenceTransformer:
    global _embedding_model
    if _embedding_model is None:
        with _embedding_model_lock:
            if _embedding_model is None:
                _embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
    return _embedding_model


class MossService:
    def __init__(self) -> None:
        self.client = MossClient(
            project_id=settings.moss_project_id,
            project_key=settings.moss_project_key,
        )

    async def _embed(self, texts: list[str]) -> list[list[float]]:
        model = await asyncio.to_thread(_get_embedding_model)
        embeddings = await asyncio.to_thread(
            model.encode,
            texts,
            normalize_embeddings=True,
        )
        return embeddings.tolist()

    async def build_index(self) -> int:
        data_dir = Path(__file__).resolve().parents[3] / "data"
        entries: list[dict[str, Any]] = []

        for data_file in (
            "objections.json",
            "pricing.json",
            "battlecards.json",
            "deal_notes.json",
        ):
            file_entries = json.loads(
                (data_dir / data_file).read_text(encoding="utf-8")
            )
            entries.extend(file_entries)

        embeddings = await self._embed([entry["text"] for entry in entries])
        documents = [
            DocumentInfo(
                id=entry["id"],
                text=entry["text"],
                metadata=entry["metadata"],
                embedding=embedding,
            )
            for entry, embedding in zip(entries, embeddings)
        ]

        await self.client.delete_index("sales-coach")
        await self.client.create_index("sales-coach", documents)
        return len(documents)

    async def load(self) -> None:
        await self.client.load_index("sales-coach")

    async def search(
        self,
        query: str,
        top_k: int = 3,
        category: str | None = None,
    ) -> list[dict[str, Any]]:
        query_embedding = (await self._embed([query]))[0]
        query_options: dict[str, Any] = {
            "embedding": query_embedding,
            "top_k": top_k,
            "alpha": 0.7,
        }
        if category:
            query_options["filter"] = {
                "field": "category",
                "condition": {"$eq": category},
            }

        matches = await self.client.query(
            "sales-coach",
            query,
            QueryOptions(**query_options),
        )
        return [
            {
                "id": match.id,
                "text": match.text,
                "score": match.score,
                "metadata": match.metadata,
            }
            for match in matches.docs
        ]