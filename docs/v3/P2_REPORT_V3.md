# P2 Worker API v3 — implementation และผลทดสอบ

วันที่: 12 ตุลาคม 2026 · สถานะ: **P2.1–P2.10 done (local verification)**

P2 ส่งมอบ backend v3 และ API client helpers สำหรับเชื่อมหน้าจอใน P3–P7 ไม่ได้ deploy, migrate remote หรือสร้าง R2 bucket จริง ยังไม่ใช่ผล UAT/production readiness

## สิ่งที่เปลี่ยน

- แยก routes / AssessmentService / AssessmentRepository / DashboardService / FileService ใช้ validation และ scoring จาก shared/v3 ร่วมกับ frontend
- POST รับเฉพาะ schema_version=3; required/conditional fields ตรวจที่ server, notes/suggestion ว่างได้และ normalize เป็น null; ไม่รับ overall_score/result จาก client; 400 VALIDATION_ERROR มี error.issues[].path
- D1 batch บันทึก header/child/result/revision/payload version/latest pointer/idempotency ledger พร้อมกัน หากคำสั่งใดล้มเหลว rollback ทั้งชุด
- idempotency_key เดิม+payload เดิมคืนรหัสงานและผลเดิม; key เดิมแต่ข้อมูลเปลี่ยนตอบ 409; hash คำนวณจาก parsed/normalized payload
- Retest ใช้ base_revision_id ล่าสุดและ failed unit set ครบเท่านั้น; Area ต้องส่งทุก sample เดิมใน Area ที่ไม่ผ่าน; ล็อกสถานที่/เครื่องมือ/เกณฑ์/ชนิดค่าตรวจ/โครงสร้างจุด คงจุดผ่านและวันวัดพร้อม carried_from_revision_id
- Correction ใช้ expected_data_version และ reason; งาน environment ต้องมี base_revision_id; สร้าง revision/snapshot/audit ใหม่ รักษาประวัติเดิม เปลี่ยนชนิดงาน/กลุ่ม/หมวด/เทคนิค/เกณฑ์/โครงสร้างต้องสร้างงานใหม่
- Legacy อ่านเป็น schema 1 ไม่สร้างก่อน–หลังหรือกลุ่ม satisfaction จากการเดา; metadata-supplement ยืนยันข้อมูลเดิมครั้งเดียวก่อนตรวจซ้ำ เก็บ supplement/audit และ snapshot เดิม; หากยืนยัน basis/topology เดิมไม่ได้ให้สร้างงานใหม่
- DELETE เปลี่ยนเป็น archive ที่มี reason/key; restore คืนรายการได้; generic PATCH และ PATCH layout ตอบ 409 เพื่อไม่ให้เขียนทับประวัติ
- เก็บ profile/program labels, questionnaire/scoring/standard versions และคำถามเป็น snapshot; satisfaction แยกกลุ่ม พร้อมเวลาเดิม/แอปจากผู้ใช้ หน่วยวินาที
- Dashboard นับงานจาก latest หนึ่งรายการต่อ submission; revisions แยก count; satisfaction averages แยก environment/health/unknown; export latest/history แบ่งหน้างานและรอบตรวจอย่างชัดเจน
- CORS เทียบ exact origin จาก FRONTEND_URL (comma-separated); ไม่ยอมรับ wildcard Pages/localhost substring; CORS ไม่ใช่ authentication

## API ที่ใช้เชื่อม frontend

ทุก JSON mutation ส่ง Content-Type: application/json; response success มี data; failure มี error.code/message และ issues เมื่อเป็น field validation

| Method / /api path | Payload หรือ query | ผล |
| --- | --- | --- |
| POST /submissions | CreateSubmissionV3 + schema_version:3 + idempotency_key | 201 code/id/result/data_version; environment มี revision_id |
| POST /submissions/:code/retests | RetestRequestV3: base_revision_id, inspection_date, start_at, end_at, updates | 201 revision ใหม่; ไม่ส่งจุดผ่าน |
| POST /submissions/:code/corrections | schema_version/key/reason/expected_data_version/payload; environment เพิ่ม base_revision_id | 201 version/revision ใหม่ |
| POST /submissions/:code/metadata-supplement | LegacySupplementRequestV3: base revision, metadata, units เดิมทั้งหมด, reason; layout optional เมื่อผังเดิมใช้ได้ | 201 audited legacy adoption |
| POST /submissions/:code/archive หรือ DELETE /submissions/:code | ArchiveRequestV3: schema_version/key/reason | archive ไม่มี hard delete |
| POST /submissions/:code/restore | ArchiveRequestV3 | restore |
| GET /results/:code | ไม่มี query = latest; environment ใช้ revision; health/satisfaction ใช้ version | selected immutable detail |
| GET /submissions/:code/revisions | page/limit | items, total, latest_revision_id |
| GET /submissions/:code/versions | page/limit | items, total, data_version, next_page |
| GET /submissions/:code/audit | page/limit | data array + pagination |
| GET /dashboard/submissions, /summary | type/category/group/schema_version/archived/start_date/end_date/search | list/summary ตาม filters |
| GET /dashboard/export-data | filters + page/limit + revision_scope=latest\|history | records + next_page; history มี revision_pages แต่ละงาน |
| POST /files | binary body + Idempotency-Key + URL-encoded X-File-Name + MIME Content-Type | staged receipt/file_id |
| GET /files/:id | — | stream ไฟล์เดิม |
| GET /files/legacy/:revisionId | — | ดาวน์โหลด bytes snapshot เดิมแบบ attachment |
| POST /files/cleanup | Authorization: Bearer MAINTENANCE_TOKEN | ล้าง staged/orphan อายุเกิน 24 ชม. ครั้งละไม่เกิน 50 ไฟล์ |

