"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LoadingState } from "@/components/ui";
import { PageHeader } from "@/components/layout";
import { SatisfactionWizard } from "@/components/satisfaction/satisfaction-wizard";
function GroupResolver() {
  const params = useSearchParams(),
    group = params.get("group");
  if (group === "health" || group === "environment")
    return (
      <SatisfactionWizard
        key={group}
        group={group}
        editCode={params.get("edit")}
        base={params.get("base")}
      />
    );
  return (
    <div className="app-mobile-shell pb-safe-nav mx-auto min-h-dvh max-w-[800px]">
      <PageHeader title="เลือกกลุ่มสำหรับความพึงพอใจ" showBack backHref="/" />
      <main className="grid gap-4 p-5 min-[1440px]:grid-cols-2">
        <p className="min-[1440px]:col-span-2">
          {group
            ? "กลุ่มที่ระบุไม่ถูกต้อง กรุณาเลือกใหม่"
            : "กรุณาเลือกกลุ่มที่ต้องการประเมิน"}
        </p>
        {(["environment", "health"] as const).map((g) => (
          <a
            key={g}
            className="glass-card glass-card-hover p-5"
            href={`/assessment/satisfaction?group=${g}&returnTo=${encodeURIComponent("/assessment/satisfaction")}`}
          >
            {g === "environment" ? "สภาพแวดล้อมในการทำงาน" : "อาการทางสุขภาพ"}
          </a>
        ))}
      </main>
    </div>
  );
}
export default function SatisfactionPage() {
  return (
    <Suspense fallback={<LoadingState text="กำลังเตรียมแบบประเมิน..." />}>
      <GroupResolver />
    </Suspense>
  );
}
