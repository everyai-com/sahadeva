import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const corpusDir = path.join(root, "transcript-harvester/downloads/Learn Astrology in Telugu");
const manifest = JSON.parse(fs.readFileSync(path.join(corpusDir, "manifest.json"), "utf8"));
const jsonFiles = new Map(fs.readdirSync(corpusDir).filter((name) => /^\d{3} - .*\.json$/.test(name)).map((name) => [Number(name.slice(0, 3)), name]));

function family(position) {
  if (position <= 20) return "foundations";
  if (position <= 46) return "yogas-doshas-and-states";
  if (position <= 59) return "strength-and-ashtakavarga";
  if (position <= 87) return "nakshatras";
  if (position <= 97) return "graha-significations";
  if (position <= 113) return "divisional-charts";
  if (position <= 127) return "western-astrology";
  if (position <= 139) return "kp-astrology";
  if (position <= 158) return "chart-reading-career-travel-finance";
  if (position <= 182) return "relationships-and-marriage";
  if (position <= 192) return "occupation-specific";
  if (position <= 202) return "health-and-education";
  if (position <= 204) return "muhurta";
  if (position <= 207) return "birth-time-rectification";
  if (position <= 212) return "childbirth-and-fertility";
  if (position === 213) return "baby-naming";
  return "practice-and-philosophy";
}

function method(position) {
  if (position >= 114 && position <= 127) return "western";
  if (position >= 128 && position <= 139) return "kp";
  return "rva-specific";
}

function sensitivity(position) {
  if ((position >= 193 && position <= 197) || position === 204 || (position >= 208 && position <= 212)) return "restricted";
  if ((position >= 155 && position <= 182) || (position >= 188 && position <= 192)) return "high-impact";
  return "standard";
}

function transcriptMetrics(segments) {
  const text = segments.map((segment) => segment.text || "").join(" ");
  const chars = [...text].filter((character) => !/\s/u.test(character));
  const count = (pattern) => chars.filter((character) => pattern.test(character)).length;
  const telugu = count(/[\u0C00-\u0C7F]/u);
  const replacement = count(/[�]/u);
  const foreign = count(/[\u0F00-\u0FFF\u4E00-\u9FFF\uAC00-\uD7AF]/u);
  const teluguRatio = chars.length ? telugu / chars.length : 0;
  const corruptionRatio = chars.length ? (replacement + foreign) / chars.length : 1;
  return { characterCount: chars.length, teluguRatio, corruptionRatio, replacementCharacters: replacement, foreignScriptCharacters: foreign };
}

function qualityStatus(source, metrics) {
  if (metrics.characterCount < 100 || metrics.teluguRatio < 0.35 || metrics.corruptionRatio >= 0.002) return "retranscribe";
  if (source === "transcribed" || metrics.teluguRatio < 0.7 || metrics.corruptionRatio > 0) return "repair";
  return "usable";
}

const videos = manifest.results.map((entry) => {
  const file = jsonFiles.get(entry.position);
  if (!file) throw new Error(`Missing JSON transcript for position ${entry.position}`);
  const transcript = JSON.parse(fs.readFileSync(path.join(corpusDir, file), "utf8"));
  const metrics = transcriptMetrics(transcript.segments || []);
  const durationMs = Math.max(0, ...(transcript.segments || []).map((segment) => Number(segment.startMs || 0) + Number(segment.durationMs || 0)));
  return {
    sourceId: `rva-te-${String(entry.position).padStart(3, "0")}`,
    playlistPosition: entry.position,
    videoId: entry.id,
    title: entry.title,
    url: entry.url,
    language: entry.language || "te",
    transcriptSource: entry.source,
    artifactStatus: entry.status,
    durationSeconds: Math.round(durationMs / 1000),
    segmentCount: entry.segmentCount,
    topicFamily: family(entry.position),
    method: method(entry.position),
    sensitivity: sensitivity(entry.position),
    qualityStatus: qualityStatus(entry.source, metrics),
    metrics,
    artifacts: { json: file, markdown: file.replace(/\.json$/, ".md"), srt: file.replace(/\.json$/, ".srt"), text: file.replace(/\.json$/, ".txt") },
  };
});

