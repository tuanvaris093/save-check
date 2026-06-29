import Link from "next/link";
import { PageHeader } from "@/components/layout";
import { ROUTES } from "@/lib/constants";
import {
  ASSESSMENT_CATEGORY_LABELS,
  ASSESSMENT_CATEGORY_ICONS,
} from "@/lib/constants";
import type { AssessmentCategory } from "@/types";

const ENVIRONMENT_CATEGORIES: {
  category: AssessmentCategory;
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
    <div className="flex min-h-dvh flex-col">
      <PageHeader
        title="ประเมินสภาพแวดล้อมในการทำงาน"
        subtitle="เลือกหัวข้อที่ต้องการประเมิน"
        showBack
        backHref={ROUTES.HOME}
      />

      <main className="flex-1 px-4 py-5">
        <div className="flex flex-col gap-4">
          {ENVIRONMENT_CATEGORIES.map((item, index) => (
            <Link
              key={item.category}
              href={`${ROUTES.ENVIRONMENT_FORM}?category=${item.category}`}
              className="group animate-slide-up rounded-card border border-border bg-surface p-5 shadow-sm transition-all hover:border-primary/30 hover:shadow-md active:scale-[0.98]"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <div className="flex items-start gap-4">
                <span className="text-3xl">
                  {ASSESSMENT_CATEGORY_ICONS[item.category]}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-card-title font-semibold text-text-primary group-hover:text-primary">
                    {ASSESSMENT_CATEGORY_LABELS[item.category]}
                  </h2>
                  <p className="mt-1.5 text-small leading-relaxed text-text-secondary">
                    {item.description}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
