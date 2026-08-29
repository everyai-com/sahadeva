import type { ChartResult } from "./schema";

const GLYPHS: Record<string, string> = {
  Sun: "Su",
  Moon: "Mo",
  Mars: "Ma",
  Mercury: "Me",
  Jupiter: "Ju",
  Venus: "Ve",
  Saturn: "Sa",
  Rahu: "Ra",
  Ketu: "Ke",
  Lagna: "Lg",
};
const CELL_BY_SIGN = [
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
];
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[char]!,
  );

export function southIndianChartSvg(chart: ChartResult, size = 1200) {
  const safeSize = Math.min(2400, Math.max(480, Math.round(size))),
    unit = safeSize / 4,
    pad = unit * 0.08,
    dignity = new Map(
      chart.advanced.dignities.map((item) => [item.name, item]),
    );
  const cells = Array.from({ length: 12 }, (_, sign) => {
    const [x, y] = CELL_BY_SIGN[sign],
      placements = chart.placements.filter((item) => item.sign === sign),
      lines = placements.map((item) => {
        const state = dignity.get(item.name),
          flags = [
            item.retrograde ? "R" : "",
            state?.combust ? "C" : "",
            state?.dignity && state.dignity !== "neutral"
              ? state.dignity.replace("-sign", "").slice(0, 3).toUpperCase()
              : "",
          ]
            .filter(Boolean)
            .join("/");
        return `${GLYPHS[item.name] || item.name.slice(0, 2)} ${item.degree.toFixed(1)}°${flags ? ` [${flags}]` : ""}`;
      });
    return `<g><rect x="${x * unit}" y="${y * unit}" width="${unit}" height="${unit}" class="cell"/><text x="${x * unit + pad}" y="${y * unit + pad * 1.4}" class="sign">${sign + 1}</text>${lines.map((line, index) => `<text x="${x * unit + pad}" y="${y * unit + pad * 3.1 + index * pad * 1.55}" class="planet">${escape(line)}</text>`).join("")}</g>`;
  }).join("");
  const center = `<rect x="${unit}" y="${unit}" width="${unit * 2}" height="${unit * 2}" class="center"/><text x="${unit * 2}" y="${unit * 1.73}" text-anchor="middle" class="title">SAHADEVA</text><text x="${unit * 2}" y="${unit * 2.05}" text-anchor="middle" class="name">${escape(chart.input.name)}</text><text x="${unit * 2}" y="${unit * 2.3}" text-anchor="middle" class="meta">${escape(chart.input.date)} ${escape(chart.input.time)}</text><text x="${unit * 2}" y="${unit * 2.52}" text-anchor="middle" class="meta">Lahiri sidereal · South Indian</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${safeSize}" height="${safeSize}" viewBox="0 0 ${safeSize} ${safeSize}" role="img" aria-label="South Indian astrology chart for ${escape(chart.input.name)}"><style>.cell{fill:#f7f3e8;stroke:#342f28;stroke-width:${Math.max(2, safeSize / 400)}}.center{fill:#ded8c9;stroke:#342f28;stroke-width:${Math.max(2, safeSize / 400)}}text{font-family:Inter,Arial,sans-serif;fill:#25221d}.sign{font-size:${pad * 0.92}px;font-weight:700;fill:#8a3e2a}.planet{font-size:${pad * 0.72}px;font-weight:600}.title{font-size:${pad * 1.3}px;font-weight:800;letter-spacing:${pad * 0.2}px}.name{font-size:${pad * 1.05}px;font-weight:700}.meta{font-size:${pad * 0.66}px;fill:#625b50}</style><rect width="100%" height="100%" fill="#f7f3e8"/>${cells}${center}</svg>`;
}
