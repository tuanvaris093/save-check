-- ============================================
-- SafeCheck Database Schema (Cloudflare D1 / SQLite)
-- ============================================

-- 1. Submissions Header Table
CREATE TABLE IF NOT EXISTS submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_code TEXT NOT NULL UNIQUE,
  assessment_type TEXT NOT NULL,         -- 'environment' | 'health_risk' | 'satisfaction'
  assessment_category TEXT NOT NULL,     -- 'light' | 'noise' | 'heat' | 'general'
  status TEXT NOT NULL DEFAULT 'completed', -- 'draft' | 'completed'
  overall_score REAL,
  overall_level TEXT,                   -- 'pass' | 'medium' | 'high_risk'
  has_layout INTEGER NOT NULL DEFAULT 0, -- 0 = false, 1 = true
  layout_file_name TEXT,
  layout_file_type TEXT,
  layout_file_size INTEGER,
  layout_file_data TEXT,                -- Base64 data or Cloudflare R2 URL
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_submissions_code ON submissions(submission_code);
CREATE INDEX IF NOT EXISTS idx_submissions_type ON submissions(assessment_type);
CREATE INDEX IF NOT EXISTS idx_submissions_category ON submissions(assessment_category);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON submissions(created_at DESC);

-- 2. Respondent Personal Profiles
CREATE TABLE IF NOT EXISTS respondent_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id INTEGER NOT NULL,
  full_name TEXT,
  gender TEXT,                          -- 'male' | 'female' | 'other'
  age INTEGER,
  weight REAL,
  height REAL,
  education_level TEXT,
  marital_status TEXT,
  has_underlying_disease INTEGER DEFAULT 0,
  underlying_disease_details TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_profiles_submission ON respondent_profiles(submission_id);

-- 3. Respondent Work Information
CREATE TABLE IF NOT EXISTS respondent_work_infos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id INTEGER NOT NULL,
  position_type TEXT,
  department TEXT,
  position TEXT,
  work_experience_years REAL,
  working_hours_per_day REAL,
  working_days_per_week REAL,
  work_area TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_work_infos_submission ON respondent_work_infos(submission_id);

-- 4. Environment Inspections Metadata
CREATE TABLE IF NOT EXISTS environment_inspections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id INTEGER NOT NULL,
  inspector_name TEXT NOT NULL,
  position TEXT,
  inspection_location TEXT NOT NULL,
  inspection_date TEXT NOT NULL,
  equipment TEXT,
  measurement_technique TEXT,
  start_time TEXT,
  end_time TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_inspections_submission ON environment_inspections(submission_id);

-- 5. Environment Measurement Points (Light / Noise / Heat Points)
CREATE TABLE IF NOT EXISTS environment_measurement_points (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id INTEGER NOT NULL,
  category TEXT NOT NULL,               -- 'light' | 'noise' | 'heat'
  point_no INTEGER NOT NULL,
  location_desc TEXT NOT NULL,
  measure_value REAL,                   -- Light measure (Lux), Noise avg (dBA), Heat avg (WBGT)
  min_value REAL,                       -- Noise min dBA
  max_value REAL,                       -- Noise max dBA
  standard_value REAL,                  -- Standard threshold value
  standard_display TEXT,                -- Display string for standard
  workload TEXT,                        -- Heat workload ('light', 'medium', 'heavy')
  temp_db REAL,                         -- Heat Dry Bulb (°C)
  temp_wb REAL,                         -- Heat Wet Bulb (°C)
  temp_gt REAL,                         -- Heat Globe Temp (°C)
  temp_wbgt REAL,                       -- Calculated WBGT (°C)
  wbgt_type TEXT,                       -- 'in' or 'out'
  start_time TEXT,
  end_time TEXT,
  total_time TEXT,
  is_pass INTEGER NOT NULL DEFAULT 1,   -- 1 = true, 0 = false
  remark TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_measurement_points_sub ON environment_measurement_points(submission_id);

-- 6. Health Risk Questionnaire Answers (10 questions per submission)
CREATE TABLE IF NOT EXISTS health_risk_answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id INTEGER NOT NULL,
  category TEXT NOT NULL,               -- 'light' | 'noise' | 'heat'
  question_id TEXT NOT NULL,            -- 'q1', 'q2', ... 'q10'
  question_no INTEGER,
  question_text TEXT,
  score INTEGER NOT NULL,               -- 0: ไม่เคย, 1: บางครั้ง, 2: เป็นประจำ
  created_at TEXT NOT NULL,
  FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_hr_answers_submission ON health_risk_answers(submission_id);

-- 7. Satisfaction Assessment Answers
CREATE TABLE IF NOT EXISTS satisfaction_answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id INTEGER NOT NULL,
  question_id TEXT,                     -- 'q1' ... 'q10'
  category TEXT,                        -- 'accuracy' | 'design' | 'usability' | 'usefulness'
  rating INTEGER,                       -- 1 - 5
  suggestion TEXT,                      -- Free text comment
  created_at TEXT NOT NULL,
  FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_satisfaction_sub ON satisfaction_answers(submission_id);

-- 8. Assessment Results & Evaluation Cache
CREATE TABLE IF NOT EXISTS assessment_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id INTEGER NOT NULL UNIQUE,
  assessment_type TEXT NOT NULL,
  assessment_category TEXT NOT NULL,
  total_score REAL,
  risk_level TEXT,                      -- 'pass' | 'medium' | 'high_risk'
  calculated_value REAL,                -- Average Lux, average dBA, average WBGT
  is_pass INTEGER,                      -- 1 = pass, 0 = fail
  message TEXT,
  recommendations_json TEXT,            -- JSON array of recommendations
  created_at TEXT NOT NULL,
  FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_results_sub ON assessment_results(submission_id);
