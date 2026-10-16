# P8 Requirement coverage R01–R25

หลักฐาน P8 ก่อนคำสั่ง D17/D18 วันที่ 14 ตุลาคม 2026 · ผลทางเทคนิคตรวจแล้ว; เจ้าของงานยืนยัน UAT และรับทราบขอบเขตทดสอบแล้ว บันทึกที่ [P8 UAT](./P8_UAT_V3.md)

| ID | สิ่งที่ตรวจถึง API/ข้อมูล/รายงาน | หลักฐานรอบ P8 | สถานะทางเทคนิค |
| --- | --- | --- | --- |
| R01 | สองกลุ่มและ 8 entry routes พร้อม create จริงครบทุกแบบ | P3 browser 11 (เรียกจาก P4), P4/P5/P6 browser, P8 fresh results 8 | verified |
| R02 | ชื่อ physical symptoms แยก light/noise/heat และ satisfaction ตามกลุ่ม | P4 browser headings/question snapshots, P3 routes, Word/browser question tests | verified |
| R03 | 7 โปรแกรมจริง + year 1–6 แยกกัน, N/A มีเฉพาะบริบทที่รองรับ; snapshot program label | domain, P4 unit/select/API, P6 unit/browser; P8 staff/N/A/student/other fixture และ XLSX snapshot = API | verified |
| R04 | ชั่วโมง/สัปดาห์ v3; วัน/สัปดาห์ legacy ไม่ถูกแปลงเอง | P8 U02 40 ชั่วโมง; D1 old days=0/new hours=NULL และ typeof คงเดิม | verified |
| R05 | Required/applicability ฝั่ง UI และ Worker, note optional, zero ไม่เท่ากับ missing | P8 455 required rejects/64 optional creates, P3 focus, P4/P5/P6 validation | verified |
| R06 | หน้าสุขภาพแสง 2 ช่วงและเก็บ 20 คำตอบแยก phase | P4 gate/refresh/back/create, P8 U01 และ fresh XLSX before/after | verified |
| R07 | ชั่วโมงวันนี้ 0 ได้ ไม่เข้าคะแนน แยกจาก hours/day/week | P8 health-light zero valid/missing reject, P4/P7 summary และ metadata | verified |
| R08 | delta/level/per-item ใช้หลัง−ก่อนและระดับจากหลัง; zero/boundaries/decreased-but-high | domain boundary tests, P4 6 compare examples UI/API, P8 U01, P7 paired export | verified |
| R09 | Noise source none/multiple/other conditional ไม่เข้าคะแนน | domain/P4 actual browser; P8 other-details required matrix/optional-no-source note | verified |
| R10 | Noise symptoms 10 new questions, stored wording/id | health catalog/P4 UI/API, P8 noise result + downloaded snapshot = API | verified |
| R11 | Heat symptoms 10 new questions, 3 response scores | P4 UI/API all zero, P8 heat total 20 and fresh report | verified |
| R12 | เครื่องมือ/serial/calibration/responsible department/person ครบถึง Worker/revision/report/Excel | P8 ทุก inspection field missing reject, P5 create/correction/locked metadata, P7/P8 exported snapshot | verified |
| R13 | Spot/Area ก่อนมาตรฐาน, samples/surrounding/criteria ปิดครบ | domain, P5 UI, P8 variants/required leaves, P7 exact threshold/sample exports | verified |
| R14 | ไฟล์แสงและ guidance เดิม/เพิ่ม, version/threshold ตาม snapshot | P5 byte-identical PDFs/viewer/download, P7 print-selected and old threshold | verified |
| R15 | เสียงตามเวลา/TWA8 พร้อมคำแนะนำและไฟล์, ไม่เพิ่ม checkbox | domain table/formula, P5 browser, P8 U03, asset hash; P7 stored thresholds | verified |
| R16 | WBGT input modes/raw intervals/sunlight/workload limits, PDF/guidance | domain/P5 browser and assets, P8 heat required/U04, P7 interval exports | verified |
| R17 | ล่าสุดไม่ผ่านเท่านั้นจึงตรวจซ้ำได้ ห้ามรอบเก่า/foreign revision | P2 stale/ownership/pass rejection, P5/P7 links, P8 U09 foreign=404 | verified |
| R18 | failed-only, frozen metadata/layout/standard/topology, carry measured_at/source, immutable history | P2 concurrency/rollback, P5 heat carry/Area/Spot topology; P8 false→false→true + old revision equality | verified |
| R19 | 1 งาน/แถวหลัก, job vs revision KPI, history pagination | P2 dashboard/query; P7 actual 104 jobs/13 revisions counted once | verified |
| R20 | satisfaction name/group required, health type/program/year/context, independent group entry | P6 all fields/UI, P8 missing leaves & 2 grouped records roundtrip | verified |
| R21 | Word 32 latest questions/4 dimensions, source snapshots/version/history | 6 Word unit + 5 actual satisfaction browser tests; P6/P7 current/old version export | verified |
| R22 | 8 manual time inputs, seconds/difference/sign/source preserved, separate from ratings | P6 UI/API negative delta + P8 U05 93784/1/mean5; P7/8 XLSX snapshot | verified |
| R23 | ทุก field ใหม่ไม่หยุดที่ frontend; API storage/result/review/metadata/full XLSX/print | P4–P7 submit/DB/result/print; P8 8 fresh browser XLSX complete snapshot equals actual API and no localStorage; no private disease detail on Dashboard | verified |
| R24 | 8 original tables/field types retained, no fabricated unknown data or before/after, frozen wording | P8 D1 28 jobs/7 rehearsal checks and fresh legacy-null API/UI/history/XLSX regression; P2/P5 legacy adopt/layout, P6 unknown satisfaction | verified |
| R25 | Phase checklist/progress/reports and executable repeatable checks | P8 report/UAT/coverage/artifacts/command logs; P9 remains not-started | verified |

