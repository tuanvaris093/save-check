"use client";

import { CheckCircle2, XCircle, AlertTriangle, Star } from "lucide-react";
import { Button } from "@/components/ui";
import { AssessmentDraftData } from "@/lib/schemas";
import { calculateAverage, evaluateEnvironmentResult } from "@/lib/environment-schema";
import { calculateHealthRiskScore, evaluateHealthRiskResult } from "@/lib/health-risk-schema";
import { calculateSatisfactionResult } from "@/lib/satisfaction-schema";
import type { AssessmentCategory } from "@/types";
import { cn } from "@/lib/utils";

interface ReviewStepProps {
  type?: "environment" | "health_risk" | "satisfaction";
  category?: AssessmentCategory;
  draftData: AssessmentDraftData;
  isSubmitting: boolean;
  onSubmit: () => void;
  onPrev: () => void;
}

export function ReviewStep({
  type = "environment",
  category,
  draftData,
  isSubmitting,
  onSubmit,
  onPrev,
}: ReviewStepProps) {
  const profile = draftData.profile;
  const workInfo = draftData.workInfo;
  const answers = draftData.answers as any;
  
  // Environment Evaluation Variables
  let envEvaluation = null;
  let envAverage = 0;
  const unitLabel = category === "light" ? "Lux" : category === "noise" ? "dBA" : "°C";

  // Health Risk Evaluation Variables
  let hrEvaluation = null;
  
  // Satisfaction Evaluation Variables
  let satisfactionResult = null;

  if (answers) {
    if (type === "environment" && category && answers.standard_value) {
      if (category === "noise") {
        if (answers.twa_8hr !== undefined && answers.twa_8hr !== null && answers.twa_8hr !== "") {
          envAverage = Number(answers.twa_8hr);
          envEvaluation = evaluateEnvironmentResult(envAverage, Number(answers.standard_value), category);
        }
      } else {
        const avg = calculateAverage(answers.measure_1, answers.measure_2, answers.measure_3);
        if (avg !== null) {
          envAverage = avg;
          envEvaluation = evaluateEnvironmentResult(envAverage, Number(answers.standard_value), category);
        }
      }
    } else if (type === "health_risk" && answers.q1 !== undefined) {
      const score = calculateHealthRiskScore(answers);
      hrEvaluation = evaluateHealthRiskResult(score);
    } else if (type === "satisfaction" && answers.q1 !== undefined) {
      satisfactionResult = calculateSatisfactionResult(answers);
    }
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="rounded-card border border-white/40 bg-white/60 backdrop-blur-md p-5 shadow-sm">
        <h3 className="mb-4 text-card-title font-semibold text-text-primary">
          ข้อมูลผู้ประเมิน
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
            {type !== "satisfaction" && (
              <div className="flex justify-between py-2">
                <span>พื้นที่ปฏิบัติงาน</span>
                <span className="font-medium text-text-primary">{workInfo.work_area}</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-small text-danger">ข้อมูลไม่สมบูรณ์</p>
        )}
      </div>

      {/* Environment Assessment Result */}
      {type === "environment" && envEvaluation && answers && (
        <div className="rounded-card border border-white/40 bg-white/60 backdrop-blur-md p-5 shadow-sm text-center">
          <div className="flex justify-center mb-3">
            {envEvaluation.isPass ? (
              <CheckCircle2 className="h-16 w-16 text-success animate-in zoom-in" />
            ) : (
              <XCircle className="h-16 w-16 text-danger animate-in zoom-in" />
            )}
          </div>
          
          <h3 className={cn(
            "text-section-title font-bold mb-4",
            envEvaluation.isPass ? "text-success" : "text-danger"
          )}>
            {envEvaluation.isPass ? "ผ่านเกณฑ์มาตรฐาน" : "ไม่ผ่านเกณฑ์มาตรฐาน"}
          </h3>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className={cn(
              "rounded-md p-3",
              envEvaluation.isPass ? "bg-success-soft/30" : "bg-danger-soft/30"
            )}>
              <p className="text-caption text-text-secondary mb-1">
                {category === "noise" ? "ระดับ TWA 8 ชม." : "ค่าที่วัดได้เฉลี่ย"}
              </p>
              <p className={cn("text-body font-bold", envEvaluation.isPass ? "text-success" : "text-danger")}>
                {envAverage} {unitLabel}
              </p>
            </div>
            <div className={cn(
              "rounded-md p-3",
              envEvaluation.isPass ? "bg-success-soft/30" : "bg-danger-soft/30"
            )}>
              <p className="text-caption text-text-secondary mb-1">คะแนน</p>
              <p className={cn("text-body font-bold", envEvaluation.isPass ? "text-success" : "text-danger")}>
                {envEvaluation.score}%
              </p>
            </div>
          </div>

          <div className="text-left border-t border-border pt-4">
            <p className="text-small font-semibold text-text-primary mb-1">
              เกณฑ์มาตรฐาน
            </p>
            <p className="text-small text-text-secondary mb-4">
              {category === "light" ? "≥" : "≤"} {answers.standard_value} {unitLabel}
            </p>

            <p className="text-small font-semibold text-text-primary mb-1">
              คำแนะนำ
            </p>
            <p className="text-small text-text-secondary bg-muted p-3 rounded-md">
              {envEvaluation.message}
            </p>
          </div>
        </div>
      )}

      {/* Health Risk Assessment Result */}
      {type === "health_risk" && hrEvaluation && answers && (
        <div className="rounded-card border border-white/40 bg-white/60 backdrop-blur-md p-5 shadow-sm text-center">
          <div className="flex justify-center mb-3">
            {hrEvaluation.level === "pass" ? (
              <CheckCircle2 className="h-16 w-16 text-success animate-in zoom-in" />
            ) : hrEvaluation.level === "medium" ? (
              <AlertTriangle className="h-16 w-16 text-warning animate-in zoom-in" />
            ) : (
              <XCircle className="h-16 w-16 text-danger animate-in zoom-in" />
            )}
          </div>
          
          <h3 className={cn(
            "text-section-title font-bold mb-4",
            `text-${hrEvaluation.colorClass}`
          )}>
            {hrEvaluation.levelLabel}
          </h3>

          <div className="flex justify-center mb-4">
            <div className={cn(
              "rounded-md p-4 w-full max-w-xs",
              `bg-${hrEvaluation.colorClass}-soft/20`
            )}>
              <p className="text-caption text-text-secondary mb-1">
                คะแนนความเสี่ยงรวม (จาก 20 คะแนน)
              </p>
              <p className={cn("text-h1 font-bold", `text-${hrEvaluation.colorClass}`)}>
                {hrEvaluation.score}
              </p>
            </div>
          </div>

          <div className="text-left border-t border-border pt-4">
            <p className="text-small font-semibold text-text-primary mb-1">
              คำแนะนำเบื้องต้น
            </p>
            <p className="text-small text-text-secondary bg-muted p-4 rounded-md leading-relaxed">
              {hrEvaluation.message}
            </p>
          </div>
        </div>
      )}

      {/* Satisfaction Assessment Result */}
      {type === "satisfaction" && satisfactionResult && (
        <div className="rounded-card border border-white/40 bg-white/60 backdrop-blur-md p-5 shadow-sm text-center">
          <div className="flex justify-center mb-3">
            <Star className="h-16 w-16 text-warning fill-warning animate-in zoom-in" />
          </div>
          
          <h3 className="text-section-title font-bold mb-4 text-text-primary">
            สรุปผลความพึงพอใจ
          </h3>

          <div className="flex justify-center mb-6">
            <div className="rounded-md p-4 w-full max-w-xs bg-primary-tint border border-primary/20">
              <p className="text-caption text-primary-deep mb-1">
                คะแนนเฉลี่ยรวม (เต็ม 5)
              </p>
              <p className="text-h1 font-bold text-primary">
                {satisfactionResult.overallAvg.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="text-left border-t border-border pt-4">
            <p className="text-body font-semibold text-text-primary mb-3">
              คะแนนเฉลี่ยรายด้าน
            </p>
            
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center text-small">
                <span className="text-text-secondary">ด้านเนื้อหา (Accuracy)</span>
                <span className="font-bold text-text-primary">{satisfactionResult.accuracyAvg.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-small">
                <span className="text-text-secondary">ด้านการออกแบบ (Design)</span>
                <span className="font-bold text-text-primary">{satisfactionResult.designAvg.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-small">
                <span className="text-text-secondary">ด้านการใช้งาน (Usability)</span>
                <span className="font-bold text-text-primary">{satisfactionResult.usabilityAvg.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-small">
                <span className="text-text-secondary">ด้านประโยชน์ (Usefulness)</span>
                <span className="font-bold text-text-primary">{satisfactionResult.usefulnessAvg.toFixed(2)}</span>
              </div>
            </div>

            {satisfactionResult.suggestion && (
              <div className="mt-6">
                <p className="text-small font-semibold text-text-primary mb-2">
                  ข้อเสนอแนะ
                </p>
                <p className="text-small text-text-secondary bg-muted p-3 rounded-md italic">
                  &ldquo;{satisfactionResult.suggestion}&rdquo;
                </p>
              </div>
            )}
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
