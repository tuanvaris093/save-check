-- File bytes live in D1; keep each BLOB well below the 2 MB row limit.
-- Existing assessment metadata and legacy file data are not modified.
CREATE TABLE assessment_file_chunks (
  object_key TEXT NOT NULL REFERENCES assessment_files(object_key),
  part INTEGER NOT NULL CHECK(part >= 0),
  bytes BLOB NOT NULL CHECK(length(bytes) > 0 AND length(bytes) <= 524288),
  PRIMARY KEY (object_key, part)
);
CREATE TRIGGER file_chunks_no_update BEFORE UPDATE ON assessment_file_chunks
BEGIN SELECT RAISE(ABORT, 'immutable file content'); END;
CREATE TRIGGER file_chunks_guard_delete BEFORE DELETE ON assessment_file_chunks
WHEN EXISTS (SELECT 1 FROM assessment_files WHERE object_key=OLD.object_key AND state!='orphan')
BEGIN SELECT RAISE(ABORT, 'immutable file content'); END;
