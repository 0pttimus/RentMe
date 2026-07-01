import {
  handleCompleteProfile,
  handleLogout,
  handleMe,
  handleSendOtp,
  handleVerifyOtp,
} from "./routes/auth";
import { handleAdminReleaseEscrow, handleAdminReports, handleAdminResolveReport, handleAdminStats } from "./routes/admin";
import { handleAiChat } from "./routes/ai";
import { handleKycWebhook, handleMockKycComplete, handleStartKyc } from "./routes/kyc";
import { handleListNotifications } from "./routes/notifications";
import { handleListBanks, handlePaystackInit, handleResolveAccount, handlePaystackWebhook } from "./routes/payments";
import { handleSendPhoneOtp, handleVerifyPhoneOtp } from "./routes/phone";
import { handleCreateProperty } from "./routes/properties-create";
import { handleGetProperty, handleListProperties } from "./routes/properties";
import { handleSearchPassports, handleGetPassport, handleGetPassportUnits, handleCreateUnit } from "./routes/passport";
import { handleCreateReport } from "./routes/reports";
import { handleCreateReservation, handleGetReservation, handleListReservations } from "./routes/reservations";
import { handleGetRewards } from "./routes/rewards";
import { handleBookService, handleListServices } from "./routes/services";
import { handleNairaWithdraw, handleUsdcDeposit, handleUsdcDepositVerify, handleUsdcWithdraw, handleWalletCreate, handleWalletGet, handleWalletRecover } from "./routes/wallet";
import {
  handleConfirmCompletion,
  handleDepositToEscrow,
  handleGetEscrowState,
  handleMarkDone,
  handlePingTimeout,
  handleRequestRefund,
} from "./routes/escrow";
import type { Env } from "./lib/env";

