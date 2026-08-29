PRAGMA foreign_keys = ON;

CREATE TABLE astronomy_reference_vectors (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  source_locator TEXT NOT NULL,
  instant_utc TEXT NOT NULL,
  observer_json TEXT NOT NULL,
  expected_json TEXT NOT NULL,
  tolerance_arcseconds REAL NOT NULL,
  rights_status TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE validation_runs (
  id TEXT PRIMARY KEY,
  engine_version TEXT NOT NULL,
  reference_set TEXT NOT NULL,
  result_json TEXT NOT NULL,
  passed INTEGER NOT NULL CHECK (passed IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE terminology (
  id TEXT PRIMARY KEY,
  canonical_key TEXT NOT NULL,
  language TEXT NOT NULL,
  script_form TEXT NOT NULL,
  transliteration TEXT,
  aliases_json TEXT NOT NULL DEFAULT '[]',
  source_id TEXT REFERENCES sources(id),
  review_status TEXT NOT NULL DEFAULT 'draft' CHECK (review_status IN ('draft','translation_review','approved','rejected')),
  UNIQUE(canonical_key, language, script_form)
);

CREATE TABLE contradictions (
  id TEXT PRIMARY KEY,
  first_rule_id TEXT NOT NULL REFERENCES rules(id),
  second_rule_id TEXT NOT NULL REFERENCES rules(id),
  description TEXT NOT NULL,
  resolution_status TEXT NOT NULL DEFAULT 'open' CHECK (resolution_status IN ('open','tradition_split','resolved','rejected')),
  resolution_notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX astronomy_reference_instant_idx ON astronomy_reference_vectors(instant_utc);
CREATE INDEX terminology_key_idx ON terminology(canonical_key, language);
CREATE INDEX contradictions_status_idx ON contradictions(resolution_status);
