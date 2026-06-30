"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { AlertTriangle } from "lucide-react";
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
  EnvironmentStep,
} from "@/components/assessment";

const TOTAL_STEPS = 4; // 1: Profile, 2: Work Info, 3: Environment Measurement, 4: Review

function EnvironmentFormContent() {
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
    type: "environment",
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
          backHref={ROUTES.ENVIRONMENT}
        />
        <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
          <div className="text-center">
            <div className="icon-container mx-auto mb-4" style={{ background: 'linear-gradient(135deg, rgba(254, 243, 199, 0.95), rgba(255, 251, 235, 0.8))' }}>
              <AlertTriangle className="h-7 w-7 text-warning" strokeWidth={2} /></div>
            <h2 className="text-section-title font-semibold text-text-primary">
              ไม่พบหัวข้อที่เลือก
            </h2>
            <p className="mt-2 text-small text-text-secondary">
              กรุณาเลือกหัวข้อจากหน้าประเมินสภาพแวดล้อม
            </p>
            <a
              href={ROUTES.ENVIRONMENT}
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
          title={`ประเมินสภาพแวดล้อม — ${ASSESSMENT_CATEGORY_LABELS[category]}`}
          showBack
          backHref={ROUTES.ENVIRONMENT}
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

  const handleMeasurementNext = (data: any) => {
    // Save into answers for environment
    saveDraft({ answers: data });
    nextStep();
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    // TODO: In Phase 10, call real API
    setTimeout(() => {
      clearDraft();
      setIsSubmitting(false);
      router.push(`${ROUTES.RESULT}?submissionId=SUB-20260629-9999`);
    }, 1500);
  };

  return (
    <div className="flex min-h-dvh flex-col pb-safe-nav max-w-[800px] mx-auto w-full md:px-8 md:py-6">
      <PageHeader
        title={`ประเมินสภาพแวดล้อม — ${ASSESSMENT_CATEGORY_LABELS[category]}`}
        subtitle="กรอกข้อมูลตามขั้นตอน"
        showBack
        backHref={ROUTES.ENVIRONMENT}
        className="md:px-0 md:bg-transparent md:backdrop-blur-none border-none md:border-none"
      />

      <main className="flex-1 px-4 py-2 md:px-8 md:py-6 md:glass-card md:mt-4 md:mb-10">
        <StepProgress currentStep={currentStep} totalSteps={totalSteps} className="md:pt-0" />

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
            <EnvironmentStep
              category={category}
              defaultValues={draftData.answers as any}
              onNext={handleMeasurementNext}
              onPrev={prevStep}
            />
          )}

          {currentStep === 4 && (
            <ReviewStep
              category={category}
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

export default function EnvironmentFormPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <p className="text-text-secondary">กำลังโหลด...</p>
        </div>
      }
    >
      <EnvironmentFormContent />
    </Suspense>
  );
}
