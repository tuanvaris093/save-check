"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: ROUTES.HOME,
    label: "หน้าแรก",
    icon: <Home className="h-5 w-5" />,
  },
  {
    href: ROUTES.DASHBOARD,
    label: "Dashboard",
    icon: <BarChart3 className="h-5 w-5" />,
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-10 px-4 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around rounded-[26px] border border-white/75 bg-white/90 p-2 shadow-[0_16px_36px_rgba(37,99,235,.12)] backdrop-blur-xl">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-[20px] px-2 py-2 text-caption transition-all",
                isActive
                  ? "bg-[linear-gradient(135deg,#2563EB,#4F6BFF,#8B5CF6)] font-semibold text-white shadow-[0_8px_18px_rgba(79,107,255,.25)]"
                  : "text-text-secondary hover:text-text-primary",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
