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
      className="fixed left-1/2 z-50 -translate-x-1/2 md:hidden print:hidden"
      style={{
        bottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
        width: "min(88vw, 420px)",
      }}
    >
      <div
        className="flex h-[72px] items-center justify-around"
        style={{
          borderRadius: "999px",
          background: "rgba(255, 255, 255, 0.82)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(148, 163, 184, 0.20)",
          boxShadow:
            "0 18px 45px rgba(15, 99, 199, 0.14), 0 8px 18px rgba(15, 23, 42, 0.08)",
        }}
      >
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
                "flex flex-1 flex-col items-center justify-center gap-1 py-2 transition-all",
                "mx-2 rounded-[999px]",
                isActive
                  ? "text-primary"
                  : "text-text-secondary hover:text-text-primary",
              )}
              style={
                isActive
                  ? {
                      background:
                        "linear-gradient(135deg, rgba(224, 242, 254, 0.95), rgba(255, 255, 255, 0.75))",
                    }
                  : undefined
              }
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="h-[22px] w-[22px]" strokeWidth={2.25} />
              <span className="text-[11px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
