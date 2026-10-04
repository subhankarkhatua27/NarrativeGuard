import asyncio, os, asyncpg
from dotenv import load_dotenv

load_dotenv()
url = os.environ["DATABASE_URL"].replace("postgresql+asyncpg://", "postgresql://")

async def main():
    conn = await asyncpg.connect(url, statement_cache_size=0)
    print(await conn.fetchval("select 1"))
    await conn.close()

asyncio.run(main())