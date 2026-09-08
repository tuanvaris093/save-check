"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ClipboardCheck,
  HeartPulse,
  Star,
  Layers3,
  BarChart3,
} from "lucide-react";
import { PageHeader } from "@/components/layout";
import {
  AssessmentDataTable,
  type AssessmentRecord,
} from "@/components/dashboard";
import { ROUTES } from "@/lib/constants";
import {
  getDashboardSummary,
  getDashboardSubmissions,
  type DashboardSummaryData,
} from "@/lib/api";

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);

    getDashboardSummary()
      .then((summaryRes) => {
        if (summaryRes.success && summaryRes.data) {
          setSummary(summaryRes.data);
        }
      })
      .catch((err) => {
        console.error("Failed to load dashboard summary from API", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const totalCount = summary ? summary.total_submissions : 0;
  const envCount = summary ? summary.by_type.environment : 0;
  const healthCount = summary ? summary.by_type.health_risk : 0;
  const satCount = summary ? summary.by_type.satisfaction : 0;
  const satAvg =
    summary && summary.satisfaction_avg > 0
      ? `${summary.satisfaction_avg.toFixed(1)} / 5`
      : "—";

  return (
    <div className="app-mobile-shell flex min-h-dvh flex-col pb-safe-nav md:max-w-none">
      <PageHeader
        title="Dashboard"
        subtitle="รายงานสรุปผลการประเมิน"
        showBrand
        rightAction={
          <div className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-white/20 bg-white/15 text-white shadow-lg backdrop-blur-md">
            <BarChart3 className="h-6 w-6" strokeWidth={2.25} />
          </div>
        }
        className="dashboard-hero"
      />

      <main className="flex-1 px-4 py-5 md:px-8">
        <div className="mx-auto max-w-[1200px]">
          {/* Summary Cards */}
          <div className="mb-7 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            <div className="kpi-card glass-card p-4 animate-fade-in">
              <div className="flex items-start justify-between gap-2">
                <p className="text-caption font-semibold text-text-secondary">ประเมินทั้งหมด</p>
                <div className="icon-container icon-container-sm icon-primary"><Layers3 className="h-5 w-5" /></div>
              </div>
              <p className="mt-2 text-[28px] font-bold leading-none text-primary">
                {!isLoading ? totalCount : "—"}
              </p>
              <span className="mt-1.5 block text-[11px] font-medium text-text-muted">รายการ</span>
            </div>
            <div className="kpi-card glass-card p-4 animate-fade-in">
              <div className="flex items-start justify-between gap-2">
                <p className="text-caption font-semibold text-text-secondary">ตรวจวัดสภาพแวดล้อม</p>
                <div className="icon-container icon-container-sm icon-environment"><ClipboardCheck className="h-5 w-5" /></div>
              </div>
              <p className="mt-2 text-[28px] font-bold leading-none text-emerald-600">
                {!isLoading ? envCount : "—"}
              </p>
              <span className="mt-1.5 block text-[11px] font-medium text-text-muted">รายการ</span>
            </div>
            <div className="kpi-card glass-card p-4 animate-fade-in">
              <div className="flex items-start justify-between gap-2">
                <p className="text-caption font-semibold text-text-secondary">ความเสี่ยงสุขภาพ</p>
                <div className="icon-container icon-container-sm icon-health"><HeartPulse className="h-5 w-5" /></div>
              </div>
              <p className="mt-2 text-[28px] font-bold leading-none text-rose-500">
                {!isLoading ? healthCount : "—"}
              </p>
              <span className="mt-1.5 block text-[11px] font-medium text-text-muted">รายการ</span>
            </div>
            <div className="kpi-card glass-card p-4 animate-fade-in">
              <div className="flex items-start justify-between gap-2">
                <p className="text-caption font-semibold text-text-secondary">ความพึงพอใจเฉลี่ย</p>
                <div className="icon-container icon-container-sm icon-satisfaction"><Star className="h-5 w-5" /></div>
              </div>
              <p className="mt-2 text-[28px] font-bold leading-none text-amber-500">
                {!isLoading ? satAvg : "—"}
              </p>
            </div>
          </div>

          {/* By Type Summary */}
          <div className="mb-6">
            <h2 className="mb-3 text-card-title font-semibold text-text-primary">
              แยกตามประเภท
            </h2>
            <div className="flex flex-col gap-2">
              {[
                { label: "สภาพแวดล้อม", count: envCount, icon: ClipboardCheck, color: "icon-environment" },
                { label: "ความเสี่ยงสุขภาพ", count: healthCount, icon: HeartPulse, color: "icon-health" },
                { label: "ความพึงพอใจ", count: satCount, icon: Star, color: "icon-satisfaction" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="glass-card flex items-center justify-between px-4 py-3"
                    style={{ borderRadius: "1rem" }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`icon-container icon-container-sm ${item.color}`}>
                        <Icon className="h-5 w-5" strokeWidth={2} />
                      </div>
                      <span className="text-small text-text-primary">
                        {item.label}
                      </span>
                    </div>
                    <span className="text-small font-medium text-text-secondary">
                      {!isLoading ? item.count : 0} รายการ
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Assessment Data Table Section */}
          <div className="mb-8 pb-20 md:pb-6">
            <AssessmentDataTable initialPageSize={10} />
          </div>
        </div>
      </main>
    </div>
  );
}
