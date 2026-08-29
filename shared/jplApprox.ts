const RAD = Math.PI / 180;
const norm = (n: number) => ((n % 360) + 360) % 360;
const sin = (n: number) => Math.sin(n * RAD);
const cos = (n: number) => Math.cos(n * RAD);

type Body = "Mercury" | "Venus" | "Earth" | "Mars" | "Jupiter" | "Saturn";
type Elements = { base: [number, number, number, number, number, number]; rate: [number, number, number, number, number, number] };

// JPL Solar System Dynamics Table 1, valid 1800-2050.
const ELEMENTS: Record<Body, Elements> = {
  Mercury: { base: [0.38709927,0.20563593,7.00497902,252.25032350,77.45779628,48.33076593], rate: [0.00000037,0.00001906,-0.00594749,149472.67411175,0.16047689,-0.12534081] },
  Venus: { base: [0.72333566,0.00677672,3.39467605,181.97909950,131.60246718,76.67984255], rate: [0.00000390,-0.00004107,-0.00078890,58517.81538729,0.00268329,-0.27769418] },
  Earth: { base: [1.00000261,0.01671123,-0.00001531,100.46457166,102.93768193,0], rate: [0.00000562,-0.00004392,-0.01294668,35999.37244981,0.32327364,0] },
  Mars: { base: [1.52371034,0.09339410,1.84969142,-4.55343205,-23.94362959,49.55953891], rate: [0.00001847,0.00007882,-0.00813131,19140.30268499,0.44441088,-0.29257343] },
  Jupiter: { base: [5.20288700,0.04838624,1.30439695,34.39644051,14.72847983,100.47390909], rate: [-0.00011607,-0.00013253,-0.00183714,3034.74612775,0.21252668,0.20469106] },
  Saturn: { base: [9.53667594,0.05386179,2.48599187,49.95424423,92.59887831,113.66242448], rate: [-0.00125060,-0.00050991,0.00193609,1222.49362201,-0.41897216,-0.28867794] },
};

type Vector = { x: number; y: number; z: number };

function solveEccentricAnomaly(meanAnomaly: number, eccentricity: number) {
  const eStar = 180 / Math.PI * eccentricity;
  let eccentricAnomaly = meanAnomaly + eStar * sin(meanAnomaly);
  for (let iteration = 0; iteration < 12; iteration++) {
    const deltaM = meanAnomaly - (eccentricAnomaly - eStar * sin(eccentricAnomaly));
    const deltaE = deltaM / (1 - eccentricity * cos(eccentricAnomaly));
    eccentricAnomaly += deltaE;
    if (Math.abs(deltaE) <= 1e-9) break;
  }
  return eccentricAnomaly;
}

function heliocentric(body: Body, centuries: number): Vector {
  const model = ELEMENTS[body];
  const values = model.base.map((value, i) => value + model.rate[i] * centuries);
  const [a, e, inclination, meanLongitude, longPerihelion, longNode] = values;
  const argumentPerihelion = longPerihelion - longNode;
  const meanAnomaly = ((meanLongitude - longPerihelion + 180) % 360 + 360) % 360 - 180;
  const eccentricAnomaly = solveEccentricAnomaly(meanAnomaly, e);
  const xp = a * (cos(eccentricAnomaly) - e);
  const yp = a * Math.sqrt(1 - e * e) * sin(eccentricAnomaly);
  const x = (cos(argumentPerihelion) * cos(longNode) - sin(argumentPerihelion) * sin(longNode) * cos(inclination)) * xp + (-sin(argumentPerihelion) * cos(longNode) - cos(argumentPerihelion) * sin(longNode) * cos(inclination)) * yp;
  const y = (cos(argumentPerihelion) * sin(longNode) + sin(argumentPerihelion) * cos(longNode) * cos(inclination)) * xp + (-sin(argumentPerihelion) * sin(longNode) + cos(argumentPerihelion) * cos(longNode) * cos(inclination)) * yp;
  const z = sin(argumentPerihelion) * sin(inclination) * xp + cos(argumentPerihelion) * sin(inclination) * yp;
  return { x, y, z };
}

