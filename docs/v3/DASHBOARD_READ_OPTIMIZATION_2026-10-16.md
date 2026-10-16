# Dashboard / Excel: ลด D1 reads หลัง P9

สถานะ: **migration `0009` และ API deploy production แล้ว** ตามคำยืนยันผู้ใช้; frontend ชุด optimization นี้ผู้ใช้จะ deploy เอง

API version: `3c4b1872-95e4-4836-b07c-3247188af5ed` (ก่อนเปลี่ยน: `5aa6b312-0f26-4576-9b8a-f6acfb8bf465`)
API: https://save-check-api.ameenahroya.workers.dev/api
Backup ก่อน/หลังและ source API อยู่ใน `.wrangler/dashboard-opt-20261016/` (private, ignored Git)

## การเปลี่ยนแปลง

- เพิ่ม migration `0009_dashboard_read_indexes.sql` ซึ่งสร้างดัชนี 2 ตัวสำหรับรายการ schema 3 ตามวันที่สร้างและประเภท ไม่แก้ไข/ลบ/ย้ายแถวข้อมูล ไม่เปลี่ยนนโยบายแสดงข้อมูล legacy ที่ผู้ใช้ยืนยันไว้
- กรองวันที่สร้างด้วยขอบเขต UTC ของวันไทย เพื่อใช้ดัชนีได้ โดยยังเรียงเวลาจริงด้วย `julianday(created_at)` และรองรับ timestamp ที่มี timezone ต่างกัน
- ใช้ยอดสรุปเดิมในหน่วยความจำของหน้า Dashboard สำหรับเปลี่ยนหน้า จำนวนต่อหน้า และการเรียง หากอายุไม่เกิน 30 วินาที ไม่เก็บใน localStorage หรือ shared cache การเปลี่ยนตัวกรอง การเปิดหน้าใหม่/รีโหลด และการลองใหม่จะโหลดใหม่ หากยอดนับรายการใหม่ต่างจากยอดสรุป จะอ่านสรุปใหม่ทันที อายุ 30 วินาทีตรวจเมื่อมีการกระทำถัดไป ไม่ใช่ polling เบื้องหลัง
- Export ประวัติใช้หัวงานที่อ่านแล้วภายใน request เดียวกัน ทุก round ยังใช้ snapshot ของตัวเอง ไม่มี cache ข้าม request
- อ่าน revision row เพียงครั้งเดียวเมื่อประกอบผลการประเมิน ทั้งหน้าผลและ Export ข้อมูลคำตอบ รายละเอียดจุดวัด ไฟล์แนบ และคอลัมน์ Excel ใช้ข้อมูลเดิม
- ยังคงนับงานในทุกหน้า Export และตรวจจำนวน/version/รอบให้ครบ ไม่ตัดการตรวจความครบถ้วนเพื่อประหยัด read

## ผลวัด

ใช้ Miniflare D1 แยกชั่วคราว: legacy 10,000 งาน, งานใหม่ 120 งาน (สิ่งแวดล้อม/สุขภาพ/ความพึงพอใจ), revision ใหม่ 120 รอบ เทียบโค้ดก่อนปรับกับโค้ดใหม่และดัชนี ใช้ `meta.rows_read` ของ query จริง ไม่ใช้จำนวน request แทน rows read

| กรณี | เดิม | หลังปรับ | ลดลง |
| --- | ---: | ---: | ---: |
| Dashboard เปิดหน้ารวม: รายการ + สรุป | 1,106 | 792 | 28.39% |
| ค้นหาชื่อผู้ตรวจ | 931 | 806 | 13.43% |
| กรองประเภท/วัน และเรียงจากเก่า | 522 | 428 | 18.01% |
| Export งานล่าสุดทั้งหมด | 7,455 | 3,474 | 53.40% |
| Export ประวัติหน้าแรก | 529 | 369 | 30.25% |
| Export ประวัติหน้าถัดไป | 22 | 20 | 9.09% |

ตัวเลขนี้เป็น fixture ไม่ใช่คำรับรองเปอร์เซ็นต์ของ production ทุกขนาดข้อมูล/ตัวกรอง ผลยังไม่รวมการประหยัดจากการไม่ขอสรุปซ้ำเวลาเปลี่ยนหน้า ดัชนีเพิ่มการเขียนและพื้นที่เล็กน้อย (สำเนา backup จริงเพิ่ม 8,192 bytes เนื่องจากยังไม่มีงาน schema 3) จึงยังต้องดู usage จริงเมื่อเริ่มมีข้อมูลใหม่มากขึ้น

