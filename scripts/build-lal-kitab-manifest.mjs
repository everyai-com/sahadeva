import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const sourcePath = resolve(root, "knowledge/texts/bm-gosvami_lal-kitab.md");
const outputPath = resolve(root, "knowledge/lal-kitab-manifest.json");
const source = await readFile(sourcePath, "utf8");
const lines = source.split(/\r?\n/);
const sourceSha256 = createHash("sha256").update(source).digest("hex");

const chunkMarkers = [];
for (let index = 0; index < lines.length; index += 1) {
  const match = lines[index].match(/^## Source PDF pages (\d+)-(\d+)/);
  if (match)
    chunkMarkers.push({
      line: index + 1,
      pageStart: Number(match[1]),
      pageEnd: Number(match[2]),
    });
}

const chunkForLine = (line) => {
  const marker = [...chunkMarkers].reverse().find((item) => item.line <= line);
  return marker
    ? { pageStart: marker.pageStart, pageEnd: marker.pageEnd }
    : { pageStart: 1, pageEnd: 75 };
};

const headings = lines.flatMap((text, index) => {
  const match = text.match(/^(#{1,3})\s+(.+?)\s*$/);
  if (!match) return [];
  return [
    {
      line: index + 1,
      level: match[1].length,
      title: match[2],
      sourcePdfChunk: chunkForLine(index + 1),
    },
  ];
});

const planets = [
  "Jupiter",
  "Sun",
  "Moon",
  "Venus",
  "Mars",
  "Mercury",
  "Saturn",
  "Rahu",
  "Ketu",
];
const overrides = new Map([
  ["Venus:5", 11183],
  ["Saturn:2", 13843],
  ["Saturn:12", 14548],
]);
const candidates = [];
for (let index = 7400; index < lines.length; index += 1) {
  const normalized = lines[index]
    .replace(/^#{1,3}\s*/, "")
    .replace(/\b1N\b/i, "IN")
    .trim();
  const match = normalized.match(
    /^(JUPITER|SUN|MOON|VENUS|MARS|MERCURY|SATURN|RAHU|KETU)\s+IN\s+HOUSE\s+NO\.?\s*(1[0-2]|[1-9])\b/i,
  );
  if (match)
    candidates.push({
      planet: planets.find(
        (planet) => planet.toLowerCase() === match[1].toLowerCase(),
      ),
      house: Number(match[2]),
      lineStart: index + 1,
    });
}

const canonicalPlanetHouseStarts = [];
for (const planet of planets) {
  for (let house = 1; house <= 12; house += 1) {
    const key = `${planet}:${house}`;
    const lineStart =
      overrides.get(key) ||
      candidates.find(
        (candidate) => candidate.planet === planet && candidate.house === house,
      )?.lineStart;
    if (!lineStart) throw new Error(`Missing Lal Kitab section ${key}`);
    canonicalPlanetHouseStarts.push({ planet, house, lineStart });
  }
}
canonicalPlanetHouseStarts.sort((first, second) => first.lineStart - second.lineStart);
const planetHouseSections = canonicalPlanetHouseStarts.map((section, index) => {
    const { planet, house, lineStart } = section;
    const lineEnd = (canonicalPlanetHouseStarts[index + 1]?.lineStart || 15970) - 1;
    return {
      id: `lal-kitab-${planet.toLowerCase()}-house-${house}`,
      planet,
      house,
      lineStart,
      lineEnd: Math.max(lineStart, lineEnd),
      locator: `book-gosvami-lal-kitab:L${lineStart}-L${Math.max(lineStart, lineEnd)}`,
      sourcePdfChunk: chunkForLine(lineStart),
      extractionStatus: "source-located-ocr-unverified",
      publicationStatus: "blocked",
    };
  });

const conjunctionHeadings = headings.filter((heading) => {
  const names = heading.title.match(
    /Jupiter|Sun|Moon|Venus|Mars|Mercury|Saturn|Rahu|Ketu/gi,
  );
  return names && new Set(names.map((name) => name.toLowerCase())).size >= 2;
});

const familyDefinitions = [
  ["front-matter-contents-glossary-and-mantras", 1, 543, "research-only"],
  ["introduction-and-astro-palmistry", 544, 1921, "research-only"],
  ["fate-and-birth-time-doubt", 1922, 1990, "context-only"],
  ["houses-planets-friendship-age-cycles", 1991, 2543, "candidate-rules"],
  ["fixed-and-joint-houses", 2544, 3180, "candidate-rules"],
  ["aspects-and-relationships", 3181, 3468, "candidate-rules"],
  ["debts-and-complicated-planets", 3469, 3719, "high-risk-review-only"],
  ["major-period-moon-chart-and-deceit", 3720, 3999, "candidate-rules"],
  ["remedies", 4000, 4387, "high-risk-review-only"],
  ["planet-effects-joint-houses-and-lone-planets", 4388, 4716, "candidate-rules"],
  ["child-development-with-planetary-movement", 4717, 4760, "high-risk-review-only"],
  ["rectification-and-chart-types", 4761, 5070, "research-workflow"],
  ["annual-prediction-and-worked-examples", 5071, 5804, "research-workflow"],
  ["royal-combinations", 5805, 5904, "candidate-rules"],
  ["planetary-articles-relations-and-professions", 5905, 6206, "candidate-rules"],
  ["residential-houses", 6207, 6393, "candidate-rules"],
  ["planet-dominated-people-service-and-travel", 6394, 6517, "candidate-rules"],
  ["marriage-and-progeny", 6518, 6971, "high-risk-review-only"],
  ["money", 6972, 7148, "high-risk-review-only"],
  ["health-disease-age-and-death", 7149, 7469, "controlled-disclosure-only"],
  ["nine-planet-monographs-and-108-house-sections", 7470, 15969, "candidate-rules"],
  ["two-planet-conjunctions", 15970, 19168, "candidate-rules"],
  ["three-and-multi-planet-conjunctions", 19169, lines.length, "candidate-rules"],
];
const ruleFamilies = familyDefinitions.map(([id, lineStart, lineEnd, policy]) => {
  const familyText = lines.slice(lineStart - 1, lineEnd).join("\n");
  return {
    id,
    lineStart,
    lineEnd,
    locator: `book-gosvami-lal-kitab:L${lineStart}-L${lineEnd}`,
    sourcePdfChunkStart: chunkForLine(lineStart),
    sourcePdfChunkEnd: chunkForLine(lineEnd),
    headingCount: headings.filter(
      (heading) => heading.line >= lineStart && heading.line <= lineEnd,
    ).length,
    policy,
    lexicalSignals: {
      remedy: (familyText.match(/\bremed(?:y|ies)\b/gi) || []).length,
      ageOrYear: (familyText.match(/\b(?:age|year|years)\b/gi) || []).length,
      benefic: (familyText.match(/\bbenefic(?:ial)?\b/gi) || []).length,
      malefic: (familyText.match(/\bmalefic\b/gi) || []).length,
      death: (familyText.match(/\bdeath|die|dies|dead\b/gi) || []).length,
      disease: (familyText.match(/\bdisease|illness|sickness\b/gi) || []).length,
      marriageOrSpouse: (
        familyText.match(/\bmarriage|wife|husband|spouse\b/gi) || []
      ).length,
      childOrProgeny: (
        familyText.match(/\bchild|children|progeny|issue\b/gi) || []
      ).length,
    },
  };
});

const manifest = {
  schemaVersion: "sahadeva-lal-kitab-manifest-1",
  generatedAt: "2026-08-31",
  source: {
    id: "book-gosvami-lal-kitab",
    title: "Lal Kitab (Red Book of Astrology)",
    author: "B. M. Gosvami",
    editionBasis: "1952 edition",
    parsedPages: 778,
    sourceFormat: "Fire-PDF Markdown",
    sourceSha256,
    path: "knowledge/texts/bm-gosvami_lal-kitab.md",
    verificationNotice:
      "Rule-critical wording, numerical combinations and remedies require comparison with the source scan.",
  },
  coverage: {
    headings: headings.length,
    planetHouseSections: planetHouseSections.length,
    conjunctionHeadings: conjunctionHeadings.length,
    expectedPlanetHouseSections: 108,
  },
  policy: {
    traditionNamespace: "lal-kitab-gosvami-1952",
    mixingAllowed: false,
    automaticPredictionAllowed: false,
    automaticRemedyAllowed: false,
    retentionPolicy:
      "Preserve and review every source claim, including difficult or high-risk historical material.",
    controlledDisclosureTopics: [
      "illness and disease symbolism",
      "death and lifespan claims",
      "fertility and impotence claims",
      "marriage success, separation and widowhood claims",
      "costly, ritual, intoxicant-related and initiation-dependent remedies",
      "animal-related historical practices",
    ],
    disclosureRule:
      "Reviewed claims may be explained as source-attributed traditional material with a prominent caution, uncertainty, contrary evidence and practical support. They must not be presented as diagnosis, certainty, professional advice or coercive instruction.",
    neverRecommend: [
      "animal harm",
      "withholding medical care",
      "self-harm or harm to another person",
      "guaranteed death or lifespan dates",
      "guaranteed fertility, pregnancy or marriage outcomes",
      "financially coercive or fear-based remedies",
    ],
  },
  chunkMarkers,
  headings,
  ruleFamilies,
  planetHouseSections,
  conjunctionHeadings,
};

await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(
  `Wrote ${outputPath}: ${headings.length} headings, ${planetHouseSections.length} planet-house sections, ${conjunctionHeadings.length} conjunction headings`,
);
