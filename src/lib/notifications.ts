import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "rentme_notifications_enabled";

function isRegistered(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function store(v: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, v ? "true" : "false");
  } catch {}
}

const api = () => import.meta.env.VITE_API_URL ?? "";

async function fetchVapidKey(): Promise<string | null> {
  const envKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (envKey) return envKey;
  try {
    const res = await fetch(`${api()}/push/vapid-public-key`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.publicKey ?? null;
  } catch {
    return null;
  }
}

async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;
    return reg;
  } catch {
    return null;
  }
}

async function requestPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

async function subscribePush(reg: ServiceWorkerRegistration): Promise<boolean> {
  if (!("PushManager" in window)) return false;
  try {
    const sub = await reg.pushManager.getSubscription();
    if (sub) return true;
    const vapidKey = await fetchVapidKey();
    if (!vapidKey) return false;
    const newSub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as BufferSource,
    });
    const body = JSON.stringify(newSub.toJSON());
    if (api()) {
      fetch(`${api()}/push/subscribe`, { method: "POST", body, headers: { "Content-Type": "application/json" } }).catch(() => {});
    }
    return true;
  } catch {
    return false;
  }
}

async function unsubscribePush(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await sub.unsubscribe();
      const api = import.meta.env.VITE_API_URL ?? "";
      if (api) {
        fetch(`${api}/push/unsubscribe`, { method: "POST" }).catch(() => {});
      }
    }
  } catch {}
}

async function enable(): Promise<boolean> {
  if (!("Notification" in window) || !("PushManager" in window)) return false;
  const ok = await requestPermission();
  if (!ok) return false;
  const reg = await registerServiceWorker();
  if (!reg) return false;
  await subscribePush(reg);
  store(true);
  return true;
}

async function disable(): Promise<void> {
  store(false);
  await unsubscribePush();
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from(raw.split("").map((c) => c.charCodeAt(0)));
}

export function useNotificationPref() {
  const [enabled, setEnabledState] = useState(isRegistered);

  useEffect(() => {
    const current = isRegistered();
    if (current !== enabled) {
      store(enabled);
      if (enabled) {
        enable();
      } else {
        disable();
      }
    }
  }, [enabled]);

  const setEnabled = useCallback((v: boolean) => {
    setEnabledState(v);
  }, []);

  return { enabled, setEnabled };
}
