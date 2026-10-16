"use client";
import { FormInput, FormSelect } from "@/components/forms";
import {
  PROGRAMS,
  STUDY_YEARS,
  type SatisfactionGroup,
} from "../../../shared/v3";
import {
  satisfactionIsStudy,
  type SatisfactionDraft,
} from "@/lib/v3/satisfaction-form";
export function SatisfactionRespondent({
  draft: d,
  group,
  onChange,
  errors,
}: {
  draft: SatisfactionDraft;
  group: SatisfactionGroup;
  onChange: (d: SatisfactionDraft) => void;
  errors: Record<string, string>;
}) {
  const work = (patch: Partial<SatisfactionDraft["work"]>) =>
    onChange({ ...d, work: { ...d.work, ...patch } });
  const study = satisfactionIsStudy(d.work);
  return (
    <section className="form-section-card flex flex-col gap-4 p-5">
      <h2 className="font-semibold">ข้อมูลผู้ประเมิน</h2>
      <FormInput
        name="full_name"
        label="ชื่อ-นามสกุลผู้ประเมิน"
        required
        value={d.full_name}
        onChange={(e) => onChange({ ...d, full_name: e.target.value })}
        error={errors.full_name}
      />
      {group === "health" && (
        <>
          <FormSelect
            name="work.position_type"
            label="ประเภทผู้ตอบ"
            required
            placeholder="กรุณาเลือก"
            value={d.work.position_type || ""}
            options={[
              { value: "staff", label: "บุคลากร" },
              { value: "student", label: "นักศึกษา" },
              { value: "faculty", label: "อาจารย์" },
              { value: "other", label: "อื่น ๆ" },
            ]}
            onChange={(e) =>
              onChange({
                ...d,
                work: {
                  position_type: e.target
                    .value as SatisfactionDraft["work"]["position_type"],
                },
              })
            }
            error={errors["work.position_type"]}
          />
          {d.work.position_type === "other" && (
            <FormSelect
              name="work.other_context"
              label="บริบทของผู้ตอบอื่น ๆ"
              required
              placeholder="กรุณาเลือก"
              value={d.work.other_context || ""}
              options={[
                { value: "study", label: "นักศึกษา/ผู้เรียน" },
                { value: "work", label: "ผู้ปฏิบัติงาน" },
              ]}
              onChange={(e) =>
                work({
                  other_context: e.target.value as "study" | "work",
                  study_year: undefined,
                  program_code: undefined,
                })
              }
              error={errors["work.other_context"]}
            />
          )}
          <FormSelect
            name="work.program_code"
            label="หลักสูตร / แผนก / ฝ่าย"
            required
            placeholder="กรุณาเลือกหลักสูตร"
            value={d.work.program_code || ""}
            options={[
              ...PROGRAMS.map((p) => ({ value: p.code, label: p.label })),
              ...(!study
                ? [{ value: "not_applicable", label: "ไม่เกี่ยวข้อง" }]
                : []),
            ]}
            onChange={(e) => work({ program_code: e.target.value })}
            error={errors["work.program_code"]}
          />
          {study && (
            <FormSelect
              name="work.study_year"
              label="ชั้นปี"
              required
              placeholder="กรุณาเลือกชั้นปี"
              value={String(d.work.study_year || "")}
              options={STUDY_YEARS.map((y) => ({
                value: String(y),
                label: `ปี ${y}`,
              }))}
              onChange={(e) => work({ study_year: e.target.value })}
              error={errors["work.study_year"]}
            />
          )}
        </>
      )}
    </section>
  );
}
export function SatisfactionDurations({
  draft: d,
  onChange,
  errors,
}: {
  draft: SatisfactionDraft;
  onChange: (d: SatisfactionDraft) => void;
  errors: Record<string, string>;
}) {
  return (
    <section className="form-section-card flex flex-col gap-5 p-5">
      <h2 className="font-semibold">ระยะเวลาที่ใช้ในการประเมิน</h2>
      <p className="text-small">
        กรอกเวลาวิธีเดิมและ SafeCheck ด้วยตนเอง โดย 1 วัน = 24 ชั่วโมง
        ระบุทุกช่อง รวมทั้งช่องที่เป็น 0 เวลารวมแต่ละวิธีต้องมากกว่า 0
      </p>
      {(["traditional", "safecheck"] as const).map((method) => (
        <fieldset key={method} className="grid grid-cols-2 gap-3">
          <legend className="mb-3 font-semibold">
            {method === "traditional" ? "วิธีเดิม" : "SafeCheck"}
          </legend>
          {(["days", "hours", "minutes", "seconds"] as const).map((unit) => (
            <FormInput
              key={unit}
              name={`durations.${method}.${unit}`}
              label={
                {
                  days: "วัน",
                  hours: "ชั่วโมง",
                  minutes: "นาที",
                  seconds: "วินาที",
                }[unit]
              }
              type="number"
              min={0}
              max={unit === "days" ? 1000000 : unit === "hours" ? 23 : 59}
              step="1"
              required
              value={d.durations[method][unit]}
              onChange={(e) =>
                onChange({
                  ...d,
                  durations: {
                    ...d.durations,
                    [method]: {
                      ...d.durations[method],
                      [unit]: e.target.value,
                    },
                  },
                })
              }
              error={errors[`durations.${method}.${unit}`]}
            />
          ))}
          {errors[`durations.${method}`] && (
            <p role="alert" className="text-danger col-span-2">
              {errors[`durations.${method}`]}
            </p>
          )}
        </fieldset>
      ))}
    </section>
  );
}
