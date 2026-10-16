import * as XLSX from "xlsx";
import { layoutExportCell } from "./layout-export";
import {
  satisfactionQuestionsForResult,
  LIGHT_SPOT_STANDARDS,
  LIGHT_AREA_STANDARDS,
  STANDARD_VERSIONS,
} from "../../../shared/v3";
import {
  list,
  object,
  reportModel,
  recordedPass,
  REPORT_GROUPS,
  type StoredRecord,
} from "./report-model";

type Value = string | number | boolean | null | undefined | XLSX.CellObject;
type FormRow = Record<string, Value>;
const categories: Record<string, string> = {
  light: "แสงสว่าง",
  noise: "เสียง",
  heat: "ความร้อน",
  general: "ความพึงพอใจ",
};
const levels: Record<string, string> = {
  pass: "อาการระดับต่ำ",
  medium: "อาการระดับปานกลาง",
  high_risk: "อาการระดับสูง",
};
const positions = {
  staff: "บุคลากร",
  student: "นักศึกษา",
  faculty: "อาจารย์",
  other: "อื่น ๆ",
};
const sources: Record<string, string> = {
  announcement: "เสียงประกาศตามสาย/ลำโพง",
  college_activity: "เสียงกิจกรรมของวิทยาลัย",
  air_conditioner: "เครื่องปรับอากาศ/พัดลม",
  laboratory: "อุปกรณ์ห้องปฏิบัติการ",
  machine: "เครื่องจักร",
  traffic: "จราจร/ยานพาหนะ",
  construction: "ก่อสร้าง/ซ่อมแซม",
  other: "อื่น ๆ",
  none: "ไม่ได้สัมผัสเสียงดังจากแหล่งข้างต้น",
};
const label = (v: unknown, labels: Record<string, string>) =>
  v == null ? "" : (labels[String(v)] ?? String(v));
const value = (v: unknown): Value =>
  v == null
    ? ""
    : typeof v === "number" || typeof v === "boolean" || typeof v === "string"
      ? v
      : JSON.stringify(v);
