import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const brand = new URL("../public/brand/sahadeva/", import.meta.url);
const output = new URL("production/", brand);
const ink = "#242532";
const paper = "#F7F6F2";
const gold = "#B88A45";
const muted = "#77746D";

await mkdir(output, { recursive: true });

const records = [];
const record = (id, path, width, height, purpose, format, status = "approved-brand-system") =>
  records.push({ id, path, width, height, purpose, format, status });

const savePng = async (id, relativePath, pipeline, width, height, purpose) => {
  const destination = new URL(relativePath, output);
  await mkdir(new URL("./", destination), { recursive: true });
  await pipeline.png({ compressionLevel: 9, palette: true }).toFile(fileURLToPath(destination));
  record(id, `production/${relativePath}`, width, height, purpose, "png");
};

const iconSource = new URL("app-icon.svg", brand);
const smallIconSource = new URL("app-icon-small.svg", brand);
for (const [id, path, size, purpose] of [
  ["icon.favicon.32", "icons/favicon-32.png", 32, "browser favicon"],
  ["icon.apple-touch.180", "icons/apple-touch-icon-180.png", 180, "Apple touch icon"],
  ["icon.pwa.192", "icons/pwa-192.png", 192, "PWA icon"],
  ["icon.play.512", "icons/play-store-512.png", 512, "Google Play icon"],
  ["icon.maskable.512", "icons/maskable-512.png", 512, "maskable PWA and Android icon"],
  ["icon.app-store.1024", "icons/app-store-1024.png", 1024, "Apple App Store icon"],
]) {
  const source = id === "icon.favicon.32" || id === "icon.apple-touch.180" || id === "icon.pwa.192" ? smallIconSource : iconSource;
  let image = sharp(fileURLToPath(source)).resize(size, size, { fit: "cover" });
  if (id === "icon.app-store.1024" || id === "icon.maskable.512") image = image.flatten({ background: ink });
  await savePng(id, path, image, size, size, purpose);
}

await sharp(fileURLToPath(smallIconSource)).resize(192, 192).png({ compressionLevel:9, palette:true }).toFile(fileURLToPath(new URL("../../../icon-192.png", output)));
await sharp(fileURLToPath(iconSource)).resize(512, 512).flatten({ background:ink }).png({ compressionLevel:9, palette:true }).toFile(fileURLToPath(new URL("../../../icon-512.png", output)));
await writeFile(new URL("../../../icon.svg", output), await readFile(iconSource));

for (const [source, stem] of [["mark.svg", "mark"], ["lockup.svg", "lockup"], ["stacked.svg", "stacked"]]) {
  for (const width of [512, 1024, 2048]) {
    const image = sharp(fileURLToPath(new URL(source, brand))).resize({ width, withoutEnlargement: false });
    await savePng(`brand.${stem}.${width}`, `logos/${stem}-${width}.png`, image, width, width, `${stem} transparent export`);
  }
}

