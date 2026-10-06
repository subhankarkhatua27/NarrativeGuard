import hashlib
import logging
import os

import httpx
from fastapi import HTTPException, Request

logger = logging.getLogger("narrativeguard")
TURNSTILE_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


def err(status: int, code: str, message: str) -> HTTPException:
    """All user-facing errors share this shape: {"detail": {"code", "message"}}."""
    return HTTPException(status, detail={"code": code, "message": message})


def client_ip(request: Request) -> str:
    h = request.headers
    return (
        h.get("cf-connecting-ip")
        or h.get("x-forwarded-for", "").split(",")[0].strip()
        or (request.client.host if request.client else "unknown")
    )


def client_hash(ip: str) -> str:
    salt = os.getenv("IP_HASH_SALT", "narrativeguard")
    return hashlib.sha256((salt + ip).encode()).hexdigest()[:32]


async def verify_turnstile(token: str | None, ip: str) -> None:
    secret = os.getenv("TURNSTILE_SECRET_KEY", "")
    if not secret:
        logger.warning("TURNSTILE_SECRET_KEY not set: skipping human check (dev mode only)")
        return
    if not token:
        raise err(400, "captcha_missing",
                  "Please complete the 'I'm human' check, then try again.")
    data = {"secret": secret, "response": token}
    if ip != "unknown":
        data["remoteip"] = ip
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            r = await client.post(TURNSTILE_URL, data=data)
        ok = r.json().get("success") is True
    except Exception:
        logger.exception("turnstile verification call failed")
        raise err(503, "captcha_unavailable",
                  "We couldn't run the human check just now. Please try again in a moment.")
    if not ok:
        raise err(400, "captcha_failed",
                  "The human check failed or expired. Please try again.")


async def _hit(c, key: str, unit: str, limit: int) -> bool:
    """Atomically count one use. Returns False (and counts nothing) once the limit is reached."""
    row = await c.fetchrow(
        """insert into rate_limits (key, window_start, count)
           values ($1, date_trunc($3, now()), 1)
           on conflict (key, window_start)
           do update set count = rate_limits.count + 1
           where rate_limits.count < $2
           returning count""",
        key, limit, unit,
    )
    return row is not None


async def enforce_limits(c, ip_hash: str) -> None:
    per_hour = int(os.getenv("LIMIT_IP_HOUR", "5"))
    per_day = int(os.getenv("LIMIT_IP_DAY", "15"))
    global_day = int(os.getenv("LIMIT_GLOBAL_DAY", "100"))

    if not await _hit(c, f"ip:{ip_hash}:hour", "hour", per_hour):
        raise err(429, "ip_hour",
                  f"You've used your {per_hour} live checks for this hour. "
                  "Try one of the example claims, or come back a little later.")
    if not await _hit(c, f"ip:{ip_hash}:day", "day", per_day):
        raise err(429, "ip_day",
                  f"You've reached today's limit of {per_day} live checks. "
                  "The example claims still work, and your allowance resets tomorrow.")
    if not await _hit(c, "global:day", "day", global_day):
        raise err(429, "global_day",
                  "Today's free analysis quota has been used up. "
                  "You can still explore the cached examples; live checks reset at 5:30 AM IST.")