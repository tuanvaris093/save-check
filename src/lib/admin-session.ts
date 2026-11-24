import { adminPasswordVerifier } from "../../shared/admin-authorization";

type AdminSession = { expiresAt: number; verifier: string };

const STORAGE_KEY = "safecheck:admin-session";
const SESSION_DURATION = 24 * 60 * 60 * 1000;
const configuredVerifier = process.env.NEXT_PUBLIC_ADMIN_PASSWORD_VERIFIER;

export async function signInAdmin(password: string) {
  if (!configuredVerifier)
    throw new Error("ยังไม่ได้ตั้งรหัสผ่านแอดมินใน .env");
  if ((await adminPasswordVerifier(password)) !== configuredVerifier)
    return null;
  return {
    expiresAt: Date.now() + SESSION_DURATION,
    verifier: configuredVerifier,
  };
}

export function readAdminSession(): AdminSession | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const session = JSON.parse(stored) as AdminSession;
    if (
      configuredVerifier &&
      session?.verifier === configuredVerifier &&
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
