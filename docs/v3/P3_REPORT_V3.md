# P3 เมนูและโครงสร้างฟอร์ม Frontend

วันที่ 12 ตุลาคม 2026 · **P3.1–P3.7 done** · ไม่ deploy / ไม่แก้ remote D1 หรือ R2

## ผลที่ส่งมอบ

- หน้าแรกเหลือ 2 กลุ่ม สภาพแวดล้อมในการทำงาน / อาการทางสุขภาพ; แต่ละกลุ่มมีแสง เสียง ความร้อน และความพึงพอใจ รวม 8 เส้นทาง ใช้รูปแบบ glass cards เดิมและ grid มือถือ/desktop
- เปลี่ยนชื่อแบบประเมินสุขภาพเป็น “ประเมินอาการทางสุขภาพ” ในเมนู หัวฟอร์ม ชื่อแบบใน review/result และข้อความประกอบ; คง internal enum health_risk และระดับคะแนนไว้
- Satisfaction route ต้องมี `group=environment|health`; ลิงก์เก่าไม่มี group หรือค่าไม่ถูกต้องแสดงหน้าเลือกกลุ่ม ไม่สร้างร่างโดยเดากลุ่ม; back กลับกลุ่มนั้น
- Active navigation หน้าแรกครอบคลุม assessment routes; invalid category และโหลดข้อมูลแก้ไขไม่ได้มี error state/ทางย้อนกลับ
- Draft envelope version 3 เก็บ identity, data, step/tab, requestKey, savedAt; key แยก group/type/category/mode/code/base revision แบบ JSON tuple จึงไม่มีปัญหาการชนจากตัวคั่น
- เก็บ partial fields ระหว่างกรอกด้วย debounce 250 ms; flush เมื่อ unmount/pagehide/beforeunload; การกดถัดไป/กลับเขียน step พร้อมข้อมูล; refresh คืนตำแหน่งได้ มีข้อมูล before/after แยกสำหรับ P4
- ตรวจ schema/ชนิดข้อมูล/identity/ขอบเขต step ก่อนใช้ cache; malformed/คนละรุ่นไม่โหลด; ไม่อ่าน key draft รุ่นเก่ามาตีความเป็น v3 และไม่ลบข้อมูลเก่าทิ้ง; storage ไม่พร้อมแจ้งว่าเก็บร่างบนเครื่องไม่ได้
- Edit โหลด server ก่อนทุกครั้ง ตรวจ type/category/group/archive และ base ล่าสุด; ไม่ใช้ session/local submissions cache เป็นหลักฐานอนุญาตแก้ไข; โครงสร้างรองรับ correction/retest แยก key สำหรับ P5/P7
- เพิ่ม aria-invalid/aria-describedby/error IDs ใน input/select/textarea; validation โฟกัสและ scroll ช่องแรก; submit error มี role alert และโฟกัส ข้อความ field ใช้ชื่อภาษาไทย; required marker อิง required prop โดย notes/suggestion ไม่บังคับ
- ChoiceButton ใช้ aria-pressed; ExplicitChoiceGroup รองรับเลือกหลายข้อพร้อม “ไม่มี” แบบ exclusive ไม่อนุมานจากรายการว่าง; ตัวเลือก not_applicable แยกจาก placeholder ว่าง เพื่อเชื่อม program/source controls ใน P4/P6
- ทุกฟอร์มใช้ submit service กลาง ตรวจ shared v3 schema และรับผลสำเร็จเฉพาะ receipt ที่มี ID/code/data version จริง ป้องกัน double click ด้วย ref lock; failure/timeout/409 คงร่างและ key เดิม ไม่มีสร้างรหัสหรือ local submission ปลอม แล้วพาไปหน้าผล
- หน้าผลอ่าน server เป็นหลัก ไม่แสดงรายการเก่าจาก localStorage เสมือนเป็นผลที่ server บันทึกแล้ว

## ขอบเขตที่ส่งต่อ

P3 ทำเมนูและ infrastructure ตามแผน **ยังไม่ใช่การปิดรายละเอียดฟอร์ม v3 ทั้งระบบ**:

- P4: profile/work required ทั้งชุด, หลักสูตร/ชั้นปีจริง, คำถามและ tabs ก่อน–หลัง, noise sources, mapping payload/review v3
- P5: environment metadata, Spot/Area/เสียง/WBGT units, R2 layout upload reference และ failed-only retest/correction UI
- P6: profile/work/durations ตาม satisfaction group และ payload/review ครบ
- P7: result/history/dashboard/Excel v3 และการเปิด correction ที่มี reason/base/version

