# P6 ความพึงพอใจแยกกลุ่ม

วันที่ 14 ตุลาคม 2026 (Asia/Bangkok) · สถานะ: done — P6.1–P6.5 ครบ · ยังไม่ deploy

อ่านร่วมกับ [Plan](./IMPLEMENTATION_PLAN_V3.md), [Field matrix](./FIELD_MATRIX_V3.md), [คำถามจาก Word](./SATISFACTION_QUESTION_UPDATE_V3.md) และ [Progress](./PROGRESS_V3.md)

## สิ่งที่ทำครบ

| Task | Implementation | หลักฐาน |
| --- | --- | --- |
| P6.1 | direct route กลุ่ม environment/health เปิดอิสระ ไม่ต้องทำแบบอื่นก่อน; กลุ่มละ 16 ข้อ/4 ด้านจาก Word ล่าสุด; route/header/back/draft/API แยกกลุ่ม | UI 80 ตัวเลือกคะแนนต่อกลุ่ม; Word comparison 32 ข้อ; Worker เก็บคนละ questionnaire version/snapshot และผลใช้ข้อความที่เก็บ |
| P6.2 | ชื่อผู้ประเมิน required ทั้งสองกลุ่ม; health เพิ่มประเภทผู้ตอบ หลักสูตรจริง 7 รายการ ชั้นปี 1–6 สำหรับบริบทเรียน; บุคลากรเลือกหลักสูตรหรือไม่เกี่ยวข้องอย่างชัดเจน; other ต้องระบุบริบท | select จริง/ปี 6 ของ program-07, staff N/A ไม่มี year, other study/work conditional; persist profile/work/program snapshot อ่านกลับ |
| P6.3 | environment หลังคะแนนมีวัน/ชั่วโมง/นาที/วินาทีของวิธีเดิมและ SafeCheck ให้กรอกเองทั้งสองวิธี ไม่ใช้ timer | 1 วัน 2 ชั่วโมง 3 นาที 4 วินาที = 93,784 วินาทีใน API/หน้า review/result/Excel |
| P6.4 | ทุกช่องที่เกี่ยวข้อง required; rating closed 1–5 ครบ 16; suggestion optional; duration ทุกหน่วย required รวมแต่ละวิธี > 0; แยก blank กับ 0; integer/max hours 23/minutes/seconds 59 | invalid/missing/zero/decimal/range tests, notes ว่างบันทึกเป็น null; เวลาเปลี่ยนไม่กระทบ mean; ผลต่างติดลบแสดงตามจริง |
| P6.5 | typed draft/review/submit/result และ Excel ของ satisfaction ใช้ group/metadata/duration/version/snapshot; correction มีเหตุผลและ data version; legacy unknown อ่านคะแนน cached เดิมโดยไม่เติมคำถาม/metadata/time ใหม่ | group isolation/refresh/network retry/corrupt draft/migration, correction v1 immutable, actual downloaded XLSX เทียบ API, legacy mean เท่าที่ server เก็บ |

## Flow และกติกา

- สุขภาพ: ข้อมูลผู้ประเมิน → คะแนน 16 ข้อ/ข้อเสนอแนะ → ทบทวน → Worker receipt → ผล
- สภาพแวดล้อม: ชื่อผู้ประเมิน → คะแนน 16 ข้อ/ข้อเสนอแนะ → เวลาวิธีเดิมและ SafeCheck → ทบทวน → Worker receipt → ผล
- ไม่เพิ่มน้ำหนัก โรค อายุงาน หรือ hours/week ใน satisfaction-health เพราะไม่ใช่ fields ของแบบนี้ตาม Field matrix
- เปลี่ยนประเภทผู้ตอบ/บริบทแล้วล้าง fields ที่ไม่เกี่ยวข้อง; student/other-study ต้องมีหลักสูตรและชั้นปี, ไม่ส่ง study_year สำหรับ staff/faculty/other-work
- ช่องเวลาเริ่มเป็นว่างทั้งหมด ให้กรอก 0 เองในหน่วยที่ไม่ใช้; 1 วัน = 24 ชั่วโมง และไม่ให้แอปจับเวลา
- จำนวน 46/309 เป็นเป้าหมาย/หมายเหตุเดิม ไม่อยู่ใน contract และไม่มี quota; ทดสอบการส่ง valid ซ้ำหลายงานและตรวจว่าไม่มี count constraint กำหนดเพดานเหล่านี้
- คะแนนคำนวณจาก q1–q16 เท่านั้น; result ใช้ค่า authoritative ที่ Worker เก็บ และคำถาม/ชื่อหลักสูตรจาก snapshot; ผลต่างเวลา = วิธีเดิม − SafeCheck อาจติดลบได้

## ข้อมูลและโค้ด

