# SafeCheck v3 แผนพัฒนาเป็น Phase

ปรับปรุง: 14 ตุลาคม 2026 (Asia/Bangkok)

อ่านคู่กับ [Requirements](./REQUIREMENTS_V3.md) และอัปเดต [Progress](./PROGRESS_V3.md) ทุกครั้งที่ทำงาน แผนนี้ครอบคลุม frontend, Cloudflare Worker, D1, migration, รายงาน และการปล่อยใช้งาน P0 ปิดแล้วตาม [P0 spec](./P0_SPEC_V3.md), [Field matrix](./FIELD_MATRIX_V3.md) และ [Baseline](./BASELINE_P0.md); implementation P1–P6 ปิดแล้วตามรายงานแต่ละ phase และ Progress

## 1. ข้อเสนอการปรับโครงสร้าง

คง Next.js static export, React Hook Form/Zod, Hono และ D1 รวมถึง theme/components ที่ใช้ได้อยู่ ปรับโครงสร้างเฉพาะ domain model, validation, scoring, write API และ report rendering ที่รองรับ requirement ใหม่ไม่พอ ไม่จำเป็นต้องเปลี่ยน stack หรือเขียนแอปทั้งหมดใหม่

| ส่วนปัจจุบัน | สิ่งที่พบจากโค้ด | แนวทาง v3 |
| --- | --- | --- |
| `src/app/page.tsx` และหน้าเลือกหมวด | หน้าแรก 3 ประเภท แต่ละหมวดมีแสง/เสียง/ความร้อน | เหลือ 2 กลุ่มหลัก เพิ่มความพึงพอใจในแต่ละกลุ่ม |
| `src/lib/health-risk-data.ts` / schema | q1–q10 ชุดเดียวต่อหมวด, คะแนนเต็ม 20 | แยกรุ่นคำถาม และ before/after เฉพาะแสง |
| `src/lib/schemas.ts` | field หลายตัว optional; `working_days_per_week` คือวัน | สร้าง field matrix required ทั้งโครงการ ยกเว้นหมายเหตุ/ข้อเสนอแนะ/ความคิดเห็นเพิ่มเติม และเพิ่มชั่วโมง/สัปดาห์คนละ field |
| `src/lib/health-risk-schema.ts` | รวม `Object.values` ทั้ง object | รวมเฉพาะ question IDs ที่กำหนด ป้องกันชั่วโมง/แหล่งเสียงถูกนับคะแนน |
| `src/app/result/page.tsx`, review, export, Worker | คำนวณ/แปลงข้อมูลซ้ำหลายที่; result มีมากกว่า 2,000 บรรทัด | shared domain evaluator + report model; แยก components ตามชนิดงาน |
| `worker/src/routes/submissions.ts` | PATCH ลบ child records แล้วแทนใหม่ ไม่มีประวัติ | แยก create/retest/correction; ห้าม generic PATCH เขียนทับงานตรวจที่มี revision |
| POST submission | เขียนหลาย statement ทีละรายการ และรับ overall score จาก client | validate และคำนวณบน Worker; บันทึกเป็นหน่วยเดียวพร้อมป้องกันส่งซ้ำ |
| Environment submit | ไม่ส่ง overall result ใน payload; result คำนวณเองภายหลัง | Worker เก็บผลสรุป authoritative สำหรับ retest eligibility/dashboard |
| `worker/src/db/schema.sql` | 8 ตาราง ไม่มีรอบตรวจ/ช่วงคำตอบ/กลุ่มความพึงพอใจ | additive schema migration, revision tables และ explicit versions |
| package scripts / Wrangler | migrate คือ execute schema; `migrations_dir` รวม seed/truncate | แยก numbered migrations จาก seed/truncate ให้ชัด |
| `src/hooks/use-assessment.ts` | draft key ยังไม่มี schema version/group; cache สำหรับ edit | versioned draft มี group, mode, code, base revision; validate ตอน restore |
| Submit flow | error บางชนิดยังนำไปผลลัพธ์ผ่าน local storage | แยกบันทึกในเครื่อง/บันทึกสำเร็จบน server; retest สำเร็จเมื่อ server ยืนยัน |
| Satisfaction | 16 คำถาม 4 มิติ ไม่มีผู้ตอบ/group/duration | ใช้แบบเดิมร่วมกัน เพิ่มข้อมูลกลุ่ม ผู้ตอบ และเวลา 2 วิธีเฉพาะ environment |

## 2. ขอบเขตข้อมูลที่เสนอ

ชื่อ field/table ต่อไปนี้เป็นแบบออกแบบ ต้อง freeze ใน P1 ก่อนสร้าง migration จริง

### 2.1 Shared contracts

- แยก `assessment_group: environment | health` ออกจาก `assessment_type: environment | health_risk | satisfaction` ไม่จำเป็นต้องเปลี่ยนค่า `health_risk` ที่จัดเก็บเดิมเพียงเพราะเปลี่ยน label UI
- มี `schema_version`, `questionnaire_version`, `scoring_version`, `standard_version` ที่มีหน้าที่ต่างกัน; legacy version ต้องแยกจาก v3
- ใช้ discriminated unions ของชนิด/หมวด/รุ่น/โหมด เพื่อ validate payload ที่เกี่ยวข้องจริง และ enum 0/1/2 หรือ 1–5 แบบปิด
- สร้าง `shared/` สำหรับ types, catalogs, validation, pure scoring ที่ frontend และ Worker import ได้ ต้องตรวจ TypeScript/build ทั้งสองฝั่ง เพราะ tsconfig ปัจจุบันแยกกัน
- Worker เป็นแหล่งตัดสินผลจริง; frontend ใช้ logic เดียวกันทำ preview และแสดงผล response หลังบันทึก
- response error มี field path และ code ที่ UI ใช้ได้; ห้ามส่งผ่าน `NaN`, infinity, empty-string coercion เป็น 0 โดยไม่ตั้งใจ

### 2.2 สุขภาพ

- เก็บ `program_code`, snapshot ชื่อหลักสูตร, `study_year`, `work_experience_years`, `working_hours_per_day`, `working_hours_per_week` แยกความหมาย; `hours_worked_today` เป็นบริบทสุขภาพแสงโดยเฉพาะ
- คำตอบมี `phase: before | after | single`, question ID, questionnaire version, text snapshot และ score; unique ต่อ submission + phase + question ID
- เก็บ noise sources แยกจาก answers ที่คิดคะแนน ด้วย source code และ other text; validate รายการซ้ำ/ตัวเลือกไม่รู้จัก
- ผลแสงมี totals ก่อน/หลัง, delta, change direction, after level และรายการ delta รายข้อ; noise/heat มี single total/level
- Snapshot คำถามเก่าจาก catalog รุ่นเก่าที่ตรวจสอบได้; ถ้าไม่รู้รุ่นของข้อมูลจริงต้องทำเครื่องหมาย unknown ไม่เอาคำถามใหม่ไปใส่แทน

