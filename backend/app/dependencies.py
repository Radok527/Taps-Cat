from typing import AsyncGenerator

from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.redis_client import get_redis as _get_redis


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session


def get_redis() -> Redis:
    return _get_redis()
