import { describe, expect, it } from "vitest";
import type { Placement } from "./schema";
import { CLASSICAL_PLANET_DIRECTIONS, CLASSICAL_SIGN_DIRECTIONS, classicalLostObjectLocation } from "./classicalLocation";

const placement = (name: Placement["name"], longitude: number): Placement => ({
  name, longitude, sign: Math.floor(longitude / 30), degree: longitude % 30,
  nakshatra: "fixture", pada: 1,
});

describe("Classical lost-object direction and distance", () => {
  it("locks both complete source direction tables", () => {
    expect(CLASSICAL_PLANET_DIRECTIONS).toEqual({
      Sun: "east", Venus: "south-east", Mars: "south", Rahu: "south-west",
      Saturn: "west", Moon: "north-west", Mercury: "north", Jupiter: "north-east",
    });
    expect(CLASSICAL_SIGN_DIRECTIONS).toEqual([
      "east", "south", "west", "north", "east", "south", "west", "north", "east", "south", "west", "north",
    ]);
  });

  it("uses a sole angular planet and falls back to the ascendant only when angles are empty", () => {
    expect(classicalLostObjectLocation([placement("Jupiter", 95)], 5)).toMatchObject({
      direction: "north-east", directionBasis: "single-angular-planet", selectedPlanet: "Jupiter",
    });
    expect(classicalLostObjectLocation([placement("Jupiter", 95)], 65)).toMatchObject({
      direction: "west", directionBasis: "ascendant-sign-fallback", selectedPlanet: null,
    });
  });

  it("selects a unique strongest angular planet but abstains on missing strength or a tie", () => {
    const planets = [placement("Sun", 5), placement("Moon", 95)];
    expect(classicalLostObjectLocation(planets, 2, { Sun: 300, Moon: 420 })).toMatchObject({
      direction: "north-west", directionBasis: "strongest-angular-planet", selectedPlanet: "Moon",
    });
    expect(classicalLostObjectLocation(planets, 2, { Sun: 300 })).toMatchObject({ direction: null, directionBasis: "unresolved-strength" });
    expect(classicalLostObjectLocation(planets, 2, { Sun: 300, Moon: 300 })).toMatchObject({ direction: null, directionBasis: "unresolved-strength" });
  });

  it("does not assign Ketu a direction absent from the source table", () => {
    expect(classicalLostObjectLocation([placement("Ketu", 5)], 2)).toMatchObject({
      direction: null, directionBasis: "unmapped-angular-planet", selectedPlanet: "Ketu",
    });
  });

  it("handles every Navamsa boundary while withholding the ambiguous Yojana choice", () => {
    expect(classicalLostObjectLocation([], 0)).toMatchObject({ navamsaOrdinal: 1, completedNavamsas: 0 });
    expect(classicalLostObjectLocation([], 3 + 1 / 3 - 1e-7)).toMatchObject({ navamsaOrdinal: 1 });
    expect(classicalLostObjectLocation([], 3 + 1 / 3)).toMatchObject({ navamsaOrdinal: 2, completedNavamsas: 1 });
    expect(classicalLostObjectLocation([], 13 + 1 / 3)).toMatchObject({ navamsaOrdinal: 5, fifthNavamsaCountryMarker: true });
    expect(classicalLostObjectLocation([], 29.999999)).toMatchObject({
      navamsaOrdinal: 9, completedNavamsas: 8, distanceYojanas: null,
      distanceCandidates: { currentOrdinal: 9, completedDivisions: 8 },
    });
  });

  it.each([-1, 360, Number.NaN, Number.POSITIVE_INFINITY])("rejects invalid Lagna longitude %s", (longitude) => {
    expect(() => classicalLostObjectLocation([], longitude)).toThrow(/Lagna longitude/);
  });
});
