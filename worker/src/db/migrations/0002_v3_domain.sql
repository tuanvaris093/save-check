-- Additive v3 schema. 0001 is safe for both an empty DB and an existing legacy DB.
-- Apply through Wrangler's migration ledger; do not execute this file repeatedly.
ALTER TABLE submissions ADD COLUMN schema_version INTEGER NOT NULL DEFAULT 1 CHECK (schema_version IN (1,3));
ALTER TABLE submissions ADD COLUMN assessment_group TEXT NOT NULL DEFAULT 'unknown' CHECK (assessment_group IN ('environment','health','unknown'));
ALTER TABLE submissions ADD COLUMN questionnaire_version TEXT NOT NULL DEFAULT 'legacy-unknown';
ALTER TABLE submissions ADD COLUMN scoring_version TEXT NOT NULL DEFAULT 'legacy-unverified';
ALTER TABLE submissions ADD COLUMN archived_at TEXT;
ALTER TABLE submissions ADD COLUMN latest_revision_id TEXT REFERENCES environment_revisions(id);
UPDATE submissions SET assessment_group = CASE assessment_type WHEN 'environment' THEN 'environment' WHEN 'health_risk' THEN 'health' ELSE 'unknown' END;
ALTER TABLE respondent_work_infos ADD COLUMN program_code TEXT;
ALTER TABLE respondent_work_infos ADD COLUMN program_label TEXT;
ALTER TABLE respondent_work_infos ADD COLUMN program_version TEXT;
ALTER TABLE respondent_work_infos ADD COLUMN study_year INTEGER CHECK (study_year BETWEEN 1 AND 6);
ALTER TABLE respondent_work_infos ADD COLUMN other_context TEXT CHECK (other_context IN ('study','work'));
ALTER TABLE respondent_work_infos ADD COLUMN working_hours_per_week REAL CHECK (working_hours_per_week > 0 AND working_hours_per_week <= 168);
ALTER TABLE environment_inspections ADD COLUMN serial_number TEXT;
ALTER TABLE environment_inspections ADD COLUMN calibration_date TEXT;
ALTER TABLE environment_inspections ADD COLUMN responsible_department TEXT;
ALTER TABLE environment_inspections ADD COLUMN location_responsible_name TEXT;
ALTER TABLE health_risk_answers ADD COLUMN phase TEXT NOT NULL DEFAULT 'single' CHECK (phase IN ('single','before','after'));
ALTER TABLE health_risk_answers ADD COLUMN schema_version INTEGER NOT NULL DEFAULT 1 CHECK (schema_version IN (1,3));
ALTER TABLE health_risk_answers ADD COLUMN questionnaire_version TEXT NOT NULL DEFAULT 'legacy-unknown';
CREATE UNIQUE INDEX idx_health_v3_answer ON health_risk_answers(submission_id,phase,question_id) WHERE schema_version=3;
CREATE TRIGGER health_v3_answer_guard BEFORE INSERT ON health_risk_answers WHEN NEW.schema_version=3 AND
  (NEW.score NOT IN (0,1,2) OR NEW.question_text IS NULL OR length(trim(NEW.question_text))=0)
BEGIN SELECT RAISE(ABORT,'v3 health answer requires score and question snapshot'); END;
ALTER TABLE assessment_results ADD COLUMN result_json TEXT CHECK (result_json IS NULL OR json_valid(result_json));
ALTER TABLE assessment_results ADD COLUMN scoring_version TEXT NOT NULL DEFAULT 'legacy-unverified';
ALTER TABLE assessment_results ADD COLUMN result_origin TEXT NOT NULL DEFAULT 'legacy-cache' CHECK (result_origin IN ('legacy-cache','derived-legacy','server-v3'));

