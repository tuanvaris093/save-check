import { z } from "zod";
import { SATISFACTION_QUESTIONS } from "./satisfaction-data";

// Generate schema dynamically based on 16 questions
const ratingSchema = z.string({ required_error: "กรุณาให้คะแนน" });

export const satisfactionMeasurementSchema = z.object({
  q1: ratingSchema,
  q2: ratingSchema,
  q3: ratingSchema,
  q4: ratingSchema,
  q5: ratingSchema,
  q6: ratingSchema,
  q7: ratingSchema,
  q8: ratingSchema,
  q9: ratingSchema,
  q10: ratingSchema,
  q11: ratingSchema,
  q12: ratingSchema,
  q13: ratingSchema,
  q14: ratingSchema,
  q15: ratingSchema,
  q16: ratingSchema,
  suggestion: z.string().optional(),
});

export type SatisfactionMeasurementFormValues = z.infer<
  typeof satisfactionMeasurementSchema
>;

export interface SatisfactionResult {
  accuracyAvg: number;
  designAvg: number;
  usabilityAvg: number;
  usefulnessAvg: number;
  overallAvg: number;
  suggestion: string;
}

export function calculateSatisfactionResult(values: SatisfactionMeasurementFormValues): SatisfactionResult {
  const getAvg = (ids: string[]) => {
    const sum = ids.reduce((acc, id) => acc + Number((values as any)[id] || 0), 0);
    return Number((sum / ids.length).toFixed(2));
  };

  const accuracyIds = SATISFACTION_QUESTIONS.find(c => c.key === "accuracy")?.questions.map(q => q.id) || [];
  const designIds = SATISFACTION_QUESTIONS.find(c => c.key === "design")?.questions.map(q => q.id) || [];
  const usabilityIds = SATISFACTION_QUESTIONS.find(c => c.key === "usability")?.questions.map(q => q.id) || [];
  const usefulnessIds = SATISFACTION_QUESTIONS.find(c => c.key === "usefulness")?.questions.map(q => q.id) || [];

  const accuracyAvg = getAvg(accuracyIds);
  const designAvg = getAvg(designIds);
  const usabilityAvg = getAvg(usabilityIds);
  const usefulnessAvg = getAvg(usefulnessIds);

  const totalQuestions = 16;
  let totalSum = 0;
  for (let i = 1; i <= totalQuestions; i++) {
    totalSum += Number((values as any)[`q${i}`] || 0);
  }
  const overallAvg = Number((totalSum / totalQuestions).toFixed(2));

  return {
    accuracyAvg,
    designAvg,
    usabilityAvg,
    usefulnessAvg,
    overallAvg,
    suggestion: values.suggestion || "",
  };
}
