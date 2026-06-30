"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  backHref?: string;
  rightAction?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  showBack = false,
  backHref,
  rightAction,
  className,
}: PageHeaderProps) {
  const router = useRouter();

  function handleBack() {
    if (backHref) {
      router.push(backHref);
    } else {
      router.back();
    }
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-10 px-4 py-3 md:px-6 md:py-4 glass-surface",
        className,
      )}
    >
      <div className="flex items-center gap-3 max-w-[1200px] mx-auto">
        {showBack && (
          <button
            onClick={handleBack}
            className="flex h-10 w-10 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-primary-soft hover:text-primary active:scale-95"
            aria-label="ย้อนกลับ"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={2.25} />
          </button>
        )}

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold text-text-primary">
            {title}
          </h1>
          {subtitle && (
            <p className="truncate text-caption text-text-secondary">
              {subtitle}
            </p>
          )}
        </div>

        {rightAction && <div className="shrink-0">{rightAction}</div>}
      </div>
    </header>
  );
}
