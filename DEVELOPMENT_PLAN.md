# DEVELOPMENT_PLAN.md
# แผนการพัฒนา Web App ระบบแบบประเมิน

## 1. Development Overview

โปรเจกต์นี้จะพัฒนาแบบเป็น Phase เพื่อให้ AI Coding Agent หรือทีม Dev สามารถทำงานเป็นลำดับ ไม่หลุด Scope และตรวจสอบผลลัพธ์ได้ง่าย

แนวทางหลัก:

```text
Static Web App
No Login
Assessment-first Flow
Next.js Static Export
Tailwind CSS
Cloudflare Workers
Cloudflare D1
```

---

## 2. Phase 0: Project Initialization

### Goal

เตรียมโครงสร้างโปรเจกต์ให้พร้อมสำหรับการพัฒนา

### Tasks

- สร้าง Next.js Project ด้วย TypeScript
- ตั้งค่า Tailwind CSS
- ตั้งค่า ESLint / Prettier
- ตั้งค่า path alias เช่น `@/components`, `@/lib`
- สร้างโครงสร้าง folder ตามมาตรฐาน
- สร้างไฟล์ constants, types, utils เบื้องต้น
- ตั้งค่า Next.js ให้รองรับ Static Export
- เตรียม README และ env example

### Deliverables

- โครงสร้างโปรเจกต์พร้อมเริ่มพัฒนา
- หน้า Home เปล่า หรือ placeholder
- Tailwind ใช้งานได้
- Build ผ่าน

### Acceptance Criteria

- `npm run dev` ใช้งานได้
- `npm run build` ผ่าน
- ไม่มี TypeScript error
- ไม่มี ESLint error สำคัญ
- โครงสร้าง folder ตรงตามเอกสาร

---

## 3. Phase 1: Static Routing & Layout

### Goal

ทำโครงหน้าและ Route หลักทั้งหมดแบบ Static Route ไม่ใช้ Dynamic Route

### Routes

```text
/
/assessment/environment
/assessment/environment-form
/assessment/health-risk
/assessment/health-risk-form
/assessment/satisfaction
/result
/dashboard
/complete
```

### Tasks

- สร้าง Page หลักทั้งหมด
- สร้าง App Layout
- สร้าง Mobile Container
- สร้าง PageHeader
- สร้าง BottomNav หรือ Navigation พื้นฐาน
- สร้าง Back Button
- อ่าน query string ด้วย client-side hook เช่น `useSearchParams`
- ตรวจสอบกรณี query string ไม่ถูกต้อง เช่น ไม่มี category

### Deliverables

- ทุกหน้าสามารถเปิดได้
- Navigation ไปมาระหว่างหน้าหลักได้
- Query string ใช้งานได้

### Acceptance Criteria

- ไม่มี route แบบ `[id]`, `[category]`, `[submissionId]`
- `/result?submissionId=xxx` ใช้งานได้
- `/assessment/environment-form?category=light` ใช้งานได้
- `/assessment/health-risk-form?category=noise` ใช้งานได้

---

## 4. Phase 2: Design System & UI Components

### Goal

สร้าง UI Component กลางให้ใช้งานซ้ำได้และควบคุมหน้าตาระบบให้สม่ำเสมอ

### Components

```text
PrimaryButton
SecondaryButton
FormInput
FormSelect
FormTextarea
RadioCard
ChoiceButton
StatusBadge
PageHeader
StepProgress
HomeAssessmentCard
CategoryCard
QuestionCard
ResultSummaryCard
DashboardSummaryCard
SubmissionListItem
EmptyState
LoadingState
ErrorMessage
```

### Tasks

- สร้าง component ใน `src/components`
- ใช้ Tailwind CSS
- รองรับ mobile-first
- ปุ่มต้องสูงอย่างน้อย 44-48px
- รองรับ loading / disabled state
- รองรับ error state ใน form
- รองรับ accessibility เบื้องต้น เช่น label, aria

### Deliverables

