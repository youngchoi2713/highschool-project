import { SESSION_STARTED_AT_KEY, SESSION_TTL_SECONDS } from "@/lib/auth/session";

export function parseSessionStart(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

export function getSessionStartFromCookie(): number | null {
  if (typeof document === "undefined") return null;

  const encodedName = `${SESSION_STARTED_AT_KEY}=`;
  const found = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(encodedName));

  if (!found) return null;
  return parseSessionStart(found.slice(encodedName.length));
}

export function setSessionMarker(startAt: number) {
  if (typeof document === "undefined") return;

  localStorage.setItem(SESSION_STARTED_AT_KEY, String(startAt));
  document.cookie = `${SESSION_STARTED_AT_KEY}=${startAt}; path=/; max-age=${SESSION_TTL_SECONDS}; samesite=lax`;
}

export function clearSessionMarker() {
  if (typeof document === "undefined") return;

  localStorage.removeItem(SESSION_STARTED_AT_KEY);
  document.cookie = `${SESSION_STARTED_AT_KEY}=; path=/; max-age=0; samesite=lax`;
}
