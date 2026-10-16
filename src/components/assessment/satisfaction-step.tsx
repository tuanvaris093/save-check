"use client";
import { focusFormError } from "@/lib/v3/form-errors";
import { useStepDraft } from "@/hooks/use-step-draft";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  satisfactionMeasurementSchema,
  type SatisfactionMeasurementFormValues,
} from "@/lib/satisfaction-schema";
import {
  getSatisfactionQuestions,
  SATISFACTION_OPTIONS,
} from "@/lib/satisfaction-data";
import { Button } from "@/components/ui";
import { FormTextarea } from "@/components/forms";
import { cn } from "@/lib/utils";
import * as React from "react";

interface SatisfactionStepProps {
  group: "environment" | "health";
  nextLabel?: string;
  defaultValues?: Partial<SatisfactionMeasurementFormValues>;
  onNext: (data: SatisfactionMeasurementFormValues) => void;
  onPrev: () => void;
}

export function SatisfactionStep({
  group,
  defaultValues,
  nextLabel = "ดูผลสรุป",
  onNext,
  onPrev,
}: SatisfactionStepProps) {
  const {
    register,
    clearErrors,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<SatisfactionMeasurementFormValues>({
    resolver: zodResolver(satisfactionMeasurementSchema),
    defaultValues: {
      ...defaultValues,
    },
    mode: "onChange",
    reValidateMode: "onChange",
  });

  useStepDraft(watch, "answers");
  return (
    <form
      onSubmit={handleSubmit(onNext, focusFormError)}
      className="animate-fade-in flex flex-col gap-6"
      noValidate
    >
      <div className="form-section-card p-5">
        <h3 className="text-card-title text-text-primary mb-2 font-semibold">
          แบบประเมินความพึงพอใจ
        </h3>
        <p className="text-caption text-text-secondary mb-6">
          โปรดเลือกคะแนนที่ตรงกับระดับความพึงพอใจของท่าน (5 = มากที่สุด, 1 =
          น้อยที่สุด)
        </p>

        <div className="flex flex-col gap-8">
          {getSatisfactionQuestions(group).map((category) => (
            <div key={category.key} className="flex flex-col gap-4">
              <h4 className="text-text-primary bg-muted rounded-md p-3 font-semibold">
                {category.label}
              </h4>
              <div className="flex flex-col gap-5">
                {category.questions.map((q) => {
                  const fieldName =
                    q.id as keyof SatisfactionMeasurementFormValues;
                  const errorMsg = errors[fieldName]?.message;
                  const ratingRegistration = register(fieldName);
                  return (
                    <div
                      key={q.id}
                      className={cn(
                        "flex flex-col gap-3 rounded-lg border p-4 transition-colors",
                        errorMsg
                          ? "border-danger bg-danger-soft/10"
                          : "border-border bg-background",
                      )}
                    >
                      <p className="text-body text-text-primary font-medium">
                        {q.id.slice(1)}. {q.text}{" "}
                        <span className="text-danger">*</span>
                      </p>

                      {/* Rating buttons 1-5 */}
                      <div
                        role="radiogroup"
                        aria-label={`ข้อ ${q.id.slice(1)} ${q.text}`}
                        aria-invalid={!!errorMsg}
                        className="mt-2 grid grid-cols-5 gap-2 sm:gap-4"
                      >
                        {SATISFACTION_OPTIONS.map((opt) => (
                          <label
                            key={opt.value}
                            className="group border-border bg-surface hover:bg-muted focus-within:ring-primary has-[:checked]:border-primary has-[:checked]:bg-primary-tint relative flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border p-2 transition-all focus-within:ring-2 sm:py-3"
                          >
                            <input
                              type="radio"
                              required
                              aria-describedby={
                                errorMsg ? `sat-error-${q.id}` : undefined
                              }
                              aria-label={`ข้อ ${q.id.slice(1)} คะแนน ${opt.value}`}
                              value={opt.value}
                              {...ratingRegistration}
                              onChange={(event) => {
                                void ratingRegistration.onChange(event);
                                clearErrors(fieldName);
                              }}
                              onClick={(event) => {
                                if (event.currentTarget.checked)
                                  clearErrors(fieldName);
                              }}
                              className="sr-only" // hidden but accessible
                            />
                            <span className="text-h2 text-text-secondary group-has-[:checked]:text-primary font-bold transition-colors">
                              {opt.shortLabel}
                            </span>
                            <span className="text-text-secondary hidden text-center text-[10px] leading-tight sm:block sm:text-xs">
                              {opt.label}
                            </span>
                          </label>
                        ))}
                      </div>

                      {errorMsg && (
                        <p
                          id={`sat-error-${q.id}`}
                          role="alert"
                          className="text-caption text-danger mt-1"
                        >
                          {errorMsg}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Suggestion box */}
        <div className="border-border mt-8 border-t pt-6">
          <FormTextarea
            label="ข้อเสนอแนะเพิ่มเติม (ถ้ามี)"
            placeholder="พิมพ์ข้อเสนอแนะของท่าน..."
            {...register("suggestion")}
            error={errors.suggestion?.message}
            rows={4}
          />
        </div>
      </div>

      <div className="mt-2 flex gap-3 pb-8">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onPrev}
        >
          ย้อนกลับ
        </Button>
        <Button type="submit" className="flex-1">
          {nextLabel}
        </Button>
      </div>
    </form>
  );
}
