import { createReadStream } from "node:fs";
import { open } from "node:fs/promises";
import { createInterface } from "node:readline";
import path from "node:path";

const [
  citiesFile,
  allCountriesFile,
  outputFile = "shared/geonames.generated.ts",
] = process.argv.slice(2);
if (!citiesFile || !allCountriesFile) {
  console.error(
    "Usage: node scripts/import-geonames.mjs <cities500.txt> <allCountries.txt> [output.ts]",
  );
  process.exit(2);
}

const rows = new Map();
async function ingest(file, minimumPopulation) {
  const lines = createInterface({
    input: createReadStream(file),
    crlfDelay: Infinity,
  });
  for await (const line of lines) {
    const columns = line.split("\t");
    if (columns.length < 19 || columns[6] !== "P") continue;
    const population = Number(columns[14] || 0);
    if (
      (columns[8] !== "IN" && population < minimumPopulation) ||
      !columns[17]
    )
      continue;
    const id = columns[0],
      aliases = columns[3].split(",").filter(Boolean).slice(0, 12);
    rows.set(id, {
      name: columns[1],
      aliases,
      state: columns[10] || columns[8] || "Unknown",
      country: columns[8],
      latitude: Number(columns[4]),
      longitude: Number(columns[5]),
      timezone: columns[17],
      timezoneOffset: 0,
      precision: "city-center",
    });
  }
}

// cities500 provides broad city coverage. allCountries supplements populated
// places omitted from that extract. India keeps all populated-place features
// because GeoNames reports population as unknown (0) for most villages.
await ingest(citiesFile, 500);
await ingest(allCountriesFile, 500);
const records = [...rows.values()].sort(
  (a, b) => a.name.localeCompare(b.name) || a.country.localeCompare(b.country),
);
const target = path.resolve(outputFile),
  handle = await open(target, "w");
await handle.writeFile(
  `import type { KnownLocation } from "./locations";\nexport const GEONAMES_LOCATIONS: KnownLocation[] = ${JSON.stringify(records)};\n`,
);
await handle.close();
console.log(`Imported ${records.length} populated places into ${target}`);
