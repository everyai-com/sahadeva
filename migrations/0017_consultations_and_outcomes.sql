CREATE TABLE IF NOT EXISTS consultations (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  method TEXT NOT NULL,
  category TEXT NOT NULL,
  question_hash TEXT NOT NULL,
  confirmation_hash TEXT NOT NULL UNIQUE,
  asked_at TEXT NOT NULL,
  result_json TEXT NOT NULL,
  outcome_status TEXT NOT NULL DEFAULT 'awaiting-outcome'
);

CREATE TABLE IF NOT EXISTS consultation_outcomes (
  id TEXT PRIMARY KEY,
  consultation_id TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK(outcome IN ('confirmed','partly-confirmed','not-confirmed','unresolved')),
  resolved_at TEXT,
  notes TEXT,
  FOREIGN KEY (consultation_id) REFERENCES consultations(id)
);

CREATE INDEX IF NOT EXISTS idx_consultations_status ON consultations(outcome_status,asked_at);
CREATE INDEX IF NOT EXISTS idx_consultation_outcomes_consultation ON consultation_outcomes(consultation_id);
