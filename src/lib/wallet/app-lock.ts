import { useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { setAppLocked, hasWallet } from "./store";
import { verifyPin } from "./pin";

const LOCK_TIMEOUT_MS = 60_000;
const PIN_KEY = "rentme_pin_hash";

function getLastActivity(): number {
  const ts = localStorage.getItem("rentme_pin_timestamp");
  return ts ? parseInt(ts, 10) : Date.now();
}

export function useAppLock() {
  const navigate = useNavigate();
  const lockedRef = useRef(false);

  const lock = useCallback(() => {
    if (lockedRef.current) return;
    lockedRef.current = true;
    setAppLocked(true);
    navigate("/app-lock", { replace: true });
  }, [navigate]);

  useEffect(() => {
    if (!hasWallet()) return;

    function handleVisibility() {
      if (document.hidden) {
        const ts = Date.now();
        localStorage.setItem("rentme_pin_timestamp", ts.toString());
      } else {
        const last = getLastActivity();
        if (Date.now() - last > LOCK_TIMEOUT_MS && !lockedRef.current) {
          lock();
        }
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [lock]);
}

export async function unlockWithPin(
  pin: string
): Promise<{ ok: boolean }> {
  const hash = localStorage.getItem(PIN_KEY);
  if (!hash) return { ok: false };
  const valid = await verifyPin(pin, hash);
  return { ok: valid };
}
