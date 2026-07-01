import { PublicKey } from "@solana/web3.js";
import { requireUser } from "../lib/auth";
import type { Env } from "../lib/env";
import { SolanaClient } from "../lib/solana";
import { generateId } from "../lib/session";

function deposit(env: Env) { return Number(env.RESERVATION_DEPOSIT ?? "50000"); }
function inspectionHours(env: Env) { return Number(env.INSPECTION_HOURS ?? "72"); }
function feeBps(env: Env) { return Number(env.FEE_BPS ?? "100"); }

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function handleCreateReservation(request: Request, env: Env) {
  const user = await requireUser(request, env.DB);
  if (user instanceof Response) return user;

  const body = (await request.json()) as { propertyId?: string };
  if (!body.propertyId) return json({ error: "propertyId required." }, 400);

  const property = await env.DB.prepare(
    `SELECT id, title, status, landlord_id, rent_amount_ngn FROM properties WHERE id = ?`
  ).bind(body.propertyId).first<{ id: string; title: string; status: string; landlord_id: string; rent_amount_ngn: number }>();

  if (!property) return json({ error: "Property not found." }, 404);
  if (property.status === "reserved") return json({ error: "Property already reserved." }, 409);

  const dep = deposit(env);
  const wallet = await env.DB.prepare(
    `SELECT id, balance_ngn FROM wallets WHERE user_id = ?`
  ).bind(user.id).first<{ id: string; balance_ngn: number }>();

  if (!wallet || wallet.balance_ngn < dep) {
    return json({ error: `Insufficient balance. Need ₦${dep.toLocaleString()} deposit.` }, 402);
  }

  const reservationId = generateId();
  const deadline = new Date(Date.now() + inspectionHours(env) * 3600000).toISOString();

  await env.DB.batch([
    env.DB.prepare(`UPDATE wallets SET balance_ngn = balance_ngn - ? WHERE id = ?`).bind(dep, wallet.id),
    env.DB.prepare(
      `INSERT INTO wallet_transactions (id, wallet_id, type, amount_ngn, reference) VALUES (?, ?, 'reservation', ?, ?)`
    ).bind(generateId(), wallet.id, dep, reservationId),
    env.DB.prepare(
      `INSERT INTO reservations (id, property_id, tenant_id, deposit_amount_ngn, inspection_deadline) VALUES (?, ?, ?, ?, ?)`
    ).bind(reservationId, property.id, user.id, dep, deadline),
    env.DB.prepare(`UPDATE properties SET status = 'reserved' WHERE id = ?`).bind(property.id),
    env.DB.prepare(
      `INSERT INTO notifications (id, user_id, title, body, type) VALUES (?, ?, 'Property reserved', ?, 'reservation')`
    ).bind(generateId(), user.id, `${property.title} reserved. Inspect within 72 hours.`),
  ]);

  const sol = new SolanaClient(env);
  const tenantPub = new PublicKey((await env.DB.prepare(
    `SELECT ton_wallet_address FROM users WHERE id = ?`
  ).bind(user.id).first<{ ton_wallet_address: string }>())?.ton_wallet_address ?? "");
  const workerPub = new PublicKey((await env.DB.prepare(
    `SELECT ton_wallet_address FROM users WHERE id = ?`
  ).bind(property.landlord_id).first<{ ton_wallet_address: string }>())?.ton_wallet_address ?? "");

  let escrowAddress = "";
  let escrowTx = "";
  if (tenantPub.toBase58() !== "") {
    const nonce = BigInt(Date.now());
    const feeCollector = new PublicKey(env.FEE_COLLECTOR_ADDRESS ?? sol.adminPubkey.toBase58());
    const { pda } = sol.escrowPda(sol.adminPubkey, nonce);
    const escrowTokenAccount = await sol.escrowTokenAccount(pda);
    const result = await sol.initEscrow(
      tenantPub, workerPub, nonce, feeBps(env), property.rent_amount_ngn, feeCollector, escrowTokenAccount, dep,
    );
    escrowAddress = result.escrowAddress.toBase58();
    escrowTx = result.txHash;
    await env.DB.prepare(
      `UPDATE reservations SET escrow_contract_address = ?, escrow_tx_hash = ? WHERE id = ?`
    ).bind(escrowAddress, escrowTx, reservationId).run();
  }

  return json({ success: true, reservationId, inspectionDeadline: deadline, escrowAddress, escrowTx });
}

export async function handleListReservations(request: Request, env: Env) {
  const user = await requireUser(request, env.DB);
  if (user instanceof Response) return user;

  const rows = await env.DB.prepare(
    `SELECT r.*, p.title, p.address FROM reservations r
     JOIN properties p ON p.id = r.property_id
     WHERE r.tenant_id = ? ORDER BY r.created_at DESC`
  ).bind(user.id).all();

  return json({ reservations: rows.results ?? [] });
}

export async function handleGetReservation(request: Request, env: Env) {
  const user = await requireUser(request, env.DB);
  if (user instanceof Response) return user;

  const id = new URL(request.url).pathname.split("/")[2];
  const row = await env.DB.prepare(
    `SELECT r.*, p.title, p.address, p.rent_amount_ngn FROM reservations r
     JOIN properties p ON p.id = r.property_id
     WHERE r.id = ? AND r.tenant_id = ?`
  ).bind(id, user.id).first();

  if (!row) return json({ error: "Not found" }, 404);
  return json(row);
}
