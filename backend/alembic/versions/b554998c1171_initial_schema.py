"""initial schema

Revision ID: b554998c1171
Revises: 
Create Date: 2026-10-04 19:47:21.035779

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b554998c1171'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


TABLES = ["jobs", "job_events", "sources", "feed_items",
          "verdict_cache", "examples", "feedback", "rate_limits"]

STATEMENTS = [
"CREATE EXTENSION IF NOT EXISTS pg_trgm",

"""CREATE TABLE jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  input_text text NOT NULL,
  lang text NOT NULL DEFAULT 'en',
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','running','done','failed')),
  result jsonb,
  error text,
  text_hash text,
  client_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
)""",
"CREATE INDEX ix_jobs_text_hash ON jobs (text_hash)",
"CREATE INDEX ix_jobs_created_at ON jobs (created_at DESC)",

"""CREATE TABLE job_events (
  id bigserial PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  seq integer NOT NULL,
  stage text NOT NULL,
  status text NOT NULL,
  detail jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, seq)
)""",

"""CREATE TABLE sources (
  id serial PRIMARY KEY,
  domain text NOT NULL UNIQUE,
  name text NOT NULL,
  tier smallint NOT NULL DEFAULT 2,
  language text NOT NULL DEFAULT 'en',
  feed_url text,
  independence_group text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
)""",

"""CREATE TABLE feed_items (
  id bigserial PRIMARY KEY,
  source_id integer NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  url text NOT NULL UNIQUE,
  title text NOT NULL,
  summary text,
  published_at timestamptz,
  fetched_at timestamptz NOT NULL DEFAULT now()
)""",
"CREATE INDEX ix_feed_items_title_trgm ON feed_items USING gin (title gin_trgm_ops)",
"CREATE INDEX ix_feed_items_published ON feed_items (published_at DESC)",

"""CREATE TABLE verdict_cache (
  id bigserial PRIMARY KEY,
  claim_hash text NOT NULL UNIQUE,
  claim_text text NOT NULL,
  lang text NOT NULL DEFAULT 'en',
  verdict jsonb NOT NULL,
  hit_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
)""",
"CREATE INDEX ix_verdict_cache_claim_trgm ON verdict_cache USING gin (claim_text gin_trgm_ops)",

"""CREATE TABLE examples (
  id serial PRIMARY KEY,
  claim_text text NOT NULL,
  lang text NOT NULL DEFAULT 'en',
  expected_verdict text,
  result jsonb,
  featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
)""",

"""CREATE TABLE feedback (
  id bigserial PRIMARY KEY,
  job_id uuid REFERENCES jobs(id) ON DELETE SET NULL,
  rating text NOT NULL CHECK (rating IN ('up','down')),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
)""",

"""CREATE TABLE rate_limits (
  key text NOT NULL,
  window_start timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 1,
  PRIMARY KEY (key, window_start)
)""",
]


def upgrade() -> None:
    # One statement per call: asyncpg cannot run several in one prepared statement.
    for stmt in STATEMENTS:
        op.execute(stmt)
    # Supabase exposes public tables through its Data API. RLS with no policies
    # blocks that route; your backend connects as the postgres role, which bypasses RLS.
    for t in TABLES:
        op.execute(f"ALTER TABLE {t} ENABLE ROW LEVEL SECURITY")


def downgrade() -> None:
    for t in reversed(TABLES):
        op.execute(f"DROP TABLE IF EXISTS {t} CASCADE")