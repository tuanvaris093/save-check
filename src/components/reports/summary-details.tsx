import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function SummaryHeading({
  icon: Icon,
  children,
  as: Tag = "h3",
}: {
  icon: LucideIcon;
  children: ReactNode;
  as?: "h2" | "h3";
}) {
  return (
    <Tag className="summary-heading">
      <Icon aria-hidden="true" />
      <span>{children}</span>
    </Tag>
  );
}

export function SummaryField({
  label,
  children,
  icon: Icon,
}: {
  label: ReactNode;
  children: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="summary-field">
      <dt>
        {Icon && <Icon aria-hidden="true" />}
        {label}
      </dt>
      <dd>{children}</dd>
    </div>
  );
}
