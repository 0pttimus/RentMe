CREATE TABLE IF NOT EXISTS property_alerts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  property_id TEXT NOT NULL REFERENCES properties(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, property_id)
);