### 2.3 งานตรวจวัดและรอบตรวจ

- `submissions` ยังคงเป็นรหัสงานเดิม 1 งานต่อ 1 แถว พร้อม `latest_revision_id` และ latest result summary
- เสนอ `environment_revisions`: revision ID, submission ID, revision number, base revision ID, เวลาเกิดรอบ/เวลาบันทึก, schema/scoring/standard versions, ผลรวม และ snapshot metadata
- เสนอ `environment_revision_points`: revision ID, stable point ID, area ID, point order, location snapshot, ค่า raw/ค่าคำนวณ, standard snapshot, pass/fail และข้อมูลที่เกี่ยวข้อง
- Area มีหลายจุดย่อยต่อพื้นที่และผล aggregate ของแต่ละพื้นที่; retest เฉพาะพื้นที่ไม่ผ่านต้องวัดจุดย่อยครบในพื้นที่นั้น; point ID ห้ามใช้ตำแหน่ง array อย่างเดียวในการเทียบรอบ
- Revision 1 มาจากครั้งแรก; revision 2+ ตรวจซ้ำเฉพาะหน่วยไม่ผ่านตาม D11 และ carry จุดผ่านพร้อม measured_at/รอบต้นทางเดิม; เพิ่ม revision ไม่เขียนทับเก่า
- ส่วนที่ล็อก: สถานที่ จุด/จำนวนจุด/ตำแหน่ง เครื่องมือ/serial ข้อมูลปรับเทียบ เทคนิค ภาระงานและเกณฑ์ที่ใช้ รวมถึงผังอ้างอิงของรอบเดิม; เปลี่ยนได้เฉพาะค่าตรวจและวันเวลารอบใหม่ตาม D02
- Metadata ผู้รับผิดชอบ/ผู้ตรวจใน retest ให้ใช้ snapshot เดิมตามขอบเขตล็อก ส่วนข้อมูลผู้บันทึก action เป็น audit metadata แยก ไม่อ้างว่าเป็น identity ที่พิสูจน์แล้วหากยังไม่มี auth
- `measured_at/start/end` เป็นเวลาวัดจริงของรอบ; `created_at` คือเวลาบันทึก server ไม่แทนกัน
- ใช้ R2 เก็บไฟล์ผังและ D1 เก็บ immutable reference/version ที่เปิดย้อนหลังได้ตาม P0 spec ห้ามแก้ layout ปัจจุบันแล้วทำให้รายงานเก่าเปลี่ยน; หลีกเลี่ยงสำเนา base64 ซ้ำทุก revision
- Existing layout API, generic PATCH และ DELETE ต้องเข้าสู่กติกาเดียวกัน มิฉะนั้นจะทำลายประวัติได้แม้ retest API ถูกต้อง
- การเก็บ revision ของแบบสุขภาพ/ความพึงพอใจไม่ใช่ requirement หลักรอบนี้; อย่างน้อยต้องคง questionnaire version และป้องกัน legacy ถูกบันทึกด้วย schema ใหม่โดยผิดรุ่น

### 2.4 ความพึงพอใจ

- ใช้ `assessment_type=satisfaction` และ group แยกสองกลุ่ม; category คง general
- profile ผู้ประเมินต้องอ่าน/เขียนได้สำหรับ satisfaction ด้วย ปัจจุบันบางเส้นทางทำเฉพาะ health risk
- แบบหลักใช้ 16 ข้อ 4 มิติเดิม; environment เพิ่ม `traditional_duration_seconds` และ `safecheck_duration_seconds` พร้อม `duration_source=manual`
- UI รับวัน/ชั่วโมง/นาที/วินาที; 1 วัน = 24 ชั่วโมง, ชั่วโมง 0–23, นาที/วินาที 0–59, วันเป็นจำนวนเต็ม ≥ 0 และรวม > 0
- ไม่รวม duration/profile เข้า mean rating; ถ้าแสดงส่วนต่างเวลา ให้ใช้ข้อมูลที่กรอกและแสดงเครื่องหมายลบได้เมื่อแอปใช้เวลามากกว่า
- Satisfaction ที่ไม่มี group ให้แสดง “ไม่ระบุกลุ่ม” ตาม D18 ไม่แสดงรุ่นโครงสร้างข้อมูล และไม่เดากลุ่มจากชื่อหรือวันที่

## 3. API contract ที่เสนอ

| Endpoint | การเปลี่ยน |
| --- | --- |
| `POST /api/submissions` | รับ v3 discriminated payload, validate required ทั้งโครงการ, คำนวณ server; environment สร้าง revision 1 |
| `POST /api/submissions/:code/retests` | ใหม่ รับ base revision, idempotency key, ค่าตรวจเฉพาะหน่วยไม่ผ่านครบทุกหน่วยและวันเวลารอบใหม่; ไม่รับ metadata ที่ล็อกมาเขียนทับ |
| `GET /api/submissions/:code/revisions` | ใหม่ รายการรอบแบบแบ่งหน้า พร้อมวันเวลา/สถานะ |
| `GET /api/results/:code?revision=<id>` | ไม่ระบุ revision คืนล่าสุด; ระบุแล้วคืน snapshot รอบนั้นและตรวจว่าเป็นของงานเดียวกัน |
| `PATCH /api/submissions/:code` | จำกัดตามชนิด/รุ่น แยกจาก retest; บล็อกการ overwrite revision และตอบ error ชัดเจนแก่ client เก่า |
| `PATCH /api/submissions/:code/layout` | ใช้ immutable R2 file reference; การแก้ต้องเป็น action ที่มีประวัติ ห้ามเปลี่ยนผังของรอบที่ปิดแล้วแบบเงียบ ๆ |
| `DELETE /api/submissions/:code` | เก็บเข้าคลังตาม D12 พร้อม restore; ไม่ cascade ลบ revision/ไฟล์ที่ยังถูกอ้าง |
| dashboard summary/list/export | รับ group/version/revision scope; default ล่าสุดต่อรหัสงาน; export history ต้องเลือกได้ชัดเจน |

เงื่อนไข retest: เป็น environment, latest revision ไม่ผ่าน, base revision ตรงล่าสุด และข้อมูลใหม่ครบ หาก 2 คนส่งจาก base เดียวกัน ให้มีเพียงหนึ่งรายการสำเร็จ อีกคนได้ 409 ให้โหลดใหม่ การเช็คก่อนเขียนอย่างเดียวไม่พอ ต้องมี constraint/atomic write ที่ปิด race และการ retry request เดิมต้องไม่สร้างรอบซ้ำ

