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
import { createSubmission } from "@/lib/api";
import { useAssessmentForm } from "@/hooks/use-assessment";
import { LoadingState } from "@/components/ui";
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
            <div className="icon-container mx-auto mb-4" style={{ background: 'linear-gradient(135deg, rgba(254, 243, 199, 0.95), rgba(255, 251, 235, 0.8))' }}>
              <AlertTriangle className="h-7 w-7 text-warning" strokeWidth={2} />
            </div>
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

  const handleHealthRiskNext = (data: any) => {
    saveDraft({ answers: data });
    nextStep();
  }

  const handleSubmit = async () => {
    setIsSubmitting(true);

    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
    const randPart = Math.floor(1000 + Math.random() * 9000);
    const submissionCode = `SUB-${datePart}-${randPart}`;

    let score = 0;
    let level: any = "pass";
    if (draftData.answers) {
      score = calculateHealthRiskScore(draftData.answers as any);
      const evalResult = evaluateHealthRiskResult(score, category);
      level = evalResult.level;
    }

    const newSubmission = {
      id: Date.now(),
      submission_code: submissionCode,
      assessment_type: "health_risk",
      assessment_category: category,
      started_at: draftData.lastSavedAt || new Date().toISOString(),
      completed_at: new Date().toISOString(),
      status: "completed",
      overall_score: score,
      overall_level: level,
      profile: draftData.profile,
      workInfo: draftData.workInfo,
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
    } catch (err) {
      console.error("Failed to save health risk submission to localStorage", err);
    }

    clearDraft();
    setIsSubmitting(false);
    router.push(`${ROUTES.RESULT}?submissionId=${submissionCode}`);
  };

  return (
    <div className="flex min-h-dvh flex-col pb-safe-nav max-w-[800px] mx-auto w-full md:px-8 md:py-6">
      <PageHeader
        title={`ความเสี่ยงสุขภาพ — ${ASSESSMENT_CATEGORY_LABELS[category]}`}
        subtitle="ตอบคำถามตามขั้นตอน"
        showBack
        backHref={ROUTES.HEALTH_RISK}
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
