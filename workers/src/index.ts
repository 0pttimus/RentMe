import {
  handleCompleteProfile,
  handleLogout,
  handleMe,
  handleSendOtp,
  handleUploadAvatar,
  handleVerifyOtp,
} from "./routes/auth";
import { handleAdminReleaseEscrow, handleAdminReports, handleAdminResolveReport, handleAdminStats } from "./routes/admin";
import { handleAiChat } from "./routes/ai";
import { handleKycWebhook, handleMockKycComplete, handleStartKyc } from "./routes/kyc";
import { handleListNotifications, handleMarkNotificationRead, handleUnreadCount } from "./routes/notifications";
import { handleListBanks, handlePaystackInit, handleResolveAccount, handlePaystackWebhook } from "./routes/payments";
import { handleSendPhoneOtp, handleVerifyPhoneOtp } from "./routes/phone";
import { handleCreateProperty } from "./routes/properties-create";
import { handleUpdateProperty, handleDeleteProperty } from "./routes/properties-update";
import { handleGetProperty, handleListProperties, handleListMyProperties } from "./routes/properties";
import { handleAddBookmark, handleListBookmarks, handleRemoveBookmark, handleGetBookmarkStatus } from "./routes/bookmarks";
import { handleGetPriceHistory } from "./routes/price-history";
import { handleSearchPassports, handleGetPassport, handleGetPassportUnits, handleCreateUnit } from "./routes/passport";
import { handleCreateReport } from "./routes/reports";
import { handleSubscribeAlert, handleUnsubscribeAlert, handleGetAlertStatus } from "./routes/alerts";
import { handleCreateReservation, handleListReservations, handleApproveReservation, handleRejectReservation, handlePayReservation, handleCancelReservation, handleListLandlordReservations, handleGetReservationByProperty, handleLandlordUnreserve, handleBackOut, handlePayBalance, handleExtendInspection, handleApproveExtension, handleRejectExtension } from "./routes/reservations";
import { handleGetRewards } from "./routes/rewards";
import { handleBookService, handleListServices } from "./routes/services";
import {
  handleFreelanceProfileStatus,
  handleFreelanceProfileGet,
  handleFreelanceProfileUpsert,
} from "./routes/freelance";
import { handleNairaWithdraw, handleUsdcDeposit, handleUsdcDepositVerify, handleUsdcWithdraw, handleWalletCreate, handleWalletGet, handleWalletRecover } from "./routes/wallet";
import {
  handleConfirmCompletion,
  handleDepositToEscrow,
  handleGetEscrowState,
  handleMarkDone,
  handlePingTimeout,
  handleRequestRefund,
} from "./routes/escrow";
import {
  handleCreateConversation,
  handleListConversations,
  handleGetMessages,
  handleSendMessage,
} from "./routes/chat";
import {
  handleApplyVerifier,
  handleVerifierStatus,
  handleNearbyProperties,
  handleSubmitVerification,
  handleVerifierHistory,
  handleReviewVerification,
  handleGetVerificationCount,
} from "./routes/verifiers";
import { handleVapidPublicKey, handlePushSubscribe, handlePushUnsubscribe } from "./routes/push";
import { handleGetUser } from "./routes/users";
import { checkRateLimit, cleanupRateLimitBuckets } from "./lib/rate-limit";
import { deleteExpiredSessions } from "./lib/db";
import type { Env } from "./lib/env";

function corsHeaders(origin: string | null, env: Env): Record<string, string> {
  const allowedOrigins = (env.ALLOWED_ORIGIN ?? "http://localhost:3000").split(",").map(s => s.trim());
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Credentials": "true",
  };
  const ok =
    !origin ||
    allowedOrigins.includes(origin) ||
    env.ENVIRONMENT === "development" ||
    origin.includes(".pages.dev") ||
    origin.includes(".workers.dev");
  if (ok && origin) headers["Access-Control-Allow-Origin"] = origin;
  else if (env.ENVIRONMENT === "development") headers["Access-Control-Allow-Origin"] = allowedOrigins[0];
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
      cleanupRateLimitBuckets();
      await deleteExpiredSessions(env.DB);
      const rateLimitResponse = checkRateLimit(request);
      if (rateLimitResponse) {
        const headers = new Headers(rateLimitResponse.headers);
        Object.entries(cors).forEach(([k, v]) => headers.set(k, v));
        return new Response(rateLimitResponse.body, { status: 429, headers });
      }

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
        case url.pathname === "/auth/avatar" && request.method === "POST":
          response = await handleUploadAvatar(request, env); break;
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
        case url.pathname === "/properties/mine" && request.method === "GET":
          response = await handleListMyProperties(request, env); break;
        case url.pathname === "/properties" && request.method === "GET":
          response = await handleListProperties(request, env); break;
        case url.pathname === "/properties" && request.method === "POST":
          response = await handleCreateProperty(request, env); break;
        case url.pathname === "/properties/price-history" && request.method === "GET":
          response = await handleGetPriceHistory(env, url.searchParams.get("id") ?? ""); break;
        case url.pathname.match(/^\/properties\/[^/]+$/) && request.method === "GET":
          response = await handleGetProperty(env, url.pathname.split("/")[2]); break;
        case url.pathname.match(/^\/properties\/[^/]+$/) && request.method === "PUT":
          response = await handleUpdateProperty(request, env, url.pathname.split("/")[2]); break;
        case url.pathname.match(/^\/properties\/[^/]+$/) && request.method === "DELETE":
          response = await handleDeleteProperty(request, env, url.pathname.split("/")[2]); break;

        // Bookmarks
        case url.pathname === "/bookmarks" && request.method === "GET":
          response = await handleListBookmarks(request, env); break;
        case url.pathname === "/bookmarks" && request.method === "POST":
          response = await handleAddBookmark(request, env); break;
        case url.pathname === "/bookmarks" && request.method === "DELETE":
          response = await handleRemoveBookmark(request, env); break;
        case url.pathname === "/bookmarks/status" && request.method === "GET":
          response = await handleGetBookmarkStatus(request, env); break;

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
        case url.pathname === "/reservations/landlord" && request.method === "GET":
          response = await handleListLandlordReservations(request, env); break;
        case url.pathname === "/reservations/by-property" && request.method === "GET":
          response = await handleGetReservationByProperty(request, env); break;
        case url.pathname.match(/^\/reservations\/[^/]+\/approve$/) && request.method === "PUT":
          response = await handleApproveReservation(request, env, url.pathname.split("/")[2]); break;
        case url.pathname.match(/^\/reservations\/[^/]+\/reject$/) && request.method === "PUT":
          response = await handleRejectReservation(request, env, url.pathname.split("/")[2]); break;
        case url.pathname.match(/^\/reservations\/[^/]+\/pay$/) && request.method === "PUT":
          response = await handlePayReservation(request, env, url.pathname.split("/")[2]); break;
        case url.pathname.match(/^\/reservations\/[^/]+\/cancel$/) && request.method === "PUT":
          response = await handleCancelReservation(request, env, url.pathname.split("/")[2]); break;
        case url.pathname.match(/^\/reservations\/landlord\/unreserve\/[^/]+$/) && request.method === "POST":
          response = await handleLandlordUnreserve(request, env, url.pathname.split("/")[4]); break;
        case url.pathname.match(/^\/reservations\/[^/]+\/back-out$/) && request.method === "PUT":
          response = await handleBackOut(request, env, url.pathname.split("/")[2]); break;
        case url.pathname.match(/^\/reservations\/[^/]+\/pay-balance$/) && request.method === "PUT":
          response = await handlePayBalance(request, env, url.pathname.split("/")[2]); break;
        case url.pathname.match(/^\/reservations\/[^/]+\/extend$/) && request.method === "PUT":
          response = await handleExtendInspection(request, env, url.pathname.split("/")[2]); break;
        case url.pathname.match(/^\/reservations\/[^/]+\/extend\/approve$/) && request.method === "PUT":
          response = await handleApproveExtension(request, env, url.pathname.split("/")[2]); break;
        case url.pathname.match(/^\/reservations\/[^/]+\/extend\/reject$/) && request.method === "PUT":
          response = await handleRejectExtension(request, env, url.pathname.split("/")[2]); break;

        // Property alerts
        case url.pathname === "/alerts/subscribe" && request.method === "POST":
          response = await handleSubscribeAlert(request, env); break;
        case url.pathname === "/alerts/unsubscribe" && request.method === "POST":
          response = await handleUnsubscribeAlert(request, env); break;
        case url.pathname === "/alerts/status" && request.method === "GET":
          response = await handleGetAlertStatus(request, env); break;

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
        case url.pathname === "/notifications/unread-count" && request.method === "GET":
          response = await handleUnreadCount(request, env); break;
        case url.pathname.startsWith("/notifications/") && request.method === "PATCH": {
          const nid = url.pathname.split("/").pop();
          if (!nid) { response = new Response("Not Found", { status: 404 }); break; }
          response = await handleMarkNotificationRead(request, env, nid); break;
        }
        case url.pathname === "/services" && request.method === "GET":
          response = await handleListServices(env); break;
        case url.pathname === "/services/book" && request.method === "POST":
          response = await handleBookService(request, env); break;
        case url.pathname === "/rewards" && request.method === "GET":
          response = await handleGetRewards(request, env); break;

        // Freelance
        case url.pathname === "/freelance/profile/status" && request.method === "GET":
          response = await handleFreelanceProfileStatus(request, env); break;
        case url.pathname === "/freelance/profile" && request.method === "GET":
          response = await handleFreelanceProfileGet(request, env); break;
        case url.pathname === "/freelance/profile" && request.method === "POST":
          response = await handleFreelanceProfileUpsert(request, env); break;

        // Chat / messaging
        case url.pathname === "/chat/conversations" && request.method === "GET":
          response = await handleListConversations(request, env); break;
        case url.pathname === "/chat/conversations" && request.method === "POST":
          response = await handleCreateConversation(request, env); break;
        case url.pathname.match(/^\/chat\/conversations\/[^/]+\/messages$/) && request.method === "GET":
          response = await handleGetMessages(request, env); break;
        case url.pathname.match(/^\/chat\/conversations\/[^/]+\/messages$/) && request.method === "POST":
          response = await handleSendMessage(request, env); break;

        // Verifiers
        case url.pathname === "/verifiers/apply" && request.method === "POST":
          response = await handleApplyVerifier(request, env); break;
        case url.pathname === "/verifiers/status" && request.method === "GET":
          response = await handleVerifierStatus(request, env); break;
        case url.pathname === "/verifiers/nearby" && request.method === "GET":
          response = await handleNearbyProperties(request, env); break;
        case url.pathname === "/verifiers/submit" && request.method === "POST":
          response = await handleSubmitVerification(request, env); break;
        case url.pathname === "/verifiers/history" && request.method === "GET":
          response = await handleVerifierHistory(request, env); break;
        case url.pathname === "/verifiers/review" && request.method === "POST":
          response = await handleReviewVerification(request, env); break;
        case url.pathname.match(/^\/properties\/[^/]+\/verification-count$/) && request.method === "GET":
          response = await handleGetVerificationCount(request, env, url.pathname.split("/")[2]); break;

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

        // Push
        case url.pathname === "/push/vapid-public-key" && request.method === "GET":
          response = await handleVapidPublicKey(request, env); break;
        case url.pathname === "/push/subscribe" && request.method === "POST":
          response = await handlePushSubscribe(request, env); break;
        case url.pathname === "/push/unsubscribe" && request.method === "POST":
          response = await handlePushUnsubscribe(request, env); break;

        // Users
        case url.pathname.match(/^\/users\/[^/]+$/) && request.method === "GET":
          response = await handleGetUser(request, env, url.pathname.split("/")[2]); break;

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