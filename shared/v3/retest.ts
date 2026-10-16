import { z } from "zod";
import {
  text,
  instant,
  date,
  finite,
  nonnegative,
  optionalNote,
  environmentUnitSchema,
  inspectionSchema,
  type EnvironmentRevisionV3,
  type EnvironmentUnit,
} from "./contracts";
import { evaluateEnvironment, evaluateUnit } from "./evaluate";
const updateBase = { point_id: text, remark: optionalNote };
export const retestSchema = z
  .object({
    schema_version: z.literal(3),
    idempotency_key: text.max(128),
    base_revision_id: text,
    inspectionData: inspectionSchema.optional(),
    layout: z.object({ file_id: text }).strict().nullable().optional(),
    inspection_date: date,
    start_at: instant,
    end_at: instant,
    updates: z
      .array(
        z.discriminatedUnion("kind", [
          z
            .object({
              ...updateBase,
              kind: z.literal("light_spot"),
              lux: nonnegative,
              surrounding_near_lux: nonnegative.optional(),
              surrounding_outer_lux: nonnegative.optional(),
            })
            .strict(),
          z
            .object({
              ...updateBase,
              kind: z.literal("light_area"),
              average_lux: nonnegative.optional(),
              minimum_lux: nonnegative.optional(),
              samples: z
                .array(z.object({ sample_id: text, lux: nonnegative }).strict())
                .min(1)
                .optional(),
            })
            .strict(),
          z
            .object({
              ...updateBase,
              kind: z.literal("noise"),
              min_dBA: finite,
              max_dBA: finite,
              exposure_level_dBA: finite.optional(),
              twa_8hr: finite.optional(),
            })
            .strict(),
          z
            .object({
              ...updateBase,
              kind: z.literal("heat"),
              start_at: instant,
              end_at: instant,
              wbgt_average: finite.optional(),
              input_mode: z.literal("meter_average").optional(),
              db_temp: finite.optional(),
              wb_temp: finite.optional(),
              gt_temp: finite.optional(),
              wbgt_in: finite.optional(),
              intervals: z
                .array(
                  z
                    .object({
                      wb: finite,
                      gt: finite,
                      db: finite.optional(),
                      minutes: finite.positive(),
                    })
                    .strict(),
                )
                .min(1)
                .optional(),
            })
            .strict(),
        ]),
      )
      .min(1),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (
      v.inspectionData &&
      (v.inspectionData.inspection_date !== v.inspection_date ||
        Date.parse(v.inspectionData.start_at) !== Date.parse(v.start_at) ||
        Date.parse(v.inspectionData.end_at) !== Date.parse(v.end_at))
    )
      ctx.addIssue({
        code: "custom",
        path: ["inspectionData"],
        message: "วันเวลาของรอบตรวจไม่ตรงกัน",
      });
    v.updates.forEach((u, index) => {
      if (u.kind !== "light_area") return;
      if (
        u.samples &&
        (u.average_lux !== undefined || u.minimum_lux !== undefined)
      )
        ctx.addIssue({
          code: "custom",
          path: ["updates", index, "average_lux"],
          message: "Do not mix area input formats",
        });
      if (!u.samples) {
        if (u.average_lux === undefined)
          ctx.addIssue({
            code: "custom",
            path: ["updates", index, "average_lux"],
            message: "Area average is required",
          });
        if (u.minimum_lux === undefined)
          ctx.addIssue({
            code: "custom",
            path: ["updates", index, "minimum_lux"],
            message: "Area minimum is required",
          });
      }
    });
  })
  .refine((v) => Date.parse(v.end_at) > Date.parse(v.start_at), {
    path: ["end_at"],
    message: "End must follow start",
  });
export class RetestError extends Error {
  constructor(
    public readonly code: "CONFLICT" | "NOT_ELIGIBLE" | "INVALID_UPDATE",
    message: string,
  ) {
    super(message);
    this.name = "RetestError";
  }
}
// Pure domain preparation. P2 must additionally enforce expected revision atomically in D1.
export function prepareRetest(
  base: EnvironmentRevisionV3,
  input: unknown,
  newRevisionId: string,
): EnvironmentRevisionV3 {
  const request = retestSchema.parse(input);
  if (request.base_revision_id !== base.revision_id)
    throw new RetestError("CONFLICT", "Base revision is stale");
  if (base.archived || base.schema_version !== 3)
    throw new RetestError(
      "NOT_ELIGIBLE",
      "Archived/legacy records require an explicit upgrade",
    );
  if (
    request.inspectionData &&
    request.inspectionData.measurement_technique !==
      base.inspectionData.measurement_technique
  )
    throw new RetestError(
      "INVALID_UPDATE",
      "เปลี่ยนเทคนิคตรวจแสงต้องสร้างงานใหม่",
    );
  const baseResults = evaluateEnvironment(base.observations.map((o) => o.unit));
  const failed = new Set(
    baseResults.results.filter((r) => !r.is_pass).map((r) => r.point_id),
  );
  if (!failed.size)
    throw new RetestError("NOT_ELIGIBLE", "Latest revision already passes");
  const ids = request.updates.map((u) => u.point_id);
  if (
    new Set(ids).size !== ids.length ||
    ids.length !== failed.size ||
    ids.some((id) => !failed.has(id))
  )
    throw new RetestError("INVALID_UPDATE", "Supply exactly the failed units");
  const observations = base.observations.map((old) => {
    const update = request.updates.find(
      (u) => u.point_id === old.unit.point_id,
    );
    if (!update)
      return {
        ...old,
        result: evaluateUnit(old.unit),
        observation_kind: "carried" as const,
        carried_from_revision_id:
          old.carried_from_revision_id ?? base.revision_id,
      };
    if (update.kind !== old.unit.kind)
      throw new RetestError("INVALID_UPDATE", "Unit kind is locked");
    if (
      update.kind === "light_area" &&
      old.unit.kind === "light_area" &&
      update.samples
    ) {
      const sampleIds = new Set(
        (old.unit.samples ?? []).map((s) => s.sample_id),
      );
      if (
        update.samples.length !== sampleIds.size ||
        new Set(update.samples.map((s) => s.sample_id)).size !==
          sampleIds.size ||
        update.samples.some((s) => !sampleIds.has(s.sample_id))
      )
        throw new RetestError(
          "INVALID_UPDATE",
          "Area topology is locked; remeasure all its samples",
        );
    }
    const unit = environmentUnitSchema.parse({
      ...old.unit,
      ...update,
      ...(update.kind === "heat" && update.input_mode === "meter_average"
        ? { intervals: undefined }
        : {}),
      ...(update.kind === "light_area" && update.average_lux !== undefined
        ? { samples: undefined }
        : {}),
    }) as EnvironmentUnit;
    return {
      unit,
      result: evaluateUnit(unit),
      measured_at: unit.kind === "heat" ? unit.start_at : request.start_at,
      observation_kind: "measured" as const,
      carried_from_revision_id: null,
    };
  });
  return {
    ...base,
    revision_id: text.parse(newRevisionId),
    kind: "retest",
    layout_file_id:
      request.layout === null
        ? null
        : (request.layout?.file_id ?? base.layout_file_id),
    revision_no: base.revision_no + 1,
    base_revision_id: base.revision_id,
    inspectionData: {
      ...base.inspectionData,
      ...request.inspectionData,
      inspection_date: request.inspection_date,
      start_at: request.start_at,
      end_at: request.end_at,
    },
    observations,
    is_pass: observations.every((o) => o.result.is_pass),
  };
}

export type RetestRequestV3 = z.infer<typeof retestSchema>;
