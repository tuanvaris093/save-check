import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { asApiError, fail } from "./lib/errors";
import { requireAdmin, type AdminBindings } from "./routes/admin";
import { dashboardRoute } from "./routes/dashboard";

export const adminApi = new Hono<{ Bindings: AdminBindings }>().basePath(
  "/api",
);

const requireDatabase = createMiddleware<{ Bindings: AdminBindings }>(
  async (c, next) => {
    c.header("Cache-Control", "no-store");
    if (!c.env.DB)
      fail(503, "SCHEMA_NOT_READY", "ยังไม่ได้เชื่อมฐานข้อมูลของเว็บ");
    await next();
  },
);
adminApi.use("/dashboard/*", requireDatabase, requireAdmin);
adminApi.route("/dashboard", dashboardRoute);
adminApi.notFound((c) =>
  c.json(
    {
      success: false,
      error: { code: "NOT_FOUND", message: "ไม่พบหน้าที่เรียก" },
    },
    404,
  ),
);
adminApi.onError((error, c) => {
  const { status, code, message } = asApiError(error);
  return c.json({ success: false, error: { code, message } }, status);
});
