import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { createTransferInstruction } from "@solana/spl-token";
import { requireUser } from "../lib/auth";
import type { Env } from "../lib/env";
import { SolanaClient } from "../lib/solana";
import { decryptMnemonic } from "../lib/wallet-crypto";
import { generateId } from "../lib/session";
import { sendPushNotification } from "../lib/push";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

async function userKeypair(userId: string, email: string, env: Env): Promise<Keypair | Response> {
  const row = await env.DB.prepare(
    `SELECT encrypted_secret FROM users WHERE id = ?`
  ).bind(userId).first<{ encrypted_secret: string }>();
  if (!row?.encrypted_secret) return json({ error: "No Solana wallet." }, 400);
  const secretStr = decryptMnemonic(row.encrypted_secret, env.WALLET_ENCRYPTION_KEY!, email);
  return Keypair.fromSecretKey(Buffer.from(secretStr, "base64"));
}

async function reservationByEscrow(db: D1Database, escrowAddr: string) {
  return db.prepare(
    `SELECT r.id, r.status, r.property_id, r.tenant_id, p.landlord_id
     FROM reservations r JOIN properties p ON p.id = r.property_id
     WHERE r.escrow_contract_address = ?`
  ).bind(escrowAddr).first<{ id: string; status: string; property_id: string; tenant_id: string; landlord_id: string }>();
}

function notFound() { return json({ error: "Reservation not found" }, 404); }

export async function handleGetEscrowState(request: Request, env: Env) {
  const user = await requireUser(request, env.DB);
  if (user instanceof Response) return user;
  const address = new URL(request.url).pathname.split("/")[3];
  if (!address) return json({ error: "Address required" }, 400);
  const sol = new SolanaClient(env);
  const state = await sol.getEscrowState(new PublicKey(address));
  if (!state) return json({ error: "Not found" }, 404);
  return json(state);
}

export async function handleDepositToEscrow(request: Request, env: Env) {
  const user = await requireUser(request, env.DB);
  if (user instanceof Response) return user;
  const address = new URL(request.url).pathname.split("/")[3];
  const { amount } = await request.json() as { amount?: string };
  if (!amount) return json({ error: "amount required" }, 400);

  const reservation = await reservationByEscrow(env.DB, address);
  if (!reservation) return notFound();
  if (reservation.tenant_id !== user.id) return json({ error: "Only tenant can deposit" }, 403);
  if (reservation.status !== "approved") return json({ error: "Escrow already funded or reservation not approved." }, 409);

  const sol = new SolanaClient(env);
  const tenantKeypair = await userKeypair(user.id, user.email, env);
  if (tenantKeypair instanceof Response) return tenantKeypair;

  const escrowAddr = new PublicKey(address);
  const state = await sol.getEscrowState(escrowAddr);
  if (!state) return json({ error: "Escrow not found" }, 404);

  const escrowTokenAccount = new PublicKey(state.escrowTokenAccount);
  const tenantTokenAccount = await sol.getOrCreateTokenAccount(tenantKeypair.publicKey);

  const sig = await sol.sendAsFeePayer(
    new Transaction().add(
      createTransferInstruction(tenantTokenAccount, escrowTokenAccount, tenantKeypair.publicKey, BigInt(amount)),
    ),
    tenantKeypair,
  );

  await env.DB.batch([
    env.DB.prepare(`UPDATE reservations SET status = 'funded', updated_at = datetime('now') WHERE id = ?`).bind(reservation.id),
    env.DB.prepare(`UPDATE properties SET status = 'reserved' WHERE id = ?`).bind(reservation.property_id),
    env.DB.prepare(`INSERT INTO notifications (id, user_id, title, body, type) VALUES (?, ?, 'Reservation deposit confirmed', ?, 'reservation')`).bind(generateId(), reservation.landlord_id, `Deposit received onchain. Your property has been reserved.`),
  ]);
  sendPushNotification(reservation.landlord_id, "Reservation deposit confirmed", `Deposit received onchain. Your property has been reserved.`, env);

  return json({ txHash: sig, status: "funded" });
}

