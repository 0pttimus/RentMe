import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { createTransferInstruction, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { requireUser } from "../lib/auth";
import type { Env } from "../lib/env";
import { generateId } from "../lib/session";
import { SolanaClient } from "../lib/solana";
import { decryptMnemonic } from "../lib/wallet-crypto";
import { sendPushNotification } from "../lib/push";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// auto-cancel expired inspections
async function autoCancelExpired(db: D1Database, env: Env) {
  // expired inspections → change to expired_inspection (don't auto-cancel, let user choose)
  const expired = await db.prepare(
    `SELECT id, property_id, tenant_id, escrow_contract_address FROM reservations
     WHERE status = 'inspecting' AND inspection_deadline < datetime('now')`
  ).all<{ id: string; property_id: string; tenant_id: string; escrow_contract_address: string | null }>();
  for (const r of expired.results ?? []) {
    await db.batch([
      db.prepare(`UPDATE reservations SET status = 'expired_inspection', updated_at = datetime('now') WHERE id = ?`).bind(r.id),
      db.prepare(`INSERT INTO notifications (id, user_id, title, body, type) VALUES (?, ?, 'Inspection time expired', ?, 'reservation')`).bind(generateId(), r.tenant_id, `Your 24-hour inspection window has expired. Extend by 24 hours for ₦5,000 or cancel to get a full refund.`),
    ]);
    sendPushNotification(r.tenant_id, "Inspection time expired", "Your 24-hour inspection window has expired. Extend for ₦5,000 or cancel for a full refund.", env);
  }

  // send reminders for inspecting reservations nearing expiry
  const nearing = await db.prepare(
    `SELECT id, property_id, tenant_id, inspection_deadline FROM reservations
     WHERE status = 'inspecting' AND inspection_deadline > datetime('now')`
  ).all<{ id: string; property_id: string; tenant_id: string; inspection_deadline: string }>();
  for (const r of nearing.results ?? []) {
    const msLeft = new Date(r.inspection_deadline).getTime() - Date.now();
    const minsLeft = Math.floor(msLeft / 60000);
    if (minsLeft === 60) {
      db.prepare(`INSERT INTO notifications (id, user_id, title, body, type) VALUES (?, ?, '1 hour remaining', ?, 'reservation')`).bind(generateId(), r.tenant_id, `You have 1 hour left to inspect the property.`).run();
      sendPushNotification(r.tenant_id, "1 hour remaining", "You have 1 hour left to inspect the property.", env);
    } else if (minsLeft === 30) {
      db.prepare(`INSERT INTO notifications (id, user_id, title, body, type) VALUES (?, ?, '30 minutes remaining', ?, 'reservation')`).bind(generateId(), r.tenant_id, `Only 30 minutes left! Inspect and pay the balance before time runs out.`).run();
      sendPushNotification(r.tenant_id, "30 minutes remaining", "Only 30 minutes left! Inspect and pay the balance before time runs out.", env);
    } else if (minsLeft === 10) {
      db.prepare(`INSERT INTO notifications (id, user_id, title, body, type) VALUES (?, ?, '10 minutes remaining', ?, 'reservation')`).bind(generateId(), r.tenant_id, `10 minutes left! Your inspection window will expire.`).run();
      sendPushNotification(r.tenant_id, "10 minutes remaining", "10 minutes left! Your inspection window will expire.", env);
    }
  }

  // auto-reject pending_landlord older than 3 hours AND refund escrow
  const stale = await db.prepare(
    `SELECT id, property_id, tenant_id, escrow_contract_address FROM reservations
     WHERE status = 'pending_landlord' AND created_at < datetime('now', '-3 hours')`
  ).all<{ id: string; property_id: string; tenant_id: string; escrow_contract_address: string | null }>();
  for (const r of stale.results ?? []) {
    if (r.escrow_contract_address) {
      try { await refundEscrow(r.escrow_contract_address, r.tenant_id, env); } catch {}
    }
    await db.batch([
      db.prepare(`UPDATE reservations SET status = 'rejected', updated_at = datetime('now') WHERE id = ?`).bind(r.id),
      db.prepare(`UPDATE properties SET status = 'available' WHERE id = ?`).bind(r.property_id),
    ]);
    await notifyAlertSubscribers(db, r.property_id, "The landlord did not respond within 3 hours, so the reservation was automatically cancelled.", env);
  }
}

async function refundEscrow(escrowAddress: string, userId: string, env: Env) {
  const row = await env.DB.prepare(
    `SELECT encrypted_secret, email FROM users WHERE id = ?`
  ).bind(userId).first<{ encrypted_secret: string; email: string }>();
  if (!row?.encrypted_secret) return;
  const secretStr = decryptMnemonic(row.encrypted_secret, env.WALLET_ENCRYPTION_KEY!, row.email);
  const keypair = Keypair.fromSecretKey(Buffer.from(secretStr, "base64"));
  const sol = new SolanaClient(env);
  const escrowAddr = new PublicKey(escrowAddress);
  const state = await sol.getEscrowState(escrowAddr);
  if (!state) return;
  const tenantTokenAccount = await sol.getOrCreateTokenAccount(new PublicKey(state.tenant));
  await sol.refund(escrowAddr, keypair, tenantTokenAccount, new PublicKey(state.escrowTokenAccount));
}

async function notifyAlertSubscribers(db: D1Database, propertyId: string, reason: string, env: Env) {
  const subscribers = await db.prepare(
    `SELECT user_id FROM property_alerts WHERE property_id = ?`
  ).bind(propertyId).all<{ user_id: string }>();
  const property = await db.prepare(`SELECT title FROM properties WHERE id = ?`).bind(propertyId).first<{ title: string }>();
  const title = property?.title ?? "Property";
  for (const s of subscribers.results ?? []) {
    await db.prepare(
      `INSERT INTO notifications (id, user_id, title, body, type) VALUES (?, ?, 'Status update', ?, 'alert')`
    ).bind(generateId(), s.user_id, `${title} — ${reason}`).run();
    sendPushNotification(s.user_id, title, reason, env);
  }
  await db.prepare(`DELETE FROM property_alerts WHERE property_id = ?`).bind(propertyId).run();
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
  if (property.landlord_id === user.id) return json({ error: "You cannot reserve your own property." }, 403);
  if (!["available", "pending_verification", "verified"].includes(property.status)) {
    return json({ error: "Property is not available." }, 409);
  }

  // check for existing active reservation by any user on this property
  const existing = await env.DB.prepare(
    `SELECT id FROM reservations WHERE property_id = ? AND status NOT IN ('rejected', 'cancelled') LIMIT 1`
  ).bind(body.propertyId).first();
  if (existing) {
    const isMine = await env.DB.prepare(
      `SELECT id FROM reservations WHERE property_id = ? AND tenant_id = ? AND status NOT IN ('rejected', 'cancelled') LIMIT 1`
    ).bind(body.propertyId, user.id).first();
    if (isMine) return json({ error: "You already have a pending reservation for this property." }, 409);
    return json({ error: "Someone else has already reserved this property." }, 409);
  }

  const reservationId = generateId();
  const now = new Date().toISOString();

  const depositNgn = Number(env.RESERVATION_DEPOSIT ?? "50000");

  // atomically insert reservation and update property status
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO reservations (id, property_id, tenant_id, deposit_amount_ngn, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'pending_landlord', ?, ?)`
    ).bind(reservationId, property.id, user.id, depositNgn, now, now),
    env.DB.prepare(`UPDATE properties SET status = 'pending_reservation' WHERE id = ?`).bind(property.id),
  ]);


  const tenantName = (user.fullName?.split(" ")[0]) || user.email || "Someone";
  await env.DB.prepare(
    `INSERT INTO notifications (id, user_id, title, body, type)
     VALUES (?, ?, 'New reservation request', ?, 'reservation')`
  ).bind(generateId(), property.landlord_id, `${tenantName} wants to rent ${property.title}. Review and respond.`).run();
  sendPushNotification(property.landlord_id, "New reservation request", `${tenantName} wants to rent ${property.title}.`, env, `/portal?tab=provider`);

  return json({ success: true, reservationId });
}

export async function handleApproveReservation(request: Request, env: Env, reservationId: string) {
  const user = await requireUser(request, env.DB);
  if (user instanceof Response) return user;

  const reservation = await env.DB.prepare(
    `SELECT r.*, p.landlord_id, p.title FROM reservations r
     JOIN properties p ON p.id = r.property_id
     WHERE r.id = ?`
  ).bind(reservationId).first<{ id: string; property_id: string; tenant_id: string; status: string; landlord_id: string; title: string }>();

  if (!reservation) return json({ error: "Reservation not found." }, 404);
  if (reservation.landlord_id !== user.id) return json({ error: "Unauthorized." }, 403);
  if (reservation.status !== "pending_landlord") return json({ error: "Reservation already processed." }, 409);

  const deadline = new Date(Date.now() + 24 * 3600000).toISOString();

  await env.DB.batch([
    env.DB.prepare(`UPDATE reservations SET status = 'inspecting', inspection_deadline = ?, updated_at = datetime('now') WHERE id = ?`).bind(deadline, reservationId),
    env.DB.prepare(`UPDATE properties SET status = 'inspecting' WHERE id = ?`).bind(reservation.property_id),
    env.DB.prepare(`INSERT INTO notifications (id, user_id, title, body, type) VALUES (?, ?, 'Reservation accepted', ?, 'reservation')`).bind(generateId(), reservation.tenant_id, `${reservation.title} accepted! You have 24 hours to inspect the property.`),
  ]);
  sendPushNotification(reservation.tenant_id, "Reservation accepted", `${reservation.title} accepted! You have 24 hours to inspect.`, env, `/reserve/${reservation.property_id}`);

  await notifyAlertSubscribers(env.DB, reservation.property_id, "The property has been rented out.", env);

  return json({ success: true, inspectionDeadline: deadline });
}

export async function handleRejectReservation(request: Request, env: Env, reservationId: string) {
  const user = await requireUser(request, env.DB);
  if (user instanceof Response) return user;

  const reservation = await env.DB.prepare(
    `SELECT r.*, p.landlord_id, p.title FROM reservations r
     JOIN properties p ON p.id = r.property_id
     WHERE r.id = ?`
  ).bind(reservationId).first<{ id: string; property_id: string; tenant_id: string; status: string; landlord_id: string; title: string; escrow_contract_address: string | null }>();

  if (!reservation) return json({ error: "Reservation not found." }, 404);
  if (reservation.landlord_id !== user.id) return json({ error: "Unauthorized." }, 403);
  if (reservation.status !== "pending_landlord") return json({ error: "Reservation already processed." }, 409);

  // refund escrow since 50k deposit was paid upfront
  if (reservation.escrow_contract_address) {
    try { await refundEscrow(reservation.escrow_contract_address, reservation.tenant_id, env); } catch {}
  }

  await env.DB.batch([
    env.DB.prepare(`UPDATE reservations SET status = 'rejected', updated_at = datetime('now') WHERE id = ?`).bind(reservationId),
    env.DB.prepare(`UPDATE properties SET status = 'available' WHERE id = ?`).bind(reservation.property_id),
    env.DB.prepare(`INSERT INTO notifications (id, user_id, title, body, type) VALUES (?, ?, 'Reservation declined', ?, 'reservation')`).bind(generateId(), reservation.tenant_id, `${reservation.title} owner declined your request. Your ₦50,000 deposit has been refunded.`),
  ]);
  sendPushNotification(reservation.tenant_id, "Reservation declined", `${reservation.title} owner declined your request. Deposit refunded.`, env);

  await notifyAlertSubscribers(env.DB, reservation.property_id, "The landlord did not accept the reservation request.", env);

  return json({ success: true });
}

export async function handlePayReservation(request: Request, env: Env, reservationId: string) {
  const user = await requireUser(request, env.DB);
  if (user instanceof Response) return user;

  const reservation = await env.DB.prepare(
    `SELECT r.*, p.landlord_id, p.rent_amount_ngn, p.title FROM reservations r
     JOIN properties p ON p.id = r.property_id
     WHERE r.id = ?`
  ).bind(reservationId).first<{ id: string; property_id: string; tenant_id: string; status: string; landlord_id: string; rent_amount_ngn: number; title: string }>();

  if (!reservation) return json({ error: "Reservation not found." }, 404);
  if (reservation.tenant_id !== user.id) return json({ error: "Unauthorized." }, 403);
  if (reservation.status !== "pending_landlord") return json({ error: "Reservation not in pending state." }, 409);

  // idempotent — return existing escrow if already created
  if (reservation.escrow_contract_address) {
    const depNgn = Number(env.RESERVATION_DEPOSIT ?? "50000");
    const usdcAmount = Math.floor(depNgn / 1500);
    const rawAmount = BigInt(usdcAmount) * BigInt(10 ** 6);
    return json({ escrowAddress: reservation.escrow_contract_address, amount: rawAmount.toString() });
  }

  // Get tenant's Solana keypair
  const userRow = await env.DB.prepare(
    `SELECT encrypted_secret FROM users WHERE id = ?`
  ).bind(user.id).first<{ encrypted_secret: string }>();
  if (!userRow?.encrypted_secret) return json({ error: "No Solana wallet. Complete your profile first." }, 400);
  const secretStr = decryptMnemonic(userRow.encrypted_secret, env.WALLET_ENCRYPTION_KEY!, user.email);
  const tenantKeypair = Keypair.fromSecretKey(Buffer.from(secretStr, "base64"));

  // Get landlord's Solana wallet address
  const landlordWallet = await env.DB.prepare(
    `SELECT solana_wallet_address FROM wallets WHERE user_id = ?`
  ).bind(reservation.landlord_id).first<{ solana_wallet_address: string | null }>();
  if (!landlordWallet?.solana_wallet_address) return json({ error: "Landlord has no Solana wallet set up." }, 400);

  const depNgn = Number(env.RESERVATION_DEPOSIT ?? "50000");
  const usdcAmount = Math.floor(depNgn / 1500);
  const rawAmount = BigInt(usdcAmount) * BigInt(10 ** 6);
  const nonce = Date.now();

  const sol = new SolanaClient(env);
  const feeCollector = new PublicKey(env.FEE_COLLECTOR_ADDRESS ?? tenantKeypair.publicKey.toBase58());
  const { pda: escrowPda } = sol.escrowPda(sol.adminPubkey, nonce);
  const escrowTokenAccount = await sol.escrowTokenAccount(escrowPda);

  const { escrowAddress } = await sol.initEscrow(
    tenantKeypair.publicKey,
    new PublicKey(landlordWallet.solana_wallet_address),
    nonce,
    0, 0, feeCollector,
    escrowTokenAccount, rawAmount,
  );

  await env.DB.prepare(
    `UPDATE reservations SET escrow_contract_address = ?, updated_at = datetime('now') WHERE id = ?`
  ).bind(escrowAddress.toBase58(), reservationId).run();

  return json({ escrowAddress: escrowAddress.toBase58(), amount: rawAmount.toString() });
}

export async function handleCancelReservation(request: Request, env: Env, reservationId: string) {
  const user = await requireUser(request, env.DB);
  if (user instanceof Response) return user;

  const reservation = await env.DB.prepare(
    `SELECT r.*, p.landlord_id, p.title FROM reservations r
     JOIN properties p ON p.id = r.property_id
     WHERE r.id = ?`
  ).bind(reservationId).first<{ id: string; property_id: string; tenant_id: string; status: string; landlord_id: string; title: string; escrow_contract_address: string | null }>();

  if (!reservation) return json({ error: "Reservation not found." }, 404);
  if (reservation.tenant_id !== user.id) return json({ error: "Unauthorized." }, 403);
  if (!["pending_landlord", "expired_inspection"].includes(reservation.status)) return json({ error: "Reservation cannot be cancelled in its current state." }, 409);

  if (reservation.escrow_contract_address) {
    try { await refundEscrow(reservation.escrow_contract_address, user.id, env); } catch {}
  }

  await env.DB.batch([
    env.DB.prepare(`UPDATE reservations SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?`).bind(reservationId),
    env.DB.prepare(`UPDATE properties SET status = 'available' WHERE id = ?`).bind(reservation.property_id),
    env.DB.prepare(`INSERT INTO notifications (id, user_id, title, body, type) VALUES (?, ?, 'Reservation cancelled', ?, 'reservation')`).bind(generateId(), reservation.landlord_id, `Tenant cancelled ${reservation.title}. Deposit refunded.`),
  ]);
  sendPushNotification(reservation.landlord_id, "Reservation cancelled", `Tenant cancelled ${reservation.title}.`, env);

  await notifyAlertSubscribers(env.DB, reservation.property_id, "The tenant decided not to proceed with the reservation.", env);

  return json({ success: true });
}

export async function handleListReservations(request: Request, env: Env) {
  const user = await requireUser(request, env.DB);
  if (user instanceof Response) return user;

  await autoCancelExpired(env.DB, env);

  const rows = await env.DB.prepare(
    `SELECT r.*, p.title, p.address, p.rent_amount_ngn, p.photos, p.landlord_id,
            u.full_name AS landlord_name, u.avatar_url AS landlord_avatar
     FROM reservations r
     JOIN properties p ON p.id = r.property_id
     JOIN users u ON u.id = p.landlord_id
     WHERE r.tenant_id = ?
     ORDER BY r.created_at DESC`
  ).bind(user.id).all();

  return json({ reservations: rows.results ?? [] });
}

export async function handleListLandlordReservations(request: Request, env: Env) {
  const user = await requireUser(request, env.DB);
  if (user instanceof Response) return user;

  await autoCancelExpired(env.DB, env);

  const rows = await env.DB.prepare(
    `SELECT r.*, p.title, p.address, p.rent_amount_ngn, p.photos,
            u.full_name AS tenant_name, u.avatar_url AS tenant_avatar
     FROM reservations r
     JOIN properties p ON p.id = r.property_id
     JOIN users u ON u.id = r.tenant_id
     WHERE p.landlord_id = ?
     ORDER BY r.created_at DESC`
  ).bind(user.id).all();

  return json({ reservations: rows.results ?? [] });
}

export async function handleGetReservationByProperty(request: Request, env: Env) {
  const user = await requireUser(request, env.DB);
  if (user instanceof Response) return user;

  await autoCancelExpired(env.DB, env);

  const url = new URL(request.url);
  const propertyId = url.searchParams.get("propertyId");
  if (!propertyId) return json({ error: "propertyId required" }, 400);

  const row = await env.DB.prepare(
    `SELECT r.*, p.title, p.address, p.rent_amount_ngn, p.photos FROM reservations r
     JOIN properties p ON p.id = r.property_id
     WHERE r.property_id = ? AND r.tenant_id = ? AND r.status NOT IN ('rejected', 'cancelled')
     ORDER BY r.created_at DESC LIMIT 1`
  ).bind(propertyId, user.id).first();

  return json({ reservation: row ?? null });
}

export async function handleLandlordUnreserve(request: Request, env: Env, propertyId: string) {
  const user = await requireUser(request, env.DB);
  if (user instanceof Response) return user;

  const reservation = await env.DB.prepare(
    `SELECT r.id, r.status, r.tenant_id, p.landlord_id
     FROM reservations r JOIN properties p ON p.id = r.property_id
     WHERE r.property_id = ? AND r.status IN ('pending_landlord', 'inspecting')
     ORDER BY r.created_at DESC LIMIT 1`
  ).bind(propertyId).first<{ id: string; status: string; tenant_id: string; landlord_id: string }>();

  if (!reservation) return json({ error: "No active reservation found." }, 404);
  if (reservation.landlord_id !== user.id) return json({ error: "Unauthorized." }, 403);

  await env.DB.batch([
    env.DB.prepare(`UPDATE reservations SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?`).bind(reservation.id),
    env.DB.prepare(`UPDATE properties SET status = 'available' WHERE id = ?`).bind(propertyId),
    env.DB.prepare(`INSERT INTO notifications (id, user_id, title, body, type) VALUES (?, ?, 'Reservation cancelled', ?, 'reservation')`).bind(generateId(), reservation.tenant_id, `The landlord cancelled the reservation for this property.`),
  ]);
  sendPushNotification(reservation.tenant_id, "Reservation cancelled", `The landlord cancelled the reservation for this property.`, env);

  return json({ success: true });
}

export async function handleBackOut(request: Request, env: Env, reservationId: string) {
  const user = await requireUser(request, env.DB);
  if (user instanceof Response) return user;

  const reservation = await env.DB.prepare(
    `SELECT r.*, p.title, p.landlord_id FROM reservations r
     JOIN properties p ON p.id = r.property_id
     WHERE r.id = ?`
  ).bind(reservationId).first<{ id: string; property_id: string; tenant_id: string; status: string; escrow_contract_address: string | null; title: string; landlord_id: string }>();

  if (!reservation) return json({ error: "Reservation not found." }, 404);
  if (reservation.tenant_id !== user.id) return json({ error: "Unauthorized." }, 403);
  if (reservation.status !== "inspecting") return json({ error: "Reservation not in inspecting state." }, 409);

  if (reservation.escrow_contract_address) {
    try { await refundEscrow(reservation.escrow_contract_address, user.id, env); } catch (e: any) {
      return json({ error: "Failed to refund escrow: " + e.message }, 500);
    }
  }

  await env.DB.batch([
    env.DB.prepare(`UPDATE reservations SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?`).bind(reservationId),
    env.DB.prepare(`UPDATE properties SET status = 'available' WHERE id = ?`).bind(reservation.property_id),
    env.DB.prepare(`INSERT INTO notifications (id, user_id, title, body, type) VALUES (?, ?, 'Reservation cancelled', ?, 'reservation')`).bind(generateId(), reservation.landlord_id, `${user.fullName?.split(" ")[0] || "The tenant"} decided not to proceed with ${reservation.title}.`),
  ]);
  sendPushNotification(reservation.landlord_id, "Reservation cancelled", `${user.fullName?.split(" ")[0] || "The tenant"} decided not to proceed with ${reservation.title}.`, env);

  return json({ success: true });
}

export async function handlePayBalance(request: Request, env: Env, reservationId: string) {
  const user = await requireUser(request, env.DB);
  if (user instanceof Response) return user;

  const reservation = await env.DB.prepare(
    `SELECT r.*, p.landlord_id, p.rent_amount_ngn, p.title FROM reservations r
     JOIN properties p ON p.id = r.property_id
     WHERE r.id = ?`
  ).bind(reservationId).first<{ id: string; property_id: string; tenant_id: string; status: string; escrow_contract_address: string | null; landlord_id: string; rent_amount_ngn: number; title: string }>();

  if (!reservation) return json({ error: "Reservation not found." }, 404);
  if (reservation.tenant_id !== user.id) return json({ error: "Unauthorized." }, 403);
  if (reservation.status !== "inspecting") return json({ error: "Reservation not in inspecting state." }, 409);

  const depNgn = Number(env.RESERVATION_DEPOSIT ?? "50000");
  const remainingNgn = Math.max(0, reservation.rent_amount_ngn - depNgn);
  const platformFeePct = Number(env.PLATFORM_FEE_PCT ?? "5");
  const platformFeeNgn = Math.floor(remainingNgn * platformFeePct / 100);
  const landlordNgn = remainingNgn - platformFeeNgn;
  const usdcRate = 1500;
  const landlordUsdc = Math.floor(landlordNgn / usdcRate);
  const feeUsdc = Math.floor(platformFeeNgn / usdcRate);
  if (landlordUsdc < 1 && feeUsdc < 1) return json({ error: "Balance too small to pay." }, 400);

  const userRow = await env.DB.prepare(
    `SELECT encrypted_secret FROM users WHERE id = ?`
  ).bind(user.id).first<{ encrypted_secret: string }>();
  if (!userRow?.encrypted_secret) return json({ error: "No Solana wallet. Complete your profile first." }, 400);
  const secretStr = decryptMnemonic(userRow.encrypted_secret, env.WALLET_ENCRYPTION_KEY!, user.email);
  const tenantKeypair = Keypair.fromSecretKey(Buffer.from(secretStr, "base64"));

  const landlordWallet = await env.DB.prepare(
    `SELECT solana_wallet_address FROM wallets WHERE user_id = ?`
  ).bind(reservation.landlord_id).first<{ solana_wallet_address: string | null }>();
  if (!landlordWallet?.solana_wallet_address) return json({ error: "Landlord has no Solana wallet set up." }, 400);

  const sol = new SolanaClient(env);
  const feeCollector = new PublicKey(env.FEE_COLLECTOR_ADDRESS ?? tenantKeypair.publicKey.toBase58());

  // release escrow deposit to landlord + fee collector
  if (reservation.escrow_contract_address) {
    try {
      const escrowAddr = new PublicKey(reservation.escrow_contract_address);
      const state = await sol.getEscrowState(escrowAddr);
      if (state) {
        const workerTokenAccount = await sol.getOrCreateTokenAccount(new PublicKey(state.worker));
        const feeTokenAccount = await sol.getOrCreateTokenAccount(new PublicKey(state.feeCollector));
        await sol.confirm(escrowAddr, tenantKeypair, workerTokenAccount, feeTokenAccount, new PublicKey(state.escrowTokenAccount));
      }
    } catch (e: any) {
      return json({ error: "Failed to release escrow: " + e.message }, 500);
    }
  }

  // transfer remaining balance to landlord and fee collector
  const tx = new Transaction();
  const tenantTokenAccount = await sol.getOrCreateTokenAccount(tenantKeypair.publicKey);

  if (landlordUsdc > 0) {
    const landlordTokenAccount = await sol.getOrCreateTokenAccount(new PublicKey(landlordWallet.solana_wallet_address));
    tx.add(createTransferInstruction(tenantTokenAccount, landlordTokenAccount, tenantKeypair.publicKey, BigInt(landlordUsdc) * BigInt(10 ** 6)));
  }
  if (feeUsdc > 0) {
    const feeTokenAccount = await sol.getOrCreateTokenAccount(feeCollector);
    tx.add(createTransferInstruction(tenantTokenAccount, feeTokenAccount, tenantKeypair.publicKey, BigInt(feeUsdc) * BigInt(10 ** 6)));
  }

  let txSig: string | undefined;
  if (tx.instructions.length > 0) {
    txSig = await sol.sendAsFeePayer(tx, tenantKeypair);
  }

  const rentalMonths = 1; // ponytail: single-month default, make dynamic when rent duration is stored
  const rentalEnd = new Date(Date.now() + rentalMonths * 30 * 24 * 3600000).toISOString();

  await env.DB.batch([
    env.DB.prepare(`UPDATE reservations SET status = 'occupied', rental_start = datetime('now'), rental_end = ?, updated_at = datetime('now') WHERE id = ?`).bind(rentalEnd, reservationId),
    env.DB.prepare(`UPDATE properties SET status = 'rented' WHERE id = ?`).bind(reservation.property_id),
    env.DB.prepare(`INSERT INTO notifications (id, user_id, title, body, type) VALUES (?, ?, 'Payment received', ?, 'reservation')`).bind(generateId(), reservation.landlord_id, `Tenant paid the balance for ${reservation.title}.`),
  ]);
  sendPushNotification(reservation.landlord_id, "Payment received", `Tenant paid the balance for ${reservation.title}.`, env);

  return json({ success: true, txSig, status: "occupied" });
}

export async function handleExtendInspection(request: Request, env: Env, reservationId: string) {
  const user = await requireUser(request, env.DB);
  if (user instanceof Response) return user;

  const reservation = await env.DB.prepare(
    `SELECT r.*, p.landlord_id, p.title FROM reservations r
     JOIN properties p ON p.id = r.property_id
     WHERE r.id = ?`
  ).bind(reservationId).first<{ id: string; property_id: string; tenant_id: string; status: string; landlord_id: string; title: string }>();

  if (!reservation) return json({ error: "Reservation not found." }, 404);
  if (reservation.tenant_id !== user.id) return json({ error: "Unauthorized." }, 403);
  if (reservation.status !== "expired_inspection") return json({ error: "Reservation not in expired state." }, 409);

  // charge 5k USDC non-refundable, sent directly to landlord
  const extFeeNgn = Number(env.EXTENSION_FEE ?? "5000");
  const usdcRate = 1500;
  const extFeeUsdc = Math.floor(extFeeNgn / usdcRate);
  if (extFeeUsdc < 1) return json({ error: "Extension fee too small." }, 400);

  const userRow = await env.DB.prepare(
    `SELECT encrypted_secret FROM users WHERE id = ?`
  ).bind(user.id).first<{ encrypted_secret: string }>();
  if (!userRow?.encrypted_secret) return json({ error: "No Solana wallet." }, 400);
  const secretStr = decryptMnemonic(userRow.encrypted_secret, env.WALLET_ENCRYPTION_KEY!, user.email);
  const tenantKeypair = Keypair.fromSecretKey(Buffer.from(secretStr, "base64"));

  const landlordWallet = await env.DB.prepare(
    `SELECT solana_wallet_address FROM wallets WHERE user_id = ?`
  ).bind(reservation.landlord_id).first<{ solana_wallet_address: string | null }>();
  if (!landlordWallet?.solana_wallet_address) return json({ error: "Landlord has no Solana wallet." }, 400);

  const sol = new SolanaClient(env);
  const tenantTokenAccount = await sol.getOrCreateTokenAccount(tenantKeypair.publicKey);
  const landlordTokenAccount = await sol.getOrCreateTokenAccount(new PublicKey(landlordWallet.solana_wallet_address));

  const tx = new Transaction().add(
    createTransferInstruction(tenantTokenAccount, landlordTokenAccount, tenantKeypair.publicKey, BigInt(extFeeUsdc) * BigInt(10 ** 6))
  );
  try {
    await sol.sendAsFeePayer(tx, tenantKeypair);
  } catch (e: any) {
    return json({ error: "Failed to send extension fee: " + e.message }, 500);
  }

  await env.DB.batch([
    env.DB.prepare(`UPDATE reservations SET status = 'extend_pending', updated_at = datetime('now') WHERE id = ?`).bind(reservationId),
    env.DB.prepare(`INSERT INTO notifications (id, user_id, title, body, type) VALUES (?, ?, 'Extension request', ?, 'reservation')`).bind(generateId(), reservation.landlord_id, `Tenant paid ₦5,000 to extend inspection for ${reservation.title}. Approve or reject.`),
  ]);
  sendPushNotification(reservation.landlord_id, "Extension request", `Tenant paid ₦5,000 to extend inspection for ${reservation.title}.`, env);

  // ponytail: 5k sent directly to landlord, non-refundable
  return json({ success: true });
}

export async function handleApproveExtension(request: Request, env: Env, reservationId: string) {
  const user = await requireUser(request, env.DB);
  if (user instanceof Response) return user;

  const reservation = await env.DB.prepare(
    `SELECT r.*, p.landlord_id, p.property_id, p.title FROM reservations r
     JOIN properties p ON p.id = r.property_id
     WHERE r.id = ?`
  ).bind(reservationId).first<{ id: string; property_id: string; tenant_id: string; status: string; landlord_id: string; title: string }>();

  if (!reservation) return json({ error: "Reservation not found." }, 404);
  if (reservation.landlord_id !== user.id) return json({ error: "Unauthorized." }, 403);
  if (reservation.status !== "extend_pending") return json({ error: "No pending extension." }, 409);

  const deadline = new Date(Date.now() + 24 * 3600000).toISOString();

  await env.DB.batch([
    env.DB.prepare(`UPDATE reservations SET status = 'inspecting', inspection_deadline = ?, updated_at = datetime('now') WHERE id = ?`).bind(deadline, reservationId),
    env.DB.prepare(`INSERT INTO notifications (id, user_id, title, body, type) VALUES (?, ?, 'Extension approved', ?, 'reservation')`).bind(generateId(), reservation.tenant_id, `Your inspection extension for ${reservation.title} has been approved. You have 24 more hours.`),
  ]);
  sendPushNotification(reservation.tenant_id, "Extension approved", `Your inspection extension for ${reservation.title} has been approved.`, env);

  return json({ success: true, inspectionDeadline: deadline });
}

export async function handleRejectExtension(request: Request, env: Env, reservationId: string) {
  const user = await requireUser(request, env.DB);
  if (user instanceof Response) return user;

  const reservation = await env.DB.prepare(
    `SELECT r.*, p.landlord_id, p.title, p.property_id FROM reservations r
     JOIN properties p ON p.id = r.property_id
     WHERE r.id = ?`
  ).bind(reservationId).first<{ id: string; property_id: string; tenant_id: string; status: string; landlord_id: string; title: string; escrow_contract_address: string | null }>();

  if (!reservation) return json({ error: "Reservation not found." }, 404);
  if (reservation.landlord_id !== user.id) return json({ error: "Unauthorized." }, 403);
  if (reservation.status !== "extend_pending") return json({ error: "No pending extension." }, 409);

  // refund escrow (50k) to tenant
  if (reservation.escrow_contract_address) {
    try { await refundEscrow(reservation.escrow_contract_address, reservation.tenant_id, env); } catch {}
  }

  await env.DB.batch([
    env.DB.prepare(`UPDATE reservations SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?`).bind(reservationId),
    env.DB.prepare(`UPDATE properties SET status = 'available' WHERE id = ?`).bind(reservation.property_id),
    env.DB.prepare(`INSERT INTO notifications (id, user_id, title, body, type) VALUES (?, ?, 'Extension rejected', ?, 'reservation')`).bind(generateId(), reservation.tenant_id, `The landlord rejected your extension request for ${reservation.title}. Your deposit has been refunded.`),
  ]);
  sendPushNotification(reservation.tenant_id, "Extension rejected", `The landlord rejected your extension for ${reservation.title}. Deposit refunded.`, env);

  // ponytail: 5k extension fee stays with landlord regardless
  return json({ success: true });
}