function eclipticJ2000ToEquatorial(v: Vector): Vector {
  const epsilon = 23.43928;
  return { x: v.x, y: cos(epsilon) * v.y - sin(epsilon) * v.z, z: sin(epsilon) * v.y + cos(epsilon) * v.z };
}

function precessJ2000ToDate(v: Vector, centuries: number): Vector {
  const zeta = (2306.2181 * centuries + 0.30188 * centuries ** 2 + 0.017998 * centuries ** 3) / 3600;
  const z = (2306.2181 * centuries + 1.09468 * centuries ** 2 + 0.018203 * centuries ** 3) / 3600;
  const theta = (2004.3109 * centuries - 0.42665 * centuries ** 2 - 0.041833 * centuries ** 3) / 3600;
  const a = cos(zeta) * cos(theta) * cos(z) - sin(zeta) * sin(z);
  const b = -sin(zeta) * cos(theta) * cos(z) - cos(zeta) * sin(z);
  const c = -sin(theta) * cos(z);
  const d = cos(zeta) * cos(theta) * sin(z) + sin(zeta) * cos(z);
  const e = -sin(zeta) * cos(theta) * sin(z) + cos(zeta) * cos(z);
  const f = -sin(theta) * sin(z);
  const g = cos(zeta) * sin(theta);
  const h = -sin(zeta) * sin(theta);
  const i = cos(theta);
  return { x: a*v.x + b*v.y + c*v.z, y: d*v.x + e*v.y + f*v.z, z: g*v.x + h*v.y + i*v.z };
}

function equatorialToEclipticDate(v: Vector, centuries: number): Vector {
  const epsilon = 23.439291 - 0.0130042 * centuries;
  return { x: v.x, y: cos(epsilon) * v.y + sin(epsilon) * v.z, z: -sin(epsilon) * v.y + cos(epsilon) * v.z };
}

function positionOfDate(vector: Vector, centuries: number) {
  const equatorial = eclipticJ2000ToEquatorial(vector);
  const dated = equatorialToEclipticDate(precessJ2000ToDate(equatorial, centuries), centuries);
  return { longitude:norm(Math.atan2(dated.y, dated.x) / RAD), latitude:Math.atan2(dated.z,Math.hypot(dated.x,dated.y))/RAD };
}

export function jplApproximatePositions(jd: number) {
  const centuries = (jd - 2451545) / 36525;
  const earth = heliocentric("Earth", centuries);
  const result: Record<string, {longitude:number;latitude:number}> = { Sun: positionOfDate({ x: -earth.x, y: -earth.y, z: -earth.z }, centuries) };
  for (const body of ["Mercury", "Venus", "Mars", "Jupiter", "Saturn"] as const) {
    const planet = heliocentric(body, centuries);
    result[body] = positionOfDate({ x: planet.x - earth.x, y: planet.y - earth.y, z: planet.z - earth.z }, centuries);
  }
  return result as Record<"Sun" | "Mercury" | "Venus" | "Mars" | "Jupiter" | "Saturn", {longitude:number;latitude:number}>;
}

export function jplApproximateLongitudes(jd: number) { const positions=jplApproximatePositions(jd); return Object.fromEntries(Object.entries(positions).map(([name,value])=>[name,value.longitude])) as Record<keyof typeof positions,number>; }

export function jplMeanLongitudes(jd:number){
  const centuries=(jd-2451545)/36525,mean=(body:Body)=>norm(ELEMENTS[body].base[3]+ELEMENTS[body].rate[3]*centuries),sun=norm(mean("Earth")+180);
  return{Sun:sun,Mercury:mean("Mercury"),Venus:mean("Venus"),Mars:mean("Mars"),Jupiter:mean("Jupiter"),Saturn:mean("Saturn")};
}

export const JPL_APPROXIMATION_ACCURACY_ARCSEC = { Mercury: 15, Venus: 20, Mars: 40, Jupiter: 400, Saturn: 600 } as const;
