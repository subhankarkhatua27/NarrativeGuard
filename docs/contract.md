# Webhook contract (FastAPI <-> n8n)

All calls in both directions send the header `X-Webhook-Secret: <WEBHOOK_SHARED_SECRET>`.
Requests without the correct secret are rejected (401).

## 1. Start (FastAPI -> n8n)
POST {N8N_WEBHOOK_URL}   (n8n path: /webhook/start)
{ "job_id": "uuid", "text": "claim text", "lang": "en" }
n8n replies immediately (200) and works asynchronously.

## 2. Event (n8n -> FastAPI)
POST /internal/jobs/{job_id}/events
{ "seq": 1, "stage": "ingest", "status": "done", "detail": "free text or object" }
- seq starts at 1 and increases by 1 per job. (job_id, seq) is unique, so
  re-sending the same event is safe (it is ignored).
- status: "running" | "done" | "failed"

## 3. Result (n8n -> FastAPI)
POST /internal/jobs/{job_id}/result
{ "verdict": "...", "summary": "...", "sources": [] }
Stored as JSON on the job; the job becomes "done".
(The real result fields get defined in Phase 1.)

## Notes
- n8n callbacks go to the Render URL; FastAPI calls n8n through the ngrok URL.
- Server-to-server calls to ngrok include `ngrok-skip-browser-warning: true`.