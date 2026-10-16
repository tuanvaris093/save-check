"use client";
import { LayoutAttachmentCard } from "@/components/forms/layout-attachment-card";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/constants";
import {
  object,
  list,
  reportModel,
  recordedPass,
  type StoredRecord,
} from "@/lib/v3/report-model";
const labels: Record<string, string> = {
  full_name: "ชื่อ-นามสกุล",
  gender: "เพศ",
  age: "อายุ (ปี)",
  weight: "น้ำหนัก (กก.)",
  height: "ส่วนสูง (ซม.)",
  education_level: "การศึกษา",
  marital_status: "สถานภาพ",
  has_underlying_disease: "มีโรคประจำตัว",
  underlying_disease_details: "รายละเอียดโรค",
  department: "แผนก",
  position: "ตำแหน่ง",
  position_type: "ประเภทผู้ตอบ",
  working_hours_per_day: "ชั่วโมงต่อวัน",
  working_hours_per_week: "ระยะเวลาต่อสัปดาห์ (หน่วยเดิม)",
  work_experience_years: "อายุงาน (ปี)",
  inspector_name: "ชื่อผู้ตรวจ",
  inspection_location: "สถานที่ตรวจ",
  inspection_date: "วันที่ตรวจ",
  start_time: "เวลาเริ่ม",
  end_time: "เวลาสิ้นสุด",
  equipment: "เครื่องมือ",
  location_desc: "จุดตรวจ",
  measure_value: "ค่าตรวจ",
  min_value: "ค่าต่ำสุด",
  max_value: "ค่าสูงสุด",
  standard_value: "เกณฑ์ที่บันทึก",
  temp_db: "DB (°C)",
  temp_wb: "WB (°C)",
  temp_gt: "GT (°C)",
  temp_wbgt: "WBGT (°C)",
  remark: "หมายเหตุ",
  assessment_category: "หมวด",
};
export function LegacyResult({ data }: { data: StoredRecord }) {
  const m = reportModel(data),
    env = m.type === "environment",
    answers = object(data.answers);
  const layout = object(data.layout_snapshot),
    url = String(layout.download_url ?? "");
  return (
    <main className="flex flex-col gap-4" data-legacy-report>
      <section className="form-section-card p-5">
        <h2 className="font-semibold">ผลการประเมิน</h2>
        <p>แสดงผลตามข้อมูลที่บันทึกไว้</p>
        <p>
          {env ? "ผลตรวจ" : "คะแนนรวม"}:{" "}
          {env
            ? recordedPass(m.revision.is_pass)
            : String(data.overall_score ?? "ไม่มีข้อมูล")}
        </p>
        {!env && (
          <>
            <p>ระดับอาการ: {String(data.overall_level ?? "ไม่มีข้อมูล")}</p>
            <p>ไม่มีข้อมูลคะแนนก่อน–หลัง</p>
          </>
        )}
      </section>
      {Object.entries({
        ข้อมูลผู้ตอบ: data.profile,
        ข้อมูลการทำงาน: data.workInfo,
        ข้อมูลการตรวจ: data.inspectionData,
      }).map(
        ([label, value]) =>
          Object.keys(object(value)).length > 0 && (
            <section className="form-section-card p-5" key={label}>
              <h3 className="font-semibold">{label}</h3>
              <dl>
                {Object.entries(object(value))
                  .filter(
                    ([k]) => !["id", "submission_id", "created_at"].includes(k),
                  )
                  .map(([k, v]) => (
                    <div
                      className="flex flex-wrap justify-between gap-2 border-b py-2"
                      key={k}
                    >
                      <dt>{labels[k] ?? k}</dt>
                      <dd className="break-all">
                        {String(v ?? "ไม่มีข้อมูล")}
                      </dd>
                    </div>
                  ))}
              </dl>
            </section>
          ),
      )}
      {env ? (
        <section className="form-section-card p-5">
          <h3 className="font-semibold">ค่าตรวจและเกณฑ์ที่บันทึก</h3>
          {list(m.revision.points).map((p, i) => (
            <div className="border-b py-3" key={String(p.point_key)}>
              <h4>
                {i + 1}. {String(p.location_desc)}
              </h4>
              <dl>
                {Object.entries({
                  ...object(JSON.parse(String(p.inputs_json ?? "{}"))),
                  ...object(
                    JSON.parse(String(p.standard_snapshot_json ?? "{}")),
                  ),
                })
                  .filter(
                    ([k]) =>
                      ![
                        "point_id",
                        "point_key",
                        "sample_id",
                        "sample_key",
                      ].includes(k),
                  )
                  .map(([k, v]) => (
                    <div key={k} className="break-words">
                      {labels[k] ?? k}: {String(v ?? "ไม่มีข้อมูล")}
                    </div>
                  ))}
              </dl>
            </div>
          ))}
        </section>
      ) : (
        <section className="form-section-card p-5">
          <h3 className="font-semibold">
            รายละเอียดการตอบแบบประเมินอาการทางสุขภาพ (
            {Object.keys(answers).filter((k) => /^q\d+$/.test(k)).length} ข้อ)
          </h3>
          <ul>
            {Object.entries(answers)
              .filter(([k]) => /^q\d+$/.test(k))
              .map(([k, v]) => (
                <li className="border-b py-2" key={k}>
                  ข้อ {k.slice(1)}: {String(v)}
                </li>
              ))}
          </ul>
        </section>
      )}
      {env && (
        <LayoutAttachmentCard
          value={
            url
              ? {
                  fileName: String(layout.file_name || "ผังพื้นที่ห้อง"),
                  fileType: String(
                    layout.file_type || "application/octet-stream",
                  ),
                  fileSize: Number(layout.file_size || 0),
                  fileData: API_BASE_URL.replace(/\/api$/, "") + url,
                  uploadedAt: "",
                }
              : null
          }
          downloadUrl={
            url ? API_BASE_URL.replace(/\/api$/, "") + url : undefined
          }
        />
      )}
      {data.needs_legacy_upgrade === true && (
        <Link
          className="action-button print:hidden"
          href={`/assessment/environment-form?category=${m.category}&supplement=${encodeURIComponent(m.code)}&base=${encodeURIComponent(m.revisionId ?? "")}`}
        >
          เติมข้อมูลประกอบสำหรับการตรวจซ้ำ
        </Link>
      )}
    </main>
  );
}
