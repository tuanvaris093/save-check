/**
 * Utility functions for Save Check
 */

import type { AssessmentCategory } from "@/types";

/**
 * Generate a submission code with date prefix
 * Format: SUB-YYYYMMDD-XXXX
 */
export function generateSubmissionCode(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const random = String(Math.floor(Math.random() * 9999) + 1).padStart(4, "0");
  return `SUB-${year}${month}${day}-${random}`;
}

/**
 * Format date to Thai locale string
 */
export function formatDateThai(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format date and time to Thai locale string
 */
export function formatDateTimeThai(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Validate that a category string is a valid AssessmentCategory
 */
export function isValidCategory(
  category: string | null,
): category is AssessmentCategory {
  if (!category) return false;
  return ["light", "noise", "heat", "general"].includes(category);
}

/**
 * Clamp a number within a range
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Calculate percentage
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

/**
 * Delay utility for loading states
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Classname merge utility (simple version)
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
