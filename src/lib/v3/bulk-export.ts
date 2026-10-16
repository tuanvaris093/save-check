import {
  getExportData,
  type DashboardSubmissionsParams,
  type StoredExportPage,
} from "../api";
import { reportKey, type StoredRecord } from "./report-model";
type FetchPage = (
  params: DashboardSubmissionsParams,
) => Promise<StoredExportPage>;
export class ExportPageTooLarge extends Error {}
async function apiPage(params: DashboardSubmissionsParams) {
  const r = await getExportData(params);
  if (!r.success) {
    if (r.error.code === "EXPORT_PAGE_TOO_LARGE")
      throw new ExportPageTooLarge(r.error.message);
    throw new Error(r.error.message);
  }
  return r.data;
}
/** Pagination is deliberately sequential to keep Worker/D1 and response sizes bounded. */
export async function collectExportRecords(
  params: DashboardSubmissionsParams,
  progress?: (jobs: number, total: number) => void,
  fetchPage: FetchPage = apiPage,
) {
  let batchLimit = 10;
  for (;;) {
    try {
      return await collectPages(params, progress, fetchPage, batchLimit);
    } catch (error) {
      if (!(error instanceof ExportPageTooLarge) || batchLimit === 1)
        throw error;
      batchLimit = Math.max(1, Math.floor(batchLimit / 2));
    }
  }
}
async function collectPages(
  params: DashboardSubmissionsParams,
  progress: ((jobs: number, total: number) => void) | undefined,
  fetchPage: FetchPage,
  batchLimit: number,
) {
  const records: StoredRecord[] = [],
    seen = new Set<string>(),
    jobs = new Set<string>(),
    counts = new Map<string, number>();
  let page = 1,
    total: number | undefined;
  const append = (values: StoredRecord[]) => {
    for (const r of values) {
      const key = reportKey(r);
      if (seen.has(key))
        throw new Error("ข้อมูลส่งออกซ้ำ กรุณาเริ่มส่งออกใหม่");
      seen.add(key);
      records.push(r);
      const code = String(r.submission_code);
      counts.set(code, (counts.get(code) ?? 0) + 1);
    }
  };
  do {
    const batch = await fetchPage({
      ...params,
      page,
      limit: batchLimit,
      revision_limit: batchLimit,
      revision_page: 1,
    });
    if (total !== undefined && total !== batch.total)
      throw new Error("จำนวนงานเปลี่ยนระหว่างส่งออก กรุณาเริ่มใหม่");
    total = batch.total;
    if (batch.page !== page || (!batch.items.length && batch.next_page))
      throw new Error("ข้อมูลแบ่งหน้าไม่ครบ");
    for (const item of batch.items) {
      if (jobs.has(item.submission_code))
        throw new Error("ลำดับงานเปลี่ยนระหว่างส่งออก กรุณาเริ่มใหม่");
      jobs.add(item.submission_code);
      const own = batch.records.filter(
        (r) => r.submission_code === item.submission_code,
      );
      if (!own.length) throw new Error("ผลการประเมินไม่ครบ กรุณาส่งออกใหม่");
      const latest = own.find((r) => r.is_latest !== false);
      if (
        !latest ||
        (item.assessment_type === "environment"
          ? reportKey(latest) !==
            `${item.submission_code}:${item.latest_revision_id}`
          : latest.data_version !== item.data_version)
      )
        throw new Error("ข้อมูลเปลี่ยนระหว่างส่งออก กรุณาเริ่มใหม่");
    }
    append(batch.records);
    for (const revision of batch.revision_pages) {
      let rp = revision.next_page;
      while (rp) {
        const more = await fetchPage({
          ...params,
          search: undefined,
          submission_code: revision.submission_code,
          page: 1,
          limit: 1,
          revision_scope: "history",
          revision_limit: batchLimit,
          revision_page: rp,
        });
        const info = more.revision_pages.find(
          (r) => r.submission_code === revision.submission_code,
        );
        if (!info || info.total !== revision.total || info.page !== rp)
          throw new Error("จำนวนรอบตรวจเปลี่ยนระหว่างส่งออก กรุณาเริ่มใหม่");
        if (info.next_page !== null && info.next_page !== rp + 1)
          throw new Error("ลำดับหน้ารอบตรวจไม่ถูกต้อง");
        if (
          more.records.some(
            (r) => r.submission_code !== revision.submission_code,
          )
        )
          throw new Error("รหัสงานส่งออกไม่ตรงกัน");
        append(more.records);
        rp = info.next_page;
      }
    }
    for (const item of batch.items) {
      const expected =
        batch.revision_pages.find(
          (r) => r.submission_code === item.submission_code,
        )?.total ?? 1;
      if (counts.get(item.submission_code) !== expected)
        throw new Error("ข้อมูลรอบตรวจส่งออกไม่ครบ");
    }
    progress?.(jobs.size, total);
    if (batch.next_page !== null && batch.next_page !== page + 1)
      throw new Error("ลำดับหน้าไม่ถูกต้อง");
    page = batch.next_page ?? 0;
  } while (page);
  if (jobs.size !== total) throw new Error("ส่งออกไม่ครบทุกงาน กรุณาเริ่มใหม่");
  return records;
}
