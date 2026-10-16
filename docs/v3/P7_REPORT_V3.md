# P7 รายงาน ประวัติ Dashboard และส่งออก

วันที่: 14 ตุลาคม 2026 (Asia/Bangkok)
สถานะ: done — P7.1–P7.9 ครบ พร้อมผลทดสอบในเครื่อง ยังไม่ deploy

อ้างอิง [แผน v3](./IMPLEMENTATION_PLAN_V3.md) · [Requirements](./REQUIREMENTS_V3.md) · [Progress](./PROGRESS_V3.md)

## สิ่งที่ปรับ

| Task | ผลส่งมอบ |
| --- | --- |
| P7.1 | `/result` เหลือ loader/dispatch แยก environment, health, satisfaction และ legacy; ตัดสูตรเก่าและการแก้/ลบแบบ overwrite ออกจากหน้าผล ใช้ summary เดียวกับ review ของแต่ละโมดูลและ stored result ของ API; report model กลางใช้กับหัวรายงานและ Excel |
| P7.2 | สุขภาพแสง: ก่อน/หลัง/ผลต่าง/ระดับจากคะแนนหลัง/คำตอบรายข้อ พร้อมข้อความของ phase ที่บันทึกจริง; สุขภาพทุกหมวดมีชื่อ หลักสูตร ชั้นปีหรืออายุงาน ชั่วโมงต่อวัน/สัปดาห์ และแหล่งเสียง/ชั่วโมงวันนี้ที่ไม่รวมคะแนน |
| P7.3 | ดูประวัติรอบหรือรุ่นข้อมูลแบบแบ่งหน้า 20 รายการ; ระบุชนิดรอบ วันวัด/บันทึก รุ่นที่เลือก/latest/history และ revision ID; ค่าคงเดิมแสดง measured_at กับ carried_from_revision_id จริง |
| P7.4 | ตรวจซ้ำแสดงเฉพาะงานสภาพแวดล้อมรุ่นล่าสุดที่ไม่ผ่านและไม่อยู่ในคลัง; รอบเก่าไม่มีปุ่มตรวจซ้ำ; เก็บเข้าคลัง/คืนรายการพร้อมเหตุผลโดยรักษาผลและประวัติ |
| P7.5 | Dashboard/API/filter/export ใช้เงื่อนไขชุดเดียวกัน: type/category/group/schema/archive/search/date/order; 1 แถวต่อรหัสงานพร้อมผลล่าสุดและจำนวนรอบ; แยก KPI จำนวนงานกับรอบ และค่าเฉลี่ย satisfaction environment/health/unknown; Worker aggregate ด้วย SQL |
| P7.6 | Excel รายการงาน/รอบ/ค่าตรวจ/จุดย่อยและช่วง WBGT/สุขภาพ/คำตอบ/metadata/full snapshot พร้อม version, units, threshold, actual date, carry source และค่าเต็มความละเอียด; ส่งออกรายงานรุ่นที่กำลังดูได้ |
| P7.7 | คำตอบสุขภาพแยก question ID กับ phase `before`/`after`/`single`; legacy ใช้ `legacy_single` ไม่สร้างคะแนนก่อนขึ้นมา; satisfaction เก็บกลุ่ม/ชุดคำถามที่บันทึก/4 means/manual seconds/difference/source และ legacy unknown ใช้คะแนนเดิม |
| P7.8 | Bulk collector ไล่ทุกหน้างานและหน้ารอบตรวจอย่างต่อเนื่อง; ใช้ exact submission_code ตอนอ่านรอบเพิ่ม ไม่มี IN ของ ID จำนวนมาก; ตรวจจำนวน/ซ้ำ/รุ่นที่เปลี่ยน/หน้าหายก่อนดาวน์โหลด; จำกัด 100 records ต่อหน้าและ JSON ของ records 4 MiB แล้วลด batch และเริ่มอ่านใหม่เมื่อเกิน |
| P7.9 | A4 print/PDF ใช้รุ่นที่กำลังดูพร้อม code/version/scoring/standard/threshold; ซ่อน controls/navigation/history/iframe; หัวตารางซ้ำและแต่ละแถวไม่ถูกตัดกลาง; แสดงมาตรฐานของ snapshot ไม่ติดป้ายรุ่น catalog ใหม่กับผลเก่า และไม่พ่วงทุกหน้า PDF มาตรฐาน |

