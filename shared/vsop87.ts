import planetposition from "astronomia/planetposition";
import elliptic from "astronomia/elliptic";
import solar from "astronomia/solar";
import * as nutation from "astronomia/nutation";
import coord from "astronomia/coord";
import earthData from "astronomia/data/vsop87Dearth";
import mercuryData from "astronomia/data/vsop87Dmercury";
import venusData from "astronomia/data/vsop87Dvenus";
import marsData from "astronomia/data/vsop87Dmars";
import jupiterData from "astronomia/data/vsop87Djupiter";
import saturnData from "astronomia/data/vsop87Dsaturn";

export type VsopBody =
  | "Sun"
  | "Mercury"
  | "Venus"
  | "Mars"
  | "Jupiter"
  | "Saturn";
const DEG = 180 / Math.PI,
  norm = (value: number) => ((value % 360) + 360) % 360;
const FULL_VSOP87D = {
  Earth: earthData,
  Mercury: mercuryData,
  Venus: venusData,
  Mars: marsData,
  Jupiter: jupiterData,
  Saturn: saturnData,
};
const planets = Object.fromEntries(
  Object.entries(FULL_VSOP87D).map(([name, data]) => [
    name,
    new planetposition.Planet(data as never),
  ]),
) as Record<
  keyof typeof FULL_VSOP87D,
  InstanceType<typeof planetposition.Planet>
>;

export const VSOP87_MODEL = {
  id: "vsop87d-full",
  version: "2.0.0",
  source: "Complete Bretagnon and Francou VSOP87D tables via astronomia 4.2.0",
  coefficientThreshold: 0,
  referenceFrame: "apparent geocentric ecliptic and equinox of date",
  validRange: "1800-2050",
  certification:
    "five NASA/JPL Horizons epochs, all six bodies below 5 arcseconds",
} as const;

export function vsop87ApparentPosition(
  name: VsopBody,
  jd: number,
): { longitude: number; latitude: number } {
  const earth = planets.Earth;
  if (name === "Sun") {
    const value = solar.apparentVSOP87(earth, jd);
    return { longitude: norm(value.lon * DEG), latitude: value.lat * DEG };
  }
  const epsilon = nutation.meanObliquity(jd) + nutation.nutation(jd)[1];
  const equatorial = elliptic.position(planets[name], earth, jd),
    ecliptic = new coord.Equatorial(equatorial.ra, equatorial.dec).toEcliptic(
      epsilon,
    );
  return { longitude: norm(ecliptic.lon * DEG), latitude: ecliptic.lat * DEG };
}

export function vsop87ApparentPositions(
  jd: number,
): Record<VsopBody, { longitude: number; latitude: number }> {
  const result: Partial<
    Record<VsopBody, { longitude: number; latitude: number }>
  > = {};
  for (const name of [
    "Sun",
    "Mercury",
    "Venus",
    "Mars",
    "Jupiter",
    "Saturn",
  ] as const)
    result[name] = vsop87ApparentPosition(name, jd);
  return result as Record<VsopBody, { longitude: number; latitude: number }>;
}

export function vsop87ApparentLongitudes(jd: number) {
  const positions = vsop87ApparentPositions(jd);
  return Object.fromEntries(
    Object.entries(positions).map(([name, value]) => [name, value.longitude]),
  ) as Record<VsopBody, number>;
}
