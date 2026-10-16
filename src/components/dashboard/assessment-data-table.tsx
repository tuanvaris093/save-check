"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Search,
  ClipboardCheck,
  HeartPulse,
  Star,
  Layers3,
  CalendarDays,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button, LoadingState, useGlobalLoading } from "@/components/ui";
import { CategoryIcon } from "@/components/assessment/category-icon";
import {
  getDashboardSubmissions,
  getDashboardSummary,
  type DashboardSubmissionsParams,
  type DashboardItem,
  type DashboardSummaryData,
} from "@/lib/api";
import { collectExportRecords } from "@/lib/v3/bulk-export";
import {
  REPORT_TYPES,
  REPORT_CATEGORIES,
  REPORT_GROUPS,
} from "@/lib/v3/report-model";
import { formatDateTimeThai } from "@/lib/utils";
export type AssessmentRecord = DashboardItem;
export type DatePreset = "all" | "today" | "7d" | "30d" | "custom";
function resultLabel(item: DashboardItem) {
  if (item.assessment_type === "environment")
    return item.overall_level === "pass"
      ? "ผ่าน"
      : item.overall_level === "high_risk"
        ? "ไม่ผ่าน"
        : "ไม่มีข้อมูล";
  if (item.assessment_type === "satisfaction")
    return item.overall_score == null
      ? "ไม่มีข้อมูล"
      : `${item.overall_score.toFixed(2)} / 5`;
  return (
    (
      {
        pass: "อาการระดับต่ำ",
        medium: "อาการระดับปานกลาง",
        high_risk: "อาการระดับสูง",
      } as Record<string, string>
    )[item.overall_level || ""] || "ไม่มีข้อมูล"
  );
}
export function AssessmentDataTable({
  initialPageSize = 10,
  className = "",
}: {
  initialPageSize?: number;
  className?: string;
}) {
  const [filters, setFilters] = useState<DashboardSubmissionsParams>({
      archived: "all",
      date_basis: "created",
      sort_order: "desc",
    }),
    [search, setSearch] = useState(""),
    [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1),
    [limit, setLimit] = useState(initialPageSize),
    [items, setItems] = useState<DashboardItem[]>([]),
    [total, setTotal] = useState(0),
    [summary, setSummary] = useState<DashboardSummaryData | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [refresh, setRefresh] = useState(0),
    [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [exporting, setExporting] = useState(false),
    [exportProgress, setExportProgress] = useState(""),
    [exportError, setExportError] = useState("");
  useGlobalLoading(exporting);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);
  const params = useMemo(
    () => ({ ...filters, search: debouncedSearch || undefined }),
    [filters, debouncedSearch],
  );
  // Only reuse the in-flight/current summary during this mounted view. A
  // filter change, explicit refresh or remount reads fresh data from the API.
  const summaryRequest = useRef<{
    key: string;
    expiresAt: number;
    promise: ReturnType<typeof getDashboardSummary>;
  } | null>(null);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    if (
      filters.start_date &&
      filters.end_date &&
      filters.start_date > filters.end_date
    ) {
      setError("วันที่เริ่มต้องไม่หลังวันสิ้นสุด");
      setSummary(null);
      summaryRequest.current = null;
      setItems([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    const summaryParams = { ...params };
    delete summaryParams.sort_order;
    const summaryKey = JSON.stringify([summaryParams, refresh]);
    if (
      summaryRequest.current?.key !== summaryKey ||
      summaryRequest.current.expiresAt <= Date.now()
    ) {
      setSummary(null);
      summaryRequest.current = {
        key: summaryKey,
        expiresAt: Date.now() + 30_000,
        promise: getDashboardSummary(summaryParams),
      };
    }
    Promise.all([
      getDashboardSubmissions({ ...params, page, limit }),
      summaryRequest.current.promise,
    ]).then(async ([rows, totals]) => {
      if (cancelled) return;
      // A concurrent save may change the count during the short reuse window.
      // Do not display a cached total that disagrees with the fresh list.
      if (
        rows.success &&
        totals.success &&
        rows.data.total !== totals.data.total_submissions
      ) {
        summaryRequest.current = {
          key: summaryKey,
          expiresAt: Date.now() + 30_000,
          promise: getDashboardSummary(summaryParams),
        };
        totals = await summaryRequest.current.promise;
        if (cancelled) return;
      }
      if (!rows.success || !totals.success) {
        setError(
          !rows.success
            ? rows.error.message
            : !totals.success
              ? totals.error.message
              : "โหลดข้อมูลไม่สำเร็จ",
        );
        setItems([]);
        setTotal(0);
      } else {
        setItems(rows.data.items);
        setTotal(rows.data.total);
        setSummary(totals.data);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [params, page, limit, refresh, filters.start_date, filters.end_date]);
  const change = (key: keyof DashboardSubmissionsParams, value: string) => {
    if (key === "start_date" || key === "end_date") setDatePreset("custom");
    setFilters((f) => ({
      ...f,
      [key]: value || undefined,
      ...(key === "type" ? { category: undefined } : {}),
    }));
    setPage(1);
  };
  const resetFilters = () => {
    setFilters({
      archived: "all",
      date_basis: "created",
      sort_order: "desc",
    });
    setSearch("");
    setDebouncedSearch("");
    setDatePreset("all");
    setPage(1);
  };
  const applyDatePreset = (preset: Exclude<DatePreset, "custom">) => {
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const start = new Date(today + "T12:00:00Z");
    start.setUTCDate(
      start.getUTCDate() - (preset === "7d" ? 6 : preset === "30d" ? 29 : 0),
    );
    setFilters((f) => ({
      ...f,
      start_date:
        preset === "all" ? undefined : start.toISOString().slice(0, 10),
      end_date: preset === "all" ? undefined : today,
    }));
    setDatePreset(preset);
    setPage(1);
  };
  async function exportAll() {
    setExporting(true);
    setExportError("");
    setExportProgress("กำลังอ่านข้อมูล…");
    try {
      const records = await collectExportRecords(
        { ...params, revision_scope: "latest" },
        (done, count) => setExportProgress(`อ่านแล้ว ${done} / ${count} งาน`),
      );
      if (!records.length) throw new Error("ไม่มีรายการตรงตัวกรอง");
      const { exportReportRecords } = await import("@/lib/v3/report-export");
      exportReportRecords(
        records,
        `safecheck-${new Date().toISOString().slice(0, 10)}.xlsx`,
        "latest",
      );
      setExportProgress(
        `ส่งออก ${new Set(records.map((r) => r.submission_code)).size} งานเรียบร้อยแล้ว`,
      );
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "ส่งออกไม่สำเร็จ");
      setExportProgress("");
    } finally {
      setExporting(false);
    }
  }
  const average = (group: string) =>
    summary?.satisfaction_avg_by_group[group] == null
      ? "—"
      : `${summary.satisfaction_avg_by_group[group]!.toFixed(2)} / 5`;
  const select = (
    label: string,
    key: keyof DashboardSubmissionsParams,
    options: Record<string, string>,
    defaultValue = "all",
  ) => (
    <label className="max-w-full min-w-0">
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        className="dashboard-filter-control max-w-full"
        value={String(filters[key] ?? defaultValue)}
        onChange={(e) => change(key, e.target.value)}
      >
        {Object.entries(options).map(([v, t]) => (
          <option key={v} value={v}>
            {t}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <section
        className="flex flex-col gap-6"
        aria-label="สรุปตามตัวกรอง"
        data-dashboard-summary
      >
        <div
          className="grid grid-cols-2 gap-3 min-[1440px]:grid-cols-4 min-[1440px]:gap-4"
          data-dashboard-kpis
        >
          {[
            {
              label: "ประเมินทั้งหมด",
              value: summary?.total_submissions ?? 0,
              Icon: Layers3,
              icon: "icon-primary",
              color: "text-primary",
              unit: "รายการ",
            },
            {
              label: "สภาพแวดล้อม",
              value: summary?.by_group.environment ?? 0,
              Icon: ClipboardCheck,
              icon: "icon-environment",
              color: "text-emerald-600",
              unit: "รายการ",
            },
            {
              label: "อาการทางสุขภาพ",
              value: summary?.by_group.health ?? 0,
              Icon: HeartPulse,
              icon: "icon-health",
              color: "text-rose-500",
              unit: "รายการ",
            },
            {
              label: "ความพึงพอใจเฉลี่ย",
              value: summary?.by_type.satisfaction
                ? `${summary.satisfaction_avg.toFixed(2)} / 5`
                : "ไม่มีข้อมูล",
              Icon: Star,
              icon: "icon-satisfaction",
              color: "text-amber-500",
              unit: "",
            },
          ].map(({ label, value, Icon, icon, color, unit }) => (
            <div className="kpi-card glass-card p-4" key={label}>
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-caption text-text-secondary font-semibold">
                  {label}
                </h3>
                <span
                  className={`icon-container icon-container-sm ${icon}`}
                  aria-hidden="true"
                >
                  <Icon className="h-5 w-5" />
                </span>
              </div>
              <p className={`mt-2 text-[28px] leading-none font-bold ${color}`}>
                {loading ? "…" : value}
              </p>
              {unit && (
                <span className="text-text-muted mt-1.5 block text-[11px] font-medium">
                  {unit}
                </span>
              )}
            </div>
          ))}
        </div>
        <div>
          <h2 className="text-card-title mb-3 font-semibold">แยกตามประเภท</h2>
          <div className="flex flex-col gap-2" data-dashboard-form-counts>
            {(["environment", "health_risk"] as const).map((type) => {
              const Icon = type === "environment" ? ClipboardCheck : HeartPulse;
              return (
                <div className="glass-card rounded-2xl px-4 py-3" key={type}>
                  <div className="flex items-center gap-3">
                    <span
                      className={`icon-container icon-container-sm ${type === "environment" ? "icon-environment" : "icon-health"}`}
                      aria-hidden="true"
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="text-small font-medium">
                      {REPORT_TYPES[type]}
                    </h3>
                    <span className="text-small text-text-secondary ml-auto">
                      {loading
                        ? "…"
                        : (summary?.by_group[
                            type === "environment" ? "environment" : "health"
                          ] ?? 0)}{" "}
                      รายการ
                    </span>
                  </div>
                  <div className="border-border/50 mt-3 grid grid-cols-1 gap-2 border-t pt-3 min-[1440px]:grid-cols-4 sm:grid-cols-2">
                    {(["light", "noise", "heat", "general"] as const).map(
                      (category) => (
                        <div
                          key={category}
                          className="text-small flex min-w-0 items-center gap-2"
                          data-dashboard-form-count
                        >
                          <CategoryIcon category={category} small />
                          <span>{REPORT_CATEGORIES[category]}</span>
                          <span className="ml-auto font-semibold">
                            {loading
                              ? "…"
                              : (summary?.by_form[
                                  `${category === "general" ? "satisfaction" : type}:${type === "environment" ? "environment" : "health"}:${category}`
                                ] ?? 0)}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 min-[1440px]:grid-cols-2">
          {(["environment", "health"] as const).map((group) => (
            <div className="glass-card rounded-2xl p-4" key={group}>
              <div className="flex items-center gap-3">
                <span
                  className="icon-container icon-container-sm icon-satisfaction"
                  aria-hidden="true"
                >
                  <Star className="h-5 w-5" />
                </span>
                <h3 className="font-semibold">
                  <span className="text-caption text-text-secondary block">
                    ความพึงพอใจ
                  </span>
                  {REPORT_GROUPS[group]}
                </h3>
              </div>
              <p className="text-small mt-3 font-semibold text-amber-500">
                คะแนนเฉลี่ยรวม {average(group)}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {[
                  "ด้านเนื้อหา",
                  "ด้านการออกแบบ",
                  "ด้านการใช้งาน",
                  "ด้านประโยชน์",
                ].map((label, i) => (
                  <div key={label}>
                    <p className="text-caption">{label}</p>
                    <p className="font-semibold">
                      {loading ||
                      summary?.satisfaction_dimensions_by_group[group]?.[i] ==
                        null
                        ? "—"
                        : `${summary.satisfaction_dimensions_by_group[group][i]!.toFixed(2)} / 5`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
      <section
        className="legacy-report-heading print:hidden"
        aria-label="ส่งออกตามตัวกรอง"
      >
        <div>
          <h2 className="text-card-title font-semibold">ประวัติการประเมิน</h2>
          <p className="text-small text-text-secondary mt-1">
            ประวัติการประเมินทั้งหมด พร้อมค้นหาและแบ่งหน้า
          </p>
        </div>
        <Button
          size="sm"
          className="legacy-export-button"
          disabled={loading || exporting || !!error || !total}
          onClick={exportAll}
        >
          {exporting ? "กำลังส่งออก…" : "ส่งออก Excel ทุกงานตามตัวกรอง"}
        </Button>
        {exportProgress && (
          <p role="status" className="mt-2">
            {exportProgress}
          </p>
        )}
        {exportError && <p role="alert">{exportError}</p>}
      </section>
      <section
        className="dashboard-filters legacy-report-filters"
        aria-label="ตัวกรองรายงาน"
      >
        <div className="legacy-filter-top">
          <label className="legacy-report-search">
            <Search aria-hidden="true" />
            <input
              aria-label="ค้นหารายงาน"
              placeholder="ค้นหารหัส / ชื่อ / สถานที่"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              maxLength={100}
            />
          </label>
          <div className="legacy-filter-options">
            {/* UI types are assessment groups; satisfaction is the general category within each group. */}
            {select("ประเภท", "group", { all: "ทุกประเภท", ...REPORT_GROUPS })}
            {select("หมวด", "category", {
              all: "ทุกหมวด",
              ...REPORT_CATEGORIES,
            })}
            {select(
              "เรียงวันที่",
              "sort_order",
              { desc: "ใหม่ไปเก่า", asc: "เก่าไปใหม่" },
              "desc",
            )}
          </div>
        </div>
        <div className="legacy-filter-bottom">
          <div className="legacy-date-presets" aria-label="ช่วงเวลา">
            <span className="legacy-period-label">
              <CalendarDays aria-hidden="true" />
              ช่วงเวลา:
            </span>
            {(
              [
                { id: "all", label: "ทั้งหมด" },
                { id: "today", label: "วันนี้" },
                { id: "7d", label: "7 วันล่าสุด" },
                { id: "30d", label: "30 วันล่าสุด" },
              ] as const
            ).map((preset) => (
              <button
                key={preset.id}
                type="button"
                aria-pressed={datePreset === preset.id}
                onClick={() => applyDatePreset(preset.id)}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="legacy-filter-dates">
            {select(
              "กรองช่วงวันที่ตาม",
              "date_basis",
              {
                latest_measurement: "วันตรวจล่าสุด / ส่งแบบประเมิน",
                created: "วันสร้างงาน",
              },
              "created",
            )}
            <div className="dashboard-date-range sm:w-72">
              <label className="min-w-0">
                <span className="sr-only">วันที่เริ่ม</span>
                <span className="dashboard-filter-control temporal-input-shell">
                  <input
                    aria-label="วันที่เริ่ม"
                    type="date"
                    className="temporal-input h-full outline-none"
                    value={filters.start_date ?? ""}
                    onChange={(e) => change("start_date", e.target.value)}
                  />
                </span>
              </label>
              <span className="text-text-secondary text-xs">ถึง</span>
              <label className="min-w-0">
                <span className="sr-only">วันที่สิ้นสุด</span>
                <span className="dashboard-filter-control temporal-input-shell">
                  <input
                    aria-label="วันที่สิ้นสุด"
                    type="date"
                    className="temporal-input h-full outline-none"
                    value={filters.end_date ?? ""}
                    onChange={(e) => change("end_date", e.target.value)}
                  />
                </span>
              </label>
            </div>

            <button
              type="button"
              className="legacy-clear-filters"
              onClick={resetFilters}
            >
              <RotateCcw aria-hidden="true" />
              ล้างตัวกรอง
            </button>
          </div>
        </div>
        <p className="legacy-filter-count">
          <span aria-hidden="true" />
          แสดง <strong>{total}</strong> รายการ
        </p>
      </section>
      <p className="sr-only">
        วันที่แสดงตามเวลาไทย (UTC+7) · สภาพแวดล้อมใช้เวลาตรวจของรอบล่าสุด
        ส่วนแบบสอบถามใช้เวลาส่งแบบประเมิน ·
        การแก้ไขข้อมูลมีเวลาบันทึกแยกในประวัติ
      </p>
      {error && (
        <div role="alert">
          {error}{" "}
          <Button variant="outline" onClick={() => setRefresh((n) => n + 1)}>
            ลองใหม่
          </Button>
        </div>
      )}
      <section
        className="legacy-report-table overflow-hidden"
        aria-label="รายการงาน"
      >
        <p className="sr-only">รายการงาน ({total}) · แสดงผลล่าสุดต่อรหัส</p>
        {loading ? (
          <LoadingState />
        ) : (
          <div
            className="overflow-x-auto"
            role="region"
            aria-label="ตารางรายการประเมิน"
            tabIndex={0}
          >
            <table
              className="w-full min-w-[960px] border-collapse text-left"
              aria-label="รายการประเมิน"
            >
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 text-xs font-semibold text-gray-500">
                  {[
                    "วันที่และเวลา",
                    "รหัสการประเมิน",
                    "ประเภท",
                    "หมวดหมู่",
                    "ผู้ตรวจ / ผู้ตอบ",
                    "ผลการประเมิน",
                    "แผนผัง",
                    "ดำเนินการ",
                  ].map((label) => (
                    <th
                      scope="col"
                      className="px-4 py-3 whitespace-nowrap"
                      key={label}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody
                className="divide-y divide-gray-100 text-sm text-gray-800"
                data-dashboard-list
              >
                {items.map((item) => (
                  <tr
                    key={item.submission_code}
                    className="transition-colors hover:bg-blue-50/30"
                  >
                    <td className="px-4 py-3 text-xs whitespace-nowrap text-gray-500">
                      {formatDateTimeThai(item.created_at)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Link
                        className="action-button action-button-sm font-mono"
                        href={`/result?submissionId=${encodeURIComponent(item.submission_code)}`}
                      >
                        {item.submission_code}
                      </Link>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`legacy-type-badge type-${item.assessment_group === "environment" ? "environment" : "health_risk"}`}
                      >
                        {REPORT_GROUPS[item.assessment_group]}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {REPORT_CATEGORIES[item.assessment_category]}
                    </td>
                    <td className="px-4 py-3">
                      {item.display_name || "—"}
                      {item.location && (
                        <p className="text-caption text-text-secondary">
                          {item.location}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`legacy-result-badge ${item.assessment_type === "satisfaction" ? "bg-violet-50 text-violet-600" : item.overall_level === "high_risk" ? "bg-red-50 text-red-600" : item.overall_level === "medium" ? "bg-amber-50 text-amber-700" : item.overall_level === "pass" ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-500"}`}
                      >
                        {resultLabel(item)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.assessment_type === "environment"
                        ? item.has_layout
                          ? "แนบแล้ว"
                          : "ยังไม่แนบ"
                        : "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Link
                        className="action-button action-button-sm"
                        href={`/result?submissionId=${encodeURIComponent(item.submission_code)}`}
                      >
                        ดูผลล่าสุด{" "}
                        <ChevronRight
                          aria-hidden="true"
                          className="h-3.5 w-3.5"
                        />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
              {!items.length && (
                <tbody>
                  <tr>
                    <td
                      colSpan={8}
                      className="text-text-secondary p-6 text-center"
                    >
                      ไม่พบรายการตรงตัวกรอง
                    </td>
                  </tr>
                </tbody>
              )}
            </table>
          </div>
        )}
        <div className="dashboard-pagination legacy-report-pagination print:hidden">
          <div className="legacy-page-count">
            <span>
              {total ? (page - 1) * limit + 1 : 0}–
              {Math.min(page * limit, total)} จาก <strong>{total}</strong>
            </span>
            <span aria-hidden="true">|</span>
            <select
              aria-label="จำนวนต่อหน้า"
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
            >
              {[10, 20, 50].map((n) => (
                <option key={n} value={n}>
                  {n}/หน้า
                </option>
              ))}
            </select>
          </div>
          <div className="legacy-page-actions">
            <button
              type="button"
              aria-label="หน้าแรกของตาราง"
              disabled={loading || page === 1}
              onClick={() => setPage(1)}
            >
              <ChevronsLeft />
            </button>
            <button
              type="button"
              aria-label="ก่อนหน้า"
              disabled={loading || page === 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft />
            </button>
            <span>
              หน้า {page} / {Math.max(1, Math.ceil(total / limit))}
            </span>
            <button
              type="button"
              aria-label="ถัดไป"
              disabled={loading || page * limit >= total}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight />
            </button>
            <button
              type="button"
              aria-label="หน้าสุดท้าย"
              disabled={loading || page * limit >= total}
              onClick={() => setPage(Math.max(1, Math.ceil(total / limit)))}
            >
              <ChevronsRight />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
