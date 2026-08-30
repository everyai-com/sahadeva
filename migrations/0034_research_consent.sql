PRAGMA foreign_keys = ON;

CREATE TABLE research_consents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  consultation_id TEXT NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK(scope IN ('descriptive-outcomes','blind-validation')),
  consent_version TEXT NOT NULL,
  engine_version TEXT NOT NULL,
  ruleset_version TEXT NOT NULL,
  consented_at TEXT NOT NULL,
  withdrawn_at TEXT,
  retention_until TEXT NOT NULL,
  UNIQUE(user_id,consultation_id,scope,consent_version)
);

ALTER TABLE consultation_outcomes ADD COLUMN research_consent_id TEXT REFERENCES research_consents(id);
ALTER TABLE consultation_outcomes ADD COLUMN engine_version TEXT;
ALTER TABLE consultation_outcomes ADD COLUMN ruleset_version TEXT;
ALTER TABLE consultation_outcomes ADD COLUMN outcome_blinded INTEGER NOT NULL DEFAULT 0 CHECK(outcome_blinded IN (0,1));

CREATE INDEX research_consents_active_idx ON research_consents(scope,withdrawn_at,retention_until);
CREATE INDEX consultation_outcomes_research_idx ON consultation_outcomes(research_consent_id,outcome_blinded);

CREATE VIEW research_eligible_consultation_outcomes AS
SELECT o.id,o.consultation_id,c.method,c.category,o.outcome,o.resolved_at,o.recorded_at,
       o.engine_version,o.ruleset_version,o.outcome_blinded,rc.scope,rc.consent_version
FROM consultation_outcomes o
JOIN consultations c ON c.id=o.consultation_id
JOIN research_consents rc ON rc.id=o.research_consent_id AND rc.consultation_id=o.consultation_id
WHERE rc.withdrawn_at IS NULL
  AND rc.retention_until>CURRENT_TIMESTAMP
  AND o.engine_version=rc.engine_version
  AND o.ruleset_version=rc.ruleset_version;
