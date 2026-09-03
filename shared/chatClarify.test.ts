import { describe, it, expect } from "vitest";
import { chatNeedsClarification } from "./chatClarify";

const base = { hasPriorAssistantTurn: false, inferredTopic: null };

describe("chatNeedsClarification", () => {
  it("pauses on a vague emotional opening with no domain", () => {
    expect(
      chatNeedsClarification({ ...base, question: "I feel stuck" }),
    ).toBe(true);
    expect(
      chatNeedsClarification({
        ...base,
        question: "help me understand my life",
      }),
    ).toBe(true);
  });

  it("pauses on the Telugu equivalents", () => {
    expect(
      chatNeedsClarification({ ...base, question: "నా జీవితం గురించి చెప్పండి" }),
    ).toBe(true);
  });

  it("answers straight away when a domain is detected", () => {
    expect(
      chatNeedsClarification({
        ...base,
        question: "I feel stuck in my career",
        inferredTopic: "career",
      }),
    ).toBe(false);
  });

  it("answers straight away when a concrete time anchor is present", () => {
    expect(
      chatNeedsClarification({
        ...base,
        question: "Will things improve in the next two years? I feel stuck",
      }),
    ).toBe(false);
    expect(
      chatNeedsClarification({
        ...base,
        question: "When will I feel settled?",
      }),
    ).toBe(false);
  });

  it("never pauses once a conversation is under way", () => {
    expect(
      chatNeedsClarification({
        ...base,
        question: "I feel stuck",
        hasPriorAssistantTurn: true,
      }),
    ).toBe(false);
  });

  it("does not pause on a long, detailed message", () => {
    expect(
      chatNeedsClarification({
        ...base,
        question:
          "I feel stuck because my manager keeps overlooking me for the lead role and I am unsure whether to leave the company",
      }),
    ).toBe(false);
  });

  it("does not pause on an empty question", () => {
    expect(chatNeedsClarification({ ...base, question: "  " })).toBe(false);
  });
});
