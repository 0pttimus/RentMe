CREATE TABLE IF NOT EXISTS verifiers (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
  id_url TEXT NOT NULL,
  phone_photo_url TEXT NOT NULL,
  agreed_terms INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending',
  daily_count INTEGER NOT NULL DEFAULT 0,
  last_verified_date TEXT,
  total_earned_ngn REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS verification_submissions (
  id TEXT PRIMARY KEY,
  verifier_id TEXT NOT NULL REFERENCES verifiers(id),
  property_id TEXT NOT NULL REFERENCES properties(id),
  video_url TEXT NOT NULL,
  location_lat REAL NOT NULL,
  location_lng REAL NOT NULL,
  location_accuracy REAL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
