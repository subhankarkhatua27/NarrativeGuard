import os
import sys

import httpx
from dotenv import load_dotenv

load_dotenv()
base, id1, id2 = sys.argv[1].rstrip("/"), sys.argv[2], sys.argv[3]
good = {"X-Webhook-Secret": os.environ["WEBHOOK_SHARED_SECRET"]}
c = httpx.Client(timeout=60)


def post(path, body, headers=good):
    return c.post(base + path, json=body, headers=headers)


def check(name, ok, extra=""):
    print(("PASS  " if ok else "FAIL  ") + name, extra)


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
check("valid result accepted", r.status_code == 200 and not r.json().get("ignored"), str(r.text))
r = post(f"/internal/jobs/{id1}/result", {"verdict": "test", "summary": "second", "sources": []})
check("second result is ignored", r.status_code == 200 and r.json().get("ignored") is True, r.text)
r = post(f"/internal/jobs/{id2}/fail", {"message": "simulated n8n error"})
check("fail endpoint accepted", r.status_code == 200, r.text)
check("failed job shows failed", c.get(f"{base}/api/jobs/{id2}").json().get("status") == "failed")
check("finished job shows done", c.get(f"{base}/api/jobs/{id1}").json().get("status") == "done")