import * as React from "react";
import { cn } from "@/lib/utils";
import { ErrorMessage } from "../ui/error-message";

export interface FormTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const FormTextarea = React.forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const defaultId = React.useId();
    const textareaId = id || defaultId;

    return (
      <div className="flex w-full flex-col gap-1.5">
        {label && (
          <label
            htmlFor={textareaId}
            className="text-small font-medium text-text-primary"
          >
            {label}
            {props.required && <span className="ml-1 text-danger">*</span>}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          className={cn(
            "flex min-h-[100px] w-full resize-y rounded-input border bg-surface px-4 py-3 text-body transition-colors",
            "placeholder:text-text-secondary/50",
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
FormTextarea.displayName = "FormTextarea";

export { FormTextarea };
