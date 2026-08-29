import { PDFDocument } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { ChartResult, Placement } from "../shared/schema";
import { SIGNS } from "../shared/constants";
import { TELUGU_GRAHAS, TELUGU_SIGNS } from "../shared/telugu";
import { buildEverydayReading } from "../shared/everydayReading";
import { queryDashaAt } from "../shared/dashaCalendar";
import { calculateStrengthLineage } from "../shared/strengthLineage";
import { additionalDashaStatus } from "../shared/additionalDashas";

const WIDTH = 1240,
  HEIGHT = 1754,
  MARGIN = 86,
  INK = "#17211d",
  MUTED = "#65716b",
  ACCENT = "#ad5d36",
  PAPER = "#fbf8f1";
type Page = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  y: number;
  number: number;
};
function createPage(number: number): Page {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = ACCENT;
  ctx.fillRect(0, 0, WIDTH, 18);
  return { canvas, ctx, y: MARGIN, number };
}
function text(
  page: Page,
  value: string,
  x: number,
  y: number,
  size = 25,
  weight = 400,
  color = INK,
  maxWidth = WIDTH - 2 * MARGIN,
) {
  page.ctx.font = `${weight} ${size}px "Noto Sans Telugu", sans-serif`;
  page.ctx.fillStyle = color;
  page.ctx.fillText(value, x, y, maxWidth);
}
function wrap(
  page: Page,
  value: string,
  x: number,
  size = 25,
  lineHeight = 36,
  maxWidth = WIDTH - 2 * MARGIN,
) {
  const words = value.split(/\s+/),
    lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (page.ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  for (const item of lines) {
    text(page, item, x, page.y, size);
    page.y += lineHeight;
  }
  return lines.length;
}
function heading(page: Page, value: string) {
  page.y += 18;
  text(page, value, MARGIN, page.y, 34, 700, INK);
  page.y += 24;
  page.ctx.strokeStyle = "#d8d1c2";
  page.ctx.beginPath();
  page.ctx.moveTo(MARGIN, page.y);
  page.ctx.lineTo(WIDTH - MARGIN, page.y);
  page.ctx.stroke();
  page.y += 42;
}
function footer(page: Page, chart: ChartResult) {
  text(
    page,
    `Sahadeva ${chart.engine.version} · research preview · page ${page.number}`,
    MARGIN,
    HEIGHT - 42,
    18,
    400,
    MUTED,
  );
}
const signCell = (sign: number) =>
  [
    [1, 0],
    [2, 0],
    [3, 0],
    [3, 1],
    [3, 2],
    [3, 3],
    [2, 3],
    [1, 3],
    [0, 3],
    [0, 2],
    [0, 1],
    [0, 0],
  ][sign];
function southChart(
  page: Page,
  placements: Array<Pick<Placement, "name" | "sign">>,
  x: number,
  y: number,
  title: string,
  te: boolean,
) {
  const size = 430,
    cell = size / 4;
  page.ctx.strokeStyle = "#7e887f";
  page.ctx.lineWidth = 2;
  for (let index = 0; index <= 4; index++) {
    page.ctx.beginPath();
    page.ctx.moveTo(x + index * cell, y);
    page.ctx.lineTo(x + index * cell, y + size);
    page.ctx.stroke();
    page.ctx.beginPath();
    page.ctx.moveTo(x, y + index * cell);
    page.ctx.lineTo(x + size, y + index * cell);
    page.ctx.stroke();
  }
  page.ctx.fillStyle = PAPER;
  page.ctx.fillRect(x + cell + 2, y + cell + 2, cell * 2 - 4, cell * 2 - 4);
  text(page, title, x, y - 18, 27, 700);
  for (let sign = 0; sign < 12; sign++) {
    const [column, row] = signCell(sign),
      items = placements
        .filter((item) => item.sign === sign)
        .map((item) =>
          te ? TELUGU_GRAHAS[item.name] || item.name : item.name,
        );
    text(
      page,
      te ? TELUGU_SIGNS[sign] : SIGNS[sign],
      x + column * cell + 8,
      y + row * cell + 25,
      16,
      700,
      ACCENT,
      cell - 12,
    );
    let offset = 48;
    for (const item of items) {
      text(
        page,
        item,
        x + column * cell + 8,
        y + row * cell + offset,
        15,
        400,
        INK,
        cell - 12,
      );
      offset += 19;
    }
  }
}
function tableRow(
  page: Page,
  columns: string[],
  widths: number[],
  bold = false,
) {
  let x = MARGIN;
  const height = 39;
  if (page.y + height > HEIGHT - 90) return false;
  for (let index = 0; index < columns.length; index++) {
    text(
      page,
      columns[index],
      x,
      page.y,
      20,
      bold ? 700 : 400,
      bold ? INK : MUTED,
      widths[index] - 10,
    );
    x += widths[index];
  }
  page.y += height;
  return true;
}
function iso(jd: number) {
  return new Date((jd - 2440587.5) * 86400000).toISOString().slice(0, 10);
}

export async function buildChartPdf(
  chart: ChartResult,
  options: { privacySafe?: boolean } = {},
) {
  const te = chart.input.language === "te",
    fontBytes = await fetch("/fonts/NotoSansTelugu.ttf").then((response) =>
      response.arrayBuffer(),
    ),
    fontFace = new FontFace("Noto Sans Telugu", fontBytes);
  await fontFace.load();
  document.fonts.add(fontFace);
  await document.fonts.ready;
  const pages: Page[] = [];
  let page = createPage(1);
  pages.push(page);
  text(
    page,
    te ? "సహదేవ జ్యోతిష్య నివేదిక" : "SAHADEVA JYOTISH REPORT",
    MARGIN,
    page.y,
    43,
    700,
    ACCENT,
  );
  page.y += 52;
  wrap(
    page,
    options.privacySafe
      ? te
        ? "గోప్యతా-సురక్షిత నివేదిక"
        : "Privacy-safe report"
      : `${chart.input.name} · ${chart.input.place}`,
    MARGIN,
    24,
    34,
  );
  page.y += 18;
  text(
    page,
    `${chart.input.date} ${chart.input.time} · ${chart.input.timezone || `UTC${chart.input.timezoneOffset >= 0 ? "+" : ""}${chart.input.timezoneOffset}`}`,
    MARGIN,
    page.y,
    22,
    400,
    MUTED,
  );
  page.y += 64;
  const lagna = chart.placements.find((item) => item.name === "Lagna")!,
    moon = chart.placements.find((item) => item.name === "Moon")!;
  text(
    page,
    `${te ? "లగ్నం" : "Lagna"}: ${te ? TELUGU_SIGNS[lagna.sign] : SIGNS[lagna.sign]} ${lagna.degree.toFixed(2)}°`,
    MARGIN,
    page.y,
    27,
    700,
  );
  text(
    page,
    `${te ? "జన్మ నక్షత్రం" : "Janma Nakshatra"}: ${moon.nakshatra} Pada ${moon.pada}`,
    MARGIN + 480,
    page.y,
    27,
    700,
  );
  page.y += 72;
  southChart(page, chart.advanced.vargas.D1, MARGIN, page.y, "Rasi D1", te);
  southChart(
    page,
    chart.advanced.vargas.D9,
    WIDTH - MARGIN - 430,
    page.y,
    "Navamsa D9",
    te,
  );
  page.y += 500;
  heading(page, te ? "పంచాంగం మరియు ఆధారం" : "Panchanga and evidence");
  const p = chart.panchanga;
  wrap(
    page,
    `${p.vara} · ${p.tithi} ${p.paksha} · ${p.nakshatra} · ${p.yoga} · ${p.karana}`,
    MARGIN,
    23,
    34,
  );
  page.y += 16;
  wrap(
    page,
    `${te ? "పద్ధతి" : "Methodology"}: ${chart.input.methodology} · ${te ? "గృహ పద్ధతి" : "house system"}: ${chart.input.houseSystem} · confidence ${chart.advanced.guidance.confidence.score}/100`,
    MARGIN,
    21,
    31,
  );
  footer(page, chart);
  let current: null | ReturnType<typeof queryDashaAt> = null;
  try {
    current = queryDashaAt(chart, new Date().toISOString());
  } catch {
    /* outside supported life timeline */
  }
  const reading = buildEverydayReading(chart, current, te ? "te" : "en"),
    prioritySections = reading.sections.filter((section) =>
      ["focus", "timing", "counsel"].includes(section.id),
    );
  page = createPage(pages.length + 1);
  pages.push(page);
  text(
    page,
    te ? "సంప్రదింపు సారాంశం" : "CONSULTATION BRIEF",
    MARGIN,
    page.y,
    20,
    700,
    ACCENT,
  );
  page.y += 58;
  text(
    page,
    te ? "ముందుగా ముఖ్యమైన విషయాలు" : "What matters most",
    MARGIN,
    page.y,
    45,
    700,
    INK,
  );
  page.y += 58;
  wrap(page, reading.summary, MARGIN, 23, 34);
  page.y += 34;
  for (let index = 0; index < prioritySections.length; index++) {
    const section = prioritySections[index];
    text(
      page,
      `0${index + 1}  ${section.title}`,
      MARGIN,
      page.y,
      27,
      700,
      index === 1 ? ACCENT : INK,
    );
    page.y += 40;
    wrap(page, section.message, MARGIN + 38, 21, 31, WIDTH - 2 * MARGIN - 38);
    page.y += 12;
    for (const evidence of section.evidence)
      wrap(
        page,
        `Evidence: ${evidence}`,
        MARGIN + 38,
        17,
        25,
        WIDTH - 2 * MARGIN - 38,
      );
    page.y += 28;
  }
  page.ctx.fillStyle = "#eee7da";
  page.ctx.fillRect(MARGIN, page.y, WIDTH - 2 * MARGIN, 105);
  page.y += 35;
  text(
    page,
    `${te ? "విశ్వసనీయత" : "Confidence"}: ${reading.confidence.score}/100 · ${reading.confidence.label}`,
    MARGIN + 24,
    page.y,
    20,
    700,
  );
  page.y += 30;
  wrap(
    page,
    reading.confidence.message,
    MARGIN + 24,
    17,
    25,
    WIDTH - 2 * MARGIN - 48,
  );
  footer(page, chart);
  page = createPage(pages.length + 1);
  pages.push(page);
  heading(page, te ? "గ్రహ స్థితులు మరియు షడ్బలం" : "Placements and Shadbala");
  tableRow(
    page,
    [
      te ? "గ్రహం" : "Planet",
      te ? "రాశి" : "Sign",
      "Degree",
      "Nakshatra",
      "Shadbala",
      "Ratio",
    ],
    [170, 190, 130, 260, 170, 150],
    true,
  );
  for (const placement of chart.placements) {
    const strength = chart.advanced.planetaryStates.avasthas.find(
      (item) => item.name === placement.name,
    );
    tableRow(
      page,
      [
        te ? TELUGU_GRAHAS[placement.name] || placement.name : placement.name,
        te ? TELUGU_SIGNS[placement.sign] : SIGNS[placement.sign],
        placement.degree.toFixed(3),
        placement.nakshatra,
        strength?.shadbalaTotalVirupas?.toFixed(2) || "-",
        strength?.requiredStrengthRatio?.toFixed(3) || "-",
      ],
      [170, 190, 130, 260, 170, 150],
    );
  }
  page.y += 28;
  heading(page, te ? "భావ బలం" : "Bhava Bala");
  if (chart.advanced.houses.bhavaBala.status === "computed") {
    tableRow(
      page,
      ["House", "Lord", "Lord Bala", "Dig Bala", "Drishti", "Total"],
      [130, 170, 190, 170, 170, 190],
      true,
    );
    for (const value of chart.advanced.houses.bhavaBala.values as Array<{
      house: number;
      lord: string;
      bhavadhipatiBalaVirupas: number;
      bhavaDigBalaVirupas: number;
      bhavaDrishtiBalaVirupas: number;
      totalVirupas: number;
    }>)
      tableRow(
        page,
        [
          String(value.house),
          value.lord,
          value.bhavadhipatiBalaVirupas.toFixed(2),
          value.bhavaDigBalaVirupas.toFixed(2),
          value.bhavaDrishtiBalaVirupas.toFixed(2),
          value.totalVirupas.toFixed(2),
        ],
        [130, 170, 190, 170, 170, 190],
      );
  } else wrap(page, chart.advanced.houses.bhavaBala.notice, MARGIN, 22, 32);
  footer(page, chart);
  page = createPage(pages.length + 1);
  pages.push(page);
  heading(page, te ? "లోతైన నిర్మాణ ఆధారం" : "Consultation depth evidence");
  const strengthLineage = calculateStrengthLineage(chart);
  tableRow(
    page,
    ["Planet", "Vimsopaka / 20", "Ishta", "Kashta"],
    [260, 260, 220, 220],
    true,
  );
  for (const row of strengthLineage.vimsopaka.sets.shodashavarga) {
    const phala = strengthLineage.ishtaKashta.values.find(
      (item) => item.name === row.name,
    );
    tableRow(
      page,
      [
        row.name,
        row.score20.toFixed(3),
        phala?.ishtaPhala?.toFixed(3) || "—",
        phala?.kashtaPhala?.toFixed(3) || "—",
      ],
      [260, 260, 220, 220],
    );
  }
  page.y += 24;
  heading(page, te ? "ప్రత్యేక లగ్నాలు" : "Special Lagnas");
  for (const item of chart.advanced.houses.targetedLagnas.values)
    wrap(
      page,
      `${item.name}: ${te ? TELUGU_SIGNS[item.sign] : SIGNS[item.sign]} ${item.degree.toFixed(3)}°`,
      MARGIN,
      21,
      31,
    );
  page.y += 18;
  heading(page, te ? "అదనపు దశలు" : "Additional Dasha systems");
  const dashas = additionalDashaStatus(chart);
  wrap(
    page,
    `Yogini: ${dashas.yogini.birth.yogini} · Ashtottari: ${dashas.ashtottari.birth.lord} · Kalachakra: sign ${dashas.kalachakra.birth.birthSign + 1} · Chara and Narayana: selected versioned conventions`,
    MARGIN,
    20,
    30,
  );
  page.y += 18;
  wrap(
    page,
    "These are structural calculations. Cross-system disagreement is retained and no sequence total is interpreted as lifespan.",
    MARGIN,
    18,
    27,
  );
  footer(page, chart);
  page = createPage(pages.length + 1);
  pages.push(page);
  heading(page, te ? "వింశోత్తరి కాలరేఖ" : "Vimshottari timeline");
  tableRow(
    page,
    ["Mahadasha", "Start", "End", "Antardashas"],
    [210, 230, 230, 360],
    true,
  );
  for (const maha of chart.advanced.vimshottariTimeline) {
    if (
      !tableRow(
        page,
        [
          maha.lord,
          iso(maha.startJulianDay),
          iso(maha.endJulianDay),
          maha.subPeriods.map((item) => item.lord).join(" · "),
        ],
        [210, 230, 230, 360],
      )
    )
      break;
  }
  page.y += 28;
  heading(
    page,
    te ? "అనిశ్చితి మరియు పరిమితులు" : "Uncertainty and limitations",
  );
  wrap(
    page,
    chart.advanced.uncertainty.boundaryWarnings.length
      ? chart.advanced.uncertainty.boundaryWarnings.join(" ")
      : "No sampled Lagna, Moon-pada, or Navamsa-Lagna boundary crossed the declared birth-time uncertainty interval.",
    MARGIN,
    21,
    31,
  );
  page.y += 20;
  wrap(page, chart.engine.notice, MARGIN, 21, 31);
  page.y += 20;
  wrap(
    page,
    "Astrology is presented as an interpretive cultural tradition, not scientific fact. This report does not provide medical, legal, financial, fertility, or deterministic life predictions.",
    MARGIN,
    21,
    31,
  );
  page.y += 24;
  text(
    page,
    `JD ${chart.engine.julianDay.toFixed(6)} · Lahiri ${chart.engine.ayanamsaDegrees.toFixed(6)}° · ${chart.engine.astronomyModel}`,
    MARGIN,
    page.y,
    18,
    400,
    MUTED,
  );
  footer(page, chart);
  const supportingSections = reading.sections.filter(
    (section) => !["focus", "timing", "counsel"].includes(section.id),
  );
  for (let index = 0; index < supportingSections.length; index += 3) {
    page = createPage(pages.length + 1);
    pages.push(page);
    heading(
      page,
      index === 0
        ? te
          ? "సాధారణ జీవిత వివరణ"
          : "Supporting chart reading"
        : te
          ? "జీవిత వివరణ కొనసాగింపు"
          : "Life reading continued",
    );
    if (index === 0) {
      wrap(page, reading.summary, MARGIN, 22, 32);
      page.y += 24;
    }
    for (const section of supportingSections.slice(index, index + 3)) {
      text(page, section.title, MARGIN, page.y, 27, 700, ACCENT);
      page.y += 38;
      wrap(page, section.message, MARGIN, 21, 31);
      page.y += 12;
      text(page, te ? "ఆధారం" : "Evidence", MARGIN, page.y, 18, 700, MUTED);
      page.y += 26;
      for (const evidence of section.evidence) {
        wrap(page, `• ${evidence}`, MARGIN + 12, 18, 27);
      }
      page.y += 30;
    }
    if (index + 3 >= supportingSections.length) {
      wrap(page, reading.notice, MARGIN, 18, 27);
      page.y += 12;
      wrap(
        page,
        `${te ? "విశ్వసనీయత" : "Confidence"}: ${reading.confidence.score}/100 · ${reading.confidence.label}. ${reading.confidence.message}`,
        MARGIN,
        18,
        27,
      );
    }
    footer(page, chart);
  }
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  await pdf.embedFont(fontBytes, { subset: true });
  pdf.setTitle(
    options.privacySafe
      ? "Sahadeva privacy-safe report"
      : `Sahadeva report - ${chart.input.name}`,
  );
  pdf.setAuthor("Sahadeva");
  pdf.setSubject("Jyotish research chart evidence");
  for (const rendered of pages) {
    const png = await pdf.embedPng(rendered.canvas.toDataURL("image/png")),
      pdfPage = pdf.addPage([595.28, 841.89]);
    pdfPage.drawImage(png, { x: 0, y: 0, width: 595.28, height: 841.89 });
  }
  const bytes = await pdf.save(),
    buffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer;
  return new Blob([buffer], { type: "application/pdf" });
}
