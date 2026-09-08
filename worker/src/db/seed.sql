-- ============================================
-- SafeCheck Seed Data for Cloudflare D1
-- ============================================

-- 1. Sample Environment - Light Assessment (Passed)
INSERT OR REPLACE INTO submissions (
  id, submission_code, assessment_type, assessment_category, status,
  overall_score, overall_level, has_layout, layout_file_name,
  started_at, completed_at, created_at, updated_at
) VALUES (
  1, 'SUB-20260901-1001', 'environment', 'light', 'completed',
  NULL, 'pass', 0, NULL,
  '2026-09-01T09:00:00.000Z', '2026-09-01T09:45:00.000Z',
  '2026-09-01T09:45:00.000Z', '2026-09-01T09:45:00.000Z'
);

INSERT OR REPLACE INTO environment_inspections (
  submission_id, inspector_name, position, inspection_location,
  inspection_date, equipment, measurement_technique, start_time, end_time, created_at
) VALUES (
  1, 'นายสมศักดิ์ ชัยชนะ', 'จป.วิชาชีพ', 'ห้องปฏิบัติการคอมพิวเตอร์ 1 อาคาร 3',
  '2026-09-01', 'Lux Meter รุ่น Testo 540', 'วัดระดับความสว่างบนระนาบการทำงาน',
  '09:00', '09:45', '2026-09-01T09:45:00.000Z'
);

INSERT OR REPLACE INTO environment_measurement_points (
  submission_id, category, point_no, location_desc, measure_value,
  standard_value, standard_display, is_pass, remark, created_at
) VALUES
(1, 'light', 1, 'โต๊ะปฏิบัติการ 1 (ติดหน้าต่าง)', 540.0, 400.0, '400', 1, 'แสงธรรมชาติผสมหลอดไฟเพียงพอ', '2026-09-01T09:45:00.000Z'),
(1, 'light', 2, 'โต๊ะปฏิบัติการ 2 (กลางห้อง)', 480.0, 400.0, '400', 1, 'แสงสว่างทั่วถึง', '2026-09-01T09:45:00.000Z'),
(1, 'light', 3, 'โต๊ะอาจารย์ผู้สอน (หน้าห้อง)', 495.0, 400.0, '400', 1, 'แสงสว่างผ่านเกณฑ์', '2026-09-01T09:45:00.000Z');

INSERT OR REPLACE INTO assessment_results (
  submission_id, assessment_type, assessment_category, total_score,
  risk_level, calculated_value, is_pass, message, created_at
) VALUES (
  1, 'environment', 'light', NULL,
  'pass', 505.0, 1,
  'ระดับแสงสว่างทุกจุดตรวจวัดผ่านเกณฑ์มาตรฐาน ควรรักษาระดับแสงสว่างให้เพียงพออย่างต่อเนื่อง',
  '2026-09-01T09:45:00.000Z'
);

-- 2. Sample Environment - Noise Assessment (Failed 1 point)
INSERT OR REPLACE INTO submissions (
  id, submission_code, assessment_type, assessment_category, status,
  overall_score, overall_level, has_layout, layout_file_name,
  started_at, completed_at, created_at, updated_at
) VALUES (
  2, 'SUB-20260902-2002', 'environment', 'noise', 'completed',
  NULL, 'high_risk', 0, NULL,
  '2026-09-02T13:30:00.000Z', '2026-09-02T14:15:00.000Z',
  '2026-09-02T14:15:00.000Z', '2026-09-02T14:15:00.000Z'
);

INSERT OR REPLACE INTO environment_inspections (
  submission_id, inspector_name, position, inspection_location,
  inspection_date, equipment, measurement_technique, start_time, end_time, created_at
) VALUES (
  2, 'นางสาวกานดา สุขใจ', 'เจ้าหน้าที่ความปลอดภัย', 'โรงประลองช่างกลและเชื่อมโลหะ',
  '2026-09-02', 'Sound Level Meter Type 2', 'วัดระดับเสียงเฉลี่ย Leq',
  '13:30', '14:15', '2026-09-02T14:15:00.000Z'
);

INSERT OR REPLACE INTO environment_measurement_points (
  submission_id, category, point_no, location_desc, measure_value,
  min_value, max_value, standard_value, standard_display, is_pass, remark, created_at
) VALUES
(2, 'noise', 1, 'จุดแท่นตัดเหล็ก', 89.5, 78.0, 94.0, 85.0, '85', 0, 'เสียงเครื่องจักรตัดเหล็กเกินมาตรฐาน ควรใส่ที่ครอบหู', '2026-09-02T14:15:00.000Z'),
(2, 'noise', 2, 'โต๊ะเตรียมงานและเขียนแบบ', 72.4, 65.0, 78.0, 85.0, '85', 1, 'อยู่ในเกณฑ์ปกติ', '2026-09-02T14:15:00.000Z');

