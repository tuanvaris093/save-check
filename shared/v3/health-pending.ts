import { z } from "zod";
import { QUESTIONNAIRE_VERSION } from "./catalogs";
import {
  profileSchema,
  healthWorkSchema,
  healthAnswersSchema,
} from "./contracts";
// Pending data is not a scored submission; absent answers never become zero.
export const healthLightPendingPayloadSchema = z
  .object({
    questionnaire_version: z.literal(QUESTIONNAIRE_VERSION),
    profile: profileSchema,
    workInfo: healthWorkSchema,
    healthContext: z
      .object({ hours_worked_today: z.number().finite().min(0).max(24) })
      .strict(),
    answers: z
      .object({
        before: healthAnswersSchema,
        after: healthAnswersSchema.partial(),
      })
      .strict(),
  })
  .strict();
export const saveHealthPendingSchema = z
  .object({
    id: z.string().uuid(),
    expected_version: z.number().int().nonnegative(),
    payload: healthLightPendingPayloadSchema,
  })
  .strict();
export type HealthLightPendingPayload = z.infer<
  typeof healthLightPendingPayloadSchema
>;
export type SaveHealthPendingRequest = z.infer<typeof saveHealthPendingSchema>;
export interface HealthPendingRecord {
  id: string;
  version: number;
  created_at: string;
  updated_at: string;
  payload: HealthLightPendingPayload;
  completed_submission_code: string | null;
}
export interface HealthPendingList {
  items: {
    id: string;
    version: number;
    full_name: string;
    updated_at: string;
    after_answered: number;
  }[];
  total: number;
  page: number;
  limit: number;
}
