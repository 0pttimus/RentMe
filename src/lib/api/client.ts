import { hasClientSession } from "@/lib/auth/session";

const API_URL = import.meta.env.VITE_API_URL ?? "/api";

interface ApiError {
  error: string;
  retryAfter?: number;
}

const FETCH_TIMEOUT_MS = 20_000;

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
  avatarUrl: string | null;
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

export const uploadAvatar = (avatarUrl: string) =>
  apiFetch<{ success: boolean; avatarUrl: string }>("/auth/avatar", {
    method: "POST",
    body: JSON.stringify({ avatarUrl }),
  });

export const getWallet = (offset = 0) =>
  apiFetch<{
    balanceNgn: number;
    transactions: { type: string; amount_ngn: number; reference: string | null; created_at: string }[];
    reservations: { id: string; property_id: string; status: string; deposit_amount_ngn: number; created_at: string; title: string }[];
    bookings: { id: string; status: string; total_amount_ngn: number; upfront_amount_ngn: number; created_at: string; owner_id: string }[];
    hasMore: boolean;
  }>(`/wallet?offset=${offset}`);

export const depositFunds = (amount: number) =>
  apiFetch<{ success: boolean; balanceNgn: number }>("/wallet/deposit", {
    method: "POST",
    body: JSON.stringify({ amount }),
  });

export const createReservation = (propertyId: string) =>
  apiFetch<{ success: boolean; reservationId: string }>(
    "/reservations",
    { method: "POST", body: JSON.stringify({ propertyId }) }
  );

export const approveReservation = (id: string) =>
  apiFetch<{ success: boolean; inspectionDeadline: string }>(`/reservations/${id}/approve`, { method: "PUT" });

export const rejectReservation = (id: string) =>
  apiFetch<{ success: boolean }>(`/reservations/${id}/reject`, { method: "PUT" });

export const payReservation = (id: string) =>
  apiFetch<{ escrowAddress: string; amount: string }>(`/reservations/${id}/pay`, { method: "PUT" });

export const cancelReservation = (id: string) =>
  apiFetch<{ success: boolean }>(`/reservations/${id}/cancel`, { method: "PUT" });

export const backOutReservation = (id: string) =>
  apiFetch<{ success: boolean }>(`/reservations/${id}/back-out`, { method: "PUT" });

export const payBalance = (id: string) =>
  apiFetch<{ success: boolean; txSig?: string; status?: string }>(`/reservations/${id}/pay-balance`, { method: "PUT" });

export const extendInspection = (id: string) =>
  apiFetch<{ success: boolean }>(`/reservations/${id}/extend`, { method: "PUT" });

export const approveExtension = (id: string) =>
  apiFetch<{ success: boolean }>(`/reservations/${id}/extend/approve`, { method: "PUT" });

export const rejectExtension = (id: string) =>
  apiFetch<{ success: boolean }>(`/reservations/${id}/extend/reject`, { method: "PUT" });

export const getMyReservations = () =>
  apiFetch<{ reservations: any[] }>("/reservations");

export const getLandlordReservations = () =>
  apiFetch<{ reservations: any[] }>("/reservations/landlord");

export const getReservationByProperty = (propertyId: string) =>
  apiFetch<{ reservation: any | null }>(`/reservations/by-property?propertyId=${encodeURIComponent(propertyId)}`);

export const depositToEscrow = (escrowAddress: string, amount: string) =>
  apiFetch<{ txHash: string; status: string }>(`/escrow/${escrowAddress}/deposit`, {
    method: "POST",
    body: JSON.stringify({ amount }),
  });

export const getReservations = () =>
  apiFetch<{ reservations: {
    id: string; title: string; address: string; deposit_amount_ngn: number;
    rent_amount_ngn: number; status: string; inspection_deadline: string;
    escrow_contract_address: string | null; created_at: string;
  }[] }>("/reservations");

export const createConversation = (participantId: string, propertyId?: string) =>
  apiFetch<{ conversationId: string; existing: boolean }>("/chat/conversations", {
    method: "POST",
    body: JSON.stringify({ participantId, propertyId }),
  });

