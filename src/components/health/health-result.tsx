"use client";
import { HealthSummary } from "./health-summary";
import { validateSubmission } from "../../../shared/v3";
export function HealthResultV3({ data }: { data: Record<string, unknown> }) {
  const resolved = data.resolved as
    | {
        program?: { code: string; label: string | null };
        questions?: Parameters<typeof HealthSummary>[0]["questions"];
        questionnaire_version?: string;
      }
    | undefined;
  const parsed = validateSubmission({
    schema_version: 3,
    idempotency_key: "read-only",
    assessment_type: "health_risk",
    assessment_group: "health",
    assessment_category: data.assessment_category,
    profile: data.profile,
    workInfo: data.workInfo,
    answers: data.answers,
    ...(data.assessment_category === "heat"
      ? {}
      : { healthContext: data.healthContext }),
  });
  return (
    <section className="flex min-w-0 flex-col gap-5">
      {parsed.success &&
      parsed.data.assessment_type === "health_risk" &&
      resolved?.questions &&
      resolved?.program &&
      resolved?.questionnaire_version &&
      data.result ? (
        <HealthSummary
          payload={parsed.data}
          result={data.result as Parameters<typeof HealthSummary>[0]["result"]}
          questions={resolved.questions}
          programLabel={
            resolved.program.label ??
            (resolved.program.code === "not_applicable"
              ? "ไม่เกี่ยวข้อง"
              : "ไม่พบชื่อหลักสูตร")
          }
          version={resolved.questionnaire_version}
          server
        />
      ) : (
        <p role="alert">ข้อมูลผลหรือชุดคำถามไม่ครบ กรุณาโหลดใหม่</p>
      )}
    </section>
  );
}
