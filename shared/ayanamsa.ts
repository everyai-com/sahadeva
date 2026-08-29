import {deltaT} from "astronomia/deltat";
import {nutation} from "astronomia/nutation";

const RAD=Math.PI/180,OFFICIAL_EPOCH_TT=2435553.5,OFFICIAL_TRUE_DEGREES=23+15/60+.658/3600;
const jdeFromUt=(jd:number)=>jd+deltaT(2000+(jd-2451545)/365.2425)/86400;
const lieskePrecession=(jde:number)=>{const t=(jde-2451545)/36525;return (5029.0966*t+1.11113*t*t-.000006*t**3)/3600;};
const nutationLongitude=(jde:number)=>nutation(jde)[0]/RAD;
const meanEpochDegrees=OFFICIAL_TRUE_DEGREES-nutationLongitude(OFFICIAL_EPOCH_TT);

export const LAHIRI_CONVENTIONS={
  mean:{id:"lahiri-iae-1985-mean",version:"1.0.0",source:"Indian Astronomical Ephemeris 1985 corrected anchor 23°15′00.658″ at 1956-03-21 00:00 TT; Lieske IAU 1976 precession; IAU 1980 nutation removed for mean geometric longitudes"},
  true:{id:"lahiri-iae-1985-true",version:"1.0.0",source:"Indian Astronomical Ephemeris 1985 corrected true anchor 23°15′00.658″ at 1956-03-21 00:00 TT; Lieske IAU 1976 precession and IAU 1980 nutation"},
} as const;
export type LahiriConvention=keyof typeof LAHIRI_CONVENTIONS;

export function calculateLahiriAyanamsa(jdUt:number,convention:LahiriConvention="mean"){
  const jde=jdeFromUt(jdUt),meanDegrees=meanEpochDegrees+lieskePrecession(jde)-lieskePrecession(OFFICIAL_EPOCH_TT),valueDegrees=convention==="true"?meanDegrees+nutationLongitude(jde):meanDegrees;
  return{...LAHIRI_CONVENTIONS[convention],convention,valueDegrees,epochJulianDayTt:OFFICIAL_EPOCH_TT,epochTrueDegrees:OFFICIAL_TRUE_DEGREES,precessionModel:"Lieske IAU 1976",nutationModel:convention==="true"?"IAU 1980":"removed (mean equinox compatibility)"};
}
