import { adminPasswordVerifier } from "../shared/admin-authorization.ts";

export const testAdminPassword = crypto.randomUUID();

export async function createAdminTestSession() {
  return {
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    verifier: await adminPasswordVerifier(testAdminPassword),
  };
}

export function seedAdminTestSession(context, origin, session) {
  return context.addInitScript(
    ({ origin, session }) => {
      if (location.origin === origin)
        localStorage.setItem(
          "safecheck:admin-session",
          JSON.stringify(session),
        );
    },
    { origin, session },
  );
}