## กติกาวันที่และขอบเขต Excel

- Default วันกรอง/เรียงเป็น **วันตรวจล่าสุด** ของงานสภาพแวดล้อม (`latest_measured_at` จาก start_at ของ revision ล่าสุด) หรือวันส่งแบบสอบถาม; อีกตัวเลือกคือ **วันสร้างงาน** ทั้งสองอย่างใช้วันตาม UTC+7 และแสดงชื่อชัดเจน
- วันวัดของจุดที่ carry ยังเป็นวันเดิม ไม่เปลี่ยนตามวันตรวจรอบใหม่ ส่วนการ correction มีเวลาบันทึกและชนิดรอบในประวัติ แยกจากเวลาวัดจริง
- Dashboard ส่งออกค่าเริ่มต้น `latest` หนึ่งผลล่าสุดต่อรหัส; `history` คือ **ทุกรอบสภาพแวดล้อม + แบบสอบถามรุ่นล่าสุด** หากต้องการ health/satisfaction รุ่นเก่าให้เลือกประวัติแล้วส่งออกจากหน้าผลรุ่นนั้น
- ชีต `รายการงาน` นับหนึ่งแถวต่อรหัส แม้ส่งออก 13 รอบของงานเดียวกัน ส่วน `รอบตรวจ` มี 13 แถว มีคอลัมน์บอกจำนวนรอบที่อยู่ในชุดส่งออก จึงไม่ใช้แทนจำนวนรอบทั้งหมดของฐานเมื่อส่งออก latest
- Full JSON snapshot แบ่งส่วนไม่เกิน 30,000 UTF-16 code units ต่อเซลล์ ไม่ผ่าคู่ surrogate และต่อกลับได้ตามรหัส/รุ่น/ส่วน ส่วนข้อความที่ยาวเกิน Excel 32,767 ตัวในคอลัมน์อ่านง่ายมีป้ายให้ดู full snapshot แทนการทำให้ XLSX เขียนไม่สำเร็จ
- การส่งออกหลาย request ไม่ใช่ transaction ของทั้งฐานในเวลาหนึ่งจุด; ตรวจความเปลี่ยนแปลงของจำนวน/รุ่น/หน้าที่อ่านได้แล้วแจ้งให้เริ่มใหม่เมื่อพบ แทนการดาวน์โหลดข้อมูลไม่ครบ
- Legacy ไม่มีการเดาหลักสูตร วันเวลา แหล่งคำถาม กลุ่ม satisfaction หรือก่อน–หลังเพิ่มเติม; คงค่า 0 และคะแนนเดิมได้

## ผลทดสอบ

