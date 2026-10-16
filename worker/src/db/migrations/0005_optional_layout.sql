-- Optional floor plans: copy every revision unchanged, retain ownership/history guards.
-- D1 runs migrations transactionally; defer FK validation until the copied table
-- has replaced the original. No referencing table uses ON DELETE CASCADE.
-- https://developers.cloudflare.com/d1/sql-api/foreign-keys/
PRAGMA defer_foreign_keys = ON;
DROP TRIGGER carried_point_guard;
DROP TRIGGER latest_revision_insert;
DROP TRIGGER latest_revision_no_rewind;
DROP TRIGGER latest_revision_ownership;
DROP TRIGGER point_finalized_delete;
DROP TRIGGER point_finalized_insert;
DROP TRIGGER point_finalized_update;
DROP TRIGGER revision_immutable_delete;
DROP TRIGGER revision_immutable_update;
DROP TRIGGER revision_parent_guard;
DROP TRIGGER sample_finalized_delete;
DROP TRIGGER sample_finalized_insert;
DROP TRIGGER sample_finalized_update;
DROP TRIGGER v3_finalize_guard;

CREATE TABLE environment_revisions_optional_layout (
  id TEXT PRIMARY KEY, submission_id INTEGER NOT NULL REFERENCES submissions(id),
  revision_no INTEGER NOT NULL CHECK (revision_no>=1), base_revision_id TEXT,
  schema_version INTEGER NOT NULL CHECK (schema_version IN (1,3)),
  kind TEXT NOT NULL CHECK (kind IN ('initial','retest','correction','legacy')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','finalized')),
  inspection_snapshot_json TEXT NOT NULL CHECK (json_valid(inspection_snapshot_json)),
  result_json TEXT CHECK (result_json IS NULL OR json_valid(result_json)),
  scoring_version TEXT NOT NULL, standard_version TEXT NOT NULL,
  result_origin TEXT NOT NULL CHECK (result_origin IN ('legacy-cache','derived-legacy','server-v3','unknown-legacy')),
  layout_file_id TEXT REFERENCES assessment_files(id),
  legacy_layout_pending INTEGER NOT NULL DEFAULT 0 CHECK (legacy_layout_pending IN (0,1)),
  measured_at TEXT, created_at TEXT NOT NULL, is_pass INTEGER CHECK (is_pass IN (0,1)),
  correction_reason TEXT,
  UNIQUE (submission_id,revision_no), UNIQUE(submission_id,id), UNIQUE (submission_id,base_revision_id),
  FOREIGN KEY(submission_id,base_revision_id) REFERENCES environment_revisions(submission_id,id),
  CHECK ((revision_no=1 AND base_revision_id IS NULL) OR (revision_no>1 AND base_revision_id IS NOT NULL)),
  CHECK (kind<>'correction' OR (correction_reason IS NOT NULL AND length(trim(correction_reason))>0)),
  CHECK (schema_version<>3 OR measured_at IS NOT NULL)
);
INSERT INTO environment_revisions_optional_layout SELECT * FROM environment_revisions;
DROP TABLE environment_revisions;
ALTER TABLE environment_revisions_optional_layout RENAME TO environment_revisions;
CREATE INDEX idx_revisions_submission ON environment_revisions(submission_id,revision_no DESC);

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
CREATE TRIGGER latest_revision_insert BEFORE INSERT ON submissions
WHEN NEW.latest_revision_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM environment_revisions WHERE id=NEW.latest_revision_id AND submission_id=NEW.id AND status='finalized')
BEGIN SELECT RAISE(ABORT,'latest revision must belong to the new submission'); END;
CREATE TRIGGER latest_revision_no_rewind BEFORE UPDATE OF latest_revision_id ON submissions
WHEN OLD.latest_revision_id IS NOT NULL AND (NEW.latest_revision_id IS NULL OR
 (NEW.latest_revision_id<>OLD.latest_revision_id AND
  (SELECT revision_no FROM environment_revisions WHERE id=NEW.latest_revision_id)<=(SELECT revision_no FROM environment_revisions WHERE id=OLD.latest_revision_id)))
