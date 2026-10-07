import hmac
import json
import os
import uuid
from contextlib import asynccontextmanager
import asyncio

import asyncpg
import httpx
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Literal
from pydantic import field_validator
from app import db


load_dotenv()

from app.db import db_url, init_pool, close_pool   # after load_dotenv
from app.routers.jobs import router
from app.routers.examples import router as examples_route
from app import job_watchdog


@asynccontextmanager
async def lifespan(app):
    await init_pool()
    task = asyncio.create_task(job_watchdog.run_forever())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass
    await close_pool()

app = FastAPI(lifespan=lifespan)
app.include_router(router)
app.include_router(examples_route)

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


REQUIRED_RESULT_KEYS = ("verdict",)      # edit this to your real required result fields
MAX_DETAIL_CHARS = 20000
PIPELINE_ERROR = "The analysis hit a problem and was stopped. Please try again."


class Event(BaseModel):
    seq: int = Field(ge=1, le=1000)
    stage: str = Field(min_length=1, max_length=50)
    status: Literal["running", "done", "failed"]
    detail: dict | list | str | None = None

    @field_validator("detail")
    @classmethod
    def detail_not_huge(cls, v):
        if v is not None and len(json.dumps(v)) > MAX_DETAIL_CHARS:
            raise ValueError("detail too large")
        return v


class Fail(BaseModel):
    message: str = Field(default="", max_length=500)


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
    async with db.get_pool().acquire() as c:
        try:
            await c.execute(
                """insert into job_events (job_id, seq, stage, status, detail)
                   values ($1, $2, $3, $4, $5::jsonb)
                   on conflict (job_id, seq) do nothing""",
                job_id, ev.seq, ev.stage, ev.status, json.dumps(ev.detail),
            )
        except asyncpg.ForeignKeyViolationError:
            raise HTTPException(status_code=404, detail="unknown job")
        # activity keeps the watchdog away, but only for jobs still in progress
        await c.execute(
            "update jobs set updated_at=now() where id=$1 and status in ('queued','running')",
            job_id,
        )
    return {"ok": True}





import logging
logger = logging.getLogger("narrativeguard")   # put this near the top of main.py, with the other imports


@app.post("/internal/jobs/{job_id}/result", dependencies=[Depends(check_secret)])
async def set_result(job_id: uuid.UUID, result: dict):
    missing = [k for k in REQUIRED_RESULT_KEYS if not result.get(k)]
    if missing:
        raise HTTPException(status_code=422, detail=f"result is missing: {missing}")
    if len(json.dumps(result)) > 200_000:
        raise HTTPException(status_code=413, detail="result too large")

    async with db.get_pool().acquire() as c:
        updated = await c.fetchval(
            """update jobs set result=$2::jsonb, status='done', error=null,
               completed_at=now(), updated_at=now()
               where id=$1 and status in ('queued','running')
               returning 1""",
            job_id, json.dumps(result),
        )
        if updated is None:
            if not await c.fetchval("select 1 from jobs where id=$1", job_id):
                raise HTTPException(status_code=404, detail="unknown job")
            return {"ok": True, "ignored": True}     # duplicate or late result: harmless
        try:
            await c.execute(
                """insert into verdict_cache (claim_hash, claim_text, lang, verdict, expires_at)
                   select text_hash, input_text, lang, $2::jsonb, now() + interval '7 days'
                   from jobs where id = $1 and text_hash is not null
                   on conflict (claim_hash) do update
                   set verdict = excluded.verdict, claim_text = excluded.claim_text,
                       expires_at = excluded.expires_at""",
                job_id, json.dumps(result),
            )
        except Exception:
            logger.exception("verdict cache write failed for job %s", job_id)
    return {"ok": True}


@app.post("/internal/jobs/{job_id}/fail", dependencies=[Depends(check_secret)])
async def fail_job(job_id: uuid.UUID, body: Fail):
    """n8n's error branch calls this so the page fails instantly instead of waiting for the watchdog."""
    async with db.get_pool().acquire() as c:
        updated = await c.fetchval(
            """update jobs set status='failed', error=$2, completed_at=now(), updated_at=now()
               where id=$1 and status in ('queued','running') returning 1""",
            job_id, PIPELINE_ERROR,
        )
        if updated is None and not await c.fetchval("select 1 from jobs where id=$1", job_id):
            raise HTTPException(status_code=404, detail="unknown job")
    logger.warning("pipeline reported failure for job %s: %s", job_id, body.message)
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