/** Excel serial in Bangkok wall time; timezone does not depend on the exporting device. */
function date(v: unknown): Value {
  if (typeof v !== "string" || !Number.isFinite(Date.parse(v))) return value(v);
  const dayOnly = /^\d{4}-\d{2}-\d{2}$/.test(v);
  return {
    t: "n",
    v: 25569 + (Date.parse(v) + (dayOnly ? 0 : 7 * 3600000)) / 86400000,
    z: dayOnly ? "dd/mm/yyyy" : "dd/mm/yyyy hh:mm",
  };
}
function inspection(r: StoredRecord) {
  const rev = object(r.revision);
  return object(
    rev.inspectionData ?? r.inspectionData ?? rev.inspection_snapshot,
  );
}
function program(r: StoredRecord) {
  const work = object(r.workInfo);
  return work.program_code === "not_applicable"
    ? "ไม่เกี่ยวข้อง"
    : value(
        object(object(r.resolved).program).label ??
          work.program_label ??
          work.program_code,
      );
}
function common(r: StoredRecord): FormRow {
  const m = reportModel(r);
  return {
    รหัสการประเมิน: m.code,
    วันที่และเวลา: date(m.measuredAt),
    ประเภท: REPORT_GROUPS[m.group] ?? "ไม่ระบุกลุ่ม",
    หมวดหมู่: categories[m.category] ?? m.category,
    ครั้งที่บันทึก: value(m.version),
    สถานะผล: m.isLatest ? "ล่าสุด" : "ย้อนหลัง",
    วันสร้างรายการ: date(r.created_at),
    วันเวลาบันทึก: date(m.savedAt),
  };
}
function person(r: StoredRecord): FormRow {
  const p = object(r.profile),
    w = object(r.workInfo);
  return {
    ชื่อและนามสกุล: value(p.full_name),
    เพศ: label(p.gender, { male: "ชาย", female: "หญิง", other: "อื่น ๆ" }),
    "อายุ (ปี)": value(p.age),
    "น้ำหนัก (กก.)": value(p.weight),
    "ส่วนสูง (ซม.)": value(p.height),
    สถานภาพ: label(p.marital_status, {
      single: "โสด",
      married: "สมรส",
      divorced: "หย่าร้าง",
      widowed: "หม้าย",
    }),
    การศึกษาสูงสุด: label(p.education_level, {
      below_bachelor: "ต่ำกว่าปริญญาตรี",
      bachelor: "ปริญญาตรี",
      master: "ปริญญาโท",
      doctorate: "ปริญญาเอก",
    }),
    มีโรคประจำตัว:
      p.has_underlying_disease == null
        ? ""
        : p.has_underlying_disease
          ? "มี"
          : "ไม่มี",
    รายละเอียดโรคประจำตัว: value(p.underlying_disease_details),
    ประเภทผู้ตอบ: label(w.position_type, positions),
    บริบท: label(w.other_context, { work: "ปฏิบัติงาน", study: "เรียน" }),
    "หลักสูตร / แผนก / ฝ่าย": program(r),
    ชั้นปี: value(w.study_year),
    "อายุงาน (ปี)": value(w.work_experience_years),
    ชั่วโมงต่อวัน: value(w.working_hours_per_day),
    ชั่วโมงต่อสัปดาห์: value(w.working_hours_per_week),
  };
}
function environmentRows(r: StoredRecord): FormRow[] {
  const m = reportModel(r),
    i = inspection(r),
    rev = object(r.revision);
  const base: FormRow = {
    ...common(r),
    วันที่ตรวจวัด: date(i.inspection_date),
    ผู้ตรวจวัด: value(i.inspector_name),
    ตำแหน่งผู้ตรวจ: value(i.position),
    สถานที่ตรวจวัด: value(i.inspection_location),
    เริ่มตรวจวัด: date(i.start_at),
    สิ้นสุดตรวจวัด: date(i.end_at),
    อุปกรณ์ที่ใช้: value(i.equipment),
    หมายเลขเครื่อง: value(i.serial_number),
    วันที่สอบเทียบ: date(i.calibration_date),
    แผนกที่รับผิดชอบ: value(i.responsible_department),
    ผู้รับผิดชอบอาคารหรือสถานที่: value(i.location_responsible_name),
    ...(m.category === "light"
      ? {
          วิธีตรวจแสง: label(i.measurement_technique, {
            spot: "เฉพาะจุด (Spot)",
            area: "เฉลี่ยพื้นที่ (Area)",
          }),
        }
      : {}),
    ผลการประเมินรอบนี้: recordedPass(rev.is_pass),
    ชื่อไฟล์ผังพื้นที่: layoutExportCell(r),
    "ผังพื้นที่ (รหัสไฟล์)": value(
      rev.layout_file_id ?? object(r.layout).file_id,
    ),
    รหัสรอบตรวจ: value(m.revisionId),
    รหัสรอบฐาน: value(rev.base_revision_id),
    การดำเนินการ: label(rev.kind, {
      initial: "ตรวจครั้งแรก",
      retest: "ตรวจซ้ำ",
      correction: "ประเมินวัดซ้ำ",
      supplement: "เติมข้อมูลประกอบ",
    }),
  };
  const observations = list(rev.observations);
  if (!observations.length) return [base];
  return observations.flatMap((o, index) => {
    const u = object(o.unit),
      result = object(o.result),
      s = object(result.standard),
      t = object(s.thresholds),
      v = object(result.values);
    const row: FormRow = {
      ...base,
      จุดตรวจที่: index + 1,
      รหัสจุดตรวจ: value(u.point_id),
      รายละเอียดจุดตรวจวัด: value(u.location_desc),
      วันเวลาวัดจริง: date(o.measured_at),
      ที่มาค่าตรวจ: label(o.observation_kind, {
        measured: "วัดในรอบนี้",
        carried: "คงค่าจากรอบก่อน",
      }),
      อ้างอิงค่าจากรอบ: value(o.carried_from_revision_id),
      ผลการประเมินจุดนี้: recordedPass(result.is_pass),
      หมายเหตุ: value(u.remark),
      รหัสเกณฑ์มาตรฐาน: value(s.code),
      รุ่นมาตรฐาน: value(s.version),
      เอกสารมาตรฐาน: value(s.document),
    };
    if (u.kind === "light_spot" || u.kind === "light_area") {
      // Resolve wording only for the saved catalog version; never replace historical thresholds.
      const standard =
        s.version === STANDARD_VERSIONS.light
          ? (u.kind === "light_spot"
              ? LIGHT_SPOT_STANDARDS
              : LIGHT_AREA_STANDARDS
            ).find((entry) => entry.code === s.code)
          : undefined;
      Object.assign(row, {
        มาตรฐานที่เลือก: standard
          ? "min" in standard
            ? `${standard.max ? `${standard.min}–${standard.max}` : `≥ ${standard.min}`} Lux (${standard.label})`
            : `เฉลี่ย ≥ ${standard.averageMin} Lux${standard.pointMin == null ? "" : ` / ต่ำสุด ≥ ${standard.pointMin} Lux`} (${standard.label})`
          : u.kind === "light_spot"
            ? `≥ ${t.target ?? ""} Lux`
            : `เฉลี่ย ≥ ${t.average_min ?? ""} Lux${t.point_min == null ? "" : ` / ต่ำสุด ≥ ${t.point_min} Lux`}`,
        เทคนิคการตรวจ:
          u.kind === "light_spot" ? "เฉพาะจุด (Spot)" : "เฉลี่ยพื้นที่ (Area)",
        "ค่าความสว่างจุดตรวจ (Lux)": value(u.lux),
        "เกณฑ์จุดตรวจ (Lux)": value(t.target),
        "ค่าบริเวณใกล้ (Lux)": value(u.surrounding_near_lux),
        "เกณฑ์บริเวณใกล้ (Lux)": value(t.near),
        "ค่าบริเวณถัดออกไป (Lux)": value(u.surrounding_outer_lux),
        "เกณฑ์บริเวณถัดออกไป (Lux)": value(t.outer),
        "ค่าเฉลี่ยพื้นที่ (Lux)": value(v.average),
        "ค่าต่ำสุดพื้นที่ (Lux)": value(v.minimum),
        "เกณฑ์เฉลี่ยพื้นที่ (Lux)": value(t.average_min),
        "เกณฑ์ต่ำสุดพื้นที่ (Lux)": value(t.point_min),
        "ค่าเป้าหมายที่เลือก (Lux)": value(u.standard_target_lux),
      });
      if (u.kind === "light_area") return [row];
    }
    if (u.kind === "noise")
      Object.assign(row, {
        วิธีประเมินเสียง: label(u.evaluation_basis, {
          "exposure-duration": "ระดับเสียงตามเวลาสัมผัส",
          twa8: "ค่าเฉลี่ยถ่วงน้ำหนัก 8 ชั่วโมง (TWA8)",
        }),
        "เสียงต่ำสุด (dBA)": value(u.min_dBA),
        "เสียงสูงสุด (dBA)": value(u.max_dBA),
        "เสียงตามเวลาสัมผัส (dBA)": value(u.exposure_level_dBA),
        "ระยะเวลาสัมผัส (นาที)": value(u.exposure_duration_minutes),
        "TWA8 (dBA)": value(u.twa_8hr),
        "เสียงที่ใช้ประเมิน (dBA)": value(v.level),
        "เกณฑ์เสียง (dBA)": value(t.limit),
      });
    if (u.kind === "heat") {
      Object.assign(row, {
        ภาระงาน: label(u.workload, {
          light: "งานเบา",
          moderate: "งานปานกลาง",
          heavy: "งานหนัก",
        }),
        สภาพแวดล้อมความร้อน: label(u.wbgt_type, {
          in: "ในร่ม",
          out: "กลางแจ้ง",
        }),
        "วิธีวัด WBGT": label(u.input_mode, {
          meter_average: "ค่าเฉลี่ยจากเครื่องวัด",
          calculated_intervals: "คำนวณจากช่วงวัด",
        }),
        เริ่มช่วงวัดความร้อน: date(u.start_at),
        สิ้นสุดช่วงวัดความร้อน: date(u.end_at),
        "DB (°C)": value(u.db_temp),
        "WB (°C)": value(u.wb_temp),
        "GT (°C)": value(u.gt_temp),
        "WBGT จากเครื่องวัด (°C)": value(u.wbgt_in),
        "WBGT ที่กรอกจากเครื่อง (°C)": value(
          u.wbgt_in ??
            (u.db_temp === undefined &&
            u.wb_temp === undefined &&
            u.gt_temp === undefined
              ? u.wbgt_average
              : undefined),
        ),
        "WBGT เฉลี่ยที่บันทึก (°C)": value(v.wbgt_average),
        "เกณฑ์ WBGT (°C)": value(t.limit),
      });
      if (u.input_mode === "calculated_intervals")
        return list(u.intervals).map((interval, n) => ({
          ...row,
          ช่วงวัดที่: n + 1,
          "WB กระเปาะเปียก (°C)": value(interval.wb),
          "GT ลูกกลม (°C)": value(interval.gt),
          "DB กระเปาะแห้ง (°C)": value(interval.db),
          "ระยะเวลาช่วงวัด (นาที)": value(interval.minutes),
        }));
    }
    return [row];
  });
}
function healthRow(r: StoredRecord): FormRow {
  const m = reportModel(r),
    c = object(r.healthContext),
    result = m.result;
  const row: FormRow = {
    ...common(r),
    ...person(r),
    ...(m.category === "light"
      ? {
          ชั่วโมงปฏิบัติงานหรือเรียนวันนี้: value(c.hours_worked_today),
          "คะแนนก่อน (เต็ม 20)": value(result.before_total),
          "คะแนนหลัง (เต็ม 20)": value(result.after_total),
          "ผลต่าง หลังลบก่อน": value(result.delta),
          ระดับอาการจากคะแนนหลัง: label(result.after_level, levels),
        }
      : {}),
    ...(m.category === "noise"
      ? {
          แหล่งเสียงที่สัมผัส: Array.isArray(c.noise_sources)
            ? c.noise_sources.map((v) => label(v, sources)).join(", ")
            : "",
          แหล่งเสียงอื่น: value(c.noise_source_other),
        }
      : {}),
    ...(m.category !== "light" || r.schema_version !== 3
      ? {
          "คะแนนรวม (เต็ม 20)": value(
            result.total ?? (r.schema_version !== 3 ? r.overall_score : null),
          ),
          ระดับอาการ: label(
            result.level ?? (r.schema_version !== 3 ? r.overall_level : null),
            levels,
          ),
        }
      : {}),
    รุ่นคำถาม: value(m.questionnaireVersion),
    รุ่นการประเมินผล: value(m.scoringVersion),
  };
  const phases =
    r.schema_version === 3 ? object(r.answers) : { single: r.answers };
  for (const [phase, answer] of Object.entries(phases)) {
    const qs = list(object(m.resolved.questions)[phase]);
    for (const [id, score] of Object.entries(object(answer))) {
      if (!/^q\d+$/.test(id)) continue;
      const wording = qs.find((q) => q.question_id === id)?.text;
      row[
        `${label(phase, { before: "ก่อน", after: "หลัง", single: "อาการ" })} ข้อ ${id.slice(1)}${wording ? ` (${wording})` : ""}`
      ] = value(score);
    }
  }
  return row;
}
function satisfactionRow(r: StoredRecord): FormRow {
  const m = reportModel(r),
    result = m.result,
    durations = object(result.durations);
  const row: FormRow = {
    ...common(r),
    ผู้ประเมิน: value(object(r.profile).full_name),
    ...(m.group === "health"
      ? {
          ประเภทผู้ตอบ: label(object(r.workInfo).position_type, positions),
          บริบท: label(object(r.workInfo).other_context, {
            study: "เรียน",
            work: "ปฏิบัติงาน",
          }),
          "หลักสูตร / แผนก / ฝ่าย": program(r),
          ชั้นปี: value(object(r.workInfo).study_year),
        }
      : {}),
    "คะแนนเฉลี่ยรวม (เต็ม 5)": value(result.overall_mean ?? r.overall_score),
    "คะแนนรวม (เต็ม 80)": value(result.total),
    ...Object.fromEntries(
      ["ด้านเนื้อหา", "ด้านการออกแบบ", "ด้านการใช้งาน", "ด้านประโยชน์"].map(
        (name, i) => [
          `${name} (เฉลี่ย)`,
          value(
            Array.isArray(result.dimension_means)
              ? result.dimension_means[i]
              : null,
          ),
        ],
      ),
    ),
    ข้อเสนอแนะเพิ่มเติม: value(r.suggestion ?? object(r.answers).suggestion),
    รุ่นคำถาม: value(m.questionnaireVersion),
    รุ่นการประเมินผล: value(m.scoringVersion),
  };
  if (m.group === "environment") {
    for (const mode of ["traditional", "safecheck"] as const) {
      const input = object(object(r.durations)[mode]);
      for (const [key, unit] of Object.entries({
        days: "วัน",
        hours: "ชั่วโมง",
        minutes: "นาที",
        seconds: "วินาที",
      }))
        row[
          `เวลาวิธี${mode === "traditional" ? "เดิม" : " SafeCheck"} (${unit})`
        ] = value(input[key]);
    }
    row["เวลาวิธีเดิมรวม (วินาที)"] = value(durations.traditional_seconds);
    row["เวลา SafeCheck รวม (วินาที)"] = value(durations.safecheck_seconds);
    row["ผลต่างเวลา วิธีเดิมลบ SafeCheck (วินาที)"] =
      typeof durations.traditional_seconds === "number" &&
      typeof durations.safecheck_seconds === "number"
        ? durations.traditional_seconds - durations.safecheck_seconds
        : "";
    row["แหล่งเวลา"] = label(durations.source, { manual: "ผู้ตอบกรอก" });
  }
  const questions =
    r.schema_version === 3
      ? satisfactionQuestionsForResult(r).flatMap(
          (dimension) => dimension.questions,
        )
      : [];
  for (let n = 1; n <= 16; n++) {
    const q = questions.find((q) => q.id === `q${n}`);
    row[`ข้อ ${n}${q ? ` (${q.text})` : ""}`] = value(
      object(r.answers)[`q${n}`],
    );
  }
  return row;
}
/** Dashboard spreadsheets contain user data, not storage identifiers or schema metadata. */
function dashboardRow(source: FormRow): FormRow {
  const row = { ...source };
  row["วันที่และเวลา"] = source["วันสร้างรายการ"];
  for (const key of [
    "วันสร้างรายการ",
    "สถานะผล",
    "ผังพื้นที่ (รหัสไฟล์)",
    "รหัสรอบตรวจ",
    "รหัสรอบฐาน",
    "รหัสจุดตรวจ",
    "อ้างอิงค่าจากรอบ",
    "รหัสเกณฑ์มาตรฐาน",
    "รุ่นมาตรฐาน",
    "รุ่นคำถาม",
    "รุ่นการประเมินผล",
    "แหล่งเวลา",
    "ค่าเป้าหมายที่เลือก (Lux)",
    "WBGT ที่กรอกจากเครื่อง (°C)",
    "เอกสารมาตรฐาน",
    "วิธีวัด WBGT",
    "เทคนิคการตรวจ",
  ])
    delete row[key];
  return row;
}
function append(
  wb: XLSX.WorkBook,
  name: string,
  rows: FormRow[],
  scope: string,
) {
  if (!rows.length) return;
  if (scope === "latest") rows = rows.map(dashboardRow);
  const headers = ["ลำดับ", ...new Set(rows.flatMap((r) => Object.keys(r)))];
  // Explicit line breaks keep the saved question wording readable in Excel and
  // other viewers without depending on optional styling support in SheetJS.
  const displayHeaders = headers.map((header) => {
    if (!/ข้อ \d+/.test(header)) return header;
    const parts = [
      ...new Intl.Segmenter("th", { granularity: "grapheme" }).segment(header),
    ].map((part) => part.segment);
    const lines: string[] = [];
    for (let i = 0; i < parts.length; i += 30)
      lines.push(parts.slice(i, i + 30).join(""));
    return lines.join("\n");
  });
  const ws = XLSX.utils.aoa_to_sheet([
    displayHeaders,
    ...rows.map((row, index) =>
      headers.map((key) => (key === "ลำดับ" ? index + 1 : (row[key] ?? ""))),
    ),
  ]);
  ws["!cols"] = headers.map((h) => ({
    wch:
      h === "ลำดับ"
        ? 8
        : /ข้อ \d+/.test(h)
          ? 36
          : /หลักสูตร|รายละเอียด|ข้อเสนอแนะ/.test(h)
            ? 45
            : /วันที่|วันเวลา/.test(h)
              ? 23
              : 28,
  }));
  ws["!autofilter"] = { ref: ws["!ref"]! };
  ws["!rows"] = [
    {
      hpt:
        Math.max(...displayHeaders.map((header) => header.split("\n").length)) *
          15 +
        8,
    },
  ];
  XLSX.utils.book_append_sheet(wb, ws, name);
}
/** Reader-facing forms follow the original report order, using only immutable saved values. */
export function buildFormReportWorkbook(
  records: StoredRecord[],
  scope = "selected",
) {
  if (scope === "history")
    records = [...records].sort((a, b) => {
      const x = reportModel(a),
        y = reportModel(b);
      return (
        x.code.localeCompare(y.code) || Number(x.version) - Number(y.version)
      );
    });
  const wb = XLSX.utils.book_new();
  const latest = new Map<string, StoredRecord>();
  for (const r of records) {
    const m = reportModel(r),
      previous = latest.get(m.code);
    if (!previous || Number(m.version) > Number(reportModel(previous).version))
      latest.set(m.code, r);
  }
  append(
    wb,
    "ภาพรวมทั้งหมด",
    (scope === "history" ? records : [...latest.values()]).map((r) => {
      const m = reportModel(r),
        i = inspection(r),
        p = object(r.profile),
        result = m.result;
      return {
        ...common(r),
        "ผู้ตรวจ / ผู้ประเมิน": value(i.inspector_name ?? p.full_name),
        "สถานที่ / หลักสูตร / แผนก / ฝ่าย":
          m.type === "environment" ? value(i.inspection_location) : program(r),
        ผลการประเมิน:
          m.type === "environment"
            ? recordedPass(m.revision.is_pass)
            : m.type === "health_risk"
              ? label(result.after_level ?? result.level, levels)
              : "คะแนนเฉลี่ยความพึงพอใจ",
        คะแนนรวม: value(result.after_total ?? result.total ?? r.overall_score),
        "คะแนนเฉลี่ยความพึงพอใจ (เต็ม 5)":
          m.type === "satisfaction"
            ? value(result.overall_mean ?? r.overall_score)
            : "",
        สถานะผังพื้นที่:
          m.type === "environment"
            ? object(r.revision).layout_file_id || object(r.layout).file_id
              ? "แนบแล้ว"
              : "ไม่มีผัง"
            : "",
        ชื่อไฟล์ผังพื้นที่: m.type === "environment" ? layoutExportCell(r) : "",
      };
    }),
    scope,
  );
  for (const category of ["light", "noise", "heat"])
    append(
      wb,
      `สิ่งแวดล้อม-${categories[category]}`,
      records
        .filter(
          (r) =>
            r.assessment_type === "environment" &&
            r.assessment_category === category,
        )
        .flatMap(environmentRows),
      scope,
    );
  for (const category of ["light", "noise", "heat"])
    append(
      wb,
      `สุขภาพ-${categories[category]}`,
      records
        .filter(
          (r) =>
            r.assessment_type === "health_risk" &&
            r.assessment_category === category,
        )
        .map(healthRow),
      scope,
    );
  for (const group of ["environment", "health"])
    append(
      wb,
      group === "environment"
        ? "ความพึงพอใจ-สภาพแวดล้อม"
        : "ความพึงพอใจ-อาการทางสุขภาพ",
      records
        .filter(
          (r) =>
            r.assessment_type === "satisfaction" &&
            r.assessment_group === group,
        )
        .map(satisfactionRow),
      scope,
    );
  return wb;
}
