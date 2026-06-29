import Link from "next/link";
import { BottomNav } from "@/components/layout";
import { ROUTES } from "@/lib/constants";
import {
  ASSESSMENT_TYPE_LABELS,
  ASSESSMENT_TYPE_DESCRIPTIONS,
  ASSESSMENT_TYPE_ICONS,
} from "@/lib/constants";
import type { AssessmentType } from "@/types";

const ASSESSMENT_CARDS: {
  type: AssessmentType;
  href: string;
}[] = [
  { type: "environment", href: ROUTES.ENVIRONMENT },
  { type: "health_risk", href: ROUTES.HEALTH_RISK },
  { type: "satisfaction", href: ROUTES.SATISFACTION },
];

export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="flex-1 px-4 py-6">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-3 text-4xl">🛡️</div>
          <h1 className="text-page-title font-bold text-text-primary">
            Save Check
          </h1>
          <p className="mt-2 text-small leading-relaxed text-text-secondary">
            ระบบประเมินสภาพแวดล้อมในการทำงาน
            <br />
            ความเสี่ยงสุขภาพ และความพึงพอใจในการใช้แอป
          </p>
        </div>

        {/* Assessment Cards */}
        <div className="flex flex-col gap-4">
          {ASSESSMENT_CARDS.map((card, index) => (
            <Link
              key={card.type}
              href={card.href}
              className="group animate-slide-up rounded-card border border-border bg-surface p-5 shadow-sm transition-all hover:border-primary/30 hover:shadow-md active:scale-[0.98]"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <div className="flex items-start gap-4">
                <span className="text-3xl">
                  {ASSESSMENT_TYPE_ICONS[card.type]}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-card-title font-semibold text-text-primary group-hover:text-primary">
                    {ASSESSMENT_TYPE_LABELS[card.type]}
                  </h2>
                  <p className="mt-1.5 text-small leading-relaxed text-text-secondary">
                    {ASSESSMENT_TYPE_DESCRIPTIONS[card.type]}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Dashboard Link */}
        <div className="mt-8 text-center">
          <Link
            href={ROUTES.DASHBOARD}
            className="inline-flex items-center gap-2 rounded-button px-5 py-2.5 text-small font-medium text-primary transition-colors hover:bg-primary-soft active:scale-[0.98]"
          >
            📊 ดูรายงานสรุปผล (Dashboard)
          </Link>
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
