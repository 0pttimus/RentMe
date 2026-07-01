import { hasClientSession } from "@/lib/auth/session";

const API_URL = import.meta.env.VITE_API_URL ?? "/api";

interface ApiError {
  error: string;
  retryAfter?: number;
}

const FETCH_TIMEOUT_MS = 8_000;

export type ApiResult<T> = {
  data?: T;
  error?: string;
  status: number;
  retryAfter?: number;
};

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResult<T>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      signal: controller.signal,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
    clearTimeout(timeout);

    const body = await response.json();

    if (!response.ok) {
      const err = body as ApiError;
      return {
        error: err.error ?? "Request failed",
        status: response.status,
        retryAfter: err.retryAfter,
      };
    }

    return { data: body as T, status: response.status };
  } catch {
    clearTimeout(timeout);
    return { error: "Server slow or offline. Is the Worker running?", status: 0 };
  }
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: string;
  kycStatus: string;
  trustScore: number;
  trustLevel: string;
  profileComplete: boolean;
}

export const sendOtp = (email: string) =>
  apiFetch<{ success: boolean; message: string; devCode?: string }>("/auth/otp/send", {
    method: "POST",
    body: JSON.stringify({ email }),
  });

export const completeProfile = (params: { fullName: string; phone: string }) =>
  apiFetch<{ success: boolean; user: AuthUser }>("/auth/profile/complete", {
    method: "POST",
    body: JSON.stringify(params),
  });

export const verifyOtp = (params: { email: string; code: string }) =>
  apiFetch<{ success: boolean; user: AuthUser }>("/auth/otp/verify", {
    method: "POST",
    body: JSON.stringify(params),
  });

export const getMe = () => {
  if (!hasClientSession()) {
    return Promise.resolve({ data: { user: null as AuthUser | null }, status: 200 });
  }
  return apiFetch<{ user: AuthUser | null }>("/auth/me");
};

export const logout = () => apiFetch<{ success: boolean }>("/auth/logout", { method: "POST" });

export const getWallet = () =>
  apiFetch<{
    balanceNgn: number;
    transactions: { type: string; amount_ngn: number; reference: string | null; created_at: string }[];
  }>("/wallet");

export const depositFunds = (amount: number) =>
  apiFetch<{ success: boolean; balanceNgn: number }>("/wallet/deposit", {
    method: "POST",
    body: JSON.stringify({ amount }),
  });

export const createReservation = (propertyId: string) =>
  apiFetch<{ success: boolean; reservationId: string; inspectionDeadline: string }>(
    "/reservations",
    { method: "POST", body: JSON.stringify({ propertyId }) }
  );

export const getReservations = () =>
  apiFetch<{ reservations: {
    id: string; title: string; address: string; deposit_amount_ngn: number;
    status: string; inspection_deadline: string; created_at: string;
  }[] }>("/reservations");

export const getProperty = (id: string) =>
  apiFetch<{ property: { id: string; title: string; rent_amount_ngn: number; address: string; city: string; description: string; bedrooms: number; bathrooms: number; property_type: string; amenities: string; images: string[]; landlord_name: string; landlord_phone: string; trust_score: number; trust_level: string } }>(
    `/properties/${id}`
  );

export const submitReport = (params: {
  targetType: string;
  targetId: string;
  reason: string;
}) =>
  apiFetch<{ success: boolean }>("/fraud-reports", {
    method: "POST",
    body: JSON.stringify(params),
  });

export const initiateUsdcDeposit = (amount: number) =>
  apiFetch<{ walletAddress: string; amount: number; tokenMint: string }>("/wallet/deposit/usdc", {
    method: "POST",
    body: JSON.stringify({ amount }),
  });

export const verifyUsdcDeposit = () =>
  apiFetch<{ verified: boolean; balanceNgn?: number; currentBalance?: number; expectedMin?: number }>(
    "/wallet/deposit/usdc/verify", { method: "POST" }
  );

export const withdrawUsdc = (amount: number) =>
  apiFetch<{ success: boolean; txSig: string; usdcAmount: number; balanceNgn: number }>(
    "/wallet/withdraw/usdc", { method: "POST", body: JSON.stringify({ amount }) }
  );

export const withdrawNaira = (params: { amount: number; bankName: string; accountNumber: string; accountName: string }) =>
  apiFetch<{ success: boolean; message: string }>("/wallet/withdraw/naira", {
    method: "POST", body: JSON.stringify(params),
  });