เก็บรหัส/ผลลัพธ์ที่ server ส่งกลับเป็นหลัก ไม่ใช้ browser `Date.now()` เป็นฐานอ้างอิง D1 หรือเชื่อ overall score จาก client

## 4. ลำดับ Phase

| Phase | ผลส่งมอบ | Dependency | จุดที่ต้องมีคำตอบ |
| --- | --- | --- | --- |
| P0 | ปิดสเปก, field matrix, ตัวอย่าง scoring/flow และ baseline | เอกสารชุดนี้ | ปิดแล้วตาม P0 spec |
| P1 | shared domain และ migrations ที่ทดสอบ local ได้ | P0 | catalog จริงครบแล้วตาม D09/D10 |
| P2 | Worker API v3 และ revision backend | P1 | กติกา legacy/correction/delete |
| P3 | หน้าแรก/เมนู/wording และ draft infrastructure | P1; integration ใช้ P2 | ไม่มีข้อมูลลูกค้าเพิ่มเติมสำหรับเมนู |
| P4 | แบบประเมินสุขภาพ v3 ครบ 3 หมวด | P2, P3 | หลักสูตร/ชั้นปีครบแล้ว |
| P5 | ตรวจสภาพแวดล้อม v3 และ flow ตรวจซ้ำ | P2, P3 | ปิดแล้วตาม D11–D15/P0 spec |
| P6 | ความพึงพอใจแยก 2 กลุ่ม | P2, P3 | D09/D10/D14 ยืนยันแล้ว |
| P7 | ผลลัพธ์/history/dashboard/print/Excel ครบวงจร | P4, P5, P6 | กติกานับและกรองข้อมูลสรุป |
| P8 | regression, migration rehearsal และ UAT | P7 | ข้อมูลจริง/คำรับรองแบบทดสอบจากเจ้าของงาน |
| P9 | deploy แบบมีจุดตรวจและบันทึก release | P8 | target environment และ readiness ผ่านแล้ว |

เส้นทางหลักคือ P0 → P1 → P2 → P3 → P4/P5/P6 → P7 → P8 → P9 สามโมดูล P4–P6 แยกทำได้หลัง contract เสถียร แต่ไม่จำเป็นต้องใช้หลาย agent; รายชื่อหลักสูตรครบและชั้นปี 1–6 ยืนยันแล้ว ใช้ docs/v3/catalogs/programs.json โดยไม่ต้องถามข้อมูลเดิมซ้ำ

## P0 ปิดข้อกำหนดและวาง baseline

**เป้าหมาย:** มีสเปกที่ทีมเขียนโค้ดได้โดยไม่ต้องเดาความหมายของข้อมูล

- [x] P0.1 ทบทวน R01–R25 กับ D01–D15 และปิด Q02–Q07 ที่กระทบสถาปัตยกรรม
- [x] P0.2 สร้าง field matrix ครบทุกหน้า: ID, label, type, unit, required, applicability, valid zero, N/A, readonly, API/DB mapping รวมผัง; กำหนดหมายเหตุ/ข้อเสนอแนะ/ความคิดเห็นเพิ่มเติมเป็น optional และแยกจากรายละเอียดที่บังคับตามคำตอบ
- [x] P0.3 Freeze wording คำถาม 30 ข้อ, before/after prefix และข้อความผลแสง โดยไม่เปลี่ยนสเกล 0/1/2
- [x] P0.4 สรุปเกณฑ์แสง Spot/Area, แถว catalog, วิธีวัดเสียง/ระยะเวลา/TWA และ WBGT พร้อม worked examples และ expected output
- [x] P0.5 ทำ flow แบบข้อความ/wireframe ที่ใช้ UI เดิม: 2×4 เมนู, tabs ก่อน–หลัง, failed → retest → history, satisfaction 2 กลุ่ม
- [x] P0.6 ตรวจ baseline ด้วย typecheck frontend/worker, ESLint และ build; บันทึก existing failures แยกจาก v3 ไม่ถือว่ายังไม่มี test แล้วผ่านทั้งหมด
- [x] P0.7 ทำรายการ schema/record legacy ที่ต้อง migrate และ policy การแก้คำผิด/ลบ/ไฟล์แนบ โดยยังไม่เปลี่ยนข้อมูลจริง

**พื้นที่งาน:** docs/v3, schema/catalog specifications; ยังไม่เปลี่ยน production behavior

**ผ่าน phase เมื่อ:** คำถามที่กระทบสูตรและ retest มีคำตอบ, field matrix ไม่ขัด D07, baseline มีหลักฐาน, Q01 ได้รับหลักสูตร/ชั้นปีครบแล้ว; หลักฐานครบใน P0_SPEC_V3.md และ BASELINE_P0.md

## P1 Domain model และฐานข้อมูล

**สถานะ: done** — implementation และผลทดสอบอยู่ใน [P1 report](./P1_REPORT_V3.md)

**เป้าหมาย:** frontend/Worker ใช้สัญญาข้อมูลและสูตรชุดเดียวกัน ฐานข้อมูลรองรับ v3 โดยข้อมูลเก่ายังอ่านได้

- [x] P1.1 เพิ่ม shared contracts, catalogs แบบมีรุ่น, validation และ DTO adapters สำหรับ legacy
- [x] P1.2 แยก evaluator สุขภาพ/สภาพแวดล้อม/ความพึงพอใจจาก UI ให้ test ได้ โดย D01 มีทั้ง delta และ after level
- [x] P1.3 เพิ่ม group, version, program/year/hours, metadata เครื่องมือ, period answers, noise sources, manual durations
- [x] P1.4 เพิ่ม revision/point/area schema, carried provenance, latest pointer, file reference/R2 contract, indexes, unique constraints และ idempotency storage
- [x] P1.5 แยก `worker/src/db/migrations/` จาก schema baseline/seed/truncate และปรับ scripts/config ให้ใช้ numbered migrations
- [x] P1.6 สร้าง baseline installation สำหรับ DB ว่าง และ upgrade path สำหรับ DB เดิม; อย่าถือ `CREATE TABLE IF NOT EXISTS` ว่าเพิ่ม column ให้ตารางเก่าได้
- [x] P1.7 ทดสอบ migrate จาก fixture legacy: version 1, unknown group, ค่าขาดหาย และข้อมูลคะแนน 0; ทำ preservation report ก่อน/หลัง
- [x] P1.8 ย้าย catalog จริงจาก docs/v3/catalogs/programs.json เข้าสู่ shared และใช้ชั้นปี 1–6 อิสระจากหลักสูตร; ไม่แทนด้วยชื่อสมมติ

