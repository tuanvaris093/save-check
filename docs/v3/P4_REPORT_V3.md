# P4 สุขภาพแสง เสียง ความร้อน

วันที่ 12 ตุลาคม 2026 · **P4.1–P4.7 done** · ไม่มี deploy / remote migration / remote writes

## สิ่งที่ทำเสร็จ

- ฟอร์มสุขภาพใช้ profile/work/context/answers v3 และ validation ชุดเดียวกับ Worker; แยกจากฟอร์มเก่าที่ใช้สำหรับ legacy และโมดูลที่รอ P5/P6
- ข้อมูลส่วนตัว required ทุกช่อง: ชื่อ เพศ อายุ น้ำหนัก ส่วนสูง การศึกษา สถานภาพ และเลือกมี/ไม่มีโรคโดยไม่ตอบให้เอง; รายละเอียดโรคบังคับเมื่อเลือกมี และล้าง/ส่ง null เมื่อเลือกไม่มี
- หลักสูตรใช้ชื่อเต็มทั้ง 7 รายการจริงจาก shared catalog; ชั้นปีเป็น select 1–6 แยกอิสระทุกหลักสูตร รวม ปวส.; บุคลากรเลือก “ไม่เกี่ยวข้อง” ได้
- นักศึกษา/อื่น ๆ บริบทเรียนใช้อย่างเดียวคือชั้นปี; บุคลากร/อาจารย์/อื่น ๆ บริบทงานใช้อายุงาน โดย 0 ปีเป็นคำตอบจริง; เวลาเฉลี่ยเป็นชั่วโมง/วันและชั่วโมง/สัปดาห์ ไม่ใช่วัน/สัปดาห์; hidden fields ไม่ปะปนใน payload
- แสงมี 4 wizard steps (ส่วนตัว → งาน/เรียน → คำถามสอง tabs → review); คำถามก่อนและหลังอย่างละ 10 ข้อ แยกชุดข้อมูล; ต้องตอบก่อนครบและระบุเวลาวันนี้ก่อนเปิดหลัง กลับแก้ก่อนแล้วหลังยังอยู่; refresh คืนแท็บ/step
- ชั่วโมงที่ปฏิบัติงาน/เรียนวันนี้ required 0–24; 0 ใช้ได้และไม่รวมคะแนนอาการ
- Review แสงแสดงคะแนนก่อน/หลัง ผลต่างหลัง−ก่อน รายข้อทั้ง 10 และระดับจากคะแนนหลัง 0–6 / 7–13 / 14–20 แยกจากทิศทางคะแนน ไม่ใช้คะแนนรวมเต็ม 40
- เสียงมีแหล่งเสียง 8 ตัวเลือกตามภาคผนวก A + “ไม่ได้สัมผัสเสียงดังจากแหล่งข้างต้น”; เลือกหลายข้อได้ แต่ none อยู่ร่วมกับข้ออื่นไม่ได้; อื่น ๆ ต้องระบุ; sources ไม่รวมคะแนนและไม่ทำให้ข้ามคำถามอาการ
- เสียงและความร้อนใช้คำถามใหม่ครบ 10 ข้อจาก frozen shared questionnaire; หัวข้อชัดเจน/ตัวหนา และ scale 0 ไม่เคย / 1 บางครั้ง / 2 เป็นประจำ
- บันทึก healthV3 draft พร้อม questionnaire_version; ไม่ตีความคำตอบแบบเก่า/flat single เป็นแสงก่อน–หลัง; ระหว่างกรอกบันทึกทุกการเปลี่ยนค่าและใช้ request key เดิมเมื่อลองส่งใหม่
- Submit ส่ง schema 3/typed payload ที่ normalize แล้ว ไม่มี score/level จาก client; failure คงร่าง; สำเร็จใช้ code ที่ Worker ยืนยันแล้วอ่านผล server
- หน้าผลสุขภาพ v3 ใช้ result, questions/program labels และ questionnaire version จาก immutable server snapshots; ไม่คำนวณคะแนนทับ server หรือใช้ชุดคำถามปัจจุบันแทนข้อมูลเก่า; รองรับ query version และอ่าน legacy ด้วยแบบเดิม

## ไฟล์และ flow

| ส่วน | ไฟล์ |
| --- | --- |
| Health wizard | src/app/assessment/health-risk-form/page.tsx |
| Profile/work/questions/tabs/sources | src/components/health/health-steps.tsx |
| Review/compare | src/components/health/health-summary.tsx |
| Server result display | src/components/health/health-result.tsx + src/app/result/page.tsx |
| Normalization/typed payload | src/lib/v3/health-form.ts |
| Versioned draft extension | src/lib/v3/draft.ts + src/lib/schemas.ts |
| Selected result version | src/lib/api.ts |
| Tests | scripts/test-p4.mjs, scripts/test-p4-browser.mjs |

