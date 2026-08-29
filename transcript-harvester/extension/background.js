const YOUTUBE_ORIGIN = "https://www.youtube.com";

if (globalThis.chrome?.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type !== "TRANSCRIPT_HARVEST_REQUEST" || !sender.tab?.id) return;
    harvest(message, sender.tab.id).catch((error) => emit(sender.tab.id, {
      type: "TRANSCRIPT_HARVEST_ERROR",
      requestId: message.requestId,
      error: readableError(error),
    }));
    sendResponse({ accepted: true });
  });
}

async function harvest(request, tabId) {
  const playlistId = playlistIdFromUrl(request.playlistUrl);
  if (!playlistId) throw new Error("Use a public YouTube playlist URL containing a list ID.");

  const playlist = await enumeratePlaylist(playlistId);
  const videos = playlist.videos.map((video, index) => ({
    ...video,
    position: index + 1,
    segments: [],
    status: "pending",
  }));
  await emit(tabId, { type: "TRANSCRIPT_HARVEST_STARTED", requestId: request.requestId, playlistTitle: playlist.title, total: videos.length, videos });

  let nextIndex = 0;
  let completed = 0;
  const concurrency = clamp(Number(request.options?.concurrency) || 6, 1, 12);
  async function worker() {
    while (nextIndex < videos.length) {
      const index = nextIndex++;
      const pending = videos[index];
      let result;
      try {
        result = await transcriptForVideo(pending, request.options || {});
      } catch (error) {
        result = { ...pending, status: "failed", error: readableError(error) };
      }
      completed += 1;
      await emit(tabId, { type: "TRANSCRIPT_HARVEST_VIDEO", requestId: request.requestId, video: result, completed, total: videos.length });
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, videos.length) }, worker));
  await emit(tabId, { type: "TRANSCRIPT_HARVEST_DONE", requestId: request.requestId, completed, total: videos.length });
}

async function enumeratePlaylist(playlistId) {
  const page = await fetchText(`${YOUTUBE_ORIGIN}/playlist?list=${encodeURIComponent(playlistId)}&hl=en`);
  const initialData = extractAssignedJson(page, "ytInitialData");
  if (!initialData) throw new Error("YouTube did not return playlist data. The playlist may be private or unavailable.");
  const config = extractYtConfig(page);
  const title = findFirst(initialData, "playlistMetadataRenderer")?.title || "YouTube playlist";
  const videos = collectVideos(initialData);
  const seen = new Set(videos.map((video) => video.id));
  let continuation = findContinuation(initialData);
  let pageCount = 0;

  while (continuation && pageCount < 200) {
    if (!config.apiKey || !config.clientVersion) break;
    const response = await fetch(`${YOUTUBE_ORIGIN}/youtubei/v1/browse?key=${encodeURIComponent(config.apiKey)}`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json", "x-youtube-client-name": "1", "x-youtube-client-version": config.clientVersion },
      body: JSON.stringify({
        context: { client: { clientName: "WEB", clientVersion: config.clientVersion, hl: "en" } },
        continuation: continuation.token,
      }),
    });
    if (!response.ok) throw new Error(`Playlist continuation failed (${response.status}).`);
    const data = await response.json();
    for (const video of collectVideos(data)) {
      if (!seen.has(video.id)) { seen.add(video.id); videos.push(video); }
    }
    continuation = findContinuation(data);
    pageCount += 1;
  }
  return { title, videos };
}

async function transcriptForVideo(video, options) {
  let player = await androidPlayer(video.id);
  if (!player?.captions?.playerCaptionsTracklistRenderer?.captionTracks?.length) {
    const page = await fetchText(`${YOUTUBE_ORIGIN}/watch?v=${encodeURIComponent(video.id)}&hl=en`);
    player = extractAssignedJson(page, "ytInitialPlayerResponse");
  }
  const tracks = player?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
  if (!tracks.length) return { ...video, status: "missing", error: "YouTube has no caption track for this video." };
  const track = chooseTrack(tracks, options.languages || ["en"], options.includeAutomatic !== false);
  if (!track) return { ...video, status: "missing", error: "No caption track matched the selected languages." };
  const json = await fetchCaptionJson(appendQuery(track.baseUrl, "fmt", "json3"));
  const segments = (json.events || []).flatMap((event) => {
    const text = (event.segs || []).map((part) => part.utf8 || "").join("").replace(/\n/g, " ").trim();
    return text ? [{ text, startMs: Number(event.tStartMs || 0), durationMs: Number(event.dDurationMs || 0) }] : [];
  });
  if (!segments.length) throw new Error("The selected caption track was empty.");
  return {
    ...video,
    title: player?.videoDetails?.title || video.title,
    channel: player?.videoDetails?.author || video.channel,
    language: track.languageCode,
    languageName: textOf(track.name) || track.languageCode,
    source: track.kind === "asr" ? "automatic" : track.isTranslatable && track.languageCode !== (options.languages || [])[0] ? "translated" : "manual",
    segments,
    status: "complete",
  };
}

async function fetchCaptionJson(url) {
  const proxyUrl = "https://transcript-harvester.everyai-com.workers.dev/api/caption-proxy";
  const direct = await fetch(url, { credentials: "include" });
  const directText = await direct.text();
  if (direct.ok && directText.trim()) {
    try { return JSON.parse(directText); } catch { throw new Error("YouTube returned an invalid caption document."); }
  }
  const proxy = await fetch(proxyUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const proxyText = await proxy.text();
  if (proxy.ok && proxyText.trim()) {
    try { return JSON.parse(proxyText); } catch { throw new Error("The caption proxy returned an invalid document."); }
  }
  const delays = [5_000, 15_000, 30_000];
  let lastStatus = 0;
  for (const delay of delays) {
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay + Math.floor(Math.random() * 1_500)));
    const response = await fetch(url, { credentials: "include" });
    lastStatus = response.status;
    const text = await response.text();
    if (response.ok && text.trim()) {
      try { return JSON.parse(text); } catch { throw new Error("YouTube returned an invalid caption document."); }
    }
    if (![429, 503].includes(response.status) && text.trim()) break;
  }
  throw new Error(`Caption download failed after retries (${lastStatus || "empty response"}).`);
}

