# SafeCheck v3 บันทึกความคืบหน้า

อัปเดตล่าสุด: 16 ตุลาคม 2026 (Asia/Bangkok)

เอกสารอ้างอิง: [Requirements และคำยืนยัน](./REQUIREMENTS_V3.md) · [แผน Phase และ checklist งาน](./IMPLEMENTATION_PLAN_V3.md)

## สถานะปัจจุบัน

- 16 ตุลาคม: ตามคำยืนยันผู้ใช้ migrate `0009` และ deploy เฉพาะ API production version `3c4b1872-95e4-4836-b07c-3247188af5ed` แล้ว สำรอง D1 ล่าสุดก่อน/หลังใน `.wrangler/dashboard-opt-20261016/`; frontend optimization ผู้ใช้จะ deploy เอง รายละเอียด [รายงาน optimization](./DASHBOARD_READ_OPTIMIZATION_2026-10-16.md)

- 16 ตุลาคม: ลด read Dashboard/Export หลัง P9: ดัชนีแบบเพิ่มอย่างเดียว, ใช้ยอดสรุปซ้ำเฉพาะหน้าอายุไม่เกิน 30 วินาที และลดการอ่าน header/revision ซ้ำ ผล fixture ลดหน้า Dashboard 28% / Export latest 53% / history 30%; API 26, Export unit 11 และ browser 21 กรณีผ่าน สำเนา backup จริงทั้ง 27 ตารางและไฟล์แนบเดิมไม่เปลี่ยน **ยังไม่ migrate/deploy ชุดนี้** ดู [รายละเอียด](./DASHBOARD_READ_OPTIMIZATION_2026-10-16.md)

- 16 ตุลาคม: cleanup ตามคำขอ ลบ build ทดสอบ 11 โฟลเดอร์/ภาพและไฟล์ผลทดสอบ 85 ไฟล์, `.next`/`out`/cache ที่สร้างใหม่ได้ เก็บโค้ด เอกสารต้นฉบับ ผลตรวจ JSON/logs และ backup D1/source archive ครบ เพิ่ม ignore ให้ generated artifacts; เปิด dev server พอร์ต 3000 กลับ ไม่เปลี่ยน production

- 16 ตุลาคม: **P9 done / production deployed** ใช้ D1 อย่างเดียว ไม่เปิด R2/การเรียกเก็บเงิน; migration 0001–0008 ครบ ข้อมูลเดิม 1,159 รายการและทุก field ทั้ง 8 ตารางเทียบก่อน/หลังตรงกัน เปิดไฟล์เดิม 80 ไฟล์ผ่าน production API ได้ bytes ตรงต้นฉบับทั้งหมด; API 26, staging API 12, preview browser 6, production browser 3 และ regression ตาม [รายงาน release](./P9_RELEASE_2026-10-16.md) ผ่าน ไม่สร้างข้อมูลทดสอบปน production; เพิ่ม Excel filename hyperlinks และบีบรูปตาม D61 (≤5,000,000 bytes/คงต้นฉบับที่เล็กกว่า) Worker `5aa6b312-0f26-4576-9b8a-f6acfb8bf465`, Pages `8d22ab9c`; legacy ยังแยกจาก Dashboard ตามคำยืนยันล่าสุด

- 16 ตุลาคม: ปุ่ม **เสร็จสิ้น** ในหน้าผลลัพธ์แสดงเฉพาะ URL หลังบันทึกฟอร์ม (`saved=1`) เปิดดูรายการเดิมจาก Dashboard จะไม่แสดงปุ่ม คงการกลับหน้าต้นทางหลังบันทึก ทดสอบ P7 browser 20 กรณีผ่าน รวมซ่อนปุ่มทั้งสภาพแวดล้อม/สุขภาพ/ความพึงพอใจ และเส้นทางหลังบันทึกเดิม; scoped ESLint, JS syntax และ diff check ผ่าน ยังไม่ deploy

- 16 ตุลาคม: **Pre-P9 audit** รัน core 8 ชุด (รวม API 23 กรณี), migration rehearsal 7 กรณี และ build/lint/typecheck ผ่านใหม่ พบ config ยังเป็น development/localhost และ build ยังชี้ localhost API จึงยังไม่พร้อม deploy ทันที ต้องตรวจฐานจริง/ledger/backup/restore/bindings และ smoke test ปลายทางใน P9; ยังมีประเด็น Excel คอลัมน์บริเวณใกล้/ถัดออกไปที่ผู้ใช้ทัก รายละเอียด [รายงานก่อน P9](./PRE_P9_READINESS_2026-10-16.md) ไม่ได้แตะฐานจริงหรือ deploy

- 16 ตุลาคม: **D59 done** ปรับเฉพาะภาพรวมสุขภาพแสงเป็นการ์ดก่อน/หลังตัวเลขใหญ่พื้นฟ้า/ม่วง พร้อมลูกศรและข้อความผลต่าง แถบระดับอาการใช้เขียว/เหลือง/แดงตามคะแนนหลังเดิม คงตารางคำตอบและเกณฑ์คำนวณทั้งหมด ใช้ร่วมก่อนและหลังบันทึก; P4 browser 10 + P3 browser 11 ผ่าน รวมตัวอย่างคะแนน 6 กรณีและคะแนนลดลงแต่ยังสูง ตรวจภาพ mobile/desktop แล้ว typecheck/scoped ESLint/diff check ผ่าน แก้ selector ใน regression ให้ระบุสถานะร่าง ไม่ชน global loading ยังไม่ deploy

- 16 ตุลาคม: **D58 done** เพิ่ม SummaryHeading/SummaryField และ stylesheet ร่วม สรุปสุขภาพ/สภาพแวดล้อม/ความพึงพอใจก่อนและหลังบันทึกแยกชื่อช่อง 13px สีเข้ม 600 จากข้อมูล 14px สีเทาเข้ม 400 หัวข้อกลุ่ม 16px พร้อมไอคอน แยกส่วนข้อมูลส่วนตัว/การทำงานด้วยเส้นและระยะห่าง จัดคะแนน คำตอบ คำแนะนำและตารางให้อ่านง่าย; P7 browser 20 ผ่านรวมตรวจ 9 รูปแบบ (Spot/Area/noise/heat, health 3, satisfaction 2) ที่ 390/1440px ไม่ล้นจอและ hierarchy ตรงกัน ตรวจภาพ health/satisfaction แล้ว; typecheck/scoped ESLint/diff check ผ่าน ยังไม่ deploy

- 16 ตุลาคม: **D57 done** เพิ่มปุ่ม “เสร็จสิ้น” ท้ายหน้าผลทุกแบบ ใช้ปลายทางหลังบันทึกกลับหน้าเลือกหัวข้อ environment/health หรือหน้าเลือกกลุ่ม satisfaction ตามทางเข้า การตรวจซ้ำ/แก้ไขกลับหน้าผลต้นทาง เปิดรายงานจาก Dashboard กลับ Dashboard และซ่อนปุ่มตอนพิมพ์; P5 browser 17 ผ่านรวมบันทึกจริงแล้วกดกลับกลุ่ม, P7 browser 19 ผ่านรวมปลายทางทุกกลุ่ม/ตรวจซ้ำ/เลือก satisfaction/print, frontend typecheck/scoped ESLint/diff check ผ่าน ยังไม่ deploy

- 16 ตุลาคม: **D56 done** Dashboard Excel เหลือชีตผู้ใช้ 9 ประเภท/หมวดที่มีข้อมูล ตัดคอลัมน์ ID/รุ่น/ข้อมูลระบบและชีต audit ที่ซ่อนออก คงลำดับ/รหัสการประเมิน/วันที่และเวลา (created_at), ช่องกรอกและผลครบ เพิ่มชื่อไฟล์ผังและมาตรฐานที่เลือกแบบอ่านรู้เรื่อง; เทียบทุกฟอร์มกับ API ในไฟล์ดาวน์โหลดจริง P7 browser 18 + unit 11/typecheck/scoped ESLint/diff check ผ่าน ดู `DASHBOARD_FORM_COLUMN_AUDIT.md` ยังไม่ deploy

- 16 ตุลาคม: **D55 done** ตรวจ Excel ประวัติจากไฟล์ดาวน์โหลดจริงก่อนและหลังวัดซ้ำ 3 รอบ ผู้ตรวจต่างกัน ข้อมูลชื่อ/ตำแหน่ง/สถานที่/เครื่องมือ/Serial/แผนก/ผู้รับผิดชอบ วันตรวจ/เริ่ม/สิ้นสุด/สอบเทียบ/บันทึก ค่าตรวจ/ผลและที่มาของค่าครบตรง snapshot ทุกรอบ รอบแรกในทั้งชีตภาพรวมและฟอร์มไม่เปลี่ยนยกเว้นสถานะล่าสุดเป็นย้อนหลัง ตรวจ snapshot เต็มทั้ง 3 รอบตรง API; P5 browser 17 + P7 unit 11/scoped ESLint/JS syntax/diff check ผ่าน ไฟล์ทดสอบ `baseline/retest-history-three-inspectors.xlsx` ยังไม่ deploy

- 16 ตุลาคม: **D54 done** ปลดล็อกผู้ตรวจ/ตำแหน่ง/สถานที่/เครื่องมือ/Serial/วันที่ปรับเทียบ/แผนก/ผู้รับผิดชอบตอนวัดซ้ำ ส่งและเก็บ inspection snapshot ของรอบใหม่ พร้อมชื่อผู้ตรวจในรายการประวัติ API ยังคงรองรับ request เก่าที่ส่งเฉพาะวันเวลา; P5 browser 17 ผ่านรวมผู้ตรวจต่างกัน 3 รอบและ metadata อื่นเปลี่ยนได้ รอบแรก/รอบสองไม่ถูกเขียนทับ, P7 browser 18 ผ่านรวมประวัติ/Excel/print, domain 17 + migration 6 + P5 unit 12/typecheck frontend/Worker/scoped ESLint/diff check ผ่าน ยังไม่ deploy

- 16 ตุลาคม: **D53 done** เอา Standards/คำแนะนำออกจากขั้นกรอกค่าตรวจวัดร่วมทุกหมวดและทุกโหมด เหลือในขั้นสรุปก่อนบันทึก ตรวจสุขภาพและความพึงพอใจมี summary เฉพาะขั้นสุดท้ายอยู่แล้ว; P5 browser 17 ผ่านรวม assert ขั้นกรอกไม่มีคำแนะนำ/ลิงก์มาตรฐานและขั้นทบทวนมีครบ/typecheck/scoped ESLint/diff check ผ่าน ยังไม่ deploy

- 16 ตุลาคม: **D52 done** เอาช่องค่าเป้าหมายที่เพิ่มเองออกจาก UnitEditor ทุกโหมด เลือกมาตรฐานใช้ขั้นต่ำอัตโนมัติ คืนคำอธิบายไทยในวงเล็บท้าย Spot/Area คง catalog/ID และเกณฑ์เดิมของประวัติ; P5 browser 17 ผ่านรวมไม่มี input เป้าหมาย/ข้อความ dropdown ไทยและบันทึก Spot รอบโดยรอบที่ขั้นต่ำ 1200, P5 unit 12 รวมเติมค่าอัตโนมัติ 400 และรักษาเกณฑ์เดิม 500/typecheck/scoped ESLint/diff check ผ่าน ยังไม่ deploy

