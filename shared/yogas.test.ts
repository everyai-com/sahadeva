import { describe, expect, it } from "vitest";
import { detectStructuralYogas } from "./yogas";
import type { Placement } from "./schema";

const p = (name: Placement["name"], sign: number, degree = 1): Placement => ({ name, sign, degree, longitude: sign * 30 + degree, nakshatra:"test", pada:1 });
describe("structural yoga evidence", () => {
  it("detects candidates without generating outcome claims", () => {
    const placements = [p("Lagna",0),p("Sun",4),p("Moon",0),p("Mars",0),p("Mercury",4),p("Jupiter",3),p("Venus",1),p("Saturn",9),p("Rahu",2),p("Ketu",8)];
    const yogas = detectStructuralYogas(placements);
    expect(yogas.some((y) => y.yoga === "Mars Mahapurusha candidate" && y.detected)).toBe(true);
    expect(yogas.every((y) => y.status === "structural-only" && y.evidence.length > 0)).toBe(true);
  });
});
