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
            "flex min-h-16 w-full cursor-pointer items-center gap-3 rounded-2xl border border-border bg-white/95 px-4 py-3 shadow-[0_4px_14px_rgba(37,99,235,.04)] transition-all",
            "hover:border-primary/30 hover:bg-primary-tint/30 active:scale-[0.99]",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2",
            "peer-checked:border-primary peer-checked:bg-primary-tint peer-checked:shadow-[0_8px_20px_rgba(79,107,255,.12)]",
            "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
            "peer-checked:[&_.radio-icon]:text-primary",
            "peer-checked:[&_.radio-label]:text-primary",
            "peer-checked:[&_.radio-indicator]:border-primary",
            "peer-checked:[&_.radio-dot]:opacity-100",
          )}
        >
          {icon && (
            <div className="shrink-0 text-text-secondary radio-icon transition-colors">
              {icon}
            </div>
          )}
          <div className="flex flex-1 flex-col gap-0.5">
            <span className="text-body font-medium text-text-primary radio-label transition-colors">
              {label}
            </span>
            {description && (
              <span className="text-caption text-text-secondary">
                {description}
              </span>
            )}
          </div>

          {/* Custom radio circle indicator */}
          <div className="radio-indicator flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-border bg-surface transition-colors">
            <div className="radio-dot h-2.5 w-2.5 rounded-full bg-primary opacity-0 transition-opacity" />
          </div>
        </label>
      </div>
    );
  },
);
RadioCard.displayName = "RadioCard";

export { RadioCard };