CREATE TABLE program_catalog (
  code TEXT PRIMARY KEY, label TEXT NOT NULL, qualification TEXT NOT NULL,
  catalog_version TEXT NOT NULL, CHECK (length(trim(label))>0)
);
INSERT INTO program_catalog VALUES
('program-01','หลักสูตรสาธารณสุขศาสตรบัณฑิต สาขาวิชาสาธารณสุขชุมชน','bachelor','programs-v3-2026-10-12'),
('program-02','หลักสูตรการแพทย์แผนไทยบัณฑิต สาขาวิชาการแพทย์แผนไทย','bachelor','programs-v3-2026-10-12'),
('program-03','หลักสูตรสาธารณสุขศาสตรบัณฑิต สาขาวิชาทันตสาธารณสุข','bachelor','programs-v3-2026-10-12'),
('program-04','หลักสูตรวิทยาศาสตรบัณฑิต สาขาวิชาอาชีวอนามัยและความปลอดภัย','bachelor','programs-v3-2026-10-12'),
('program-05','หลักสูตรวิทยาศาสตรบัณฑิต สาขาวิชาฉุกเฉินการแพทย์','bachelor','programs-v3-2026-10-12'),
('program-06','หลักสูตรประกาศนียบัตรวิชาชีพชั้นสูง สาขาวิชาเทคนิคเภสัชกรรม','higher-vocational','programs-v3-2026-10-12'),
('program-07','หลักสูตรประกาศนียบัตรวิชาชีพชั้นสูง สาขาวิชาปฏิบัติการฉุกเฉินการแพทย์','higher-vocational','programs-v3-2026-10-12');
CREATE TABLE health_contexts (
  submission_id INTEGER PRIMARY KEY REFERENCES submissions(id),
  hours_worked_today REAL CHECK (hours_worked_today BETWEEN 0 AND 24),
  noise_source_other TEXT,
  CHECK (noise_source_other IS NULL OR length(trim(noise_source_other))>0)
);
CREATE TABLE health_noise_sources (
  submission_id INTEGER NOT NULL REFERENCES health_contexts(submission_id),
  source_code TEXT NOT NULL CHECK (source_code IN ('announcement','college_activity','air_conditioner','laboratory','machine','traffic','construction','other','none')),
  PRIMARY KEY (submission_id,source_code)
);
CREATE TRIGGER noise_source_exclusive BEFORE INSERT ON health_noise_sources WHEN
  (NEW.source_code='none' AND EXISTS(SELECT 1 FROM health_noise_sources WHERE submission_id=NEW.submission_id)) OR
  (NEW.source_code<>'none' AND EXISTS(SELECT 1 FROM health_noise_sources WHERE submission_id=NEW.submission_id AND source_code='none'))
