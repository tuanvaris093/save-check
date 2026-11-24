import {
  adminPasswordVerifier,
  createAdminSession,
} from "../../shared/admin-authorization";

export type AdminSession = Awaited<ReturnType<typeof createAdminSession>>;

const STORAGE_KEY = "safecheck:admin-session";
export const ADMIN_SESSION_INVALIDATED = "safecheck:admin-session-invalidated";

export async function signInAdmin(password: string) {
  const expected = process.env.NEXT_PUBLIC_ADMIN_PASSWORD_VERIFIER;
  if (!expected) throw new Error("ยังไม่ได้ตั้งรหัสผ่านแอดมินใน .env");
  if ((await adminPasswordVerifier(password)) !== expected) return null;
  return createAdminSession(password);
}

export function readAdminSession(): AdminSession | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const session = JSON.parse(stored) as AdminSession;
    if (
      typeof session?.token === "string" &&
      session.token.startsWith("sv2.") &&
      Number.isFinite(session.expiresAt) &&
      session.expiresAt > Date.now()
    )
      return session;
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage may be blocked or contain invalid data.
  }
  return null;
}

export function saveAdminSession(session: AdminSession) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function invalidateAdminSession(token: string) {
  const current = readAdminSession();
  if (current && current.token !== token) return;
  if (current) localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(ADMIN_SESSION_INVALIDATED));
}
