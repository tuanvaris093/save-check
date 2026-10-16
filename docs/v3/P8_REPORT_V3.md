# P8 ตรวจรับรวมและซ้อมย้ายข้อมูล

วันที่: 14 ตุลาคม 2026 (Asia/Bangkok)
สถานะ: **done — P8.1–P8.8 ครบ เจ้าของงานยืนยัน UAT แล้ว**

อ้างอิง [แผน v3](./IMPLEMENTATION_PLAN_V3.md) · [Progress](./PROGRESS_V3.md) · [ผลตรวจรับ expected/actual](./P8_UAT_V3.md) · [Coverage R01–R25](./P8_COVERAGE_V3.md)

## Checklist และผล

| Task | สถานะ | ผลและหลักฐาน |
| --- | --- | --- |
| P8.1 | done | domain/contract boundaries 0/6/7/13/14/20, delta, units, date/time, zero/N/A, 7 programs/ปี 1–6, required/conditional/notes และ old snapshots ผ่าน |
| P8.2 | done | Worker/D1/R2 API 23 scenarios: atomic rollback/injected failure, idempotency/hash mismatch/concurrent create/retest, stale/foreign base, locked fields, legacy adoption/layout/archive และ response/JSON limits ผ่าน |
| P8.3 | done | GUI create ครบ 8 entry flows ใน P4/P5/P6 regressions; P3 refresh/back/direct/network draft tests, P5/P8 false→false→true และ 8 same-key concurrent creates ได้งานเดียว; keys ต่างได้ 8 รหัส |
| P8.4 | done | D1 local rehearsal 7 checks พร้อม export/restore copy, resume, schema preflight และเทียบทุก original value + SQLite typeof ใน 8 ตาราง; 28 jobs คงเดิม, FK/duplicate mapping 0 |
| P8.5 | done | 455 missing required leaves ถูก reject ไม่มี DB writes; 64 optional omitted/null/empty/space accepted; รายละเอียดโรค/อื่น ๆ/context ตามเงื่อนไขยัง required; fresh independent Chromium process เปิด 8 ผลและ XLSX complete snapshot ตรง API โดย localStorage ว่าง |
| P8.6 | done | เจ้าของงานยืนยัน UAT ตาม expected/actual และรับทราบขอบเขตทดสอบในแชต 14 ต.ค. 2026; [คำยืนยัน](./baseline/p8-owner-uat.json) |
| P8.7 | done | frontend/Worker typecheck ผ่าน, lint 0 errors / 74 warnings เดิม, production static build 14/14; commands/exit codes/logs เก็บครบ |
| P8.8 | done | ตรวจ R01–R25 จาก UI→Worker→DB→result→Excel/print ตามชนิดงาน ไม่ใช้เฉพาะมีหน้าจอเป็นหลักฐาน; ดู coverage table |

## ข้อผิดพลาดที่พบและแก้

**ผล legacy ที่ไม่มีข้อมูลถูกแสดงเป็น “ไม่ผ่าน”**: migration ของงาน environment เดิมที่ไม่มี points/result ให้ `is_pass=NULL` ถูกต้อง แต่ result/history/Excel summary ใช้ false fallback กับ null

- เพิ่ม `recordedPass` แยก true/1 = ผ่าน, false/0 = ไม่ผ่าน, null/undefined = ไม่มีข้อมูล
- ใช้ helper เดียวกันใน legacy result, history และ Excel job summary
- เพิ่ม legacy empty environment/health fixtures ก่อน migration ในฐานทดสอบ ตรวจ API/UI/history/downloaded XLSX ว่าไม่มีคะแนน/false failure/before-after ที่สร้างขึ้นเอง
- ไม่แก้ค่า score/pass/standard/revisions ในฐาน ไม่เปลี่ยนสูตรคะแนน และ rerun regression ทั้งสามโมดูล/รายงานหลังแก้แล้ว

## Migration rehearsal

ข้อมูลจำลองจาก legacy seed พร้อม zero/null/หน่วยวันเดิม/layout bytes/ค่า heat เต็มทศนิยม/งานไม่มีคำตอบ/งานไม่มี points และ health legacy headers เพิ่ม รวม 28 submissions

| ตารางเดิม | ก่อน | หลัง | ผล |
| --- | ---: | ---: | --- |
| submissions | 28 | 28 | ทุก original field และ SQLite typeof คงเดิม |
| respondent_profiles | 1 | 1 | คงเดิม |
| respondent_work_infos | 2 | 2 | days/week เดิมคงเดิม; ไม่เติม hours/week |
| environment_inspections | 3 | 3 | missing metadata/datetime ยังไม่มีข้อมูล |
| environment_measurement_points | 6 | 6 | zero/NULL/full precision/remark คงเดิม |
| health_risk_answers | 11 | 11 | DB phase single/schema 1; export legacy_single ไม่สร้าง before/after |
| satisfaction_answers | 8 | 8 | ไม่เติม q9–q16 หรือค่าเวลาสมมติ |
| assessment_results | 2 | 2 | cached results คงเดิม |

