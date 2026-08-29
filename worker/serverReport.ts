import type { ChartResult } from "../shared/schema";
import { CELL_BY_SIGN_FOR_PDF } from "./southChartLayout";

const W = 595.28,
  H = 841.89;
const safe = (v: unknown) => String(v ?? "").replace(/[^\x20-\x7e]/g, " ");
const esc = (v: unknown) => safe(v).replace(/([\\()])/g, "\\$1");
const text = (v: unknown, x: number, y: number, size = 10, bold = false) =>
  `BT /${bold ? "F2" : "F1"} ${size} Tf ${x} ${y} Td (${esc(v)}) Tj ET\n`;
const rect = (x: number, y: number, w: number, h: number, fill = false) =>
  `${x} ${y} ${w} ${h} re ${fill ? "f" : "S"}\n`;
const wrap = (v: unknown, width = 88) => {
  const lines: string[] = [];
  let line = "";
  for (const word of safe(v).split(/\s+/)) {
    if (`${line} ${word}`.trim().length > width) {
      if (line) lines.push(line);
      line = word;
    } else line = `${line} ${word}`.trim();
  }
  if (line) lines.push(line);
  return lines;
};
const base = (title: string, page: number) =>
  `0.97 0.95 0.90 rg 0 0 ${W} ${H} re f\n0.14 0.13 0.11 RG 0.14 0.13 0.11 rg\n` +
  text(title, 48, 790, 20, true) +
  text(`Sahadeva research report - Page ${page}`, 48, 26, 8);

function chartPage(chart: ChartResult) {
  let out =
    base("SAHADEVA JYOTISH REPORT", 1) +
    text(
      `${chart.input.date} ${chart.input.time} - ${chart.input.place}`,
      48,
      760,
    );
  const x = 96,
    y = 310,
    size = 404,
    unit = size / 4;
  const dignities = new Map(chart.advanced.dignities.map((d) => [d.name, d]));
  for (let sign = 0; sign < 12; sign++) {
    const [cx, cy] = CELL_BY_SIGN_FOR_PDF[sign],
      px = x + cx * unit,
      py = y + (3 - cy) * unit;
    out +=
      rect(px, py, unit, unit) +
      text(sign + 1, px + 5, py + unit - 12, 7, true);
    chart.placements
      .filter((p) => p.sign === sign)
      .slice(0, 5)
      .forEach((p, i) => {
        const d = dignities.get(p.name),
          flags = [p.retrograde ? "R" : "", d?.combust ? "C" : ""]
            .filter(Boolean)
            .join("/");
        out += text(
          `${p.name.slice(0, 2)} ${p.degree.toFixed(1)}${flags ? ` ${flags}` : ""}`,
          px + 5,
          py + unit - 27 - i * 11,
          7.5,
        );
      });
  }
  out += `0.87 0.84 0.77 rg ${rect(x + unit, y + unit, unit * 2, unit * 2, true)}0.14 0.13 0.11 rg\n`;
  out +=
    text("SAHADEVA", 236, 525, 13, true) + text(chart.input.name, 220, 500);
  const lagna = chart.placements.find((p) => p.name === "Lagna")!,
    moon = chart.placements.find((p) => p.name === "Moon")!;
  return (
    out +
    text("Chart anchors", 48, 270, 14, true) +
    text(
      `Lagna: ${lagna.signName} ${lagna.degree.toFixed(2)}  Moon: ${moon.signName} ${moon.degree.toFixed(2)} ${moon.nakshatra} pada ${moon.pada}`,
      48,
      247,
    ) +
    text(
      `Engine: ${chart.engine.version} - ${chart.engine.astronomyModel}`,
      48,
      228,
      8,
    )
  );
}

function placementsPage(chart: ChartResult, report: Record<string, any>) {
  let out = base("PLACEMENTS", 2),
    y = 754;
  for (const p of chart.placements) {
    const d = chart.advanced.dignities.find((row) => row.name === p.name);
    out +=
      text(p.name, 48, y, 10, true) +
      text(
        `${p.signName} ${p.degree.toFixed(2)} - ${p.nakshatra} p${p.pada} - ${d?.dignity || "n/a"}${p.retrograde ? " - retrograde" : ""}${d?.combust ? " - combust" : ""}`,
        145,
        y,
        9,
      );
    y -= 24;
  }
  out += text("Current timing", 48, y - 12, 14, true);
  y -= 40;
  const timing = report.currentTiming?.periods;
  if (timing) {
    out += text(`As of ${safe(report.currentTiming.asOf).slice(0, 10)}`, 48, y);
    y -= 23;
    out += text(
      `${timing.mahadasha} / ${timing.antardasha} / ${timing.pratyantardasha}`,
      48,
      y,
      13,
      true,
    );
    y -= 28;
    for (const [label, b] of Object.entries(timing.boundaries || {}) as Array<
      [string, { startIso: string; endIso: string }]
    >) {
      out +=
        text(label[0].toUpperCase() + label.slice(1), 48, y, 9, true) +
        text(
          `${b.startIso.slice(0, 10)} to ${b.endIso.slice(0, 10)}`,
          145,
          y,
          9,
        );
      y -= 20;
    }
  }
  return out + text("Sahadeva research report - Page 2", 48, 26, 8);
}

