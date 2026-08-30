PRAGMA foreign_keys = ON;

CREATE TABLE rule_example_reviews (
  example_id TEXT NOT NULL REFERENCES rule_examples(id) ON DELETE CASCADE,
  reviewer_id TEXT NOT NULL REFERENCES reviewers(id),
  decision TEXT NOT NULL CHECK(decision IN ('approve','request_changes','reject')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(example_id,reviewer_id)
);

CREATE INDEX rule_example_reviews_gate_idx ON rule_example_reviews(example_id,decision);

DROP VIEW book_rule_coverage;
CREATE VIEW book_rule_coverage AS
SELECT
  ss.source_id,
  ss.id section_id,
  ss.locator,
  ss.heading,
  ss.domains_json,
  ss.eligibility,
  ss.classification_review_status,
  COUNT(DISTINCT srl.rule_id) linked_rules,
  COUNT(DISTINCT CASE WHEN r.review_status='approved' THEN r.id END) approved_rules,
  COUNT(DISTINCT CASE WHEN re.review_status='approved' AND re.kind='worked-example' THEN re.id END) approved_examples,
  COUNT(DISTINCT CASE WHEN re.review_status='approved' AND re.kind='counterexample' THEN re.id END) approved_counterexamples
FROM source_sections ss
LEFT JOIN section_rule_links srl ON srl.section_id=ss.id
LEFT JOIN rules r ON r.id=srl.rule_id
LEFT JOIN rule_examples re ON re.rule_id=r.id
GROUP BY ss.source_id,ss.id,ss.locator,ss.heading,ss.domains_json,ss.eligibility,ss.classification_review_status;

CREATE VIEW publishable_rule_examples AS
SELECT re.*
FROM rule_examples re
WHERE re.review_status='approved'
  AND (SELECT COUNT(DISTINCT reviewer_id) FROM rule_example_reviews WHERE example_id=re.id AND decision='approve')>=2
  AND NOT EXISTS(SELECT 1 FROM rule_example_reviews WHERE example_id=re.id AND decision IN ('reject','request_changes'));
