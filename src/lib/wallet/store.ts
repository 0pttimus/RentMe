import { deriveKey, encrypt, decrypt, randomBytes } from "./crypto";

const WALLET_SALT_BYTES = 32;
const WALLET_IV_BYTES = 12;

export const STORAGE_KEYS = {
  encryptedWallet: "rentme_encrypted_wallet",
  pinHash: "rentme_pin_hash",
  pinTimestamp: "rentme_pin_timestamp",
  hasWallet: "rentme_has_wallet",
  appLocked: "rentme_app_locked",
} as const;

function packWallet(
  salt: Uint8Array,
  iv: Uint8Array,
  ciphertext: Uint8Array
): string {
  const combined = new Uint8Array(salt.length + iv.length + ciphertext.length);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(ciphertext, salt.length + iv.length);
  return btoa(String.fromCharCode(...combined));
}

function unpackWallet(
  packed: string
): { salt: Uint8Array; iv: Uint8Array; ciphertext: Uint8Array } {
  const combined = Uint8Array.from(atob(packed), (c) => c.charCodeAt(0));
  const salt = combined.slice(0, WALLET_SALT_BYTES);
  const iv = combined.slice(WALLET_SALT_BYTES, WALLET_SALT_BYTES + WALLET_IV_BYTES);
  const ciphertext = combined.slice(WALLET_SALT_BYTES + WALLET_IV_BYTES);
  return { salt, iv, ciphertext };
}

export async function encryptWallet(
  privateKey: Uint8Array,
  mnemonic: string,
  pin: string
): Promise<void> {
  const payload = JSON.stringify({
    privateKey: Array.from(privateKey),
    mnemonic,
  });
  const data = new TextEncoder().encode(payload);
  const salt = randomBytes(WALLET_SALT_BYTES);
  const key = await deriveKey(pin, salt);
  const { ciphertext, iv } = await encrypt(data, key);
  localStorage.setItem(
    STORAGE_KEYS.encryptedWallet,
    packWallet(salt, iv, ciphertext)
  );
  localStorage.setItem(STORAGE_KEYS.hasWallet, "true");
}

export async function decryptWallet(
  pin: string
): Promise<{ privateKey: Uint8Array; mnemonic: string } | null> {
  const packed = localStorage.getItem(STORAGE_KEYS.encryptedWallet);
  if (!packed) return null;

  try {
    const { salt, iv, ciphertext } = unpackWallet(packed);
    const key = await deriveKey(pin, salt);
    const plain = await decrypt(ciphertext, iv, key);
    const parsed = JSON.parse(new TextDecoder().decode(plain));
    return {
      privateKey: new Uint8Array(parsed.privateKey),
      mnemonic: parsed.mnemonic,
    };
  } catch {
    return null;
  }
}

export function hasWallet(): boolean {
  return localStorage.getItem(STORAGE_KEYS.hasWallet) === "true";
}

export function clearWallet(): void {
  Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
}

export function isAppLocked(): boolean {
  return localStorage.getItem(STORAGE_KEYS.appLocked) === "true";
}

export function setAppLocked(locked: boolean): void {
  if (locked) {
    localStorage.setItem(STORAGE_KEYS.appLocked, "true");
  } else {
    localStorage.removeItem(STORAGE_KEYS.appLocked);
  }
  localStorage.setItem(STORAGE_KEYS.pinTimestamp, Date.now().toString());
}
