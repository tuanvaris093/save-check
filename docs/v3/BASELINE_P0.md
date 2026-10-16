# SafeCheck v3 ผลตรวจ baseline P0

ตรวจวันที่ 12 ตุลาคม 2026 (Asia/Bangkok) ก่อนแก้ application code

Git HEAD: `c278e1eb25131e205778638c8653daacd1bc6084`

รุ่นที่ติดตั้งจริง: Node v22.23.0, Next.js 15.5.19, TypeScript 5.9.3, ESLint 9.39.4. เป็นรุ่นจาก node_modules ของ workspace ไม่ใช่การเดาจากช่วง version ใน package.json

## ผลคำสั่งที่รันจริง

| การตรวจ | คำสั่งจาก root | Exit | ผล |
| --- | --- | ---: | --- |
| Frontend TypeScript | `./node_modules/.bin/tsc --noEmit --incremental false` | 0 | ผ่าน |
| Worker TypeScript | `./node_modules/.bin/tsc --noEmit -p worker/tsconfig.json` | 0 | ผ่าน |
| ESLint ครอบคลุม frontend+Worker | `./node_modules/.bin/eslint src worker/src --format json --output-file /private/tmp/save-check-v3-eslint.json` | 0 | 71 files, 0 errors, 172 warnings |
| Lint script ปัจจุบัน | `npm run lint` | 0 | ผ่านพร้อม warnings; next lint แจ้ง deprecated แต่ยังทำงานในรุ่นที่ติดตั้ง |
| Production static build | `npm run build` | 0 | compiled, type validation และ generate 14/14 static pages ผ่าน; export ผ่าน |
| Schema+seed fixture | Python sqlite3 in-memory; executescript schema.sql แล้ว seed.sql, เปิด foreign_keys | 0 | สร้าง 8 ตาราง/seed ได้ และ foreign_key_check ว่าง |

Build ตั้ง `eslint.ignoreDuringBuilds=true` จึงต้องอ่านผล ESLint แยก ไม่ใช่อ้าง build ผ่านแล้วไม่มี lint issues. Build อ่าน .env.local ตาม config เดิม แต่รอบนี้ไม่แสดงค่า env และไม่ deploy

ผล ESLint แบบสรุปถาวรอยู่ที่ [eslint-summary.json](./baseline/eslint-summary.json):

| Rule | Warnings |
| --- | ---: |
| @typescript-eslint/no-explicit-any | 156 |
| @typescript-eslint/no-unused-vars | 15 |
| react-hooks/exhaustive-deps | 1 |
| รวม | 172 |

Warnings เป็น baseline เดิม ไม่ได้สร้างจาก P0; ให้ลดในส่วนที่ปรับโครงสร้างจริงระหว่าง P1–P7 โดยไม่ขยาย P0 เป็น cleanup ทั้ง repository. Lint script สามารถเปลี่ยนเป็น ESLint CLI ใน P1 ได้โดยตรวจ scope ให้ครอบคลุม Worker ต่อไป ไม่จำเป็นต้องเปลี่ยน dependency รุ่นใหม่ใน P0

## ข้อมูล fixture ใน repository

นี่คือผลจาก `worker/src/db/schema.sql` และ `seed.sql` ใน SQLite memory ใหม่ ไม่ใช่จำนวนข้อมูลใน Cloudflare หรือ local D1 ของผู้ใช้

| Table | Seed rows |
| --- | ---: |
| submissions | 4 |
| respondent_profiles | 1 |
| respondent_work_infos | 1 |
| environment_inspections | 2 |
| environment_measurement_points | 5 |
| health_risk_answers | 10 |
| satisfaction_answers | 8 |
| assessment_results | 2 |

Submission types: environment 2, health_risk 1, satisfaction 1. Seed satisfaction ยังมีเพียง 8 answers ขณะที่ฟอร์มปัจจุบันใช้ 16 ข้อ จึงห้ามใช้ seed นี้เป็น fixture complete-v3 โดยตรง ต้องสร้าง fixture v3 แยกและใช้ seed เดิมทดสอบ legacy incomplete

ไม่พบ SQLite/D1 state file ใน workspace จากการค้นไฟล์ที่เกี่ยวข้อง; ไม่ได้ query schema หรือข้อมูล production การตรวจ in-memory ไม่แทน D1 integration หรือ migration rehearsal

## Findings ที่ต้องจัดการตาม Phase

| ID | Finding / Evidence | Phase |
| --- | --- | --- |
| B01 | Generic PATCH ใน submissions.ts ลบ child records เพื่อ replace ไม่มี revision | P1/P2 |
| B02 | POST เขียนหลาย statement แยกกันและรับ overall score จาก client | P2 |
| B03 | Environment form ไม่ส่ง authoritative overall result, report คำนวณเองหลายแห่ง | P1/P2/P7 |
| B04 | health score รวม Object.values เสี่ยงรวม fields ใหม่ที่ไม่ใช่คะแนน | P1/P4 |
| B05 | Health answers ไม่ snapshot question text ตอน insert; q IDs เปลี่ยนความหมายใน v3 | P1/P2 |
| B06 | Required ยัง optional หลายช่อง และ profile preselect เพศ/ไม่มีโรค | P3/P4 |
| B07 | localStorage fallback อาจแสดงผลแม้ server ไม่บันทึก | P3 |
| B08 | layout upload UI 10 MiB แต่เก็บ base64 ใน D1 ไม่สอดคล้อง row limit | P1/P2/P5; R2 reference ตาม P0 spec |
| B09 | Noise ปัจจุบันรับ min/max/avg พื้นที่ เทียบ 85 อย่างเดียว ไม่แยก exposure/TWA | P1/P5 |
| B10 | Heat ฟังก์ชันใช้ truthy temperature และค่าเฉลี่ย/ค่าจากเครื่องมีหลายทางแก้ | P1/P5 |
| B11 | migration script execute schema และ migrations_dir รวม seed/truncate | P1 |
| B12 | CORS fallback คืน origin ที่ไม่อยู่ allowlist | P2 |
| B13 | satisfaction seed 8 ข้อ และข้อมูลเก่าไม่มี group | P1/P7/P8 |
| B14 | lint deprecated แต่ยังผ่าน; build ข้าม lint | P1 tooling |

Static findings ไม่ใช่รายงานว่าได้ทำ exploit หรือทดสอบ production แล้ว

## ยังไม่ได้รัน

- Worker runtime integration, API requests, E2E/browser flows หรือ UAT
- D1 migration/retest concurrency/atomic failure tests
- Remote schema/data inventory, R2 upload, production deployment หรือ restore
- Baseline นี้ไม่มี application changes; build artifacts อยู่ในโฟลเดอร์ที่โปรเจกต์ ignore ตามเดิม

ผล baseline เพียงพอสำหรับเริ่มออกแบบ shared domain/migrations ใน P1 แต่ไม่ได้หมายความว่า requirement v3 implement แล้ว
