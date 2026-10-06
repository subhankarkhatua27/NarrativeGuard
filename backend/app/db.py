import os
import asyncpg

def db_url():
    return os.environ["DATABASE_URL"].replace("postgresql+asyncpg://", "postgresql://")

pool: asyncpg.Pool | None = None

async def init_pool():
    global pool
    pool = await asyncpg.create_pool(
        db_url(), min_size=1, max_size=5, statement_cache_size=0
    )

async def close_pool():
    if pool:
        await pool.close()
        
def get_pool() -> asyncpg.Pool:
    if pool is None:
        raise RuntimeError("DB pool not initialised (lifespan did not run)")
    return pool