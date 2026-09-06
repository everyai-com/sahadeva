-- 0044 repairs the stale full-text pipeline: migration 0022 created
-- knowledge_fts and 0023 dropped it, leaving corpus search on LIKE scans
-- and legacy .knowledge-sql seeds targeting a table that no longer exists.
-- This creates a passage-bound FTS5 index kept in sync by triggers and
-- backfilled once, so passage discovery can rank instead of scan.
CREATE VIRTUAL TABLE IF NOT EXISTS passage_fts USING fts5(
  locator,
  original_text,
  literal_translation,
  interpretive_translation,
  content='passages',
  content_rowid='rowid',
  tokenize='unicode61 remove_diacritics 1'
);

-- One-time backfill for passages created before this migration.
INSERT INTO passage_fts(rowid, locator, original_text, literal_translation, interpretive_translation)
  SELECT rowid, locator, original_text,
    ifnull(literal_translation, ''),
    ifnull(interpretive_translation, '')
  FROM passages
  WHERE NOT EXISTS (
    SELECT 1 FROM passage_fts WHERE passage_fts.rowid = passages.rowid
  );

CREATE TRIGGER IF NOT EXISTS passage_fts_after_insert AFTER INSERT ON passages BEGIN
  INSERT INTO passage_fts(rowid, locator, original_text, literal_translation, interpretive_translation)
  VALUES (
    new.rowid, new.locator, new.original_text,
    ifnull(new.literal_translation, ''),
    ifnull(new.interpretive_translation, '')
  );
END;

CREATE TRIGGER IF NOT EXISTS passage_fts_after_delete AFTER DELETE ON passages BEGIN
  INSERT INTO passage_fts(passage_fts, rowid, locator, original_text, literal_translation, interpretive_translation)
  VALUES (
    'delete', old.rowid, old.locator, old.original_text,
    ifnull(old.literal_translation, ''),
    ifnull(old.interpretive_translation, '')
  );
END;

CREATE TRIGGER IF NOT EXISTS passage_fts_after_update AFTER UPDATE ON passages BEGIN
  INSERT INTO passage_fts(passage_fts, rowid, locator, original_text, literal_translation, interpretive_translation)
  VALUES (
    'delete', old.rowid, old.locator, old.original_text,
    ifnull(old.literal_translation, ''),
    ifnull(old.interpretive_translation, '')
  );
  INSERT INTO passage_fts(rowid, locator, original_text, literal_translation, interpretive_translation)
  VALUES (
    new.rowid, new.locator, new.original_text,
    ifnull(new.literal_translation, ''),
    ifnull(new.interpretive_translation, '')
  );
END;