function safetyPage(report: Record<string, any>) {
  let out = base("EVIDENCE, UNCERTAINTY & SAFETY", 4),
    y = 750;
  for (const section of [
    report.sourceCoverage,
    report.uncertainty,
    report.safety,
  ].filter(Boolean)) {
    const summary = JSON.stringify(section)
      .replace(/[{}\[\]"]/g, " ")
      .replace(/,/g, ", ");
    for (const line of wrap(summary, 92)) {
      if (y < 170) break;
      out += text(line, 48, y, 9);
      y -= 14;
    }
    y -= 18;
  }
  out += text("Important limitation", 48, 120, 12, true);
  wrap(
    "Astrology is presented as an interpretive cultural tradition, not scientific fact. Do not use this report for medical, legal, financial, fertility, lifespan, safety, or guaranteed-event decisions.",
    88,
  ).forEach((line, i) => {
    out += text(line, 48, 98 - i * 13, 9);
  });
  return out;
}

function depthPage(report: Record<string, any>) {
  let out = base("CONSULTATION DEPTH", 3), y = 754;
  const depth = report.consultationDepth || {};
  out += text("Special Lagnas", 48, y, 14, true); y -= 26;
  for (const item of depth.targetedLagnas?.values || []) {
    out += text(`${item.name}: sign ${Number(item.sign) + 1} ${Number(item.degree).toFixed(3)} deg`, 48, y, 9); y -= 18;
  }
  y -= 14; out += text("Cross-Varga synthesis", 48, y, 14, true); y -= 26;
  const varga = depth.vargaSynthesis;
  if (varga) { out += text(`${varga.topic}: ${varga.judgment} (${varga.score}/100)`, 48, y, 10, true); y -= 22; for (const row of varga.rows || []) { out += text(`${row.varga}: ${row.confirmation} - lord house ${row.lordHouse}`, 48, y, 9); y -= 18; } }
  y -= 14; out += text("Strength lineage", 48, y, 14, true); y -= 26;
  for (const row of depth.strengthLineage?.vimsopaka?.sets?.shodashavarga || []) { out += text(`${row.name}: Vimsopaka ${Number(row.score20).toFixed(3)} / 20`, 48, y, 9); y -= 18; }
  y -= 14; out += text("Additional Dashas", 48, y, 14, true); y -= 26;
  const dashas=depth.additionalDashas;if(dashas){out+=text(`Yogini ${dashas.yogini?.birth?.yogini} - Ashtottari ${dashas.ashtottari?.birth?.lord} - Kalachakra sign ${Number(dashas.kalachakra?.birth?.birthSign)+1}`,48,y,9);y-=20;out+=text("Vimshottari, Yogini, Ashtottari, Kalachakra, Chara and Narayana retain separate conventions.",48,y,8);}
  return out + text("Structural evidence only; sequence totals are not lifespan inferences.", 48, 60, 8, true);
}

function assemble(streams: string[]) {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${streams.map((_, i) => `${5 + i * 2} 0 R`).join(" ")}] /Count ${streams.length} >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  ];
  streams.forEach((stream, i) => {
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${6 + i * 2} 0 R >>`,
    );
    objects.push(
      `<< /Length ${new TextEncoder().encode(stream).length} >>\nstream\n${stream}endstream`,
    );
  });
  let pdf = "%PDF-1.7\n%SAHADEVA\n";
  const offsets = [0];
  objects.forEach((object, i) => {
    offsets.push(new TextEncoder().encode(pdf).length);
    pdf += `${i + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = new TextEncoder().encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++)
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}

export async function buildServerReportPdf(
  chart: ChartResult,
  report: Record<string, any>,
) {
  return assemble([
    chartPage(chart),
    placementsPage(chart, report),
    depthPage(report),
    safetyPage(report),
  ]);
}
