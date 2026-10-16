import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { CategoryIcon } from "./category-icon";
import { PageHeader } from "@/components/layout";
import { ROUTES, ASSESSMENT_CATEGORY_LABELS } from "@/lib/constants";
export function GroupMenu({ group }: { group: "environment" | "health" }) {
  const health = group === "health";
  return (
    <div className="app-mobile-shell pb-safe-nav mx-auto flex min-h-dvh w-full max-w-[900px] flex-col">
      <PageHeader
        title={
          health ? "ประเมินอาการทางสุขภาพ" : "ประเมินสภาพแวดล้อมในการทำงาน"
        }
        subtitle="เลือกหัวข้อที่ต้องการประเมิน"
        showBack
        backHref={ROUTES.HOME}
      />
      <main className="flex-1 px-4 py-5 min-[1440px]:px-8">
        <div className="assessment-topic-grid grid grid-cols-1 gap-4 min-[1440px]:grid-cols-2">
          {(["light", "noise", "heat", "general"] as const).map((category) => {
            const satisfaction = category === "general",
              title = satisfaction
                ? "ประเมินความพึงพอใจในการใช้แอป"
                : `${health ? "อาการทางสุขภาพด้าน" : "สภาพแวดล้อมด้าน"}${ASSESSMENT_CATEGORY_LABELS[category]}`;
            return (
              <Link
                key={category}
                href={
                  satisfaction
                    ? `${ROUTES.SATISFACTION}?group=${group}`
                    : `${health ? ROUTES.HEALTH_RISK_FORM : ROUTES.ENVIRONMENT_FORM}?category=${category}`
                }
                className="category-card glass-card glass-card-hover block p-4"
              >
                <div className="flex items-center gap-4">
                  <CategoryIcon category={category} />
                  <div className="min-w-0 flex-1">
                    <h2 className="text-card-title text-text-primary font-semibold">
                      {title}
                    </h2>
                    <p className="text-small text-text-secondary mt-1">
                      {satisfaction
                        ? "ตอบได้โดยไม่ต้องทำแบบประเมินอื่นก่อน"
                        : `ประเมิน${health ? "อาการของท่าน" : "พื้นที่ทำงาน"}ด้าน${ASSESSMENT_CATEGORY_LABELS[category]}`}
                    </p>
                  </div>
                  <ChevronRight className="text-primary h-5 w-5 shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
