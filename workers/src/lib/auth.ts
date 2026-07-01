import { getSessionUser } from "./db";
import { parseCookies } from "./session";
import type { SessionUser } from "./session";

export async function requireUser(
  request: Request,
  db: D1Database
): Promise<SessionUser | Response> {
  const cookies = parseCookies(request.headers.get("Cookie"));
  const sessionId = cookies.rentme_session;

  if (!sessionId) {
    return new Response(JSON.stringify({ error: "Not authenticated." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const user = await getSessionUser(db, sessionId);
  if (!user) {
    return new Response(JSON.stringify({ error: "Session expired." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  return user;
}