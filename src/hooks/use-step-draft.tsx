"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import type { UseFormWatch, FieldValues } from "react-hook-form";
import type { AssessmentDraftData } from "@/lib/schemas";
const DraftContext = createContext<
  ((data: Partial<AssessmentDraftData>) => void) | null
>(null);
export function DraftProvider({
  save,
  children,
}: {
  save: (data: Partial<AssessmentDraftData>) => void;
  children: ReactNode;
}) {
  return <DraftContext.Provider value={save}>{children}</DraftContext.Provider>;
}
export function useSaveDraft() {
  return useContext(DraftContext);
}
export function useStepDraft<T extends FieldValues>(
  watch: UseFormWatch<T>,
  field: keyof AssessmentDraftData,
) {
  const save = useContext(DraftContext),
    latest = useRef(save);
  latest.current = save;
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined,
      pending: Partial<AssessmentDraftData> | null = null;
    const flush = () => {
      if (timer) clearTimeout(timer);
      if (pending) {
        latest.current?.(pending);
        pending = null;
      }
    };
    const sub = watch((value) => {
      pending = { [field]: value } as Partial<AssessmentDraftData>;
      if (timer) clearTimeout(timer);
      timer = setTimeout(flush, 250);
    });
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);
    return () => {
      flush();
      sub.unsubscribe();
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", flush);
    };
  }, [watch, field]);
}
