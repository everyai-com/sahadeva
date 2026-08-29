import { Hono } from "hono";
import { plainText, toMarkdown, toSrt } from "../shared/export";
import type { VideoResult } from "../shared/types";

type Env = { AI: Ai; TRANSCRIBE_TOKEN: string };
const app = new Hono<{ Bindings: Env }>();
const YOUTUBE = "https://www.youtube.com";

function base64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + 0x8000, bytes.length)));
  }
  return btoa(binary);
}

app.get("/api/health", (c) => c.json({ ok: true, service: "transcript-harvester" }));

app.get("/api/captions/:videoId", async (c) => {
  const videoId = c.req.param("videoId");
  if (!/^[\w-]{11}$/.test(videoId)) return c.json({ error: "Invalid YouTube video ID." }, 400);
  const language = c.req.query("language") || "te";
  const clientVersion = "20.10.38";
  const playerResponse = await fetch(`${YOUTUBE}/youtubei/v1/player?prettyPrint=false`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-youtube-client-name": "3", "x-youtube-client-version": clientVersion },
    body: JSON.stringify({ context: { client: { clientName: "ANDROID", clientVersion, androidSdkVersion: 30, hl: "en" } }, videoId }),
  });
  if (!playerResponse.ok) return c.json({ error: `YouTube player request failed (${playerResponse.status}).` }, 502);
  const player = await playerResponse.json<{
    videoDetails?: { title?: string; author?: string };
    captions?: { playerCaptionsTracklistRenderer?: { captionTracks?: Array<{ baseUrl: string; languageCode: string; kind?: string; name?: { simpleText?: string; runs?: Array<{ text?: string }> } }> } };
  }>();
  const tracks = player.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
  const track = tracks.find((item) => item.languageCode === language || item.languageCode.startsWith(`${language}-`));
  if (!track) return c.json({ status: "missing", videoId, error: `No ${language} caption track.` }, 404);
  const captionUrl = new URL(track.baseUrl);
  captionUrl.searchParams.set("fmt", "json3");
  const captionResponse = await fetch(captionUrl);
  const text = await captionResponse.text();
  if (!captionResponse.ok || !text.trim()) return c.json({ error: `Caption request failed (${captionResponse.status}).` }, 502);
  const document = JSON.parse(text) as { events?: Array<{ tStartMs?: number; dDurationMs?: number; segs?: Array<{ utf8?: string }> }> };
  const segments = (document.events || []).flatMap((event) => {
    const segmentText = (event.segs || []).map((segment) => segment.utf8 || "").join("").replace(/\n/g, " ").trim();
    return segmentText ? [{ text: segmentText, startMs: Number(event.tStartMs || 0), durationMs: Number(event.dDurationMs || 0) }] : [];
  });
  return c.json({ status: "complete", videoId, title: player.videoDetails?.title, channel: player.videoDetails?.author, language: track.languageCode, source: track.kind === "asr" ? "automatic" : "manual", segments });
});

app.post("/api/caption-proxy", async (c) => {
  const body = await c.req.json<{ url?: string }>();
  if (!body.url) return c.json({ error: "A signed caption URL is required." }, 400);
  const url = new URL(body.url);
  if (url.protocol !== "https:" || url.hostname !== "www.youtube.com" || url.pathname !== "/api/timedtext") {
    return c.json({ error: "Only signed YouTube timed-text URLs are allowed." }, 400);
  }
  url.searchParams.set("fmt", "json3");
  const response = await fetch(url);
  const text = await response.text();
  if (!response.ok || !text.trim()) return c.json({ error: `Caption proxy failed (${response.status}).` }, 502);
  return c.body(text, 200, { "content-type": "application/json", "cache-control": "private, no-store" });
});

app.get("/api/audio-proxy", async (c) => {
  const suppliedToken = c.req.header("authorization")?.replace(/^Bearer\s+/i, "");
  if (!suppliedToken || suppliedToken !== c.env.TRANSCRIBE_TOKEN) return c.json({ error: "Unauthorized." }, 401);
  const value = c.req.query("url");
  if (!value) return c.json({ error: "A signed audio URL is required." }, 400);
  const url = new URL(value);
  if (url.protocol !== "https:" || !url.hostname.endsWith(".googlevideo.com") || url.pathname !== "/videoplayback") {
    return c.json({ error: "Only signed YouTube audio URLs are allowed." }, 400);
  }
  const headers = new Headers();
  const range = c.req.header("range");
  if (range) headers.set("range", range);
  const response = await fetch(url, { headers });
  if (!response.ok && response.status !== 206) return c.json({ error: `Audio proxy failed (${response.status}).` }, 502);
  const outputHeaders = new Headers({ "content-type": response.headers.get("content-type") || "audio/mp4", "cache-control": "private, no-store" });
  for (const name of ["content-length", "content-range", "accept-ranges"]) {
    const header = response.headers.get(name);
    if (header) outputHeaders.set(name, header);
  }
  return new Response(response.body, { status: response.status, headers: outputHeaders });
});

