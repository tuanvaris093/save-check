
# UI_DESIGN_SPEC.md
# SafeCheck UI Design Specification
## Version 4: Modern Glass UI + Mobile Floating Pill Bottom Bar + Desktop Glass Sidebar

## 1. Purpose

เอกสารนี้ใช้เป็นแนวทางสำหรับออกแบบ UI/UX ของโปรเจกต์ SafeCheck ให้มีความสวยงาม ทันสมัย อ่านง่าย ใช้งานง่าย และมีคุณภาพระดับ production-ready สำหรับ MVP

ระบบนี้เป็น Web App สำหรับทำแบบประเมินออนไลน์ โดยต้องให้ความรู้สึกเหมือน Mobile App ที่สะอาด นุ่มนวล ทันสมัย และน่าเชื่อถือ ไม่ใช่เว็บฟอร์มพื้นฐาน

---

## 2. Design Goal

เป้าหมายของ UI คือ:

```text
Modern
Clean
Glass
Soft
Friendly
Professional
Health & Safety
Mobile-first
Production-quality
```

ระบบต้องดู:

- สะอาด
- ทันสมัย
- น่าเชื่อถือ
- เหมาะกับงานสุขภาพ / ความปลอดภัย / งานวิจัย
- ใช้งานง่ายบนมือถือ
- ไม่เหมือน Google Form
- ไม่เหมือนเอกสารราชการ
- ไม่ดูเด็กหรือ casual เกินไป
- ไม่ใช้ emoji ในทุกส่วนของระบบ

---

## 3. Important UI Rule: No Emoji

ห้ามใช้ emoji ในระบบทั้งหมด

ให้ใช้ icon จาก `lucide-react` แทนเท่านั้น

ห้ามใช้ตัวอย่างเช่น:

```text
📋
🩺
⭐
📊
🏠
✅
⚠️
❌
```

เหตุผล:

- Emoji ทำให้ UI ดูไม่ professional
- แต่ละเครื่องแสดง emoji ไม่เหมือนกัน
- ทำให้ระบบดูไม่เป็น production
- คุม style ยาก

---

## 4. Icon System

ใช้ icon จาก:

```text
lucide-react
```

### Recommended Icons

Home / Navigation:

```text
Home
LayoutDashboard
ClipboardList
BarChart3
ChevronRight
ArrowLeft
Menu
PanelLeft
```

Assessment:

```text
ClipboardCheck
ShieldCheck
Activity
HeartPulse
Stethoscope
FileCheck2
```

Environment:

```text
Sun
Volume2
ThermometerSun
Building2
MapPin
Gauge
```

Health Risk:

```text
HeartPulse
Activity
Ear
Eye
Thermometer
ShieldAlert
```

Satisfaction:

```text
Star
Smile
ThumbsUp
Sparkles
MessageSquareText
```

Status:

```text
CheckCircle2
AlertTriangle
XCircle
Info
CircleCheck
```

Dashboard:

```text
BarChart3
PieChart
TrendingUp
ListChecks
Users
CalendarDays
```

### Icon Rules

- ใช้ icon เท่าที่จำเป็น
- ไม่ใส่ icon เยอะเกินไป
- Icon ต้องมีความหมายตรงกับเนื้อหา
- ขนาด icon หลักใน card ประมาณ 24-28px
- ขนาด icon ใน navigation ประมาณ 20-22px
- ใช้ stroke width ประมาณ 2 หรือ 2.25
- ใช้สีตาม theme ไม่ใช้สีสุ่ม
- ห้ามใช้ emoji แทน icon

---

## 5. Visual Direction

UI ควรใช้แนวทาง:

```text
Soft Glassmorphism + Clean Medical App
```

ลักษณะที่ต้องการ:

