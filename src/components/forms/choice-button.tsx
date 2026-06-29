import * as React from "react";
import { cn } from "@/lib/utils";

export interface ChoiceButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  label: string;
}

const ChoiceButton = React.forwardRef<HTMLButtonElement, ChoiceButtonProps>(
  ({ className, selected = false, label, type = "button", ...props }, ref) => {
    return (
      <button
        type={type}
        ref={ref}
        className={cn(
          "flex h-12 w-full items-center justify-center rounded-button border text-body font-medium transition-all active:scale-[0.98]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          selected
            ? "border-primary bg-primary text-white shadow-sm"
            : "border-border bg-surface text-text-primary hover:bg-muted",
          className,
        )}
        {...props}
      >
        {label}
      </button>
    );
  },
);
ChoiceButton.displayName = "ChoiceButton";

export { ChoiceButton };
