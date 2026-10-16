"use client";
import { LoadingState } from "@/components/ui/loading-state";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { EnvironmentWizard } from "@/components/environment/environment-wizard";
import { PageHeader } from "@/components/layout";
import type { Category, Mode } from "@/lib/v3/environment-form";
function Content() {
  const params = useSearchParams(),
    category = params.get("category");
  const retest = params.get("retest"),
    edit = params.get("edit"),
    supplement = params.get("supplement");
  if (
    !["light", "noise", "heat"].includes(category || "") ||
    [retest, edit, supplement].filter(Boolean).length > 1
  )
    return (
      <div className="p-5">
        <PageHeader
          title="ไม่พบหัวข้อที่เลือก"
          showBack
          backHref="/assessment/environment"
        />
        <p role="alert">กรุณาเลือกหมวดและรูปแบบการทำงานให้ถูกต้อง</p>
      </div>
    );
  const mode: Mode = retest
    ? "retest"
    : edit
      ? "correction"
      : supplement
        ? "supplement"
        : "create";
  return (
    <EnvironmentWizard
      category={category as Category}
      mode={mode}
      code={retest || edit || supplement}
      base={params.get("base")}
    />
  );
}
export default function EnvironmentFormPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <Content />
    </Suspense>
  );
}