**ไฟล์หลัก:** `src/types/index.ts`, `src/lib/*schema.ts`, `src/lib/*data.ts`, `shared/` ใหม่, `worker/src/types.ts`, `worker/src/db/`, `worker/wrangler.toml`, package scripts และ tsconfig ที่เกี่ยวข้อง

**ทดสอบ/รับงาน:** boundary สุขภาพ 0/6/7/13/14/20, delta ลบ/ศูนย์/บวก, ข้อมูลผิด enum/ไม่ครบ, scoring parity, schema ใหม่/upgrade เดิม และคงค่าที่เก็บเดิมครบ ห้ามแปลงวัน/สัปดาห์เป็นชั่วโมง/สัปดาห์โดยการ rename หรือคูณโดยไม่มีข้อมูลรองรับ

## P2 Cloudflare Worker และ API

**เป้าหมาย:** API บันทึก v3 ได้ครบและรักษากติกาแม้ส่ง request ตรงโดยข้าม frontend

- [x] P2.1 แยก routes ออกจาก service/repository/validation/scoring ลดโค้ด POST/PATCH ซ้ำ
- [x] P2.2 Validate ทุก required field ตาม payload version; ยอมรับหมายเหตุ/ข้อเสนอแนะ/ความคิดเห็นเพิ่มเติมที่ว่างหรือไม่ส่ง field และกำหนด normalization ให้สม่ำเสมอ; response 400 มี paths; score/result คำนวณเองที่ server
- [x] P2.3 บันทึก create ทั้ง header/child/result/revision อย่าง atomic และตอบ code/ID/result ที่แท้จริง; ป้องกัน double submit
- [x] P2.4 สร้าง retest endpoint เฉพาะ failed unit set พร้อม carry ผลเดิม/วันวัดเดิม และ expected/base revision/constraints ป้องกัน concurrent writers
- [x] P2.5 สร้าง latest/history/detail API; stable point mapping และ snapshot ของ metadata/standard/layout
- [x] P2.6 ปิดทาง generic PATCH/layout/delete ที่หลบ revision policy; รักษา legacy read adapter
- [x] P2.7 เก็บ/อ่าน profile และ group ของ satisfaction, duration และ questionnaire versions ได้ครบ
- [x] P2.8 เตรียม query dashboard/export รุ่นใหม่ โดยแยก latest records ออกจาก revision history
- [x] P2.9 ปรับ CORS เป็น origins ของ environment ที่กำหนดจริง; ปิด fallback เดิมที่คืน origin ทุกค่า และบังคับ exact allowlist แล้ว; CORS ไม่ใช่ระบบสิทธิ์ผู้ใช้
- [x] P2.10 เพิ่ม R2 staged upload/download, D1 file metadata และ immutable reference พร้อม orphan cleanup ที่ไม่ลบไฟล์มีผู้อ้าง

**ผลปิด P2:** [P2 report และ API contracts](./P2_REPORT_V3.md) · API 23 scenarios + domain 17 + SQLite 6 + D1 local ผ่าน; ยังไม่ deploy

**ไฟล์หลัก:** `worker/src/routes/submissions.ts`, `results.ts`, `dashboard.ts`, `index.ts`, `types.ts`, services/repositories ใหม่ และ `src/lib/api.ts`

**ทดสอบ/รับงาน:** สร้าง/อ่านครบทุกชนิด, missing required ถูก reject, ส่ง score ปลอมแล้วไม่มีผล, retest งานผ่านถูก reject, แก้ locked metadata ไม่ได้, foreign revision ถูก reject, request ซ้ำได้ผลเดิม, race สำเร็จ 1 รายการ, failure ระหว่างเขียนไม่เหลือ partial records และรอบเก่าไม่เปลี่ยน

## P3 เมนูและโครงสร้างฟอร์มฝั่ง Frontend

**เป้าหมาย:** เมนู/route/draft รองรับโครงสร้างสองกลุ่มโดยคงรูปแบบหน้าตาเดิม

- [x] P3.1 หน้าแรก 2 cards; หน้าย่อยกลุ่มละ 4 เมนู; ปรับ responsive grid, back links, active nav และ empty/error state
- [x] P3.2 ใช้คำประเมินอาการทางสุขภาพทุกจุดที่เป็นชื่อแบบประเมิน; คง internal enum เดิมได้
- [x] P3.3 Route satisfaction ส่ง group ชัดเจน; ลิงก์เก่าที่ไม่มี group ให้เลือกกลุ่มก่อน ไม่เดาเอง
- [x] P3.4 versioned draft key แยก group/type/category/mode/code/base revision; before/after แยกข้อมูลชัด
- [x] P3.5 บันทึกเมื่อเปลี่ยน field อย่างเหมาะสมและตอนเปลี่ยน tab/step; refresh/back แล้วคืน step/tab ได้; cache รุ่นเก่า validate ก่อนใช้
- [x] P3.6 standard required marker, errors/focus/scroll, N/A/none controls และ form submit service กลาง; ช่องหมายเหตุ/ข้อเสนอแนะ/ความคิดเห็นเพิ่มเติมไม่มีเครื่องหมาย required และไม่บังคับเลือกไม่มี
- [x] P3.7 API ล้มเหลวให้คง draft/แจ้งสถานะจริง ไม่ขึ้นว่าส่งสำเร็จบน server; local cache ไม่ override ผลล่าสุดจาก server

**ผลปิด P3:** [รายงานและผลทดสอบ](./P3_REPORT_V3.md) · 11 unit + 11 browser scenarios ผ่าน; form details/payload integrations ส่งต่อ P4–P7; ยังไม่ deploy

**ไฟล์หลัก:** `src/app/page.tsx`, `src/app/assessment/*/page.tsx`, `src/lib/constants.ts`, `src/hooks/use-assessment.ts`, form/layout components และ API adapter

**ทดสอบ/รับงาน:** 8 เส้นทางถูกกลุ่ม, mobile/desktop/back/direct link, draft ไม่รั่วข้ามกลุ่ม/รอบ, error แล้วย้อนกลับแก้ได้ และไม่มีข้อความสำเร็จปลอมเมื่อ server ปฏิเสธ

## P4 สุขภาพแสง เสียง ความร้อน

**ก่อนเริ่มส่วนหลักสูตร/ชั้นปี:** ใช้ catalog จริงที่ได้รับแล้วและชั้นปี select 1–6 แยกจากหลักสูตรตาม D09/D10 ไม่ต้องเตือนขอข้อมูลชุดเดิมอีก

