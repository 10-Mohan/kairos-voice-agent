import logging
import time

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.routes.search import moss_service
from app.services.groq_service import GroqService

logger = logging.getLogger(__name__)
router = APIRouter()
groq_service = GroqService()


@router.websocket("/ws/coach")
async def coach(websocket: WebSocket) -> None:
    await websocket.accept()
    try:
        while True:
            transcript_chunk = await websocket.receive_text()
            start_timestamp = time.perf_counter()
            try:
                classify_start = time.perf_counter()
                classification = await groq_service.classify(transcript_chunk)
                classify_ms = (time.perf_counter() - classify_start) * 1000
                if not classification["trigger"]:
                    continue

                moss_start = time.perf_counter()
                results = await moss_service.search(
                    classification["query"],
                    category=classification["category"],
                    top_k=1,
                )
                moss_ms = (time.perf_counter() - moss_start) * 1000
                if not results:
                    logger.warning("No Moss result for transcript chunk: %s", transcript_chunk)
                    continue

                result = results[0]
                phrase_start = time.perf_counter()
                suggestion = await groq_service.phrase_suggestion(
                    result["text"],
                    transcript_chunk,
                )
                phrase_ms = (time.perf_counter() - phrase_start) * 1000
                total_ms = (time.perf_counter() - start_timestamp) * 1000
                timing_ms = {
                    "classify": round(classify_ms, 2),
                    "moss_search": round(moss_ms, 2),
                    "phrase": round(phrase_ms, 2),
                    "total": round(total_ms, 2),
                }
                print(
                    f"Coach timing category={result['metadata'].get('category', '')} "
                    f"timing_ms={timing_ms}",
                    flush=True,
                )
                await websocket.send_json(
                    {
                        "suggestion": suggestion,
                        "source_category": result["metadata"].get(
                            "category",
                            classification["category"] or "",
                        ),
                        "timing_ms": timing_ms,
                    }
                )
            except WebSocketDisconnect:
                raise
            except Exception:
                logger.exception("Coach pipeline failed for transcript chunk")
    except WebSocketDisconnect:
        logger.info("Coach WebSocket disconnected")