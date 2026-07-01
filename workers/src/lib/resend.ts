interface SendOtpEmailParams {
  to: string;
  code: string;
  purpose: "auth";
}

export async function sendOtpEmail(
  apiKey: string,
  fromEmail: string,
  params: SendOtpEmailParams
): Promise<{ success: boolean; error?: string }> {
  const subject = "Your RentMe verification code";

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
      <h1 style="font-size: 24px; font-weight: 600; color: #111; margin: 0 0 8px;">RentMe</h1>
      <p style="color: #666; font-size: 15px; line-height: 1.5; margin: 0 0 24px;">
        Use this code to continue to RentMe.
      </p>
      <div style="background: #f5f5f7; border-radius: 16px; padding: 24px; text-align: center; margin: 0 0 24px;">
        <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #0D7A72;">${params.code}</span>
      </div>
      <p style="color: #999; font-size: 13px; line-height: 1.5; margin: 0;">
        This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.
      </p>
    </div>
  `;

  // key must include the code or resend blocks repeat OTPs for 24h
  const idempotencyKey = `otp/${params.to.toLowerCase()}/${params.code}`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [params.to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    return { success: false, error: `Resend error: ${response.status} ${body}` };
  }

  return { success: true };
}