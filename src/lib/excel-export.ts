import * as XLSX from "xlsx";
import { formatDateTimeThai, formatDateThai } from "@/lib/utils";
import { ASSESSMENT_TYPE_LABELS, ASSESSMENT_CATEGORY_LABELS } from "@/lib/constants";
import type { ExportDataResponse } from "@/lib/api";

// Mapping dictionary for clean Thai labels
const GENDER_LABELS: Record<string, string> = {
  male: "ชาย",
  female: "หญิง",
  other: "อื่น ๆ",
};

const EDUCATION_LABELS: Record<string, string> = {
  below_bachelor: "ต่ำกว่าปริญญาตรี",
  bachelor: "ปริญญาตรี",
  master: "ปริญญาโท",
  doctorate: "ปริญญาเอก",
};

const MARITAL_LABELS: Record<string, string> = {
  single: "โสด",
  married: "สมรส",
  divorced: "หย่าร้าง",
  widowed: "หม้าย",
};

const WORKLOAD_LABELS: Record<string, string> = {
  light: "งานเบา",
  medium: "งานปานกลาง",
  heavy: "งานหนัก",
};

const WBGT_TYPE_LABELS: Record<string, string> = {
  in: "ในร่ม",
  out: "กลางแจ้ง",
};

// Health risk question short titles for each category
const LIGHT_QUESTION_COLUMNS = [
  "ข้อ 1 (ปวดตา/กระบอกตา)",
  "ข้อ 2 (ตาแห้ง/ไม่สบายตา)",
  "ข้อ 3 (ระคายเคือง/แสบตา)",
  "ข้อ 4 (ตาพร่ามัว)",
  "ข้อ 5 (น้ำตาไหลบ่อย)",
  "ข้อ 6 (ไวต่อแสง)",
  "ข้อ 7 (แสบตาจากแสงแดด/แสงจ้า)",
  "ข้อ 8 (สายตาเปลี่ยนแปลง)",
  "ข้อ 9 (หนังตากระตุก)",
  "ข้อ 10 (ปวดศีรษะเพ่งสายตา)",
];

const NOISE_QUESTION_COLUMNS = [
  "ข้อ 1 (ปวด/ไม่สบายหู)",
  "ข้อ 2 (ปวดศีรษะจากเสียง)",
  "ข้อ 3 (เวียนศีรษะ/มึนงง)",
  "ข้อ 4 (หูอื้อ)",
  "ข้อ 5 (ได้ยินลดลงชั่วคราว)",
  "ข้อ 6 (เหนื่อยล้า/อ่อนเพลีย)",
  "ข้อ 7 (เครียด/ไม่สบายใจ)",
  "ข้อ 8 (หงุดหงิด/รำคาญ)",
  "ข้อ 9 (สมาธิลดลง)",
  "ข้อ 10 (สื่อสารลำบาก)",
];

const HEAT_QUESTION_COLUMNS = [
  "ข้อ 1 (ร่างกายร้อนผิดปกติ)",
  "ข้อ 2 (อ่อนเพลีย/เวียนศีรษะ)",
  "ข้อ 3 (เบื่ออาหาร/คลื่นไส้)",
  "ข้อ 4 (วิตกกังวล/สับสน)",
  "ข้อ 5 (ปวดศีรษะ/หน้ามืด)",
  "ข้อ 6 (เหงื่อออกมาก/คล้ายเป็นลม)",
  "ข้อ 7 (ตะคริว)",
  "ข้อ 8 (หัวใจเต้นเร็ว/ตัวสั่น)",
  "ข้อ 9 (เครียด/หงุดหงิด)",
  "ข้อ 10 (วิงเวียน/มึนงง)",
];

function getOverallLevelLabel(level?: string | null, isHealthRisk = false): string {
  if (level === "pass") return isHealthRisk ? "ความเสี่ยงต่ำ (ผ่าน)" : "ผ่านเกณฑ์ (Pass)";
  if (level === "medium") return isHealthRisk ? "ความเสี่ยงปานกลาง" : "เสี่ยงปานกลาง (Medium)";
  if (level === "high_risk") return isHealthRisk ? "ความเสี่ยงสูง" : "เสี่ยงสูง (High Risk)";
  return "-";
}