- UI component พร้อมใช้
- Example usage ในหน้า Home / Category / Form

### Acceptance Criteria

- UI ดูเหมือน mobile app
- ใช้งานบนมือถือได้ง่าย
- Component อ่านง่าย แก้ง่าย
- ไม่มีการ copy class ซ้ำเยอะเกินจำเป็น

---

## 5. Phase 3: Home & Category Pages

### Goal

ทำหน้าแรกและหน้าเลือกหัวข้อย่อย

### Pages

```text
/
/assessment/environment
/assessment/health-risk
```

### Tasks

- สร้างหน้า Home มี Card 3 ใบ
- Card 1 ไป Environment
- Card 2 ไป Health Risk
- Card 3 ไป Satisfaction
- สร้างหน้า Environment Category มี 3 Card: light, noise, heat
- สร้างหน้า Health Risk Category มี 3 Card: light, noise, heat
- เพิ่มปุ่ม Dashboard
- เพิ่มคำอธิบายสั้น ๆ ของแต่ละแบบประเมิน

### Deliverables

- หน้า Home พร้อมใช้งาน
- หน้าเลือกหมวดพร้อมใช้งาน

### Acceptance Criteria

- ผู้ใช้เข้าใจได้ทันทีว่าต้องกดอะไร
- Link ไปหน้าถูกต้อง
- ใช้ query string ถูกต้อง
- UI mobile-friendly

---

## 6. Phase 4: Form State & Assessment Flow

### Goal

สร้างระบบ Form Flow แบบ Step-by-step สำหรับแบบประเมิน

### Form Flow Standard

ทุกแบบประเมินควรมี flow ประมาณนี้

```text
Step 1: ข้อมูลผู้ประเมิน
Step 2: ข้อมูลการทำงาน / พื้นที่
Step 3: คำถามแบบประเมิน
Step 4: ตรวจสอบคำตอบ
Step 5: ส่งและแสดงผล
```

### Tasks

- ตั้งค่า React Hook Form
- ตั้งค่า Zod Validation
- สร้าง schema สำหรับ respondent profile
- สร้าง schema สำหรับ work info
- สร้าง step controller
- ป้องกันการ next ถ้าข้อมูลไม่ครบ
- เก็บ draft ใน localStorage ระหว่างทำ
- ป้องกัน submit ซ้ำ

### Deliverables

- Step form ใช้งานได้
- Validation ทำงาน
- Draft localStorage ทำงานระดับพื้นฐาน

### Acceptance Criteria

- กด Next ไม่ได้ถ้าข้อมูล required ไม่ครบ
- Refresh แล้ว draft ไม่หายทั้งหมดในระหว่าง session
- Submit แล้ว clear draft
- Form ใช้งานง่ายบนมือถือ

---

## 7. Phase 5: Environment Assessment

### Goal

ทำแบบประเมินสภาพแวดล้อมในการทำงาน

### Pages

```text
/assessment/environment-form?category=light
/assessment/environment-form?category=noise
/assessment/environment-form?category=heat
```

### Tasks

- อ่าน category จาก query string
- แสดง title ตาม category
- สร้าง question config แยกตาม category
- รองรับ input type หลายแบบ เช่น text, number, choice, textarea
- รองรับค่าตัวเลข เช่น Lux, dBA, WBGT ในอนาคต
- ส่งข้อมูลไป API
- แสดง result page

### Deliverables

- Form Environment ใช้งานได้ครบ 3 category

### Acceptance Criteria

- light/noise/heat ใช้หน้าเดียวกันแต่ config ต่างกันได้
- ข้อมูลถูกส่งพร้อม assessment_type = environment
- category ถูกต้อง
- บันทึกเป็น submission ได้

---

## 8. Phase 6: Health Risk Assessment

### Goal

ทำแบบประเมินความเสี่ยงต่อสุขภาพ

### Pages

```text
/assessment/health-risk-form?category=light
/assessment/health-risk-form?category=noise
/assessment/health-risk-form?category=heat
```

### Tasks

