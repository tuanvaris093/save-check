-- Archive actions have been retired. Keep all existing records and audit history.
-- Only remove the old archive gate; retain latest-parent and ownership checks.
DROP TRIGGER revision_parent_guard;
CREATE TRIGGER revision_parent_guard BEFORE INSERT ON environment_revisions
WHEN NEW.base_revision_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM environment_revisions r
  JOIN submissions s ON s.id=r.submission_id
  WHERE r.id=NEW.base_revision_id AND r.submission_id=NEW.submission_id
    AND r.status='finalized' AND r.revision_no=NEW.revision_no-1
    AND s.latest_revision_id=r.id
)
BEGIN SELECT RAISE(ABORT,'stale revision base'); END;