/**
 * Generate and download a comprehensive Multi-Sheet Excel Workbook categorized by Assessment Category
 */
export function generateMultiSheetExcel(data: ExportDataResponse, filename?: string) {
  const {
    submissions = [],
    envPointsMap = {},
    hrAnswersMap = {},
    satAnswersMap = {},
  } = data;

  const wb = XLSX.utils.book_new();

  // ----------------------------------------------------
  // Sheet 1: ภาพรวมทั้งหมด (Master Overview)
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

    const level = getOverallLevelLabel(sub.overall_level, sub.assessment_type === "health_risk");
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
    { wch: 22 },
    { wch: 16 },
    { wch: 24 },
    { wch: 26 },
    { wch: 26 },
    { wch: 12 },
    { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, wsOverview, "ภาพรวมทั้งหมด");

  // ----------------------------------------------------
  // Environment Submissions & Categorized Sheets
  // ----------------------------------------------------
  const envSubmissions = submissions.filter((s) => s.assessment_type === "environment");

  // 2.1 สิ่งแวดล้อม - แสงสว่าง (Light)
  const envLightSubs = envSubmissions.filter((s) => s.assessment_category === "light");
  if (envLightSubs.length > 0) {
    const lightHeaders = [
      "ลำดับ",
      "รหัสการประเมิน",
      "วันที่ตรวจวัด",
      "ผู้ตรวจวัด",
      "ตำแหน่งผู้ตรวจ",
      "สถานที่ตรวจวัด",
      "อุปกรณ์ที่ใช้",
      "จุดตรวจที่",
      "รายละเอียดจุดตรวจวัด",
      "ค่าความสว่างที่วัดได้ (Lux)",
      "เกณฑ์มาตรฐาน (Lux)",
      "ผลการประเมินจุดนี้",
      "หมายเหตุ",
    ];

    const lightRows: any[] = [];
    let rowIdx = 1;
    for (const sub of envLightSubs) {
      const points = envPointsMap[sub.id] || [];
      const dateStr = formatDateThai(sub.inspection_date || sub.completed_at || sub.created_at);

      if (points.length === 0) {
        lightRows.push([
          rowIdx++,
          sub.submission_code,
          dateStr,
          sub.inspector_name || "-",
          sub.inspector_position || "-",
          sub.inspection_location || "-",
          sub.equipment || "-",
          "-",
          "-",
          "-",
          "-",
          "-",
          "-",
        ]);
      } else {
        for (const pt of points) {
          const passLabel = pt.is_pass === 1 ? "ผ่านเกณฑ์" : "ไม่ผ่านเกณฑ์";
          lightRows.push([
            rowIdx++,
            sub.submission_code,
            dateStr,
            sub.inspector_name || "-",
            sub.inspector_position || "-",
            sub.inspection_location || "-",
            sub.equipment || "-",
            pt.point_no,
            pt.location_desc || "-",
            pt.measure_value !== null && pt.measure_value !== undefined ? pt.measure_value : "-",
            pt.standard_display || (pt.standard_value ? String(pt.standard_value) : "-"),
            passLabel,
            pt.remark || "-",
          ]);
        }
      }
    }

    const wsLight = XLSX.utils.aoa_to_sheet([lightHeaders, ...lightRows]);
    wsLight["!cols"] = [
      { wch: 8 },
      { wch: 22 },
      { wch: 18 },
      { wch: 22 },
      { wch: 18 },
      { wch: 24 },
      { wch: 20 },
      { wch: 10 },
      { wch: 26 },
      { wch: 24 },
      { wch: 18 },
      { wch: 18 },
      { wch: 22 },
    ];
    XLSX.utils.book_append_sheet(wb, wsLight, "สิ่งแวดล้อม-แสงสว่าง");
  }

  // 2.2 สิ่งแวดล้อม - เสียง (Noise)
  const envNoiseSubs = envSubmissions.filter((s) => s.assessment_category === "noise");
  if (envNoiseSubs.length > 0) {
    const noiseHeaders = [
      "ลำดับ",
      "รหัสการประเมิน",
      "วันที่ตรวจวัด",
      "ผู้ตรวจวัด",
      "ตำแหน่งผู้ตรวจ",
      "สถานที่ตรวจวัด",
      "อุปกรณ์ที่ใช้",
      "จุดตรวจที่",
      "รายละเอียดจุดตรวจวัด",
      "เวลาเริ่มต้น",
      "เวลาสิ้นสุด",
      "รวมเวลา",
      "ระดับเสียงเฉลี่ย (dBA)",
      "ระดับเสียงต่ำสุด (Min dBA)",
      "ระดับเสียงสูงสุด (Max dBA)",
      "เกณฑ์มาตรฐาน (dBA)",
      "ผลการประเมินจุดนี้",
      "หมายเหตุ",
    ];

    const noiseRows: any[] = [];
    let rowIdx = 1;
    for (const sub of envNoiseSubs) {
      const points = envPointsMap[sub.id] || [];
      const dateStr = formatDateThai(sub.inspection_date || sub.completed_at || sub.created_at);

      if (points.length === 0) {
        noiseRows.push([
          rowIdx++,
          sub.submission_code,
          dateStr,
          sub.inspector_name || "-",
          sub.inspector_position || "-",
          sub.inspection_location || "-",
          sub.equipment || "-",
          "-",
          "-",
          "-",
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
          const passLabel = pt.is_pass === 1 ? "ผ่านเกณฑ์" : "ไม่ผ่านเกณฑ์";
          noiseRows.push([
            rowIdx++,
            sub.submission_code,
            dateStr,
            sub.inspector_name || "-",
            sub.inspector_position || "-",
            sub.inspection_location || "-",
            sub.equipment || "-",
            pt.point_no,
            pt.location_desc || "-",
            pt.start_time || "-",
            pt.end_time || "-",
            pt.total_time || "-",
            pt.measure_value !== null && pt.measure_value !== undefined ? pt.measure_value : "-",
            pt.min_value !== null && pt.min_value !== undefined ? pt.min_value : "-",
            pt.max_value !== null && pt.max_value !== undefined ? pt.max_value : "-",
            pt.standard_display || (pt.standard_value ? String(pt.standard_value) : "-"),
            passLabel,
            pt.remark || "-",
          ]);
        }
      }
    }

    const wsNoise = XLSX.utils.aoa_to_sheet([noiseHeaders, ...noiseRows]);
    wsNoise["!cols"] = [
      { wch: 8 },
      { wch: 22 },
      { wch: 18 },
      { wch: 22 },
      { wch: 18 },
      { wch: 24 },
      { wch: 20 },
      { wch: 10 },
      { wch: 26 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 22 },
      { wch: 22 },
      { wch: 22 },
      { wch: 18 },
      { wch: 18 },
      { wch: 22 },
    ];
    XLSX.utils.book_append_sheet(wb, wsNoise, "สิ่งแวดล้อม-เสียง");
  }

  // 2.3 สิ่งแวดล้อม - ความร้อน (Heat)
  const envHeatSubs = envSubmissions.filter((s) => s.assessment_category === "heat");
  if (envHeatSubs.length > 0) {
    const heatHeaders = [
      "ลำดับ",
      "รหัสการประเมิน",
      "วันที่ตรวจวัด",
      "ผู้ตรวจวัด",
      "ตำแหน่งผู้ตรวจ",
      "สถานที่ตรวจวัด",
      "อุปกรณ์ที่ใช้",
      "จุดตรวจที่",
      "รายละเอียดจุดตรวจวัด",
      "ภาระงาน",
      "สภาพแวดล้อม",
      "อุณหภูมิกระเปาะแห้ง DB (°C)",
      "อุณหภูมิกระเปาะเปียก WB (°C)",
      "อุณหภูมิลูกกลม Globe (°C)",
      "ค่าคำนวณ WBGT (°C)",
      "เกณฑ์มาตรฐาน WBGT (°C)",
      "ผลการประเมินจุดนี้",
      "หมายเหตุ",
    ];

    const heatRows: any[] = [];
    let rowIdx = 1;
    for (const sub of envHeatSubs) {
      const points = envPointsMap[sub.id] || [];
      const dateStr = formatDateThai(sub.inspection_date || sub.completed_at || sub.created_at);

      if (points.length === 0) {
        heatRows.push([
          rowIdx++,
          sub.submission_code,
          dateStr,
          sub.inspector_name || "-",
          sub.inspector_position || "-",
          sub.inspection_location || "-",
          sub.equipment || "-",
          "-",
          "-",
          "-",
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
          const passLabel = pt.is_pass === 1 ? "ผ่านเกณฑ์" : "ไม่ผ่านเกณฑ์";
          const workloadLabel = WORKLOAD_LABELS[pt.workload] || pt.workload || "-";
          const wbgtTypeLabel = WBGT_TYPE_LABELS[pt.wbgt_type] || pt.wbgt_type || "-";

          heatRows.push([
            rowIdx++,
            sub.submission_code,
            dateStr,
            sub.inspector_name || "-",
            sub.inspector_position || "-",
            sub.inspection_location || "-",
            sub.equipment || "-",
            pt.point_no,
            pt.location_desc || "-",
            workloadLabel,
            wbgtTypeLabel,
            pt.temp_db !== null && pt.temp_db !== undefined ? pt.temp_db : "-",
            pt.temp_wb !== null && pt.temp_wb !== undefined ? pt.temp_wb : "-",
            pt.temp_gt !== null && pt.temp_gt !== undefined ? pt.temp_gt : "-",
            pt.temp_wbgt !== null && pt.temp_wbgt !== undefined ? pt.temp_wbgt : "-",
            pt.standard_display || (pt.standard_value ? String(pt.standard_value) : "-"),
            passLabel,
            pt.remark || "-",
          ]);
        }
      }
    }

    const wsHeat = XLSX.utils.aoa_to_sheet([heatHeaders, ...heatRows]);
    wsHeat["!cols"] = [
      { wch: 8 },
      { wch: 22 },
      { wch: 18 },
      { wch: 22 },
      { wch: 18 },
      { wch: 24 },
      { wch: 20 },
      { wch: 10 },
      { wch: 26 },
      { wch: 14 },
      { wch: 14 },
      { wch: 24 },
      { wch: 24 },
      { wch: 24 },
      { wch: 20 },
      { wch: 22 },
      { wch: 18 },
      { wch: 22 },
    ];
    XLSX.utils.book_append_sheet(wb, wsHeat, "สิ่งแวดล้อม-ความร้อน");
  }

  // ----------------------------------------------------
  // Health Risk Submissions & Categorized Sheets
  // ----------------------------------------------------
  const hrSubmissions = submissions.filter((s) => s.assessment_type === "health_risk");

  // Helper to build rows for a Health Risk Category sheet
  const buildHealthRiskSheetData = (subs: any[], questionHeaders: string[]) => {
    const baseHeaders = [
      "ลำดับ",
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
      "พื้นที่ปฏิบัติงาน",
      "คะแนนความเสี่ยงรวม (เต็ม 20)",
      "ระดับความเสี่ยง",
      ...questionHeaders,
    ];

    const rows = subs.map((sub, idx) => {
      const gender = GENDER_LABELS[sub.profile_gender] || sub.profile_gender || "-";
      const education = EDUCATION_LABELS[sub.profile_education] || sub.profile_education || "-";
      const marital = MARITAL_LABELS[sub.profile_marital] || sub.profile_marital || "-";

      let bmi = "-";
      if (sub.profile_weight && sub.profile_height) {
        const hM = sub.profile_height / 100;
        bmi = (sub.profile_weight / (hM * hM)).toFixed(2);
      }

      const disease = sub.has_underlying_disease
        ? sub.profile_disease || "มีโรคประจำตัว"
        : "ไม่มี";

      const level = getOverallLevelLabel(sub.overall_level, true);

      // Question scores Q1 - Q10
      const answers = hrAnswersMap[sub.id] || [];
      const ansMap = new Map<string, number>();
      for (const ans of answers) {
        const key = ans.question_id || (ans.question_no ? `q${ans.question_no}` : "");
        if (key) {
          ansMap.set(key, ans.score);
        }
      }

      const questionScores = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((qNum) => {
        const sc = ansMap.get(`q${qNum}`);
        return sc !== undefined && sc !== null ? sc : "-";
      });

      return [
        idx + 1,
        sub.submission_code,
        formatDateThai(sub.completed_at || sub.created_at),
        sub.profile_name || "-",
        gender,
        sub.profile_age || "-",
        sub.profile_weight || "-",
        sub.profile_height || "-",
        bmi,
        marital,
        education,
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
        sub.profile_work_area || "-",
        sub.overall_score !== null && sub.overall_score !== undefined ? sub.overall_score : "-",
        level,
        ...questionScores,
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([baseHeaders, ...rows]);
    ws["!cols"] = [
      { wch: 8 },
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
      { wch: 20 },
      { wch: 26 },
      { wch: 22 },
      // 10 questions columns
      ...questionHeaders.map(() => ({ wch: 24 })),
    ];
    return ws;
  };

  // 3.1 สุขภาพ - แสงสว่าง
  const hrLightSubs = hrSubmissions.filter((s) => s.assessment_category === "light");
  if (hrLightSubs.length > 0) {
    const ws = buildHealthRiskSheetData(hrLightSubs, LIGHT_QUESTION_COLUMNS);
    XLSX.utils.book_append_sheet(wb, ws, "สุขภาพ-แสงสว่าง");
  }

  // 3.2 สุขภาพ - เสียง
  const hrNoiseSubs = hrSubmissions.filter((s) => s.assessment_category === "noise");
  if (hrNoiseSubs.length > 0) {
    const ws = buildHealthRiskSheetData(hrNoiseSubs, NOISE_QUESTION_COLUMNS);
    XLSX.utils.book_append_sheet(wb, ws, "สุขภาพ-เสียง");
  }

  // 3.3 สุขภาพ - ความร้อน
  const hrHeatSubs = hrSubmissions.filter((s) => s.assessment_category === "heat");
  if (hrHeatSubs.length > 0) {
    const ws = buildHealthRiskSheetData(hrHeatSubs, HEAT_QUESTION_COLUMNS);
    XLSX.utils.book_append_sheet(wb, ws, "สุขภาพ-ความร้อน");
  }

  // ----------------------------------------------------
  // Sheet 4: ความพึงพอใจ (Satisfaction)
  // ----------------------------------------------------
  const satSubmissions = submissions.filter((s) => s.assessment_type === "satisfaction");
  if (satSubmissions.length > 0) {
    const satHeaders = [
      "ลำดับ",
      "รหัสการประเมิน",
      "วันที่ประเมิน",
      "ผู้ประเมิน",
      "แผนก",
      "คะแนนเฉลี่ยรวม (เต็ม 5)",
      "ข้อเสนอแนะเพิ่มเติม",
    ];

    const satRows = satSubmissions.map((sub, idx) => {
      const answers = satAnswersMap[sub.id] || [];
      let suggestion = "-";
      for (const ans of answers) {
        if (ans.suggestion) {
          suggestion = ans.suggestion;
          break;
        }
      }

      return [
        idx + 1,
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
      { wch: 8 },
      { wch: 22 },
      { wch: 18 },
      { wch: 22 },
      { wch: 20 },
      { wch: 24 },
      { wch: 40 },
    ];
    XLSX.utils.book_append_sheet(wb, wsSat, "ความพึงพอใจ");
  }

  // Fallback: If no sheets were appended for some reason, ensure at least Overview exists
  if (wb.SheetNames.length === 0) {
    XLSX.utils.book_append_sheet(wb, wsOverview, "ภาพรวมทั้งหมด");
  }

  // Write and download file
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const exportFileName = filename || `save-check-report-${dateStr}.xlsx`;
  XLSX.writeFile(wb, exportFileName);
}
