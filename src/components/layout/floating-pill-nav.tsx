"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";

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

  return (
    <nav
      className="floating-pill-nav fixed left-1/2 z-50 -translate-x-1/2 md:hidden print:hidden"
      style={{
        bottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
        width: "min(calc(100vw - 24px), 430px)",
      }}
    >
      <div className="floating-pill-nav-surface flex items-center justify-around">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "floating-pill-nav-link flex flex-1 flex-col items-center justify-center gap-1 transition-all",
                isActive
                  ? "is-active text-white"
                  : "text-text-secondary hover:text-text-primary",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="h-6 w-6" strokeWidth={2.25} />
              <span className="text-xs font-semibold">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