รายงาน: [ผลวัด read](baseline/dashboard-read-optimization.json), [ตรวจ backup จริง](baseline/dashboard-read-real-backup.json)

## ตรวจความครบถ้วน

- เทียบ API ก่อน/หลังแบบ deep equality: รายการ/ยอดสรุป/ค้นหา/เรียง/วันที่สร้าง/วันที่ตรวจล่าสุด และ Export latest/history รวมหน้าประวัติถัดไป
- ตรวจขอบเขตวันไทยก่อนเริ่มวัน, เริ่มวัน, สิ้นวัน และเริ่มวันถัดไป รวมการแบ่งหน้าที่เกิน 100 รายการ
- Restore backup production หลัง P9 ลง SQLite ในหน่วยความจำ แล้วเพิ่มดัชนี: ทุก field ของทั้ง 27 ตารางเท่าเดิม รวม 1,159 งาน, 10,100 คำตอบสุขภาพ และ layout snapshot 80 รายการ; integrity check ผ่านและไม่มี FK violations ไม่เขียนฐานจริง
- API integration `test:p2`: 26 กรณีผ่าน รวมไฟล์ D1 10 MB, retry, immutable history, legacy attachment bytes และ history pagination
- Export unit `test:p7`: 11 กรณีผ่าน รวมเกิน 100 งาน, ตรวจไม่ให้ส่งออกบางส่วน/ซ้ำ และ snapshot Excel
- Browser `test:p7:browser`: 21 กรณีผ่าน รวม API/Excel/ไฟล์แนบ, ส่งออก 104 งาน, ประวัติ 13 รอบ, ตัวกรองและ timezone, และยืนยันว่าเปลี่ยนการเรียง/จำนวนต่อหน้าไม่ขอสรุปซ้ำ แต่รีโหลด/เปลี่ยนตัวกรองขอสรุปใหม่
- Frontend/Worker typecheck, scoped ESLint และ diff check ผ่าน

## การนำขึ้นใช้งานจริง

สำรอง production ล่าสุดแล้ว ใช้ guarded migration runner เพิ่มเฉพาะ `0009` สำเร็จ (ดัชนี 2 ตัว) และ deploy Worker ใน `env.production` โดยใช้ D1 เดิม ไม่ seed/truncate ไม่เปิด R2 และไม่ deploy Pages

Frontend ยังต้อง deploy จากโค้ดล่าสุดโดยผู้ใช้ ค่า production API ใช้ Cloudflare Pages environment เดิม ประโยชน์จากการใช้ยอดสรุปซ้ำจะเริ่มหลังอัปเดต frontend ส่วนดัชนีและการลด query ซ้ำของ API ใช้งานแล้ว

ตรวจ API health/Dashboard/list/Export รวม CORS ก่อนและหลัง; business response hash ตรงกัน ช่วงสร้าง export หลัง deploy มี transient 500 จากการตรวจที่รันพร้อม export; ตรวจซ้ำหลังสร้าง export แล้วผ่าน รายละเอียดการรักษาข้อมูลและไฟล์แนบ production อยู่ใน `baseline/dashboard-opt-production-data.json` และ `baseline/dashboard-opt-production-files.json`

คำสั่งตรวจซ้ำเฉพาะดัชนี: `npm run test:dashboard-reads` ใช้เฉพาะฐานจำลองในเครื่อง; ผลก่อน/หลังของคำสั่งปกติคือโค้ดใหม่ที่ยังไม่มีดัชนีเทียบกับโค้ดใหม่พร้อมดัชนี รายงาน release ข้างบนใช้ baseline bundle ที่เก็บก่อนแก้โค้ดเพิ่มเติมเพื่อวัดผลรวม

ตรวจ production เสร็จ: ทุก field/แถวในตารางข้อมูล 26 ตารางคงเดิมครบ 1,159 งาน; ดาวน์โหลดไฟล์แนบเดิม 80 รายการทั้งก่อนและหลังได้ 200 และ byte length/SHA-256 ตรงกับ backup ทุกไฟล์ ไม่มี FK error และ integrity check ผ่าน การนับ 26 ตารางนี้ไม่รวมตารางภายใน Cloudflare กับ migration ledger ซึ่งเพิ่มเฉพาะรายการ 0009
