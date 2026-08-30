PRAGMA foreign_keys = ON;

ALTER TABLE passages ADD COLUMN page_start INTEGER;
ALTER TABLE passages ADD COLUMN page_end INTEGER;
ALTER TABLE passages ADD COLUMN parser_provenance_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE passages ADD COLUMN ocr_quality TEXT NOT NULL DEFAULT 'unknown' CHECK(ocr_quality IN ('unknown','machine','corrected','verified'));
ALTER TABLE passages ADD COLUMN display_rights TEXT NOT NULL DEFAULT 'internal-only' CHECK(display_rights IN ('internal-only','short-excerpt','full-display'));

ALTER TABLE rules ADD COLUMN dsl_version TEXT NOT NULL DEFAULT 'sahadeva-rule-dsl-1';
ALTER TABLE rules ADD COLUMN effect TEXT NOT NULL DEFAULT 'qualify' CHECK(effect IN ('support','oppose','qualify','abstain'));
ALTER TABLE rules ADD COLUMN weight REAL NOT NULL DEFAULT 0;
ALTER TABLE rules ADD COLUMN harm_class TEXT NOT NULL DEFAULT 'general-cultural' CHECK(harm_class IN ('general-cultural','sensitive-reflective','high-impact-restricted','prohibited-output'));

CREATE TABLE rule_examples (
  id TEXT PRIMARY KEY,
  rule_id TEXT NOT NULL REFERENCES rules(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK(kind IN ('worked-example','counterexample','boundary-example')),
  chart_input_json TEXT NOT NULL,
  as_of_iso TEXT,
  expected_match INTEGER NOT NULL CHECK(expected_match IN (0,1)),
  expected_exception_ids_json TEXT NOT NULL DEFAULT '[]',
  source_locator TEXT,
  review_status TEXT NOT NULL DEFAULT 'draft' CHECK(review_status IN ('draft','approved','rejected')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX rule_examples_rule_idx ON rule_examples(rule_id,kind,review_status);
