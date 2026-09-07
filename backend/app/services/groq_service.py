import json
import re
from typing import Any

from groq import AsyncGroq

from app.config import settings


MODEL = "openai/gpt-oss-20b"


class GroqService:
    def __init__(self) -> None:
        self.client = AsyncGroq(api_key=settings.groq_api_key)

    async def _complete(self, **kwargs: Any) -> Any:
        return await self.client.chat.completions.create(
            model=MODEL,
            **kwargs,
        )

    async def classify(self, transcript_chunk: str) -> dict[str, Any]:
        response = await self._complete(
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Classify the transcript for sales coaching. Return ONLY valid JSON "
                        "with exactly these fields: trigger (boolean), query (string), "
                        "category (string or null). Set trigger true only for moments "
                        "actually worth coaching: a pricing objection, stall or hesitation, "
                        "competitor mention, security or data concern, or 'let me think "
                        "about it'. Do not trigger for small talk or filler. category must "
                        "be one of objection, pricing, competitor, deal_notes, or null. "
                        "Use a short natural-language search phrase in query when triggered; "
                        "otherwise query must be an empty string."
                    ),
                },
                {"role": "user", "content": transcript_chunk},
            ],
            response_format={"type": "json_object"},
        )
        content = response.choices[0].message.content or "{}"
        return self._parse_classification(content)

    async def phrase_suggestion(
        self,
        retrieved_text: str,
        transcript_chunk: str,
    ) -> str:
        response = await self._complete(
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Give ONE short, natural-sounding coaching line under 20 words "
                        "that a salesperson can glance at mid-call. Make it an actionable "
                        "prompt, not a summary. Return plain text only."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Live transcript:\n{transcript_chunk}\n\n"
                        f"Relevant coaching knowledge:\n{retrieved_text}"
                    ),
                },
            ],
        )
        return (response.choices[0].message.content or "").strip()

    @staticmethod
    def _parse_classification(content: str) -> dict[str, Any]:
        cleaned = content.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", cleaned).strip()

        try:
            parsed = json.loads(cleaned)
        except json.JSONDecodeError:
            match = re.search(r"\{.*\}", cleaned, re.DOTALL)
            if not match:
                raise ValueError("Groq returned malformed classification JSON")
            parsed = json.loads(match.group(0))

        if not isinstance(parsed, dict):
            raise ValueError("Groq classification must be a JSON object")

        category = parsed.get("category")
        valid_categories = {"objection", "pricing", "competitor", "deal_notes"}
        return {
            "trigger": bool(parsed.get("trigger", False)),
            "query": str(parsed.get("query", "")),
            "category": category if category in valid_categories else None,
        }