- พื้นหลังโทนฟ้าอ่อน / ขาว
- Card สีขาวโปร่งเล็กน้อย
- มุมโค้งเยอะ
- เงานุ่ม
- มี blur เบา ๆ
- มี gradient อ่อน ๆ
- ใช้ border สีฟ้าอ่อน / ขาวโปร่ง
- มี spacing ที่โปร่ง ไม่อึดอัด
- ให้ความรู้สึก premium และ modern

---

## 6. Color Palette

ใช้สีหลักเป็นโทน น้ำเงิน / ฟ้า / ขาว เพื่อให้เหมาะกับระบบสุขภาพ ความปลอดภัย และงานประเมิน

Primary:

```text
Primary Blue: #0F63C7
Bright Blue: #1EA7FF
Deep Blue: #0B4FAE
Soft Blue: #E0F2FE
Sky Tint: #F0F9FF
Ice Blue: #F8FCFF
```

Glass / Surface:

```text
Glass White: rgba(255, 255, 255, 0.72)
Glass Blue: rgba(240, 249, 255, 0.72)
Surface: #FFFFFF
Surface Soft: #F8FAFC
Border Soft: rgba(148, 163, 184, 0.22)
Border Blue: rgba(14, 165, 233, 0.18)
```

Status:

```text
Success: #16A34A
Success Soft: #DCFCE7
Warning: #F59E0B
Warning Soft: #FEF3C7
Danger: #EF4444
Danger Soft: #FEE2E2
Info: #0284C7
Info Soft: #E0F2FE
```

Text:

```text
Text Primary: #0F172A
Text Secondary: #64748B
Text Muted: #94A3B8
Text White: #FFFFFF
```

---

## 7. Background Style

พื้นหลังหลักของระบบควรมีความนุ่มและทันสมัย

Recommended App Background:

```css
background:
  radial-gradient(circle at top left, rgba(30, 167, 255, 0.18), transparent 32%),
  radial-gradient(circle at top right, rgba(14, 165, 233, 0.12), transparent 28%),
  linear-gradient(180deg, #F8FCFF 0%, #F0F9FF 45%, #FFFFFF 100%);
```

Rules:

- ห้ามใช้พื้นหลังขาวล้วนแบบ plain ทั้งหมด
- ควรมี gradient หรือ soft radial gradient เบา ๆ
- ห้ามใช้สีฉูดฉาด
- Background ต้องไม่แย่งความสนใจจาก content

---

## 8. Shared Glass Style

ทั้ง Card, Mobile Bottom Bar และ Desktop Sidebar ต้องใช้ style family เดียวกัน คือ:

```text
Glass
Blur
Rounded
Soft Shadow
Blue / White Theme
```

Base glass surface:

```css
background: rgba(255, 255, 255, 0.78);
backdrop-filter: blur(18px);
-webkit-backdrop-filter: blur(18px);
border: 1px solid rgba(148, 163, 184, 0.20);
box-shadow:
  0 18px 45px rgba(15, 99, 199, 0.08),
  0 4px 12px rgba(15, 23, 42, 0.04);
```

---

## 9. Glass Card Style

Card หลักควรใช้ style แบบ glass / soft card

Base Card:

```css
background: rgba(255, 255, 255, 0.78);
backdrop-filter: blur(18px);
-webkit-backdrop-filter: blur(18px);
border: 1px solid rgba(148, 163, 184, 0.20);
box-shadow:
  0 18px 45px rgba(15, 99, 199, 0.08),
  0 4px 12px rgba(15, 23, 42, 0.04);
border-radius: 24px;
```

Hover / Active บน desktop/tablet:

```css
transform: translateY(-2px);
box-shadow:
  0 24px 60px rgba(15, 99, 199, 0.12),
  0 8px 18px rgba(15, 23, 42, 0.06);
```

Active บน mobile:

```css
transform: scale(0.985);
```

---

## 10. Responsive Layout Rules

ระบบต้อง responsive ทั้ง Mobile, Tablet / iPad และ Desktop

### Mobile

