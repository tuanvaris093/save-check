/**
 * Scoring utilities for Save Check assessments
 */

import type { RiskLevel } from "@/types";
import { RISK_THRESHOLDS, HEALTH_RISK_SCORE_MAP } from "./constants";

/**
 * Calculate health risk score from answer value
 */
export function getHealthRiskScore(answerValue: string): number {
  return HEALTH_RISK_SCORE_MAP[answerValue] ?? 0;
}

/**
 * Calculate total health risk score from array of answer values
 */
export function calculateHealthRiskTotalScore(
  answerValues: string[],
): number {
  return answerValues.reduce(
    (total, value) => total + getHealthRiskScore(value),
    0,
  );
}

/**
 * Determine risk level from total score
 */
export function determineRiskLevel(totalScore: number): RiskLevel {
  if (totalScore <= RISK_THRESHOLDS.pass.max) return "pass";
  if (totalScore <= RISK_THRESHOLDS.medium.max) return "medium";
  return "high_risk";
}

/**
 * Calculate satisfaction average for a set of ratings
 */
export function calculateSatisfactionAverage(ratings: number[]): number {
  if (ratings.length === 0) return 0;
  const sum = ratings.reduce((total, rating) => total + rating, 0);
  return Math.round((sum / ratings.length) * 100) / 100;
}

/**
 * Calculate satisfaction average by category
 */
export function calculateSatisfactionByCategory(
  answers: { category: string; rating: number }[],
): Record<string, number> {
  const categoryMap: Record<string, number[]> = {};

  for (const answer of answers) {
    if (!categoryMap[answer.category]) {
      categoryMap[answer.category] = [];
    }
    categoryMap[answer.category].push(answer.rating);
  }

  const result: Record<string, number> = {};
  for (const [category, ratings] of Object.entries(categoryMap)) {
    result[category] = calculateSatisfactionAverage(ratings);
  }

  return result;
}
