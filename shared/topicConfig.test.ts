import { describe, expect, it } from "vitest";
import { TIMING_TOPICS, TIMING_TOPIC_CONFIG } from "./topicConfig";
import { JUDGMENT_TOPIC_CONFIG } from "./judgmentTopics";
import { FOCUS_GUIDE } from "./guidance";

describe("canonical topic configuration", () => {
  it("keeps judgment and user guidance on the canonical primary house", () => {
    const judgmentNames = { marriage: "relationships" } as const;
    for (const topic of TIMING_TOPICS) {
      const judgment = JUDGMENT_TOPIC_CONFIG[
        topic === "marriage" ? judgmentNames.marriage : topic
      ];
      expect(judgment.house, `${topic} judgment house`).toBe(
        TIMING_TOPIC_CONFIG[topic].house,
      );
      expect(new Set(judgment.secondaryHouses)).toEqual(
        new Set(TIMING_TOPIC_CONFIG[topic].secondaryHouses),
      );
      expect(new Set(judgment.karakas)).toEqual(
        new Set(TIMING_TOPIC_CONFIG[topic].karakas),
      );
      expect(judgment.varga).toBe(TIMING_TOPIC_CONFIG[topic].primaryVarga);
      if (topic in FOCUS_GUIDE) {
        expect(FOCUS_GUIDE[topic as keyof typeof FOCUS_GUIDE].house).toBe(
          TIMING_TOPIC_CONFIG[topic].house,
        );
      }
    }
  });

  it("keeps education intellect as secondary rather than a competing primary", () => {
    expect(TIMING_TOPIC_CONFIG.education.house).toBe(4);
    expect(TIMING_TOPIC_CONFIG.education.secondaryHouses).toContain(5);
  });
});
