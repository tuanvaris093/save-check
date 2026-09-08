"use client";

import { useState, useEffect, useCallback } from "react";
import type { AssessmentType, AssessmentCategory } from "@/types";
import type { AssessmentDraftData } from "@/lib/schemas";
import { getResult } from "@/lib/api";

interface UseAssessmentFormProps {
  type: AssessmentType;
  category: AssessmentCategory;
  totalSteps: number;
  editCode?: string | null;
}

const getDraftKey = (
  type: string,
  category: string,
  editCode?: string | null,
) =>
  editCode
    ? `save_check_draft_${type}_${category}_edit_${editCode}`
    : `save_check_draft_${type}_${category}`;

export function useAssessmentForm({
  type,
  category,
  totalSteps,
  editCode,
}: UseAssessmentFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoaded, setIsLoaded] = useState(false);
  const [draftData, setDraftData] = useState<AssessmentDraftData>({});
  const [loadError, setLoadError] = useState<string | null>(null);

  const draftKey = getDraftKey(type, category, editCode);

  // Load draft from localStorage on mount
  useEffect(() => {
    let cancelled = false;

    const loadDraft = async () => {
      try {
        const saved = localStorage.getItem(draftKey);
        if (saved) {
          if (!cancelled) setDraftData(JSON.parse(saved));
          return;
        }

        if (editCode) {
          let source: any = null;

          try {
            const sessionSource = sessionStorage.getItem(
              `save_check_edit_source_${editCode}`,
            );
            if (sessionSource) source = JSON.parse(sessionSource);
          } catch (error) {
            console.error("Failed to load edit source", error);
          }

          if (!source) {
            const response = await getResult(editCode);
            if (response.success) source = response.data;
          }

          if (!source) {
            const stored = localStorage.getItem("save_check_submissions");
            const list = stored ? JSON.parse(stored) : [];
            source = list.find(
              (item: any) => item.submission_code === editCode,
            );
          }

          if (source && !cancelled) {
            const restored: AssessmentDraftData = {
              profile: source.profile,
              workInfo: source.workInfo,
              inspectionData: source.inspectionData,
              answers: source.answers || {},
              layoutFile: source.layout_file || null,
              editingSubmission: {
                id: source.id,
                submission_code: source.submission_code || editCode,
                started_at: source.started_at,
                created_at: source.created_at,
              },
              lastSavedAt:
                source.updated_at ||
                source.completed_at ||
                new Date().toISOString(),
            };
            setDraftData(restored);
            localStorage.setItem(draftKey, JSON.stringify(restored));
          } else if (!cancelled) {
            setLoadError(`ไม่พบข้อมูลการประเมินรหัส ${editCode}`);
          }
        }
      } catch (error) {
        console.error("Failed to load draft", error);
      } finally {
        if (!cancelled) setIsLoaded(true);
      }
    };

    loadDraft();
    return () => {
      cancelled = true;
    };
  }, [draftKey, editCode]);

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

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => {
      if (typeof window !== "undefined")
        window.scrollTo({ top: 0, behavior: "smooth" });
      return Math.min(prev + 1, totalSteps);
    });
  }, [totalSteps]);

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => {
      if (typeof window !== "undefined")
        window.scrollTo({ top: 0, behavior: "smooth" });
      return Math.max(prev - 1, 1);
    });
  }, []);

  return {
    currentStep,
    totalSteps,
    isLoaded,
    draftData,
    loadError,
    nextStep,
    prevStep,
    saveDraft,
    clearDraft,
  };
}
