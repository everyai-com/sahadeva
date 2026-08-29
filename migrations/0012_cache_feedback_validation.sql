PRAGMA foreign_keys = ON;

CREATE TABLE chart_cache (
  birth_hash TEXT PRIMARY KEY,
  engine_version TEXT NOT NULL,
  chart_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE event_confirmations (
  id TEXT PRIMARY KEY,
  owner_key_id TEXT NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  chart_hash TEXT NOT NULL,
  window_json TEXT NOT NULL,
  happened INTEGER NOT NULL CHECK (happened IN (0,1)),
  consent_version TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX event_confirmations_chart_idx ON event_confirmations(chart_hash, created_at);

CREATE TABLE life_theme_validation_cases (
  id TEXT PRIMARY KEY,
  cohort TEXT NOT NULL,
  chart_input_json TEXT NOT NULL,
  range_start TEXT NOT NULL,
  range_end TEXT NOT NULL,
  expected_patterns_json TEXT NOT NULL,
  outcome_blinded INTEGER NOT NULL DEFAULT 1 CHECK (outcome_blinded IN (0,1)),
  source_locator TEXT NOT NULL,
  review_status TEXT NOT NULL DEFAULT 'draft' CHECK (review_status IN ('draft','reviewed','excluded')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE life_theme_validation_results (
  id TEXT PRIMARY KEY,
  engine_version TEXT NOT NULL,
  case_count INTEGER NOT NULL,
  result_json TEXT NOT NULL,
  passed INTEGER NOT NULL CHECK (passed IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
