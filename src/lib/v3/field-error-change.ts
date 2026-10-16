import type { FormEvent } from "react";

/** Reset feedback for an edited field; submission still validates all values. */
export function errorsAfterFieldChange(
  errors: Record<string, string>,
  event: FormEvent<HTMLElement>,
): Record<string, string> {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return errors;
  const name =
    target.getAttribute("name") ??
    (target.closest("button[aria-pressed]")
      ? target.closest("[data-field-name]")?.getAttribute("data-field-name")
      : null);
  if (!name) return errors;
  const related = [name];
  if (name.endsWith("has_underlying_disease"))
    related.push(
      name.replace("has_underlying_disease", "underlying_disease_details"),
    );
  if (name.endsWith("position_type") || name.endsWith("other_context")) {
    const prefix = name.slice(0, name.lastIndexOf(".") + 1);
    related.push(
      prefix + "study_year",
      prefix + "work_experience_years",
      prefix + "program_code",
      prefix + "other_context",
    );
  }
  if (name === "noise_sources") related.push("noise_source_other");
  return Object.fromEntries(
    Object.entries(errors).filter(
      ([key]) =>
        !related.some(
          (field) =>
            key === field ||
            field.startsWith(key + ".") ||
            key.startsWith(field + "."),
        ),
    ),
  );
}
