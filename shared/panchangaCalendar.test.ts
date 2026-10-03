import { describe, expect, it } from "vitest";
import { coreLongitudes } from "./jyotish";
import { findNextSegmentTransition } from "./panchanga";
import { birthInputSchema } from "./schema";
import { calculateChart } from "./jyotish";
import { buildDailyPanchanga } from "./dailyPanchanga";
import {
  buildCalendarMonth,
  buildCalendarRange,
  karanaName,
  limbSpans,
  rituForSunSign,
} from "./panchangaCalendar";

const HYDERABAD = { latitude: 17.385, longitude: 78.4867, timezone: "Asia/Kolkata", timezoneOffset: 5.5 };
const norm = (n: number) => ((n % 360) + 360) % 360;

describe("panchanga calendar engine", () => {
  it("names the solar ritus correctly (Sun in Kanya is Sharad, not Grishma)", () => {
    expect(rituForSunSign(11)).toBe("Vasanta"); // Mina
    expect(rituForSunSign(0)).toBe("Vasanta"); // Mesha
    expect(rituForSunSign(1)).toBe("Grishma"); // Vrishabha
    expect(rituForSunSign(3)).toBe("Varsha"); // Karka
    expect(rituForSunSign(5)).toBe("Sharad"); // Kanya
    expect(rituForSunSign(7)).toBe("Hemanta"); // Vrischika
    expect(rituForSunSign(9)).toBe("Shishira"); // Makara
  });

  it("finds tithi and nakshatra boundaries within seconds of the engine's bisection solver", () => {
    const from = 2461316.5,
      to = from + 3;
    const elongation = (jd: number) => norm(coreLongitudes(jd).sidereal.Moon - coreLongitudes(jd).sidereal.Sun);
    const tithis = limbSpans("tithi", from, to);
    for (const span of tithis.slice(0, 3)) {
      const reference = findNextSegmentTransition(span.startJulianDay + 0.01, 30, elongation, 2);
      expect(Math.abs(reference - span.endJulianDay) * 86400).toBeLessThan(5);
    }
    const naks = limbSpans("nakshatra", from, to);
    for (const span of naks.slice(0, 3)) {
      const reference = findNextSegmentTransition(span.startJulianDay + 0.01, 27, (jd) => coreLongitudes(jd).sidereal.Moon, 3);
      expect(Math.abs(reference - span.endJulianDay) * 86400).toBeLessThan(5);
    }
    // Spans are contiguous and in order.
    for (let i = 1; i < tithis.length; i++) expect(tithis[i].startJulianDay).toBe(tithis[i - 1].endJulianDay);
  });

  it("agrees with the full chart's limbs and sunrise for the same moment", () => {
    const input = birthInputSchema.parse({
      name: "Today", date: "2026-10-03", time: "12:00", place: "Hyderabad", ...HYDERABAD,
      language: "en", methodology: "parashari", focus: "general", birthTimeAccuracyMinutes: 0,
    });
    const chart = calculateChart(input);
    const [day] = buildCalendarRange({ startDate: "2026-10-03", days: 1, ...HYDERABAD, detailed: true });
    const noon = chart.engine.julianDay;
    const at = (spans: typeof day.tithi) => spans.find((s) => s.startJulianDay <= noon && s.endJulianDay > noon)!;
    expect(at(day.tithi).name).toBe(chart.panchanga.tithi);
    expect(at(day.nakshatra).name).toBe(chart.panchanga.nakshatra);
    expect(at(day.yoga!).name).toBe(chart.panchanga.yoga);
    expect(at(day.karana!).name).toBe(chart.panchanga.karana);
    const chartSunrise = chart.panchanga.events.sunriseJulianDay!;
    expect(Math.abs(Date.parse(day.sunrise!) / 86400000 + 2440587.5 - chartSunrise) * 86400).toBeLessThan(5);
  });

  it("uses one karana naming convention with the chart engine", () => {
    expect(karanaName(0)).toBe("Kimstughna");
    expect(karanaName(1)).toBe("Bava");
    expect(karanaName(7)).toBe("Vishti");
    expect(karanaName(57)).toBe("Shakuni");
    expect(karanaName(59)).toBe("Naga");
  });

  it("detects Adhika Jyeshtha 2026 and reads today's lunar month", () => {
    const june = buildCalendarMonth({ year: 2026, month: 6, ...HYDERABAD });
    expect(june.days[0].masa).toMatchObject({ amanta: "Jyeshtha", adhika: true });
    expect(june.days[24].masa).toMatchObject({ amanta: "Jyeshtha", adhika: false });
    const october = buildCalendarMonth({ year: 2026, month: 10, ...HYDERABAD });
    const oct3 = october.days[2];
    expect(oct3.masa.amanta).toBe("Bhadrapada");
    expect(oct3.masa.purnimanta).toBe("Ashvayuja");
    expect(oct3.tithi[0]).toMatchObject({ name: "Saptami", paksha: "Krishna" });
    expect(oct3.ritu).toBe("Sharad");
  });

  it("dates 2026 festivals as published Telugu calendars do", () => {
    const festivals = new Map<string, string>();
    for (const month of [2, 3, 9, 10, 11]) {
      for (const day of buildCalendarMonth({ year: 2026, month, ...HYDERABAD }).days)
        for (const o of day.observances) if (o.kind === "festival" || o.id === "makara-sankranti") festivals.set(o.id, day.date);
    }
    expect(festivals.get("maha-shivaratri")).toBe("2026-02-15");
    expect(festivals.get("ugadi")).toBe("2026-03-19"); // kshaya Pratipada
    expect(festivals.get("rama-navami")).toBe("2026-03-26");
    expect(festivals.get("vinayaka-chavithi")).toBe("2026-09-14");
    expect(festivals.get("navaratri")).toBe("2026-10-11");
    expect(festivals.get("vijaya-dashami")).toBe("2026-10-20");
    expect(festivals.get("deepavali")).toBe("2026-11-08");
  });

  it("gives a single requested day the same tithis and observances as the month view", () => {
    const november = buildCalendarMonth({ year: 2026, month: 11, ...HYDERABAD });
    for (const date of ["2026-11-05", "2026-11-08", "2026-11-09", "2026-11-24"]) {
      const fromMonth = november.days.find((d) => d.date === date)!;
      const [single] = buildCalendarRange({ startDate: date, days: 1, ...HYDERABAD, detailed: true });
      expect(single.observances.map((o) => o.id)).toEqual(fromMonth.observances.map((o) => o.id));
      expect(single.tithi.map((t) => t.name)).toEqual(fromMonth.tithi.map((t) => t.name));
    }
    // Amavasya prevails at sunrise on the 9th, so it belongs to the 9th only.
    expect(november.days[7].observances.map((o) => o.id)).not.toContain("amavasya");
    expect(november.days[8].observances.map((o) => o.id)).toContain("amavasya");
  });

  it("finds moonrise within the local date, not the UTC date", () => {
    const [day] = buildCalendarRange({ startDate: "2026-11-08", days: 1, ...HYDERABAD, detailed: true });
    expect(day.moon?.moonrise).not.toBeNull();
    const localHour = (Date.parse(day.moon!.moonrise!) / 3_600_000 + 5.5) % 24;
    expect(localHour).toBeGreaterThan(3); // a day-before-new-moon Moon rises just before dawn
    expect(localHour).toBeLessThan(7);
  });

  it("computes durmuhurtam, varjyam, amrita kalam and samvatsara like a Telugu panchangam", () => {
    const [sat] = buildCalendarRange({ startDate: "2026-10-03", days: 1, ...HYDERABAD, detailed: true });
    const rise = Date.parse(sat.sunrise!),
      set = Date.parse(sat.sunset!),
      muhurta = (set - rise) / 15;
    // Saturday: the first two day muhurtas.
    expect(sat.durmuhurtam!.map((w) => Math.round((Date.parse(w.startIso) - rise) / muhurta))).toEqual([0, 1]);
    // Varjyam / amrita last 4 ghatis = 1/15 of their nakshatra and sit inside it.
    for (const w of [...sat.varjyam!, ...sat.amritaKalam!]) {
      const nak = sat.nakshatra.find((n) => n.name === w.nakshatra) ?? null;
      if (nak) {
        const length = Date.parse(nak.endIso) - Date.parse(nak.startIso);
        expect(Math.abs(Date.parse(w.endIso) - Date.parse(w.startIso) - length / 15)).toBeLessThan(2000);
        expect(Date.parse(w.startIso)).toBeGreaterThanOrEqual(Date.parse(nak.startIso));
      }
    }
    expect(sat.samvatsara).toBe("Parabhava");
    const [beforeUgadi] = buildCalendarRange({ startDate: "2026-03-18", days: 1, ...HYDERABAD });
    const [ugadi] = buildCalendarRange({ startDate: "2026-03-19", days: 1, ...HYDERABAD });
    expect(beforeUgadi.samvatsara).toBe("Vishvavasu");
    expect(ugadi.samvatsara).toBe("Parabhava");
    const [sunday] = buildCalendarRange({ startDate: "2026-10-04", days: 1, ...HYDERABAD, detailed: true });
    const sr = Date.parse(sunday.sunrise!),
      m = (Date.parse(sunday.sunset!) - sr) / 15;
    expect(Math.round((Date.parse(sunday.durmuhurtam![0].startIso) - sr) / m)).toBe(13); // 14th muhurta
  });

  it("keeps a month inside the Worker CPU budget", () => {
    buildCalendarMonth({ year: 2026, month: 1, ...HYDERABAD });
    const t = performance.now();
    buildCalendarMonth({ year: 2026, month: 12, ...HYDERABAD });
    expect(performance.now() - t).toBeLessThan(1500);
  });
});

describe("daily panchanga ritu", () => {
  it("reports Sharad in early October", () => {
    const base = { name: "Today", time: "12:00", place: "Hyderabad", ...HYDERABAD, language: "en", methodology: "parashari", focus: "general", birthTimeAccuracyMinutes: 0 };
    const today = calculateChart(birthInputSchema.parse({ ...base, date: "2026-10-03" }));
    const next = calculateChart(birthInputSchema.parse({ ...base, date: "2026-10-04" }));
    const daily = buildDailyPanchanga(today, next) as { calendar: { ritu: string } };
    expect(daily.calendar.ritu).toBe("Sharad");
  });
});
