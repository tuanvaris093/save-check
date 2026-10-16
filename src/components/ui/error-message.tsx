import * as React from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorMessageProps {
  message: string;
  id?: string;
  className?: string;
  showIcon?: boolean;
}

export function ErrorMessage({
  message,
  id,
  className,
  showIcon = true,
}: ErrorMessageProps) {
  if (!message) return null;

  return (
    <div
      className={cn(
        "rounded-input bg-danger-soft text-caption text-danger animate-fade-in flex items-center gap-2 px-3 py-2 font-medium",
        className,
      )}
      role="alert"
      id={id}
    >
      {showIcon && <AlertCircle className="h-4 w-4 shrink-0" />}
      <p>{message}</p>
    </div>
  );
}