- 16 ตุลาคม: **D51 done** คอลัมน์วันที่ Dashboard ใช้ created_at คืนค่าเริ่มต้น/ล้างตัวกรองเป็นวันสร้างงาน เรียงตามเวลาสร้างจริงด้วย julianday และ id ทั้ง asc/desc แยกฐานกรองช่วงวันออกจากเวลาที่เรียง/แสดง; P7 browser 18 ผ่านรวมข้อมูลทดสอบเขตเวลา +07/Z ที่เรียงข้อความแล้วผิด ตรวจคอลัมน์วันที่ทุกรายการตรง API และสลับเรียงได้ทั้งสองทาง, P7 unit 11/typecheck frontend และ Worker/scoped ESLint/diff check ผ่าน ยังไม่ deploy

- 16 ตุลาคม: **D50 done** ใช้ LayoutAttachmentCard/FileUpload ร่วมกันทุกหน้าที่มีผัง ทั้งกรอก ทบทวน ผลและ legacy รวม preview แก้ไขได้ในหน้าทบทวน เอาข้อความไม่มีผัง/การ์ดไฟล์ที่ซ้ำออก โหลด metadata ไฟล์เก่าตาม ID และประวัติอ่านอย่างเดียว การลบในร่าง retest ระบุ layout=null เพื่อไม่ดึงผังเดิมกลับ; P5 browser 17 ผ่านรวมเลือกไฟล์ใหม่จากหน้าทบทวนแล้วบันทึกจริงและตรวจหนึ่งการ์ด, P7 browser 17 ผ่านรวมพิมพ์/ประวัติ, domain 17 + migration 6 + P5 unit 12 ผ่าน; typecheck frontend/Worker, scoped ESLint ไม่มี error (4 warnings any เดิมใน review-step) และ diff check ผ่าน ยังไม่ deploy

- 16 ตุลาคม: **D49 done** เอาเงื่อนไขเวลารายจุดความร้อนต้องอยู่ภายในเวลารวมออกจาก shared create/correction schema และ retest preparation; P5 browser 17 ผ่าน รวม create/retest 14:59–15:59 นอกเวลารวม 08:00–11:00 และ correction เวลารายจุดอิสระจากเวลารวม ข้อมูลเก่า/carry คงเดิม; domain 17 + migration 6 + P5 unit 12/typecheck frontend และ Worker/scoped ESLint/diff check ผ่าน ยังไม่ deploy

- 16 ตุลาคม: **D48 done** คืนฟอร์มความร้อนทุกช่องตาม c278e1e: เวลา HH:MM, DB/WB/GT, ค่าเครื่อง, ประเภทงาน/มาตรฐาน และ WBGT เฉลี่ย เก็บแยกครบ เอาวิธีรับค่า/เพิ่มช่วง/บังคับทุกครั้ง 120 นาทีออกจากฟอร์ม; ลดตัวเลือกวิธีเสียงและระยะเวลาซ้ำที่เพิ่มเอง คืนค่าเฉลี่ยสรุปเสียง/ความร้อน ส่วนที่คงมีที่มาจากคำสั่งใน [ผลตรวจขอบเขต](./REQUEST_SCOPE_AUDIT.md) พร้อมแก้ P0/Field matrix ให้ D48 มีผลเหนือการออกแบบเก่า; P5 browser 17/P7 browser 17 ผ่าน รวมกรอกความร้อน 45 นาที เก็บ raw/เครื่อง/เฉลี่ยแยกและเปิดแก้กลับมาเดิม, domain 17 + migration 6 + P5 unit 12 + P7 unit 11 ผ่าน; typecheck frontend/Worker, scoped ESLint/diff check ผ่าน ยังไม่ deploy

- 16 ตุลาคม: **D47 done** เอาข้อความรหัสจุด UUID ออกจาก UnitEditor ที่ใช้ร่วมกันในหน้ากรอก/ทบทวน/วัดซ้ำ และ LegacyResult พร้อมกรอง point/sample IDs จากรายละเอียด legacy คง ID ในข้อมูล/React keys; ตรวจค้น UI ทั้ง src, typecheck และ scoped ESLint ผ่าน ยังไม่ deploy

- 16 ตุลาคม: **D46 done** ดึง metadata ผังตาม revision มาแสดงเป็นการ์ดไฟล์เดิม มีเปลี่ยน/ลบ/ดาวน์โหลด บันทึกเฉพาะ dirty และยกเลิกคืนไฟล์เดิม ลบผ่าน correction เมื่อบันทึกเท่านั้น เก็บไฟล์รอบเก่าไว้; P5 browser 17 ผ่านรวมตรวจชื่อ/ชนิด/ขนาด เปลี่ยนไฟล์ ลบก่อน save ไม่กระทบ server ยกเลิกคืนค่า บันทึกลบแล้ว has_layout=0 และไฟล์ย้อนหลังยัง HTTP 200; typecheck frontend/Worker, scoped ESLint และ diff check ผ่าน ยังไม่ deploy

- 16 ตุลาคม: **D45 done** แนบ/เลือกผังใหม่และบันทึกได้ใน Room Layout บนหน้าผลล่าสุดโดยตรง เอาปุ่มพาไปแก้ทั้งฟอร์มออก ใช้ correction พร้อม version guard และคง upload/save key เมื่อ retry เก็บหน่วยตรวจเดิมครบและรอบย้อนหลังอ่านอย่างเดียว; P5 browser 17 ผ่านรวมกรณี server บันทึกสำเร็จแต่ response หลุดแล้ว retry เกิด revision เดียว ตรวจผังรอบเก่าไม่เปลี่ยน; typecheck/scoped ESLint/diff check ผ่าน ยังไม่ deploy

- 16 ตุลาคม: **D44 done** ประวัติรอบตรวจเปลี่ยนเป็นรายการมีเลขรอบ วันเวลาและสถานะ แถวปัจจุบันพื้นอ่อนพร้อมข้อความกำลังดู ปุ่มดูรอบนี้เฉพาะรอบอื่น ดาวน์โหลดประวัติแยกใน toolbar และ pagination แสดงเมื่อเกินหนึ่งหน้า ตรวจภาพมือถือประวัติ 13 รอบแล้ว; P7 browser 17, typecheck, scoped ESLint และ diff check ผ่าน ยังไม่ deploy

- 16 ตุลาคม: **D43 done** คืน UI รายละเอียด/ทบทวนสิ่งแวดล้อมจากภาพและคอมมิตเดิม c278e1e เป็นข้อมูลทั่วไปสองคอลัมน์ แถบผลพร้อมค่าตรวจวัด ตารางเส้นบาง/ตัวเลขหนา/ป้ายผล และผังหลังตาราง คงข้อมูล v3 ทุกคอลัมน์ ตัวโหลดไม่มีกรอบ/เงา/กล่อง; P5 browser 16 และ P7 browser 17 ผ่าน รวมเทียบค่าตัวเลขกับ revision และตรวจ loading โปร่งใส, typecheck/scoped ESLint/diff check ผ่าน ดู [รายละเอียด](./CLASSIC_DETAIL_RESTORE.md) ยังไม่ deploy

- 16 ตุลาคม: **D42 done** ปุ่มดำเนินการใช้หน้าตาปุ่ม เหลือประเมินวัดซ้ำปุ่มเดียวเฉพาะงานล่าสุดที่ไม่ผ่าน เปิดแนบผังในรอบวัดซ้ำและบันทึกไฟล์กับรอบใหม่โดยไม่เปลี่ยนรอบเก่า รวม loading ผ่านตัวโหลดกลางพร้อมข้อความกำลังโหลด/ตัวหมุน ครอบคลุม API/ไฟล์/บันทึก/ส่งออก และคงกันส่งซ้ำ/ไม่กระพริบขั้นแรก; P5 browser 16, P7 browser 17, P4 browser 10 + P3 browser 11, P6 browser 11 ผ่าน; domain 17 + migration 6 + P5 unit 12 + P7 unit 11 ผ่าน; typecheck ทั้งสองฝั่ง/ESLint ไม่มี error/diff check ผ่าน ดู [รายละเอียด](./GLOBAL_LOADING_AND_RETEST_ACTIONS.md) ยังไม่ deploy

- 16 ตุลาคม: **D39 ตรวจหน้าจริงซ้ำ** พบแท็บผู้ใช้ยังโหลด title/หน้าเก่าค้าง เปิด localhost:3001/result ของงานจริงยืนยันส่วนมาตรฐานมีเพียงลิงก์เปิดแท็บใหม่/ดาวน์โหลด ไม่มีปุ่มพรีวิวหรือ iframe จากนั้น reload แท็บหน้าแรกที่ไม่มีฟอร์มค้างให้เป็น build ปัจจุบัน แก้ assertion เก่าใน test-ui-restore ที่ยังบังคับให้มีปุ่มนี้เป็นตรวจไม่มีปุ่ม/iframe พร้อมตรวจลิงก์ target/download; syntax/ESLint/diff check ผ่าน ไม่ deploy

- 16 ตุลาคม: **D41 done** คืนการ์ดสรุปผ่าน/ไม่ผ่านกึ่งกลางแบบเดิม ใช้วงกลมถูก/กากบาท 64px สีตามผล พร้อมกล่องจำนวนจุด/พื้นที่ที่ผ่าน ใช้ shared summary ทั้งทบทวน/ผลทุกหมวด คงผล revision เดิม; P5 browser 16 ผ่านรวมตรวจสถานะจริง/icon64px/text-align, typecheck/ESLint/diff check ผ่าน ตรวจภาพแล้ว ยังไม่ deploy

- 16 ตุลาคม: **D40 done** เอาจุดย่อย Area ออกจากฟอร์ม/ทบทวน/ผล/ชีตฟอร์มหลัก รับค่าเฉลี่ยและค่าต่ำสุดโดยตรง ปรับ validation/Worker/วัดซ้ำ/ร่างให้รองรับ ไม่แก้ source และประวัติเก่า; P5 unit 12 + domain/SQLite 23 + P7 unit 11 + P5 browser 16 + P7 browser 16 ผ่าน รวมสร้าง/วัดซ้ำจาก samples เก่าและตรวจ snapshot ไม่เปลี่ยน, frontend/Worker typecheck/ESLint/diff check ผ่าน ดู [รายงาน](./AREA_DIRECT_INPUT.md) ยังไม่ deploy

- 16 ตุลาคม: **D38/D39 done** preview จุดตรวจเหลือผ่าน/ไม่ผ่าน; เอาปุ่มดูเอกสารในหน้านี้และ PDF iframe ออกจาก Standards กลาง เหลือเปิดแท็บใหม่/ดาวน์โหลด ครอบคลุมหน้ากรอก ทบทวน ผลทั้ง 3 หมวด; P5 browser 16 ผ่านรวมตรวจไม่มีปุ่ม/iframe และลิงก์ target/download/ไฟล์ PDF ตรงเดิม, typecheck/ESLint/diff check ผ่าน ยังไม่ deploy

