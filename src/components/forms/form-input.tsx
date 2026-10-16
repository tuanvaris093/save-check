import * as React from "react";
import { cn } from "@/lib/utils";
import { ErrorMessage } from "../ui/error-message";

export interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
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
      <div className="flex max-w-full min-w-0 flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-small text-text-primary font-semibold"
          >
            {label}
            {props.required && <span className="text-danger ml-1">*</span>}
          </label>
        )}
        {isTemporalInput ? (
          <div
            className={cn(
              "glass-input temporal-input-shell",
              props.disabled && "bg-muted cursor-not-allowed opacity-50",
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
              className="temporal-input text-body h-full w-full max-w-full min-w-0 border-0 bg-transparent p-0 outline-none"
              aria-invalid={!!error}
              aria-describedby={
                error
                  ? `${inputId}-error`
                  : helperText
                    ? `${inputId}-help`
                    : undefined
              }
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
              "glass-input text-body box-border block w-full max-w-full min-w-0 px-4 py-2",
              "file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#A3B1C4]",
              "focus-visible:ring-0 focus-visible:outline-none",
              "disabled:bg-muted disabled:cursor-not-allowed disabled:opacity-50",
              error
                ? "border-danger shadow-[0_0_0_3px_rgba(239,68,68,.08)]"
                : "border-border",
              className,
            )}
            aria-invalid={!!error}
            aria-describedby={
              error
                ? `${inputId}-error`
                : helperText
                  ? `${inputId}-help`
                  : undefined
            }
            {...props}
          />
        )}
        {helperText && !error && (
          <p
            id={`${inputId}-help`}
            className="text-caption text-text-secondary"
          >
            {helperText}
          </p>
        )}
        {error && <ErrorMessage id={`${inputId}-error`} message={error} />}
      </div>
    );
  },
);
FormInput.displayName = "FormInput";

export { FormInput };
