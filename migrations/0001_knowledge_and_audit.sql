PRAGMA foreign_keys = ON;

CREATE TABLE sources (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  language TEXT NOT NULL,
  author TEXT,
  edition TEXT,
  rights_status TEXT NOT NULL CHECK (rights_status IN ('public_domain', 'licensed', 'restricted', 'unknown')),
  tradition TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE passages (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES sources(id),
  locator TEXT NOT NULL,
  original_text TEXT NOT NULL,
  transliteration TEXT,
  literal_translation TEXT,
  interpretive_translation TEXT,
  review_status TEXT NOT NULL DEFAULT 'draft' CHECK (review_status IN ('draft', 'translation_review', 'practice_review', 'approved', 'rejected')),
  revision INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE rules (
  id TEXT PRIMARY KEY,
  passage_id TEXT NOT NULL REFERENCES passages(id),
  tradition TEXT NOT NULL,
  condition_json TEXT NOT NULL,
  interpretation TEXT NOT NULL,
  confidence TEXT NOT NULL CHECK (confidence IN ('textual', 'practitioner_consensus', 'contested')),
  exceptions_json TEXT NOT NULL DEFAULT '[]',
  review_status TEXT NOT NULL DEFAULT 'draft' CHECK (review_status IN ('draft', 'approved', 'rejected')),
  revision INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reviewers (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  languages_json TEXT NOT NULL,
  traditions_json TEXT NOT NULL,
  credentials TEXT,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE rule_reviews (
  rule_id TEXT NOT NULL REFERENCES rules(id),
  reviewer_id TEXT NOT NULL REFERENCES reviewers(id),
  decision TEXT NOT NULL CHECK (decision IN ('approve', 'request_changes', 'reject')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (rule_id, reviewer_id)
);

CREATE TABLE chart_facts (
  id TEXT PRIMARY KEY,
  input_hash TEXT NOT NULL,
  engine_version TEXT NOT NULL,
  configuration_json TEXT NOT NULL,
  facts_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE interpretations (
  id TEXT PRIMARY KEY,
  chart_facts_id TEXT NOT NULL REFERENCES chart_facts(id),
  language TEXT NOT NULL,
  question TEXT,
  evidence_ids_json TEXT NOT NULL,
  model TEXT,
  prompt_version TEXT NOT NULL,
  output_text TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id TEXT,
  action TEXT NOT NULL,
  object_type TEXT NOT NULL,
  object_id TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX passages_source_idx ON passages(source_id);
CREATE INDEX rules_passage_idx ON rules(passage_id);
CREATE INDEX chart_facts_input_idx ON chart_facts(input_hash, engine_version);
CREATE INDEX audit_object_idx ON audit_events(object_type, object_id, created_at);
