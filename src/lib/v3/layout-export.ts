import type { CellObject } from "xlsx";
import { API_BASE_URL } from "../constants";
import { object, type StoredRecord } from "./report-model";

/** The filename links to this saved revision's file, never to the latest layout. */
export function layoutExportCell(record: StoredRecord): CellObject | string {
  const layout = object(record.layout),
    revision = object(record.revision);
  const fileId = revision.layout_file_id ?? layout.file_id;
  const name = typeof layout.file_name === "string" ? layout.file_name : "";
  if (!fileId) return name;
  const url = `${API_BASE_URL.replace(/\/$/, "")}/files/${encodeURIComponent(String(fileId))}`;
  return {
    t: "s",
    v: name || "เปิดผังพื้นที่",
    l: { Target: url, Tooltip: "เปิดไฟล์ผังพื้นที่ของรอบนี้" },
  };
}
