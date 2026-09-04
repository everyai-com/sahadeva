import { readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";

const root = process.cwd();
const assetDirectory = join(root, "dist/client/assets");
const entries = await readdir(assetDirectory);
const mainScripts = entries.filter(
  (name) => name.startsWith("index-") && name.endsWith(".js"),
);
if (mainScripts.length !== 1)
  throw new Error(
    `Expected one main client bundle, found ${mainScripts.length}.`,
  );
const mainPath = join(assetDirectory, mainScripts[0]);
const mainBytes = (await stat(mainPath)).size;
const workerPath = join(root, "dist/sahadeva/index.js");
const workerBytes = (await stat(workerPath)).size;
// Full VSOP87D adds ~1.5 MB of deterministic coefficient tables. The emitted
// Worker remains below 1 MB gzip and comfortably inside Cloudflare's limit.
const budgets = [
  // The multilingual voice, conversation-alignment, and complete Sahadeva UI
  // layers bring the measured production entry to ~355 KB. Keep less than 6%
  // headroom so future growth still fails loudly.
  { path: mainPath, actual: mainBytes, maximum: 375_000 },
  { path: workerPath, actual: workerBytes, maximum: 4_600_000 /* raised for better-auth + drizzle */ },
];
for (const budget of budgets) {
  console.log(
    `${relative(root, budget.path)}: ${budget.actual} / ${budget.maximum} bytes`,
  );
  if (budget.actual > budget.maximum) process.exitCode = 1;
}
