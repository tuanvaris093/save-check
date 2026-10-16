import { z } from "../../../shared/v3";
import { RetestError } from "../../../shared/v3";
export class ApiError extends Error {
  constructor(
    public readonly status:
      400 | 401 | 403 | 404 | 409 | 410 | 413 | 415 | 422 | 500 | 503,
    public readonly code: string,
    message: string,
    public readonly issues?: {
      path: (string | number)[];
      code: string;
      message: string;
    }[],
  ) {
    super(message);
    this.name = "ApiError";
  }
}
export function fail(
  status: ApiError["status"],
  code: string,
  message: string,
): never {
  throw new ApiError(status, code, message);
}
export function asApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof z.ZodError)
    return new ApiError(
      400,
      "VALIDATION_ERROR",
      "กรุณาตรวจข้อมูลแบบประเมิน",
      error.issues.map((i) => ({
        path: i.path,
        code: i.code,
        message: i.message,
      })),
    );
  if (error instanceof RetestError)
    return new ApiError(
      error.code === "INVALID_UPDATE" ? 400 : 409,
      error.code,
      error.message,
    );
  const message = error instanceof Error ? error.message : "";
  if (
    /UNIQUE constraint|stale|archived revision base|immutable|carry must|rewound|CHECK constraint failed: valid/i.test(
      message,
    )
  )
    return new ApiError(
      409,
      "CONFLICT",
      "ข้อมูลถูกเปลี่ยนหรือคำขอนี้ขัดกับประวัติ กรุณาโหลดข้อมูลล่าสุด",
    );
  if (/no such table|no such column/i.test(message))
    return new ApiError(
      503,
      "SCHEMA_NOT_READY",
      "ฐานข้อมูลยังไม่พร้อมสำหรับการใช้งาน",
    );
  return new ApiError(
    500,
    "INTERNAL_ERROR",
    "เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่",
  );
}
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object")
    return (
      "{" +
      Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => JSON.stringify(k) + ":" + canonical(v))
        .join(",") +
      "}"
    );
  return JSON.stringify(value);
}
export async function digest(value: string | Uint8Array) {
  const bytes =
    typeof value === "string" ? new TextEncoder().encode(value) : value;
  const sum = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return [...new Uint8Array(sum)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
export async function readLimited(
  request: Request,
  max = 512 * 1024,
): Promise<Uint8Array> {
  const length = Number(request.headers.get("Content-Length"));
  if (Number.isFinite(length) && length > max)
    fail(413, "PAYLOAD_TOO_LARGE", "ข้อมูลเกินขนาดที่รองรับ");
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) {
        await reader.cancel();
        fail(413, "PAYLOAD_TOO_LARGE", "ข้อมูลเกินขนาดที่รองรับ");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.byteLength;
  }
  return bytes;
}
export async function readJson(request: Request): Promise<unknown> {
  if (!request.headers.get("Content-Type")?.includes("application/json"))
    fail(415, "CONTENT_TYPE", "กรุณาส่งข้อมูล JSON");
  try {
    return JSON.parse(new TextDecoder().decode(await readLimited(request)));
  } catch (e) {
    if (e instanceof ApiError) throw e;
    return fail(400, "INVALID_JSON", "รูปแบบ JSON ไม่ถูกต้อง");
  }
}
