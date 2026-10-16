import * as XLSX from "xlsx";
import { layoutExportCell } from "./layout-export";
import { buildSatisfactionWorkbook } from "./satisfaction-export";
import { buildFormReportWorkbook } from "./form-report-export";
import {
  environmentRevision,
  list,
  object,
  reportModel,
  recordedPass,
  REPORT_GROUPS,
  type StoredRecord,
} from "./report-model";
type Cell = string | number | boolean | null | undefined | XLSX.CellObject;
type Row = Cell[];
const text = (value: unknown): Cell =>
  typeof value === "number" ||
  typeof value === "boolean" ||
  typeof value === "string"
    ? value
    : value == null
      ? ""
      : JSON.stringify(value);
function sheet(
  wb: XLSX.WorkBook,
  name: string,
  headers: string[],
  rows: Row[],
) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws["!cols"] = headers.map((h) => ({
    wch: h.includes("คำถาม") || h.includes("JSON") ? 85 : 28,
  }));
  XLSX.utils.book_append_sheet(wb, ws, name);
}
export function buildReportWorkbook(
  records: StoredRecord[],
  scope = "selected",
) {
  if (scope === "latest") return buildFormReportWorkbook(records, scope);
  const audit = records.some((r) => r.assessment_type === "satisfaction")
    ? buildSatisfactionWorkbook(records)
    : XLSX.utils.book_new();
  // Keep saved source/audit tables available for recovery, but open the workbook
  // on the original reader-facing form reports rather than technical tables.
  const wb = audit;
  const jobs = new Map<string, StoredRecord>(),
    roundCounts = new Map<string, number>();
  for (const r of records) {
    if (r.assessment_type === "environment")
      roundCounts.set(
        String(r.submission_code),
        (roundCounts.get(String(r.submission_code)) ?? 0) + 1,
      );
    const previous = jobs.get(String(r.submission_code));
    if (
      !previous ||
      Number(reportModel(previous).version) < Number(reportModel(r).version)
    )
      jobs.set(String(r.submission_code), r);
  }
  sheet(
    wb,
    "รายการงาน",
    [
      "รหัสการประเมิน",
      "ประเภท",
      "หมวด",
      "กลุ่ม",
      "Schema",
      "รุ่นที่ส่งออกล่าสุดในชุดนี้",
      "รอบตรวจที่มีในชุดนี้",
      "วันสร้างงาน",
      "วันตรวจหรือส่งแบบประเมิน",
      "สถานะคลัง",
      "ขอบเขตส่งออก",
      "ผู้ตรวจหรือผู้ตอบ",
      "สถานที่ตรวจ",
      "ผลตรวจในชุดนี้",
      "คะแนนในชุดนี้",
      "ระดับอาการในชุดนี้",
      "รุ่นชุดคำถาม",
      "Scoring version",
    ],
    [...jobs.values()].map((r) => {
      const m = reportModel(r);
      return [
        m.code,
        m.title,
        m.category,
        REPORT_GROUPS[m.group] ?? m.group,
        text(m.schemaVersion),
        text(m.version),
        roundCounts.get(m.code) ?? 0,
        text(r.created_at),
        text(m.measuredAt),
        "ใช้งาน",
        scope,
        text(
          object(r.inspectionData).inspector_name ??
            object(r.profile).full_name,
        ),
        text(object(r.inspectionData).inspection_location),
        m.type === "environment" ? recordedPass(m.revision.is_pass) : "",
        text(
          m.result.after_total ??
            m.result.total ??
            m.result.overall_mean ??
            r.overall_score,
        ),
        m.type === "health_risk"
          ? text(m.result.after_level ?? m.result.level ?? r.overall_level)
          : "",
        text(m.questionnaireVersion),
        text(m.scoringVersion),
      ];
    }),
  );
  const rounds: Row[] = [],
    units: Row[] = [],
    samples: Row[] = [],
    health: Row[] = [],
    answers: Row[] = [],
    metadata: Row[] = [],
    snapshots: Row[] = [];
  for (const r of records) {
    const m = reportModel(r),
      rev = environmentRevision(r),
      context = object(r.healthContext),
      work = object(r.workInfo),
      profile = object(r.profile);
    for (const [section, value] of Object.entries({
      profile,
      workInfo: work,
      healthContext: context,
      inspectionData: r.inspectionData ?? m.revision.inspection_snapshot,
      program: m.resolved.program,
    }))
      for (const [key, v] of Object.entries(object(value)))
        metadata.push([m.code, text(m.version), section, key, text(v)]);
    // Chunk complete snapshots: Excel cells have a 32,767-character limit.
    const json = JSON.stringify(r);
    for (let offset = 0, n = 1; offset < json.length; n++) {
      let end = Math.min(offset + 30000, json.length);
      if (end < json.length && /[\uD800-\uDBFF]/.test(json[end - 1])) end--;
      snapshots.push([m.code, text(m.version), n, json.slice(offset, end)]);
      offset = end;
    }
    if (m.type === "environment") {
      rounds.push([
        m.code,
        text(m.version),
        m.revisionId,
        text(m.revision.base_revision_id),
        text(m.revision.kind),
        text(m.measuredAt),
        text(m.savedAt),
        m.isLatest ? "ล่าสุด" : "ย้อนหลัง",
        text(rev?.is_pass ?? m.revision.is_pass),
        text(m.scoringVersion),
        layoutExportCell(r),
      ]);
      if (rev)
        for (const o of rev.observations) {
          units.push([
            m.code,
            rev.revision_no,
            rev.revision_id,
            o.unit.point_id,
            o.unit.kind,
            o.unit.location_desc,
            o.measured_at,
            o.observation_kind,
            o.carried_from_revision_id ?? "",
            o.result.is_pass,
            o.result.standard.version,
            o.result.standard.document,
            o.result.standard.code,
            JSON.stringify(o.result.standard.thresholds),
            JSON.stringify(o.result.values),
            o.unit.kind === "noise"
              ? "dBA"
              : o.unit.kind === "heat"
                ? "°C"
                : "Lux",
            JSON.stringify(o.unit),
            ...[
              "lux",
              "surrounding_near_lux",
              "surrounding_outer_lux",
              "average",
              "minimum",
              "level",
              "min",
              "max",
              "wbgt_average",
            ].map((k) => o.result.values[k] ?? ""),
            ...[
              "target",
              "near",
              "outer",
              "average_min",
              "point_min",
              "limit",
              "duration_minutes",
            ].map((k) => o.result.standard.thresholds[k] ?? ""),
            ...[
              "evaluation_basis",
              "wbgt_type",
              "input_mode",
              "workload",
              "start_at",
              "end_at",
            ].map((k) => text(object(o.unit)[k])),
          ]);
          if (o.unit.kind === "light_area")
            for (const s of o.unit.samples ?? [])
              samples.push([
                m.code,
                rev.revision_no,
                o.unit.point_id,
                s.sample_id,
                s.lux,
                "Lux",
                "",
                "",
                "",
                "",
                "",
              ]);
          if (o.unit.kind === "heat")
            for (const [i, s] of (o.unit.intervals ?? []).entries())
              samples.push([
                m.code,
                rev.revision_no,
                o.unit.point_id,
                i + 1,
                "",
                "°C",
                s.wb,
                s.gt,
                s.db ?? "",
                s.minutes,
                "นาที",
              ]);
        }
      else
        for (const p of list(m.revision.points))
          units.push([
            m.code,
            text(m.version),
            m.revisionId,
            text(p.point_key),
            "legacy",
            text(p.location_desc),
            text(m.revision.measured_at),
            "legacy",
            "",
            "",
            "legacy-unverified",
            "",
            "",
            text(p.standard_snapshot_json),
            "",
            m.category === "light"
              ? "Lux"
              : m.category === "noise"
                ? "dBA"
                : "°C",
            text(p.inputs_json),
          ]);
    }
    if (m.type === "health_risk") {
      const result = m.result;
      health.push([
        m.code,
        text(m.version),
        m.category,
        text(m.questionnaireVersion),
        text(m.scoringVersion),
        text(result.before_total),
        text(result.after_total),
        text(result.delta),
        text(result.after_level),
        text(
          result.total ??
            (r.schema_version !== 3 ? r.overall_score : undefined),
        ),
        text(
          result.level ??
            (r.schema_version !== 3 ? r.overall_level : undefined),
        ),
        text(work.working_hours_per_day),
        text(work.working_hours_per_week),
        text(context.hours_worked_today),
        text(context.noise_sources),
        text(context.noise_source_other),
      ]);
      const groups =
        r.schema_version === 3
          ? object(r.answers)
          : { legacy_single: r.answers };
      for (const [phase, values] of Object.entries(groups)) {
        const qs = list(object(m.resolved.questions)[phase]);
        for (const [id, score] of Object.entries(object(values)))
          if (/^q\d+$/.test(id))
            answers.push([
              m.code,
              text(m.version),
              m.category,
              text(m.questionnaireVersion),
              phase,
              id,
              text(qs.find((q) => q.question_id === id)?.text),
              text(score),
              2,
            ]);
      }
    }
  }
  sheet(
    wb,
    "รอบตรวจ",
    [
      "รหัสการประเมิน",
      "รอบ",
      "Revision ID",
      "รอบฐาน",
      "ชนิดรอบ",
      "วันเวลาตรวจรอบนี้",
      "เวลาบันทึกรอบ",
      "สถานะผล",
      "ผ่านเกณฑ์",
      "Scoring version",
      "ผังพื้นที่",
    ],
    rounds,
  );
  sheet(
    wb,
    "ค่าตรวจ",
    [
      "รหัสการประเมิน",
      "รอบ",
      "Revision ID",
      "รหัสจุด",
      "เทคนิค",
      "สถานที่จุด",
      "วันเวลาวัดจริง",
      "ที่มาค่าตรวจ",
      "Carry จาก revision",
      "ผ่านเกณฑ์",
      "รุ่นมาตรฐาน",
      "เอกสารมาตรฐาน",
      "รหัสเกณฑ์",
      "เกณฑ์ JSON",
      "ผลค่าตรวจ JSON",
      "หน่วย",
      "ค่าดิบและบริบท JSON",
      "Lux จุดตรวจ",
      "Lux บริเวณใกล้",
      "Lux ถัดออกไป",
      "Lux เฉลี่ย",
      "Lux ต่ำสุด",
      "เสียงประเมิน (dBA)",
      "เสียงต่ำสุด (dBA)",
      "เสียงสูงสุด (dBA)",
      "WBGT เฉลี่ย (°C)",
      "เกณฑ์ Lux จุดตรวจ",
      "เกณฑ์ Lux ใกล้",
      "เกณฑ์ Lux ถัดออกไป",
      "เกณฑ์ Lux เฉลี่ย",
      "เกณฑ์ Lux ต่ำสุด",
      "เกณฑ์เสียงหรือ WBGT",
      "สัมผัสเสียง (นาที)",
      "วิธีประเมินเสียง",
      "WBGT ในหรือกลางแจ้ง",
      "วิธี WBGT",
      "ภาระงาน",
      "เริ่ม WBGT",
      "สิ้นสุด WBGT",
    ],
    units,
  );
  sheet(
    wb,
    "จุดย่อยและช่วงวัด",
    [
      "รหัสการประเมิน",
      "รอบ",
      "รหัสจุด",
      "รหัสจุดย่อยหรือช่วง",
      "แสง",
      "หน่วย",
      "WB",
      "GT",
      "DB",
      "ระยะเวลา",
      "หน่วยเวลา",
    ],
    samples,
  );
  sheet(
    wb,
    "อาการทางสุขภาพ",
    [
      "รหัสการประเมิน",
      "รุ่น",
      "หมวด",
      "รุ่นคำถาม",
      "Scoring version",
      "คะแนนก่อน",
      "คะแนนหลัง",
      "ผลต่าง หลัง−ก่อน",
      "ระดับจากคะแนนหลัง",
      "คะแนน single หรือเดิม",
      "ระดับ single หรือเดิม",
      "ชั่วโมงต่อวัน",
      "ชั่วโมงต่อสัปดาห์",
      "ชั่วโมงวันนี้ (ไม่รวมคะแนน)",
      "แหล่งเสียง (ไม่รวมคะแนน)",
      "แหล่งเสียงอื่น",
    ],
    health,
  );
  sheet(
    wb,
    "คำตอบอาการ",
    [
      "รหัสการประเมิน",
      "รุ่น",
      "หมวด",
      "รุ่นคำถาม",
      "Phase",
      "รหัสข้อ",
      "คำถามที่บันทึก",
      "คะแนน",
      "เต็ม",
    ],
    answers,
  );
  sheet(
    wb,
    "ข้อมูลประกอบ",
    ["รหัสการประเมิน", "รุ่น", "ส่วน", "Field", "ค่า"],
    metadata,
  );
  sheet(
    wb,
    "Snapshot ที่บันทึก",
    ["รหัสการประเมิน", "รุ่น", "ส่วน JSON ตามลำดับ", "JSON (ต่อส่วนตามลำดับ)"],
    snapshots,
  );
  const forms = buildFormReportWorkbook(records, scope);
  const visibleNames = [...forms.SheetNames];
  for (const name of wb.SheetNames)
    XLSX.utils.book_append_sheet(forms, wb.Sheets[name], name);
  // Keep readable columns valid even for exceptionally long legacy fields.
  // Full text always remains in the chunked immutable snapshot sheet.
  for (const ws of Object.values(forms.Sheets))
    for (const [address, cell] of Object.entries(ws)) {
      if (
        !address.startsWith("!") &&
        cell.t === "s" &&
        typeof cell.v === "string" &&
        cell.v.length > 32767
      ) {
        let end = 32500;
        if (/[\uD800-\uDBFF]/.test(cell.v[end - 1])) end--;
        cell.v =
          cell.v.slice(0, end) +
          "\n[ข้อความยาว: ดูข้อมูลเต็มในชีต Snapshot ที่บันทึก]";
      }
    }
  // Keep audit identifiers available to recovery tools, without exposing schema
  // and questionnaire versions as choices in the user-facing spreadsheet.
  for (const ws of Object.values(forms.Sheets)) {
    const headers = (XLSX.utils.sheet_to_json(ws, { header: 1 })[0] ||
      []) as string[];
    ws["!cols"] = headers.map((header, i) => ({
      ...(ws["!cols"]?.[i] || {}),
      hidden: /รุ่น|Schema|Scoring version/i.test(header),
    }));
  }
  forms.Workbook = {
    ...forms.Workbook,
    Sheets: forms.SheetNames.map((name) => ({
      name,
      Hidden: visibleNames.includes(name) ? 0 : 1,
    })),
  };
  return forms;
}
export function exportReportRecords(
  records: StoredRecord[],
  filename = "safecheck-report.xlsx",
  scope = "selected",
) {
  XLSX.writeFile(buildReportWorkbook(records, scope), filename);
}
