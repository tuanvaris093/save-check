-- Synthetic missing-data records, inserted only before local fixture migration.
INSERT INTO submissions(submission_code,assessment_type,assessment_category,status,overall_score,overall_level,created_at,updated_at)
VALUES ('P8-LEGACY-EMPTY-ENV','environment','heat','completed',NULL,NULL,'2020-01-01','2020-01-01'),
       ('P8-LEGACY-EMPTY-HEALTH','health_risk','light','completed',NULL,NULL,'2020-01-01','2020-01-01');
