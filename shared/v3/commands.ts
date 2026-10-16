import { z } from "zod";
import { text, inspectionSchema, environmentUnitSchema } from "./contracts";
export const archiveCommandSchema = z
  .object({
    schema_version: z.literal(3),
    idempotency_key: text.max(128),
    reason: text,
  })
  .strict();
export const correctionCommandSchema = z
  .object({
    schema_version: z.literal(3),
    idempotency_key: text.max(128),
    reason: text.optional(),
    expected_data_version: z.number().int().positive(),
    base_revision_id: text.optional(),
    payload: z.unknown(),
  })
  .strict()
  .superRefine((request, context) => {
    const environment =
      request.payload !== null &&
      typeof request.payload === "object" &&
      "assessment_type" in request.payload &&
      request.payload.assessment_type === "environment";
    if (!environment && !request.reason)
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reason"],
        message: "กรุณาระบุเหตุผล",
      });
  })
  .transform((request) => ({
    ...request,
    reason: request.reason ?? "ประเมินวัดซ้ำ",
  }));
export const legacySupplementSchema = z
  .object({
    schema_version: z.literal(3),
    idempotency_key: text.max(128),
    reason: text.default("เติมข้อมูลประกอบสำหรับการตรวจวัด"),
    base_revision_id: text,
    inspectionData: inspectionSchema,
    layout: z.object({ file_id: text }).strict().optional(),
    units: z.array(environmentUnitSchema).min(1),
  })
  .strict();
export type ArchiveRequestV3 = z.infer<typeof archiveCommandSchema>;
export type LegacySupplementRequestV3 = z.infer<typeof legacySupplementSchema>;