```text
Width: 100%
Main content max-width: 430px - 480px
Navigation: Floating Pill Bottom Navigation
Layout: Single column
Padding: 16px - 20px
Bottom padding: ต้องเผื่อพื้นที่ bottom nav
```

Mobile ต้องใช้งานง่ายด้วยนิ้วโป้ง

- ปุ่มต้องใหญ่
- card ต้องกดง่าย
- form ต้องไม่แน่น
- bottom nav ต้องอยู่ด้านล่างแบบ floating pill
- ไม่ใช้ sidebar
- ไม่ใช้ top navbar แบบ desktop

### Tablet / iPad

```text
Main content max-width: 720px - 900px
Navigation: Glass Sidebar หรือ Compact Glass Sidebar
Layout: 2 columns ได้ในบางส่วน
Padding: 24px - 32px
```

Tablet ใช้ sidebar ได้ แต่ต้องไม่กินพื้นที่มากเกินไป

### Desktop

```text
Main content max-width: 1080px - 1200px
Navigation: Left Glass Sidebar
Layout: Multi-column
Padding: 32px - 48px
```

Desktop ต้องใช้ sidebar เป็นหลัก ไม่ใช้ top bar

---

## 11. Mobile Floating Pill Bottom Navigation

Mobile bottom navigation ต้องเป็นแบบ:

```text
Floating Oval / Capsule / Pill Bar
```

ไม่ใช่ full-width flat bottom bar และไม่ใช่ topbar

### Required Behavior

- แสดงเฉพาะ mobile
- ซ่อนบน tablet และ desktop
- fixed อยู่ด้านล่าง
- ลอยขึ้นจากขอบล่างเล็กน้อย
- อยู่กึ่งกลางหน้าจอ
- กว้างประมาณ 80-90% ของหน้าจอ
- max-width ประมาณ 380px - 420px
- เป็นทรงวงรี / capsule
- radius สูงมาก เช่น 999px
- มี glass blur background
- มี soft shadow
- รองรับ safe area ของ iPhone
- item active ต้องดูชัดเจน

### Recommended CSS

```css
.mobile-bottom-nav {
  position: fixed;
  left: 50%;
  bottom: calc(16px + env(safe-area-inset-bottom));
  transform: translateX(-50%);
  width: min(88vw, 420px);
  height: 72px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(148, 163, 184, 0.20);
  box-shadow:
    0 18px 45px rgba(15, 99, 199, 0.14),
    0 8px 18px rgba(15, 23, 42, 0.08);
}
```

### Active Item Style

```css
.mobile-nav-active {
  background: linear-gradient(135deg, rgba(224, 242, 254, 0.95), rgba(255, 255, 255, 0.75));
  color: #0F63C7;
  border-radius: 999px;
}
```

### Mobile Nav Items

MVP ใช้ 2 เมนู:

```text
หน้าแรก
รายงาน
```

Icon mapping:

```text
หน้าแรก = Home
รายงาน = LayoutDashboard หรือ BarChart3
```

### Mobile Bottom Nav Rules

- ห้ามทำเป็นแถบเต็มความกว้างติดขอบล่าง
- ห้ามทำเป็นเส้นตรงแบน ๆ
- ห้ามทำเป็น top navbar
- ห้ามใช้ emoji
- ต้องดูเหมือน capsule ลอยอยู่
- ถ้ามี 2 เมนู ให้แต่ละเมนูอยู่สมดุล ซ้าย/ขวา
- ถ้ามี active background ต้องเป็น pill เล็กซ้อนใน bar ใหญ่

---

## 12. Tablet / Desktop Glass Sidebar

Tablet และ Desktop ต้องใช้ sidebar ที่มี style เดียวกับ mobile floating pill bar คือ glass, blur, rounded, soft shadow

### Desktop Sidebar Required Behavior

