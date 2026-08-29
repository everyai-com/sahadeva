import type { TranscriptSegment, VideoResult } from "./types";

export function timestamp(ms: number, srt = false) {
  const total = Math.max(0, ms);
  const hours = Math.floor(total / 3_600_000);
  const minutes = Math.floor((total % 3_600_000) / 60_000);
  const seconds = Math.floor((total % 60_000) / 1_000);
  const millis = Math.floor(total % 1_000);
  const separator = srt ? "," : ".";
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}${separator}${String(millis).padStart(3, "0")}`;
}

export function plainText(segments: TranscriptSegment[]) {
  return segments.map((segment) => segment.text.trim()).filter(Boolean).join(" ");
}

export function toMarkdown(video: VideoResult) {
  const lines = video.segments.map((segment) => `- [${timestamp(segment.startMs).slice(0, 8)}](${video.url}&t=${Math.floor(segment.startMs / 1000)}s) ${segment.text.trim()}`);
  return `# ${video.title}\n\nSource: ${video.url}\n\n${lines.join("\n")}\n`;
}

export function toSrt(video: VideoResult) {
  return video.segments.map((segment, index) => {
    const end = segment.startMs + Math.max(segment.durationMs, 500);
    return `${index + 1}\n${timestamp(segment.startMs, true)} --> ${timestamp(end, true)}\n${segment.text.trim()}`;
  }).join("\n\n");
}

export function safeFilename(value: string) {
  return value.normalize("NFKC").replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim().slice(0, 120) || "transcript";
}