BEGIN SELECT RAISE(ABORT,'none is exclusive'); END;
CREATE TABLE satisfaction_metadata (
  submission_id INTEGER PRIMARY KEY REFERENCES submissions(id),
  suggestion TEXT, traditional_duration_seconds INTEGER CHECK (traditional_duration_seconds>0),
  safecheck_duration_seconds INTEGER CHECK (safecheck_duration_seconds>0),
  duration_source TEXT CHECK (duration_source='manual'),
  questionnaire_version TEXT NOT NULL,
  CHECK ((traditional_duration_seconds IS NULL AND safecheck_duration_seconds IS NULL AND duration_source IS NULL)
    OR (traditional_duration_seconds IS NOT NULL AND safecheck_duration_seconds IS NOT NULL AND duration_source='manual'))
);
CREATE TABLE assessment_files (
  id TEXT PRIMARY KEY, object_key TEXT NOT NULL UNIQUE, file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL CHECK (mime_type IN ('image/jpeg','image/png','image/webp','application/pdf')),
  byte_size INTEGER NOT NULL CHECK (byte_size>0 AND byte_size<=10485760),
  checksum_sha256 TEXT NOT NULL CHECK (length(checksum_sha256)=64),
  state TEXT NOT NULL CHECK (state IN ('staged','committed','orphan')),
  created_at TEXT NOT NULL, committed_at TEXT
);
CREATE TABLE environment_revisions (
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
  CHECK (schema_version<>3 OR (measured_at IS NOT NULL AND layout_file_id IS NOT NULL))
);
CREATE TABLE environment_revision_points (
  submission_id INTEGER NOT NULL, revision_id TEXT NOT NULL, point_key TEXT NOT NULL,
  point_order INTEGER NOT NULL CHECK (point_order>=1), category TEXT NOT NULL CHECK (category IN ('light','noise','heat')),
  location_desc TEXT NOT NULL, inputs_json TEXT NOT NULL CHECK (json_valid(inputs_json)),
  standard_snapshot_json TEXT NOT NULL CHECK (json_valid(standard_snapshot_json)),
  result_json TEXT CHECK (result_json IS NULL OR json_valid(result_json)), is_pass INTEGER CHECK(is_pass IN(0,1)),
  measured_at TEXT, observation_kind TEXT NOT NULL CHECK (observation_kind IN ('measured','carried','legacy')),
  carried_from_revision_id TEXT, legacy_point_id INTEGER, remark TEXT,
  PRIMARY KEY(revision_id,point_key), UNIQUE(submission_id,revision_id,point_key), UNIQUE(revision_id,point_order),
  FOREIGN KEY(submission_id,revision_id) REFERENCES environment_revisions(submission_id,id),
  FOREIGN KEY(submission_id,carried_from_revision_id,point_key) REFERENCES environment_revision_points(submission_id,revision_id,point_key),
  CHECK ((observation_kind='carried' AND carried_from_revision_id IS NOT NULL) OR (observation_kind<>'carried' AND carried_from_revision_id IS NULL)),
  CHECK (observation_kind='legacy' OR measured_at IS NOT NULL)
);
CREATE TABLE environment_revision_samples (
  revision_id TEXT NOT NULL, point_key TEXT NOT NULL, sample_key TEXT NOT NULL,
  sample_order INTEGER NOT NULL CHECK(sample_order>=1), values_json TEXT NOT NULL CHECK(json_valid(values_json)),
  PRIMARY KEY(revision_id,point_key,sample_key), UNIQUE(revision_id,point_key,sample_order),
  FOREIGN KEY(revision_id,point_key) REFERENCES environment_revision_points(revision_id,point_key)
);
CREATE TABLE environment_metadata_supplements (
  id TEXT PRIMARY KEY, submission_id INTEGER NOT NULL UNIQUE REFERENCES submissions(id),
  base_revision_id TEXT NOT NULL, supplement_json TEXT NOT NULL CHECK(json_valid(supplement_json)),
  created_at TEXT NOT NULL, actor_reference TEXT,
  FOREIGN KEY(submission_id,base_revision_id) REFERENCES environment_revisions(submission_id,id)
);
CREATE TABLE assessment_audit_events (
  id TEXT PRIMARY KEY, submission_id INTEGER NOT NULL REFERENCES submissions(id), revision_id TEXT,
  action TEXT NOT NULL CHECK(action IN ('supplement','correction','archive','restore')),
  before_json TEXT CHECK(before_json IS NULL OR json_valid(before_json)),
  after_json TEXT CHECK(after_json IS NULL OR json_valid(after_json)),
  reason TEXT NOT NULL CHECK(length(trim(reason))>0), actor_reference TEXT, created_at TEXT NOT NULL,
  FOREIGN KEY(submission_id,revision_id) REFERENCES environment_revisions(submission_id,id)
);
CREATE TABLE mutation_requests (
  scope TEXT NOT NULL, idempotency_key TEXT NOT NULL, request_hash TEXT NOT NULL,
  submission_id INTEGER REFERENCES submissions(id), revision_id TEXT REFERENCES environment_revisions(id),
  response_json TEXT NOT NULL CHECK(json_valid(response_json)), created_at TEXT NOT NULL,
  PRIMARY KEY(scope,idempotency_key), CHECK(length(request_hash)=64)
);
CREATE INDEX idx_submissions_group_archive ON submissions(assessment_group,archived_at,created_at);
CREATE INDEX idx_revisions_submission ON environment_revisions(submission_id,revision_no DESC);
CREATE INDEX idx_files_state ON assessment_files(state,created_at);
CREATE INDEX idx_audit_submission ON assessment_audit_events(submission_id,created_at);
CREATE TRIGGER latest_revision_ownership BEFORE UPDATE OF latest_revision_id ON submissions
WHEN NEW.latest_revision_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM environment_revisions WHERE id=NEW.latest_revision_id AND submission_id=NEW.id AND status='finalized')
BEGIN SELECT RAISE(ABORT,'latest revision must be finalized and belong to this submission'); END;
CREATE TRIGGER revision_parent_guard BEFORE INSERT ON environment_revisions WHEN NEW.base_revision_id IS NOT NULL AND NOT EXISTS
 (SELECT 1 FROM environment_revisions r JOIN submissions s ON s.id=r.submission_id WHERE r.id=NEW.base_revision_id AND r.submission_id=NEW.submission_id AND r.status='finalized' AND r.revision_no=NEW.revision_no-1 AND s.latest_revision_id=r.id AND s.archived_at IS NULL)