export async function handleMarkDone(request: Request, env: Env) {
  const user = await requireUser(request, env.DB);
  if (user instanceof Response) return user;
  const address = new URL(request.url).pathname.split("/")[3];

  const reservation = await reservationByEscrow(env.DB, address);
  if (!reservation) return notFound();
  if (reservation.landlord_id !== user.id) return json({ error: "Only worker can mark done" }, 403);

  const keypair = await userKeypair(user.id, user.email, env);
  if (keypair instanceof Response) return keypair;
  const sol = new SolanaClient(env);
  const txHash = await sol.markDone(new PublicKey(address), keypair);

  await env.DB.prepare(
    `UPDATE reservations SET status = 'worker_done', updated_at = datetime('now') WHERE id = ?`
  ).bind(reservation.id).run();

  return json({ txHash, status: "worker_done" });
}

export async function handleConfirmCompletion(request: Request, env: Env) {
  const user = await requireUser(request, env.DB);
  if (user instanceof Response) return user;
  const address = new URL(request.url).pathname.split("/")[3];

  const reservation = await reservationByEscrow(env.DB, address);
  if (!reservation) return notFound();
  if (reservation.tenant_id !== user.id) return json({ error: "Only tenant can confirm" }, 403);

  const keypair = await userKeypair(user.id, user.email, env);
  if (keypair instanceof Response) return keypair;
  const sol = new SolanaClient(env);

  const escrowAddr = new PublicKey(address);
  const state = await sol.getEscrowState(escrowAddr);
  if (!state) return json({ error: "Escrow not found" }, 404);

  const workerTokenAccount = await sol.getOrCreateTokenAccount(new PublicKey(state.worker));
  const feeTokenAccount = await sol.getOrCreateTokenAccount(new PublicKey(state.feeCollector));

  const txHash = await sol.confirm(
    escrowAddr, keypair,
    workerTokenAccount, feeTokenAccount,
    new PublicKey(state.escrowTokenAccount),
  );

  await env.DB.prepare(
    `UPDATE reservations SET status = 'completed', updated_at = datetime('now') WHERE id = ?`
  ).bind(reservation.id).run();

  return json({ txHash, status: "completed" });
}

export async function handleRequestRefund(request: Request, env: Env) {
  const user = await requireUser(request, env.DB);
  if (user instanceof Response) return user;
  const address = new URL(request.url).pathname.split("/")[3];

  const reservation = await reservationByEscrow(env.DB, address);
  if (!reservation) return notFound();
  if (reservation.landlord_id !== user.id) return json({ error: "Only worker can request refund" }, 403);

  const keypair = await userKeypair(user.id, user.email, env);
  if (keypair instanceof Response) return keypair;
  const sol = new SolanaClient(env);

  const escrowAddr = new PublicKey(address);
  const state = await sol.getEscrowState(escrowAddr);
  if (!state) return json({ error: "Escrow not found" }, 404);

  const tenantTokenAccount = await sol.getOrCreateTokenAccount(new PublicKey(state.tenant));
  const txHash = await sol.refund(
    escrowAddr, keypair,
    tenantTokenAccount, new PublicKey(state.escrowTokenAccount),
  );

  await env.DB.batch([
    env.DB.prepare(`UPDATE reservations SET status = 'refunded', updated_at = datetime('now') WHERE id = ?`).bind(reservation.id),
    env.DB.prepare(`UPDATE properties SET status = 'verified' WHERE id = ?`).bind(reservation.property_id),
  ]);

  return json({ txHash, status: "refunded" });
}

export async function handlePingTimeout(request: Request, env: Env) {
  return json({ error: "Not needed on Solana (programs don't time out)" }, 400);
}
