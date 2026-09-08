"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { satisfactionMeasurementSchema, type SatisfactionMeasurementFormValues } from "@/lib/satisfaction-schema";
import { SATISFACTION_QUESTIONS, SATISFACTION_OPTIONS } from "@/lib/satisfaction-data";
import { Button } from "@/components/ui";
import { FormTextarea } from "@/components/forms";
import { cn } from "@/lib/utils";
import * as React from "react";

interface SatisfactionStepProps {
  defaultValues?: Partial<SatisfactionMeasurementFormValues>;
  onNext: (data: SatisfactionMeasurementFormValues) => void;
  onPrev: () => void;
}

export function SatisfactionStep({
  defaultValues,
  onNext,
  onPrev,
}: SatisfactionStepProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<SatisfactionMeasurementFormValues>({
    resolver: zodResolver(satisfactionMeasurementSchema),
    defaultValues: {
      ...defaultValues,
    },
    mode: "onTouched",
  });

  return (
    <form onSubmit={handleSubmit(onNext)} className="flex flex-col gap-6 animate-fade-in" noValidate>
      <div className="form-section-card p-5">
        <h3 className="mb-2 text-card-title font-semibold text-text-primary">
          แบบประเมินความพึงพอใจ
        </h3>
        <p className="mb-6 text-caption text-text-secondary">
          โปรดเลือกคะแนนที่ตรงกับระดับความพึงพอใจของท่าน (5 = มากที่สุด, 1 = น้อยที่สุด)
        </p>

        <div className="flex flex-col gap-8">
          {SATISFACTION_QUESTIONS.map((category) => (
            <div key={category.key} className="flex flex-col gap-4">
              <h4 className="font-semibold text-text-primary bg-muted p-3 rounded-md">
                {category.label}
              </h4>
              <div className="flex flex-col gap-5">
                {category.questions.map((q, index) => {
                  const fieldName = q.id as keyof SatisfactionMeasurementFormValues;
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
                      
                      {/* Rating buttons 1-5 */}
                      <div className="grid grid-cols-5 gap-2 sm:gap-4 mt-2">
                        {SATISFACTION_OPTIONS.map((opt) => (
                          <label
                            key={opt.value}
                            className="group relative flex flex-col items-center justify-center cursor-pointer gap-1 rounded-md border border-border bg-surface p-2 sm:py-3 transition-all hover:bg-muted focus-within:ring-2 focus-within:ring-primary has-[:checked]:border-primary has-[:checked]:bg-primary-tint"
                          >
                            <input
                              type="radio"
                              value={opt.value}
                              {...register(fieldName)}
                              className="sr-only" // hidden but accessible
                            />
                            <span className="text-h2 font-bold text-text-secondary transition-colors group-has-[:checked]:text-primary">
                              {opt.shortLabel}
                            </span>
                            <span className="text-[10px] sm:text-xs text-center text-text-secondary leading-tight hidden sm:block">
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
          ))}
        </div>

        {/* Suggestion box */}
        <div className="mt-8 pt-6 border-t border-border">
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
        <Button type="button" variant="outline" className="flex-1" onClick={onPrev}>
          ย้อนกลับ
        </Button>
        <Button type="submit" className="flex-1" >
          ดูผลสรุป
        </Button>
      </div>
    </form>
  );
}
