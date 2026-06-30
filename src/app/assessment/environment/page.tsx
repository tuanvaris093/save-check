import Link from "next/link";
import { PageHeader } from "@/components/layout";
import { ROUTES } from "@/lib/constants";
import { ASSESSMENT_CATEGORY_LABELS } from "@/lib/constants";
import type { AssessmentCategory } from "@/types";
import { Sun, Volume2, ThermometerSun, ChevronRight } from "lucide-react";

const CATEGORY_ICONS: Record<Exclude<AssessmentCategory, "general">, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  light: Sun,
  noise: Volume2,
  heat: ThermometerSun,
};

const CATEGORY_STYLES: Record<Exclude<AssessmentCategory, "general">, { bg: string; color: string }> = {
  light: {
    bg: "linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(245, 158, 11, 0.05))",
    color: "text-amber-600",
  },
  noise: {
    bg: "linear-gradient(135deg, rgba(20, 184, 166, 0.15), rgba(20, 184, 166, 0.05))",
    color: "text-teal-600",
  },
  heat: {
    bg: "linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05))",
    color: "text-danger",
  },
};

const ENVIRONMENT_CATEGORIES: {
  category: Exclude<AssessmentCategory, "general">;
  description: string;
}[] = [
  {
    category: "light",
    description: "ประเมินสภาพแวดล้อมด้านแสงสว่างในพื้นที่ทำงาน",
  },
  {
    category: "noise",
    description: "ประเมินสภาพแวดล้อมด้านเสียงในพื้นที่ทำงาน",
  },
  {
    category: "heat",
    description: "ประเมินสภาพแวดล้อมด้านความร้อนในพื้นที่ทำงาน",
  },
];

export default function EnvironmentPage() {
  return (
    <div className="flex min-h-dvh flex-col pb-safe-nav max-w-[800px] mx-auto w-full">
      <PageHeader
        title="ประเมินสภาพแวดล้อมในการทำงาน"
        subtitle="เลือกหัวข้อที่ต้องการประเมิน"
        showBack
        backHref={ROUTES.HOME}
      />

      <main className="flex-1 px-4 py-5 md:px-8">
        <div className="mx-auto max-w-[800px] flex flex-col gap-4">
          {ENVIRONMENT_CATEGORIES.map((item, index) => {
            const Icon = CATEGORY_ICONS[item.category];
            const styles = CATEGORY_STYLES[item.category];
            return (
              <Link
                key={item.category}
                href={`${ROUTES.ENVIRONMENT_FORM}?category=${item.category}`}
                className="glass-card glass-card-hover p-5 animate-slide-up block"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <div className="flex items-center gap-4">
                  <div className="icon-container" style={{ background: styles.bg }}>
                    <Icon className={`h-6 w-6 ${styles.color}`} strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-card-title font-semibold text-text-primary">
                      {ASSESSMENT_CATEGORY_LABELS[item.category]}
                    </h2>
                    <p className="mt-1 text-small leading-relaxed text-text-secondary">
                      {item.description}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-text-muted shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
