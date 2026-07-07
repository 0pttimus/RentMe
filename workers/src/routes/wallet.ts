import { PublicKey } from "@solana/web3.js";
import { requireUser } from "../lib/auth";
import { SolanaClient } from "../lib/solana";
import type { Env } from "../lib/env";
import { generateId } from "../lib/session";

const USDC_DECIMALS = 6;
const USDC_NGN_RATE = 1500;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function handleWalletCreate(
  request: Request,
  env: Env
): Promise<Response> {
  const auth = await requireUser(request, env.DB);
  if (auth instanceof Response) return auth;

  const body = (await request.json()) as {
    passwordShare?: string;
    otpShare2?: string;
    otpRecoveryShare1?: string;
  };

  if (!body.passwordShare || !body.otpShare2 || !body.otpRecoveryShare1) {
    return json({ error: "Missing required wallet data." }, 400);
  }

  await env.KV.put(
    `wallet:${auth.id}`,
    JSON.stringify({
      passwordShare: body.passwordShare,
      otpShare2: body.otpShare2,
      otpRecoveryShare1: body.otpRecoveryShare1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  );

  return json({ success: true });
}

export async function handleWalletRecover(
  request: Request,
  env: Env
): Promise<Response> {
  const auth = await requireUser(request, env.DB);
  if (auth instanceof Response) return auth;

  const raw = await env.KV.get(`wallet:${auth.id}`);
  if (!raw) return json({ error: "No wallet found." }, 404);

  return json(JSON.parse(raw));
}

const CREDITED_KV = "usdc_credited";
const DEPOSIT_KV = "usdc_deposit";

async function creditNgn(
  db: D1Database,
  userId: string,
  ngnAmount: number,
  reference: string,
): Promise<number> {
  const wallet = await db.prepare(
    `SELECT id FROM wallets WHERE user_id = ?`
  ).bind(userId).first<{ id: string }>();
  if (!wallet) return 0;
  await db.batch([
    db.prepare(`UPDATE wallets SET balance_ngn = balance_ngn + ? WHERE user_id = ?`).bind(ngnAmount, userId),
    db.prepare(
      `INSERT INTO wallet_transactions (id, wallet_id, type, amount_ngn, reference) VALUES (?, ?, 'usdc_deposit', ?, ?)`
    ).bind(generateId(), wallet.id, ngnAmount, reference),
  ]);
  return ngnAmount;
}

export async function handleUsdcDeposit(
  request: Request,
  env: Env
): Promise<Response> {
  const auth = await requireUser(request, env.DB);
  if (auth instanceof Response) return auth;

  const body = (await request.json()) as { amount?: number };
  const usdcAmount = body.amount;
  if (!usdcAmount || usdcAmount < 1) {
    return json({ error: "Minimum deposit 1 USDC." }, 400);
  }

  const wallet = await env.DB.prepare(
    `SELECT id, solana_wallet_address FROM wallets WHERE user_id = ?`
  ).bind(auth.id).first<{ id: string; solana_wallet_address: string | null }>();
  if (!wallet || !wallet.solana_wallet_address) {
    return json({ error: "No Solana wallet found. Complete your profile first." }, 400);
  }

  return json({
    walletAddress: wallet.solana_wallet_address,
    amount: usdcAmount,
    tokenMint: env.TOKEN_MINT_ADDRESS || "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr",
  });
}

export async function handleUsdcDepositVerify(
  request: Request,
  env: Env
): Promise<Response> {
  const auth = await requireUser(request, env.DB);
  if (auth instanceof Response) return auth;

  const wallet = await env.DB.prepare(
    `SELECT id, solana_wallet_address FROM wallets WHERE user_id = ?`
  ).bind(auth.id).first<{ id: string; solana_wallet_address: string | null }>();
  if (!wallet || !wallet.solana_wallet_address) {
    return json({ error: "No Solana wallet found." }, 400);
  }

  const solana = new SolanaClient(env);
  const userPubkey = new PublicKey(wallet.solana_wallet_address);

  const balResult = await solana.tryGetTokenBalance(userPubkey);
  if (balResult.error) {
    return json({ error: `RPC error: ${balResult.error}` }, 502);
  }
  const currentBalance = balResult.balance;

  // Try pending deposit KV first
  const depositRaw = await env.KV.get(`${DEPOSIT_KV}:${auth.id}`);
  if (depositRaw) {
    const deposit = JSON.parse(depositRaw);
    const ngnAmount = deposit.amount * USDC_NGN_RATE;
    if (currentBalance < deposit.preBalance + deposit.amount * 10 ** USDC_DECIMALS) {
      return json({ verified: false, currentBalance });
    }
    await env.KV.delete(`${DEPOSIT_KV}:${auth.id}`);
    await env.KV.put(`${CREDITED_KV}:${auth.id}`, String(currentBalance), { expirationTtl: 86400 * 365 });
    const credited = await creditNgn(env.DB, auth.id, ngnAmount, `deposit:${depositRaw.length}:${Date.now()}`);
    return json({ verified: true, balanceNgn: credited });
  }

  // Fallback: no pending KV — credit the increase since last credited balance
  const creditedRaw = await env.KV.get(`${CREDITED_KV}:${auth.id}`);
  if (!creditedRaw && currentBalance > 0) {
    const ngnAmount = Math.floor(currentBalance / 10 ** USDC_DECIMALS) * USDC_NGN_RATE;
    if (ngnAmount > 0) {
      await env.KV.put(`${CREDITED_KV}:${auth.id}`, String(currentBalance), { expirationTtl: 86400 * 365 });
      const credited = await creditNgn(env.DB, auth.id, ngnAmount, `fallback:${Date.now()}`);
      return json({ verified: true, balanceNgn: credited });
    }
  } else if (creditedRaw && currentBalance > Number(creditedRaw)) {
    const increase = currentBalance - Number(creditedRaw);
    const ngnAmount = Math.floor(increase / 10 ** USDC_DECIMALS) * USDC_NGN_RATE;
    if (ngnAmount > 0) {
      await env.KV.put(`${CREDITED_KV}:${auth.id}`, String(currentBalance), { expirationTtl: 86400 * 365 });
      const credited = await creditNgn(env.DB, auth.id, ngnAmount, `increase:${Date.now()}`);
      return json({ verified: true, balanceNgn: credited });
    }
  }

  return json({ verified: false, currentBalance });
}

export async function handleUsdcWithdraw(
  request: Request,
  env: Env
): Promise<Response> {
  const auth = await requireUser(request, env.DB);
  if (auth instanceof Response) return auth;

  const body = (await request.json()) as { amount?: number };
  const ngnAmount = body.amount;
  if (!ngnAmount || ngnAmount < 100) {
    return json({ error: "Minimum withdrawal 100 NGN." }, 400);
  }

  const wallet = await env.DB.prepare(
    `SELECT id, balance_ngn, solana_wallet_address FROM wallets WHERE user_id = ?`
  ).bind(auth.id).first<{ id: string; balance_ngn: number; solana_wallet_address: string | null }>();
  if (!wallet) return json({ error: "Wallet not found." }, 400);
  if (!wallet.solana_wallet_address) return json({ error: "No Solana wallet. Complete your profile first." }, 400);

  if (wallet.balance_ngn < ngnAmount) {
    return json({ error: "Insufficient NGN balance." }, 400);
  }

  const usdcAmount = Math.floor(ngnAmount / USDC_NGN_RATE);
  if (usdcAmount < 0.001) {
    return json({ error: "Amount too small. Minimum equivalent is 0.001 USDC." }, 400);
  }

  const rawAmount = BigInt(Math.floor(usdcAmount * 10 ** USDC_DECIMALS));
  const solana = new SolanaClient(env);
  const userPubkey = new PublicKey(wallet.solana_wallet_address);

  try {
    const txSig = await solana.transferUsdc(userPubkey, rawAmount);

    await env.DB.batch([
      env.DB.prepare(`UPDATE wallets SET balance_ngn = balance_ngn - ? WHERE user_id = ?`)
        .bind(ngnAmount, auth.id),
      env.DB.prepare(
        `INSERT INTO wallet_transactions (id, wallet_id, type, amount_ngn, reference) VALUES (?, ?, 'usdc_withdraw', ?, ?)`
      ).bind(generateId(), wallet.id, -ngnAmount, txSig),
    ]);

    return json({ success: true, txSig, usdcAmount, balanceNgn: wallet.balance_ngn - ngnAmount });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "USDC transfer failed";
    return json({ error: msg }, 500);
  }
}

export async function handleNairaWithdraw(
  request: Request,
  env: Env
): Promise<Response> {
  const auth = await requireUser(request, env.DB);
  if (auth instanceof Response) return auth;

  const body = (await request.json()) as {
    amount?: number;
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
  };

  if (!body.amount || body.amount < 100) {
    return json({ error: "Minimum withdrawal 100 NGN." }, 400);
  }
  if (!body.bankName || !body.accountNumber || !body.accountName) {
    return json({ error: "Enter your bank name, account number, and account name." }, 400);
  }

  const wallet = await env.DB.prepare(
    `SELECT balance_ngn FROM wallets WHERE user_id = ?`
  ).bind(auth.id).first<{ balance_ngn: number }>();
  if (!wallet) return json({ error: "Wallet not found." }, 400);
  if (wallet.balance_ngn < body.amount) {
    return json({ error: "Insufficient NGN balance." }, 400);
  }

  await env.DB.prepare(
    `UPDATE wallets SET balance_ngn = balance_ngn - ? WHERE user_id = ?`
  ).bind(body.amount, auth.id).run();

  await env.DB.prepare(
    `INSERT INTO withdrawal_requests (id, user_id, amount, bank_name, account_number, account_name, status) VALUES (?, ?, ?, ?, ?, ?, 'pending')`
  ).bind(generateId(), auth.id, body.amount, body.bankName, body.accountNumber, body.accountName).run();

  return json({ success: true, message: "Withdrawal request submitted. We will process it shortly." });
}

const PAGE = 20;

export async function handleWalletGet(
  request: Request,
  env: Env
): Promise<Response> {
  const auth = await requireUser(request, env.DB);
  if (auth instanceof Response) return auth;

  const url = new URL(request.url);
  const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);

  const wallet = await env.DB.prepare(
    `SELECT balance_ngn FROM wallets WHERE user_id = ?`
  ).bind(auth.id).first<{ balance_ngn: number }>();

  const txs = await env.DB.prepare(
    `SELECT type, amount_ngn, reference, created_at FROM wallet_transactions WHERE wallet_id = (SELECT id FROM wallets WHERE user_id = ?) ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).bind(auth.id, PAGE + 1, offset).all<{ type: string; amount_ngn: number; reference: string | null; created_at: string }>();

  const reservations = await env.DB.prepare(
    `SELECT r.id, r.property_id, r.status, r.deposit_amount_ngn, r.created_at, p.title
     FROM reservations r
     JOIN properties p ON p.id = r.property_id
     WHERE r.tenant_id = ? OR p.landlord_id = ?
     ORDER BY r.created_at DESC
     LIMIT ? OFFSET ?`
  ).bind(auth.id, auth.id, PAGE + 1, offset).all<{ id: string; status: string; deposit_amount_ngn: number; created_at: string; title: string }>();

  const bookings = await env.DB.prepare(
    `SELECT sb.id, sb.status, sb.total_amount_ngn, sb.upfront_amount_ngn, sb.created_at, sp.user_id AS owner_id
     FROM service_bookings sb
     JOIN service_providers sp ON sp.id = sb.provider_id
     WHERE sb.customer_id = ? OR sp.user_id = ?
     ORDER BY sb.created_at DESC
     LIMIT ? OFFSET ?`
  ).bind(auth.id, auth.id, PAGE + 1, offset).all<{ id: string; status: string; total_amount_ngn: number; upfront_amount_ngn: number; created_at: string; owner_id: string }>();

  const results = txs.results ?? [];
  const hasMore = results.length > PAGE;

  return json({
    balanceNgn: wallet?.balance_ngn ?? 0,
    transactions: hasMore ? results.slice(0, PAGE) : results,
    reservations: (reservations.results ?? []).slice(0, PAGE),
    bookings: (bookings.results ?? []).slice(0, PAGE),
    hasMore,
  });
}
