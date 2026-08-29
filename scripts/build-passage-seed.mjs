import fs from "node:fs";
import path from "node:path";

const catalog = JSON.parse(
  fs.readFileSync(
    process.argv[2] || "knowledge/rva-telugu-catalog.json",
    "utf8",
  ),
);
const transcriptDir =
    process.argv[3] ||
    "transcript-harvester/downloads/Learn Astrology in Telugu",
  output = process.argv[4] || "tmp/usable-passages.sql";
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`,
  statements = ["PRAGMA foreign_keys=ON;"];
for (const video of catalog.videos.filter(
  (item) => item.qualityStatus === "usable",
)) {
  const file = path.join(transcriptDir, video.artifacts.json);
  if (!fs.existsSync(file)) continue;
  const transcript = JSON.parse(fs.readFileSync(file, "utf8")),
    segments = transcript.segments || [];
  for (let offset = 0; offset < segments.length; offset += 20) {
    const group = segments.slice(offset, offset + 20),
      text = group
        .map((item) => item.text)
        .join(" ")
        .trim();
    if (text.length < 80) continue;
    const start = group[0].startMs || 0,
      end = (group.at(-1).startMs || 0) + (group.at(-1).durationMs || 0),
      id = `${video.sourceId}-p-${String(offset / 20 + 1).padStart(3, "0")}`,
      locator = `${Math.floor(start / 60000)}:${String(Math.floor(start / 1000) % 60).padStart(2, "0")}-${Math.floor(end / 60000)}:${String(Math.floor(end / 1000) % 60).padStart(2, "0")}`;
    statements.push(
      `INSERT OR IGNORE INTO passages(id,source_id,locator,original_text,review_status) VALUES(${quote(id)},${quote(video.sourceId)},${quote(locator)},${quote(text)},'draft');`,
    );
  }
}
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, statements.join("\n"));
console.log(
  `Wrote ${statements.length - 1} draft passage inserts to ${output}`,
);
