ALTER TABLE api_keys ADD COLUMN calc_limit_per_minute INTEGER NOT NULL DEFAULT 60 CHECK(calc_limit_per_minute BETWEEN 1 AND 600);
ALTER TABLE api_keys ADD COLUMN ai_limit_per_minute INTEGER NOT NULL DEFAULT 10 CHECK(ai_limit_per_minute BETWEEN 1 AND 100);

CREATE TABLE api_key_rate_windows (
  key_id TEXT NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  operation TEXT NOT NULL CHECK(operation IN ('calc','ai')),
  window_start TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY(key_id, operation, window_start)
);
CREATE INDEX idx_api_key_rate_windows_start ON api_key_rate_windows(window_start);
