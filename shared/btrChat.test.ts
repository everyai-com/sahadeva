import { describe, expect, it } from "vitest";
import { handleBtrChat } from "./btrChat";

const profile = { name:"Test", date:"1990-01-01", time:"12:00", place:"Hyderabad", latitude:17.385, longitude:78.4867, timezone:"Asia/Kolkata", timezoneOffset:5.5, language:"en", methodology:"parashari", focus:"career", birthTimeAccuracyMinutes:30, houseSystem:"whole-sign" } as const;

describe("conversational BTR", () => {
  it("asks for a missing year without inventing it", () => {
    const step = handleBtrChat([{role:"user",content:"do BTR"},{role:"assistant",content:"Share an event"},{role:"user",content:"I changed jobs in June"}], profile);
    expect(step.active && step.response).toContain("year");
  });
  it("combines follow-up date parts and requests the next event", () => {
    const step = handleBtrChat([{role:"user",content:"birth time rectification"},{role:"user",content:"I changed jobs in June"},{role:"assistant",content:"Which year?"},{role:"user",content:"2021"},{role:"assistant",content:"Which day?"},{role:"user",content:"around 15th"}], profile);
    expect(step.active && step.response).toContain("one more confirmed life event");
  });
  it("builds a deterministic request only after two complete events", () => {
    const step = handleBtrChat([{role:"user",content:"BTR"},{role:"user",content:"job started 15 June 2021"},{role:"user",content:"married 3 February 2023"}], profile);
    expect(step.active && step.request?.events.map(event=>event.date)).toEqual(["2021-06-15T00:00:00.000Z","2023-02-03T00:00:00.000Z"]);
  });
});
