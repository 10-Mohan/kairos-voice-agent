import logging
from time import perf_counter

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.coach_ws import router as coach_router
from app.routes.search import moss_service, router as search_router
from app.config import settings

logger = logging.getLogger("uvicorn.error")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin, "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(search_router)
app.include_router(coach_router)


@app.on_event("startup")
async def load_moss_index() -> None:
    try:
        await moss_service.load()
    except Exception:
        logger.exception(
            "Moss index could not be loaded; starting in degraded mode. "
            "Coaching retrieval will be unavailable until Moss access is restored."
        )
        return

    warmup_started = perf_counter()
    await moss_service._embed(["warmup"])
    warmup_ms = (perf_counter() - warmup_started) * 1000
    logger.info("Embedding model warmed up in %.0fms", warmup_ms)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)