"use client";
import { useRef, useState } from "react";
import { FileUpload } from "@/components/forms";
import { Button, SubmitLoadingOverlay } from "@/components/ui";
import { correctSubmissionV3, uploadLayoutV3 } from "@/lib/api";
import { storedLayoutFile } from "@/lib/v3/layout-file";
import type { LayoutFileInfo } from "@/types";
import type { EnvironmentSource } from "@/lib/v3/environment-form";

export function ResultLayoutEditor({
  data,
  onSaved,
}: {
  data: EnvironmentSource;
  onSaved: () => void;
}) {
  const savedFile = storedLayoutFile(data.revision.layout_file_id, data.layout);
  const [file, setFile] = useState<LayoutFileInfo | null>(savedFile);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState(false);
  const lock = useRef(false);
  const attempt = useRef<{
    uploadKey: string;
    saveKey: string;
    fileId?: string;
  } | null>(null);
  function selectFile(value: LayoutFileInfo | null) {
    if (lock.current) return;
    setFile(value);
    setError("");
    const changed = Boolean(value || savedFile);
    setDirty(changed);
    attempt.current = changed
      ? { uploadKey: crypto.randomUUID(), saveKey: crypto.randomUUID() }
      : null;
  }
  async function save() {
    if (!dirty || !attempt.current || lock.current || conflict) return;
    lock.current = true;
    setBusy(true);
    setError("");
    let saved = false;
    try {
      const request = attempt.current;
      if (file && !request.fileId) {
        const bytes = Uint8Array.from(atob(file.fileData.split(",")[1]), (c) =>
          c.charCodeAt(0),
        );
        const uploaded = await uploadLayoutV3(
          new File([bytes], file.fileName, { type: file.fileType }),
          request.uploadKey,
        );
        if (!uploaded.success) {
          setError(uploaded.error.message);
          return;
        }
        request.fileId = uploaded.data.file_id;
      }
      const response = await correctSubmissionV3(data.submission_code, {
        schema_version: 3,
        idempotency_key: request.saveKey,
        expected_data_version: data.data_version,
        base_revision_id: data.revision.revision_id,
        payload: {
          schema_version: 3,
          idempotency_key: request.saveKey,
          assessment_type: "environment",
          assessment_group: "environment",
          assessment_category: data.assessment_category,
          inspectionData: data.revision.inspectionData,
          units: data.revision.observations.map((o) => o.unit),
          ...(file && request.fileId
            ? { layout: { file_id: request.fileId } }
            : {}),
        },
      });
      if (!response.success) {
        setError(response.error.message);
        setConflict(response.error.code === "CONFLICT");
        return;
      }
      saved = true;
      onSaved();
    } catch {
      setError("บันทึกผังไม่สำเร็จ ไฟล์ที่เลือกยังอยู่ กรุณาลองใหม่");
    } finally {
      if (!saved) {
        lock.current = false;
        setBusy(false);
      }
    }
  }
  return (
    <div className="print:hidden" data-result-layout-editor>
      <FileUpload
        value={file}
        onChange={selectFile}
        label=""
        downloadUrl={!dirty && savedFile ? savedFile.fileData : undefined}
      />
      {dirty && !file && (
        <p className="text-text-secondary mt-3 text-sm">
          ผังจะถูกนำออกเมื่อกดบันทึก ประวัติรอบก่อนยังเปิดดูได้
        </p>
      )}
      {error && (
        <p role="alert" className="text-danger mt-3 text-sm">
          {error}
        </p>
      )}
      {conflict ? (
        <Button variant="outline" className="mt-3" onClick={onSaved}>
          โหลดข้อมูลล่าสุด
        </Button>
      ) : (
        dirty && (
          <div className="mt-3 flex gap-2">
            <Button onClick={save} disabled={busy}>
              บันทึกผัง
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setFile(savedFile);
                setDirty(false);
                setError("");
                attempt.current = null;
              }}
              disabled={busy}
            >
              ยกเลิก
            </Button>
          </div>
        )
      )}
      <SubmitLoadingOverlay isOpen={busy} />
    </div>
  );
}
