// Splits knowledge/texts/*.md into review/discovery records. The former D1
// FTS table was intentionally removed in migration 0023, so this script emits
// local JSONL rather than stale SQL. Records are restricted research inputs;
// they are not deployable or publishable knowledge until passage review.
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dir = path.join(root, "knowledge/texts");
const outDir = process.argv[2] || path.join(root, ".knowledge-sql");
fs.mkdirSync(outDir, { recursive: true });

const BOOKS = [
  {
    file: "sanjay-rath_vedic-remedies-in-astrology.md",
    work: "Vedic Remedies in Astrology",
    author: "Sanjay Rath",
  },
  {
    file: "jn-bhasin_sarvarth-chintamani.md",
    work: "Sarvarth Chintamani",
    author: "J.N. Bhasin (tr.)",
  },
  {
    file: "visti-larsen_jyotisha-fundamentals.md",
    work: "Jyotisha Fundamentals",
    author: "Visti Larsen",
  },
];

const MIN_WORDS = 120;
const MAX_WORDS = 450;

function chunkBook(book) {
  const text = fs.readFileSync(path.join(dir, book.file), "utf8");
  const lines = text.split("\n");
  const sections = [];
  let title = "Introduction";
  let buffer = [];
  const flush = () => {
    const body = buffer.join("\n").trim();
    if (body) sections.push({ title, body });
    buffer = [];
  };
  for (const line of lines) {
    const heading = /^#{1,3}\s+(.*)/.exec(line);
    if (heading) {
      flush();
      const label = heading[1].trim();
      if (label && label.length <= 90 && /[a-zA-Z]/.test(label)) title = label;
      continue;
    }
    buffer.push(line);
  }
  flush();

  const chunks = [];
  let current = null;
  for (const section of sections) {
    const words = section.body.split(/\s+/).filter(Boolean);
    if (!words.length) continue;
    for (let i = 0; i < words.length; i += MAX_WORDS) {
      const piece = words.slice(i, i + MAX_WORDS).join(" ");
      if (current && current.words + piece.split(/\s+/).length <= MAX_WORDS) {
        current.text += "\n" + piece;
        current.words += piece.split(/\s+/).length;
      } else {
        if (current && current.words >= MIN_WORDS) chunks.push(current);
        else if (current && chunks.length)
          chunks[chunks.length - 1].text += "\n" + current.text;
        current = {
          section: section.title,
          text: piece,
          words: piece.split(/\s+/).length,
        };
      }
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

let records = [];
let total = 0;
for (const book of BOOKS) {
  const chunks = chunkBook(book);
  total += chunks.length;
  for (const [index, chunk] of chunks.entries()) {
    records.push({
      id: `${path.basename(book.file, ".md")}-chunk-${String(index + 1).padStart(4, "0")}`,
      file: book.file,
      work: book.work,
      author: book.author,
      section: chunk.section.slice(0, 120),
      body: chunk.text,
      rightsStatus: "restricted",
      reviewStatus: "draft",
      allowedUse: "internal-discovery-only",
    });
  }
  console.log(`${book.work}: ${chunks.length} chunks`);
}

const BATCH = 250;
let fileIndex = 0;
for (let i = 0; i < records.length; i += BATCH) {
  const file = path.join(outDir, `knowledge-${String(fileIndex++).padStart(2, "0")}.jsonl`);
  fs.writeFileSync(
    file,
    records.slice(i, i + BATCH).map((record) => JSON.stringify(record)).join("\n") + "\n",
  );
}
console.log(`total ${total} restricted draft chunks -> ${fileIndex} JSONL files in ${outDir}`);
