"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutDashboard, Info, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";
import { CreditsModal } from "@/components/layout/credits-modal";

const SIDEBAR_ITEMS = [
  {
    href: ROUTES.HOME,
    label: "หน้าแรก",
    icon: Home,
  },
  {
    href: ROUTES.DASHBOARD,
    label: "รายงานสรุปผล",
    icon: LayoutDashboard,
  },
];

export function GlassSidebar() {
  const pathname = usePathname();
  const [isCreditsOpen, setIsCreditsOpen] = useState(false);

  return (
    <>
      <aside
        className="hidden md:flex md:flex-col md:shrink-0"
        style={{
          width: "260px",
          minHeight: "calc(100vh - 32px)",
          margin: "16px",
          borderRadius: "32px",
          background:
            "linear-gradient(180deg, rgba(255, 255, 255, 0.88), rgba(240, 249, 255, 0.72))",
          backdropFilter: "blur(22px)",
          WebkitBackdropFilter: "blur(22px)",
          border: "1px solid rgba(148, 163, 184, 0.20)",
          boxShadow:
            "0 24px 60px rgba(15, 99, 199, 0.12), 0 8px 24px rgba(15, 23, 42, 0.06)",
        }}
      >
        {/* Brand Panel */}
        <div className="p-6 pb-4">
          <div
            className="flex items-center gap-3 rounded-[24px] px-5 py-4"
            style={{
              background: "linear-gradient(135deg, #0F63C7, #1EA7FF)",
            }}
          >
            <Image
              src="/assets/logo_savecheck.webp"
              alt="SafeCheck Logo"
              width={44}
              height={44}
              className="h-11 w-11 shrink-0 rounded-xl object-contain drop-shadow-sm"
              priority
            />
            <div>
              <p className="text-[15px] font-bold text-white">SafeCheck</p>
              <p className="text-[11px] text-white/70">Assessment System</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 pt-2">
          <div className="flex flex-col gap-1">
            {SIDEBAR_ITEMS.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-[999px] px-4 py-3 text-[14px] font-medium transition-all",
                    isActive
                      ? "text-primary"
                      : "text-text-secondary hover:text-text-primary hover:bg-white/50",
                  )}
                  style={
                    isActive
                      ? {
                          background: "rgba(224, 242, 254, 0.95)",
                          boxShadow:
                            "inset 0 0 0 1px rgba(14, 165, 233, 0.14)",
                        }
                      : undefined
                  }
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className="h-[20px] w-[20px]" strokeWidth={2.25} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer / Credits Trigger */}
        <div className="p-4 pt-2">
          <button
            type="button"
            onClick={() => setIsCreditsOpen(true)}
            className="w-full text-left rounded-2xl bg-white/60 hover:bg-white/90 border border-slate-200/70 p-3.5 transition-all group hover:shadow-xs active:scale-[0.98]"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-primary flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-primary" />
                ผู้จัดทำ & ลิขสิทธิ์
              </span>
              <ChevronRight className="h-3.5 w-3.5 text-text-muted group-hover:text-primary transition-colors" />
            </div>
            <p className="text-[10px] text-text-secondary leading-tight">
              วสส.ยะลา • อาชีวอนามัยฯ รุ่น 3
            </p>
            <p className="text-[9px] text-text-muted mt-1">
              © 2026 SafeCheck System
            </p>
          </button>
        </div>
      </aside>

      <CreditsModal
        isOpen={isCreditsOpen}
        onClose={() => setIsCreditsOpen(false)}
      />
    </>
  );
}
