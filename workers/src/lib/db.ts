import { Keypair } from "@solana/web3.js";
import type { SessionUser } from "./session";
import { generateId, sessionExpiry } from "./session";
import { encryptMnemonic, decryptMnemonic } from "./wallet-crypto";

type UserRow = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: string;
  kyc_status: string;
  trust_score: number;
  trust_level: string;
  avatar_url: string | null;
};

function mapUser(row: UserRow): SessionUser {
  const fullName = row.full_name ?? "";
  const phone = row.phone ?? null;
  return {
    id: row.id,
    email: row.email,
    fullName,
    phone,
    role: row.role,
    kycStatus: row.kyc_status,
    trustScore: row.trust_score,
    trustLevel: row.trust_level,
    profileComplete: fullName.trim().length >= 2 && !!phone?.trim(),
    avatarUrl: row.avatar_url ?? null,
  };
}

const USER_SELECT = `SELECT id, email, full_name, phone, role, kyc_status, trust_score, trust_level, avatar_url FROM users`;

export async function findUserByEmail(
  db: D1Database,
  email: string
): Promise<SessionUser | null> {
  const row = await db
    .prepare(`${USER_SELECT} WHERE email = ?`)
    .bind(email.toLowerCase().trim())
    .first<UserRow>();

  return row ? mapUser(row) : null;
}

export async function findUserById(
  db: D1Database,
  id: string
): Promise<SessionUser | null> {
  const row = await db.prepare(`${USER_SELECT} WHERE id = ?`).bind(id).first<UserRow>();
  return row ? mapUser(row) : null;
}

export async function createUser(
  db: D1Database,
  data: { email: string; fullName?: string; phone?: string },
  initialBalance?: number,
  trustScore?: number,
): Promise<SessionUser> {
  const id = generateId();
  const email = data.email.toLowerCase().trim();
  const fullName = data.fullName?.trim() ?? "";
  const phone = data.phone?.trim() ?? null;
  const balance = initialBalance ?? 0;
  const score = trustScore ?? 500;

  await db
    .prepare(
      `INSERT INTO users (id, email, full_name, phone, email_verified)
       VALUES (?, ?, ?, ?, 1)`
    )
    .bind(id, email, fullName, phone)
    .run();

  await db
    .prepare(`INSERT INTO wallets (id, user_id, balance_ngn) VALUES (?, ?, ?)`)
    .bind(generateId(), id, balance)
    .run();

  await db
    .prepare(`INSERT INTO reward_balances (user_id, total_points) VALUES (?, 0)`)
    .bind(id)
    .run();

  return {
    id,
    email,
    fullName,
    phone,
    role: "tenant",
    kycStatus: "pending",
    trustScore: score,
    trustLevel: "average",
    profileComplete: fullName.length >= 2 && !!phone,
    avatarUrl: null,
  };
}

export async function setupUserWallet(
  db: D1Database,
  userId: string,
  email: string,
  walletEncryptionKey: string,
): Promise<string | null> {
  const existing = await db.prepare(
    `SELECT id FROM users WHERE id = ? AND solana_wallet_address IS NOT NULL`
  ).bind(userId).first();
  if (existing) return null;

  const keypair = Keypair.generate();
  const secretB64 = Buffer.from(keypair.secretKey).toString("base64");
  const encryptedKey = await encryptMnemonic(secretB64, walletEncryptionKey, email);
  const pubkey = keypair.publicKey.toBase58();

  await db
    .prepare(`UPDATE users SET solana_wallet_address = ?, encrypted_secret = ? WHERE id = ?`)
    .bind(pubkey, encryptedKey, userId)
    .run();

  await db
    .prepare(`UPDATE wallets SET solana_wallet_address = ? WHERE user_id = ?`)
    .bind(pubkey, userId)
    .run();

  return pubkey;
}

export async function updateUserProfile(
  db: D1Database,
  userId: string,
  data: { fullName: string; phone: string }
): Promise<SessionUser | null> {
  const fullName = data.fullName.trim();
  const phone = data.phone.trim();

  await db
    .prepare(
      `UPDATE users SET full_name = ?, phone = ?, updated_at = datetime('now') WHERE id = ?`
    )
    .bind(fullName, phone, userId)
    .run();

  return findUserById(db, userId);
}

export async function createSession(db: D1Database, userId: string): Promise<string> {
  const sessionId = generateId();
  await db
    .prepare(`INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)`)
    .bind(sessionId, userId, sessionExpiry())
    .run();
  return sessionId;
}

export async function getSessionUser(
  db: D1Database,
  sessionId: string
): Promise<SessionUser | null> {
  const row = await db
    .prepare(
      `SELECT u.id, u.email, u.full_name, u.phone, u.role, u.kyc_status, u.trust_score, u.trust_level, u.avatar_url
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = ? AND s.expires_at > datetime('now')`
    )
    .bind(sessionId)
    .first<UserRow>();

  return row ? mapUser(row) : null;
}

export async function deleteSession(db: D1Database, sessionId: string): Promise<void> {
  await db.prepare(`DELETE FROM sessions WHERE id = ?`).bind(sessionId).run();
}

let lastSessionCleanup = 0;
export async function deleteExpiredSessions(db: D1Database): Promise<void> {
  const now = Date.now();
  if (now - lastSessionCleanup < 600_000) return; // once per 10 min
  lastSessionCleanup = now;
  await db.prepare(`DELETE FROM sessions WHERE expires_at <= datetime('now')`).run();
}