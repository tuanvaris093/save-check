"use client";
import { useState } from "react";
import {
  HEALTH_SUPPLEMENT_SECTIONS,
  changeSupplementAnswer,
  healthSupplementInput,
  healthSupplementSchema,
  supplementQuestionVisible,
  toggleSupplementChoice,
} from "../../../shared/v3";
import type { HealthCategory, HealthDraft } from "@/lib/v3/health-form";
import { FormInput } from "@/components/forms";
import { Button } from "@/components/ui";
import { focusFormError } from "@/lib/v3/form-errors";

export function HealthSupplementStep({
  data,
  save,
  category,
  next,
  prev,
}: {
  data: HealthDraft;
  save: (data: HealthDraft) => void;
  category: HealthCategory;
  next: () => void;
  prev: () => void;
}) {
  const draft = data.supplement ?? { answers: {}, details: {} };
  const [errors, setErrors] = useState<Record<string, string>>({});
  const clear = (id: string) =>
    setErrors((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([key]) => !key.endsWith(`.${id}`)),
      ),
    );
  return (
    <form
      className="flex min-w-0 flex-col gap-5"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const parsed = healthSupplementSchema(category).safeParse(
          healthSupplementInput(category, draft),
        );
        if (!parsed.success) {
          const feedback = Object.fromEntries(
            parsed.error.issues.map((issue) => [
              `supplement.${issue.path.join(".")}`,
              issue.message,
            ]),
          );
          setErrors(feedback);
          focusFormError(
            Object.fromEntries(
              Object.entries(feedback).map(([key, message]) => [
                key,
                { message },
              ]),
            ),
          );
          return;
        }
        setErrors({});
        next();
      }}
    >
      <h2 className="text-section-title font-bold">
        ประวัติสุขภาพและข้อมูลประกอบเฉพาะด้าน
      </h2>
      <p className="text-small text-text-secondary">
        คำตอบในขั้นตอนนี้เป็นข้อมูลประกอบ ไม่รวมในคะแนนอาการทางสุขภาพ
      </p>
      {HEALTH_SUPPLEMENT_SECTIONS[category].map((section) => (
        <section
          key={section.title}
          className="form-section-card flex min-w-0 flex-col gap-6 p-5"
        >
          <h3 className="text-card-title font-semibold">{section.title}</h3>
          {section.questions
            .filter((q) => supplementQuestionVisible(q, draft))
            .map((q) => {
              const field = `supplement.answers.${q.id}`;
              const detailField = `supplement.details.${q.id}`;
              const value = draft.answers[q.id];
              const selected = value === undefined ? [] : [value].flat();
              return (
                <div
                  key={q.id}
                  data-supplement-question={q.id}
                  className="min-w-0"
                >
                  <fieldset
                    className="min-w-0"
                    aria-invalid={!!errors[field]}
                    aria-describedby={
                      errors[field] ? `${q.id}-error` : undefined
                    }
                  >
                    <legend className="text-body w-full font-medium break-words">
                      {q.text} <span className="text-danger">*</span>
                    </legend>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {q.options.map((option) => (
                        <label
                          key={option.value}
                          className="has-[:checked]:border-primary has-[:checked]:bg-primary-tint flex min-w-0 cursor-pointer items-start gap-3 rounded-xl border p-3"
                        >
                          <input
                            className="mt-1 shrink-0"
                            type={q.multiple ? "checkbox" : "radio"}
                            name={field}
                            value={option.value}
                            checked={selected.includes(option.value)}
                            onChange={() => {
                              clear(q.id);
                              save({
                                ...data,
                                supplement: changeSupplementAnswer(
                                  category,
                                  draft,
                                  q.id,
                                  q.multiple
                                    ? toggleSupplementChoice(
                                        q,
                                        selected,
                                        option.value,
                                      )
                                    : option.value,
                                ),
                              });
                            }}
                          />
                          <span className="min-w-0 break-words">
                            {option.label}
                          </span>
                        </label>
                      ))}
                    </div>
                    {errors[field] && (
                      <p
                        id={`${q.id}-error`}
                        role="alert"
                        className="text-danger mt-2"
                      >
                        {errors[field]}
                      </p>
                    )}
                  </fieldset>
                  {selected.includes("other") && (
                    <div className="mt-3">
                      <FormInput
                        name={detailField}
                        label={
                          q.options.find((o) => o.value === "other")?.label
                        }
                        required
                        maxLength={2000}
                        value={draft.details[q.id] ?? ""}
                        error={errors[detailField]}
                        onChange={(event) => {
                          clear(q.id);
                          save({
                            ...data,
                            supplement: {
                              ...draft,
                              details: {
                                ...draft.details,
                                [q.id]: event.target.value,
                              },
                            },
                          });
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
        </section>
      ))}
      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={prev}>
          ย้อนกลับ
        </Button>
        <Button type="submit">ถัดไป</Button>
      </div>
    </form>
  );
}