const escapeXml = (value) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const master = ({ width, height, title, subtitle, eyebrow = "SAHADEVA", dark = false, vertical = false }) => {
  const bg = dark ? ink : paper;
  const fg = dark ? paper : ink;
  const x = Math.round(width * .08);
  const titleY = Math.round(height * (vertical ? .61 : .47));
  const titleSize = Math.round(width * (vertical ? .073 : .064));
  const maxLine = vertical ? 16 : 24;
  const words = title.split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    if (`${line} ${word}`.trim().length > maxLine) { lines.push(line); line = word; }
    else line = `${line} ${word}`.trim();
  }
  if (line) lines.push(line);
  const titleSvg = lines.map((item, index) => `<text x="${x}" y="${titleY + index * titleSize * 1.02}" class="title">${escapeXml(item)}</text>`).join("");
  const subtitleY = titleY + lines.length * titleSize * 1.02 + Math.round(titleSize * .55);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs><radialGradient id="a" cx="82%" cy="4%" r="72%"><stop stop-color="${gold}" stop-opacity=".24"/><stop offset="1" stop-color="${bg}" stop-opacity="0"/></radialGradient><pattern id="g" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="${gold}" stroke-opacity=".08"/></pattern></defs>
    <rect width="100%" height="100%" fill="${bg}"/><rect width="100%" height="100%" fill="url(#a)"/><rect width="100%" height="100%" fill="url(#g)"/>
    <circle cx="${width * .78}" cy="${height * .22}" r="${Math.min(width,height) * .26}" fill="none" stroke="${gold}" stroke-opacity=".23" stroke-width="2"/><circle cx="${width * .78}" cy="${height * .22}" r="${Math.min(width,height) * .18}" fill="none" stroke="${gold}" stroke-opacity=".13"/>
    <text x="${x}" y="${Math.round(height * .14)}" class="eyebrow">${escapeXml(eyebrow)}</text>
    ${titleSvg}<text x="${x}" y="${subtitleY}" class="sub">${escapeXml(subtitle)}</text>
    <path d="M${x} ${height * .9}H${width - x}" stroke="${gold}" stroke-opacity=".55"/><text x="${x}" y="${height * .94}" class="foot">TRADITIONAL IN MEANING · MODERN IN EXPRESSION · HUMAN IN EXPLANATION</text>
    <style>.title{font:600 ${titleSize}px Georgia,serif;fill:${fg};letter-spacing:-2px}.eyebrow,.foot{font:600 ${Math.max(16,Math.round(width*.015))}px Arial,sans-serif;letter-spacing:4px;fill:${gold}}.sub{font:400 ${Math.max(22,Math.round(width*.026))}px Arial,sans-serif;fill:${dark ? "#D7D2C8" : muted}}</style>
  </svg>`;
};

const campaigns = [
  { id:"social.og", path:"social/open-graph-1200x630", width:1200, height:630, title:"Clarity for the life you are living.", subtitle:"A transparent Jyotish reading of your chart.", dark:true, purpose:"website and link preview" },
  { id:"social.square", path:"social/editorial-square-1080", width:1080, height:1080, title:"Your chart, explained like a human.", subtitle:"Sahadeva turns calculation into calm, useful context.", purpose:"social square master" },
  { id:"social.story", path:"social/editorial-story-1080x1920", width:1080, height:1920, title:"Ancient knowledge. Present-day clarity.", subtitle:"Your cosmic companion for timing, relationships and life decisions.", dark:true, vertical:true, purpose:"story and vertical campaign master" },
  { id:"store.play.feature", path:"store/play-feature-1024x500", width:1024, height:500, title:"Your cosmic companion.", subtitle:"Jyotish, translated into clarity for life today.", dark:true, purpose:"Google Play feature graphic" },
  { id:"press.cover", path:"press/brand-cover-1600x900", width:1600, height:900, title:"The Sahadeva visual system.", subtitle:"A source-controlled language for Jyotish, time, family and explanation.", purpose:"press kit and presentation cover" },
];

for (const item of campaigns) {
  const svg = master(item);
  const svgPath = `${item.path}.svg`;
  const pngPath = `${item.path}.png`;
  await mkdir(new URL("./", new URL(svgPath, output)), { recursive: true });
  await writeFile(new URL(svgPath, output), svg);
  record(`${item.id}.master`, `production/${svgPath}`, item.width, item.height, item.purpose, "svg");
  await savePng(item.id, pngPath, sharp(Buffer.from(svg)), item.width, item.height, item.purpose);
}

const devotionalSource = new URL("illustrations/krishna-v1.webp", brand);
try {
  const card = sharp(fileURLToPath(devotionalSource)).resize(1080, 1350, { fit:"cover", position:"attention" });
  await savePng("devotional.krishna.editorial", "devotional/krishna-editorial-1080x1350.png", card, 1080, 1350, "editorial devotional artwork; not a brand mark");
  records.at(-1).status = "pending-qualified-cultural-review";
} catch { /* optional until Krishna artwork exists */ }

await writeFile(new URL("registry.json", output), `${JSON.stringify({ schemaVersion:"1.0.0", generatedAt:"source-controlled", palette:{ ink, paper, gold, muted }, assets:records }, null, 2)}\n`);
console.log(`Generated ${records.length} Sahadeva production assets.`);
