import asyncio
import logging
import os

from app import db

logger = logging.getLogger("narrativeguard")

INTERVAL = 5          # seconds between sweeps

MSG_TOO_LONG = "The analysis took too long and was stopped. Please try again."
MSG_STALLED = "The analysis stopped responding. Please try again in a moment."


async def sweep() -> int:
    max_s = float(os.getenv("JOB_MAX_SECONDS", "150"))
    idle_s = float(os.getenv("JOB_IDLE_SECONDS", "30"))

    async with db.get_pool().acquire() as c:
        rows = await c.fetch(
            """update jobs set
                 status = 'failed',
                 error = case when created_at < now() - make_interval(secs => $1)
                              then $3 else $4 end,
                 completed_at = now(), updated_at = now()
               where status in ('queued', 'running')
                 and (created_at < now() - make_interval(secs => $1)
                      or updated_at < now() - make_interval(secs => $2))
               returning id, error""",
            max_s, idle_s, MSG_TOO_LONG, MSG_STALLED,
        )
        for r in rows:
            await c.execute(
                """insert into job_events (job_id, seq, stage, status, detail)
                   select $1, coalesce(max(seq), 0) + 1, 'watchdog', 'failed', to_jsonb($2::text)
                   from job_events where job_id = $1
                   on conflict (job_id, seq) do nothing""",
                r["id"], r["error"],
            )
    return len(rows)


async def run_forever() -> None:
    sweeps = 0
    while True:
        try:
            failed = await sweep()
            if failed:
                logger.warning("watchdog failed %d stuck job(s)", failed)
            sweeps += 1
            if sweeps % 120 == 0:        # roughly every 10 minutes
                async with db.get_pool().acquire() as c:
                    await c.execute(
                        "delete from rate_limits where window_start < now() - interval '3 days'"
                    )
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("watchdog sweep failed")
        await asyncio.sleep(INTERVAL)