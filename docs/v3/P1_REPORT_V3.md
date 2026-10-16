# SafeCheck v3 ผลส่งมอบ P1

วันที่ 12 ตุลาคม 2026 · สถานะ P1.1–P1.8 เสร็จแล้ว

P1 สร้าง domain และโครงสร้างฐานข้อมูลที่รองรับ v3 พร้อมทดสอบแบบแยกจากข้อมูลจริง ยังไม่เชื่อม routes/form รุ่นใหม่ และไม่ได้ deploy หรือ migrate remote

## สิ่งที่นำไปใช้ต่อได้

| Task | Implementation | หลักฐาน |
| --- | --- | --- |
| P1.1 | `shared/v3/contracts.ts`, `legacy.ts`, public entry points ของ frontend/Worker | Required/conditional/optional, missing vs zero, versions และ error paths; legacy adapter ไม่สร้างคำตอบก่อนหลังสมมติ |
| P1.2 | `shared/v3/evaluate.ts`, `retest.ts` | คะแนนสุขภาพทุก boundary/delta, satisfaction, แสง Spot/Area/บริเวณรอบ, เสียง table/formula/TWA8, WBGT ถ่วงเวลา และ retest carry |
| P1.3 | Shared schemas + columns/tables ใน 0002 | group/program/year/hours/เครื่องมือ/context/answer phase/manual durations ครบตาม field matrix |
| P1.4 | revision/point/sample/file/supplement/audit/idempotency tables | ownership FKs, base/number uniqueness, immutable finalized snapshots, passed-only carry และ committed file ก่อน finalize |
| P1.5 | `worker/src/db/migrations/`, Wrangler config และ scripts | แยก migrations จาก seed/truncate; preflight schema ก่อน apply และใช้ migration ledger |
| P1.6 | 0001 baseline → 0002 domain → 0003 snapshots | ฐานใหม่ติดตั้งได้ และฐาน legacy upgrade ได้ทั้ง SQLite และ D1 local |
| P1.7 | `tests/v3/`, preservation report | original columns ของทุกตารางอยู่ครบ รวม 0/null และหน่วยเก่า; ไม่มีคำตอบ/ชั่วโมง/หลักสูตรที่เดาขึ้นมา |
| P1.8 | `shared/v3/catalogs/programs.json` และ resolvers | ชื่อเต็ม 7 รายการตามลูกค้าและปี 1–6 ทุกหลักสูตร; server resolves label/version |

Frontend import จาก `src/lib/domain-v3.ts`; Worker import จาก `worker/src/domain-v3.ts`. ทั้งสอง entry point ชี้ shared module เดียวกัน และชุดทดสอบเรียกผ่าน entry points จริงเพื่อเทียบผล validation/scoring

## Contract ที่ตรึงใน P1

- `schema_version=3`, type เดิม environment/health_risk/satisfaction และ group environment/health
- Health: `profile`, `workInfo`, `healthContext` ตามหมวด และ `answers.before/after` เฉพาะแสง; noise/heat ใช้ `answers.single`
- Satisfaction: `answers.q1…q16`, **`suggestion` อยู่ระดับ root ของ payload v3** และ durations เฉพาะ environment; ไม่รวม suggestion/time เข้า rating
- Environment: `inspectionData`, `layout.file_id`, `units[]` แบบ kind light_spot/light_area/noise/heat; category/technique ต้องตรง unit kind
- Numeric payload รับ number จริง ไม่แปลง `""` เป็น 0; ฟอร์ม P3–P6 ต้อง normalize string ของ input ก่อน validate โดยคง missing เป็น missing
- Work context: student ต้องเลือก program/year; other ต้องระบุ study/work; staff/faculty ไม่ใช้ study_year และใช้ not_applicable สำหรับหลักสูตรได้
- คำตอบ/หมายเหตุมีแหล่งต้นฉบับและ versions ชัดเจน; notes omitted/null/blank → null
- Standard snapshots เก็บ document/version/code/thresholds ที่ใช้; โปรแกรมและคำถามมี resolver เพื่อให้ server สร้างข้อความ snapshot
- Retest request รับ measurement fields เท่านั้น; ไม่รับค่าที่ล็อก เช่น standard, equipment, location, duration/basis/mode. failed set ต้องครบและไม่เพิ่ม/เปลี่ยน point/sample IDs
- `prepareRetest` เป็น pure domain preparation; P2 ยังต้องตรวจ expected latest revision และบันทึกเป็น atomic D1 batch ไม่อาศัยการเช็คใน JavaScript อย่างเดียว
- `V3Env` ต้องมี FILES: R2Bucket; Env เดิมให้ binding optional เพื่อไม่กระทบ routes เดิม ยังไม่ได้สร้าง bucket/config ของ environment จริง

## โครงสร้าง migrations และ legacy

| File | งาน |
| --- | --- |
| 0001_legacy_baseline.sql | สร้าง legacy baseline แบบ IF NOT EXISTS รองรับฐานว่างและฐานเดิม |
| 0002_v3_domain.sql | เพิ่ม columns/domain tables/indexes/constraints/triggers โดยคง legacy fields |
| 0003_legacy_revision_snapshots.sql | Snapshot งาน environment เป็น revision 1; map point key จาก ID เดิม; เก็บ cached result/metadata/ผังเดิมและ latest pointer |

ข้อมูลเดิมยังอยู่ใน 8 ตารางต้นทาง ทุก original column ไม่เปลี่ยนจากการ migrate. `working_days_per_week` ไม่ rename หรือคูณเป็นชั่วโมง; new `working_hours_per_week` เป็น null สำหรับ legacy. Health เป็น single/legacy-unknown และ satisfaction group เป็น unknown. Seed satisfaction 8 ข้อไม่ถูกเติมเป็น 16 ข้อ