- อ่าน category จาก query string
- แสดงคำถามตาม category
- ใช้ choice 3 ระดับ: ไม่เคย / บางครั้ง / เป็นประจำ
- คำนวณคะแนน
- แปลงคะแนนเป็น risk level
- ส่งคำตอบและผลลัพธ์ไป API

### Scoring

```text
ไม่เคย = 0
บางครั้ง = 1
เป็นประจำ = 2
```

Risk Level:

```text
0 - 6 = pass
7 - 13 = medium
14 - 20 = high_risk
```

### Deliverables

- Health Risk Flow ใช้งานได้ครบ 3 category

### Acceptance Criteria

- ทุกคำถามต้องตอบก่อน submit
- คะแนนรวมถูกต้อง
- risk level ถูกต้อง
- Result Page แสดงผลถูกต้อง

---

## 9. Phase 7: Satisfaction Assessment

### Goal

ทำแบบประเมินความพึงพอใจในการใช้แอป

### Page

```text
/assessment/satisfaction
```

### Tasks

- สร้าง Step ข้อมูลผู้ประเมิน
- สร้างคำถาม 4 ด้าน: Accuracy, Design, Usability, Usefulness
- ใช้ rating 1-5
- คำนวณค่าเฉลี่ยรายด้าน
- คำนวณค่าเฉลี่ยรวม
- มีช่องข้อเสนอแนะเพิ่มเติม
- ส่งข้อมูลไป API

### Deliverables

- Satisfaction form ใช้งานได้

### Acceptance Criteria

- Rating ทุกข้อใช้งานได้
- ค่าเฉลี่ยถูกต้อง
- ส่งข้อเสนอแนะได้
- Result Page แสดงค่าเฉลี่ยรวม

---

## 10. Phase 8: Cloudflare Workers API

### Goal

สร้าง API สำหรับรับและส่งข้อมูล

### APIs

```text
POST /api/submissions/start
POST /api/submissions/:id/profile
POST /api/submissions/:id/work-info
POST /api/submissions/:id/answers
POST /api/submissions/:id/complete
GET /api/results/:submissionId
GET /api/dashboard/summary
GET /api/dashboard/submissions
GET /api/dashboard/by-category
```

### Tasks

- สร้าง Worker project
- ตั้งค่า Hono.js หรือ Router ที่เหมาะกับ Workers
- ตั้งค่า CORS เฉพาะ domain ที่ใช้งาน
- สร้าง validation ฝั่ง API
- สร้าง service สำหรับ submission
- สร้าง service สำหรับ result
- สร้าง service สำหรับ dashboard
- จัดการ error response เป็นมาตรฐานเดียวกัน

### Deliverables

- API ใช้งานได้
- เชื่อม D1 ได้
- Error response เป็นรูปแบบเดียวกัน

### Acceptance Criteria

- API รับข้อมูลจริงจาก frontend ได้
- API validate required field ได้
- API ไม่ crash เมื่อข้อมูลไม่ถูกต้อง
- Response มี success/error ชัดเจน

---

## 11. Phase 9: Cloudflare D1 Database

### Goal

สร้างฐานข้อมูลและ migration

### Tables

```text
submissions
respondent_profiles
respondent_work_infos
environment_answers
health_risk_answers
satisfaction_answers
assessment_results
```

### Tasks

- สร้าง schema.sql
- สร้าง migration
- เพิ่ม index ที่จำเป็น
- เพิ่ม foreign key logical relation
- เตรียม seed sample data สำหรับ dashboard
- ทดสอบ query หลัก

### Deliverables

- D1 schema
- migration
- sample data

### Acceptance Criteria

- สร้าง database สำเร็จ
- Insert submission ได้
- Query dashboard ได้
- Result query ได้
- ไม่มีข้อมูล orphan สำคัญ

---

## 12. Phase 10: Result Page

### Goal

แสดงผลลัพธ์หลังทำแบบประเมิน

### Page

```text
/result?submissionId=SUB-0001
```

### Tasks

