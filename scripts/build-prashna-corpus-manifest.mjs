import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = "knowledge/prashna-astrology";
const works = [
  ["book-application-prasna-astrology", "Application of Prasna Astrology", "application-of-prasna-astrology.pdf", "application-of-prasna-astrology.md", "complete-ocr"],
  ["book-chappanna-prasana-sastra", "Chappanna or Prasana Sastra", "chappanna-or-prasana-sastra.pdf", "chappanna-or-prasana-sastra.md", "complete-ocr"],
  ["book-neelakanta-prasna-tantra", "Sri Neelakanta's Prasna Tantra", "sri-neelakanta_prasna-tantra.pdf", "sri-neelakanta_prasna-tantra.md", "complete-ocr"],
  ["book-umang-taneja-prashna-nadi", "Prashna Nadi Astrology", "umang-taneja_prashna-nadi-astrology.docx", "umang-taneja_prashna-nadi-astrology.md", "incomplete-source-ends-in-chapter-7"],
  ["book-viswanath-prashna-remedies-vol-1", "Prashna Astrology and Remedies, Volume I", "mk-viswanath-nair_prashna-astrology-remedies-vol-1.pdf", "mk-viswanath-nair_prashna-astrology-remedies-vol-1.md", "complete-ocr"],
  ["book-prasna-marga-raman", "Prasna Marga, Part I", "b-v-raman_prasna-marga-vol-1.pdf", "b-v-raman_prasna-marga-vol-1.md", "complete-ocr"],
  ["book-prasna-marga-raman", "Prasna Marga, Part II", "b-v-raman_prasna-marga-vol-2.pdf", "b-v-raman_prasna-marga-vol-2.md", "complete-ocr"],
  ["book-kp-reader-vi-horary", "Horary Astrology / KP Reader VI", "k-s-krishnamurti_horary-astrology-kp-reader-vi.pdf", "k-s-krishnamurti_horary-astrology-kp-reader-vi.md", "complete-ocr"],
  ["book-daivajna-vallabha", "Daivajna Vallabha", "varahamihira_daivajna-vallabha.pdf", "varahamihira_daivajna-vallabha.md", "complete-ocr"],
];
const sha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const count = (text, expression) => [...text.matchAll(expression)].length;
const ruleRegistry = fs.readFileSync("shared/prashnaRules.ts", "utf8");

const sources = works.map(([sourceId, title, originalName, markdownName, extractionStatus]) => {
  const original = path.join(root, "books", originalName);
  const markdown = path.join(root, "texts", markdownName);
  const text = fs.readFileSync(markdown, "utf8");
  return {
    sourceId, title, extractionStatus,
    original: { path: original, bytes: fs.statSync(original).size, sha256: sha256(original) },
    markdown: {
      path: markdown, bytes: fs.statSync(markdown).size, sha256: sha256(markdown),
      lines: text.split(/\r?\n/).length,
      words: (text.match(/\S+/g) ?? []).length,
      headings: count(text, /^#{1,6}\s+/gm),
      tableRows: count(text, /^\|.*\|\s*$/gm),
      imageMarkers: count(text, /(?:!\[[^\]]*\]\([^)]*\)|\[Image:[^\]]*\])/g),
    },
    ruleReferenceOccurrences: ruleRegistry.split(sourceId).length - 1,
  };
});
const uniqueWorks = new Set(sources.map((item) => item.sourceId)).size;
const manifest = {
  schemaVersion: "sahadeva-prashna-corpus-1",
  generatedAt: new Date().toISOString(),
  policy: { publicFullText: false, sourceDocumentsAreAuthoritative: true },
  summary: {
    sourceFiles: sources.length,
    uniqueWorks,
    markdownWords: sources.reduce((sum, item) => sum + item.markdown.words, 0),
    headings: sources.reduce((sum, item) => sum + item.markdown.headings, 0),
    tableRows: sources.reduce((sum, item) => sum + item.markdown.tableRows, 0),
    imageMarkers: sources.reduce((sum, item) => sum + item.markdown.imageMarkers, 0),
    incompleteSources: sources.filter((item) => item.extractionStatus.startsWith("incomplete")).map((item) => item.sourceId),
    sourcesWithoutRuleReferences: [...new Set(sources.filter((item) => item.ruleReferenceOccurrences === 0).map((item) => item.sourceId))],
  },
  sources,
};
fs.writeFileSync(path.join(root, "corpus-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Catalogued ${sources.length} source files representing ${uniqueWorks} Prashna works and ${manifest.summary.markdownWords} Markdown words.`);
