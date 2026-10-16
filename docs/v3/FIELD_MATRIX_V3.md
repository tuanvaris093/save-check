# SafeCheck v3 Field matrix สำหรับ P0

วันที่: 12 ตุลาคม 2026 · อ้างอิง [Requirements](./REQUIREMENTS_V3.md)

เอกสารนี้กำหนด field เชิงตรรกะ; P1 implement shared contracts และ numbered migrations แล้ว ดู P1_REPORT_V3.md ชื่อ API เป็นชื่อเป้าหมายที่จะใช้ร่วมกันทั้ง frontend/Worker ชื่อ table เชิงตรรกะในตารางนี้ map กับโครงสร้างจริงตาม P1 report; ยังไม่ได้ migrate ฐานจริง

**D48 มีผลเหนือแบบออกแบบเก่า:** ไม่มี UI หลายช่วงความร้อนและวิธีประเมินเสียงที่เพิ่มเอง รายการ intervals ด้านล่างมีไว้รักษาข้อมูลประวัติที่บันทึกแล้วเท่านั้น

## กติกากลาง

- R = required เมื่อใช้กับแบบนั้น; C = required ตามเงื่อนไข; O = optional; S = server/ระบบสร้าง ไม่เปิดให้ผู้ตอบกรอก
- ช่องหมายเหตุ/ข้อเสนอแนะ/ความคิดเห็นเพิ่มเติม O เสมอ: รับ omitted/null/ข้อความว่าง แล้ว normalize เป็น null; ไม่เติมคำว่าไม่มีให้เอง ข้อมูลอื่น ๆ ที่จำเป็นตามคำตอบไม่อยู่ในข้อยกเว้นนี้
- string ที่ R/C ต้อง trim แล้วไม่ว่าง; numeric ที่ R/C ต้องตรวจ missing ก่อนแปลงเลข และรับเฉพาะ finite number; 0 ยอมรับเฉพาะ field ที่ตารางระบุ
- enum/boolean เริ่มด้วยยังไม่ตอบ ไม่ default เพศหรือไม่มีโรค/ไม่เคยให้ผู้ใช้โดยเงียบ ๆ
- ค่าที่ซ่อนเพราะไม่เกี่ยวข้องต้องไม่ส่งเป็นข้อมูลจริง; C ไม่ได้หมายความว่าให้ส่งช่องว่างข้ามเงื่อนไขได้
- วันที่เก็บ ISO Gregorian, UI แสดงไทย/พ.ศ.; datetime เก็บ UTC และแสดง Asia/Bangkok วันเวลาเริ่ม/สิ้นสุดใช้เต็ม datetime เพื่อรองรับข้ามเที่ยงคืน
- ข้อมูล read-only ใน retest ต้องตรวจบน Worker ด้วย; server copy จาก base revision ไม่เชื่อค่าที่ client ส่งมา
- Lookup ทุกตัวส่ง code; server สร้าง label snapshot/version ของเวลาที่บันทึก รายงานไม่ lookup label ล่าสุดมาแทนข้อมูลเก่า
- ข้อมูลเก่าอ่านได้แม้ไม่มี field v3; ช่องใหม่ที่ขาดแสดงไม่มีข้อมูลเดิม ไม่เติม 0/วันที่ปัจจุบัน/รายชื่อสมมติ

## A Metadata ระบบ

