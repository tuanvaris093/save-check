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
  (
    {
      className,
      label,
      error,
      helperText,
      id,
      type,
      onWheel,
      onKeyDown,
      ...props
    },
    ref,
  ) => {
    const defaultId = React.useId();
    const inputId = id || defaultId;
    const isTemporalInput =
      type === "date" ||
      type === "time" ||
      type === "datetime-local" ||
      type === "month" ||
      type === "week";

    const handleWheel = (event: React.WheelEvent<HTMLInputElement>) => {
      onWheel?.(event);
      if (type === "number" && !event.defaultPrevented) {
        event.currentTarget.blur();
      }
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (
        type === "number" &&
        (event.key === "ArrowUp" || event.key === "ArrowDown")
      ) {
        event.preventDefault();
      }
      onKeyDown?.(event);
    };

    return (
      <div className="flex min-w-0 max-w-full flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-small font-semibold text-text-primary"
          >
            {label}
            {props.required && <span className="ml-1 text-danger">*</span>}
          </label>
        )}
        {isTemporalInput ? (
          <div
            className={cn(
              "glass-input temporal-input-shell",
              props.disabled && "cursor-not-allowed bg-muted opacity-50",
              error
                ? "border-danger shadow-[0_0_0_3px_rgba(239,68,68,.08)]"
                : "border-border",
              className,
            )}
          >
            <input
              id={inputId}
              ref={ref}
              type={type}
              onWheel={handleWheel}
              onKeyDown={handleKeyDown}
              className="temporal-input h-full w-full min-w-0 max-w-full border-0 bg-transparent p-0 text-body outline-none"
              {...props}
            />
          </div>
        ) : (
          <input
            id={inputId}
            ref={ref}
            type={type}
            onWheel={handleWheel}
            onKeyDown={handleKeyDown}
            className={cn(
              "glass-input block min-w-0 max-w-full w-full box-border px-4 py-2 text-body",
              "file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#A3B1C4]",
              "focus-visible:outline-none focus-visible:ring-0",
              "disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-50",
              error ? "border-danger shadow-[0_0_0_3px_rgba(239,68,68,.08)]" : "border-border",
              className,
            )}
            {...props}
          />
        )}
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
