-- RentMe Property Passport System
-- Adds new address fields to property_passports, creates property_units and property_access tables,
-- rebuilds properties table to remove UNIQUE on property_passport_id and add property_unit_id.

-- 1. Extend property_passports with address fields and passport_number
ALTER TABLE property_passports ADD COLUMN passport_number TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_passport_number ON property_passports(passport_number);
ALTER TABLE property_passports ADD COLUMN country TEXT NOT NULL DEFAULT 'Nigeria';
ALTER TABLE property_passports ADD COLUMN state_code TEXT;
ALTER TABLE property_passports ADD COLUMN area TEXT;
ALTER TABLE property_passports ADD COLUMN street TEXT;
ALTER TABLE property_passports ADD COLUMN house_number TEXT;
ALTER TABLE property_passports ADD COLUMN building_name TEXT;
ALTER TABLE property_passports ADD COLUMN property_type TEXT;
ALTER TABLE property_passports ADD COLUMN total_units INTEGER NOT NULL DEFAULT 1;
ALTER TABLE property_passports ADD COLUMN state TEXT;
ALTER TABLE property_passports ADD COLUMN city TEXT;
ALTER TABLE property_passports ADD COLUMN latitude REAL;
ALTER TABLE property_passports ADD COLUMN longitude REAL;

-- 2. Create property_units table
CREATE TABLE IF NOT EXISTS property_units (
  id TEXT PRIMARY KEY,
  property_passport_id TEXT NOT NULL REFERENCES property_passports(id),
  unit_identifier TEXT NOT NULL,
  unit_type TEXT NOT NULL DEFAULT 'self_contain',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_units_passport ON property_units(property_passport_id);

-- 3. Create property_access table
CREATE TABLE IF NOT EXISTS property_access (
  id TEXT PRIMARY KEY,
  property_passport_id TEXT NOT NULL REFERENCES property_passports(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  role TEXT NOT NULL CHECK(role IN ('owner','property_manager','caretaker')),
  status TEXT NOT NULL DEFAULT 'active',
  assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
  revoked_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_access_passport ON property_access(property_passport_id);
CREATE INDEX IF NOT EXISTS idx_access_user ON property_access(user_id);

-- 4. Rebuild properties table — drop UNIQUE on property_passport_id, add property_unit_id
CREATE TABLE IF NOT EXISTS properties_new (
  id TEXT PRIMARY KEY,
  property_passport_id TEXT NOT NULL REFERENCES property_passports(id),
  property_unit_id TEXT REFERENCES property_units(id),
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

INSERT INTO properties_new SELECT
  id, property_passport_id, NULL, landlord_id, title, description,
  COALESCE(address, ''), COALESCE(city, ''), COALESCE(state, ''),
  COALESCE(latitude, 0), COALESCE(longitude, 0),
  COALESCE(bedrooms, 0), COALESCE(bathrooms, 0),
  COALESCE(property_type, ''), COALESCE(amenities, '[]'),
  COALESCE(rent_amount_ngn, 0), COALESCE(status, 'draft'),
  COALESCE(is_verified, 0), COALESCE(trust_score, 500), COALESCE(health_score, 500),
  COALESCE(photos, '[]'), video_walkthrough_url, compound_video_url, street_video_url,
  ai_risk_score, created_at, updated_at
FROM properties;
DROP TABLE properties;
ALTER TABLE properties_new RENAME TO properties;

CREATE INDEX IF NOT EXISTS idx_properties_city ON properties(city);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_landlord ON properties(landlord_id);
CREATE INDEX IF NOT EXISTS idx_properties_passport ON properties(property_passport_id);
