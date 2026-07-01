import { requireUser } from "../lib/auth";
import type { Env } from "../lib/env";
import { initializePayment, verifyPayment } from "../lib/paystack";
import { generateId } from "../lib/session";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

export async function handlePaystackInit(request: Request, env: Env) {
  const user = await requireUser(request, env.DB);
  if (user instanceof Response) return user;

  const body = (await request.json()) as { amount?: number; callbackUrl?: string };
  const amount = body.amount;
  if (!amount || amount < 100) return json({ error: "Minimum deposit ₦100." }, 400);

  if (!env.PAYSTACK_SECRET_KEY) {
    // Mock deposit for dev without Paystack
    const wallet = await env.DB.prepare(`SELECT id FROM wallets WHERE user_id = ?`).bind(user.id).first<{ id: string }>();
    if (wallet) {
      await env.DB.batch([
        env.DB.prepare(`UPDATE wallets SET balance_ngn = balance_ngn + ? WHERE user_id = ?`).bind(amount, user.id),
        env.DB.prepare(`INSERT INTO wallet_transactions (id, wallet_id, type, amount_ngn, reference) VALUES (?, ?, 'deposit', ?, 'mock-paystack')`)
          .bind(generateId(), wallet.id, amount),
      ]);
    }
    return json({ success: true, mock: true, message: "Mock deposit credited." });
  }

  const reference = `rentme-${generateId()}`;
  const callbackUrl = body.callbackUrl ?? "https://rentme.pages.dev/wallet?paid=1";

  const result = await initializePayment(
    env.PAYSTACK_SECRET_KEY,
    user.email,
    amount,
    reference,
    callbackUrl
  );

  if ("error" in result) return json({ error: result.error }, 500);

  await env.DB.prepare(
    `INSERT INTO paystack_transactions (id, user_id, reference, amount_ngn) VALUES (?, ?, ?, ?)`
  ).bind(generateId(), user.id, result.reference, amount).run();

  return json({ authorizationUrl: result.authorizationUrl, reference: result.reference });
}

export async function handlePaystackWebhook(request: Request, env: Env) {
  const body = (await request.json()) as { event?: string; data?: { reference?: string; status?: string } };

  if (body.event !== "charge.success" || !body.data?.reference) {
    return json({ received: true });
  }

  if (!env.PAYSTACK_SECRET_KEY) return json({ error: "Not configured" }, 503);

  const verified = await verifyPayment(env.PAYSTACK_SECRET_KEY, body.data.reference);
  if (!verified.status || verified.data?.status !== "success") {
    return json({ error: "Verification failed" }, 400);
  }

  const tx = await env.DB.prepare(
    `SELECT * FROM paystack_transactions WHERE reference = ? AND status = 'pending'`
  ).bind(body.data.reference).first<{ id: string; user_id: string; amount_ngn: number }>();

  if (!tx) return json({ received: true });

  const wallet = await env.DB.prepare(`SELECT id FROM wallets WHERE user_id = ?`).bind(tx.user_id).first<{ id: string }>();

  await env.DB.batch([
    env.DB.prepare(`UPDATE paystack_transactions SET status = 'success' WHERE id = ?`).bind(tx.id),
    env.DB.prepare(`UPDATE wallets SET balance_ngn = balance_ngn + ? WHERE user_id = ?`).bind(tx.amount_ngn, tx.user_id),
    env.DB.prepare(`INSERT INTO wallet_transactions (id, wallet_id, type, amount_ngn, reference) VALUES (?, ?, 'deposit', ?, ?)`)
      .bind(generateId(), wallet!.id, tx.amount_ngn, tx.id),
  ]);

  return json({ received: true });
}

export async function handleListBanks(_request: Request, env: Env) {
  if (!env.PAYSTACK_SECRET_KEY) return json({ error: "Paystack not configured" }, 503);

  try {
    const res = await fetch("https://api.paystack.co/bank?country=nigeria", {
      headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}` },
    });
    const data = await res.json() as { status: boolean; data?: Array<{ code: string; name: string }> };
    if (!data.status) return json({ error: "Failed to fetch banks" }, 500);
    const banks = (data.data ?? []).map((b) => ({ code: b.code, name: b.name }));
    return json({ banks });
  } catch {
    return json({ error: "Failed to fetch banks" }, 500);
  }
}

export async function handleResolveAccount(request: Request, env: Env) {
  if (!env.PAYSTACK_SECRET_KEY) return json({ error: "Paystack not configured" }, 503);

  const body = (await request.json()) as { accountNumber?: string; bankCode?: string };
  if (!body.accountNumber || !body.bankCode) {
    return json({ error: "Enter account number and select bank." }, 400);
  }

  try {
    const res = await fetch(
      `https://api.paystack.co/bank/resolve?account_number=${body.accountNumber}&bank_code=${body.bankCode}`,
      { headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}` } },
    );
    const data = await res.json() as { status: boolean; data?: { account_name: string }; message?: string };
    if (!data.status) return json({ error: data.message ?? "Could not resolve account." }, 400);
    return json({ accountName: data.data!.account_name });
  } catch {
    return json({ error: "Failed to resolve account." }, 500);
  }
}