Shared contracts/catalogs/evaluators และ Worker API/D1 migrations จาก P1/P2 ใช้ต่อได้ ไม่มี migration ใหม่ใน P4 ร่าง P3 ที่เป็น flat answers ไม่ถูกย้ายเป็น before/after โดยอัตโนมัติ; healthV3 ใหม่แยกชื่อข้อมูลและ validate questionnaire version ก่อน restore

ผล review ระบุว่าเป็นผลตรวจทานและยังไม่บันทึก ส่วนผลหลัง submit อ่านจาก API โดยเฉพาะ program not_applicable มี snapshot label=null ตาม contract และ UI แสดง “ไม่เกี่ยวข้อง” จาก code ที่ผู้ตอบเลือกจริง

การแก้ไขรายการเดิมแบบ correction/reason/version ยังเป็นงาน P7 และเปิดพร้อม health create ไม่ได้; legacy read ใช้ชุดเดิม ไม่มีการนำคำตอบเดิมไปสร้างก่อน/หลัง

## ผลทดสอบจริง

| คำสั่ง | ผล |
| --- | --- |
| npm run test:p4 | 8 tests ผ่าน: required/blank≠0, disease, 7×6 program/year combinations, respondent contexts, 20 answers, noise/heat, server draft/version และ snapshot display |
| npm run test:p4:browser | 9 scenarios ผ่านกับ Chromium → Next.js → Worker/workerd → D1/R2 local จริง; มี mock 409 เฉพาะกรณี failure; clean FK/0 page errors |
| P3 browser regression (รันต่อใน P4 runner) | 11 scenarios ผ่าน; ปรับ test profile ให้กรอก fields required ใหม่ |
| npm run test:p3 | 11 unit tests ผ่าน |
| npm run test:v3 | 17 domain + 6 SQLite migration tests ผ่าน |
| npm run typecheck / typecheck:worker | ผ่าน |
| npm run build | ผ่าน 14/14 static pages |
| ESLint src worker/src shared scripts | 0 errors / 104 warnings เดิม (P3 108); health components/helpers/tests ใหม่ 0 warnings |

Browser integration ยืนยัน profile ทุก field, conditional disease, 7 หลักสูตรและปี 1–6, ก่อนครบก่อนเปิดหลัง, เวลา 0 ชั่วโมง, after ไม่หายเมื่อกลับ before/refresh, failure คง 20 answers/key, retry แล้วได้จริง 20 D1 rows, บุคลากร N/A/0 อายุงาน, sources none/other, health heat 0 คะแนน, legacy read และ desktop layout

ตาราง compare ทั้ง 6 ตัวอย่างตรวจ UI/API และคะแนนรายข้อ:

| ก่อน | หลัง | ผลต่าง | ระดับจากหลัง |
| ---: | ---: | ---: | --- |
| 2 | 4 | +2 | ต่ำ |
| 6 | 8 | +2 | ปานกลาง |
| 12 | 14 | +2 | สูง |
| 8 | 8 | 0 | ปานกลาง |
| 18 | 16 | −2 | สูง |
| 0 | 0 | 0 | ต่ำ |

หลักฐาน: [unit](./baseline/p4-unit-tests.json), [browser integration](./baseline/p4-browser-tests.json), [lint](./baseline/p4-eslint-summary.json), [review แสงมือถือ](./baseline/p4-light-review-mobile.png), [ผลจาก server desktop](./baseline/p4-light-result-desktop.png)

Runner เริ่ม/หยุด Next.js และ Worker local เอง ใช้ DB fixture ใน temp และ override NEXT_PUBLIC_API_BASE_URL เป็น localhost เพื่อไม่ใช้ backend จริง; อย่ารัน production build ขณะ browser runner ทำงานเพราะใช้ .next ร่วมกัน Playwright ต้องติดตั้งบนเครื่องหรือกำหนด PLAYWRIGHT_MODULE_PATH

ยังไม่ทดสอบ UAT/production account หรือ dashboard/Excel ทั้งชุด (P7/P8); environment/satisfaction payload integrations ยังอยู่ P5/P6 ไม่มีข้อมูลลูกค้าที่บล็อก P4 งานถัดไป **P5 สภาพแวดล้อมและการตรวจซ้ำ**
