import { Sun, Volume2, ThermometerSun, Star } from "lucide-react";

const categoryStyles = {
  light: {
    Icon: Sun,
    color: "text-amber-500",
    background: "linear-gradient(135deg, #FFF5DB, #FFFBEB)",
  },
  noise: {
    Icon: Volume2,
    color: "text-emerald-600",
    background: "linear-gradient(135deg, #E8FAF5, #ECFDF5)",
  },
  heat: {
    Icon: ThermometerSun,
    color: "text-rose-500",
    background: "linear-gradient(135deg, #FFF0F1, #FFF1F2)",
  },
  general: {
    Icon: Star,
    color: "text-violet-600",
    background: "linear-gradient(135deg, #F0E8FF, #F5F3FF)",
  },
} as const;

export function CategoryIcon({
  category,
  small = false,
}: {
  category: keyof typeof categoryStyles;
  small?: boolean;
}) {
  const { Icon, color, background } = categoryStyles[category];
  return (
    <span
      aria-hidden="true"
      data-category-icon={category}
      className={`inline-flex shrink-0 items-center justify-center ${small ? "h-8 w-8 rounded-lg" : "h-12 w-12 rounded-2xl"}`}
      style={{ background }}
    >
      <Icon className={`${color} ${small ? "h-4 w-4" : "h-6 w-6"}`} />
    </span>
  );
}
