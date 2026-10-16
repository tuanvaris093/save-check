import * as XLSX from "xlsx";
import { satisfactionQuestionsForResult } from "../../../shared/v3";
export function buildSatisfactionWorkbook(records: Record<string, unknown>[]) {
  const headers = [
    "รหัสการประเมิน",
    "กลุ่มแบบประเมิน",
    "รุ่นข้อมูล",
    "รุ่นคำถาม",
    "ผู้ประเมิน",
    "ประเภทผู้ตอบ",
    "บริบท",
    "หลักสูตร / แผนก / ฝ่าย",
    "ชั้นปี",
    "คะแนนเฉลี่ยรวม (เต็ม 5)",
    "ด้านเนื้อหา (เฉลี่ย)",
    "ด้านการออกแบบ (เฉลี่ย)",
    "ด้านการใช้งาน (เฉลี่ย)",
    "ด้านประโยชน์ (เฉลี่ย)",
    "เวลาวิธีเดิม (วินาที)",
    "เวลา SafeCheck (วินาที)",
    "ผลต่างเวลา วิธีเดิม−SafeCheck (วินาที)",
    "แหล่งเวลา",
    ...Array.from({ length: 16 }, (_, i) => `ข้อ ${i + 1} (คะแนน)`),
    "ข้อเสนอแนะเพิ่มเติม",
  ];
  const questions: unknown[][] = [
    ["รหัสการประเมิน", "กลุ่ม", "รุ่นคำถาม", "ด้าน", "รหัสข้อ", "คำถาม"],
  ];
  const rows = records
    .filter((r) => r.assessment_type === "satisfaction")
    .map((r) => {
      const v3 = r.schema_version === 3,
        group =
          v3 && ["environment", "health"].includes(String(r.assessment_group))
            ? String(r.assessment_group)
            : "unknown";
      const profile = (r.profile || {}) as Record<string, unknown>,
        work = (r.workInfo || {}) as Record<string, unknown>,
        result = (r.result || {}) as Record<string, unknown>,
        resolved = (r.resolved || {}) as { program?: { label: string | null } };
      const answers = (r.answers || {}) as Record<string, unknown>,
        dimensions = result.dimension_means as number[] | undefined,
        durations =
          group === "environment"
            ? (result.durations as
                | {
                    traditional_seconds: number;
                    safecheck_seconds: number;
                    source: string;
                  }
                | undefined)
            : undefined;
      const version =
        typeof r.questionnaire_version === "string"
          ? r.questionnaire_version
          : "legacy-unverified";
      if (v3)
        for (const category of satisfactionQuestionsForResult(r))
          for (const q of category.questions)
            questions.push([
              r.submission_code,
              group,
              version,
              category.label,
              q.id,
              q.text,
            ]);
      const label =
        work.program_code === "not_applicable"
          ? "ไม่เกี่ยวข้อง"
          : resolved.program?.label || work.program_label || "";
      return [
        r.submission_code,
        group,
        r.data_version ?? "",
        version,
        profile.full_name ?? "",
        work.position_type ?? "",
        work.other_context ?? "",
        label,
        work.study_year ?? "",
        result.overall_mean ?? r.overall_score ?? "",
        ...(dimensions || ["", "", "", ""]),
        durations?.traditional_seconds ?? "",
        durations?.safecheck_seconds ?? "",
        durations
          ? durations.traditional_seconds - durations.safecheck_seconds
          : "",
        durations?.source ?? "",
        ...Array.from({ length: 16 }, (_, i) => answers["q" + (i + 1)] ?? ""),
        r.suggestion ?? answers.suggestion ?? "",
      ];
    });
  const wb = XLSX.utils.book_new(),
    sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  sheet["!cols"] = headers.map((h) => ({
    wch: h === "หลักสูตร / แผนก / ฝ่าย" ? 90 : h === "รุ่นคำถาม" ? 48 : 28,
  }));
  XLSX.utils.book_append_sheet(wb, sheet, "ความพึงพอใจ");
  const dictionary = XLSX.utils.aoa_to_sheet(questions);
  dictionary["!cols"] = [
    { wch: 32 },
    { wch: 18 },
    { wch: 48 },
    { wch: 38 },
    { wch: 10 },
    { wch: 110 },
  ];
  XLSX.utils.book_append_sheet(wb, dictionary, "คำถามที่บันทึก");
  return wb;
}
export function exportSatisfactionRecords(
  records: Record<string, unknown>[],
  filename = "safecheck-satisfaction.xlsx",
) {
  XLSX.writeFile(buildSatisfactionWorkbook(records), filename);
}
