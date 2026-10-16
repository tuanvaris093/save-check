import Link from "next/link";
import { CheckCircle2, Home, BarChart3 } from "lucide-react";
import { ROUTES } from "@/lib/constants";

export default function CompletePage() {
  return (
    <div className="app-mobile-shell pb-safe-nav flex min-h-dvh flex-col">
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        <div className="result-overview-card glass-card animate-slide-up w-full max-w-md p-7 text-center">
          <div
            className="icon-container mx-auto mb-6"
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "20px",
              background:
                "linear-gradient(135deg, rgba(220, 252, 231, 0.95), rgba(240, 253, 244, 0.8))",
            }}
          >
            <CheckCircle2 className="text-success h-8 w-8" strokeWidth={2} />
          </div>
          <h1 className="text-page-title text-text-primary font-bold">
            ส่งข้อมูลเรียบร้อยแล้ว
          </h1>
          <p className="text-body text-text-secondary mt-3 leading-relaxed">
            ขอบคุณที่ร่วมทำแบบประเมิน
            <br />
            ข้อมูลของท่านได้ถูกบันทึกเรียบร้อยแล้ว
          </p>

          <div className="mt-8 flex flex-col gap-3">
            <Link
              href={ROUTES.HOME}
              className="btn-primary-gradient text-small flex items-center justify-center gap-2 px-4 py-2 font-medium"
            >
              <Home className="h-4 w-4" />
              กลับหน้าแรก
            </Link>
            <Link
              href={ROUTES.DASHBOARD}
              className="btn-secondary-glass text-small flex items-center justify-center gap-2 px-4 py-2 font-medium"
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
