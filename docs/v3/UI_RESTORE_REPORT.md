# คืน UI เดิมและข้อมูลปัจจุบัน

วันที่ 14 ตุลาคม 2026 (Asia/Bangkok) · สถานะ: **done — UI/ข้อมูลปัจจุบันและ regression ครบ**

## สิ่งที่คืนและแก้

- Dashboard ใช้ตาราง row/column ตามสไตล์เดิม มีวันเวลา รหัส ประเภท หมวด ผู้ตรวจ/ผู้ตอบ ผล แผนผัง และดำเนินการ ทั้ง desktop/mobile; มือถือเลื่อนภายในตารางและไม่มี page overflow
- แสดงสถานะตามชนิดจริง: environment ผ่าน/ไม่ผ่าน, health ระดับอาการ, satisfaction คะแนนเฉลี่ย ไม่ใช้ข้อความผสม “ผ่าน/ระดับต่ำ”
- ใช้ข้อมูลปัจจุบันเท่านั้นสำหรับ list/summary/Excel/history export: schema ปัจจุบัน, กลุ่มที่มีในฟอร์ม และชุดคำถามความพึงพอใจปัจจุบัน; ไม่มีตัวเลือก/การ์ด unknown หรือความพึงพอใจทั่วไป
- สรุปแยก environment แสง/เสียง/ร้อน, health แสง/เสียง/ร้อน และ satisfaction environment/health พร้อมค่าเฉลี่ย Content/Design/Usability/Usefulness แต่ละกลุ่ม คำนวณจากผลที่บันทึกของงานล่าสุด
- หน้าผลมี PageHeader/รหัสงานชุดเดียว ยกเลิก header ที่ซ้อนใน HealthResult/SatisfactionResult; หัวข้อและรหัสงานยังแสดงหนึ่งชุดใน print
- ค่าตรวจ Spot/Area, เสียง และความร้อนกลับเป็นตารางตามหมวด ไม่ใช้ dump/list ของ JSON fields, UUID หรือ legacy keys; ตาราง Area samples/heat intervals แยกชัดเจน
- Navbar mobile เป็น portal ใต้ body และ fixed ที่ขอบล่าง viewport; เมนูรายงาน active เมื่อดูผลทั้งมือถือ/desktop; ซ่อนใน print
- Legacy links แสดงว่าไม่มีรายการในข้อมูลปัจจุบัน ไม่ render raw fields/คะแนนที่ไม่ได้กรอก; backend audit/immutable source snapshots ไม่ถูกเขียนทับ
- การเลือกไฟล์/preview/review ก่อน upload และแผนผัง optional/add-later ตาม D17 ยังทำงาน

## การตรวจสอบ

รวม **129 scenarios/checks ผ่าน** และ quality commands ผ่าน รวม 12 commands ตาม [commands/logs](./baseline/ui-restore-regression.json)

| กลุ่ม | ผลจริง |
| --- | --- |
| Domain + SQLite migrations | 17 + 6 ผ่าน |
| Environment form + reports unit | 11 + 10 ผ่าน |
| Worker/D1/R2 API | 23 ผ่าน รวม atomic/retry/ownership/history |
| UI restoration acceptance | 12 ผ่าน รวม old/stale questionnaire exclusions, dimension averages [1,2,3,4]/[4,3,2,1], empty table headers, severity colors, unique headers/code, viewport navbar bounds ที่ top/middle/end, print header และ XLSX snapshot |
| Reports/dashboard/Excel/print browser | 14 ผ่าน รวม 104 งานและ history 13 รอบ |
| Health/Word/navigation/drafts browser | 9 + 5 + 11 ผ่าน |
| Satisfaction browser | 11 ผ่าน |
| Quality | Frontend/Worker typecheck, lint 0 errors / 74 warnings เดิม, static build 14/14 ผ่าน |

[Acceptance JSON](./baseline/ui-restore-tests.json) · [Source SHA-256](./baseline/ui-restore-source-fingerprint.json)

ตรวจภาพ mobile/desktop แล้ว: สไตล์ตารางเดิม เลื่อนภายในตารางบนมือถือ ไม่มี page overflow; Navbar portal อยู่ล่าง viewport ห่าง 12px และเมนูรายงาน active ทั้งมือถือ/desktop; header/รหัสงานหนึ่งชุดและแสดงใน print ด้วย

อัปเดต assertions ของ harness เก่าตาม D20 เพื่อไม่คาดหวัง legacy UI อีกต่อไป โดยยังตรวจข้อมูลต้นฉบับ/คะแนน/ประวัติใน backend ไม่สร้างข้อมูลสมมติ

หลักฐานภาพ: [Dashboard desktop](./baseline/ui-restore-dashboard-desktop.png) · [Dashboard mobile](./baseline/ui-restore-dashboard-mobile.png) · [ผลตรวจ desktop](./baseline/ui-restore-result-desktop.png) · [ผลตรวจ mobile](./baseline/ui-restore-result-mobile.png) · [Navbar หลังเลื่อน](./baseline/ui-restore-nav-bottom.png)

Browser scope: Chromium กับ Worker/D1/R2 แยกจากข้อมูลจริง, mobile/desktop viewport; Firefox/WebKit/Safari/iOS และเครื่องพิมพ์จริงยังไม่ได้รันตามขอบเขตที่รับทราบ

## การเปิดดูบนเครื่อง

เปิด frontend development ที่ `http://localhost:3001/dashboard` และ Worker local ที่ `http://127.0.0.1:8787` โดยใช้ฐาน development เดิม; อ่าน Dashboard HTTP 200/API summary สำเร็จ ไม่มี unknown และข้อมูลเก่าไม่นับรวม ดังนั้นถ้าบนเครื่องยังมีเพียง 4 seed records เดิม จะเห็นงานปัจจุบัน 0 และคะแนนความพึงพอใจเป็น — ซึ่งไม่ใช่คะแนน 0

ไม่มีการ seed ข้อมูลทดสอบเข้า app DB; fixtures/คะแนนที่ใช้พิสูจน์ UI อยู่ในฐานของ harness แยก ไม่มี migration ใหม่/remote DB/R2 changes/deploy/commit/PR และไม่เริ่ม P9

P8 UAT กับผลตรวจ 181/P8 และ 173/D17–D18 เป็นหลักฐานของขอบเขตก่อนคำสั่ง D19/D20 ไม่ตีความว่าเป็นการยืนยันงานนี้แทนเจ้าของงาน

## ผลปิดงาน

Requirements/plan/progress อัปเดต D19/D20 แล้ว; เปิด local frontend/Worker สำหรับรีวิวโดยใช้ฐานเดิม ไม่มี decision ค้างของงานครั้งนี้และไม่เริ่ม P9
