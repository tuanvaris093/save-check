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
        <span className="font-semibold text-primary-deep">
          {Math.round(progressPercentage)}%
        </span>
      </div>
      <div className="h-[7px] w-full overflow-hidden rounded-full bg-[#E6EDF8]">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#2563EB,#4F6BFF,#7C3AED)] transition-all duration-300 ease-out"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
    </div>
  );
}
