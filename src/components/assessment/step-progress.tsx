import * as React from "react";
import { cn } from "@/lib/utils";

interface StepProgressProps {
  currentStep: number;
  totalSteps: number;
  className?: string;
}

export function StepProgress({
  currentStep,
  totalSteps,
  className,
}: StepProgressProps) {
  // Safe bounds check
  const safeCurrent = Math.max(1, Math.min(currentStep, totalSteps));
  const progressPercentage = ((safeCurrent - 1) / (totalSteps - 1)) * 100;

  return (
    <div className={cn("w-full py-4", className)}>
      <div className="mb-2 flex items-center justify-between text-caption font-medium">
        <span className="text-primary">
          ขั้นตอนที่ {safeCurrent} จาก {totalSteps}
        </span>
        <span className="text-text-secondary">
          {Math.round(progressPercentage)}%
        </span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full border border-primary/25 bg-white/70 shadow-sm backdrop-blur-md">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
    </div>
  );
}
