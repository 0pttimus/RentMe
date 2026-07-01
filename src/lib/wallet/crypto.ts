const AES_ALGO = "AES-GCM";
const ITERATIONS = 600_000;
const KEY_LENGTH = 256;
const SALT_BYTES = 32;
const IV_BYTES = 12;

function ab(s: string): ArrayBuffer {
  return new TextEncoder().encode(s).buffer as ArrayBuffer;
}

export async function deriveKey(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey(
    "raw",
    ab(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: ITERATIONS, hash: "SHA-256" },
    base,
    { name: AES_ALGO, length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

export function randomBytes(n: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(n));
}

export async function encrypt(
  plaintext: Uint8Array,
  key: CryptoKey
): Promise<{ ciphertext: Uint8Array; iv: Uint8Array }> {
  const iv = randomBytes(IV_BYTES);
  const buf = new ArrayBuffer(plaintext.length);
  new Uint8Array(buf).set(plaintext);
  const encrypted = await crypto.subtle.encrypt(
    { name: AES_ALGO, iv: iv as BufferSource },
    key,
    buf
  );
  return { ciphertext: new Uint8Array(encrypted), iv };
}

export async function decrypt(
  ciphertext: Uint8Array,
  iv: Uint8Array,
  key: CryptoKey
): Promise<Uint8Array> {
  const buf = new ArrayBuffer(ciphertext.length);
  new Uint8Array(buf).set(ciphertext);
  const plain = await crypto.subtle.decrypt(
    { name: AES_ALGO, iv: iv as BufferSource },
    key,
    buf
  );
  return new Uint8Array(plain);
}

export async function encryptString(
  plain: string,
  password: string
): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await deriveKey(password, salt);
  const { ciphertext, iv } = await encrypt(
    new TextEncoder().encode(plain),
    key
  );
  const combined = new Uint8Array(salt.length + iv.length + ciphertext.length);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(ciphertext, salt.length + iv.length);
  return btoa(String.fromCharCode(...combined));
}

export async function decryptString(
  encoded: string,
  password: string
): Promise<string> {
  const combined = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
  const salt = combined.slice(0, SALT_BYTES);
  const iv = combined.slice(SALT_BYTES, SALT_BYTES + IV_BYTES);
  const ciphertext = combined.slice(SALT_BYTES + IV_BYTES);
  const key = await deriveKey(password, salt);
  const plain = await decrypt(ciphertext, iv, key);
  return new TextDecoder().decode(plain);
}

export function xorSplit(secret: Uint8Array): [Uint8Array, Uint8Array] {
  const share1 = randomBytes(secret.length);
  const share2 = new Uint8Array(secret.length);
  for (let i = 0; i < secret.length; i++) {
    share2[i] = secret[i] ^ share1[i];
  }
  return [share1, share2];
}

export function xorRecover(share1: Uint8Array, share2: Uint8Array): Uint8Array {
  const result = new Uint8Array(share1.length);
  for (let i = 0; i < share1.length; i++) {
    result[i] = share1[i] ^ share2[i];
  }
  return result;
}

export function uint8ArrayToHex(u: Uint8Array): string {
  return Array.from(u)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function hexToUint8Array(hex: string): Uint8Array {
  const result = new Uint8Array(hex.length / 2);
  for (let i = 0; i < result.length; i++) {
    result[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return result;
}

export function encodeB64(u: Uint8Array): string {
  return btoa(String.fromCharCode(...u));
}

export function decodeB64(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}