ฟอร์มรุ่นเดิมยังขาดข้อมูลสำหรับ schema v3; ตอนกดส่งจะถูก validation ปฏิเสธและเก็บร่างไว้ ไม่เดาข้อมูลหรือส่งผ่าน legacy API การทดสอบ success ของ P3 ใช้ fixture v3 ที่ครบเพื่อพิสูจน์ infrastructure และ **API mock**; ไม่อ้างว่า frontend ทั้ง 8 ฟอร์มเชื่อม Worker ครบแล้ว

## ไฟล์หลักและแนวทางใช้ต่อ

| ส่วน | ไฟล์ |
| --- | --- |
| เมนู | src/app/page.tsx, src/components/assessment/group-menu.tsx, assessment group pages |
| Group selection / submit | src/app/assessment/satisfaction/page.tsx และ form pages |
| Draft codec | src/lib/v3/draft.ts |
| Wizard / autosave | src/hooks/use-assessment.ts, use-step-draft.tsx |
| Submit / field errors / choices | src/lib/v3/submit.ts, form-errors.ts, choices.ts |
| Form primitives | src/components/forms/*, explicit-choice-group.tsx |
| Server authoritative result | src/app/result/page.tsx |

`useAssessmentForm` รับ group, mode (`create|correction|retest`), editCode และ baseRevision; คืน currentStep/currentTab, setStep/setTab, saveDraft, requestKey, draftWarning และ clearDraft การย้าย tab ต้อง save คำตอบของ period แล้ว setTab; P4 เชื่อม tabs จริงกับก่อน/หลัง ไม่รวมทั้งสองไว้ใน flat q1–q10

ห่อ step ด้วย DraftProvider แล้วใช้ useStepDraft(watch, field) ใน RHF component สำหรับ autosave; ฟอร์ม mount หลังโหลดร่าง ไม่ reset ทุกครั้งที่ defaultValues เปลี่ยนเพราะจะวนกับ autosave

Submit service คืน failure เป็นค่าปกติ ไม่ clear/navigation ใน branch นี้; เมื่อ response.success เท่านั้นให้ clearDraft และใช้ response.data.submission_code ห้าม fallback จากการส่งไม่สำเร็จไป local completed record

## ผลทดสอบ

| คำสั่ง | ผล |
| --- | --- |
| npm run test:p3 | 11 tests: draft identity/codec/periods/step/tab, invalid cache, required paths, API 400/409/network/timeout, receipt, ภาษาไทย, none/N/A และไม่สร้าง local success |
| npm run test:p3:browser | 11 scenarios ผ่านใน Chromium; viewport 320/390/1440; 0 page errors; API mock เท่านั้น |
| npm run test:v3 | 17 domain + 6 SQLite migration tests ผ่าน |
| npm run typecheck / typecheck:worker | ผ่าน |
| npm run build | ผ่าน 14/14 static pages |
| ESLint src worker/src shared scripts | 0 errors / 108 warnings เดิม (P2 131); v3 hooks/services/tests ใหม่ 0 warnings |

Browser ตรวจ 2×4 routes, group selection, partial typing→refresh, step/back restore, draft isolation, invalid cache/category, focus/errors, optional suggestion, failure คงร่าง, server authoritative result/edit และ valid fixture retry ใช้ key เดิมก่อนใช้ code ที่ server mock ยืนยัน

Browser script ใช้ Playwright ที่ติดตั้งใน project หรือ npm cache; ระบุ PLAYWRIGHT_MODULE_PATH ได้ และใช้ P3_BASE_URL (default http://127.0.0.1:3013) เปิด dev server ก่อนรัน และ **หยุด dev server ก่อน production build** เพราะใช้ .next ร่วมกัน รอบแรกที่รันชนกันยกเลิกแล้ว; ผลที่บันทึกเป็นรอบที่แยกกันและผ่านจริง

หลักฐาน: [unit](./baseline/p3-unit-tests.json), [browser](./baseline/p3-browser-tests.json), [lint](./baseline/p3-eslint-summary.json), [มือถือ](./baseline/p3-home-mobile.png), [desktop](./baseline/p3-home-desktop.png) ภาพจาก dev browser อาจมี Next.js dev indicator

ยังไม่ได้ browser E2E ของฟอร์ม v3 ที่ครบทุก fields กับ Worker จริง, UAT หรือ production verification ไม่มีข้อมูลลูกค้าที่ยังบล็อก P3 งานถัดไป **P4 สุขภาพแสง เสียง ความร้อน**