BEGIN SELECT RAISE(ABORT,'stale or archived revision base'); END;
CREATE TRIGGER revision_immutable_update BEFORE UPDATE ON environment_revisions WHEN OLD.status='finalized'
BEGIN SELECT RAISE(ABORT,'finalized revision is immutable'); END;
CREATE TRIGGER revision_immutable_delete BEFORE DELETE ON environment_revisions
BEGIN SELECT RAISE(ABORT,'archive submission instead of deleting revision history'); END;
CREATE TRIGGER point_finalized_insert BEFORE INSERT ON environment_revision_points WHEN EXISTS(SELECT 1 FROM environment_revisions WHERE id=NEW.revision_id AND status='finalized')
BEGIN SELECT RAISE(ABORT,'finalized points are immutable'); END;
CREATE TRIGGER point_finalized_update BEFORE UPDATE ON environment_revision_points WHEN EXISTS(SELECT 1 FROM environment_revisions WHERE id=OLD.revision_id AND status='finalized') OR EXISTS(SELECT 1 FROM environment_revisions WHERE id=NEW.revision_id AND status='finalized')
BEGIN SELECT RAISE(ABORT,'finalized points are immutable'); END;
CREATE TRIGGER point_finalized_delete BEFORE DELETE ON environment_revision_points WHEN EXISTS(SELECT 1 FROM environment_revisions WHERE id=OLD.revision_id AND status='finalized')
BEGIN SELECT RAISE(ABORT,'finalized points are immutable'); END;
CREATE TRIGGER sample_finalized_insert BEFORE INSERT ON environment_revision_samples WHEN EXISTS(SELECT 1 FROM environment_revisions WHERE id=NEW.revision_id AND status='finalized')
BEGIN SELECT RAISE(ABORT,'finalized samples are immutable'); END;
CREATE TRIGGER sample_finalized_update BEFORE UPDATE ON environment_revision_samples WHEN EXISTS(SELECT 1 FROM environment_revisions WHERE id=OLD.revision_id AND status='finalized') OR EXISTS(SELECT 1 FROM environment_revisions WHERE id=NEW.revision_id AND status='finalized')
BEGIN SELECT RAISE(ABORT,'finalized samples are immutable'); END;
CREATE TRIGGER sample_finalized_delete BEFORE DELETE ON environment_revision_samples WHEN EXISTS(SELECT 1 FROM environment_revisions WHERE id=OLD.revision_id AND status='finalized')
BEGIN SELECT RAISE(ABORT,'finalized samples are immutable'); END;
CREATE TRIGGER supplement_immutable_update BEFORE UPDATE ON environment_metadata_supplements BEGIN SELECT RAISE(ABORT,'supplement is immutable'); END;
CREATE TRIGGER supplement_immutable_delete BEFORE DELETE ON environment_metadata_supplements BEGIN SELECT RAISE(ABORT,'supplement is immutable'); END;
CREATE TRIGGER audit_immutable_update BEFORE UPDATE ON assessment_audit_events BEGIN SELECT RAISE(ABORT,'audit event is immutable'); END;
CREATE TRIGGER audit_immutable_delete BEFORE DELETE ON assessment_audit_events BEGIN SELECT RAISE(ABORT,'audit event is immutable'); END;

