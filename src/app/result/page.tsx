"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  AlertTriangle,
  AlertCircle,
  Save,
  Trash2,
  Home,
  CheckCircle2,
  XCircle,
  Printer,
  Calendar,
  MapPin,
  User,
  Clock,
  Info,
  Building,
  Briefcase,
  Wrench,
  Shield,
  Eye,
  ExternalLink,
  X,
  Star,
  FileText,
  RotateCcw,
  Loader2,
  ArrowLeft,
  Download,
} from "lucide-react";
import { PageHeader } from "@/components/layout";
import { FileUpload } from "@/components/forms";
import { ImageLightboxModal } from "@/components/ui";
import { ROUTES, ASSESSMENT_CATEGORY_LABELS } from "@/lib/constants";
import { getResult, updateSubmissionLayout, deleteSubmission } from "@/lib/api";
import type { LayoutFileInfo, AssessmentCategory } from "@/types";
import {
  calculateAverage,
  evaluateEnvironmentResult,
  LIGHT_POINT_STANDARDS,
  NOISE_STANDARDS,
  HEAT_STANDARDS,
  HEAT_WORKLOADS,
} from "@/lib/environment-schema";
import {
  calculateHealthRiskScore,
  evaluateHealthRiskResult,
} from "@/lib/health-risk-schema";
import {
  HEALTH_RISK_QUESTIONS,
  type HealthRiskQuestion,
} from "@/lib/health-risk-data";
import { calculateSatisfactionResult } from "@/lib/satisfaction-schema";
import { cn, formatFileSize } from "@/lib/utils";

function ResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const submissionId = searchParams.get("submissionId");

  const [submission, setSubmission] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [layoutFile, setLayoutFile] = useState<LayoutFileInfo | null>(null);
  const [stagedLayoutFile, setStagedLayoutFile] = useState<LayoutFileInfo | null>(null);
  const [isSavingLayout, setIsSavingLayout] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteLayoutModalOpen, setIsDeleteLayoutModalOpen] = useState(false);
  const [isDeletingLayout, setIsDeletingLayout] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load submission function with loading & error handling
  const loadSubmissionData = async () => {
    if (!submissionId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setFetchError(null);

    let localData: any = null;

    // 1. Check localStorage for fast cache
    try {
      const stored = localStorage.getItem("save_check_submissions");
      if (stored) {
        const list = JSON.parse(stored);
        const found = list.find(
          (item: any) =>
            item.submission_code === submissionId ||
            String(item.id) === submissionId
        );
        if (found) {
          localData = found;
          setSubmission(found);
          setLayoutFile(found.layout_file || null);
          setStagedLayoutFile(found.layout_file || null);
        }
      }
    } catch (err) {
      console.error("Error loading submission from localStorage", err);
    }

    // 2. Fetch fresh data from Cloudflare Workers API
    try {
      const res = await getResult(submissionId);
      if (res.success) {
        setSubmission(res.data);
        setLayoutFile(res.data.layout_file || null);
        setStagedLayoutFile(res.data.layout_file || null);
        setFetchError(null);
      } else {
        if (!localData) {
          setSubmission(null);
          setFetchError(
            res.error?.message ||
              "ไม่พบข้อมูลผลการประเมินนี้ในระบบ หรือรหัสเอกสารไม่ถูกต้อง"
          );
        }
      }
    } catch (err: any) {
      console.warn("API error fetching submission", err);
      if (!localData) {
        setSubmission(null);
        setFetchError(
          "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วลองใหม่อีกครั้ง"
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissionData();
  }, [submissionId]);

  // Lock background scroll when modal is open
  useEffect(() => {
    if (isDeleteModalOpen || isDeleteLayoutModalOpen || !!previewImage) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          if (previewImage) setPreviewImage(null);
          if (isDeleteModalOpen && !isDeleting) setIsDeleteModalOpen(false);
          if (isDeleteLayoutModalOpen && !isDeletingLayout) setIsDeleteLayoutModalOpen(false);
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isDeleteModalOpen, isDeleteLayoutModalOpen, previewImage, isDeleting, isDeletingLayout]);

  // Check if there are newly uploaded/changed layout files waiting to be saved
  const hasLayoutChanges =
    stagedLayoutFile !== null &&
    JSON.stringify(layoutFile?.fileData || null) !==
    JSON.stringify(stagedLayoutFile?.fileData || null);

  // Handle explicit save of newly uploaded/changed layout file to DB
  const handleSaveLayout = async () => {
    if (!submissionId || !stagedLayoutFile) return;
    setIsSavingLayout(true);
    try {
      await updateSubmissionLayout(submissionId, stagedLayoutFile);
      setLayoutFile(stagedLayoutFile);

      // Update localStorage cache
      try {
        const stored = localStorage.getItem("save_check_submissions");
        const list = stored ? JSON.parse(stored) : [];
        const foundIndex = list.findIndex(
          (item: any) => item.submission_code === submissionId
        );

        if (foundIndex >= 0) {
          list[foundIndex] = {
            ...list[foundIndex],
            layout_file: stagedLayoutFile,
            has_layout: true,
            updated_at: new Date().toISOString(),
          };
        } else if (submission) {
          list.unshift({
            ...submission,
            layout_file: stagedLayoutFile,
            has_layout: true,
            updated_at: new Date().toISOString(),
          });
        }

        localStorage.setItem("save_check_submissions", JSON.stringify(list));
      } catch (err) {
        console.error("Failed to update layout in localStorage", err);
      }

      setFeedbackMessage("บันทึกไฟล์ผังพื้นที่ห้อง (Layout) ลงระบบเรียบร้อยแล้ว");

      setTimeout(() => {
        setFeedbackMessage(null);
      }, 3500);
    } catch (err) {
      console.error("Failed to save layout to backend API", err);
      setFeedbackMessage("เกิดข้อผิดพลาดในการบันทึกไฟล์ผังห้อง กรุณาลองใหม่อีกครั้ง");
      setTimeout(() => {
        setFeedbackMessage(null);
      }, 4000);
    } finally {
      setIsSavingLayout(false);
    }
  };

  // Handle delete layout file directly after modal confirmation
  const handleConfirmDeleteLayout = async () => {
    if (!submissionId) return;
    setIsDeletingLayout(true);
    try {
      await updateSubmissionLayout(submissionId, null);
      setLayoutFile(null);
      setStagedLayoutFile(null);

      // Update localStorage cache
      try {
        const stored = localStorage.getItem("save_check_submissions");
        const list = stored ? JSON.parse(stored) : [];
        const foundIndex = list.findIndex(
          (item: any) => item.submission_code === submissionId
        );

        if (foundIndex >= 0) {
          list[foundIndex] = {
            ...list[foundIndex],
            layout_file: null,
            has_layout: false,
            updated_at: new Date().toISOString(),
          };
          localStorage.setItem("save_check_submissions", JSON.stringify(list));
        }
      } catch (err) {
        console.error("Failed to update layout in localStorage", err);
      }

      setIsDeleteLayoutModalOpen(false);
      setFeedbackMessage("ลบไฟล์ผังพื้นที่ห้องออกจากระบบเรียบร้อยแล้ว");

      setTimeout(() => {
        setFeedbackMessage(null);
      }, 3500);
    } catch (err) {
      console.error("Failed to delete layout file from backend API", err);
      setFeedbackMessage("เกิดข้อผิดพลาดในการลบไฟล์ผังห้อง กรุณาลองใหม่อีกครั้ง");
      setTimeout(() => {
        setFeedbackMessage(null);
      }, 4000);
    } finally {
      setIsDeletingLayout(false);
    }
  };

  // Handle delete submission
  const handleDeleteSubmission = async () => {
    if (!submissionId) return;
    setIsDeleting(true);
    try {
      await deleteSubmission(submissionId);

      // Remove from localStorage
      try {
        const stored = localStorage.getItem("save_check_submissions");
        if (stored) {
          const list = JSON.parse(stored);
          const filtered = list.filter(
            (item: any) =>
              item.submission_code !== submissionId &&
              String(item.id) !== submissionId
          );
          localStorage.setItem("save_check_submissions", JSON.stringify(filtered));
        }
      } catch (err) {
        console.error("Failed to update localStorage after delete", err);
      }

      router.push(ROUTES.DASHBOARD);
    } catch (err) {
      console.error("Failed to delete submission", err);
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
      setFeedbackMessage("เกิดข้อผิดพลาดในการลบข้อมูล กรุณาลองใหม่อีกครั้ง");
      setTimeout(() => {
        setFeedbackMessage(null);
      }, 4000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!submissionId) {
    return (
      <div className="flex min-h-dvh flex-col pb-safe-nav">
        <PageHeader title="ผลการประเมิน" showBack />
        <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
          <div className="w-full max-w-md mx-auto text-center glass-card p-8 animate-scale-up">
            <div
              className="icon-container mx-auto mb-4"
              style={{
                background:
                  "linear-gradient(135deg, rgba(254, 243, 199, 0.95), rgba(255, 251, 235, 0.8))",
              }}
            >
              <AlertTriangle className="h-7 w-7 text-warning" strokeWidth={2} />
            </div>
            <h2 className="text-section-title font-bold text-text-primary">
              ไม่ระบุรหัสการประเมิน
            </h2>
            <p className="mt-2 text-small text-text-secondary">
              กรุณาระบุรหัสการประเมิน (submissionId) ใน URL ให้ถูกต้อง
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href={ROUTES.DASHBOARD}
                className="inline-flex items-center justify-center gap-2 btn-primary-gradient px-5 py-2.5 text-small font-medium"
              >
                <ArrowLeft className="h-4 w-4" />
                ประวัติการประเมิน
              </Link>
              <Link
                href={ROUTES.HOME}
                className="inline-flex items-center justify-center gap-2 rounded-button border border-border bg-white/80 px-4 py-2.5 text-small font-medium text-text-primary hover:bg-white shadow-xs transition-colors"
              >
                <Home className="h-4 w-4" />
                กลับหน้าแรก
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // 1. Loading state (clean & minimal spinner)
  if (isLoading && !submission) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-small font-medium text-text-secondary">
            กำลังโหลด...
          </p>
        </div>
      </div>
    );
  }

  // 2. Error / Not Found state (when fetch failed or submission not found)
  if (fetchError || !submission) {
    return (
      <div className="flex min-h-dvh flex-col pb-safe-nav">
        <PageHeader title="ผลการประเมิน" showBack />
        <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
          <div className="w-full max-w-md mx-auto text-center glass-card p-8 animate-scale-up shadow-lg">
            <div
              className="icon-container mx-auto mb-4"
              style={{
                background:
                  "linear-gradient(135deg, rgba(254, 242, 242, 0.95), rgba(254, 226, 226, 0.8))",
              }}
            >
              <AlertCircle className="h-8 w-8 text-danger" strokeWidth={2} />
            </div>
            <h2 className="text-section-title font-bold text-text-primary">
              ดึงข้อมูลไม่สำเร็จ
            </h2>
            <p className="mt-2 text-small text-text-secondary leading-relaxed">
              {fetchError || "ไม่พบข้อมูลผลการประเมินในระบบ กรุณาตรวจสอบรหัสเอกสารอีกครั้ง"}
            </p>
            {submissionId && (
              <div className="mt-3 inline-flex items-center gap-1 rounded-md bg-red-50 border border-red-100 px-3 py-1 font-mono text-caption text-red-600">
                รหัส: {submissionId}
              </div>
            )}
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={loadSubmissionData}
                className="inline-flex items-center justify-center gap-2 btn-primary-gradient px-5 py-2.5 text-small font-medium cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" />
                ลองใหม่อีกครั้ง
              </button>
              <Link
                href={ROUTES.DASHBOARD}
                className="inline-flex items-center justify-center gap-2 rounded-button border border-border bg-white/80 px-4 py-2.5 text-small font-medium text-text-primary hover:bg-white shadow-xs transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                ประวัติการประเมิน
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const isEnvironment = submission?.assessment_type === "environment";
  const isHealthRisk = submission?.assessment_type === "health_risk";
  const isSatisfaction = submission?.assessment_type === "satisfaction";
  const category = (submission?.assessment_category || "general") as AssessmentCategory;
  const answers = (submission?.answers || {}) as any;
  const inspectionData = submission?.inspectionData;
  const profile = submission?.profile;
  const workInfo = submission?.workInfo;

  const categoryLabel = submission?.assessment_category
    ? ASSESSMENT_CATEGORY_LABELS[submission.assessment_category as keyof typeof ASSESSMENT_CATEGORY_LABELS]
    : "สภาพแวดล้อม";

  const unitLabel =
    category === "light" ? "Lux" : category === "noise" ? "dBA" : "°C";

  // Process Environment points
  let processedLightPoints: Array<{
    pointNo: number;
    location_desc: string;
    measure: number;
    standard_display: string;
    isPass: boolean;
    remark: string;
  }> = [];

  let processedNoisePoints: Array<{
    pointNo: number;
    location_desc: string;
    min_dBA: number;
    max_dBA: number;
    avg_dBA: number;
    standard_display: string;
    isPass: boolean;
    remark: string;
  }> = [];

  let processedHeatPoints: Array<{
    pointNo: number;
    location_desc: string;
    start_time: string;
    end_time: string;
    total_time: string;
    db_temp: number | "-";
    wb_temp: number | "-";
    gt_temp: number | "-";
    wbgt_in: number | "-";
    wbgt_type: string;
    workload_label: string;
    wbgt_avg: number;
    standard_value: number;
    isPass: boolean;
    remark: string;
  }> = [];

  let envEvaluation: {
    isPass: boolean;
    score: number;
    message: string;
    calculatedValue?: number;
  } | null = null;

  let envAverage = 0;

  if (isEnvironment && answers) {
    if (category === "light") {
      if (answers.light_areas && Array.isArray(answers.light_areas) && answers.light_areas.length > 0) {
        let totalPass = 0;
        const vals: number[] = [];

        processedLightPoints = answers.light_areas.map((pt: any, index: number) => {
          const measureVal = Number(pt.measure) || 0;
          vals.push(measureVal);

          const stdObj = LIGHT_POINT_STANDARDS.find(
            (s) => s.value === Number(pt.standard_value)
          );
          const stdDisplay = stdObj
            ? stdObj.display
            : pt.standard_value?.toString() || "-";
          const minStd = Number(pt.standard_value) || 0;
          const isPass = measureVal >= minStd;
          if (isPass) totalPass++;

          return {
            pointNo: index + 1,
            location_desc: pt.location_desc || "-",
            measure: measureVal,
            standard_display: stdDisplay,
            isPass,
            remark: pt.remark || "",
          };
        });

        if (vals.length > 0) {
          const sum = vals.reduce((acc, curr) => acc + curr, 0);
          envAverage = Number((sum / vals.length).toFixed(2));
          const allPass = totalPass === processedLightPoints.length;

          envEvaluation = {
            isPass: allPass,
            score: 0,
            message: allPass
              ? "ระดับแสงสว่างทุกจุดตรวจวัดผ่านเกณฑ์มาตรฐาน ควรรักษาระดับแสงสว่างให้เพียงพออย่างต่อเนื่อง"
              : `พบจุดตรวจวัดที่ไม่ผ่านเกณฑ์มาตรฐานจำนวน ${
                  processedLightPoints.length - totalPass
                } จุด ควรเพิ่มหลอดไฟหรือจัดแสงสว่างในพื้นที่ดังกล่าว`,
            calculatedValue: envAverage,
          };
        }
      }
    } else if (category === "noise") {
      if (answers.noise_areas && Array.isArray(answers.noise_areas) && answers.noise_areas.length > 0) {
        let totalPass = 0;
        const vals: number[] = [];

        processedNoisePoints = answers.noise_areas.map((pt: any, index: number) => {
          const avgVal = Number(pt.avg_dBA) || 0;
          vals.push(avgVal);

          const stdObj = NOISE_STANDARDS.find(
            (s) => s.value === Number(answers.standard_value)
          );
          const stdDisplay = stdObj
            ? stdObj.value.toString()
            : answers.standard_value?.toString() || "85";

          const maxStd = Number(answers.standard_value) || 85;
          const isPass = maxStd > 0 ? avgVal <= maxStd : true;
          if (isPass) totalPass++;

          return {
            pointNo: index + 1,
            location_desc: pt.location_desc || "-",
            min_dBA: Number(pt.min_dBA) || 0,
            max_dBA: Number(pt.max_dBA) || 0,
            avg_dBA: avgVal,
            standard_display: stdDisplay,
            isPass,
            remark: pt.remark || "",
          };
        });

        if (vals.length > 0) {
          const sum = vals.reduce((acc, curr) => acc + curr, 0);
          envAverage = Number((sum / vals.length).toFixed(2));
          const allPass = totalPass === processedNoisePoints.length;

          envEvaluation = {
            isPass: allPass,
            score: 0,
            message: allPass
              ? "ระดับเสียงภาพรวมผ่านเกณฑ์มาตรฐาน ควรรักษาสภาพแวดล้อมให้คงเดิม"
              : "ระดับเสียงภาพรวมเกินมาตรฐานที่กำหนด ควรจัดหาอุปกรณ์ป้องกันเสียง (PPE) ให้พนักงานหรือลดแหล่งกำเนิดเสียง",
            calculatedValue: envAverage,
          };
        }
      }
    } else if (category === "heat") {
      if (answers.heat_areas && Array.isArray(answers.heat_areas) && answers.heat_areas.length > 0) {
        let totalPass = 0;
        const vals: number[] = [];

        processedHeatPoints = answers.heat_areas.map((pt: any, index: number) => {
          const wbgtAvg = Number(pt.wbgt_avg) || 0;
          vals.push(wbgtAvg);

          const workloadObj = HEAT_WORKLOADS.find((w) => w.value === pt.workload);
          const workloadLabel = workloadObj ? workloadObj.label : pt.workload || "-";
          const standard =
            pt.standard_value !== undefined && pt.standard_value !== null
              ? Number(pt.standard_value)
              : HEAT_STANDARDS[pt.workload as keyof typeof HEAT_STANDARDS]?.value || 0;

          const isPass = standard > 0 ? wbgtAvg <= standard : true;
          if (isPass) totalPass++;

          let totalTime = "-";
          if (pt.start_time && pt.end_time) {
            const [startH, startM] = pt.start_time.split(":").map(Number);
            const [endH, endM] = pt.end_time.split(":").map(Number);
            const diffMins = endH * 60 + endM - (startH * 60 + startM);
            if (diffMins > 0) {
              totalTime = `${diffMins} นาที`;
            }
          }

          return {
            pointNo: index + 1,
            location_desc: pt.location_desc || "-",
            start_time: pt.start_time || "-",
            end_time: pt.end_time || "-",
            total_time: totalTime,
            db_temp:
              pt.db_temp !== undefined && pt.db_temp !== null && pt.db_temp !== ""
                ? Number(pt.db_temp)
                : "-",
            wb_temp:
              pt.wb_temp !== undefined && pt.wb_temp !== null && pt.wb_temp !== ""
                ? Number(pt.wb_temp)
                : "-",
            gt_temp:
              pt.gt_temp !== undefined && pt.gt_temp !== null && pt.gt_temp !== ""
                ? Number(pt.gt_temp)
                : "-",
            wbgt_in:
              pt.wbgt_in !== undefined && pt.wbgt_in !== null && pt.wbgt_in !== ""
                ? Number(pt.wbgt_in)
                : "-",
            wbgt_type: pt.wbgt_type || "in",
            workload_label: workloadLabel,
            wbgt_avg: wbgtAvg,
            standard_value: standard,
            isPass,
            remark: pt.remark || "",
          };
        });

        if (vals.length > 0) {
          const sum = vals.reduce((acc, curr) => acc + curr, 0);
          envAverage = Number((sum / vals.length).toFixed(2));
          const allPass = totalPass === processedHeatPoints.length;

          envEvaluation = {
            isPass: allPass,
            score: 0,
            message: allPass
              ? "ระดับความร้อนทุกจุดตรวจวัดอยู่ในเกณฑ์ปลอดภัยตามมาตรฐาน"
              : "ระดับความร้อนเกินมาตรฐาน ควรจัดเวลาพักหรือเพิ่มการระบายอากาศในพื้นที่ทำงาน",
            calculatedValue: envAverage,
          };
        }
      }
    }

    // Fallback for simple measure_1 / measure_2 / measure_3
    if (!envEvaluation && answers.standard_value) {
      const avg = calculateAverage(
        answers.measure_1,
        answers.measure_2,
        answers.measure_3
      );
      if (avg !== null) {
        envAverage = avg;
        envEvaluation = evaluateEnvironmentResult(
          envAverage,
          Number(answers.standard_value),
          category
        );
      }
    }
  }

  // Health Risk evaluation
  const hrScore =
    submission?.overall_score !== undefined
      ? submission.overall_score
      : answers && answers.q1 !== undefined
      ? calculateHealthRiskScore(answers)
      : null;

  const hrEval =
    isHealthRisk && hrScore !== null
      ? evaluateHealthRiskResult(hrScore, category)
      : null;

  // Health risk question details
  const hrQuestions =
    isHealthRisk && category !== "general"
      ? HEALTH_RISK_QUESTIONS[category as keyof typeof HEALTH_RISK_QUESTIONS] || []
      : [];

  // Satisfaction evaluation
  const satisfactionResult =
    isSatisfaction && answers && answers.q1 !== undefined
      ? calculateSatisfactionResult(answers)
      : null;

  return (
    <div className="flex min-h-dvh flex-col pb-safe-nav print:pb-0 print:bg-white">
      <PageHeader
        title="ผลการประเมิน"
        subtitle={`รหัส: ${submissionId}`}
        showBack
        className="print:hidden"
      />

      <main className="flex-1 px-4 py-5 md:px-8">
        <div className="mx-auto max-w-[840px] flex flex-col gap-5">
          {/* Feedback Toast */}
          {feedbackMessage && (
            <div className="flex items-center gap-2 rounded-card bg-emerald-50 border border-emerald-200 p-4 text-small text-emerald-800 shadow-sm animate-fade-in print:hidden">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
              <span className="font-medium">{feedbackMessage}</span>
            </div>
          )}

          {/* Assessment Overview Card */}
          <div className="glass-card p-6 animate-fade-in print:shadow-none print:border-gray-300 print:bg-white">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <span className="rounded-full bg-primary-tint px-3 py-1 text-caption font-semibold text-primary">
                  {isEnvironment
                    ? `ประเมินสภาพแวดล้อม — ${categoryLabel}`
                    : isHealthRisk
                    ? `ความเสี่ยงสุขภาพ — ${categoryLabel}`
                    : isSatisfaction
                    ? "แบบประเมินความพึงพอใจ"
                    : "ผลการประเมิน"}
                </span>
                <h2 className="mt-2 text-page-title font-bold text-text-primary">
                  {isEnvironment
                    ? `สรุปผลการประเมิน${categoryLabel}`
                    : isHealthRisk
                    ? `รายงานประเมินความเสี่ยงสุขภาพ (${categoryLabel})`
                    : "สรุปผลการประเมิน"}
                </h2>
              </div>
              <div className="text-right">
                <span className="text-caption text-text-tertiary">รหัสเอกสาร</span>
                <p className="font-mono text-small font-semibold text-text-primary">
                  {submissionId}
                </p>
                {submission?.created_at && (
                  <span
                    suppressHydrationWarning
                    className="text-[11px] text-text-tertiary block mt-0.5"
                  >
                    {new Date(submission.created_at).toLocaleDateString("th-TH")}
                  </span>
                )}
              </div>
            </div>

            {/* Inspection Details for Environment */}
            {isEnvironment && inspectionData && (
              <div className="mt-4 rounded-xl border border-border/80 bg-white/50 p-4 text-small text-text-secondary">
                <h3 className="mb-3 font-semibold text-text-primary flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  ข้อมูลทั่วไปการตรวจวัด
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2.5 gap-x-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-text-tertiary shrink-0" />
                    <span>
                      ผู้ตรวจประเมิน:{" "}
                      <strong className="text-text-primary font-medium">
                        {inspectionData.inspector_name || "-"}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-text-tertiary shrink-0" />
                    <span>
                      ตำแหน่ง:{" "}
                      <strong className="text-text-primary font-medium">
                        {inspectionData.position || "-"}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-text-tertiary shrink-0" />
                    <span className="truncate">
                      สถานที่ตรวจวัด:{" "}
                      <strong className="text-text-primary font-medium">
                        {inspectionData.inspection_location || "-"}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-text-tertiary shrink-0" />
                    <span>
                      วันที่ทำการตรวจ:{" "}
                      <strong className="text-text-primary font-medium">
                        {inspectionData.inspection_date || "-"}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-text-tertiary shrink-0" />
                    <span className="truncate">
                      เครื่องมือที่ใช้:{" "}
                      <strong className="text-text-primary font-medium">
                        {inspectionData.equipment || "-"}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-text-tertiary shrink-0" />
                    <span>
                      ช่วงเวลาที่ตรวจ:{" "}
                      <strong className="text-text-primary font-medium">
                        {inspectionData.start_time && inspectionData.end_time
                          ? `${inspectionData.start_time} - ${inspectionData.end_time} น.`
                          : "-"}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Profile & Work Info for Health Risk */}
            {isHealthRisk && (profile || workInfo) && (
              <div className="mt-4 rounded-xl border border-border/80 bg-white/50 p-4 text-small text-text-secondary">
                <h3 className="mb-3 font-semibold text-text-primary flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  ข้อมูลผู้รับการประเมิน
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2.5 gap-x-4">
                  {profile?.full_name && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-text-tertiary shrink-0" />
                      <span>
                        ชื่อ-นามสกุล:{" "}
                        <strong className="text-text-primary font-medium">
                          {profile.full_name}
                        </strong>
                      </span>
                    </div>
                  )}
                  {profile?.gender && (
                    <div className="flex items-center gap-2">
                      <span className="text-text-tertiary">เพศ:</span>
                      <strong className="text-text-primary font-medium">
                        {profile.gender === "male"
                          ? "ชาย"
                          : profile.gender === "female"
                          ? "หญิง"
                          : profile.gender}
                      </strong>
                    </div>
                  )}
                  {profile?.age && (
                    <div className="flex items-center gap-2">
                      <span className="text-text-tertiary">อายุ:</span>
                      <strong className="text-text-primary font-medium">
                        {profile.age} ปี
                      </strong>
                    </div>
                  )}
                  {(profile?.weight || profile?.height) && (
                    <div className="flex items-center gap-2">
                      <span className="text-text-tertiary">น้ำหนัก / ส่วนสูง:</span>
                      <strong className="text-text-primary font-medium">
                        {profile.weight || "-"} กก. / {profile.height || "-"} ซม.
                      </strong>
                    </div>
                  )}
                  {profile?.underlying_disease && (
                    <div className="flex items-center gap-2 sm:col-span-2">
                      <span className="text-text-tertiary">โรคประจำตัว:</span>
                      <strong className="text-text-primary font-medium">
                        {profile.underlying_disease}
                      </strong>
                    </div>
                  )}
                  {workInfo?.department && (
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-text-tertiary shrink-0" />
                      <span>
                        แผนก/ฝ่าย:{" "}
                        <strong className="text-text-primary font-medium">
                          {workInfo.department}
                        </strong>
                      </span>
                    </div>
                  )}
                  {workInfo?.position && (
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-text-tertiary shrink-0" />
                      <span>
                        ตำแหน่ง:{" "}
                        <strong className="text-text-primary font-medium">
                          {workInfo.position}
                        </strong>
                      </span>
                    </div>
                  )}
                  {workInfo?.work_years && (
                    <div className="flex items-center gap-2">
                      <span className="text-text-tertiary">อายุงาน:</span>
                      <strong className="text-text-primary font-medium">
                        {workInfo.work_years} ปี
                      </strong>
                    </div>
                  )}
                  {workInfo?.work_hours_per_day && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-text-tertiary shrink-0" />
                      <span>
                        ชั่วโมงทำงาน:{" "}
                        <strong className="text-text-primary font-medium">
                          {workInfo.work_hours_per_day} ชม./วัน
                        </strong>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Environment Result Evaluation Banner */}
            {isEnvironment && (
              <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 rounded-xl border p-4 transition-all bg-white/70">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white",
                      envEvaluation?.isPass === false
                        ? "bg-rose-500"
                        : "bg-emerald-500"
                    )}
                  >
                    {envEvaluation?.isPass === false ? (
                      <XCircle className="h-6 w-6" />
                    ) : (
                      <CheckCircle2 className="h-6 w-6" />
                    )}
                  </div>
                  <div>
                    <h3
                      className={cn(
                        "text-card-title font-semibold",
                        envEvaluation?.isPass === false
                          ? "text-rose-800"
                          : "text-emerald-800"
                      )}
                    >
                      {envEvaluation?.isPass === false
                        ? "ไม่ผ่านเกณฑ์มาตรฐานความปลอดภัย"
                        : "ผ่านเกณฑ์มาตรฐานความปลอดภัย"}
                    </h3>
                    <p className="text-caption text-text-secondary mt-0.5 leading-relaxed">
                      {envEvaluation?.message ||
                        "การตรวจวัดอยู่ในเกณฑ์มาตรฐานความปลอดภัยตามประกาศกฎกระทรวง"}
                    </p>
                  </div>
                </div>

                {envAverage > 0 && (
                  <div className="shrink-0 rounded-lg bg-white border border-border px-4 py-2.5 text-center sm:text-right shadow-xs">
                    <span className="text-[11px] text-text-tertiary block">
                      ค่าตรวจวัดเฉลี่ยรวม
                    </span>
                    <span className="text-card-title font-bold text-text-primary">
                      {envAverage} {unitLabel}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Health Risk Result Score & Status Banner */}
            {isHealthRisk && hrEval && (
              <div className="mt-4 flex flex-col gap-4">
                <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-border bg-white/50 text-center">
                  <span className="text-caption text-text-secondary">
                    คะแนนความเสี่ยงรวม (จาก 20 คะแนน)
                  </span>
                  <span
                    className={`text-h1 font-bold my-1 ${
                      hrEval.level === "pass"
                        ? "text-emerald-600"
                        : hrEval.level === "medium"
                        ? "text-amber-600"
                        : "text-rose-600"
                    }`}
                  >
                    {hrEval.score}
                  </span>
                  <span className="rounded-full px-3 py-1 text-caption font-semibold bg-white border border-border text-text-primary">
                    {hrEval.levelLabel}
                  </span>
                </div>

                <div
                  className={`flex items-start gap-3 rounded-xl p-4 border ${
                    hrEval.level === "pass"
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-900"
                      : hrEval.level === "medium"
                      ? "bg-amber-500/10 border-amber-500/20 text-amber-900"
                      : "bg-rose-500/10 border-rose-500/20 text-rose-900"
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white ${
                      hrEval.level === "pass"
                        ? "bg-emerald-500"
                        : hrEval.level === "medium"
                        ? "bg-amber-500"
                        : "bg-rose-500"
                    }`}
                  >
                    {hrEval.level === "pass" ? (
                      <CheckCircle2 className="h-6 w-6" />
                    ) : hrEval.level === "medium" ? (
                      <AlertTriangle className="h-6 w-6" />
                    ) : (
                      <XCircle className="h-6 w-6" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-card-title font-semibold">{hrEval.levelLabel}</h3>
                    <p className="text-small mt-1 leading-relaxed opacity-90">
                      {hrEval.message}
                    </p>
                  </div>
                </div>

                {/* Health Risk Recommendations Box */}
                {hrEval.recommendations && hrEval.recommendations.length > 0 && (
                  <div className="rounded-xl border border-primary/20 bg-primary-tint/30 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xl">
                        {category === "light"
                          ? "💡"
                          : category === "noise"
                          ? "🔊"
                          : "🌡️"}
                      </span>
                      <h4 className="text-small font-bold text-text-primary">
                        ข้อเสนอแนะ —{" "}
                        {category === "light"
                          ? "ด้านแสงสว่าง (Illumination)"
                          : category === "noise"
                          ? "ด้านเสียง (Noise)"
                          : "ด้านความร้อน (Heat)"}
                      </h4>
                      <span className="ml-auto rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-white/80 border border-border text-text-secondary">
                        {hrEval.levelLabel}
                      </span>
                    </div>
                    <ul className="flex flex-col gap-2.5">
                      {hrEval.recommendations.map((rec: string, idx: number) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2.5 text-small text-text-secondary leading-relaxed"
                        >
                          <span className="text-primary font-bold mt-0.5">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Satisfaction Summary */}
            {isSatisfaction && satisfactionResult && (
              <div className="mt-4 flex flex-col gap-4">
                <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-border bg-white/50 text-center">
                  <span className="text-caption text-text-secondary">
                    คะแนนความพึงพอใจเฉลี่ยรวม (เต็ม 5)
                  </span>
                  <div className="flex items-center gap-2 my-1">
                    <Star className="h-7 w-7 text-amber-500 fill-amber-500" />
                    <span className="text-h1 font-bold text-text-primary">
                      {satisfactionResult.overallAvg.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="rounded-lg border border-border bg-white/60 p-2.5">
                    <span className="text-[11px] text-text-secondary block">ด้านเนื้อหา</span>
                    <strong className="text-small font-bold text-text-primary">
                      {satisfactionResult.accuracyAvg.toFixed(2)}
                    </strong>
                  </div>
                  <div className="rounded-lg border border-border bg-white/60 p-2.5">
                    <span className="text-[11px] text-text-secondary block">ด้านการออกแบบ</span>
                    <strong className="text-small font-bold text-text-primary">
                      {satisfactionResult.designAvg.toFixed(2)}
                    </strong>
                  </div>
                  <div className="rounded-lg border border-border bg-white/60 p-2.5">
                    <span className="text-[11px] text-text-secondary block">ด้านการใช้งาน</span>
                    <strong className="text-small font-bold text-text-primary">
                      {satisfactionResult.usabilityAvg.toFixed(2)}
                    </strong>
                  </div>
                  <div className="rounded-lg border border-border bg-white/60 p-2.5">
                    <span className="text-[11px] text-text-secondary block">ด้านประโยชน์</span>
                    <strong className="text-small font-bold text-text-primary">
                      {satisfactionResult.usefulnessAvg.toFixed(2)}
                    </strong>
                  </div>
                </div>

                {satisfactionResult.suggestion && (
                  <div className="rounded-lg border border-border bg-white/50 p-3.5 text-small">
                    <span className="font-semibold text-text-primary block mb-1">
                      ข้อเสนอแนะเพิ่มเติม:
                    </span>
                    <p className="text-text-secondary italic">
                      &ldquo;{satisfactionResult.suggestion}&rdquo;
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ============================================================ */}
          {/* Detailed Measurement Report Tables (The Recorded Form Data!) */}
          {/* ============================================================ */}

          {/* Light Assessment Detailed Table */}
          {isEnvironment && category === "light" && processedLightPoints.length > 0 && (
            <div className="glass-card p-6 animate-fade-in print:shadow-none print:border-gray-300 print:bg-white">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-card-title font-semibold text-text-primary flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    รายงานผลการตรวจวัดระดับแสงสว่าง
                  </h3>
                  <p className="text-caption text-text-secondary mt-0.5">
                    รายละเอียดจุดตรวจวัด ค่าที่วัดได้ และเกณฑ์มาตรฐานความปลอดภัย
                  </p>
                </div>
                <span className="rounded-full bg-primary-tint px-2.5 py-1 text-[11px] font-semibold text-primary">
                  {processedLightPoints.length} จุดตรวจวัด
                </span>
              </div>

              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full text-left text-small border-collapse">
                  <thead>
                    <tr className="border-b border-border text-caption text-text-secondary bg-white/40 print:bg-gray-100">
                      <th className="py-2.5 px-3 text-center w-12 font-semibold">จุดที่</th>
                      <th className="py-2.5 px-3 font-semibold">สถานที่ / ลักษณะงาน</th>
                      <th className="py-2.5 px-3 text-right font-semibold">
                        ผลตรวจวัด<br />(Lux)
                      </th>
                      <th className="py-2.5 px-3 text-center font-semibold">
                        ค่ามาตรฐาน<br />(Lux)
                      </th>
                      <th className="py-2.5 px-3 text-center font-semibold">สรุปผล</th>
                      <th className="py-2.5 px-3 font-semibold">หมายเหตุ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {processedLightPoints.map((pt) => (
                      <tr key={pt.pointNo} className="hover:bg-white/30 transition-colors">
                        <td className="py-3 px-3 text-center font-medium text-text-secondary">
                          {pt.pointNo}
                        </td>
                        <td className="py-3 px-3 font-medium text-text-primary">
                          {pt.location_desc}
                        </td>
                        <td
                          className={cn(
                            "py-3 px-3 text-right font-bold",
                            pt.isPass ? "text-text-primary" : "text-danger"
                          )}
                        >
                          {pt.measure}
                        </td>
                        <td className="py-3 px-3 text-center text-text-secondary">
                          {pt.standard_display}
                        </td>
                        <td className="py-3 px-3 text-center font-medium">
                          {pt.isPass ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-caption bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle2 className="h-3.5 w-3.5" /> ผ่าน
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-700 font-semibold text-caption bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                              <XCircle className="h-3.5 w-3.5" /> ไม่ผ่าน
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-caption text-text-secondary">
                          {pt.remark || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border/80 bg-white/50 font-semibold text-small">
                      <td colSpan={2} className="py-3 px-3 text-text-primary text-right">
                        ค่าเฉลี่ยระดับแสงสว่างรวม:
                      </td>
                      <td className="py-3 px-3 text-right text-primary font-bold">
                        {envAverage} Lux
                      </td>
                      <td colSpan={3} className="py-3 px-3 text-caption text-text-secondary">
                        ผ่าน {processedLightPoints.filter((p) => p.isPass).length} /{" "}
                        {processedLightPoints.length} จุด
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Noise Assessment Detailed Table */}
          {isEnvironment && category === "noise" && processedNoisePoints.length > 0 && (
            <div className="glass-card p-6 animate-fade-in print:shadow-none print:border-gray-300 print:bg-white">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-card-title font-semibold text-text-primary flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    รายงานผลการตรวจวัดระดับเสียง
                  </h3>
                  <p className="text-caption text-text-secondary mt-0.5">
                    ระดับเสียงต่ำสุด สูงสุด และค่าเฉลี่ย เปรียบเทียบกับค่ามาตรฐาน
                  </p>
                </div>
                <span className="rounded-full bg-primary-tint px-2.5 py-1 text-[11px] font-semibold text-primary">
                  {processedNoisePoints.length} จุดตรวจวัด
                </span>
              </div>

              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full text-left text-small border-collapse border border-border">
                  <thead>
                    <tr className="border-b border-border text-caption text-text-secondary bg-white/40 print:bg-gray-100">
                      <th
                        rowSpan={2}
                        className="py-2.5 px-3 text-center w-12 font-semibold border-r border-border"
                      >
                        จุดที่
                      </th>
                      <th
                        rowSpan={2}
                        className="py-2.5 px-3 font-semibold border-r border-border text-center"
                      >
                        สถานที่ / แผนก
                      </th>
                      <th
                        colSpan={3}
                        className="py-2 px-2 text-center font-semibold border-r border-border"
                      >
                        ผลการตรวจวัดระดับเสียง (dB(A))
                      </th>
                      <th
                        rowSpan={2}
                        className="py-2.5 px-2 text-center font-semibold border-r border-border"
                      >
                        ค่ามาตรฐาน
                      </th>
                      <th rowSpan={2} className="py-2.5 px-2 text-center font-semibold">
                        สรุปผล & หมายเหตุ
                      </th>
                    </tr>
                    <tr className="border-b border-border text-caption text-text-secondary bg-white/40 print:bg-gray-100">
                      <th className="py-2 px-2 text-center font-medium border-r border-border">
                        ต่ำสุด
                      </th>
                      <th className="py-2 px-2 text-center font-medium border-r border-border">
                        สูงสุด
                      </th>
                      <th className="py-2 px-2 text-center font-bold border-r border-border">
                        เฉลี่ย
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {processedNoisePoints.map((pt) => (
                      <tr key={pt.pointNo} className="hover:bg-white/30 transition-colors">
                        <td className="py-3 px-3 text-center font-medium text-text-secondary border-r border-border">
                          {pt.pointNo}
                        </td>
                        <td className="py-3 px-3 font-medium text-text-primary border-r border-border">
                          {pt.location_desc}
                        </td>
                        <td className="py-3 px-2 text-center font-medium text-text-secondary border-r border-border">
                          {pt.min_dBA}
                        </td>
                        <td className="py-3 px-2 text-center font-medium text-text-secondary border-r border-border">
                          {pt.max_dBA}
                        </td>
                        <td
                          className={cn(
                            "py-3 px-2 text-center font-bold border-r border-border",
                            pt.isPass ? "text-text-primary" : "text-danger"
                          )}
                        >
                          {pt.avg_dBA}
                        </td>
                        <td className="py-3 px-2 text-center font-medium text-text-secondary border-r border-border">
                          ≤ {pt.standard_display} dB(A)
                        </td>
                        <td className="py-3 px-3 text-center font-medium">
                          {pt.isPass ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-caption bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              ผ่าน
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-700 font-semibold text-caption bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                              ไม่ผ่าน
                            </span>
                          )}
                          {pt.remark && (
                            <span className="block text-[11px] text-text-secondary mt-1">
                              {pt.remark}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border/80 bg-white/50 font-semibold text-small">
                      <td colSpan={4} className="py-3 px-3 text-text-primary text-right border-r border-border">
                        ค่าเฉลี่ยระดับเสียงรวม:
                      </td>
                      <td className="py-3 px-2 text-center text-primary font-bold border-r border-border">
                        {envAverage} dB(A)
                      </td>
                      <td colSpan={2} className="py-3 px-3 text-caption text-text-secondary">
                        ผ่าน {processedNoisePoints.filter((p) => p.isPass).length} /{" "}
                        {processedNoisePoints.length} จุด
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="mt-4 text-caption text-text-secondary">
                <p>
                  <span className="font-semibold">*หมายเหตุ:</span>{" "}
                  ค่ามาตรฐานอ้างอิงตามประกาศกรมสวัสดิการและคุ้มครองแรงงาน เรื่อง
                  มาตรฐานระดับเสียงที่ยอมให้ลูกจ้างได้รับเฉลี่ยตลอดระยะเวลาการทำงานในแต่ละวัน พ.ศ. 2561
                </p>
              </div>
            </div>
          )}

          {/* Heat Assessment Detailed Table */}
          {isEnvironment && category === "heat" && processedHeatPoints.length > 0 && (
            <div className="glass-card p-6 animate-fade-in print:shadow-none print:border-gray-300 print:bg-white">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-card-title font-semibold text-text-primary flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    รายงานผลการตรวจวัดระดับความร้อน
                  </h3>
                  <p className="text-caption text-text-secondary mt-0.5">
                    ดัชนีความร้อน WBGT, อุณหภูมิกระเปาะ, ภาระงาน และการประเมินมาตรฐาน
                  </p>
                </div>
                <span className="rounded-full bg-primary-tint px-2.5 py-1 text-[11px] font-semibold text-primary">
                  {processedHeatPoints.length} จุดตรวจวัด
                </span>
              </div>

              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full text-left text-[11px] border-collapse border border-border">
                  <thead>
                    <tr className="border-b border-border text-text-secondary bg-white/40 print:bg-gray-100 text-center">
                      <th
                        rowSpan={2}
                        className="py-2 px-1 w-8 font-semibold border-r border-border"
                      >
                        ลำดับ
                      </th>
                      <th
                        rowSpan={2}
                        className="py-2 px-1 font-semibold border-r border-border"
                      >
                        สถานที่ / แผนก
                      </th>
                      <th
                        colSpan={3}
                        className="py-1 px-1 font-semibold border-r border-border"
                      >
                        ระยะเวลาการตรวจ
                      </th>
                      <th
                        colSpan={3}
                        className="py-1 px-1 font-semibold border-r border-border"
                      >
                        อุณหภูมิ (°C)
                      </th>
                      <th
                        rowSpan={2}
                        className="py-2 px-1 font-semibold border-r border-border"
                      >
                        WBGT
                        <br />
                        (in/out)
                      </th>
                      <th
                        rowSpan={2}
                        className="py-2 px-1 font-semibold border-r border-border"
                      >
                        ประเภท
                        <br />
                        งาน
                      </th>
                      <th
                        rowSpan={2}
                        className="py-2 px-1 font-semibold border-r border-border"
                      >
                        WBGT
                        <br />
                        เฉลี่ย
                      </th>
                      <th
                        rowSpan={2}
                        className="py-2 px-1 font-semibold border-r border-border"
                      >
                        มาตรฐาน
                      </th>
                      <th rowSpan={2} className="py-2 px-1 font-semibold">
                        ผลการ
                        <br />
                        ประเมิน
                      </th>
                    </tr>
                    <tr className="border-b border-border text-text-secondary bg-white/40 print:bg-gray-100 text-center">
                      <th className="py-1 px-1 font-medium border-r border-border">
                        เริ่ม
                      </th>
                      <th className="py-1 px-1 font-medium border-r border-border">
                        สิ้นสุด
                      </th>
                      <th className="py-1 px-1 font-medium border-r border-border">
                        รวม
                      </th>
                      <th className="py-1 px-1 font-medium border-r border-border">
                        DB
                      </th>
                      <th className="py-1 px-1 font-medium border-r border-border">
                        WB
                      </th>
                      <th className="py-1 px-1 font-medium border-r border-border">
                        GT
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {processedHeatPoints.map((pt) => (
                      <tr
                        key={pt.pointNo}
                        className="hover:bg-white/30 transition-colors text-center"
                      >
                        <td className="py-2 px-1 font-medium text-text-secondary border-r border-border">
                          {pt.pointNo}
                        </td>
                        <td className="py-2 px-1 font-medium text-text-primary border-r border-border text-left">
                          {pt.location_desc}
                        </td>
                        <td className="py-2 px-1 text-text-secondary border-r border-border">
                          {pt.start_time}
                        </td>
                        <td className="py-2 px-1 text-text-secondary border-r border-border">
                          {pt.end_time}
                        </td>
                        <td className="py-2 px-1 text-text-secondary border-r border-border">
                          {pt.total_time}
                        </td>
                        <td className="py-2 px-1 text-text-secondary border-r border-border">
                          {pt.db_temp}
                        </td>
                        <td className="py-2 px-1 text-text-secondary border-r border-border">
                          {pt.wb_temp}
                        </td>
                        <td className="py-2 px-1 text-text-secondary border-r border-border">
                          {pt.gt_temp}
                        </td>
                        <td className="py-2 px-1 text-text-secondary border-r border-border">
                          {pt.wbgt_in}{" "}
                          {pt.wbgt_in !== "-" && (
                            <span className="text-[9px] uppercase">
                              ({pt.wbgt_type})
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-1 text-text-secondary border-r border-border">
                          {pt.workload_label}
                        </td>
                        <td
                          className={cn(
                            "py-2 px-1 font-bold border-r border-border",
                            pt.isPass ? "text-text-primary" : "text-danger"
                          )}
                        >
                          {pt.wbgt_avg}
                        </td>
                        <td className="py-2 px-1 text-text-secondary border-r border-border">
                          ≤ {pt.standard_value}
                        </td>
                        <td className="py-2 px-1 font-medium">
                          {pt.isPass ? (
                            <span className="text-emerald-700 font-semibold">ผ่าน</span>
                          ) : (
                            <span className="text-danger font-semibold">ไม่ผ่าน</span>
                          )}
                          {pt.remark && (
                            <span className="block text-[9px] text-text-secondary">
                              {pt.remark}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border/80 bg-white/50 font-semibold text-[11px]">
                      <td colSpan={10} className="py-2 px-2 text-text-primary text-right border-r border-border">
                        ค่าเฉลี่ย WBGT รวม:
                      </td>
                      <td className="py-2 px-1 text-center text-primary font-bold border-r border-border">
                        {envAverage} °C
                      </td>
                      <td colSpan={2} className="py-2 px-2 text-caption text-text-secondary">
                        ผ่าน {processedHeatPoints.filter((p) => p.isPass).length} /{" "}
                        {processedHeatPoints.length} จุด
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="mt-4 text-[11px] text-text-secondary">
                <p>
                  ผลการตรวจวัดดัชนีความร้อน WBGT อ้างอิงตามประกาศกฎกระทรวง
                  &ldquo;เรื่องกำหนดมาตรฐานในการบริหาร จัดการและดำเนินการด้านอาชีวอนามัยและความปลอดภัยและสภาพแวดล้อมในการทำงานเกี่ยวกับความร้อน
                  แสงสว่าง และเสียง พ.ศ. 2559&rdquo;
                </p>
              </div>
            </div>
          )}

          {/* Health Risk 10 Questions Responses Breakdown */}
          {isHealthRisk && hrQuestions.length > 0 && answers && (
            <div className="glass-card p-6 animate-fade-in print:shadow-none print:border-gray-300 print:bg-white print:break-before-page">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-card-title font-semibold text-text-primary flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    รายละเอียดการตอบแบบประเมินความเสี่ยง (10 ข้อ)
                  </h3>
                  <p className="text-caption text-text-secondary mt-0.5">
                    คำตอบและระดับความเสี่ยงของแต่ละคำถามที่ได้บันทึกไว้
                  </p>
                </div>
              </div>

              <div className="flex flex-col divide-y divide-border/60">
                {hrQuestions.map((q: HealthRiskQuestion, idx: number) => {
                  const val = answers[q.id];
                  const numVal = Number(val);
                  const isAnswered = val !== undefined && val !== null;
                  const label =
                    numVal === 0
                      ? "ไม่เคย (0 คะแนน)"
                      : numVal === 1
                      ? "บางครั้ง (1 คะแนน)"
                      : numVal === 2
                      ? "เป็นประจำ (2 คะแนน)"
                      : "-";

                  return (
                    <div
                      key={q.id}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 print:break-inside-avoid"
                    >
                      <div className="flex items-start gap-2.5 max-w-xl">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-tint text-[11px] font-bold text-primary mt-0.5">
                          {idx + 1}
                        </span>
                        <p className="text-small text-text-secondary leading-relaxed">
                          {q.text}
                        </p>
                      </div>
                      <div className="shrink-0 pl-7 sm:pl-0 text-left sm:text-right">
                        {isAnswered ? (
                          <span
                            className={cn(
                              "inline-block rounded-full px-3 py-1 text-caption font-semibold border",
                              numVal === 0
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : numVal === 1
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            )}
                          >
                            {label}
                          </span>
                        ) : (
                          <span className="text-caption text-text-tertiary">
                            ไม่ได้ตอบ
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Room Layout Section (Hybrid Upload / Management) */}
          {isEnvironment && (
            <div className="glass-card p-6 animate-fade-in print:shadow-none print:border-gray-300 print:bg-white">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-card-title font-semibold text-text-primary flex items-center gap-2">
                    ผังพื้นที่ห้อง (Room Layout)
                    {hasLayoutChanges ? (
                      <span className="rounded-full bg-blue-100 text-blue-800 px-2.5 py-0.5 text-[11px] font-semibold">
                        ยังไม่ได้บันทึก
                      </span>
                    ) : layoutFile ? (
                      <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-[11px] font-semibold">
                        แนบแล้ว
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-100 text-amber-800 px-2.5 py-0.5 text-[11px] font-semibold">
                        รอแนบผังห้อง
                      </span>
                    )}
                  </h3>
                  <p className="text-caption text-text-secondary mt-0.5">
                    {layoutFile
                      ? "ผังพื้นที่ห้องและตำแหน่งจุดตรวจวัดสำหรับเล่มรายงาน"
                      : "สามารถอัปโหลดไฟล์ภาพหรือเอกสาร PDF ของผังห้องเพิ่มเติมได้ที่นี่"}
                  </p>
                </div>
              </div>

              {/* Notice Banner when no layout is attached */}
              {!layoutFile && !stagedLayoutFile && (
                <div className="mb-4 flex items-start gap-3 rounded-lg bg-amber-50/80 border border-amber-200/80 p-3.5 text-small text-amber-900 print:hidden">
                  <Info className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium">ยังไม่ได้แนบผังพื้นที่ห้อง</p>
                    <p className="mt-0.5 text-caption text-amber-700">
                      ท่านสามารถดาวน์โหลดรายงานได้ทันทีโดยระบบจะเว้นกรอบผังห้องไว้
                      หรืออัปโหลดไฟล์ผังห้องด้านล่างเพื่อให้รายงานสมบูรณ์
                    </p>
                  </div>
                </div>
              )}

              {/* Uploader Component */}
              <div className="print:hidden">
                <FileUpload
                  value={stagedLayoutFile}
                  onChange={setStagedLayoutFile}
                  onDelete={() => setIsDeleteLayoutModalOpen(true)}
                  label=""
                  description="รองรับไฟล์ภาพ (JPG, PNG, WebP) หรือไฟล์ PDF ขนาดไม่เกิน 10MB"
                />

                {/* Unsaved Changes Action Bar (shown ONLY when a new/different file is selected) */}
                {hasLayoutChanges && (
                  <div className="mt-3 flex flex-col sm:flex-row items-center justify-between gap-2.5 rounded-xl bg-blue-50/90 border border-blue-200 p-3.5 animate-fade-in shadow-xs">
                    <div className="flex items-center gap-2 text-small text-blue-900">
                      <AlertCircle className="h-4 w-4 shrink-0 text-primary" />
                      <span className="font-medium">
                        เลือกไฟล์ผังห้องใหม่เรียบร้อยแล้ว กรุณากดบันทึกเพื่อจัดเก็บลงฐานข้อมูล
                      </span>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <button
                        type="button"
                        onClick={() => setStagedLayoutFile(layoutFile)}
                        disabled={isSavingLayout}
                        className="rounded-lg px-3 py-1.5 text-caption font-medium text-gray-600 hover:bg-white hover:text-gray-900 transition-colors cursor-pointer"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveLayout}
                        disabled={isSavingLayout}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-caption font-semibold text-white shadow-sm hover:bg-primary-deep active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isSavingLayout ? (
                          <>
                            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            <span>กำลังบันทึก...</span>
                          </>
                        ) : (
                          <>
                            <Save className="h-3.5 w-3.5" />
                            <span>บันทึกผังห้อง</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Printable Layout Preview Frame (for report printing - ONLY for environment) */}
          {isEnvironment && (
            <div className="glass-card p-6 print:block hidden print:shadow-none print:border-gray-300 print:bg-white print:break-before-page">
              <h3 className="text-card-title font-semibold mb-3">ผังพื้นที่ห้อง (Room Layout)</h3>
              {layoutFile ? (
                layoutFile.fileType.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={layoutFile.fileData}
                    alt={layoutFile.fileName}
                    className="max-h-[500px] w-auto mx-auto object-contain rounded border"
                  />
                ) : (
                  <div className="p-6 border rounded text-center text-small">
                    [ แนบไฟล์เอกสาร PDF: {layoutFile.fileName} ]
                  </div>
                )
              ) : (
                <div className="h-56 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-text-tertiary text-small">
                  [ เว้นพื้นที่สำหรับผังห้อง / ไม่ได้แนบผังพื้นที่ ]
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 print:hidden">
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 inline-flex items-center justify-center gap-2 btn-primary-gradient px-6 py-3 text-small font-medium cursor-pointer shadow-sm active:scale-[0.99] transition-all"
            >
              <Printer className="h-4 w-4" />
              <span>พิมพ์ / ดาวน์โหลดรายงาน</span>
            </button>

            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-button border border-red-200 bg-red-50/60 hover:bg-red-100/70 text-red-600 px-6 py-3 text-small font-medium cursor-pointer shadow-xs active:scale-[0.99] transition-all"
            >
              <Trash2 className="h-4 w-4" />
              <span>ลบรายการประเมินนี้</span>
            </button>
          </div>
        </div>
      </main>

      {/* Delete Confirmation Modal (Rendered to document.body via Portal) */}
      {mounted &&
        isDeleteModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in print:hidden w-screen h-screen top-0 left-0"
            onClick={() => !isDeleting && setIsDeleteModalOpen(false)}
          >
            <div
              className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-scale-up"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600 mb-4">
                  <AlertTriangle className="h-7 w-7" />
                </div>

                <h3 className="text-card-title font-bold text-gray-900">
                  ยืนยันการลบรายการประเมิน?
                </h3>

                <p className="mt-2 text-small text-gray-600 leading-relaxed">
                  คุณแน่ใจหรือไม่ว่าต้องการลบรายการประเมินรหัส{" "}
                  <strong className="font-mono text-gray-900">{submissionId}</strong>?
                  <br />
                  <span className="text-caption text-red-500 mt-1 block font-medium">
                    ข้อมูลจุดตรวจวัดและการประเมินทั้งหมดจะถูกลบออกจากฐานข้อมูลอย่างถาวร
                  </span>
                </p>

                <div className="mt-6 flex w-full gap-3">
                  <button
                    type="button"
                    onClick={() => setIsDeleteModalOpen(false)}
                    disabled={isDeleting}
                    className="flex-1 rounded-xl border border-gray-200 bg-white py-2.5 text-small font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteSubmission}
                    disabled={isDeleting}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-small font-semibold text-white hover:bg-red-700 shadow-sm active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isDeleting ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>กำลังลบ...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4" />
                        <span>ยืนยันการลบ</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Delete Layout Confirmation Modal (Rendered to document.body via Portal) */}
      {mounted &&
        isDeleteLayoutModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in print:hidden w-screen h-screen top-0 left-0"
            onClick={() => !isDeletingLayout && setIsDeleteLayoutModalOpen(false)}
          >
            <div
              className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-scale-up"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600 mb-4">
                  <Trash2 className="h-7 w-7" />
                </div>

                <h3 className="text-card-title font-bold text-gray-900">
                  ยืนยันการลบไฟล์ผังห้อง?
                </h3>

                <p className="mt-2 text-small text-gray-600 leading-relaxed">
                  คุณแน่ใจหรือไม่ว่าต้องการลบไฟล์ผังห้อง
                  {layoutFile?.fileName && (
                    <>
                      {" "}
                      (
                      <strong className="font-medium text-gray-900 truncate inline-block max-w-[220px] align-bottom">
                        {layoutFile.fileName}
                      </strong>
                      )
                    </>
                  )}{" "}
                  ออกจากระบบ?
                  <br />
                  <span className="text-caption text-red-500 mt-1.5 block font-medium">
                    ไฟล์จะถูกลบออกจากฐานข้อมูลและเล่มรายงานทันที
                  </span>
                </p>

                <div className="mt-6 flex w-full gap-3">
                  <button
                    type="button"
                    onClick={() => setIsDeleteLayoutModalOpen(false)}
                    disabled={isDeletingLayout}
                    className="flex-1 rounded-xl border border-gray-200 bg-white py-2.5 text-small font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDeleteLayout}
                    disabled={isDeletingLayout}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-small font-semibold text-white hover:bg-red-700 shadow-sm active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isDeletingLayout ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>กำลังลบ...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4" />
                        <span>ยืนยันการลบไฟล์</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Fullscreen Lightbox Modal for Room Layout image zoom */}
      <ImageLightboxModal
        isOpen={!!previewImage}
        onClose={() => setPreviewImage(null)}
        src={previewImage}
        fileName={layoutFile?.fileName}
        fileSize={layoutFile?.fileSize}
        title="ผังพื้นที่ห้อง (Room Layout)"
      />
    </div>
  );
}

export default function ResultPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh flex-col items-center justify-center">
          <div className="flex flex-col items-center gap-3 animate-fade-in">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-small font-medium text-text-secondary">
              กำลังโหลด...
            </p>
          </div>
        </div>
      }
    >
      <ResultContent />
    </Suspense>
  );
}