- 16 ตุลาคม: **D37 done** คืนตัวเลข/หน่วยในตัวเลือกมาตรฐานแสง ลบเฉพาะข้อความสถานที่/ลักษณะงาน Spot เช่น 400–500 Lux, Area เช่น เฉลี่ย ≥ 300 Lux / ต่ำสุด ≥ 150 Lux คงรหัส/เกณฑ์เดิมทั้งหมด; P5 browser 16 ผ่านพร้อมตรวจ labels และผลเกณฑ์ Spot/Area, typecheck/ESLint/diff check ผ่าน ยังไม่ deploy

- 15 ตุลาคม: **D36 done** เพิ่มปุ่มดาวน์โหลดประวัติทุกรอบ Excel เฉพาะงานในหน้าผล รวมเป็นแถวเรียงรอบในภาพรวม/ชีตฟอร์ม เก็บทุกจุดและค่ารอบเดิม; ปุ่มเดิมและ Dashboard ยังส่งออก selected/latest ตามเดิม ตรวจงาน 13 รอบครบทุกหน้า/ไม่ปนรหัส/ค่ารอบแรกไม่ถูกเขียนทับ; unit 11 + P7 browser 15, typecheck/ESLint/diff check ผ่าน ดู [รายงาน](./JOB_HISTORY_EXPORT.md) ยังไม่ deploy

- 15 ตุลาคม: **D35 done** คืน Excel แบบเดิม ภาพรวม + 6 ชีตประเภท/หมวด + ความพึงพอใจแยก 2 กลุ่ม (สร้างเฉพาะชีตมีข้อมูล) รวมค่ากรอก/คำตอบ/เกณฑ์/ผล snapshot ในชีตฟอร์ม แถวจุดย่อย/ช่วงวัดครบ; audit เดิมซ่อนเพื่อคงข้อมูลตรวจสอบ ใช้ข้อมูลที่บันทึกไม่ประเมินใหม่; unit 11 + P7 browser 15 ผ่าน, typecheck/ESLint/diff check ผ่าน ตรวจ render และสร้างตัวอย่างจากไฟล์เจ้าของงานพร้อมตรวจ snapshot ตรงต้นฉบับ ดู [รายงาน](./CLASSIC_FORM_EXPORT.md) ยังไม่ deploy

- 15 ตุลาคม: **D34 done** ตัวกรองเหลือ 2 ประเภทหลัก ใช้ group query รวมความพึงพอใจของประเภทนั้น ย้ายความพึงพอใจเข้าแถวสรุปประเภท ปรับยอด/ป้ายตารางให้ตรงกัน คงหมวดและรายละเอียดคะแนนครบ; P7 browser 15 ผ่าน พร้อมเทียบ API/KPI/ตาราง/Excel ทั้งสองกลุ่ม, typecheck ผ่าน, ESLint ไม่มี error (warning เดิม api.ts 13 จุด), diff check ผ่าน ดู [รายงาน](./TWO_REPORT_TYPES.md) ยังไม่ deploy

- 15 ตุลาคม: **D33 done** คืนการ์ด KPI 4 ใบ/แถวประเภทดีไซน์เดิม คงรายละเอียด 6 หมวดและความพึงพอใจ 2 กลุ่ม × 4 ด้านตามข้อมูลปัจจุบัน เอาขีดคั่นออกจากหัวข้อทั่ว UI; P7 browser 15 ผ่าน/typecheck ผ่าน/ESLint ไม่มี error (warning เดิมใน review-step 5 จุด)/diff check ผ่าน ดู [รายงาน](./CLASSIC_SUMMARY_AND_HEADINGS.md) ยังไม่ deploy

- 15 ตุลาคม: **D32 done** คืนรูปแบบตัวกรอง/ตารางจากโค้ดเดิม: search icon, date pills, ตารางแถวบาง, ป้ายสี และ pagination เล็ก คง 8 คอลัมน์และตัวกรอง/ข้อมูลปัจจุบันครบ; P7 browser 15 ผ่าน รวมทดสอบช่วงวันที่และหน้าแรก/สุดท้าย, typecheck/ESLint/diff check ผ่าน ตรวจภาพ desktop/mobile แล้ว ดู [รายงาน](./ORIGINAL_REPORT_UI_RESTORE.md) ยังไม่ deploy

- 15 ตุลาคม: **D31 done** เอา min-height 116px ของการ์ดเมนูออก ใช้ความสูงตามเนื้อหา/padding 16px เท่ากัน ไม่ยืดตามการ์ดข้าง ๆ ครอบคลุมหน้าเลือกสภาพแวดล้อม/สุขภาพ/ความพึงพอใจและหน้าแรก; วัด localhost:3001 จริงได้ประมาณ 85px เมื่อข้อความสั้น, P7 browser 15 ผ่าน รวมเทียบ content+padding+border ที่ 6 widths ทั้งสองกลุ่มและภาพ 390/1024/1440, typecheck/ESLint/diff check ผ่าน ดู [รายงาน](./CONTENT_FIT_CARDS.md) ยังไม่ deploy

- 15 ตุลาคม: **D30 done** Desktop เฉพาะ viewport >=1440px; จอกลาง/แท็บเล็ตต่ำกว่านั้นใช้ mobile shell ยืดเต็มพื้นที่ เมนูล่าง และเลือกฟอร์มคอลัมน์เดียว ย้าย sidebar/header/home/form/stat layout และ safe-area ให้สอดคล้อง; P7 browser 15 ผ่าน รวม 6 widths × 4 routes, typecheck/ESLint/diff check ผ่าน ดู [รายงาน](./LARGE_SCREEN_LAYOUT.md) ยังไม่ deploy

- 15 ตุลาคม: **D29 done — ปรับขนาดต่อจาก D28** วัดหน้า localhost:3001 จริงพบ CSS 52px ยังทับ small จึงเพิ่ม style ขนาด component ที่ root และลำดับความสำคัญชัดเจน ยืนยันล้าง/แบ่งหน้า 30px จริง, ปุ่มทั่วไปขั้นต่ำ 38px, จำนวนต่อหน้า 30px, วันเริ่ม–สิ้นสุดแถวเดียว, เมนูล่าง 280×54px; P7 browser 14 ผ่าน/วัด 320-390-1440px/ตรวจภาพ, typecheck/ESLint/diff check ผ่าน ดู [รายงาน](./BUTTON_BALANCE_FIX.md) ยังไม่ deploy

- 15 ตุลาคม: **D28 done** ตรวจขนาดปุ่มทั้งโปรเจ็ค แก้ CSS กลางบังคับ 52px ทับ size; ปุ่มปกติ 40px/เล็ก 32px/ใหญ่ 44px, ปุ่มล้างตัวกรองเล็กจริงและชิดขวา เมนูล่างสูง 60px กว้างไม่เกิน 320px ลดแท็บ/ปุ่มเลือกและ action links ให้เข้าชุด; P7 14 + P4 10 + P3 11 = 35 browser scenarios ผ่าน รวมวัดขนาดจริง/ไม่ overflow ที่ 320/390/1440px และตรวจภาพ, typecheck/ESLint/diff check ผ่าน ดู [รายงาน](./BUTTON_SIZE_AUDIT.md) ยังไม่ deploy

- 15 ตุลาคม: **D27 done** ปรับ loading ส่งฟอร์มทั้งสามประเภทเป็น อัปโหลด/บันทึก → บันทึกสำเร็จ/เปิดผล คงหน้าสรุปจนเปลี่ยนหน้า แก้ clearDraft รีเซ็ตขั้นแรกและ finally ปิด loading เร็ว กันส่งซ้ำ/keyboard หลังสำเร็จ; failure ยังเก็บคำตอบและ retry ได้ ทดสอบหน่วง API+navigation พร้อม MutationObserver/ภาพจริง, P4 10 + P3 11 + P5 16 + P6 11 = 48 browser scenarios ผ่าน, typecheck/ESLint/diff check ผ่าน ดู [รายงาน](./SUBMIT_LOADING_FLOW_FIX.md) ยังไม่ deploy

- 15 ตุลาคม: **D26 done** ซ่อนปุ่ม “ประเมินวัดซ้ำ” เมื่อผ่านเกณฑ์ครบหรือเป็นรอบย้อนหลัง ใช้เงื่อนไขเดียวกับตรวจซ้ำเฉพาะหน่วยไม่ผ่าน (รอบล่าสุด/server อนุญาต/ผลไม่ผ่าน); P7 browser 14 scenarios ผ่านพร้อม assertion ปุ่มทั้งสองไม่มีในผลผ่าน/ย้อนหลังและยังมีในผลไม่ผ่าน, typecheck/ESLint/diff check ผ่าน ยังไม่ deploy
- 15 ตุลาคม: **D25 done** เอาช่องเหตุผลการแก้ไข/เติมข้อมูลสภาพแวดล้อมออก วัดและบันทึกรอบใหม่ได้เลย Client ไม่ส่งเหตุผลจากร่าง; ระบบบันทึกชื่อการดำเนินการสำหรับ audit อัตโนมัติ คงรอบเก่าและล็อกมาตรฐานเหมือนเดิม; P5 browser 16 และ domain/SQLite 23 ผ่าน, typecheck frontend/Worker/ESLint/diff check ผ่าน ดู [รายละเอียด D25](./ARCHIVE_REMOVAL_RETEST_REPORT.md) ยังไม่ deploy

- 15 ตุลาคม: **D24 done** ยกเลิกปุ่ม/ฟังก์ชันคลังและตัวกรองสถานะคลัง ปิด API เดิม 410 โดยไม่ลบข้อมูล; ผลล่าสุดยังประเมินวัดซ้ำ/แก้ไขแบบเพิ่ม revision และเปิดประวัติแต่ละรอบ/วันเวลาได้ ทดสอบ P2 23 + P5 16 + P7 14 = 53 scenarios ผ่าน รวมงานที่เคยอยู่คลังบันทึกรอบใหม่ได้จริง; สำรอง/apply 0007 เฉพาะ local ข้อมูล 25 ตารางเดิมตรงครบ/FK 0, typecheck frontend/Worker และ lint ผ่าน ดู [รายงาน](./ARCHIVE_REMOVAL_RETEST_REPORT.md) ยังไม่ deploy

