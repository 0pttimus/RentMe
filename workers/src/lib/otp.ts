const OTP_TTL_SECONDS = 600; // 10 minutes
const MAX_ATTEMPTS = 5;

export interface OtpRecord {
  code: string;
  attempts: number;
  expiresAt: number;
  fullName?: string;
  phone?: string;
  purpose: "auth";
}

function otpKey(email: string): string {
  return `otp:${email.toLowerCase().trim()}`;
}

export function generateOtpCode(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(100000 + (array[0] % 900000));
}

export async function storeOtp(
  kv: KVNamespace,
  email: string,
  record: OtpRecord
): Promise<void> {
  await kv.put(otpKey(email), JSON.stringify(record), {
    expirationTtl: OTP_TTL_SECONDS,
  });
}

export async function getOtp(
  kv: KVNamespace,
  email: string
): Promise<OtpRecord | null> {
  const raw = await kv.get(otpKey(email));
  if (!raw) return null;
  return JSON.parse(raw) as OtpRecord;
}

export async function deleteOtp(kv: KVNamespace, email: string): Promise<void> {
  await kv.delete(otpKey(email));
}

export async function verifyOtp(
  kv: KVNamespace,
  email: string,
  code: string
): Promise<{ valid: boolean; record?: OtpRecord; error?: string }> {
  const record = await getOtp(kv, email);

  if (!record) {
    return { valid: false, error: "OTP expired or not found. Request a new code." };
  }

  if (Date.now() > record.expiresAt) {
    await deleteOtp(kv, email);
    return { valid: false, error: "OTP has expired. Request a new code." };
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    await deleteOtp(kv, email);
    return { valid: false, error: "Too many attempts. Request a new code." };
  }

  if (record.code !== code.trim()) {
    record.attempts += 1;
    await storeOtp(kv, email, record);
    const remaining = MAX_ATTEMPTS - record.attempts;
    return {
      valid: false,
      error: `Invalid code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
    };
  }

  return { valid: true, record };
}

export function buildOtpExpiry(): number {
  return Date.now() + OTP_TTL_SECONDS * 1000;
}