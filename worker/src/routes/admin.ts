import { createMiddleware } from "hono/factory";
import { isAdminTokenValid } from "../../../shared/admin-authorization";
import { fail } from "../lib/errors";
import type { Env } from "../types";

export type AdminBindings = Pick<Env, "DB"> & { ADMIN_PASSWORD?: string };

export const requireAdmin = createMiddleware<{ Bindings: AdminBindings }>(
  async (c, next) => {
    const password = c.env.ADMIN_PASSWORD;
    const token = c.req.header("Authorization")?.match(/^Bearer (\S+)$/i)?.[1];
    if (!password || !token || !(await isAdminTokenValid(password, token)))
      fail(401, "ADMIN_REQUIRED", "กรุณาเข้าสู่ระบบแอดมิน");
    await next();
  },
);
