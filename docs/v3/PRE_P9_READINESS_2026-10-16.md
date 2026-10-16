# ตรวจความพร้อมก่อน P9 — 16 ตุลาคม 2026

บันทึกย้อนหลัง: P9 ถูกดำเนินการและ deploy แล้วภายหลัง ดูสถานะปัจจุบันใน [รายงาน release](./P9_RELEASE_2026-10-16.md)

ผลประเมิน: พร้อมเข้า P9 เพื่อเตรียมและตรวจ release แต่ยังไม่พร้อม deploy ทันที การตรวจครั้งนี้ใช้ฐานข้อมูลทดสอบแยก ไม่ได้อ่านหรือแก้ฐาน production และไม่ได้ deploy

## ผลที่รันใหม่ครั้งนี้

| การตรวจ | ผล | หลักฐาน |
| --- | --- | --- |
| `npm run test:p8:core` | ผ่าน 8 คำสั่ง รวม API integration 23 กรณี | `baseline/p8-regression-core.json`, `baseline/p8-logs/` |
| `npm run test:p8:migration` | ผ่าน 7 กรณี บน D1 runtime ในเครื่อง | `baseline/p8-migration.json` |
| `npm run test:p8:checks` | Worker/Frontend typecheck, lint, production build ผ่าน | `baseline/p8-regression-checks.json` |

Lint มี 73 warnings, 0 errors จึงไม่ได้หมายความว่าไม่มีหนี้ทางเทคนิคเหลืออยู่ รอบนี้ไม่ได้รัน browser acceptance ทุกชุดซ้ำทั้งหมด ผล browser ของ D59 และงานก่อนหน้านั้นบันทึกแยกใน PROGRESS_V3.md และไม่ได้ทดสอบ production

API ครอบคลุมการบันทึกซ้ำ การเขียนพร้อมกัน การ rollback เมื่อ batch ล้มเหลว ประวัติหลายรอบที่ไม่ถูกทับ การแก้ไขแบบ revision การส่งออก ไฟล์ และการปฏิเสธข้อมูลผิดรูปแบบ

## Migration และความปลอดภัยของข้อมูล

- ใช้ migration ตามลำดับ `0001_legacy_baseline.sql` ถึง `0007_retire_archive.sql` ตรวจ ledger ก่อนดำเนินการ ไม่ใช้ seed หรือสร้าง schema ใหม่ทับข้อมูลจริง
- ซ้อม export/restore ฐานก่อน migrate แล้วเทียบค่าทุก field เดิมใน 8 ตาราง ข้อมูล submissions 28 แถวใน fixture คงอยู่ครบ รวม null, zero, หน่วยเก่า, คะแนนเก่า และ bytes ไฟล์เดิม
- หลัง migrate พบ foreign key violations 0 และ revision/point mapping ซ้ำ 0
- รันซ้ำได้โดยไม่แก้ finalized snapshots; ฐานที่ restore แยกสามารถ migrate ได้ผลเดียวกัน
- schema เดิมไม่ครบหรือ column เดิมเปลี่ยนถูกปฏิเสธก่อนเขียน migration
- ผลนี้ยืนยันเฉพาะ fixture ไม่ยืนยันว่า schema/data/ledger ในฐานจริงตรงกันแล้ว ข้อมูล legacy ยังคงอยู่ในฐาน แต่การแสดงใน UI ปัจจุบันเป็นไปตามข้อกำหนดแยก legacy ของโครงการ

## สิ่งที่ต้องปิดก่อนปล่อยจริง

1. ตรวจ target ของ Pages, Worker, D1 และ R2 จริง รวม bindings และสิทธิ์ใช้งาน ขณะนี้ `worker/wrangler.toml` ยังตั้ง `ENVIRONMENT=development` และ `FRONTEND_URL` เป็น localhost เท่านั้น ต้องกำหนด allowlist ให้ตรง frontend จริง
2. Build ใหม่ด้วย API URL production: bundle ใน `out/_next` ที่สร้างระหว่างตรวจครั้งนี้ยังมี `http://localhost:8787/api` ห้ามใช้ชุดนี้เป็น release artifact
3. สำรวจ schema และ migration ledger ของฐานจริง ทำ recovery point และทดลอง restore ในฐานแยกก่อนเปลี่ยนฐานจริง การซ้อม local ยังทดแทนขั้นนี้ไม่ได้
4. ยืนยันช่วงหยุดเขียนระหว่าง backfill เพื่อไม่ให้ client เก่าเปลี่ยนข้อมูลระหว่างสร้าง snapshots จากนั้น migrate → Worker → ตรวจ API → Pages ตาม checklist P9
5. ทดสอบ end-to-end บน environment ปลายทางจริง: ทุกแบบฟอร์ม บันทึก/แก้ไข/วัดซ้ำ ชื่อผู้ตรวจแต่ละรอบ ประวัติ Excel ผังพื้นที่ และปุ่มเสร็จสิ้น รวม CORS และ logs
6. ปิดประเด็น Excel ที่ยังมีคอลัมน์บริเวณใกล้/ถัดออกไปว่างในกรณีไม่เกี่ยวข้อง ซึ่งผู้ใช้เพิ่งทัก ยังไม่ได้แก้ใน audit นี้ เป็นงาน export ไม่ใช่ปัญหา migration
7. เก็บ release snapshot/version, deployment IDs, migration IDs และแผน rollback ก่อน deploy; rollback แอปต้องรองรับฐานหลัง migration และห้าม restore ฐานเก่าทับข้อมูลใหม่โดยไม่มีกระบวนการกู้ข้อมูล

P8 UAT ที่เคยอนุมัติยังคงเป็นหลักฐานของเวอร์ชันขณะนั้น ไม่ใช่การอนุมัติอัตโนมัติให้ทุกการเปลี่ยนแปลงภายหลัง ค่า `owner_uat: pending` ใน JSON ของ runner เป็น metadata ของสคริปต์ ไม่ได้ยกเลิกการอนุมัติเดิม P9 ยังไม่ถูกดำเนินการหรือทำเครื่องหมายเสร็จจาก audit นี้
