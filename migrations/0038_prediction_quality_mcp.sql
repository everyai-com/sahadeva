PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS prediction_claims (
  id TEXT PRIMARY KEY,
  consultation_id TEXT REFERENCES consultations(id) ON DELETE SET NULL,
  claim_text TEXT NOT NULL,
  claim_class TEXT NOT NULL,
  tradition TEXT NOT NULL,
  resolution_window_start TEXT,
  resolution_window_end TEXT,
  chart_version TEXT NOT NULL,
  ruleset_version TEXT NOT NULL,
  evidence_json TEXT NOT NULL DEFAULT '{}',
  user_saw_claim INTEGER NOT NULL DEFAULT 1 CHECK(user_saw_claim IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS prediction_claim_outcomes (
  id TEXT PRIMARY KEY,
  claim_id TEXT NOT NULL REFERENCES prediction_claims(id) ON DELETE CASCADE,
  outcome TEXT NOT NULL CHECK(outcome IN ('confirmed','partly-confirmed','not-confirmed','unresolved')),
  notes TEXT,
  reported_at TEXT NOT NULL,
  resolved_at TEXT,
  consent_scope TEXT NOT NULL CHECK(consent_scope IN ('service-follow-up','descriptive-outcomes','blind-validation')),
  outcome_blinded INTEGER NOT NULL DEFAULT 0 CHECK(outcome_blinded IN (0,1)),
  UNIQUE(claim_id)
);

CREATE INDEX IF NOT EXISTS prediction_claims_validation_idx ON prediction_claims(tradition,claim_class,ruleset_version);
CREATE INDEX IF NOT EXISTS prediction_claim_outcomes_validation_idx ON prediction_claim_outcomes(consent_scope,outcome_blinded,outcome);

CREATE TABLE IF NOT EXISTS lal_kitab_rule_reviews (
  rule_id TEXT NOT NULL REFERENCES rules(id) ON DELETE CASCADE,
  reviewer_id TEXT NOT NULL REFERENCES reviewers(id),
  convention_version TEXT NOT NULL,
  scan_verified INTEGER NOT NULL DEFAULT 0 CHECK(scan_verified IN (0,1)),
  sensitive_claim_class TEXT NOT NULL DEFAULT 'general-cultural',
  remedy_burden_json TEXT NOT NULL DEFAULT '{}',
  decision TEXT NOT NULL CHECK(decision IN ('approve','request_changes','reject')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(rule_id,reviewer_id,convention_version)
);

CREATE VIEW IF NOT EXISTS publishable_lal_kitab_rules AS
SELECT pr.*
FROM publishable_rules pr
WHERE pr.tradition='lal-kitab'
  AND (SELECT COUNT(DISTINCT reviewer_id) FROM lal_kitab_rule_reviews lr WHERE lr.rule_id=pr.id AND lr.decision='approve' AND lr.scan_verified=1)>=2
  AND NOT EXISTS(SELECT 1 FROM lal_kitab_rule_reviews lr WHERE lr.rule_id=pr.id AND lr.decision IN ('reject','request_changes'));
