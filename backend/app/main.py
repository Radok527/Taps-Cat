import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.redis_client import init_redis, close_redis
from app.scheduler import start_scheduler, stop_scheduler
from app.routers import state as state_router
from app.routers import interactions as interactions_router
from app.routers import websocket as websocket_router
from app.routers import chat as chat_router
from app.routers import leaderboard as leaderboard_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting Tami Cat backend…")
    redis = await init_redis()
    start_scheduler(redis)

    # Ensure images directory exists before mounting StaticFiles
    Path(settings.IMAGES_DIR).mkdir(parents=True, exist_ok=True)

    yield

    # Shutdown
    stop_scheduler()
    await close_redis()
    logger.info("Tami Cat backend stopped")


app = FastAPI(title="Tami Cat API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error on %s %s", request.method, request.url)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


app.include_router(state_router.router)
app.include_router(interactions_router.router)
app.include_router(websocket_router.router)
app.include_router(chat_router.router)
app.include_router(leaderboard_router.router)
app.mount("/images", StaticFiles(directory=settings.IMAGES_DIR), name="images")
