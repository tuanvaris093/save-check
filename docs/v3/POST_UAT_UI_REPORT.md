# งานปรับแผนผังและหน้าใช้งานหลัง UAT

วันที่ 14 ตุลาคม 2026 (Asia/Bangkok) · สถานะ: **done — งานปรับและ regression ครบ**

## ขอบเขตตามคำสั่งล่าสุด

- D17: แผนผังไม่บังคับและเพิ่มภายหลังได้; เลือกไฟล์/ดูตัวอย่าง/ทบทวนในเครื่องก่อนยืนยันแล้วส่ง API
- D18: แอปปัจจุบันชุดเดียว ไม่มีตัวกรอง schema/v3/รุ่นเดิมและรหัส version ใน UI/print; ประวัติรอบตรวจและข้อมูลที่เคยบันทึกยังเก็บค่าจริง

## สิ่งที่ปรับแล้ว

- Shared contract, Worker, result และ draft รองรับไม่มีแผนผัง (`layout_file_id=null`) ไม่สร้างไฟล์สมมติ; ถ้าแนบต้องเป็น reference ที่มีจริง
- ใช้ dropzone/ดูรูปขยาย/PDF/เปลี่ยน/ลบแบบเดิม; หน้า review ยังไม่ยิง upload/create API จนกดยืนยันบันทึก
- Retry upload ใช้ key เดิม; หาก upload สำเร็จเก็บ receipt แล้ว retry การบันทึกโดยไม่อัปโหลดซ้ำ
- หน้าผลล่าสุดมี “เพิ่มแผนผังภายหลัง” เข้าหน้าแก้ไขพร้อมข้อมูลเดิมและเหตุผล “เพิ่มแผนผังพื้นที่”; เก็บประวัติและวันเวลาวัดเดิม
- เอาตัวกรองโครงสร้างข้อมูลและคำว่า v3/รุ่นเดิม/Schema/Scoring/รหัสชุดคำถามออกจากหน้าผู้ใช้ รวมรายงาน print; แบบสอบถามไม่มี selector ประวัติ version ใน UI
- Excel ซ่อนคอลัมน์ technical versions และชีต metadata/snapshot ข้อมูล audit ยังอ่านโดยเครื่องมือได้ ไม่ลบข้อมูลต้นฉบับ
- เอกสารมาตรฐานใช้ปุ่มดู/เปิด/ดาวน์โหลดที่สอดคล้องกับหน้าแนบไฟล์

## Schema และการแก้ local API

ฐาน development ที่ localhost:8787 ยังไม่มี schema ใหม่ จึงตอบ `503 SCHEMA_NOT_READY` สำหรับ Dashboard; ทำ consistent SQLite recovery copy ก่อนปรับ schema เฉพาะ local แล้วตรวจ original columns/count/hash ของทั้ง 8 ตารางคงเดิม, FK 0, ledger 0001–0005 ครบ; summary กลับเป็น HTTP 200 พร้อม CORS สำหรับ localhost:3001

Migration `0005_optional_layout.sql` เปลี่ยน constraint ให้แผนผัง optional ด้วยการ copy revisions เดิมทุก field และสร้าง ownership/immutability/finalization/carry guards กลับครบ ตรวจ foreign keys ภายใน migration transaction ตาม [Cloudflare D1](https://developers.cloudflare.com/d1/sql-api/foreign-keys/) ไม่มี ON DELETE CASCADE ในตารางที่อ้าง revision

หลักฐาน local repair: [record](./baseline/current-ui-local-db.json) สำเนากู้คืนอยู่ใน temporary directory ตาม path ใน record ไม่ใช่ production backup

## การตรวจสอบ

ทดสอบจริงด้วย Chromium + Worker/D1/R2 แยกจากฐานงาน รวม **173 scenarios/checks ผ่าน** และ quality commands ผ่าน รวม 17 commands ตาม [ผลรวม/exit codes/logs](./baseline/current-ui-regression-latest.json)

| กลุ่ม | ผลจริง |
| --- | --- |
| Core/domain/SQLite/Word/forms/Worker API | 99 scenarios ผ่าน ใน 8 commands; รวม Worker/D1/R2 atomic/retry/ownership 23 |
| Browser regressions | 66 scenarios ผ่าน: health 9 + Word 5 + draft/navigation 11 + environment 16 + satisfaction 11 + reports/dashboard/export/print 14 |
| งานปรับครั้งนี้ | 8 scenarios ผ่าน: migration ของข้อมูลที่มี 3 รอบ/จุด carry, optional layout ทั้ง 3 หมวด, ไม่มี upload/create ก่อนยืนยัน, add-later/วันที่เดิม, PDF/image preview/refresh/type validation, upload/create retry, unified UI/Excel |
| Quality | Worker/frontend typecheck ผ่าน; lint 0 errors / 74 warnings เดิม; static build 14/14 ผ่าน |

ไม่มี page errors หรือ foreign-key violations ใน browser suites รายงาน/Excel และ PDF A4 ผ่าน regression ทั้ง 3 หมวดกับสุขภาพ/ความพึงพอใจ รวม bulk มากกว่า 100 งานและ history 13 รอบ

ปรับ assertions ใน harness เดิมตามข้อความ/ชื่อไฟล์ที่เอาคำว่า “รุ่น” ออก และรอ network error จริงหลัง upload ก่อน retry; failures ของ assertions ระหว่างปรับแก้ได้รับการตรวจซ้ำจนผ่านตามผลล่าสุด ไม่ใช้ partial runs เป็นหลักฐานว่าครบ

Build ใน regression ใช้ `SAFECHECK_TEST_DIST_DIR=.next-test-current-build` แยกจาก cache ของ dev ที่เปิดอยู่

หลักฐานเพิ่มเติม: [flow ใหม่](./baseline/current-ui-tests.json) · [source SHA-256](./baseline/current-ui-source-fingerprint.json) · [หน้าแนบไฟล์](./baseline/current-ui-form-mobile.png) · [Dashboard](./baseline/current-ui-dashboard-mobile.png)

Browser scope: Chromium บน mobile/desktop viewport; Firefox/WebKit/Safari/iOS และเครื่องพิมพ์จริงยังไม่ได้รันตามขอบเขตที่รับทราบ ไม่มีการติดตั้ง runtime เพิ่ม

P8 report/UAT/baseline เดิมเป็นหลักฐานก่อนคำสั่ง D17/D18 ไม่เปลี่ยนคำยืนยันเดิมให้ครอบคลุมงานใหม่ และไม่อ้างว่า fingerprint เดิมตรงกับโค้ดหลังปรับครั้งนี้

ไม่มี deploy/remote DB/R2 changes; P9 ยัง not-started

## ผลปิดงาน

Requirements/field matrix/plan/progress อัปเดตตาม D17/D18 แล้ว; หลักฐาน P8 UAT เดิมยังเป็นการยืนยันขอบเขตก่อนคำสั่งล่าสุด งานปรับนี้ไม่มีการอ้างคำยืนยันใหม่แทนเจ้าของงาน ไม่มี decision ค้างสำหรับงานที่สั่งครั้งนี้
