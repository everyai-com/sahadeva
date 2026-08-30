import { describe, expect, it } from "vitest";
import { auditReadingCompleteness, parseReading } from "./readingParser";

describe("parseReading", () => {
  it("preserves introductory copy and turns markdown headings into sections", () => {
    const sections = parseReading("A direct answer first.\n\n## 1. Identity\nSteady and observant.\n\n### Timing\n**Saturn** needs patience.");
    expect(sections.map((section) => section.title)).toEqual(["Overview", "Identity", "Timing"]);
    expect(sections[0].body).toBe("A direct answer first.");
    expect(sections[2].body).toContain("**Saturn**");
  });

  it("keeps a heading-free long answer as one readable overview", () => {
    expect(parseReading("One continuous reading paragraph.")).toMatchObject([
      { title: "Overview", body: "One continuous reading paragraph." },
    ]);
  });

  it("creates stable, unique anchors for repeated headings", () => {
    const sections = parseReading("## Career\nFirst.\n## Career\nSecond.");
    expect(sections[0].id).not.toBe(sections[1].id);
  });

  it("detects an incomplete full-profile draft before it reaches the reader",()=>{
    expect(auditReadingCompleteness("## Career\nA short career answer.")).toMatchObject({complete:false,total:14});
  });

  it("accepts a sufficiently detailed dossier with every required theme",()=>{
    const headings=["Executive overview","Identity and temperament","Education and learning","Career employment and business","Money wealth and resources","Love relationship marriage and partner","Family home and property","Children mentoring and creativity","Health routine resilience and wellbeing","Spiritual meaning","Strength yoga and dosha","Current dasha timing period","Contrary evidence uncertainty limitation and confidence","Final synthesis conclusion"];
    const reading=headings.map(title=>`## ${title}\n${"Grounded chart interpretation with supporting evidence and practical context. ".repeat(5)}`).join("\n\n");
    expect(auditReadingCompleteness(reading)).toMatchObject({complete:true,covered:14,total:14,missing:[]});
  });
});
