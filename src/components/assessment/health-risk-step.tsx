"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { healthRiskMeasurementSchema, type HealthRiskMeasurementFormValues } from "@/lib/health-risk-schema";
import { HEALTH_RISK_QUESTIONS, HEALTH_RISK_OPTIONS } from "@/lib/health-risk-data";
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
    mode: "onTouched",
  });

  const questions = HEALTH_RISK_QUESTIONS[category as keyof typeof HEALTH_RISK_QUESTIONS] || [];

  return (
    <form onSubmit={handleSubmit(onNext)} className="flex flex-col gap-6 animate-fade-in" noValidate>
      <div className="rounded-card border border-border bg-surface p-5 shadow-sm">
        <h3 className="mb-2 text-card-title font-semibold text-text-primary">
          แบบประเมินความเสี่ยงสุขภาพ ({ASSESSMENT_CATEGORY_LABELS[category]})
        </h3>
        <p className="mb-6 text-caption text-text-secondary">
          โปรดเลือกคำตอบที่ตรงกับอาการของท่านมากที่สุดในแต่ละข้อ (บังคับตอบทุกข้อ)
        </p>

        <div className="flex flex-col gap-5">
          {questions.map((q, index) => {
            const fieldName = `q${index + 1}` as keyof HealthRiskMeasurementFormValues;
            const errorMsg = errors[fieldName]?.message;
            return (
              <div
                key={q.id}
                className={cn(
                  "flex flex-col gap-3 p-4 rounded-lg border transition-colors",
                  errorMsg ? "border-danger bg-danger-soft/10" : "border-border bg-background"
                )}
              >
                <p className="text-body font-medium text-text-primary">
                  {index + 1}. {q.text} <span className="text-danger">*</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {HEALTH_RISK_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className="relative flex cursor-pointer items-center gap-3 rounded-md border border-border bg-surface px-4 py-3 transition-all hover:bg-muted focus-within:ring-2 focus-within:ring-primary has-checked:border-primary has-[:checked]:bg-primary-tint"
                    >
                      <input
                        type="radio"
                        value={opt.value}
                        {...register(fieldName)}
                        className="h-4 w-4 text-primary focus:ring-primary border-border"
                      />
                      <span className="text-small font-medium text-text-primary">
                        {opt.label}
                      </span>
                    </label>
                  ))}
                </div>
                {errorMsg && <p className="text-caption text-danger mt-1">{errorMsg}</p>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-2 flex gap-3 pb-8">
        <Button type="button" variant="outline" className="flex-1" onClick={onPrev}>
          ย้อนกลับ
        </Button>
        <Button type="submit" className="flex-[2]" disabled={!isValid && Object.keys(errors).length > 0}>
          สรุปผลความเสี่ยง
        </Button>
      </div>
    </form>
  );
}
