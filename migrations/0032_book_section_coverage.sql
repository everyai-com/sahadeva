PRAGMA foreign_keys = ON;

CREATE TABLE source_sections (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  locator TEXT NOT NULL,
  heading TEXT NOT NULL,
  level INTEGER NOT NULL CHECK(level BETWEEN 1 AND 6),
  line_number INTEGER NOT NULL CHECK(line_number > 0),
  section_sha256 TEXT NOT NULL,
  domains_json TEXT NOT NULL,
  eligibility TEXT NOT NULL DEFAULT 'unreviewed' CHECK(eligibility IN ('unreviewed','eligible','restricted','excluded')),
  exclusion_reason TEXT,
  classification_review_status TEXT NOT NULL DEFAULT 'draft' CHECK(classification_review_status IN ('draft','approved','rejected')),
  UNIQUE(source_id,locator)
);

CREATE INDEX source_sections_domain_review_idx ON source_sections(classification_review_status,eligibility);

CREATE TABLE section_rule_links (
  section_id TEXT NOT NULL REFERENCES source_sections(id) ON DELETE CASCADE,
  rule_id TEXT NOT NULL REFERENCES rules(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL CHECK(relationship IN ('definition','base-rule','exception','cancellation','timing','remedy','worked-example','contradiction')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(section_id,rule_id,relationship)
);

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
  COUNT(DISTINCT CASE WHEN re.review_status='approved' AND re.kind='example' THEN re.id END) approved_examples,
  COUNT(DISTINCT CASE WHEN re.review_status='approved' AND re.kind='counterexample' THEN re.id END) approved_counterexamples
FROM source_sections ss
LEFT JOIN section_rule_links srl ON srl.section_id=ss.id
LEFT JOIN rules r ON r.id=srl.rule_id
LEFT JOIN rule_examples re ON re.rule_id=r.id
GROUP BY ss.source_id,ss.id,ss.locator,ss.heading,ss.domains_json,ss.eligibility,ss.classification_review_status;
