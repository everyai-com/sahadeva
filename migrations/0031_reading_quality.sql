CREATE TABLE IF NOT EXISTS reading_feedback (
  id TEXT PRIMARY KEY, created_at TEXT NOT NULL, user_id TEXT,
  reading_hash TEXT NOT NULL, section TEXT NOT NULL,
  rating TEXT NOT NULL CHECK(rating IN ('helpful','unclear','incorrect','missing')),
  language TEXT NOT NULL, notes TEXT,
  review_status TEXT NOT NULL DEFAULT 'pending' CHECK(review_status IN ('pending','reviewed','dismissed')),
  FOREIGN KEY(user_id) REFERENCES "user"("id") ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS reading_feedback_status_idx ON reading_feedback(review_status,created_at DESC);
CREATE INDEX IF NOT EXISTS reading_feedback_hash_idx ON reading_feedback(reading_hash,created_at DESC);
