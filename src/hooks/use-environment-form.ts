"use client";
import { errorsAfterFieldChange } from "@/lib/v3/field-error-change";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  completedResultUrl,
  completionDestination,
} from "@/lib/v3/completion-navigation";
import { ZodError } from "zod";
import type { LayoutFileInfo } from "@/types";
import {
  createSubmissionV3,
  retestSubmissionV3,
  correctSubmissionV3,
  supplementLegacySubmissionV3,
  getResultV3,
  uploadLayoutV3,
} from "@/lib/api";
import { submissionErrorMessage, submitAssessment } from "@/lib/v3/submit";
import {
  newDraft,
  readDraft,
  draftKey,
  patchDraft,
  type DraftEnvelope,
  type DraftIdentity,
} from "@/lib/v3/draft";
import {
  ENVIRONMENT_FORM_VERSION,
  safeEnvironmentDraft,
  normalizeAreaDraft,
  freshEnvironment,
  fromEnvironmentSource,
  forRetest,
  legacyEnvironmentDraft,
  checkInspection,
  checkedEnvironment,
  retestRequest,
  previewRetest,
  previewEnvironment,
  type EnvironmentDraft,
  type EnvironmentSource,
  type Category,
  type Mode,
} from "@/lib/v3/environment-form";
import {
  type EnvironmentRevisionV3,
  legacySupplementSchema,
} from "../../shared/v3";
interface Props {
  category: Category;
  mode: Mode;
  code: string | null;
  base: string | null;
}
export function useEnvironmentForm({ category, mode, code, base }: Props) {
  const router = useRouter(),
    params = useSearchParams(),
    [envelope, setEnvelope] = useState<DraftEnvelope | null>(null),
    ref = useRef<DraftEnvelope | null>(null),
    [loading, setLoading] = useState(true),
    [loadError, setLoadError] = useState(""),
    [warning, setWarning] = useState(""),
    [error, setError] = useState(""),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState(false),
    [redirecting, setRedirecting] = useState(false),
    completed = useRef(false),
    lock = useRef(false),
    [conflict, setConflict] = useState(false),
    [uploading, setUploading] = useState(false);
  const alertRef = useRef<HTMLDivElement>(null);
  const identity: DraftIdentity = {
    group: "environment",
    type: "environment",
    category,
    mode,
    code,
    baseRevision: base,
    questionnaireVersion: ENVIRONMENT_FORM_VERSION,
  };
  const identityJson = JSON.stringify(identity);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    setEnvelope(null);
    ref.current = null;
    setConflict(false);
    setError("");
    setErrors({});
    (async () => {
      try {
        const id = JSON.parse(identityJson) as DraftIdentity,
          key = draftKey(id);
        let raw: string | null = null;
        try {
          raw = localStorage.getItem(key);
        } catch {
          setWarning("บันทึกร่างบนเครื่องไม่ได้ กรุณาอย่าปิดหน้านี้");
        }
        const saved = readDraft(raw, id, 3);
        const stored =
          saved && safeEnvironmentDraft(saved.data.environmentV3)
            ? saved
            : null;
        let draft = freshEnvironment(id.category as Category);
        if (id.code) {
          const response = await getResultV3(id.code);
          if (!response.success) throw new Error(response.error.message);
          const source = response.data as unknown as EnvironmentSource;
          if (
            source.assessment_type !== "environment" ||
            source.assessment_category !== id.category
          )
            throw new Error("หมวดไม่ตรงกับงานบน server");
          const serverBase = source.revision.revision_id || source.revision.id;
          if (!id.baseRevision)
            throw new Error("กรุณาเปิดจากผลล่าสุดพร้อมรอบฐาน");
          if (serverBase !== id.baseRevision) {
            if (!stored?.data.environmentV3)
              throw new Error("รอบฐานไม่ตรงล่าสุด กรุณากลับไปเปิดจากผลล่าสุด");
            if (!cancelled) {
              setConflict(true);
              setError(
                "มีรอบใหม่บน server ร่างเดิมยังเก็บไว้ กรุณาโหลดรอบล่าสุดก่อนดำเนินการต่อ",
              );
            }
          } else {
            if (id.mode === "supplement") {
              if (!source.needs_legacy_upgrade)
                throw new Error("รายการนี้ไม่ต้องเติมข้อมูลเดิมแล้ว");
              if (!source.revision.points?.length)
                throw new Error("ไม่มีจุดเดิมที่ยืนยันได้ กรุณาสร้างงานใหม่");
              draft = legacyEnvironmentDraft(source);
            } else {
              if (source.schema_version !== 3)
                throw new Error("ข้อมูลเดิมต้องเติมข้อมูลประกอบก่อนตรวจซ้ำ");
              if (id.mode === "retest" && !source.can_retest)
                throw new Error("รอบล่าสุดผ่านแล้ว จึงไม่เปิดตรวจซ้ำ");
              draft =
                id.mode === "retest"
                  ? forRetest(source)
                  : fromEnvironmentSource(source);
            }
          }
        }
        if (
          id.mode === "correction" &&
          new URLSearchParams(window.location.search).get("layout") === "add"
        )
          draft.reason = "เพิ่มแผนผังพื้นที่";
        let current = newDraft(id);
        current.data.environmentV3 = JSON.parse(JSON.stringify(draft));
        if (stored?.data.environmentV3) current = stored;
        else if (raw && !cancelled)
          setWarning("ร่างเดิมไม่ตรงรูปแบบ จึงไม่ได้โหลดมาใช้");
        current.data.environmentV3 = JSON.parse(
          JSON.stringify(
            normalizeAreaDraft(
              current.data.environmentV3 as unknown as EnvironmentDraft,
            ),
          ),
        );
        if (!cancelled) {
          ref.current = current;
          setEnvelope(current);
          try {
            localStorage.setItem(key, JSON.stringify(current));
          } catch {
            setWarning("บันทึกร่างบนเครื่องไม่ได้");
          }
        }
      } catch (e) {
        if (!cancelled)
          setLoadError(e instanceof Error ? e.message : "โหลดข้อมูลไม่ได้");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [identityJson]);
  useEffect(() => {
    if (error) {
      alertRef.current?.focus();
      alertRef.current?.scrollIntoView({ block: "center" });
    }
  }, [error]);
  const persist = (
    data: EnvironmentDraft,
    step = ref.current?.ui.step || 1,
  ) => {
    if (!ref.current) return;
    const next = patchDraft(
      ref.current,
      { environmentV3: JSON.parse(JSON.stringify(data)) },
      { step },
    );
    ref.current = next;
    setEnvelope(next);
    try {
      localStorage.setItem(draftKey(next.identity), JSON.stringify(next));
      setWarning("");
    } catch {
      setWarning(
        "บันทึกร่างบนเครื่องไม่ได้ ข้อมูลยังอยู่ในหน้านี้ กรุณาอย่าปิดหน้า",
      );
    }
  };
  const d =
      (envelope?.data.environmentV3 as unknown as EnvironmentDraft) ??
      freshEnvironment(category),
    step = envelope?.ui.step ?? 1;
  const update = (patch: Partial<EnvironmentDraft>) =>
    persist({
      ...(ref.current!.data.environmentV3 as unknown as EnvironmentDraft),
      ...patch,
    });
  const inspection = (key: string, value: string) =>
    update({ inspection: { ...d.inspection, [key]: value } });
  const showIssues = (
    issues: { path: (string | number)[]; message: string }[],
    prefix = "",
  ) => {
    const mapped = Object.fromEntries(
      issues.map((i) => [
        (prefix ? prefix + "." : "") + i.path.join("."),
        ["Required", "Invalid input"].includes(i.message)
          ? "กรุณาระบุข้อมูลให้ครบ"
          : i.message,
      ]),
    );
    setErrors(mapped);
    setError(
      "กรุณาตรวจข้อมูลที่ระบุ โดยทุกช่องที่เกี่ยวข้องต้องกรอก ยกเว้นหมายเหตุ",
    );
    requestAnimationFrame(() => {
      const first = document.getElementsByName(Object.keys(mapped)[0])[0] as
        HTMLElement | undefined;
      first?.focus();
      first?.scrollIntoView({ block: "center" });
    });
  };
  const validate = (): EnvironmentRevisionV3 | null => {
    try {
      if (mode === "retest") {
        const failed = d
          .source!.revision.observations.filter((o) => !o.result.is_pass)
          .map((o) => o.unit.point_id);
        const indices = d.units
          .map((u, i) => (failed.includes(u.point_id) ? i : -1))
          .filter((i) => i >= 0);
        const checked = checkedEnvironment(
          { ...d, units: indices.map((i) => d.units[i]) },
          category,
          envelope!.requestKey,
        );
        if (!checked.success) {
          showIssues(
            (checked.error.issues || []).map((issue) => ({
              ...issue,
              path:
                issue.path[0] === "units" && typeof issue.path[1] === "number"
                  ? ["units", indices[issue.path[1]], ...issue.path.slice(2)]
                  : issue.path,
            })),
          );
          return null;
        }
        return previewRetest(d, envelope!.requestKey);
      }
      const checked = previewEnvironment(d, category, envelope!.requestKey);
      if (!checked.success) {
        showIssues(checked.error.issues || []);
        return null;
      }
      return checked.data;
    } catch (e) {
      if (e instanceof ZodError) showIssues(e.issues);
      else setError(e instanceof Error ? e.message : "ข้อมูลไม่ครบ");
      return null;
    }
  };
  const next = () => {
    setErrors({});
    setError("");
    if (step === 1) {
      const checked = checkInspection(d, category);
      if (!checked.success) {
        showIssues(checked.error.issues, "inspectionData");
        return;
      }
    } else if (mode === "supplement") {
      const checked = checkedEnvironment(d, category, envelope!.requestKey);
      if (!checked.success) {
        showIssues(checked.error.issues || []);
        return;
      }
    } else if (!validate()) return;
    persist(d, step + 1);
    window.scrollTo({ top: 0 });
  };
  const submit = async () => {
    if (lock.current || conflict) return;
    setError("");
    setErrors({});
    lock.current = true;
    setBusy(true);
    try {
      // A chosen file stays local through all review steps. Upload only after
      // final confirmation, then retain the receipt/key for safe network retries.
      let submittedDraft = d;
      if (d.pendingLayout) {
        setUploading(true);
        const selected = d.pendingLayout;
        const bytes = Uint8Array.from(
          atob(selected.fileData.split(",")[1]),
          (c) => c.charCodeAt(0),
        );
        const file = new File([bytes], selected.fileName, {
          type: selected.fileType,
        });
        const uploaded = await uploadLayoutV3(file, d.layoutUploadKey!);
        if (!uploaded.success) {
          setError(uploaded.error.message);
          return;
        }
        submittedDraft = {
          ...d,
          layout: {
            file_id: uploaded.data.file_id,
            file_name: uploaded.data.file_name,
          },
          pendingLayout: null,
        };
        persist(submittedDraft);
        setUploading(false);
      }
      let response;
      if (mode === "create")
        response = await submitAssessment(
          environmentInput(submittedDraft, envelope!.requestKey, category),
          createSubmissionV3,
        );
      else if (mode === "retest")
        response = await retestSubmissionV3(
          code!,
          retestRequest(submittedDraft, envelope!.requestKey),
        );
      else {
        const parsed = checkedEnvironment(
          submittedDraft,
          category,
          envelope!.requestKey,
        );
        if (!parsed.success) {
          showIssues(parsed.error.issues || []);
          return;
        }
        const p = parsed.data;
        if (mode === "correction")
          response = await correctSubmissionV3(code!, {
            schema_version: 3,
            idempotency_key: envelope!.requestKey,
            expected_data_version: d.source!.data_version,
            base_revision_id: base!,
            payload: p,
          });
        else
          response = await supplementLegacySubmissionV3(
            code!,
            legacySupplementSchema.parse({
              schema_version: 3,
              idempotency_key: envelope!.requestKey,
              base_revision_id: base,
              inspectionData: p.inspectionData,
              units: p.units,
              ...(submittedDraft.layout
                ? { layout: { file_id: submittedDraft.layout.file_id } }
                : {}),
            }),
          );
      }
      if (!response.success) {
        setError(submissionErrorMessage(response.error));
        if (response.error.code === "CONFLICT") {
          setConflict(true);
        }
        return;
      }
      if (
        !Number.isSafeInteger(response.data.id) ||
        response.data.id < 1 ||
        !response.data.submission_code ||
        !Number.isSafeInteger(response.data.data_version)
      ) {
        setError("server ยังไม่ยืนยันการบันทึก ร่างยังอยู่");
        return;
      }
      try {
        localStorage.removeItem(draftKey(envelope!.identity));
      } catch {
        /* Server receipt remains authoritative. */
      }
      completed.current = true;
      setRedirecting(true);
      ref.current = null;
      router.push(
        completedResultUrl(
          response.data.submission_code,
          completionDestination(
            params.get("returnTo"),
            code
              ? `/result?submissionId=${encodeURIComponent(code)}`
              : "/assessment/environment",
          ),
        ),
      );
    } catch (e) {
      if (e instanceof ZodError) showIssues(e.issues);
      else
        setError(
          e instanceof Error
            ? e.message
            : "เชื่อมต่อไม่สำเร็จ ร่างยังอยู่ กรุณาลองใหม่",
        );
    } finally {
      if (!completed.current) {
        lock.current = false;
        setBusy(false);
      }
      setUploading(false);
    }
  };
  const selectLayout = (file: LayoutFileInfo | null) => {
    setError("");
    update({
      pendingLayout: file,
      ...(!file ? { layout: null } : {}),
      layoutUploadKey: file ? crypto.randomUUID() : undefined,
    });
  };
  let preview: EnvironmentRevisionV3 | null = null;
  if (step === 3 && mode !== "supplement") {
    try {
      if (mode === "retest") preview = previewRetest(d, envelope!.requestKey);
      else {
        const p = previewEnvironment(d, category, envelope!.requestKey);
        if (p.success) preview = p.data;
      }
    } catch {
      /* Invalid restored draft remains editable. */
    }
  }
  const failed = new Set(
    d.source?.schema_version === 3
      ? d.source.revision.observations
          .filter((o) => !o.result.is_pass)
          .map((o) => o.unit.point_id)
      : [],
  );
  const reloadLatest = async () => {
    setBusy(true);
    try {
      const current = await getResultV3(code!);
      if (!current.success) {
        setError(current.error.message);
        return;
      }
      const source = current.data as unknown as EnvironmentSource;
      if (
        (mode === "retest" && !source.can_retest) ||
        (mode === "supplement" && !source.needs_legacy_upgrade)
      ) {
        router.push(`/result?submissionId=${encodeURIComponent(code!)}`);
        return;
      }
      const revision = source.revision.revision_id || source.revision.id;
      router.replace(
        `/assessment/environment-form?category=${category}&${mode === "correction" ? "edit" : mode === "supplement" ? "supplement" : "retest"}=${encodeURIComponent(code!)}&base=${encodeURIComponent(revision!)}`,
      );
    } finally {
      setBusy(false);
    }
  };
  const prev = () => {
    persist(d, step - 1);
    setError("");
    setErrors({});
  };
  const clearFieldError = (event: React.FormEvent<HTMLElement>) => {
    const remaining = errorsAfterFieldChange(errors, event);
    setErrors(remaining);
    if (Object.keys(errors).length && !Object.keys(remaining).length)
      setError("");
  };
  return {
    clearFieldError,
    loading,
    loadError,
    warning,
    error,
    errors,
    busy,
    redirecting,
    conflict,
    uploading,
    envelope,
    d,
    step,
    alertRef,
    reloadLatest,
    persist,
    update,
    inspection,
    next,
    prev,
    submit,
    selectLayout,
    preview,
    failed,
  };
}

// Produce only the public submission contract; UI state and source snapshots never reach create API.
function environmentInput(
  d: EnvironmentDraft,
  key: string,
  category: Category,
) {
  const parsed = checkedEnvironment(d, category, key);
  return parsed.success ? parsed.data : {};
}
