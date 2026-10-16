import { Hono } from "hono";
import type { Env } from "../types";
import { AssessmentRepository } from "../repositories/assessment-repository";
import { fail } from "../lib/errors";
export const resultsRoute = new Hono<{ Bindings: Env }>();
resultsRoute.get("/:code", async (c) => {
  const version = c.req.query("version");
  if (version && (!/^\d+$/.test(version) || Number(version) < 1))
    fail(400, "VERSION_VALUE", "ข้อมูลที่เลือกไม่ถูกต้อง");
  return c.json({
    success: true,
    data: await new AssessmentRepository(c.env.DB).result(
      c.req.param("code"),
      c.req.query("revision"),
      version ? Number(version) : undefined,
    ),
  });
});
