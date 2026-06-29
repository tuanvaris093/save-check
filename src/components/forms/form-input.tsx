import * as React from "react";
import { cn } from "@/lib/utils";
import { ErrorMessage } from "../ui/error-message";

export interface FormInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const defaultId = React.useId();
    const inputId = id || defaultId;

    return (
      <div className="flex w-full flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-small font-medium text-text-primary"
          >
            {label}
            {props.required && <span className="ml-1 text-danger">*</span>}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            "flex h-12 w-full rounded-input border bg-surface px-4 py-2 text-body transition-colors",
            "file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-text-secondary/50",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary",
            "disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-50",
            error ? "border-danger focus-visible:ring-danger" : "border-border",
            className,
          )}
          {...props}
        />
        {helperText && !error && (
          <p className="text-caption text-text-secondary">{helperText}</p>
        )}
        {error && <ErrorMessage message={error} />}
      </div>
    );
  },
);
FormInput.displayName = "FormInput";

export { FormInput };
