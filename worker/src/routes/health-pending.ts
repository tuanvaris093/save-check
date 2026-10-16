import { Hono } from "hono";
import type { Env } from "../types";

export const healthPendingRoute = new Hono<{ Bindings: Env }>();
// Retired workflow: retain stored drafts, but reject old clients without writes.
healthPendingRoute.all("*", (c) =>
  c.json(
    {
      success: false,
      error: {
        code: "WORKFLOW_RETIRED",
        message: "กรุณาทำแบบประเมินส่วนก่อนและส่วนหลังให้ครบก่อนบันทึกผล",
      },
    },
    410,
  ),
);
