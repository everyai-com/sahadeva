import type { EverydayReading } from "./everydayReading";
import type { JudgmentEvidence, TopicJudgment } from "./judgment";
import { TELUGU_GRAHAS } from "./telugu";

/**
 * A code-composed answer built only from the already-calculated evidence
 * packet. Used when no language model is reachable (provider outage or the
 * Workers AI daily allowance is spent) so the assistant degrades to a plainer
 * answer instead of a dead end. It never adds a claim that is not in the
 * supplied reading, judgment or timing.
 */
export type EvidenceAnswerInput = {
  language: "en" | "te";
  reading: EverydayReading;
  focusedJudgment?: Pick<TopicJudgment, "title" | "conclusion" | "supportingEvidence" | "opposingEvidence"> | null;
  currentTiming?: { mahadasha?: string | null; antardasha?: string | null } | null;
};

const MAX_EVIDENCE = 2;

function bullet(evidence: JudgmentEvidence): string {
  return `- **${evidence.label}** — ${evidence.detail}`;
}

export function composeEvidenceAnswer({ language, reading, focusedJudgment, currentTiming }: EvidenceAnswerInput): string {
  const te = language === "te";
  const lines: string[] = [];
  // Topic judgments are authored in English; Telugu answers use the localized reading.
  const judgment = te ? null : focusedJudgment;

  lines.push(judgment?.conclusion || reading.dailyLife.summary);

  const actions = reading.dailyLife.items.slice(0, 3);
  if (actions.length) {
    lines.push("", te ? "### ఆచరణలో తదుపరి అడుగులు" : "### Practical next steps");
    for (const item of actions) lines.push(`- **${item.title}** — ${item.message}`);
  }

  if (judgment) {
    const support = judgment.supportingEvidence.slice(0, MAX_EVIDENCE);
    const oppose = judgment.opposingEvidence.slice(0, MAX_EVIDENCE);
    if (support.length || oppose.length) {
      lines.push("", `### Why Sahadeva says this — ${judgment.title}`);
      if (support.length) lines.push("What supports it:", ...support.map(bullet));
      if (oppose.length) lines.push("What works against it:", ...oppose.map(bullet));
    }
  }

  const period = [currentTiming?.mahadasha, currentTiming?.antardasha]
    .filter((lord): lord is string => Boolean(lord))
    .map((lord) => (te ? TELUGU_GRAHAS[lord] || lord : lord))
    .join(" / ");
  if (period) {
    lines.push(
      "",
      te
        ? `ప్రస్తుతం నడుస్తున్న దశ: **${period}**.`
        : `Running now in your chart: the **${period}** period.`,
    );
  }

  lines.push(
    "",
    te
      ? "*ఈ సమాధానం లెక్కించిన మీ జాతక ఆధారాల నుండి నేరుగా తయారైంది — AI సహాయకుడు ప్రస్తుతం అందుబాటులో లేడు. కొద్దిసేపటి తర్వాత మళ్ళీ అడిగితే మరింత వివరమైన సంభాషణ దొరుకుతుంది.*"
      : "*This answer was composed directly from your calculated chart evidence — the conversational assistant is unavailable right now. Ask again a little later for a fuller, conversational reading.*",
  );
  return lines.join("\n");
}
