-- Unfinished health assessments are separate from scored submissions.
CREATE TABLE health_light_drafts (
  id TEXT PRIMARY KEY,
  version INTEGER NOT NULL CHECK(version >= 1),
  payload_json TEXT NOT NULL CHECK(json_valid(payload_json)),
  payload_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX health_light_drafts_updated ON health_light_drafts(updated_at DESC, id);
CREATE TRIGGER health_pending_insert_guard BEFORE INSERT ON health_light_drafts
WHEN EXISTS(SELECT 1 FROM mutation_requests WHERE scope='create' AND idempotency_key=NEW.id)
BEGIN SELECT RAISE(ABORT,'health draft stale'); END;
CREATE TABLE health_light_draft_completions (
  draft_id TEXT PRIMARY KEY REFERENCES health_light_drafts(id),
  draft_version INTEGER NOT NULL,
  submission_id INTEGER NOT NULL UNIQUE REFERENCES submissions(id),
  created_at TEXT NOT NULL
);
CREATE TRIGGER health_pending_complete_guard BEFORE INSERT ON health_light_draft_completions
WHEN NOT EXISTS(SELECT 1 FROM health_light_drafts WHERE id=NEW.draft_id AND version=NEW.draft_version)
OR NOT EXISTS(SELECT 1 FROM submissions WHERE id=NEW.submission_id AND assessment_type='health_risk' AND assessment_category='light' AND status='completed')
BEGIN SELECT RAISE(ABORT,'health draft stale'); END;
CREATE TRIGGER health_pending_update_guard BEFORE UPDATE ON health_light_drafts
WHEN NEW.id != OLD.id OR NEW.created_at != OLD.created_at OR NEW.version != OLD.version+1
OR EXISTS(SELECT 1 FROM health_light_draft_completions WHERE draft_id=OLD.id)
BEGIN SELECT RAISE(ABORT,'health draft stale'); END;
CREATE TRIGGER health_pending_completion_immutable_update BEFORE UPDATE ON health_light_draft_completions
BEGIN SELECT RAISE(ABORT,'immutable health draft completion'); END;
CREATE TRIGGER health_pending_completion_immutable_delete BEFORE DELETE ON health_light_draft_completions
BEGIN SELECT RAISE(ABORT,'immutable health draft completion'); END;
