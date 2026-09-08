import * as XLSX from "xlsx";
import { formatDateTimeThai, formatDateThai } from "@/lib/utils";
import { ASSESSMENT_TYPE_LABELS, ASSESSMENT_CATEGORY_LABELS } from "@/lib/constants";
import type { ExportDataResponse } from "@/lib/api";

/**
 * Generate and download a comprehensive Multi-Sheet Excel Workbook
 */
export function generateMultiSheetExcel(data: ExportDataResponse, filename?: string) {
  const { submissions = [], envPointsMap = {}, satAnswersMap = {} } = data;

  const wb = XLSX.utils.book_new();

  // ----------------------------------------------------
  // Sheet 1: ภาพรวมทั้งหมด (Overview)
  // ----------------------------------------------------
  const overviewHeaders = [
    "ลำดับ",
    "วันที่-เวลา",
    "รหัสการประเมิน",
    "ประเภทการประเมิน",
    "หมวดหมู่",
    "ผู้ตรวจ / ผู้ประเมิน",
    "สถานที่ / แผนก",
    "ผลการประเมิน / ระดับความเสี่ยง",
    "คะแนนรวม",
    "สถานะผังห้อง",
  ];

  const overviewRows = submissions.map((sub, idx) => {
    const typeLabel =
      ASSESSMENT_TYPE_LABELS[sub.assessment_type as keyof typeof ASSESSMENT_TYPE_LABELS] ||
      sub.assessment_type;
    const catLabel =
      ASSESSMENT_CATEGORY_LABELS[sub.assessment_category as keyof typeof ASSESSMENT_CATEGORY_LABELS] ||
      sub.assessment_category;
    const person =
      sub.assessment_type === "environment"
        ? sub.inspector_name || "-"
        : sub.profile_name || "-";
    const loc =
      sub.assessment_type === "environment"
        ? sub.inspection_location || "-"
        : sub.profile_department || "-";

    let level = "-";
    if (sub.overall_level === "pass") level = "ผ่านเกณฑ์ (Pass)";
    else if (sub.overall_level === "medium") level = "เสี่ยงปานกลาง (Medium)";
    else if (sub.overall_level === "high_risk") level = "เสี่ยงสูง (High Risk)";

    const layout =
      sub.assessment_type === "environment" ? (sub.has_layout ? "มีผังห้อง" : "ไม่มี") : "-";

    return [
      idx + 1,
      formatDateTimeThai(sub.completed_at || sub.created_at),
      sub.submission_code,
      typeLabel,
      catLabel,
      person,
      loc,
      level,
      sub.overall_score !== null && sub.overall_score !== undefined ? sub.overall_score : "-",
      layout,
    ];
  });

  const wsOverview = XLSX.utils.aoa_to_sheet([overviewHeaders, ...overviewRows]);
  wsOverview["!cols"] = [
    { wch: 8 },
    { wch: 22 },
    { wch: 22 },
    { wch: 20 },
    { wch: 18 },
    { wch: 22 },
    { wch: 24 },
    { wch: 26 },
    { wch: 12 },
    { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, wsOverview, "ภาพรวมทั้งหมด");

  // ----------------------------------------------------
  // Sheet 2: ตรวจวัดสภาพแวดล้อม (Environment)
  // ----------------------------------------------------
  const envSubmissions = submissions.filter((s) => s.assessment_type === "environment");
  const envHeaders = [
    "รหัสการประเมิน",
    "วันที่ตรวจวัด",
    "ผู้ตรวจวัด",
    "ตำแหน่งผู้ตรวจ",
    "สถานที่ตรวจวัด",
    "อุปกรณ์ที่ใช้",
    "หมวดหมู่",
    "จุดตรวจที่",
    "รายละเอียดจุดตรวจวัด",
    "ค่าที่วัดได้",
    "ค่าต่ำสุด (Min)",
    "ค่าสูงสุด (Max)",
    "ค่ามาตรฐาน",
    "ผลการประเมินจุดนี้",
    "หมายเหตุ",
  ];

  const envRows: any[] = [];
  for (const sub of envSubmissions) {
    const points = envPointsMap[sub.id] || [];
    const catLabel =
      ASSESSMENT_CATEGORY_LABELS[sub.assessment_category as keyof typeof ASSESSMENT_CATEGORY_LABELS] ||
      sub.assessment_category;

    if (points.length === 0) {
      envRows.push([
        sub.submission_code,
        formatDateThai(sub.inspection_date || sub.completed_at || sub.created_at),
        sub.inspector_name || "-",
        sub.inspector_position || "-",
        sub.inspection_location || "-",
        sub.equipment || "-",
        catLabel,
        "-",
        "-",
        "-",
        "-",
        "-",
        "-",
        "-",
        "-",
      ]);
    } else {
      for (const pt of points) {
        let measuredDisplay = pt.measure_value !== null && pt.measure_value !== undefined ? String(pt.measure_value) : "-";
        if (sub.assessment_category === "heat" && pt.temp_wbgt !== null && pt.temp_wbgt !== undefined) {
          measuredDisplay = `WBGT: ${pt.temp_wbgt}°C (Dry: ${pt.temp_db || "-"}°C, Wet: ${pt.temp_wb || "-"}°C, Globe: ${pt.temp_gt || "-"}°C)`;
        }

        const passLabel = pt.is_pass === 1 ? "ผ่านเกณฑ์" : "ไม่ผ่านเกณฑ์";

        envRows.push([
          sub.submission_code,
          formatDateThai(sub.inspection_date || sub.completed_at || sub.created_at),
          sub.inspector_name || "-",
          sub.inspector_position || "-",
          sub.inspection_location || "-",
          sub.equipment || "-",
          catLabel,
          pt.point_no,
          pt.location_desc || "-",
          measuredDisplay,
          pt.min_value !== null && pt.min_value !== undefined ? pt.min_value : "-",
          pt.max_value !== null && pt.max_value !== undefined ? pt.max_value : "-",
          pt.standard_display || (pt.standard_value ? String(pt.standard_value) : "-"),
          passLabel,
          pt.remark || "-",
        ]);
      }
    }
  }

  const wsEnv = XLSX.utils.aoa_to_sheet([envHeaders, ...envRows]);
  wsEnv["!cols"] = [
    { wch: 22 },
    { wch: 18 },
    { wch: 20 },
    { wch: 18 },
    { wch: 22 },
    { wch: 20 },
    { wch: 16 },
    { wch: 10 },
    { wch: 26 },
    { wch: 24 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 18 },
    { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, wsEnv, "ตรวจวัดสภาพแวดล้อม");

  // ----------------------------------------------------
  // Sheet 3: ความเสี่ยงสุขภาพ (Health Risk)
  // ----------------------------------------------------
  const hrSubmissions = submissions.filter((s) => s.assessment_type === "health_risk");
  const hrHeaders = [
    "รหัสการประเมิน",
    "วันที่ประเมิน",
    "ชื่อ-นามสกุล",
    "เพศ",
    "อายุ (ปี)",
    "น้ำหนัก (กก.)",
    "ส่วนสูง (ซม.)",
    "BMI",
    "สถานภาพ",
    "การศึกษาสูงสุด",
    "โรคประจำตัว",
    "แผนก",
    "ตำแหน่งงาน",
    "อายุงาน (ปี)",
    "ชม.ทำงาน/วัน",
    "วันทำงาน/สัปดาห์",
    "คะแนนความเสี่ยงรวม",
    "ระดับความเสี่ยงรวม",
  ];

  const hrRows = hrSubmissions.map((sub) => {
    const gender =
      sub.profile_gender === "male"
        ? "ชาย"
        : sub.profile_gender === "female"
        ? "หญิง"
        : sub.profile_gender || "-";

    let bmi = "-";
    if (sub.profile_weight && sub.profile_height) {
      const hM = sub.profile_height / 100;
      bmi = (sub.profile_weight / (hM * hM)).toFixed(2);
    }

    const disease = sub.has_underlying_disease
      ? sub.profile_disease || "มีโรคประจำตัว"
      : "ไม่มี";

    let level = "-";
    if (sub.overall_level === "pass") level = "ความเสี่ยงต่ำ (ผ่าน)";
    else if (sub.overall_level === "medium") level = "ความเสี่ยงปานกลาง";
    else if (sub.overall_level === "high_risk") level = "ความเสี่ยงสูง";

    return [
      sub.submission_code,
      formatDateThai(sub.completed_at || sub.created_at),
      sub.profile_name || "-",
      gender,
      sub.profile_age || "-",
      sub.profile_weight || "-",
      sub.profile_height || "-",
      bmi,
      sub.profile_marital || "-",
      sub.profile_education || "-",
      disease,
      sub.profile_department || "-",
      sub.profile_work_position || "-",
      sub.profile_work_years !== null && sub.profile_work_years !== undefined
        ? sub.profile_work_years
        : "-",
      sub.profile_work_hours !== null && sub.profile_work_hours !== undefined
        ? sub.profile_work_hours
        : "-",
      sub.profile_work_days !== null && sub.profile_work_days !== undefined
        ? sub.profile_work_days
        : "-",
      sub.overall_score !== null && sub.overall_score !== undefined ? sub.overall_score : "-",
      level,
    ];
  });

  const wsHr = XLSX.utils.aoa_to_sheet([hrHeaders, ...hrRows]);
  wsHr["!cols"] = [
    { wch: 22 },
    { wch: 18 },
    { wch: 22 },
    { wch: 10 },
    { wch: 10 },
    { wch: 12 },
    { wch: 12 },
    { wch: 10 },
    { wch: 14 },
    { wch: 18 },
    { wch: 22 },
    { wch: 20 },
    { wch: 18 },
    { wch: 12 },
    { wch: 14 },
    { wch: 16 },
    { wch: 18 },
    { wch: 22 },
  ];
  XLSX.utils.book_append_sheet(wb, wsHr, "ความเสี่ยงสุขภาพ");

  // ----------------------------------------------------
  // Sheet 4: ความพึงพอใจ (Satisfaction)
  // ----------------------------------------------------
  const satSubmissions = submissions.filter((s) => s.assessment_type === "satisfaction");
  const satHeaders = [
    "รหัสการประเมิน",
    "วันที่ประเมิน",
    "ผู้ประเมิน",
    "แผนก",
    "คะแนนเฉลี่ยรวม (เต็ม 5)",
    "ข้อเสนอแนะเพิ่มเติม",
  ];

  const satRows = satSubmissions.map((sub) => {
    const answers = satAnswersMap[sub.id] || [];
    let suggestion = "-";
    for (const ans of answers) {
      if (ans.suggestion) {
        suggestion = ans.suggestion;
        break;
      }
    }

    return [
      sub.submission_code,
      formatDateThai(sub.completed_at || sub.created_at),
      sub.profile_name || "ผู้ตอบแบบสอบถาม",
      sub.profile_department || "-",
      sub.overall_score !== null && sub.overall_score !== undefined
        ? Number(sub.overall_score).toFixed(2)
        : "-",
      suggestion,
    ];
  });

  const wsSat = XLSX.utils.aoa_to_sheet([satHeaders, ...satRows]);
  wsSat["!cols"] = [
    { wch: 22 },
    { wch: 18 },
    { wch: 22 },
    { wch: 20 },
    { wch: 24 },
    { wch: 40 },
  ];
  XLSX.utils.book_append_sheet(wb, wsSat, "ความพึงพอใจ");

  // Write and download file
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const exportFileName = filename || `save-check-report-${dateStr}.xlsx`;
  XLSX.writeFile(wb, exportFileName);
}
