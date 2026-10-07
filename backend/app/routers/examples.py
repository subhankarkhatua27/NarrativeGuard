import json

from fastapi import APIRouter

from app import db

router = APIRouter(prefix="/api")


@router.get("/examples")
async def list_examples():
    async with db.get_pool().acquire() as c:
        rows = await c.fetch(
            """select id, claim_text, lang, expected_verdict, result, featured
               from examples where result is not null
               order by featured desc, id limit 50"""
        )
    return [
        {
            "id": r["id"],
            "claim": r["claim_text"],
            "lang": r["lang"],
            "expected_verdict": r["expected_verdict"],
            "featured": r["featured"],
            "result": json.loads(r["result"]),
        }
        for r in rows
    ]