- อ่าน submissionId จาก query string
- เรียก API result
- แสดง loading
- แสดง error ถ้าไม่พบข้อมูล
- แสดง summary card
- แสดงคะแนน
- แสดง risk level
- แสดง recommendation
- มีปุ่มกลับหน้าแรก
- มีปุ่มไป Dashboard

### Acceptance Criteria

- แสดงผลถูกต้องตาม submissionId
- ไม่มี dynamic route
- จัดการ error ได้
- UI อ่านง่าย

---

## 13. Phase 11: Dashboard

### Goal

ทำหน้ารายงานสรุปผลเบื้องต้น

### Page

```text
/dashboard
```

### Tasks

- ดึง summary
- ดึง list submissions
- แสดง summary cards
- แสดง chart เบื้องต้น
- แสดง list รายการล่าสุด
- แสดง filter เบื้องต้น ถ้าทำทัน เช่น type/category
- ซ่อนข้อมูลสุขภาพละเอียด
- เตรียม empty state

### Dashboard Data

- จำนวนรายการประเมินทั้งหมด
- จำนวนแยกตามประเภท
- จำนวนแยกตามหัวข้อ
- จำนวน pass / medium / high_risk
- รายการประเมินล่าสุด
- คะแนนเฉลี่ย satisfaction

### Acceptance Criteria

- Dashboard โหลดข้อมูลจาก API ได้
- รายการผู้ประเมินแสดงได้
- Summary ถูกต้อง
- ไม่แสดงข้อมูลสุขภาพละเอียดเกินจำเป็น

---

## 14. Phase 12: Testing & QA

### Goal

ทดสอบระบบก่อนส่งมอบ

### Test Checklist

- เปิดหน้าแรกบนมือถือ
- เลือกแบบประเมิน 3 ส่วน
- เลือกหัวข้อ light/noise/heat
- กรอกข้อมูลผู้ประเมิน
- กรอกข้อมูลการทำงาน
- ตอบคำถามครบ
- Submit ได้
- ป้องกัน double submit
- Result Page แสดงถูกต้อง
- Dashboard แสดงข้อมูลใหม่
- Refresh หน้าไม่พัง
- Query string ผิดต้องมี error state
- Build static export ผ่าน
- Deploy Cloudflare Pages ได้
- API Workers ใช้งานได้
- D1 บันทึกได้

### Deliverables

- QA checklist completed
- Bug fixes
- Ready to deploy

---

## 15. Phase 13: Deployment & Handover

### Goal

Deploy และส่งมอบระบบ

### Tasks

- สร้าง Cloudflare account ของลูกค้า หรือให้ลูกค้าเชิญเข้าระบบ
- Deploy Cloudflare Pages
- Deploy Cloudflare Workers
- Bind D1 Database
- ตั้งค่า Environment Variables
- ทดสอบ URL จริง
- สร้าง QR Code
- ส่งมอบ source code
- ส่งมอบลิงก์ใช้งาน
- ส่งมอบคู่มือสั้น ๆ

### Deliverables

- Production URL
- QR Code
- Source Code
- D1 schema
- คู่มือใช้งานเบื้องต้น

### Acceptance Criteria

- URL เปิดได้จริง
- QR Code สแกนแล้วเข้าเว็บได้
- ส่งแบบประเมินได้จริง
- Dashboard แสดงข้อมูลจริง
- ลูกค้าเข้าใช้งานได้

---

## 16. Definition of Done

งานจะถือว่าเสร็จเมื่อ:

1. Build ผ่าน
2. Deploy สำเร็จ
3. Mobile UI ใช้งานได้
4. Flow ทั้งหมดครบ
5. ข้อมูลบันทึกลง D1 ได้
6. Result Page ใช้งานได้
7. Dashboard ใช้งานได้
8. ไม่มี Dynamic Route
9. ไม่มี Login
10. ไม่มี Scope เกินจาก MVP
11. Source code อ่านง่าย
12. มี README และคู่มือสั้น ๆ
