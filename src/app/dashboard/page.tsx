import Link from "next/link";
import {
  ClipboardCheck,
  HeartPulse,
  Star,
  ListChecks,
  Home,
} from "lucide-react";
import { PageHeader } from "@/components/layout";
import { ROUTES } from "@/lib/constants";

export default function DashboardPage() {
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
                0
              </p>
            </div>
            <div className="glass-card p-4 animate-fade-in">
              <p className="text-caption text-text-secondary">
                ความพึงพอใจเฉลี่ย
              </p>
              <p className="mt-1 text-page-title font-bold text-text-primary">
                —
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
                { label: "สภาพแวดล้อม", count: 0, icon: ClipboardCheck },
                { label: "ความเสี่ยงสุขภาพ", count: 0, icon: HeartPulse },
                { label: "ความพึงพอใจ", count: 0, icon: Star },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="glass-card flex items-center justify-between px-4 py-3"
                    style={{ borderRadius: '1rem' }}
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
                      {item.count} รายการ
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Submission List */}
          <div>
            <h2 className="mb-3 text-card-title font-semibold text-text-primary">
              รายการประเมินล่าสุด
            </h2>
            <div className="glass-card p-8 text-center animate-fade-in">
              <div className="icon-container mx-auto mb-3">
                <ListChecks className="h-6 w-6" strokeWidth={2} />
              </div>
              <p className="text-small text-text-secondary">
                ยังไม่มีรายการประเมิน
              </p>
              <Link
                href={ROUTES.HOME}
                className="mt-4 inline-flex items-center gap-2 btn-primary-gradient px-5 py-2.5 text-small font-medium"
                style={{ height: 'auto' }}
              >
                <Home className="h-4 w-4" />
                เริ่มประเมิน
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
