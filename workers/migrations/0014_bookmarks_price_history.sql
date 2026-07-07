CREATE TABLE IF NOT EXISTS bookmarks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  property_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (property_id) REFERENCES properties(id),
  UNIQUE(user_id, property_id)
);

CREATE TABLE IF NOT EXISTS price_history (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  price REAL NOT NULL,
  changed_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (property_id) REFERENCES properties(id)
);