INSERT OR REPLACE INTO assessment_results (
  submission_id, assessment_type, assessment_category, total_score,
  risk_level, calculated_value, is_pass, message, created_at
) VALUES (
  2, 'environment', 'noise', NULL,
  'high_risk', 80.95, 0,
  'ระดับเสียงภาพรวมเกินมาตรฐานที่กำหนด ควรจัดหาอุปกรณ์ป้องกันเสียง (PPE) ให้พนักงานหรือลดแหล่งกำเนิดเสียง',
  '2026-09-02T14:15:00.000Z'
);

-- 3. Sample Health Risk - Light Assessment (Medium Risk)
INSERT OR REPLACE INTO submissions (
  id, submission_code, assessment_type, assessment_category, status,
  overall_score, overall_level, has_layout, layout_file_name,
  started_at, completed_at, created_at, updated_at
) VALUES (
  3, 'SUB-20260903-3003', 'health_risk', 'light', 'completed',
  8.0, 'medium', 0, NULL,
  '2026-09-03T10:00:00.000Z', '2026-09-03T10:12:00.000Z',
  '2026-09-03T10:12:00.000Z', '2026-09-03T10:12:00.000Z'
);

INSERT OR REPLACE INTO respondent_profiles (
  submission_id, full_name, gender, age, weight, height,
  has_underlying_disease, underlying_disease_details, created_at
) VALUES (
  3, 'นายธีรพัฒน์ วงศ์สว่าง', 'male', 24, 68.0, 175.0,
  0, NULL, '2026-09-03T10:12:00.000Z'
);

INSERT OR REPLACE INTO respondent_work_infos (
  submission_id, position_type, department, position,
  work_experience_years, working_hours_per_day, working_days_per_week, created_at
) VALUES (
  3, 'เจ้าหน้าที่สายวิชาการ', 'สาขาเทคโนโลยีสารสนเทศ', 'นักวิชาการคอมพิวเตอร์',
  2.5, 8.0, 5.0, '2026-09-03T10:12:00.000Z'
);

INSERT OR REPLACE INTO health_risk_answers (
  submission_id, category, question_id, question_no, score, created_at
) VALUES
(3, 'light', 'q1', 1, 1, '2026-09-03T10:12:00.000Z'),
(3, 'light', 'q2', 2, 1, '2026-09-03T10:12:00.000Z'),
(3, 'light', 'q3', 3, 1, '2026-09-03T10:12:00.000Z'),
(3, 'light', 'q4', 4, 1, '2026-09-03T10:12:00.000Z'),
(3, 'light', 'q5', 5, 0, '2026-09-03T10:12:00.000Z'),
(3, 'light', 'q6', 6, 1, '2026-09-03T10:12:00.000Z'),
(3, 'light', 'q7', 7, 0, '2026-09-03T10:12:00.000Z'),
(3, 'light', 'q8', 8, 1, '2026-09-03T10:12:00.000Z'),
(3, 'light', 'q9', 9, 1, '2026-09-03T10:12:00.000Z'),
(3, 'light', 'q10', 10, 1, '2026-09-03T10:12:00.000Z');

-- 4. Sample Satisfaction Assessment
INSERT OR REPLACE INTO submissions (
  id, submission_code, assessment_type, assessment_category, status,
  overall_score, overall_level, has_layout, layout_file_name,
  started_at, completed_at, created_at, updated_at
) VALUES (
  4, 'SUB-20260904-4004', 'satisfaction', 'general', 'completed',
  4.8, 'pass', 0, NULL,
  '2026-09-04T15:00:00.000Z', '2026-09-04T15:06:00.000Z',
  '2026-09-04T15:06:00.000Z', '2026-09-04T15:06:00.000Z'
);

INSERT OR REPLACE INTO satisfaction_answers (
  submission_id, question_id, category, rating, suggestion, created_at
) VALUES
(4, 'q1', 'accuracy', 5, NULL, '2026-09-04T15:06:00.000Z'),
(4, 'q2', 'accuracy', 5, NULL, '2026-09-04T15:06:00.000Z'),
(4, 'q3', 'design', 5, NULL, '2026-09-04T15:06:00.000Z'),
(4, 'q4', 'design', 4, NULL, '2026-09-04T15:06:00.000Z'),
(4, 'q5', 'usability', 5, NULL, '2026-09-04T15:06:00.000Z'),
(4, 'q6', 'usability', 5, NULL, '2026-09-04T15:06:00.000Z'),
(4, 'q7', 'usefulness', 5, NULL, '2026-09-04T15:06:00.000Z'),
(4, 'q8', 'usefulness', 5, 'ระบบใช้งานง่ายและสะดวกมากสำหรับการเก็บข้อมูลตรวจวัดหน้างาน', '2026-09-04T15:06:00.000Z');
