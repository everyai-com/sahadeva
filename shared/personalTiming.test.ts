import { describe, expect, it } from "vitest";
import { calculateChart } from "./jyotish";
import { buildDailyPanchanga } from "./dailyPanchanga";
import { buildCalendarRange } from "./panchangaCalendar";
import { buildPersonalDay } from "./personalTiming";
import { birthInputSchema } from "./schema";

const HYD = { latitude: 17.385, longitude: 78.4867, timezone: "Asia/Kolkata", timezoneOffset: 5.5 };
const natal = calculateChart(
  birthInputSchema.parse({
    name: "Ananya", date: "1992-10-08", time: "14:47", place: "Hyderabad", ...HYD,
    language: "en", methodology: "parashari", focus: "general", birthTimeAccuracyMinutes: 5,
  }),
);

function personal(date: string) {
  const base = { name: "Day", time: "12:00", place: "Hyderabad", ...HYD, language: "en", methodology: "parashari", focus: "general", birthTimeAccuracyMinutes: 0 };
  const next = new Date(Date.parse(`${date}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
  const daily = buildDailyPanchanga(calculateChart(birthInputSchema.parse({ ...base, date })), calculateChart(birthInputSchema.parse({ ...base, date: next })), natal) as any;
  const [day] = buildCalendarRange({ startDate: date, days: 1, ...HYD, detailed: true });
  return { day, daily, result: buildPersonalDay({ day, choghadiya: daily.choghadiya, hora: daily.hora, inauspicious: daily.inauspicious, abhijit: daily.auspicious.abhijitMuhurta, natal }) as any };
}

describe("personal best times", () => {
  for (const date of ["2026-10-20", "2026-10-21", "2026-11-08"]) {
    it(`never recommends a blocked window (${date})`, () => {
      const { day, daily, result } = personal(date);
      expect(result.status).toBe("computed");
      const blocked = [daily.inauspicious.rahuKaal, daily.inauspicious.yamaganda, daily.inauspicious.gulikaKaal, ...day.durmuhurtam!, ...day.varjyam!];
      for (const w of result.best) {
        for (const b of blocked) {
          const overlap = Math.min(Date.parse(w.endIso), Date.parse(b.endIso)) - Math.max(Date.parse(w.startIso), Date.parse(b.startIso));
          expect(overlap).toBeLessThanOrEqual(0);
        }
        expect(w.reasons.length).toBeGreaterThan(0);
        expect(w.score).toBeGreaterThanOrEqual(3);
        expect(Date.parse(w.peak.startIso)).toBeGreaterThanOrEqual(Date.parse(w.startIso));
      }
      // Chronological and non-overlapping.
      for (let i = 1; i < result.best.length; i++) expect(Date.parse(result.best[i].startIso)).toBeGreaterThanOrEqual(Date.parse(result.best[i - 1].endIso));
    });
  }

  it("uses the person's own chart: tara from their birth star and their ascendant lord's hora", () => {
    const { result } = personal("2026-10-20");
    expect(result.natal).toMatchObject({ nakshatra: "Shatabhisha", ascendant: "Makara", ascendantLord: "Saturn" });
    expect(result.daySummary.taraAtSunrise).toMatchObject({ count: 26, name: "Mitra", favourable: true });
    const all = result.best.flatMap((w: any) => w.reasons.map((r: any) => r.id));
    expect(all).toContain("ascendant-lord-hora");
  });
});
