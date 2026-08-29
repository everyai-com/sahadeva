declare module "astronomia/elp" {
  export class Moon {
    constructor(data: unknown);
    position(jd: number): { lon: number; lat: number; range: number };
    positionXYZ(jd: number): { x: number; y: number; z: number };
  }
}
declare module "astronomia/data/elpMppDe" {
  const data: unknown;
  export default data;
}
declare module "astronomia/deltat" {
  export function deltaT(decimalYear: number): number;
}
declare module "astronomia/nutation" {
  export function nutation(jde: number): [number, number];
  export function meanObliquity(jde: number): number;
}
declare module "astronomia/planetposition" {
  export class Planet {
    constructor(data: unknown);
    position(jde: number): { lon: number; lat: number; range: number };
  }
  const value: { Planet: typeof Planet };
  export default value;
}
declare module "astronomia/elliptic" {
  export function position(
    planet: unknown,
    earth: unknown,
    jde: number,
  ): { ra: number; dec: number };
  const value: { position: typeof position };
  export default value;
}
declare module "astronomia/solar" {
  export function apparentVSOP87(
    earth: unknown,
    jde: number,
  ): { lon: number; lat: number; range: number };
  const value: { apparentVSOP87: typeof apparentVSOP87 };
  export default value;
}
declare module "astronomia/coord" {
  export class Equatorial {
    constructor(ra: number, dec: number);
    toEcliptic(obliquity: number): { lon: number; lat: number };
  }
  const value: { Equatorial: typeof Equatorial };
  export default value;
}
declare module "astronomia/data/vsop87Dearth" {
  const data: unknown;
  export default data;
}
declare module "astronomia/data/vsop87Dmercury" {
  const data: unknown;
  export default data;
}
declare module "astronomia/data/vsop87Dvenus" {
  const data: unknown;
  export default data;
}
declare module "astronomia/data/vsop87Dmars" {
  const data: unknown;
  export default data;
}
declare module "astronomia/data/vsop87Djupiter" {
  const data: unknown;
  export default data;
}
declare module "astronomia/data/vsop87Dsaturn" {
  const data: unknown;
  export default data;
}
