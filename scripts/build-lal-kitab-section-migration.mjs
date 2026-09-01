import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const manifest = JSON.parse(
  await readFile(resolve(root, "knowledge/lal-kitab-manifest.json"), "utf8"),
);
const sourceLines = (
  await readFile(resolve(root, manifest.source.path), "utf8")
).split(/\r?\n/);
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const domainForFamily = (id) => {
  const domains = [];
  if (/house|planet|aspect|residential/.test(id)) domains.push("bhava");
  if (/conjunction|royal/.test(id)) domains.push("yoga");
  if (/remed|debt/.test(id)) domains.push("remedy");
  if (/annual|period|age|movement/.test(id)) domains.push("dasha");
  if (/worked-example|rectification/.test(id)) domains.push("example");
  return domains.length ? domains : ["unclassified"];
};
const sections = [
  ...manifest.ruleFamilies.map((family) => ({
    id: `book-gosvami-lal-kitab:family:${family.id}`,
    locator: family.locator,
    heading: family.id.replaceAll("-", " "),
    lineStart: family.lineStart,
    lineEnd: family.lineEnd,
    domains: domainForFamily(family.id),
    eligibility: ["high-risk-review-only", "controlled-disclosure-only"].includes(
      family.policy,
    )
      ? "restricted"
      : "unreviewed",
    exclusionReason:
      family.policy === "controlled-disclosure-only"
        ? "Personalized disclosure requires source review, prominent caution, uncertainty and practical support; deterministic or diagnostic output is prohibited"
        : null,
  })),
  ...manifest.planetHouseSections.map((section) => ({
    id: section.id,
    locator: section.locator,
    heading: `${section.planet} in house ${section.house}`,
    lineStart: section.lineStart,
    lineEnd: section.lineEnd,
    domains: ["bhava", "remedy"],
    eligibility: "unreviewed",
    exclusionReason: null,
  })),
];
const rows = sections.map((section) => {
  const hash = createHash("sha256")
    .update(sourceLines.slice(section.lineStart - 1, section.lineEnd).join("\n"))
    .digest("hex");
  return `(${quote(section.id)},'book-gosvami-lal-kitab',${quote(section.locator)},${quote(section.heading)},2,${section.lineStart},${quote(hash)},${quote(JSON.stringify(section.domains))},${quote(section.eligibility)},${section.exclusionReason ? quote(section.exclusionReason) : "NULL"},'draft')`;
});
const sql = `PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO sources(id,title,language,author,edition,rights_status,tradition) VALUES
('book-gosvami-lal-kitab','Lal Kitab (Red Book of Astrology)','en','B. M. Gosvami','1952 edition basis','restricted','lal-kitab-gosvami-1952');

-- Generated from knowledge/lal-kitab-manifest.json. Source body text is excluded.
INSERT OR REPLACE INTO source_sections(id,source_id,locator,heading,level,line_number,section_sha256,domains_json,eligibility,exclusion_reason,classification_review_status) VALUES
${rows.join(",\n")};
`;
await writeFile(resolve(root, "migrations/0037_lal_kitab_source_sections.sql"), sql);
console.log(`Wrote ${sections.length} Lal Kitab source-section records without body text.`);
