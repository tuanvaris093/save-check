import Image from "next/image";
import Link from "next/link";
import { ROUTES } from "@/lib/constants";
import { HomeFooter } from "@/components/layout/home-footer";
import {
  ASSESSMENT_TYPE_LABELS,
  ASSESSMENT_TYPE_DESCRIPTIONS,
} from "@/lib/constants";
import type { AssessmentType } from "@/types";
import { ClipboardCheck, HeartPulse, Star, ChevronRight } from "lucide-react";

const ASSESSMENT_ICONS: Record<
  AssessmentType,
  React.ComponentType<{ className?: string; strokeWidth?: number }>
> = {
  environment: ClipboardCheck,
  health_risk: HeartPulse,
  satisfaction: Star,
};

const ASSESSMENT_ICON_STYLES: Record<
  AssessmentType,
  { bg: string; color: string }
> = {
  environment: {
    bg: "linear-gradient(135deg, #E9FBF6, #F0FDFA)",
    color: "text-emerald-600",
  },
  health_risk: {
    bg: "linear-gradient(135deg, #FFF0F3, #FFF1F2)",
    color: "text-rose-500",
  },
  satisfaction: {
    bg: "linear-gradient(135deg, #FFF8E5, #FFFBEB)",
    color: "text-amber-500",
  },
};

const ASSESSMENT_CARDS: {
  type: AssessmentType;
  href: string;
}[] = [
  { type: "environment", href: ROUTES.ENVIRONMENT },
  { type: "health_risk", href: ROUTES.HEALTH_RISK },
];

export default function HomePage() {
  return (
    <div className="home-page app-mobile-shell pb-safe-nav flex min-h-dvh flex-col min-[1440px]:max-w-none">
      <main className="flex-1 px-4 py-5 min-[1440px]:px-8 min-[1440px]:px-12 min-[1440px]:py-8">
        <div className="mx-auto max-w-[1200px]">
          {/* Hero Section */}
          <section className="home-hero mb-6 text-left min-[1440px]:mb-9 min-[1440px]:flex min-[1440px]:min-h-[270px] min-[1440px]:items-center min-[1440px]:px-10">
            <div className="home-hero-copy max-w-xl">
              <div className="mb-5 flex items-center gap-3">
                <Image
                  src="/assets/logo_savecheck.webp"
                  alt="SafeCheck Logo"
                  width={64}
                  height={64}
                  className="h-16 w-16 rounded-2xl object-contain drop-shadow-lg"
                  priority
                />
                <div>
                  <p className="text-xl font-bold tracking-tight text-white">
                    SafeCheck
                  </p>
                  <p className="text-xs font-medium text-white/70">
                    Safety Assessment System
                  </p>
                </div>
              </div>
              <h1 className="max-w-md text-[26px] leading-[1.3] font-bold text-white min-[1440px]:text-[32px]">
                สภาพแวดล้อมที่ปลอดภัย
                <br />
                เริ่มได้จากการประเมิน
              </h1>
              <p className="home-hero-description mt-3 max-w-lg text-sm leading-relaxed text-white/80 min-[1440px]:text-base">
                ระบบประเมินสภาพแวดล้อมในการทำงาน อาการทางสุขภาพ
                และความพึงพอใจในการใช้แอป
              </p>
            </div>
            <Image
              src="/assets/safecheck-hero-worker.png"
              alt=""
              width={1152}
              height={1366}
              className="home-hero-worker"
              aria-hidden="true"
              priority
            />
            <div className="home-university-logo">
              <Image
                src="/assets/logo_u.webp"
                alt="ตรามหาวิทยาลัย"
                width={246}
                height={371}
                className="h-full w-full object-contain"
              />
            </div>
          </section>

          {/* Assessment Cards */}
          <div className="home-assessment-grid flex flex-col gap-4 min-[1440px]:grid min-[1440px]:grid-cols-2 min-[1440px]:gap-6">
            {ASSESSMENT_CARDS.map((card, index) => {
              const Icon = ASSESSMENT_ICONS[card.type];
              const iconStyle = ASSESSMENT_ICON_STYLES[card.type];
              return (
                <Link
                  key={card.type}
                  href={card.href}
                  className="assessment-menu-card glass-card glass-card-hover animate-slide-up group block p-4"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <div className="flex flex-row items-center gap-4 min-[1440px]:flex-col min-[1440px]:items-start min-[1440px]:gap-5">
                    <div
                      className="icon-container"
                      style={{ background: iconStyle.bg }}
                    >
                      <Icon
                        className={`h-6 w-6 ${iconStyle.color}`}
                        strokeWidth={2}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-card-title text-text-primary group-hover:text-primary font-bold transition-colors">
                        {ASSESSMENT_TYPE_LABELS[card.type]}
                      </h2>
                      <p className="text-small text-text-secondary mt-1 line-clamp-2 leading-relaxed min-[1440px]:mt-2 min-[1440px]:line-clamp-none">
                        {ASSESSMENT_TYPE_DESCRIPTIONS[card.type]}
                      </p>
                    </div>
                    <ChevronRight className="text-primary h-6 w-6 shrink-0 min-[1440px]:hidden" />
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Copyright & Credits Footer */}
          <HomeFooter />
        </div>
      </main>
    </div>
  );
}
