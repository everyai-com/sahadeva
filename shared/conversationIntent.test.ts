import { describe, expect, it } from "vitest";
import { classifyResponseCoverage } from "./conversationIntent";

describe("conversation intent coverage", () => {
  it("classifies each addressed response point into finite routing intents", () => {
    const points = classifyResponseCoverage("## Career\nYour career field suits analytical work.\n\n- Your marriage timing needs a separate review.");
    expect(points).toHaveLength(2);
    expect(points.map((point) => point.intent)).toEqual(["career", "marriage-timing"]);
    expect(points.every((point, index) => point.position === index)).toBe(true);
  });
});
