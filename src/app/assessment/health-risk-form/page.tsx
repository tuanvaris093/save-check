"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { AlertTriangle, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/layout";
import { ROUTES } from "@/lib/constants";
import { ASSESSMENT_CATEGORY_LABELS } from "@/lib/constants";
import { isValidCategory } from "@/lib/utils";
import type { AssessmentCategory } from "@/types";
import { createSubmission, updateSubmission } from "@/lib/api";
import { useAssessmentForm } from "@/hooks/use-assessment";
import { LoadingState, SubmitLoadingOverlay } from "@/components/ui";
import {
  StepProgress,
  ProfileStep,
  WorkInfoStep,
  ReviewStep,
} from "@/components/assessment";
import { HealthRiskStep } from "@/components/assessment/health-risk-step";
import {
  calculateHealthRiskScore,
  evaluateHealthRiskResult,
} from "@/lib/health-risk-schema";

const TOTAL_STEPS = 4; // 1: Profile, 2: Work Info, 3: Questions, 4: Review

function HealthRiskFormContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const categoryParam = searchParams.get("category");
  const editCode = searchParams.get("edit");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Use the form wizard hook
  const {
    currentStep,
    totalSteps,
    isLoaded,
    draftData,
    loadError,
    nextStep,
    prevStep,
    saveDraft,
    clearDraft,
  } = useAssessmentForm({
    type: "health_risk",
    category: categoryParam as AssessmentCategory,
    totalSteps: TOTAL_STEPS,
    editCode,
  });

  // Validate category query string
  if (!isValidCategory(categoryParam) || categoryParam === "general") {
    return (
      <div className="flex min-h-dvh flex-col">
        <PageHeader
          title="ไม่พบหัวข้อที่เลือก"
          showBack
          backHref={ROUTES.HEALTH_RISK}
        />
        <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
          <div className="text-center">
            <div
              className="icon-container mx-auto mb-4"
              style={{
                background:
                  "linear-gradient(135deg, rgba(254, 243, 199, 0.95), rgba(255, 251, 235, 0.8))",
              }}
            >
              <AlertTriangle className="text-warning h-7 w-7" strokeWidth={2} />
            </div>
            <h2 className="text-section-title text-text-primary font-semibold">
              ไม่พบหัวข้อที่เลือก
            </h2>
            <p className="text-small text-text-secondary mt-2">
              กรุณาเลือกหัวข้อจากหน้าประเมินความเสี่ยงสุขภาพ
            </p>
            <a
              href={ROUTES.HEALTH_RISK}
              className="btn-primary-gradient text-small mt-6 inline-block px-6 py-3 font-semibold"
            >
              กลับไปเลือกหัวข้อ
            </a>
          </div>
        </main>
      </div>
    );
  }

  const category = categoryParam as Exclude<AssessmentCategory, "general">;

  // Show loading until draft is restored from localStorage
  if (!isLoaded) {
    return (
      <div className="flex min-h-dvh flex-col">
        <PageHeader
          title={`ความเสี่ยงสุขภาพ — ${ASSESSMENT_CATEGORY_LABELS[category]}`}
          showBack
          backHref={ROUTES.HEALTH_RISK}
        />
        <LoadingState text="กำลังเตรียมแบบประเมิน..." />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-dvh flex-col">
        <PageHeader title="ไม่พบข้อมูลที่ต้องการแก้ไข" showBack />
        <main className="text-danger flex flex-1 items-center justify-center px-4 text-center">
          {loadError}
        </main>
      </div>
    );
  }

  const handleProfileNext = (data: any) => {
    saveDraft({ profile: data });
    nextStep();
  };

  const handleWorkInfoNext = (data: any) => {
    saveDraft({ workInfo: data });
    nextStep();
  };

  const handleHealthRiskNext = (data: any) => {
    saveDraft({ answers: data });
    nextStep();
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
    const randPart = Math.floor(1000 + Math.random() * 9000);
    const submissionCode = editCode || `SUB-${datePart}-${randPart}`;
    const original = draftData.editingSubmission;

    let score = 0;
    let level: any = "pass";
    if (draftData.answers) {
      score = calculateHealthRiskScore(draftData.answers as any);
      const evalResult = evaluateHealthRiskResult(score, category);
      level = evalResult.level === "high" ? "high_risk" : evalResult.level;
    }

    const newSubmission = {
      id: original?.id || Date.now(),
      submission_code: submissionCode,
      assessment_type: "health_risk",
      assessment_category: category,
      started_at:
        original?.started_at ||
        draftData.lastSavedAt ||
        new Date().toISOString(),
      completed_at: new Date().toISOString(),
      status: "completed",
      overall_score: score,
      overall_level: level,
      profile: draftData.profile,
      workInfo: draftData.workInfo,
      answers: draftData.answers,
      created_at: original?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      // 1. Send to Cloudflare Workers Backend API
      const response = editCode
        ? await updateSubmission(editCode, newSubmission)
        : await createSubmission(newSubmission);
      if (!response.success && response.error.code !== "NETWORK_ERROR") {
        throw new Error(response.error.message);
      }
    } catch (apiErr: any) {
      if (editCode) {
        setSubmitError(
          apiErr?.message || "บันทึกการแก้ไขไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
        );
        setIsSubmitting(false);
        return;
      }
      console.warn(
        "Backend API unavailable, continuing with local storage",
        apiErr,
      );
    }

    try {
      // 2. Persist to localStorage for offline cache
      const stored = localStorage.getItem("save_check_submissions");
      const list = stored ? JSON.parse(stored) : [];
      const remaining = editCode
        ? list.filter((item: any) => item.submission_code !== editCode)
        : list;
      localStorage.setItem(
        "save_check_submissions",
        JSON.stringify([newSubmission, ...remaining]),
      );
      sessionStorage.removeItem(`save_check_edit_source_${submissionCode}`);
      clearDraft();
    } catch (err) {
      console.error(
        "Failed to save health risk submission to localStorage",
        err,
      );
    }

    const resultHref = `${ROUTES.RESULT}?submissionId=${submissionCode}`;
    if (editCode) {
      router.replace(resultHref);
    } else {
      router.push(resultHref);
    }
  };

  return (
    <div className="app-mobile-shell pb-safe-nav mx-auto flex min-h-dvh w-full max-w-[800px] flex-col md:px-8 md:py-6">
      <PageHeader
        title={`ความเสี่ยงสุขภาพ — ${ASSESSMENT_CATEGORY_LABELS[category]}`}
        subtitle={
          editCode ? `แก้ไขรหัสเอกสาร: ${editCode}` : "ตอบคำถามตามขั้นตอน"
        }
        showBack
        replaceBack={!!editCode}
        backHref={
          editCode
            ? `${ROUTES.RESULT}?submissionId=${encodeURIComponent(editCode)}`
            : ROUTES.HEALTH_RISK
        }
        className="border-none md:border-none md:bg-transparent md:px-0 md:backdrop-blur-none"
      />

      <main className="md:glass-card flex-1 px-4 py-2 md:mt-4 md:mb-10 md:px-8 md:py-6">
        <StepProgress
          currentStep={currentStep}
          totalSteps={totalSteps}
          className="md:pt-0"
        />

        {submitError && (
          <div className="text-small animate-fade-in mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-red-700">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
            <span>{submitError}</span>
          </div>
        )}

        <div className="mt-4 pb-8">
          {currentStep === 1 && (
            <ProfileStep
              defaultValues={draftData.profile}
              onNext={handleProfileNext}
            />
          )}

          {currentStep === 2 && (
            <WorkInfoStep
              defaultValues={draftData.workInfo}
              onNext={handleWorkInfoNext}
              onPrev={prevStep}
            />
          )}

          {currentStep === 3 && (
            <HealthRiskStep
              category={category}
              defaultValues={draftData.answers as any}
              onNext={handleHealthRiskNext}
              onPrev={prevStep}
            />
          )}

          {currentStep === 4 && (
            <ReviewStep
              type="health_risk"
              category={category}
              draftData={draftData}
              isSubmitting={isSubmitting}
              onSubmit={handleSubmit}
              onPrev={prevStep}
            />
          )}
        </div>
      </main>

      {/* Fullscreen Loading Overlay during submission */}
      <SubmitLoadingOverlay
        isOpen={isSubmitting}
        text={
          editCode
            ? "กำลังบันทึกการแก้ไข..."
            : "กำลังบันทึกข้อมูลผลการประเมิน..."
        }
      />
    </div>
  );
}

export default function HealthRiskFormPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <p className="text-text-secondary">กำลังโหลด...</p>
        </div>
      }
    >
      <HealthRiskFormContent />
    </Suspense>
  );
}
