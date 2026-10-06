import asyncio, json, uuid
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import text
from app.db import SessionLocal

router = APIRouter(prefix="/api")

class CheckIn(BaseModel):
    text: str = Field(min_length=1)

def _fetch_events(job_id: str, after: int):
    with SessionLocal() as db:
        rows = db.execute(
            text("""SELECT seq, type, payload FROM job_events
                    WHERE job_id = :j AND seq > :a ORDER BY seq"""),
            {"j": job_id, "a": after},
        ).mappings().all()
        status = db.execute(text("SELECT status FROM jobs WHERE id = :j"),
                            {"j": job_id}).scalar()
    return [dict(r) for r in rows], status

@router.post("/check")
def create_check(body: CheckIn):
    job_id = str(uuid.uuid4())
    with SessionLocal() as db:
        db.execute(
            text("INSERT INTO jobs (id, status, input_text) VALUES (:i, 'queued', :t)"),
            {"i": job_id, "t": body.text},
        )
        db.commit()
    # 2.2 intake, 2.5 gate and n8n dispatch plug in here later
    return {"job_id": job_id}

@router.get("/jobs/{job_id}")
def get_job(job_id: str):
    with SessionLocal() as db:
        row = db.execute(
            text("SELECT id, status, result, created_at FROM jobs WHERE id = :j"),
            {"j": job_id},
        ).mappings().first()
    if not row:
        raise HTTPException(404, "Job not found")
    return dict(row)

@router.get("/jobs/{job_id}/stream")
async def stream(job_id: str, request: Request, after: int = 0):
    last = request.headers.get("last-event-id")
    cursor = int(last) if last and last.isdigit() else after

    async def gen():
        nonlocal cursor
        idle = 0.0
        while True:
            if await request.is_disconnected():
                return
            events, status = await asyncio.to_thread(_fetch_events, job_id, cursor)
            for e in events:
                cursor = e["seq"]
                yield f"id: {e['seq']}\nevent: {e['type']}\ndata: {json.dumps(e['payload'])}\n\n"
                if e["type"] in ("done", "failed"):
                    return
            if status in ("done", "failed") and not events:
                return
            idle += 0.7
            if idle >= 15:            # heartbeat keeps proxies from closing the stream
                yield ": keepalive\n\n"
                idle = 0
            await asyncio.sleep(0.7)

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )