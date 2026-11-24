import { createAdminSession } from "../shared/admin-authorization.ts";

export const testAdminPassword = crypto.randomUUID();

export function createAdminTestSession() {
  return createAdminSession(testAdminPassword);
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
