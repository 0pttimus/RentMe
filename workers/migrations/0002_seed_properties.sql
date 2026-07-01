-- Seed verified properties for development

INSERT OR IGNORE INTO property_passports (id, verification_status, ownership_verified, trust_score, health_score)
VALUES
  ('pp-1', 'verified', 1, 910, 880),
  ('pp-2', 'verified', 1, 780, 820),
  ('pp-3', 'verified', 1, 940, 900);

INSERT OR IGNORE INTO users (id, email, full_name, role, kyc_status, trust_score, trust_level, email_verified)
VALUES
  ('landlord-1', 'landlord1@rentme.dev', 'Chidi Nwosu', 'landlord', 'verified', 850, 'trusted', 1),
  ('landlord-2', 'landlord2@rentme.dev', 'Funke Adeyemi', 'landlord', 'verified', 800, 'trusted', 1),
  ('landlord-3', 'landlord3@rentme.dev', 'Ibrahim Musa', 'landlord', 'verified', 920, 'elite', 1);

INSERT OR IGNORE INTO properties (
  id, property_passport_id, landlord_id, title, description, address, city, state,
  latitude, longitude, bedrooms, bathrooms, property_type, amenities,
  rent_amount_ngn, status, is_verified, trust_score, health_score, photos
) VALUES
(
  'prop-1', 'pp-1', 'landlord-1',
  'Modern 2-Bed Apartment in Lekki',
  'Spacious apartment with 24/7 security, backup power, and a serene compound. Verified ownership and recent inspection.',
  '12 Admiralty Way, Lekki Phase 1', 'Lagos', 'Lagos',
  6.4474, 3.4739, 2, 2, 'apartment',
  '["Parking","Security","Generator","Water Supply"]',
  3500000, 'verified', 1, 910, 880, '[]'
),
(
  'prop-2', 'pp-2', 'landlord-2',
  'Cozy Self-Contain in Yaba',
  'Affordable self-contain close to tech hubs. Ideal for young professionals. Verified listing with video walkthrough.',
  '8 Herbert Macaulay Way, Yaba', 'Lagos', 'Lagos',
  6.5158, 3.3892, 1, 1, 'self_contain',
  '["Prepaid Meter","Tiled Floor","Fitted Kitchen"]',
  850000, 'verified', 1, 780, 820, '[]'
),
(
  'prop-3', 'pp-3', 'landlord-3',
  '3-Bed Duplex in Abuja',
  'Family-sized duplex in a gated estate. Quiet neighborhood with excellent road access and verified ownership.',
  '5 Gwarinpa Estate Road', 'Abuja', 'FCT',
  9.1135, 7.3961, 3, 4, 'duplex',
  '["BQ","Garden","Security","Borehole","Solar"]',
  5200000, 'verified', 1, 940, 900, '[]'
);