import Link from "next/link";
import { ROUTES } from "@/lib/constants";

export default function CompletePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        <div className="animate-slide-up text-center">
          <div className="mb-6 text-6xl">✅</div>
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
              className="flex items-center justify-center rounded-button bg-primary px-6 py-3 text-small font-medium text-white transition-colors hover:bg-primary-deep active:scale-[0.98]"
            >
              กลับหน้าแรก
            </Link>
            <Link
              href={ROUTES.DASHBOARD}
              className="flex items-center justify-center rounded-button border border-border px-6 py-3 text-small font-medium text-text-primary transition-colors hover:bg-muted active:scale-[0.98]"
            >
              ดู Dashboard
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
