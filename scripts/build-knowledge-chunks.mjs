// Splits knowledge/texts/*.md into retrieval chunks and emits SQL batches
// for the knowledge_fts D1 table (FTS5). Excerpt-sized chunks only — the
// corpus is grounding material, never republished verbatim.
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

const esc = (value) => value.replace(/'/g, "''");
let statements = [];
let total = 0;
for (const book of BOOKS) {
  const chunks = chunkBook(book);
  total += chunks.length;
  for (const chunk of chunks) {
    statements.push(
      `INSERT INTO knowledge_fts (work, author, section, body) VALUES ('${esc(book.work)}','${esc(book.author)}','${esc(chunk.section).slice(0, 120)}','${esc(chunk.text)}');`,
    );
  }
  console.log(`${book.work}: ${chunks.length} chunks`);
}

const BATCH = 250;
let fileIndex = 0;
for (let i = 0; i < statements.length; i += BATCH) {
  const file = path.join(outDir, `knowledge-${String(fileIndex++).padStart(2, "0")}.sql`);
  fs.writeFileSync(file, statements.slice(i, i + BATCH).join("\n") + "\n");
}
console.log(`total ${total} chunks -> ${fileIndex} SQL files in ${outDir}`);
