# README.md
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
- Full Export PDF/Excel
- Advanced Dashboard