- 15 ตุลาคม: แก้คะแนนความพึงพอใจติดกรอบแดงโดยล้าง field error โดยตรงเมื่อเลือกคะแนน/กดคะแนนเดิมซ้ำ คงการตรวจจริงและไม่ล้างข้ออื่น; P6 browser 11 scenarios ผ่านพร้อม assertion ข้อ 6 เลือก 5 แล้ว error ลด 16→15 และครบแล้วเหลือ 0 โดยไม่ส่งซ้ำ, typecheck/ESLint/diff check ผ่าน ดู [บันทึกเพิ่มเติม](./FIELD_VALIDATION_FEEDBACK_FIX.md) ยังไม่ deploy
- 15 ตุลาคม: คืนไอคอนสีแยกหมวดตามสไตล์เดิม ใช้ component ร่วมกันทั้งหน้าเลือกฟอร์มสภาพแวดล้อม/สุขภาพและการ์ด Dashboard: แสงสีเหลือง เสียงสีเขียว ความร้อนสีแดง ความพึงพอใจสีม่วง; คงหัวข้อ/กติกาปัจจุบัน ตรวจ typecheck/ESLint ไฟล์ที่แก้/diff check ผ่าน ยังไม่ deploy
- 15 ตุลาคม: ย้ายส่วน “แยกตามประเภท” และการ์ดสถิติ/ความพึงพอใจขึ้นก่อนตัวกรอง Dashboard ตามเจ้าของงาน ลำดับเป็นสถิติ → ตัวกรอง → ส่งออก → รายการงาน; ตรวจ ESLint ไฟล์ที่แก้และ diff check ผ่าน ยังไม่ deploy
- 15 ตุลาคม: **D23 done — supersedes D22** เจ้าของงานยกเลิกข้าม/บันทึกก่อนแล้วรอทำหลัง; ปัจจุบันตอบก่อน 10 → หลัง 10 → สรุป/ยืนยันบันทึกครบเท่านั้น เอารายการรอทำต่อจาก Dashboard ออก ปิด API เดิมทุกเส้นทางด้วย 410 ไม่ลบข้อมูลเดิม; P4 browser 10 + P3 browser 11 + P4 unit 8 ผ่าน, frontend/Worker typecheck และ lint 0 errors/74 warnings เดิมผ่าน ดู [รายงานปัจจุบัน](./HEALTH_COMPLETE_BEFORE_AFTER_REPORT.md) ยังไม่ deploy

- 15 ตุลาคม: คืนสไตล์ตัวกรอง Dashboard ให้เป็น toolbar กระชับตามแบบเดิม: ช่องสูง 36px/ตัวอักษร 12px ลด padding/gap ซ่อน label ที่ซ้ำโดยคงชื่อสำหรับ accessibility จัดแถวค้นหา/หมวดหมู่ และแถววันที่/ล้างตัวกรองให้ wrap ตามจอ โดยคงตัวเลือกและกติกาปัจจุบัน; P7 browser 14 scenarios ผ่าน รวมมือถือไม่ overflow/ตัวกรองรายการ-สถิติ-Excel ตรงกัน พร้อม typecheck/ESLint/diff check ผ่าน ยังไม่ deploy
- 15 ตุลาคม: จัดปุ่ม “ล้างตัวกรอง” บนจอใหญ่ชิดขวาและตรงแนวล่างของช่องวันที่สิ้นสุด; จอเล็กปุ่มเต็มความกว้าง ตรวจ ESLint ไฟล์ที่แก้ผ่าน ยังไม่ deploy
- 15 ตุลาคม: เอาตัวเลือก “ขอบเขต Excel” บน Dashboard ออก ให้ปุ่มส่งออกใช้ผลล่าสุดของทุกงานตามตัวกรองเสมอ พร้อมลดข้อความอธิบายให้ตรงการใช้งาน; P7 browser 14 scenarios ผ่าน รวมงานที่มี 13 รอบส่งออกเพียงรอบล่าสุด/กรองเหมือนรายการ/ส่งออกเกิน 100 งาน, typecheck และ ESLint ไฟล์ที่แก้ผ่าน ยังไม่ deploy
- 15 ตุลาคม: แก้ validation ค้างทั่วฟอร์มสุขภาพ/สภาพแวดล้อม/ความพึงพอใจ ให้ล้าง error ช่องที่แก้ทันทีโดยคงข้ออื่นที่ยังไม่ตอบ รวมช่องตามเงื่อนไขและปุ่มเลือกแหล่งเสียง; ยังคงตรวจ schema ก่อนถัดไป/ส่งและ Worker ตรวจข้อมูล ทดสอบ Chromium 58 scenarios (health-pending 11, P4 9, P3 11, P5 16, P6 11), typecheck, lint 0 errors/74 warnings เดิม ผ่าน ดู [รายงาน](./FIELD_VALIDATION_FEEDBACK_FIX.md) ยังไม่ deploy

- 15 ตุลาคม: จัดปุ่มท้ายคำถามสุขภาพให้อยู่กลุ่มเดียวกัน: จอใหญ่ปุ่มย้อนกลับอยู่ซ้าย ปุ่ม “ข้ามและบันทึก” กับปุ่มหลักอยู่ขวา; มือถือเรียงเต็มความกว้างและข้อความปุ่มหลักตัดบรรทัดได้ เปลี่ยน “ไปประเมินหลัง” เป็น “ประเมินหลังปฏิบัติงาน/เรียน” และ “บันทึกไว้ทำภายหลัง” เป็น “ข้ามและบันทึก” ตามเจ้าของงาน; health-pending 11 scenarios, typecheck และ ESLint ไฟล์ที่แก้ผ่าน ยังไม่ deploy
- 15 ตุลาคม: ย้ายช่อง “ระยะเวลาปฏิบัติงาน / เรียนวันนี้ (ชั่วโมง)” ของสุขภาพด้านแสงจากขั้นตอนที่ 3 ไปท้ายขั้นตอนที่ 2 พร้อมตรวจบังคับกรอก 0–24 ชั่วโมงก่อนถัดไป; คงข้อมูลเดิม/บันทึกทำต่อได้ ทดสอบ health-pending 11, P4 browser 9 และ P3 browser 11 scenarios ผ่าน พร้อม typecheck/ESLint ไฟล์ที่แก้; ปรับลำดับกรอกในสคริปต์ UI restore ตามตำแหน่งใหม่ (ยังไม่รันชุด UI restore ซ้ำในรอบนี้) ยังไม่ deploy
- 15 ตุลาคม: เอาปุ่มการ์ด “กลับไปเลือกหัวข้อ” ท้ายหน้าผลสุขภาพออกตามภาพที่เจ้าของงานแจ้ง โดยยังใช้ปุ่มย้อนกลับบนหัวหน้าได้; ตรวจ ESLint เฉพาะไฟล์ผ่าน ยังไม่ deploy
- 15 ตุลาคม: **superseded by D23 — หลักฐานเดิม** — บันทึกส่วนก่อนบนระบบแล้วเปิดทำส่วนหลังต่อจาก Dashboard ข้ามเครื่องได้ พร้อมคำตอบหลังบางส่วน, version กันเขียนทับ, retry ไม่สร้างซ้ำ และไม่ปนสถิติผลสำเร็จ; 139 scenarios/checks + 13 commands ผ่าน local migration 0006/backup/23 ตารางเดิมตรวจตรงครบ ดู [รายงาน](./HEALTH_BEFORE_AFTER_RESUME_REPORT.md) ยังไม่ deploy
- 15 ตุลาคม: **done** — คืนกล่องคำแนะนำพื้นเทา ใช้ประโยคเดิมต่อท้ายข้อความตาม requirement ย้ายชื่อมาตรฐาน/ปุ่มเอกสารไว้ด้านล่างและเอา description ออก; lint/typecheck และ browser 16 scenarios ผ่าน ครบผ่าน/ไม่ผ่าน Spot/Area/เสียง/ความร้อนรวมตรวจซ้ำ ดู [รายงาน](./ENVIRONMENT_GUIDANCE_UI_FIX.md) ยังไม่ deploy
- 15 ตุลาคม: **done** — แก้หัวข้อคำถามทะลุขอบการ์ด เพิ่มสีเข้มให้แท็บก่อน/หลังที่เลือก แก้เมนูล่างเลื่อนซ้ำจนหลุดขอบ และชั้นหน้าต่างข้อมูลผู้จัดทำ; 37 browser scenarios ผ่าน รวม 60 การ์ด/12 ตำแหน่งเมนู, lint/typecheck ผ่าน ดู [รายงาน](./HEALTH_QUESTION_LAYOUT_FIX.md) ยังไม่ deploy
- ปรับ wording ล่าสุด: “หลักสูตร / แผนก / ฝ่าย” แทน “คณะ / แผนก / ฝ่าย” หรือชื่อช่องที่เหลือเพียง “หลักสูตร” ในฟอร์ม/ผลสรุป/ข้อความผิดพลาด/Excel โดยคงตัวเลือกหลักสูตรทั้ง 7 และกติกาข้อมูลเดิม
- ตรวจ UI ทุกหน้ากับแบบเดิมตาม D21: **done** — คืนหัวข้อ/การ์ด/ข้อเสนอแนะที่หาย ใช้ข้อมูลและ requirement ปัจจุบัน; 150 scenarios/checks + 13 commands ผ่าน รวม typecheck frontend/Worker, lint 0 errors / 74 warnings เดิม และ build 14/14 ดู [รายงานตรวจทุกหน้า](./UI_ALL_PAGES_AUDIT.md)
- 14 ตุลาคม: คืนหัวข้อ “คำแนะนำ” เหนือข้อความแนะนำในการ์ดมาตรฐาน แสดงเหมือนกันทั้งแสง เสียง และความร้อน
- 14 ตุลาคม: ปรับ select มาตรฐานพื้นที่ (Area) ตามภาพที่เจ้าของงานแจ้ง ให้แสดงเฉพาะชื่อพื้นที่ เอาคำอธิบายค่าเฉลี่ย/ค่าต่ำสุด Lux ออกจากตัวเลือก โดยคงรหัสและเกณฑ์คำนวณเดิมไว้

**ตรวจ UI ทุกหน้าตาม D21 done — ใช้ข้อมูลปัจจุบันตาม D19/D20; P9 ยังไม่เริ่ม**

- Dashboard และค่าตรวจเป็นตาราง row/column ตามสไตล์เดิม พร้อมข้อมูล/กติกาใหม่; เลื่อนตารางภายในกรอบบนมือถือและมีหัวคอลัมน์แม้ไม่มีข้อมูล
- ผลแต่ละแบบมี header/รหัสงานหนึ่งชุด; mobile navbar fixed ที่ขอบล่าง viewport ผ่านการเลื่อน top/middle/end และเมนูรายงาน active ตรงกับ desktop; print มีหัวข้อ/รหัสงาน
- รายการ/สถิติ/Excel ใช้ข้อมูลปัจจุบัน ไม่มี legacy/ชุดคำถามเก่า/กลุ่มไม่ทราบ; สรุปตาม 6 หมวด environment/health กับ satisfaction 2 กลุ่ม × 4 ด้าน
- แสดงสถานะตามชนิดจริงและสีระดับอาการ ไม่ผสมผ่านเกณฑ์กับระดับอาการ; แผนผัง optional/preview/review/add-later ตาม D17 ยังผ่าน
- Regression รอบ D19/D20 เดิมผ่าน 129 scenarios/checks + 12 commands; รอบตรวจ UI ทุกหน้าล่าสุดผ่าน 150 scenarios/checks + 13 commands
- เคยเปิด localhost:3001/8787 ให้รีวิวรอบ D19/D20 และอ่าน summary สำเร็จ; ต่อมาปิด Worker ที่ผมเปิดค้างเมื่อพบว่าชนพอร์ตกับคำสั่งของเจ้าของงาน ฐาน local ที่มีเพียง 4 seed records เดิมจะแสดงงานปัจจุบัน 0/คะแนนความพึงพอใจ — ตาม D20
- หลักฐานล่าสุด: [รายงานตรวจทุกหน้า](./UI_ALL_PAGES_AUDIT.md) · [13 commands/logs](./baseline/ui-audit-regression.json) · [17 acceptance scenarios](./baseline/ui-audit-tests.json)
- P8 UAT/181 checks และ D17–D18/173 checks เก็บเป็นหลักฐานก่อนขอบเขต D19/D20 ไม่อ้างว่าคำยืนยันเก่าครอบคลุมงานใหม่
- Chromium mobile/desktop ผ่าน; Firefox/WebKit/Safari/iOS/เครื่องพิมพ์จริงยังไม่ได้รันตามขอบเขตที่รับทราบ ไม่มี deploy/remote DB/R2/migration ใหม่/commit/PR และไม่เริ่ม P9

