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
          "flex h-12 w-full items-center justify-center rounded-button border text-body font-semibold transition-all active:scale-[0.99]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          selected
            ? "border-transparent bg-[linear-gradient(135deg,#2563EB,#4F6BFF_58%,#7C3AED)] text-white shadow-[0_10px_22px_rgba(79,107,255,.24)]"
            : "border-border bg-white/95 text-text-primary hover:border-primary/30 hover:bg-primary-tint/40",
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
