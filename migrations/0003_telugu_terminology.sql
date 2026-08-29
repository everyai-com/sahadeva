INSERT OR IGNORE INTO terminology (id, canonical_key, language, script_form, transliteration, aliases_json, review_status) VALUES
('te-lagna','lagna','te','లగ్నం','lagnam','["ఉదయ లగ్నం"]','translation_review'),
('te-rashi','rashi','te','రాశి','rāśi','["రాసి"]','translation_review'),
('te-bhava','bhava','te','భావం','bhāvam','["ఇల్లు","స్థానం"]','translation_review'),
('te-graha','graha','te','గ్రహం','graham','["గ్రహము"]','translation_review'),
('te-nakshatra','nakshatra','te','నక్షత్రం','nakṣatram','["జన్మ నక్షత్రం"]','translation_review'),
('te-dasha','dasha','te','దశ','daśa','["మహాదశ"]','translation_review'),
('te-antardasha','antardasha','te','అంతర్దశ','antardaśa','[]','translation_review'),
('te-gochara','gochara','te','గోచారం','gōcāram','["గ్రహ గోచారం"]','translation_review'),
('te-varga','varga','te','వర్గ చక్రం','varga cakram','["విభాగ చక్రం"]','translation_review'),
('te-ashtakavarga','ashtakavarga','te','అష్టకవర్గం','aṣṭakavargam','[]','translation_review'),
('te-shadbala','shadbala','te','షడ్బలం','ṣaḍbalam','["గ్రహ బలం"]','translation_review'),
('te-arudha','arudha','te','ఆరూఢం','ārūḍham','["ఆరూఢ లగ్నం"]','translation_review');

CREATE VIEW IF NOT EXISTS publishable_rules AS
SELECT r.*
FROM rules r
WHERE r.review_status = 'approved'
  AND (SELECT COUNT(DISTINCT rr.reviewer_id) FROM rule_reviews rr WHERE rr.rule_id = r.id AND rr.decision = 'approve') >= 2
  AND NOT EXISTS (SELECT 1 FROM rule_reviews rr WHERE rr.rule_id = r.id AND rr.decision IN ('reject','request_changes'));
