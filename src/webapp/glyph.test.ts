import { describe, expect, it } from "vitest";
import { NAKSHATRAS, SIGNS } from "../../shared/constants";
import { glyphSrc, tithiNumber, type GlyphFamily } from "./glyph";

// Every vendored glyph file, keyed by its public URL path.
const vendored = new Set(
  Object.keys(import.meta.glob("/public/glyphs/**/*.svg")).map((path) => path.replace(/^\/public/, "")),
);
const exists = (family: GlyphFamily, id: string | number, paksha?: string) => {
  const src = glyphSrc(family, id, paksha);
  return Boolean(src && vendored.has(src));
};

// Names exactly as the engine emits them (shared/jyotish.ts).
const YOGAS = ["Vishkambha", "Priti", "Ayushman", "Saubhagya", "Shobhana", "Atiganda", "Sukarma", "Dhriti", "Shula", "Ganda", "Vriddhi", "Dhruva", "Vyaghata", "Harshana", "Vajra", "Siddhi", "Vyatipata", "Variyana", "Parigha", "Shiva", "Siddha", "Sadhya", "Shubha", "Shukla", "Brahma", "Indra", "Vaidhriti"];
const KARANAS = ["Bava", "Balava", "Kaulava", "Taitila", "Garaja", "Vanija", "Vishti", "Shakuni", "Chatushpada", "Naga", "Kimstughna"];
const GRAHAS = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];

describe("vendored Sahadeva glyphs", () => {
  it("are present", () => {
    expect(vendored.size).toBeGreaterThan(150);
  });

  it("cover every graha, rashi, bhava and nakshatra the engine emits", () => {
    for (const g of GRAHAS) expect(exists("graha", g), g).toBe(true);
    SIGNS.forEach((s, i) => {
      expect(exists("rashi", s), s).toBe(true);
      expect(exists("rashi", i), String(i)).toBe(true);
      expect(exists("bhava", i + 1), `house ${i + 1}`).toBe(true);
    });
    for (const n of NAKSHATRAS) expect(exists("nakshatra", n), n).toBe(true);
  });

  it("cover every panchanga yoga, karana and tithi", () => {
    for (const y of YOGAS) expect(exists("yoga", y), y).toBe(true);
    for (const k of KARANAS) expect(exists("karana", k), k).toBe(true);
    for (let n = 1; n <= 30; n++) expect(exists("tithi", n), String(n)).toBe(true);
  });

  it("numbers tithis across both pakshas", () => {
    expect(tithiNumber("Pratipada", "Shukla")).toBe(1);
    expect(tithiNumber("Purnima", "Shukla")).toBe(15);
    expect(tithiNumber("Ashtami", "Krishna")).toBe(23);
    expect(tithiNumber("Chaturdashi", "Krishna")).toBe(29);
    expect(tithiNumber("Amavasya", "Krishna")).toBe(30);
  });

  it("returns null for unknown entities instead of a broken path", () => {
    expect(glyphSrc("graha", "Pluto")).toBeNull();
    expect(glyphSrc("nakshatra", "Abhijit")).toBeNull();
    expect(glyphSrc("yoga", "../../etc")).toBeNull();
  });
});
