import type { ChartResult } from "./schema";
import { calculatePlanetHouseAspectMatrix, periodsAt } from "./advanced";

const DAYS_PER_YEAR = 365.2425;
export const jdToIso = (jd: number) => new Date((jd - 2440587.5) * 86400000).toISOString();
export const isoToJd = (iso: string) => Date.parse(iso) / 86400000 + 2440587.5;

export function buildDashaCalendar(chart: ChartResult) {
  const birth = chart.engine.julianDay;
  return chart.advanced.vimshottariTimeline.map((maha) => ({
    lord:maha.lord, startJulianDay:maha.startJulianDay, endJulianDay:maha.endJulianDay, startIso:jdToIso(maha.startJulianDay), endIso:jdToIso(maha.endJulianDay), ageAtStartYears:(maha.startJulianDay - birth) / DAYS_PER_YEAR,
    antardashas:maha.subPeriods.map((antar) => ({ lord:antar.lord, startJulianDay:antar.startJulianDay, endJulianDay:antar.endJulianDay, startIso:jdToIso(antar.startJulianDay), endIso:jdToIso(antar.endJulianDay), ageAtStartYears:(antar.startJulianDay - birth) / DAYS_PER_YEAR,
      pratyantardashas:antar.pratyantarPeriods.map((praty) => ({ lord:praty.lord, startJulianDay:praty.startJulianDay, endJulianDay:praty.endJulianDay, startIso:jdToIso(praty.startJulianDay), endIso:jdToIso(praty.endJulianDay), ageAtStartYears:(praty.startJulianDay - birth) / DAYS_PER_YEAR }))
    }))
  }));
}

export function queryDashaAt(chart: ChartResult, instantIso: string) {
  const jd = isoToJd(instantIso);
  if (!Number.isFinite(jd)) throw new Error("Invalid ISO date");
  const active = periodsAt(chart.advanced.vimshottariTimeline, jd);
  const maha = chart.advanced.vimshottariTimeline.find((item) => jd >= item.startJulianDay && jd < item.endJulianDay);
  const antar = maha?.subPeriods.find((item) => jd >= item.startJulianDay && jd < item.endJulianDay);
  const praty = antar?.pratyantarPeriods.find((item) => jd >= item.startJulianDay && jd < item.endJulianDay);
  return { instantIso:new Date((jd - 2440587.5) * 86400000).toISOString(), julianDay:jd, ...active, boundaries: { mahadasha:maha ? {startIso:jdToIso(maha.startJulianDay),endIso:jdToIso(maha.endJulianDay)} : null, antardasha:antar ? {startIso:jdToIso(antar.startJulianDay),endIso:jdToIso(antar.endJulianDay)} : null, pratyantardasha:praty ? {startIso:jdToIso(praty.startJulianDay),endIso:jdToIso(praty.endJulianDay)} : null } };
}

const escapeIcs = (value: string) => value.replace(/([,;\\])/g,"\\$1").replace(/\n/g,"\\n");
const icsDate = (iso: string) => iso.replace(/[-:]/g,"").replace(/\.\d{3}Z$/,"Z");
export function dashaCalendarIcs(chart: ChartResult) {
  const events = buildDashaCalendar(chart).flatMap((maha) => maha.antardashas.map((antar) => [
    "BEGIN:VEVENT", `UID:${escapeIcs(`${chart.input.name}-${maha.lord}-${antar.lord}-${antar.startJulianDay}@sahadeva`)}`, `DTSTAMP:${icsDate(new Date().toISOString())}`, `DTSTART:${icsDate(antar.startIso)}`, `DTEND:${icsDate(antar.endIso)}`, `SUMMARY:${escapeIcs(`${maha.lord} Mahadasha - ${antar.lord} Antardasha`)}`, "DESCRIPTION:Traditional Vimshottari timing calculated by Sahadeva. Astrology is an interpretive cultural practice.", "END:VEVENT"
  ].join("\r\n")));
  return ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Sahadeva//Vimshottari//EN","CALSCALE:GREGORIAN",...events,"END:VCALENDAR",""].join("\r\n");
}

export function compactChartEvidence(chart: ChartResult) {
  const lagna = chart.placements.find((p) => p.name === "Lagna")!, moon = chart.placements.find((p) => p.name === "Moon")!;
  const houseMappings=chart.advanced.houses.equalBhava.planetHouses;
  return { schemaVersion:"sahadeva-evidence-2", engine:chart.engine, subject:{name:chart.input.name,place:chart.input.place}, methodology:chart.advanced.guidance.methodology, confidence:chart.advanced.guidance.confidence, anchors:{lagna:{sign:lagna.sign,degree:lagna.degree},moon:{sign:moon.sign,degree:moon.degree,nakshatra:moon.nakshatra,pada:moon.pada},panchanga:chart.panchanga,birthPeriods:chart.advanced.birthPeriods},houses:{selectedSystem:chart.advanced.houses.selectedSystem,wholeSign:houseMappings.map(({name,wholeSignHouse})=>({name,house:wholeSignHouse})),equal:houseMappings.map(({name,equalBhavaHouse})=>({name,house:equalBhavaHouse})),sripati:{status:chart.advanced.houses.sripati.status,midheaven:chart.advanced.houses.sripati.midheaven,planets:chart.advanced.houses.sripati.planetHouses}}, aspectMatrix:calculatePlanetHouseAspectMatrix(chart.placements), focus:chart.advanced.guidance.focus, evidence:chart.advanced.guidance.evidence, placements:chart.placements.map(({name,sign,degree,nakshatra,pada,retrograde}) => ({name,sign,degree,nakshatra,pada,retrograde})), detectedYogaCandidates:chart.advanced.yogas.filter((y) => y.detected), safety:{interpretiveOnly:true,scientificallyValidated:false,noMedicalLegalFinancialCertainty:true} };
}
