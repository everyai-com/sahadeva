CREATE TABLE IF NOT EXISTS user_shares (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  profile_json TEXT NOT NULL,
  include_name INTEGER NOT NULL DEFAULT 1,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS user_shares_user_idx ON user_shares(user_id);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  hour INTEGER NOT NULL DEFAULT 7,
  tz_offset REAL NOT NULL DEFAULT 5.5,
  created_at TEXT NOT NULL,
  last_sent_at TEXT
);
CREATE INDEX IF NOT EXISTS push_user_idx ON push_subscriptions(user_id);
