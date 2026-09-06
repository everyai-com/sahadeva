import crypto from "node:crypto";
import fs from "node:fs";

const manifestPath = "knowledge/prashna-astrology/corpus-manifest.json";
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
let failed = false;
const fail = (message) => { console.error(message); failed = true; };
const sha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
if (manifest.schemaVersion !== "sahadeva-prashna-corpus-1") fail("Unexpected Prashna corpus schema version");
if (manifest.sources.length < 9 || manifest.summary.uniqueWorks < 8) fail("Prashna corpus unexpectedly lost source files or works");
if (manifest.policy.publicFullText !== false) fail("Restricted Prashna full text must not be marked public");
for (const source of manifest.sources) {
  for (const artifact of [source.original, source.markdown]) {
    if (!fs.existsSync(artifact.path)) { fail(`Missing Prashna artifact: ${artifact.path}`); continue; }
    if (sha256(artifact.path) !== artifact.sha256) fail(`Stale Prashna corpus manifest: ${artifact.path}`);
  }
  if (source.markdown.words < 1_000) fail(`Implausibly short Prashna extraction: ${source.markdown.path}`);
  if (source.ruleReferenceOccurrences < 1) fail(`No executable-rule registry reference: ${source.sourceId}`);
}
const taneja = manifest.sources.find((item) => item.sourceId === "book-umang-taneja-prashna-nadi");
if (!taneja?.extractionStatus.startsWith("incomplete")) fail("The supplied incomplete Taneja source must remain explicitly marked incomplete");
if (failed) process.exit(1);
console.log(`Verified ${manifest.sources.length} Prashna source files, ${manifest.summary.uniqueWorks} works, ${manifest.summary.markdownWords} words, ${manifest.summary.tableRows} table rows, and ${manifest.summary.imageMarkers} image markers.`);
