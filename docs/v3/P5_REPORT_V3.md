# P5 สภาพแวดล้อมและการตรวจซ้ำ

วันที่ 12 ตุลาคม 2026 (Asia/Bangkok) · สถานะ: done — P5.1–P5.8 ครบ · ยังไม่ deploy

อ่านคู่กับ [Implementation plan](./IMPLEMENTATION_PLAN_V3.md), [Field matrix](./FIELD_MATRIX_V3.md) และ [Progress](./PROGRESS_V3.md)

## สิ่งที่ส่งมอบ

| Task | ผลการปรับ | หลักฐานรับงาน |
| --- | --- | --- |
| P5.1 | metadata ทั้ง 3 หมวดบังคับชื่อ/ตำแหน่ง/สถานที่/เครื่องมือ/Serial Number/วันที่ปรับเทียบ/แผนก/ผู้รับผิดชอบ/วันเวลา และผังที่อัปโหลด R2; หมายเหตุ optional | ฟอร์มส่งถึง Worker อ่านกลับได้; ค่าเปล่าไม่แทนเป็น 0; API เป็นผู้ตรวจ required จริง |
| P5.2 | เลือก Spot/Area ก่อนค่ามาตรฐาน; Spot เลือกแถวและค่าเป้าหมายในช่วง พร้อมค่าบริเวณโดยรอบเมื่อ ≥ 1,000 Lux; Area แต่ละพื้นที่มี sample IDs และเกณฑ์เฉลี่ย/ต่ำสุด | ค่าเฉลี่ย 300 Lux แต่ต่ำสุด 149 ในพื้นที่ office ได้ fail; รอบโดยรอบ 300/200 ที่เป้าหมาย 1,200 ได้ pass; ตรวจซ้ำ Area ต้องกรอกจุดย่อยเดิมครบ |
| P5.3 | แยกค่าเฉลี่ยสัมผัสจริง+นาทีออกจาก TWA ที่ปรับ 8 ชั่วโมงแล้ว; เลือกนาทีจากตารางหรือกรอกเอง; เก็บ min/max และเฉลี่ยตามวิธี | 360 นาที/86 dBA ผ่านตาม formula limit 86; TWA8 85.1 ไม่ผ่านตาม limit 85 ไม่ปรับเวลาอีกครั้ง |
| P5.4 | แยก meter_average กับ calculated_intervals; เลือกมีแดด/ไม่มีแดดและภาระงาน; รับเวลา 120 นาทีและ raw เฉพาะช่องที่เกี่ยวข้อง | มีแดด WB=28/GT=40/DB=35 ให้ WBGT 31.1; 119 นาที reject; ไม่บังคับกรอกค่าเฉลี่ยซ้ำเมื่อคำนวณ |
| P5.5 | PDF ต้นฉบับทั้ง 3 ใน public/standards พร้อม catalog รุ่น/ชื่อ/URL, viewer, เปิดแท็บใหม่, download fallback; คงคำแนะนำเดิมและต่อภาคผนวก B | ทดสอบ HTTP bytes เทียบไฟล์ต้นฉบับทุกฉบับ; ตรวจหน้าแรกผ่าน PNG; ดู [metadata/checksum](./catalogs/environment-standard-assets.json) |
| P5.6 | เปิดจาก snapshot ล่าสุด; ล็อก metadata/เครื่องมือ/เทคนิค/สถานที่/เกณฑ์/จำนวนจุด/ผัง/ระยะเวลาสัมผัส/วิธี WBGT; รับใหม่เฉพาะ failed units + วันเวลา; carry อ่านอย่างเดียว | failed → failed → pass มี 3 รอบในงานเดียว; IDs/เกณฑ์/ผังเดิม; จุดผ่านคงวันวัดและ revision ต้นทาง; latest pass ไม่เปิด retest; รอบย้อนหลังไม่มีปุ่มตรวจซ้ำ |
| P5.7 | optimistic conflict จริง 409; เก็บ draft ฐานเดิม; ปุ่มโหลดล่าสุดดึงข้อมูล server ใหม่และเปิด key แยกตาม base; ถ้าผ่านแล้ว/เข้าคลัง ให้กลับผลล่าสุด | สร้างรอบจากผู้บันทึกอื่นระหว่างกรอกจริง; ร่างค่าที่กรอกคงอยู่แม้ reload; reload latest เปิดร่างใหม่ ไม่มีการเขียนทับรอบผู้อื่น |
| P5.8 | legacy supplement แยกจาก correction/retest; รู้ค่าที่มีอยู่แล้วให้ล็อก; เติม metadata/ยืนยันวิธีครั้งเดียวพร้อมเหตุผลและ audit; correction เป็น revision ใหม่พร้อมเหตุผล | งานเก่า noise ยืนยัน TWA8 และค่าเดิมครบก่อนตรวจซ้ำ; รายงาน legacy เดิมไม่เปลี่ยน; serial correction ไม่ทับ snapshot เก่า |

