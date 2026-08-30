PRAGMA foreign_keys = ON;

CREATE TABLE source_ingestion_manifests (
  source_id TEXT PRIMARY KEY REFERENCES sources(id),
  local_path TEXT NOT NULL UNIQUE,
  content_sha256 TEXT,
  parser_version TEXT NOT NULL,
  ingestion_status TEXT NOT NULL DEFAULT 'registered' CHECK(ingestion_status IN ('registered','segmented','reviewing','complete','blocked')),
  permitted_use TEXT NOT NULL DEFAULT 'internal-review' CHECK(permitted_use IN ('internal-review','short-excerpt','full-display')),
  notes TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE passage_reviews (
  passage_id TEXT NOT NULL REFERENCES passages(id) ON DELETE CASCADE,
  reviewer_id TEXT NOT NULL REFERENCES reviewers(id),
  review_kind TEXT NOT NULL CHECK(review_kind IN ('translation','practice','rights')),
  decision TEXT NOT NULL CHECK(decision IN ('approve','request_changes','reject')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(passage_id,reviewer_id,review_kind)
);

CREATE INDEX passage_reviews_passage_idx ON passage_reviews(passage_id,review_kind,decision);

INSERT OR IGNORE INTO sources(id,title,language,author,edition,rights_status,tradition) VALUES
('book-rath-remedies','Vedic Remedies in Astrology','en','Sanjay Rath',NULL,'restricted','jyotisha'),
('book-bhasin-sarvarth-chintamani','Sarvarth Chintamani (12 Houses)','en','J. N. Bhasin',NULL,'restricted','parashari'),
('book-larsen-fundamentals','Jyotisha Fundamentals','en','Visti Larsen',NULL,'restricted','jyotisha');

INSERT OR IGNORE INTO source_ingestion_manifests(source_id,local_path,parser_version,permitted_use,notes) VALUES
('book-rath-remedies','knowledge/texts/sanjay-rath_vedic-remedies-in-astrology.md','sahadeva-heading-segmenter-1','internal-review','Restricted source: never expose full text through public APIs.'),
('book-bhasin-sarvarth-chintamani','knowledge/texts/jn-bhasin_sarvarth-chintamani.md','sahadeva-heading-segmenter-1','internal-review','Restricted source: never expose full text through public APIs.'),
('book-larsen-fundamentals','knowledge/texts/visti-larsen_jyotisha-fundamentals.md','sahadeva-heading-segmenter-1','internal-review','Restricted source: never expose full text through public APIs.');

