# บันทึกส่วนก่อนและกลับมาทำส่วนหลังข้ามเครื่อง

> ยกเลิก flow นี้ตามคำสั่งเจ้าของงาน D23 วันที่ 15 ตุลาคม 2026 ปัจจุบันต้องทำก่อนและหลังให้ครบก่อนบันทึก ไม่มีข้าม/รายการรอทำต่อ ดู [ข้อกำหนดปัจจุบัน](./HEALTH_COMPLETE_BEFORE_AFTER_REPORT.md) เนื้อหาด้านล่างเก็บเป็นประวัติงานเดิม

วันที่: 15 ตุลาคม 2026 · สถานะ: done · ยังไม่ deploy

เจ้าของงานยืนยันให้เก็บข้อมูลบนระบบเพื่อเปิดต่อข้ามเครื่อง จึงเพิ่มการพักแบบประเมินอาการทางสุขภาพด้านแสงหลังตอบส่วนก่อนครบ โดยไม่สร้างผลคะแนนปลอมจากคำตอบหลังที่ยังไม่ได้ตอบ

## Flow และข้อความ

1. กรอกข้อมูลพื้นฐาน/การปฏิบัติงาน/การเรียน และตอบส่วนก่อน 10 ข้อ
2. เลือก “ไปประเมินหลัง” เพื่อทำต่อทันที หรือ “บันทึกไว้ทำภายหลัง” เพื่อบันทึกบนระบบแล้วกลับ Dashboard
3. Dashboard แสดงตาราง “แบบประเมินที่รอทำต่อ” มีชื่อผู้ตอบ วันที่บันทึก สถานะ “รอประเมินหลัง” จำนวนคำตอบหลัง และปุ่ม “ทำแบบประเมินต่อ” ที่เห็นได้ทันทีบนมือถือโดยไม่ต้องเลื่อนตารางหา; หากตอบหลังครบแต่ยังไม่ยืนยันผล แสดง “รอสรุปผล”
4. เปิดจากอีกเบราว์เซอร์/เครื่องได้ โดยโหลดข้อมูลบนระบบและเปิดแท็บหลัง คำตอบหลังที่ทำไว้บางข้อยังอยู่ คำตอบที่ยังไม่ได้ทำยังว่าง
5. สามารถย้อนกลับดู/แก้ข้อมูลก่อนส่ง และบันทึกพักซ้ำได้ เมื่อตอบครบจึงทบทวนและบันทึกผลตามสูตรเดิม รายการรอทำต่อจะเชื่อมกับผลสำเร็จและไม่ปรากฏซ้ำในตารางรอ

## Frontend / Worker / ฐานข้อมูล

- แยก pending contract ออกจาก complete submission: ข้อมูลพื้นฐานครบ ก่อนครบ หลังบางส่วนได้ ไม่มีคะแนนหรือระดับอาการในข้อมูลร่าง
- Migration `0006_health_pending.sql` เพิ่มตารางร่างและตารางเชื่อมผลสำเร็จ ไม่แก้ข้อมูล/คอลัมน์เดิม
- API `/api/health-light-drafts`: list แบบแบ่งหน้า, save ด้วย ID คงเดิมและ expected version, read และ complete
- บันทึกผลสำเร็จกับการปิดร่างใน D1 batch เดียว ตรวจ version ด้วย trigger และใช้ idempotency เดิม; การส่งจากฐานเก่าหรือผิดชนิดย้อนกลับทั้ง batch
- กันการส่งสำเร็จปกติชนกับการสร้างร่างครั้งแรกด้วย precondition/trigger และไม่อนุญาตนำ request ที่เสร็จแล้วมาสร้างร่าง
- Dashboard ใช้ตาราง row/column แบบเดิม รายการ pending แยกจากสถิติ/รายการผลสำเร็จ/Excel ไม่มีการนับ after ที่ยังว่างเป็น 0
- ร่างที่พิมพ์บนเครื่องยัง autosave ในเบราว์เซอร์เพื่อกู้จากเครือข่ายล้มเหลว แต่การเปิดข้ามเครื่องใช้ข้อมูลที่กดบันทึกบนระบบแล้วเท่านั้น
- เมื่ออีกหน้าแก้ข้อมูลใหม่ จะปฏิเสธการเขียนทับและเก็บคำตอบค้างบนเครื่องไว้ ให้เปิดฐานล่าสุดจาก Dashboard

## การทดสอบและสถานะ

`npm run test:health-pending:regression` ผ่าน **139 scenarios/checks รวม 13 commands**: domain/SQLite 17+6, health unit 8, pending API/browser 11, API regression 23, migration rehearsal 7, UI restore 17, health/Word/navigation 9+5+11, satisfaction browser 11 และ report/Excel/PDF browser 14; frontend/Worker typecheck, lint (0 errors / 74 warnings เดิม), build (14/14) และ diff check ผ่าน

ชุดใหม่ตรวจ incomplete validation, before-only, partial-after/zero, retry หลัง response หาย, CAS/concurrent save, stale finalize, rollback, normal-submit racing first draft, fresh browser context ที่ไม่แชร์ storage, กลับ/refresh, conflict และ Dashboard pagination

เพิ่มการตรวจคำยืนยันบันทึกที่เป็น success แต่ data ไม่ครบ ว่าต้องเก็บคำตอบไว้และไม่แจ้งว่าบันทึกสำเร็จ; ตรวจตำแหน่งลิงก์ทำต่อให้อยู่ภายใน viewport ที่ 320/390/1440 พิกเซล ไม่มี browser page errors หรือ foreign-key violations

หลักฐาน: [ผล pending scenarios](./baseline/health-pending-tests.json) · [commands/logs](./baseline/health-pending-regression.json) · [source fingerprint](./baseline/health-pending-source-fingerprint.json) · [Dashboard mobile](./baseline/health-pending-dashboard-mobile.png) · [Dashboard desktop](./baseline/health-pending-dashboard-desktop.png)

ฐาน local: สำรองแล้วที่ `/private/tmp/save-check-health-pending-backup-z5ae4hf8/local.sqlite` และ apply migration 0006 เรียบร้อย ตรวจคอลัมน์/จำนวนแถว/hash ของข้อมูลเดิมทั้ง 23 ตารางตรงเดิมทั้งหมด ไม่มี foreign-key violations และ ledger ครบ 6 migrations; ตารางใหม่ว่าง ณ เวลาตรวจหลัง migration ไม่ได้ใส่ fixture ทดสอบลงฐาน development ดู [หลักฐาน](./baseline/health-pending-local-db.json) · [backup metadata](./baseline/health-pending-local-backup.json) · [migration log](./baseline/health-pending-local-migrate.log) ไม่ทำ remote migration

หมายเหตุชุดทดสอบ: ปรับ migration harness ให้ระบุไฟล์ optional-layout ด้วยชื่อแทนการถือว่าเป็น migration สุดท้าย และให้ migration rehearsal ตรวจจำนวน ledger ตามไฟล์จริง เพื่อคงการตรวจ 0005 เดิมเมื่อเพิ่ม 0006; แก้ locator ปุ่มย้อนกลับในชุดใหม่ให้เจาะปุ่มในฟอร์ม ไม่ใช้ปุ่มที่หัวหน้าแทนกัน

Browser scope คือ Chromium ทดสอบ viewport มือถือและ desktop ไม่ได้รัน Firefox/WebKit/Safari/iOS และไม่มี deploy/commit/PR
