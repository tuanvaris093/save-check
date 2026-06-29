import * as React from "react";
import { cn } from "@/lib/utils";

interface QuestionCardProps {
  questionNo?: number | string;
  questionText: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  error?: string;
}

export function QuestionCard({
  questionNo,
  questionText,
  description,
  children,
  className,
  error,
}: QuestionCardProps) {
  return (
    <div
      className={cn(
        "rounded-card border bg-surface p-5 shadow-sm transition-colors",
        error ? "border-danger" : "border-border",
        className,
      )}
    >
      <div className="mb-4">
        {questionNo && (
          <span className="mb-1 block text-caption font-semibold text-primary">
            ข้อที่ {questionNo}
          </span>
        )}
        <h3 className="text-card-title font-medium text-text-primary leading-relaxed">
          {questionText}
        </h3>
        {description && (
          <p className="mt-1 text-small text-text-secondary">{description}</p>
        )}
      </div>
      <div className="w-full">{children}</div>
    </div>
  );
}