- แสดงเฉพาะ tablet / desktop
- ซ่อนบน mobile
- อยู่ซ้ายของ content
- ไม่ใช้ top navbar
- มีความมนมาก
- มี glass blur
- มี soft shadow
- ใช้ icon จาก lucide-react
- Active menu เป็น rounded pill
- สีและบรรยากาศต้องเข้าชุดกับ mobile bottom bar

### Recommended Desktop Sidebar CSS

```css
.desktop-sidebar {
  width: 260px;
  min-height: calc(100vh - 32px);
  margin: 16px;
  border-radius: 32px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.88), rgba(240, 249, 255, 0.72));
  backdrop-filter: blur(22px);
  -webkit-backdrop-filter: blur(22px);
  border: 1px solid rgba(148, 163, 184, 0.20);
  box-shadow:
    0 24px 60px rgba(15, 99, 199, 0.12),
    0 8px 24px rgba(15, 23, 42, 0.06);
}
```

### Optional Blue Accent Sidebar

ถ้าต้องการให้ sidebar ดูเด่นขึ้น ใช้ blue accent ด้านในได้ แต่ยังต้องนุ่มและไม่แข็ง

```css
.sidebar-brand-panel {
  background: linear-gradient(135deg, #0F63C7, #1EA7FF);
  color: white;
  border-radius: 24px;
}
```

### Sidebar Active Menu

```css
.sidebar-active {
  background: rgba(224, 242, 254, 0.95);
  color: #0F63C7;
  border-radius: 999px;
  box-shadow: inset 0 0 0 1px rgba(14, 165, 233, 0.14);
}
```

### Sidebar Layout

```text
[Logo / App Name]

[หน้าแรก]
[รายงานสรุปผล]

Optional Future:
[รายการประเมิน]
[สถิติ]
[ส่งออกข้อมูล]
[ตั้งค่า]
```

### Sidebar Rules

- Desktop sidebar อยู่ซ้าย
- Content อยู่ขวา
- Sidebar มีความกว้างประมาณ 240px - 280px
- Tablet อาจใช้ compact sidebar 80px - 96px หรือ drawer
- Active menu ต้องเป็น rounded pill
- ใช้ icon + label
- ไม่มี top bar
- ถ้าต้องการ header ใน content ให้ใช้ page header เฉพาะใน content area ไม่ใช่ global top nav
- Style ต้องเข้ากับ mobile bottom pill bar

---

## 13. Layout Examples

### Home Mobile Layout

```text
[Top Logo / App Name]

Title:
SafeCheck

Subtitle:
ระบบประเมินสภาพแวดล้อมในการทำงาน
ความเสี่ยงสุขภาพ และความพึงพอใจในการใช้แอป

[Glass Card: ประเมินสภาพแวดล้อมในการทำงาน]
[Glass Card: ประเมินความเสี่ยงต่อสุขภาพ]
[Glass Card: ประเมินความพึงพอใจในการใช้แอป]

[Dashboard Link / Card]

[Floating Oval Bottom Navigation]
```

### Home Desktop Layout

```text
[Left Glass Sidebar]

[Main Content]
  [Hero Section]
  Title + Subtitle
  [Assessment Cards Grid 3 columns]
  [Dashboard Summary Preview]
```

### Form Mobile Layout

```text
[Page Header + Back Button]

[Step Progress]

[Glass Form Card]
Question / Input / Choices

[Sticky Bottom Action Button]
[Floating Oval Bottom Navigation]
```

### Form Desktop Layout

```text
[Left Glass Sidebar]

[Main Content]
  [Page Header]
  [Step Progress]
  [Centered Form Panel]
```

### Dashboard Mobile Layout

```text
[Page Header]

[Summary Cards]
[Donut Chart Card]
[Progress Metrics]
[Submission List]

[Floating Oval Bottom Navigation]
```

### Dashboard Desktop Layout

```text
[Left Glass Sidebar]

[Main Content]
  [Dashboard Header]
  [Summary Cards 4 columns]
  [Chart + Metrics 2 columns]
  [Submission Table]
```

