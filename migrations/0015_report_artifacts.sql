CREATE TABLE report_artifacts (
  id TEXT PRIMARY KEY,
  content_type TEXT NOT NULL,
  body BLOB NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL
);
CREATE INDEX report_artifacts_expiry_idx ON report_artifacts(expires_at);
