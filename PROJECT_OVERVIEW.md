# PROJECT_OVERVIEW.md
# Web App ระบบแบบประเมินสภาพแวดล้อมในการทำงาน ความเสี่ยงสุขภาพ และความพึงพอใจ

## 1. Project Summary

โปรเจกต์นี้คือ Web App สำหรับทำแบบประเมินออนไลน์ผ่านมือถือหรือคอมพิวเตอร์ โดยผู้ใช้งานสามารถเปิดลิงก์หรือสแกน QR Code เพื่อเข้าใช้งานได้ทันที

ระบบนี้ออกแบบเป็น **Static Web App แบบไม่มี Login** เพื่อให้เหมาะกับงานวิจัย งานประเมิน และการเก็บข้อมูลภายในหน่วยงาน

แนวคิดหลักของระบบคือ:

```text
Assessment-first Flow
```

หมายความว่า ผู้ใช้เปิดเว็บมาแล้วเลือกแบบประเมินที่ต้องการทำก่อน จากนั้นระบบจึงให้กรอกข้อมูลผู้ประเมินภายในแบบประเมินครั้งนั้น ๆ

---

## 2. Core Requirement

ระบบต้องมีคุณสมบัติหลักดังนี้

1. เป็น Web App ใช้งานผ่าน URL ได้
2. รองรับการใช้งานผ่านมือถือเป็นหลัก
3. ไม่มีระบบ Login
4. หน้าแรกเลือกแบบประเมินได้ 3 ส่วน
5. ผู้ใช้กรอกข้อมูลผู้ประเมินภายในแต่ละแบบประเมิน
6. ระบบบันทึกข้อมูลเป็นรายครั้ง หรือ Submission
7. มีหน้าสรุปผลหลังส่งแบบประเมิน
8. มี Dashboard เบื้องต้นสำหรับดูรายการประเมินและผลรวม
9. ใช้ Static Route และ Query String เท่านั้น
10. ไม่ใช้ Dynamic Route
11. Deploy บน Cloudflare Pages
12. ใช้ Cloudflare Workers เป็น API
13. ใช้ Cloudflare D1 เป็น Database

---

## 3. Assessment Modules

ระบบมีแบบประเมินหลัก 3 ส่วน

### 3.1 ประเมินสภาพแวดล้อมในการทำงาน

หัวข้อย่อย:

- แสงสว่าง
- เสียง
- ความร้อน

วัตถุประสงค์:

- ใช้ประเมินข้อมูลหรือสภาพแวดล้อมในพื้นที่ทำงาน
- เก็บข้อมูลพื้นที่ทำงาน
- เก็บค่าหรือคำตอบที่เกี่ยวข้องกับแสง เสียง หรือความร้อน
- สรุปผลการประเมินเบื้องต้น

---

### 3.2 ประเมินความเสี่ยงต่อสุขภาพ

หัวข้อย่อย:

- ความเสี่ยงจากแสงสว่าง
- ความเสี่ยงจากเสียง
- ความเสี่ยงจากความร้อน

วัตถุประสงค์:

- ประเมินอาการหรือผลกระทบที่เกี่ยวข้องกับสภาพแวดล้อมในการทำงาน
- ใช้คำถามแบบเป็นขั้นตอน
- คำนวณคะแนนความเสี่ยงเบื้องต้น
- แสดงระดับผล เช่น ผ่านเกณฑ์ / ปานกลาง / เสี่ยงสูง

---

### 3.3 ประเมินความพึงพอใจในการใช้แอป

หัวข้อประเมิน:

- Accuracy
- Design
- Usability
- Usefulness

วัตถุประสงค์:

- เก็บความคิดเห็นของผู้ใช้งาน
- ประเมินความง่ายในการใช้งาน
- ประเมินประโยชน์ของระบบ
- ใช้ข้อมูลสำหรับปรับปรุงระบบหรือประกอบรายงาน

---

## 4. User Flow

### 4.1 Overall Flow

```text
User เปิด Web App
↓
หน้าแรกแสดงแบบประเมิน 3 ส่วน
↓
User เลือกประเภทแบบประเมิน
↓
User เลือกหัวข้อย่อย ถ้ามี
↓
ระบบเริ่มสร้าง Submission
↓
Step 1: กรอกข้อมูลผู้ประเมิน
↓
Step 2: กรอกข้อมูลการทำงาน / พื้นที่ที่เกี่ยวข้อง
↓
Step 3: ตอบคำถามแบบประเมิน
↓
Step 4: ระบบคำนวณผล
↓
Step 5: แสดงหน้าสรุปผล
↓
ข้อมูลแสดงใน Dashboard
```

