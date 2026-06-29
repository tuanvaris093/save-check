import * as React from "react";
import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/types";
import { RISK_LEVEL_LABELS, RISK_LEVEL_COLORS } from "@/lib/constants";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "warning" | "danger" | "primary";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants = {
    default: "bg-muted text-text-secondary border-transparent",
    primary: "bg-primary-soft text-primary border-transparent",
    success: "bg-success-soft text-success border-transparent",
    warning: "bg-warning-soft text-warning border-transparent",
    danger: "bg-danger-soft text-danger border-transparent",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-badge border px-3 py-1 text-caption font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

interface StatusBadgeProps extends Omit<BadgeProps, "variant"> {
  status: RiskLevel;
}

export function StatusBadge({ status, className, ...props }: StatusBadgeProps) {
  // Mapping RiskLevel to visual style
  const riskStyles = RISK_LEVEL_COLORS[status];

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-badge border px-3 py-1 text-caption font-medium",
        riskStyles.bg,
        riskStyles.text,
        riskStyles.border,
        className,
      )}
      {...props}
    >
      {RISK_LEVEL_LABELS[status]}
    </div>
  );
}

export { Badge };
