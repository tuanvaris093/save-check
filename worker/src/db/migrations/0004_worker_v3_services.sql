ALTER TABLE submissions ADD COLUMN data_version INTEGER NOT NULL DEFAULT 1 CHECK(data_version>=1);
ALTER TABLE assessment_files ADD COLUMN upload_idempotency_key TEXT;
ALTER TABLE assessment_files ADD COLUMN upload_request_hash TEXT;
CREATE UNIQUE INDEX idx_file_upload_key ON assessment_files(upload_idempotency_key) WHERE upload_idempotency_key IS NOT NULL;
CREATE TABLE submission_payload_versions (
 submission_id INTEGER NOT NULL REFERENCES submissions(id), version_no INTEGER NOT NULL CHECK(version_no>=1),
 operation TEXT NOT NULL CHECK(operation IN ('create','retest','correction','upgrade')),
 payload_json TEXT NOT NULL CHECK(json_valid(payload_json)), result_json TEXT NOT NULL CHECK(json_valid(result_json)),
 resolved_json TEXT NOT NULL CHECK(json_valid(resolved_json)), created_at TEXT NOT NULL,
 PRIMARY KEY(submission_id,version_no)
);
CREATE TRIGGER payload_version_guard BEFORE INSERT ON submission_payload_versions WHEN
 NEW.version_no<>(SELECT data_version FROM submissions WHERE id=NEW.submission_id)+CASE WHEN NEW.operation='create' THEN 0 ELSE 1 END
BEGIN SELECT RAISE(ABORT,'stale data version'); END;
CREATE TRIGGER payload_immutable_update BEFORE UPDATE ON submission_payload_versions BEGIN SELECT RAISE(ABORT,'payload history is immutable'); END;
CREATE TRIGGER payload_immutable_delete BEFORE DELETE ON submission_payload_versions BEGIN SELECT RAISE(ABORT,'payload history is immutable'); END;
CREATE TABLE legacy_file_mappings (
 revision_id TEXT PRIMARY KEY REFERENCES environment_revisions(id), file_id TEXT NOT NULL REFERENCES assessment_files(id), created_at TEXT NOT NULL
);
CREATE TRIGGER legacy_mapping_update BEFORE UPDATE ON legacy_file_mappings BEGIN SELECT RAISE(ABORT,'legacy file mapping is immutable'); END;
CREATE TRIGGER legacy_mapping_delete BEFORE DELETE ON legacy_file_mappings BEGIN SELECT RAISE(ABORT,'legacy file mapping is immutable'); END;
CREATE TABLE mutation_preconditions (
 token TEXT PRIMARY KEY, valid INTEGER NOT NULL CHECK(valid=1)
);
-- Supplement-backed promotion keeps the original legacy snapshot immutable. Passed
-- values may be adopted explicitly only with a recorded, validated original basis.
DROP TRIGGER carried_point_guard;
DROP TRIGGER carried_point_update_guard;
CREATE TRIGGER carried_point_guard BEFORE INSERT ON environment_revision_points WHEN NEW.observation_kind='carried' AND NOT EXISTS (
 SELECT 1 FROM environment_revision_points p JOIN environment_revisions source ON source.id=p.revision_id
 WHERE p.submission_id=NEW.submission_id AND p.revision_id=NEW.carried_from_revision_id AND p.point_key=NEW.point_key
 AND p.is_pass=1 AND NEW.is_pass=1 AND p.measured_at IS NEW.measured_at AND p.remark IS NEW.remark AND p.location_desc=NEW.location_desc AND p.category=NEW.category
 AND ((p.inputs_json=NEW.inputs_json AND p.standard_snapshot_json=NEW.standard_snapshot_json AND p.result_json IS NEW.result_json)
 OR (source.schema_version=1 AND EXISTS(SELECT 1 FROM environment_metadata_supplements s WHERE s.submission_id=NEW.submission_id AND s.base_revision_id=p.revision_id)
 AND EXISTS(SELECT 1 FROM environment_revisions target WHERE target.id=NEW.revision_id AND
 (target.kind='correction' OR EXISTS(SELECT 1 FROM environment_revision_points adopted
  WHERE adopted.revision_id=target.base_revision_id AND adopted.submission_id=NEW.submission_id
  AND adopted.point_key=NEW.point_key AND adopted.carried_from_revision_id=NEW.carried_from_revision_id AND adopted.is_pass=1
  AND adopted.inputs_json=NEW.inputs_json AND adopted.standard_snapshot_json=NEW.standard_snapshot_json
  AND adopted.result_json IS NEW.result_json AND adopted.measured_at IS NEW.measured_at)))))
)
BEGIN SELECT RAISE(ABORT,'carry must preserve a passed observation or audited legacy adoption'); END;
CREATE TRIGGER carried_point_update_guard BEFORE UPDATE ON environment_revision_points WHEN NEW.observation_kind='carried' AND NOT EXISTS (
 SELECT 1 FROM environment_revision_points p WHERE p.submission_id=NEW.submission_id AND p.revision_id=NEW.carried_from_revision_id AND p.point_key=NEW.point_key AND p.is_pass=1 AND NEW.is_pass=1
 AND p.inputs_json=NEW.inputs_json AND p.standard_snapshot_json=NEW.standard_snapshot_json AND p.result_json IS NEW.result_json AND p.measured_at IS NEW.measured_at AND p.remark IS NEW.remark AND p.location_desc=NEW.location_desc AND p.category=NEW.category
)
BEGIN SELECT RAISE(ABORT,'carry must preserve a passed observation'); END;
