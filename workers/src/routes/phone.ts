import { requireUser } from "../lib/auth";
import type { Env } from "../lib/env";
import {
  buildOtpExpiry,
  deleteOtp,
  generateOtpCode,
  storeOtp,
  verifyOtp,
} from "../lib/otp";
import { sendSmsOtp } from "../lib/termii";
import { generateId } from "../lib/session";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

export async function handleSendPhoneOtp(request: Request, env: Env) {
  const user = await requireUser(request, env.DB);
  if (user instanceof Response) return user;

  const body = (await request.json()) as { phone?: string };
  const phone = body.phone?.trim();
  if (!phone) return json({ error: "Phone required." }, 400);

  const code = generateOtpCode();
  await storeOtp(env.KV, `phone:${phone}`, {
    code,
    attempts: 0,
    expiresAt: buildOtpExpiry(),
    purpose: "auth",
  });

  if (!env.TERMII_API_KEY) {
    if (env.ENVIRONMENT === "development") {
      return json({ success: true, devCode: code });
    }
    await deleteOtp(env.KV, `phone:${phone}`);
    return json({ error: "SMS not configured." }, 503);
  }

  const result = await sendSmsOtp(
    env.TERMII_API_KEY,
    env.TERMII_SENDER_ID ?? "RentMe",
    phone,
    code
  );

  if (!result.success) {
    await deleteOtp(env.KV, `phone:${phone}`);
    return json({ error: result.error }, 500);
  }

  await env.DB.prepare(`UPDATE users SET phone = ? WHERE id = ?`).bind(phone, user.id).run();
  return json({ success: true });
}

export async function handleVerifyPhoneOtp(request: Request, env: Env) {
  const user = await requireUser(request, env.DB);
  if (user instanceof Response) return user;

  const body = (await request.json()) as { phone?: string; code?: string };
  if (!body.phone || !body.code) return json({ error: "Phone and code required." }, 400);

  const result = await verifyOtp(env.KV, `phone:${body.phone}`, body.code);
  if (!result.valid) return json({ error: result.error }, 400);

  await deleteOtp(env.KV, `phone:${body.phone}`);
  await env.DB.prepare(`UPDATE users SET phone_verified = 1, phone = ? WHERE id = ?`)
    .bind(body.phone, user.id).run();

  return json({ success: true });
}