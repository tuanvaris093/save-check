"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/layout";
import { LoadingState, SubmitLoadingOverlay, Button } from "@/components/ui";
import { ROUTES, ASSESSMENT_CATEGORY_LABELS } from "@/lib/constants";
import { useAssessmentForm } from "@/hooks/use-assessment";
import { StepProgress } from "@/components/assessment";
import {
  HealthProfileStep,
  HealthWorkStep,
  HealthQuestionsStep,
} from "@/components/health/health-steps";
import { HealthPreview } from "@/components/health/health-summary";
import {
  emptyHealthDraft,
  buildHealthPayload,
  type HealthDraft,
  type HealthCategory,
} from "@/lib/v3/health-form";
import { createSubmissionV3 } from "@/lib/api";
import { submitAssessment, submissionErrorMessage } from "@/lib/v3/submit";
import {
  completedResultUrl,
  completionDestination,
} from "@/lib/v3/completion-navigation";
function HealthRiskFormContent({ category }: { category: HealthCategory }) {
  const params = useSearchParams(),
    router = useRouter(),
    editCode = params.get("edit"),
    pendingId = params.get("pending");
  const form = useAssessmentForm({
    type: "health_risk",
    category,
    totalSteps: 4,
    editCode,
    baseRevision: params.get("base"),
  });
  const data = form.draftData.healthV3 ?? emptyHealthDraft(),
    save = (healthV3: HealthDraft) => form.saveDraft({ healthV3 });
  const [isSubmitting, setSubmitting] = useState(false),
    [submitError, setError] = useState<string | null>(null),
    [redirecting, setRedirecting] = useState(false),
    completed = useRef(false),
    lock = useRef(false);
  useEffect(() => {
    if (submitError) {
      const el = document.querySelector<HTMLElement>("[data-submit-error]");
      el?.focus();
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [submitError]);
  const handleSubmit = async () => {
    if (lock.current) return;
    const payload = buildHealthPayload(data, category, form.requestKey ?? "");
    if (!payload.success) {
      setError(submissionErrorMessage(payload.error));
      return;
    }
    lock.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const response = await submitAssessment(payload.data, createSubmissionV3);
      if (!response.success) {
        setError(submissionErrorMessage(response.error));
        return;
      }
      completed.current = true;
      setRedirecting(true);
      form.clearDraft();
      router.push(
        completedResultUrl(
          response.data.submission_code,
          completionDestination(params.get("returnTo"), ROUTES.HEALTH_RISK),
        ),
      );
    } finally {
      if (!completed.current) {
        lock.current = false;
        setSubmitting(false);
      }
    }
  };
  if (!form.isLoaded) return <LoadingState text="กำลังเตรียมแบบประเมิน..." />;
  if (form.loadError || editCode || pendingId)
    return (
      <div className="app-mobile-shell pb-safe-nav mx-auto min-h-dvh max-w-[800px]">
        <PageHeader
          title="ไม่สามารถเปิดการแก้ไข"
          showBack
          backHref={pendingId ? ROUTES.DASHBOARD : ROUTES.HEALTH_RISK}
        />
        <main className="p-5">
          <p role="alert">
            {pendingId
              ? "กรุณาเริ่มแบบประเมินใหม่และตอบส่วนก่อนกับส่วนหลังให้ครบก่อนบันทึกผล"
              : (form.loadError ??
                "การแก้ไขต้องเปิดจากข้อมูลล่าสุดพร้อมเหตุผล กรุณากลับไปดูผลการประเมิน")}
          </p>
          <Link href={pendingId ? ROUTES.DASHBOARD : ROUTES.HEALTH_RISK}>
            {pendingId ? "กลับ Dashboard" : "กลับไปเลือกหัวข้อ"}
          </Link>
        </main>
      </div>
    );
  const preview = buildHealthPayload(data, category, form.requestKey ?? "");
  return (
    <div className="app-mobile-shell pb-safe-nav mx-auto flex min-h-dvh w-full max-w-[1000px] flex-col min-[1440px]:px-8 min-[1440px]:py-6">
      <PageHeader
        title={`อาการทางสุขภาพด้าน${ASSESSMENT_CATEGORY_LABELS[category]}`}
        showBack
        backHref={ROUTES.HEALTH_RISK}
      />
      <main className="min-[1440px]:glass-card flex-1 px-4 py-5 min-[1440px]:mt-4 min-[1440px]:px-8">
        <StepProgress currentStep={form.currentStep} totalSteps={4} />
        {form.draftWarning && (
          <p role="status" className="text-warning mb-4">
            {form.draftWarning}
          </p>
        )}
        {submitError && (
          <p
            role="alert"
            tabIndex={-1}
            data-submit-error
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700"
          >
            {submitError}
          </p>
        )}
        <div className="mt-5 pb-8">
          {form.currentStep === 1 && (
            <HealthProfileStep data={data} save={save} next={form.nextStep} />
          )}
          {form.currentStep === 2 && (
            <HealthWorkStep
              category={category}
              data={data}
              save={save}
              next={form.nextStep}
              prev={form.prevStep}
            />
          )}
          {form.currentStep === 3 && (
            <HealthQuestionsStep
              data={data}
              save={save}
              next={form.nextStep}
              prev={form.prevStep}
              category={category}
              tab={form.currentTab}
              setTab={form.setTab}
              busy={isSubmitting}
            />
          )}
          {form.currentStep === 4 &&
            (preview.success &&
            preview.data.assessment_type === "health_risk" ? (
              <HealthPreview
                payload={preview.data}
                onSubmit={handleSubmit}
                onPrev={form.prevStep}
                isSubmitting={isSubmitting}
              />
            ) : (
              <section>
                <p role="alert">
                  ข้อมูลร่างยังไม่ครบ กรุณากลับไปตรวจข้อมูลก่อนส่ง
                </p>
                <Button onClick={() => form.setStep(1)}>
                  กลับไปแก้ข้อมูลส่วนตัว
                </Button>
              </section>
            ))}
        </div>
      </main>
      <SubmitLoadingOverlay
        isOpen={isSubmitting}
        phase={redirecting ? "redirecting" : "saving"}
        text="กำลังบันทึกข้อมูลผลการประเมิน..."
      />
    </div>
  );
}
function HealthRoute() {
  const params = useSearchParams(),
    category = params.get("category");
  if (category === "light" || category === "noise" || category === "heat")
    return (
      <HealthRiskFormContent
        key={`${category}:${params.get("pending")}:${params.get("pendingVersion")}`}
        category={category}
      />
    );
  return (
    <div className="app-mobile-shell pb-safe-nav mx-auto min-h-dvh max-w-[800px]">
      <PageHeader
        title="ไม่พบหัวข้อที่เลือก"
        showBack
        backHref={ROUTES.HEALTH_RISK}
      />
      <main className="p-5">
        <Link href={ROUTES.HEALTH_RISK}>กลับไปเลือกหัวข้อ</Link>
      </main>
    </div>
  );
}
export default function HealthRiskFormPage() {
  return (
    <Suspense fallback={<LoadingState text="กำลังเตรียมแบบประเมิน..." />}>
      <HealthRoute />
    </Suspense>
  );
}
