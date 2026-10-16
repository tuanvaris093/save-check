export function firstErrorPath(
  errors: Record<string, unknown>,
  prefix = "",
): string | null {
  for (const [key, value] of Object.entries(errors)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object") {
      if ("message" in value || "type" in value) return path;
      const nested = firstErrorPath(value as Record<string, unknown>, path);
      if (nested) return nested;
    }
  }
  return null;
}
export function focusFormError(errors: Record<string, unknown>) {
  const path = firstErrorPath(errors);
  requestAnimationFrame(() => {
    const target = path
      ? document.querySelector<HTMLElement>(
          `[name="${CSS.escape(path)}"], [data-field-name="${CSS.escape(path)}"]`,
        )
      : null;
    target?.focus();
    target
      ?.closest("label")
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
    if (!target?.closest("label"))
      target?.scrollIntoView({ block: "center", behavior: "smooth" });
  });
}
