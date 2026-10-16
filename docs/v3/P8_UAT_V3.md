# P8 ผลตรวจรับสำหรับเจ้าของงาน

วันที่ 14 ตุลาคม 2026 · สถานะ: **done — เจ้าของงานยืนยัน P8.6 แล้ว**

เอกสารนี้บันทึกผลตรวจอัตโนมัติพร้อม expected/actual และคำยืนยัน UAT จากเจ้าของงานในแชตวันที่ 14 ตุลาคม 2026 ข้อกำหนดอ้าง [แผน P8.6](./IMPLEMENTATION_PLAN_V3.md#p8-ตรวจรับรวมและซ้อมย้ายข้อมูล) ซึ่งกำหนดให้ตรวจ wording/มาตรฐาน/กติกาตรวจซ้ำกับเจ้าของงาน

## ผลที่ขอให้ตรวจยืนยัน

| เรื่อง | Expected ตาม requirement | Actual และหลักฐาน | ผลระบบ |
| --- | --- | --- | --- |
| เมนูและการเข้าใช้งาน | 2 กลุ่ม × 4 แบบ เข้าแบบประเมินตรงได้ | 8 routes และ full create ทั้ง health 3/environment 3/satisfaction 2 ผ่าน P3/P4/P5/P6 browser regression | ผ่านอัตโนมัติ |
| หลักสูตรและชั้นปี | ชื่อเต็ม 7 หลักสูตรตามลูกค้า ปีแยก 1–6; บุคลากรใช้ N/A ได้ | catalog/select/API ครบ; ตัวอย่าง P8 หลักสูตร 07 ปี 6 / ชั่วโมงต่อสัปดาห์ 40 ตรง API และ Excel (U02) | ผ่านอัตโนมัติ |
| Required/หมายเหตุ | บังคับเฉพาะ field ที่เกี่ยวข้อง; notes/suggestion ว่างได้; โรค/อื่น ๆ ตามเงื่อนไขยังต้องระบุ | 455 missing-field payloads ถูก reject และไม่มีข้อมูลเพิ่ม; 64 omitted/null/empty/space notes บันทึกได้; disease/other/context ว่างถูก reject | ผ่านอัตโนมัติ |
| สุขภาพแสง | แยก 10 ข้อก่อน + 10 ข้อหลัง; delta หลัง−ก่อน; ระดับจากคะแนนหลัง | 0 → 10: delta +10 / medium จากหลัง 10 (U01); ตารางด้านล่างตรวจเพิ่ม 6 ตัวอย่างผ่านทั้ง UI และ Worker | ผ่านอัตโนมัติ |
| สุขภาพเสียง/ความร้อน | คำถามใหม่อย่างละ 10; แหล่งเสียงไม่รวมคะแนน; ชั่วโมงวันนี้ไม่รวมคะแนน | คำถามจาก snapshot แสดงครบ; noise sources none/multiple/other และ required details ผ่าน; heat zero ทั้ง 10 ข้อบันทึก total 0 | ผ่านอัตโนมัติ |
| Spot/Area | เลือกเทคนิคก่อนเกณฑ์; surrounding ตามเกณฑ์; Area แยก average กับ minimum | Spot/surrounding และ Area average ผ่านแต่ minimum ไม่ผ่าน ได้ผลไม่ผ่าน; samples/standard version เก็บใน revision/Excel | ผ่านอัตโนมัติ |
| เสียง | duration ใช้ตาราง/สูตร; TWA8 ไม่ปรับด้วยเวลาซ้ำ | 240 นาที → limit 88 dBA; ค่าตรวจ 89 ไม่ผ่าน (U03); TWA8 เทียบ 85 ตาม P5/P2 tests | ผ่านอัตโนมัติ |
| WBGT | input mode แยก; ภาระงาน 34/32/30; ค่าเท่าขีดจำกัดผ่าน | ค่าเฉลี่ยเครื่อง 34 / งานเบา limit 34 ผ่าน (U04); raw intervals รวม 120 นาทีทั้งในและกลางแจ้งผ่าน | ผ่านอัตโนมัติ |
| ไฟล์มาตรฐาน/คำแนะนำ | ใช้ไฟล์ที่ลูกค้าส่งและคำแนะนำที่ตกลง ไม่มี checkbox เสียงเพิ่ม | PDF public/source SHA-256 ตรงกัน; viewer/open/download และข้อความเดิม+เพิ่มเติมผ่าน P5; ไม่มีการอ้างว่าตรวจรับรองกฎหมายล่าสุด | ผ่านอัตโนมัติ |
| ตรวจซ้ำ/ประวัติ | วัดเฉพาะหน่วยไม่ผ่าน; คงสถานที่/เครื่องมือ/เกณฑ์/จุดผ่าน; ห้ามใช้ฐานเก่า | U09 รอบ 1/2/3 = ไม่ผ่าน/ไม่ผ่าน/ผ่าน; carry วัดจริง 12 ต.ค. 2026 และ source revision เดิม; รอบแรกไม่เปลี่ยน; foreign revision = 404 | ผ่านอัตโนมัติ |
| Correction/เก็บเข้าคลัง | ต้องมีเหตุผลและรักษารุ่นเก่า; คืนรายการได้ | P5/P6/P7 ยืนยัน old snapshots, stale-base conflict, archive/restore และ retest eligibility ตรงกับสถานะล่าสุด | ผ่านอัตโนมัติ |
| ความพึงพอใจ | 16 ข้อ/4 ด้านสองกลุ่มตาม Word ล่าสุด; ชื่อผู้ตอบ required | 32 ข้อเทียบ source Word ผ่าน; 5 browser tests ตรวจข้อความรุ่นใหม่/เก่า; กลุ่มสุขภาพมี type/program/year แยก; ส่งตรงได้ ไม่ต้องทำแบบอื่นก่อน | ผ่านอัตโนมัติ |
| เวลาเปรียบเทียบ | กรอกเองทั้งสองวิธี วัน/ชั่วโมง/นาที/วินาที แยกจากคะแนน | 1 วัน 2 ชม. 3 นาที 4 วินาที = 93,784 วินาที; SafeCheck 1 วินาที; mean = 5 ไม่ใช้เวลาเป็นคะแนน (U05); ผลต่างติดลบผ่าน P6 | ผ่านอัตโนมัติ |
| Dashboard/Excel/print | งานนับ 1 ต่อรหัส แยกรอบ; กลุ่ม/วันที่กรองตรง; ส่งออก selected/latest/history | 104 งานครบทุกหน้า; 13 รอบยังเป็น 1 งาน; Excel มี actual date/units/threshold/version/คำถาม; A4 selected revision/versions ผ่าน P7 | ผ่านอัตโนมัติ |
| Browser ไม่มี draft | เปิดผลจาก API ได้โดยไม่อาศัย localStorage | เปิดรายงาน 8 แบบจาก Chromium อีก process ที่ localStorage ว่าง แล้ว downloaded XLSX snapshot ตรง API ทุกแบบ | ผ่านอัตโนมัติ |
| Legacy ไม่มีผล | ไม่มีคะแนน/ค่าตรวจต้องไม่กลายเป็น 0 หรือไม่ผ่าน; ไม่สร้าง before/after | พบและแก้การตีความ `is_pass=null`; API/UI/history/Excel แสดงไม่มีข้อมูล ส่วน health ไม่มีคะแนนและไม่มีตารางก่อนหลัง | ผ่านอัตโนมัติ |
| Migration/recovery | ไม่เปลี่ยนข้อมูลเดิม/ชนิดข้อมูล ไม่สร้าง duplicate/pointer ผิด | D1 local 28 submissions และทั้ง 8 ตาราง count/ค่าทุก field/SQLite typeof คงเดิม; export→restore→migrate และ resume ผ่าน; 0 FK/duplicate mapping | ผ่านอัตโนมัติ |
| เป้าหมายจำนวนคน | 46/309 เป็นบันทึกประกอบ ไม่ใช่ quota | ไม่มี quota ที่ปิดรับ; payload/create/retry และ export มากกว่า 100 งานทำงานได้ | ผ่านอัตโนมัติ |

หลักฐานค่า U01–U05/U09: [P8 browser JSON](./baseline/p8-browser.json) · [D1 rehearsal](./baseline/p8-migration.json) · [Core logs](./baseline/p8-regression-core.json) · [Browser logs](./baseline/p8-regression-browser.json)

## ตัวอย่างระดับจากคะแนนหลัง

| ก่อน | หลัง | ผลต่าง | Expected ระดับจากหลัง | Actual UI/Worker |
| ---: | ---: | ---: | --- | --- |
| 2 | 4 | +2 | ต่ำ 0–6 | ตรง / ผ่าน |
| 6 | 8 | +2 | ปานกลาง 7–13 | ตรง / ผ่าน |
| 12 | 14 | +2 | สูง 14–20 | ตรง / ผ่าน |
| 8 | 8 | 0 | ปานกลาง | ตรง / ผ่าน |
| 18 | 16 | −2 | สูง แม้คะแนนลดลง | ตรง / ผ่าน |
| 0 | 0 | 0 | ต่ำ | ตรง / ผ่าน |

อ้าง `six official compare examples` ใน [P4 browser log รอบ P8](./baseline/p8-logs/test-satisfaction-browser.log) และ assertions ใน `scripts/test-p4-browser.mjs`; ไม่จัดระดับจาก delta เพียงอย่างเดียว

## ขอบเขตที่ยังไม่ได้รัน

- รัน browser ด้วย Chromium บนเครื่องและ viewport มือถือ/desktop; Firefox/WebKit runtime ไม่ได้ติดตั้ง เพราะคำขอติดตั้งไม่ได้รับอนุญาต จึงบันทึก **not-run** ไม่มีการอ้างว่าได้ทดสอบ Safari/iOS/Firefox หรือเครื่องพิมพ์จริง
- Migration ใช้ฐานและข้อมูลสมมติแยกจากงานจริง ไม่ใช่การย้ายฐาน production หรือหลักฐานตรวจ bindings จริงใน P9
- ไม่มี deploy/remote migration/R2 changes; ไม่มีการลงนามรับงานแทนเจ้าของงาน

## การยืนยันจากเจ้าของงาน

- [x] เจ้าของงานตรวจ wording และชุดคำถามตาม Word
- [x] เจ้าของงานยืนยันคะแนน/มาตรฐาน/กติกาตรวจซ้ำ/รายงานตาม expected/actual ด้านบน
- [x] เจ้าของงานรับทราบขอบเขต Chromium และ browser/device ที่ยังไม่ได้รัน

เจ้าของงานยืนยันโดยตรงในแชตวันที่ **14 ตุลาคม 2026 (Asia/Bangkok)**:

> ยืนยัน UAT ตามเอกสารและรับทราบขอบเขตทดสอบ

คำยืนยันตอบคำถามที่แนบเอกสาร expected/actual นี้ พร้อมระบุขอบเขต Chromium, Firefox/WebKit not-run และยังไม่มี deploy จึงปิด P8.6/P8 ได้ตามแผน หลักฐาน: [Owner UAT](./baseline/p8-owner-uat.json)

การยืนยันนี้เป็นการรับรองเอกสารและรับทราบขอบเขตทดสอบ ไม่ได้เพิ่มผลทดสอบ manual/device/browser ที่ไม่ได้รัน และไม่ใช่คำสั่งเริ่ม P9 หรือ deploy.
