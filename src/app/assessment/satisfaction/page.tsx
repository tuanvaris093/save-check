"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/layout";
import { ROUTES } from "@/lib/constants";
import { useAssessmentForm } from "@/hooks/use-assessment";
import { LoadingState } from "@/components/ui";
import {
  StepProgress,
  ProfileStep,
  WorkInfoStep,
  SatisfactionStep,
  ReviewStep,
} from "@/components/assessment";

const TOTAL_STEPS = 4; // 1: Profile, 2: Work Info, 3: Questions, 4: Review

export default function SatisfactionFormPage() {
  const router = useRouter();
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

  const handleProfileNext = (data: any) => {
    saveDraft({ profile: data });
    nextStep();
  };

  const handleWorkInfoNext = (data: any) => {
    saveDraft({ workInfo: data });
    nextStep();
  };

  const handleSatisfactionNext = (data: any) => {
    saveDraft({ answers: data });
    nextStep();
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    // TODO: In Phase 10, call real API
    setTimeout(() => {
      clearDraft();
      setIsSubmitting(false);
      // Dummy submission ID for now
      router.push(`${ROUTES.RESULT}?submissionId=SUB-20260629-7777`);
    }, 1500);
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <PageHeader
        title="แบบประเมินความพึงพอใจ"
        subtitle="ตอบคำถามตามขั้นตอน"
        showBack
        backHref={ROUTES.HOME}
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
            <SatisfactionStep
              defaultValues={draftData.answers as any}
              onNext={handleSatisfactionNext}
              onPrev={prevStep}
            />
          )}

          {currentStep === 4 && (
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
    </div>
  );
}