| API path | Label / ชนิด | Required / ขอบเขต | Validation / zero | DB เป้าหมาย | Retest |
| --- | --- | --- | --- | --- | --- |
| assessment_type | ประเภท record, enum | R ทุกแบบ | environment/health_risk/satisfaction | submissions | ล็อก |
| assessment_group | กลุ่มงาน, enum | R v3 | environment/health; ต้องเข้าคู่กับ type | submissions | ล็อก |
| assessment_category | หมวด, enum | R | light/noise/heat; satisfaction = general | submissions | ล็อก |
| schema_version | รุ่นข้อมูล | R | version ที่ server รองรับ | submissions/revisions | ล็อกรุ่นฐานหรือแปลงอย่าง explicit |
| questionnaire_version | รุ่นคำถาม | S health/satisfaction | catalog ที่รับรองใน release | submissions/answers | ไม่เกี่ยวข้อง |
| scoring_version / standard_version | รุ่นกติกา | S | server resolve | results/revisions | เกณฑ์เดิม |
| submission_code / id | รหัสงาน | S | unique; response server เป็นหลัก | submissions | คงเดิม |
| started_at / completed_at | เวลาเปิด/บันทึก | S | แยกจากเวลาที่กรอกเปรียบเทียบ | submissions | เวลาใหม่ตาม action |
| idempotency_key | ตัวระบุการส่งหนึ่งครั้ง | R mutation v3 | key เดิม+payload เดิมคืนผลเดิม; key เดิม+payload ต่าง reject | request ledger | ใหม่ต่อรอบ |
| base_revision_id | รอบฐาน | R retest | ต้องตรง latest ในขณะ commit | environment_revisions | server ตรวจ |
| observation_kind / carried_from_revision_id / measured_at | ที่มาค่ารายจุด | S retest | measured หรือ carried; carry เก็บวันวัดและรอบต้นทางจริง | revision_points | server สร้าง |
| revision_id / revision_no / result | รอบ/ผล | S environment | ห้าม client กำหนดคะแนนหรือ eligibility | revisions/submissions summary | สร้างใหม่ |

## B ข้อมูลบุคคล

ใช้เต็มชุดเฉพาะ health; satisfaction ใช้ชื่อทั้งสองกลุ่มและข้อมูลงานตาม C ไม่เพิ่มข้อมูลสุขภาพส่วนบุคคลทั้งหมดให้ satisfaction

| API path | Label / ชนิด | Required / ขอบเขต | Validation / zero | DB เป้าหมาย | หมายเหตุ |
| --- | --- | --- | --- | --- | --- |
| profile.full_name | ชื่อ-นามสกุล, string | R health/satisfaction | trim ≥ 2 อักขระ | respondent_profiles | environment ใช้ inspector_name |
| profile.gender | เพศ, enum | R health | male/female/other | respondent_profiles | ไม่ default |
| profile.age | อายุ, integer ปี | R health | 1–120; 0 ไม่รับ | respondent_profiles | — |
| profile.weight | น้ำหนัก, number กก. | R health | > 0 | respondent_profiles | input decimal |
| profile.height | ส่วนสูง, number ซม. | R health | > 0 | respondent_profiles | input decimal |
| profile.education_level | การศึกษา, enum | R health | ใช้ 4 ตัวเลือกเดิม | respondent_profiles | ไม่ใช่ program qualification |
| profile.marital_status | สถานภาพ, enum | R health | single/married/divorced/widowed | respondent_profiles | — |
| profile.has_underlying_disease | มีโรคประจำตัว, boolean | R health | false คือคำตอบที่ถูกต้อง | respondent_profiles | ต้องผู้ใช้เลือก |
| profile.underlying_disease_details | ระบุโรค, string | C เมื่อมีโรค | trim ไม่ว่าง; ไม่มีโรคเก็บ null | respondent_profiles | ไม่ใช่หมายเหตุ optional |
| profile.bmi | BMI | S หากแสดง | kg / (cm/100)² | derived report | ไม่ให้กรอกซ้ำ |

## C ข้อมูลการทำงานและการเรียน