---

## 5. Page Structure

### 5.1 Home Page

Path:

```text
/
```

หน้าที่:

- แสดงชื่อระบบ
- แสดงคำอธิบายสั้น ๆ
- แสดง Card แบบประเมิน 3 ส่วน
- มีปุ่มไปหน้า Dashboard

Card ที่ต้องมี:

1. ประเมินสภาพแวดล้อมในการทำงาน
2. ประเมินความเสี่ยงต่อสุขภาพ
3. ประเมินความพึงพอใจในการใช้แอป

---

### 5.2 Environment Category Page

Path:

```text
/assessment/environment
```

หน้าที่:

- ให้ผู้ใช้เลือกหัวข้อย่อยของสภาพแวดล้อม
- แสดง Card 3 ใบ ได้แก่ แสงสว่าง เสียง ความร้อน

เมื่อเลือกหัวข้อให้ไปที่:

```text
/assessment/environment-form?category=light
/assessment/environment-form?category=noise
/assessment/environment-form?category=heat
```

---

### 5.3 Environment Form Page

Path:

```text
/assessment/environment-form?category=light
```

หน้าที่:

- อ่านค่า category จาก query string
- เริ่มสร้าง submission
- แสดงแบบฟอร์มเป็น step
- บันทึกข้อมูลและแสดงผลลัพธ์

Step ที่แนะนำ:

1. ข้อมูลผู้ประเมิน
2. ข้อมูลพื้นที่ / สถานที่
3. คำถามหรือข้อมูลประเมินเฉพาะด้าน
4. ตรวจสอบและส่งคำตอบ
5. สรุปผล

---

### 5.4 Health Risk Category Page

Path:

```text
/assessment/health-risk
```

หน้าที่:

- ให้ผู้ใช้เลือกหัวข้อย่อยของความเสี่ยงสุขภาพ
- แสดง Card 3 ใบ ได้แก่ แสงสว่าง เสียง ความร้อน

เมื่อเลือกหัวข้อให้ไปที่:

```text
/assessment/health-risk-form?category=light
/assessment/health-risk-form?category=noise
/assessment/health-risk-form?category=heat
```

---

### 5.5 Health Risk Form Page

Path:

```text
/assessment/health-risk-form?category=noise
```

หน้าที่:

- อ่านค่า category จาก query string
- เริ่มสร้าง submission
- กรอกข้อมูลผู้ประเมิน
- กรอกข้อมูลการทำงาน
- ตอบคำถามสุขภาพแบบ step-by-step
- คำนวณคะแนนและระดับความเสี่ยง
- แสดงหน้าสรุปผล

---

### 5.6 Satisfaction Page

Path:

```text
/assessment/satisfaction
```

หน้าที่:

- เริ่มสร้าง submission type satisfaction
- กรอกข้อมูลผู้ประเมิน
- ตอบแบบประเมินความพึงพอใจ
- กรอกข้อเสนอแนะเพิ่มเติม
- แสดงสรุปผล

---

### 5.7 Result Page

Path:

```text
/result?submissionId=SUB-0001
```

หน้าที่:

- อ่าน submissionId จาก query string
- ดึงผลลัพธ์จาก API
- แสดงผลสรุป
- มีปุ่มกลับหน้าแรก
- มีปุ่มไป Dashboard

ห้ามใช้:

```text
/result/[submissionId]
```

เพราะโปรเจกต์นี้ใช้ Static Export

---

### 5.8 Dashboard Page

Path:

```text
/dashboard
```

หน้าที่:

- แสดงจำนวนรายการประเมินทั้งหมด
- แสดงรายการประเมินล่าสุด
- แสดงผลแยกตามประเภท
- แสดงผลแยกตามหัวข้อ
- แสดงสถานะผ่านเกณฑ์ / ปานกลาง / เสี่ยงสูง
- แสดงกราฟหรือ summary card เบื้องต้น

Dashboard เวอร์ชันแรกไม่ควรแสดงข้อมูลสุขภาพละเอียดหรือข้อมูลส่วนตัวที่อ่อนไหวมากเกินไป

