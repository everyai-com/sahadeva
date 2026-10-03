// Vendors the canonical Sahadeva glyphs and brand icons from a checkout of
// everyai-com/sahadeva-asset-library into public/, so the app never depends
// on a private package at install time.
//
//   node scripts/sync-asset-library.mjs [path-to-asset-library]
//
// Defaults to ../sahadeva-asset-library. Only the 24px micro glyphs (which use
// `currentColor`, so the app can tint them) and the production brand icons are
// copied; the source commit is recorded in public/glyphs/SOURCE.json.
import { execFileSync } from "node:child_process";
import { copyFile, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

const root = process.cwd();
const library = resolve(process.argv[2] ?? join(root, "../sahadeva-asset-library"));
const assets = join(library, "assets");
if (!existsSync(join(assets, "system-registry.json")))
  throw new Error(`No Sahadeva asset library found at ${library}`);

const out = join(root, "public/glyphs");
await rm(out, { recursive: true, force: true });

const families = {
  graha: "graha",
  rashi: "rashi",
  bhava: "bhava",
  nakshatra: "nakshatra",
  "life-area": "life-area",
  remedy: "remedy",
  timing: "timing",
};
let count = 0;
for (const [family, dir] of Object.entries(families)) {
  await mkdir(join(out, family), { recursive: true });
  for (const file of await readdir(join(assets, dir))) {
    if (!file.endsWith("-24.svg")) continue;
    await copyFile(join(assets, dir, file), join(out, family, file.replace(/-24\.svg$/, ".svg")));
    count++;
  }
}
for (const family of ["tithi", "yoga", "karana"]) {
  await mkdir(join(out, family), { recursive: true });
  for (const file of await readdir(join(assets, "panchanga", family))) {
    if (!file.endsWith(".svg")) continue;
    await copyFile(join(assets, "panchanga", family, file), join(out, family, file));
    count++;
  }
}

// Brand: the approved mark plus production PWA / favicon / touch icons.
const brand = [
  ["mark.svg", "glyphs/mark.svg"],
  ["app-icon.svg", "icon.svg"],
  ["production/icons/favicon-32.png", "favicon-32.png"],
  ["production/icons/apple-touch-icon-180.png", "apple-touch-icon.png"],
  ["production/icons/pwa-192.png", "icon-192.png"],
  ["production/icons/maskable-512.png", "icon-512-maskable.png"],
  ["production/icons/play-store-512.png", "icon-512.png"],
  ["production/social/open-graph-1200x630.png", "og-image.png"],
];
for (const [from, to] of brand) {
  await copyFile(join(assets, from), join(root, "public", to));
  count++;
}

let commit = "unknown";
try {
  commit = execFileSync("git", ["-C", library, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
} catch {
  /* not a git checkout */
}
await writeFile(
  join(out, "SOURCE.json"),
  `${JSON.stringify({ source: "everyai-com/sahadeva-asset-library", commit, files: count }, null, 2)}\n`,
);
console.log(`Synced ${count} files from ${library} @ ${commit.slice(0, 7)}`);
