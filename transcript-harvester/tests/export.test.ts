import { describe, expect, it } from "vitest";
import { plainText, safeFilename, timestamp, toMarkdown, toSrt } from "../shared/export";
import type { VideoResult } from "../shared/types";

const video: VideoResult = {
  id: "abc123",
  title: "A useful video",
  url: "https://www.youtube.com/watch?v=abc123",
  position: 1,
  status: "complete",
  segments: [
    { text: "First line", startMs: 1_250, durationMs: 2_000 },
    { text: "Second line", startMs: 3_250, durationMs: 1_500 },
  ],
};

describe("transcript exports", () => {
  it("formats timestamps for links and SRT", () => {
    expect(timestamp(3_661_007)).toBe("01:01:01.007");
    expect(timestamp(3_661_007, true)).toBe("01:01:01,007");
  });

  it("creates plain text and timestamped Markdown", () => {
    expect(plainText(video.segments)).toBe("First line Second line");
    expect(toMarkdown(video)).toContain("[00:00:01](https://www.youtube.com/watch?v=abc123&t=1s) First line");
  });

  it("creates valid SRT cue boundaries", () => {
    expect(toSrt(video)).toContain("00:00:01,250 --> 00:00:03,250");
    expect(toSrt(video)).toContain("2\n00:00:03,250 --> 00:00:04,750");
  });

  it("removes unsafe filename characters", () => {
    expect(safeFilename('a/b:c*?"<>|')).toBe("a-b-c------");
  });
});
