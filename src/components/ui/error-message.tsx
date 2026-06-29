import * as React from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorMessageProps {
  message: string;
  className?: string;
  showIcon?: boolean;
}

export function ErrorMessage({
  message,
  className,
  showIcon = true,
}: ErrorMessageProps) {
  if (!message) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-input bg-danger-soft px-3 py-2 text-caption font-medium text-danger animate-fade-in",
        className,
      )}
      role="alert"
    >
      {showIcon && <AlertCircle className="h-4 w-4 shrink-0" />}
      <p>{message}</p>
    </div>
  );
}
