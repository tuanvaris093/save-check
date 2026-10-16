"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui";
import { completionDestination } from "@/lib/v3/completion-navigation";
import Link from "next/link";
import { getResult } from "@/lib/api";
import { EnvironmentResult } from "@/components/environment/environment-result";
import { HealthResultV3 } from "@/components/health/health-result";
import { SatisfactionResult } from "@/components/satisfaction/satisfaction-result";
import { ReportControls } from "@/components/reports/report-controls";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/layout";
import { satisfactionQuestionnaireVersion } from "../../../shared/v3";
import type { EnvironmentSource } from "@/lib/v3/environment-form";
import type { StoredRecord } from "@/lib/v3/report-model";
function ResultContent() {
  const params = useSearchParams(),
    router = useRouter(),
    code = params.get("submissionId"),
    version = params.get("version"),
    revision = params.get("revision");
  const [data, setData] = useState<StoredRecord | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [refresh, setRefresh] = useState(0);
  const reload = useCallback(() => setRefresh((n) => n + 1), []);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setData(null);
    setError("");
    if (!code) {
      setError("กรุณาระบุรหัสการประเมิน");
      setLoading(false);
      return;
    }
    getResult(code, {
      version: version ?? undefined,
      revision: revision ?? undefined,
    }).then((r) => {
      if (cancelled) return;
      if (r.success) {
        const group = r.data.assessment_group;
        const current =
          r.data.schema_version === 3 &&
          (group === "environment" || group === "health") &&
          (r.data.assessment_type !== "satisfaction" ||
            r.data.questionnaire_version ===
              satisfactionQuestionnaireVersion(group));
        if (current) setData(r.data);
        else setError("ไม่พบรายการประเมินในข้อมูลปัจจุบัน");
      } else setError(r.error.message);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [code, version, revision, refresh]);
  if (loading) return <LoadingState />;
  if (!data)
    return (
      <main className="mx-auto max-w-xl p-6">
        <h1 className="text-section-title mb-3 font-semibold">
          {code ? "ดึงข้อมูลไม่สำเร็จ" : "ไม่ระบุรหัสการประเมิน"}
        </h1>
        <p role="alert">{error}</p>
        <button className="action-button" onClick={reload}>
          ลองใหม่
        </button>
        <Link className="action-button" href="/dashboard">
          กลับ Dashboard
        </Link>
      </main>
    );
  const titles: Record<string, string> = {
    environment: "ผลการตรวจสภาพแวดล้อม",
    health_risk: "ผลการประเมินอาการทางสุขภาพ",
    satisfaction: "ผลความพึงพอใจ",
  };
  const doneHref = completionDestination(
    params.get("returnTo"),
    params.get("saved") === "1"
      ? data.assessment_group === "environment"
        ? "/assessment/environment"
        : "/assessment/health-risk"
      : "/dashboard",
  );
  return (
    <div
      className="app-mobile-shell print-report pb-safe-nav flex min-h-dvh flex-col min-[1440px]:max-w-none"
      key={`${code}:${version}:${revision}`}
    >
      <PageHeader
        className="report-page-header"
        title={titles[String(data.assessment_type)] || "ผลการประเมิน"}
        subtitle={String(data.submission_code)}
        showBack
        backHref="/dashboard"
      />
      <main className="mx-auto w-full max-w-[1200px] min-w-0 px-4 py-5 min-[1440px]:px-8">
        <ReportControls data={data} />
        {data.assessment_type === "environment" ? (
          <EnvironmentResult
            data={data as unknown as EnvironmentSource}
            onSaved={reload}
          />
        ) : data.assessment_type === "health_risk" ? (
          <HealthResultV3 data={data} />
        ) : (
          <SatisfactionResult data={data} />
        )}
        {params.get("saved") === "1" && (
          <div className="mt-6 flex justify-center print:hidden">
            <Button
              className="w-full sm:w-auto sm:min-w-48"
              onClick={() => router.replace(doneHref)}
            >
              เสร็จสิ้น
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
export default function ResultPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ResultContent />
    </Suspense>
  );
}
