import { Buffer } from "node:buffer";
import { createECDH, randomBytes, createHmac, createCipheriv, createSign } from "node:crypto";
import type { Env } from "./env";

function hashHmac(key: Buffer, data: Buffer): Buffer {
  return createHmac("sha256", key).update(data).digest();
}

function hkdf(salt: Buffer, ikm: Buffer, info: Buffer, length: number): Buffer {
  const prk = hashHmac(salt, ikm);
  let t = Buffer.alloc(0);
  let result = Buffer.alloc(0);
  let counter = 0;
  while (result.length < length) {
    counter++;
    t = hashHmac(prk, Buffer.concat([t, info, Buffer.from([counter])]));
    result = Buffer.concat([result, t]);
  }
  return result.subarray(0, length);
}

function generateNonce(base: Buffer, counter: number): Buffer {
  const nonce = Buffer.from(base);
  const m = nonce.readUIntBE(nonce.length - 6, 6);
  const x = ((m ^ counter) & 0xffffff) +
      ((((m / 0x1000000) ^ (counter / 0x1000000)) & 0xffffff) * 0x1000000);
  nonce.writeUIntBE(x, nonce.length - 6, 6);
  return nonce;
}

function rawToSec1Pem(rawKey: Buffer): string {
  const oid = Buffer.from([0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07]);
  const params = Buffer.concat([Buffer.from([0xa0, 0x0a]), oid]);
  const privateKey = Buffer.concat([Buffer.from([0x04, 0x20]), rawKey]);
  const inner = Buffer.concat([Buffer.from([0x02, 0x01, 0x01]), privateKey, params]);
  const seq = Buffer.concat([Buffer.from([0x30, inner.length]), inner]);
  const b64 = seq.toString("base64");
  const lines = b64.match(/.{1,64}/g) ?? [];
  return `-----BEGIN EC PRIVATE KEY-----\n${lines.join("\n")}\n-----END EC PRIVATE KEY-----`;
}

function derToRaw(d: Buffer): Buffer {
  let i = 2;
  if (d[i] !== 0x02) throw new Error("expected INTEGER for R");
  let rLen = d[i + 1];
  let r = d.slice(i + 2, i + 2 + rLen);
  if (r.length > 32) r = r.slice(r.length - 32);
  i = i + 2 + rLen;
  if (d[i] !== 0x02) throw new Error("expected INTEGER for S");
  let sLen = d[i + 1];
  let s = d.slice(i + 2, i + 2 + sLen);
  if (s.length > 32) s = s.slice(s.length - 32);
  const rBuf = Buffer.alloc(32); r.copy(rBuf, 32 - r.length);
  const sBuf = Buffer.alloc(32); s.copy(sBuf, 32 - s.length);
  return Buffer.concat([rBuf, sBuf]);
}

function base64url(buf: Buffer): string {
  return buf.toString("base64url");
}

async function createVapidJwt(endpoint: string, privateKeyB64: string, email: string): Promise<string> {
  const header = base64url(Buffer.from(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const payload = base64url(Buffer.from(JSON.stringify({
    aud: new URL(endpoint).origin,
    exp: Math.floor(Date.now() / 1000) + 43200,
    sub: `mailto:${email}`,
  })));
  const signingInput = `${header}.${payload}`;
  const sign = createSign("sha256");
  sign.update(signingInput);
  sign.end();
  const pem = rawToSec1Pem(Buffer.from(privateKeyB64, "base64url"));
  const derSig = sign.sign(pem);
  const rawSig = derToRaw(derSig);
  return `${signingInput}.${base64url(rawSig)}`;
}

export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  env: Env,
  url?: string,
) {
  try {
    const raw = await env.KV.get(`push:${userId}`);
    if (!raw) return;

    const sub = JSON.parse(raw);
    if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) return;

    const vapidPrivateKey = env.VAPID_PRIVATE_KEY;
    const vapidPublicKey = env.VAPID_PUBLIC_KEY;
    const vapidEmail = env.VAPID_EMAIL;
    if (!vapidPrivateKey || !vapidPublicKey || !vapidEmail) return;

    const userPublicKey = Buffer.from(sub.keys.p256dh, "base64url");
    const userAuth = Buffer.from(sub.keys.auth, "base64url");
    const localCurve = createECDH("prime256v1");
    const localPublicKey = localCurve.generateKeys();
    const salt = randomBytes(16);

    const sharedSecret = localCurve.computeSecret(userPublicKey);

    const secret = hkdf(
      userAuth,
      sharedSecret,
      Buffer.concat([Buffer.from("WebPush: info\0"), userPublicKey, localPublicKey]),
      32,
    );

    const prk = hashHmac(salt, secret);
    const contentKey = hkdf(prk, Buffer.alloc(0), Buffer.from("Content-Encoding: aes128gcm\0"), 16);
    const nonceBase = hkdf(prk, Buffer.alloc(0), Buffer.from("Content-Encoding: nonce\0"), 12);

    const payloadBuf = Buffer.from(JSON.stringify({ title, body, data: { url } }), "utf-8");
    const plaintext = Buffer.concat([payloadBuf, Buffer.from([2])]);

    const nonce = generateNonce(nonceBase, 0);
    const cipher = createCipheriv("aes-128-gcm", contentKey, nonce);
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()]);

    const recordSize = 4096;
    const header = Buffer.concat([
      salt,
      Buffer.alloc(4),
      Buffer.from([65]),
      localPublicKey,
    ]);
    header.writeUInt32BE(recordSize, 16);

    const jwt = await createVapidJwt(sub.endpoint, vapidPrivateKey, vapidEmail);

    await fetch(sub.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aes128gcm",
        TTL: "86400",
        Authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
      },
      body: Buffer.concat([header, encrypted]),
    });
  } catch (err) {
    console.error("Push notification failed:", err);
  }
}