export const getNotifications = () => {
  if (!hasClientSession()) {
    return Promise.resolve({
      data: {
        notifications: [] as {
          id: string;
          title: string;
          body: string;
          type: string;
          created_at: string;
        }[],
      },
      status: 200,
    });
  }
  return apiFetch<{
    notifications: { id: string; title: string; body: string; type: string; created_at: string }[];
  }>("/notifications");
};

export const getServices = () =>
  apiFetch<{
    providers: {
      id: string;
      name: string;
      categories: string[];
      bio: string;
      rating: number;
      completedJobs: number;
    }[];
  }>("/services");

export const bookService = (params: { providerId: string; category: string; amount: number }) =>
  apiFetch<{ success: boolean }>("/services/book", {
    method: "POST",
    body: JSON.stringify(params),
  });

export const getRewards = () => {
  if (!hasClientSession()) {
    return Promise.resolve({
      data: { totalPoints: 0, transactions: [] as { points: number; reason: string }[] },
      status: 200,
    });
  }
  return apiFetch<{ totalPoints: number; transactions: { points: number; reason: string }[] }>(
    "/rewards"
  );
};

export const searchPassports = (params: { street?: string; houseNumber?: string; city?: string; state?: string }) => {
  const q = new URLSearchParams();
  if (params.street) q.set("street", params.street);
  if (params.houseNumber) q.set("houseNumber", params.houseNumber);
  if (params.city) q.set("city", params.city);
  if (params.state) q.set("state", params.state);
  return apiFetch<{ passports: { id: string; passport_number: string; building_name: string | null; street: string; house_number: string; total_units: number }[] }>(`/passports/search?${q}`);
};

export const getPassportUnits = (passportId: string) =>
  apiFetch<{ units: { id: string; unit_identifier: string; unit_type: string }[] }>(`/passports/${passportId}/units`);

export const createPassportUnit = (passportId: string, unitIdentifier: string, unitType?: string) =>
  apiFetch<{ success: boolean; unitId: string }>(`/passports/${passportId}/units`, {
    method: "POST",
    body: JSON.stringify({ unitIdentifier, unitType }),
  });

export const createProperty = (data: Record<string, unknown>) =>
  apiFetch<{ success: boolean; propertyId: string; passportId: string }>("/properties", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const sendPhoneOtp = (phone: string) =>
  apiFetch<{ success: boolean; devCode?: string }>("/auth/phone/send", {
    method: "POST",
    body: JSON.stringify({ phone }),
  });

export const verifyPhoneOtp = (phone: string, code: string) =>
  apiFetch<{ success: boolean }>("/auth/phone/verify", {
    method: "POST",
    body: JSON.stringify({ phone, code }),
  });

export const initPaystack = (amount: number, callbackUrl?: string) =>
  apiFetch<{ authorizationUrl?: string; mock?: boolean; message?: string }>(
    "/payments/paystack/init",
    { method: "POST", body: JSON.stringify({ amount, callbackUrl }) }
  );

export const listBanks = () =>
  apiFetch<{ banks: Array<{ code: string; name: string }> }>("/payments/banks");

export const resolveAccount = (accountNumber: string, bankCode: string) =>
  apiFetch<{ accountName: string }>("/payments/banks/resolve", {
    method: "POST", body: JSON.stringify({ accountNumber, bankCode }),
  });

export const startKyc = () =>
  apiFetch<{ sessionUrl?: string; sessionId?: string }>("/kyc/start", { method: "POST" });

export const completeKycMock = () =>
  apiFetch<{ success: boolean }>("/kyc/complete-mock", { method: "POST" });

export const aiChat = (message: string, history: { role: string; content: string }[]) =>
  apiFetch<{ reply: string }>("/ai/chat", {
    method: "POST",
    body: JSON.stringify({ message, history }),
  });

export const adminStats = () => {
  if (!hasClientSession()) {
    return Promise.resolve({ error: "Not authenticated.", status: 401 });
  }
  return apiFetch<{
    users: number;
    properties: number;
    openReports: number;
    activeReservations: number;
  }>("/admin/stats");
};

export const adminReports = () => {
  if (!hasClientSession()) {
    return Promise.resolve({ data: { reports: [] as Record<string, unknown>[] }, status: 200 });
  }
  return apiFetch<{ reports: Record<string, unknown>[] }>("/admin/reports");
};

export const adminResolveReport = (reportId: string, action: "resolve" | "dismiss") =>
  apiFetch<{ success: boolean }>("/admin/reports/resolve", {
    method: "POST",
    body: JSON.stringify({ reportId, action }),
  });