---

## 14. Home Assessment Card Design

Assessment card ต้องเป็น glass card ที่ดู premium

Structure:

```text
Icon container
Title
Description
ChevronRight
```

Visual:

- Card background glass white
- Icon container เป็น soft blue circle / rounded square
- Title สีเข้ม
- Description สีเทาน้ำเงิน
- Chevron อยู่ด้านขวา
- กดได้ทั้ง card

Icon Mapping:

```text
Environment Assessment = ClipboardCheck หรือ ShieldCheck
Health Risk Assessment = HeartPulse หรือ Activity
Satisfaction Assessment = Star หรือ Smile
Dashboard = BarChart3 หรือ LayoutDashboard
```

---

## 15. Button Design

Primary Button:

```css
background: linear-gradient(135deg, #1EA7FF 0%, #0F63C7 100%);
color: #FFFFFF;
border-radius: 18px;
height: 52px;
box-shadow: 0 12px 28px rgba(30, 167, 255, 0.28);
```

Secondary Button:

```css
background: rgba(255, 255, 255, 0.72);
border: 1px solid rgba(14, 165, 233, 0.22);
color: #0F63C7;
border-radius: 18px;
height: 52px;
```

Ghost Button:

```css
background: transparent;
color: #0F63C7;
```

---

## 16. Form Design

Input:

```css
height: 50px;
border-radius: 16px;
background: rgba(255, 255, 255, 0.82);
border: 1px solid rgba(148, 163, 184, 0.22);
```

Focus:

```css
border-color: #1EA7FF;
box-shadow: 0 0 0 4px rgba(30, 167, 255, 0.12);
```

Form Card:

- ใช้ glass card
- label ชัดเจน
- error message สีแดงอ่อน อ่านง่าย
- แยก section ด้วย spacing ไม่ใช่เส้นหนา

---

## 17. Question / Choice UI

คำถามควรแสดงเป็น Card

Choice Button:

```text
ไม่เคย
บางครั้ง
เป็นประจำ
```

Style:

- ไม่ใช้ radio เล็ก
- ใช้ card button ใหญ่
- selected state เป็น soft blue / soft green
- มี CheckCircle2 icon เมื่อเลือก
- ปุ่มสูง 52px ขึ้นไป

---

## 18. Dashboard UI

Dashboard ต้องดู modern และอ่านง่าย

Elements:

```text
Summary Cards
Donut Chart
Progress Bar
Submission List
Status Badge
```

Summary Card:

- glass card
- icon เล็ก
- number ใหญ่
- label สั้น

Status Badge:

```text
pass = green
medium = amber
high_risk = red
```

Badge ต้องมีทั้งสีและข้อความ ไม่ใช้สีอย่างเดียว

---

## 19. Animation Rules

ใช้ animation เบา ๆ เท่านั้น

Allowed:

```text
fade-in
slide-up
scale on tap
smooth progress fill
chart animation
```

Timing:

```text
150ms - 280ms
```

Rules:

- ไม่ใช้ animation เด้งมาก
- ไม่ใช้ effect เกินจำเป็น
- ไม่ทำให้โหลดช้า
- ต้องดู professional

---

## 20. Tailwind Implementation Notes

ควรสร้าง class หรือ component pattern กลาง เช่น:

```text
glass-card
glass-sidebar
primary-button
mobile-container
section-title
status-badge
floating-pill-bottom-nav
```

ถ้าไม่ใช้ custom class ให้ทำเป็น component ที่ reusable

ตัวอย่าง design token ควรอยู่ใน:

```text
src/lib/constants.ts
tailwind.config.ts
src/styles/globals.css
```

---

## 21. UI Quality Checklist

ก่อนจบ Phase UI ต้องตรวจสอบ:

- ไม่มี emoji เหลือใน UI
- ใช้ lucide-react icons ทั้งหมด
- Mobile ใช้งานดี
- Mobile ใช้ floating oval / capsule bottom navigation
- Mobile bottom nav ไม่ใช่ full-width flat bar
- Tablet / Desktop ใช้ left glass sidebar
- Sidebar กับ bottom nav มี style family เดียวกัน
- ไม่มี top navbar บน desktop
- Card มีความมนและ modern
- มี glass / blur / soft shadow
- สีเข้ากับระบบสุขภาพและความปลอดภัย
- ไม่ดูเป็น Google Form
- ไม่ดูเป็นเว็บราชการ
- ปุ่มกดง่าย
- Form อ่านง่าย
- Dashboard ดูเป็น production
- Responsive ไม่แตกทุก breakpoint
- ไม่มี text overflow
- ไม่มี spacing แน่นเกินไป

---

## 22. Development Phase Mapping

ให้ AI Coding Agent ทำ UI ตาม Phase นี้

### Phase 2: Design System & UI Components

ต้องทำ:

- design tokens
- glass card
- button
- input
- glass sidebar
- floating pill bottom nav
- status badge
- reusable layout
- responsive container
- no emoji enforcement

### Phase 3: Home & Category Pages

ต้องทำ:

- home page ให้สวยแบบ production
- assessment cards แบบ glass
- responsive desktop/tablet/mobile
- desktop/tablet sidebar
- mobile floating pill bottom nav

### Phase 4: Form State & Assessment Flow

ต้องทำ:

- form UI แบบ glass card
- step progress สวย
- choice button แบบ modern
- sticky action button บน mobile
- เผื่อพื้นที่ไม่ให้ปุ่มชน bottom nav

### Phase 10: Result Page

ต้องทำ:

- result summary card สวย
- status badge ชัด
- recommendation card

### Phase 11: Dashboard

ต้องทำ:

- dashboard summary cards
- chart cards
- responsive layout
- submission list / table ที่ดูดี
- desktop dashboard with glass sidebar

---

## 23. Prompt for AI Coding Agent

ใช้ prompt นี้เมื่อต้องการให้ AI ปรับ UI:

```text
Please improve the UI according to UI_DESIGN_SPEC.md.

Important:
- Remove all emoji from the entire project.
- Use lucide-react icons only.
- Make the UI modern, soft, glassy, rounded, and production-quality.
- Use blue / sky / white theme suitable for a health and safety assessment app.
- Mobile must use a floating oval / capsule bottom navigation.
- The mobile bottom nav must be centered, lifted above the bottom edge, 80-90% width, very rounded, glassy, blurry, and softly shadowed.
- The mobile bottom nav must not be a full-width flat bottom bar.
- Tablet and desktop must use a left glass sidebar.
- Sidebar and mobile bottom nav must share the same glass / blur / rounded / soft shadow style family.
- Do not use a desktop top navbar.
- Make cards, buttons, forms, result page, and dashboard look polished.
- Do not change the core product scope.
- Do not add login.
- Do not add dynamic routes.
```

---

## 24. Final UI Direction Summary

SafeCheck ต้องมี UI ที่รู้สึกเหมือน mobile app สมัยใหม่ โดยใช้โทนฟ้า น้ำเงิน ขาว มีความ glass, blur, rounded, soft shadow และเป็นมืออาชีพ

ระบบต้องเลิกใช้ emoji ทั้งหมด และใช้ lucide-react icons แทน

Mobile ใช้ floating oval / capsule bottom navigation ที่ลอยอยู่ด้านล่างแบบวงรี ไม่ใช่ full-width flat bar

Tablet และ Desktop ใช้ left glass sidebar ที่มี style เดียวกับ bottom bar คือ glass, blur, rounded และ soft shadow

เป้าหมายคือให้ระบบดูดีพอสำหรับส่งให้ลูกค้าและใช้งานจริง ไม่ใช่ prototype หน้าตาธรรมดา