## โครงสร้างโค้ดและ API

- `/assessment/environment-form?category=light|noise|heat` ใช้ wizard v3 แทนฟอร์ม legacy; ไม่เพิ่ม dynamic route
- mode: create, `retest=<code>&base=<revision>`, `edit=<code>&base=<revision>` และ `supplement=<code>&base=<legacy revision>`; UI ต้องตรวจ latest/category/archive กับ Worker ก่อนใช้ข้อมูล
- `src/lib/v3/environment-form.ts` รับผิดชอบการแปลงค่าร่างเป็น typed contract, เวลา UTC+7, applicability, seed/reset failed fields, validation และ safe draft restore
- `src/hooks/use-environment-form.ts` แยก lifecycle/draft/upload/transport/conflict ออกจาก UI; `src/components/environment/` แยก unit editor, wizard, summary, result และ standards
- Draft ใช้ form version `environment-form-v3-p5-2026-10-12`, group/category/mode/code/base; ร่างโครงสร้างเก่าหรือเสียไม่ถูก render เป็นข้อมูลจริง; incomplete values และ stable IDs คืนค่าได้หลัง refresh
- create ใช้ `submitAssessment`; retest/correction/supplement ใช้ endpoints P2; ทุกเส้นทางล้างร่างและเปิดผลเมื่อ Worker คืน receipt ที่ตรวจได้เท่านั้น ไม่มี local fallback ที่อ้างว่าบันทึกสำเร็จ
- อัปโหลดผ่าน `/api/files` ไป staged R2 แล้ว Worker commit reference กับ revision; ไม่ส่ง base64 ผังเข้า D1 จากฟอร์มใหม่ และไม่เปลี่ยนผังเก่าใน retest
- Environment result ใช้ snapshot/results ของ revision ที่อ่านจาก API; แสดงวันวัดจริง/carry/แหล่ง revision/เกณฑ์/หน่วย/ค่าประกอบ และมีประวัติรอบแบบแบ่งหน้า; เปิดรายละเอียดรอบเก่าได้
- Worker retest แก้การตรวจเวลาให้ validate เฉพาะ heat units ที่วัดใหม่ใน inspection window ใหม่; carried heat เก็บช่วงเวลาเดิมได้ จากนั้นคำนวณ effective result ของทั้งงาน ไม่ย้ายวันเก่าเป็นวันวัดใหม่
- Correction ความร้อนยกเว้นเงื่อนไขเวลาใหม่เฉพาะค่าการวัดที่ตรง snapshot server เดิม (เทียบเวลาจริง ไม่เทียบเพียงรูปแบบ offset); ค่าที่เปลี่ยนใหม่ต้องอยู่ใน inspection window ใหม่ตามปกติ ไม่มี public field ให้ client ขอข้าม validation
- จุดผ่านที่คงทุกค่าเดิมใช้ exact snapshot เพื่อผ่าน D1 carry guard; ถ้าแก้ชื่อสถานที่/หมายเหตุ หรือจุดเดิมไม่ผ่าน ให้คง measured_at จริงและระบุ revision kind=correction ในรายงาน ไม่อ้างว่าวัดใหม่ในวันที่แก้ไข; audit เก็บ before/after ครบ
- Legacy result API คืน stable `point_key` ให้ supplement UI จับคู่จุดเดิม ไม่เดาตาม array index; ไม่มี migration เพิ่มใน P5

## กติกาข้อมูลเก่า

