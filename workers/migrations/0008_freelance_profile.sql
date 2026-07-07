-- RentMe Freelance Profile Extensions
-- Adds display name, pricing, portfolio, and availability to service_providers

ALTER TABLE service_providers ADD COLUMN display_name TEXT;
ALTER TABLE service_providers ADD COLUMN pricing_type TEXT NOT NULL DEFAULT 'fixed';
ALTER TABLE service_providers ADD COLUMN fixed_price REAL;
ALTER TABLE service_providers ADD COLUMN min_price REAL;
ALTER TABLE service_providers ADD COLUMN max_price REAL;
ALTER TABLE service_providers ADD COLUMN portfolio TEXT NOT NULL DEFAULT '[]';
ALTER TABLE service_providers ADD COLUMN is_available INTEGER NOT NULL DEFAULT 0;
