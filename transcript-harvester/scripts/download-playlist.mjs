import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { strToU8, zipSync } from "fflate";
import { enumeratePlaylist, transcriptForVideo } from "../extension/background.js";
import { plainText, safeFilename, toMarkdown, toSrt } from "../shared/export.ts";

const playlistId = process.argv[2];
const language = process.argv[3] || "te";
const concurrency = Math.max(1, Math.min(12, Number(process.argv[4]) || 8));
if (!playlistId) throw new Error("Usage: node scripts/download-playlist.mjs PLAYLIST_ID [language] [concurrency]");

const playlist = await enumeratePlaylist(playlistId);
const folder = join("downloads", safeFilename(playlist.title));
await mkdir(folder, { recursive: true });
const manifestPath = join(folder, "manifest.json");
let previous = { results: [] };
if (existsSync(manifestPath)) {
  try { previous = JSON.parse(await readFile(manifestPath, "utf8")); } catch { /* start a fresh manifest */ }
}
const completedIds = new Set((previous.results || []).filter((item) => item.status === "complete").map((item) => item.id));
const results = [...(previous.results || []).filter((item) => completedIds.has(item.id))];
let next = 0;
let finished = results.length;

async function persist() {
  await writeFile(manifestPath, JSON.stringify({
    playlistId, playlistTitle: playlist.title, language, publicVideoCount: playlist.videos.length,
    updatedAt: new Date().toISOString(), results: results.sort((a, b) => a.position - b.position),
  }, null, 2));
}

async function processVideo(video, position) {
  const prefix = `${String(position).padStart(3, "0")} - ${safeFilename(video.title)}`;
  if (completedIds.has(video.id)) { finished += 1; return; }
  let result;
  try {
    result = await transcriptForVideo({ ...video, position, segments: [], status: "pending" }, { languages: [language], includeAutomatic: true });
    if (result.status === "complete" && result.language !== language) {
      result = { ...result, status: "failed", error: `Requested ${language}, received ${result.language || "unknown"}.` };
    }
  } catch (error) {
    result = { ...video, position, segments: [], status: "failed", error: error instanceof Error ? error.message : String(error) };
  }
  if (result.status === "complete") {
    await Promise.all([
      writeFile(join(folder, `${prefix}.txt`), plainText(result.segments)),
      writeFile(join(folder, `${prefix}.md`), toMarkdown(result)),
      writeFile(join(folder, `${prefix}.srt`), toSrt(result)),
      writeFile(join(folder, `${prefix}.json`), JSON.stringify(result, null, 2)),
    ]);
  }
  results.push({
    id: video.id, position, title: video.title, url: video.url, status: result.status,
    language: result.language, source: result.source, segmentCount: result.segments?.length || 0, error: result.error,
  });
  finished += 1;
  if (finished % 10 === 0 || finished === playlist.videos.length) await persist();
  console.log(`[${finished}/${playlist.videos.length}] ${result.status.toUpperCase()} ${video.id} ${video.title}`);
}

async function worker() {
  while (next < playlist.videos.length) {
    const index = next++;
    await processVideo(playlist.videos[index], index + 1);
  }
}

console.log(`Playlist: ${playlist.title}`);
console.log(`Public videos: ${playlist.videos.length}; language: ${language}; concurrency: ${concurrency}`);
await Promise.all(Array.from({ length: concurrency }, worker));
await persist();

const zipFiles = {};
for (const item of results.filter((result) => result.status === "complete")) {
  const prefix = `${String(item.position).padStart(3, "0")} - ${safeFilename(item.title)}`;
  for (const extension of ["txt", "md", "srt", "json"]) {
    const name = `${prefix}.${extension}`;
    zipFiles[name] = new Uint8Array(await readFile(join(folder, name)));
  }
}
zipFiles["manifest.json"] = strToU8(await readFile(manifestPath, "utf8"));
const zipPath = `${folder} - ${language}.zip`;
await writeFile(zipPath, zipSync(zipFiles, { level: 6 }));
const complete = results.filter((result) => result.status === "complete").length;
console.log(JSON.stringify({ folder, zipPath, complete, failed: results.length - complete, total: playlist.videos.length }, null, 2));
