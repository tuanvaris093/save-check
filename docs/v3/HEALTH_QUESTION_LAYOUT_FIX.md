# แก้กรอบคำถามและแท็บก่อน/หลัง

วันที่: 15 ตุลาคม 2026 · สถานะ: done · ยังไม่ deploy

ตามภาพเจ้าของงาน หัวข้อคำถามถูกวางใน `legend` ของ fieldset ที่เป็นกรอบการ์ด จึงวางทับขอบบนตามการแสดงผลของ browser แก้โดยให้การ์ดเป็นกรอบภายนอก แล้ววาง fieldset/legend อยู่ภายในการ์ด มี padding รอบข้อความและตัดบรรทัดได้ ทั้งคำถามแสง เสียง และความร้อนยังใช้คำถาม/คะแนนเดิม

แท็บก่อน/หลังที่เลือกใช้พื้นน้ำเงินเข้ม ตัวอักษรขาว อีกแท็บพื้นขาว และเชื่อม tabpanel กับแท็บปัจจุบันด้วย aria-labelledby; คงเงื่อนไขตอบก่อนให้ครบ การสลับกลับและการเก็บคำตอบเดิม

จากการตรวจภาพจริงพบเมนูล่างมีทั้ง class `-translate-x-1/2` และ inline `transform: translateX(-50%)` ซึ่งใน Tailwind รุ่นที่ใช้อยู่เลื่อนสะสมกัน ทำให้เมนูหลุดซ้าย แก้ให้เลื่อนเพียงครั้งเดียว และเพิ่มการตรวจทั้งขอบซ้าย/ขวา จุดกึ่งกลาง และระยะจากขอบล่าง เมื่อเลื่อนหน้า top/middle/end

Regression ตรวจพบเมนูล่างบังปุ่มปิดหน้าต่างข้อมูลผู้จัดทำ จึงย้ายหน้าต่างเป็น portal บน document.body และกำหนดชั้นสูงกว่าเมนู ทดสอบด้วยการกดปุ่มปิดจริงตามปกติ โดยไม่ใช้ force click

## ทดสอบ

- `npm run test:p4:browser`: ผ่าน 9 health + 11 navigation scenarios เพิ่มตรวจหัวข้อ/ตัวเลือก 10 การ์ด × 2 ช่วงก่อน/หลัง × 3 ความกว้าง (320/390/1440) รวม 60 การ์ด และสี/aria-selected/aria-labelledby
- เมนูล่างตรวจ 2 ความกว้างมือถือ × 2 ช่วงคำถาม × 3 ตำแหน่งเลื่อน รวม 12 ตำแหน่ง ขอบซ้าย–ขวาอยู่ใน viewport และเมนูอยู่กึ่งกลาง
- `npm run test:ui-restore`: ผ่านอีก 17 scenarios รวมทุก route variants และการตรวจ navbar ที่เข้มขึ้น รวมรอบนี้ **37 browser scenarios** ไม่มี browser page errors หรือ foreign-key violations
- ESLint เฉพาะไฟล์ที่แก้และ frontend typecheck ผ่าน

หลักฐาน: [ผลและ source hashes](./baseline/health-tabs-checks.json) · [health/navigation log](./baseline/health-tabs-browser.log) · [UI regression log](./baseline/health-tabs-ui-regression.log) · [แท็บก่อน 390px](./baseline/health-tabs-before-390.png) · [แท็บหลัง 390px](./baseline/health-tabs-after-390.png) · [desktop](./baseline/health-tabs-after-1440.png)

ทดสอบด้วย Chromium กับ Worker/D1/R2 และพอร์ตแยกจากเซิร์ฟเวอร์ development ของเจ้าของงาน Firefox/WebKit/Safari/iOS ยังไม่ได้ทดสอบ ไม่ deploy/remote migration และไม่เปลี่ยนข้อมูลจริง
