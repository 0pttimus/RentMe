import { createBrowserRouter, Navigate } from "react-router-dom";
import App from "@/App";
import AppShell from "@/components/AppShell";
import { ProtectedRoute } from "./ProtectedRoute";
import AuthEmailPage from "@/pages/AuthEmailPage";
import VerifyPage from "@/pages/VerifyPage";
import WelcomeScreen from "@/pages/WelcomeScreen";
import ProfileSetupPage from "@/pages/ProfileSetupPage";
import MarketsPage from "@/pages/MarketsPage";
import PortalPage from "@/pages/PortalPage";
import WalletPage from "@/pages/WalletPage";
import WalletDepositPage from "@/pages/WalletDepositPage";
import WalletWithdrawPage from "@/pages/WalletWithdrawPage";
import WalletPayPage from "@/pages/WalletPayPage";
import PayHirePage from "@/pages/PayHirePage";
import HirePage from "@/pages/HirePage";
import PropertyPage from "@/pages/PropertyPage";
import ReservePage from "@/pages/ReservePage";
import ProfilePage from "@/pages/ProfilePage";
import NotificationsPage from "@/pages/NotificationsPage";
import KycPage from "@/pages/KycPage";
import TrustPage from "@/pages/TrustPage";
import RentalHistoryPage from "@/pages/RentalHistoryPage";
import ListPropertyPage from "@/pages/ListPropertyPage";
import RewardsPage from "@/pages/RewardsPage";
import SettingsPage from "@/pages/SettingsPage";
import HelpPage from "@/pages/HelpPage";
import AdminPage from "@/pages/AdminPage";
import AssistantPage from "@/pages/AssistantPage";
import MessagesPage from "@/pages/MessagesPage";
import FreelanceHomePage from "@/pages/FreelanceHomePage";
import FreelancePortalPage from "@/pages/FreelancePortalPage";
import FreelanceWalletPage from "@/pages/FreelanceWalletPage";
import WorkerProfilePage from "@/pages/WorkerProfilePage";
import WorkerEditPage from "@/pages/WorkerEditPage";
import RepairRequestPage from "@/pages/RepairRequestPage";
import OrderWorkerPage from "@/pages/OrderWorkerPage";
import ReviewWorkerPage from "@/pages/ReviewWorkerPage";
import JobChatPage from "@/pages/JobChatPage";
import CategoryMarketPage from "@/pages/CategoryMarketPage";
import RentalItemPage from "@/pages/RentalItemPage";
import WalletCreatePage from "@/pages/WalletCreatePage";
import WalletExportPage from "@/pages/WalletExportPage";
import AppLockPage from "@/pages/AppLockPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <WelcomeScreen /> },
      { path: "auth", element: <AuthEmailPage /> },
      { path: "auth/verify", element: <VerifyPage /> },
      { path: "app-lock", element: <AppLockPage /> },
      {
        element: <AppShell />,
        children: [
          {
            element: <ProtectedRoute />,
            children: [
              { path: "freelance/home", element: <FreelanceHomePage /> },
              { path: "freelance/portal", element: <FreelancePortalPage /> },
              { path: "freelance/wallet", element: <FreelanceWalletPage /> },
              { path: "freelance/edit-profile", element: <WorkerEditPage /> },
              { path: "worker/:id", element: <WorkerProfilePage /> },
              { path: "worker/:id/order", element: <OrderWorkerPage /> },
              { path: "worker/:id/review", element: <ReviewWorkerPage /> },
              { path: "chat/:threadId", element: <JobChatPage /> },
              { path: "repair-request", element: <RepairRequestPage /> },
              { path: "profile/setup", element: <ProfileSetupPage /> },
              { path: "wallet/setup", element: <WalletCreatePage /> },
              { path: "wallet/export", element: <WalletExportPage /> },
              { path: "markets", element: <MarketsPage /> },
              { path: "markets/category/:slug", element: <CategoryMarketPage /> },
              { path: "rental/:id", element: <RentalItemPage /> },
              { path: "property/:id", element: <PropertyPage /> },
              { path: "portal", element: <PortalPage /> },
              { path: "wallet", element: <WalletPage /> },
              { path: "wallet/deposit", element: <WalletDepositPage /> },
              { path: "wallet/withdraw", element: <WalletWithdrawPage /> },
              { path: "wallet/pay", element: <WalletPayPage /> },
              { path: "wallet/pay-hire", element: <PayHirePage /> },
              { path: "hire", element: <HirePage /> },
              { path: "reserve/:id", element: <ReservePage /> },
              { path: "profile", element: <ProfilePage /> },
              { path: "notifications", element: <NotificationsPage /> },
              { path: "kyc", element: <KycPage /> },
              { path: "trust", element: <TrustPage /> },
              { path: "rental-history", element: <RentalHistoryPage /> },
              { path: "list-property", element: <ListPropertyPage /> },
              { path: "rewards", element: <RewardsPage /> },
              { path: "settings", element: <SettingsPage /> },
              { path: "help", element: <HelpPage /> },
              { path: "admin", element: <AdminPage /> },
              { path: "assistant", element: <AssistantPage /> },
              { path: "messages", element: <MessagesPage /> },
            ],
          },
          { path: "*", element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
]);
