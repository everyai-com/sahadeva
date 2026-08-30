CREATE INDEX IF NOT EXISTS consultations_method_category_idx ON consultations(method,category,asked_at);
CREATE VIEW IF NOT EXISTS judgment_outcome_summary AS
SELECT c.category topic,o.outcome,COUNT(*) count
FROM consultations c JOIN consultation_outcomes o ON o.consultation_id=c.id
WHERE c.method='natal-topic-judgment'
GROUP BY c.category,o.outcome;
