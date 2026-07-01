import crypto from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;
const VERSION = 0x01;

function deriveKey(envKey: string, userEmail: string): Buffer {
  const serverKey = Buffer.from(envKey, "hex");
  if (serverKey.length !== 32) throw new Error("WALLET_ENCRYPTION_KEY must be 64 hex chars (32 bytes)");
  return crypto.createHmac("sha256", serverKey).update(userEmail.toLowerCase().trim()).digest();
}

export async function encryptMnemonic(
  mnemonic: string,
  envKey: string,
  userEmail: string,
): Promise<string> {
  const key = deriveKey(envKey, userEmail);
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(mnemonic, "utf-8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([Buffer.from([VERSION]), iv, tag, encrypted]).toString("base64");
}

export function decryptMnemonic(
  encoded: string,
  envKey: string,
  userEmail: string,
): string {
  const buf = Buffer.from(encoded, "base64");
  const version = buf[0];
  // ponytail: only version 1 exists, add version handlers when new versions appear
  if (version !== VERSION) throw new Error(`Unsupported encryption version: ${version}`);
  const key = deriveKey(envKey, userEmail);
  const iv = buf.subarray(1, 1 + IV_LEN);
  const tag = buf.subarray(1 + IV_LEN, 1 + IV_LEN + TAG_LEN);
  const data = buf.subarray(1 + IV_LEN + TAG_LEN);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(data) + decipher.final("utf-8");
}