function corsHeaders(origin: string | null, env: Env): Record<string, string> {
  const allowed = env.ALLOWED_ORIGIN ?? "http://localhost:3000";
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Credentials": "true",
  };
  const ok =
    !origin ||
    origin === allowed ||
    env.ENVIRONMENT === "development" ||
    origin.includes(".pages.dev") ||
    origin.includes(".workers.dev");
  if (ok && origin) headers["Access-Control-Allow-Origin"] = origin;
  else if (env.ENVIRONMENT === "development") headers["Access-Control-Allow-Origin"] = allowed;
  return headers;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    const cors = corsHeaders(origin, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    try {
      let response: Response;

      switch (true) {
        case url.pathname === "/health":
          response = Response.json({ status: "ok", service: "rentme-api" });
          break;

        // Auth
        case url.pathname === "/auth/otp/send" && request.method === "POST":
          response = await handleSendOtp(request, env); break;
        case url.pathname === "/auth/otp/verify" && request.method === "POST":
          response = await handleVerifyOtp(request, env); break;
        case url.pathname === "/auth/me" && request.method === "GET":
          response = await handleMe(request, env); break;
        case url.pathname === "/auth/logout" && request.method === "POST":
          response = await handleLogout(request, env); break;
        case url.pathname === "/auth/profile/complete" && request.method === "POST":
          response = await handleCompleteProfile(request, env); break;
        case url.pathname === "/auth/phone/send" && request.method === "POST":
          response = await handleSendPhoneOtp(request, env); break;
        case url.pathname === "/auth/phone/verify" && request.method === "POST":
          response = await handleVerifyPhoneOtp(request, env); break;

        // Passports
        case url.pathname === "/passports/search" && request.method === "GET":
          response = await handleSearchPassports(request, env); break;
        case url.pathname.match(/^\/passports\/[^/]+\/units$/) && request.method === "GET":
          response = await handleGetPassportUnits(env, url.pathname.split("/")[2]); break;
        case url.pathname.match(/^\/passports\/[^/]+\/units$/) && request.method === "POST":
          response = await handleCreateUnit(request, env, url.pathname.split("/")[2]); break;
        case url.pathname.match(/^\/passports\/[^/]+$/) && request.method === "GET":
          response = await handleGetPassport(env, url.pathname.split("/")[2]); break;

        // Properties
        case url.pathname === "/properties" && request.method === "GET":
          response = await handleListProperties(request, env); break;
        case url.pathname === "/properties" && request.method === "POST":
          response = await handleCreateProperty(request, env); break;
        case url.pathname.startsWith("/properties/") && request.method === "GET":
          response = await handleGetProperty(env, url.pathname.split("/")[2]); break;

        // Wallet & payments
        case url.pathname === "/payments/paystack/init" && request.method === "POST":
          response = await handlePaystackInit(request, env); break;
        case url.pathname === "/payments/paystack/webhook" && request.method === "POST":
          response = await handlePaystackWebhook(request, env); break;
        case url.pathname === "/payments/banks" && request.method === "GET":
          response = await handleListBanks(request, env); break;
        case url.pathname === "/payments/banks/resolve" && request.method === "POST":
          response = await handleResolveAccount(request, env); break;

        // Reservations
        case url.pathname === "/reservations" && request.method === "POST":
          response = await handleCreateReservation(request, env); break;
        case url.pathname === "/reservations" && request.method === "GET":
          response = await handleListReservations(request, env); break;
        case url.pathname.match(/^\/reservations\/[^/]+$/) && request.method === "GET":
          response = await handleGetReservation(request, env); break;

        // KYC
        case url.pathname === "/kyc/start" && request.method === "POST":
          response = await handleStartKyc(request, env); break;
        case url.pathname === "/kyc/webhook" && request.method === "POST":
          response = await handleKycWebhook(request, env); break;
        case url.pathname === "/kyc/complete-mock" && request.method === "POST":
          response = await handleMockKycComplete(request, env); break;

        // Reports, notifications, services, rewards
        case url.pathname === "/fraud-reports" && request.method === "POST":
          response = await handleCreateReport(request, env); break;
        case url.pathname === "/notifications" && request.method === "GET":
          response = await handleListNotifications(request, env); break;
        case url.pathname === "/services" && request.method === "GET":
          response = await handleListServices(env); break;
        case url.pathname === "/services/book" && request.method === "POST":
          response = await handleBookService(request, env); break;
        case url.pathname === "/rewards" && request.method === "GET":
          response = await handleGetRewards(request, env); break;

        // AI
        case url.pathname === "/ai/chat" && request.method === "POST":
          response = await handleAiChat(request, env); break;

        // Wallet
        case url.pathname === "/wallet" && request.method === "GET":
          response = await handleWalletGet(request, env); break;
        case url.pathname === "/wallet/create" && request.method === "POST":
          response = await handleWalletCreate(request, env); break;
        case url.pathname === "/wallet/recover" && request.method === "GET":
          response = await handleWalletRecover(request, env); break;
        case url.pathname === "/wallet/deposit/usdc" && request.method === "POST":
          response = await handleUsdcDeposit(request, env); break;
        case url.pathname === "/wallet/deposit/usdc/verify" && request.method === "POST":
          response = await handleUsdcDepositVerify(request, env); break;
        case url.pathname === "/wallet/withdraw/usdc" && request.method === "POST":
          response = await handleUsdcWithdraw(request, env); break;
        case url.pathname === "/wallet/withdraw/naira" && request.method === "POST":
          response = await handleNairaWithdraw(request, env); break;
        // Escrow
        case url.pathname.startsWith("/escrow/") && url.pathname.endsWith("/deposit") && request.method === "POST":
          response = await handleDepositToEscrow(request, env); break;
        case url.pathname.startsWith("/escrow/") && url.pathname.endsWith("/mark-done") && request.method === "POST":
          response = await handleMarkDone(request, env); break;
        case url.pathname.startsWith("/escrow/") && url.pathname.endsWith("/confirm") && request.method === "POST":
          response = await handleConfirmCompletion(request, env); break;
        case url.pathname.startsWith("/escrow/") && url.pathname.endsWith("/refund") && request.method === "POST":
          response = await handleRequestRefund(request, env); break;
        case url.pathname.startsWith("/escrow/") && url.pathname.endsWith("/ping") && request.method === "POST":
          response = await handlePingTimeout(request, env); break;
        case url.pathname.match(/^\/escrow\/[A-HJ-NP-Za-km-z1-9]{32,44}$/) && request.method === "GET":
          response = await handleGetEscrowState(request, env); break;

        // Admin
        case url.pathname === "/admin/stats" && request.method === "GET":
          response = await handleAdminStats(request, env); break;
        case url.pathname === "/admin/reports" && request.method === "GET":
          response = await handleAdminReports(request, env); break;
        case url.pathname === "/admin/reports/resolve" && request.method === "POST":
          response = await handleAdminResolveReport(request, env); break;
        case url.pathname === "/admin/escrow/release" && request.method === "POST":
          response = await handleAdminReleaseEscrow(request, env); break;

        default:
          response = Response.json({ error: "Not found" }, { status: 404 });
      }

      const headers = new Headers(response.headers);
      Object.entries(cors).forEach(([k, v]) => headers.set(k, v));
      return new Response(response.body, { status: response.status, headers });
    } catch (err) {
      return Response.json(
        { error: err instanceof Error ? err.message : "Internal error" },
        { status: 500, headers: cors }
      );
    }
  },
} satisfies ExportedHandler<Env>;