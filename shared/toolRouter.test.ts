import { describe, expect, it } from "vitest";
import { recommendTools } from "./toolRouter";
import { ROUTER_GOLDEN } from "./toolRouter.golden";

describe("tool router", () => {
  it.each(ROUTER_GOLDEN.map((c) => [c.q, c.intent] as const))(
    "routes %j -> %s",
    (q, intent) => {
      expect(recommendTools(q).intent).toBe(intent);
    },
  );

  it("meets the routing-accuracy bar on the golden set", () => {
    const correct = ROUTER_GOLDEN.filter(
      (c) => recommendTools(c.q).intent === c.intent,
    ).length;
    const accuracy = correct / ROUTER_GOLDEN.length;
    // Hard floor so a future edit that regresses routing fails CI.
    expect(accuracy).toBeGreaterThanOrEqual(0.95);
  });

  it("always returns a non-empty ordered plan and a safety block", () => {
    const r = recommendTools("Are we compatible as co-founders?", {
      hasSecondPerson: true,
    });
    expect(r.plan.length).toBeGreaterThan(0);
    expect(r.plan[r.plan.length - 1].tool).toBe(
      "calculate_relationship_compatibility",
    );
    expect(r.safety.status).toBe("routing-hint");
  });

  it("flags a missing second person for two-person questions", () => {
    const r = recommendTools("business partner compatibility", {
      hasSecondPerson: false,
    });
    expect(r.notes.join(" ")).toMatch(/second person/i);
  });
});