page เริ่ม 1, limit 1–100 (default 20); history export ใช้ revision_page/revision_limit (default 1/100) ต่อทุก environment job ใน job page นั้น ต้องอ่าน next_page ทั้งสองระดับจนจบ ไม่ถือ records หน้าแรกเป็นข้อมูลทั้งหมด วันที่ filter ใช้วันตาม Asia/Bangkok

Types/schema อยู่ใน shared/v3/commands.ts, contracts.ts, retest.ts; client helpers อยู่ใน src/lib/api.ts ใช้ error paths ช่วยแสดง field errors ได้ หน้าจอเดิมยังส่ง payload v1 และถูก API v3 reject จนกว่าจะเชื่อมใน phase ถัดไป

## File lifecycle และ migration

Migration ใหม่: **0004_worker_v3_services.sql** เพิ่ม data_version, immutable payload history, upload key/hash, legacy file mappings, transaction preconditions และ carry guard สำหรับ legacy adoption ที่มี supplement พร้อม continuation provenance

FILES ใช้ local R2 binding ใน worker/wrangler.toml ชื่อ bucket candidate `save-check-layouts`; ยังไม่ได้สร้าง/ยืนยัน bucket ในบัญชีจริง ก่อน P9 ต้องตรวจ schema จริง/backup/numbered ledger, provision หรือเลือก bucket, ตั้ง production FRONTEND_URL และ MAINTENANCE_TOKEN เป็น secret ไม่ใส่ใน source

Upload รองรับ JPG/PNG/WebP/PDF ไม่เกิน 10 MiB ตรวจ signature กับ MIME และ SHA-256 เก็บ object key แบบ immutable ก่อนอ้างใน D1 revision ไฟล์ D1/R2 ไม่ใช่ transaction เดียวกัน จึงใช้ staged → committed และ retry/cleanup; D1 failed write อาจเหลือ staged object แต่ไม่เหลือ partial assessment งานที่อ้างไฟล์แล้วจะไม่ถูก cleanup การเก็บเข้าคลังไม่ลบไฟล์

Legacy supplement นำ bytes base64 เดิมเข้า R2 เมื่อใช้ได้และมี mapping; ถ้าไฟล์เดิมเสีย/ไม่มี bytes ต้องแนบผังที่ถูกต้อง snapshot เดิมยังดาวน์โหลดได้โดยไม่เขียนทับ

ใช้ `npm run db:migrate:local` สำหรับ local ผ่าน preflight เท่านั้น ห้ามใช้ seed/truncate fixtures กับฐานที่มีประวัติ ก่อน release ต้องผ่าน P8/P9 และเปลี่ยน frontend กับ API ใน cutover เดียวกัน

## ผลทดสอบจริง

| คำสั่ง | ผล |
| --- | --- |
| npm run test:p2 | 23 API integration scenarios ผ่าน บน Miniflare/workerd + D1/R2 local; clean FK / ไม่มี precondition residue |
| npm run test:v3 | 17 domain + 6 SQLite migration tests ผ่าน (รวม migration 0004) |
| npm run test:v3:d1 | D1 local upgrade และ ledger resume ผ่าน; 8 ตารางเดิมทุก original column คงค่า, 2 legacy revisions/5 points, 0/null/หน่วยเดิมครบ |
| npm run typecheck / typecheck:worker | ผ่านทั้งสองฝั่ง |
| npm run build | ผ่าน 14/14 static pages |
| ESLint src worker/src shared scripts | 0 errors / 131 warnings เดิม (ลดจาก P1 172); services/repositories/shared/scripts ใหม่ 0 warnings |

หลักฐาน: [API scenarios](./baseline/p2-api-tests.json), [lint summary](./baseline/p2-eslint-summary.json) และ scripts/test-p2-api.mjs (isolated fixture, ไม่ใช้ production data)

ครอบคลุม create/read ครบ 8 flows, missing/fake/invalid/oversized payload, 20 health light answers + delta, satisfaction groups/manual durations, atomic failure injection, same-key concurrent create, competing retests, r1→r2→r3 carry dates, correction/history, archive/restore, exact CORS, file signature/retry/download/orphan, legacy zero/unknown group/supplement/import/provenance และ export pagination

ไม่ได้ทดสอบ browser E2E ของหน้าฟอร์ม v3, production schema/account/bucket, load test หรือ UAT; เป็นงาน P3–P8/P9 ไม่มีคำถามลูกค้าที่บล็อก P2 งานถัดไป **P3 เมนู/wording/draft/submit states**