## อัปเดตคำถามเพิ่มเติมก่อน P5

คำถามความพึงพอใจตาม Word ล่าสุดเสร็จแล้ว: environment/health คนละ 16 ข้อ, Content/Design/Usability/Usefulness; form/Worker/result/draft version/Excel dictionary ปรับแล้ว พร้อม 6 unit + 5 browser/API tests ดู [รายงานและข้อความครบ](./SATISFACTION_QUESTION_UPDATE_V3.md) งานแทรกคำถามเสร็จก่อน P5; ปัจจุบัน full P6 ปิดแล้วตามรายงาน P6

## หลักสูตรและชั้นปี ได้รับข้อมูลครบแล้ว

เจ้าของงานส่งรายชื่อจริงครบ 7 หลักสูตรและยืนยันชั้นปี select แยก 1–6 เหมือนกันทุกหลักสูตรในรอบ P0 ยกเลิกข้อความเตือนว่ารอข้อมูลชุดนี้จากลูกค้า

- [x] ลูกค้าส่งรายชื่อ 7 หลักสูตรพร้อมชื่อเต็ม
- [x] เจ้าของงานยืนยันชั้นปี 1–6 แยกจากหลักสูตร
- [x] จัด catalog รหัสภายใน program-01…program-07 ตามชื่อ/ลำดับที่ได้รับ
- [x] P1 ย้าย catalog เข้า shared domain และ validate code/version
- [x] P4 เชื่อม select สุขภาพจริงและทดสอบครบ 7 หลักสูตร × ปี 1–6
- [x] P6 select satisfaction และผล/Excel ของ satisfaction เชื่อมชื่อจริง/ชั้นปีแล้ว
- [x] P7 รายงาน/Excel ครบทุกโมดูลและ bulk pipeline

## บอร์ด Phase

สถานะที่ใช้: `not-started`, `in-progress`, `waiting-input`, `blocked`, `in-review`, `done`

| Phase | สถานะ | สิ่งที่เสร็จแล้ว | งานถัดไป / เงื่อนไขก่อนปิด |
| --- | --- | --- | --- |
| P0 | done | P0.1–P0.7 ครบ: decisions/catalog/field matrix/wording/scoring/flows/legacy/baseline | พร้อมส่งต่อ P1 |
| P1 | done | P1.1–P1.8 ครบ พร้อม domain/SQLite/D1 local/typecheck/lint/build | ส่งต่อ P2 ตาม P1 report |
| P2 | done | P2.1–P2.10 ครบ พร้อม 23 API tests/D1/R2 local/atomic/concurrency/history | ส่งต่อ P3; production readiness ใน P8/P9 |
| P3 | done | P3.1–P3.7 ครบ; 11 unit + 11 browser/API mock + build ผ่าน | ส่งต่อ P4; รายละเอียดฟอร์ม v3 ใน P4–P7 |
| P4 | done | P4.1–P4.7 ครบ; สุขภาพทั้ง 3 หมวด/20 light answers/typed API/actual local tests | ส่งต่อ P5; health reporting/export ทั้งระบบใน P7 |
| P5 | done | P5.1–P5.8 ครบ; 11 unit + 16 real local browser/API + regression/build ผ่าน | ส่งต่อ P6 และ full reports/Excel/print P7 |
| P6 | done | P6.1–P6.5 ครบ; 7 unit + 11 actual browser/API + Word/regression/build ผ่าน | ส่งต่อ P7 full reports/dashboard/bulk export/print |
| P7 | done | P7.1–P7.9 ครบ; 10 unit + 14 actual browser/API + bulk 104 งาน/13 รอบ/Excel/PDF/regression/build ผ่าน | ส่งต่อ P8 regression/migration rehearsal/UAT; ยังไม่ deploy |
| P8 | done | P8.1–P8.8 ครบ; 181 checks/455 required/64 optional/8 fresh exports/D1 rehearsal/types/lint/build ผ่าน; nullable legacy fix; เจ้าของงานยืนยัน UAT | รับทราบ Chromium/Firefox-WebKit not-run; P9 ยังไม่เริ่มและยังไม่ deploy |
| P9 | done | production Worker/Pages + migrations 0001–0008, original data/80 files preserved, staging/production smoke ผ่าน | [Release และ rollback](./P9_RELEASE_2026-10-16.md) |

Checklist ราย task ใช้รหัส P0.1 … P9.8 ใน Implementation Plan เป็นแหล่งหลัก ตารางด้านบนใช้สรุปเท่านั้น ต้องอัปเดตทั้งสองที่ให้ตรงกันเมื่อจบงาน

## บันทึกการตัดสินใจ

| ID | วันที่ | ผลตัดสิน | ที่มา |
| --- | --- | --- | --- |
| D01 | 2026-10-12 | ใช้ผลต่างหลัง−ก่อน พร้อมระดับจากคะแนนหลัง 0–6 / 7–13 / 14–20 | ผู้ใช้ยืนยันในแชต |
| D02 | 2026-10-12 | Retest ล็อกสถานที่ จุดตรวจ เครื่องมือ เกณฑ์; เปลี่ยนค่าตรวจและวันเวลารอบใหม่ได้ | ผู้ใช้ยืนยันในแชต |
| D03 | 2026-10-12 | เดิมรอหลักสูตร/ชั้นปี; ปิดการรอแล้วตาม D09/D10 | คงประวัติการตัดสินใจเดิม |
| D04 | 2026-10-12 | เวลาต่อสัปดาห์เฉลี่ยใช้ชั่วโมง | ผู้ใช้ยืนยันในแชต |
| D05 | 2026-10-12 | 46/309 เป็นหมายเหตุ ไม่มี quota หรือ feature เพิ่ม | ผู้ใช้ยืนยันในแชต |
| D06 | 2026-10-12 | เวลาเดิมเทียบ SafeCheck กรอกเองทั้งคู่ | ผู้ใช้ยืนยันในแชต |
| D07 | 2026-10-12 | Require field ทั้งโปรเจกต์ ยกเว้นหมายเหตุ/ข้อเสนอแนะ/ความคิดเห็นเพิ่มเติมให้ optional; รายละเอียดที่จำเป็นตามคำตอบยังบังคับตามเงื่อนไข | ผู้ใช้ขยายขอบเขตเป็นทั้งโปรเจกต์ แล้วระบุข้อยกเว้นช่องหมายเหตุและลักษณะเดียวกัน |
| D08 | 2026-10-12 | เดิมเสนอปรับสูตร Spot/Area/เสียงตามเวลา; ยืนยันแล้วตาม D13 | ข้อเสนอเดิมและคำตอบใน P0 |
| D09 | 2026-10-12 | รายชื่อจริง 7 หลักสูตรครบ ใช้ชื่อเต็มตาม catalog | ผู้ใช้ส่งรายชื่อจากลูกค้า |
| D10 | 2026-10-12 | ชั้นปี field แยก select 1–6 ไม่จำกัดตามหลักสูตร | ผู้ใช้ยืนยัน |
| D11 | 2026-10-12 | ตรวจซ้ำเฉพาะจุดไม่ผ่าน; คงผลจุดผ่านพร้อมที่มา | ผู้ใช้เลือกตรวจซ้ำเฉพาะไม่ผ่าน |
| D12 | 2026-10-12 | เติม metadata legacy ครั้งเดียวพร้อมประวัติ; ลบแบบเก็บเข้าคลัง | ผู้ใช้ตอบส่วนอื่นตามที่เสนอ |
| D13 | 2026-10-12 | ปรับคำนวณตาม Spot/Area/ระยะเวลาสัมผัสเสียง | ผู้ใช้ยืนยันขอบเขตที่เสนอ |
| D14 | 2026-10-12 | ความพึงพอใจตอบอิสระตามกลุ่ม | ผู้ใช้ยืนยันขอบเขตที่เสนอ |
| D15 | 2026-10-12 | เสียงใช้ข้อความ/มาตรฐานตามเอกสาร ไม่มี checkbox เพิ่ม | ผู้ใช้ยืนยันขอบเขตที่เสนอ |
| D16 | 2026-10-14 | ปิด P8.6/P8; ยืนยัน UAT ตามเอกสารและรับทราบ Chromium/Firefox-WebKit not-run; ยังไม่เริ่ม P9/deploy | ผู้ใช้ยืนยันโดยตรงในแชต; [หลักฐาน](./baseline/p8-owner-uat.json) |
| D17 | 2026-10-14 | แผนผัง optional เพิ่มภายหลังได้; เลือก/ดูตัวอย่าง/ทบทวนก่อน upload และบันทึก API | ผู้ใช้สั่งปรับหลัง UAT พร้อมภาพ UI |
| D18 | 2026-10-14 | แอปปัจจุบันชุดเดียว ไม่มีตัวกรอง v3/รุ่นเดิมหรือแสดง version identifiers; เก็บข้อมูลจริงและประวัติรอบตรวจ | ผู้ใช้สั่งปรับหลัง UAT |
| D19 | 2026-10-14 | คืนสไตล์ UI เดิม: Dashboard/ค่าตรวจเป็นตาราง row-column; header/เลขงานหนึ่งชุด; navbar ติดขอบล่างหน้าจอ | ผู้ใช้สั่งพร้อมภาพปัญหา UI |
| D20 | 2026-10-14 | หน้าใช้งาน/สถิติ/Excel ใช้ข้อมูลปัจจุบัน ไม่ปน legacy/คำถามเก่า/กลุ่มไม่ทราบ; สรุปตาม 8 ฟอร์มและความพึงพอใจ 4 ด้านในแต่ละกลุ่ม | ผู้ใช้สั่งพร้อมภาพปัญหา UI |
| D21 | 2026-10-14 | ตรวจ UI ทุกหน้า คืนหัวข้อและส่วนที่เผลอหาย ใช้ requirement ปัจจุบัน ทดสอบครบ; เปลี่ยนข้อความลิงก์ในภาพเป็น “ประเมินวัดซ้ำ”; ยังไม่ deploy | ผู้ใช้สั่งในแชตและภาพล่าสุด |
| D22 | 2026-10-15 | พักส่วนหลังของสุขภาพด้านแสง โดยเก็บบนระบบและเปิดทำต่อข้ามเครื่องจาก Dashboard; ร่างไม่รวมในคะแนน/สถิติผลสำเร็จ | ผู้ใช้ยืนยันการเก็บบนระบบในแชต |

