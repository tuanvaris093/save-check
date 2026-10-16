// Explicit “none” is a real answer, never inferred from an empty list.
export function toggleExclusiveChoice(
  values: string[],
  value: string,
  none = "none",
): string[] {
  if (value === none) return values.includes(none) ? [] : [none];
  const others = values.filter((v) => v !== none && v !== value);
  return values.includes(value) ? others : [...others, value];
}
export const NOT_APPLICABLE_OPTION = {
  value: "not_applicable",
  label: "ไม่เกี่ยวข้อง",
};
export const NONE_OPTION = { value: "none", label: "ไม่มี" };