คำว่า verified หมายถึงหลักฐานทางเทคนิคตามขอบเขตนี้ ไม่ใช่ลงนาม UAT/production readiness หรือรับรองกฎหมายล่าสุด

## หลักฐานที่ใช้

- [Core regression commands/log paths](./baseline/p8-regression-core.json): domain 17 + SQLite 6, P3 unit 11, P4 unit 8, Word 6, P5 unit 11, P6 unit 7, P7 unit 10, P2 API 23
- [Browser regression commands/log paths](./baseline/p8-regression-browser.json): P4 9 + Word satisfaction 5 + P3 11, P5 16, P6 11, P7 14
- [P8 matrix/fresh browser/expected-actual](./baseline/p8-browser.json): 9 scenarios, 455 required rejects, 64 optional accepts, 8 Chromium reports/exports; Firefox/WebKit explicitly not-run
- [Real local D1 migration/recovery](./baseline/p8-migration.json): 7 checks, 8 original-table counts/types, 4 legacy revisions/6 points, ledger 4, FK/duplicate mapping zero
- [Build/typecheck/lint logs](./baseline/p8-regression-checks.json)

ไม่มี field ที่นับ verified เพียงเพราะมีหน้าจอ แต่ไม่ได้บันทึก/อ่านกลับ/ส่งออก หน่วยและ field ที่ไม่เกี่ยวข้องใช้การไม่ส่งตาม contracts; ช่องระบบและ computed metadata มาจาก server ไม่เพิ่มช่องให้ผู้ใช้กรอกเอง

## งานปรับต่อจาก UAT

คำสั่ง D17/D18 เปลี่ยนแผนผังเป็น optional/deferred upload และรวม UI ปัจจุบัน ดู [รายงานและหลักฐานชุดล่าสุด](./POST_UAT_UI_REPORT.md) ซึ่งตรวจ R05/R14–R18/R23–R24 เพิ่มตามขอบเขตที่เปลี่ยน ไม่ตีความคำยืนยัน P8 เดิมเป็นการรับรองงานหลังจากนั้น
