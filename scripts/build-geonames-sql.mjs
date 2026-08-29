import { createReadStream, createWriteStream } from "node:fs";
import { createInterface } from "node:readline";
const inputs = process.argv.slice(2, -1),
  output = process.argv.at(-1);
if (inputs.length < 2 || !output)
  throw new Error(
    "Usage: node scripts/build-geonames-sql.mjs cities500.txt allCountries.txt output.sql",
  );
const out = createWriteStream(output),
  seen = new Set(),
  q = (value) => `'${String(value).replaceAll("'", "''")}'`;
out.write("PRAGMA foreign_keys=ON;\n");
let count = 0;
for (const file of inputs) {
  const lines = createInterface({
    input: createReadStream(file),
    crlfDelay: Infinity,
  });
  for await (const line of lines) {
    const c = line.split("\t"),
      id = Number(c[0]),
      population = Number(c[14] || 0);
    if (
      c.length < 19 ||
      c[6] !== "P" ||
      population < 500 ||
      !c[17] ||
      seen.has(id)
    )
      continue;
    seen.add(id);
    out.write(
      `INSERT OR IGNORE INTO geonames_locations VALUES(${id},${q(c[1])},${q(c[2])},${q(c[3])},${Number(c[4])},${Number(c[5])},${q(c[8])},${q(c[10])},${population},${q(c[17])});\n`,
    );
    count++;
  }
}
await new Promise((resolve, reject) =>
  out.end((error) => (error ? reject(error) : resolve())),
);
console.log(`Wrote ${count} GeoNames rows to ${output}`);
