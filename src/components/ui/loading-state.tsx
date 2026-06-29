import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  text?: string;
  className?: string;
}

export function LoadingState({
  text = "กำลังโหลด...",
  className,
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-[200px] flex-col items-center justify-center gap-3 p-8 text-center animate-fade-in",
        className,
      )}
    >
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      {text && <p className="text-small text-text-secondary">{text}</p>}
    </div>
  );
}
