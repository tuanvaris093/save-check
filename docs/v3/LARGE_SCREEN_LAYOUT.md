# Desktop เฉพาะจอใหญ่ และ mobile shell สำหรับจอกลาง (D30)

วันที่: 15 ตุลาคม 2026 · done · ยังไม่ deploy

- ต่ำกว่า 1440px: ใช้เมนูล่าง ซ่อน Sidebar เนื้อหาขยายเต็ม viewport และหน้าเลือกฟอร์มเรียงหนึ่งคอลัมน์
- ตั้งแต่ 1440px: ใช้ Sidebar และเลือกฟอร์มสองคอลัมน์
- ใช้ความกว้างพื้นที่แสดงเว็บ ไม่ตรวจยี่ห้ออุปกรณ์/UA จึงทำงานเหมือนกันเมื่อหมุนจอ/ปรับหน้าต่าง/เปิด DevTools
- ย้าย breakpoint ของ shell/header/home/form frames และการ์ดสถิติให้ตรงกัน รวม safe-area padding เพื่อไม่ให้เมนูล่างทับส่วนท้าย
- เพิ่ม responsive-shell.css ที่ layout เพื่อยืนยันลำดับ CSS ใน dev server ที่มี stylesheet เก่าค้าง

P7 browser 15 scenarios ผ่าน รวม matrix 6 widths (390, 820, 1024, 1366, 1439, 1440) × 4 routes (หน้าแรก/เลือกสภาพแวดล้อม/เลือกสุขภาพ/Dashboard): มีเมนูถูกชุดเดียวเสมอ, ไม่มี horizontal overflow, ความกว้างเนื้อหาเต็มจอด้านล่าง breakpoint, จำนวนคอลัมน์ถูกต้อง; frontend typecheck/ESLint/diff check ผ่าน

ภาพหลักฐาน baseline/responsive-shell-1024.png, responsive-shell-1366.png และ responsive-shell-1440.png; ตรวจภาพ 1024px แล้ว

ไม่ได้ deploy หรือเปลี่ยนข้อมูล/ฐานข้อมูล
