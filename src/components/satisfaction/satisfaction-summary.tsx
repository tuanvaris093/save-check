"use client";
import {
  UserRound,
  GraduationCap,
  BriefcaseBusiness,
  Star,
  ClipboardList,
  Clock,
  MessageSquare,
} from "lucide-react";
import {
  SummaryField,
  SummaryHeading,
} from "@/components/reports/summary-details";
import { ReportTable } from "@/components/reports/report-table";
import {
  type SatisfactionSubmission,
  displayDuration,
} from "@/lib/v3/satisfaction-form";
import {
  satisfactionQuestionsForResult,
  type satisfactionQuestionSnapshots,
} from "../../../shared/v3";
type Questions = ReturnType<typeof satisfactionQuestionSnapshots>;
type Result = {
  overall_mean: number;
  dimension_means: number[];
  durations?: {
    traditional_seconds: number;
    safecheck_seconds: number;
    source: string;
  };
};
export function SatisfactionSummary({
  payload,
  result,
  questions,
  server = false,
  programLabel,
}: {
  payload: SatisfactionSubmission;
  result: Result;
  questions: Questions;
  version: string;
  server?: boolean;
  programLabel?: string | null;
}) {
  const categories = satisfactionQuestionsForResult({
    schema_version: 3,
    resolved: { questions },
  });
  const group = payload.assessment_group;
  return (
    <div className="summary-view flex flex-col gap-4" data-satisfaction-summary>
      <section className="form-section-card p-5">
        <SummaryHeading as="h2" icon={Star}>
          สรุปความพึงพอใจด้าน
          {group === "environment" ? "สภาพแวดล้อมในการทำงาน" : "อาการทางสุขภาพ"}
        </SummaryHeading>
        <dl className="summary-details">
          <SummaryField icon={UserRound} label="ผู้ประเมิน">
            {payload.profile.full_name}
          </SummaryField>
          {group === "health" && (
            <>
              <SummaryField icon={BriefcaseBusiness} label="ประเภทผู้ตอบ">
                {
                  {
                    staff: "บุคลากร",
                    student: "นักศึกษา",
                    faculty: "อาจารย์",
                    other: "อื่น ๆ",
                  }[payload.workInfo.position_type]
                }
              </SummaryField>
              {payload.workInfo.other_context && (
                <SummaryField label="บริบท">
                  {payload.workInfo.other_context === "study"
                    ? "นักศึกษา/ผู้เรียน"
                    : "ผู้ปฏิบัติงาน"}
                </SummaryField>
              )}
              <SummaryField icon={GraduationCap} label="หลักสูตร / แผนก / ฝ่าย">
                {payload.workInfo.program_code === "not_applicable"
                  ? "ไม่เกี่ยวข้อง"
                  : programLabel || "ไม่พบชื่อหลักสูตรที่บันทึก"}
              </SummaryField>
              {payload.workInfo.study_year !== undefined && (
                <SummaryField label="ชั้นปี">
                  {payload.workInfo.study_year}
                </SummaryField>
              )}
            </>
          )}
        </dl>
        <dl className="summary-details summary-metrics summary-subsection">
          <SummaryField icon={Star} label="คะแนนเฉลี่ยรวม (เต็ม 5)">
            <span data-overall-mean>{result.overall_mean.toFixed(2)}</span>
          </SummaryField>
        </dl>
        <p className="text-caption text-text-secondary mt-2">
          {server ? "ผลการประเมินที่บันทึก" : "ผลสรุปก่อนบันทึก"}
        </p>
        <div
          className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4"
          aria-label="สรุปคะแนนรายด้าน"
        >
          {categories.map((cat, i) => (
            <div
              key={cat.key}
              className="border-border rounded-lg border bg-white/60 p-3 text-center"
            >
              <p className="text-text-primary text-sm font-semibold">
                {cat.label}
              </p>
              <p className="text-small mt-1 font-bold">
                {result.dimension_means[i]?.toFixed(2)} / 5
              </p>
            </div>
          ))}
        </div>
      </section>
      <SummaryHeading as="h2" icon={ClipboardList}>
        รายละเอียดการตอบแบบประเมินความพึงพอใจ (16 ข้อ)
      </SummaryHeading>
      {categories.map((cat, i) => (
        <section key={cat.key} className="form-section-card p-5">
          <SummaryHeading icon={ClipboardList}>
            {cat.label}
            <span className="text-small text-text-secondary mt-1 block font-normal">
              คะแนนเฉลี่ย {result.dimension_means[i]?.toFixed(2)}
            </span>
          </SummaryHeading>
          <div className="mt-3">
            <ReportTable
              label={cat.label}
              headers={["ข้อ", "คำถาม", "คะแนน (เต็ม 5)"]}
              rows={cat.questions.map((q) => [
                q.id.slice(1),
                q.text,
                payload.answers[q.id],
              ])}
            />
          </div>
        </section>
      ))}
      {group === "environment" && result.durations && (
        <section className="form-section-card p-5">
          <SummaryHeading icon={Clock}>
            เวลาในการประเมิน (กรอกเอง)
          </SummaryHeading>
          <dl className="summary-details">
            <SummaryField label="วิธีเดิม">
              {displayDuration(result.durations.traditional_seconds)} (
              {result.durations.traditional_seconds.toLocaleString("en-US")}{" "}
              วินาที)
            </SummaryField>
            <SummaryField label="SafeCheck">
              {displayDuration(result.durations.safecheck_seconds)} (
              {result.durations.safecheck_seconds.toLocaleString("en-US")}{" "}
              วินาที)
            </SummaryField>
            <SummaryField label="ผลต่างเวลา (วิธีเดิม − SafeCheck)">
              {result.durations.traditional_seconds -
                result.durations.safecheck_seconds}{" "}
              วินาที
            </SummaryField>
          </dl>
          <p className="text-caption text-text-secondary mt-3">
            ผลต่างติดลบหมายถึง SafeCheck ใช้เวลามากกว่า
            เวลาที่กรอกไม่ถูกนำไปคิดคะแนนความพึงพอใจ
          </p>
        </section>
      )}
      {payload.suggestion && (
        <section className="form-section-card p-5">
          <SummaryHeading icon={MessageSquare}>
            ข้อเสนอแนะเพิ่มเติม
          </SummaryHeading>
          <p className="summary-content whitespace-pre-wrap">
            {payload.suggestion}
          </p>
        </section>
      )}
    </div>
  );
}
export type {
  Result as SatisfactionStoredResult,
  Questions as SatisfactionStoredQuestions,
};
