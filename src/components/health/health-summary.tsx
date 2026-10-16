"use client";
import {
  UserRound,
  BriefcaseBusiness,
  Activity,
  ClipboardList,
  Lightbulb,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  CircleAlert,
  CheckCircle2,
} from "lucide-react";
import { SummaryHeading } from "@/components/reports/summary-details";
import {
  evaluateSubmission,
  questionSnapshots,
  programSnapshot,
} from "../../../shared/v3";
import type { HealthSubmission } from "@/lib/v3/health-form";
import { NOISE_SOURCE_LABELS } from "./health-steps";
import {
  GENDER_OPTIONS,
  EDUCATION_LEVEL_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  POSITION_TYPE_OPTIONS,
} from "@/lib/constants";
import { Button } from "@/components/ui";
import { HEALTH_RISK_RECOMMENDATIONS } from "@/lib/health-risk-schema";
const levels = {
  pass: "ระดับต่ำ (0–6)",
  medium: "ระดับปานกลาง (7–13)",
  high_risk: "ระดับสูง (14–20)",
};
type HealthResult = {
  total?: number;
  level?: keyof typeof levels;
  before_total?: number;
  after_total?: number;
  delta?: number;
  after_level?: keyof typeof levels;
  items?: {
    question_id: string;
    before: number;
    after: number;
    delta: number;
  }[];
};
type Questions = {
  before?: { question_id: string; text: string }[];
  after?: { question_id: string; text: string }[];
  single?: { question_id: string; text: string }[];
};
export function HealthSummary({
  payload,
  result,
  questions,
  programLabel,
  server = false,
  onSubmit,
  onPrev,
  isSubmitting = false,
}: {
  payload: HealthSubmission;
  result: HealthResult;
  questions: Questions;
  programLabel: string;
  version: string;
  server?: boolean;
  onSubmit?: () => void;
  onPrev?: () => void;
  isSubmitting?: boolean;
}) {
  const light = payload.assessment_category === "light",
    work = payload.workInfo,
    level = light ? result.after_level : result.level,
    recommendations = level
      ? HEALTH_RISK_RECOMMENDATIONS[payload.assessment_category][
          level === "high_risk" ? "high" : level
        ]
      : [];
  return (
    <section
      className="summary-view flex min-w-0 flex-col gap-5"
      aria-label={
        server ? "ผลอาการทางสุขภาพจาก server" : "ตรวจทานข้อมูลอาการทางสุขภาพ"
      }
    >
      <h2 className="text-section-title font-semibold">
        {server ? "ข้อมูลผู้ตอบและผลการประเมิน" : "ตรวจทานก่อนส่งข้อมูล"}
      </h2>
      {!server && (
        <p className="text-small text-text-secondary">
          เป็นผลคำนวณสำหรับตรวจทาน ยังไม่ได้บันทึกบนระบบ
        </p>
      )}
      <section className="form-section-card p-4">
        <SummaryHeading icon={UserRound}>ข้อมูลส่วนตัวและสุขภาพ</SummaryHeading>
        <dl className="summary-details">
          <div>
            <dt>ผู้ตอบ</dt>
            <dd>{payload.profile.full_name}</dd>
          </div>
          <div>
            <dt>อายุ / น้ำหนัก / ส่วนสูง</dt>
            <dd>
              {payload.profile.age} ปี · {payload.profile.weight} กก. ·{" "}
              {payload.profile.height} ซม.
            </dd>
          </div>
          <div>
            <dt>เพศ / การศึกษา / สถานภาพ</dt>
            <dd>
              {
                GENDER_OPTIONS.find((o) => o.value === payload.profile.gender)
                  ?.label
              }{" "}
              ·{" "}
              {
                EDUCATION_LEVEL_OPTIONS.find(
                  (o) => o.value === payload.profile.education_level,
                )?.label
              }{" "}
              ·{" "}
              {
                MARITAL_STATUS_OPTIONS.find(
                  (o) => o.value === payload.profile.marital_status,
                )?.label
              }
            </dd>
          </div>
          <div>
            <dt>ข้อมูลสุขภาพ</dt>
            <dd>
              {payload.profile.has_underlying_disease
                ? `มีโรคประจำตัว: ${payload.profile.underlying_disease_details}`
                : "ไม่มีโรคประจำตัว"}
            </dd>
          </div>
        </dl>
        <div className="summary-subsection">
          <SummaryHeading icon={BriefcaseBusiness}>
            ข้อมูลการปฏิบัติงาน / การเรียน
          </SummaryHeading>
        </div>
        <dl className="summary-details">
          <div>
            <dt>ประเภทผู้ตอบ</dt>
            <dd>
              {
                POSITION_TYPE_OPTIONS.find(
                  (o) => o.value === work.position_type,
                )?.label
              }
              {work.other_context
                ? ` (${work.other_context === "study" ? "การเรียน" : "การทำงาน"})`
                : ""}
            </dd>
          </div>
          <div>
            <dt>หลักสูตร / แผนก / ฝ่าย</dt>
            <dd className="break-words">{programLabel}</dd>
          </div>
          <div>
            <dt>{work.study_year !== undefined ? "ชั้นปี" : "อายุงาน (ปี)"}</dt>
            <dd>{work.study_year ?? work.work_experience_years}</dd>
          </div>
          <div>
            <dt>ระยะเวลาเฉลี่ย</dt>
            <dd>
              {work.working_hours_per_day} ชั่วโมง/วัน ·{" "}
              {work.working_hours_per_week} ชั่วโมง/สัปดาห์
            </dd>
          </div>
          {payload.assessment_category === "light" && (
            <div>
              <dt>ระยะเวลาปฏิบัติงาน / เรียนวันนี้</dt>
              <dd>
                {payload.healthContext.hours_worked_today} ชั่วโมง (ไม่รวมคะแนน)
              </dd>
            </div>
          )}
          {payload.assessment_category === "noise" && (
            <div>
              <dt>แหล่งเสียง (ไม่รวมคะแนน)</dt>
              <dd>
                {payload.healthContext.noise_sources
                  .map((s) => NOISE_SOURCE_LABELS[s])
                  .join(", ")}
                {payload.healthContext.noise_source_other
                  ? ` — ${payload.healthContext.noise_source_other}`
                  : ""}
              </dd>
            </div>
          )}
        </dl>
      </section>
      <div
        className="form-section-card summary-score-list p-5"
        data-health-totals
      >
        <SummaryHeading icon={Activity}>
          สรุปผลการประเมินอาการทางสุขภาพ
        </SummaryHeading>
        {light ? (
          <>
            <div
              className="health-score-cards"
              aria-label="เปรียบเทียบคะแนนก่อนและหลัง"
            >
              <div className="health-score-card is-before">
                <div className="health-score-label">ก่อนปฏิบัติงาน / เรียน</div>
                <strong data-health-before>{result.before_total}</strong>
                <div className="health-score-unit">คะแนน / 20</div>
              </div>
              <div className={`health-score-card is-after level-${level}`}>
                <div className="health-score-label">หลังปฏิบัติงาน / เรียน</div>
                <strong data-health-after>{result.after_total}</strong>
                <div className="health-score-unit">คะแนน / 20</div>
              </div>
            </div>
            <div
              className={`health-score-change ${result.delta! > 0 ? "is-increased" : result.delta! < 0 ? "is-decreased" : "is-unchanged"}`}
            >
              {result.delta! > 0 ? (
                <ArrowUpRight aria-hidden="true" />
              ) : result.delta! < 0 ? (
                <ArrowDownRight aria-hidden="true" />
              ) : (
                <Minus aria-hidden="true" />
              )}
              <span>
                ผลต่าง (หลัง−ก่อน):{" "}
                <strong>
                  {result.delta! > 0 ? "+" : ""}
                  {result.delta}
                </strong>{" "}
                คะแนน
              </span>
              <span className="health-change-label">
                {result.delta! > 0
                  ? "คะแนนเพิ่มขึ้น"
                  : result.delta! < 0
                    ? "คะแนนลดลง"
                    : "คะแนนเท่าเดิม"}
              </span>
            </div>
            <div className={`health-level-banner level-${level}`}>
              {level === "pass" ? (
                <CheckCircle2 aria-hidden="true" />
              ) : (
                <CircleAlert aria-hidden="true" />
              )}
              <div>
                <strong>
                  ระดับอาการจากคะแนนหลัง: {levels[result.after_level!]}
                </strong>
                <div className="health-level-description">
                  คะแนนหลังประเมิน {result.after_total} จาก 20 คะแนน
                  {result.delta! > 0
                    ? ` เพิ่มขึ้น ${result.delta} คะแนนจากก่อนประเมิน ควรติดตามอาการที่เพิ่มขึ้น`
                    : result.delta! < 0
                      ? ` ลดลง ${Math.abs(result.delta!)} คะแนนจากก่อนประเมิน`
                      : " เท่ากับคะแนนก่อนประเมิน"}
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <p>
              <strong>คะแนนรวม:</strong> {result.total}/20
            </p>
            <p>
              <strong>ระดับอาการ:</strong> {levels[result.level!]}
            </p>
          </>
        )}
      </div>
      <div className="form-section-card w-full min-w-0 overflow-x-auto p-5">
        <SummaryHeading icon={ClipboardList}>
          รายละเอียดการตอบแบบประเมินอาการทางสุขภาพ (10 ข้อ)
        </SummaryHeading>
        <table
          className="text-small w-full border-collapse text-left"
          data-health-comparison
        >
          <thead>
            <tr>
              <th className="border p-2">ข้อ / อาการ</th>
              {light ? (
                <>
                  <th className="border p-2">ก่อน</th>
                  <th className="border p-2">หลัง</th>
                  <th className="border p-2">ผลต่าง</th>
                </>
              ) : (
                <th className="border p-2">คะแนน</th>
              )}
            </tr>
          </thead>
          <tbody>
            {(light ? questions.after : questions.single)?.map((q, i) => {
              const row = result.items?.find(
                (r) => r.question_id === q.question_id,
              );
              return (
                <tr key={q.question_id}>
                  <td className="border p-2">
                    {i + 1}. {q.text}
                    {light && (
                      <p className="text-caption text-text-secondary mt-2">
                        {
                          questions.before?.find(
                            (b) => b.question_id === q.question_id,
                          )?.text
                        }
                      </p>
                    )}
                  </td>
                  {light ? (
                    <>
                      <td className="border p-2">{row?.before}</td>
                      <td className="border p-2">{row?.after}</td>
                      <td className="border p-2">
                        {row?.delta !== undefined && row.delta > 0 ? "+" : ""}
                        {row?.delta}
                      </td>
                    </>
                  ) : (
                    <td className="border p-2">
                      {payload.answers.single[q.question_id]}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {recommendations.length > 0 && (
        <section
          className="form-section-card p-5"
          aria-label="ข้อเสนอแนะด้านสุขภาพ"
        >
          <SummaryHeading icon={Lightbulb}>
            ข้อเสนอแนะด้าน
            {payload.assessment_category === "light"
              ? "แสงสว่าง"
              : payload.assessment_category === "noise"
                ? "เสียง"
                : "ความร้อน"}
          </SummaryHeading>
          <ul className="text-small text-text-secondary list-disc space-y-2 pl-5">
            {recommendations.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
        </section>
      )}

      {onPrev && (
        <div className="flex gap-3">
          <Button variant="outline" onClick={onPrev} disabled={isSubmitting}>
            ย้อนกลับแก้ไข
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting}>
            บันทึกผล
          </Button>
        </div>
      )}
    </section>
  );
}
export function HealthPreview({
  payload,
  ...props
}: {
  payload: HealthSubmission;
  onSubmit: () => void;
  onPrev: () => void;
  isSubmitting: boolean;
}) {
  const category = payload.assessment_category;
  return (
    <HealthSummary
      {...props}
      payload={payload}
      result={evaluateSubmission(payload) as HealthResult}
      questions={
        category === "light"
          ? {
              before: questionSnapshots(category, "before"),
              after: questionSnapshots(category, "after"),
            }
          : { single: questionSnapshots(category, "single") }
      }
      programLabel={
        programSnapshot(payload.workInfo.program_code).label ?? "ไม่เกี่ยวข้อง"
      }
      version={
        questionSnapshots(
          category,
          category === "light" ? "before" : "single",
        )[0].version
      }
    />
  );
}
