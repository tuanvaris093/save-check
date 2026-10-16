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
        "form-section-card p-5 transition-colors",
        error ? "border-danger" : "border-border",
        className,
      )}
    >
      <div className="mb-4">
        {questionNo && (
          <span className="text-caption text-primary mb-1 block font-semibold">
            ข้อที่ {questionNo}
          </span>
        )}
        <h3 className="text-card-title text-text-primary leading-relaxed font-semibold">
          {questionText}
        </h3>
        {description && (
          <p className="text-small text-text-secondary mt-1">{description}</p>
        )}
      </div>
      <div className="w-full">{children}</div>
    </div>
  );
}