| API path | Label / ชนิด | Required / ขอบเขต | Validation / zero | DB เป้าหมาย | สถานะ |
| --- | --- | --- | --- | --- | --- |
| workInfo.position_type | ประเภทบุคลากร, enum | R health และ satisfaction-health | staff/student/faculty/other | respondent_work_infos | คงตัวเลือกเดิม |
| workInfo.program_code | หลักสูตร, select | R health และ satisfaction-health | code ใน programs.json; not_applicable เฉพาะบริบททำงาน | respondent_work_infos | ชื่อ 7 รายการได้รับแล้ว |
| workInfo.program_label / program_version | ชื่อ/รุ่นหลักสูตร | S | label จาก catalog | respondent_work_infos | snapshot |
| workInfo.study_year | ชั้นปี, integer | C นักศึกษา health/satisfaction-health | integer 1–6 แยกจากหลักสูตร; 0 ไม่รับ | respondent_work_infos | ยืนยัน D10 แล้ว |
| workInfo.work_experience_years | อายุงาน, number ปี | C บุคลากร/อาจารย์ใน health | ≥ 0; รองรับอายุงานไม่ถึง 1 ปี | respondent_work_infos | นักศึกษาใช้ชั้นปี |
| workInfo.working_hours_per_day | ปฏิบัติงาน/เรียนเฉลี่ยต่อวัน, number ชั่วโมง | R health | > 0 ถึง 24 | respondent_work_infos | decimal ได้ |
| workInfo.working_hours_per_week | ปฏิบัติงาน/เรียนเฉลี่ยต่อสัปดาห์, number ชั่วโมง | R health | > 0 ถึง 168 | respondent_work_infos | ไม่ใช้ column วัน/สัปดาห์เดิม |
| healthContext.hours_worked_today | วันนี้ปฏิบัติงาน/เรียนมาแล้ว, number ชั่วโมง | R health-light | 0–24; 0 ถูกต้อง | health context | ไม่รวมคะแนน |
| legacy department/days_per_week/position/work_area | ค่าเก่า | ไม่เพิ่ม UI ใหม่โดยอัตโนมัติ | อ่าน/ส่งออกแบบ legacy เท่านั้น | ตารางเดิม | ห้ามแปลงหน่วย/เดาหลักสูตร |

การออกแบบสำหรับประเภท other: แสดงการเลือกบริบทนักศึกษา/ผู้ปฏิบัติงานที่เกี่ยวข้อง หรือ N/A ที่ชัดเจนก่อนเลือก study_year/work_experience; ไม่ยัดชั้นปีลง field อายุงาน ใช้เป็นกติกา applicability ใน P1 ตาม P0 spec

## D คำตอบสุขภาพ

| API path | Label / ชนิด | Required / ขอบเขต | Validation / zero | DB เป้าหมาย |
| --- | --- | --- | --- | --- |
| answers.before.q1…q10 | อาการก่อน, score | R health-light | แต่ละข้อ integer 0/1/2; ไม่รับ missing/ข้อซ้ำ/ข้อเกิน | health_risk_answers phase=before |
| answers.after.q1…q10 | อาการหลัง, score | R health-light | integer 0/1/2 | health_risk_answers phase=after |
| answers.single.q1…q10 | อาการ, score | R health-noise/heat | integer 0/1/2 | health_risk_answers phase=single |
| healthContext.noise_sources | แหล่งเสียง, code[] | R health-noise | ≥ 1, unique, 8 ตัวเลือกตาม requirement และ none แบบ exclusive | health_noise_sources | 
| healthContext.noise_source_other | เสียงอื่น, string | C เมื่อเลือก other | trim ไม่ว่าง; ไม่เลือกเก็บ null | health context |
| results.before_total/after_total/delta/after_level | ผลแสง | S | รวมเฉพาะ 10 IDs ต่อช่วง | assessment_results |
| results.total/level | ผลเสียง/ความร้อน | S | คะแนน 0–20 | assessment_results |

none เป็นตัวเลือกที่ออกแบบเพิ่มเพื่อรองรับผู้ไม่สัมผัสเสียง ไม่ใช่ตัวเลือกที่มีใน Word; เมื่อเลือก none แล้ว sources อื่นต้องว่าง แต่คำถามอาการยังต้องตอบครบ ไม่เติม 0 ให้อัตโนมัติ

## E ข้อมูลการตรวจสภาพแวดล้อมทุกหมวด

