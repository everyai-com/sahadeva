import type { Placement } from "../shared/schema";
import { SIGNS } from "../shared/constants";
import { TELUGU_SIGNS } from "../shared/telugu";

// North-Indian diamond chart: houses are fixed positions, signs rotate with
// the lagna. House 1 is the top-centre diamond, houses run anticlockwise.
const HOUSE_CENTERS: Array<[number, number]> = [
  [200, 105], // 1
  [100, 52], // 2
  [50, 105], // 3
  [105, 200], // 4
  [50, 295], // 5
  [100, 348], // 6
  [200, 295], // 7
  [300, 348], // 8
  [350, 295], // 9
  [295, 200], // 10
  [350, 105], // 11
  [300, 52], // 12
];

export function NorthChart({
  placements,
  title,
  language = "en",
}: {
  placements: Array<Pick<Placement, "name" | "sign">>;
  title: string;
  language?: "en" | "te";
}) {
  const lagna = placements.find((item) => item.name === "Lagna");
  const lagnaSign = lagna ? lagna.sign : 0;
  const houses = HOUSE_CENTERS.map(([x, y], index) => {
    const sign = (lagnaSign + index) % 12;
    const bodies = placements
      .filter((item) => item.name !== "Lagna" && item.sign === sign)
      .map((item) => (item.name === "Lagna" ? "Lg" : item.name.slice(0, 2)));
    return { x, y, sign, bodies, house: index + 1 };
  });
  const description = houses
    .map(
      (h) =>
        `${language === "te" ? TELUGU_SIGNS[h.sign] : SIGNS[h.sign]}: ${h.bodies.join(", ") || "-"}`,
    )
    .join("; ");
  return (
    <figure className="north-chart" role="img" aria-label={`${title}. ${description}`}>
      <figcaption>{title}</figcaption>
      <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="4" width="392" height="392" fill="none" className="nc-line" />
        <path d="M4 4 L396 396 M396 4 L4 396" fill="none" className="nc-line" />
        <path d="M200 4 L396 200 L200 396 L4 200 Z" fill="none" className="nc-line" />
        {houses.map((h) => (
          <g key={h.house}>
            <text x={h.x} y={h.y - 12} textAnchor="middle" className="nc-sign">
              {h.sign + 1}
            </text>
            <text x={h.x} y={h.y + 8} textAnchor="middle" className="nc-grahas">
              {h.bodies.slice(0, 3).join(" ")}
            </text>
            {h.bodies.length > 3 && (
              <text x={h.x} y={h.y + 24} textAnchor="middle" className="nc-grahas">
                {h.bodies.slice(3).join(" ")}
              </text>
            )}
          </g>
        ))}
      </svg>
    </figure>
  );
}
