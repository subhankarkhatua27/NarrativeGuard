import asyncio
import json
import uuid
from app import cache

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from app.intake import prepare, IntakeError
from app import n8n
from app import guard

import app.db as db
OFFLINE_MSG = ("Live analysis is offline right now. Please try one of the example "
               "claims, which work anytime, or come back a little later.")

router = APIRouter(prefix="/api")

POLL_SECONDS = 0.7
HEARTBEAT_SECONDS = 15

class CheckIn(BaseModel):
    text: str = Field(min_length=1, max_length=20000)
    lang: str | None = None
    force: bool = False
    turnstile_token: str | None = None



def _j(v):
    return json.loads(v) if v else None


def _sse(event: str, data, id: int | None = None) -> str:
    head = f"id: {id}\n" if id is not None else ""
    return f"{head}event: {event}\ndata: {json.dumps(data)}\n\n"


@router.post("/check")
async def create_check(body: CheckIn, request: Request):
    try:
        intake = prepare(body.text, body.lang)
    except IntakeError as e:
        raise guard.err(422, "invalid_input", str(e))

    base = {"lang": intake.lang, "redactions": intake.redactions}
    pool = db.get_pool()

    # Free answers first: cache hits and "seen before" need no n8n, no captcha, no limits.
    async with pool.acquire() as c:
        hit = await cache.exact_hit(c, intake.text_hash)
        if hit:
            job_id = uuid.uuid4()
            await c.execute(
                """insert into jobs (id, input_text, lang, status, text_hash, result, completed_at)
                   values ($1, $2, $3, 'done', $4, $5::jsonb, now())""",
                job_id, intake.text, intake.lang, intake.text_hash, hit["verdict"],
            )
            await c.execute(
                "update verdict_cache set hit_count = hit_count + 1 where id = $1", hit["id"]
            )
            return {**base, "job_id": str(job_id), "from_cache": True,
                    "result": json.loads(hit["verdict"])}

        seen = await cache.seen_before(c, intake.text)
        if seen["found"] and not body.force:
            return {**base, "job_id": None, "from_cache": False, "seen_before": seen}

    # A live analysis is needed from here on.
    # 1. Is n8n up? (before the captcha, so an offline answer doesn't waste the single-use token)
    if not await n8n.is_up():
        raise guard.err(503, "n8n_offline", OFFLINE_MSG)

    # 2. Protect the quota.
    ip = guard.client_ip(request)
    await guard.verify_turnstile(body.turnstile_token, ip)
    ip_hash = guard.client_hash(ip)

    # 3. Create the job and start the pipeline.
    job_id = uuid.uuid4()
    async with pool.acquire() as c:
        await guard.enforce_limits(c, ip_hash)
        await c.execute(
            """insert into jobs (id, input_text, lang, status, text_hash, client_hash)
               values ($1, $2, $3, 'running', $4, $5)""",
            job_id, intake.text, intake.lang, intake.text_hash, ip_hash,
        )

    if not await n8n.dispatch(job_id, intake.text, intake.lang):
        n8n.mark_down()
        async with pool.acquire() as c:
            await c.execute(
                "update jobs set status='failed', error=$2, updated_at=now() where id=$1",
                job_id, "n8n unreachable at dispatch",
            )
        raise guard.err(503, "n8n_offline", OFFLINE_MSG)

    return {**base, "job_id": str(job_id), "from_cache": False,
            "seen_before": seen if seen["found"] else None}

@router.get("/jobs/{job_id}")
async def get_job(job_id: uuid.UUID):
    async with db.get_pool().acquire() as c:
        job = await c.fetchrow(
            "select id, status, result, error, created_at, completed_at from jobs where id=$1",
            job_id,
        )
        if not job:
            raise HTTPException(404, "unknown job")
        events = await c.fetch(
            "select seq, stage, status, detail from job_events where job_id=$1 order by seq",
            job_id,
        )
    return {
        "job_id": str(job["id"]),
        "status": job["status"],
        "result": _j(job["result"]),
        "error": job["error"],
        "events": [
            {"seq": e["seq"], "stage": e["stage"], "status": e["status"],
             "detail": _j(e["detail"])} for e in events
        ],
    }


async def _poll(job_id: uuid.UUID, after: int):
    async with db.get_pool().acquire() as c:
        rows = await c.fetch(
            "select seq, stage, status, detail from job_events "
            "where job_id=$1 and seq>$2 order by seq",
            job_id, after,
        )
        job = await c.fetchrow(
            "select status, result, error from jobs where id=$1", job_id
        )
    return rows, job


@router.get("/jobs/{job_id}/stream")
async def stream(job_id: uuid.UUID, request: Request, after: int = 0):
    async with db.get_pool().acquire() as c:
        if not await c.fetchval("select 1 from jobs where id=$1", job_id):
            raise HTTPException(404, "unknown job")

    last = request.headers.get("last-event-id")
    cursor = int(last) if last and last.isdigit() else after

    async def gen():
        nonlocal cursor
        quiet = 0.0
        while True:
            if await request.is_disconnected():
                return
            rows, job = await _poll(job_id, cursor)
            for r in rows:
                cursor = r["seq"]
                quiet = 0.0
                yield _sse("stage", {"seq": r["seq"], "stage": r["stage"],
                                     "status": r["status"], "detail": _j(r["detail"])},
                           id=r["seq"])
            if job["status"] in ("done", "failed"):
                if rows:
                    continue          # re-poll once so no late events are missed
                if job["status"] == "done":
                    yield _sse("result", _j(job["result"]))
                else:
                    yield _sse("failed", {"error": job["error"]})
                return
            quiet += POLL_SECONDS
            if quiet >= HEARTBEAT_SECONDS:
                quiet = 0.0
                yield ": keepalive\n\n"
            await asyncio.sleep(POLL_SECONDS)

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )