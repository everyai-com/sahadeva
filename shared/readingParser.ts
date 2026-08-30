export type ReadingSection = { id: string; title: string; level: number; body: string };

const COMPLETE_THEMES=[/overview|executive|సారాంశ/i,/identity|temperament|personality|వ్యక్తిత్వ/i,/education|learning|చదువు|విద్య/i,/career|employment|business|work|వృత్తి|ఉద్యోగ|వ్యాపార/i,/money|wealth|resources|ధనం|ఆర్థిక/i,/love|relationship|marriage|partner|సంబంధ|వివాహ/i,/family|home|property|కుటుంబ|ఇల్లు|ఆస్తి/i,/children|mentoring|creativity|పిల్లలు|సృజన/i,/health|routine|resilience|wellbeing|ఆరోగ్య|శ్రేయస్సు/i,/spiritual|meaning|ఆధ్యాత్మిక/i,/yoga|dosha|strength|బలం|యోగ|దోష/i,/dasha|timing|period|దశ|కాలం/i,/uncertainty|limitation|contrary|confidence|పరిమితి|విరుద్ధ|నమ్మక/i,/final synthesis|conclusion|ముగింపు|చివరి సారాంశ/i];
export function auditReadingCompleteness(text:string){const missing=COMPLETE_THEMES.filter(pattern=>!pattern.test(text)).map(pattern=>pattern.source.split("|")[0]);return{complete:text.length>=3500&&missing.length<=2,covered:COMPLETE_THEMES.length-missing.length,total:COMPLETE_THEMES.length,missing};}

const slug = (value: string, index: number) =>
  `${value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 48) || "section"}-${index}`;

export function parseReading(text: string): ReadingSection[] {
  const lines = text.split("\n");
  const sections: ReadingSection[] = [];
  let title = "Overview";
  let level = 2;
  let body: string[] = [];
  const commit = () => {
    const content = body.join("\n").trim();
    if (content || sections.length === 0)
      sections.push({ id: slug(title, sections.length), title: title.replace(/^\d+[.)]\s*/, ""), level, body: content });
    body = [];
  };
  for (const line of lines) {
    const heading = /^(#{1,4})\s+(.+?)\s*$/.exec(line);
    if (!heading) body.push(line);
    else {
      if (body.some((value) => value.trim()) || sections.length) commit();
      title = heading[2];
      level = heading[1].length;
    }
  }
  commit();
  return sections.filter((section, index) => section.body || index > 0 || section.title !== "Overview");
}