- [x] P4.1 Required profile/work info ทุกช่องที่เกี่ยวข้อง, หลักสูตร/ชั้นปี/อายุงาน และชั่วโมงต่อวัน/สัปดาห์ตาม D04/D07
- [x] P4.2 แสง: ข้อมูลส่วนตัว → งาน/เรียน → คำถามก่อน → คำถามหลัง → review โดยขั้นประเมินมี 2 tabs และ progress ที่ชัดเจน
- [x] P4.3 บังคับตอบก่อนครบก่อนเดินไปหลัง; กลับแก้ได้และเก็บหลังไว้ ไม่ทำข้อมูลหาย; แสดงเวลาเรียน/ทำงานวันนี้แยกจากคะแนน
- [x] P4.4 ตาราง compare รายข้อ/รวมและผลระดับตาม D01; แสดงคู่เพิ่มขึ้นแต่ยังกลุ่มต่ำ และลดลงแต่ยังสูงได้ไม่ขัดกัน
- [x] P4.5 เสียง: multi-select sources ก่อนคำถาม ไม่รวมคะแนน; other required ตามการเลือก; replace คำถามครบ 10 ข้อ
- [x] P4.6 ความร้อน: หัวข้อใหญ่และคำถามใหม่ครบ 10 ข้อ; คง response scale เดิม
- [x] P4.7 Mapping submit/read/review ใช้ questionnaire version และ response ที่ Worker คืนมา; legacy อ่านด้วยชุดเดิม

**ผลปิด P4:** [รายงานและผลทดสอบ](./P4_REPORT_V3.md) · 8 unit + 9 actual local browser/Worker scenarios + P3 regression ผ่าน; compare 6 ตัวอย่างตรง UI/API; ยังไม่ deploy

**ไฟล์หลัก:** health-risk-form page, `profile-step.tsx`, `work-info-step.tsx`, `health-risk-step.tsx`, health catalogs/schema, review components และ report model

**ทดสอบ/รับงาน:** 20 คำตอบแสงไม่เขียนทับกัน, 0 เป็นคำตอบที่ถูกต้อง, sources/hours ไม่รวมคะแนน, ข้อความ/ลำดับตรงภาคผนวก A, คะแนนตัวอย่าง compare ทั้ง 6 แถวตรงกันใน UI/API

## P5 สภาพแวดล้อมและการตรวจซ้ำ

- [x] P5.1 เพิ่ม Serial Number/วันที่ปรับเทียบ/แผนกรับผิดชอบ/ชื่อผู้รับผิดชอบในทั้ง 3 หมวด และ required metadata/ผังตาม field matrix
- [x] P5.2 แสงเลือกเทคนิคก่อนมาตรฐาน; Spot มีจุดตรวจ, Area มีพื้นที่และจุดย่อยตาม D08 ที่ปิดรายละเอียดแล้ว
- [x] P5.3 เสียงเลือกเกณฑ์/ระยะเวลาที่ตรงวิธีวัดจริง แสดงหน่วยและความหมายของค่าที่ใช้ตัดสิน; เก็บค่าประกอบครบสำหรับตรวจสอบย้อนหลัง
- [x] P5.4 ความร้อน validate ค่าและวิธี WBGT/ภาระงาน/วันเวลารอบนั้นตามสเปก; ลด field ซ้ำที่ระบบคำนวณให้
- [x] P5.5 นำ PDF ทั้ง 3 ไปไว้ `public/standards/` แบบชื่อ/รุ่นคงที่ มี catalog metadata, viewer/download fallback และข้อความภาคผนวก B
- [x] P5.6 ใช้ snapshot ล่าสุดเปิด retest form ที่ล็อกข้อมูลตาม D02; กรอกใหม่เฉพาะหน่วยไม่ผ่านตาม D11 และแสดงจุดผ่านเป็น carry read-only; แสดงว่าเป็นการวัดซ้ำครั้งที่เท่าไร
- [x] P5.7 เมื่อ latest เปลี่ยนระหว่างกรอก ให้แจ้ง conflict พร้อมคง draft และโหลดใหม่ ไม่ override รอบผู้อื่น
- [x] P5.8 ข้อมูล legacy ที่ขาด field เดินตาม Q05; แยก corrective edit จาก retest ชัดเจน

**ผลปิด P5:** [รายงานและหลักฐาน](./P5_REPORT_V3.md) · 11 unit + 16 actual local browser/Worker/D1/R2 scenarios + regression/typecheck/lint/build ผ่าน; ยังไม่ deploy

**ไฟล์หลัก:** environment-form page, use-environment-form hook, environment-form adapters, environment wizard/unit editor/summary/result/standards, shared validation, Worker service/repository และ standards assets

**ทดสอบ/รับงาน:** ตรวจแสง/เสียง/ความร้อนครั้งแรกได้; failed → failed → pass มี 3 รอบครบ; metadata/point IDs/standards ไม่เปลี่ยน; Area ค่าเฉลี่ยผ่านแต่ค่าต่ำสุดไม่ผ่านต้องได้ผลตามกติกา; เอกสารมาตรฐานเปิดได้บนมือถือ; request ปลอมแก้ field ที่ล็อกไม่สำเร็จ

## P6 ความพึงพอใจแยกกลุ่ม

- [x] P6.1 ใช้ชุดคำถามแยกสองกลุ่ม กลุ่มละ 16 ข้อตาม [เอกสารล่าสุด](./SATISFACTION_QUESTION_UPDATE_V3.md); catalog/form questions/Worker snapshot/draft versions ทำแล้วในงานแทรกหลัง P4; เชื่อม full flow และชื่อกลุ่มตามเส้นทางจริง
- [x] P6.2 เพิ่มชื่อผู้ประเมินทั้งสองกลุ่ม; health มีประเภทบุคลากร/หลักสูตร/ชั้นปีหรือไม่เกี่ยวข้องตาม field matrix
- [x] P6.3 environment เพิ่มระยะเวลาวิธีเดิมและ SafeCheck หลังส่วนคะแนน ให้กรอกเองทั้งคู่ ไม่เริ่ม timer
- [x] P6.4 บังคับช่องทุกหน่วยและทุกคะแนน; ข้อเสนอแนะ optional เว้นว่างได้; normalize duration วินาทีโดยไม่รวมเข้า rating
- [x] P6.5 review/result/API/cache/export แยก group และรักษา legacy unknown

**ผลปิด P6:** [รายงานและหลักฐาน](./P6_REPORT_V3.md) · 7 unit + 11 actual local browser/Worker/D1/R2 scenarios รวม XLSX download และ regression/typecheck/lint/build ผ่าน; ยังไม่ deploy

**ไฟล์หลัก:** satisfaction page/step/wizard/details/summary/result, satisfaction-form/export adapters, typed draft/useAssessmentForm และ Worker contract/profile/duration mapping เดิมที่ทดสอบ integration แล้ว

**ทดสอบ/รับงาน:** สองกลุ่มใช้ draft แยกกัน; metadata persist; 1 วัน 2 ชั่วโมง 3 นาที 4 วินาที = 93,784 วินาที; ค่า rating ไม่เปลี่ยนตามเวลา; 46/309 ไม่จำกัดการส่ง; group ขาดหายสำหรับ v3 ถูก reject

