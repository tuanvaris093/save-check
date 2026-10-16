"use client";
import { errorsAfterFieldChange } from "@/lib/v3/field-error-change";
import { useRef, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  completedResultUrl,
  completionDestination,
} from "@/lib/v3/completion-navigation";
import { DraftProvider } from "@/hooks/use-step-draft";
import { useAssessmentForm } from "@/hooks/use-assessment";
import { PageHeader } from "@/components/layout";
import { Button, LoadingState, SubmitLoadingOverlay } from "@/components/ui";
import { StepProgress, SatisfactionStep } from "@/components/assessment";
import { FormInput } from "@/components/forms";
import { createSubmissionV3, correctSubmissionV3 } from "@/lib/api";
import { submitAssessment, submissionErrorMessage } from "@/lib/v3/submit";
import {
  emptySatisfactionDraft,
  checkedSatisfaction,
  satisfactionInput,
  checkSatisfactionRespondent,
  checkSatisfactionDurations,
  type SatisfactionDraft,
} from "@/lib/v3/satisfaction-form";
import {
  evaluateSubmission,
  programSnapshot,
  satisfactionQuestionSnapshots,
  type SatisfactionGroup,
} from "../../../shared/v3";
import {
  SatisfactionRespondent,
  SatisfactionDurations,
} from "./satisfaction-details";
import {
  SatisfactionSummary,
  type SatisfactionStoredResult,
} from "./satisfaction-summary";
import type { AssessmentDraftData } from "@/lib/schemas";
import type { SatisfactionMeasurementFormValues } from "@/lib/satisfaction-schema";
export function SatisfactionWizard({
  group,
  editCode,
  base,
}: {
  group: SatisfactionGroup;
  editCode: string | null;
  base: string | null;
}) {
  const router = useRouter(),
    params = useSearchParams(),
    total = group === "environment" ? 4 : 3;
  const form = useAssessmentForm({
    type: "satisfaction",
    category: "general",
    group,
    totalSteps: total,
    editCode,
    baseRevision: base,
  });
  const draft = form.draftData.satisfactionV3 || emptySatisfactionDraft(group),
    latest = useRef(draft);
  latest.current = draft;
  const [errors, setErrors] = useState<Record<string, string>>({}),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [redirecting, setRedirecting] = useState(false),
    completed = useRef(false),
    lock = useRef(false),
    alert = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (error) {
      alert.current?.focus();
      alert.current?.scrollIntoView({ block: "center" });
    }
  }, [error]);
  const clearFieldError = (event: React.FormEvent<HTMLElement>) => {
    const remaining = errorsAfterFieldChange(errors, event);
    setErrors(remaining);
    if (Object.keys(errors).length && !Object.keys(remaining).length)
      setError("");
  };
  const save = (d: SatisfactionDraft) => {
    latest.current = d;
    form.saveDraft({ satisfactionV3: d });
  };
  const ratingDraft = (values: Record<string, unknown>) => {
    const d = {
      ...latest.current,
      answers: { ...latest.current.answers },
      suggestion:
        typeof values.suggestion === "string"
          ? values.suggestion
          : latest.current.suggestion,
    };
    for (let i = 1; i <= 16; i++) {
      const key = "q" + i,
        v = values[key];
      if (v !== undefined && v !== "" && [1, 2, 3, 4, 5].includes(Number(v)))
        d.answers[key] = Number(v);
    }
    save(d);
    form.saveDraft({ answers: values as AssessmentDraftData["answers"] });
  };
  const showIssues = (
    issues: { path: (string | number)[]; message: string }[],
    prefix = "",
  ) => {
    const translate = (message: string) =>
      message === "Duration must be greater than zero"
        ? "เวลารวมต้องมากกว่า 0"
        : message === "Choose study year 1–6"
          ? "กรุณาเลือกชั้นปี 1–6"
          : message === "Unknown program"
            ? "กรุณาเลือกหลักสูตร"
            : message === "Choose study or work context"
              ? "กรุณาเลือกบริบทของผู้ตอบ"
              : message === "Students must choose a program"
                ? "นักศึกษาต้องเลือกหลักสูตร"
                : message.startsWith("Number must")
                  ? "กรุณาระบุจำนวนเต็มในช่วงที่กำหนด"
                  : message.startsWith("Expected") ||
                      message === "Required" ||
                      message.startsWith("Invalid")
                    ? "กรุณาระบุข้อมูลให้ครบและถูกต้อง"
                    : message;
    const mapped = Object.fromEntries(
      issues.map((i) => [
        (prefix ? prefix + "." : "") + i.path.join("."),
        translate(i.message),
      ]),
    );
    setErrors(mapped);
    setError("กรุณาตรวจข้อมูลที่ยังไม่ครบ");
    requestAnimationFrame(() => {
      const el = document.getElementsByName(Object.keys(mapped)[0])[0] as
        HTMLElement | undefined;
      el?.focus();
      el?.scrollIntoView({ block: "center" });
    });
  };
  const next = () => {
    setError("");
    setErrors({});
    if (form.currentStep === 1) {
      const checked = checkSatisfactionRespondent(draft, group);
      if (!checked.success) {
        showIssues(checked.issues);
        return;
      }
      if (editCode && !draft.reason.trim()) {
        setError("กรุณาระบุเหตุผลของการแก้ไข");
        setErrors({ reason: "กรุณาระบุเหตุผล" });
        return;
      }
    }
    if (form.currentStep === 3 && group === "environment") {
      const checked = checkSatisfactionDurations(draft);
      if (!checked.success) {
        showIssues(checked.error.issues, "durations");
        return;
      }
    }
    form.nextStep();
  };
  const submit = async () => {
    if (lock.current) return;
    setError("");
    const checked = checkedSatisfaction(
      latest.current,
      group,
      form.requestKey || "",
    );
    if (!checked.success) {
      setError(submissionErrorMessage(checked.error));
      return;
    }
    if (editCode && !draft.reason.trim()) {
      setError("กรุณาระบุเหตุผล");
      return;
    }
    lock.current = true;
    setBusy(true);
    try {
      const response = editCode
        ? await correctSubmissionV3(editCode, {
            schema_version: 3,
            idempotency_key: form.requestKey!,
            expected_data_version: draft.expected_data_version!,
            reason: draft.reason.trim(),
            payload: checked.data,
          })
        : await submitAssessment(
            satisfactionInput(latest.current, group, form.requestKey!),
            createSubmissionV3,
          );
      if (!response.success) {
        setError(submissionErrorMessage(response.error));
        return;
      }
      if (
        !Number.isSafeInteger(response.data.id) ||
        !response.data.submission_code ||
        !Number.isSafeInteger(response.data.data_version)
      ) {
        setError("server ยังไม่ยืนยันการบันทึก ร่างยังอยู่");
        return;
      }
      completed.current = true;
      setRedirecting(true);
      form.clearDraft();
      router.push(
        completedResultUrl(
          response.data.submission_code,
          completionDestination(
            params.get("returnTo"),
            editCode
              ? `/result?submissionId=${encodeURIComponent(editCode)}`
              : group === "environment"
                ? "/assessment/environment"
                : "/assessment/health-risk",
          ),
        ),
      );
    } finally {
      if (!completed.current) {
        lock.current = false;
        setBusy(false);
      }
    }
  };
  if (!form.isLoaded) return <LoadingState text="กำลังเตรียมแบบประเมิน..." />;
  if (form.loadError)
    return (
      <div className="p-5">
        <PageHeader
          title="เปิดแบบประเมินไม่ได้"
          showBack
          backHref={
            editCode
              ? `/result?submissionId=${encodeURIComponent(editCode)}`
              : "/"
          }
        />
        <p role="alert">{form.loadError}</p>
      </div>
    );
  const preview = checkedSatisfaction(
    draft,
    group,
    form.requestKey || "preview",
  );
  const defaultRatings = Object.fromEntries([
    ...Object.entries(draft.answers).map(([k, v]) => [k, String(v)]),
    ["suggestion", draft.suggestion],
  ]) as Partial<SatisfactionMeasurementFormValues>;
  return (
    <div className="app-mobile-shell pb-safe-nav mx-auto flex min-h-dvh w-full max-w-[800px] flex-col min-[1440px]:px-8 min-[1440px]:py-6">
      <PageHeader
        title="แบบประเมินความพึงพอใจ"
        className="border-none min-[1440px]:border-none min-[1440px]:bg-transparent min-[1440px]:px-0 min-[1440px]:backdrop-blur-none"
        subtitle={
          group === "environment"
            ? "กลุ่มสภาพแวดล้อมในการทำงาน"
            : "กลุ่มอาการทางสุขภาพ"
        }
        showBack
        backHref={
          editCode
            ? `/result?submissionId=${encodeURIComponent(editCode)}`
            : group === "environment"
              ? "/assessment/environment"
              : "/assessment/health-risk"
        }
      />
      <main className="min-[1440px]:glass-card flex flex-1 flex-col gap-4 px-4 py-2 min-[1440px]:mt-4 min-[1440px]:mb-10 min-[1440px]:px-8 min-[1440px]:py-6">
        <StepProgress currentStep={form.currentStep} totalSteps={total} />
        {form.draftWarning && <p role="status">{form.draftWarning}</p>}
        {error && (
          <div
            role="alert"
            data-submit-error
            tabIndex={-1}
            ref={alert}
            className="text-danger rounded-xl border p-4"
          >
            {error}
            {editCode && (
              <a
                className="action-button ml-2"
                href={`/result?submissionId=${encodeURIComponent(editCode)}`}
              >
                เปิดผลล่าสุด (ร่างยังเก็บไว้)
              </a>
            )}
          </div>
        )}
        {form.currentStep === 1 && (
          <form
            onChangeCapture={clearFieldError}
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              next();
            }}
            className="flex flex-col gap-4"
          >
            <SatisfactionRespondent
              draft={draft}
              group={group}
              onChange={save}
              errors={errors}
            />
            {editCode && (
              <FormInput
                name="reason"
                label="เหตุผลของการแก้ไข"
                required
                value={draft.reason}
                onChange={(e) => save({ ...draft, reason: e.target.value })}
                error={errors.reason}
              />
            )}
            <Button type="submit">ถัดไป</Button>
          </form>
        )}
        {form.currentStep === 2 && (
          <DraftProvider
            save={(partial) => {
              if (partial.answers) ratingDraft(partial.answers);
            }}
          >
            <SatisfactionStep
              group={group}
              defaultValues={defaultRatings}
              nextLabel={group === "environment" ? "ถัดไป" : "ดูผลสรุป"}
              onNext={(values) => {
                ratingDraft(values);
                setError("");
                form.nextStep();
              }}
              onPrev={form.prevStep}
            />
          </DraftProvider>
        )}
        {form.currentStep === 3 && group === "environment" && (
          <form
            onChangeCapture={clearFieldError}
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              next();
            }}
            className="flex flex-col gap-4"
          >
            <SatisfactionDurations
              draft={draft}
              onChange={save}
              errors={errors}
            />
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={form.prevStep}>
                ย้อนกลับ
              </Button>
              <Button type="submit" className="flex-1">
                ดูผลสรุป
              </Button>
            </div>
          </form>
        )}
        {form.currentStep === total && (
          <>
            {preview.success ? (
              <SatisfactionSummary
                payload={preview.data}
                result={
                  evaluateSubmission(preview.data) as SatisfactionStoredResult
                }
                questions={satisfactionQuestionSnapshots(group)}
                version={draft.questionnaire_version}
                programLabel={
                  preview.data.assessment_group === "health"
                    ? programSnapshot(preview.data.workInfo.program_code).label
                    : undefined
                }
              />
            ) : (
              <p role="alert">ร่างยังไม่ครบ กรุณาย้อนกลับกรอกข้อมูล</p>
            )}
            <div className="flex gap-3">
              <Button variant="outline" onClick={form.prevStep} disabled={busy}>
                ย้อนกลับ
              </Button>
              <Button
                onClick={() => void submit()}
                disabled={busy || !preview.success}
                className="flex-1"
              >
                บันทึกผล
              </Button>
            </div>
          </>
        )}
      </main>
      <SubmitLoadingOverlay
        isOpen={busy}
        phase={redirecting ? "redirecting" : "saving"}
        text="กำลังบันทึกผลการประเมิน"
      />
    </div>
  );
}
