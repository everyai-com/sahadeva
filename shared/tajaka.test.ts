import { describe, expect, it } from "vitest";
import type { Placement } from "./schema";
import { tajakaCareerExchange, tajakaCareerKamboola, tajakaKamboola, tajakaObjectRealisationStanza113, tajakaRelation, tajakaTransferCandidates } from "./tajaka";

const placement = (name: Placement["name"], longitude: number): Placement => ({
  name, longitude, sign: Math.floor(longitude / 30), degree: longitude % 30,
  nakshatra: "fixture", pada: 1,
});

describe("Tajaka aspect motion", () => {
  it("preserves Prasna Tantra's asymmetric 3rd/11th sextile strengths", () => {
    const third = tajakaRelation(
      [placement("Mercury", 0), placement("Jupiter", 60)],
      [placement("Mercury", 1), placement("Jupiter", 60)],
      "Mercury", "Jupiter",
    );
    const eleventh = tajakaRelation(
      [placement("Mercury", 0), placement("Jupiter", 300)],
      [placement("Mercury", 359), placement("Jupiter", 300)],
      "Mercury", "Jupiter",
    );
    expect(third).toMatchObject({ aspect: "sextile", direction: "3rd", strength: 40, angle: 60 });
    expect(eleventh).toMatchObject({ aspect: "sextile", direction: "11th", strength: 10, angle: 300 });
  });
  it("distinguishes applying from separating motion", () => {
    const current = [placement("Moon", 10), placement("Venus", 72)];
    expect(tajakaRelation(current, [placement("Moon", 11), placement("Venus", 72)], "Moon", "Venus"))
      .toMatchObject({ aspect: "sextile", nature: "friendly", strength: 40, motion: "applying", orb: 2, allowedOrb: 9.5, withinDeepthamsa: true });
    expect(tajakaRelation(current, [placement("Moon", 9), placement("Venus", 72)], "Moon", "Venus"))
      .toMatchObject({ aspect: "sextile", motion: "separating", orb: 2 });
  });
  it("treats 0/360-degree wraparound as conjunction geometry", () => {
    expect(tajakaRelation(
      [placement("Mercury", 1), placement("Venus", 359)],
      [placement("Mercury", 0.5), placement("Venus", 359.5)],
      "Mercury", "Venus",
    )).toMatchObject({ aspect: "conjunction", direction: "conjunction", angle: 360, orb: 2, futureOrb: 1, motion: "applying" });
    expect(tajakaRelation(
      [placement("Mercury", 359), placement("Venus", 1)],
      [placement("Mercury", 358.5), placement("Venus", 1.5)],
      "Mercury", "Venus",
    )).toMatchObject({ aspect: "conjunction", direction: "conjunction", angle: 0, orb: 2, futureOrb: 3, motion: "separating" });
  });
  it("uses the source's planet-specific deepthamsas and Poorna boundary", () => {
    expect(tajakaRelation(
      [placement("Sun", 0), placement("Saturn", 102)],
      [placement("Sun", 1), placement("Saturn", 102)],
      "Sun", "Saturn",
    )).toMatchObject({ aspect: "square", nature: "hostile", allowedOrb: 12, withinDeepthamsa: true, completeness: "forming" });
    expect(tajakaRelation(
      [placement("Mercury", 0), placement("Venus", 68)],
      [placement("Mercury", 1), placement("Venus", 68)],
      "Mercury", "Venus",
    )).toMatchObject({ allowedOrb: 7, withinDeepthamsa: false, completeness: "outside-deepthamsa" });
  });
  it("detects source-defined Nakta and Yamaya transfer candidates", () => {
    const naktaCurrent = [placement("Mercury", 60.5), placement("Jupiter", 189), placement("Moon", 0)];
    const naktaFuture = [placement("Mercury", 60.52), placement("Jupiter", 189.005), placement("Moon", 0.1)];
    expect(tajakaTransferCandidates(naktaCurrent, naktaFuture, "Mercury", "Jupiter"))
      .toEqual([expect.objectContaining({
        yoga: "nakta", intermediary: "Moon", donor: "Mercury", receiver: "Jupiter",
        perfectionOrder: ["Mercury", "Jupiter"],
      })]);

    const yamayaCurrent = [placement("Moon", 50), placement("Venus", 82), placement("Saturn", 0)];
    const yamayaFuture = [placement("Moon", 50.5), placement("Venus", 82.05), placement("Saturn", 0.01)];
    expect(tajakaTransferCandidates(yamayaCurrent, yamayaFuture, "Moon", "Venus"))
      .toEqual([expect.objectContaining({ yoga: "yamaya", intermediary: "Saturn", receiver: "Saturn" })]);
  });
  it("rejects in-orb transfer contacts that are stationary, separating, or perfect in the wrong Nakta order", () => {
    const current = [placement("Mercury", 60.5), placement("Jupiter", 189), placement("Moon", 0)];
    expect(tajakaTransferCandidates(
      current,
      [placement("Mercury", 60.52), placement("Jupiter", 189.005), placement("Moon", -0.1)],
      "Mercury", "Jupiter",
    )).toEqual([]);
    expect(tajakaTransferCandidates(
      current,
      [placement("Mercury", 60.52), placement("Jupiter", 189.005), placement("Moon", 1)],
      "Mercury", "Jupiter",
    )).toEqual([]); // Moon crosses the near Mercury contact inside the sample step.
  });
  it("requires both Ithasala links and grades D1-decidable Kamboola cases", () => {
    const current = [placement("Jupiter", 0), placement("Venus", 122), placement("Moon", 61)];
    const future = [placement("Jupiter", 0.1), placement("Venus", 121.4), placement("Moon", 61.8)];
    expect(tajakaKamboola(current, future, "Venus", "Jupiter", [
      { name: "Venus", dignity: "own-sign" },
      { name: "Jupiter", dignity: "exalted" },
      { name: "Moon", dignity: "own-sign" },
    ])).toMatchObject({ grade: "uttamottama", moonRelationWith: "Venus", unavailableGradeInputs: [] });
    expect(tajakaKamboola(current, future, "Venus", "Jupiter", [
      { name: "Venus", dignity: "debilitated" },
      { name: "Jupiter", dignity: "debilitated" },
      { name: "Moon", dignity: "exalted" },
    ])).toMatchObject({ grade: "uttamadhama" });
    expect(tajakaKamboola(current, future, "Venus", "Jupiter", [
      { name: "Venus", dignity: "own-sign" },
      { name: "Jupiter", dignity: "exalted" },
      { name: "Moon", dignity: "neutral" },
    ], {
      D9: [placement("Moon", 90)],
      D12: [placement("Moon", 90)],
    })).toMatchObject({ grade: "madhyamottama", gradeBasis: expect.stringContaining("D9 and D12") });
    expect(tajakaKamboola(current, future, "Venus", "Jupiter", [
      { name: "Venus", dignity: "own-sign" },
      { name: "Jupiter", dignity: "neutral" },
      { name: "Moon", dignity: "neutral" },
    ], {
      D3: [placement("Moon", 90)],
    })).toMatchObject({ grade: "madhyama", gradeBasis: expect.stringContaining("D9 or D3") });
    expect(tajakaKamboola(current, future, "Venus", "Jupiter", [
      { name: "Venus", dignity: "neutral" },
      { name: "Jupiter", dignity: "neutral" },
      { name: "Moon", dignity: "neutral" },
    ])).toMatchObject({ grade: "unresolved", unavailableGradeInputs: expect.arrayContaining(["Hadda/term dignity"]) });
  });
  it("rejects Kamboola when either required applying contact is absent", () => {
    const current = [placement("Jupiter", 0), placement("Venus", 122), placement("Moon", 250)];
    const future = [placement("Jupiter", 0.1), placement("Venus", 121.4), placement("Moon", 251)];
    expect(tajakaKamboola(current, future, "Venus", "Jupiter", [])).toBeNull();
  });
  it("applies stanza 112 only to career Kamboola with an angular Moon", () => {
    // Cancer rises: Moon rules Lagna and Mars rules the tenth.  Moon applies
    // to Mars by trine while Jupiter also applies to the Moon by sextile.
    const current = [placement("Moon", 90), placement("Mars", 212), placement("Jupiter", 28)];
    const future = [placement("Moon", 91), placement("Mars", 211.8), placement("Jupiter", 28.1)];
    expect(tajakaCareerKamboola(current, future, 3, [
      { name: "Moon", dignity: "own-sign" },
      { name: "Mars", dignity: "neutral" },
    ])).toMatchObject({ moonHouse: 1, resultScale: "enlarged-position" });
    expect(tajakaCareerKamboola(
      [placement("Moon", 150), placement("Mars", 272), placement("Jupiter", 88)],
      [placement("Moon", 151), placement("Mars", 271.8), placement("Jupiter", 88.1)],
      3,
      [],
    )).toBeNull();
  });
  it("requires a clear two-way exchange for stanza 109 and exposes affliction gates", () => {
    // Aries rises: Mars must occupy Capricorn (10th) and Saturn Aries (1st).
    const clear = [placement("Mars", 275), placement("Saturn", 5), placement("Sun", 80)];
    const clearFuture = [placement("Mars", 275.1), placement("Saturn", 5.01), placement("Sun", 81)];
    expect(tajakaCareerExchange(clear, clearFuture, 0)).toMatchObject({
      lagnaLord: "Mars", tenthLord: "Saturn", lagnaLordHouse: 10, tenthLordHouse: 1,
      qualifies: true, afflictions: [],
    });
    expect(tajakaCareerExchange(
      [...clear, placement("Rahu", 8)],
      [...clearFuture, placement("Rahu", 8)],
      0,
    )).toMatchObject({ qualifies: false, afflictions: [expect.objectContaining({ target: "Saturn", malefic: "Rahu" })] });
    expect(tajakaCareerExchange(
      [placement("Venus", 305), placement("Saturn", 35), placement("Mars", 125)],
      [placement("Venus", 305.2), placement("Saturn", 35.01), placement("Mars", 125.1)],
      1,
    )).toMatchObject({
      qualifies: false,
      afflictions: expect.arrayContaining([
        expect.objectContaining({ target: "Saturn", malefic: "Mars", contact: expect.stringContaining("square") }),
      ]),
    });
    expect(tajakaCareerExchange(
      [placement("Mars", 275), placement("Saturn", 35)],
      [placement("Mars", 275.1), placement("Saturn", 35.01)],
      0,
    )).toBeNull();
  });
  it("aggregates stanza 113 dusthana, combustion, and square clauses", () => {
    const current = [placement("Mars", 350), placement("Jupiter", 150), placement("Mercury", 240)];
    expect(tajakaObjectRealisationStanza113(current, 0, [
      { name: "Mars", dignity: "neutral", combust: true },
    ])).toMatchObject({
      lagnaLord: "Mars", dispositor: "Jupiter", dispositorHouse: 6,
      dusthanaDispositor: true, lagnaLordCombust: true,
      squareContacts: [expect.objectContaining({ planet: "Mercury", direction: "4th", degreeOffset: 0 })],
      activeClauses: expect.arrayContaining([expect.stringContaining("house 6"), expect.stringContaining("combust"), expect.stringContaining("square")]),
    });
    expect(tajakaObjectRealisationStanza113(
      [placement("Mars", 10), placement("Venus", 40)],
      0,
      [],
    )).toMatchObject({ dispositor: "Mars", dispositorHouse: 1, activeClauses: [] });
  });
  it.each([[7, 8], [11, 12]] as const)("recognises dispositor sign %i as dusthana house %i", (sign, house) => {
    const longitude = sign * 30 + 5;
    expect(tajakaObjectRealisationStanza113(
      [placement("Mars", 350), placement("Jupiter", longitude)],
      0,
      [],
    )).toMatchObject({ dispositor: "Jupiter", dispositorHouse: house, dusthanaDispositor: true });
  });
  it("distinguishes the opposite sign-square direction without imposing deepthamsa", () => {
    const base = [placement("Mars", 350), placement("Jupiter", 150)];
    expect(tajakaObjectRealisationStanza113(
      [...base, placement("Mercury", 60)],
      0,
      [],
    ).squareContacts).toEqual([expect.objectContaining({ planet: "Mercury", direction: "10th", degreeOffset: 0 })]);
    expect(tajakaObjectRealisationStanza113(
      [...base, placement("Mercury", 251)],
      0,
      [],
    ).squareContacts).toEqual([expect.objectContaining({ planet: "Mercury", direction: "4th", degreeOffset: 11 })]);
  });
  it("reproduces the stanza 113 geometry of Raman's 31 January 1969 job-interview chart", () => {
    // South-Indian fixed-sign diagram: Libra Lagna; Venus in Pisces;
    // its dispositor Jupiter in Virgo (12th); Moon in Gemini, 10th by sign
    // from Jupiter. Printed degrees deliberately remain far outside deepthamsa.
    const current = [
      placement("Venus", 337), placement("Jupiter", 164), placement("Moon", 89 + 53 / 60),
      placement("Mars", 206), placement("Saturn", 358), placement("Sun", 290), placement("Mercury", 284),
    ];
    expect(tajakaObjectRealisationStanza113(current, 6, [])).toMatchObject({
      lagnaLord: "Venus", dispositor: "Jupiter", dispositorHouse: 12,
      dusthanaDispositor: true,
      squareContacts: expect.arrayContaining([
        expect.objectContaining({ planet: "Moon", direction: "10th", degreeOffset: expect.closeTo(15.8833, 3) }),
      ]),
    });
  });
});