| API path | Label / ชนิด | Required | Validation | DB เป้าหมาย | Retest |
| --- | --- | --- | --- | --- | --- |
| inspectionData.inspector_name | ผู้ตรวจ, string | R | trim ≥ 2 | environment inspection snapshot | แก้ได้ต่อรอบ D54 |
| inspectionData.position | ตำแหน่ง, string | R | ไม่ว่าง | inspection snapshot | แก้ได้ต่อรอบ D54 |
| inspectionData.inspection_location | สถานที่ตรวจ, string | R | ไม่ว่าง | inspection snapshot | แก้ได้ต่อรอบ D54 |
| inspectionData.inspection_date | วันที่ตรวจ, date | R | วันที่จริง Gregorian | revision | วันใหม่ |
| inspectionData.start_at/end_at | เวลาเริ่ม/สิ้นสุด, datetime | R | end > start; แสดงวันเมื่อข้ามคืน | revision | เวลาใหม่ |
| inspectionData.equipment | เครื่องมือ, string | R | ไม่ว่าง | inspection snapshot | แก้ได้ต่อรอบ D54 |
| inspectionData.serial_number | หมายเลขเครื่อง, string | R | ไม่แปลงเป็นเลขเพื่อรักษาศูนย์นำหน้า | inspection snapshot | แก้ได้ต่อรอบ D54 |
| inspectionData.calibration_date | วันที่ปรับเทียบ, date | R | ไม่หลังวันตรวจของรอบนั้น | inspection snapshot | แก้ได้ต่อรอบ D54 |
| inspectionData.responsible_department | แผนกงานที่รับผิดชอบ, string | R | ไม่ว่าง | inspection snapshot | แก้ได้ต่อรอบ D54 |
| inspectionData.location_responsible_name | ผู้รับผิดชอบอาคาร/สถานที่, string | R | ไม่ว่าง | inspection snapshot | แก้ได้ต่อรอบ D54 |
| inspectionData.measurement_technique | เทคนิค, enum | R เฉพาะแสง | spot/area | inspection snapshot | ล็อก |
| layout.file_id | ผังพื้นที่, uploaded file reference | O ตาม D17 (14 ต.ค. 2026); ถ้าส่ง layout ต้องมี file_id | JPG/PNG/WebP/PDF; ≤ 10 MiB ตาม UI เดิม; server ตรวจไฟล์จริง | files + immutable revision reference | ใช้เดิม |

ไฟล์มาตรฐาน PDF เป็น asset ที่ระบบให้ ไม่ใช่ช่อง upload ที่ผู้ตอบต้องกรอก; ช่องไฟล์ draft ถ้าอัปโหลดแล้วลบก่อน submit ให้กลับเป็น missing และแจ้ง error

## F ค่าตรวจสภาพแวดล้อม

ครั้งแรก array ทุกหมวดต้องมีอย่างน้อย 1 พื้นที่/จุดที่สมบูรณ์; retest ส่งเฉพาะหน่วยที่ไม่ผ่านครบทุกหน่วย และ server carry หน่วยที่ผ่านพร้อมวันวัดเดิมตาม D11; Area ต้องมีชุดจุดย่อยครบตามวิธีสำรวจที่กำหนดไว้ ไม่อนุมานจำนวนจุดขั้นต่ำเชิงวิชาการจากการ validate array

