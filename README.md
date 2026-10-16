# README.md

Production อัปเดต P9 แล้วเมื่อ 16 ตุลาคม 2026: https://save-check.pages.dev — ใช้ D1 อย่างเดียวสำหรับข้อมูลและไฟล์แนบ ไม่มี R2 subscription ดู [ผลตรวจข้อมูล/ไฟล์และวิธีย้อนกลับ](docs/v3/P9_RELEASE_2026-10-16.md) บันทึก phase ด้านล่างเป็นประวัติของเวลานั้น

# Assessment Web App

Static Web App สำหรับระบบแบบประเมินสภาพแวดล้อมในการทำงาน ความเสี่ยงสุขภาพ และความพึงพอใจในการใช้แอป

## Project Direction

ระบบนี้เป็น Web App แบบไม่มี Login ใช้งานผ่านลิงก์หรือ QR Code โดยผู้ใช้เปิดหน้าแรก เลือกแบบประเมินที่ต้องการ กรอกข้อมูลผู้ประเมิน ตอบคำถาม และส่งข้อมูลเข้าสู่ระบบ

## Core Stack

```text
Frontend: Next.js Static Export + TypeScript
Styling: Tailwind CSS
API: Cloudflare Workers
Database: Cloudflare D1
Hosting: Cloudflare Pages
```

## Important Rules

- No Login
- No Register
- No Dynamic Route
- Use Query String
- Mobile-first
- Static Export
- Store each assessment as Submission

## Main Documents

- `PROJECT_OVERVIEW.md` — รายละเอียดโปรเจกต์ทั้งหมด
- `DEVELOPMENT_PLAN.md` — แผนการทำงานตาม Phase
- `SKILL.md` — มาตรฐานและกฎสำหรับ AI Coding Agent / Developer

## Static Routes

```text
/
/assessment/environment
/assessment/environment-form?category=light
/assessment/environment-form?category=noise
/assessment/environment-form?category=heat
/assessment/health-risk
/assessment/health-risk-form?category=light
/assessment/health-risk-form?category=noise
/assessment/health-risk-form?category=heat
/assessment/satisfaction
/result?submissionId=SUB-0001
/dashboard
/complete
```

## MVP Scope

Included:

- Static Web App
- 3 Assessment Modules
- Respondent Profile per Submission
- D1 Database
- Basic Dashboard
- Result Page
- Deploy via Cloudflare

Not included:

- Login
- Admin Role
- User Management
- Dynamic Route
- Advanced Dashboard


## v3 Development

P0–P8 specifications and verification are tracked in [docs/v3/PROGRESS_V3.md](docs/v3/PROGRESS_V3.md). See [P2 API, migration and test guide](docs/v3/P2_REPORT_V3.md) and [P1 domain guide](docs/v3/P1_REPORT_V3.md) before using database commands. `db:migrate` now applies numbered migrations with schema preflight; `schema.sql`/`seed.sql` are legacy fixtures, not the v3 install path. Keep legacy seed/truncate commands away from databases that contain revision history.

Frontend menu/draft/submit groundwork and local browser verification: [P3 report](docs/v3/P3_REPORT_V3.md). Forms and versioned reporting are complete through P7; validation/rehearsal/UAT in P8 still precede release.

Health v3 forms and actual local browser-to-Worker verification: [P4 report](docs/v3/P4_REPORT_V3.md). Full reporting is complete in P7; no deployment yet.

Environment v3 forms, standards, failed-only retests and audited corrections: [P5 report](docs/v3/P5_REPORT_V3.md). Run `npm run test:p5` and `npm run test:p5:browser` locally. P6/P7 are complete. No deployment yet.

Satisfaction v3 complete flows, manual durations and versioned result/Excel: [P6 report](docs/v3/P6_REPORT_V3.md). Run `npm run test:p6` and `npm run test:p6:browser`. Dashboard/bulk export/print is complete in P7; no deployment yet.

Versioned reports/history, filtered Dashboard, complete bulk Excel and A4 browser print/PDF: [P7 report](docs/v3/P7_REPORT_V3.md). Run `npm run test:p7` and `npm run test:p7:browser` locally. Dashboard exports latest by default; history includes all environment revisions and latest questionnaires. Browser tests use isolated `.next-test-*` caches; P8/UAT and release remain, with no deployment performed.

P8 technical acceptance and isolated D1 export/restore/migration rehearsal: [P8 report](docs/v3/P8_REPORT_V3.md), [requirement coverage](docs/v3/P8_COVERAGE_V3.md), [owner UAT expected/actual](docs/v3/P8_UAT_V3.md). Run `npm run test:p8` for the complete sequential suite, or use `test:p8:core`, `test:p8:migration`, `test:p8:browser`, `test:p8:regression`, `test:p8:checks`. Technical checks pass; the owner approved UAT P8.6 and acknowledged the test scope on 14 October 2026 ([approval record](docs/v3/baseline/p8-owner-uat.json)). Chromium was tested; Firefox/WebKit runtimes were not installed after permission was declined. P8 is complete; no P9 or deployment has started.

After owner UAT, the floor plan became optional and uploads now start only after final review confirmation; a plan can be added from the latest result later. User-facing schema/version filters and labels were removed. See [post-UAT correction report](docs/v3/POST_UAT_UI_REPORT.md). The one-off post-UAT runner was retired after P9; use `npm run test:p8` for the shared regression suite and `npm run test:current-ui` for these UI checks. Migration `0005_optional_layout.sql` is required; the development database was backed up and migrated locally, with original rows preserved. No deployment or remote migration has occurred.

Current UI restoration and current-only operational data follow D19/D20: [UI restoration report](docs/v3/UI_RESTORE_REPORT.md). Dashboard and measurement results use the original table style, result headers are unified, and mobile navigation is pinned to the viewport bottom. Use `npm run test:ui-restore` for the restoration checks and `npm run test:p8` for the shared regression suite; earlier phase artifacts remain historical. Legacy records are excluded from current application lists/statistics/exports. No deployment has occurred.

For the subsequent audit of every page against the original UI, see [all-page UI audit](docs/v3/UI_ALL_PAGES_AUDIT.md). The one-off audit runner was retired after P9. Its individual checks remain available through `test:ui-restore`, `test:p5:browser`, and the shared `test:p8` suite.

Before/after light health assessments must now be completed together before the final summary and save. The skip/save-later button and Dashboard resume list have been removed; previous pending API endpoints return HTTP 410 without changing stored drafts. See [current requirement](docs/v3/HEALTH_COMPLETE_BEFORE_AFTER_REPORT.md). Run `npm run test:p4:browser` to verify the required flow. No deployment has occurred.

Archiving has been retired. Saved assessments stay visible and keep immutable retest/correction history with dates and selectable past results. Apply local migration `0007_retire_archive.sql` through the normal migration runner; see [verification and local backup](docs/v3/ARCHIVE_REMOVAL_RETEST_REPORT.md). No remote migration or deployment has occurred.
