# SKILL.md
# Project Skill & Coding Standard สำหรับ AI Coding Agent

## 1. Role

คุณคือ Senior Full-stack Web Developer ที่ทำงานกับระบบแบบประเมินออนไลน์สำหรับงานวิจัย โดยต้องพัฒนาโปรเจกต์ให้เรียบร้อย อ่านง่าย แก้ไขง่าย และพร้อมใช้งานจริงในระดับ MVP/Production-lite

ต้องยึดตามหลัก:

```text
Simple
Clean
Maintainable
Mobile-first
Static-first
No over-engineering
```

---

## 2. Project Context

โปรเจกต์นี้คือ Static Web App สำหรับทำแบบประเมินออนไลน์

Core Architecture:

```text
Next.js Static Export
Tailwind CSS
Cloudflare Pages
Cloudflare Workers
Cloudflare D1
```

Important Product Rules:

1. ไม่มี Login
2. ไม่มี Register
3. ไม่มี Admin Role ใน MVP
4. หน้าแรกต้องเลือกแบบประเมินได้ 3 ส่วน
5. ข้อมูลผู้ประเมินต้องอยู่ใน flow ของการประเมินแต่ละครั้ง
6. ข้อมูลถูกบันทึกเป็น Submission
7. ใช้ Static Route + Query String เท่านั้น
8. ห้ามใช้ Dynamic Route
9. ต้องออกแบบ mobile-first
10. ต้องเขียนโค้ดให้ AI หรือ Dev คนอื่นแก้ง่าย

---

## 3. Hard Rules

### 3.1 Routing Rules

ห้ามใช้ dynamic route เช่น:

```text
/result/[submissionId]
/assessment/environment/[category]
/assessment/health-risk/[category]
```

ให้ใช้ query string แทน:

```text
/result?submissionId=SUB-0001
/assessment/environment-form?category=light
/assessment/health-risk-form?category=noise
```

### 3.2 Authentication Rules

ห้ามเพิ่มระบบต่อไปนี้ใน MVP:

```text
Login
Register
JWT Login Flow
User Role
Admin Permission
Password Reset
OTP
```

ถ้าต้องป้องกัน dashboard ให้ทำเป็น phase อนาคต ไม่ทำใน MVP เว้นแต่ถูกสั่งชัดเจน

### 3.3 Static Export Rules

ต้องเขียนโค้ดให้รองรับ Next.js Static Export

ห้ามพึ่งพา server-side feature ที่ Static Export ไม่รองรับ เช่น:

```text
Dynamic server route rendering
Server Actions สำหรับ core flow
SSR ที่ต้องรันบน server ทุก request
```

ควรใช้ client-side fetch ไปยัง Cloudflare Workers API

---

## 4. Tech Stack

### Frontend

```text
Next.js
TypeScript
Tailwind CSS
React Hook Form
Zod
Lucide React
Recharts หรือ Chart.js
```

### Backend

```text
Cloudflare Workers
TypeScript
Hono.js recommended
Cloudflare D1
```

### Deployment

```text
Cloudflare Pages
Cloudflare Workers
Cloudflare D1
```

---

## 5. Code Style

### 5.1 TypeScript

ต้องใช้ TypeScript ทุกไฟล์ที่เกี่ยวกับ logic

Rules:

- หลีกเลี่ยง `any`
- ใช้ type/interface สำหรับ data model
- แยก type กลางไว้ใน `src/types`
- function ต้องมีชื่อชัดเจน
- logic ที่ซับซ้อนให้แยกออกจาก component

Example:

```ts
export type AssessmentType = "environment" | "health_risk" | "satisfaction";
export type AssessmentCategory = "light" | "noise" | "heat" | "general";
export type RiskLevel = "pass" | "medium" | "high_risk";
```

---

### 5.2 Naming Convention

Files:

```text
kebab-case.ts
kebab-case.tsx
```

Components:

```text
PascalCase
```

Functions:

```text
camelCase
```

Constants:

```text
UPPER_SNAKE_CASE
```

Example:

```text
home-assessment-card.tsx
category-card.tsx
step-progress.tsx
```

---

### 5.3 Component Rules

Component ต้อง:

- ทำหน้าที่ชัดเจน
- ไม่ยาวเกินไป
- ไม่รวม business logic เยอะเกินไป
- รับ props ที่ typed ชัดเจน
- reusable ได้
- ไม่ผูกกับ API โดยตรงถ้าไม่จำเป็น

แยก component เป็นกลุ่ม:

