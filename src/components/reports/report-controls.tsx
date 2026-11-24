"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { History, ChevronDown, Download } from "lucide-react";
import { Button, useGlobalLoading } from "@/components/ui";
import { getSubmissionRevisionsV3 } from "@/lib/api";
import {
  reportModel,
  recordedPass,
  type StoredRecord,
} from "@/lib/v3/report-model";
import { formatDateTimeThai } from "@/lib/utils";
const operations: Record<string, string> = {
  initial: "ตรวจครั้งแรก",
  retest: "ตรวจซ้ำ",
  correction: "แก้ไขข้อมูล",
  legacy: "ข้อมูลที่บันทึก",
  create: "บันทึกครั้งแรก",
};
export function ReportControls({ data }: { data: StoredRecord }) {
  const m = reportModel(data),
    code = encodeURIComponent(m.code),
    environment = m.type === "environment";
  const [history, setHistory] = useState<StoredRecord[]>([]),
    [page, setPage] = useState(1),
    [total, setTotal] = useState(0),
    [historyError, setHistoryError] = useState("");
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [exportProgress, setExportProgress] = useState("");
  useGlobalLoading(busy);
  useEffect(() => {
    let cancelled = false;
    if (!environment) return;
    const request = getSubmissionRevisionsV3(m.code, page, 20);
    request.then((r) => {
      if (cancelled) return;
      if (r.success) {
        setHistory(r.data.items);
        setTotal(r.data.total);
        setHistoryError("");
      } else {
        setHistory([]);
        setHistoryError(r.error.message);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [m.code, environment, page, m.version]);
  async function exportExcel() {
    setBusy(true);
    setError("");
    setExportProgress("");
    try {
      const { exportReportRecords } = await import("@/lib/v3/report-export");
      exportReportRecords(
        [data],
        `safecheck-${m.code}${environment ? `-round-${m.version}` : ""}.xlsx`,
      );
    } catch {
      setError("ส่งออกไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setBusy(false);
    }
  }
  async function exportHistory() {
    setBusy(true);
    setError("");
    setExportProgress("กำลังอ่านประวัติทุกรอบ…");
    try {
      const { collectExportRecords } = await import("@/lib/v3/bulk-export");
      const records = await collectExportRecords({
        submission_code: m.code,
        revision_scope: "history",
        archived: "all",
      });
      if (!records.length || records.some((r) => r.submission_code !== m.code))
        throw new Error("อ่านประวัติของงานนี้ไม่สำเร็จ");
      const { exportReportRecords } = await import("@/lib/v3/report-export");
      exportReportRecords(
        records,
        `safecheck-${m.code}-history.xlsx`,
        "history",
      );
      setExportProgress(`ส่งออกประวัติครบ ${records.length} รอบแล้ว`);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "ส่งออกประวัติไม่สำเร็จ กรุณาลองใหม่",
      );
      setExportProgress("");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <section className="form-section-card mb-4 p-4" data-report-version>
        <p>
          {environment ? `รอบตรวจ ${String(m.version)} · ` : ""}
          {m.isLatest ? "ล่าสุด" : "ย้อนหลัง"}
        </p>
        <p className="text-small">
          วันเวลาตรวจ / ส่งแบบประเมิน:{" "}
          {m.measuredAt
            ? formatDateTimeThai(String(m.measuredAt))
            : "ไม่มีข้อมูล"}
        </p>
        {!m.isLatest && (
          <p role="status">
            กำลังดูข้อมูลย้อนหลัง{" "}
            <Link
              className="action-button print:hidden"
              href={`/result?submissionId=${code}`}
            >
              {environment ? "เปิดรอบล่าสุด" : "เปิดผลล่าสุด"}
            </Link>
          </p>
        )}
      </section>
      <div className="mb-4 flex flex-wrap gap-3 print:hidden">
        <Button variant="outline" onClick={exportExcel} disabled={busy}>
          ดาวน์โหลด Excel
        </Button>
        <Button variant="outline" onClick={() => window.print()}>
          พิมพ์ผล / บันทึก PDF
        </Button>
      </div>
      {error && (
        <p role="alert" className="mb-4 print:hidden">
          {error}
        </p>
      )}
      {environment && (
        <details className="form-section-card report-history mb-4 print:hidden">
          <summary className="report-history-heading">
            <History className="text-primary h-5 w-5" aria-hidden="true" />
            <span className="font-semibold">ประวัติรอบตรวจ</span>
            <span className="report-history-count">{total} รอบ</span>
            <ChevronDown
              className="report-history-chevron h-4 w-4"
              aria-hidden="true"
            />
          </summary>
          <div className="report-history-body">
            <div className="report-history-toolbar">
              <p className="text-text-secondary text-sm">
                เลือกดูข้อมูลที่บันทึกในแต่ละรอบ
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={exportHistory}
                disabled={busy}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                ดาวน์โหลดประวัติทุกรอบ Excel
              </Button>
            </div>
            {exportProgress && (
              <p role="status" className="text-text-secondary mb-3 text-sm">
                {exportProgress}
              </p>
            )}
            {historyError && <p role="alert">{historyError}</p>}
            <ol className="report-history-list">
              {history.map((r) => {
                const id = String(r.id),
                  n = String(r.revision_no),
                  selected = id === m.revisionId;
                const status = recordedPass(r.is_pass);
                return (
                  <li
                    key={id}
                    className={`report-history-row ${selected ? "is-selected" : ""}`}
                  >
                    <span className="report-history-number" aria-hidden="true">
                      {n}
                    </span>
                    <div className="report-history-info">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <h4 className="font-semibold">รอบ {n}</h4>
                        <span className="text-text-secondary text-sm">
                          {operations[String(r.kind ?? r.operation)] ??
                            String(r.kind ?? r.operation)}
                        </span>
                      </div>
                      <p className="text-text-secondary mt-1 text-xs">
                        {formatDateTimeThai(
                          String(r.measured_at ?? r.created_at),
                        )}
                      </p>
                      {typeof r.inspector_name === "string" &&
                        r.inspector_name && (
                          <p className="text-text-secondary mt-1 text-xs">
                            ผู้ตรวจ: {r.inspector_name}
                          </p>
                        )}
                    </div>
                    <span
                      className={`report-history-result ${status === "ผ่าน" ? "is-pass" : status === "ไม่ผ่าน" ? "is-fail" : ""}`}
                    >
                      {status}
                    </span>
                    {selected ? (
                      <span
                        className="report-history-current"
                        aria-current="page"
                      >
                        กำลังดู
                      </span>
                    ) : (
                      <Link
                        className="action-button action-button-sm report-history-open"
                        aria-label={`ดูรอบ ${n}`}
                        href={`/result?submissionId=${code}&revision=${encodeURIComponent(id)}`}
                      >
                        ดูรอบนี้
                      </Link>
                    )}
                  </li>
                );
              })}
            </ol>
            {total > 20 && (
              <div className="report-history-pagination">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  ประวัติก่อนหน้า
                </Button>
                <span className="text-text-secondary text-xs">
                  หน้า {page} / {Math.ceil(total / 20)}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page * 20 >= total}
                  onClick={() => setPage(page + 1)}
                >
                  ประวัติถัดไป
                </Button>
              </div>
            )}
          </div>
        </details>
      )}
    </>
  );
}