`legacy_layout_snapshots` เก็บข้อมูลผังเดิมแบบ immutable แยกจาก field บน submissions เพื่อเปิดย้อนหลังได้แม้ source เปลี่ยนภายหลัง การย้าย bytes ไป R2 จริงและการเชื่อม file reference เป็นงาน P2/P8 ห้ามทำให้รายงาน legacy อ้างไฟล์ mutable

Legacy revisions เป็น schema 1 / scoring legacy-unverified. shared v3 retest ปฏิเสธ schema 1 จน P2 ทำ explicit supplement/upgrade และยืนยันวิธีวัด ไม่แปลงค่าเฉลี่ยพื้นที่เก่าเป็น TWA หรือเดา Area topology

SQL ป้องกัน history ถูกแก้/ลบหลัง finalized, child point/sample เปลี่ยนไม่ได้, latest revision ต้องเป็น finalized ของงานเดียวกัน, base ต้องตรง latest/non-archived และ unique child ต่อ base. จุด carried ต้องมาจากจุดผ่านและคง inputs/standard/result/remark/date เดิม

## ผลทดสอบจริง

| Command | ผล |
| --- | --- |
| `npm run test:v3` | Domain tests 17/17 และ SQLite migration tests 6/6 ผ่าน |
| `npm run typecheck` | ผ่าน |
| `npm run typecheck:worker` | ผ่าน รวม shared JSON imports |
| `npm run lint` / ESLint JSON report | 0 errors; 172 warnings เดิม; shared/scripts ใหม่ 0 warnings |
| `npm run build` | production static build/export ผ่าน 14/14 pages |
| `node scripts/d1-migrate.mjs --local --persist-to /private/tmp/savecheck-p1-d1-fresh` | ฐาน D1 local ว่างติดตั้งทั้ง 3 migrations ผ่าน |
| `npm run test:v3:d1` | D1 local upgrade fixture ผ่าน, 8 tables preserved, 2 revisions/5 points, zero retained, clean FKs, exact 7 labels และรัน migration ซ้ำไม่เพิ่ม snapshots |
| esbuild bundle `worker/src/domain-v3.ts` | browser/Worker ESM bundle ผ่าน ไม่มี Node-only dependency ใน domain |
| `git diff --check` | ผ่าน |

D1 upgrade ทดสอบในโฟลเดอร์ชั่วคราวใหม่ (`savecheck-p1-d1-upgrade-*`) ไม่ใช้ local state ของผู้ใช้หรือ remote DB. Wrangler ต้องเปิด localhost/เขียน log นอก sandbox จึงรันด้วย permission ที่ผู้ใช้ให้เพื่อการทดสอบ local เท่านั้น

รายงาน preservation: [p1-preservation.json](./baseline/p1-preservation.json). รายงาน lint: [p1-eslint-summary.json](./baseline/p1-eslint-summary.json). ไม่เก็บข้อมูลส่วนบุคคลเต็มชุดในรายงานเหล่านี้

## คำสั่งและข้อกำหนดก่อน migration จริง

```bash
npm run test:v3
npm run typecheck
npm run typecheck:worker
npm run lint
npm run build
# ต้องเปิด local runtime ได้; เป็นการทดสอบ fixture ใน temp database
npm run test:v3:d1
# apply เฉพาะ local ที่กำหนด หลังตรวจ schema/readiness แล้ว
npm run db:migrate
```

`db:migrate` เรียก preflight ก่อน Wrangler migrations apply. ตรวจฐานต้องว่างหรือมี baseline ครบ 8 ตาราง/columns; ถ้าเจอ v3 columns แต่ไม่มี ledger 0002 จะหยุดให้ reconcile ไม่รัน ALTER ซ้ำ. ไม่ทำ auto-restore/drop/truncate เมื่อเจอ schema ไม่ตรง

`worker/src/db/schema.sql` และ `seed.sql` เป็น legacy bootstrap/fixture ไม่ใช่ final v3 schema; ห้ามใช้ execute schema.sql อย่างเดียวเป็นการอัปเกรด. Legacy seed ใช้สร้าง fixture ก่อน migration ดังตัวอย่าง tests; ไม่รัน seed OR REPLACE/truncate หลังมี revision history. ใช้ฐานชั่วคราวใหม่สำหรับทดสอบซ้ำ

Migrations apply ผ่าน ledger ตาม [Cloudflare D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/). ก่อน remote migration ต้อง inventory actual schema/data/ledger และ deploy Worker v3 ที่ปิด generic overwrite ให้พร้อมตาม P2/P9 เพราะ routes รุ่นเดิมยังไม่ใช้โครงสร้างนี้

## ส่งต่องาน P2

1. ใช้ createSubmissionSchema/evaluateSubmission และ response field paths แทนการรับ overall score จาก client
2. ทำ repositories/atomic writes สำหรับ create, failed-only retest, corrections, archive/restore และ idempotency scope+request hash
3. ทำ explicit legacy supplement/upgrade โดยไม่ rewrite snapshot และไม่แปลงวิธีวัดเดาเอง
4. ทำ R2 staged upload/commit/orphan handling และ file migration resolver; ต้องตรวจ bucket/bindings จริงเมื่อถึง environment setup
5. results/dashboard/export ต้องอ่าน latest effective observations พร้อม measured/carried provenance และ legacy adapter
6. ปิด generic PATCH/layout/DELETE เส้นทางเดิมที่จะ bypass revision policy ก่อนใช้ migration บน production

UI ใหม่และการเชื่อม select จริงเป็น P3–P7, API runtime/E2E/UAT ยังไม่ได้ทดสอบใน P1. Domain/migration complete ไม่ใช่การรับรองทั้งแอป v3 พร้อมใช้แล้ว