หลัง migrate: environment revisions 4 / revision points 6, ledger 0001–0004 ครบ, finalized/latest pointer/ownership ถูก, duplicate mappings/FK = 0; rerun ไม่เพิ่มข้อมูลและ finalized snapshot update ถูก reject

Export SQL และ restore เป็นฐาน local อีกชุด แล้ว migrate อีกครั้งได้ mappings/pointers/results ชุดเดียวกัน Partial schema และ schema ที่ลบ original column ถูก preflight หยุดก่อนสร้าง ledger/ALTER

Wrangler รุ่นที่ติดตั้งไม่รองรับ `--persist-to` สำหรับ local export จึงใช้ Miniflare D1 export PRAGMA แบบเดียวกับ implementation ของ Wrangler แต่กำหนด persistence ชั่วคราวชัดเจน ไม่ fallback ไป export ฐาน workspace/remote CLI จัด NULL ในผล `--json` เป็นข้อความ จึงตรวจ `typeof`/`IS NULL` เพิ่ม ไม่ตีความ string `null` เป็นหลักฐานว่า SQL NULL เปลี่ยน

หลักฐาน: [P8 D1 JSON](./baseline/p8-migration.json) มี counts/ledger/checks/fixture hash ไม่มีข้อมูลสุขภาพจริง

## Tests ที่รันจริง

| กลุ่ม | ผล |
| --- | --- |
| Core/domain/SQLite/Word/form unit/Worker API | 8 commands, 99 scenarios ผ่าน: domain 17 + SQLite 6 + P3 11 + P4 8 + Word 6 + P5 11 + P6 7 + P7 10 + P2 23 |
| Browser regressions | 4 commands, 66 scenarios ผ่าน: P4 9 + Word satisfaction 5 + P3 11 + P5 16 + P6 11 + P7 14 |
| P8 new acceptance browser/Worker | 9 scenarios ผ่าน ภายในมี 455 required rejects/64 optional creates, 8 fresh report/Excel comparisons, concurrency, 3 rounds/ownership และ empty legacy regression |
| P8 real D1 rehearsal | 7 checks ผ่าน |
| Build/quality | 4 commands ผ่าน: Worker typecheck, lint 0/74, build 14 static pages, frontend typecheck หลัง build |

รวม 181 scenario/checks ทางเทคนิค (ไม่บวก subcases 455/64 ซ้ำเป็นจำนวน tests และไม่รวมการยืนยัน UAT ของมนุษย์)

- [Core commands/logs](./baseline/p8-regression-core.json)
- [Browser commands/logs](./baseline/p8-regression-browser.json)
- [Build/quality commands/logs](./baseline/p8-regression-checks.json)
- [P8 API matrix/fresh-browser/expected-actual](./baseline/p8-browser.json)
- [Source fingerprint](./baseline/p8-source-fingerprint.json)

## Browser และข้อจำกัด

ทดสอบ Chromium ที่ติดตั้งอยู่ กับ viewport 390×844 และ desktop ผ่าน regression; fresh browser เป็นอีก process/profile ไม่แชร์ cookies/localStorage กับผู้สร้างข้อมูล

Firefox/WebKit runtime ไม่มีในเครื่องและคำขอติดตั้งไม่ได้รับอนุญาต จึงบันทึก not-run ใน artifact ไม่อ้างว่า Safari/iOS/Firefox/เครื่องพิมพ์จริงผ่าน ส่วน migration เป็น local D1/fixtures ไม่ใช่ production-data rehearsal หรือตรวจ bindings จริงใน P9

## วิธีรันซ้ำ

```bash
npm run test:p8              # core + new migration/browser + browser regressions + checks ตามลำดับ
npm run test:p8:core
npm run test:p8:migration
npm run test:p8:browser
npm run test:p8:regression
npm run test:p8:checks
```

Harness ใช้ localhost 3054/3055, D1/R2 ชั่วคราว และ `.next-test-p8`; ไม่รัน Next harness/build ซ้อนกัน Scripts ไม่ deploy/remote migration และไม่อ่านข้อมูลจริง

## ไฟล์ที่เปลี่ยนใน P8

- `scripts/p8-fixtures.mjs`, `test-p8-browser.mjs`, `test-p8-migration.mjs`, `test-p8-regression.mjs`, `tests/v3/p8-legacy-report-fixtures.sql`, package scripts และ tsconfig include สำหรับ test cache
- `src/lib/v3/report-model.ts`, `report-export.ts`, `src/components/reports/legacy-result.tsx`, `report-controls.tsx` แก้ nullable legacy presentation
- P8 report/UAT/coverage, plan/progress/README และ baseline/logs

## ผลปิด P8

เจ้าของงานยืนยันในแชตวันที่ 14 ตุลาคม 2026: “ยืนยัน UAT ตามเอกสารและรับทราบขอบเขตทดสอบ” จึงปิด P8.6 และ P8 เป็น done โดยรับทราบขอบเขต Chromium และ Firefox/WebKit not-run ตาม [UAT](./P8_UAT_V3.md) และ [หลักฐานคำยืนยัน](./baseline/p8-owner-uat.json) ไม่มีการเพิ่มผลทดสอบที่ไม่ได้รัน

ไม่มี deploy/remote DB/R2/migration ใหม่/commit/PR และไม่เริ่ม P9
