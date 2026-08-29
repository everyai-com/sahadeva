PRAGMA foreign_keys = ON;

CREATE TABLE billing_accounts (
  vault_id TEXT PRIMARY KEY,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free','paid')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','past_due','cancelled')),
  provider TEXT,
  provider_customer_id TEXT,
  provider_subscription_id TEXT,
  current_period_end TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX billing_provider_customer_idx
  ON billing_accounts(provider, provider_customer_id)
  WHERE provider_customer_id IS NOT NULL;

CREATE TABLE entitlement_usage (
  vault_id TEXT NOT NULL,
  metric TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(vault_id, metric)
);
