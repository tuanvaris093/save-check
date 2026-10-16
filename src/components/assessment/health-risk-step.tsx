"use client";
import { focusFormError } from "@/lib/v3/form-errors";
import { useStepDraft } from "@/hooks/use-step-draft";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  healthRiskMeasurementSchema,
  type HealthRiskMeasurementFormValues,
} from "@/lib/health-risk-schema";
import {
  HEALTH_RISK_QUESTIONS,
  HEALTH_RISK_OPTIONS,
} from "@/lib/health-risk-data";
import { Button } from "@/components/ui";
import type { AssessmentCategory } from "@/types";
import { ASSESSMENT_CATEGORY_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface HealthRiskStepProps {
  category: AssessmentCategory;
  defaultValues?: Partial<HealthRiskMeasurementFormValues>;
  onNext: (data: HealthRiskMeasurementFormValues) => void;
  onPrev: () => void;
}

export function HealthRiskStep({
  category,
  defaultValues,
  onNext,
  onPrev,
}: HealthRiskStepProps) {
  const {
    register,
    watch,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<HealthRiskMeasurementFormValues>({
    resolver: zodResolver(healthRiskMeasurementSchema),
    defaultValues: {
      q1: undefined,
      q2: undefined,
      q3: undefined,
      q4: undefined,
      q5: undefined,
      q6: undefined,
      q7: undefined,
      q8: undefined,
      q9: undefined,
      q10: undefined,
      ...defaultValues,
    } as any,
    mode: "onChange",
    reValidateMode: "onChange",
  });

  const questions =
    HEALTH_RISK_QUESTIONS[category as keyof typeof HEALTH_RISK_QUESTIONS] || [];

  useStepDraft(watch, "answers");
  return (
    <form
      onSubmit={handleSubmit(onNext, focusFormError)}
      className="animate-fade-in flex flex-col gap-6"
      noValidate
    >
      <div className="form-section-card p-5">
        <h3 className="text-card-title text-text-primary mb-2 font-semibold">
          แบบประเมินอาการทางสุขภาพ ({ASSESSMENT_CATEGORY_LABELS[category]})
        </h3>
        <p className="text-caption text-text-secondary mb-6">
          โปรดเลือกคำตอบที่ตรงกับอาการของท่านมากที่สุดในแต่ละข้อ
          (บังคับตอบทุกข้อ)
        </p>

        <div className="flex flex-col gap-5">
          {questions.map((q, index) => {
            const fieldName =
              `q${index + 1}` as keyof HealthRiskMeasurementFormValues;
            const errorMsg = errors[fieldName]?.message;
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
                  {index + 1}. {q.text} <span className="text-danger">*</span>
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {HEALTH_RISK_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className="border-border bg-surface hover:bg-muted has-[:focus-visible]:ring-primary has-[:checked]:border-primary has-[:checked]:bg-primary-tint relative flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3 transition-all active:scale-[0.98] has-[:checked]:shadow-sm has-[:focus-visible]:ring-2"
                    >
                      <input
                        type="radio"
                        value={opt.value}
                        {...register(fieldName)}
                        className="peer sr-only"
                      />
                      {/* Custom radio indicator */}
                      <div className="border-border bg-surface peer-checked:border-primary flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors">
                        <div className="bg-primary h-2.5 w-2.5 rounded-full opacity-0 transition-opacity peer-checked:opacity-100" />
                      </div>
                      <span className="text-small text-text-primary peer-checked:text-primary font-medium">
                        {opt.label}
                      </span>
                    </label>
                  ))}
                </div>
                {errorMsg && (
                  <p className="text-caption text-danger mt-1">{errorMsg}</p>
                )}
              </div>
            );
          })}
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
          สรุปผลอาการทางสุขภาพ
        </Button>
      </div>
    </form>
  );
}
