"use client";
import { PageHeader } from "@/components/layout";
import { AssessmentDataTable } from "@/components/dashboard";
import { BarChart3 } from "lucide-react";
export default function DashboardPage() {
  return (
    <div className="app-mobile-shell pb-safe-nav flex min-h-dvh flex-col min-[1440px]:max-w-none">
      <PageHeader
        title="Dashboard"
        subtitle="สรุปผลและประวัติการประเมิน"
        showBrand
        rightAction={
          <div className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-white/20 bg-white/15 text-white shadow-lg backdrop-blur-md">
            <BarChart3 className="h-6 w-6" strokeWidth={2.25} />
          </div>
        }
        className="dashboard-hero"
      />
      <main className="flex-1 px-4 py-5 min-[1440px]:px-8">
        <div className="mx-auto max-w-[1200px]">
          <AssessmentDataTable initialPageSize={10} />
        </div>
      </main>
    </div>
  );
}
