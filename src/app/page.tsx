import Image from "next/image";
import Link from "next/link";
import { ROUTES } from "@/lib/constants";
import { HomeFooter } from "@/components/layout/home-footer";
import {
  ASSESSMENT_TYPE_LABELS,
  ASSESSMENT_TYPE_DESCRIPTIONS,
} from "@/lib/constants";
import type { AssessmentType } from "@/types";
import {
  ClipboardCheck,
  HeartPulse,
  Star,
  LayoutDashboard,
  ChevronRight,
} from "lucide-react";

const ASSESSMENT_ICONS: Record<AssessmentType, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  environment: ClipboardCheck,
  health_risk: HeartPulse,
  satisfaction: Star,
};

const ASSESSMENT_ICON_STYLES: Record<AssessmentType, { bg: string; color: string }> = {
  environment: {
    bg: "linear-gradient(135deg, rgba(224, 242, 254, 0.95), rgba(240, 249, 255, 0.8))",
    color: "text-primary",
  },
  health_risk: {
    bg: "linear-gradient(135deg, rgba(254, 226, 226, 0.95), rgba(254, 242, 242, 0.8))",
    color: "text-danger",
  },
  satisfaction: {
    bg: "linear-gradient(135deg, rgba(254, 243, 199, 0.95), rgba(255, 251, 235, 0.8))",
    color: "text-warning",
  },
};

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
    <div className="flex min-h-dvh flex-col pb-safe-nav">
      <main className="flex-1 px-4 py-8 md:px-8 lg:px-12">
        <div className="mx-auto max-w-[1200px]">
          {/* Hero Section */}
          <div className="mb-10 text-center md:text-left md:mb-12">
            <div className="mx-auto mb-4 md:mx-0 w-fit">
              <Image
                src="/assets/logo_savecheck.webp"
                alt="SafeCheck Logo"
                width={64}
                height={64}
                className="h-16 w-16 rounded-2xl object-contain drop-shadow-md"
                priority
              />
            </div>
            <h1 className="text-h2 md:text-h1 font-bold text-text-primary">
              SafeCheck
            </h1>
            <p className="mt-2 text-small leading-relaxed text-text-secondary max-w-md mx-auto md:mx-0">
              ระบบประเมินสภาพแวดล้อมในการทำงาน
              ความเสี่ยงสุขภาพ และความพึงพอใจในการใช้แอป
            </p>
          </div>

          {/* Assessment Cards */}
          <div className="flex flex-col gap-4 md:grid md:grid-cols-3 md:gap-6">
            {ASSESSMENT_CARDS.map((card, index) => {
              const Icon = ASSESSMENT_ICONS[card.type];
              const iconStyle = ASSESSMENT_ICON_STYLES[card.type];
              return (
                <Link
                  key={card.type}
                  href={card.href}
                  className="glass-card glass-card-hover p-5 md:p-6 animate-slide-up block group"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <div className="flex flex-row md:flex-col items-center md:items-start gap-4 md:gap-5">
                    <div
                      className="icon-container"
                      style={{ background: iconStyle.bg }}
                    >
                      <Icon className={`h-6 w-6 ${iconStyle.color}`} strokeWidth={2} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-card-title font-semibold text-text-primary group-hover:text-primary transition-colors">
                        {ASSESSMENT_TYPE_LABELS[card.type]}
                      </h2>
                      <p className="mt-1 md:mt-2 text-small leading-relaxed text-text-secondary line-clamp-2 md:line-clamp-none">
                        {ASSESSMENT_TYPE_DESCRIPTIONS[card.type]}
                      </p>
                    </div>
                    <ChevronRight className="h-6 w-6 text-primary shrink-0 md:hidden" />
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Dashboard Link */}
          <div className="mt-8 md:mt-10">
            <Link
              href={ROUTES.DASHBOARD}
              className="glass-card glass-card-hover p-5 md:p-6 flex items-center gap-4 animate-slide-up group"
              style={{ animationDelay: "200ms" }}
            >
              <div className="icon-container" style={{ background: "linear-gradient(135deg, rgba(220, 252, 231, 0.95), rgba(240, 253, 244, 0.8))" }}>
                <LayoutDashboard className="h-6 w-6 text-success" strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-card-title font-semibold text-text-primary group-hover:text-success transition-colors">
                  ดูรายงานสรุปผล
                </h2>
                <p className="mt-1 text-small text-text-secondary">
                  Dashboard ภาพรวมการประเมินทั้งหมด
                </p>
              </div>
              <ChevronRight className="h-6 w-6 text-primary shrink-0 md:hidden" />
            </Link>
          </div>

          {/* Copyright & Credits Footer */}
          <HomeFooter />
        </div>
      </main>
    </div>
  );
}
