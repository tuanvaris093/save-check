"use client";
import Link from "next/link";
import { PageHeader } from "@/components/layout";
import {
  validateSubmission,
  satisfactionQuestionnaireVersion,
  type SatisfactionGroup,
} from "../../../shared/v3";
import {
  SatisfactionSummary,
  type SatisfactionStoredResult,
  type SatisfactionStoredQuestions,
} from "./satisfaction-summary";
export function SatisfactionResult({
  data,
}: {
  data: Record<string, unknown>;
}) {
  const group = data.assessment_group as SatisfactionGroup;
  const parsed = validateSubmission({
    schema_version: 3,
    idempotency_key: "read-only",
    assessment_type: "satisfaction",
    assessment_category: "general",
    assessment_group: group,
    profile: data.profile,
    answers: data.answers,
    suggestion: data.suggestion,
    ...(group === "health"
      ? { workInfo: data.workInfo }
      : { durations: data.durations }),
  });
  const resolved = data.resolved as
    | {
        questions?: SatisfactionStoredQuestions;
        program?: { label: string | null };
      }
    | undefined;
  const canEdit =
    data.is_latest !== false &&
    !data.archived_at &&
    data.questionnaire_version === satisfactionQuestionnaireVersion(group);
  return (
    <section className="flex min-w-0 flex-col gap-4">
      {parsed.success &&
      parsed.data.assessment_type === "satisfaction" &&
      data.result &&
      resolved?.questions ? (
        <SatisfactionSummary
          payload={parsed.data}
          result={data.result as SatisfactionStoredResult}
          questions={resolved.questions}
          version={String(data.questionnaire_version)}
          programLabel={resolved.program?.label}
          server
        />
      ) : (
        <p role="alert">ข้อมูลผลหรือชุดคำถามไม่ครบ กรุณาโหลดใหม่</p>
      )}
      <div className="flex flex-wrap gap-4 print:hidden">
        {canEdit && (
          <Link
            className="action-button"
            href={`/assessment/satisfaction?group=${group}&edit=${encodeURIComponent(String(data.submission_code))}&base=${data.data_version}`}
          >
            แก้ไขพร้อมเหตุผล
          </Link>
        )}
      </div>
    </section>
  );
}

/** Legacy grouping, duration and questionnaire wording are unknown. Preserve the
 * recorded score instead of recalculating 16 questions from an incomplete set. */
export function LegacySatisfactionResult({
  data,
}: {
  data: Record<string, unknown>;
}) {
  const profile = (data.profile || {}) as { full_name?: string },
    answers = (data.answers || {}) as Record<string, unknown>;
  const score =
    typeof data.overall_score === "number" &&
    Number.isFinite(data.overall_score)
      ? data.overall_score
      : null;
  return (
    <div className="app-mobile-shell pb-safe-nav mx-auto max-w-[800px] p-4">
      <PageHeader
        title="ผลความพึงพอใจ"
        subtitle={String(data.submission_code)}
        showBack
        backHref="/dashboard"
      />
      <main className="mt-4 flex flex-col gap-4">
        <section className="form-section-card p-5">
          <h2 className="font-semibold">ผลแบบประเมินความพึงพอใจ</h2>
          <p>ผู้ประเมิน: {profile.full_name || "ไม่มีข้อมูล"}</p>
          <p>
            คะแนนเฉลี่ยที่บันทึก:{" "}
            {score === null ? "ไม่มีข้อมูล" : score.toFixed(2)}
          </p>
          <p>หลักสูตร/ชั้นปีและเวลาวิธีเดิมเทียบ SafeCheck: ไม่มีข้อมูล</p>
          <p className="text-caption">แสดงคะแนนตามข้อมูลที่บันทึกไว้</p>
        </section>
        <section className="form-section-card p-5">
          <h3 className="font-semibold">คะแนนรายข้อที่มีข้อมูล</h3>
          <ul className="mt-3 space-y-2">
            {Object.entries(answers)
              .filter(([key]) => /^q\d+$/.test(key))
              .map(([key, rating]) => (
                <li key={key}>
                  ข้อ {key.slice(1)}: {String(rating)}
                </li>
              ))}
          </ul>
        </section>
        {typeof answers.suggestion === "string" && answers.suggestion && (
          <p className="form-section-card p-5">
            ข้อเสนอแนะ: {answers.suggestion}
          </p>
        )}
        <div className="flex flex-wrap gap-3 print:hidden">
          <Link className="action-button" href="/assessment/satisfaction">
            เริ่มแบบประเมินใหม่และเลือกกลุ่ม
          </Link>
        </div>
      </main>
    </div>
  );
}
