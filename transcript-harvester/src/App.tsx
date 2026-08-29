import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, Check, Copy, DownloadSimple, FileArchive, MagnifyingGlass, Play, PuzzlePiece, SpinnerGap, WarningCircle, X } from "@phosphor-icons/react";
import { strToU8, zipSync } from "fflate";
import { plainText, safeFilename, timestamp, toMarkdown, toSrt } from "../shared/export";
import type { HarvestEvent, VideoResult } from "../shared/types";

type RunState = "idle" | "connecting" | "running" | "done" | "error";
const SAMPLE_PLAYLIST = "https://www.youtube.com/playlist?list=";

function saveFile(name: string, contents: string | Uint8Array, type = "text/plain;charset=utf-8") {
  const blob = new Blob([contents as BlobPart], { type });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function exportText(video: VideoResult, format: "txt" | "md" | "srt" | "json") {
  if (format === "md") return toMarkdown(video);
  if (format === "srt") return toSrt(video);
  if (format === "json") return JSON.stringify(video, null, 2);
  return plainText(video.segments);
}

export default function App() {
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [languages, setLanguages] = useState("en");
  const [concurrency, setConcurrency] = useState(6);
  const [includeAutomatic, setIncludeAutomatic] = useState(true);
  const [extensionReady, setExtensionReady] = useState(false);
  const [runState, setRunState] = useState<RunState>("idle");
  const [requestId, setRequestId] = useState("");
  const [playlistTitle, setPlaylistTitle] = useState("Untitled playlist");
  const [videos, setVideos] = useState<VideoResult[]>([]);
  const [completed, setCompleted] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const requestRef = useRef("");

  useEffect(() => {
    function receive(event: MessageEvent<HarvestEvent>) {
      if (event.source !== window || !event.data?.type?.startsWith("TRANSCRIPT_HARVEST_")) return;
      if (event.data.type === "TRANSCRIPT_HARVEST_CONNECTED") { setExtensionReady(true); return; }
      if (!("requestId" in event.data) || event.data.requestId !== requestRef.current) return;
      if (event.data.type === "TRANSCRIPT_HARVEST_STARTED") {
        setPlaylistTitle(event.data.playlistTitle); setVideos(event.data.videos); setTotal(event.data.total); setCompleted(0); setRunState("running");
      }
      if (event.data.type === "TRANSCRIPT_HARVEST_VIDEO") {
        const updatedVideo = event.data.video;
        setVideos((current) => current.map((video) => video.id === updatedVideo.id ? updatedVideo : video));
        setCompleted(event.data.completed); setTotal(event.data.total);
      }
      if (event.data.type === "TRANSCRIPT_HARVEST_DONE") { setCompleted(event.data.completed); setRunState("done"); }
      if (event.data.type === "TRANSCRIPT_HARVEST_ERROR") { setError(event.data.error); setRunState("error"); }
    }
    window.addEventListener("message", receive);
    window.postMessage({ type: "TRANSCRIPT_HARVEST_PING" }, window.location.origin);
    return () => window.removeEventListener("message", receive);
  }, []);

  const counts = useMemo(() => ({
    complete: videos.filter((video) => video.status === "complete").length,
    missing: videos.filter((video) => video.status === "missing").length,
    failed: videos.filter((video) => video.status === "failed").length,
  }), [videos]);
  const selected = videos.find((video) => video.id === selectedId) || null;
  const visibleVideos = videos.filter((video) => `${video.title} ${video.channel || ""}`.toLowerCase().includes(query.toLowerCase()));
  const progress = total ? Math.round((completed / total) * 100) : 0;

  function start(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!extensionReady) { setRunState("error"); setError("Install or reload the Transcript Harvester extension, then refresh this page."); return; }
    try {
      const parsed = new URL(playlistUrl);
      if (!parsed.searchParams.get("list")) throw new Error();
    } catch { setRunState("error"); setError("Enter a valid YouTube playlist URL containing a list ID."); return; }
    const id = crypto.randomUUID();
    requestRef.current = id; setRequestId(id); setRunState("connecting"); setVideos([]); setCompleted(0); setTotal(0); setSelectedId(null);
    window.postMessage({
      type: "TRANSCRIPT_HARVEST_REQUEST", requestId: id, playlistUrl,
      options: { languages: languages.split(",").map((value) => value.trim()).filter(Boolean), concurrency, includeAutomatic },
    }, window.location.origin);
  }

  function downloadVideo(video: VideoResult, format: "txt" | "md" | "srt" | "json") {
    saveFile(`${String(video.position).padStart(3, "0")} - ${safeFilename(video.title)}.${format}`, exportText(video, format), format === "json" ? "application/json" : "text/plain;charset=utf-8");
  }

  function downloadZip() {
    const files: Record<string, Uint8Array> = {};
    for (const video of videos.filter((item) => item.status === "complete")) {
      const base = `${String(video.position).padStart(3, "0")} - ${safeFilename(video.title)}`;
      files[`${base}.txt`] = strToU8(exportText(video, "txt"));
      files[`${base}.md`] = strToU8(exportText(video, "md"));
      files[`${base}.srt`] = strToU8(exportText(video, "srt"));
      files[`${base}.json`] = strToU8(exportText(video, "json"));
    }
    const manifest = { playlistTitle, exportedAt: new Date().toISOString(), requestId, total, ...counts };
    files["manifest.json"] = strToU8(JSON.stringify(manifest, null, 2));
    saveFile(`${safeFilename(playlistTitle)} transcripts.zip`, zipSync(files, { level: 6 }), "application/zip");
  }

  async function copySelected() {
    if (!selected) return;
    await navigator.clipboard.writeText(plainText(selected.segments));
    setCopied(true); window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Transcript Harvester home"><span>TH</span><strong>Transcript Harvester</strong></a>
        <div className={`connection ${extensionReady ? "ready" : "offline"}`}><PuzzlePiece weight="bold" />{extensionReady ? "Extension connected" : "Extension not detected"}</div>
      </header>

      <section className="intro">
        <div><p className="eyebrow">Playlist transcript workspace</p><h1>Collect every useful word.</h1><p>Paste a playlist. Existing captions arrive in parallel, ready to search and export.</p></div>
        <div className="speed-figure" aria-label="Processing model"><strong>{concurrency}</strong><span>videos processed at once</span><div className="signal-bars" aria-hidden="true"><i/><i/><i/><i/><i/></div></div>
      </section>

      <section className="control-panel">
        <form onSubmit={start}>
          <label className="url-field"><span>YouTube playlist URL</span><div><input type="url" value={playlistUrl} onChange={(event) => setPlaylistUrl(event.target.value)} placeholder={SAMPLE_PLAYLIST} required/><button type="submit" disabled={runState === "connecting" || runState === "running"}>{runState === "connecting" ? <SpinnerGap className="spin"/> : <Play weight="fill"/>}{runState === "running" ? "Collecting" : "Start collection"}</button></div></label>
          <div className="options">
            <label><span>Preferred languages</span><input value={languages} onChange={(event) => setLanguages(event.target.value)} placeholder="en, te, hi"/><small>Comma-separated language codes</small></label>
            <label><span>Parallel requests</span><input type="range" min="1" max="12" value={concurrency} onChange={(event) => setConcurrency(Number(event.target.value))}/><small>{concurrency} at a time</small></label>
            <label className="checkbox"><input type="checkbox" checked={includeAutomatic} onChange={(event) => setIncludeAutomatic(event.target.checked)}/><span><strong>Include automatic captions</strong><small>Use YouTube-generated tracks when manual captions are missing</small></span></label>
          </div>
        </form>
        {error && <div className="error-banner"><WarningCircle weight="fill"/><span>{error}</span><button onClick={() => { setError(""); setRunState("idle"); }} aria-label="Dismiss error"><X/></button></div>}
      </section>

      <section className="results" aria-live="polite">
        <div className="results-heading">
          <div><h2>{videos.length ? playlistTitle : "Collection queue"}</h2><p>{videos.length ? `${counts.complete} ready, ${counts.missing} without captions, ${counts.failed} failed` : "Results will appear here as each transcript completes."}</p></div>
          <button className="zip-button" disabled={!counts.complete} onClick={downloadZip}><FileArchive weight="bold"/>Download ZIP</button>
        </div>

        {(runState === "running" || runState === "done") && <div className="progress-block"><div><span>{runState === "done" ? "Collection complete" : `Processing ${completed + 1 > total ? total : completed + 1} of ${total}`}</span><strong>{progress}%</strong></div><progress max="100" value={progress}>{progress}%</progress></div>}

        {!videos.length ? <div className="empty-state"><ArrowDown/><h3>One playlist, one searchable archive</h3><p>Install the bridge extension, paste a public playlist URL, and start collection.</p><code>chrome://extensions</code></div> : <div className="workspace">
          <div className="video-list">
            <label className="search"><MagnifyingGlass/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search titles and channels"/><span>{visibleVideos.length}</span></label>
            <div className="rows">{visibleVideos.map((video) => <button key={video.id} className={`video-row ${selectedId === video.id ? "selected" : ""}`} onClick={() => setSelectedId(video.id)}>
              <span className="position">{String(video.position).padStart(2, "0")}</span><span className="video-copy"><strong>{video.title}</strong><small>{video.channel || "YouTube"}</small></span><Status status={video.status}/>
            </button>)}</div>
          </div>
          <aside className="transcript-panel">
            {!selected ? <div className="select-prompt"><MagnifyingGlass/><p>Select a completed video to inspect its transcript.</p></div> : <>
              <div className="transcript-header"><div><span>{selected.languageName || selected.language || "Transcript"}</span><h3>{selected.title}</h3></div><div className="transcript-actions"><button onClick={copySelected} disabled={selected.status !== "complete"}><Copy/>{copied ? "Copied" : "Copy"}</button><button onClick={() => downloadVideo(selected, "txt")} disabled={selected.status !== "complete"}><DownloadSimple/>TXT</button></div></div>
              {selected.status === "complete" ? <div className="segments">{selected.segments.map((segment, index) => <a key={`${segment.startMs}-${index}`} href={`${selected.url}&t=${Math.floor(segment.startMs / 1000)}s`} target="_blank" rel="noreferrer"><time>{timestamp(segment.startMs).slice(0, 8)}</time><span>{segment.text}</span></a>)}</div> : <div className="unavailable"><WarningCircle/><p>{selected.error || "This transcript is not available."}</p></div>}
            </>}
          </aside>
        </div>}
      </section>
      <footer><p>Captions are processed in your browser. Download only content you have permission to use.</p><a href="https://github.com/" target="_blank" rel="noreferrer">Open-source build</a></footer>
    </main>
  );
}

function Status({ status }: { status: VideoResult["status"] }) {
  if (status === "complete") return <span className="status complete"><Check weight="bold"/>Ready</span>;
  if (status === "failed" || status === "missing") return <span className="status issue"><WarningCircle/>Unavailable</span>;
  return <span className="status pending"><SpinnerGap className={status === "processing" ? "spin" : ""}/>Waiting</span>;
}
