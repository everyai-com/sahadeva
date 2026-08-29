ALTER TABLE api_keys ADD COLUMN vault_id TEXT;
UPDATE api_keys SET vault_id=id WHERE vault_id IS NULL;
CREATE INDEX api_keys_vault_idx ON api_keys(vault_id, revoked_at, created_at);
