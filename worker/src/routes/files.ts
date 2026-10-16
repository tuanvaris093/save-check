import { Hono } from "hono";
import type { Env } from "../types";
import { FileService } from "../services/file-service";
import { fail } from "../lib/errors";
export const filesRoute = new Hono<{ Bindings: Env }>();
filesRoute.post("/", async (c) =>
  c.json(
    { success: true, data: await new FileService(c.env).upload(c.req.raw) },
    201,
  ),
);
filesRoute.post("/cleanup", async (c) => {
  if (!c.env.MAINTENANCE_TOKEN)
    fail(503, "MAINTENANCE_NOT_CONFIGURED", "ยังไม่ตั้งค่าสิทธิ์ดูแลไฟล์");
  if (c.req.header("Authorization") !== `Bearer ${c.env.MAINTENANCE_TOKEN}`)
    fail(401, "UNAUTHORIZED", "ไม่มีสิทธิ์ดูแลไฟล์");
  return c.json({
    success: true,
    data: await new FileService(c.env).cleanup(),
  });
});
filesRoute.get("/legacy/:revisionId", async (c) =>
  new FileService(c.env).downloadLegacy(c.req.param("revisionId")),
);
filesRoute.get("/:id", async (c) =>
  new FileService(c.env).download(c.req.param("id")),
);
