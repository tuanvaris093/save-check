import * as React from "react";
import { cn } from "@/lib/utils";

interface DashboardSummaryCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function DashboardSummaryCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  className,
}: DashboardSummaryCardProps) {
  return (
    <div
      className={cn(
        "rounded-card border border-border bg-surface p-5 shadow-sm",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-small font-medium text-text-secondary">{title}</p>
        {icon && <div className="text-text-secondary">{icon}</div>}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <h3 className="text-page-title font-bold text-text-primary">{value}</h3>
        {trend && (
          <span
            className={cn(
              "text-caption font-medium",
              trend.isPositive ? "text-success" : "text-danger",
            )}
          >
            {trend.isPositive ? "+" : "-"}
            {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      {subtitle && (
        <p className="mt-1 text-caption text-text-secondary">{subtitle}</p>
      )}
    </div>
  );
}
