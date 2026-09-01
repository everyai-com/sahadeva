import { lstat, rm } from "node:fs/promises";
import { resolve, sep } from "node:path";

const buildRoot = resolve("dist", "sahadeva"),
  generatedDevSecrets = resolve(buildRoot, ".dev.vars");

if (!generatedDevSecrets.startsWith(`${buildRoot}${sep}`)) {
  throw new Error("Refusing to scrub a path outside the Worker build directory");
}

const entry = await lstat(generatedDevSecrets).catch(() => null);
if (entry) {
  if (!entry.isFile()) throw new Error("Refusing to remove a non-file build entry");
  await rm(generatedDevSecrets);
  console.log("Removed generated Worker .dev.vars copy from dist.");
}
