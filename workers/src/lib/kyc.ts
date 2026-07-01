/** Smile Identity / YouVerify-style KYC session */
export async function createKycSession(
  apiKey: string,
  partnerId: string,
  userId: string,
  fullName: string
): Promise<{ sessionUrl?: string; sessionId?: string; error?: string }> {
  // YouVerify sandbox pattern — swap URL when you have credentials
  if (!apiKey || apiKey === "mock") {
    return {
      sessionId: `kyc-mock-${userId}`,
      sessionUrl: `/kyc?session=mock&status=pending`,
    };
  }

  try {
    const response = await fetch("https://api.youverify.co/v2/api/identity/v2/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        partnerId,
        firstName: fullName.split(" ")[0],
        lastName: fullName.split(" ").slice(1).join(" ") || fullName,
        metadata: { userId },
      }),
    });

    if (!response.ok) {
      return { error: await response.text() };
    }

    const data = (await response.json()) as { data?: { sessionUrl?: string; id?: string } };
    return {
      sessionUrl: data.data?.sessionUrl,
      sessionId: data.data?.id,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "KYC init failed" };
  }
}