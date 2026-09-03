import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const out = new URL("../public/brand/cosmithra/", import.meta.url);
await mkdir(out, { recursive: true });
await mkdir(new URL("graha/", out), { recursive: true });

const ink = "#242532";
const gold = "#B87327";
const pale = "#F7F6F2";

const svg = (size, body, { viewBox = "0 0 24 24", title = "" } = {}) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${size}" height="${size}" role="img" aria-label="${title}"><title>${title}</title>${body}</svg>\n`;

const common = `fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"`;
const glyphs = {
  surya: `<g ${common}><circle cx="12" cy="12" r="3.35"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.35 5.35l2.05 2.05M16.6 16.6l2.05 2.05M18.65 5.35 16.6 7.4M7.4 16.6l-2.05 2.05"/></g>`,
  chandra: `<g ${common}><circle cx="12" cy="12" r="6.7" stroke-dasharray="31 12" opacity=".42"/><path d="M15.5 5.9a6.7 6.7 0 1 0 1.4 11.2A5.55 5.55 0 0 1 15.5 5.9Z"/></g>`,
  mangala: `<g ${common}><path d="M5 19 18.9 5.1M13.9 5.1h5v5M6.1 14.8l3.1 3.1M8.25 12.75l2.9 2.9"/></g>`,
  budha: `<g ${common}><circle cx="12" cy="12" r="2.2"/><circle cx="6" cy="7" r="1.55"/><circle cx="18" cy="17" r="1.55"/><path d="M7.25 8.05 10.3 10.6M13.7 13.4l3.05 2.55M6.9 16.9c2.8 2.3 7.7 1.75 9.85-1"/></g>`,
  guru: `<g ${common}><circle cx="10.8" cy="12" r="3.25"/><path d="M16.7 7.1a7.1 7.1 0 1 0 .25 9.55M16.7 7.1V4.8M16.7 7.1h2.3"/></g>`,
  shukra: `<g ${common}><path d="M12 3.4 15.1 9 20.6 12 15.1 15 12 20.6 8.9 15 3.4 12 8.9 9 12 3.4Z"/><path d="m12 7.7 1.65 2.65L16.3 12l-2.65 1.65L12 16.3l-1.65-2.65L7.7 12l2.65-1.65L12 7.7Z"/></g>`,
  shani: `<g ${common}><path d="M6 18.2h12M7.3 14.8a4.7 4.7 0 0 1 9.4 0v3.4H7.3v-3.4Z"/><path d="M4.8 12.1a7.35 7.35 0 0 1 14.4 0"/></g>`,
  rahu: `<g ${common}><circle cx="11" cy="12" r="6.4" opacity=".38"/><path d="M12.7 5.8a6.4 6.4 0 0 1 3.9 10.7 6.25 6.25 0 0 1-7.9-9.65 6.8 6.8 0 0 0 4 12.3"/></g>`,
  ketu: `<g ${common}><path d="M8.1 6.6c1.5-2.45 5.15-2.45 6.7 0 1.4 2.2-.25 4.05-2.35 5.45-1.7 1.15-1.8 2.6-.9 3.65"/><path d="m9.8 14.6-1.2 2.05M13 16.6l-.35 2.2M8.35 19.1l-.55 1"/></g>`,
};

const names = { surya: "Sūrya", chandra: "Chandra", mangala: "Maṅgala", budha: "Budha", guru: "Guru", shukra: "Śukra", shani: "Śani", rahu: "Rāhu", ketu: "Ketu" };
const colors = { surya: "#D4A017", chandra: "#9AAAC1", mangala: "#B84A32", budha: "#C9A33A", guru: "#B58B2A", shukra: "#A8A6B0", shani: "#1D274D", rahu: "#2B2B3C", ketu: "#777780" };

