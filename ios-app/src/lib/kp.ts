import type { FullChart } from "./types";
import { NAKSHATRAS } from "./vedic";

// Deterministic KP star-lord / sub-lord subdivision, ported from shared/kp.ts.
// This is a structural preview (Lahiri positions, whole-sign houses) — not a
// certified KP chart — matching exactly what the web client shows.
const LORD_SEQUENCE = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"] as const;
type Lord = (typeof LORD_SEQUENCE)[number];
const YEARS: Record<Lord, number> = { Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17 };
const SIGN_LORDS = ["Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter"];
const DAY_LORD: Record<string, string> = { Sunday: "Sun", Monday: "Moon", Tuesday: "Mars", Wednesday: "Mercury", Thursday: "Jupiter", Friday: "Venus", Saturday: "Saturn" };
const NAK_LENGTH = 360 / 27;
const norm = (value: number) => ((value % 360) + 360) % 360;

function subdivision(longitude: number) {
  const value = norm(longitude);
  const nakshatraIndex = Math.floor(value / NAK_LENGTH);
  const starLord = LORD_SEQUENCE[nakshatraIndex % 9];
  const offset = value - nakshatraIndex * NAK_LENGTH;
  const startIndex = LORD_SEQUENCE.indexOf(starLord);
  let cursor = 0;
  let subLord: Lord = starLord;
  for (let order = 0; order < 9; order++) {
    const lord = LORD_SEQUENCE[(startIndex + order) % 9];
    const length = (NAK_LENGTH * YEARS[lord]) / 120;
    if (offset <= cursor + length + 1e-10) {
      subLord = lord;
      break;
    }
    cursor += length;
  }
  return { nakshatra: NAKSHATRAS[nakshatraIndex], starLord, subLord };
}

export type KpSignificator = {
  planet: string;
  occupiedHouse: number;
  ownedHouses: number[];
  starLord: string;
  starLordOccupiedHouse: number;
  starLordOwnedHouses: number[];
  subLord: string;
};

export type KpPreview = {
  significators: KpSignificator[];
  rulingPlanets: { role: string; planet: string }[];
};

export function calculateKp(chart: FullChart): KpPreview | null {
  const lagna = chart.placements.find((item) => item.name === "Lagna");
  const moon = chart.placements.find((item) => item.name === "Moon");
  if (!lagna || !moon) return null;

  const levelsByName = new Map(chart.placements.map((item) => [item.name, subdivision(item.longitude)]));
  const houseOf = (name: string) => {
    const p = chart.placements.find((item) => item.name === name);
    return p ? ((p.sign - lagna.sign + 12) % 12) + 1 : 0;
  };
  const ownedHouses = (name: string) =>
    SIGN_LORDS.flatMap((lord, index) => (lord === name ? [((index - lagna.sign + 12) % 12) + 1] : []));

  const significators = chart.placements
    .filter((item) => item.name !== "Lagna")
    .map((item) => {
      const levels = levelsByName.get(item.name)!;
      return {
        planet: item.name,
        occupiedHouse: houseOf(item.name),
        ownedHouses: ownedHouses(item.name),
        starLord: levels.starLord,
        starLordOccupiedHouse: houseOf(levels.starLord),
        starLordOwnedHouses: ownedHouses(levels.starLord),
        subLord: levels.subLord,
      };
    });

  const lagnaLevels = subdivision(lagna.longitude);
  const moonLevels = subdivision(moon.longitude);
  const rulingPlanets = [
    { role: "Lagna sign lord", planet: SIGN_LORDS[lagna.sign] },
    { role: "Lagna star lord", planet: lagnaLevels.starLord },
    { role: "Lagna sub lord", planet: lagnaLevels.subLord },
    { role: "Moon sign lord", planet: SIGN_LORDS[moon.sign] },
    { role: "Moon star lord", planet: moonLevels.starLord },
    { role: "Moon sub lord", planet: moonLevels.subLord },
    { role: "Day lord", planet: DAY_LORD[chart.panchanga.vara] ?? "—" },
  ];

  return { significators, rulingPlanets };
}
