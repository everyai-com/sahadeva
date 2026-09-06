import { recommendTools } from "./toolRouter";

export type IntentCoveragePoint = { intent: string; text: string; position: number };

export function classifyResponseCoverage(response: string): IntentCoveragePoint[] {
  const points: string[] = [];
  let heading = "";
  let paragraph: string[] = [];
  const push = (body: string) => {
    const text = `${heading}${heading ? "\n" : ""}${body}`.trim();
    if (text.length >= 2) points.push(text.slice(0, 4000));
    heading = "";
  };
  const flush = () => {
    if (paragraph.length) push(paragraph.join("\n"));
    paragraph = [];
  };
  for (const line of response.split("\n")) {
    const trimmed = line.trim();
    if (/^#{1,6}\s+/.test(trimmed)) {
      flush();
      heading = trimmed;
    } else if (/^(?:[-*+]\s+|\d+[.)]\s+)/.test(trimmed)) {
      flush();
      push(trimmed);
    } else if (!trimmed) flush();
    else paragraph.push(line);
  }
  flush();
  if (heading) push(heading);
  return points.slice(0, 40).map((text, position) => ({
    text,
    position,
    intent: recommendTools(text).intent,
  }));
}
