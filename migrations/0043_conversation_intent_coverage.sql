CREATE TABLE IF NOT EXISTS conversation_turn_intents (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  turn_id TEXT NOT NULL,
  input_intent TEXT NOT NULL,
  matched_intents_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(session_id, turn_id),
  FOREIGN KEY(session_id) REFERENCES conversation_alignment_sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS conversation_response_points (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  turn_id TEXT NOT NULL,
  input_turn_id TEXT NOT NULL,
  point_id TEXT NOT NULL,
  intent_label TEXT NOT NULL,
  point_hash TEXT NOT NULL,
  position INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(session_id, turn_id, point_id),
  FOREIGN KEY(session_id) REFERENCES conversation_alignment_sessions(id) ON DELETE CASCADE
);

ALTER TABLE conversation_claim_feedback ADD COLUMN intent_label TEXT;

CREATE INDEX IF NOT EXISTS conversation_turn_intents_intent_idx
  ON conversation_turn_intents(input_intent, created_at DESC);
CREATE INDEX IF NOT EXISTS conversation_response_points_intent_idx
  ON conversation_response_points(intent_label, created_at DESC);