## P7 ผลลัพธ์ ประวัติ Dashboard และส่งออก

- [x] P7.1 แยก result page เป็น report components ตามโมดูล ลดสูตรซ้ำ ใช้ report view model เดียวกับ review/print/export
- [x] P7.2 แสดงก่อน/หลัง/ผลต่าง/ระดับหลังและอาการรายข้อ, sources, metadata/duration/group ตามชนิดงาน
- [x] P7.3 history 1 แถวต่อ job แสดง latest result/date/revision count และวันที่วัดจริง/แหล่ง revision รายจุด carry; detail เลือกรอบเก่าได้และระบุชัดว่าไม่ใช่ล่าสุด
- [x] P7.4 ปุ่มตรวจซ้ำอยู่เฉพาะงาน environment ล่าสุดที่ไม่ผ่าน; ดู revision เก่าไม่เปิดให้ตรวจจากฐานเก่าโดยไม่โหลดล่าสุด
- [x] P7.5 Dashboard แยกจำนวนงาน จำนวนรอบ และคะแนนความพึงพอใจตามกลุ่ม; unknown legacy มีหมวดของตนเอง; กำหนด date filter ว่าอ้าง latest measurement หรือ created date ให้ตรง label
- [x] P7.6 Excel มี snapshot data, versions, units, scores และ metadata ใหม่; default latest และ option history ที่ไม่ทำให้จำนวนงานเพิ่มผิด
- [x] P7.7 Export ข้อมูลสุขภาพก่อน/หลังเป็นคอลัมน์หรือแถวที่จับคู่ได้ด้วย ID/phase; แบบเก่าไม่แสร้งมี before; satisfaction แยกกลุ่มและระยะเวลา
- [x] P7.8 Export ปริมาณมากใช้ pagination/chunking ตามข้อจำกัด D1/response จริง ไม่รวม IDs ทั้งหมดเป็น IN query เดียวโดยไม่จำกัด
- [x] P7.9 Print/PDF ผ่าน browser แสดงรุ่น/รอบที่เลือก, ตัด controls, ตารางไม่ถูกตัด และมีข้อความมาตรฐานที่ใช้; ไม่ถือว่าต้องแนบทุกหน้า PDF มาตรฐานไปกับทุกฉบับโดยไม่มี requirement

**ไฟล์หลัก:** `src/app/result/page.tsx`, review step, dashboard page/components, `src/lib/excel-export.ts`, Worker results/dashboard, print CSS

**ทดสอบ/รับงาน:** API/UI/print/Excel ของ record เดียวกันตรงกัน; filter/export ชุดเดียวกันจำนวนตรง; รอบเก่าไม่เปลี่ยนเมื่อมีรอบใหม่/เปลี่ยน catalog; Thai text และตารางก่อนหลังอ่านได้บนจอเล็กและกระดาษ

**ผลปิด P7:** [รายงานและหลักฐาน](./P7_REPORT_V3.md) · 10 unit + 14 actual local browser/Worker scenarios และ regression P4/P5/P6 ผ่าน; bulk 104 งาน/13 รอบ, Excel/PDF/filters/versioned reports ครบ; typecheck/lint/static build ผ่าน ยังไม่ deploy และไม่เริ่ม P8

## P8 ตรวจรับรวมและซ้อมย้ายข้อมูล

- [x] P8.1 Unit/contract tests สำหรับ rules ที่มีผลต่อคะแนนและข้อมูล รวม boundary ทุกระดับ/หน่วย/required/zero/N/A
- [x] P8.2 Integration tests Worker+D1: atomic failure, retry/idempotency, stale base, invalid enum, locked metadata, legacy compatibility และ record ownership ของ revision
- [x] P8.3 E2E ครบ 8 entry flows และ failed → failed → pass, refresh/back, direct links, network failure/retry, simultaneous submissions
- [x] P8.4 Rehearse migration ในฐานแยกจากข้อมูลตัวอย่างที่เหมาะสม: ตรวจ count ต่อ table, field preservation, foreign keys, duplicate IDs, latest pointer และ legacy result
- [x] P8.5 ตรวจ required ทุกหน้าโดยส่ง payload ตรง รวมกรณีหมายเหตุ/ข้อเสนอแนะ/ความคิดเห็นเพิ่มเติมว่างหรือไม่ส่ง field แล้วยังบันทึกได้ และรายละเอียดอื่น ๆ/โรคที่จำเป็นตามคำตอบยังถูกบังคับ; ตรวจผลรายงาน/Excel ที่เปิดจากอีก browser ซึ่งไม่มี localStorage
- [x] P8.6 UAT wording/มาตรฐาน/กติกาตรวจซ้ำกับเจ้าของงาน โดยแนบ expected/actual ไม่ใช้แค่ภาพหน้าเว็บ
- [x] P8.7 รัน typecheck frontend+worker, ESLint, production build และชุด test ที่เพิ่ม บันทึก command/ผลจริง
- [x] P8.8 ตรวจ coverage R01–R25 และไม่ติ๊ก complete ถ้า field ใดอยู่เฉพาะ frontend แต่ API/report ยังตกหล่น

**หมายเหตุ tooling:** P0 รัน baseline แล้ว: typecheck/build ผ่าน, ESLint 0 errors/172 warnings; `next lint` ยังรันผ่านแต่ deprecated ในรุ่นติดตั้ง ให้ย้าย script เป็น ESLint CLI ใน P1 โดยคง scope frontend+Worker ดู BASELINE_P0.md; integration/E2E ยังไม่ได้รัน

**ผ่าน phase เมื่อ:** ไม่มี blocker ที่กระทบคะแนน/ข้อมูล/ประวัติ, Q01 catalog จริงครบก่อนเปิดฟอร์มที่ใช้, migration rehearsal ผ่าน และมีหลักฐาน UAT

**ผลปิด P8 (done):** [รายงาน](./P8_REPORT_V3.md) · 181 scenario/checks ผ่าน รวม 455 required rejects/64 optional accepts เป็น subcases, fresh Chromium exports 8 แบบ และ D1 local rehearsal 7 checks; typecheck/lint/build ผ่าน ไม่มี deploy เจ้าของงานยืนยัน [UAT P8.6 expected/actual](./P8_UAT_V3.md) และรับทราบขอบเขตทดสอบแล้วในแชต 14 ตุลาคม 2026; [หลักฐานคำยืนยัน](./baseline/p8-owner-uat.json) Firefox/WebKit not-run เนื่องจากไม่ได้รับอนุญาตให้ติดตั้ง runtime; P9 ยังไม่เริ่ม

