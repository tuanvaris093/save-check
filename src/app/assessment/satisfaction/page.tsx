import { PageHeader } from "@/components/layout";
import { ROUTES } from "@/lib/constants";

export default function SatisfactionPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <PageHeader
        title="ประเมินความพึงพอใจในการใช้แอป"
        subtitle="แบบประเมิน 4 ด้าน"
        showBack
        backHref={ROUTES.HOME}
      />

      <main className="flex-1 px-4 py-5">
        <div className="animate-fade-in rounded-card border border-border bg-surface p-6 text-center shadow-sm">
          <span className="text-5xl">⭐</span>
          <h2 className="mt-4 text-section-title font-semibold text-text-primary">
            แบบประเมินความพึงพอใจ
          </h2>
          <p className="mt-2 text-small leading-relaxed text-text-secondary">
            ประเมินความพึงพอใจด้านเนื้อหา การออกแบบ
            <br />
            การใช้งาน และประโยชน์ของแอป
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {["Accuracy", "Design", "Usability", "Usefulness"].map((label) => (
              <span
                key={label}
                className="rounded-badge bg-primary-soft px-3 py-1 text-caption font-medium text-primary"
              >
                {label}
              </span>
            ))}
          </div>
          <p className="mt-4 text-caption text-text-secondary">
            ฟอร์มจะพร้อมใช้งานใน Phase 4-7
          </p>
        </div>
      </main>
    </div>
  );
}
