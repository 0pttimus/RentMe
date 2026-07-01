import { formatApiError } from "./errors";
import { sendOtp as apiSendOtp } from "./client";

export async function requestOtp(email: string): Promise<{
  ok: boolean;
  error?: string;
  devCode?: string;
}> {
  const result = await apiSendOtp(email);

  if (result.error) {
    return {
      ok: false,
      error: formatApiError(result.error, result.status, result.retryAfter),
    };
  }

  return { ok: true, devCode: result.data?.devCode };
}