BEGIN SELECT RAISE(ABORT,'latest revision cannot be rewound'); END;
CREATE TRIGGER latest_revision_ownership BEFORE UPDATE OF latest_revision_id ON submissions
WHEN NEW.latest_revision_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM environment_revisions WHERE id=NEW.latest_revision_id AND submission_id=NEW.id AND status='finalized')
BEGIN SELECT RAISE(ABORT,'latest revision must be finalized and belong to this submission'); END;
CREATE TRIGGER point_finalized_delete BEFORE DELETE ON environment_revision_points WHEN EXISTS(SELECT 1 FROM environment_revisions WHERE id=OLD.revision_id AND status='finalized')
BEGIN SELECT RAISE(ABORT,'finalized points are immutable'); END;
CREATE TRIGGER point_finalized_insert BEFORE INSERT ON environment_revision_points WHEN EXISTS(SELECT 1 FROM environment_revisions WHERE id=NEW.revision_id AND status='finalized')
BEGIN SELECT RAISE(ABORT,'finalized points are immutable'); END;
CREATE TRIGGER point_finalized_update BEFORE UPDATE ON environment_revision_points WHEN EXISTS(SELECT 1 FROM environment_revisions WHERE id=OLD.revision_id AND status='finalized') OR EXISTS(SELECT 1 FROM environment_revisions WHERE id=NEW.revision_id AND status='finalized')
BEGIN SELECT RAISE(ABORT,'finalized points are immutable'); END;
CREATE TRIGGER revision_immutable_delete BEFORE DELETE ON environment_revisions
BEGIN SELECT RAISE(ABORT,'archive submission instead of deleting revision history'); END;
CREATE TRIGGER revision_immutable_update BEFORE UPDATE ON environment_revisions WHEN OLD.status='finalized'
BEGIN SELECT RAISE(ABORT,'finalized revision is immutable'); END;
CREATE TRIGGER revision_parent_guard BEFORE INSERT ON environment_revisions WHEN NEW.base_revision_id IS NOT NULL AND NOT EXISTS
 (SELECT 1 FROM environment_revisions r JOIN submissions s ON s.id=r.submission_id WHERE r.id=NEW.base_revision_id AND r.submission_id=NEW.submission_id AND r.status='finalized' AND r.revision_no=NEW.revision_no-1 AND s.latest_revision_id=r.id AND s.archived_at IS NULL)
BEGIN SELECT RAISE(ABORT,'stale or archived revision base'); END;
CREATE TRIGGER sample_finalized_delete BEFORE DELETE ON environment_revision_samples WHEN EXISTS(SELECT 1 FROM environment_revisions WHERE id=OLD.revision_id AND status='finalized')
BEGIN SELECT RAISE(ABORT,'finalized samples are immutable'); END;
CREATE TRIGGER sample_finalized_insert BEFORE INSERT ON environment_revision_samples WHEN EXISTS(SELECT 1 FROM environment_revisions WHERE id=NEW.revision_id AND status='finalized')
BEGIN SELECT RAISE(ABORT,'finalized samples are immutable'); END;
CREATE TRIGGER sample_finalized_update BEFORE UPDATE ON environment_revision_samples WHEN EXISTS(SELECT 1 FROM environment_revisions WHERE id=OLD.revision_id AND status='finalized') OR EXISTS(SELECT 1 FROM environment_revisions WHERE id=NEW.revision_id AND status='finalized')
BEGIN SELECT RAISE(ABORT,'finalized samples are immutable'); END;
CREATE TRIGGER v3_finalize_guard BEFORE UPDATE OF status ON environment_revisions
WHEN NEW.status='finalized' AND NEW.schema_version=3 AND (
 NEW.is_pass IS NULL OR NEW.result_json IS NULL
 OR (NEW.layout_file_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM assessment_files f WHERE f.id=NEW.layout_file_id AND f.state='committed'))
 OR NOT EXISTS(SELECT 1 FROM environment_revision_points p WHERE p.revision_id=NEW.id)
 OR EXISTS(SELECT 1 FROM environment_revision_points p WHERE p.revision_id=NEW.id AND (p.is_pass IS NULL OR p.result_json IS NULL OR p.observation_kind='legacy'))
 OR NEW.is_pass<>(SELECT min(is_pass) FROM environment_revision_points WHERE revision_id=NEW.id)
)
BEGIN SELECT RAISE(ABORT,'v3 revision must have committed file and complete evaluated points'); END;

PRAGMA defer_foreign_keys = OFF;
