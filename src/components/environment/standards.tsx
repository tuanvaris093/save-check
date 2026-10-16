"use client";
import { Lightbulb, FileText } from "lucide-react";
import { SummaryHeading } from "@/components/reports/summary-details";
import { STANDARD_DOCUMENTS, STANDARD_VERSIONS } from "../../../shared/v3";
import type { Category } from "@/lib/v3/environment-form";
export const STANDARD_GUIDANCE = {
  light:
    "ควรตรวจสอบจำนวน ตำแหน่ง และสภาพของแหล่งกำเนิดแสง รวมถึงสิ่งกีดขวางแสง และดำเนินการปรับปรุงให้ระดับความส่องสว่างเป็นไปตามเกณฑ์ จากนั้นตรวจวัดซ้ำหลังการปรับปรุง",
  noise:
    "ควรตรวจสอบแหล่งกำเนิดเสียง ตำแหน่ง และสภาพของอุปกรณ์หรือเครื่องจักรที่ก่อให้เกิดเสียง รวมถึงสิ่งกีดขวางหรือปัจจัยที่ส่งผลต่อการกระจายเสียง และดำเนินการปรับปรุงเพื่อลดระดับเสียงให้อยู่ในเกณฑ์ จากนั้นตรวจวัดระดับเสียงซ้ำหลังการปรับปรุง",
  heat: "ควรตรวจสอบแหล่งกำเนิดความร้อน ตำแหน่ง และสภาพของอุปกรณ์หรือกระบวนการที่ก่อให้เกิดความร้อน รวมถึงระบบระบายอากาศและสิ่งกีดขวางการถ่ายเทความร้อน และดำเนินการปรับปรุงเพื่อลดความร้อนให้อยู่ในเกณฑ์ จากนั้นตรวจวัดระดับความร้อนซ้ำหลังการปรับปรุง",
};
export function Standards({
  category,
  isPass,
  failedCount,
  isArea = false,
  snapshot,
}: {
  category: Category;
  isPass?: boolean;
  failedCount?: number;
  isArea?: boolean;
  snapshot?: { version: string; document: string };
}) {
  const doc = STANDARD_DOCUMENTS[category];
  const verified =
    !snapshot ||
    (snapshot.version === STANDARD_VERSIONS[category] &&
      snapshot.document === doc.file);
  const url = "/standards/" + doc.public_file;
  const originalAdvice =
    isPass === undefined
      ? ""
      : isPass
        ? category === "light"
          ? `ระดับแสงสว่างทุก${isArea ? "พื้นที่" : "จุด"}ตรวจวัดผ่านเกณฑ์มาตรฐาน ควรรักษาระดับแสงสว่างให้เพียงพออย่างต่อเนื่อง`
          : category === "noise"
            ? "ระดับเสียงภาพรวมผ่านเกณฑ์มาตรฐาน ควรรักษาสภาพแวดล้อมให้คงเดิม"
            : "ระดับความร้อนทุกจุดตรวจวัดอยู่ในเกณฑ์ปลอดภัย"
        : category === "light"
          ? failedCount !== undefined
            ? `พบ${isArea ? "พื้นที่" : "จุด"}ตรวจวัดที่ไม่ผ่านเกณฑ์มาตรฐานจำนวน ${failedCount} ${isArea ? "พื้นที่" : "จุด"} ควรเพิ่มหลอดไฟหรือจัดแสงสว่างในพื้นที่ดังกล่าว`
            : "ระดับแสงสว่างต่ำกว่ามาตรฐาน ควรเพิ่มหลอดไฟหรือจัดแสงสว่างในพื้นที่"
          : category === "noise"
            ? "ระดับเสียงภาพรวมเกินมาตรฐานที่กำหนด ควรจัดหาอุปกรณ์ป้องกันเสียง (PPE) ให้พนักงานหรือลดแหล่งกำเนิดเสียง"
            : "ระดับความร้อนเกินมาตรฐาน ควรจัดเวลาพักหรือเพิ่มการระบายอากาศในพื้นที่ทำงาน";
  return (
    <section className="form-section-card p-5" aria-label="เอกสารมาตรฐาน">
      <SummaryHeading icon={Lightbulb}>คำแนะนำ</SummaryHeading>
      <p
        className="text-small text-text-secondary bg-muted rounded-md p-3 break-words"
        data-environment-guidance
      >
        {originalAdvice ? `${originalAdvice} ` : ""}
        {STANDARD_GUIDANCE[category]}
      </p>
      <div className="mt-5">
        <SummaryHeading icon={FileText}>
          {verified ? doc.title : snapshot?.document}
        </SummaryHeading>
      </div>
      {verified && (
        <div className="flex flex-wrap gap-3 print:hidden">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="border-primary/20 bg-primary/5 text-primary inline-flex min-h-11 items-center rounded-xl border px-4 py-2"
          >
            เปิดเอกสารมาตรฐาน
          </a>
          <a
            href={url}
            download
            className="border-primary/20 bg-primary/5 text-primary inline-flex min-h-11 items-center rounded-xl border px-4 py-2"
          >
            ดาวน์โหลด PDF
          </a>
        </div>
      )}
    </section>
  );
}
