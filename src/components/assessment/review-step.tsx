"use client";

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
  const answers = draftData.answers as any;

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
                (s) => s.value === Number(answers.standard_value)
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
            }
          );

          if (vals.length > 0) {
            const sum = vals.reduce((acc, curr) => acc + curr, 0);
            envAverage = Number((sum / vals.length).toFixed(2));
            const allPass = totalPass === processedNoisePoints.length;
            
            let isOverallPass = allPass;
            let overallAvg = envAverage;
            
            if (answers.twa_8hr !== undefined && answers.twa_8hr !== null && answers.twa_8hr !== "") {
              overallAvg = Number(answers.twa_8hr);
              if (answers.standard_value) {
                isOverallPass = overallAvg <= Number(answers.standard_value);
              }
            }

            envEvaluation = {
              isPass: isOverallPass,
              score: 0,
              message: isOverallPass
                ? "ระดับเสียงภาพรวมผ่านเกณฑ์มาตรฐาน ควรรักษาสภาพแวดล้อมให้คงเดิม"
                : "ระดับเสียงภาพรวมเกินมาตรฐานที่กำหนด ควรจัดหาอุปกรณ์ป้องกันเสียง (PPE) ให้พนักงานหรือลดแหล่งกำเนิดเสียง",
              calculatedValue: overallAvg,
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

              const workloadObj = HEAT_WORKLOADS.find((w) => w.value === pt.workload);
              const workloadLabel = workloadObj ? workloadObj.label : pt.workload;
              const standard = pt.standard_value !== undefined && pt.standard_value !== null 
                ? Number(pt.standard_value) 
                : (HEAT_STANDARDS[pt.workload as keyof typeof HEAT_STANDARDS]?.value || 0);
              
              const isPass = standard > 0 ? wbgtAvg <= standard : true;
              if (isPass) totalPass++;

              // Calculate total time
              let totalTime = "-";
              if (pt.start_time && pt.end_time) {
                const [startH, startM] = pt.start_time.split(":").map(Number);
                const [endH, endM] = pt.end_time.split(":").map(Number);
                const diffMins = (endH * 60 + endM) - (startH * 60 + startM);
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
                db_temp: pt.db_temp !== undefined && pt.db_temp !== null && pt.db_temp !== "" ? Number(pt.db_temp) : "-",
                wb_temp: pt.wb_temp !== undefined && pt.wb_temp !== null && pt.wb_temp !== "" ? Number(pt.wb_temp) : "-",
                gt_temp: pt.gt_temp !== undefined && pt.gt_temp !== null && pt.gt_temp !== "" ? Number(pt.gt_temp) : "-",
                wbgt_in: pt.wbgt_in !== undefined && pt.wbgt_in !== null && pt.wbgt_in !== "" ? Number(pt.wbgt_in) : "-",
                wbgt_type: pt.wbgt_type || "in",
                workload_label: workloadLabel,
                wbgt_avg: wbgtAvg,
                standard_value: standard,
                isPass,
                remark: pt.remark || "",
              };
            }
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
            }
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
    } else if (type === "health_risk" && answers.q1 !== undefined) {
      const score = calculateHealthRiskScore(answers);
      hrEvaluation = evaluateHealthRiskResult(score);
    } else if (type === "satisfaction" && answers.q1 !== undefined) {
      satisfactionResult = calculateSatisfactionResult(answers);
    }
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {type !== "satisfaction" && (
        <div className="rounded-card border border-white/40 bg-white/60 backdrop-blur-md p-5 shadow-sm">
        <h3 className="mb-4 text-card-title font-semibold text-text-primary">
          ข้อมูลการตรวจวัด
        </h3>

        {type === "environment" ? (
          inspectionData ? (
            <div className="flex flex-col gap-2 text-small text-text-secondary">
              <div className="flex justify-between border-b border-border py-2">
                <span>ชื่อ-นามสกุลผู้ตรวจ</span>
                <span className="font-medium text-text-primary">
                  {inspectionData.inspector_name}
                </span>
              </div>
              <div className="flex justify-between border-b border-border py-2">
                <span>ตำแหน่ง</span>
                <span className="font-medium text-text-primary">
                  {inspectionData.position}
                </span>
              </div>
              <div className="flex justify-between border-b border-border py-2">
                <span>สถานที่ตรวจ</span>
                <span className="font-medium text-text-primary">
                  {inspectionData.inspection_location}
                </span>
              </div>
              <div className="flex justify-between border-b border-border py-2">
                <span>วันที่ทำการตรวจวัด</span>
                <span className="font-medium text-text-primary">
                  {inspectionData.inspection_date}
                </span>
              </div>
              <div className="flex justify-between border-b border-border py-2">
                <span>เครื่องมือที่ใช้</span>
                <span className="font-medium text-text-primary">
                  {inspectionData.equipment}
                </span>
              </div>
              <div className="flex justify-between border-b border-border py-2">
                <span>เทคนิคการตรวจวัด</span>
                <span className="font-medium text-text-primary">
                  {inspectionData.measurement_technique}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span>ช่วงเวลาที่ตรวจวัด</span>
                <span className="font-medium text-text-primary">
                  {inspectionData.start_time} - {inspectionData.end_time} น.
                </span>
              </div>
            </div>
          ) : (
            <p className="text-small text-danger">ข้อมูลไม่สมบูรณ์</p>
          )
        ) : profile && workInfo ? (
          <div className="flex flex-col gap-2 text-small text-text-secondary">
            <div className="flex justify-between border-b border-border py-2">
              <span>ชื่อ-นามสกุล</span>
              <span className="font-medium text-text-primary">
                {profile.full_name}
              </span>
            </div>
            <div className="flex justify-between border-b border-border py-2">
              <span>แผนก/ฝ่าย</span>
              <span className="font-medium text-text-primary">
                {workInfo.department}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-small text-danger">ข้อมูลไม่สมบูรณ์</p>
        )}
      </div>
      )}

      {/* Light Assessment Detailed Report Table */}
      {type === "environment" && category === "light" && processedLightPoints.length > 0 && (
        <div className="rounded-card border border-white/40 bg-white/60 backdrop-blur-md p-5 shadow-sm overflow-hidden">
          <h3 className="mb-4 text-card-title font-semibold text-text-primary">
            รายงานผลการตรวจวัดระดับแสงสว่าง
          </h3>

          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-left text-small border-collapse">
              <thead>
                <tr className="border-b border-border text-caption text-text-secondary bg-white/40">
                  <th className="py-2.5 px-2 text-center w-12 font-semibold">จุดที่</th>
                  <th className="py-2.5 px-2 font-semibold">สถานที่/ลักษณะงาน</th>
                  <th className="py-2.5 px-2 text-right font-semibold">
                    ผลการตรวจวัด<br />(Lux)
                  </th>
                  <th className="py-2.5 px-2 text-center font-semibold">
                    ค่ามาตรฐาน<br />(Lux)
                  </th>
                  <th className="py-2.5 px-2 text-center font-semibold">สรุปผล</th>
                  <th className="py-2.5 px-2 font-semibold">หมายเหตุ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {processedLightPoints.map((pt) => (
                  <tr key={pt.pointNo} className="hover:bg-white/30 transition-colors">
                    <td className="py-3 px-2 text-center font-medium text-text-secondary">
                      {pt.pointNo}
                    </td>
                    <td className="py-3 px-2 font-medium text-text-primary">
                      {pt.location_desc}
                    </td>
                    <td
                      className={cn(
                        "py-3 px-2 text-right font-bold",
                        pt.isPass ? "text-text-primary" : "text-danger"
                      )}
                    >
                      {pt.measure}
                    </td>
                    <td className="py-3 px-2 text-center text-text-secondary">
                      {pt.standard_display}
                    </td>
                    <td className="py-3 px-2 text-center font-medium">
                      {pt.isPass ? (
                        <span className="text-text-secondary">ผ่าน</span>
                      ) : (
                        <span className="text-danger font-semibold">ไม่ผ่าน</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-caption text-text-secondary">
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
      {type === "environment" && category === "noise" && processedNoisePoints.length > 0 && (
        <div className="rounded-card border border-white/40 bg-white/60 backdrop-blur-md p-5 shadow-sm overflow-hidden">
          <h3 className="mb-4 text-card-title font-semibold text-text-primary">
            รายงานผลการตรวจวัดระดับเสียง
          </h3>

          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-left text-small border-collapse border border-border">
              <thead>
                <tr className="border-b border-border text-caption text-text-secondary bg-white/40">
                  <th rowSpan={2} className="py-2.5 px-2 text-center w-12 font-semibold border-r border-border">จุดที่</th>
                  <th rowSpan={2} className="py-2.5 px-2 font-semibold border-r border-border text-center">สถานที่</th>
                  <th colSpan={2} className="py-2.5 px-2 text-center font-semibold border-r border-border">ผลการตรวจวัดระดับเสียง</th>
                  <th colSpan={2} className="py-2.5 px-2 text-center font-semibold">ค่ามาตรฐาน หมายเหตุ</th>
                </tr>
                <tr className="border-b border-border text-caption text-text-secondary bg-white/40">
                  <th className="py-2.5 px-2 text-center font-semibold border-r border-border">ต่ำสุด dB(A)</th>
                  <th className="py-2.5 px-2 text-center font-semibold border-r border-border">สูงสุด dB(A)</th>
                  <th className="py-2.5 px-2 text-center font-semibold border-r border-border">เฉลี่ย dB(A)</th>
                  <th className="py-2.5 px-2 text-center font-semibold">{answers?.standard_value || 85} dB(A)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {processedNoisePoints.map((pt) => (
                  <tr key={pt.pointNo} className="hover:bg-white/30 transition-colors">
                    <td className="py-3 px-2 text-center font-medium text-text-secondary border-r border-border">
                      {pt.pointNo}
                    </td>
                    <td className="py-3 px-2 font-medium text-text-primary border-r border-border">
                      {pt.location_desc}
                    </td>
                    <td className="py-3 px-2 text-center font-medium text-text-secondary border-r border-border">
                      {pt.min_dBA}
                    </td>
                    <td className="py-3 px-2 text-center font-medium text-text-secondary border-r border-border">
                      {pt.max_dBA}
                    </td>
                    <td className="py-3 px-2 text-center font-medium text-text-secondary border-r border-border">
                      {pt.avg_dBA}
                    </td>
                    <td className="py-3 px-2 text-center font-medium">
                      {pt.isPass ? (
                        <span className="text-text-secondary">ผ่าน</span>
                      ) : (
                        <span className="text-danger font-semibold">ไม่ผ่าน</span>
                      )}
                      {pt.remark ? (
                        <span className="block text-[10px] text-text-secondary mt-1">{pt.remark}</span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-4 text-caption text-text-secondary">
            <p><span className="font-semibold">*หมายเหตุ</span> ค่ามาตรฐานอ้างอิงจากประกาศกรมสวัสดิการและคุ้มครองแรงงาน เรื่อง มาตรฐานระดับเสียงที่ยอมให้ลูกจ้างได้รับเฉลี่ยตลอดระยะเวลาการทำงานในแต่ละวัน พ.ศ. 2561</p>
          </div>
        </div>
      )}

      {/* Heat Assessment Detailed Report Table */}
      {type === "environment" && category === "heat" && processedHeatPoints.length > 0 && (
        <div className="rounded-card border border-white/40 bg-white/60 backdrop-blur-md p-5 shadow-sm overflow-hidden">
          <h3 className="mb-4 text-card-title font-semibold text-text-primary">
            รายงานผลการตรวจวัดระดับความร้อน
          </h3>

          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-left text-[11px] border-collapse border border-border">
              <thead>
                <tr className="border-b border-border text-text-secondary bg-white/40 text-center">
                  <th rowSpan={2} className="py-2 px-1 w-10 font-semibold border-r border-border">ลำดับ</th>
                  <th rowSpan={2} className="py-2 px-1 font-semibold border-r border-border">แผนก<br/>ตรวจวัด</th>
                  <th colSpan={3} className="py-2 px-1 font-semibold border-r border-border">ระยะเวลาการตรวจ</th>
                  <th colSpan={3} className="py-2 px-1 font-semibold border-r border-border">อุณหภูมิ (°C)</th>
                  <th rowSpan={2} className="py-2 px-1 font-semibold border-r border-border">WBGT<br/>(in/out)</th>
                  <th rowSpan={2} className="py-2 px-1 font-semibold border-r border-border">ประเภท<br/>งาน</th>
                  <th rowSpan={2} className="py-2 px-1 font-semibold border-r border-border">WBGT<br/>เฉลี่ย</th>
                  <th rowSpan={2} className="py-2 px-1 font-semibold border-r border-border">มาตรฐาน</th>
                  <th rowSpan={2} className="py-2 px-1 font-semibold">ผลการ<br/>ประเมิน</th>
                </tr>
                <tr className="border-b border-border text-text-secondary bg-white/40 text-center">
                  <th className="py-2 px-1 font-semibold border-r border-border">เวลา<br/>เริ่มต้น</th>
                  <th className="py-2 px-1 font-semibold border-r border-border">เวลา<br/>สิ้นสุด</th>
                  <th className="py-2 px-1 font-semibold border-r border-border">เวลา<br/>รวม</th>
                  <th className="py-2 px-1 font-semibold border-r border-border">กระเปาะ<br/>แห้ง (DB)</th>
                  <th className="py-2 px-1 font-semibold border-r border-border">กระเปาะ<br/>เปียก (WB)</th>
                  <th className="py-2 px-1 font-semibold border-r border-border">โกลบ<br/>(GT)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {processedHeatPoints.map((pt) => (
                  <tr key={pt.pointNo} className="hover:bg-white/30 transition-colors text-center">
                    <td className="py-2 px-1 font-medium text-text-secondary border-r border-border">
                      {pt.pointNo}
                    </td>
                    <td className="py-2 px-1 font-medium text-text-primary border-r border-border">
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
                      {pt.wbgt_in} {pt.wbgt_in !== "-" && <span className="text-[9px] uppercase">({pt.wbgt_type})</span>}
                    </td>
                    <td className="py-2 px-1 text-text-secondary border-r border-border">
                      {pt.workload_label}
                    </td>
                    <td className="py-2 px-1 font-semibold text-text-secondary border-r border-border">
                      {pt.wbgt_avg}
                    </td>
                    <td className="py-2 px-1 text-text-secondary border-r border-border">
                      {pt.standard_value}
                    </td>
                    <td className="py-2 px-1 font-medium">
                      {pt.isPass ? (
                        <span className="text-text-secondary">ผ่าน</span>
                      ) : (
                        <span className="text-danger font-semibold">ไม่ผ่าน</span>
                      )}
                      {pt.remark ? (
                        <span className="block text-[10px] text-text-secondary mt-1">{pt.remark}</span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-4 text-[11px] text-text-secondary">
            <p>ผลการตรวจวัดดัชนีความร้อนโดยผลที่ได้พบว่ามีค่าอยู่ในเกณฑ์มาตรฐานกำหนดตามประกาศกฎกระทรวง &ldquo;เรื่องกำหนดมาตรฐานในการบริหาร จัดการและดำเนินการด้านอาชีวอนามัยและความปลอดภัยและสภาพแวดล้อมในการทำงานเกี่ยวกับความร้อน แสงสว่าง และเสียง พ.ศ. 2559&rdquo;</p>
          </div>
        </div>
      )}

      {/* Environment Assessment Overall Summary Card */}
      {type === "environment" && envEvaluation && answers && (
        <div className="rounded-card border border-white/40 bg-white/60 backdrop-blur-md p-5 shadow-sm text-center">
          <div className="flex justify-center mb-3">
            {envEvaluation.isPass ? (
              <CheckCircle2 className="h-16 w-16 text-success animate-scale-in" />
            ) : (
              <XCircle className="h-16 w-16 text-danger animate-scale-in" />
            )}
          </div>

          <h3
            className={cn(
              "text-section-title font-bold mb-4",
              envEvaluation.isPass ? "text-success" : "text-danger"
            )}
          >
            {envEvaluation.isPass ? "ผ่านเกณฑ์มาตรฐาน" : "ไม่ผ่านเกณฑ์มาตรฐาน"}
          </h3>

          <div className="flex justify-center mb-4">
            <div
              className={cn(
                "rounded-md p-3 max-w-[200px] w-full text-center",
                envEvaluation.isPass
                  ? "bg-success-soft/30"
                  : "bg-danger-soft/30"
              )}
            >
              <p className="text-caption text-text-secondary mb-1">
                {category === "noise" ? "ระดับ TWA 8 ชม." : "ค่าที่วัดได้เฉลี่ยรวม"}
              </p>
              <p
                className={cn(
                  "text-h1 font-bold",
                  envEvaluation.isPass ? "text-success" : "text-danger"
                )}
              >
                {envAverage} {unitLabel}
              </p>
            </div>
          </div>

          <div className="text-left border-t border-border pt-4">
            {category !== "light" && category !== "noise" && answers.standard_value && (
              <>
                <p className="text-small font-semibold text-text-primary mb-1">
                  เกณฑ์มาตรฐาน
                </p>
                <p className="text-small text-text-secondary mb-4">
                  ≤ {answers.standard_value} {unitLabel}
                </p>
              </>
            )}

            <p className="text-small font-semibold text-text-primary mb-1">
              คำแนะนำ
            </p>
            <p className="text-small text-text-secondary bg-muted p-3 rounded-md">
              {envEvaluation.message}
            </p>
          </div>
        </div>
      )}

      {/* Health Risk Assessment Result */}
      {type === "health_risk" && hrEvaluation && answers && (
        <div className="rounded-card border border-white/40 bg-white/60 backdrop-blur-md p-5 shadow-sm text-center">
          <div className="flex justify-center mb-3">
            {hrEvaluation.level === "pass" ? (
              <CheckCircle2 className="h-16 w-16 text-success animate-scale-in" />
            ) : hrEvaluation.level === "medium" ? (
              <AlertTriangle className="h-16 w-16 text-warning animate-scale-in" />
            ) : (
              <XCircle className="h-16 w-16 text-danger animate-scale-in" />
            )}
          </div>

          <h3
            className={cn(
              "text-section-title font-bold mb-4",
              `text-${hrEvaluation.colorClass}`
            )}
          >
            {hrEvaluation.levelLabel}
          </h3>

          <div className="flex justify-center mb-4">
            <div
              className={cn(
                "rounded-md p-4 w-full max-w-xs",
                `bg-${hrEvaluation.colorClass}-soft/20`
              )}
            >
              <p className="text-caption text-text-secondary mb-1">
                คะแนนความเสี่ยงรวม (จาก 20 คะแนน)
              </p>
              <p
                className={cn(
                  "text-h1 font-bold",
                  `text-${hrEvaluation.colorClass}`
                )}
              >
                {hrEvaluation.score}
              </p>
            </div>
          </div>

          <div className="text-left border-t border-border pt-4">
            <p className="text-small font-semibold text-text-primary mb-1">
              คำแนะนำเบื้องต้น
            </p>
            <p className="text-small text-text-secondary bg-muted p-4 rounded-md leading-relaxed">
              {hrEvaluation.message}
            </p>
          </div>
        </div>
      )}

      {/* Satisfaction Assessment Result */}
      {type === "satisfaction" && satisfactionResult && (
        <div className="rounded-card border border-white/40 bg-white/60 backdrop-blur-md p-5 shadow-sm text-center">
          <div className="flex justify-center mb-3">
            <Star className="h-16 w-16 text-warning fill-warning animate-scale-in" />
          </div>

          <h3 className="text-section-title font-bold mb-4 text-text-primary">
            สรุปผลความพึงพอใจ
          </h3>

          <div className="flex justify-center mb-6">
            <div className="rounded-md p-4 w-full max-w-xs bg-primary-tint border border-primary/20">
              <p className="text-caption text-primary-deep mb-1">
                คะแนนเฉลี่ยรวม (เต็ม 5)
              </p>
              <p className="text-h1 font-bold text-primary">
                {satisfactionResult.overallAvg.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="text-left border-t border-border pt-4">
            <p className="text-body font-semibold text-text-primary mb-3">
              คะแนนเฉลี่ยรายด้าน
            </p>

            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center text-small">
                <span className="text-text-secondary">
                  ด้านเนื้อหา (Accuracy)
                </span>
                <span className="font-bold text-text-primary">
                  {satisfactionResult.accuracyAvg.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center text-small">
                <span className="text-text-secondary">
                  ด้านการออกแบบ (Design)
                </span>
                <span className="font-bold text-text-primary">
                  {satisfactionResult.designAvg.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center text-small">
                <span className="text-text-secondary">
                  ด้านการใช้งาน (Usability)
                </span>
                <span className="font-bold text-text-primary">
                  {satisfactionResult.usabilityAvg.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center text-small">
                <span className="text-text-secondary">
                  ด้านประโยชน์ (Usefulness)
                </span>
                <span className="font-bold text-text-primary">
                  {satisfactionResult.usefulnessAvg.toFixed(2)}
                </span>
              </div>
            </div>

            {satisfactionResult.suggestion && (
              <div className="mt-6">
                <p className="text-small font-semibold text-text-primary mb-2">
                  ข้อเสนอแนะ
                </p>
                <p className="text-small text-text-secondary bg-muted p-3 rounded-md italic">
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