| API path | Label / ชนิด | Required | Validation / zero | DB เป้าหมาย | Retest |
| --- | --- | --- | --- | --- | --- |
| points[].point_id/area_id/order | ตัวระบุจุด/พื้นที่ | S หลังสร้างครั้งแรก | stable ID; unique ในงาน | revision_points | ล็อก |
| points[].location_desc | สถานที่/ลักษณะงาน, string | R | ไม่ว่าง | revision_points | ล็อก |
| points[].standard_code/version | แถวมาตรฐาน | R code; S version | อยู่ใน catalog ที่สัมพันธ์เทคนิค | standard snapshot | ล็อก |
| points[].standard_target_lux | เกณฑ์ Spot ภายใน, number lux | ระบบกำหนด ไม่ใช่ช่องกรอกตาม D52 | เลือกแถวแล้วใช้ค่าขั้นต่ำอัตโนมัติ รักษาค่าเดิมของประวัติ | standard snapshot | ล็อก |
| light.spot.points[].lux | ค่าแสงแต่ละจุด, number lux | R spot | ≥ 0; 0 มีความหมาย | revision_points | ค่าใหม่ |
| light.areas[].samples[].lux | ค่าแสงจุดย่อย, number lux | R area | ≥ 0; จุดย่อยเดิมครบ | revision_points | ค่าใหม่ |
| light.spot.points[].surrounding_near_lux/surrounding_outer_lux | ค่าแสงบริเวณโดยรอบ, number lux | C ตาราง 3 ใช้กับจุดนั้น | ≥ 0; เกณฑ์ตามช่วงใน P0 spec | revision_points | ค่าใหม่เฉพาะกลุ่มที่ไม่ผ่าน |
| light.areas[].average/minimum | ค่าเฉลี่ย/ค่าต่ำสุด | S area | ไม่เฉลี่ยข้าม area | revision results | คำนวณใหม่ |
| noise.points[].min_dBA/max_dBA | ระดับต่ำสุด/สูงสุด, number dBA | R noise | finite; min ≤ max; min/max ไม่แทน TWA | revision_points | ค่าใหม่ |
| noise.points[].exposure_level_dBA | ระดับเฉลี่ยการสัมผัสตามช่วงเวลา, number dBA | C exposure-duration mode | finite; ต้องเป็นค่าตามวิธีวัดใน P0 spec | revision_points | ค่าใหม่ |
| noise.points[].exposure_duration_minutes | เวลาสัมผัส, number นาที | C exposure-duration mode | > 0 ถึง 1,440; ทศนิยมได้ | point context snapshot | ล็อกเพื่อเทียบเกณฑ์เดิม |
| noise.points[].twa_8hr | ค่า normalized 8 ชั่วโมง, number dBA | C twa8 mode | ค่าเฉลี่ยแบบ 8 ชั่วโมงจากวิธีวัดที่ถูกต้อง | revision_points | ค่าใหม่ |
| noise.points[].evaluation_basis | วิธีเทียบ, enum | R noise | exposure-duration/twa8 | point context snapshot | ล็อก |
| noise.points[].area_average_dBA | ค่าเฉลี่ยสำรวจพื้นที่ | ไม่ใช่ input สำหรับตัดสิน exposure | เก็บได้เฉพาะโหมดสำรวจที่ระบุว่าไม่ใช่ compliance result | legacy/observation data | ไม่แอบแทน TWA |
| heat.points[].start_at/end_at | เวลาเริ่มต้น/สิ้นสุด HH:MM ใน UI, datetime ในข้อมูล | R heat | end > start ไม่บังคับ 120 นาที ตาม D48 | revision_points | เวลาใหม่ |
| heat.points[].wbgt_type | ในร่ม/ไม่มีแดด หรือมีแดด, enum | R heat | in/out ตามคำอธิบาย ไม่ใช้ใน/นอกอาคารอย่างเดียว | point context snapshot | ล็อก |
| heat.points[].input_mode | รูปแบบข้อมูลภายใน | ไม่เป็นช่อง UI ตาม D48 | ค่าใหม่ใช้ค่าเฉลี่ยที่บันทึก รูปแบบหลายช่วงเก็บไว้เพื่ออ่านประวัติเดิม | point context snapshot | ไม่เพิ่มตัวเลือกในฟอร์ม |
| heat.points[].workload | ภาระงาน, enum | R heat | light/moderate/heavy | standard snapshot | ล็อก |
| heat.points[].wbgt_average | ค่า WBGT เฉลี่ย, number °C | R heat | finite แยกจากค่าจากเครื่อง ตาม field เดิม D48 | revision_points | ค่าใหม่ |
| heat.points[].db_temp/wb_temp/gt_temp | อุณหภูมิ DB/WB/GT, number °C | O ตามฟอร์มเดิม D48 | finite; 0 ไม่ถือ missing | revision inputs | ค่าใหม่ |
| heat.points[].wbgt_in | ค่า WBGT จากเครื่องวัด, number °C | O ตามฟอร์มเดิม D48 | finite เก็บแยกจากค่าเฉลี่ย | revision inputs | ค่าใหม่ |
| heat.points[].intervals[].wb/gt | กระเปาะเปียก/โกลบ, number °C | C calculated_intervals | finite; 0 ไม่ถือ missing | revision samples | ค่าใหม่ |
| heat.points[].intervals[].db | กระเปาะแห้ง, number °C | C calculated_intervals แบบมีแดด | finite; ไม่ให้กรอกซ้ำในโหมดเครื่องวัด | revision samples | ค่าใหม่ |
| heat.points[].intervals[].minutes | เวลาช่วงย่อย, number นาที | C calculated_intervals | > 0; รวม 120 นาทีตามขอบเขตตัวอย่าง | revision samples | เวลาใหม่ |
| heat.points[].standard_value/wbgt_result | มาตรฐานและผล WBGT | ช่องมาตรฐานตามฟอร์มเดิม/ผลคำนวณจาก server | เลือกงานเติม 34/32/30 °C ให้ เก็บเกณฑ์จริงใน snapshot ตาม D48 | revision inputs/results | เกณฑ์เดิม |
| points[].remark | หมายเหตุรายจุด, string | O ทุกหมวด | omitted/null/blank ได้ | revision_points | เว้นว่างได้; policy retest ใน P0 spec |

