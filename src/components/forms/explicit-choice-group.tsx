"use client";
import { useId } from "react";
import { ChoiceButton } from "./choice-button";
import { ErrorMessage } from "../ui/error-message";
import { toggleExclusiveChoice } from "@/lib/v3/choices";
export function ExplicitChoiceGroup({
  label,
  options,
  value,
  onChange,
  required = false,
  error,
  noneValue = "none",
}: {
  label: string;
  options: readonly { value: string; label: string }[];
  value: string[];
  onChange: (value: string[]) => void;
  required?: boolean;
  error?: string;
  noneValue?: string;
}) {
  const id = useId();
  return (
    <fieldset
      aria-required={required}
      aria-invalid={!!error}
      aria-describedby={error ? `${id}-error` : undefined}
      className="flex flex-col gap-3"
    >
      <legend className="text-small text-text-primary font-semibold">
        {label}
        {required && <span className="text-danger ml-1">*</span>}
      </legend>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {options.map((option) => (
          <ChoiceButton
            key={option.value}
            label={option.label}
            selected={value.includes(option.value)}
            onClick={() =>
              onChange(toggleExclusiveChoice(value, option.value, noneValue))
            }
          />
        ))}
      </div>
      {error && <ErrorMessage id={`${id}-error`} message={error} />}
    </fieldset>
  );
}
