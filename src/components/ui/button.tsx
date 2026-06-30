import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "default" | "sm" | "lg" | "icon";
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "default",
      isLoading = false,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center whitespace-nowrap rounded-button text-small font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]";

    const variants = {
      primary: "btn-primary-gradient border-none text-white",
      secondary:
        "bg-primary-soft text-primary hover:bg-primary-soft/80 shadow-sm",
      outline:
        "btn-secondary-glass",
      ghost: "hover:bg-muted hover:text-text-primary text-text-secondary",
      danger: "bg-danger text-white hover:bg-danger/90 shadow-sm",
    };

    const sizes = {
      default: "h-12 px-5 py-2.5", // Mobile friendly height (at least 48px is recommended, but 48px looks good)
      sm: "h-10 px-4 py-2",
      lg: "h-14 px-8 py-3 text-body",
      icon: "h-12 w-12",
    };

    return (
      <button
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";

export { Button };
