import os
import sys
import time

import httpx
from dotenv import load_dotenv

load_dotenv()

if len(sys.argv) < 2:
    sys.exit("usage: python backend/scripts/push_events.py JOB_ID [BASE_URL]")

job_id = sys.argv[1]
base = (
    sys.argv[2] if len(sys.argv) > 2
    else os.getenv("API_BASE", "http://127.0.0.1:8000")
).rstrip("/")

headers = {"X-Webhook-Secret": os.environ["WEBHOOK_SHARED_SECRET"]}
print("target:", base)
print("job   :", job_id)

with httpx.Client(timeout=60) as client:
    for seq, stage in enumerate(["ingest", "extract", "search", "judge"], start=1):
        r = client.post(
            f"{base}/internal/jobs/{job_id}/events",
            headers=headers,
            json={"seq": seq, "stage": stage, "status": "done", "detail": f"{stage} ok"},
        )
        r.raise_for_status()
        print("sent event", seq, stage)
        time.sleep(2)

    r = client.post(
        f"{base}/internal/jobs/{job_id}/result",
        headers=headers,
        json={"verdict": "test", "summary": "fake result from push_events", "sources": []},
    )
    r.raise_for_status()
    print("result sent:", r.json())