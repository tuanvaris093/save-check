"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout";
import { ROUTES } from "@/lib/constants";

function ResultContent() {
  const searchParams = useSearchParams();
  const submissionId = searchParams.get("submissionId");

  // Handle missing submissionId
  if (!submissionId) {
    return (
      <div className="flex min-h-dvh flex-col">
        <PageHeader title="ผลการประเมิน" showBack backHref={ROUTES.HOME} />
        <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
          <div className="text-center">
            <div className="mb-4 text-5xl">⚠️</div>
            <h2 className="text-section-title font-semibold text-text-primary">
              ไม่พบข้อมูลการประเมิน
            </h2>
            <p className="mt-2 text-small text-text-secondary">
              กรุณาระบุรหัสการประเมิน (submissionId) ให้ถูกต้อง
            </p>
            <Link
              href={ROUTES.HOME}
              className="mt-6 inline-block rounded-button bg-primary px-6 py-3 text-small font-medium text-white transition-colors hover:bg-primary-deep active:scale-[0.98]"
            >
              กลับหน้าแรก
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <PageHeader
        title="ผลการประเมิน"
        subtitle={`รหัส: ${submissionId}`}
        showBack
        backHref={ROUTES.HOME}
      />

      <main className="flex-1 px-4 py-5">
        <div className="animate-fade-in rounded-card border border-border bg-surface p-6 text-center shadow-sm">
          <span className="text-5xl">📊</span>
          <h2 className="mt-4 text-section-title font-semibold text-text-primary">
            หน้าสรุปผลการประเมิน
          </h2>
          <p className="mt-2 text-small text-text-secondary">
            จะแสดงผลลัพธ์การประเมินจาก API ใน Phase 10
          </p>
          <div className="mt-4 rounded-input bg-primary-tint px-4 py-2 text-caption text-primary">
            submissionId = {submissionId}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="mt-6 flex flex-col gap-3">
          <Link
            href={ROUTES.HOME}
            className="flex items-center justify-center rounded-button bg-primary px-6 py-3 text-small font-medium text-white transition-colors hover:bg-primary-deep active:scale-[0.98]"
          >
            กลับหน้าแรก
          </Link>
          <Link
            href={ROUTES.DASHBOARD}
            className="flex items-center justify-center rounded-button border border-border px-6 py-3 text-small font-medium text-text-primary transition-colors hover:bg-muted active:scale-[0.98]"
          >
            ดู Dashboard
          </Link>
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
