import { describe, expect, it } from "vitest";
import { functionalNature } from "./comprehensiveRemedies";
import { LORDS } from "./compatibility";

// Golden correctness set for the functional-nature logic, per ascendant. This
// is the reasoning that makes gemstone recommendations astrologer-grade
// (strengthen only functional benefics), so it is pinned across all 12 lagnas.

const SIGN_NAMES = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
];
const lordOf = (lagna: number, house: number) => LORDS[(lagna + house - 1) % 12];

describe("functional nature per ascendant", () => {
  for (let lagna = 0; lagna < 12; lagna++) {
    it(`${SIGN_NAMES[lagna]} lagna: trine (1/5/9) lords are favourable, nodes never are`, () => {
      const nat = functionalNature(lagna);
      const fav = nat.favorable;
      // Every trikona lord must be favourable to strengthen.
      for (const h of [1, 5, 9]) expect(fav.has(lordOf(lagna, h))).toBe(true);
      // Rahu/Ketu are never sign lords, so never in the favourable set.
      expect(fav.has("Rahu" as never)).toBe(false);
      expect(fav.has("Ketu" as never)).toBe(false);
    });
  }

  it("matches known textbook cases", () => {
    // Gemini: Saturn rules the 9th (Aquarius) -> the classic Blue Sapphire lagna.
    expect(new Set(functionalNature(2).favorable).has("Saturn")).toBe(true);
    // Libra: Saturn rules 4th+5th -> yogakaraka, favourable.
    expect(new Set(functionalNature(6).favorable).has("Saturn")).toBe(true);
    // Aries: Saturn rules 10th+11th -> NOT a strengthening candidate.
    expect(new Set(functionalNature(0).favorable).has("Saturn")).toBe(false);
    // Taurus: Saturn rules 9th+10th -> yogakaraka, favourable.
    expect(new Set(functionalNature(1).favorable).has("Saturn")).toBe(true);
    // Capricorn: Venus rules 5th+10th -> yogakaraka, favourable.
    expect(new Set(functionalNature(9).favorable).has("Venus")).toBe(true);
  });

  it("computes yogakaraka only when one graha lords both a kendra and a trikona", () => {
    // Taurus and Libra have Saturn as yogakaraka.
    expect(functionalNature(1).yogakaraka).toContain("Saturn");
    expect(functionalNature(6).yogakaraka).toContain("Saturn");
    // Cancer and Leo have Mars as yogakaraka.
    expect(functionalNature(3).yogakaraka).toContain("Mars");
    expect(functionalNature(4).yogakaraka).toContain("Mars");
  });
});
