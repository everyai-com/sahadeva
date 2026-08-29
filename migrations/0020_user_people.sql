CREATE TABLE IF NOT EXISTS user_people (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  profile_json TEXT NOT NULL,
  conversation_json TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS user_people_user_idx ON user_people(user_id);

ALTER TABLE user_app_data ADD COLUMN active_person_id TEXT;

-- Move any existing single-profile data into a person row and mark it active
INSERT INTO user_people (id, user_id, profile_json, conversation_json, created_at)
SELECT lower(hex(randomblob(8))), user_id, profile_json, conversation_json, datetime('now')
FROM user_app_data
WHERE profile_json IS NOT NULL;

UPDATE user_app_data
SET active_person_id = (
  SELECT id FROM user_people p WHERE p.user_id = user_app_data.user_id LIMIT 1
);
