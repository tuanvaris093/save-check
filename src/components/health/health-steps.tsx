"use client";
import { useState } from "react";
import { errorsAfterFieldChange } from "@/lib/v3/field-error-change";
import { z, questionSnapshots, HEALTH_QUESTIONS } from "../../../shared/v3";
import {
  healthFormSchemas,
  profileInput,
  workInput,
  contextInput,
  isStudy,
  PROGRAMS,
  type HealthDraft,
  type HealthCategory,
} from "@/lib/v3/health-form";
import { FormInput, FormSelect, ExplicitChoiceGroup } from "@/components/forms";
import { Button } from "@/components/ui";
import {
  GENDER_OPTIONS,
  EDUCATION_LEVEL_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  POSITION_TYPE_OPTIONS,
} from "@/lib/constants";
import { focusFormError } from "@/lib/v3/form-errors";
const sourceOptions = [
  ["announcement", "เสียงประกาศตามสาย/ลำโพง"],
  ["college_activity", "เสียงกิจกรรมหรือการจัดงานของวิทยาลัย"],
  ["air_conditioner", "เสียงเครื่องปรับอากาศ/พัดลม"],
  ["laboratory", "เสียงเครื่องมือหรืออุปกรณ์ในห้องปฏิบัติการ"],
  ["machine", "เสียงเครื่องจักร เช่น เครื่องซักผ้า เครื่องถ่ายเอกสาร"],
  ["traffic", "เสียงจราจร ยานพาหนะ เช่น รถยนต์/รถจักรยานยนต์"],
  ["construction", "เสียงก่อสร้างหรือซ่อมแซมอาคาร"],
  ["other", "เสียงอื่น ๆ โปรดระบุ"],
  ["none", "ไม่ได้สัมผัสเสียงดังจากแหล่งข้างต้น"],
].map(([value, label]) => ({ value, label }));
export const NOISE_SOURCE_LABELS = Object.fromEntries(
  sourceOptions.map((v) => [v.value, v.label]),
);
function useValidation() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  return {
    errors,
    clearFieldError: (event: React.FormEvent<HTMLElement>) =>
      setErrors((current) => errorsAfterFieldChange(current, event)),
    validate: (schema: z.ZodTypeAny, input: unknown) => {
      const parsed = schema.safeParse(input);
      if (parsed.success) {
        setErrors({});
        return true;
      }
      const messages: Record<string, string> = {},
        focus: Record<string, unknown> = {};
      for (const issue of parsed.error.issues) {
        const name = String(issue.path[0] ?? "form");
        messages[name] = "กรุณาระบุข้อมูลให้ครบและถูกต้อง";
        focus[name] = { message: messages[name] };
      }
      setErrors(messages);
      focusFormError(focus);
      return false;
    },
  };
}
type Props = {
  data: HealthDraft;
  save: (data: HealthDraft) => void;
  next: () => void;
  prev?: () => void;
};
export function HealthProfileStep({ data, save, next }: Props) {
  const { errors, validate, clearFieldError } = useValidation(),
    p = data.profile;
  const change = (key: string, value: string | boolean) =>
    save({
      ...data,
      profile: {
        ...p,
        [key]: value,
        ...(key === "has_underlying_disease" && !value
          ? { underlying_disease_details: "" }
          : {}),
      },
    });
  return (
    <form
      onChangeCapture={clearFieldError}
      onClickCapture={(event) => {
        if ((event.target as HTMLElement).closest("button[aria-pressed]"))
          clearFieldError(event);
      }}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (validate(healthFormSchemas.profile, profileInput(data))) next();
      }}
      className="flex flex-col gap-5"
    >
      <section className="form-section-card flex flex-col gap-5 p-5">
        <h2 className="text-card-title font-semibold">ข้อมูลส่วนตัว</h2>
        <FormInput
          name="full_name"
          label="ชื่อ-นามสกุล"
          required
          value={String(p.full_name ?? "")}
          onChange={(e) => change("full_name", e.target.value)}
          error={errors.full_name}
        />
        <FormSelect
          name="gender"
          label="เพศ"
          required
          placeholder="เลือกเพศ"
          options={[...GENDER_OPTIONS]}
          value={String(p.gender ?? "")}
          onChange={(e) => change("gender", e.target.value)}
          error={errors.gender}
        />
        {[
          ["age", "อายุ (ปี)"],
          ["weight", "น้ำหนัก (กก.)"],
          ["height", "ส่วนสูง (ซม.)"],
        ].map(([key, label]) => (
          <FormInput
            key={key}
            name={key}
            label={label}
            type="number"
            step={key === "age" ? "1" : "any"}
            required
            value={String(p[key] ?? "")}
            onChange={(e) => change(key, e.target.value)}
            error={errors[key]}
          />
        ))}
        <FormSelect
          name="education_level"
          label="ระดับการศึกษา"
          required
          placeholder="เลือกระดับการศึกษา"
          options={[...EDUCATION_LEVEL_OPTIONS]}
          value={String(p.education_level ?? "")}
          onChange={(e) => change("education_level", e.target.value)}
          error={errors.education_level}
        />
        <FormSelect
          name="marital_status"
          label="สถานภาพ"
          required
          placeholder="เลือกสถานภาพ"
          options={[...MARITAL_STATUS_OPTIONS]}
          value={String(p.marital_status ?? "")}
          onChange={(e) => change("marital_status", e.target.value)}
          error={errors.marital_status}
        />
      </section>
      <section className="form-section-card flex flex-col gap-5 p-5">
        <h2 className="text-card-title font-semibold">ข้อมูลสุขภาพ</h2>
        <FormSelect
          name="has_underlying_disease"
          label="ท่านมีโรคประจำตัวหรือไม่"
          required
          placeholder="เลือกคำตอบ"
          options={[
            { value: "false", label: "ไม่มี" },
            { value: "true", label: "มี" },
          ]}
          value={
            typeof p.has_underlying_disease === "boolean"
              ? String(p.has_underlying_disease)
              : ""
          }
          onChange={(e) =>
            change("has_underlying_disease", e.target.value === "true")
          }
          error={errors.has_underlying_disease}
        />
        {p.has_underlying_disease === true && (
          <FormInput
            name="underlying_disease_details"
            label="ระบุโรคประจำตัว"
            required
            value={String(p.underlying_disease_details ?? "")}
            onChange={(e) =>
              change("underlying_disease_details", e.target.value)
            }
            error={errors.underlying_disease_details}
          />
        )}
      </section>
      <Button type="submit">ถัดไป</Button>
    </form>
  );
}
export function HealthWorkStep({
  data,
  save,
  next,
  prev,
  category,
}: Props & { category: HealthCategory }) {
  const { errors, validate, clearFieldError } = useValidation(),
    w = data.work,
    study = isStudy(data);
  const change = (key: string, value: string) =>
    save({ ...data, work: { ...w, [key]: value } });
  return (
    <form
      onChangeCapture={clearFieldError}
      onClickCapture={(event) => {
        if ((event.target as HTMLElement).closest("button[aria-pressed]"))
          clearFieldError(event);
      }}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (!validate(healthFormSchemas.work, workInput(data))) return;
        if (
          category === "light" &&
          !validate(
            z.object({
              hours_worked_today: z.number().finite().min(0).max(24),
            }),
            contextInput(data, category),
          )
        )
          return;
        next();
      }}
      className="flex flex-col gap-5"
    >
      <section className="form-section-card flex flex-col gap-5 p-5">
        <h2 className="text-section-title font-semibold">
          ข้อมูลการปฏิบัติงาน / การเรียน
        </h2>
        <FormSelect
          name="position_type"
          label="ประเภทผู้ตอบ"
          required
          placeholder="เลือกประเภทผู้ตอบ"
          options={[...POSITION_TYPE_OPTIONS]}
          value={String(w.position_type ?? "")}
          onChange={(e) => change("position_type", e.target.value)}
          error={errors.position_type}
        />
        {w.position_type === "other" && (
          <FormSelect
            name="other_context"
            label="บริบทของผู้ตอบ"
            required
            placeholder="เลือกบริบท"
            options={[
              { value: "study", label: "การเรียน" },
              { value: "work", label: "การทำงาน" },
            ]}
            value={String(w.other_context ?? "")}
            onChange={(e) => change("other_context", e.target.value)}
            error={errors.other_context}
          />
        )}
        <FormSelect
          name="program_code"
          label="หลักสูตร / แผนก / ฝ่าย"
          required
          placeholder="เลือกหลักสูตร"
          options={[
            ...PROGRAMS.map((p) => ({ value: p.code, label: p.label })),
            ...(!study
              ? [{ value: "not_applicable", label: "ไม่เกี่ยวข้อง" }]
              : []),
          ]}
          value={String(w.program_code ?? "")}
          onChange={(e) => change("program_code", e.target.value)}
          error={errors.program_code}
        />
        {study ? (
          <FormSelect
            name="study_year"
            label="ชั้นปี"
            required
            placeholder="เลือกชั้นปี"
            options={[1, 2, 3, 4, 5, 6].map((n) => ({
              value: String(n),
              label: String(n),
            }))}
            value={String(w.study_year ?? "")}
            onChange={(e) => change("study_year", e.target.value)}
            error={errors.study_year}
          />
        ) : (
          <FormInput
            name="work_experience_years"
            label="อายุงาน (ปี)"
            required
            type="number"
            step="any"
            value={String(w.work_experience_years ?? "")}
            onChange={(e) => change("work_experience_years", e.target.value)}
            error={errors.work_experience_years}
          />
        )}
        <FormInput
          name="working_hours_per_day"
          label="ระยะเวลาปฏิบัติงาน / เรียนเฉลี่ย (ชั่วโมง/วัน)"
          required
          type="number"
          step="any"
          value={String(w.working_hours_per_day ?? "")}
          onChange={(e) => change("working_hours_per_day", e.target.value)}
          error={errors.working_hours_per_day}
        />
        <FormInput
          name="working_hours_per_week"
          label="ระยะเวลาปฏิบัติงาน / เรียนเฉลี่ย (ชั่วโมง/สัปดาห์)"
          required
          type="number"
          step="any"
          value={String(w.working_hours_per_week ?? "")}
          onChange={(e) => change("working_hours_per_week", e.target.value)}
          error={errors.working_hours_per_week}
        />
        {category === "light" && (
          <>
            <FormInput
              name="hours_worked_today"
              label="ระยะเวลาปฏิบัติงาน / เรียนวันนี้ (ชั่วโมง)"
              required
              type="number"
              step="any"
              value={String(data.context.hours_worked_today ?? "")}
              onChange={(e) =>
                save({
                  ...data,
                  context: {
                    ...data.context,
                    hours_worked_today: e.target.value,
                  },
                })
              }
              error={errors.hours_worked_today}
            />
            <p className="text-small text-text-secondary">
              ระยะเวลาวันนี้เป็นข้อมูลประกอบ ไม่รวมในคะแนนอาการ
            </p>
          </>
        )}
      </section>
      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={prev}>
          ย้อนกลับ
        </Button>
        <Button type="submit">ถัดไป</Button>
      </div>
    </form>
  );
}
export function HealthQuestionsStep({
  data,
  save,
  next,
  prev,
  category,
  tab,
  setTab,
  busy = false,
}: Props & {
  category: HealthCategory;
  tab: "before" | "after" | "single";
  setTab: (tab: "before" | "after" | "single") => void;
  busy?: boolean;
}) {
  const { errors, validate, clearFieldError } = useValidation(),
    phase =
      category === "light" ? (tab === "after" ? "after" : "before") : "single",
    answers = data[phase];
  const validContext = () =>
    category === "heat" ||
    validate(
      category === "noise"
        ? healthFormSchemas.noise
        : z.object({ hours_worked_today: z.number().finite().min(0).max(24) }),
      contextInput(data, category),
    );
  const before = () =>
    validate(healthFormSchemas.answers, data.before) && validContext();
  const afterTab = () => {
    if (before()) setTab("after");
  };
  return (
    <form
      onChangeCapture={clearFieldError}
      onClickCapture={(event) => {
        if ((event.target as HTMLElement).closest("button[aria-pressed]"))
          clearFieldError(event);
      }}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (!validContext()) return;
        if (!validate(healthFormSchemas.answers, answers)) return;
        if (category === "light" && phase === "before") {
          setTab("after");
          return;
        }
        if (category === "light" && !before()) {
          setTab("before");
          return;
        }
        next();
      }}
      className="flex flex-col gap-6"
    >
      <h2 className="text-section-title font-bold">
        ประเมินอาการทางสุขภาพด้าน
        {category === "light"
          ? "แสงสว่าง"
          : category === "noise"
            ? "เสียง"
            : "ความร้อน"}
      </h2>
      {category === "light" && (
        <>
          <div
            role="tablist"
            aria-label="ช่วงเวลาประเมิน"
            className="flex min-w-0 gap-3"
          >
            <button
              type="button"
              role="tab"
              id="health-tab-before"
              aria-selected={phase === "before"}
              aria-controls="health-questions"
              className={`text-small focus-visible:outline-primary min-h-10 min-w-0 flex-1 rounded-2xl border px-3 py-2 font-semibold break-words transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${phase === "before" ? "border-blue-700 bg-blue-700 text-white shadow-md" : "border-border text-text-primary bg-white shadow-sm"}`}
              onClick={() => setTab("before")}
            >
              ก่อนปฏิบัติงาน / เรียน
            </button>
            <button
              type="button"
              role="tab"
              id="health-tab-after"
              aria-selected={phase === "after"}
              aria-controls="health-questions"
              className={`text-small focus-visible:outline-primary min-h-10 min-w-0 flex-1 rounded-2xl border px-3 py-2 font-semibold break-words transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${phase === "after" ? "border-blue-700 bg-blue-700 text-white shadow-md" : "border-border text-text-primary bg-white shadow-sm"}`}
              onClick={afterTab}
            >
              หลังปฏิบัติงาน / เรียน
            </button>
          </div>
          <p role="status">
            {phase === "before" ? "ก่อน" : "หลัง"}: ตอบแล้ว{" "}
            {Object.keys(answers).length}/10 ข้อ
          </p>
        </>
      )}
      {category === "noise" && (
        <section aria-label="แหล่งเสียง" className="form-section-card p-4">
          <div tabIndex={-1} data-field-name="noise_sources">
            <ExplicitChoiceGroup
              label="แหล่งเสียงที่สัมผัส (เลือกได้หลายข้อ)"
              required
              options={sourceOptions}
              value={data.context.noise_sources ?? []}
              onChange={(values) =>
                save({
                  ...data,
                  context: {
                    ...data.context,
                    noise_sources: values,
                    noise_source_other: values.includes("other")
                      ? data.context.noise_source_other
                      : "",
                  },
                })
              }
              error={errors.noise_sources}
            />
          </div>
          {data.context.noise_sources?.includes("other") && (
            <FormInput
              name="noise_source_other"
              label="ระบุแหล่งเสียงอื่น ๆ"
              required
              value={data.context.noise_source_other ?? ""}
              onChange={(e) =>
                save({
                  ...data,
                  context: {
                    ...data.context,
                    noise_source_other: e.target.value,
                  },
                })
              }
              error={errors.noise_source_other}
            />
          )}
          <p className="text-small text-text-secondary mt-3">
            แหล่งเสียงเป็นข้อมูลประกอบ ไม่รวมคะแนนอาการ
          </p>
        </section>
      )}
      <div
        id="health-questions"
        role={category === "light" ? "tabpanel" : undefined}
        aria-labelledby={
          category === "light" ? `health-tab-${phase}` : undefined
        }
        className="flex min-w-0 flex-col gap-5"
      >
        {questionSnapshots(category, phase).map((q, i) => (
          <div
            key={q.question_id}
            className="form-section-card min-w-0 p-4"
            data-health-question
          >
            <fieldset
              className="m-0 min-w-0 border-0 p-0"
              aria-invalid={!!errors[q.question_id]}
            >
              <legend className="text-body w-full min-w-0 font-medium break-words">
                {i + 1}. {q.text} <span className="text-danger">*</span>
              </legend>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {HEALTH_QUESTIONS.options.map((option) => (
                  <label
                    key={option.score}
                    className="has-[:checked]:border-primary has-[:checked]:bg-primary-tint flex cursor-pointer items-center gap-2 rounded-xl border p-3"
                  >
                    <input
                      name={q.question_id}
                      type="radio"
                      required
                      checked={answers[q.question_id] === option.score}
                      onChange={() =>
                        save({
                          ...data,
                          [phase]: {
                            ...answers,
                            [q.question_id]: option.score,
                          },
                        })
                      }
                    />
                    {option.label}
                  </label>
                ))}
              </div>
              {errors[q.question_id] && (
                <p role="alert" className="text-danger mt-2">
                  กรุณาตอบข้อนี้
                </p>
              )}
            </fieldset>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:mr-auto sm:w-auto"
            onClick={prev}
            disabled={busy}
          >
            ย้อนกลับ
          </Button>
          <Button
            type="submit"
            className="h-auto min-h-10 w-full min-w-0 whitespace-normal sm:w-auto"
            disabled={busy}
          >
            {category === "light" && phase === "before"
              ? "ประเมินหลังปฏิบัติงาน/เรียน"
              : "ดูผลสรุป"}
          </Button>
        </div>
      </div>
    </form>
  );
}
