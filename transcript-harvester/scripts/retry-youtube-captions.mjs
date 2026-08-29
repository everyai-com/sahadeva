import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { transcriptForVideo } from "../extension/background.js";
import { plainText, safeFilename, toMarkdown, toSrt } from "../shared/export.ts";

const manifestPath = process.argv[2] || "downloads/Learn Astrology in Telugu/manifest.json";
const limit = Number(process.argv[3]) || Infinity;
const concurrency = Math.max(1, Math.min(6, Number(process.argv[4]) || 3));
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const folder = manifestPath.slice(0, manifestPath.lastIndexOf("/"));
const backupFolder = join(folder, ".cloudflare-originals");
const pending = manifest.results.filter((item) => item.source === "transcribed").slice(0, limit);

function metrics(segments) {
  const chars = [...segments.map((segment) => segment.text || "").join(" ")].filter((character) => !/\s/u.test(character));
  const count = (pattern) => chars.filter((character) => pattern.test(character)).length;
  const telugu = count(/[\u0C00-\u0C7F]/u);
  const corrupt = count(/[�\u0F00-\u0FFF\u4E00-\u9FFF\uAC00-\uD7AF]/u);
  return { characters: chars.length, teluguRatio: chars.length ? telugu / chars.length : 0, corruptionRatio: chars.length ? corrupt / chars.length : 1 };
}

function score(value) {
  return value.teluguRatio * 100 - value.corruptionRatio * 1000 + Math.min(10, value.characters / 5000);
}

let next = 0;
const summary = { attempted: pending.length, replaced: 0, noTeluguCaptions: 0, notBetter: 0, failed: 0 };
let persistQueue = Promise.resolve();
async function persist() {
  persistQueue = persistQueue.then(() => writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`));
  return persistQueue;
}

async function processItem(item) {
  const prefix = `${String(item.position).padStart(3, "0")} - ${safeFilename(item.title)}`;
  const currentPath = join(folder, `${prefix}.json`);
  const current = JSON.parse(await readFile(currentPath, "utf8"));
  try {
    const candidate = await transcriptForVideo({ id: item.id, title: item.title, url: item.url, position: item.position, segments: [], status: "pending" }, { languages: ["te"], includeAutomatic: true });
    if (candidate.status !== "complete" || candidate.language !== "te" || !["manual", "automatic"].includes(candidate.source)) {
      summary.noTeluguCaptions += 1;
      console.log(`[${item.position}] no Telugu caption track`);
      return;
    }
    const before = metrics(current.segments || []), after = metrics(candidate.segments || []);
    if (score(after) <= score(before) || after.characters < 100) {
      summary.notBetter += 1;
      console.log(`[${item.position}] caption not better (${score(before).toFixed(1)} -> ${score(after).toFixed(1)})`);
      return;
    }
    await mkdir(backupFolder, { recursive: true });
    for (const extension of ["json", "md", "srt", "txt"]) await cp(join(folder, `${prefix}.${extension}`), join(backupFolder, `${prefix}.${extension}`), { force: false });
    await Promise.all([
      writeFile(join(folder, `${prefix}.txt`), plainText(candidate.segments)),
      writeFile(join(folder, `${prefix}.md`), toMarkdown(candidate)),
      writeFile(join(folder, `${prefix}.srt`), toSrt(candidate)),
      writeFile(currentPath, `${JSON.stringify(candidate, null, 2)}\n`),
    ]);
    Object.assign(item, { status: "complete", language: "te", source: candidate.source, segmentCount: candidate.segments.length, previousSource: "transcribed", transcriptReplacedAt: new Date().toISOString() });
    summary.replaced += 1;
    await persist();
    console.log(`[${item.position}] replaced with YouTube ${candidate.source} captions`);
  } catch (error) {
    summary.failed += 1;
    console.error(`[${item.position}] ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function worker() {
  while (next < pending.length) {
    const index = next++;
    await processItem(pending[index]);
  }
}

console.log(`Retrying YouTube Telugu captions for ${pending.length} Cloudflare transcripts from ${basename(manifestPath)} with concurrency ${concurrency}`);
await Promise.all(Array.from({ length: Math.min(concurrency, pending.length) }, worker));
manifest.updatedAt = new Date().toISOString();
await persist();
console.log(JSON.stringify(summary, null, 2));
