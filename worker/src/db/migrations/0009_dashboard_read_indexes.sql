-- Additive only: assessment rows and historical snapshots remain unchanged.
-- Include the equality key before the existing UTC timestamp sort expression.
CREATE INDEX idx_submissions_current_created
ON submissions(schema_version, julianday(created_at), id)
WHERE schema_version=3;
-- Keep group-filtered reports selective without scanning the other group.
CREATE INDEX idx_submissions_current_group_created
ON submissions(schema_version, assessment_group, julianday(created_at), id)
WHERE schema_version=3;
