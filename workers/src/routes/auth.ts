import { PublicKey } from "@solana/web3.js";
import { requireUser } from "../lib/auth";
import {
  createSession,
  createUser,
  deleteSession,
  findUserByEmail,
  getSessionUser,
  setupUserWallet,
  updateUserProfile,
} from "../lib/db";
import { SolanaClient } from "../lib/solana";
import {
  buildOtpExpiry,
  deleteOtp,
  generateOtpCode,
  storeOtp,
  verifyOtp,
} from "../lib/otp";
import { sendOtpEmail } from "../lib/resend";
import { sendPushNotification } from "../lib/push";
import {
  buildClearSessionCookie,
  buildSessionCookie,
  generateId,
  parseCookies,
} from "../lib/session";

export type { Env } from "../lib/env";
import type { Env } from "../lib/env";

function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function isProduction(env: Env): boolean {
  return env.ENVIRONMENT === "production";
}

export async function handleSendOtp(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as { email?: string };

  const email = body.email?.toLowerCase().trim();
  if (!email || !email.includes("@")) {
    return json({ error: "Valid email is required." }, 400);
  }

  const code = generateOtpCode();

  await storeOtp(env.KV, email, {
    code,
    attempts: 0,
    expiresAt: buildOtpExpiry(),
    purpose: "auth",
  });

  if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) {
    if (env.ENVIRONMENT === "development") {
      return json({
        success: true,
        message: "OTP sent (dev mode).",
        devCode: code,
      });
    }
    await deleteOtp(env.KV, email);
    return json({ error: "Email service not configured." }, 503);
  }

  const emailResult = await sendOtpEmail(env.RESEND_API_KEY, env.RESEND_FROM_EMAIL, {
    to: email,
    code,
    purpose: "auth",
  });

  if (!emailResult.success) {
    await deleteOtp(env.KV, email);
    return json({ error: emailResult.error ?? "Failed to send OTP email." }, 500);
  }

  return json({ success: true, message: "Verification code sent to your email." });
}

export async function handleVerifyOtp(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as { email?: string; code?: string };

  const email = body.email?.toLowerCase().trim();
  const code = body.code?.trim();

  if (!email || !code) {
    return json({ error: "Email and verification code are required." }, 400);
  }

  const result = await verifyOtp(env.KV, email, code);

  if (!result.valid || !result.record) {
    return json({ error: result.error ?? "Invalid verification code." }, 400);
  }

  let user = await findUserByEmail(env.DB, email);

  if (!user) {
    user = await createUser(
      env.DB, { email },
      Number(env.INITIAL_WALLET_BALANCE ?? "0"),
      Number(env.DEFAULT_TRUST_SCORE ?? "500"),
    );
  }

  await deleteOtp(env.KV, email);

  const sessionId = await createSession(env.DB, user.id);

  return json(
    { success: true, user },
    200,
    { "Set-Cookie": buildSessionCookie(sessionId, isProduction(env)) }
  );
}

export async function handleCompleteProfile(
  request: Request,
  env: Env
): Promise<Response> {
  const auth = await requireUser(request, env.DB);
  if (auth instanceof Response) return auth;

  const body = (await request.json()) as { fullName?: string; phone?: string };
  const fullName = body.fullName?.trim() ?? "";
  const phone = body.phone?.trim() ?? "";

  if (fullName.length < 2) {
    return json({ error: "Enter your full name." }, 400);
  }

  if (phone.length < 10) {
    return json({ error: "Enter a valid phone number." }, 400);
  }

  const user = await updateUserProfile(env.DB, auth.id, { fullName, phone });
  if (!user) {
    return json({ error: "Could not update profile." }, 500);
  }

  if (env.WALLET_ENCRYPTION_KEY) {
    await setupUserWallet(env.DB, auth.id, user.email, env.WALLET_ENCRYPTION_KEY);
  }

  await env.DB.prepare(
    `INSERT INTO notifications (id, user_id, title, body, type) VALUES (?, ?, ?, ?, ?)`
  ).bind(
    generateId(), auth.id,
    "Welcome to RentMe",
    "Welcome to RentMe! Your account is all set up.\n\n" +
    "Here is a quick guide to get you started:\n\n" +
    "Browse properties and services in the Markets tab. Found something you like? Reserve it by paying a deposit. You then have 72 hours to inspect before confirming.\n\n" +
    "A quick but important note. RentMe is built on Solana, which means you have a private key that controls your wallet. Never share this key with anyone, not even us. We encrypt it so only you can access your funds.\n\n" +
    "If you ever need help, visit the Help page from your profile.",
    "info"
  ).run();
  sendPushNotification(auth.id, "Welcome to RentMe", "Welcome to RentMe! Your account is all set up.", env);

  return json({ success: true, user });
}

export async function handleMe(request: Request, env: Env): Promise<Response> {
  const cookies = parseCookies(request.headers.get("Cookie"));
  const sessionId = cookies.rentme_session;

  if (!sessionId) {
    return json({ user: null });
  }

  const user = await getSessionUser(env.DB, sessionId);
  if (!user) {
    return json({ user: null });
  }

  return json({ user });
}

export async function handleUploadAvatar(request: Request, env: Env): Promise<Response> {
  const auth = await requireUser(request, env.DB);
  if (auth instanceof Response) return auth;

  const body = (await request.json()) as { avatarUrl?: string };
  const avatarUrl = body.avatarUrl?.trim();
  if (!avatarUrl) return json({ error: "avatarUrl is required." }, 400);

  await env.DB.prepare(
    `UPDATE users SET avatar_url = ?, updated_at = datetime('now') WHERE id = ?`
  ).bind(avatarUrl, auth.id).run();

  return json({ success: true, avatarUrl });
}

export async function handleLogout(request: Request, env: Env): Promise<Response> {
  const cookies = parseCookies(request.headers.get("Cookie"));
  const sessionId = cookies.rentme_session;

  if (sessionId) {
    await deleteSession(env.DB, sessionId);
  }

  return json(
    { success: true },
    200,
    { "Set-Cookie": buildClearSessionCookie(isProduction(env)) }
  );
}