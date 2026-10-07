import asyncio
import os
import sys

import asyncpg
import httpx
from dotenv import load_dotenv

load_dotenv()
base = sys.argv[1].rstrip("/")
DB = os.environ["DATABASE_URL"].replace("postgresql+asyncpg://", "postgresql://")
good = {"X-Webhook-Secret": os.environ["WEBHOOK_SHARED_SECRET"]}
c = httpx.Client(timeout=90)


async def db_run(sql, fetch=False):
    conn = await asyncpg.connect(DB, statement_cache_size=0)
    try:
        return await (conn.fetch(sql) if fetch else conn.execute(sql))
    finally:
        await conn.close()


def post(path, body, headers=good):
    return c.post(base + path, json=body, headers=headers)


def check(name, ok, extra=""):
    print(("PASS  " if ok else "FAIL  ") + name, extra)


print("waking server...")
c.get(base + "/health")

rows = asyncio.run(db_run(
    "insert into jobs (input_text, status) "
    "select 'internal test claim', 'running' from generate_series(1, 2) returning id",
    fetch=True,
))
id1, id2 = str(rows[0]["id"]), str(rows[1]["id"])

try:
    ev = {"seq": 1, "stage": "ingest", "status": "done", "detail": "ok"}
    r = post(f"/internal/jobs/{id1}/events", ev)
    check("valid event accepted", r.status_code == 200, str(r.status_code))
    r = post(f"/internal/jobs/{id1}/events", ev)
    check("duplicate event is harmless", r.status_code == 200, str(r.status_code))
    r = post(f"/internal/jobs/{id1}/events", {"seq": 2, "stage": "x", "status": "weird"})
    check("bad status rejected", r.status_code == 422, str(r.status_code))
    r = post(f"/internal/jobs/{id1}/events", {**ev, "seq": 3}, {"X-Webhook-Secret": "wrong"})
    check("wrong secret rejected", r.status_code == 401, str(r.status_code))
    r = post(f"/internal/jobs/{id1}/result", {"summary": "no verdict here"})
    check("result without verdict rejected", r.status_code == 422, str(r.status_code))
    r = post(f"/internal/jobs/{id1}/result", {"verdict": "test", "summary": "internal test", "sources": []})
    check("valid result accepted", r.status_code == 200 and not r.json().get("ignored"), str(r.status_code))
    j = c.get(f"{base}/api/jobs/{id2}").json()
    check("failed job shows failed", j.get("status") == "failed", str(j))
    check("finished job shows done", c.get(f"{base}/api/jobs/{id1}").json().get("status") == "done")
finally:
    asyncio.run(db_run("delete from jobs where input_text = 'internal test claim'"))
    asyncio.run(db_run("delete from verdict_cache where verdict->>'verdict' = 'test'"))
    print("test rows cleaned up")