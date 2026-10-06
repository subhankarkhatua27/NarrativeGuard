import asyncio
import logging
import os
import time

import httpx

logger = logging.getLogger("narrativeguard")

UP_TTL = 30          # seconds to trust an "up" answer
DOWN_TTL = 10        # seconds to trust a "down" answer
HEALTH_TIMEOUT = 2.5

_state = {"ok": None, "at": 0.0}
_lock = asyncio.Lock()


def health_url() -> str:
    explicit = os.getenv("N8N_HEALTH_URL")
    if explicit:
        return explicit
    return os.environ["N8N_WEBHOOK_URL"].split("/webhook")[0] + "/healthz"


def _fresh() -> bool:
    if _state["ok"] is None:
        return False
    ttl = UP_TTL if _state["ok"] else DOWN_TTL
    return time.monotonic() - _state["at"] < ttl


async def is_up() -> bool:
    if _fresh():
        return _state["ok"]
    async with _lock:
        if _fresh():                      # someone else refreshed it while we waited
            return _state["ok"]
        ok = False
                
        try:
            async with asyncio.timeout(HEALTH_TIMEOUT):          # hard deadline for the whole check
                async with httpx.AsyncClient(timeout=HEALTH_TIMEOUT) as client:
                    r = await client.get(
                        health_url(), headers={"ngrok-skip-browser-warning": "true"}
                    )
            ok = r.status_code == 200
        except Exception:
            ok = False


def mark_down() -> None:
    _state["ok"], _state["at"] = False, time.monotonic()


async def dispatch(job_id, text: str, lang: str) -> bool:
    try:
        async with asyncio.timeout(10):
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.post(
                    os.environ["N8N_WEBHOOK_URL"],
                    json={"job_id": str(job_id), "text": text, "lang": lang},
                    headers={
                        "X-Webhook-Secret": os.environ["WEBHOOK_SHARED_SECRET"],
                        "ngrok-skip-browser-warning": "true",
                    },
                )
                r.raise_for_status()
        return True
    except Exception:
        logger.exception("n8n dispatch failed for job %s", job_id)
        return False