app.get("/api/audio/:videoId", async (c) => {
  const suppliedToken = c.req.header("authorization")?.replace(/^Bearer\s+/i, "");
  if (!suppliedToken || suppliedToken !== c.env.TRANSCRIBE_TOKEN) return c.json({ error: "Unauthorized." }, 401);
  const videoId = c.req.param("videoId");
  if (!/^[\w-]{11}$/.test(videoId)) return c.json({ error: "Invalid YouTube video ID." }, 400);
  const clientVersion = "20.10.38";
  const playerResponse = await fetch(`${YOUTUBE}/youtubei/v1/player?prettyPrint=false`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-youtube-client-name": "3", "x-youtube-client-version": clientVersion },
    body: JSON.stringify({ context: { client: { clientName: "ANDROID", clientVersion, androidSdkVersion: 30, hl: "en" } }, videoId }),
  });
  if (!playerResponse.ok) return c.json({ error: `YouTube player request failed (${playerResponse.status}).` }, 502);
  const player = await playerResponse.json<{ streamingData?: { adaptiveFormats?: Array<{ mimeType?: string; bitrate?: number; url?: string }> } }>();
  const formats = (player.streamingData?.adaptiveFormats || [])
    .filter((format) => format.mimeType?.startsWith("audio/") && format.url)
    .sort((a, b) => (a.bitrate || Infinity) - (b.bitrate || Infinity));
  if (!formats[0]?.url) return c.json({ error: "No downloadable audio stream was returned." }, 404);
  const headers = new Headers();
  const range = c.req.header("range");
  if (range) headers.set("range", range);
  const response = await fetch(formats[0].url, { headers });
  if (!response.ok && response.status !== 206) return c.json({ error: `YouTube audio request failed (${response.status}).` }, 502);
  const outputHeaders = new Headers({ "content-type": response.headers.get("content-type") || "audio/mp4", "cache-control": "private, no-store" });
  for (const name of ["content-length", "content-range", "accept-ranges"]) {
    const header = response.headers.get(name);
    if (header) outputHeaders.set(name, header);
  }
  return new Response(response.body, { status: response.status, headers: outputHeaders });
});

app.post("/api/transcribe", async (c) => {
  const suppliedToken = c.req.header("authorization")?.replace(/^Bearer\s+/i, "");
  if (!suppliedToken || suppliedToken !== c.env.TRANSCRIBE_TOKEN) return c.json({ error: "Unauthorized." }, 401);
  const audio = await c.req.arrayBuffer();
  if (!audio.byteLength || audio.byteLength > 25 * 1024 * 1024) return c.json({ error: "Audio chunk must be between 1 byte and 25 MiB." }, 400);
  const result = await c.env.AI.run("@cf/openai/whisper-large-v3-turbo", {
    audio: base64(audio),
    task: "transcribe",
    language: c.req.query("language") || "te",
    vad_filter: true,
    condition_on_previous_text: false,
    initial_prompt: "తెలుగు జ్యోతిష్యం, గ్రహాలు, రాశులు, భావాలు, నక్షత్రాలు, దశలు",
  });
  return c.json(result);
});

app.post("/api/export", async (c) => {
  const body = await c.req.json<{ format?: string; video?: VideoResult }>();
  if (!body.video || body.video.status !== "complete") return c.json({ error: "A completed transcript is required." }, 400);
  const format = body.format || "txt";
  const content = format === "md" ? toMarkdown(body.video) : format === "srt" ? toSrt(body.video) : format === "json" ? JSON.stringify(body.video, null, 2) : plainText(body.video.segments);
  const contentType = format === "json" ? "application/json" : "text/plain; charset=utf-8";
  return c.body(content, 200, { "content-type": contentType, "cache-control": "no-store" });
});

export default app;
