import { requireUser } from "../lib/auth";
import type { Env } from "../lib/env";
import { chatCompletion } from "../lib/openai";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

export async function handleAiChat(request: Request, env: Env) {
  const user = await requireUser(request, env.DB);
  if (user instanceof Response) return user;

  const body = (await request.json()) as { message?: string; history?: { role: string; content: string }[] };
  if (!body.message) return json({ error: "message required" }, 400);

  const history = body.history ?? [];

  if (!env.OPENAI_API_KEY) {
    return json({
      reply:
        "I'm RentMe assistant. Set OPENAI_API_KEY for full AI. Meanwhile: browse verified listings on Home, reserve with ₦50K deposit, 72h inspection, full refund if rejected.",
    });
  }

  try {
    const reply = await chatCompletion(env.OPENAI_API_KEY, [
      ...history,
      { role: "user", content: body.message },
    ]);
    return json({ reply });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "AI error" }, 500);
  }
}