CREATE TABLE IF NOT EXISTS conversation_alignment_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  alignment_score INTEGER NOT NULL DEFAULT 50 CHECK(alignment_score BETWEEN 0 AND 100),
  feedback_count INTEGER NOT NULL DEFAULT 0,
  last_concern TEXT,
  concern_open INTEGER NOT NULL DEFAULT 0 CHECK(concern_open IN (0,1)),
  FOREIGN KEY(user_id) REFERENCES "user"("id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS conversation_claim_feedback (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  turn_id TEXT NOT NULL,
  claim_id TEXT NOT NULL,
  claim_kind TEXT NOT NULL,
  rating TEXT NOT NULL CHECK(rating IN ('up','down')),
  reason TEXT,
  response_hash TEXT NOT NULL,
  user_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(session_id,turn_id,claim_id),
  FOREIGN KEY(session_id) REFERENCES conversation_alignment_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY(user_id) REFERENCES "user"("id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS conversation_alignment_snapshots (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  turn_id TEXT,
  score INTEGER NOT NULL CHECK(score BETWEEN 0 AND 100),
  cause TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(session_id) REFERENCES conversation_alignment_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS conversation_claim_feedback_session_idx
  ON conversation_claim_feedback(session_id,updated_at DESC);
CREATE INDEX IF NOT EXISTS conversation_alignment_snapshots_session_idx
  ON conversation_alignment_snapshots(session_id,created_at ASC);
