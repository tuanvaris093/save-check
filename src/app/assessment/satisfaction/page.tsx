"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/layout";
import { ROUTES } from "@/lib/constants";
import { useAssessmentForm } from "@/hooks/use-assessment";
import { LoadingState, SubmitLoadingOverlay } from "@/components/ui";
import { createSubmission, updateSubmission } from "@/lib/api";
import { calculateSatisfactionResult } from "@/lib/satisfaction-schema";
import {
  StepProgress,
  SatisfactionStep,
  ReviewStep,
} from "@/components/assessment";

const TOTAL_STEPS = 2; // 1: Questions, 2: Review

function SatisfactionFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
    type: "satisfaction",
    category: "general", // satisfaction doesn't have categories, fallback to general
    totalSteps: TOTAL_STEPS,
    editCode,
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
    const submissionCode = editCode || `SUB-${datePart}-${randPart}`;
    const original = draftData.editingSubmission;

    let overallAvg = 4.8;
    if (draftData.answers) {
      const res = calculateSatisfactionResult(draftData.answers as any);
      overallAvg = res.overallAvg;
    }

    const newSubmission = {
      id: original?.id || Date.now(),
      submission_code: submissionCode,
      assessment_type: "satisfaction",
      assessment_category: "general",
      started_at:
        original?.started_at ||
        draftData.lastSavedAt ||
        new Date().toISOString(),
      completed_at: new Date().toISOString(),
      status: "completed",
      overall_score: overallAvg,
      overall_level: "pass",
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
        "Failed to save satisfaction submission to localStorage",
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
        title="แบบประเมินความพึงพอใจ"
        subtitle={
          editCode ? `แก้ไขรหัสเอกสาร: ${editCode}` : "ตอบคำถามตามขั้นตอน"
        }
        showBack
        replaceBack={!!editCode}
        backHref={
          editCode
            ? `${ROUTES.RESULT}?submissionId=${encodeURIComponent(editCode)}`
            : ROUTES.HOME
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
            <SatisfactionStep
              defaultValues={draftData.answers as any}
              onNext={handleSatisfactionNext}
              onPrev={() => {
                if (editCode) {
                  router.replace(
                    `${ROUTES.RESULT}?submissionId=${encodeURIComponent(editCode)}`,
                  );
                } else {
                  router.push(ROUTES.HOME);
                }
              }}
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

export default function SatisfactionFormPage() {
  return (
    <Suspense fallback={<LoadingState text="กำลังเตรียมแบบประเมิน..." />}>
      <SatisfactionFormContent />
    </Suspense>
  );
}
