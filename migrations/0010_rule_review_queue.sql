PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS rule_bindings (
  source_key TEXT PRIMARY KEY,
  module TEXT NOT NULL,
  claim_summary TEXT NOT NULL,
  rule_id TEXT REFERENCES rules(id),
  implementation_status TEXT NOT NULL DEFAULT 'active' CHECK (implementation_status IN ('planned','active','retired')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS rule_bindings_module_idx ON rule_bindings(module, implementation_status);
CREATE INDEX IF NOT EXISTS rule_bindings_rule_idx ON rule_bindings(rule_id);

INSERT OR IGNORE INTO rule_bindings(source_key,module,claim_summary) VALUES
('muhurta-seed:marriage','muhurta','Activity-specific weekday, Tithi, Nakshatra and Karaka fitness for marriage'),
('muhurta-seed:griha_pravesh','muhurta','Activity-specific weekday, Tithi, Nakshatra and Karaka fitness for Griha Pravesh'),
('muhurta-seed:travel','muhurta','Activity-specific weekday, Tithi, Nakshatra and Karaka fitness for travel'),
('muhurta-seed:business_start','muhurta','Activity-specific weekday, Tithi, Nakshatra and Karaka fitness for starting a venture'),
('muhurta-seed:vehicle_purchase','muhurta','Activity-specific weekday, Tithi, Nakshatra and Karaka fitness for vehicle purchase'),
('muhurta-seed:property_purchase','muhurta','Activity-specific weekday, Tithi, Nakshatra and Karaka fitness for property purchase'),
('muhurta-seed:naming','muhurta','Activity-specific weekday, Tithi, Nakshatra and Karaka fitness for naming'),
('muhurta-seed:contract','muhurta','Activity-specific weekday, Tithi, Nakshatra and Karaka fitness for contracts'),
('dosha-seed:mangal:awaiting-review','dosha','Mangal houses, cancellations and mitigation rules'),
('dosha-seed:kaal-sarpa:awaiting-review','dosha','Kaal Sarpa enclosure, boundary and mitigation rules'),
('dosha-seed:kemadruma:awaiting-review','dosha','Kemadruma detection and cancellation rules'),
('dosha-seed:pitru-candidate:awaiting-review','dosha','Conservative Pitru-related structural screen and mitigation rules');

CREATE VIEW IF NOT EXISTS rule_review_queue AS
SELECT
  rb.source_key,
  rb.module,
  rb.claim_summary,
  rb.implementation_status,
  rb.rule_id,
  COALESCE(r.review_status,'unlinked') AS rule_status,
  COALESCE(p.review_status,'unlinked') AS passage_status,
  s.id AS source_id,
  s.title AS source_title,
  s.language,
  s.tradition,
  p.locator,
  (SELECT COUNT(DISTINCT rr.reviewer_id) FROM rule_reviews rr WHERE rr.rule_id=r.id AND rr.decision='approve') AS approval_count,
  (SELECT COUNT(*) FROM rule_reviews rr WHERE rr.rule_id=r.id AND rr.decision IN ('reject','request_changes')) AS blocking_review_count,
  CASE WHEN pr.id IS NOT NULL THEN 1 ELSE 0 END AS publishable,
  CASE WHEN rb.rule_id IS NULL THEN 'needs-source-passage'
       WHEN p.review_status!='approved' THEN 'needs-passage-review'
       WHEN r.review_status!='approved' THEN 'needs-rule-review'
       WHEN (SELECT COUNT(DISTINCT rr.reviewer_id) FROM rule_reviews rr WHERE rr.rule_id=r.id AND rr.decision='approve')<2 THEN 'needs-second-approval'
       WHEN (SELECT COUNT(*) FROM rule_reviews rr WHERE rr.rule_id=r.id AND rr.decision IN ('reject','request_changes'))>0 THEN 'blocked-by-review'
       WHEN EXISTS (SELECT 1 FROM contradictions c WHERE (c.first_rule_id=r.id OR c.second_rule_id=r.id) AND c.resolution_status='open') THEN 'blocked-by-contradiction'
       ELSE 'publishable' END AS next_action
FROM rule_bindings rb
LEFT JOIN rules r ON r.id=rb.rule_id
LEFT JOIN passages p ON p.id=r.passage_id
LEFT JOIN sources s ON s.id=p.source_id
LEFT JOIN publishable_rules pr ON pr.id=r.id;
