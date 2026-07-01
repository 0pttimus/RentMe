export const SESSION_COOKIE = "rentme_session";
const CLIENT_SESSION_KEY = "rentme_client_session";

export function hasSessionCookie(cookieHeader: string | undefined): boolean {
  if (!cookieHeader) return false;
  return cookieHeader.split(";").some((c) => c.trim().startsWith(`${SESSION_COOKIE}=`));
}

export function hasClientSession(): boolean {
  return hasSessionCookie(document.cookie) || getClientSessionMarker() !== null;
}

export function getClientSessionMarker(): string | null {
  return window.localStorage.getItem(CLIENT_SESSION_KEY);
}

export function setClientSession(): void {
  window.localStorage.setItem(CLIENT_SESSION_KEY, Date.now().toString());
}

export function clearClientSession(): void {
  window.localStorage.removeItem(CLIENT_SESSION_KEY);
}

export function clearClientSessionIfMarker(marker: string | null): void {
  if (getClientSessionMarker() === marker) {
    clearClientSession();
  }
}