---

### 5.9 Complete Page

Path:

```text
/complete
```

หน้าที่:

- แสดงข้อความขอบคุณ
- แจ้งว่าส่งข้อมูลเรียบร้อยแล้ว
- มีปุ่มกลับหน้าแรก

---

## 6. Routing Rules

โปรเจกต์นี้ใช้ Static Export ดังนั้นต้องใช้ Static Route + Query String เท่านั้น

### 6.1 Allowed Routes

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

### 6.2 Forbidden Routes

ห้ามใช้ Dynamic Route แบบนี้

```text
/result/[submissionId]
/assessment/environment/[category]
/assessment/health-risk/[category]
```

---

## 7. Frontend File Structure

```text
src/
├── app/
│   ├── page.tsx
│   ├── assessment/
│   │   ├── environment/
│   │   │   └── page.tsx
│   │   ├── environment-form/
│   │   │   └── page.tsx
│   │   ├── health-risk/
│   │   │   └── page.tsx
│   │   ├── health-risk-form/
│   │   │   └── page.tsx
│   │   └── satisfaction/
│   │       └── page.tsx
│   ├── result/
│   │   └── page.tsx
│   ├── dashboard/
│   │   └── page.tsx
│   └── complete/
│       └── page.tsx
├── components/
│   ├── ui/
│   ├── layout/
│   ├── assessment/
│   ├── dashboard/
│   └── forms/
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

---

## 8. Backend API

### 8.1 Submission APIs

```text
POST /api/submissions/start
POST /api/submissions/:id/profile
POST /api/submissions/:id/work-info
POST /api/submissions/:id/answers
POST /api/submissions/:id/complete
```

### 8.2 Result APIs

```text
GET /api/results/:submissionId
```

### 8.3 Dashboard APIs

```text
GET /api/dashboard/summary
GET /api/dashboard/submissions
GET /api/dashboard/by-category
```

### 8.4 Future Export API

```text
GET /api/export/csv
```

---

## 9. Database Tables

### 9.1 submissions

เก็บหัวรายการการประเมิน 1 ครั้ง

```text
id
submission_code
assessment_type
assessment_category
started_at
completed_at
status
overall_score
overall_level
created_at
updated_at
```

assessment_type:

```text
environment
health_risk
satisfaction
```

assessment_category:

```text
light
noise
heat
general
```

status:

```text
started
in_progress
completed
cancelled
```

---

### 9.2 respondent_profiles

เก็บข้อมูลผู้ประเมินของ submission นั้น

```text
id
submission_id
full_name
gender
age
weight
height
education_level
marital_status
has_underlying_disease
underlying_disease_details
created_at
```

---

### 9.3 respondent_work_infos

เก็บข้อมูลด้านการทำงานหรือพื้นที่

```text
id
submission_id
position_type
department
work_experience_years
working_hours_per_day
working_days_per_week
work_area
created_at
```

---

### 9.4 environment_answers

เก็บคำตอบแบบประเมินสภาพแวดล้อม

```text
id
submission_id
category
question_key
question_text
answer_value
answer_score
measured_value
unit
created_at
```

---

### 9.5 health_risk_answers

เก็บคำตอบแบบประเมินความเสี่ยงสุขภาพ

```text
id
submission_id
category
question_no
question_text
answer_value
answer_score
created_at
```

---

### 9.6 satisfaction_answers

เก็บคำตอบแบบประเมินความพึงพอใจ

```text
id
submission_id
category
question_no
question_text
rating
created_at
```

---

### 9.7 assessment_results

เก็บผลลัพธ์รวมของแต่ละ submission

```text
id
submission_id
assessment_type
assessment_category
total_score
risk_level
recommendation
created_at
```

risk_level:

```text
pass
medium
high_risk
```

---

## 10. Scoring Rules

### 10.1 Health Risk

คำตอบ:

```text
ไม่เคย = 0
บางครั้ง = 1
เป็นประจำ = 2
```

ถ้ามี 10 ข้อต่อ 1 category:

```text
คะแนนเต็ม = 20
```

เกณฑ์เบื้องต้น:

```text
0 - 6 คะแนน   = pass / ความเสี่ยงต่ำ
7 - 13 คะแนน  = medium / ความเสี่ยงปานกลาง
14 - 20 คะแนน = high_risk / ความเสี่ยงสูง
```

หมายเหตุ: เกณฑ์นี้สามารถแก้ไขภายหลังตามผู้วิจัยกำหนด

---

### 10.2 Satisfaction

คำตอบ:

```text
5 = พึงพอใจมากที่สุด
4 = พึงพอใจมาก
3 = พึงพอใจปานกลาง
2 = พึงพอใจน้อย
1 = พึงพอใจน้อยที่สุด
```

ผลลัพธ์:

```text
overall_avg = ค่าเฉลี่ยรวม
category_avg = ค่าเฉลี่ยรายด้าน
```

---

### 10.3 Environment

การคำนวณ Environment จะกำหนดตามคำถามจริงอีกครั้ง

ใน MVP ให้รองรับได้ทั้ง:

- คำตอบแบบ choice
- ค่าตัวเลข เช่น Lux, dBA, WBGT
- คะแนนที่คำนวณจาก rule
- ข้อเสนอแนะจาก risk level

---

## 11. UI / UX Direction

### 11.1 Mood

```text
Clean
Calm
Health & Safety
Mobile App-like
Friendly
Research-ready
```

### 11.2 Color Palette

```text
Primary Blue: #0F63C7
Deep Blue: #0B4FAE
Soft Blue: #E0F2FE
Sky Tint: #F0F9FF