```text
components/ui
components/layout
components/forms
components/assessment
components/dashboard
```

---

### 5.4 Business Logic Rules

Business logic ต้องอยู่ใน:

```text
src/lib
src/features
```

ไม่ควรอยู่ใน JSX ยาว ๆ

ตัวอย่าง:

```text
src/lib/scoring.ts
src/lib/api.ts
src/lib/constants.ts
src/features/health-risk/health-risk.config.ts
```

---

## 6. Folder Structure Standard

```text
src/
├── app/
├── components/
│   ├── ui/
│   ├── layout/
│   ├── forms/
│   ├── assessment/
│   └── dashboard/
├── features/
│   ├── home/
│   ├── environment-assessment/
│   ├── health-risk/
│   ├── satisfaction/
│   └── dashboard/
├── lib/
│   ├── api.ts
│   ├── constants.ts
│   ├── scoring.ts
│   └── utils.ts
├── hooks/
├── types/
└── styles/
```

Backend:

```text
worker/
├── src/
│   ├── index.ts
│   ├── routes/
│   ├── services/
│   ├── db/
│   ├── validators/
│   └── utils/
├── migrations/
├── wrangler.toml
└── package.json
```

---

## 7. UI/UX Rules

### 7.1 Mobile-first

ออกแบบมือถือก่อนเสมอ

- Container กว้างเต็มบนมือถือ
- Desktop ให้ center ด้วย max-width 430-480px
- Button สูงอย่างน้อย 44px
- Form input สูงประมาณ 48px
- Text อ่านง่าย
- เว้นระยะไม่แน่นเกินไป

### 7.2 Visual Style

Mood:

```text
Clean
Calm
Health & Safety
Research-ready
Mobile App-like
```

Colors:

```text
Primary Blue: #0F63C7
Deep Blue: #0B4FAE
Soft Blue: #E0F2FE
Sky Tint: #F0F9FF
Green: #16A34A
Amber: #F59E0B
Red: #EF4444
Background: #F8FAFC
Surface: #FFFFFF
Text Primary: #0F172A
Text Secondary: #64748B
Border: #E2E8F0
```

### 7.3 Forms

Form ต้อง:

- มี label
- มี error message
- มี required validation
- มี loading state ตอน submit
- ป้องกัน double submit
- แสดง progress เมื่อเป็น multi-step
- ใช้ปุ่มใหญ่แทน radio เล็ก ๆ ในคำถาม

### 7.4 Accessibility

ต้องทำอย่างน้อย:

- label ผูกกับ input
- ปุ่มมีข้อความชัดเจน
- contrast อ่านได้
- ไม่ใช้สีอย่างเดียวในการสื่อ status
- รองรับ keyboard เบื้องต้น
- error message อ่านเข้าใจ

---

## 8. State Management

MVP ไม่จำเป็นต้องใช้ state management ใหญ่ เช่น Redux

ใช้:

```text
React state
React Hook Form
localStorage สำหรับ draft ชั่วคราว
```

Rules:

- เก็บ draft form ใน localStorage ระหว่างทำแบบประเมิน
- clear draft หลัง submit สำเร็จ
- อย่าเก็บข้อมูลละเอียดเกินจำเป็นใน localStorage นาน ๆ
- ใช้ key ที่ชัดเจน เช่น `assessment_draft_environment_light`

---

## 9. API Client Standard

สร้าง API client กลางที่ `src/lib/api.ts`

Response format ที่คาดหวัง:

```ts
type ApiSuccess<T> = {
  success: true;
  data: T;
};

type ApiError = {
  success: false;
  error: {
    code: string;
    message: string;
  };
};
```

Rules:

- ทุก API call ต้อง handle loading/error
- ห้ามเรียก fetch กระจัดกระจายโดยไม่มี wrapper
- error message ต้องแสดงแบบ user-friendly
- API base URL ต้องอ่านจาก environment variable

---

## 10. Backend API Standard

### 10.1 Response Format

ทุก API ต้องตอบรูปแบบเดียวกัน

Success:

```json
{
  "success": true,
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "ข้อมูลไม่ครบถ้วน"
  }
}
```

### 10.2 Validation

ใช้ validation ฝั่ง backend เสมอ

Validate:

- required fields
- assessment_type
- assessment_category
- rating range
- score range
- age/number fields
- submission id exists

### 10.3 Error Handling

ห้าม throw error ออกไป raw ๆ

ต้อง map เป็น error response ที่อ่านได้ เช่น:

