import type { Placement } from "../shared/schema";
import { SIGNS } from "../shared/constants";
import { TELUGU_SIGNS } from "../shared/telugu";

// Traditional fixed South Indian order: Meena top-left, Mesha second,
// clockwise around the frame — matches the PDF/MCP render layout.
const CELLS: Array<[number, number, number]> = [
  [0, 1, 0], [1, 2, 0], [2, 3, 0], [3, 3, 1], [4, 3, 2], [5, 3, 3],
  [6, 2, 3], [7, 1, 3], [8, 0, 3], [9, 0, 2], [10, 0, 1], [11, 0, 0],
];

export function SouthChart({ placements, title, language = "en" }: { placements: Array<Pick<Placement, "name" | "sign">>; title: string; language?: "en" | "te" }) {
  const description = CELLS.map(([sign]) => {
    const bodies = placements.filter((placement) => placement.sign === sign).map((placement) => placement.name);
    const signName = language === "te" ? TELUGU_SIGNS[sign] : SIGNS[sign];
    return `${signName}: ${bodies.length ? bodies.join(", ") : language === "te" ? "గ్రహాలు లేవు" : "no bodies"}`;
  }).join("; ");
  return (
    <figure className="south-chart" role="img" aria-label={`${title}. South Indian fixed-sign chart. ${description}`}>
      <figcaption>{title}</figcaption>
      <div className="chart-grid">
        {CELLS.map(([sign, col, row]) => {
          const bodies = placements.filter((p) => p.sign === sign);
          return (
            <div className="chart-cell" style={{ gridColumn: col + 1, gridRow: row + 1 }} key={sign}>
              <span className="sign-name">{language === "te" ? TELUGU_SIGNS[sign] : SIGNS[sign]}</span>
              <span className="grahas">{bodies.map((p) => p.name === "Lagna" ? "Lg" : p.name.slice(0, 2)).join("  ")}</span>
            </div>
          );
        })}
        <div className="chart-center"><strong>Sahadeva</strong><span>fixed-sign chart</span></div>
      </div>
    </figure>
  );
}
