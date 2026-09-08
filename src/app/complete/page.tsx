import Link from "next/link";
import { CheckCircle2, Home, BarChart3 } from "lucide-react";
import { ROUTES } from "@/lib/constants";

export default function CompletePage() {
  return (
    <div className="app-mobile-shell flex min-h-dvh flex-col pb-safe-nav">
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        <div className="result-overview-card glass-card animate-slide-up w-full max-w-md p-7 text-center">
          <div className="icon-container mx-auto mb-6" style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'linear-gradient(135deg, rgba(220, 252, 231, 0.95), rgba(240, 253, 244, 0.8))' }}>
            <CheckCircle2 className="h-8 w-8 text-success" strokeWidth={2} />
          </div>
          <h1 className="text-page-title font-bold text-text-primary">
            ส่งข้อมูลเรียบร้อยแล้ว
          </h1>
          <p className="mt-3 text-body leading-relaxed text-text-secondary">
            ขอบคุณที่ร่วมทำแบบประเมิน
            <br />
            ข้อมูลของท่านได้ถูกบันทึกเรียบร้อยแล้ว
          </p>

          <div className="mt-8 flex flex-col gap-3">
            <Link
              href={ROUTES.HOME}
              className="flex items-center justify-center gap-2 btn-primary-gradient px-6 py-3 text-small font-medium"
            >
              <Home className="h-4 w-4" />
              กลับหน้าแรก
            </Link>
            <Link
              href={ROUTES.DASHBOARD}
              className="flex items-center justify-center gap-2 btn-secondary-glass px-6 py-3 text-small font-medium"
            >
              <BarChart3 className="h-4 w-4" />
              ดู Dashboard
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
