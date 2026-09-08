"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/layout";
import { ROUTES } from "@/lib/constants";
import { useAssessmentForm } from "@/hooks/use-assessment";
import { LoadingState, SubmitLoadingOverlay } from "@/components/ui";
import { createSubmission } from "@/lib/api";
import { calculateSatisfactionResult } from "@/lib/satisfaction-schema";
import {
  StepProgress,
  SatisfactionStep,
  ReviewStep,
} from "@/components/assessment";

const TOTAL_STEPS = 2; // 1: Questions, 2: Review

export default function SatisfactionFormPage() {
  const router = useRouter();
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
    type: "satisfaction",
    category: "general", // satisfaction doesn't have categories, fallback to general
    totalSteps: TOTAL_STEPS,
  });

  // Show loading until draft is restored from localStorage
  if (!isLoaded) {
    return (
      <div className="flex min-h-dvh flex-col">
        <PageHeader
          title="แบบประเมินความพึงพอใจ"
          showBack
          backHref={ROUTES.HOME}
        />
        <LoadingState text="กำลังเตรียมแบบประเมิน..." />
      </div>
    );
  }

  const handleSatisfactionNext = (data: any) => {
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

    let overallAvg = 4.8;
    if (draftData.answers) {
      const res = calculateSatisfactionResult(draftData.answers as any);
      overallAvg = res.overallAvg;
    }

    const newSubmission = {
      id: Date.now(),
      submission_code: submissionCode,
      assessment_type: "satisfaction",
      assessment_category: "general",
      started_at: draftData.lastSavedAt || new Date().toISOString(),
      completed_at: new Date().toISOString(),
      status: "completed",
      overall_score: overallAvg,
      overall_level: "pass",
      answers: draftData.answers,
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

      // Clean draft key from localStorage
      localStorage.removeItem("save_check_draft_satisfaction_general");
    } catch (err) {
      console.error("Failed to save satisfaction submission to localStorage", err);
    }

    router.push(`${ROUTES.RESULT}?submissionId=${submissionCode}`);
  };

  return (
    <div className="flex min-h-dvh flex-col pb-safe-nav max-w-[800px] mx-auto w-full md:px-8 md:py-6">
      <PageHeader
        title="แบบประเมินความพึงพอใจ"
        subtitle="ตอบคำถามตามขั้นตอน"
        showBack
        backHref={ROUTES.HOME}
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
            <SatisfactionStep
              defaultValues={draftData.answers as any}
              onNext={handleSatisfactionNext}
              onPrev={() => router.push(ROUTES.HOME)}
            />
          )}

          {currentStep === 2 && (
            <ReviewStep
              type="satisfaction"
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