## งานปรับหลัง UAT ตาม D17/D18

แผนผัง optional ทั้ง UI/API/DB, เลือกไฟล์และดูตัวอย่างบนเครื่องก่อนทบทวน/ยืนยัน, เพิ่มแผนผังภายหลังได้; รวมหน้าแอปปัจจุบันและเอาตัวกรอง schema/คำว่า v3/รุ่นเดิมออกจาก UI ดู [บันทึกงานปรับ](./POST_UAT_UI_REPORT.md) งานนี้เพิ่ม migration `0005_optional_layout.sql` สำหรับเปลี่ยน constraint โดยรักษาข้อมูลเดิม ต้องรวม migration นี้เมื่อทำ P9; ยังไม่ deploy

## งานคืน UI ตาม D19/D20

คืนตาราง Dashboard/ผลตรวจและ header/navbar ตามสไตล์เดิม โดยใช้ requirement ใหม่; แยก UI/statistics/export ให้ใช้ข้อมูลปัจจุบันเท่านั้น พร้อมสรุปแบบความพึงพอใจสองกลุ่ม × 4 ด้าน ดู [รายงาน](./UI_RESTORE_REPORT.md) ไม่มี schema migration หรือ deploy ในงานนี้

### ตรวจ UI ทุกหน้าหลังคืนตาราง (D21)

- [x] เทียบหัวข้อ/ส่วนประกอบทุก route กับ Git HEAD `c278e1e` และคงข้อเปลี่ยนตาม requirement ปัจจุบัน
- [x] คืนหัวข้อ/การ์ดข้อมูลการตรวจ ส่วนตัว สุขภาพ การปฏิบัติงาน รายละเอียดคำตอบ และข้อเสนอแนะ
- [x] คืนสรุปคะแนนความพึงพอใจ 4 ด้าน และ header/กรอบฟอร์มตามสไตล์เดิม
- [x] แก้ label ไม่มีโรคประจำตัวและปรับข้อความลิงก์เป็น “ประเมินวัดซ้ำ” ตามภาพล่าสุด
- [x] รัน regression 150 scenarios/checks + 13 commands ผ่านและบันทึกผลจริง ดู [รายงานตรวจทุกหน้า](./UI_ALL_PAGES_AUDIT.md); ยังไม่ deploy

## P9 Cloudflare release และส่งต่องาน

- [x] P9.1 ระบุ Pages project, Worker, D1 และ bindings (ไม่เปิด R2 ตาม D60) ของ staging/production จริง; แยก environment ไม่ใช้ค่า development กับ production โดยเผลอ
- [x] P9.2 ตรวจ migration ledger/schema จริงกับแผน; export/บันทึก recovery point และทดสอบวิธีกู้ใน environment แยกก่อน release
- [x] P9.3 ปล่อย additive D1 migration ก่อน แล้ว Worker ที่อ่าน legacy+v3 ได้; ตรวจ API ก่อนเปิด frontend v3
- [x] P9.4 หากการ backfill revision ต้องเห็นข้อมูลนิ่ง ให้ใช้ cutover/write guard ที่กำหนดไว้ เพื่อป้องกัน client เก่าแก้ข้อมูลระหว่างสร้าง snapshot
- [x] P9.5 Build frontend ด้วย API URL ที่ถูกต้องและ deploy Pages; เปิด feature เมื่อ schema/API พร้อม; smoke test ครบ 8 flow และ retest บน target
- [x] P9.6 ตรวจ dashboard/export/history/ไฟล์ PDF, error logs และไม่ให้ log payload สุขภาพเต็มชุดโดยไม่จำเป็น
- [x] P9.7 บันทึก release version, migration IDs, deployment identifiers, smoke evidence และวิธีย้อนกลับใน Progress
- [x] P9.8 rollback ใช้ frontend/Worker รุ่นที่อ่าน schema เพิ่มได้ก่อน ไม่รัน DROP ย้อนอัตโนมัติ; ถ้ามีข้อมูล v3 ใหม่แล้ว ห้าม restore DB ทับโดยไม่จัดการข้อมูลหลัง recovery point

P9 ดำเนินการจริงเมื่อ 16 ตุลาคม 2026 ตามคำอนุญาตในแชต ใช้ D1 อย่างเดียว สำรอง/ตรวจเทียบข้อมูลเดิมครบก่อนเปิดระบบ และทดสอบ Cloudflare staging/production แยกกัน ดู [รายงาน release](./P9_RELEASE_2026-10-16.md)

## 5. หลักการย้ายข้อมูลเก่า

1. เก็บชุดข้อมูลเก่าและ schema จริงไว้ตรวจเทียบ ไม่ล้างฐานเพื่อให้ schema ใหม่ติดตั้งง่าย
2. งาน environment เดิมกลายเป็น revision 1 โดยรักษารหัสงานและ point identity mapping; field ที่ไม่มีข้อมูลให้ระบุ missing legacy ไม่ใช้วันที่วันนี้/serial สมมติ
3. ฟังก์ชัน migration ต้องตรวจ ledger/ข้อกำหนด unique และไม่สร้าง revision 1 ซ้ำเมื่อ resume
4. คำตอบสุขภาพเดิมเป็น `single` ในรุ่นเดิม; ไม่คัดลอกเป็นทั้งก่อนและหลัง เพราะจะสร้างผลต่าง 0 ที่ไม่เคยมีการประเมินจริง
5. คงวัน/สัปดาห์เดิมไว้เป็น legacy และไม่เปลี่ยนหน่วยโดยใช้ชื่อ column เดิม
6. Satisfaction เดิมไม่รู้กลุ่ม/ผู้ตอบ/เวลาใหม่ ให้แสดงไม่มีข้อมูล ไม่ backfill ด้วย 0 หรือค่าที่เดา
7. หากผลรวมเดิมไม่ได้เก็บ ต้องแยก derived legacy result ตามสูตรเดิมจาก result snapshot ที่มีอยู่ และบันทึกที่มาของผลนั้น
8. Old API client ต้องไม่สามารถ overwrite ข้อมูล v3 โดยส่ง payload รุ่นเดิม; ระหว่าง rollout ให้ reject mutation ที่ไม่รองรับพร้อมข้อความให้อัปเดตหน้า
9. เมื่อเปลี่ยน questionnaire/scoring/standard catalog รายงานเดิมยังอ่านด้วย version/snapshot เดิม

## 6. Definition of Done ของแต่ละ Phase

