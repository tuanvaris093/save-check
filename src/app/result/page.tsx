"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { AlertTriangle, BarChart3, Home } from "lucide-react";
import { PageHeader } from "@/components/layout";
import { ROUTES } from "@/lib/constants";

function ResultContent() {
  const searchParams = useSearchParams();
  const submissionId = searchParams.get("submissionId");

  // Handle missing submissionId
  if (!submissionId) {
    return (
      <div className="flex min-h-dvh flex-col pb-safe-nav">
        <PageHeader title="ผลการประเมิน" showBack backHref={ROUTES.HOME} />
        <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
          <div className="text-center">
            <div className="icon-container mx-auto mb-4" style={{ background: 'linear-gradient(135deg, rgba(254, 243, 199, 0.95), rgba(255, 251, 235, 0.8))' }}>
              <AlertTriangle className="h-7 w-7 text-warning" strokeWidth={2} />
            </div>
            <h2 className="text-section-title font-semibold text-text-primary">
              ไม่พบข้อมูลการประเมิน
            </h2>
            <p className="mt-2 text-small text-text-secondary">
              กรุณาระบุรหัสการประเมิน (submissionId) ให้ถูกต้อง
            </p>
            <Link
              href={ROUTES.HOME}
              className="mt-6 inline-flex items-center gap-2 btn-primary-gradient px-6 py-3 text-small font-medium"
            >
              <Home className="h-4 w-4" />
              กลับหน้าแรก
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col pb-safe-nav">
      <PageHeader
        title="ผลการประเมิน"
        subtitle={`รหัส: ${submissionId}`}
        showBack
        backHref={ROUTES.HOME}
      />

      <main className="flex-1 px-4 py-5 md:px-8">
        <div className="mx-auto max-w-[800px]">
          <div className="glass-card p-6 text-center animate-fade-in">
            <div className="icon-container mx-auto mb-4">
              <BarChart3 className="h-7 w-7" strokeWidth={2} />
            </div>
            <h2 className="text-section-title font-semibold text-text-primary">
              หน้าสรุปผลการประเมิน
            </h2>
            <p className="mt-2 text-small text-text-secondary">
              จะแสดงผลลัพธ์การประเมินจาก API ใน Phase 10
            </p>
            <div className="mt-4 rounded-input bg-primary-tint px-4 py-2 text-caption text-primary inline-block">
              submissionId = {submissionId}
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="mt-6 flex flex-col gap-3">
            <Link
              href={ROUTES.HOME}
              className="flex items-center justify-center gap-2 btn-primary-gradient px-6 py-3 text-small font-medium"
            >
              <Home className="h-4 w-4" />
              กลับหน้าแรก
            </Link>
            <Link
              href={ROUTES.DASHBOARD}
              className="flex items-center justify-center gap-2 btn-secondary-glass px-6 py-3 text-small font-medium"
            >
              <BarChart3 className="h-4 w-4" />
              ดู Dashboard
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ResultPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <p className="text-text-secondary">กำลังโหลด...</p>
        </div>
      }
    >
      <ResultContent />
    </Suspense>
  );
}
