import { requireUser } from "../lib/auth";
import type { Env } from "../lib/env";
import { generateId } from "../lib/session";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

export async function handleCreateConversation(request: Request, env: Env) {
  const user = await requireUser(request, env.DB);
  if (user instanceof Response) return user;
  const body = (await request.json()) as { participantId?: string; propertyId?: string };
  if (!body.participantId) return json({ error: "participantId required." }, 400);
  if (body.participantId === user.id) return json({ error: "Cannot chat with yourself." }, 400);

  const existing = await env.DB.prepare(
    `SELECT id FROM conversations
     WHERE (participant_a = ? AND participant_b = ?) OR (participant_a = ? AND participant_b = ?)
     LIMIT 1`
  ).bind(user.id, body.participantId, body.participantId, user.id).first<{ id: string }>();

  const id = existing?.id ?? generateId();
  if (!existing) {
    await env.DB.prepare(
      `INSERT INTO conversations (id, participant_a, participant_b, property_id) VALUES (?, ?, ?, ?)`
    ).bind(id, user.id, body.participantId, body.propertyId ?? null).run();
  }
  return json({ conversationId: id, existing: !!existing });
}

export async function handleListConversations(request: Request, env: Env) {
  const user = await requireUser(request, env.DB);
  if (user instanceof Response) return user;

  const rows = await env.DB.prepare(
    `SELECT c.id, c.last_message, c.last_message_at, c.created_at,
            u.id AS other_id, u.full_name AS other_name, u.avatar_url AS other_avatar
     FROM conversations c
     JOIN users u ON u.id = CASE WHEN c.participant_a = ? THEN c.participant_b ELSE c.participant_a END
     WHERE c.participant_a = ? OR c.participant_b = ?
     ORDER BY c.last_message_at DESC`
  ).bind(user.id, user.id, user.id).all<{
    id: string; last_message: string | null; last_message_at: string | null;
    created_at: string; other_id: string; other_name: string; other_avatar: string | null;
  }>();

  return json({ conversations: rows.results ?? [] });
}

export async function handleGetMessages(request: Request, env: Env) {
  const user = await requireUser(request, env.DB);
  if (user instanceof Response) return user;

  const convId = new URL(request.url).pathname.split("/")[3];
  const conv = await env.DB.prepare(
    `SELECT id FROM conversations WHERE id = ? AND (participant_a = ? OR participant_b = ?)`
  ).bind(convId, user.id, user.id).first<{ id: string }>();
  if (!conv) return json({ error: "Conversation not found." }, 404);

  const rows = await env.DB.prepare(
    `SELECT m.id, m.sender_id, m.content, m.created_at,
            u.full_name AS sender_name
     FROM messages m
     JOIN users u ON u.id = m.sender_id
     WHERE m.conversation_id = ?
     ORDER BY m.created_at ASC`
  ).bind(convId).all<{
    id: string; sender_id: string; content: string; created_at: string; sender_name: string;
  }>();

  return json({ messages: rows.results ?? [] });
}

export async function handleSendMessage(request: Request, env: Env) {
  const user = await requireUser(request, env.DB);
  if (user instanceof Response) return user;

  const convId = new URL(request.url).pathname.split("/")[3];
  const body = (await request.json()) as { content?: string };
  if (!body.content?.trim()) return json({ error: "Content required." }, 400);

  const conv = await env.DB.prepare(
    `SELECT id FROM conversations WHERE id = ? AND (participant_a = ? OR participant_b = ?)`
  ).bind(convId, user.id, user.id).first<{ id: string }>();
  if (!conv) return json({ error: "Conversation not found." }, 404);

  const msgId = generateId();
  const now = new Date().toISOString();

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO messages (id, conversation_id, sender_id, content, created_at) VALUES (?, ?, ?, ?, ?)`
    ).bind(msgId, convId, user.id, body.content.trim(), now),
    env.DB.prepare(
      `UPDATE conversations SET last_message = ?, last_message_at = ?, updated_at = ? WHERE id = ?`
    ).bind(body.content.trim(), now, now, convId),
  ]);

  return json({ messageId: msgId, createdAt: now });
}
