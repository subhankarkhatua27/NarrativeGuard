-- Seed data for the sources table (NarrativeGuard)
-- Safe to re-run: ON CONFLICT DO NOTHING.
-- Tiers: 1 official, 2 fact-checker, 3 news, 4 ignore

CREATE UNIQUE INDEX IF NOT EXISTS sources_domain_uniq ON sources (domain);

INSERT INTO sources (domain, name, tier, language, feed_url, independence_group, active, created_at) VALUES
('pib.gov.in',                  'PIB (Press Information Bureau)', 1, 'en', NULL, 'govt-india', true, now()),

('altnews.in',                  'Alt News',      2, 'en', 'https://www.altnews.in/feed/',      'altnews',      true, now()),
('factly.in',                   'Factly',        2, 'en', 'https://factly.in/feed/',           'factly',       true, now()),
('vishvasnews.com',             'Vishvas News',  2, 'en', 'https://www.vishvasnews.com/feed/', 'jagran',       true, now()),
('newschecker.in',              'Newschecker',   2, 'en', 'https://www.newschecker.in/feed',   'newschecker',  true, now()),

('thequint.com',                'The Quint (WebQoof)',    2, 'en', NULL, 'quint',         true, now()),
('indiatoday.in',               'India Today Fact Check', 2, 'en', NULL, 'india-today',   true, now()),
('factcrescendo.com',           'Fact Crescendo',         2, 'en', NULL, 'factcrescendo', true, now()),

('thehindu.com',                'The Hindu',          3, 'en', NULL, 'the-hindu',       true, now()),
('indianexpress.com',           'The Indian Express', 3, 'en', NULL, 'indian-express',  true, now()),
('ndtv.com',                    'NDTV',               3, 'en', NULL, 'ndtv',            true, now()),
('hindustantimes.com',          'Hindustan Times',    3, 'en', NULL, 'hindustan-times', true, now()),
('timesofindia.indiatimes.com', 'Times of India',     3, 'en', NULL, 'times-group',     true, now()),
('theprint.in',                 'ThePrint',           3, 'en', NULL, 'theprint',        true, now()),
('reuters.com',                 'Reuters',            3, 'en', NULL, 'reuters',         true, now()),
('bbc.com',                     'BBC News',           3, 'en', NULL, 'bbc',             true, now()),

('thewire.in',                  'The Wire',      3, 'en', NULL, 'thewire',       false, now()),
('scroll.in',                   'Scroll',        3, 'en', NULL, 'scroll',        false, now()),
('deccanherald.com',            'Deccan Herald', 3, 'en', NULL, 'deccan-herald', false, now())
ON CONFLICT (domain) DO NOTHING;