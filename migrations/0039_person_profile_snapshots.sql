PRAGMA foreign_keys = ON;

ALTER TABLE user_people ADD COLUMN encrypted_profile TEXT;
ALTER TABLE user_people ADD COLUMN profile_iv TEXT;

CREATE TABLE IF NOT EXISTS person_profile_snapshots (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL UNIQUE REFERENCES user_people(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  profile_ref TEXT NOT NULL UNIQUE,
  input_hash TEXT NOT NULL,
  engine_version TEXT NOT NULL,
  ruleset_version TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  encrypted_snapshot TEXT NOT NULL,
  encryption_iv TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ready' CHECK(status IN ('building','ready','stale','failed')),
  generated_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS person_profile_snapshots_user_idx ON person_profile_snapshots(user_id,status,updated_at);
CREATE INDEX IF NOT EXISTS person_profile_snapshots_version_idx ON person_profile_snapshots(engine_version,ruleset_version,status);