```text
VALIDATION_ERROR
NOT_FOUND
DATABASE_ERROR
INTERNAL_ERROR
```

---

## 11. Database Standard

### 11.1 Table Naming

ใช้ snake_case

Examples:

```text
submissions
respondent_profiles
respondent_work_infos
health_risk_answers
assessment_results
```

### 11.2 Column Naming

ใช้ snake_case

Examples:

```text
submission_id
assessment_type
assessment_category
created_at
updated_at
```

### 11.3 Timestamp

ทุก table หลักควรมี `created_at`

Table ที่ update ได้ควรมี `updated_at`

### 11.4 Index

ควรมี index อย่างน้อย:

```sql
CREATE INDEX idx_submissions_type ON submissions(assessment_type);
CREATE INDEX idx_submissions_category ON submissions(assessment_category);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_results_submission_id ON assessment_results(submission_id);
```

---

## 12. Security & Privacy Rules

แม้ไม่มี Login แต่ข้อมูลอาจมีข้อมูลส่วนตัวและสุขภาพ ต้องระวัง

Rules:

- ใช้ HTTPS
- ไม่แสดงโรคประจำตัวหรือรายละเอียดสุขภาพใน Dashboard สาธารณะ
- Dashboard แสดงเฉพาะ summary และข้อมูลที่จำเป็น
- API ต้อง validate input
- ป้องกัน double submit
- ใช้ CORS เฉพาะ domain ที่กำหนด
- ไม่เก็บ secret ใน frontend
- ไม่ hardcode API key
- ไม่ log ข้อมูลส่วนตัวแบบละเอียด

---

## 13. Anti-spam / Abuse Prevention

MVP ควรมีอย่างน้อย:

- honeypot field
- loading state กันกดซ้ำ
- timestamp check
- required validation
- optional: rate limit ใน Worker หากจำเป็น

ยังไม่ต้องใช้ CAPTCHA เว้นแต่เจอ spam จริง

---

## 14. Testing Standard

### Frontend

ต้องทดสอบ manual อย่างน้อย:

- Home page
- Category pages
- Query string valid/invalid
- Form validation
- Submit flow
- Result page
- Dashboard
- Mobile viewport

### Backend

ต้องทดสอบ:

- create submission
- save profile
- save work info
- save answers
- complete submission
- get result
- dashboard summary
- invalid input
- not found

### Build

ก่อนส่งมอบต้องผ่าน:

```bash
npm run lint
npm run build
```

---

## 15. Development Workflow

ให้ทำงานแบบ incremental

ห้ามทำทุกอย่างในไฟล์เดียวขนาดใหญ่

ลำดับที่ควรทำ:

1. Setup project
2. Static routes
3. UI components
4. Home/category pages
5. Form flow
6. Mock data scoring
7. API
8. D1
9. Result page
10. Dashboard
11. QA
12. Deploy

ทุก phase ต้อง commit ได้และทดสอบได้

---

## 16. AI Coding Agent Instructions

เมื่อ AI Coding Agent ทำงานในโปรเจกต์นี้ ให้ทำตามนี้:

1. อ่าน `PROJECT_OVERVIEW.md` ก่อน
2. อ่าน `DEVELOPMENT_PLAN.md`
3. อ่าน `SKILL.md`
4. ห้ามเพิ่ม feature นอก scope โดยไม่ถาม
5. ห้ามใช้ dynamic route
6. ห้ามเพิ่ม login
7. ห้ามใช้ database โดยตรงจาก frontend
8. ห้ามทำ UI แบบ desktop-first
9. ห้ามเขียน logic ทั้งหมดไว้ใน component เดียว
10. ห้ามใช้ `any` โดยไม่จำเป็น
11. ต้องแยก config คำถามออกจาก UI
12. ต้องทำ form validation
13. ต้อง handle loading/error ทุก API call
14. ต้องรักษาความอ่านง่ายของ code เป็นหลัก

---

## 17. Definition of Production-ready for This MVP

ระบบจะถือว่า production-ready สำหรับ MVP เมื่อ:

- Code อ่านง่าย
- TypeScript ผ่าน
- Build ผ่าน
- Mobile UX ดี
- Submission flow ใช้งานจริงได้
- Data บันทึกลง D1 ได้
- Dashboard ใช้งานได้
- ไม่มี dynamic route
- ไม่มี login
- API response เป็นมาตรฐาน
- error state มีครบ
- ไม่มี hardcoded secret
- Deploy ใช้งานจริงได้
