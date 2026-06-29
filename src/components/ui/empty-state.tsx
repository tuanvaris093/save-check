import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon = <AlertTriangle className="h-10 w-10 text-text-secondary opacity-50" />,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-[200px] flex-col items-center justify-center gap-4 rounded-card border border-dashed border-border bg-surface/50 p-8 text-center animate-fade-in",
        className,
      )}
    >
      {icon && <div className="mb-2 flex justify-center">{icon}</div>}
      <div className="space-y-1">
        <h3 className="text-card-title font-semibold text-text-primary">
          {title}
        </h3>
        {description && (
          <p className="text-small text-text-secondary max-w-sm mx-auto">
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
