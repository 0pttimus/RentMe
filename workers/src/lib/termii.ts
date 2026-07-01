export async function sendSmsOtp(
  apiKey: string,
  senderId: string,
  phone: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  const normalized = phone.startsWith("+") ? phone.replace("+", "") : phone.replace(/^0/, "234");

  const response = await fetch("https://api.ng.termii.com/api/sms/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      to: normalized,
      from: senderId,
      sms: `Your RentMe verification code is ${code}. Valid for 10 minutes.`,
      type: "plain",
      channel: "generic",
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    return { success: false, error: `Termii: ${text}` };
  }
  return { success: true };
}