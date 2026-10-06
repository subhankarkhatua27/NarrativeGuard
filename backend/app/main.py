import hmac
import json
import os
import uuid
from contextlib import asynccontextmanager

import asyncpg
import httpx
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

load_dotenv()

from db import db_url, init_pool, close_pool   # after load_dotenv
from routers.jobs import router


@asynccontextmanager
async def lifespan(app):
    await init_pool()
    yield
    await close_pool()


app = FastAPI(lifespan=lifespan)
app.include_router(router)

origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


async def connect():
    return await asyncpg.connect(db_url(), statement_cache_size=0)


def check_secret(x_webhook_secret: str = Header(default="")):
    expected = os.getenv("WEBHOOK_SHARED_SECRET", "")
    if not expected or not hmac.compare_digest(x_webhook_secret, expected):
        raise HTTPException(status_code=401, detail="bad secret")


class TestJob(BaseModel):
    text: str = Field(min_length=1, max_length=5000)
    lang: str = "en"


class Event(BaseModel):
    seq: int = Field(ge=1)
    stage: str
    status: str
    detail: dict | list | str | None = None


@app.api_route("/health", methods=["GET", "HEAD"])
async def health():
    conn = await connect()
    try:
        await conn.fetchval("select 1")
    finally:
        await conn.close()
    return {"status": "ok"}


@app.post("/internal/test-job", dependencies=[Depends(check_secret)])
async def test_job(body: TestJob):
    job_id = uuid.uuid4()
    conn = await connect()
    try:
        await conn.execute(
            "insert into jobs (id, input_text, lang, status) values ($1, $2, $3, 'running')",
            job_id, body.text, body.lang,
        )
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                r = await client.post(
                    os.environ["N8N_WEBHOOK_URL"],
                    json={"job_id": str(job_id), "text": body.text, "lang": body.lang},
                    headers={
                        "X-Webhook-Secret": os.environ["WEBHOOK_SHARED_SECRET"],
                        "ngrok-skip-browser-warning": "true",
                    },
                )
                r.raise_for_status()
        except Exception as e:
            await conn.execute(
                "update jobs set status='failed', error=$2, updated_at=now() where id=$1",
                job_id, str(e)[:500],
            )
            raise HTTPException(status_code=502, detail="could not reach n8n")
    finally:
        await conn.close()
    return {"job_id": str(job_id)}


@app.post("/internal/jobs/{job_id}/events", dependencies=[Depends(check_secret)])
async def add_event(job_id: uuid.UUID, ev: Event):
    conn = await connect()
    try:
        await conn.execute(
            """insert into job_events (job_id, seq, stage, status, detail)
               values ($1, $2, $3, $4, $5::jsonb)
               on conflict (job_id, seq) do nothing""",
            job_id, ev.seq, ev.stage, ev.status, json.dumps(ev.detail),
        )
        await conn.execute("update jobs set updated_at=now() where id=$1", job_id)
    except asyncpg.ForeignKeyViolationError:
        raise HTTPException(status_code=404, detail="unknown job")
    finally:
        await conn.close()
    return {"ok": True}


@app.post("/internal/jobs/{job_id}/result", dependencies=[Depends(check_secret)])
async def set_result(job_id: uuid.UUID, result: dict):
    conn = await connect()
    try:
        status = await conn.execute(
            """update jobs set result=$2::jsonb, status='done',
               completed_at=now(), updated_at=now() where id=$1""",
            job_id, json.dumps(result),
        )
    finally:
        await conn.close()
    if status == "UPDATE 0":
        raise HTTPException(status_code=404, detail="unknown job")
    return {"ok": True}


@app.get("/jobs/{job_id}")          # legacy Phase 0 route; remove at end of Phase 2
async def get_job(job_id: uuid.UUID):
    conn = await connect()
    try:
        job = await conn.fetchrow(
            "select id, status, result, error, created_at, completed_at from jobs where id=$1",
            job_id,
        )
        if not job:
            raise HTTPException(status_code=404, detail="unknown job")
        events = await conn.fetch(
            "select seq, stage, status, detail from job_events where job_id=$1 order by seq",
            job_id,
        )
    finally:
        await conn.close()
    return {
        "job_id": str(job["id"]),
        "status": job["status"],
        "result": json.loads(job["result"]) if job["result"] else None,
        "error": job["error"],
        "events": [
            {"seq": e["seq"], "stage": e["stage"], "status": e["status"],
             "detail": json.loads(e["detail"]) if e["detail"] else None}
            for e in events
        ],
    }