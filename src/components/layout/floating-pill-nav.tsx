"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const NAV_ITEMS = [
  {
    href: ROUTES.HOME,
    label: "หน้าแรก",
    icon: Home,
  },
  {
    href: ROUTES.DASHBOARD,
    label: "รายงาน",
    icon: LayoutDashboard,
  },
];

export function FloatingPillNav() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <nav
      className="floating-pill-nav fixed left-1/2 z-50 min-[1440px]:hidden print:hidden"
      style={{
        position: "fixed",
        left: "50%",
        transform: "translateX(-50%)",
        bottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
        width: "min(calc(100vw - 48px), 280px)",
      }}
    >
      <div className="floating-pill-nav-surface flex items-center justify-around">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href === ROUTES.HOME &&
              pathname.startsWith("/assessment/")) ||
            (item.href === ROUTES.DASHBOARD &&
              pathname.startsWith("/result")) ||
            (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "floating-pill-nav-link flex flex-1 flex-col items-center justify-center gap-0.5 transition-all",
                isActive
                  ? "is-active text-white"
                  : "text-text-secondary hover:text-text-primary",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={2.25} />
              <span className="text-[10px] font-semibold">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>,
    document.body,
  );
}
