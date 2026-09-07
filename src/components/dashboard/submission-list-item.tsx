import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn, formatDateTimeThai } from "@/lib/utils";
import { StatusBadge } from "../ui/badge";
import type { AssessmentType, AssessmentCategory, RiskLevel } from "@/types";
import {
  ASSESSMENT_TYPE_LABELS,
  ASSESSMENT_CATEGORY_LABELS,
  ROUTES,
} from "@/lib/constants";

interface SubmissionListItemProps {
  submissionId: string;
  type: AssessmentType;
  category: AssessmentCategory;
  date: string;
  score?: number | null;
  level?: RiskLevel | null;
  hasLayout?: boolean;
  className?: string;
}

export function SubmissionListItem({
  submissionId,
  type,
  category,
  date,
  score,
  level,
  hasLayout,
  className,
}: SubmissionListItemProps) {
  return (
    <Link
      href={`${ROUTES.RESULT}?submissionId=${submissionId}`}
      className={cn(
        "group block rounded-card border border-border bg-surface p-4 shadow-sm transition-all hover:border-primary/30 hover:bg-muted active:scale-[0.98]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="truncate text-small font-semibold text-text-primary group-hover:text-primary">
              {submissionId}
            </h4>
            {level && <StatusBadge status={level} />}
            {type === "environment" && (
              hasLayout ? (
                <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-2 py-0.5 text-[10px] font-medium">
                  มีผังห้อง
                </span>
              ) : (
                <span className="rounded-full bg-amber-50 text-amber-700 border border-amber-200/60 px-2 py-0.5 text-[10px] font-medium">
                  รอแนบผัง
                </span>
              )
            )}
          </div>
          <p className="mt-1 truncate text-caption text-text-secondary">
            {ASSESSMENT_TYPE_LABELS[type]} •{" "}
            {ASSESSMENT_CATEGORY_LABELS[category]}
          </p>
          <p className="mt-1 text-caption text-text-secondary/70">
            {formatDateTimeThai(date)}
          </p>
        </div>
        
        <div className="flex shrink-0 items-center gap-3">
          {score !== undefined && score !== null && (
            <div className="text-right">
              <span className="block text-caption text-text-secondary">คะแนน</span>
              <span className="block text-body font-bold text-text-primary">{score}</span>
            </div>
          )}
          <ChevronRight className="h-5 w-5 text-text-secondary transition-transform group-hover:translate-x-1 group-hover:text-primary" />
        </div>
      </div>
    </Link>
  );
}
