import type { GrahaName, Placement } from "./schema";

export type CompassDirection = "east" | "south-east" | "south" | "south-west" | "west" | "north-west" | "north" | "north-east";

export const CLASSICAL_PLANET_DIRECTIONS: Readonly<Partial<Record<GrahaName, CompassDirection>>> = {
  Sun: "east", Venus: "south-east", Mars: "south", Rahu: "south-west",
  Saturn: "west", Moon: "north-west", Mercury: "north", Jupiter: "north-east",
};

export const CLASSICAL_SIGN_DIRECTIONS: readonly CompassDirection[] = [
  "east", "south", "west", "north", "east", "south",
  "west", "north", "east", "south", "west", "north",
];

export type ClassicalLostObjectLocation = {
  angularCandidates: Array<{
    planet: GrahaName;
    house: 1 | 4 | 7 | 10;
    direction: CompassDirection | null;
    shadbalaTotalVirupas: number | null;
  }>;
  direction: CompassDirection | null;
  directionBasis: "single-angular-planet" | "strongest-angular-planet" | "ascendant-sign-fallback" | "unresolved-strength" | "unmapped-angular-planet";
  selectedPlanet: GrahaName | null;
  lagnaComparisonStatus: "not-needed" | "whole-sign-bhava-bala-unavailable";
  navamsaOrdinal: number;
  completedNavamsas: number;
  fifthNavamsaCountryMarker: boolean;
  distanceYojanas: null;
  distanceCandidates: { currentOrdinal: number; completedDivisions: number };
  distanceNotice: string;
};

/**
 * Daivajna Vallabha, Lost Articles 9; Chappanna/Prasana Sastra 41.
 * Direction is executable. Distance preserves both grammatically possible
 * readings because the two installed English witnesses remain ambiguous.
 */
export function classicalLostObjectLocation(
  placements: Placement[],
  lagnaLongitude: number,
  shadbala: Partial<Record<GrahaName, number | null>> = {},
): ClassicalLostObjectLocation {
  if (!Number.isFinite(lagnaLongitude) || lagnaLongitude < 0 || lagnaLongitude >= 360)
    throw new Error("Lagna longitude must be finite and in [0, 360)");
  const lagnaSign = Math.floor(lagnaLongitude / 30);
  const angularCandidates = placements
    .filter((item) => item.name !== "Lagna")
    .flatMap((planet) => {
      const house = ((planet.sign - lagnaSign + 12) % 12) + 1;
      return [1, 4, 7, 10].includes(house)
        ? [{
            planet: planet.name,
            house: house as 1 | 4 | 7 | 10,
            direction: CLASSICAL_PLANET_DIRECTIONS[planet.name] ?? null,
            shadbalaTotalVirupas: shadbala[planet.name] ?? null,
          }]
        : [];
    });

  let direction: CompassDirection | null = null;
  let directionBasis: ClassicalLostObjectLocation["directionBasis"] = "unresolved-strength";
  let selectedPlanet: GrahaName | null = null;
  if (!angularCandidates.length) {
    direction = CLASSICAL_SIGN_DIRECTIONS[lagnaSign];
    directionBasis = "ascendant-sign-fallback";
  } else if (angularCandidates.length === 1) {
    const only = angularCandidates[0];
    direction = only.direction;
    selectedPlanet = only.planet;
    directionBasis = only.direction ? "single-angular-planet" : "unmapped-angular-planet";
  } else if (angularCandidates.every((item) => item.shadbalaTotalVirupas !== null)) {
    const ranked = [...angularCandidates].sort((a, b) => b.shadbalaTotalVirupas! - a.shadbalaTotalVirupas!);
    const uniqueMaximum = ranked[0].shadbalaTotalVirupas! > ranked[1].shadbalaTotalVirupas!;
    if (uniqueMaximum) {
      selectedPlanet = ranked[0].planet;
      direction = ranked[0].direction;
      directionBasis = direction ? "strongest-angular-planet" : "unmapped-angular-planet";
    }
  }

  const degreeInSign = lagnaLongitude % 30;
  const navamsaOrdinal = Math.min(9, Math.floor((degreeInSign + 1e-10) / (10 / 3)) + 1);
  return {
    angularCandidates,
    direction,
    directionBasis,
    selectedPlanet,
    lagnaComparisonStatus: angularCandidates.length ? "whole-sign-bhava-bala-unavailable" : "not-needed",
    navamsaOrdinal,
    completedNavamsas: navamsaOrdinal - 1,
    fifthNavamsaCountryMarker: navamsaOrdinal === 5,
    distanceYojanas: null,
    distanceCandidates: { currentOrdinal: navamsaOrdinal, completedDivisions: navamsaOrdinal - 1 },
    distanceNotice: "The scans say distance is the number of Navamsas 'elapsed' and also 'passed from the 5th'; they do not resolve current ordinal versus completed divisions. No single Yojana value is selected.",
  };
}
