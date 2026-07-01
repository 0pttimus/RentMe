CREATE TABLE IF NOT EXISTS wallet_transactions (
  id TEXT PRIMARY KEY,
  wallet_id TEXT NOT NULL REFERENCES wallets(id),
  type TEXT NOT NULL,
  amount_ngn REAL NOT NULL,
  reference TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reward_balances (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  total_points INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reward_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS service_providers (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
  categories TEXT NOT NULL DEFAULT '[]',
  bio TEXT,
  rating REAL NOT NULL DEFAULT 0,
  completed_jobs INTEGER NOT NULL DEFAULT 0,
  is_verified INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS service_bookings (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES users(id),
  provider_id TEXT NOT NULL REFERENCES service_providers(id),
  category TEXT NOT NULL,
  total_amount_ngn REAL NOT NULL,
  upfront_amount_ngn REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  scheduled_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  reviewer_id TEXT NOT NULL REFERENCES users(id),
  reviewee_id TEXT NOT NULL REFERENCES users(id),
  property_id TEXT REFERENCES properties(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Seed demo service providers
INSERT OR IGNORE INTO users (id, email, full_name, role, kyc_status, trust_score, trust_level, email_verified)
VALUES
  ('sp-1', 'cleaner@rentme.dev', 'Grace Eze', 'service_provider', 'verified', 780, 'trusted', 1),
  ('sp-2', 'plumber@rentme.dev', 'Emeka Obi', 'service_provider', 'verified', 820, 'trusted', 1);

INSERT OR IGNORE INTO service_providers (id, user_id, categories, bio, rating, completed_jobs, is_verified)
VALUES
  ('svc-1', 'sp-1', '["cleaning","moving"]', 'Professional home cleaning across Lagos.', 4.8, 124, 1),
  ('svc-2', 'sp-2', '["plumbing","repairs"]', 'Licensed plumber, 8 years experience.', 4.9, 89, 1);