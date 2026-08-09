import Link from "next/link";
import { AlertTriangle, Home } from "lucide-react";
import { PageHeader } from "@/components/layout";
import { ROUTES } from "@/lib/constants";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col pb-safe-nav">
      <PageHeader title="ไม่พบหน้านี้" showBack backHref={ROUTES.HOME} />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        <div className="text-center">
          <div
            className="icon-container mx-auto mb-4"
            style={{
              background:
                "linear-gradient(135deg, rgba(254, 243, 199, 0.95), rgba(255, 251, 235, 0.8))",
            }}
          >
            <AlertTriangle className="h-7 w-7 text-warning" strokeWidth={2} />
          </div>
          <h2 className="text-section-title font-semibold text-text-primary">
            404 - ไม่พบหน้าที่ต้องการ
          </h2>
          <p className="mt-2 text-small text-text-secondary">
            ขออภัย ไม่พบหน้าที่คุณกำลังค้นหา
          </p>
          <Link
            href={ROUTES.HOME}
            className="mt-6 inline-flex items-center gap-2 btn-primary-gradient px-6 py-3 text-small font-medium"
          >
            <Home className="h-4 w-4" />
            กลับหน้าแรก
          </Link>
        </div>
      </main>
    </div>
  );
}
