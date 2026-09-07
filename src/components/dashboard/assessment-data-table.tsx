"use client";

import { useState, useMemo } from "react";
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
} from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";
import {
  ASSESSMENT_TYPE_LABELS,
  ASSESSMENT_CATEGORY_LABELS,
  ROUTES,
} from "@/lib/constants";
import { formatDateTimeThai, cn } from "@/lib/utils";
import type { AssessmentType, AssessmentCategory, RiskLevel } from "@/types";

export interface AssessmentRecord {
  id: number | string;
  submission_code: string;
  assessment_type: AssessmentType;
  assessment_category: AssessmentCategory;
  completed_at: string;
  overall_score?: number | null;
  overall_level?: RiskLevel | null;
  has_layout?: boolean;
}

interface AssessmentDataTableProps {
  data: AssessmentRecord[];
  className?: string;
  initialPageSize?: number;
}

export function AssessmentDataTable({
  data,
  className = "",
  initialPageSize = 5,
}: AssessmentDataTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Filter and Sort Data
  const filteredData = useMemo(() => {
    return data
      .filter((item) => {
        const matchesSearch = item.submission_code
          .toLowerCase()
          .includes(searchTerm.toLowerCase().trim());
        const matchesType =
          selectedType === "all" || item.assessment_type === selectedType;
        return matchesSearch && matchesType;
      })
      .sort((a, b) => {
        const dateA = new Date(a.completed_at).getTime();
        const dateB = new Date(b.completed_at).getTime();
        return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
      });
  }, [data, searchTerm, selectedType, sortOrder]);

  // Pagination Math
  const totalItems = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const paginatedData = filteredData.slice(startIndex, startIndex + pageSize);

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

  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      {/* Compact Search & Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="ค้นหารหัส เช่น SUB-..."
            className="h-8 w-full rounded-lg border border-gray-200 bg-white pl-8 pr-3 text-[12px] text-gray-800 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
          />
        </div>

        {/* Filter Dropdown & Sort Button */}
        <div className="flex items-center gap-1.5">
          <div className="relative">
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setCurrentPage(1);
              }}
              className="h-8 rounded-lg border border-gray-200 bg-white pl-2.5 pr-6 text-[12px] text-gray-700 focus:border-primary focus:outline-none transition-all cursor-pointer appearance-none"
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
            onClick={() => setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))}
            title={sortOrder === "desc" ? "เรียงจากล่าสุดไปเก่าสุด" : "เรียงจากเก่าสุดไปล่าสุด"}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 text-[11px] font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all cursor-pointer shrink-0"
          >
            <ArrowUpDown className="h-3 w-3" />
            <span>{sortOrder === "desc" ? "ล่าสุด" : "เก่าสุด"}</span>
          </button>
        </div>
      </div>

      {/* Main Table Container (Clean White Card with Subtle Border) */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-xs overflow-hidden">
        {paginatedData.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            <p className="text-[13px]">ไม่พบข้อมูลที่ตรงกับการค้นหา</p>
            {(searchTerm || selectedType !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedType("all");
                }}
                className="mt-1.5 text-[12px] text-primary hover:underline font-medium"
              >
                ล้างตัวกรอง
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[680px]">
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
                  {paginatedData.map((item) => {
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
                          {formatDateTimeThai(item.completed_at)}
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
              {paginatedData.map((item) => {
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
                        {formatDateTimeThai(item.completed_at)}
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
                  <option value={5}>5/หน้า</option>
                  <option value={10}>10/หน้า</option>
                  <option value={20}>20/หน้า</option>
                </select>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handlePageChange(1)}
                disabled={validCurrentPage === 1}
                title="หน้าแรก"
                className="inline-flex h-6 w-6 items-center justify-center rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronsLeft className="h-3 w-3" />
              </button>

              <button
                type="button"
                onClick={() => handlePageChange(validCurrentPage - 1)}
                disabled={validCurrentPage === 1}
                title="ก่อนหน้า"
                className="inline-flex h-6 w-6 items-center justify-center rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-3 w-3" />
              </button>

              <span className="px-2 text-[11px] font-medium text-gray-700">
                {validCurrentPage} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() => handlePageChange(validCurrentPage + 1)}
                disabled={validCurrentPage === totalPages}
                title="ถัดไป"
                className="inline-flex h-6 w-6 items-center justify-center rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-3 w-3" />
              </button>

              <button
                type="button"
                onClick={() => handlePageChange(totalPages)}
                disabled={validCurrentPage === totalPages}
                title="หน้าสุดท้าย"
                className="inline-flex h-6 w-6 items-center justify-center rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
