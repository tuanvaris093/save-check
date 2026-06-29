"use client";

import { useState, useEffect, useCallback } from "react";
import type { AssessmentType, AssessmentCategory } from "@/types";
import type { AssessmentDraftData } from "@/lib/schemas";

interface UseAssessmentFormProps {
  type: AssessmentType;
  category: AssessmentCategory;
  totalSteps: number;
}

const getDraftKey = (type: string, category: string) =>
  `save_check_draft_${type}_${category}`;

export function useAssessmentForm({
  type,
  category,
  totalSteps,
}: UseAssessmentFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoaded, setIsLoaded] = useState(false);
  const [draftData, setDraftData] = useState<AssessmentDraftData>({
    lastSavedAt: new Date().toISOString(),
  });

  const draftKey = getDraftKey(type, category);

  // Load draft from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        setDraftData(JSON.parse(saved));
      }
    } catch (error) {
      console.error("Failed to load draft", error);
    } finally {
      setIsLoaded(true);
    }
  }, [draftKey]);

  // Save partial data to draft
  const saveDraft = useCallback(
    (partialData: Partial<AssessmentDraftData>) => {
      setDraftData((prev) => {
        const updated = {
          ...prev,
          ...partialData,
          lastSavedAt: new Date().toISOString(),
        };
        try {
          localStorage.setItem(draftKey, JSON.stringify(updated));
        } catch (error) {
          console.error("Failed to save draft", error);
        }
        return updated;
      });
    },
    [draftKey],
  );

  // Clear draft
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(draftKey);
      setDraftData({ lastSavedAt: new Date().toISOString() });
    } catch (error) {
      console.error("Failed to clear draft", error);
    }
  }, [draftKey]);

  // Navigation
  const nextStep = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
  }, [totalSteps]);

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  }, []);

  return {
    currentStep,
    totalSteps,
    isLoaded,
    draftData,
    nextStep,
    prevStep,
    saveDraft,
    clearDraft,
  };
}
