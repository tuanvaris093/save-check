"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui";
import { AssessmentDraftData } from "@/lib/schemas";
import { calculateAverage, evaluateEnvironmentResult } from "@/lib/environment-schema";
import type { AssessmentCategory } from "@/types";
import { cn } from "@/lib/utils";

interface ReviewStepProps {
  category?: AssessmentCategory;
  draftData: AssessmentDraftData;
  isSubmitting: boolean;
  onSubmit: () => void;
  onPrev: () => void;
}

export function ReviewStep({
  category,
  draftData,
  isSubmitting,
  onSubmit,
  onPrev,
}: ReviewStepProps) {
  const profile = draftData.profile;
  const workInfo = draftData.workInfo;
  
  // Try to parse measured values if we are doing environment assessment
  const envData = draftData.answers as any; // Re-use answers object for environment form
  
  let evaluation = null;
  let average = 0;
  let unitLabel = category === "light" ? "Lux" : category === "noise" ? "dBA" : "°C";

  if (category && envData && envData.standard_value) {
    if (category === "noise") {
      if (envData.twa_8hr !== undefined && envData.twa_8hr !== null && envData.twa_8hr !== "") {
        average = Number(envData.twa_8hr);
        evaluation = evaluateEnvironmentResult(average, Number(envData.standard_value), category);
      }
    } else {
      const avg = calculateAverage(envData.measure_1, envData.measure_2, envData.measure_3);
      if (avg !== null) {
        average = avg;
        evaluation = evaluateEnvironmentResult(average, Number(envData.standard_value), category);
      }
    }
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="rounded-card border border-border bg-surface p-5 shadow-sm">
        <h3 className="mb-4 text-card-title font-semibold text-text-primary">
          ข้อมูลผู้ประเมินและพื้นที่
        </h3>
        
        {profile && workInfo ? (
          <div className="flex flex-col gap-2 text-small text-text-secondary">
            <div className="flex justify-between border-b border-border py-2">
              <span>ชื่อ-นามสกุล</span>
              <span className="font-medium text-text-primary">{profile.full_name}</span>
            </div>
            <div className="flex justify-between border-b border-border py-2">
              <span>แผนก/ฝ่าย</span>
              <span className="font-medium text-text-primary">{workInfo.department}</span>
            </div>
            <div className="flex justify-between py-2">
              <span>พื้นที่ปฏิบัติงาน</span>
              <span className="font-medium text-text-primary">{workInfo.work_area}</span>
            </div>
          </div>
        ) : (
          <p className="text-small text-danger">ข้อมูลไม่สมบูรณ์</p>
        )}
      </div>

      {evaluation && envData && (
        <div className="rounded-card border border-border bg-surface p-5 shadow-sm text-center">
          <div className="flex justify-center mb-3">
            {evaluation.isPass ? (
              <CheckCircle2 className="h-16 w-16 text-success animate-in zoom-in" />
            ) : (
              <XCircle className="h-16 w-16 text-danger animate-in zoom-in" />
            )}
          </div>
          
          <h3 className={cn(
            "text-section-title font-bold mb-4",
            evaluation.isPass ? "text-success" : "text-danger"
          )}>
            {evaluation.isPass ? "ผ่านเกณฑ์มาตรฐาน" : "ไม่ผ่านเกณฑ์มาตรฐาน"}
          </h3>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className={cn(
              "rounded-md p-3",
              evaluation.isPass ? "bg-success-soft/30" : "bg-danger-soft/30"
            )}>
              <p className="text-caption text-text-secondary mb-1">
                {category === "noise" ? "ระดับ TWA 8 ชม." : "ค่าที่วัดได้เฉลี่ย"}
              </p>
              <p className={cn("text-body font-bold", evaluation.isPass ? "text-success" : "text-danger")}>
                {average} {unitLabel}
              </p>
            </div>
            <div className={cn(
              "rounded-md p-3",
              evaluation.isPass ? "bg-success-soft/30" : "bg-danger-soft/30"
            )}>
              <p className="text-caption text-text-secondary mb-1">คะแนน</p>
              <p className={cn("text-body font-bold", evaluation.isPass ? "text-success" : "text-danger")}>
                {evaluation.score}%
              </p>
            </div>
          </div>

          <div className="text-left border-t border-border pt-4">
            <p className="text-small font-semibold text-text-primary mb-1">
              เกณฑ์มาตรฐาน
            </p>
            <p className="text-small text-text-secondary mb-4">
              {category === "light" ? "≥" : "≤"} {envData.standard_value} {unitLabel}
            </p>

            <p className="text-small font-semibold text-text-primary mb-1">
              คำแนะนำ
            </p>
            <p className="text-small text-text-secondary bg-muted p-3 rounded-md">
              {evaluation.message}
            </p>
          </div>
        </div>
      )}

      <div className="mt-2 flex gap-3 pb-8">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onPrev}
          disabled={isSubmitting}
        >
          แก้ไขข้อมูล
        </Button>
        <Button
          type="button"
          className="flex-[2]"
          onClick={onSubmit}
          isLoading={isSubmitting}
        >
          บันทึกผล
        </Button>
      </div>
    </div>
  );
}
