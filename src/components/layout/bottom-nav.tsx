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
    <nav className="sticky bottom-0 z-10 border-t border-border bg-surface/95 backdrop-blur-sm">
      <div className="flex items-center justify-around">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 px-2 py-2.5 text-caption transition-colors",
                isActive
                  ? "font-medium text-primary"
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
