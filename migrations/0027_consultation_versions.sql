ALTER TABLE consultations ADD COLUMN engine_version TEXT;
ALTER TABLE consultations ADD COLUMN rule_set_version TEXT NOT NULL DEFAULT 'sahadeva-rule-dsl-1';
ALTER TABLE consultations ADD COLUMN judgment_schema_version TEXT NOT NULL DEFAULT 'sahadeva-judgment-1';
ALTER TABLE consultations ADD COLUMN evidence_ledger_hash TEXT;
ALTER TABLE consultations ADD COLUMN narration_version TEXT;

ALTER TABLE interpretations ADD COLUMN rule_set_version TEXT NOT NULL DEFAULT 'sahadeva-rule-dsl-1';
ALTER TABLE interpretations ADD COLUMN judgment_schema_version TEXT NOT NULL DEFAULT 'sahadeva-judgment-1';
ALTER TABLE interpretations ADD COLUMN evidence_ledger_hash TEXT;

CREATE INDEX IF NOT EXISTS consultations_versions_idx ON consultations(engine_version,rule_set_version,judgment_schema_version);