Green: #16A34A
Soft Green: #DCFCE7

Amber: #F59E0B
Soft Amber: #FEF3C7

Red: #EF4444
Soft Red: #FEE2E2

Background: #F8FAFC
Surface: #FFFFFF
Text Primary: #0F172A
Text Secondary: #64748B
Border: #E2E8F0
```

---

### 11.3 Typography

ใช้ Font ภาษาไทยที่อ่านง่าย

Recommended:

```text
Noto Sans Thai
```

หรือ

```text
LINE Seed Sans TH
```

Font size:

```text
Page Title: 24px
Section Title: 20px
Card Title: 17px
Body: 16px
Small: 14px
Caption: 12px
```

---

### 11.4 Components

Components ที่ควรมี:

```text
HomeAssessmentCard
CategoryCard
StepProgress
ProfileFormCard
QuestionCard
ChoiceButton
RatingGroup
ResultSummaryCard
DashboardSummaryCard
DonutChartCard
ProgressMetric
SubmissionListItem
StatusBadge
PrimaryButton
FormInput
PageHeader
BottomNav
```

---

## 12. MVP Scope

### 12.1 Included

```text
Static Web App
No Login
Assessment-first Flow
เลือกแบบประเมิน 3 ส่วน
กรอกข้อมูลผู้ประเมินในแต่ละครั้ง
บันทึกข้อมูลเป็น Submission
บันทึกข้อมูลลง Cloudflare D1
Dashboard เบื้องต้น
Result Page
Deploy ผ่าน Cloudflare Pages
ใช้งานผ่าน URL / QR Code
```

---

### 12.2 Not Included

```text
Login
Register
Admin Role
User Management
Reset Password
Dynamic Route
Production-grade Permission System
Export PDF แบบสมบูรณ์
Excel Export แบบจัดรูปแบบ
แก้ไขคำถามผ่านหน้า UI
Dashboard เชิงลึกหลายมิติ
Offline Mode เต็มรูปแบบ
Mobile App บน App Store / Play Store
```

---

## 13. Acceptance Criteria

ระบบจะถือว่าเสร็จสมบูรณ์ใน MVP เมื่อ:

1. ผู้ใช้เปิดหน้าแรกได้
2. ผู้ใช้เลือกแบบประเมินทั้ง 3 ส่วนได้
3. ผู้ใช้เลือกหัวข้อย่อยได้ในหมวด Environment และ Health Risk
4. ผู้ใช้กรอกข้อมูลผู้ประเมินได้
5. ผู้ใช้ตอบคำถามได้
6. ระบบสร้าง submission ได้
7. ระบบบันทึกข้อมูลลง D1 ได้
8. ระบบคำนวณคะแนนเบื้องต้นได้
9. ระบบแสดงผลสรุปได้
10. Dashboard แสดงรายการประเมินได้
11. Dashboard แสดง summary เบื้องต้นได้
12. ระบบใช้งานบนมือถือได้ดี
13. ระบบไม่ใช้ Dynamic Route
14. ระบบ Deploy เป็น Static Export ได้สำเร็จ
