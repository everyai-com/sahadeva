import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const root = process.cwd();
const ignored = new Set([".git", "node_modules", "dist", "output", "tmp", ".wrangler"]);
const textExtensions = new Set([".ts", ".tsx", ".js", ".mjs", ".json", ".jsonc", ".md", ".sql", ".yml", ".yaml", ".html", ".css"]);
const rules = [
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["AWS access key", /\bAKIA[0-9A-Z]{16}\b/],
  ["GitHub token", /\bgh[ps]_[A-Za-z0-9]{30,}\b/],
  ["OpenAI API key", /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}\b/],
];

async function files(directory) {
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) found.push(...await files(path));
    else if (textExtensions.has(extname(entry.name)) || entry.name === ".env.example") found.push(path);
  }
  return found;
}

const findings = [];
for (const path of await files(root)) {
  const content = await readFile(path, "utf8");
  for (const [name, pattern] of rules) if (pattern.test(content)) findings.push(`${relative(root, path)}: ${name}`);
}
if (findings.length) {
  console.error(`Potential committed secrets:\n${findings.join("\n")}`);
  process.exit(1);
}
console.log("Secret scan passed.");
