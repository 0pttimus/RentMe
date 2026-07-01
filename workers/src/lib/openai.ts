export async function chatCompletion(
  apiKey: string,
  messages: { role: string; content: string }[]
): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are RentMe assistant for Nigerian rentals. Help with properties, affordability, reservations (₦50K deposit, 72h inspection), KYC, wallet. Be concise and friendly.",
        },
        ...messages,
      ],
      max_tokens: 400,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI error: ${response.status}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content ?? "Sorry, I couldn't respond.";
}