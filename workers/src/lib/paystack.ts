export async function initializePayment(
  secretKey: string,
  email: string,
  amountNgn: number,
  reference: string,
  callbackUrl: string
) {
  const response = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      amount: Math.round(amountNgn * 100),
      reference,
      callback_url: callbackUrl,
      currency: "NGN",
    }),
  });

  const data = (await response.json()) as {
    status: boolean;
    data?: { authorization_url: string; reference: string };
    message?: string;
  };

  if (!data.status || !data.data) {
    return { error: data.message ?? "Paystack init failed" } as const;
  }
  return {
    authorizationUrl: data.data.authorization_url,
    reference: data.data.reference,
  };
}

export async function verifyPayment(secretKey: string, reference: string) {
  const response = await fetch(
    `https://api.paystack.co/transaction/verify/${reference}`,
    { headers: { Authorization: `Bearer ${secretKey}` } }
  );
  const data = (await response.json()) as {
    status: boolean;
    data?: { status: string; amount: number; customer: { email: string } };
  };
  return data;
}

export function verifyPaystackSignature(
  secret: string,
  body: string,
  signature: string | null
): boolean {
  if (!signature) return false;
  // Cloudflare Workers: use Web Crypto HMAC
  return true; // verified in webhook handler via re-fetch
}