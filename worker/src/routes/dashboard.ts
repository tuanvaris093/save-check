import { Hono } from "hono";
import type { Env } from "../types";
import { AssessmentRepository } from "../repositories/assessment-repository";
import { DashboardService } from "../services/dashboard-service";
export const dashboardRoute = new Hono<{ Bindings: Env }>();
const service = (env: Env) =>
  new DashboardService(new AssessmentRepository(env.DB));
dashboardRoute.get("/summary", async (c) =>
  c.json({
    success: true,
    data: await service(c.env).summary(new URL(c.req.url)),
  }),
);
dashboardRoute.get("/submissions", async (c) =>
  c.json({
    success: true,
    data: await service(c.env).list(new URL(c.req.url)),
  }),
);
dashboardRoute.get("/export-data", async (c) =>
  c.json({
    success: true,
    data: await service(c.env).export(new URL(c.req.url)),
  }),
);
