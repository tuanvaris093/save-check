"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import type { AssessmentType, AssessmentCategory } from "@/types";
import type { AssessmentDraftData } from "@/lib/schemas";
import { satisfactionQuestionnaireVersion } from "../../shared/v3";
import {
  emptySatisfactionDraft,
  migrateSatisfactionDraft,
  satisfactionFromServer,
} from "@/lib/v3/satisfaction-form";
import { getResultV3 } from "@/lib/api";
import {
  draftKey,
  readDraft,
  newDraft,
  patchDraft,
  type DraftEnvelope,
  type DraftIdentity,
} from "@/lib/v3/draft";
interface Props {
  type: AssessmentType;
  category: AssessmentCategory;
  totalSteps: number;
  editCode?: string | null;
  group?: "environment" | "health";
  mode?: DraftIdentity["mode"];
  baseRevision?: string | null;
}
export function useAssessmentForm({
  type,
  category,
  totalSteps,
  editCode,
  group,
  mode,
  baseRevision,
}: Props) {
  const [state, setState] = useState<DraftEnvelope | null>(null),
    [isLoaded, setLoaded] = useState(false),
    [loadError, setLoadError] = useState<string | null>(null),
    [draftWarning, setWarning] = useState<string | null>(null);
  const ref = useRef<DraftEnvelope | null>(null);
  const identity: DraftIdentity = {
    group: group ?? (type === "environment" ? "environment" : "health"),
    type,
    category,
    mode: mode ?? (editCode ? "correction" : "create"),
    code: editCode ?? null,
    baseRevision: baseRevision ?? null,
    ...(type === "satisfaction"
      ? {
          questionnaireVersion: satisfactionQuestionnaireVersion(
            group ?? "health",
          ),
        }
      : {}),
  };
  const identityJson = JSON.stringify(identity);
  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setLoadError(null);
    setState(null);
    ref.current = null;
    const load = async () => {
      try {
        const id = JSON.parse(identityJson) as DraftIdentity;
        const key = draftKey(id);
        let fresh = newDraft(id);
        let seededSatisfaction =
          id.type === "satisfaction"
            ? emptySatisfactionDraft(id.group)
            : undefined;
        // Editing must first verify the server's latest record. Cache cannot authorize a stale edit.
        if (id.code) {
          const response = await getResultV3(id.code);
          if (!response.success) throw new Error(response.error.message);
          const source = response.data;
          if (source.schema_version !== 3)
            throw new Error(
              "ข้อมูลเดิมต้องยืนยันข้อมูลก่อนแก้ไข กรุณากลับไปดูผล",
            );
          if (
            source.assessment_type !== id.type ||
            source.assessment_category !== id.category ||
            source.assessment_group !== id.group
          )
            throw new Error("กลุ่มหรือหัวข้อไม่ตรงกับข้อมูลบน server");
          const revision = source.revision as
            { revision_id?: string } | undefined;
          if (
            !id.baseRevision ||
            id.baseRevision !==
              (revision?.revision_id ?? String(source.data_version))
          )
            throw new Error(
              "ต้องเปิดการแก้ไขจากข้อมูลล่าสุด พร้อมระบุ base revision หรือ data version",
            );
          if (
            id.type === "satisfaction" &&
            source.questionnaire_version !== id.questionnaireVersion
          )
            throw new Error(
              "ชุดคำถามเปลี่ยนรุ่น กรุณาสร้างแบบประเมินใหม่เพื่อรักษาคำตอบเดิม",
            );
          if (id.type === "satisfaction")
            seededSatisfaction = satisfactionFromServer(source, id.group);
          fresh.data = {
            profile: source.profile as DraftEnvelope["data"]["profile"],
            workInfo: source.workInfo as DraftEnvelope["data"]["workInfo"],
            inspectionData:
              source.inspectionData as DraftEnvelope["data"]["inspectionData"],
            answers: source.answers as DraftEnvelope["data"]["answers"],
          };
        }
        if (seededSatisfaction) fresh.data.satisfactionV3 = seededSatisfaction;
        let raw: string | null = null;
        try {
          raw = localStorage.getItem(key);
        } catch {
          if (!cancelled)
            setWarning("บันทึกร่างบนเครื่องไม่ได้ กรุณาอย่าปิดหน้านี้");
        }
        const saved = readDraft(raw, id, totalSteps);
        if (saved) fresh = saved;
        else if (raw && !cancelled)
          setWarning("ร่างที่เก็บไว้ไม่ตรงรูปแบบปัจจุบัน จึงไม่ได้โหลดมาใช้");
        if (id.type === "satisfaction" && saved) {
          if (!saved.data.satisfactionV3) {
            fresh.data.satisfactionV3 = id.code
              ? seededSatisfaction
              : migrateSatisfactionDraft(saved.data, id.group);
            fresh.ui.step = 1;
          }
          if (
            fresh.data.satisfactionV3?.questionnaire_version !==
            id.questionnaireVersion
          ) {
            fresh = newDraft(id);
            fresh.data.satisfactionV3 = seededSatisfaction;
            if (!cancelled) setWarning("ร่างไม่ตรงชุดคำถาม จึงไม่ได้โหลดมาใช้");
          }
        }
        if (!cancelled) {
          try {
            localStorage.setItem(key, JSON.stringify(fresh));
          } catch {
            setWarning("บันทึกร่างบนเครื่องไม่ได้ กรุณาอย่าปิดหน้านี้");
          }
          ref.current = fresh;
          setState(fresh);
        }
      } catch (e) {
        if (!cancelled)
          setLoadError(e instanceof Error ? e.message : "โหลดแบบประเมินไม่ได้");
      } finally {
        if (!cancelled) setLoaded(true);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [identityJson, totalSteps]);
  const persist = useCallback((next: DraftEnvelope) => {
    ref.current = next;
    setState(next);
    try {
      localStorage.setItem(draftKey(next.identity), JSON.stringify(next));
      setWarning(null);
    } catch {
      setWarning(
        "บันทึกร่างบนเครื่องไม่ได้ ข้อมูลยังอยู่ในหน้านี้ กรุณาอย่าปิดหน้า",
      );
    }
  }, []);
  const saveDraft = useCallback(
    (partial: Partial<AssessmentDraftData>) => {
      if (ref.current)
        persist(patchDraft(ref.current, partial as DraftEnvelope["data"]));
    },
    [persist],
  );
  const setStep = useCallback(
    (step: number) => {
      if (ref.current) {
        persist(
          patchDraft(
            ref.current,
            {},
            { step: Math.max(1, Math.min(totalSteps, step)) },
          ),
        );
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    [persist, totalSteps],
  );
  const nextStep = useCallback(
      () => setStep((ref.current?.ui.step ?? 1) + 1),
      [setStep],
    ),
    prevStep = useCallback(
      () => setStep((ref.current?.ui.step ?? 1) - 1),
      [setStep],
    );
  const setTab = useCallback(
    (tab: DraftEnvelope["ui"]["tab"]) => {
      if (ref.current) persist(patchDraft(ref.current, {}, { tab }));
    },
    [persist],
  );
  const clearDraft = useCallback(() => {
    if (ref.current) {
      try {
        localStorage.removeItem(draftKey(ref.current.identity));
      } catch {
        setWarning("ลบร่างบนเครื่องไม่ได้");
      }
      // Keep the completed review visible until navigation unmounts it.
      ref.current = null;
    }
  }, []);
  return {
    currentStep: state?.ui.step ?? 1,
    currentTab: state?.ui.tab ?? "single",
    totalSteps,
    isLoaded,
    draftData: (state?.data ?? {}) as AssessmentDraftData,
    loadError,
    draftWarning,
    requestKey: state?.requestKey,
    nextStep,
    prevStep,
    setStep,
    setTab,
    saveDraft,
    clearDraft,
  };
}
