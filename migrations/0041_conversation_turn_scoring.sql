ALTER TABLE conversation_alignment_sessions ADD COLUMN turn_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE conversation_alignment_sessions ADD COLUMN last_input_hash TEXT;
ALTER TABLE conversation_alignment_sessions ADD COLUMN last_input_at TEXT;
ALTER TABLE conversation_alignment_sessions ADD COLUMN recovery_attempted_at TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS conversation_alignment_snapshots_turn_cause_idx
  ON conversation_alignment_snapshots(session_id, turn_id, cause)
  WHERE turn_id IS NOT NULL;
