-- RentMe D1 Schema (SQLite)
-- Adapted from original Postgres schema for Cloudflare D1

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'tenant' CHECK (role IN ('tenant', 'landlord', 'service_provider', 'admin')),
  kyc_status TEXT NOT NULL DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'in_review', 'verified', 'rejected')),
  trust_score INTEGER NOT NULL DEFAULT 500 CHECK (trust_score >= 0 AND trust_score <= 1000),
  trust_level TEXT NOT NULL DEFAULT 'average' CHECK (trust_level IN ('elite', 'trusted', 'average', 'risk', 'restricted', 'banned')),
  occupation TEXT,
  employment_status TEXT,
  income_range TEXT,
  household_size INTEGER,
  ton_wallet_address TEXT,
  email_verified INTEGER NOT NULL DEFAULT 0,
  phone_verified INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS wallets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  balance_ngn REAL NOT NULL DEFAULT 0 CHECK (balance_ngn >= 0),
  balance_usdt REAL NOT NULL DEFAULT 0 CHECK (balance_usdt >= 0),
  ton_wallet_address TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS property_passports (
  id TEXT PRIMARY KEY,
  verification_status TEXT NOT NULL DEFAULT 'pending',
  ownership_verified INTEGER NOT NULL DEFAULT 0,
  rental_history_count INTEGER NOT NULL DEFAULT 0,
  occupancy_status TEXT NOT NULL DEFAULT 'vacant',
  complaint_count INTEGER NOT NULL DEFAULT 0,
  inspection_count INTEGER NOT NULL DEFAULT 0,
  trust_score INTEGER NOT NULL DEFAULT 500,
  health_score INTEGER NOT NULL DEFAULT 500,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS properties (
  id TEXT PRIMARY KEY,
  property_passport_id TEXT NOT NULL UNIQUE REFERENCES property_passports(id),
  landlord_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  bedrooms INTEGER NOT NULL CHECK (bedrooms >= 0),
  bathrooms INTEGER NOT NULL CHECK (bathrooms >= 0),
  property_type TEXT NOT NULL,
  amenities TEXT NOT NULL DEFAULT '[]',
  rent_amount_ngn REAL NOT NULL CHECK (rent_amount_ngn > 0),
  status TEXT NOT NULL DEFAULT 'draft',
  is_verified INTEGER NOT NULL DEFAULT 0,
  trust_score INTEGER NOT NULL DEFAULT 500,
  health_score INTEGER NOT NULL DEFAULT 500,
  photos TEXT NOT NULL DEFAULT '[]',
  video_walkthrough_url TEXT,
  compound_video_url TEXT,
  street_video_url TEXT,
  ai_risk_score REAL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_properties_city ON properties(city);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_landlord ON properties(landlord_id);

CREATE TABLE IF NOT EXISTS reservations (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL REFERENCES properties(id),
  tenant_id TEXT NOT NULL REFERENCES users(id),
  deposit_amount_ngn REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  inspection_deadline TEXT NOT NULL,
  escrow_contract_address TEXT,
  escrow_tx_hash TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS fraud_reports (
  id TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL REFERENCES users(id),
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);