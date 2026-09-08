import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import type { Env } from "./types";
import { submissionsRoute } from "./routes/submissions";
import { resultsRoute } from "./routes/results";
import { dashboardRoute } from "./routes/dashboard";

const app = new Hono<{ Bindings: Env }>();

// Middlewares
app.use("*", logger());
app.use("*", prettyJSON());

// Dynamic CORS for Local & Production Frontends
app.use("*", async (c, next) => {
  const allowedCustomOrigins = (c.env.FRONTEND_URL || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  const corsMiddleware = cors({
    origin: (origin) => {
      // Allow localhost on ports 3000, 3001, 5173, etc. or Cloudflare Pages domains or configured domains
      if (
        !origin ||
        origin.includes("localhost") ||
        origin.includes("127.0.0.1") ||
        origin.endsWith(".pages.dev") ||
        allowedCustomOrigins.includes(origin)
      ) {
        return origin || "*";
      }
      return origin;
    },
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: ["Content-Length"],
    maxAge: 86400,
  });
  return corsMiddleware(c, next);
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
    404
  );
});

// Global Error Handler
app.onError((err, c) => {
  console.error("Unhandled Worker Error:", err);
  return c.json(
    {
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: err.message || "An unexpected server error occurred",
      },
    },
    500
  );
});

export default app;