export const listConversations = () =>
  apiFetch<{ conversations: {
    id: string; last_message: string | null; last_message_at: string | null;
    created_at: string; other_id: string; other_name: string; other_avatar: string | null;
  }[] }>("/chat/conversations");

export const getMessages = (conversationId: string) =>
  apiFetch<{ messages: {
    id: string; sender_id: string; content: string; created_at: string; sender_name: string;
  }[] }>(`/chat/conversations/${conversationId}/messages`);

export const sendMessage = (conversationId: string, content: string) =>
  apiFetch<{ messageId: string; createdAt: string }>(`/chat/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });

export const getProperty = (id: string) =>
  apiFetch<{ property: {
    id: string; title: string; rentAmountNgn: number; rentPeriod: string; rentDuration: number | null; address: string; city: string;
    state: string; description: string; bedrooms: number; bathrooms: number;
    propertyType: string; amenities: string[]; photos: string[];
    landlordName: string; landlordPhone: string | null; landlordAvatar: string | null; landlordInitials: string;
    trustScore: number; isVerified: boolean; status: string;
    passportNumber: string | null; passportVerificationStatus: string;
    passportPriorTenancies: number; passportLastInspection: string | null;
    verificationCount: number;
  } }>(`/properties/${id}`);

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

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  read: number;
  created_at: string;
}

export const getNotifications = (scope?: string) => {
  if (!hasClientSession()) {
    return Promise.resolve({
      data: { notifications: [] as Notification[] },
      status: 200,
    });
  }
  const qs = scope ? `?scope=${encodeURIComponent(scope)}` : "";
  return apiFetch<{ notifications: Notification[] }>(`/notifications${qs}`);
};

export const getUnreadCount = () =>
  apiFetch<{ count: number }>("/notifications/unread-count");

export const markNotificationRead = (id: string) =>
  apiFetch<{ success: boolean }>(`/notifications/${id}`, { method: "PATCH" });

export const getFreelanceProfileStatus = () =>
  apiFetch<{ hasProfile: boolean }>("/freelance/profile/status");

export interface FreelanceProfile {
  id: string;
  displayName: string;
  realName: string;
  avatarUrl: string | null;
  kycStatus: string;
  categories: string[];
  bio: string | null;
  rating: number;
  completedJobs: number;
  isVerified: number;
  pricingType: string;
  fixedPrice: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  portfolio: { type: string; src: string }[];
  isAvailable: boolean;
  gender: string | null;
  locationState: string | null;
  locationArea: string | null;
  locationLat: number | null;
  locationLng: number | null;
  bannerUrl: string | null;
  createdAt: string;
}

export const getFreelanceProfile = () =>
  apiFetch<{ profile: FreelanceProfile }>("/freelance/profile");

export const upsertFreelanceProfile = (data: {
  displayName: string;
  categories?: string[];
  bio?: string;
  pricingType?: string;
  fixedPrice?: number;
  minPrice?: number;
  maxPrice?: number;
  portfolio?: { type: string; src: string }[];
  isAvailable?: boolean;
  gender?: string;
  locationState?: string;
  locationArea?: string;
  locationLat?: number;
  locationLng?: number;
  bannerUrl?: string;
  avatarUrl?: string;
}) =>
  apiFetch<{ success: boolean; profileId?: string }>("/freelance/profile", {
    method: "POST",
    body: JSON.stringify(data),
  });

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

export const getProperties = (propertyTypes?: string[]) => {
  const qs = propertyTypes?.length ? `?propertyTypes=${encodeURIComponent(propertyTypes.join(","))}` : "";
  return apiFetch<{
    properties: {
      id: string;
      title: string;
      propertyType: string;
      city: string;
      state: string;
      area: string | null;
      rentAmountNgn: number;
      rentPeriod: string;
      rentDuration: number | null;
      isVerified: number;
      status: string;
      bedrooms: number;
      bathrooms: number;
      photos: string[];
      trustScore: number;
      landlordName: string;
      landlordInitials: string;
      landlordAvatar: string | null;
      verificationCount: number;
    }[];
  }>(`/properties${qs}`);
};

export const getMyProperties = () =>
  apiFetch<{
    properties: {
      id: string;
      title: string;
      propertyType: string;
      city: string;
      state: string;
      area: string | null;
      rentAmountNgn: number;
      rentPeriod: string;
      rentDuration: number | null;
      isVerified: number;
      status: string;
      bedrooms: number;
      bathrooms: number;
      photos: string[];
      trustScore: number;
      createdAt: string;
      verificationCount: number;
    }[];
  }>("/properties/mine");

export const createProperty = (data: Record<string, unknown>) =>
  apiFetch<{ success: boolean; propertyId: string; passportId: string }>("/properties", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateProperty = (id: string, data: Record<string, unknown>) =>
  apiFetch<{ success: boolean }>(`/properties/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const deleteProperty = (id: string) =>
  apiFetch<{ success: boolean }>(`/properties/${id}`, { method: "DELETE" });

export const getBookmarks = () =>
  apiFetch<{ bookmarks: { bookmark_id: string; property_id: string; title: string; property_type: string; city: string; state: string; rent_amount_ngn: number; photos: string; status: string; is_verified: number; created_at: string }[] }>("/bookmarks");

export const addBookmark = (propertyId: string) =>
  apiFetch<{ success: boolean; bookmarkId?: string }>("/bookmarks", {
    method: "POST",
    body: JSON.stringify({ propertyId }),
  });

export const removeBookmark = (propertyId: string) =>
  apiFetch<{ success: boolean }>(`/bookmarks?propertyId=${encodeURIComponent(propertyId)}`, {
    method: "DELETE",
  });

export const getBookmarkStatus = (propertyId: string) =>
  apiFetch<{ bookmarked: boolean }>(`/bookmarks/status?propertyId=${encodeURIComponent(propertyId)}`);

export const getPriceHistory = (propertyId: string) =>
  apiFetch<{ currentPrice: number; history: { id: string; price: number; changed_at: string }[] }>(
    `/properties/price-history?id=${encodeURIComponent(propertyId)}`
  );

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

export const subscribeAlert = (propertyId: string) =>
  apiFetch<{ success: boolean }>("/alerts/subscribe", {
    method: "POST",
    body: JSON.stringify({ propertyId }),
  });

export const unsubscribeAlert = (propertyId: string) =>
  apiFetch<{ success: boolean }>("/alerts/unsubscribe", {
    method: "POST",
    body: JSON.stringify({ propertyId }),
  });

export const getAlertStatus = (propertyId: string) =>
  apiFetch<{ subscribed: boolean }>(`/alerts/status?propertyId=${encodeURIComponent(propertyId)}`);

export const landlordUnreserve = (propertyId: string) =>
  apiFetch<{ success: boolean }>(`/reservations/landlord/unreserve/${encodeURIComponent(propertyId)}`, {
    method: "POST",
  });

export const applyVerifier = (data: { idUrl: string; phonePhotoUrl: string; agreedTerms: boolean }) =>
  apiFetch<{ success: boolean }>("/verifiers/apply", { method: "POST", body: JSON.stringify(data) });

export const getVerifierStatus = () =>
  apiFetch<{ verifier: { id: string; status: string; daily_count: number; last_verified_date: string | null; total_earned_ngn: number } | null }>("/verifiers/status");

export const getNearbyProperties = (lat: number, lng: number) =>
  apiFetch<{ properties: any[] }>(`/verifiers/nearby?lat=${lat}&lng=${lng}`);

export const submitVerification = (data: { propertyId: string; videoUrl: string; locationLat: number; locationLng: number; locationAccuracy?: number; notes?: string }) =>
  apiFetch<{ success: boolean }>("/verifiers/submit", { method: "POST", body: JSON.stringify(data) });

export const getVerifierHistory = () =>
  apiFetch<{ submissions: any[] }>("/verifiers/history");

export const getVerificationCount = (propertyId: string) =>
  apiFetch<{ count: number }>(`/properties/${encodeURIComponent(propertyId)}/verification-count`);