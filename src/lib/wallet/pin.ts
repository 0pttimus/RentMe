import { randomBytes, deriveKey, encrypt, decrypt } from "./crypto";

const PIN_SALT_BYTES = 16;
const PIN_IV_BYTES = 12;

export interface PinHash {
  salt: string;
  hash: string;
}

function packPinKey(salt: Uint8Array, iv: Uint8Array, encrypted: Uint8Array): string {
  const combined = new Uint8Array(salt.length + iv.length + encrypted.length);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(encrypted, salt.length + iv.length);
  return btoa(String.fromCharCode(...combined));
}

function unpackPinKey(
  packed: string
): { salt: Uint8Array; iv: Uint8Array; encrypted: Uint8Array } {
  const combined = Uint8Array.from(atob(packed), (c) => c.charCodeAt(0));
  const salt = combined.slice(0, PIN_SALT_BYTES);
  const iv = combined.slice(PIN_SALT_BYTES, PIN_SALT_BYTES + PIN_IV_BYTES);
  const encrypted = combined.slice(PIN_SALT_BYTES + PIN_IV_BYTES);
  return { salt, iv, encrypted };
}

export async function hashPin(pin: string): Promise<PinHash> {
  const salt = randomBytes(PIN_SALT_BYTES);
  const key = await deriveKey(pin, salt);
  const dummy = new TextEncoder().encode("pin_check");
  const { ciphertext, iv } = await encrypt(dummy, key);
  const hash = packPinKey(salt, iv, ciphertext);
  return { salt: btoa(String.fromCharCode(...salt)), hash };
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  try {
    const { salt, iv, encrypted } = unpackPinKey(hash);
    const key = await deriveKey(pin, salt);
    await decrypt(encrypted, iv, key);
    return true;
  } catch {
    return false;
  }
}

export function validatePin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}
