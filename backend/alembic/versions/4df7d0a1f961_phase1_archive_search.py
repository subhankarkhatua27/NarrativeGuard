"""phase1 archive search

Revision ID: 4df7d0a1f961
Revises: b554998c1171
Create Date: 2026-10-06 10:12:00.076578

down_revision: b554998c1171

"""

revision = "4df7d0a1f961"
down_revision = "b554998c1171"
branch_labels = None
depends_on = None


from alembic import op

def upgrade():
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS sources_domain_uniq ON sources (domain)")
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS feed_items_url_uniq ON feed_items (url)")
    op.execute("""
        ALTER TABLE feed_items ADD COLUMN IF NOT EXISTS search_tsv tsvector
        GENERATED ALWAYS AS (
          setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(summary, '')), 'B')
        ) STORED
    """)
    op.execute("CREATE INDEX IF NOT EXISTS feed_items_tsv_idx ON feed_items USING gin (search_tsv)")
    op.execute("CREATE INDEX IF NOT EXISTS feed_items_title_trgm_idx ON feed_items USING gin (title gin_trgm_ops)")
    op.execute("""
        CREATE OR REPLACE FUNCTION search_archive(claim text, lim int DEFAULT 10, min_hits int DEFAULT 2)
        RETURNS TABLE (title text, url text, domain text, tier smallint,
                       published_at timestamptz, score real)
        LANGUAGE sql STABLE
        SET search_path = public, extensions
        AS $$
          WITH terms AS (
            SELECT array_agg(t) AS arr
            FROM unnest(tsvector_to_array(to_tsvector('english', claim))) AS t
            WHERE t <> ALL (ARRAY['fake','false','true','viral','claim','video','photo','image',
                                  'news','fact','check','misleading','post','share','social',
                                  'media','whatsapp','user'])
          )
          SELECT f.title, f.url, s.domain, s.tier, f.published_at,
                 (ts_rank_cd(f.search_tsv, to_tsquery('simple', array_to_string(terms.arr, ' | ')))
                  + 2 * similarity(f.title, claim))::real AS score
          FROM terms
          CROSS JOIN feed_items f
          JOIN sources s ON s.id = f.source_id
          WHERE terms.arr IS NOT NULL
            AND f.search_tsv @@ to_tsquery('simple', array_to_string(terms.arr, ' | '))
            AND (SELECT count(*) FROM unnest(terms.arr) AS l
                 WHERE f.search_tsv @@ to_tsquery('simple', l)) >= LEAST(min_hits, cardinality(terms.arr))
          ORDER BY score DESC
          LIMIT lim;
        $$;
    """)

def downgrade():
    op.execute("DROP FUNCTION IF EXISTS search_archive(text, int, int)")
    op.execute("DROP INDEX IF EXISTS feed_items_title_trgm_idx")
    op.execute("DROP INDEX IF EXISTS feed_items_tsv_idx")
    op.execute("ALTER TABLE feed_items DROP COLUMN IF EXISTS search_tsv")
    op.execute("DROP INDEX IF EXISTS feed_items_url_uniq")
    op.execute("DROP INDEX IF EXISTS sources_domain_uniq")