ผู้ตรวจต้องยืนยันข้อมูลที่ขาดจากหลักฐานจริง ไม่มีวันที่/Serial/วิธีวัดสมมติให้ข้าม validation หากวิธีที่ยืนยันเปลี่ยนเกณฑ์จากเดิม, ไม่มีโครงสร้าง Area/ค่ารอบโดยรอบที่ยืนยันได้ หรือไม่ทราบ metadata ที่จำเป็น ให้เริ่มงานใหม่ตาม Q05; งานเดิมยังเปิดอ่านได้

Supplement เก็บ revision/audit และไม่แก้ snapshot เดิม; การแก้ข้อมูลหลังบันทึกใช้ correction พร้อมเหตุผล ส่วน retest ใช้เฉพาะค่าหน่วยไม่ผ่านและวันเวลารอบใหม่ การเปลี่ยน topology/เกณฑ์/เทคนิคต้องสร้างงานใหม่ตามข้อจำกัด Worker ที่ตกลงไว้

## ผลทดสอบ

- 11 unit/contract/asset tests ผ่าน: required/empty/zero/calendar/UTC+7/Spot/Area/noise/WBGT/retest/draft shape/hash
- 16 actual local browser/Worker/D1/R2 scenarios ผ่าน: first inspection ทั้ง 3 หมวด, 3 revision loop, Spot surrounding/refresh, Area min/complete samples, noise two bases, heat two modes + carry, real stale-base conflict, correction, legacy supplement, fake locked-field request metadata correction หลัง heat retest และ corrupt draft recovery
- Regression P2 API 23 + domain 17 + SQLite 6 + P3 unit 11 ผ่าน
- P4 browser 9 + P3 browser 11 ผ่าน; satisfaction question browser/API 5 ผ่านใน regression รอบแรกก่อนปรับหัวข้อฟอร์ม P5 ให้มีชื่อกลุ่ม; production build/static export 14/14 ผ่าน
- Frontend/Worker typecheck ผ่าน; lint 0 errors / 99 warnings ที่เหลือจากโค้ดเดิม; ไฟล์ใหม่ P5 ไม่มี warning
- รูปตรวจหน้าจอ: [Area mobile](./baseline/p5-area-mobile.png) และ [Heat desktop](./baseline/p5-heat-desktop.png)
- หลักฐานหลัก: [unit](./baseline/p5-unit-tests.json), [browser](./baseline/p5-browser-tests.json), [lint](./baseline/p5-eslint-summary.json)

คำสั่งทำซ้ำ:

```bash
npm run test:p5
npm run test:p5:browser
npm run test:p2
npm run test:v3
npm run test:p3
npm run test:p4:browser
npm run typecheck
npm run typecheck:worker
npm run lint
npm run build
```

Browser tests เปิด/ปิด Next และ workerd runtime ของตัวเองบน 127.0.0.1:3024/3025; ใช้ D1/R2 แยกใน temporary directory ไม่แตะฐาน production และไม่ควรรัน Next browser harness หลายตัวหรือ build พร้อมกันเพราะใช้ workspace .next เดียวกัน; ให้รัน frontend typecheck หลัง build จบเช่นกัน เพื่อไม่ให้ tsc อ่าน generated files ระหว่างถูกสร้างใหม่

## งานส่งต่อ

- P6 ยังไม่เริ่ม full flow: ข้อมูลผู้ตอบ/หลักสูตร/ปีของ satisfaction-health และระยะเวลาสองวิธีที่กรอกเองสำหรับ satisfaction-environment; คำถาม 2 ชุดจาก Word ทำแล้วก่อน P5
- P7 ยังต้องรวม reports/history/dashboard/filter/Excel/print ทั้งระบบ; หน้าผลและ history environment ใน P5 เป็นส่วนที่จำเป็นต่อ retest ไม่ถือว่า P7 ทั้ง phase เสร็จแล้ว
- P8/P9 ตรวจ UAT, rehearsal/production schema/bindings และ release ตามแผน; ไม่มี remote migration, deploy, commit หรือ PR ในคำสั่ง P5 นี้
- ไม่มีคำถาม requirement ค้างที่ต้องให้เจ้าของงานตัดสินใจเพื่อปิด P5
