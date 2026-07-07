-- Rename legacy TON-era columns to accurate Solana names
ALTER TABLE users RENAME COLUMN ton_wallet_address TO solana_wallet_address;
ALTER TABLE users RENAME COLUMN ton_encrypted_key TO encrypted_secret;
ALTER TABLE wallets RENAME COLUMN ton_wallet_address TO solana_wallet_address;
