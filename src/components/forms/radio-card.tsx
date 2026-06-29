import * as React from "react";
import { cn } from "@/lib/utils";

export interface RadioCardProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  description?: string;
  icon?: React.ReactNode;
}

const RadioCard = React.forwardRef<HTMLInputElement, RadioCardProps>(
  ({ className, label, description, icon, id, ...props }, ref) => {
    const defaultId = React.useId();
    const inputId = id || defaultId;

    return (
      <div className={cn("relative flex", className)}>
        <input
          type="radio"
          id={inputId}
          ref={ref}
          className="peer sr-only"
          {...props}
        />
        <label
          htmlFor={inputId}
          className={cn(
            "flex min-h-16 w-full cursor-pointer items-center gap-3 rounded-card border border-border bg-surface px-4 py-3 transition-all",
            "hover:bg-muted active:scale-[0.98]",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2",
            "peer-checked:border-primary peer-checked:bg-primary-tint peer-checked:shadow-sm",
            "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
          )}
        >
          {icon && (
            <div className="shrink-0 text-text-secondary peer-checked:text-primary">
              {icon}
            </div>
          )}
          <div className="flex flex-1 flex-col gap-0.5">
            <span className="text-body font-medium text-text-primary peer-checked:text-primary">
              {label}
            </span>
            {description && (
              <span className="text-caption text-text-secondary">
                {description}
              </span>
            )}
          </div>

          {/* Custom radio circle indicator */}
          <div className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
            "border-border bg-surface",
            "peer-checked:border-primary"
          )}>
            <div className={cn(
              "h-2.5 w-2.5 rounded-full bg-primary opacity-0 transition-opacity",
              "peer-checked:opacity-100"
            )} />
          </div>
        </label>
      </div>
    );
  },
);
RadioCard.displayName = "RadioCard";

export { RadioCard };
