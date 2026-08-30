-- Native (iOS/Android) daily-reminder tokens for the Expo push service.
-- Web Push (push_subscriptions) is payload-free; Expo pushes carry the brief
-- inline, so the cron builds a per-token brief and sends it directly.
CREATE TABLE IF NOT EXISTS expo_push_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  hour INTEGER NOT NULL DEFAULT 7,
  tz_offset REAL NOT NULL DEFAULT 5.5,
  created_at TEXT NOT NULL,
  last_sent_at TEXT
);
CREATE INDEX IF NOT EXISTS expo_push_user_idx ON expo_push_tokens(user_id);