โหมดการวัดในตารางเป็นรายละเอียดออกแบบตาม D13 และ P0 spec เพื่อเลี่ยงการใช้ค่าเฉลี่ยคนละชนิดแทนกัน ส่วน retest ไม่ให้เปลี่ยน exposure duration เพราะทำให้เกณฑ์เปลี่ยน หากสภาพการสัมผัสเปลี่ยนให้สร้างงานใหม่

## G ความพึงพอใจ

| API path | Label / ชนิด | Required | Validation / zero | DB เป้าหมาย |
| --- | --- | --- | --- | --- |
| profile.full_name | ผู้ประเมิน | R ทั้ง 2 กลุ่ม | ตาม B | respondent_profiles |
| workInfo.position_type/program_code/study_year | ข้อมูลผู้ประเมินสุขภาพ | R/C ตาม C | ไม่มี weight/disease เพิ่มในแบบนี้ | respondent_work_infos |
| answers.q1…q16 | คะแนน, integer | R ทั้ง 2 กลุ่ม | 1–5 ครบทุกข้อ; 0 ไม่รับ | satisfaction_answers |
| suggestion | ข้อเสนอแนะ, string | O | omitted/null/blank ได้ | satisfaction metadata |
| durations.traditional.days/hours/minutes/seconds | เวลาวิธีเดิม, 4 integer | R เฉพาะ environment | วัน ≥ 0, ชั่วโมง 0–23, นาที/วินาที 0–59; รวม > 0 | normalized seconds |
| durations.safecheck.days/hours/minutes/seconds | เวลา SafeCheck, 4 integer | R เฉพาะ environment | เช่นเดียวกัน; 0 รายหน่วยได้ | normalized seconds |
| durations.*_total_seconds/source | ผลรวม/แหล่งข้อมูล | S | source=manual; safe integer | satisfaction metadata |
| results.dimension_means/overall_mean | ค่าเฉลี่ย | S | คิดเฉพาะ 16 scores | assessment_results |

หมายเหตุ D17: เลือก/ดูตัวอย่างไฟล์บนเครื่องและทบทวนก่อนส่ง; upload API เริ่มเมื่อยืนยันบันทึก เพิ่มแผนผังจากผลล่าสุดภายหลังได้ ส่วนตรวจซ้ำคงแผนผังเดิมซึ่งอาจไม่มีไฟล์

## H Field เก่าที่ไม่ควรกลายเป็น required โดยอัตโนมัติ

`environment_condition`, `job_characteristic`, generic `measure_1/2/3`, `workload_level`, `standard_text`, `total_time`, alias `work_years/work_hours_per_day` และข้อมูลใน DB ที่ไม่ปรากฏฟอร์มปัจจุบัน ต้องจัดเป็น legacy/derived/แทนที่ตามความหมายใน P1 ไม่เพิ่ม field ให้ผู้ใช้เพียงเพราะเคยมี property ใน schema

การแก้ไขคำผิด/ข้อมูลเสริมของรอบที่ปิดแล้วต้องเป็น action ที่มี audit ตาม P0 spec; ช่องหมายเหตุ optional ไม่อนุญาตให้แก้ record history ทับอย่างอิสระ