for (const [id, body] of Object.entries(glyphs)) {
  await writeFile(new URL(`graha/${id}-24.svg`, out), svg(24, body, { title: `${names[id]} micro glyph` }));
  const symbolBody = `<g style="color:${colors[id]}">${body}</g><circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" stroke-width=".45" opacity=".18"/>`;
  await writeFile(new URL(`graha/${id}-48.svg`, out), svg(48, symbolBody, { title: `${names[id]} symbol` }));
  const emblemBody = `<defs><radialGradient id="m"><stop offset="0" stop-color="${colors[id]}" stop-opacity=".2"/><stop offset="1" stop-color="${colors[id]}" stop-opacity=".02"/></radialGradient></defs><circle cx="64" cy="64" r="58" fill="url(#m)"/><circle cx="64" cy="64" r="53" fill="none" stroke="${colors[id]}" stroke-width="1" opacity=".36"/><g transform="translate(16 16) scale(4)" style="color:${colors[id]}">${body}</g><circle cx="64" cy="64" r="43" fill="none" stroke="${colors[id]}" stroke-width=".65" stroke-dasharray="2 5" opacity=".32"/>`;
  await writeFile(new URL(`graha/${id}-128.svg`, out), svg(128, emblemBody, { viewBox: "0 0 128 128", title: `${names[id]} emblem` }));
}

const markGeometry = `<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="32" cy="32" r="11" stroke-width="1.8"/><circle cx="32" cy="32" r="25" stroke-width="1" opacity=".72"/><path d="M32 4 40.2 16.8 54.6 9.4 47.2 23.8 60 32 47.2 40.2 54.6 54.6 40.2 47.2 32 60 23.8 47.2 9.4 54.6 16.8 40.2 4 32 16.8 23.8 9.4 9.4 23.8 16.8Z" stroke-width="1.35"/><path d="m32 7.8 6.8 17.4L56.2 32l-17.4 6.8L32 56.2l-6.8-17.4L7.8 32l17.4-6.8L32 7.8Z" stroke-width=".8" opacity=".78"/></g>`;
await writeFile(new URL("mark.svg", out), svg(64, `<g style="color:${gold}">${markGeometry}</g>`, { viewBox: "0 0 64 64", title: "Cosmithra brand mark" }));
await writeFile(new URL("mark-monochrome.svg", out), svg(64, `<g style="color:${ink}">${markGeometry}</g>`, { viewBox: "0 0 64 64", title: "Cosmithra monochrome brand mark" }));
await writeFile(new URL("app-icon.svg", out), svg(512, `<defs><radialGradient id="bg"><stop stop-color="#24213B"/><stop offset="1" stop-color="#10121B"/></radialGradient></defs><rect width="64" height="64" rx="14" fill="url(#bg)"/><g style="color:#D6A64A">${markGeometry}</g>`, { viewBox: "0 0 64 64", title: "Cosmithra app icon" }));
await writeFile(new URL("lockup.svg", out), svg(420, `<g transform="translate(0 4)" style="color:${gold}">${markGeometry}</g><text x="82" y="30" fill="${ink}" font-family="Georgia, 'Times New Roman', serif" font-size="24" letter-spacing="3.2">COSMITHRA</text><text x="83" y="49" fill="${ink}" font-family="Arial, sans-serif" font-size="8.5" letter-spacing="2.2">YOUR COSMIC COMPANION</text>`, { viewBox: "0 0 420 64", title: "Cosmithra logo" }));

const registry = {
  schemaVersion: "1.0.0",
  license: "Repository license",
  philosophy: "Traditional in meaning. Modern in expression. Human in explanation.",
  sourceLayers: ["sanskrit", "literal", "classical", "consumer", "visual-dna"],
  assets: Object.keys(glyphs).flatMap((id) => [24, 48, 128].map((size) => ({ id: `graha.${id}.${size}`, family: "navagraha", name: names[id], size, path: `graha/${id}-${size}.svg`, color: colors[id], canonical: true }))),
};
await writeFile(new URL("registry.json", out), `${JSON.stringify(registry, null, 2)}\n`);

console.log(`Generated ${registry.assets.length + 4} canonical Cosmithra assets in ${join(out.pathname)}`);
