import { describe, expect, it } from "vitest";
import { listWorkedExampleIds, reconstructWorkedExample } from "./workedExample";

describe("worked-example reconstruction", () => {
  it("replays a local fixture but retains the adjudication gate", () => {
    const id = listWorkedExampleIds()[0];
    const result = reconstructWorkedExample(id)!;
    expect(result.comparison.passed).toBe(true);
    expect(result.adjudication.publishableExample).toBe(false);
    expect(result.adjudication.status).toBe("local-regression-unreviewed");
  });
});
