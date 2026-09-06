import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const manifest = JSON.parse(await readFile(resolve(root, "knowledge/lal-kitab-manifest.json"), "utf8"));
const source = await readFile(resolve(root, manifest.source.path), "utf8");
const lines = source.split(/\r?\n/);
const startPattern = /^\s*(?:#{1,3}\s*)?(?:(?:additional|general|helpful)\s+)?remed(?:y|ies)\b\s*[:;.-]?\s*(.*)$/i;

const normalize = (value) => value.replace(/<[^>]+>/g, " ").replace(/&(?:#x27|apos);/g, "'").replace(/\s+/g, " ").trim();
const familyForLine = (line) => manifest.ruleFamilies.find((family) => line >= family.lineStart && line <= family.lineEnd);
const placementForLine = (line) => manifest.planetHouseSections.find((section) => line >= section.lineStart && line <= section.lineEnd);
const families = (text) => {
  const result = [];
  if (/donat|charit|give|feed|serve|temple|maiden|labour|widow/i.test(text)) result.push("charity-service");
  if (/worship|puja|paath|prayer|mantra|durga|shiv|temple/i.test(text)) result.push("devotional");
  if (/wear|keep|bury|embed|flow|throw|place|bangle|ring|coin|pot|utensil/i.test(text)) result.push("material-placement");
  if (/avoid|do not|never|keep your|promise|conduct|contract/i.test(text)) result.push("conduct-restriction");
  if (/fast|vrat/i.test(text)) result.push("fasting");
  if (/emerald|sapphire|ruby|pearl|coral|gem|stone/i.test(text)) result.push("gemstone-mineral");
  if (/cow|dog|monkey|snake|fish|goat|bird|animal|deer/i.test(text)) result.push("animal-related");
  return result.length ? [...new Set(result)] : ["other-traditional"];
};
const riskFor = (text) => {
  const flags = [];
  if (/skin of|kill|slaughter|sacrifice|blood|serve milk to snakes/i.test(text)) flags.push("animal-harm-or-contact-risk");
  if (/fast|without food/i.test(text)) flags.push("health-screen-required");
  if (/opium|liquor|alcohol|intoxic/i.test(text)) flags.push("intoxicant-related");
  if (/gold|sapphire|ruby|emerald|diamond|donate a .*cow|equal to (?:the )?weight/i.test(text)) flags.push("cost-or-burden-review");
  if (/disease|operation|patient|health|leprosy|eczema|uterus|childless/i.test(text)) flags.push("medical-claim-context");
  if (/death|die|widow|widower|funeral|lifespan/i.test(text)) flags.push("death-or-lifespan-context");
  return flags;
};

const candidates = [];
for (let index = 0; index < lines.length; index += 1) {
  const match = lines[index].match(startPattern);
  if (!match) continue;
  const collected = [match[1]];
  let cursor = index + 1;
  while (cursor < lines.length && cursor <= index + 18) {
    const line = lines[cursor];
    if (/^#{1,3}\s+/.test(line) || startPattern.test(line)) break;
    if (/^---\s*$/.test(line)) break;
    collected.push(line);
    cursor += 1;
  }
  const instruction = normalize(collected.join(" "));
  if (instruction.length < 8) continue;
  const lineStart = index + 1;
  const lineEnd = Math.max(lineStart, cursor);
  const placement = placementForLine(lineStart);
  const family = familyForLine(lineStart);
  const context = normalize(lines.slice(Math.max(0, index - 8), index).join(" "));
  const riskFlags = riskFor(`${context} ${instruction}`);
  candidates.push({
    id: `lk-remedy-${String(candidates.length + 1).padStart(4, "0")}`,
    locator: `book-gosvami-lal-kitab:L${lineStart}-L${lineEnd}`,
    lineStart,
    lineEnd,
    scope: placement ? "planet-house" : "book-family",
    planet: placement?.planet ?? null,
    house: placement?.house ?? null,
    sourceFamily: family?.id ?? "unclassified",
    conditionContext: context,
    instruction,
    remedyFamilies: families(instruction),
    riskFlags,
    extractionStatus: "ocr-candidate",
    scanVerificationStatus: "not-verified",
    reviewStatus: "unreviewed",
    publicationStatus: riskFlags.length ? "restricted-review" : "blocked-pending-review",
  });
}

const byPlacement = Object.fromEntries(manifest.planetHouseSections.map(({ planet, house }) => {
  const ids = candidates.filter((candidate) => candidate.planet === planet && candidate.house === house).map(({ id }) => id);
  return [`${planet}:${house}`, ids];
}));
const catalog = {
  schemaVersion: "sahadeva-lal-kitab-remedy-catalog-1",
  generatedAt: new Date().toISOString(),
  source: { id: manifest.source.id, sha256: manifest.source.sourceSha256, parsedPages: manifest.source.parsedPages },
  policy: {
    executableInResearchPreview: true,
    automaticPublicationAllowed: false,
    completionDefinition: "Every candidate requires source-scan verification, atomic condition modeling, counterexamples and two independent approvals before personalized publication.",
  },
  coverage: {
    candidates: candidates.length,
    planetHouseCandidates: candidates.filter((candidate) => candidate.scope === "planet-house").length,
    generalCandidates: candidates.filter((candidate) => candidate.scope === "book-family").length,
    placementsWithCandidates: Object.values(byPlacement).filter((ids) => ids.length).length,
    expectedPlacements: 108,
    riskFlaggedCandidates: candidates.filter((candidate) => candidate.riskFlags.length).length,
  },
  catalogSha256: createHash("sha256").update(JSON.stringify(candidates)).digest("hex"),
  byPlacement,
  candidates,
};

await writeFile(resolve(root, "knowledge/lal-kitab-remedies.json"), `${JSON.stringify(catalog, null, 2)}\n`);
console.log(`Wrote ${catalog.coverage.candidates} remedy candidates; ${catalog.coverage.placementsWithCandidates}/108 planet-house sections contain an explicit remedy block.`);
