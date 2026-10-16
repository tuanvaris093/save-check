import { Hono } from "hono";
import { cors } from "hono/cors";
import { prettyJSON } from "hono/pretty-json";
import { filesRoute } from "./routes/files";
import { asApiError, fail } from "./lib/errors";
import type { Env } from "./types";
import { submissionsRoute } from "./routes/submissions";
import { resultsRoute } from "./routes/results";
import { dashboardRoute } from "./routes/dashboard";
import { healthPendingRoute } from "./routes/health-pending";

const app = new Hono<{ Bindings: Env }>();

// Middlewares
app.use("*", prettyJSON());

// Keep the database stable while the release snapshots existing records.
app.use("/api/*", async (c, next) => {
  if (c.env.RELEASE_MAINTENANCE === "1") {
    c.header("Retry-After", "120");
    fail(503, "RELEASE_MAINTENANCE", "กำลังอัปเดตระบบ กรุณาลองใหม่อีกครั้ง");
  }
  await next();
});

// Origins are exact values per environment; CORS is not an authorization mechanism.
app.use("*", async (c, next) => {
  const allowed = new Set(
    (c.env.FRONTEND_URL || "")
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean),
  );
  const origin = c.req.header("Origin");
  if (origin && !allowed.has(origin))
    fail(403, "ORIGIN_DENIED", "Origin is not allowed");
  return cors({
    origin: (value) => (allowed.has(value) ? value : ""),
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "Idempotency-Key",
      "X-File-Name",
    ],
    exposeHeaders: ["Content-Length", "ETag"],
    maxAge: 86400,
  })(c, next);
});

// Health check endpoint
app.get("/", (c) => {
  return c.json({
    name: "SafeCheck API",
    version: "1.0.0",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/health", (c) => {
  return c.json({
    status: "ok",
    runtime: "cloudflare-workers",
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes under /api
app.route("/api/submissions", submissionsRoute);
app.route("/api/results", resultsRoute);
app.route("/api/dashboard", dashboardRoute);
app.route("/api/health-light-drafts", healthPendingRoute);
app.route("/api/files", filesRoute);

// 404 Handler
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: {
        code: "NOT_FOUND",
        message: `Endpoint ${c.req.path} not found`,
      },
    },
    404,
  );
});

// Responses never expose SQL, file keys, payloads or database internals.
app.onError((error, c) => {
  const safe = asApiError(error);
  return c.json(
    {
      success: false,
      error: {
        code: safe.code,
        message: safe.message,
        ...(safe.issues ? { issues: safe.issues } : {}),
      },
    },
    safe.status,
  );
});

export default app;
