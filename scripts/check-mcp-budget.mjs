#!/usr/bin/env node
// MCP usability budget: default discovery must stay compact, expert tools stay
// callable, full-matrix descriptions must steer to compact tools, and
// single-call place tolerance must exist. Fails CI when the catalog regresses
// to the 86-tool / ~120KB state that broke host-model tool choice.
import { readFileSync } from "node:fs";

const worker = readFileSync("worker/index.ts", "utf8");
const locations = readFileSync("shared/locations.ts", "utf8");
const failures = [];

// 1. Default catalog size
const defMatch = worker.match(
  /const DEFAULT_MCP_TOOL_NAMES = new Set\(\[([\s\S]*?)\]\)/,
);
const defCount = defMatch
  ? (defMatch[1].match(/"[a-z_0-9]+"/g) || []).length
  : 0;
if (!defMatch) failures.push("DEFAULT_MCP_TOOL_NAMES block missing");
if (defCount > 16)
  failures.push(`default MCP catalog too large: ${defCount} tools (budget <=16)`);
if (defCount < 10)
  failures.push(`default MCP catalog too small: ${defCount} tools (expected >=10)`);

// 2. tools/list must paginate every protocol version (cursor + pageSize)
if (!worker.includes("request.params?.cursor"))
  failures.push("tools/list pagination (cursor) missing");
if (!worker.includes("includeExpert"))
  failures.push("tools/list includeExpert escape hatch missing");

// 3. Full-matrix steering prefixes
for (const name of [
  "calculate_chart_from_known_place",
  "calculate_south_indian_chart",
  "generate_full_life_report",
]) {
  const i = worker.indexOf(`name: "${name}"`);
  const desc = worker.slice(i, i + 1200);
  if (!desc.includes("EXPERT"))
    failures.push(`tool ${name} description missing EXPERT steering prefix`);
}

// 4. Single-call place tolerance
if (!locations.includes("bestEffortKnownLocation"))
  failures.push("shared/locations.ts missing bestEffortKnownLocation");
if (!worker.includes("bestEffortKnownLocation"))
  failures.push("worker/index.ts does not use bestEffortKnownLocation");
if (!worker.includes("autoResolved"))
  failures.push("autoResolved location notice missing in worker");

// 5. Compact response guidance on full chart
if (!worker.includes("responseGuidance"))
  failures.push("full-chart responseGuidance notice missing");

// 6. Rough tools/list byte estimate: default 13 tools x ~1.4KB avg schema
// must stay well under the 120KB all-tools state.
const toolCount = (worker.match(/\{\s*name:\s*"[a-z_0-9]+",\s*\n\s*title:/g) || [])
  .length;
if (toolCount > 90)
  failures.push(`total defined tools ${toolCount} exceeds sanity cap 90`);
const estimatedDefaultBytes = defCount * 1600;
if (estimatedDefaultBytes > 40000)
  failures.push(
    `estimated default tools/list ~${estimatedDefaultBytes} bytes exceeds 40KB budget`,
  );

console.log(
  `MCP budget: default=${defCount} tools, defined~${toolCount}, est default list ~${estimatedDefaultBytes} bytes`,
);
if (failures.length) {
  console.error("MCP BUDGET FAIL:");
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}
console.log("MCP budget OK");
