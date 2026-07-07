-- Chat / messaging system
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  participant_a TEXT NOT NULL REFERENCES users(id),
  participant_b TEXT NOT NULL REFERENCES users(id),
  property_id TEXT REFERENCES properties(id),
  last_message TEXT,
  last_message_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_conversations_participant_a ON conversations(participant_a);
CREATE INDEX IF NOT EXISTS idx_conversations_participant_b ON conversations(participant_b);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);
