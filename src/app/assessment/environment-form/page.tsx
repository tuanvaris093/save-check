"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { AlertTriangle, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/layout";
import { ROUTES } from "@/lib/constants";
import {
  ASSESSMENT_CATEGORY_LABELS,
} from "@/lib/constants";
import { isValidCategory } from "@/lib/utils";
import type { AssessmentCategory } from "@/types";
import { createSubmission } from "@/lib/api";
import { useAssessmentForm } from "@/hooks/use-assessment";
import { LoadingState, SubmitLoadingOverlay } from "@/components/ui";
import {
  StepProgress,
  InspectionDataStep,
  ReviewStep,
  EnvironmentStep,
} from "@/components/assessment";

const TOTAL_STEPS = 3; // 1: Inspection Data, 2: Environment Measurement, 3: Review

function EnvironmentFormContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const categoryParam = searchParams.get("category");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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

  const handleInspectionDataNext = (data: any, layoutFile?: any) => {
    saveDraft({ inspectionData: data, layoutFile });
    nextStep();
  };

  const handleMeasurementNext = (data: any) => {
    // Save into answers for environment
    saveDraft({ answers: data });
    nextStep();
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
    const randPart = Math.floor(1000 + Math.random() * 9000);
    const submissionCode = `SUB-${datePart}-${randPart}`;

    const newSubmission = {
      id: Date.now(),
      submission_code: submissionCode,
      assessment_type: "environment",
      assessment_category: category,
      started_at: draftData.lastSavedAt || new Date().toISOString(),
      completed_at: new Date().toISOString(),
      status: "completed",
      inspectionData: draftData.inspectionData,
      answers: draftData.answers,
      layout_file: draftData.layoutFile || null,
      has_layout: !!draftData.layoutFile,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      // 1. Send to Cloudflare Workers Backend API
      await createSubmission(newSubmission);
    } catch (apiErr) {
      console.warn("Backend API unavailable, continuing with local storage", apiErr);
    }

    try {
      // 2. Persist to localStorage for offline cache
      const stored = localStorage.getItem("save_check_submissions");
      const list = stored ? JSON.parse(stored) : [];
      localStorage.setItem(
        "save_check_submissions",
        JSON.stringify([newSubmission, ...list])
      );

      // Clean draft key from localStorage without wiping React state
      localStorage.removeItem(`save_check_draft_environment_${category}`);
    } catch (err) {
      console.error("Failed to save submission to localStorage", err);
    }

    router.push(`${ROUTES.RESULT}?submissionId=${submissionCode}`);
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

        {submitError && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-3.5 text-small text-red-700 animate-fade-in">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
            <span>{submitError}</span>
          </div>
        )}

        <div className="mt-4 pb-8">
          {currentStep === 1 && (
            <InspectionDataStep
              defaultValues={draftData.inspectionData}
              layoutFile={draftData.layoutFile}
              onNext={handleInspectionDataNext}
            />
          )}

          {currentStep === 2 && (
            <EnvironmentStep
              category={category}
              defaultValues={draftData.answers as any}
              onNext={handleMeasurementNext}
              onPrev={prevStep}
            />
          )}

          {currentStep === 3 && (
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

      {/* Fullscreen Loading Overlay during submission */}
      <SubmitLoadingOverlay isOpen={isSubmitting} text="กำลังบันทึกข้อมูลผลการประเมิน..." />
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
