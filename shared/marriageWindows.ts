import type { ChartResult } from "./schema";
import {
  buildSlowTransitCalendar,
  intersectDashaTransits,
} from "./transitCalendar";
import { isoToJd } from "./dashaCalendar";

const SIGN_LORDS = [
  "Mars",
  "Venus",
  "Mercury",
  "Moon",
  "Sun",
  "Mercury",
  "Venus",
  "Mars",
  "Jupiter",
  "Saturn",
  "Saturn",
  "Jupiter",
] as const;

export function findMarriageWindows(
  chart: ChartResult,
  startDate: string,
  years = 5,
) {
  const start = isoToJd(startDate),
    horizonYears = Math.min(20, Math.max(0.25, years));
  if (!Number.isFinite(start)) throw new Error("Invalid startDate");
  const lagna = chart.placements.find((item) => item.name === "Lagna")!,
    seventhSign = (lagna.sign + 6) % 12,
    seventhLord = SIGN_LORDS[seventhSign],
    calendar = buildSlowTransitCalendar(
      chart,
      start,
      start + horizonYears * 365.2425,
    ),
    jupiterSeventh = calendar.periods.filter(
      (period) => period.planet === "Jupiter" && period.sign === seventhSign,
    ),
    intersections = intersectDashaTransits(chart, jupiterSeventh),
    windows = intersections
      .map((window) => {
        const activatedLords = [window.mahadasha, window.antardasha],
          venusActivated = activatedLords.includes("Venus"),
          seventhLordActivated = activatedLords.includes(seventhLord),
          score =
            50 + (venusActivated ? 20 : 0) + (seventhLordActivated ? 20 : 0);
        return {
          ...window,
          score,
          evidence: {
            jupiterTransitsNatalSeventh: true,
            seventhSign,
            seventhLord,
            venusActivated,
            seventhLordActivated,
          },
          status: "planning-window-not-event-prediction",
        };
      })
      .sort((a, b) => b.score - a.score || a.startJulianDay - b.startJulianDay);
  return {
    schemaVersion: "sahadeva-marriage-windows-1",
    subject: { name: chart.input.name },
    range: { startDate, years: horizonYears },
    natal: { lagnaSign: lagna.sign, seventhSign, seventhLord },
    windows,
    jupiterSeventhPeriods: jupiterSeventh,
    safety: {
      status: "research-preview",
      prohibitedInferences: [
        "guaranteed marriage",
        "relationship success or failure",
        "fertility or pregnancy outcome",
      ],
      notice:
        "These are structural overlaps for planning and reflection, not predictions that a marriage will occur.",
    },
  };
}