CREATE TABLE legacy_layout_snapshots (
 revision_id TEXT PRIMARY KEY REFERENCES environment_revisions(id),
 file_name TEXT, file_type TEXT, file_size INTEGER, file_data TEXT,
 has_layout INTEGER NOT NULL CHECK(has_layout IN(0,1))
);
CREATE TRIGGER legacy_layout_update BEFORE UPDATE ON legacy_layout_snapshots BEGIN SELECT RAISE(ABORT,'legacy layout snapshot is immutable'); END;
CREATE TRIGGER legacy_layout_delete BEFORE DELETE ON legacy_layout_snapshots BEGIN SELECT RAISE(ABORT,'legacy layout snapshot is immutable'); END;
CREATE TRIGGER latest_revision_insert BEFORE INSERT ON submissions
WHEN NEW.latest_revision_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM environment_revisions WHERE id=NEW.latest_revision_id AND submission_id=NEW.id AND status='finalized')
BEGIN SELECT RAISE(ABORT,'latest revision must belong to the new submission'); END;

CREATE TRIGGER carried_point_guard BEFORE INSERT ON environment_revision_points
WHEN NEW.observation_kind='carried' AND NOT EXISTS (
 SELECT 1 FROM environment_revision_points p
 WHERE p.submission_id=NEW.submission_id AND p.revision_id=NEW.carried_from_revision_id AND p.point_key=NEW.point_key
 AND p.is_pass=1 AND NEW.is_pass=1
 AND p.inputs_json=NEW.inputs_json AND p.standard_snapshot_json=NEW.standard_snapshot_json
 AND p.result_json IS NEW.result_json AND p.measured_at IS NEW.measured_at
 AND p.remark IS NEW.remark AND p.location_desc=NEW.location_desc AND p.category=NEW.category
)
BEGIN SELECT RAISE(ABORT,'carry must preserve a passed observation'); END;
CREATE TRIGGER v3_finalize_guard BEFORE UPDATE OF status ON environment_revisions
WHEN NEW.status='finalized' AND NEW.schema_version=3 AND (
 NEW.is_pass IS NULL OR NEW.result_json IS NULL
 OR NOT EXISTS(SELECT 1 FROM assessment_files f WHERE f.id=NEW.layout_file_id AND f.state='committed')
 OR NOT EXISTS(SELECT 1 FROM environment_revision_points p WHERE p.revision_id=NEW.id)
 OR EXISTS(SELECT 1 FROM environment_revision_points p WHERE p.revision_id=NEW.id AND (p.is_pass IS NULL OR p.result_json IS NULL OR p.observation_kind='legacy'))
 OR NEW.is_pass<>(SELECT min(is_pass) FROM environment_revision_points WHERE revision_id=NEW.id)
)
BEGIN SELECT RAISE(ABORT,'v3 revision must have committed file and complete evaluated points'); END;
CREATE TRIGGER committed_file_update BEFORE UPDATE ON assessment_files WHEN OLD.state='committed'
BEGIN SELECT RAISE(ABORT,'committed file metadata is immutable'); END;
CREATE TRIGGER committed_file_delete BEFORE DELETE ON assessment_files WHEN OLD.state='committed'
BEGIN SELECT RAISE(ABORT,'committed file must remain available to history'); END;
CREATE TRIGGER latest_revision_no_rewind BEFORE UPDATE OF latest_revision_id ON submissions
WHEN OLD.latest_revision_id IS NOT NULL AND (NEW.latest_revision_id IS NULL OR
 (NEW.latest_revision_id<>OLD.latest_revision_id AND
  (SELECT revision_no FROM environment_revisions WHERE id=NEW.latest_revision_id)<=(SELECT revision_no FROM environment_revisions WHERE id=OLD.latest_revision_id)))
BEGIN SELECT RAISE(ABORT,'latest revision cannot be rewound'); END;
CREATE TRIGGER carried_point_update_guard BEFORE UPDATE ON environment_revision_points
WHEN NEW.observation_kind='carried' AND NOT EXISTS (
 SELECT 1 FROM environment_revision_points p
 WHERE p.submission_id=NEW.submission_id AND p.revision_id=NEW.carried_from_revision_id AND p.point_key=NEW.point_key
 AND p.is_pass=1 AND NEW.is_pass=1
 AND p.inputs_json=NEW.inputs_json AND p.standard_snapshot_json=NEW.standard_snapshot_json
 AND p.result_json IS NEW.result_json AND p.measured_at IS NEW.measured_at
 AND p.remark IS NEW.remark AND p.location_desc=NEW.location_desc AND p.category=NEW.category
)
BEGIN SELECT RAISE(ABORT,'carry must preserve a passed observation'); END;
