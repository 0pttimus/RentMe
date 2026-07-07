import { useCallback, useEffect, useRef, useState } from "react";
import { Outlet } from "react-router-dom";
import { useAppDispatch } from "@/store/hooks";
import { fetchCurrentUser } from "@/store/slices/authSlice";

function isNativeApp() {
  try {
    return !!(
      (window as any).Capacitor?.isNative ||
      (window as any).cordova ||
      navigator.userAgent.includes("capacitor")
    );
  } catch { return false; }
}

function isStandalonePwa() {
  return (window.navigator as any).standalone ||
    window.matchMedia("(display-mode: standalone)").matches;
}

function PullToRefresh({ children }: { children: React.ReactNode }) {
  const [pulling, setPulling] = useState(false);
  const [distance, setDistance] = useState(0);
  const startY = useRef(0);
  const ticking = useRef(false);

  const THRESHOLD = 80;

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (window.scrollY > 0) return;
    startY.current = e.touches[0].clientY;
    setPulling(true);
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!pulling) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy <= 0) { setDistance(0); return; }
    if (!ticking.current) {
      requestAnimationFrame(() => {
        setDistance(Math.min(dy * 0.5, 120));
        ticking.current = false;
      });
      ticking.current = true;
    }
  }, [pulling]);

  const handleTouchEnd = useCallback(() => {
    if (distance >= THRESHOLD) {
      window.location.reload();
    }
    setPulling(false);
    setDistance(0);
  }, [distance]);

  useEffect(() => {
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd);
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return (
    <>
      <div style={{
        height: distance, overflow: "hidden", display: "flex",
        alignItems: "center", justifyContent: "center", transition: pulling ? "none" : "height 0.3s ease",
      }}>
        <div className="spinner" style={{ opacity: Math.min(distance / THRESHOLD, 1) }} />
      </div>
      {children}
    </>
  );
}

export default function App() {
  const dispatch = useAppDispatch();
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    dispatch(fetchCurrentUser());
  }, [dispatch]);

  useEffect(() => {
    if (isNativeApp() || isStandalonePwa()) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === "accepted") setInstallPrompt(null);
  };

  return (
    <>
      <PullToRefresh>
        {installPrompt && (
          <div style={{
            position: "sticky", top: 0, zIndex: 100,
            padding: "8px 12px", paddingTop: "calc(8px + env(safe-area-inset-top, 0px))",
            background: "color-mix(in srgb, var(--color-surface) 96%, transparent)",
            backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
            borderBottom: "0.5px solid var(--color-line)",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <img src="/rentme-logo.png" alt="" style={{
              width: 36, height: 36, borderRadius: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: "var(--color-ink)" }}>RentMe</p>
              <p style={{ fontSize: 11, color: "var(--color-ink-soft)", margin: "1px 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Install for the best experience</p>
            </div>
            <button onClick={handleInstall} style={{
              height: 30, padding: "0 14px", border: 0, borderRadius: 8,
              background: "var(--color-accent)", color: "var(--color-on-accent)",
              fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", flexShrink: 0,
            }}>Get</button>
            <button onClick={() => setInstallPrompt(null)} style={{
              height: 30, width: 30, border: 0, borderRadius: 8,
              background: "transparent", color: "var(--color-ink-soft)",
              fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>✕</button>
          </div>
        )}
        <Outlet />
      </PullToRefresh>
    </>
  );
}
