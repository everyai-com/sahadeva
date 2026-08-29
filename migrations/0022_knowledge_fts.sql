CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_fts USING fts5(
  work UNINDEXED,
  author UNINDEXED,
  section,
  body
);
