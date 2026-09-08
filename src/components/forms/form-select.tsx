import * as React from "react";
import { cn } from "@/lib/utils";
import { ErrorMessage } from "../ui/error-message";
import { ChevronDown } from "lucide-react";

export interface FormSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

const FormSelect = React.forwardRef<HTMLSelectElement, FormSelectProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      options,
      placeholder,
      id,
      ...props
    },
    ref,
  ) => {
    const defaultId = React.useId();
    const selectId = id || defaultId;

    return (
      <div className="flex w-full flex-col gap-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="text-small font-semibold text-text-primary"
          >
            {label}
            {props.required && <span className="ml-1 text-danger">*</span>}
          </label>
        )}
        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            className={cn(
              "glass-input flex w-full appearance-none px-4 py-2 pr-10 text-body",
              "focus-visible:outline-none focus-visible:ring-0",
              "disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-50",
              error
                ? "border-danger focus-visible:ring-danger"
                : "border-border",
              // Style placeholder text differently if nothing is selected
              props.value === "" || props.defaultValue === ""
                ? "text-text-secondary"
                : "text-text-primary",
              className,
            )}
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
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-text-secondary">
            <ChevronDown className="h-5 w-5" />
          </div>
        </div>
        {helperText && !error && (
          <p className="text-caption text-text-secondary">{helperText}</p>
        )}
        {error && <ErrorMessage message={error} />}
      </div>
    );
  },
);
FormSelect.displayName = "FormSelect";

export { FormSelect };
