import os, sys, time
import httpx
from dotenv import load_dotenv

load_dotenv()
base = os.getenv("API_BASE", "https://narrativeguard-2.onrender.com")
job_id = sys.argv[1]
h = {"X-Webhook-Secret": os.environ["WEBHOOK_SHARED_SECRET"]}

for seq, stage in enumerate(["ingest", "extract", "search", "judge"], start=1):
    httpx.post(f"{base}/internal/jobs/{job_id}/events", headers=h,
               json={"seq": seq, "stage": stage, "status": "done", "detail": f"{stage} ok"})
    print("sent", stage)
    time.sleep(2)

httpx.post(f"{base}/internal/jobs/{job_id}/result", headers=h,
           json={"verdict": "test", "summary": "fake result", "sources": []})
print("result sent")