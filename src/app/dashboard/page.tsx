import Link from "next/link";
import { PageHeader, BottomNav } from "@/components/layout";
import { ROUTES } from "@/lib/constants";

export default function DashboardPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <PageHeader
        title="Dashboard"
        subtitle="รายงานสรุปผลการประเมิน"
      />

      <main className="flex-1 px-4 py-5">
        {/* Summary Cards */}
        <div className="mb-6 grid grid-cols-2 gap-3">
          <div className="animate-fade-in rounded-card border border-border bg-surface p-4 shadow-sm">
            <p className="text-caption text-text-secondary">
              ประเมินทั้งหมด
            </p>
            <p className="mt-1 text-page-title font-bold text-text-primary">
              0
            </p>
          </div>
          <div className="animate-fade-in rounded-card border border-border bg-surface p-4 shadow-sm">
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
              { label: "สภาพแวดล้อม", count: 0, icon: "📋" },
              { label: "ความเสี่ยงสุขภาพ", count: 0, icon: "🩺" },
              { label: "ความพึงพอใจ", count: 0, icon: "⭐" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-input border border-border bg-surface px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span>{item.icon}</span>
                  <span className="text-small text-text-primary">
                    {item.label}
                  </span>
                </div>
                <span className="text-small font-medium text-text-secondary">
                  {item.count} รายการ
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Submission List */}
        <div>
          <h2 className="mb-3 text-card-title font-semibold text-text-primary">
            รายการประเมินล่าสุด
          </h2>
          <div className="animate-fade-in rounded-card border border-border bg-surface p-8 text-center shadow-sm">
            <div className="mb-3 text-4xl">📭</div>
            <p className="text-small text-text-secondary">
              ยังไม่มีรายการประเมิน
            </p>
            <Link
              href={ROUTES.HOME}
              className="mt-4 inline-block rounded-button bg-primary px-5 py-2.5 text-small font-medium text-white transition-colors hover:bg-primary-deep active:scale-[0.98]"
            >
              เริ่มประเมิน
            </Link>
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
