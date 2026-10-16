"use client";
import { LayoutAttachmentCard } from "@/components/forms/layout-attachment-card";

import { CheckCircle2, XCircle, AlertTriangle, Star } from "lucide-react";
import { Button } from "@/components/ui";
import { AssessmentDraftData } from "@/lib/schemas";
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
import { calculateSatisfactionResult } from "@/lib/satisfaction-schema";
import {
  EDUCATION_LEVEL_OPTIONS,
  GENDER_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  POSITION_TYPE_OPTIONS,
} from "@/lib/constants";
import type { AssessmentCategory } from "@/types";
import { cn } from "@/lib/utils";

interface ReviewStepProps {
  type?: "environment" | "health_risk" | "satisfaction";
  category?: AssessmentCategory;
  draftData: AssessmentDraftData;
  isSubmitting: boolean;
  onSubmit: () => void;
  onPrev: () => void;
}

export function ReviewStep({
  type = "environment",
  category,
  draftData,
  isSubmitting,
  onSubmit,
  onPrev,
}: ReviewStepProps) {
  const profile = draftData.profile;
  const workInfo = draftData.workInfo;
  const inspectionData = draftData.inspectionData;
  const layoutFile = draftData.layoutFile;
  const answers = draftData.answers as any;

  const optionLabel = (
    options: readonly { value: string; label: string }[],
    value?: string,
  ) => options.find((option) => option.value === value)?.label || value || "-";

  // Environment Evaluation Variables
  let envEvaluation = null;
  let envAverage = 0;
  const unitLabel =
    category === "light" ? "Lux" : category === "noise" ? "dBA" : "°C";

  // Health Risk Evaluation Variables
  let hrEvaluation = null;

  // Satisfaction Evaluation Variables
  let satisfactionResult = null;

  // Light points processed data for report table
  let processedLightPoints: Array<{
    pointNo: number;
    location_desc: string;
    measure: number;
    standard_display: string;
    isPass: boolean;
    remark: string;
  }> = [];

  // Noise points processed data for report table
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

  // Heat points processed data for report table
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

  if (answers) {
    if (type === "environment" && category) {
      if (category === "noise") {
        if (answers.noise_areas && Array.isArray(answers.noise_areas)) {
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
                : answers.standard_value?.toString() || "-";

              const maxStd = Number(answers.standard_value) || 0;
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
        if (answers.heat_areas && Array.isArray(answers.heat_areas)) {
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
                : pt.workload;
              const standard =
                pt.standard_value !== undefined && pt.standard_value !== null
                  ? Number(pt.standard_value)
                  : HEAT_STANDARDS[pt.workload as keyof typeof HEAT_STANDARDS]
                      ?.value || 0;

              const isPass = standard > 0 ? wbgtAvg <= standard : true;
              if (isPass) totalPass++;

              // Calculate total time
              let totalTime = "-";
              if (pt.start_time && pt.end_time) {
                const [startH, startM] = pt.start_time.split(":").map(Number);
                const [endH, endM] = pt.end_time.split(":").map(Number);
                const diffMins = endH * 60 + endM - (startH * 60 + startM);
                if (diffMins > 0) {
                  totalTime = `${diffMins} น.`;
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
                ? "ระดับความร้อนทุกจุดตรวจวัดอยู่ในเกณฑ์ปลอดภัย"
                : "ระดับความร้อนเกินมาตรฐาน ควรจัดเวลาพักหรือเพิ่มการระบายอากาศในพื้นที่ทำงาน",
              calculatedValue: envAverage,
            };
          }
        }
      } else if (category === "light") {
        if (answers.light_areas && Array.isArray(answers.light_areas)) {
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
      } else if (answers.standard_value) {
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
    } else if (type === "health_risk" && answers.q1 !== undefined) {
      const score = calculateHealthRiskScore(answers);
      hrEvaluation = evaluateHealthRiskResult(score, category);
    } else if (type === "satisfaction" && answers.q1 !== undefined) {
      satisfactionResult = calculateSatisfactionResult(answers);
    }
  }

  return (
    <div className="animate-fade-in flex flex-col gap-6">
      {type !== "satisfaction" && (
        <div className="form-section-card p-5">
          <h3 className="text-card-title text-text-primary mb-4 font-semibold">
            {type === "health_risk"
              ? "ข้อมูลผู้ตอบแบบประเมิน"
              : "ข้อมูลการตรวจวัด"}
          </h3>

          {type === "environment" ? (
            inspectionData ? (
              <div className="text-small text-text-secondary flex flex-col gap-2">
                <div className="border-border flex justify-between border-b py-2">
                  <span>ชื่อ-นามสกุลผู้ตรวจ</span>
                  <span className="text-text-primary font-medium">
                    {inspectionData.inspector_name}
                  </span>
                </div>
                <div className="border-border flex justify-between border-b py-2">
                  <span>ตำแหน่ง</span>
                  <span className="text-text-primary font-medium">
                    {inspectionData.position}
                  </span>
                </div>
                <div className="border-border flex justify-between border-b py-2">
                  <span>สถานที่ตรวจ</span>
                  <span className="text-text-primary font-medium">
                    {inspectionData.inspection_location}
                  </span>
                </div>
                <div className="border-border flex justify-between border-b py-2">
                  <span>วันที่ทำการตรวจวัด</span>
                  <span className="text-text-primary font-medium">
                    {inspectionData.inspection_date}
                  </span>
                </div>
                <div className="border-border flex justify-between border-b py-2">
                  <span>เครื่องมือที่ใช้</span>
                  <span className="text-text-primary font-medium">
                    {inspectionData.equipment}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span>ช่วงเวลาที่ตรวจวัด</span>
                  <span className="text-text-primary font-medium">
                    {inspectionData.start_time} - {inspectionData.end_time} น.
                  </span>
                </div>

                <LayoutAttachmentCard value={layoutFile} />
              </div>
            ) : (
              <p className="text-small text-danger">ข้อมูลไม่สมบูรณ์</p>
            )
          ) : profile && workInfo ? (
            <div className="text-small text-text-secondary flex flex-col gap-5">
              <section>
                <h4 className="text-text-primary mb-1 font-semibold">
                  ข้อมูลส่วนตัวและสุขภาพ
                </h4>
                {[
                  ["ชื่อ-นามสกุล", profile.full_name],
                  ["เพศ", optionLabel(GENDER_OPTIONS, profile.gender)],
                  ["อายุ", profile.age ? `${profile.age} ปี` : "-"],
                  ["น้ำหนัก", profile.weight ? `${profile.weight} กก.` : "-"],
                  ["ส่วนสูง", profile.height ? `${profile.height} ซม.` : "-"],
                  [
                    "ระดับการศึกษา",
                    optionLabel(
                      EDUCATION_LEVEL_OPTIONS,
                      profile.education_level,
                    ),
                  ],
                  [
                    "สถานภาพ",
                    optionLabel(MARITAL_STATUS_OPTIONS, profile.marital_status),
                  ],
                  [
                    "โรคประจำตัว",
                    profile.has_underlying_disease
                      ? profile.underlying_disease_details || "มี"
                      : "ไม่มี",
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="border-border flex items-start justify-between gap-4 border-b py-2 last:border-b-0"
                  >
                    <span>{label}</span>
                    <span className="text-text-primary max-w-[62%] text-right font-medium break-words">
                      {value || "-"}
                    </span>
                  </div>
                ))}
              </section>

              <section>
                <h4 className="text-text-primary mb-1 font-semibold">
                  ข้อมูลการปฏิบัติงาน
                </h4>
                {[
                  [
                    "ประเภทบุคลากร",
                    optionLabel(POSITION_TYPE_OPTIONS, workInfo.position_type),
                  ],
                  ["หลักสูตร / แผนก / ฝ่าย", workInfo.department],
                  [
                    "อายุงาน",
                    workInfo.work_experience_years !== "" &&
                    workInfo.work_experience_years !== undefined
                      ? `${workInfo.work_experience_years} ปี`
                      : "-",
                  ],
                  [
                    "เวลาทำงาน",
                    workInfo.working_hours_per_day !== "" &&
                    workInfo.working_hours_per_day !== undefined
                      ? `${workInfo.working_hours_per_day} ชั่วโมง/วัน`
                      : "-",
                  ],
                  [
                    "วันทำงาน",
                    workInfo.working_days_per_week !== "" &&
                    workInfo.working_days_per_week !== undefined
                      ? `${workInfo.working_days_per_week} วัน/สัปดาห์`
                      : "-",
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="border-border flex items-start justify-between gap-4 border-b py-2 last:border-b-0"
                  >
                    <span>{label}</span>
                    <span className="text-text-primary max-w-[62%] text-right font-medium break-words">
                      {value || "-"}
                    </span>
                  </div>
                ))}
              </section>
            </div>
          ) : (
            <p className="text-small text-danger">ข้อมูลไม่สมบูรณ์</p>
          )}
        </div>
      )}

      {/* Light Assessment Detailed Report Table */}
      {type === "environment" &&
        category === "light" &&
        processedLightPoints.length > 0 && (
          <div className="form-section-card overflow-hidden p-5">
            <h3 className="text-card-title text-text-primary mb-4 font-semibold">
              รายงานผลการตรวจวัดระดับแสงสว่าง
            </h3>

            <div className="-mx-5 overflow-x-auto px-5">
              <table className="text-small w-full border-collapse text-left">
                <thead>
                  <tr className="border-border text-caption text-text-secondary border-b bg-white/40">
                    <th className="w-12 px-2 py-2.5 text-center font-semibold">
                      จุดที่
                    </th>
                    <th className="px-2 py-2.5 font-semibold">
                      สถานที่/ลักษณะงาน
                    </th>
                    <th className="px-2 py-2.5 text-right font-semibold">
                      ผลการตรวจวัด
                      <br />
                      (Lux)
                    </th>
                    <th className="px-2 py-2.5 text-center font-semibold">
                      ค่ามาตรฐาน
                      <br />
                      (Lux)
                    </th>
                    <th className="px-2 py-2.5 text-center font-semibold">
                      สรุปผล
                    </th>
                    <th className="px-2 py-2.5 font-semibold">หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody className="divide-border/60 divide-y">
                  {processedLightPoints.map((pt) => (
                    <tr
                      key={pt.pointNo}
                      className="transition-colors hover:bg-white/30"
                    >
                      <td className="text-text-secondary px-2 py-3 text-center font-medium">
                        {pt.pointNo}
                      </td>
                      <td className="text-text-primary px-2 py-3 font-medium">
                        {pt.location_desc}
                      </td>
                      <td
                        className={cn(
                          "px-2 py-3 text-right font-bold",
                          pt.isPass ? "text-text-primary" : "text-danger",
                        )}
                      >
                        {pt.measure}
                      </td>
                      <td className="text-text-secondary px-2 py-3 text-center">
                        {pt.standard_display}
                      </td>
                      <td className="px-2 py-3 text-center font-medium">
                        {pt.isPass ? (
                          <span className="text-text-secondary">ผ่าน</span>
                        ) : (
                          <span className="text-danger font-semibold">
                            ไม่ผ่าน
                          </span>
                        )}
                      </td>
                      <td className="text-caption text-text-secondary px-2 py-3">
                        {pt.remark || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      {/* Noise Assessment Detailed Report Table */}
      {type === "environment" &&
        category === "noise" &&
        processedNoisePoints.length > 0 && (
          <div className="form-section-card overflow-hidden p-5">
            <h3 className="text-card-title text-text-primary mb-4 font-semibold">
              รายงานผลการตรวจวัดระดับเสียง
            </h3>

            <div className="-mx-5 overflow-x-auto px-5">
              <table className="text-small border-border w-full border-collapse border text-left">
                <thead>
                  <tr className="border-border text-caption text-text-secondary border-b bg-white/40">
                    <th
                      rowSpan={2}
                      className="border-border w-12 border-r px-2 py-2.5 text-center font-semibold"
                    >
                      จุดที่
                    </th>
                    <th
                      rowSpan={2}
                      className="border-border border-r px-2 py-2.5 text-center font-semibold"
                    >
                      สถานที่
                    </th>
                    <th
                      colSpan={2}
                      className="border-border border-r px-2 py-2.5 text-center font-semibold"
                    >
                      ผลการตรวจวัดระดับเสียง
                    </th>
                    <th
                      colSpan={2}
                      className="px-2 py-2.5 text-center font-semibold"
                    >
                      ค่ามาตรฐาน หมายเหตุ
                    </th>
                  </tr>
                  <tr className="border-border text-caption text-text-secondary border-b bg-white/40">
                    <th className="border-border border-r px-2 py-2.5 text-center font-semibold">
                      ต่ำสุด dB(A)
                    </th>
                    <th className="border-border border-r px-2 py-2.5 text-center font-semibold">
                      สูงสุด dB(A)
                    </th>
                    <th className="border-border border-r px-2 py-2.5 text-center font-semibold">
                      เฉลี่ย dB(A)
                    </th>
                    <th className="px-2 py-2.5 text-center font-semibold">
                      {answers?.standard_value || 85} dB(A)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-border/60 divide-y">
                  {processedNoisePoints.map((pt) => (
                    <tr
                      key={pt.pointNo}
                      className="transition-colors hover:bg-white/30"
                    >
                      <td className="text-text-secondary border-border border-r px-2 py-3 text-center font-medium">
                        {pt.pointNo}
                      </td>
                      <td className="text-text-primary border-border border-r px-2 py-3 font-medium">
                        {pt.location_desc}
                      </td>
                      <td className="text-text-secondary border-border border-r px-2 py-3 text-center font-medium">
                        {pt.min_dBA}
                      </td>
                      <td className="text-text-secondary border-border border-r px-2 py-3 text-center font-medium">
                        {pt.max_dBA}
                      </td>
                      <td className="text-text-secondary border-border border-r px-2 py-3 text-center font-medium">
                        {pt.avg_dBA}
                      </td>
                      <td className="px-2 py-3 text-center font-medium">
                        {pt.isPass ? (
                          <span className="text-text-secondary">ผ่าน</span>
                        ) : (
                          <span className="text-danger font-semibold">
                            ไม่ผ่าน
                          </span>
                        )}
                        {pt.remark ? (
                          <span className="text-text-secondary mt-1 block text-[10px]">
                            {pt.remark}
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="text-caption text-text-secondary mt-4">
              <p>
                <span className="font-semibold">*หมายเหตุ</span>{" "}
                ค่ามาตรฐานอ้างอิงจากประกาศกรมสวัสดิการและคุ้มครองแรงงาน เรื่อง
                มาตรฐานระดับเสียงที่ยอมให้ลูกจ้างได้รับเฉลี่ยตลอดระยะเวลาการทำงานในแต่ละวัน
                พ.ศ. 2561
              </p>
            </div>
          </div>
        )}

      {/* Heat Assessment Detailed Report Table */}
      {type === "environment" &&
        category === "heat" &&
        processedHeatPoints.length > 0 && (
          <div className="form-section-card overflow-hidden p-5">
            <h3 className="text-card-title text-text-primary mb-4 font-semibold">
              รายงานผลการตรวจวัดระดับความร้อน
            </h3>

            <div className="-mx-5 overflow-x-auto px-5">
              <table className="border-border w-full border-collapse border text-left text-[11px]">
                <thead>
                  <tr className="border-border text-text-secondary border-b bg-white/40 text-center">
                    <th
                      rowSpan={2}
                      className="border-border w-10 border-r px-1 py-2 font-semibold"
                    >
                      ลำดับ
                    </th>
                    <th
                      rowSpan={2}
                      className="border-border border-r px-1 py-2 font-semibold"
                    >
                      แผนก
                      <br />
                      ตรวจวัด
                    </th>
                    <th
                      colSpan={3}
                      className="border-border border-r px-1 py-2 font-semibold"
                    >
                      ระยะเวลาการตรวจ
                    </th>
                    <th
                      colSpan={3}
                      className="border-border border-r px-1 py-2 font-semibold"
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
                  <tr className="border-border text-text-secondary border-b bg-white/40 text-center">
                    <th className="border-border border-r px-1 py-2 font-semibold">
                      เวลา
                      <br />
                      เริ่มต้น
                    </th>
                    <th className="border-border border-r px-1 py-2 font-semibold">
                      เวลา
                      <br />
                      สิ้นสุด
                    </th>
                    <th className="border-border border-r px-1 py-2 font-semibold">
                      เวลา
                      <br />
                      รวม
                    </th>
                    <th className="border-border border-r px-1 py-2 font-semibold">
                      กระเปาะ
                      <br />
                      แห้ง (DB)
                    </th>
                    <th className="border-border border-r px-1 py-2 font-semibold">
                      กระเปาะ
                      <br />
                      เปียก (WB)
                    </th>
                    <th className="border-border border-r px-1 py-2 font-semibold">
                      โกลบ
                      <br />
                      (GT)
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
                      <td className="text-text-primary border-border border-r px-1 py-2 font-medium">
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
                      <td className="text-text-secondary border-border border-r px-1 py-2 font-semibold">
                        {pt.wbgt_avg}
                      </td>
                      <td className="text-text-secondary border-border border-r px-1 py-2">
                        {pt.standard_value}
                      </td>
                      <td className="px-1 py-2 font-medium">
                        {pt.isPass ? (
                          <span className="text-text-secondary">ผ่าน</span>
                        ) : (
                          <span className="text-danger font-semibold">
                            ไม่ผ่าน
                          </span>
                        )}
                        {pt.remark ? (
                          <span className="text-text-secondary mt-1 block text-[10px]">
                            {pt.remark}
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="text-text-secondary mt-4 text-[11px]">
              <p>
                ผลการตรวจวัดดัชนีความร้อนโดยผลที่ได้พบว่ามีค่าอยู่ในเกณฑ์มาตรฐานกำหนดตามประกาศกฎกระทรวง
                &ldquo;เรื่องกำหนดมาตรฐานในการบริหาร
                จัดการและดำเนินการด้านอาชีวอนามัยและความปลอดภัยและสภาพแวดล้อมในการทำงานเกี่ยวกับความร้อน
                แสงสว่าง และเสียง พ.ศ. 2559&rdquo;
              </p>
            </div>
          </div>
        )}

      {/* Environment Assessment Overall Summary Card */}
      {type === "environment" && envEvaluation && answers && (
        <div className="form-section-card p-5 text-center">
          <div className="mb-3 flex justify-center">
            {envEvaluation.isPass ? (
              <CheckCircle2 className="text-success animate-scale-in h-16 w-16" />
            ) : (
              <XCircle className="text-danger animate-scale-in h-16 w-16" />
            )}
          </div>

          <h3
            className={cn(
              "text-section-title mb-4 font-bold",
              envEvaluation.isPass ? "text-success" : "text-danger",
            )}
          >
            {envEvaluation.isPass ? "ผ่านเกณฑ์มาตรฐาน" : "ไม่ผ่านเกณฑ์มาตรฐาน"}
          </h3>

          <div className="mb-4 flex justify-center">
            <div
              className={cn(
                "w-full max-w-[200px] rounded-md p-3 text-center",
                envEvaluation.isPass
                  ? "bg-success-soft/30"
                  : "bg-danger-soft/30",
              )}
            >
              <p className="text-caption text-text-secondary mb-1">
                ค่าที่วัดได้เฉลี่ยรวม
              </p>
              <p
                className={cn(
                  "text-h1 font-bold",
                  envEvaluation.isPass ? "text-success" : "text-danger",
                )}
              >
                {envAverage} {unitLabel}
              </p>
            </div>
          </div>

          <div className="border-border border-t pt-4 text-left">
            {category !== "light" &&
              category !== "noise" &&
              answers.standard_value && (
                <>
                  <p className="text-small text-text-primary mb-1 font-semibold">
                    เกณฑ์มาตรฐาน
                  </p>
                  <p className="text-small text-text-secondary mb-4">
                    ≤ {answers.standard_value} {unitLabel}
                  </p>
                </>
              )}

            <p className="text-small text-text-primary mb-1 font-semibold">
              คำแนะนำ
            </p>
            <p className="text-small text-text-secondary bg-muted rounded-md p-3">
              {envEvaluation.message}
            </p>
          </div>
        </div>
      )}

      {/* Health Risk Assessment Result */}
      {type === "health_risk" && hrEvaluation && answers && (
        <div className="form-section-card p-5 text-center">
          <div className="mb-3 flex justify-center">
            {hrEvaluation.level === "pass" ? (
              <CheckCircle2 className="text-success animate-scale-in h-16 w-16" />
            ) : hrEvaluation.level === "medium" ? (
              <AlertTriangle className="text-warning animate-scale-in h-16 w-16" />
            ) : (
              <XCircle className="text-danger animate-scale-in h-16 w-16" />
            )}
          </div>

          <h3
            className={cn(
              "text-section-title mb-4 font-bold",
              `text-${hrEvaluation.colorClass}`,
            )}
          >
            {hrEvaluation.levelLabel}
          </h3>

          <div className="mb-4 flex justify-center">
            <div
              className={cn(
                "w-full max-w-xs rounded-md p-4",
                `bg-${hrEvaluation.colorClass}-soft/20`,
              )}
            >
              <p className="text-caption text-text-secondary mb-1">
                คะแนนความเสี่ยงรวม (จาก 20 คะแนน)
              </p>
              <p
                className={cn(
                  "text-h1 font-bold",
                  `text-${hrEvaluation.colorClass}`,
                )}
              >
                {hrEvaluation.score}
              </p>
            </div>
          </div>

          <div className="border-border border-t pt-4 text-left">
            <p className="text-small text-text-primary mb-1 font-semibold">
              คำแนะนำเบื้องต้น
            </p>
            <p className="text-small text-text-secondary bg-muted mb-4 rounded-md p-4 leading-relaxed">
              {hrEvaluation.message}
            </p>

            {hrEvaluation.recommendations &&
              hrEvaluation.recommendations.length > 0 && (
                <div className="border-primary/20 bg-primary-tint/30 animate-fade-in rounded-xl border p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-xl">
                      {category === "light"
                        ? "💡"
                        : category === "noise"
                          ? "🔊"
                          : "🌡️"}
                    </span>
                    <h4 className="text-small text-text-primary font-bold">
                      ข้อเสนอแนะ{" "}
                      {category === "light"
                        ? "ด้านแสงสว่าง (Illumination)"
                        : category === "noise"
                          ? "ด้านเสียง (Noise)"
                          : "ด้านความร้อน (Heat)"}
                    </h4>
                    <span className="border-border text-text-secondary ml-auto rounded-full border bg-white/80 px-2.5 py-0.5 text-[11px] font-semibold">
                      {hrEvaluation.levelLabel}
                    </span>
                  </div>
                  <ul className="flex flex-col gap-2.5">
                    {hrEvaluation.recommendations.map(
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
        </div>
      )}

      {/* Satisfaction Assessment Result */}
      {type === "satisfaction" && satisfactionResult && (
        <div className="form-section-card p-5 text-center">
          <div className="mb-3 flex justify-center">
            <Star className="text-warning fill-warning animate-scale-in h-16 w-16" />
          </div>

          <h3 className="text-section-title text-text-primary mb-4 font-bold">
            สรุปผลความพึงพอใจ
          </h3>

          <div className="mb-6 flex justify-center">
            <div className="bg-primary-tint border-primary/20 w-full max-w-xs rounded-md border p-4">
              <p className="text-caption text-primary-deep mb-1">
                คะแนนเฉลี่ยรวม (เต็ม 5)
              </p>
              <p className="text-h1 text-primary font-bold">
                {satisfactionResult.overallAvg.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="border-border border-t pt-4 text-left">
            <p className="text-body text-text-primary mb-3 font-semibold">
              คะแนนเฉลี่ยรายด้าน
            </p>

            <div className="flex flex-col gap-3">
              <div className="text-small flex items-center justify-between">
                <span className="text-text-secondary">
                  ด้านเนื้อหา (Accuracy)
                </span>
                <span className="text-text-primary font-bold">
                  {satisfactionResult.accuracyAvg.toFixed(2)}
                </span>
              </div>
              <div className="text-small flex items-center justify-between">
                <span className="text-text-secondary">
                  ด้านการออกแบบ (Design)
                </span>
                <span className="text-text-primary font-bold">
                  {satisfactionResult.designAvg.toFixed(2)}
                </span>
              </div>
              <div className="text-small flex items-center justify-between">
                <span className="text-text-secondary">
                  ด้านการใช้งาน (Usability)
                </span>
                <span className="text-text-primary font-bold">
                  {satisfactionResult.usabilityAvg.toFixed(2)}
                </span>
              </div>
              <div className="text-small flex items-center justify-between">
                <span className="text-text-secondary">
                  ด้านประโยชน์ (Usefulness)
                </span>
                <span className="text-text-primary font-bold">
                  {satisfactionResult.usefulnessAvg.toFixed(2)}
                </span>
              </div>
            </div>

            {satisfactionResult.suggestion && (
              <div className="mt-6">
                <p className="text-small text-text-primary mb-2 font-semibold">
                  ข้อเสนอแนะ
                </p>
                <p className="text-small text-text-secondary bg-muted rounded-md p-3 italic">
                  &ldquo;{satisfactionResult.suggestion}&rdquo;
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-2 flex gap-3 pb-8">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onPrev}
          disabled={isSubmitting}
        >
          แก้ไขข้อมูล
        </Button>
        <Button
          type="button"
          className="flex-1"
          onClick={onSubmit}
          isLoading={isSubmitting}
        >
          บันทึกผล
        </Button>
      </div>
    </div>
  );
}
