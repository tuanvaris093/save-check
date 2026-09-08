"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  ArrowUpDown,
  Calendar,
  RotateCcw,
  FileSpreadsheet,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";
import {
  ASSESSMENT_TYPE_LABELS,
  ASSESSMENT_CATEGORY_LABELS,
  ROUTES,
} from "@/lib/constants";
import { formatDateTimeThai, formatDateThai, cn } from "@/lib/utils";
import {
  getDashboardSubmissions,
  getExportData,
  type DashboardSubmissionsParams,
} from "@/lib/api";
import { generateMultiSheetExcel } from "@/lib/excel-export";
import type { AssessmentType, AssessmentCategory, RiskLevel } from "@/types";

export interface AssessmentRecord {
  id: number | string;
  submission_code: string;
  assessment_type: AssessmentType;
  assessment_category: AssessmentCategory;
  completed_at: string;
  created_at?: string;
  overall_score?: number | null;
  overall_level?: RiskLevel | null;
  has_layout?: boolean;
}

export type DatePreset = "all" | "today" | "7d" | "30d" | "custom";

function formatDateToYMD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPresetDates(preset: DatePreset): { startDate: string; endDate: string } {
  const now = new Date();
  const todayStr = formatDateToYMD(now);

  if (preset === "today") {
    return { startDate: todayStr, endDate: todayStr };
  }
  if (preset === "7d") {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    return { startDate: formatDateToYMD(d), endDate: todayStr };
  }
  if (preset === "30d") {
    const d = new Date(now);
    d.setDate(d.getDate() - 29);
    return { startDate: formatDateToYMD(d), endDate: todayStr };
  }
  return { startDate: "", endDate: "" };
}

interface AssessmentDataTableProps {
  data?: AssessmentRecord[];
  className?: string;
  initialPageSize?: number;
  isLoading?: boolean;
}

