import { describe, expect, it } from "vitest";
import {
  bestEffortKnownLocation,
  findKnownLocation,
  KNOWN_LOCATIONS,
  locationLabel,
  resolveKnownLocation,
  searchKnownLocations,
  type KnownLocation,
} from "./locations";

describe("offline location catalogue", () => {
  it("has unique labels and valid coordinates", () => {
    const labels = KNOWN_LOCATIONS.map(locationLabel);
    expect(new Set(labels).size).toBe(labels.length);
    expect(KNOWN_LOCATIONS.length).toBeGreaterThanOrEqual(80);
    for (const place of KNOWN_LOCATIONS) {
      expect(place.latitude).toBeGreaterThanOrEqual(-90);
      expect(place.latitude).toBeLessThanOrEqual(90);
      expect(place.longitude).toBeGreaterThanOrEqual(-180);
      expect(place.longitude).toBeLessThanOrEqual(180);
      expect(
        () => new Intl.DateTimeFormat("en", { timeZone: place.timezone }),
      ).not.toThrow();
      expect(place.timezoneOffset).toBeGreaterThanOrEqual(-12);
      expect(place.timezoneOffset).toBeLessThanOrEqual(14);
    }
  });
  it("resolves historical aliases, Mandals, districts and worldwide cities", () => {
    expect(findKnownLocation("Yadagirigutta")?.name).toBe("Yadadri");
    expect(findKnownLocation("NYC")?.name).toBe("New York");
    expect(findKnownLocation("Ravulapalem")?.latitude).toBe(16.7607);
    expect(
      searchKnownLocations("Sri Sathya Sai").length,
    ).toBeGreaterThanOrEqual(3);
    expect(searchKnownLocations("Telangana").length).toBe(20);
    expect(KNOWN_LOCATIONS.some((item) => item.country !== "India")).toBe(true);
  });
  it("resolves and ranks common Vizianagaram transliterations", () => {
    expect(findKnownLocation("Vijayanagaram")?.name).toBe("Vizianagaram");
    expect(findKnownLocation("Vijaya Nagaram")?.name).toBe("Vizianagaram");
    expect(searchKnownLocations("Vijayanagaram")[0]?.name).toBe(
      "Vizianagaram",
    );
  });
  it("resolves Ambajipeta with its Konaseema coordinates and India timezone", () => {
    const place = findKnownLocation("Ambajipeta");
    expect(place).toMatchObject({
      name: "Ambajipeta",
      district: "Dr. B. R. Ambedkar Konaseema",
      timezone: "Asia/Kolkata",
      latitude: 16.5908,
      longitude: 81.9238,
    });
  });
  it("never silently chooses between distinct places with the same name", () => {
    const base = {
        name: "Rampur",
        state: "Telangana",
        country: "India",
        timezone: "Asia/Kolkata",
        timezoneOffset: 5.5,
      } as const,
      catalogue: KnownLocation[] = [
        { ...base, district: "A", latitude: 17, longitude: 78 },
        { ...base, district: "B", latitude: 18, longitude: 79 },
      ];
    const result = resolveKnownLocation("Rampur", catalogue);
    expect(result.status).toBe("ambiguous");
    expect(result.matches).toHaveLength(2);
  });
  it("resolves a locality with user-supplied state and country even when the stored label also has a district", () => {
    const result = resolveKnownLocation("Ravulapalem, Andhra Pradesh, India");
    expect(result.status).toBe("resolved");
    if (result.status === "resolved")
      expect(result.location.name).toBe("Ravulapalem");
  });
  it("tolerates a small locality typo when the match is unique", () => {
    const result = resolveKnownLocation("Ravulaplem, Andhra Pradesh, India");
    expect(result.status).toBe("resolved");
    if (result.status === "resolved")
      expect(result.location.name).toBe("Ravulapalem");
  });
  it("returns disambiguation matches instead of selecting duplicate locality names", () => {
    const base = {
        name: "Rampur",
        state: "Telangana",
        country: "India",
        timezone: "Asia/Kolkata",
        timezoneOffset: 5.5,
      } as const,
      catalogue: KnownLocation[] = [
        { ...base, district: "A", latitude: 17, longitude: 78 },
        { ...base, district: "B", latitude: 18, longitude: 79 },
      ];
    const result = resolveKnownLocation("Rampur, Telangana, India", catalogue);
    expect(result.status).toBe("ambiguous");
    expect(result.matches).toHaveLength(2);
  });
  it("best-effort prefers curated full names over GeoNames admin codes", () => {
    const result = resolveKnownLocation("Hyderabad");
    // Bare "Hyderabad" hits curated + generated rows; resolution stays
    // ambiguous so search can show choices, but chart tools auto-pick curated.
    expect(result.status).toBe("ambiguous");
    if (result.status === "ambiguous") {
      const winner = bestEffortKnownLocation(result.matches);
      expect(winner?.state).toBe("Telangana");
      expect(winner?.country).toBe("India");
    }
  });
});