async function androidPlayer(videoId) {
  const clientVersion = "20.10.38";
  const response = await fetch(`${YOUTUBE_ORIGIN}/youtubei/v1/player?prettyPrint=false`, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json", "x-youtube-client-name": "3", "x-youtube-client-version": clientVersion },
    body: JSON.stringify({
      context: { client: { clientName: "ANDROID", clientVersion, androidSdkVersion: 30, hl: "en" } },
      videoId,
    }),
  });
  if (!response.ok) return null;
  return response.json();
}

function chooseTrack(tracks, languages, includeAutomatic) {
  const normalized = languages.map((language) => language.toLowerCase());
  const rank = (track) => {
    const code = String(track.languageCode || "").toLowerCase();
    const languageIndex = normalized.findIndex((wanted) => code === wanted || code.startsWith(`${wanted}-`));
    const languageRank = languageIndex < 0 ? 100 : languageIndex;
    const automaticPenalty = track.kind === "asr" ? 20 : 0;
    return languageRank * 10 + automaticPenalty;
  };
  return tracks.filter((track) => includeAutomatic || track.kind !== "asr").sort((a, b) => rank(a) - rank(b))[0] || null;
}

function collectVideos(root) {
  const found = [];
  walk(root, (value, key) => {
    if (key === "lockupViewModel" && value?.contentType === "LOCKUP_CONTENT_TYPE_VIDEO" && value.contentId) {
      const metadata = value.metadata?.lockupMetadataViewModel;
      const channel = metadata?.metadata?.contentMetadataViewModel?.metadataRows?.[0]?.metadataParts?.[0]?.text?.content;
      found.push({
        id: value.contentId,
        title: metadata?.title?.content || `Video ${value.contentId}`,
        url: `${YOUTUBE_ORIGIN}/watch?v=${value.contentId}`,
        channel: channel || "",
      });
      return;
    }
    if (!["playlistVideoRenderer", "playlistPanelVideoRenderer"].includes(key)) return;
    const id = value?.videoId;
    if (!id) return;
    found.push({
      id,
      title: textOf(value.title) || `Video ${id}`,
      url: `${YOUTUBE_ORIGIN}/watch?v=${id}`,
      channel: textOf(value.shortBylineText || value.longBylineText),
    });
  });
  return found;
}

function findContinuation(root) {
  let result = null;
  walk(root, (value, key) => {
    if (result || !["continuationItemRenderer", "continuationItemViewModel"].includes(key)) return;
    const command = value?.continuationEndpoint?.continuationCommand
      || value?.continuationCommand?.innertubeCommand?.continuationCommand;
    if (command?.token) result = { token: command.token };
  });
  return result;
}

function findFirst(root, targetKey) {
  let result = null;
  walk(root, (value, key) => { if (!result && key === targetKey) result = value; });
  return result;
}

function walk(value, visit) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) { for (const item of value) walk(item, visit); return; }
  for (const [key, child] of Object.entries(value)) { visit(child, key); walk(child, visit); }
}

function extractAssignedJson(source, variable) {
  const patterns = [`var ${variable} =`, `window[\"${variable}\"] =`, `${variable} =`];
  for (const pattern of patterns) {
    const index = source.indexOf(pattern);
    if (index < 0) continue;
    const start = source.indexOf("{", index + pattern.length);
    const json = balancedObject(source, start);
    if (json) { try { return JSON.parse(json); } catch { /* try another marker */ } }
  }
  return null;
}

function balancedObject(source, start) {
  if (start < 0) return null;
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') quoted = false;
      continue;
    }
    if (character === '"') quoted = true;
    else if (character === "{") depth += 1;
    else if (character === "}" && --depth === 0) return source.slice(start, index + 1);
  }
  return null;
}

function extractYtConfig(source) {
  const config = extractCallJson(source, "ytcfg.set(") || {};
  return {
    apiKey: config.INNERTUBE_API_KEY || source.match(/"INNERTUBE_API_KEY":"([^"]+)"/)?.[1],
    clientVersion: config.INNERTUBE_CLIENT_VERSION || source.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/)?.[1],
  };
}

function extractCallJson(source, marker) {
  const index = source.indexOf(marker);
  if (index < 0) return null;
  const start = source.indexOf("{", index + marker.length);
  const json = balancedObject(source, start);
  try { return json ? JSON.parse(json) : null; } catch { return null; }
}

function textOf(value) {
  return value?.simpleText || (value?.runs || []).map((run) => run.text || "").join("") || "";
}

function appendQuery(url, key, value) {
  const parsed = new URL(url);
  parsed.searchParams.set(key, value);
  return parsed.toString();
}

function playlistIdFromUrl(value) {
  try { return new URL(value).searchParams.get("list"); } catch { return null; }
}

async function fetchText(url) {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) throw new Error(`YouTube request failed (${response.status}).`);
  return response.text();
}

function emit(tabId, payload) {
  return chrome.tabs.sendMessage(tabId, payload).catch(() => undefined);
}

function readableError(error) { return error instanceof Error ? error.message : String(error); }
function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }

export { balancedObject, chooseTrack, collectVideos, enumeratePlaylist, extractAssignedJson, playlistIdFromUrl, transcriptForVideo };
