import * as React from "react";
import { cn } from "@/lib/utils";
import { ErrorMessage } from "../ui/error-message";
import { ChevronDown } from "lucide-react";

export interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

const FormSelect = React.forwardRef<HTMLSelectElement, FormSelectProps>(
  (
    { className, label, error, helperText, options, placeholder, id, ...props },
    ref,
  ) => {
    const defaultId = React.useId();
    const selectId = id || defaultId;

    return (
      <div className="flex max-w-full min-w-0 flex-col gap-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="text-small text-text-primary font-semibold"
          >
            {label}
            {props.required && <span className="text-danger ml-1">*</span>}
          </label>
        )}
        <div className="relative max-w-full min-w-0">
          <select
            id={selectId}
            ref={ref}
            className={cn(
              "glass-input text-body box-border block w-full max-w-full min-w-0 appearance-none px-4 py-2 pr-10",
              "focus-visible:ring-0 focus-visible:outline-none",
              "disabled:bg-muted disabled:cursor-not-allowed disabled:opacity-50",
              error
                ? "border-danger focus-visible:ring-danger"
                : "border-border",
              // Style placeholder text differently if nothing is selected
              props.value === "" || props.defaultValue === ""
                ? "text-text-secondary"
                : "text-text-primary",
              className,
            )}
            aria-invalid={!!error}
            aria-describedby={
              error
                ? `${selectId}-error`
                : helperText
                  ? `${selectId}-help`
                  : undefined
            }
            {...props}
          >
            {placeholder && (
              <option value="" disabled hidden>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="text-text-secondary pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <ChevronDown className="h-5 w-5" />
          </div>
        </div>
        {helperText && !error && (
          <p
            id={`${selectId}-help`}
            className="text-caption text-text-secondary"
          >
            {helperText}
          </p>
        )}
        {error && <ErrorMessage id={`${selectId}-error`} message={error} />}
      </div>
    );
  },
);
FormSelect.displayName = "FormSelect";

export { FormSelect };
