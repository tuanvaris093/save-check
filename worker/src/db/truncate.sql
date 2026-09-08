-- ========================================================
-- SafeCheck: Truncate / Clear all data from D1 Database
-- (Retains all tables, schemas, and indexes)
-- ========================================================

PRAGMA foreign_keys = OFF;

DELETE FROM assessment_results;
DELETE FROM environment_measurement_points;
DELETE FROM environment_inspections;
DELETE FROM health_risk_answers;
DELETE FROM satisfaction_answers;
DELETE FROM respondent_work_infos;
DELETE FROM respondent_profiles;
DELETE FROM submissions;

-- Reset Auto-Increment IDs back to 1
DELETE FROM sqlite_sequence WHERE name IN (
  'submissions',
  'respondent_profiles',
  'respondent_work_infos',
  'environment_inspections',
  'environment_measurement_points',
  'health_risk_answers',
  'satisfaction_answers',
  'assessment_results'
);

PRAGMA foreign_keys = ON;
