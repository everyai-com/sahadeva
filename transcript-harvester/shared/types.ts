export type TranscriptSegment = { text: string; startMs: number; durationMs: number };

export type VideoResult = {
  id: string;
  title: string;
  url: string;
  channel?: string;
  position: number;
  language?: string;
  languageName?: string;
  source?: "manual" | "automatic" | "translated";
  segments: TranscriptSegment[];
  status: "pending" | "processing" | "complete" | "missing" | "failed";
  error?: string;
};

export type HarvestOptions = {
  languages: string[];
  concurrency: number;
  includeAutomatic: boolean;
};

export type HarvestRequest = {
  type: "TRANSCRIPT_HARVEST_REQUEST";
  requestId: string;
  playlistUrl: string;
  options: HarvestOptions;
};

export type HarvestEvent =
  | { type: "TRANSCRIPT_HARVEST_CONNECTED"; requestId?: string }
  | { type: "TRANSCRIPT_HARVEST_STARTED"; requestId: string; playlistTitle: string; total: number; videos: VideoResult[] }
  | { type: "TRANSCRIPT_HARVEST_VIDEO"; requestId: string; video: VideoResult; completed: number; total: number }
  | { type: "TRANSCRIPT_HARVEST_DONE"; requestId: string; completed: number; total: number }
  | { type: "TRANSCRIPT_HARVEST_ERROR"; requestId: string; error: string };