## ผลปิดคำถามและข้อจำกัดที่ส่งต่อ

| ID | สถานะ | ข้อสรุป | งานต่อ |
| --- | --- | --- | --- |
| Q01 | resolved | หลักสูตรครบ ชั้นปี 1–6 | P1/P4/P6 integration |
| Q02 | resolved-for-P0 | คำนวณตาม D13; catalog rows/input modes/expected outputs ใน P0 spec | P1 สร้าง evaluator และตรวจ catalog ทุกแถวกับ PDF |
| Q03 | resolved-for-P0 | Field matrix ระบุ required/conditional/optional และ N/A | P1 shared validation |
| Q04 | resolved | ไม่เพิ่ม checkbox เสียง | P5 คำแนะนำ+PDF |
| Q05 | resolved | Legacy supplement มี audit ไม่เขียนทับ snapshot | P2/P5 |
| Q06 | resolved | เฉพาะไม่ผ่าน, carry provenance, archive/correction trace | P1/P2/P5/P7 |
| Q07 | resolved | Satisfaction ไม่บังคับผูกแบบก่อนหน้า | P6 |

ข้อจำกัดที่ยังต้องตรวจเมื่อถึง phase: production schema/จำนวนข้อมูลจริงยังไม่สำรวจ, R2 bindings/บัญชีจริงยังไม่ตรวจ, API runtime/D1/R2 local ทดสอบแล้วใน P2; browser P3 กับ API mock ทดสอบแล้ว; full v3 E2E/regression และ UAT เจ้าของงานปิดแล้วใน P8; การตรวจ environment จริงยังเป็น task P9 ไม่ถือว่าต้องรอรายชื่อหลักสูตรอีก

## Requirement coverage

R01–R24 ยังไม่ครบทั้ง feature; ตารางระบุ foundation ที่ส่งมอบใน P1 แยกจาก endpoint/UI ที่ค้าง ส่วน R25 มีเอกสารและ log แล้ว

| Requirement | เจ้าของ Phase | Implementation | Verification |
| --- | --- | --- | --- |
| R01–R02 เมนูและ wording | P3, P4, P6, P7 | P3 เมนู 2×4/ชื่อแบบ/route group เสร็จ; P4–P7 คำถามและรายงานครบแล้ว | 8 direct routes/mobile/desktop/group selection browser ผ่าน |
| R03–R05 หลักสูตร/เวลา/required | P0–P6 | P1/P2 foundation/API และ P4/P5/P6 required UI ครบตามชนิดงาน; P7 reports/Excel/metadata ครบแล้ว | Domain/catalog + API required tests ผ่าน |
| R06–R08 สุขภาพแสงก่อนหลัง | P1, P2, P4, P7 | P4 health light UI/tabs/review/server result เสร็จ; P7 รายงานก่อน–หลัง/Excel/print ครบแล้ว | Boundary/delta/zero + actual local browser/Worker compare 6 ตัวอย่างผ่าน |
| R09–R11 สุขภาพเสียง/ความร้อน | P1, P2, P4 | P4 noise/heat forms และ v3 submit/read เสร็จ | Validation/scoring + actual browser→Worker→D1 ผ่าน |
| R12–R16 ตรวจสภาพแวดล้อม/มาตรฐาน | P1, P2, P5, P7 | P1/P2 foundation และ P5 forms/standards/review/server results เสร็จ; P7 selected revision/Excel/print ครบแล้ว | P5 ทั้ง 3 หมวด/Area min/Spot surrounding/PDF bytes/browser→Worker→D1 ผ่าน |
| R17–R19 ตรวจซ้ำ/ประวัติ/ล่าสุด | P1, P2, P5, P7 | P1/P2 endpoint และ P5 retest/result/history/conflict/correction/legacy UI เสร็จ; P7 latest/history/dashboard/bulk/print ครบแล้ว | P5 actual 3-round loop/heat carry/correction/stale-base/locked-field/immutable snapshot tests ผ่าน |
| R20–R22 ความพึงพอใจ/เวลา | P1, P2, P6 | P1/P2 API และ P6 full flow/snapshot/result/Excel ของ satisfaction เสร็จ; P7 dashboard/bulk/print ครบแล้ว | P6 16-score/manual-duration/93,784/negative delta/UI→Worker→D1→downloaded XLSX ผ่าน |
| R23–R24 รายงาน/ข้อมูลเก่า | P1, P2, P7, P8 | P1/P2 legacy/preservation/query export เสร็จ; P7 reports UI/Excel/print ครบ; P8 local rehearsal ผ่าน; เจ้าของงานยืนยัน UAT แล้ว | 8 original tables preserved + legacy read/adoption/history API ผ่าน |
| R25 เอกสารแผนและความคืบหน้า | ทุก phase | สร้างเอกสารแล้ว | ตรวจลิงก์และความสอดคล้องรอบวางแผนแล้ว |

## หลักฐานการตรวจ

| วันที่ | การตรวจ | ผล | ขอบเขต |
| --- | --- | --- | --- |
| 2026-10-12 | อ่าน DOCX OOXML ข้อความ/ตารางและภาพฝัง | อ่าน requirement และ flow ได้; ไม่พบ comments XML | เอกสาร ไม่ใช่ test ระบบ |
| 2026-10-12 | Render Word เป็นภาพสำหรับตรวจประกอบ | renderer แสดงอักษรไทยบางส่วนไม่ครบ จึงยืนยันข้อความจาก OOXML และตรวจภาพต้นฉบับประกอบ | ไม่ใช้เลขหน้าจาก render เป็นหลักฐานอ้างอิง requirement |
| 2026-10-12 | อ่าน PDF และตรวจภาพตารางที่เกี่ยวข้อง | ระบุความต่าง Area/Spot, ตารางเสียงตามเวลา และเกณฑ์ความร้อนในไฟล์ได้ | ไม่ใช่การรับรองกฎหมายล่าสุด |
| 2026-10-12 | เทียบ source frontend/Worker/D1 | พบ destructive PATCH, fields/versions ที่ยังขาด และสูตรซ้ำหลายจุด | Static review ไม่ใช่ runtime verification |
| 2026-10-12 | Frontend/Worker typecheck | ผ่านทั้งคู่ exit 0 | รายละเอียด BASELINE_P0.md |
| 2026-10-12 | ESLint src+worker/src | 0 errors / 172 warnings เดิม | 71 files; baseline/eslint-summary.json |
| 2026-10-12 | npm run lint | exit 0; deprecated next lint warning | script ยังใช้ได้ในรุ่นติดตั้ง |
| 2026-10-12 | npm run build | exit 0; static pages 14/14 และ export ผ่าน | ไม่ deploy |
| 2026-10-12 | schema+seed in-memory SQLite | 8 tables, 4 submissions, FK check ว่าง | ไม่ใช่ D1 production/integration |
| 2026-10-12 | ตรวจเอกสาร/catalog | ลิงก์ไฟล์และ code fences ถูกต้อง; 7 program codes ไม่ซ้ำ; ปี 1–6; คำถาม 30 IDs/แสง 20 ข้อความ; ตัวอย่างเลขและ P0 checkboxes ตรง | ไม่ใช่ application v3 tests |
| 2026-10-12 | Worker integration/E2E/UAT | ยังไม่ได้รัน | จะทำระหว่าง implementation/P8 |

## Work log

### 2026-10-12 — วิเคราะห์และจัดทำแผน

- จัดทำ `REQUIREMENTS_V3.md`: R01–R25, D01–D08, Q01–Q07, คำถามสุขภาพใหม่ครบสามหมวด, ข้อความคำแนะนำ และตารางคะแนนก่อนหลังสำหรับลูกค้า
- จัดทำ `IMPLEMENTATION_PLAN_V3.md`: P0–P9 พร้อม frontend/Worker/D1/migration/report/test/release และ acceptance criteria
- จัดทำ `PROGRESS_V3.md`: แสดงสถานะตามจริง บันทึกสิ่งที่ค้างและจุดเตือนหลักสูตร/ชั้นปี
- ขอบเขตการเปลี่ยน: เอกสารเท่านั้น ไม่มี migration/production changes
- งานต่อไป: P0.1 field/scoring/legacy decisions และ P0.6 baseline จากนั้น P1

### 2026-10-12 — เพิ่มข้อยกเว้น required ตามคำยืนยันล่าสุด

- เจ้าของงานระบุให้ช่องหมายเหตุและลักษณะเดียวกันไม่ required
- ปรับ D07/R05 และ checklist ที่เกี่ยวข้องในเอกสารทั้ง 3 ไฟล์ ให้หมายเหตุรายจุดตรวจ ข้อเสนอแนะ และความคิดเห็นเพิ่มเติมเว้นว่างได้ทั้ง frontend/Worker โดยไม่ต้องตอบว่าไม่มี
- คง required ของข้อมูลหลักและรายละเอียดตามเงื่อนไข เช่น อื่น ๆ หรือมีโรคประจำตัว
- เป็นการแก้สเปกเท่านั้น ยังไม่ได้แก้ application code หรือรัน test ระบบ

### 2026-10-12 — ดำเนินการ P0 และปิดสเปก

- P0.1: ปิด Q01–Q07; บันทึก D09–D15 และรักษาข้อยกเว้นหมายเหตุ optional
- P0.2: สร้าง FIELD_MATRIX_V3.md ครอบคลุม context/profile/work/health/environment/satisfaction/legacy/derived และ retest carry
- P0.3: ตรึงคำถาม/wording v3 และ scale เดิม ตาม Requirements + P0 spec
- P0.4: สรุปแถวเกณฑ์แสง ตารางเสียง สูตร/หน่วย WBGT และ fixtures H/S/L/N/T พร้อม expected outputs
- P0.5: สรุป 8 entry flows, tabs ก่อนหลัง, retest เฉพาะไม่ผ่าน และ satisfaction แยกกลุ่ม
- P0.6: รัน typecheck/lint/build จริงและบันทึก warnings/baseline แยกจากผล v3
- P0.7: inventory 8 tables/legacy mapping, supplement/correction/archive/file storage policy; ตรวจ schema+seed ใน memory ไม่มีการย้ายข้อมูลจริง
- ได้รับชื่อหลักสูตรทั้ง 7 รายการและชั้นปี 1–6 ครบ; บันทึก JSON สำหรับย้ายเข้า shared ใน P1
- พบ file-size mismatch D1 กับ UI เดิม จึงเพิ่ม R2 immutable file reference ในแผน P1/P2/P9
- ไฟล์ส่งมอบหลัก: P0_SPEC_V3.md, FIELD_MATRIX_V3.md, BASELINE_P0.md, catalogs/programs.json, catalogs/health-questionnaire.json, baseline/eslint-summary.json และอัปเดตเอกสารแผนเดิม
- ผลตรวจ: typecheck/build ผ่าน, lint 0 errors/172 warnings เดิม; ยังไม่มี Worker integration/E2E และยังไม่ deploy
- สถานะ: P0 done; งานถัดไป P1.1–P1.8 ตามขอบเขตแผน ไม่เริ่ม P1 อัตโนมัติในคำสั่ง P0 นี้