const counts = (key) => Object.fromEntries([...new Set(videos.map((video) => video[key]))].sort().map((value) => [value, videos.filter((video) => video[key] === value).length]));
const catalog = {
  schemaVersion: "sahadeva-knowledge-catalog-1",
  generatedAt: manifest.updatedAt,
  playlist: { id: manifest.playlistId, title: manifest.playlistTitle, publicVideoCount: manifest.publicVideoCount },
  summary: { videos: videos.length, durationHours: Number((videos.reduce((sum, video) => sum + video.durationSeconds, 0) / 3600).toFixed(2)), transcriptSources: counts("transcriptSource"), qualityStatuses: counts("qualityStatus"), sensitivity: counts("sensitivity"), publishableRules: 0 },
  videos,
};

fs.mkdirSync(path.join(root, "knowledge"), { recursive: true });
fs.writeFileSync(path.join(root, "knowledge/rva-telugu-catalog.json"), `${JSON.stringify(catalog, null, 2)}\n`);

const q = (value) => `'${String(value).replaceAll("'", "''")}'`;
const sourceRows = videos.map((video) => `(${q(video.sourceId)},${q(video.title)},'te','RVA Telugu',NULL,'restricted',${q(video.method)})`).join(",\n");
const assetRows = videos.map((video) => `(${q(video.sourceId)},${q(manifest.playlistId)},${video.playlistPosition},${q(video.videoId)},${q(video.url)},${q(video.transcriptSource)},${q(video.artifactStatus)},${video.durationSeconds},${video.segmentCount},${q(video.topicFamily)},${q(video.method)},${q(video.sensitivity)},${q(video.qualityStatus)},${q(JSON.stringify(video.metrics))},${q(JSON.stringify(video.artifacts))},${q(manifest.updatedAt)})`).join(",\n");
const sql = `PRAGMA foreign_keys = ON;\n\nCREATE TABLE knowledge_source_assets (\n  source_id TEXT PRIMARY KEY REFERENCES sources(id),\n  collection_id TEXT NOT NULL,\n  collection_position INTEGER NOT NULL,\n  external_id TEXT NOT NULL UNIQUE,\n  source_url TEXT NOT NULL,\n  transcript_source TEXT NOT NULL CHECK (transcript_source IN ('automatic','manual','transcribed')),\n  artifact_status TEXT NOT NULL CHECK (artifact_status IN ('complete','missing')),\n  duration_seconds INTEGER NOT NULL,\n  segment_count INTEGER NOT NULL,\n  topic_family TEXT NOT NULL,\n  method_namespace TEXT NOT NULL CHECK (method_namespace IN ('rva-specific','western','kp')),\n  sensitivity TEXT NOT NULL CHECK (sensitivity IN ('standard','high-impact','restricted')),\n  quality_status TEXT NOT NULL CHECK (quality_status IN ('usable','repair','retranscribe','reviewed')),\n  quality_metrics_json TEXT NOT NULL,\n  artifact_manifest_json TEXT NOT NULL,\n  source_updated_at TEXT NOT NULL,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  UNIQUE(collection_id, collection_position)\n);\n\nCREATE INDEX knowledge_assets_quality_idx ON knowledge_source_assets(quality_status, topic_family);\nCREATE INDEX knowledge_assets_sensitivity_idx ON knowledge_source_assets(sensitivity);\n\nINSERT OR IGNORE INTO sources(id,title,language,author,edition,rights_status,tradition) VALUES\n${sourceRows};\n\nINSERT OR REPLACE INTO knowledge_source_assets(source_id,collection_id,collection_position,external_id,source_url,transcript_source,artifact_status,duration_seconds,segment_count,topic_family,method_namespace,sensitivity,quality_status,quality_metrics_json,artifact_manifest_json,source_updated_at) VALUES\n${assetRows};\n`;
fs.writeFileSync(path.join(root, "migrations/0009_rva_knowledge_catalog.sql"), sql);
console.log(JSON.stringify(catalog.summary, null, 2));
