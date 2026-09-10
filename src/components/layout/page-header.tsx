"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  backHref?: string;
  replaceBack?: boolean;
  rightAction?: React.ReactNode;
  showBrand?: boolean;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  showBack = false,
  backHref,
  replaceBack = false,
  rightAction,
  showBrand = false,
  className,
}: PageHeaderProps) {
  const router = useRouter();

  function handleBack() {
    if (backHref) {
      if (replaceBack) {
        router.replace(backHref);
      } else {
        router.push(backHref);
      }
    } else {
      router.back();
    }
  }

  return (
    <header
      className={cn(
        "glass-surface sticky top-0 z-10 px-4 py-3 md:px-6 md:py-4 md:relative md:top-auto",
        className,
      )}
    >
      <div className="flex items-center gap-3 max-w-[1200px] mx-auto">
        {showBack && (
          <button
            onClick={handleBack}
            className="flex h-11 w-11 items-center justify-center rounded-full text-text-secondary transition-all hover:bg-primary-tint hover:text-primary active:scale-95"
            aria-label="ย้อนกลับ"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={2.25} />
          </button>
        )}

        <div className="min-w-0 flex-1">
          {showBrand && (
            <div className="mb-2 flex items-center gap-2">
              <Image
                src="/assets/logo_savecheck.webp"
                alt=""
                width={30}
                height={30}
                className="h-[30px] w-[30px] rounded-[9px] object-contain shadow-md"
                aria-hidden="true"
              />
              <span className="text-sm font-bold text-white">SafeCheck</span>
            </div>
          )}
          <h1 className="truncate text-lg font-bold text-text-primary md:text-xl">
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
