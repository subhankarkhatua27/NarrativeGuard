import os
import asyncpg
from fastapi import FastAPI
from dotenv import load_dotenv

load_dotenv()
app = FastAPI()

def db_url():
    return os.environ["DATABASE_URL"].replace("postgresql+asyncpg://", "postgresql://")

@app.get("/health")
async def health():
    conn = await asyncpg.connect(db_url(), statement_cache_size=0)
    try:
        await conn.fetchval("select 1")
    finally:
        await conn.close()
    return {"status": "ok"}