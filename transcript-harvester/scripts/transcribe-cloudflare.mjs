import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { strToU8, zipSync } from "fflate";
import { plainText, safeFilename, toMarkdown, toSrt } from "../shared/export.ts";

const manifestPath = process.argv[2] || "downloads/Learn Astrology in Telugu/manifest.json";
const limit = Number(process.argv[3]) || Infinity;
const token = (await readFile(".transcribe-token", "utf8")).trim();
const endpoint = "https://transcript-harvester.everyai-com.workers.dev/api/transcribe?language=te";
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const folder = manifestPath.slice(0, manifestPath.lastIndexOf("/"));
const pending = manifest.results
  .filter((item) => item.status !== "complete")
  .sort((a, b) => (a.durationSeconds || Number.POSITIVE_INFINITY) - (b.durationSeconds || Number.POSITIVE_INFINITY))
  .slice(0, limit);
const clientVersion = "20.10.38";
const chunkSeconds = 900;

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve() : reject(new Error(`${command} failed (${code}): ${stderr.slice(-800)}`)));
  });
}

async function transcribeChunk(path, attempt = 0) {
  const audio = await readFile(path);
  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "audio/mpeg" },
      body: audio,
      signal: AbortSignal.timeout(15 * 60 * 1000),
    });
  } catch (error) {
    if (attempt < 5) {
      await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 10_000));
      return transcribeChunk(path, attempt + 1);
    }
    throw error;
  }
  const text = await response.text();
  if (!response.ok) {
    if (attempt < 5 && [429, 500, 502, 503, 504].includes(response.status)) {
      await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 10_000));
      return transcribeChunk(path, attempt + 1);
    }
    throw new Error(`Workers AI failed (${response.status}): ${text.slice(0, 500)}`);
  }
  return JSON.parse(text);
}

let persistQueue = Promise.resolve();
async function persist() {
  persistQueue = persistQueue.then(async () => {
    manifest.updatedAt = new Date().toISOString();
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  });
  await persistQueue;
}

async function processVideo(item, queueIndex) {
  const temp = join("downloads", ".audio-chunks", item.id);
  await rm(temp, { recursive: true, force: true });
  await mkdir(temp, { recursive: true });
  try {
    const source = join(temp, "source.m4a");
    await run(`${process.env.HOME}/.local/bin/yt-dlp`, [
      "--no-playlist", "--quiet", "--no-warnings",
      "--js-runtimes", "node", "--remote-components", "ejs:github",
      "--extractor-args", "youtube:player_client=mweb",
      "-f", "ba", "-o", source, `https://www.youtube.com/watch?v=${item.id}`,
    ]);
    await run("ffmpeg", [
      "-y", "-loglevel", "error",
      "-i", source,
      "-vn", "-ac", "1", "-ar", "16000", "-b:a", "32k",
      "-f", "segment", "-segment_time", String(chunkSeconds), "-reset_timestamps", "1", join(temp, "%03d.mp3"),
    ]);
    const chunks = (await readdir(temp)).filter((name) => name.endsWith(".mp3")).sort();
    if (!chunks.length) throw new Error("Audio splitting produced no chunks.");
    const chunkSegments = new Array(chunks.length);
    for (let start = 0; start < chunks.length; start += 3) {
      await Promise.all(chunks.slice(start, start + 3).map(async (name, batchIndex) => {
        const index = start + batchIndex;
        const result = await transcribeChunk(join(temp, name));
        const offsetMs = index * chunkSeconds * 1000;
        const modelSegments = Array.isArray(result.segments) ? result.segments : [];
        chunkSegments[index] = modelSegments.length
          ? modelSegments.flatMap((segment) => {
              const startMs = offsetMs + Math.round(Number(segment.start || 0) * 1000);
              const endMs = offsetMs + Math.round(Number(segment.end || segment.start || 0) * 1000);
              const value = String(segment.text || "").trim();
              return value ? [{ text: value, startMs, durationMs: Math.max(500, endMs - startMs) }] : [];
            })
          : String(result.text || "").trim()
            ? [{ text: String(result.text).trim(), startMs: offsetMs, durationMs: chunkSeconds * 1000 }]
            : [];
        console.log(`[${queueIndex + 1}/${pending.length}] ${item.id} chunk ${index + 1}/${chunks.length}`);
      }));
    }
    const segments = chunkSegments.flat();
    const video = {
      id: item.id, title: item.title, url: item.url, position: item.position, language: "te", languageName: "Telugu",
      source: "transcribed", status: "complete", segments,
    };
    const prefix = `${String(item.position).padStart(3, "0")} - ${safeFilename(item.title)}`;
    await Promise.all([
      writeFile(join(folder, `${prefix}.txt`), plainText(segments)),
      writeFile(join(folder, `${prefix}.md`), toMarkdown(video)),
      writeFile(join(folder, `${prefix}.srt`), toSrt(video)),
      writeFile(join(folder, `${prefix}.json`), JSON.stringify(video, null, 2)),
    ]);
    Object.assign(item, { status: "complete", language: "te", source: "transcribed", segmentCount: segments.length, error: undefined });
    await persist();
    console.log(`[${queueIndex + 1}/${pending.length}] COMPLETE ${item.id} ${item.title}`);
  } catch (error) {
    item.error = error instanceof Error ? error.message : String(error);
    await persist();
    console.error(`[${queueIndex + 1}/${pending.length}] FAILED ${item.id}: ${item.error}`);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}

console.log(`Cloudflare transcription queue: ${pending.length} videos`);
let nextVideo = 0;
async function videoWorker() {
  while (nextVideo < pending.length) {
    const index = nextVideo;
    nextVideo += 1;
    await processVideo(pending[index], index);
  }
}
await Promise.all(Array.from({ length: Math.min(4, pending.length) }, () => videoWorker()));

if (!Number.isFinite(limit) || pending.length < limit) {
  const files = {};
  for (const item of manifest.results.filter((result) => result.status === "complete")) {
    const prefix = `${String(item.position).padStart(3, "0")} - ${safeFilename(item.title)}`;
    for (const extension of ["txt", "md", "srt", "json"]) {
      const name = `${prefix}.${extension}`;
      if (existsSync(join(folder, name))) files[name] = new Uint8Array(await readFile(join(folder, name)));
    }
  }
  files["manifest.json"] = strToU8(await readFile(manifestPath, "utf8"));
  await writeFile(`${folder} - te.zip`, zipSync(files, { level: 6 }));
}

const complete = manifest.results.filter((item) => item.status === "complete").length;
console.log(JSON.stringify({ complete, remaining: manifest.results.length - complete, total: manifest.results.length }, null, 2));
