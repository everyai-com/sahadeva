PRAGMA foreign_keys = ON;

CREATE TABLE api_keys (
  id TEXT PRIMARY KEY,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  label TEXT NOT NULL,
  scopes_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at TEXT,
  revoked_at TEXT
);

CREATE TABLE saved_chart_blobs (
  id TEXT PRIMARY KEY,
  owner_key_id TEXT NOT NULL REFERENCES api_keys(id),
  label TEXT NOT NULL,
  encrypted_blob TEXT NOT NULL,
  encryption_metadata_json TEXT NOT NULL,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE private_shares (
  id TEXT PRIMARY KEY,
  chart_id TEXT NOT NULL REFERENCES saved_chart_blobs(id),
  owner_key_id TEXT NOT NULL REFERENCES api_keys(id),
  token_hash TEXT NOT NULL UNIQUE,
  include_birth_details INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  access_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE api_usage_daily (
  key_id TEXT NOT NULL REFERENCES api_keys(id),
  usage_date TEXT NOT NULL,
  operation TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(key_id, usage_date, operation)
);

CREATE INDEX saved_chart_owner_idx ON saved_chart_blobs(owner_key_id, created_at);
CREATE INDEX share_owner_idx ON private_shares(owner_key_id, created_at);
CREATE INDEX share_expiry_idx ON private_shares(expires_at, revoked_at);
