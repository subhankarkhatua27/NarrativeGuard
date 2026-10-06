import json

FUZZY_MIN = 0.85        # past-verdict similarity needed to count as "seen before"
PROBE_CHARS = 300


def _jsonb(v):
    return json.loads(v) if v else None


async def exact_hit(c, text_hash: str):
    return await c.fetchrow(
        """select id, verdict from verdict_cache
           where claim_hash = $1 and (expires_at is null or expires_at > now())""",
        text_hash,
    )


async def seen_before(c, text: str, limit: int = 3) -> dict:
    probe = text[:PROBE_CHARS]

    verdict_rows = await c.fetch(
        """select claim_text, verdict, similarity(claim_text, $1) as sim
           from verdict_cache
           where claim_text % $1 and (expires_at is null or expires_at > now())
           order by sim desc limit $2""",
        probe, limit,
    )
    archive_rows = await c.fetch(
        """select f.title, f.url, s.name, s.domain, s.tier, f.published_at,
                  word_similarity(f.title, $1) as sim
           from feed_items f join sources s on s.id = f.source_id
           where f.title <% $1
           order by sim desc limit $2""",
        probe, limit,
    )

    verdicts = [
        {"claim": r["claim_text"][:200], "result": _jsonb(r["verdict"]),
         "similarity": round(float(r["sim"]), 2)}
        for r in verdict_rows if r["sim"] >= FUZZY_MIN
    ]
    archive = [
        {"title": r["title"], "url": r["url"], "source": r["name"],
         "domain": r["domain"], "tier": r["tier"],
         "published_at": r["published_at"].isoformat() if r["published_at"] else None,
         "similarity": round(float(r["sim"]), 2)}
        for r in archive_rows
    ]
    return {"verdicts": verdicts, "archive": archive, "found": bool(verdicts or archive)}