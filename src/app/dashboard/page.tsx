"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ClipboardCheck,
  HeartPulse,
  Star,
  Plus,
} from "lucide-react";
import { PageHeader } from "@/components/layout";
import {
  AssessmentDataTable,
  type AssessmentRecord,
} from "@/components/dashboard";
import { ROUTES } from "@/lib/constants";
import { getDashboardSubmissions } from "@/lib/api";

export default function DashboardPage() {
  const [submissions, setSubmissions] = useState<AssessmentRecord[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let hasLocal = false;
    // 1. Check localStorage first for instant display
    try {
      const stored = localStorage.getItem("save_check_submissions");
      if (stored) {
        const list = JSON.parse(stored);
        if (Array.isArray(list) && list.length > 0) {
          setSubmissions(list);
          setIsLoaded(true);
          hasLocal = true;
        }
      }
    } catch (err) {
      console.error("Failed to load dashboard submissions from localStorage", err);
    }

    // 2. Fetch fresh submissions from Cloudflare Workers API
    getDashboardSubmissions({ limit: 50 })
      .then((res) => {
        if (res.success && res.data?.items && res.data.items.length > 0) {
          setSubmissions(res.data.items as any);
          setIsLoaded(true);
        } else if (!hasLocal) {
          setSubmissions([]);
          setIsLoaded(true);
        }
      })
      .catch((err) => {
        console.warn("API unavailable, using local dashboard cache", err);
        if (!hasLocal) {
          setSubmissions([]);
        }
        setIsLoaded(true);
      });
  }, []);

  const totalCount = submissions.length;
  const envCount = submissions.filter((s) => s.assessment_type === "environment").length;
  const healthCount = submissions.filter((s) => s.assessment_type === "health_risk").length;
  const satCount = submissions.filter((s) => s.assessment_type === "satisfaction").length;

  return (
    <div className="flex min-h-dvh flex-col pb-safe-nav">
      <PageHeader
        title="Dashboard"
        subtitle="รายงานสรุปผลการประเมิน"
      />

      <main className="flex-1 px-4 py-5 md:px-8">
        <div className="mx-auto max-w-[1200px]">
          {/* Summary Cards */}
          <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <div className="glass-card p-4 animate-fade-in">
              <p className="text-caption text-text-secondary">
                ประเมินทั้งหมด
              </p>
              <p className="mt-1 text-page-title font-bold text-text-primary">
                {isLoaded ? totalCount : "—"}
              </p>
            </div>
            <div className="glass-card p-4 animate-fade-in">
              <p className="text-caption text-text-secondary">
                ตรวจวัดสภาพแวดล้อม
              </p>
              <p className="mt-1 text-page-title font-bold text-emerald-600">
                {isLoaded ? envCount : "—"}
              </p>
            </div>
            <div className="glass-card p-4 animate-fade-in">
              <p className="text-caption text-text-secondary">
                ความเสี่ยงสุขภาพ
              </p>
              <p className="mt-1 text-page-title font-bold text-primary">
                {isLoaded ? healthCount : "—"}
              </p>
            </div>
            <div className="glass-card p-4 animate-fade-in">
              <p className="text-caption text-text-secondary">
                ความพึงพอใจเฉลี่ย
              </p>
              <p className="mt-1 text-page-title font-bold text-text-primary">
                4.8 / 5
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
                { label: "สภาพแวดล้อม", count: envCount, icon: ClipboardCheck },
                { label: "ความเสี่ยงสุขภาพ", count: healthCount, icon: HeartPulse },
                { label: "ความพึงพอใจ", count: satCount, icon: Star },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="glass-card flex items-center justify-between px-4 py-3"
                    style={{ borderRadius: "1rem" }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="icon-container icon-container-sm">
                        <Icon className="h-5 w-5" strokeWidth={2} />
                      </div>
                      <span className="text-small text-text-primary">
                        {item.label}
                      </span>
                    </div>
                    <span className="text-small font-medium text-text-secondary">
                      {isLoaded ? item.count : 0} รายการ
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Assessment Data Table Section */}
          <div className="mb-8 pb-20 md:pb-6">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-card-title font-semibold text-text-primary">
                  รายการประเมินล่าสุด
                </h2>
                <p className="text-caption text-text-secondary truncate">
                  รายงานผลประเมิน พร้อมค้นหาและแบ่งหน้า
                </p>
              </div>
              <Link
                href={ROUTES.HOME}
                className="inline-flex items-center gap-1 rounded-button bg-primary px-3 py-1.5 text-caption font-medium text-white hover:bg-primary-deep shadow-sm active:scale-95 transition-all whitespace-nowrap shrink-0"
              >
                <Plus className="h-3.5 w-3.5 shrink-0" />
                <span>ประเมินใหม่</span>
              </Link>
            </div>

            <AssessmentDataTable data={submissions} initialPageSize={5} />
          </div>
        </div>
      </main>
    </div>
  );
}