export function AssessmentDataTable({
  data = [],
  className = "",
  initialPageSize = 10,
  isLoading: initialLoading = false,
}: AssessmentDataTableProps) {
  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Data & Request States
  const [items, setItems] = useState<AssessmentRecord[]>(data);
  const [totalItems, setTotalItems] = useState<number>(data.length);
  const [totalPages, setTotalPages] = useState<number>(Math.max(1, Math.ceil(data.length / initialPageSize)));
  const [isLoading, setIsLoading] = useState<boolean>(initialLoading);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Debounce search input (350ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch from API with full server-side query params
  const fetchSubmissions = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: DashboardSubmissionsParams = {
        page: currentPage,
        limit: pageSize,
        type: selectedType !== "all" ? selectedType : undefined,
        search: debouncedSearch.trim() || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        sort_order: sortOrder,
      };

      const res = await getDashboardSubmissions(params);
      if (res.success && res.data) {
        setItems(res.data.items as any);
        setTotalItems(res.data.pagination.total);
        setTotalPages(res.data.pagination.total_pages);
      }
    } catch (err) {
      console.error("Failed to query submissions from API:", err);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, selectedType, debouncedSearch, startDate, endDate, sortOrder]);

  // Trigger query whenever any query parameter changes
  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  // Handle Date Presets
  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    const { startDate: s, endDate: e } = getPresetDates(preset);
    setStartDate(s);
    setEndDate(e);
    setCurrentPage(1);
  };

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    setDatePreset(val || endDate ? "custom" : "all");
    setCurrentPage(1);
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    setDatePreset(startDate || val ? "custom" : "all");
    setCurrentPage(1);
  };

  const handleSortToggle = () => {
    setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setSelectedType("all");
    setStartDate("");
    setEndDate("");
    setDatePreset("all");
    setCurrentPage(1);
  };

  const isFilterActive =
    searchTerm.trim() !== "" ||
    selectedType !== "all" ||
    startDate !== "" ||
    endDate !== "" ||
    datePreset !== "all";

  const handleExportExcel = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const res = await getExportData({
        type: selectedType !== "all" ? selectedType : undefined,
        search: debouncedSearch.trim() || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        sort_order: sortOrder,
      });

      if (res.success && res.data) {
        const dateStr = new Date().toISOString().slice(0, 10);
        generateMultiSheetExcel(res.data, `save-check-export-${dateStr}.xlsx`);
      } else {
        alert("ไม่สามารถดึงข้อมูลสำหรับส่งออกได้");
      }
    } catch (err) {
      console.error("Export error:", err);
      alert("เกิดข้อผิดพลาดในการส่งออก Excel");
    } finally {
      setIsExporting(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const getTypeBadge = (type: AssessmentType) => {
    switch (type) {
      case "environment":
        return (
          <span className="inline-flex items-center rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] font-semibold text-white tracking-wide">
            สภาพแวดล้อม
          </span>
        );
      case "health_risk":
        return (
          <span className="inline-flex items-center rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-semibold text-white tracking-wide">
            สุขภาพ
          </span>
        );
      case "satisfaction":
        return (
          <span className="inline-flex items-center rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-semibold text-white tracking-wide">
            พึงพอใจ
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-gray-500 px-2 py-0.5 text-[11px] font-semibold text-white tracking-wide">
            ทั่วไป
          </span>
        );
    }
  };

  const startIndex = (currentPage - 1) * pageSize;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Section Header with Export Excel Action Button */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-card-title font-semibold text-text-primary">
            ประวัติการประเมิน
          </h2>
          <p className="text-caption text-text-secondary truncate">
            ประวัติการประเมินทั้งหมด พร้อมค้นหาและแบ่งหน้า
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportExcel}
          disabled={isExporting || totalItems === 0}
          title="ส่งออกรายงาน Excel (แยกตามประเภทการประเมิน)"
          className="inline-flex items-center gap-1.5 rounded-button bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-caption font-medium shadow-sm active:scale-95 transition-all whitespace-nowrap shrink-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isExporting ? (
            <>
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>กำลังส่งออก...</span>
            </>
          ) : (
            <>
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>ส่งออก Excel</span>
            </>
          )}
        </button>
      </div>

      {/* Search & Filter Controls Card */}
      <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-xs space-y-2.5">
        {/* Row 1: Search, Type Filter & Sort */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Search Input */}
          <div className="relative flex-1 min-w-50 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="ค้นหารหัส เช่น SUB-..."
              className="h-8.5 w-full rounded-lg border border-gray-200 bg-gray-50/50 pl-8 pr-3 text-[12px] text-gray-800 placeholder:text-gray-400 focus:border-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
            />
          </div>

          {/* Type Dropdown & Sort Button */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="relative">
              <select
                value={selectedType}
                onChange={(e) => {
                  setSelectedType(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-8.5 rounded-lg border border-gray-200 bg-white pl-2.5 pr-6 text-[12px] font-medium text-gray-700 focus:border-primary focus:outline-none transition-all cursor-pointer appearance-none shadow-2xs"
              >
                <option value="all">ทุกประเภท</option>
                <option value="environment">สภาพแวดล้อม</option>
                <option value="health_risk">ความเสี่ยงสุขภาพ</option>
                <option value="satisfaction">ความพึงพอใจ</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
            </div>

            <button
              type="button"
              onClick={handleSortToggle}
              title={sortOrder === "desc" ? "เรียงจากล่าสุดไปเก่าสุด" : "เรียงจากเก่าสุดไปล่าสุด"}
              className={cn(
                "inline-flex h-8.5 items-center gap-1 rounded-lg border px-2.5 text-[11px] font-medium transition-all cursor-pointer shrink-0 shadow-2xs",
                sortOrder === "asc"
                  ? "border-primary/40 bg-primary/5 text-primary"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <ArrowUpDown className="h-3 w-3" />
              <span>{sortOrder === "desc" ? "ล่าสุด" : "เก่าสุด"}</span>
            </button>
          </div>
        </div>

        {/* Row 2: Date Range Filter & Presets */}
        <div className="pt-2 border-t border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          {/* Preset Buttons */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0 text-[11px] scrollbar-none">
            <span className="text-gray-400 font-medium flex items-center gap-1 mr-1 shrink-0">
              <Calendar className="h-3.5 w-3.5" />
              <span>ช่วงเวลา:</span>
            </span>

            {[
              { id: "all", label: "ทั้งหมด" },
              { id: "today", label: "วันนี้" },
              { id: "7d", label: "7 วันล่าสุด" },
              { id: "30d", label: "30 วันล่าสุด" },
            ].map((preset) => {
              const isActive = datePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handlePresetChange(preset.id as DatePreset)}
                  className={cn(
                    "px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-all cursor-pointer",
                    isActive
                      ? "bg-primary text-white shadow-xs"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200/70 hover:text-gray-900"
                  )}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Custom Date Pickers */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center gap-1 bg-gray-50/80 rounded-lg border border-gray-200 p-1 text-[11px]">
              <input
                type="date"
                value={startDate}
                max={endDate || undefined}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="bg-white border border-gray-200 rounded px-1.5 py-0.5 text-gray-700 text-[11px] focus:outline-none focus:border-primary cursor-pointer"
                title="วันที่เริ่มต้น"
              />
              <span className="text-gray-400 font-medium text-[10px]">ถึง</span>
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => handleEndDateChange(e.target.value)}
                className="bg-white border border-gray-200 rounded px-1.5 py-0.5 text-gray-700 text-[11px] focus:outline-none focus:border-primary cursor-pointer"
                title="วันที่สิ้นสุด"
              />
            </div>

            {/* Clear Filters Button */}
            {isFilterActive && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                title="ล้างตัวกรองทั้งหมด"
              >
                <RotateCcw className="h-3 w-3" />
                <span>ล้างตัวกรอง</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Summary Status */}
        <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>
              แสดง <strong>{totalItems}</strong> รายการ
            </span>
            {(startDate || endDate) && (
              <span className="text-primary font-medium ml-1">
                • ช่วงวันที่: {startDate ? formatDateThai(startDate) : "เริ่มต้น"} –{" "}
                {endDate ? formatDateThai(endDate) : "ปัจจุบัน"}
              </span>
            )}
            {debouncedSearch && (
              <span className="text-gray-600 font-medium ml-1">
                • คำค้น: &quot;{debouncedSearch}&quot;
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-8 px-4">
            {/* Desktop Skeleton View */}
            <div className="hidden md:block">
              <div className="mb-3 flex items-center justify-center gap-2 text-primary">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="text-[12px] font-medium">กำลังค้นหาข้อมูลจากระบบ...</span>
              </div>
              <div className="divide-y divide-gray-100 rounded-lg border border-gray-100 overflow-hidden">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-4 py-3 px-4 bg-gray-50/40 animate-pulse"
                  >
                    <div className="h-3.5 w-24 bg-gray-200 rounded" />
                    <div className="h-3.5 w-32 bg-gray-200 rounded" />
                    <div className="h-5 w-20 bg-gray-200 rounded-full" />
                    <div className="h-3.5 w-16 bg-gray-200 rounded" />
                    <div className="h-5 w-24 bg-gray-200 rounded-full" />
                    <div className="h-3.5 w-12 bg-gray-200 rounded" />
                    <div className="h-3.5 w-10 bg-gray-200 rounded" />
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile Skeleton View */}
            <div className="md:hidden space-y-2.5">
              <div className="mb-2 flex items-center justify-center gap-2 text-primary">
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="text-[11px] font-medium">กำลังโหลดข้อมูล...</span>
              </div>
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg border border-gray-100 bg-gray-50/40 animate-pulse space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="h-3.5 w-28 bg-gray-200 rounded" />
                    <div className="h-4 w-14 bg-gray-200 rounded-full" />
                  </div>
                  <div className="h-3 w-36 bg-gray-200 rounded" />
                  <div className="h-2.5 w-24 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="py-10 text-center text-gray-500">
            <p className="text-[13px] font-medium text-gray-700">
              {isFilterActive
                ? "ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหาหรือตัวกรองที่เลือก"
                : "ยังไม่มีรายการประเมินในระบบ"}
            </p>
            {isFilterActive ? (
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 text-[12px] font-medium transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>ล้างตัวกรองทั้งหมด</span>
              </button>
            ) : (
              <p className="mt-1 text-[11px] text-gray-400">
                เมื่อบันทึกแบบประเมิน ข้อมูลจะแสดงที่นี่อัตโนมัติ
              </p>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-170">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-[12px] font-semibold text-gray-500">
                    <th className="py-2.5 px-3.5 whitespace-nowrap">วันที่และเวลา</th>
                    <th className="py-2.5 px-3.5 whitespace-nowrap">รหัสการประเมิน</th>
                    <th className="py-2.5 px-3.5 whitespace-nowrap text-center">ประเภท</th>
                    <th className="py-2.5 px-3.5 whitespace-nowrap">หมวดหมู่</th>
                    <th className="py-2.5 px-3.5 whitespace-nowrap text-center">ผลการประเมิน</th>
                    <th className="py-2.5 px-3.5 whitespace-nowrap text-center">ผังห้อง</th>
                    <th className="py-2.5 px-3.5 whitespace-nowrap text-right">ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-[13px] text-gray-800">
                  {items.map((item) => {
                    const categoryLabel =
                      ASSESSMENT_CATEGORY_LABELS[item.assessment_category] ||
                      item.assessment_category;

                    return (
                      <tr
                        key={item.submission_code}
                        className="hover:bg-blue-50/30 transition-colors"
                      >
                        {/* Date & Time */}
                        <td
                          suppressHydrationWarning
                          className="py-2.5 px-3.5 text-gray-500 text-[12px] whitespace-nowrap"
                        >
                          {formatDateTimeThai(item.completed_at || (item as any).created_at)}
                        </td>

                        {/* Submission Code */}
                        <td className="py-2.5 px-3.5 whitespace-nowrap">
                          <Link
                            href={`${ROUTES.RESULT}?submissionId=${item.submission_code}`}
                            className="font-mono text-primary font-semibold hover:underline"
                          >
                            {item.submission_code}
                          </Link>
                        </td>

                        {/* Type Badge */}
                        <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                          {getTypeBadge(item.assessment_type)}
                        </td>

                        {/* Category */}
                        <td className="py-2.5 px-3.5 font-medium text-gray-700 whitespace-nowrap">
                          {categoryLabel}
                        </td>

                        {/* Result Status */}
                        <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                          {item.overall_level ? (
                            <div className="inline-flex items-center gap-1">
                              <StatusBadge status={item.overall_level} />
                              {item.overall_score !== undefined &&
                                item.overall_score !== null && (
                                  <span className="text-[11px] font-medium text-gray-500">
                                    ({item.overall_score})
                                  </span>
                                )}
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>

                        {/* Layout Status */}
                        <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                          {item.assessment_type === "environment" ? (
                            item.has_layout ? (
                              <span className="inline-flex items-center rounded-md bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                                มีผังห้อง
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-md bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                                รอแนบ
                              </span>
                            )
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                          <Link
                            href={`${ROUTES.RESULT}?submissionId=${item.submission_code}`}
                            className="inline-flex items-center gap-1 text-[12px] font-medium text-primary hover:underline"
                          >
                            <span>ดูผล</span>
                            <ChevronRightIcon className="h-3.5 w-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Compact List View (< md) */}
            <div className="md:hidden divide-y divide-gray-100">
              {items.map((item) => {
                const typeLabel =
                  ASSESSMENT_TYPE_LABELS[item.assessment_type] || item.assessment_type;
                const categoryLabel =
                  ASSESSMENT_CATEGORY_LABELS[item.assessment_category] ||
                  item.assessment_category;

                return (
                  <Link
                    key={item.submission_code}
                    href={`${ROUTES.RESULT}?submissionId=${item.submission_code}`}
                    className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  >
                    {/* Left Column: Code + Info */}
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[12px] font-bold text-primary truncate">
                          {item.submission_code}
                        </span>
                        {item.assessment_type === "environment" && (
                          item.has_layout ? (
                            <span className="rounded bg-emerald-50 border border-emerald-200 px-1 py-0.2 text-[9px] font-semibold text-emerald-700 shrink-0">
                              มีผัง
                            </span>
                          ) : (
                            <span className="rounded bg-amber-50 border border-amber-200 px-1 py-0.2 text-[9px] font-semibold text-amber-700 shrink-0">
                              รอแนบ
                            </span>
                          )
                        )}
                      </div>
                      <p className="mt-0.5 text-[11px] text-gray-500 truncate">
                        {typeLabel} • {categoryLabel}
                      </p>
                      <p
                        suppressHydrationWarning
                        className="text-[10px] text-gray-400"
                      >
                        {formatDateTimeThai(item.completed_at || (item as any).created_at)}
                      </p>
                    </div>

                    {/* Right Column: Status Badge & Chevron */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.overall_level && (
                        <StatusBadge status={item.overall_level} className="text-[10px] px-2 py-0.5" />
                      )}
                      <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}

        {/* Compact Pagination Footer */}
        {totalItems > 0 && (
          <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-3 py-2 text-[11px] text-gray-500">
            {/* Range and page size */}
            <div className="flex items-center gap-2">
              <span>
                <strong>{startIndex + 1}</strong>-
                <strong>{Math.min(startIndex + pageSize, totalItems)}</strong> จาก{" "}
                <strong>{totalItems}</strong>
              </span>

              <div className="hidden sm:flex items-center gap-1">
                <span className="text-gray-400">|</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[11px] text-gray-700 focus:outline-none cursor-pointer"
                >
                  <option value={10}>10/หน้า</option>
                  <option value={20}>20/หน้า</option>
                  <option value={50}>50/หน้า</option>
                </select>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                title="หน้าแรก"
                className="inline-flex h-6 w-6 items-center justify-center rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronsLeft className="h-3 w-3" />
              </button>

              <button
                type="button"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                title="ก่อนหน้า"
                className="inline-flex h-6 w-6 items-center justify-center rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-3 w-3" />
              </button>

              <span className="px-2 text-[11px] font-medium text-gray-700">
                {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                title="ถัดไป"
                className="inline-flex h-6 w-6 items-center justify-center rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronRight className="h-3 w-3" />
              </button>

              <button
                type="button"
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
                title="หน้าสุดท้าย"
                className="inline-flex h-6 w-6 items-center justify-center rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronsRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