- `src/lib/v3/satisfaction-form.ts`: typed draft/schema/normalization/respondent+duration validation/payload/server mapping; full form version `satisfaction-form-v3-p6-2026-10-14`
- `src/components/satisfaction/`: แยก respondent/durations, wizard, shared summary และ result/legacy result; `SatisfactionStep` เดิมใช้ชุดคำถามตามกลุ่มและ closed rating enum พร้อม error/aria description
- `useAssessmentForm` และ draft envelope เพิ่ม `satisfactionV3`; identity key เดิมแยก group และ questionnaire version อยู่แล้ว
- ร่างก่อน P6 ที่ใช้ questionnaire เดียวกัน เก็บ rating/suggestion ที่ถูกต้องและชื่อเดิมไว้ แต่เริ่มใหม่ที่ขั้นข้อมูลผู้ประเมิน ไม่ข้าม fields/duration ใหม่; key รุ่นคำถามเก่าไม่ถูกดึงเข้าชุดใหม่
- ร่าง shape เสีย/คะแนนนอก enum ถูก reject อย่างปลอดภัยพร้อมแจ้งสถานะ; partial/0 หน่วยเวลา/back/refresh เก็บได้
- Submit ใช้ central service/create API และล้างเฉพาะ key ของงานนี้เมื่อได้ server receipt; timeout/network/API error เก็บ draft และ idempotency key
- Correction ต้องเปิดจาก data version ล่าสุด ใช้เหตุผลจริง และไม่เปลี่ยน assessment group/รุ่นคำถาม; Worker ยังคง guard questionnaire-version change เป็น NEW_ASSESSMENT_REQUIRED
- Worker/D1 contract, group/profile/work/satisfaction metadata, manual normalized seconds, scoring และ immutable payload versions ทำไว้แล้วใน P2 ใช้เส้นทางนั้นจริงและทดสอบอ่านกลับ ไม่ต้องเพิ่ม migration/API endpoint ใหม่ใน P6

## Result และ Excel

- V3 แสดงชื่อ/ประเภท/หลักสูตร snapshot/ปีเฉพาะ health, 4 dimension means/overall, คะแนนและคำถามทุกข้อ, duration/difference/manual source เฉพาะ environment และ optional suggestion
- ใช้ `?version=` อ่านผลรุ่นเก่า; ปิด correction link เมื่อไม่ใช่ latest/archived/คำถามคนละรุ่น; ไม่มี retest สำหรับ satisfaction
- Legacy แสดง unknown group และ cached mean เดิม ไม่คำนวณ 16 ข้อจากข้อมูลที่มีไม่ครบ; แสดงเฉพาะ ratings ที่เก็บและไม่มีข้อความคำถามใหม่เติมแทน
- `src/lib/v3/satisfaction-export.ts` รับ records แบบเดียวกับ Worker export; workbook มี group/version/name/work/program/year/16 ratings/means/suggestion/manual seconds/negative delta พร้อม dictionary ข้อความ snapshot ของ records ที่ export จริง
- ปุ่ม “ดาวน์โหลด Excel รุ่นนี้” ในผล satisfaction export ข้อมูลของรุ่นที่เลือกโดยตรง; legacy export ใช้ unknown และช่อง metadata/time ที่ขาดเป็น blank ไม่ใช่ 0
- Dashboard export/filter/pagination ที่ครอบคลุมทุกโมดูล และ print layout ทั้งระบบยังเป็น P7; งาน P6 ไม่ถือว่า module เหล่านั้นเสร็จแล้ว

## ผลตรวจรับ

- 7 P6 unit tests ผ่าน: contract/group/rating/version, programs×years/applicability, manual units, score isolation/negative difference, typed draft/old draft migration, actual workbook/legacy unknown
- 11 actual local browser/Worker/D1/R2 scenarios ผ่าน: both complete flows, required/error focus/notes, profile+scores/back/refresh, manual inputs, actual XLSX download, staff/other, network retry, correction/history, API invalid writes, legacy/invalid routes, old/corrupt draft recovery
- Regression P2 API 23 + domain 17 + SQLite 6 + P3 unit 11 + satisfaction source/Word tests 6 ผ่าน
- P4 browser 9 + satisfaction browser/API 5 + P3 browser 11 regression ผ่าน; static build 14/14 ผ่าน
- Typecheck frontend/Worker ผ่าน; lint 0 errors / 97 warnings ที่เหลือจากโค้ดเดิมตามหลักฐานรอบสุดท้าย; ไฟล์ใหม่ P6 ไม่มี warning
- หลักฐาน: [unit](./baseline/p6-unit-tests.json), [browser](./baseline/p6-browser-tests.json), [lint](./baseline/p6-eslint-summary.json), [environment mobile](./baseline/p6-environment-mobile.png), [health desktop](./baseline/p6-health-desktop.png)

คำสั่ง:

```bash
npm run test:p6
npm run test:p6:browser
npm run test:p3
npm run test:satisfaction-questions
npm run test:p2
npm run test:v3
npm run test:satisfaction:browser
npm run typecheck:worker
npm run lint
npm run build
npm run typecheck
```

Browser harness เปิด/ปิด localhost 3034/3035 พร้อม isolated temporary D1/R2; ไม่รัน Next harness หลายตัวหรือ build/tsc พร้อมกัน เพราะ .next generated files ใช้ workspace เดียวกัน

## ส่งต่อ

P7: รวม report/history/dashboard/date filters/Excel/print ทั้งระบบตาม checklist; full bulk export ใช้ Worker pagination และไม่ใช้ shape legacy ที่ไม่ตรง records v3. P8/P9 ยังต้อง UAT/rehearsal/target bindings และ release

ไม่มี requirement decision ค้างเพื่อปิด P6 ไม่มี deploy/remote migration/R2 changes/commit/PR และไม่เริ่ม P7 ในคำสั่งนี้