### 2026-10-12 — P1 domain และฐานข้อมูล พร้อมทดสอบ

- Task IDs: P1.1–P1.8 เสร็จ; อ่าน P1_REPORT_V3.md สำหรับ mapping ไฟล์/หลักฐาน
- สร้าง shared/v3, frontend/Worker public entry points และ type re-exports โดยคงหน้าจอเดิมไว้รอ integration phases
- ใช้ชื่อหลักสูตรจริง 7 รายการ ชั้นปี 1–6 แยกอิสระ และคำถาม frozen v3; server snapshot resolvers พร้อม
- สร้าง closed enum/conditional validation, optional notes, pure health/environment/satisfaction evaluators และ failed-only retest preparer พร้อม carry provenance
- สร้าง migration baseline/domain/legacy snapshots และ preflight/ledger commands; เพิ่ม ownership/immutability/unique/FK guards และไฟล์ผัง snapshot เดิม
- ทดสอบจริง: npm run test:v3 (17 domain + 6 SQLite), typecheck ทั้งสองฝั่ง, ESLint 0 errors/172 warnings เดิม, build 14/14 pages และ Worker-domain ESM bundle ผ่าน
- ทดสอบ D1 local ทั้ง fresh install และ upgrade fixture 8 ตารางใน temp directory; รันซ้ำไม่เพิ่ม snapshot, 0/null/หน่วยเดิมครบ, immutable guard และ FK checks ผ่าน
- ทดสอบ Wrangler ครั้งแรกติด sandbox localhost/log permissions แล้วรัน local tests ใหม่ด้วย permission ที่ได้รับ; ไม่ใช้ remote flag และไม่ deploy
- หลักฐาน redacted: baseline/p1-preservation.json และ baseline/p1-eslint-summary.json
- API/runtime/E2E/R2 upload ยังไม่ทำใน P1; generic mutation ของ routes เดิมต้องปิดใน P2 ก่อน production cutover
- สถานะ: P1 done, P2 not-started; ไม่มีคำถามลูกค้าที่ยังบล็อก P1

### 2026-10-12 — P2 Worker API และ file lifecycle พร้อมทดสอบ

- Task IDs: P2.1–P2.10 done; R03–R24 ด้าน backend ตาม coverage ข้างต้น; UI ยังส่งต่อ P3–P7
- แยก service/repository/routes ใช้ shared contracts, typed frontend helpers และ error paths; เพิ่ม satisfaction catalog snapshots
- บันทึก atomic batches และ immutable payload versions; idempotency/concurrent preconditions; failed-only retest/carry; corrections/reason/audit; archive/restore
- เพิ่ม migration 0004; legacy supplement/adoption/import R2 และอ่าน revision เดิมได้; ไม่เดาข้อมูลเก่า
- Dashboard/export แยก latest/history/กลุ่ม/รุ่น/คลัง พร้อม pagination; exact CORS; R2 staged upload/signature/hash/10MiB/download/orphan cleanup
- ผลจริง: 23 API integration + 17 domain + 6 SQLite ผ่าน, D1 local upgrade/ledger resume ผ่าน, clean FK, typecheck ทั้งสองฝั่งและ build ผ่าน; lint evidence อยู่ baseline/p2-eslint-summary.json
- ระหว่างทดสอบพบ SQL binding และ legacy carry continuation guard แล้วแก้พร้อมรันทดสอบใหม่จนผ่าน; ไม่เหลือ known failing check
- รายละเอียด: P2_REPORT_V3.md; API evidence: baseline/p2-api-tests.json; ไม่มี deploy/migrate remote/bucket provisioning
- ไม่มี decision ค้างสำหรับ P2; งานถัดไป P3; UAT/บัญชีจริง/production cutover ใน P8/P9

### 2026-10-12 — P3 เมนูและ frontend infrastructure พร้อมทดสอบ

- Task IDs P3.1–P3.7 done; R01–R02/R05/R17–R24 ด้าน menu/draft/submit safety; backend คงตาม P2 และรายละเอียดฟอร์มส่งต่อ P4–P7
- หน้าแรก 2 cards/กลุ่มละ 4 entries; satisfaction group ชัดเจนและลิงก์ไม่มี group ให้เลือก; active nav/back/error recovery
- Draft versioned envelope + schema check + แยก group/type/category/mode/code/base; autosave/flush/step/tab/request key; ไม่ตีความร่าง legacy เป็น v3
- แก้ reset loop ระหว่าง autosave; standard accessible errors/focus/optional notes; none exclusive/N/A primitives
- รวม submit service และลบ local fake-success paths; API failure คงร่าง; ใช้ server receipt/code; edit/result ไม่ใช้ local cache เป็น authority
- ผลทดสอบ: 11 unit + 11 Chromium scenarios/API mock ผ่าน; 17 domain + 6 SQLite ผ่าน; typechecks/build ผ่าน; lint 0 errors ตาม baseline/p3-eslint-summary.json
- ยกเลิกการทดสอบรอบที่ dev/build ใช้ .next ชนกัน แล้วรัน browser และ build แยกจนผ่าน; ภาพ desktop/mobile ตรวจแล้ว
- หลักฐาน/ไฟล์: P3_REPORT_V3.md, baseline/p3-*; ไม่มี deploy หรือ remote writes ไม่มี decision ลูกค้าค้าง
- สถานะ P3 done; พร้อม P4; ไม่ถือ mock success เป็น full Worker/frontend integration

### 2026-10-12 — P4 ฟอร์มสุขภาพ v3 พร้อม integration tests

- Task IDs P4.1–P4.7 done; R03–R11 ด้าน health UI/submit/read/compare; standard report/Excel ส่งต่อ P7
- ส่งมอบ health profile/work required, conditional disease/year/experience/other, 7 หลักสูตร/ปี 1–6 และชั่วโมง/สัปดาห์
- แสง before/after 10+10 แยก tabs/draft/เวลา 0–24 ไม่รวมคะแนน; before gate/after preservation/review compare; เสียง sources/other/none + 10 questions; heat 10 questions/scale เดิม
- Typed normalized payload ไม่ส่ง derived scores; Worker receipt→server snapshot result; legacy single ยังอ่านชุดเดิม; selected version/revision read helpers
- ผลจริง: P4 unit 8 + actual browser/Worker/D1 9 ผ่าน; 6 compare examples/per-item/UI/API ผ่าน; clean FK/0 page errors; P3 browser 11/unit 11 และ domain 17/SQLite 6 regression ผ่าน; typechecks/build ผ่าน
- Lint 0 errors ตาม baseline/p4-eslint-summary.json; ตรวจภาพ review มือถือและผล desktop แล้ว
- รายละเอียด/หลักฐาน: P4_REPORT_V3.md และ baseline/p4-*; ไม่มี migration ใหม่/deploy/remote writes
- ไม่มี decision ค้างจากลูกค้า; สถานะ P4 done; งานถัดไป P5; correction UI/Excel/full UAT ยังอยู่ phase ตามแผน

### 2026-10-12 — ปรับคำถามความพึงพอใจก่อน phase ถัดไป

- ผู้ใช้ส่ง Word และสั่งเฉพาะอัปเดตคำถาม; อ่าน 2 ตารางครบ 32 ข้อ ไม่ใช้ข้อความในไฟล์เป็นคำสั่งขยายงาน
- เพิ่ม group catalogs environment/health, Content label, r2 questionnaire versions, server snapshots และ versioned draft keys; result ใช้ข้อความเดิมที่เก็บไว้; ป้องกัน correction ข้ามรุ่นคำถาม
- Excel ใช้ q-number score headers/group/version และ dictionary sheet แยกรุ่น; full export integration อยู่ P7
- เทียบข้อความกับ XML DOCX ครบทุกข้อหลัง normalize ช่องว่างตัดคำ; health q12 แก้คำตก ชัดเจ→ชัดเจน บันทึกในรายงาน
- ทดสอบ 6 unit (รวม workbook) + 5 browser/Worker local ผ่าน; P2 API 23/P3 browser 11/P4 browser 9/domain 17/SQLite 6 ผ่าน; typecheck/build ผ่าน; lint ตาม baseline/satisfaction-eslint-summary.json
- หลักฐาน: SATISFACTION_QUESTION_UPDATE_V3.md, catalogs/satisfaction-source-docx.json และ baseline/satisfaction-*; ไม่มี migration/deploy/remote writes
- สถานะ P4 ยังคง done; full P5/P6 ยังไม่เริ่ม ไม่มี decision ค้างสำหรับการเปลี่ยนคำถาม

## แบบบันทึกเมื่อจบแต่ละรอบพัฒนา

คัดลอกส่วนนี้เพิ่มใน Work log ห้ามแก้ประวัติเดิมให้ดูเหมือนงานทำเสร็จมาก่อน

```text
วันที่/ผู้ทำ:
Phase / Task IDs:
Requirement IDs:
สิ่งที่ทำเสร็จ:
ไฟล์ที่เปลี่ยน:
Migration IDs / API contract changes:
คำสั่งทดสอบและผลจริง:
หลักฐาน UI / API / DB / export:
Commit / PR (ถ้ามี):
สิ่งที่ยังไม่เสร็จและเหตุผล:
คำถาม/ข้อมูลที่ต้องการ:
สถานะ phase หลังงานนี้:
งานถัดไปที่เริ่มได้:
Deployment identifiers / rollback note (ถ้ามี):
```

## Checklist ก่อนติ๊ก done

- [ ] Task IDs ใน Implementation Plan อัปเดตตรงกับ phase board
- [ ] Requirement coverage มีหลักฐานทั้ง persistence และผลที่ผู้ใช้เห็น
- [ ] Test ที่กล่าวว่าผ่านรันแล้วจริง และระบุสิ่งที่ไม่ได้รัน
- [ ] คำถามค้าง/ข้อมูลลูกค้าที่ไม่ครบยังมองเห็นชัด
- [ ] ไม่มีการถือ scaffold, mock data หรือ local-only success เป็นงานพร้อมใช้จริง
- [ ] บันทึก next action ชัดเจนเพื่อสั่งต่อ phase ได้ทันที


## Work log: P5 — 12 ตุลาคม 2026

