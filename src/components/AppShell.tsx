import { Outlet, useLocation } from "react-router-dom";
import { useAppSelector } from "@/store/hooks";
import { useAppLock } from "@/lib/wallet/app-lock";
import { ToastProvider } from "@/components/ui/Toast";
import SidebarNav from "./SidebarNav";
import FreelanceSidebarNav from "./FreelanceSidebarNav";
import BottomNav from "./BottomNav";
import FreelanceBottomNav from "./FreelanceBottomNav";

export default function AppShell() {
  const { pathname } = useLocation();
  const accountType = useAppSelector((s) => s.account.type);
  useAppLock();

  return (
    <div className="app-shell">
      <ToastProvider>
        {accountType === "freelance" ? <FreelanceSidebarNav /> : <SidebarNav />}
        <div className="main-area">
          <div className="scroll-area">
            <div key={pathname} className="page-fade-in">
              <div className="page-inner">
                <Outlet />
              </div>
            </div>
          </div>
          <div className="mobile-nav">
            {accountType === "freelance" ? <FreelanceBottomNav /> : <BottomNav />}
          </div>
        </div>
      </ToastProvider>
    </div>
  );
}