| Command / งาน | ผล |
| --- | --- |
| `npm run test:p7` | 10 ผ่าน: stored version/wording, paired phases, legacy, job/revision counts, carry/Area, long Unicode snapshot และ actual XLSX roundtrip, >100 mock jobs, >10 revisions, incomplete/concurrent response rejection, byte-limit/adaptive batches |
| `npm run test:p7:browser` | 14 ผ่าน: actual Chromium → isolated Worker/D1/R2, ทุกโมดูล, selected/history/correction, XLSX ตรง API, 104 งาน/13 รอบ, date/group/archive filters, required archive reason/restore, errors/retry, print/PDF, 0 page errors/foreign-key violations |
| `npm run test:p2` | 23 API integration ผ่าน |
| `npm run test:v3` | 17 domain + 6 SQLite/migration ผ่าน |
| `npm run test:p3` | 11 unit ผ่าน |
| `npm run test:satisfaction-questions` | 6 ผ่าน คำถามตรง Word 32 ข้อและ snapshot wording |
| `npm run test:p5` / `npm run test:p6` | 11 / 7 unit ผ่าน |
| `npm run test:p4:browser` | 9 actual health + 11 P3 browser regression ผ่าน รวม legacy single และ 6 ตัวอย่างผลต่าง/ระดับ |
| `npm run test:p5:browser` | 16 ผ่าน รวม 3-round retest/heat carry/correction/stale base/legacy supplement |
| `npm run test:p6:browser` | 11 ผ่าน รวม real downloaded XLSX, 93,784 seconds/negative difference, correction/old snapshots/drafts/required fields |
| `npm run typecheck`, `npm run typecheck:worker`, `npm run lint`, `npm run build` | ผ่าน: frontend/Worker types, lint 0 errors / 74 warnings เดิม (จาก 97 ก่อน P7), static 14/14; result first load 167 kB และ dashboard 128 kB |
| PDF visual QA | Render ด้วย Poppler และตรวจภาพครบ 5 หน้า: health 2 / environment 2 / satisfaction 1, A4, ภาษาไทย/ตาราง/หัวตารางซ้ำ/ขอบตาราง/บล็อกมาตรฐานครบ ไม่มี controls หรือ iframe |

Harness ใช้ข้อมูลสมมติใน D1/R2 ชั่วคราวและ localhost เท่านั้น ไม่เชื่อมฐานหรือ storage จริง แยก `.next-test-p4` ถึง `.next-test-p7` ด้วย `SAFECHECK_TEST_DIST_DIR` เพื่อไม่เขียนทับ cache ของแอปที่เปิดอยู่; รัน harness/build ตามลำดับ

หลักฐาน: [unit](./baseline/p7-unit.json) · [browser](./baseline/p7-browser.json) · [PDF QA](./baseline/p7-pdf.json) · [มือถือ](./baseline/p7-dashboard-mobile.png) · [desktop](./baseline/p7-dashboard-desktop.png)

ตัวอย่าง PDF เป็นข้อมูลทดสอบสำหรับ QA เท่านั้น: [สุขภาพ](./baseline/p7-health.pdf) · [สภาพแวดล้อมรอบเก่า](./baseline/p7-environment.pdf) · [ความพึงพอใจรุ่นเก่า](./baseline/p7-satisfaction.pdf)

## ไฟล์หลักและ API

- `src/app/result/page.tsx`, `src/components/reports/*`, result/summary ของ health/environment/satisfaction และ print CSS
- `src/app/dashboard/page.tsx`, `src/components/dashboard/assessment-data-table.tsx`, `src/lib/api.ts`
- `src/lib/v3/report-model.ts`, `report-export.ts`, `bulk-export.ts` ใช้ satisfaction workbook adapter ของ P6; legacy `excel-export.ts` ยังเก็บไว้เพื่อ compatibility แต่ Dashboard/หน้าผล v3 ใช้ pipeline ใหม่
- Worker `services/dashboard-service.ts` และ `repositories/assessment-repository.ts`; list เพิ่ม latest measurement/kind/pass และ result environment เพิ่ม measured_at/created_at ใน revision DTO โดยไม่แก้ immutable storage
- Query ที่เพิ่ม: `date_basis=latest_measurement|created`, `submission_code` exact match; list คืน flat page/limit/total/total_pages ตาม Worker contract; export คืน records/next_page/revision_pages ไม่ใช่ maps ของระบบเก่า
- ไม่มี migration ใหม่ ไม่เปลี่ยนสูตรคะแนนหรือมาตรฐาน shared domain ไม่ deploy, ไม่ remote migration/R2, ไม่ commit/PR

## ส่งต่อ P8

ไม่มี requirement decision ค้างของ P7; P8 ยังไม่เริ่ม ต้องตรวจรับรวม/migration rehearsal/UAT ตาม checklist และเตรียม target release ใน P9 หลังตรวจรับ ผ่าน Safari/Firefox/การพิมพ์จริงและชุดข้อมูลเหมาะสมในขั้นตรวจรับตามแผน
