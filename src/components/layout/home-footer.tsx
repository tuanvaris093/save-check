"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { CreditsModal } from "@/components/layout/credits-modal";

export function HomeFooter() {
  const [isCreditsOpen, setIsCreditsOpen] = useState(false);

  return (
    <>
      <footer className="mt-14 mb-6 text-center animate-slide-up" style={{ animationDelay: "260ms" }}>
        <button
          type="button"
          onClick={() => setIsCreditsOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 hover:bg-white border border-slate-200/80 shadow-xs text-text-secondary hover:text-primary transition-all active:scale-95 group mb-3"
        >
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-soft text-primary">
            <Info className="h-3.5 w-3.5" />
          </div>
          <span className="text-small font-medium text-text-primary group-hover:text-primary">
            ข้อมูลผู้จัดทำ & ลิขสิทธิ์
          </span>
          <span className="text-[10px] bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full font-semibold">
            วสส.ยะลา
          </span>
        </button>

        <p className="text-[11px] text-text-muted">
          สาขาวิชาอาชีวอนามัยและความปลอดภัย • วิทยาลัยการสาธารณสุขสิรินธร จังหวัดยะลา
        </p>
        <p className="text-[10px] text-text-muted/70 mt-1">
          © 2026 SafeCheck System. All rights reserved.
        </p>
      </footer>

      <CreditsModal
        isOpen={isCreditsOpen}
        onClose={() => setIsCreditsOpen(false)}
      />
    </>
  );
}