- Task ทุกข้อใน phase มีสถานะและหลักฐาน ไม่ถือว่า scaffold/หน้าจอเสร็จเท่ากับ feature เสร็จ
- Required และ validation ตรงกันระหว่าง frontend/Worker, ข้อมูลบันทึกอ่านกลับและรายงานได้ตามขอบเขต phase
- Test ที่เกี่ยวข้องผ่าน หรือระบุ failure/blocker ชัดเจน; ไม่อ้าง test ที่ไม่ได้รัน
- อัปเดต requirement IDs ที่ส่งมอบใน Progress พร้อมไฟล์ที่เปลี่ยน commit/PR ถ้ามี และสิ่งที่ยังไม่ทำ
- ถ้า dependency ไม่ครบ ให้บันทึก waiting-input และข้ามไปงานอิสระได้ โดยไม่ติ๊กงานนั้น complete

### งานเพิ่มเติม: พักก่อน–หลังและเปิดต่อข้ามเครื่อง (D22) — superseded by D23

- [x] Shared contract แยกร่างที่ก่อนครบ/หลังบางส่วนออกจากผลสำเร็จ
- [x] Worker API/save/read/list/complete พร้อม CAS, idempotency, atomic finalize และ guard กัน submit ปกติชนกับสร้างร่าง
- [x] ปุ่มบันทึกไว้ทำภายหลัง, restore จากระบบ/ร่างบนเครื่อง และ flow เปิดต่อจาก Dashboard พร้อมตารางตามสไตล์เดิม
- [x] ทดสอบ 139 scenarios/checks + 13 commands รวม fresh browser context, partial-after, failure/retry/concurrency, migration และ regressions
- [x] สำรองฐาน local, apply 0006 และยืนยันข้อมูลเดิม 23 ตารางตรงเดิม; ยังไม่ deploy/P9

หลักฐานและรายละเอียด: [รายงานปิดงาน](./HEALTH_BEFORE_AFTER_RESUME_REPORT.md)

### งานเพิ่มเติม: ทำก่อน–หลังให้ครบใน flow เดียว (D23)

- [x] ยกเลิกปุ่มข้าม/บันทึกค้างและตาราง Dashboard รอทำต่อ
- [x] ใช้ API บันทึกผลปกติที่ต้องครบก่อน 10 และหลัง 10 ข้อ
- [x] ปิด API ร่างเดิมด้วย HTTP 410 และไม่เปิดลิงก์ pending เดิม โดยไม่ลบข้อมูล
- [x] ทดสอบกั้นหลัง/ผลสรุปจนตอบครบ และอัปเดต requirement/รายงาน

### งานเพิ่มเติม: ยกเลิกคลัง คงรอบวัดซ้ำ (D24)

- [x] เอาปุ่ม/แบบฟอร์ม/ตัวกรองคลังออกและปิด API เก็บ/คืน/ลบเดิม
- [x] รายการเคยอยู่คลังไม่ถูกซ่อนหรือปิดกั้นการประเมินวัดซ้ำ
- [x] Migration 0007 คง immutable/parent guard และไม่แก้ข้อมูลรอบเดิม สำรอง/apply เฉพาะ local แล้ว
- [x] ทดสอบ API และ browser ตรวจซ้ำ/ประวัติ พร้อมรายงานตามข้อกำหนดปัจจุบัน

### งานเพิ่มเติม: วัดซ้ำ/เติมข้อมูลโดยไม่กรอกเหตุผล (D25) — done

- [x] เอาช่องเหตุผล/preview และ validation บังคับกรอกออกจาก environment correction/supplement
- [x] Client ละ reason; contract ใช้ชื่อการดำเนินการสำหรับ audit โดยคงประวัติและข้อจำกัดการวัด
- [x] P5 browser 16 และ domain/SQLite 23 scenarios ผ่าน พร้อม frontend/Worker typecheck

### งานเพิ่มเติม: ส่งฟอร์มและเปลี่ยนหน้าต่อเนื่อง (D27) — done

- [x] ลบร่างโดยไม่รีเซ็ตหน้าสรุปก่อน navigation และคง busy/lock หลังผลยืนยันสำเร็จ
- [x] Overlay ร่วมกันทั้งสามฟอร์มมีสถานะอัปโหลด/บันทึก/เปิดผล และ keyboard/focus protection
- [x] หน่วง API/ปลายทาง ตรวจไม่กระพริบขั้นแรก/ไม่ส่งซ้ำ พร้อม failure/retry และภาพจริง; browser 48 scenarios ผ่าน

### งานเพิ่มเติม: ปุ่มกระชับและเมนูล่าง (D28) — done

- [x] แก้ CSS height ทับขนาดของ Button และลด size ปุ่มกลาง/แท็บ/action links
- [x] ลดเมนูล่างและจัดปุ่มล้างตัวกรองให้เป็นปุ่มเล็ก
- [x] Browser 35 scenarios ผ่านพร้อมตรวจขนาดจริงสาม viewport/ภาพ และ typecheck/ESLint

## 7. ตัวอย่างคำสั่งให้ทำทีละ Phase

> เริ่ม P1 ตาม docs/v3/IMPLEMENTATION_PLAN_V3.md อ่าน REQUIREMENTS_V3.md และ PROGRESS_V3.md ก่อน ตรวจ dependency ของ P1 ทำเฉพาะงานที่พร้อมพร้อมทดสอบ แล้วอัปเดต Progress ด้วยหลักฐานจริง ใช้รายชื่อหลักสูตรที่ยืนยันแล้วใน docs/v3/catalogs/programs.json และชั้นปี 1–6 ตาม P0 spec ห้ามใส่ชื่อสมมติเป็นข้อมูลจริง

> ต่อ P5 จากงานล่าสุดใน PROGRESS_V3.md ทำ frontend และเชื่อม Worker ตาม contract ที่ตกลง ทดสอบตรวจซ้ำและ locked fields ให้ครบ และบันทึกงานที่เสร็จ/ค้างโดยยังไม่ deploy

> ตรวจรับ P8 เทียบ R01–R25 รายงานจุดไม่ครบ พร้อมไฟล์/ขั้นตอนทำซ้ำ และอัปเดตสถานะตามหลักฐาน

## 8. อ้างอิง Cloudflare สำหรับการลงมือ

- ใช้ไฟล์ migration มีลำดับและ ledger แยกจาก seed/truncate ตาม [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/); ตรวจว่าคำสั่งที่ใช้รองรับ Wrangler ที่ติดตั้งจริงก่อนเปลี่ยน scripts
- ตรวจ API และ atomic batch behavior ที่ [D1 Database API](https://developers.cloudflare.com/d1/worker-api/d1-database/) และทดสอบ failure/race บน D1 local/staging จริงก่อนรับงาน
- แผนสำรอง/กู้ต้องตรวจสิทธิ์และระยะเวลาที่ใช้ได้ของบัญชีจริงจาก [D1 Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/); การ restore ทับฐานอาจทำให้ข้อมูลหลังจุดกู้หาย จึงไม่ใช้แทน rollback application โดยอัตโนมัติ
