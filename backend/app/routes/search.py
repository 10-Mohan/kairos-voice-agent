from fastapi import APIRouter, Query

from app.services.moss_service import MossService

router = APIRouter()
moss_service = MossService()


@router.get("/search")
async def search(
    q: str = Query(..., min_length=1),
    category: str | None = None,
    top_k: int = Query(3, ge=1),
) -> dict[str, list[dict]]:
    results = await moss_service.search(q, top_k=top_k, category=category)
    return {"results": results}