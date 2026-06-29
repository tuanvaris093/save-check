"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { PageHeader } from "@/components/layout";
import { ROUTES } from "@/lib/constants";
import {
  ASSESSMENT_CATEGORY_LABELS,
} from "@/lib/constants";
import { isValidCategory } from "@/lib/utils";
import type { AssessmentCategory } from "@/types";
import { useAssessmentForm } from "@/hooks/use-assessment";
import { LoadingState } from "@/components/ui";
import {
  StepProgress,
  ProfileStep,
  WorkInfoStep,
  ReviewStep,
} from "@/components/assessment";

const TOTAL_STEPS = 4; // 1: Profile, 2: Work Info, 3: Questions, 4: Review

function HealthRiskFormContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const categoryParam = searchParams.get("category");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Use the form wizard hook
  const {
    currentStep,
    totalSteps,
    isLoaded,
    draftData,
    nextStep,
    prevStep,
    saveDraft,
    clearDraft,
  } = useAssessmentForm({
    type: "health_risk",
    category: categoryParam as AssessmentCategory,
    totalSteps: TOTAL_STEPS,
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
            <div className="mb-4 text-5xl">⚠️</div>
            <h2 className="text-section-title font-semibold text-text-primary">
              ไม่พบหัวข้อที่เลือก
            </h2>
            <p className="mt-2 text-small text-text-secondary">
              กรุณาเลือกหัวข้อจากหน้าประเมินความเสี่ยงสุขภาพ
            </p>
            <a
              href={ROUTES.HEALTH_RISK}
              className="mt-6 inline-block rounded-button bg-primary px-6 py-3 text-small font-medium text-white transition-colors hover:bg-primary-deep active:scale-[0.98]"
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

  const handleProfileNext = (data: any) => {
    saveDraft({ profile: data });
    nextStep();
  };

  const handleWorkInfoNext = (data: any) => {
    saveDraft({ workInfo: data });
    nextStep();
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    // TODO: In Phase 10, call real API
    setTimeout(() => {
      clearDraft();
      setIsSubmitting(false);
      // Dummy submission ID for now
      router.push(`${ROUTES.RESULT}?submissionId=SUB-20260629-8888`);
    }, 1500);
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <PageHeader
        title={`ความเสี่ยงสุขภาพ — ${ASSESSMENT_CATEGORY_LABELS[category]}`}
        subtitle="ตอบคำถามตามขั้นตอน"
        showBack
        backHref={ROUTES.HEALTH_RISK}
      />

      <main className="flex-1 px-4 py-2">
        <StepProgress currentStep={currentStep} totalSteps={totalSteps} />

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
            <div className="flex flex-col gap-6 animate-fade-in">
              <div className="rounded-card border border-border bg-surface p-6 text-center shadow-sm">
                <span className="text-5xl">🩺</span>
                <h2 className="mt-4 text-section-title font-semibold text-text-primary">
                  คำถามความเสี่ยงสุขภาพ
                </h2>
                <p className="mt-2 text-small text-text-secondary">
                  จะเชื่อมต่อใน Phase 6 (Health Risk Assessment)
                </p>
                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    className="flex-1 rounded-button border border-border px-5 py-2.5 text-small font-medium text-text-primary transition-colors hover:bg-muted active:scale-[0.98]"
                    onClick={prevStep}
                  >
                    ย้อนกลับ
                  </button>
                  <button
                    type="button"
                    className="flex-1 rounded-button bg-primary px-5 py-2.5 text-small font-medium text-white transition-colors hover:bg-primary-deep active:scale-[0.98]"
                    onClick={nextStep}
                  >
                    ถัดไป (ข้ามชั่วคราว)
                  </button>
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <ReviewStep
              draftData={draftData}
              isSubmitting={isSubmitting}
              onSubmit={handleSubmit}
              onPrev={prevStep}
            />
          )}
        </div>
      </main>
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
