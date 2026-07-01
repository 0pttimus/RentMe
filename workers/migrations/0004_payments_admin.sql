CREATE TABLE IF NOT EXISTS paystack_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  reference TEXT NOT NULL UNIQUE,
  amount_ngn REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS kyc_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  provider TEXT NOT NULL DEFAULT 'youverify',
  session_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

INSERT OR IGNORE INTO users (id, email, full_name, role, kyc_status, trust_score, trust_level, email_verified)
VALUES ('admin-1', 'admin@rentme.dev', 'RentMe Admin', 'admin', 'verified', 1000, 'elite', 1);

INSERT OR IGNORE INTO wallets (id, user_id, balance_ngn) VALUES ('wallet-admin', 'admin-1', 0);