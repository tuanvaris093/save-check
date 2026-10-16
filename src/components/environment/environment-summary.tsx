"use client";
import {
  SummaryField,
  SummaryHeading,
} from "@/components/reports/summary-details";
import type { EnvironmentRevisionV3 } from "../../../shared/v3";
import { ReportTable } from "@/components/reports/report-table";
import type { ReactNode } from "react";
import { LayoutAttachmentCard } from "@/components/forms/layout-attachment-card";
import { storedLayoutFile } from "@/lib/v3/layout-file";
import type { LayoutFileInfo } from "@/types";
import {
  CheckCircle2,
  XCircle,
  Shield,
  FileText,
  User,
  Briefcase,
  MapPin,
  Calendar,
  Clock,
  Wrench,
} from "lucide-react";
const labels: Record<string, string> = {
  inspector_name: "ชื่อ-นามสกุลผู้ตรวจ",
  position: "ตำแหน่ง",
  inspection_location: "สถานที่ตรวจ",
  inspection_date: "วันที่ทำการตรวจวัด",
  equipment: "เครื่องมือที่ใช้",
  serial_number: "Serial Number",
  calibration_date: "วันที่ปรับเทียบ",
  responsible_department: "แผนกที่รับผิดชอบ",
  location_responsible_name: "ชื่อผู้รับผิดชอบอาคาร/สถานที่",
  measurement_technique: "เทคนิคตรวจแสง",
  start_at: "เวลาเริ่ม",
  end_at: "เวลาสิ้นสุด",
};
function displayTime(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value))
    return new Date(`${value}T00:00:00+07:00`).toLocaleDateString("th-TH", {
      timeZone: "Asia/Bangkok",
      dateStyle: "medium",
    });
  if (!/T/.test(value)) return value;
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleString("th-TH", {
        timeZone: "Asia/Bangkok",
        dateStyle: "medium",
        timeStyle: "short",
      })
    : value;
}
const thresholdLabels: Record<string, string> = {
  target: "≥",
  near: "ใกล้ ≥",
  outer: "ถัดออกไป ≥",
  average_min: "เฉลี่ย ≥",
  point_min: "ต่ำสุด ≥",
  duration_minutes: "ระยะเวลาสัมผัส (นาที)",
  limit: "ค่าไม่เกิน",
};
export function EnvironmentSummary({
  revision,
  layoutEditor,
  layoutFile,
}: {
  revision: EnvironmentRevisionV3;
  layoutEditor?: ReactNode;
  layoutFile?: LayoutFileInfo | null;
}) {
  const observations = revision.observations;
  const kind = observations[0]?.unit.kind;
  const format = (n: number | undefined) =>
    n == null ? "—" : Number(n.toFixed(3));
  const status = (pass: boolean) => (
    <span className={`classic-result-badge ${pass ? "is-pass" : "is-fail"}`}>
      {pass ? (
        <CheckCircle2 aria-hidden="true" />
      ) : (
        <XCircle aria-hidden="true" />
      )}
      {pass ? "ผ่าน" : "ไม่ผ่าน"}
    </span>
  );
  const time = (o: (typeof observations)[number]) => (
    <>
      {displayTime(o.measured_at)}
      {o.observation_kind === "carried" && (
        <p className="text-caption">คงผลจากการตรวจครั้งก่อน</p>
      )}
    </>
  );
  let headers: string[], rows: ReactNode[][];
  if (kind?.startsWith("light")) {
    const area = kind === "light_area";
    const surrounding =
      !area &&
      observations.some(
        (o) => o.result.values.surrounding_near_lux !== undefined,
      );
    headers = [
      "จุดที่",
      "สถานที่ / ลักษณะงาน",
      ...(area ? ["ค่าเฉลี่ย (Lux)", "ค่าต่ำสุด (Lux)"] : ["ผลตรวจวัด (Lux)"]),
      ...(surrounding ? ["บริเวณใกล้ (Lux)", "ถัดออกไป (Lux)"] : []),
      "มาตรฐาน (Lux)",
      "สรุปผล",
      "วันเวลาวัดจริง",
      "หมายเหตุ",
    ];
    rows = observations.map((o, i) => [
      i + 1,
      o.unit.location_desc,
      ...(area
        ? [format(o.result.values.average), format(o.result.values.minimum)]
        : [format(o.result.values.lux)]),
      ...(surrounding
        ? [
            format(o.result.values.surrounding_near_lux),
            format(o.result.values.surrounding_outer_lux),
          ]
        : []),
      Object.entries(o.result.standard.thresholds)
        .filter(([, v]) => v != null)
        .map(([k, v]) => `${thresholdLabels[k] || k} ${v}`)
        .join(" / "),
      status(o.result.is_pass),
      time(o),
      o.unit.remark || "—",
    ]);
  } else if (kind === "noise") {
    headers = [
      "จุดที่",
      "สถานที่ / แผนก",
      "ต่ำสุด (dBA)",
      "สูงสุด (dBA)",
      "ค่าประเมิน (dBA)",
      "วิธี / ระยะเวลา",
      "มาตรฐาน (dBA)",
      "ผล",
      "วันเวลาวัดจริง",
      "หมายเหตุ",
    ];
    rows = observations.map((o, i) => [
      i + 1,
      o.unit.location_desc,
      format(o.result.values.min),
      format(o.result.values.max),
      format(o.result.values.level),
      o.unit.kind === "noise"
        ? o.unit.evaluation_basis === "twa8"
          ? "TWA 8 ชั่วโมง"
          : `${o.unit.exposure_duration_minutes} นาที`
        : "—",
      format(o.result.standard.thresholds.limit ?? undefined),
      status(o.result.is_pass),
      time(o),
      o.unit.remark || "—",
    ]);
  } else {
    headers = [
      "จุดที่",
      "สถานที่ / แผนก",
      "ประเภทพื้นที่",
      "DB (°C)",
      "WB (°C)",
      "GT (°C)",
      "WBGT จากเครื่อง (°C)",
      "ภาระงาน",
      "WBGT เฉลี่ย (°C)",
      "มาตรฐาน (°C)",
      "ผล",
      "ช่วงตรวจ",
      "หมายเหตุ",
    ];
    rows = observations.map((o, i) => {
      const u = o.unit;
      return u.kind === "heat"
        ? [
            i + 1,
            u.location_desc,
            u.wbgt_type === "in" ? "ในอาคาร (WBGT in)" : "นอกอาคาร (WBGT out)",
            format(u.db_temp),
            format(u.wb_temp),
            format(u.gt_temp),
            format(u.wbgt_in),
            { light: "เบา", moderate: "ปานกลาง", heavy: "หนัก" }[u.workload],
            format(o.result.values.wbgt_average),
            format(o.result.standard.thresholds.limit ?? undefined),
            status(o.result.is_pass),
            <>
              {displayTime(u.start_at)}
              <br />
              ถึง {displayTime(u.end_at)}
              {o.observation_kind === "carried" && (
                <p className="text-caption">คงผลจากการตรวจครั้งก่อน</p>
              )}
            </>,
            u.remark || "—",
          ]
        : [];
    });
  }
  const categoryLabel = kind?.startsWith("light")
    ? "แสงสว่าง"
    : kind === "noise"
      ? "เสียง"
      : "ความร้อน";
  const passed = observations.filter((o) => o.result.is_pass).length;
  const measuredValues = observations
    .map(
      (o) =>
        o.result.values[
          kind === "light_spot"
            ? "lux"
            : kind === "light_area"
              ? "average"
              : kind === "noise"
                ? "level"
                : "wbgt_average"
        ],
    )
    .filter(Number.isFinite);
  const isLight = kind?.startsWith("light");
  const metric = measuredValues.length
    ? measuredValues.reduce((sum, n) => sum + n, 0) / measuredValues.length
    : undefined;
  const metricLabel =
    kind === "light_area"
      ? "ค่าเฉลี่ยของพื้นที่ตรวจวัด"
      : "ค่าตรวจวัดเฉลี่ยรวม";
  const unitLabel = isLight ? "Lux" : kind === "noise" ? "dBA" : "°C";
  const metadataIcons: Record<string, typeof User> = {
    inspector_name: User,
    position: Briefcase,
    inspection_location: MapPin,
    inspection_date: Calendar,
    start_at: Clock,
    end_at: Clock,
    equipment: Wrench,
  };
  return (
    <div
      className="summary-view classic-environment-detail flex min-w-0 flex-col gap-4"
      data-environment-summary
    >
      <section className="form-section-card p-5 sm:p-6">
        <header className="classic-detail-heading">
          <span className="classic-detail-category">
            ประเมินสภาพแวดล้อม · {categoryLabel}
          </span>
          <h2 className="mt-2 font-semibold">
            สรุปผลการประเมิน{categoryLabel}
          </h2>
        </header>
        <section
          className="classic-inspection-info"
          aria-label="ข้อมูลการตรวจวัด"
        >
          <SummaryHeading icon={Shield}>ข้อมูลทั่วไปการตรวจวัด</SummaryHeading>
          <dl className="summary-details">
            {Object.entries(revision.inspectionData)
              .filter(([key]) => labels[key])
              .map(([key, value]) => (
                <SummaryField
                  key={key}
                  icon={metadataIcons[key] || FileText}
                  label={labels[key]}
                >
                  {key === "measurement_technique"
                    ? value === "spot"
                      ? "Spot Measurements"
                      : "Area Measurement"
                    : displayTime(value)}
                </SummaryField>
              ))}
          </dl>
        </section>
        <div
          className={`classic-status-banner ${revision.is_pass ? "is-pass" : "is-fail"}`}
          data-environment-status
          data-pass={revision.is_pass}
        >
          <div className="flex min-w-0 items-start gap-3">
            <span className="classic-status-icon" aria-hidden="true">
              {revision.is_pass ? <CheckCircle2 /> : <XCircle />}
            </span>
            <div>
              <h3 className="font-semibold">
                {revision.is_pass
                  ? "ผ่านเกณฑ์มาตรฐานความปลอดภัย"
                  : "ไม่ผ่านเกณฑ์มาตรฐานความปลอดภัย"}
              </h3>
              <p className="text-text-secondary mt-1 text-sm">
                {revision.is_pass
                  ? "ทุกจุดตรวจวัดผ่านเกณฑ์มาตรฐาน"
                  : `พบ${kind === "light_area" ? "พื้นที่" : "จุดตรวจวัด"}ที่ไม่ผ่านเกณฑ์มาตรฐาน ${observations.length - passed} ${kind === "light_area" ? "พื้นที่" : "จุด"}`}
              </p>
            </div>
          </div>
          <div className="classic-status-value">
            <p className="text-text-secondary text-xs">{metricLabel}</p>
            <strong data-measurement-summary>
              {format(metric)} {unitLabel}
            </strong>
          </div>
        </div>
      </section>
      <section className="form-section-card p-5 sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <SummaryHeading icon={FileText}>
              รายงานผลการตรวจวัด
              {kind?.startsWith("light")
                ? "ระดับแสงสว่าง"
                : kind === "noise"
                  ? "ระดับเสียง"
                  : "ความร้อน"}
            </SummaryHeading>
            <p className="text-text-secondary mt-1 text-xs">
              รายละเอียดจุดตรวจวัด ค่าที่วัดได้ และเกณฑ์มาตรฐานความปลอดภัย
            </p>
          </div>
          <span className="classic-detail-category shrink-0">
            {observations.length}{" "}
            {kind === "light_area" ? "พื้นที่" : "จุดตรวจวัด"}
          </span>
        </div>
        <ReportTable
          label="ค่าตรวจและเกณฑ์มาตรฐาน"
          headers={headers}
          rows={rows}
        />
        <div className="classic-table-total">
          <span>
            {metricLabel}:{" "}
            <strong>
              {format(metric)} {unitLabel}
            </strong>
          </span>
          <span>
            ผ่าน {passed} / {observations.length}{" "}
            {kind === "light_area" ? "พื้นที่" : "จุด"}
          </span>
        </div>
      </section>
      <LayoutAttachmentCard
        value={layoutFile ?? storedLayoutFile(revision.layout_file_id)}
        downloadUrl={
          layoutFile?.fileData ??
          storedLayoutFile(revision.layout_file_id)?.fileData
        }
      >
        {layoutEditor}
      </LayoutAttachmentCard>
      {observations.some((o) => o.unit.kind === "heat" && o.unit.intervals) && (
        <section className="form-section-card p-5">
          <h3 className="mb-3 font-semibold">รายละเอียดช่วงวัดความร้อน</h3>
          <ReportTable
            label="ช่วงวัดความร้อน"
            headers={[
              "สถานที่",
              "ช่วงที่",
              "WB (°C)",
              "GT (°C)",
              "DB (°C)",
              "ระยะเวลา (นาที)",
            ]}
            rows={observations.flatMap((o) =>
              o.unit.kind === "heat"
                ? (o.unit.intervals || []).map((interval, i) => [
                    o.unit.location_desc,
                    i + 1,
                    interval.wb,
                    interval.gt,
                    interval.db ?? "—",
                    interval.minutes,
                  ])
                : [],
            )}
          />
        </section>
      )}
    </div>
  );
}
