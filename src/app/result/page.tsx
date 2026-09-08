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
  Pencil,
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
  const [stagedLayoutFile, setStagedLayoutFile] =
    useState<LayoutFileInfo | null>(null);
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
            String(item.id) === submissionId,
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
              "ไม่พบข้อมูลผลการประเมินนี้ในระบบ หรือรหัสเอกสารไม่ถูกต้อง",
          );
        }
      }
    } catch (err: any) {
      console.warn("API error fetching submission", err);
      if (!localData) {
        setSubmission(null);
        setFetchError(
          "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วลองใหม่อีกครั้ง",
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
          if (isDeleteLayoutModalOpen && !isDeletingLayout)
            setIsDeleteLayoutModalOpen(false);
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [
    isDeleteModalOpen,
    isDeleteLayoutModalOpen,
    previewImage,
    isDeleting,
    isDeletingLayout,
  ]);

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
          (item: any) => item.submission_code === submissionId,
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

      setFeedbackMessage(
        "บันทึกไฟล์ผังพื้นที่ห้อง (Layout) ลงระบบเรียบร้อยแล้ว",
      );

      setTimeout(() => {
        setFeedbackMessage(null);
      }, 3500);
    } catch (err) {
      console.error("Failed to save layout to backend API", err);
      setFeedbackMessage(
        "เกิดข้อผิดพลาดในการบันทึกไฟล์ผังห้อง กรุณาลองใหม่อีกครั้ง",
      );
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
          (item: any) => item.submission_code === submissionId,
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
      setFeedbackMessage(
        "เกิดข้อผิดพลาดในการลบไฟล์ผังห้อง กรุณาลองใหม่อีกครั้ง",
      );
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
              String(item.id) !== submissionId,
          );
          localStorage.setItem(
            "save_check_submissions",
            JSON.stringify(filtered),
          );
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
      <div className="pb-safe-nav flex min-h-dvh flex-col">
        <PageHeader title="ผลการประเมิน" showBack />
        <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
          <div className="glass-card animate-scale-up mx-auto w-full max-w-md p-8 text-center">
            <div
              className="icon-container mx-auto mb-4"
              style={{
                background:
                  "linear-gradient(135deg, rgba(254, 243, 199, 0.95), rgba(255, 251, 235, 0.8))",
              }}
            >
              <AlertTriangle className="text-warning h-7 w-7" strokeWidth={2} />
            </div>
            <h2 className="text-section-title text-text-primary font-bold">
              ไม่ระบุรหัสการประเมิน
            </h2>
            <p className="text-small text-text-secondary mt-2">
              กรุณาระบุรหัสการประเมิน (submissionId) ใน URL ให้ถูกต้อง
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href={ROUTES.DASHBOARD}
                className="btn-primary-gradient text-small inline-flex items-center justify-center gap-2 px-5 py-2.5 font-medium"
              >
                <ArrowLeft className="h-4 w-4" />
                ประวัติการประเมิน
              </Link>
              <Link
                href={ROUTES.HOME}
                className="rounded-button border-border text-small text-text-primary inline-flex items-center justify-center gap-2 border bg-white/80 px-4 py-2.5 font-medium shadow-xs transition-colors hover:bg-white"
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
        <div className="animate-fade-in flex flex-col items-center gap-3">
          <Loader2 className="text-primary h-8 w-8 animate-spin" />
          <p className="text-small text-text-secondary font-medium">
            กำลังโหลด...
          </p>
        </div>
      </div>
    );
  }

  // 2. Error / Not Found state (when fetch failed or submission not found)
  if (fetchError || !submission) {
    return (
      <div className="pb-safe-nav flex min-h-dvh flex-col">
        <PageHeader title="ผลการประเมิน" showBack />
        <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
          <div className="glass-card animate-scale-up mx-auto w-full max-w-md p-8 text-center shadow-lg">
            <div
              className="icon-container mx-auto mb-4"
              style={{
                background:
                  "linear-gradient(135deg, rgba(254, 242, 242, 0.95), rgba(254, 226, 226, 0.8))",
              }}
            >
              <AlertCircle className="text-danger h-8 w-8" strokeWidth={2} />
            </div>
            <h2 className="text-section-title text-text-primary font-bold">
              ดึงข้อมูลไม่สำเร็จ
            </h2>
            <p className="text-small text-text-secondary mt-2 leading-relaxed">
              {fetchError ||
                "ไม่พบข้อมูลผลการประเมินในระบบ กรุณาตรวจสอบรหัสเอกสารอีกครั้ง"}
            </p>
            {submissionId && (
              <div className="text-caption mt-3 inline-flex items-center gap-1 rounded-md border border-red-100 bg-red-50 px-3 py-1 font-mono text-red-600">
                รหัส: {submissionId}
              </div>
            )}
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={loadSubmissionData}
                className="btn-primary-gradient text-small inline-flex cursor-pointer items-center justify-center gap-2 px-5 py-2.5 font-medium"
              >
                <RotateCcw className="h-4 w-4" />
                ลองใหม่อีกครั้ง
              </button>
              <Link
                href={ROUTES.DASHBOARD}
                className="rounded-button border-border text-small text-text-primary inline-flex items-center justify-center gap-2 border bg-white/80 px-4 py-2.5 font-medium shadow-xs transition-colors hover:bg-white"
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

  const handleEdit = () => {
    if (!submissionId) return;

    try {
      sessionStorage.setItem(
        `save_check_edit_source_${submissionId}`,
        JSON.stringify(submission),
      );
    } catch (error) {
      console.error("Failed to prepare edit data", error);
    }

    const encodedCode = encodeURIComponent(submissionId);
    const encodedCategory = encodeURIComponent(
      submission.assessment_category || "general",
    );
    const editHref = isEnvironment
      ? `${ROUTES.ENVIRONMENT_FORM}?category=${encodedCategory}&edit=${encodedCode}`
      : isHealthRisk
        ? `${ROUTES.HEALTH_RISK_FORM}?category=${encodedCategory}&edit=${encodedCode}`
        : `${ROUTES.SATISFACTION}?edit=${encodedCode}`;

    router.replace(editHref);
  };
  const category = (submission?.assessment_category ||
    "general") as AssessmentCategory;
  const answers = (submission?.answers || {}) as any;
  const inspectionData = submission?.inspectionData;
  const profile = submission?.profile;
  const workInfo = submission?.workInfo;

  const categoryLabel = submission?.assessment_category
    ? ASSESSMENT_CATEGORY_LABELS[
        submission.assessment_category as keyof typeof ASSESSMENT_CATEGORY_LABELS
      ]
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
      if (
        answers.light_areas &&
        Array.isArray(answers.light_areas) &&
        answers.light_areas.length > 0
      ) {
        let totalPass = 0;
        const vals: number[] = [];

        processedLightPoints = answers.light_areas.map(
          (pt: any, index: number) => {
            const measureVal = Number(pt.measure) || 0;
            vals.push(measureVal);

            const stdObj = LIGHT_POINT_STANDARDS.find(
              (s) => s.value === Number(pt.standard_value),
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
          },
        );

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
      if (
        answers.noise_areas &&
        Array.isArray(answers.noise_areas) &&
        answers.noise_areas.length > 0
      ) {
        let totalPass = 0;
        const vals: number[] = [];

        processedNoisePoints = answers.noise_areas.map(
          (pt: any, index: number) => {
            const avgVal = Number(pt.avg_dBA) || 0;
            vals.push(avgVal);

            const stdObj = NOISE_STANDARDS.find(
              (s) => s.value === Number(answers.standard_value),
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
          },
        );

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
      if (
        answers.heat_areas &&
        Array.isArray(answers.heat_areas) &&
        answers.heat_areas.length > 0
      ) {
        let totalPass = 0;
        const vals: number[] = [];

        processedHeatPoints = answers.heat_areas.map(
          (pt: any, index: number) => {
            const wbgtAvg = Number(pt.wbgt_avg) || 0;
            vals.push(wbgtAvg);

            const workloadObj = HEAT_WORKLOADS.find(
              (w) => w.value === pt.workload,
            );
            const workloadLabel = workloadObj
              ? workloadObj.label
              : pt.workload || "-";
            const standard =
              pt.standard_value !== undefined && pt.standard_value !== null
                ? Number(pt.standard_value)
                : HEAT_STANDARDS[pt.workload as keyof typeof HEAT_STANDARDS]
                    ?.value || 0;

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
                pt.db_temp !== undefined &&
                pt.db_temp !== null &&
                pt.db_temp !== ""
                  ? Number(pt.db_temp)
                  : "-",
              wb_temp:
                pt.wb_temp !== undefined &&
                pt.wb_temp !== null &&
                pt.wb_temp !== ""
                  ? Number(pt.wb_temp)
                  : "-",
              gt_temp:
                pt.gt_temp !== undefined &&
                pt.gt_temp !== null &&
                pt.gt_temp !== ""
                  ? Number(pt.gt_temp)
                  : "-",
              wbgt_in:
                pt.wbgt_in !== undefined &&
                pt.wbgt_in !== null &&
                pt.wbgt_in !== ""
                  ? Number(pt.wbgt_in)
                  : "-",
              wbgt_type: pt.wbgt_type || "in",
              workload_label: workloadLabel,
              wbgt_avg: wbgtAvg,
              standard_value: standard,
              isPass,
              remark: pt.remark || "",
            };
          },
        );

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
        answers.measure_3,
      );
      if (avg !== null) {
        envAverage = avg;
        envEvaluation = evaluateEnvironmentResult(
          envAverage,
          Number(answers.standard_value),
          category,
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
      ? HEALTH_RISK_QUESTIONS[category as keyof typeof HEALTH_RISK_QUESTIONS] ||
        []
      : [];

  // Satisfaction evaluation
  const satisfactionResult =
    isSatisfaction && answers && answers.q1 !== undefined
      ? calculateSatisfactionResult(answers)
      : null;

  return (
    <div className="app-mobile-shell pb-safe-nav flex min-h-dvh flex-col md:max-w-none print:bg-white print:pb-0">
      <PageHeader
        title="ผลการประเมิน"
        subtitle={`รหัสเอกสาร: ${submissionId}`}
        showBack
        rightAction={
          <button
            type="button"
            onClick={handleEdit}
            className="rounded-button border-primary/20 bg-primary-tint text-small text-primary hover:bg-primary inline-flex h-10 items-center justify-center gap-2 border px-3 font-semibold transition-all hover:text-white active:scale-95"
          >
            <Pencil className="h-4 w-4" />
            <span className="hidden sm:inline">แก้ไข</span>
          </button>
        }
        className="print:hidden"
      />

      <main className="flex-1 px-4 py-5 md:px-8">
        <div className="print-report mx-auto flex max-w-[840px] flex-col gap-5">
          {/* Feedback Toast */}
          {feedbackMessage && (
            <div className="rounded-card text-small animate-fade-in flex items-center gap-2 border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 shadow-sm print:hidden">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
              <span className="font-medium">{feedbackMessage}</span>
            </div>
          )}

          {/* Assessment Overview Card */}
          <div className="result-overview-card glass-card animate-fade-in p-6 print:border-gray-300 print:bg-white print:shadow-none">
            <div className="border-border border-b pb-4">
              <div>
                <span className="bg-primary-tint text-caption text-primary rounded-full px-3 py-1 font-semibold">
                  {isEnvironment
                    ? `ประเมินสภาพแวดล้อม — ${categoryLabel}`
                    : isHealthRisk
                      ? `ความเสี่ยงสุขภาพ — ${categoryLabel}`
                      : isSatisfaction
                        ? "แบบประเมินความพึงพอใจ"
                        : "ผลการประเมิน"}
                </span>
                <h2 className="text-page-title text-text-primary mt-2 font-bold">
                  {isEnvironment
                    ? `สรุปผลการประเมิน${categoryLabel}`
                    : isHealthRisk
                      ? `รายงานประเมินความเสี่ยงสุขภาพ (${categoryLabel})`
                      : "สรุปผลการประเมิน"}
                </h2>
              </div>
            </div>

            {/* Inspection Details for Environment */}
            {isEnvironment && inspectionData && (
              <div className="border-border/80 text-small text-text-secondary mt-4 rounded-xl border bg-white/50 p-4">
                <h3 className="text-text-primary mb-3 flex items-center gap-2 font-semibold">
                  <Shield className="text-primary h-4 w-4" />
                  ข้อมูลทั่วไปการตรวจวัด
                </h3>
                <div className="grid grid-cols-1 gap-x-4 gap-y-2.5 sm:grid-cols-2">
                  <div className="flex items-center gap-2">
                    <User className="text-text-tertiary h-4 w-4 shrink-0" />
                    <span>
                      ผู้ตรวจประเมิน:{" "}
                      <strong className="text-text-primary font-medium">
                        {inspectionData.inspector_name || "-"}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Briefcase className="text-text-tertiary h-4 w-4 shrink-0" />
                    <span>
                      ตำแหน่ง:{" "}
                      <strong className="text-text-primary font-medium">
                        {inspectionData.position || "-"}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="text-text-tertiary h-4 w-4 shrink-0" />
                    <span className="truncate">
                      สถานที่ตรวจวัด:{" "}
                      <strong className="text-text-primary font-medium">
                        {inspectionData.inspection_location || "-"}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="text-text-tertiary h-4 w-4 shrink-0" />
                    <span>
                      วันที่ทำการตรวจ:{" "}
                      <strong className="text-text-primary font-medium">
                        {inspectionData.inspection_date || "-"}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Wrench className="text-text-tertiary h-4 w-4 shrink-0" />
                    <span className="truncate">
                      เครื่องมือที่ใช้:{" "}
                      <strong className="text-text-primary font-medium">
                        {inspectionData.equipment || "-"}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="text-text-tertiary h-4 w-4 shrink-0" />
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
              <div className="border-border/80 text-small text-text-secondary mt-4 rounded-xl border bg-white/50 p-4">
                <h3 className="text-text-primary mb-3 flex items-center gap-2 font-semibold">
                  <User className="text-primary h-4 w-4" />
                  ข้อมูลผู้รับการประเมิน
                </h3>
                <div className="grid grid-cols-1 gap-x-4 gap-y-2.5 sm:grid-cols-2">
                  {profile?.full_name && (
                    <div className="flex items-center gap-2">
                      <User className="text-text-tertiary h-4 w-4 shrink-0" />
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
                      <span className="text-text-tertiary">
                        น้ำหนัก / ส่วนสูง:
                      </span>
                      <strong className="text-text-primary font-medium">
                        {profile.weight || "-"} กก. / {profile.height || "-"}{" "}
                        ซม.
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
                      <Building className="text-text-tertiary h-4 w-4 shrink-0" />
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
                      <Briefcase className="text-text-tertiary h-4 w-4 shrink-0" />
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
                      <Clock className="text-text-tertiary h-4 w-4 shrink-0" />
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
              <div
                className={cn(
                  "status-result-panel mt-4 flex flex-col items-stretch justify-between gap-4 border p-4 transition-all sm:flex-row sm:items-center",
                  envEvaluation?.isPass === false
                    ? "border-rose-300/60 bg-rose-50/90"
                    : "is-success",
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex h-13 w-13 shrink-0 items-center justify-center rounded-full text-white shadow-lg",
                      envEvaluation?.isPass === false
                        ? "bg-rose-500"
                        : "bg-emerald-500",
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
                          : "text-emerald-800",
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
                  <div className="shrink-0 rounded-[14px] border border-emerald-600/15 bg-white/95 px-5 py-3 text-center shadow-sm sm:text-right">
                    <span className="text-text-tertiary block text-[11px]">
                      ค่าตรวจวัดเฉลี่ยรวม
                    </span>
                    <span className="text-text-primary text-[28px] leading-tight font-bold">
                      {envAverage} {unitLabel}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Health Risk Result Score & Status Banner */}
            {isHealthRisk && hrEval && (
              <div className="mt-4 flex flex-col gap-4">
                <div className="border-border flex flex-col items-center justify-center rounded-[20px] border bg-white/92 p-5 text-center shadow-sm">
                  <span className="text-caption text-text-secondary">
                    คะแนนความเสี่ยงรวม (จาก 20 คะแนน)
                  </span>
                  <span
                    className={`text-h1 my-1 font-bold ${
                      hrEval.level === "pass"
                        ? "text-emerald-600"
                        : hrEval.level === "medium"
                          ? "text-amber-600"
                          : "text-rose-600"
                    }`}
                  >
                    {hrEval.score}
                  </span>
                  <span className="text-caption border-border text-text-primary rounded-full border bg-white px-3 py-1 font-semibold">
                    {hrEval.levelLabel}
                  </span>
                </div>

                <div
                  className={`status-result-panel flex items-start gap-3 border p-4 ${
                    hrEval.level === "pass"
                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-900"
                      : hrEval.level === "medium"
                        ? "border-amber-500/20 bg-amber-500/10 text-amber-900"
                        : "border-rose-500/20 bg-rose-500/10 text-rose-900"
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
                    <h3 className="text-card-title font-semibold">
                      {hrEval.levelLabel}
                    </h3>
                    <p className="text-small mt-1 leading-relaxed opacity-90">
                      {hrEval.message}
                    </p>
                  </div>
                </div>

                {/* Health Risk Recommendations Box */}
                {hrEval.recommendations &&
                  hrEval.recommendations.length > 0 && (
                    <div className="border-primary/20 bg-primary-tint/30 rounded-xl border p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <span className="text-xl">
                          {category === "light"
                            ? "💡"
                            : category === "noise"
                              ? "🔊"
                              : "🌡️"}
                        </span>
                        <h4 className="text-small text-text-primary font-bold">
                          ข้อเสนอแนะ —{" "}
                          {category === "light"
                            ? "ด้านแสงสว่าง (Illumination)"
                            : category === "noise"
                              ? "ด้านเสียง (Noise)"
                              : "ด้านความร้อน (Heat)"}
                        </h4>
                        <span className="border-border text-text-secondary ml-auto rounded-full border bg-white/80 px-2.5 py-0.5 text-[11px] font-semibold">
                          {hrEval.levelLabel}
                        </span>
                      </div>
                      <ul className="flex flex-col gap-2.5">
                        {hrEval.recommendations.map(
                          (rec: string, idx: number) => (
                            <li
                              key={idx}
                              className="text-small text-text-secondary flex items-start gap-2.5 leading-relaxed"
                            >
                              <span className="text-primary mt-0.5 font-bold">
                                •
                              </span>
                              <span>{rec}</span>
                            </li>
                          ),
                        )}
                      </ul>
                    </div>
                  )}
              </div>
            )}

            {/* Satisfaction Summary */}
            {isSatisfaction && satisfactionResult && (
              <div className="mt-4 flex flex-col gap-4">
                <div className="border-border flex flex-col items-center justify-center rounded-xl border bg-white/50 p-4 text-center">
                  <span className="text-caption text-text-secondary">
                    คะแนนความพึงพอใจเฉลี่ยรวม (เต็ม 5)
                  </span>
                  <div className="my-1 flex items-center gap-2">
                    <Star className="h-7 w-7 fill-amber-500 text-amber-500" />
                    <span className="text-h1 text-text-primary font-bold">
                      {satisfactionResult.overallAvg.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
                  <div className="border-border rounded-lg border bg-white/60 p-2.5">
                    <span className="text-text-secondary block text-[11px]">
                      ด้านเนื้อหา
                    </span>
                    <strong className="text-small text-text-primary font-bold">
                      {satisfactionResult.accuracyAvg.toFixed(2)}
                    </strong>
                  </div>
                  <div className="border-border rounded-lg border bg-white/60 p-2.5">
                    <span className="text-text-secondary block text-[11px]">
                      ด้านการออกแบบ
                    </span>
                    <strong className="text-small text-text-primary font-bold">
                      {satisfactionResult.designAvg.toFixed(2)}
                    </strong>
                  </div>
                  <div className="border-border rounded-lg border bg-white/60 p-2.5">
                    <span className="text-text-secondary block text-[11px]">
                      ด้านการใช้งาน
                    </span>
                    <strong className="text-small text-text-primary font-bold">
                      {satisfactionResult.usabilityAvg.toFixed(2)}
                    </strong>
                  </div>
                  <div className="border-border rounded-lg border bg-white/60 p-2.5">
                    <span className="text-text-secondary block text-[11px]">
                      ด้านประโยชน์
                    </span>
                    <strong className="text-small text-text-primary font-bold">
                      {satisfactionResult.usefulnessAvg.toFixed(2)}
                    </strong>
                  </div>
                </div>

                {satisfactionResult.suggestion && (
                  <div className="border-border text-small rounded-lg border bg-white/50 p-3.5">
                    <span className="text-text-primary mb-1 block font-semibold">
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
          {isEnvironment &&
            category === "light" &&
            processedLightPoints.length > 0 && (
              <div className="glass-card animate-fade-in p-6 print:border-gray-300 print:bg-white print:shadow-none">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-card-title text-text-primary flex items-center gap-2 font-semibold">
                      <FileText className="text-primary h-5 w-5" />
                      รายงานผลการตรวจวัดระดับแสงสว่าง
                    </h3>
                    <p className="text-caption text-text-secondary mt-0.5">
                      รายละเอียดจุดตรวจวัด ค่าที่วัดได้
                      และเกณฑ์มาตรฐานความปลอดภัย
                    </p>
                  </div>
                  <span className="bg-primary-tint text-primary rounded-full px-2.5 py-1 text-[11px] font-semibold">
                    {processedLightPoints.length} จุดตรวจวัด
                  </span>
                </div>

                <div className="-mx-6 overflow-x-auto px-6">
                  <table className="text-small w-full border-collapse text-left">
                    <thead>
                      <tr className="border-border text-caption text-text-secondary border-b bg-white/40 print:bg-gray-100">
                        <th className="w-12 px-3 py-2.5 text-center font-semibold">
                          จุดที่
                        </th>
                        <th className="px-3 py-2.5 font-semibold">
                          สถานที่ / ลักษณะงาน
                        </th>
                        <th className="px-3 py-2.5 text-right font-semibold">
                          ผลตรวจวัด
                          <br />
                          (Lux)
                        </th>
                        <th className="px-3 py-2.5 text-center font-semibold">
                          ค่ามาตรฐาน
                          <br />
                          (Lux)
                        </th>
                        <th className="px-3 py-2.5 text-center font-semibold">
                          สรุปผล
                        </th>
                        <th className="px-3 py-2.5 font-semibold">หมายเหตุ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-border/60 divide-y">
                      {processedLightPoints.map((pt) => (
                        <tr
                          key={pt.pointNo}
                          className="transition-colors hover:bg-white/30"
                        >
                          <td className="text-text-secondary px-3 py-3 text-center font-medium">
                            {pt.pointNo}
                          </td>
                          <td className="text-text-primary px-3 py-3 font-medium">
                            {pt.location_desc}
                          </td>
                          <td
                            className={cn(
                              "px-3 py-3 text-right font-bold",
                              pt.isPass ? "text-text-primary" : "text-danger",
                            )}
                          >
                            {pt.measure}
                          </td>
                          <td className="text-text-secondary px-3 py-3 text-center">
                            {pt.standard_display}
                          </td>
                          <td className="px-3 py-3 text-center font-medium">
                            {pt.isPass ? (
                              <span className="text-caption inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                                <CheckCircle2 className="h-3.5 w-3.5" /> ผ่าน
                              </span>
                            ) : (
                              <span className="text-caption inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 font-semibold text-rose-700">
                                <XCircle className="h-3.5 w-3.5" /> ไม่ผ่าน
                              </span>
                            )}
                          </td>
                          <td className="text-caption text-text-secondary px-3 py-3">
                            {pt.remark || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-border/80 text-small border-t-2 bg-white/50 font-semibold">
                        <td
                          colSpan={2}
                          className="text-text-primary px-3 py-3 text-right"
                        >
                          ค่าเฉลี่ยระดับแสงสว่างรวม:
                        </td>
                        <td className="text-primary px-3 py-3 text-right font-bold">
                          {envAverage} Lux
                        </td>
                        <td
                          colSpan={3}
                          className="text-caption text-text-secondary px-3 py-3"
                        >
                          ผ่าน{" "}
                          {processedLightPoints.filter((p) => p.isPass).length}{" "}
                          / {processedLightPoints.length} จุด
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

          {/* Noise Assessment Detailed Table */}
          {isEnvironment &&
            category === "noise" &&
            processedNoisePoints.length > 0 && (
              <div className="glass-card animate-fade-in p-6 print:border-gray-300 print:bg-white print:shadow-none">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-card-title text-text-primary flex items-center gap-2 font-semibold">
                      <FileText className="text-primary h-5 w-5" />
                      รายงานผลการตรวจวัดระดับเสียง
                    </h3>
                    <p className="text-caption text-text-secondary mt-0.5">
                      ระดับเสียงต่ำสุด สูงสุด และค่าเฉลี่ย
                      เปรียบเทียบกับค่ามาตรฐาน
                    </p>
                  </div>
                  <span className="bg-primary-tint text-primary rounded-full px-2.5 py-1 text-[11px] font-semibold">
                    {processedNoisePoints.length} จุดตรวจวัด
                  </span>
                </div>

                <div className="-mx-6 overflow-x-auto px-6">
                  <table className="text-small border-border w-full border-collapse border text-left">
                    <thead>
                      <tr className="border-border text-caption text-text-secondary border-b bg-white/40 print:bg-gray-100">
                        <th
                          rowSpan={2}
                          className="border-border w-12 border-r px-3 py-2.5 text-center font-semibold"
                        >
                          จุดที่
                        </th>
                        <th
                          rowSpan={2}
                          className="border-border border-r px-3 py-2.5 text-center font-semibold"
                        >
                          สถานที่ / แผนก
                        </th>
                        <th
                          colSpan={3}
                          className="border-border border-r px-2 py-2 text-center font-semibold"
                        >
                          ผลการตรวจวัดระดับเสียง (dB(A))
                        </th>
                        <th
                          rowSpan={2}
                          className="border-border border-r px-2 py-2.5 text-center font-semibold"
                        >
                          ค่ามาตรฐาน
                        </th>
                        <th
                          rowSpan={2}
                          className="px-2 py-2.5 text-center font-semibold"
                        >
                          สรุปผล & หมายเหตุ
                        </th>
                      </tr>
                      <tr className="border-border text-caption text-text-secondary border-b bg-white/40 print:bg-gray-100">
                        <th className="border-border border-r px-2 py-2 text-center font-medium">
                          ต่ำสุด
                        </th>
                        <th className="border-border border-r px-2 py-2 text-center font-medium">
                          สูงสุด
                        </th>
                        <th className="border-border border-r px-2 py-2 text-center font-bold">
                          เฉลี่ย
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-border/60 divide-y">
                      {processedNoisePoints.map((pt) => (
                        <tr
                          key={pt.pointNo}
                          className="transition-colors hover:bg-white/30"
                        >
                          <td className="text-text-secondary border-border border-r px-3 py-3 text-center font-medium">
                            {pt.pointNo}
                          </td>
                          <td className="text-text-primary border-border border-r px-3 py-3 font-medium">
                            {pt.location_desc}
                          </td>
                          <td className="text-text-secondary border-border border-r px-2 py-3 text-center font-medium">
                            {pt.min_dBA}
                          </td>
                          <td className="text-text-secondary border-border border-r px-2 py-3 text-center font-medium">
                            {pt.max_dBA}
                          </td>
                          <td
                            className={cn(
                              "border-border border-r px-2 py-3 text-center font-bold",
                              pt.isPass ? "text-text-primary" : "text-danger",
                            )}
                          >
                            {pt.avg_dBA}
                          </td>
                          <td className="text-text-secondary border-border border-r px-2 py-3 text-center font-medium">
                            ≤ {pt.standard_display} dB(A)
                          </td>
                          <td className="px-3 py-3 text-center font-medium">
                            {pt.isPass ? (
                              <span className="text-caption inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                                ผ่าน
                              </span>
                            ) : (
                              <span className="text-caption inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 font-semibold text-rose-700">
                                ไม่ผ่าน
                              </span>
                            )}
                            {pt.remark && (
                              <span className="text-text-secondary mt-1 block text-[11px]">
                                {pt.remark}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-border/80 text-small border-t-2 bg-white/50 font-semibold">
                        <td
                          colSpan={4}
                          className="text-text-primary border-border border-r px-3 py-3 text-right"
                        >
                          ค่าเฉลี่ยระดับเสียงรวม:
                        </td>
                        <td className="text-primary border-border border-r px-2 py-3 text-center font-bold">
                          {envAverage} dB(A)
                        </td>
                        <td
                          colSpan={2}
                          className="text-caption text-text-secondary px-3 py-3"
                        >
                          ผ่าน{" "}
                          {processedNoisePoints.filter((p) => p.isPass).length}{" "}
                          / {processedNoisePoints.length} จุด
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="text-caption text-text-secondary mt-4">
                  <p>
                    <span className="font-semibold">*หมายเหตุ:</span>{" "}
                    ค่ามาตรฐานอ้างอิงตามประกาศกรมสวัสดิการและคุ้มครองแรงงาน
                    เรื่อง
                    มาตรฐานระดับเสียงที่ยอมให้ลูกจ้างได้รับเฉลี่ยตลอดระยะเวลาการทำงานในแต่ละวัน
                    พ.ศ. 2561
                  </p>
                </div>
              </div>
            )}

          {/* Heat Assessment Detailed Table */}
          {isEnvironment &&
            category === "heat" &&
            processedHeatPoints.length > 0 && (
              <div className="glass-card animate-fade-in p-6 print:border-gray-300 print:bg-white print:shadow-none">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-card-title text-text-primary flex items-center gap-2 font-semibold">
                      <FileText className="text-primary h-5 w-5" />
                      รายงานผลการตรวจวัดระดับความร้อน
                    </h3>
                    <p className="text-caption text-text-secondary mt-0.5">
                      ดัชนีความร้อน WBGT, อุณหภูมิกระเปาะ, ภาระงาน
                      และการประเมินมาตรฐาน
                    </p>
                  </div>
                  <span className="bg-primary-tint text-primary rounded-full px-2.5 py-1 text-[11px] font-semibold">
                    {processedHeatPoints.length} จุดตรวจวัด
                  </span>
                </div>

                <div className="-mx-6 overflow-x-auto px-6">
                  <table className="border-border w-full border-collapse border text-left text-[11px]">
                    <thead>
                      <tr className="border-border text-text-secondary border-b bg-white/40 text-center print:bg-gray-100">
                        <th
                          rowSpan={2}
                          className="border-border w-8 border-r px-1 py-2 font-semibold"
                        >
                          ลำดับ
                        </th>
                        <th
                          rowSpan={2}
                          className="border-border border-r px-1 py-2 font-semibold"
                        >
                          สถานที่ / แผนก
                        </th>
                        <th
                          colSpan={3}
                          className="border-border border-r px-1 py-1 font-semibold"
                        >
                          ระยะเวลาการตรวจ
                        </th>
                        <th
                          colSpan={3}
                          className="border-border border-r px-1 py-1 font-semibold"
                        >
                          อุณหภูมิ (°C)
                        </th>
                        <th
                          rowSpan={2}
                          className="border-border border-r px-1 py-2 font-semibold"
                        >
                          WBGT
                          <br />
                          (in/out)
                        </th>
                        <th
                          rowSpan={2}
                          className="border-border border-r px-1 py-2 font-semibold"
                        >
                          ประเภท
                          <br />
                          งาน
                        </th>
                        <th
                          rowSpan={2}
                          className="border-border border-r px-1 py-2 font-semibold"
                        >
                          WBGT
                          <br />
                          เฉลี่ย
                        </th>
                        <th
                          rowSpan={2}
                          className="border-border border-r px-1 py-2 font-semibold"
                        >
                          มาตรฐาน
                        </th>
                        <th rowSpan={2} className="px-1 py-2 font-semibold">
                          ผลการ
                          <br />
                          ประเมิน
                        </th>
                      </tr>
                      <tr className="border-border text-text-secondary border-b bg-white/40 text-center print:bg-gray-100">
                        <th className="border-border border-r px-1 py-1 font-medium">
                          เริ่ม
                        </th>
                        <th className="border-border border-r px-1 py-1 font-medium">
                          สิ้นสุด
                        </th>
                        <th className="border-border border-r px-1 py-1 font-medium">
                          รวม
                        </th>
                        <th className="border-border border-r px-1 py-1 font-medium">
                          DB
                        </th>
                        <th className="border-border border-r px-1 py-1 font-medium">
                          WB
                        </th>
                        <th className="border-border border-r px-1 py-1 font-medium">
                          GT
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-border/60 divide-y">
                      {processedHeatPoints.map((pt) => (
                        <tr
                          key={pt.pointNo}
                          className="text-center transition-colors hover:bg-white/30"
                        >
                          <td className="text-text-secondary border-border border-r px-1 py-2 font-medium">
                            {pt.pointNo}
                          </td>
                          <td className="text-text-primary border-border border-r px-1 py-2 text-left font-medium">
                            {pt.location_desc}
                          </td>
                          <td className="text-text-secondary border-border border-r px-1 py-2">
                            {pt.start_time}
                          </td>
                          <td className="text-text-secondary border-border border-r px-1 py-2">
                            {pt.end_time}
                          </td>
                          <td className="text-text-secondary border-border border-r px-1 py-2">
                            {pt.total_time}
                          </td>
                          <td className="text-text-secondary border-border border-r px-1 py-2">
                            {pt.db_temp}
                          </td>
                          <td className="text-text-secondary border-border border-r px-1 py-2">
                            {pt.wb_temp}
                          </td>
                          <td className="text-text-secondary border-border border-r px-1 py-2">
                            {pt.gt_temp}
                          </td>
                          <td className="text-text-secondary border-border border-r px-1 py-2">
                            {pt.wbgt_in}{" "}
                            {pt.wbgt_in !== "-" && (
                              <span className="text-[9px] uppercase">
                                ({pt.wbgt_type})
                              </span>
                            )}
                          </td>
                          <td className="text-text-secondary border-border border-r px-1 py-2">
                            {pt.workload_label}
                          </td>
                          <td
                            className={cn(
                              "border-border border-r px-1 py-2 font-bold",
                              pt.isPass ? "text-text-primary" : "text-danger",
                            )}
                          >
                            {pt.wbgt_avg}
                          </td>
                          <td className="text-text-secondary border-border border-r px-1 py-2">
                            ≤ {pt.standard_value}
                          </td>
                          <td className="px-1 py-2 font-medium">
                            {pt.isPass ? (
                              <span className="font-semibold text-emerald-700">
                                ผ่าน
                              </span>
                            ) : (
                              <span className="text-danger font-semibold">
                                ไม่ผ่าน
                              </span>
                            )}
                            {pt.remark && (
                              <span className="text-text-secondary block text-[9px]">
                                {pt.remark}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-border/80 border-t-2 bg-white/50 text-[11px] font-semibold">
                        <td
                          colSpan={10}
                          className="text-text-primary border-border border-r px-2 py-2 text-right"
                        >
                          ค่าเฉลี่ย WBGT รวม:
                        </td>
                        <td className="text-primary border-border border-r px-1 py-2 text-center font-bold">
                          {envAverage} °C
                        </td>
                        <td
                          colSpan={2}
                          className="text-caption text-text-secondary px-2 py-2"
                        >
                          ผ่าน{" "}
                          {processedHeatPoints.filter((p) => p.isPass).length} /{" "}
                          {processedHeatPoints.length} จุด
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="text-text-secondary mt-4 text-[11px]">
                  <p>
                    ผลการตรวจวัดดัชนีความร้อน WBGT อ้างอิงตามประกาศกฎกระทรวง
                    &ldquo;เรื่องกำหนดมาตรฐานในการบริหาร
                    จัดการและดำเนินการด้านอาชีวอนามัยและความปลอดภัยและสภาพแวดล้อมในการทำงานเกี่ยวกับความร้อน
                    แสงสว่าง และเสียง พ.ศ. 2559&rdquo;
                  </p>
                </div>
              </div>
            )}

          {/* Health Risk 10 Questions Responses Breakdown */}
          {isHealthRisk && hrQuestions.length > 0 && answers && (
            <div className="glass-card animate-fade-in p-6 print:border-gray-300 print:bg-white print:shadow-none">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-card-title text-text-primary flex items-center gap-2 font-semibold">
                    <FileText className="text-primary h-5 w-5" />
                    รายละเอียดการตอบแบบประเมินความเสี่ยง (10 ข้อ)
                  </h3>
                  <p className="text-caption text-text-secondary mt-0.5">
                    คำตอบและระดับความเสี่ยงของแต่ละคำถามที่ได้บันทึกไว้
                  </p>
                </div>
              </div>

              <div className="divide-border/60 flex flex-col divide-y">
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
                      className="flex flex-col justify-between gap-2 py-3 sm:flex-row sm:items-center print:break-inside-avoid"
                    >
                      <div className="flex max-w-xl items-start gap-2.5">
                        <span className="bg-primary-tint text-primary mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold">
                          {idx + 1}
                        </span>
                        <p className="text-small text-text-secondary leading-relaxed">
                          {q.text}
                        </p>
                      </div>
                      <div className="shrink-0 pl-7 text-left sm:pl-0 sm:text-right">
                        {isAnswered ? (
                          <span
                            className={cn(
                              "text-caption inline-block rounded-full border px-3 py-1 font-semibold",
                              numVal === 0
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : numVal === 1
                                  ? "border-amber-200 bg-amber-50 text-amber-700"
                                  : "border-rose-200 bg-rose-50 text-rose-700",
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
            <div className="glass-card animate-fade-in p-6 print:hidden print:border-gray-300 print:bg-white print:shadow-none">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-card-title text-text-primary flex items-center gap-2 font-semibold">
                    ผังพื้นที่ห้อง (Room Layout)
                    {hasLayoutChanges ? (
                      <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-semibold text-blue-800">
                        ยังไม่ได้บันทึก
                      </span>
                    ) : layoutFile ? (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                        แนบแล้ว
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
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
                <div className="text-small mb-4 flex items-start gap-3 rounded-lg border border-amber-200/80 bg-amber-50/80 p-3.5 text-amber-900 print:hidden">
                  <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  <div>
                    <p className="font-medium">ยังไม่ได้แนบผังพื้นที่ห้อง</p>
                    <p className="text-caption mt-0.5 text-amber-700">
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
                  <div className="animate-fade-in mt-3 flex flex-col items-center justify-between gap-2.5 rounded-xl border border-blue-200 bg-blue-50/90 p-3.5 shadow-xs sm:flex-row">
                    <div className="text-small flex items-center gap-2 text-blue-900">
                      <AlertCircle className="text-primary h-4 w-4 shrink-0" />
                      <span className="font-medium">
                        เลือกไฟล์ผังห้องใหม่เรียบร้อยแล้ว
                        กรุณากดบันทึกเพื่อจัดเก็บลงฐานข้อมูล
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setStagedLayoutFile(layoutFile)}
                        disabled={isSavingLayout}
                        className="text-caption cursor-pointer rounded-lg px-3 py-1.5 font-medium text-gray-600 transition-colors hover:bg-white hover:text-gray-900"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveLayout}
                        disabled={isSavingLayout}
                        className="bg-primary text-caption hover:bg-primary-deep inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-4 py-1.5 font-semibold text-white shadow-sm transition-all active:scale-95 disabled:opacity-50"
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
            <div className="print-keep-together glass-card hidden p-6 print:block print:border-gray-300 print:bg-white print:shadow-none">
              <h3 className="text-card-title mb-3 font-semibold">
                ผังพื้นที่ห้อง (Room Layout)
              </h3>
              {layoutFile ? (
                layoutFile.fileType.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={layoutFile.fileData}
                    alt={layoutFile.fileName}
                    className="mx-auto max-h-[500px] w-auto rounded border object-contain"
                  />
                ) : (
                  <div className="text-small rounded border p-6 text-center">
                    [ แนบไฟล์เอกสาร PDF: {layoutFile.fileName} ]
                  </div>
                )
              ) : (
                <div className="text-text-tertiary text-small flex h-56 items-center justify-center rounded border-2 border-dashed border-gray-300">
                  [ เว้นพื้นที่สำหรับผังห้อง / ไม่ได้แนบผังพื้นที่ ]
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 sm:flex-row print:hidden">
            <button
              type="button"
              onClick={handlePrint}
              className="btn-primary-gradient text-small inline-flex flex-1 cursor-pointer items-center justify-center gap-2 px-6 py-3 font-medium shadow-sm transition-all active:scale-[0.99]"
            >
              <Printer className="h-4 w-4" />
              <span>พิมพ์ / ดาวน์โหลดรายงาน</span>
            </button>

            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="rounded-button text-small inline-flex flex-1 cursor-pointer items-center justify-center gap-2 border border-red-200 bg-red-50/60 px-6 py-3 font-medium text-red-600 shadow-xs transition-all hover:bg-red-100/70 active:scale-[0.99]"
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
            className="animate-fade-in fixed inset-0 top-0 left-0 z-[99999] flex h-screen w-screen items-center justify-center bg-black/60 p-4 backdrop-blur-xs print:hidden"
            onClick={() => !isDeleting && setIsDeleteModalOpen(false)}
          >
            <div
              className="animate-scale-up relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
                  <AlertTriangle className="h-7 w-7" />
                </div>

                <h3 className="text-card-title font-bold text-gray-900">
                  ยืนยันการลบรายการประเมิน?
                </h3>

                <p className="text-small mt-2 leading-relaxed text-gray-600">
                  คุณแน่ใจหรือไม่ว่าต้องการลบรายการประเมินรหัส{" "}
                  <strong className="font-mono text-gray-900">
                    {submissionId}
                  </strong>
                  ?
                  <br />
                  <span className="text-caption mt-1 block font-medium text-red-500">
                    ข้อมูลจุดตรวจวัดและการประเมินทั้งหมดจะถูกลบออกจากฐานข้อมูลอย่างถาวร
                  </span>
                </p>

                <div className="mt-6 flex w-full gap-3">
                  <button
                    type="button"
                    onClick={() => setIsDeleteModalOpen(false)}
                    disabled={isDeleting}
                    className="text-small flex-1 cursor-pointer rounded-xl border border-gray-200 bg-white py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteSubmission}
                    disabled={isDeleting}
                    className="text-small inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 font-semibold text-white shadow-sm transition-all hover:bg-red-700 active:scale-95 disabled:opacity-50"
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
          document.body,
        )}

      {/* Delete Layout Confirmation Modal (Rendered to document.body via Portal) */}
      {mounted &&
        isDeleteLayoutModalOpen &&
        createPortal(
          <div
            className="animate-fade-in fixed inset-0 top-0 left-0 z-[99999] flex h-screen w-screen items-center justify-center bg-black/60 p-4 backdrop-blur-xs print:hidden"
            onClick={() =>
              !isDeletingLayout && setIsDeleteLayoutModalOpen(false)
            }
          >
            <div
              className="animate-scale-up relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
                  <Trash2 className="h-7 w-7" />
                </div>

                <h3 className="text-card-title font-bold text-gray-900">
                  ยืนยันการลบไฟล์ผังห้อง?
                </h3>

                <p className="text-small mt-2 leading-relaxed text-gray-600">
                  คุณแน่ใจหรือไม่ว่าต้องการลบไฟล์ผังห้อง
                  {layoutFile?.fileName && (
                    <>
                      {" "}
                      (
                      <strong className="inline-block max-w-[220px] truncate align-bottom font-medium text-gray-900">
                        {layoutFile.fileName}
                      </strong>
                      )
                    </>
                  )}{" "}
                  ออกจากระบบ?
                  <br />
                  <span className="text-caption mt-1.5 block font-medium text-red-500">
                    ไฟล์จะถูกลบออกจากฐานข้อมูลและเล่มรายงานทันที
                  </span>
                </p>

                <div className="mt-6 flex w-full gap-3">
                  <button
                    type="button"
                    onClick={() => setIsDeleteLayoutModalOpen(false)}
                    disabled={isDeletingLayout}
                    className="text-small flex-1 cursor-pointer rounded-xl border border-gray-200 bg-white py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDeleteLayout}
                    disabled={isDeletingLayout}
                    className="text-small inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 font-semibold text-white shadow-sm transition-all hover:bg-red-700 active:scale-95 disabled:opacity-50"
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
          document.body,
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
          <div className="animate-fade-in flex flex-col items-center gap-3">
            <Loader2 className="text-primary h-8 w-8 animate-spin" />
            <p className="text-small text-text-secondary font-medium">
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