- Task IDs P5.1–P5.8 done; R12–R18 ด้านฟอร์ม/มาตรฐาน/ตรวจซ้ำ/read และส่วน history ของ R19; full dashboard/export/print ส่งต่อ P7
- เปลี่ยน environment route เป็น v3 wizard, แยก adapters/lifecycle hook/unit editor/summary/result/standards; ใช้ static query routes ตามเดิม
- Required metadata/วันเวลา/ผังทั้ง 3 หมวด; source modes ตรง shared/Worker; notes ว่างส่งได้; UTC+7 explicit, แยก blank/zero และลด field ที่ไม่เกี่ยวข้อง
- Retest ใช้ latest snapshot/failed set จริง; carry ผ่านคง measured_at/แหล่ง revision; UI ไม่มีทางเปลี่ยน point/sample IDs/มาตรฐาน/เครื่องมือ/วิธีวัด/ผัง; เมื่อทั้งหมดผ่านปิดปุ่มตรวจซ้ำ
- ทดสอบ conflict จากผู้บันทึกอีกคนจริง ร่างฐานเดิมคงอยู่หลัง refresh; โหลด latest เปิดร่างแยกและ key ใหม่; network failure ไม่แสดงผลที่อ้างว่าบันทึกสำเร็จ
- Legacy supplement ล็อก known values เติมที่ขาดพร้อมเหตุผลครั้งเดียว/audit; correction บันทึก revision ใหม่ ไม่ generic PATCH; ชื่อ/หมายเหตุที่แก้ไม่เปลี่ยนวันวัดจริงของค่า WBGT เดิม
- Worker ปรับ validation/evaluation ของ effective revisions เพื่อไม่ปฏิเสธ old carried heat intervals; ใช้ exact passed snapshot สำหรับ D1 carry guard และ kind=correction สำหรับข้อมูลที่แก้พร้อมวันวัดจริง
- PDF ทั้ง 3 ใช้ bytes ต้นฉบับใน public/standards มี catalog/checksum; คงคำแนะนำเดิมพร้อมภาคผนวก B/viewer/open/download fallback
- หลักฐาน: P5 unit 11/browser 16, P2 API 23, domain 17/SQLite 6, P3 unit 11, P4 browser 9/P3 browser 11; typecheck/build/lint ผ่าน ดู P5_REPORT_V3.md และ baseline/p5-*.json/png
- ปรับ P3 source-architecture test ให้ตรวจ route→wizard→hook สำหรับ environment ที่แยกโมดูลแล้ว โดยคงข้อห้าม fabricated local save; regression ตรวจชื่อกลุ่มครบทั้ง 8 route ผ่าน
- Frontend tsc ต้องรันหลัง build/Next harness จบ เพราะ .next/types ถูกเขียนใหม่; การตรวจรับสุดท้ายเรียงขั้นตอนแล้วผ่าน
- ไม่ deploy, ไม่ remote migration/R2, ไม่ commit/PR และไม่เริ่ม P6/P7 ในคำสั่งนี้; ไม่มี requirement decision ค้าง


## Work log: P6 — 14 ตุลาคม 2026

- Task IDs P6.1–P6.5 done; R20–R22 และส่วน satisfaction ของ R03/R05/R23/R24; full cross-module reports/Excel/print ส่งต่อ P7
- กลุ่มสุขภาพ 3 ขั้น และสภาพแวดล้อม 4 ขั้น เปิดอิสระ; ชื่อ required, health type/program/year/other/N/A ใช้ขอบเขตที่ยืนยันแล้ว ไม่เพิ่ม fields สุขภาพที่ไม่ได้อยู่ในแบบความพึงพอใจ
- เพิ่ม manual durations ทุกหน่วยหลังส่วนคะแนน environment; ระบุ 0 เองเมื่อไม่ใช้หน่วยนั้น; notes optional; ระยะเวลาไม่รวมคะแนน; แสดงส่วนต่างติดลบตามจริง
- ใช้ Worker validation/scoring/profile/work/duration normalized seconds/payload snapshots ของ P2 จริง ไม่เพิ่ม API หรือ migration ที่ไม่จำเป็น; required ทั้ง UI และ API reject invalid without writes
- Typed satisfactionV3 draft แยก group/questionnaire version; migrate ร่างคำถามรุ่นเดียวกันไปขั้นข้อมูลผู้ตอบโดยรักษา rating เดิม; corrupt/mismatched drafts ไม่ทำให้หน้าพัง
- Result/review แสดง stored metadata/mean/question/program snapshot/version; correction มีเหตุผลและ expected data version; เปิดรุ่นเก่าโดยไม่แสดง action แก้จากฐานเก่า
- Legacy unknown ไม่เดากลุ่ม/เวลา/คำถามใหม่ และไม่หาร 16 จาก ratings ที่เก็บไม่ครบ; แสดง cached score จริงและ ratings ที่มีข้อมูล
- Workbook adapter รับ Worker records; actual download ของรุ่นที่เลือกมี group/version/profile/program/year/manual seconds/negative difference และ dictionary snapshot; legacy ใหม่ที่ขาดเป็น blank ไม่ใช่ 0
- ทดสอบ 7 P6 unit + 11 actual browser/Worker/D1/R2, 6 source Word tests, P2 API 23/domain 17/SQLite 6/P3 unit 11/P4 browser 9/satisfaction browser 5/P3 browser 11; typecheck/build/lint ผ่าน ดู P6_REPORT_V3.md และ baseline/p6-*.json/png
- ปรับ regression P3/Word browser ให้ผ่าน respondent gate และ review step ใหม่ และตรวจข้อความที่บันทึกใน result แทน selector ของ layout เก่า; คงการตรวจ group/restore/required/no-fake-save/verified receipt
- ไม่ deploy, ไม่ remote migration/R2, ไม่ commit/PR และไม่เริ่ม P7; ไม่มี requirement decision ค้าง

## บันทึกปิด P7 (14 ตุลาคม 2026)

- Task IDs P7.1–P7.9 done; health/environment/satisfaction reports, history/latest guards, dashboard/date/group/archive filters และ single/bulk Excel/print ครบ; ดู [P7 report](./P7_REPORT_V3.md)
- API dashboard list ใช้ flat pagination/records ที่ตรง Worker; date_basis ระบุวันตรวจล่าสุดหรือวันสร้างงานตาม UTC+7 และ exact submission_code ใช้กับหน้ารอบเพิ่ม; summary aggregate ใน SQL ไม่อ่านทุกงานเข้า JS
- ส่งออก latest หรือ environment history + questionnaire latest; นับงาน 1 แถว/รหัส และรอบแยก; actual test 104 งานครบ 11 หน้ากับ 13 revisions ของ 1 งานผ่าน ไม่มี IN ขนาดใหญ่และ no partial downloads
- 10 unit + 14 browser/Worker scenarios ผ่าน; regression domain/SQLite/P2/P3/Word/P4/P5/P6 ผ่านตามตาราง P7; types/lint 0 errors (74 warnings เดิม)/build 14 static pages ผ่าน
- PDF A4 health 2 หน้า/environment 2 หน้า/satisfaction 1 หน้า เป็นข้อมูล QA; render และตรวจภาพครบ 5 หน้า รวม repeated table headers/Thai text/complete borders/standards block และซ่อน controls/iframe
- แยก test cache ด้วย SAFECHECK_TEST_DIST_DIR; ต่อไปยังรัน harness/build ตามลำดับ เพื่อลดการแย่ง runtime/port และการทำงานซ้อน
- ไม่มี migration ใหม่ ไม่มี deploy/remote DB/R2/commit/PR และไม่เริ่ม P8; ไม่มี decision ค้างเพื่อปิด P7

## บันทึก P8 ทางเทคนิค (14 ตุลาคม 2026)

- งานทางเทคนิค P8.1–P8.5/P8.7/P8.8 done; P8.6 จัดทำ UAT expected/actual และข้อจำกัดให้เจ้าของงานตรวจ ก่อนรับคำยืนยันตามบันทึกปิด P8 ด้านล่าง
- Regression core/browser/check commands รันตามลำดับ มี exit-code/elapsed/log ต่อ command; P4/P5/P6 create ทั้ง 8 แบบจริง, P3 draft/refresh/network, P2 atomic/retry/stale/ownership, P7 grouped/latest/history/bulk/print ผ่าน
- เพิ่ม API field matrix 16 applicable shapes: 455 required deletion requests = HTTP400/no writes, 64 optional omitted/null/empty/space = HTTP201, conditionally required disease/other/context ว่างยัง fail; fresh process read/export ตรง API ทั้ง 8 แบบ
- D1 rehearsal บนข้อมูลสมมติ 28 jobs: original values/types/counts/layout bytes/zero/null/old weekly-day units คงเดิม; restore recovery copy แล้ว migrate ได้ pointers/mappings เดิม; FK/duplicates 0; no destructive migration หรือ remote operation
- แก้ nullable legacy presentation ที่แสดงข้อมูลไม่มีเป็นไม่ผ่านใน result/history/Excel โดยใช้ recordedPass; tests ตรวจ legacy empty environment/health ไม่มี invented failure/score/before-after
- 181 scenarios/checks ผ่าน (ไม่บวก matrix subcases ซ้ำ); Worker/frontend types/build ผ่าน, lint0/74; Firefox/WebKit not-run หลังคำขอติดตั้งไม่ได้รับอนุญาต
- R01–R25 verified ทางเทคนิคตาม [Coverage](./P8_COVERAGE_V3.md); ไม่เท่ากับ UAT signoff หรือ production readiness
- คำยืนยัน [P8 UAT](./P8_UAT_V3.md) ได้รับแล้วตามบันทึกปิด P8 ด้านล่าง; ไม่เริ่ม P9 ไม่ deploy/remote DB/R2/commit/PR

## บันทึกปิด P8 และ UAT (14 ตุลาคม 2026)

- เจ้าของงานตอบโดยตรงในแชต: “ยืนยัน UAT ตามเอกสารและรับทราบขอบเขตทดสอบ”
- ปิด P8.6 และ P8 เป็น done; อัปเดต checklist, report, UAT, coverage และหลักฐานสถานะให้ตรงกัน
- รับทราบว่าทดสอบจริงด้วย Chromium; Firefox/WebKit not-run และยังไม่มี deploy ไม่เพิ่มผลทดสอบ manual/device ที่ไม่ได้รัน
- [หลักฐานคำยืนยัน](./baseline/p8-owner-uat.json); P9 ยัง not-started ตามคำสั่งยังไม่ deploy

## บันทึกปิดงานปรับหลัง UAT (14 ตุลาคม 2026)

- D17/D18 done; optional plan/deferred upload/preview/review/add-later และ unified current UI ครบ ดู [รายงาน](./POST_UAT_UI_REPORT.md)
- ทดสอบ 173 scenarios/checks + quality รวม 17 commands ผ่าน; 8 original local tables preserved และแก้ Dashboard API 503 → 200
- Migration 0005 เพิ่มสำหรับ optional plan; ประวัติ/frozen snapshots/carry/ownership guards คงครบ; ทดสอบ copy ข้อมูลที่มีสามรอบก่อนปรับ constraint ผ่าน
- P8 UAT เดิมเป็นหลักฐานก่อนคำสั่งใหม่ ไม่เปลี่ยนให้เป็นคำยืนยันงานนี้; source fingerprint ชุดล่าสุดแยกจาก P8
- ไม่เริ่ม P9 และไม่มี deploy/remote DB/R2/commit/PR

## บันทึกปิดคืน UI และข้อมูลปัจจุบัน (14 ตุลาคม 2026)

- D19/D20 done: คืนตาราง style เดิม, header/code ชุดเดียว, navbar viewport และสถิติ/Excel/current-only
- 129 scenarios/checks + quality ผ่าน ตาม [รายงานและภาพ](./UI_RESTORE_REPORT.md); ไม่มี page errors/FK violations
- ตั้งค่า local dev ให้เปิดดูได้; ไม่เปลี่ยนฐานจริง ไม่มี migration ใหม่/deploy/remote DB/R2/commit/PR และ P9 ยัง not-started
