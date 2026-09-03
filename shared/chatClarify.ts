// Adaptive-consulting gate: decide whether Sahadeva should ask ONE sharp
// clarifying question before delivering a full reading, the way a real
// astrologer listens before interpreting. Kept deliberately conservative —
// a question that already names a domain or a concrete anchor is answered
// straight away; only a vague or purely emotional opening earns a pause.

// Emotional / open-ended signals with no answerable domain of their own.
const VAGUE_OR_EMOTIONAL =
  /\b(feel|feeling|stuck|lost|confused|unhappy|not happy|unhappy|depress\w*|anxious|worried|worry|overwhelm\w*|struggl\w*|hopeless|directionless|help me|guide me|tell me about (my|me)|about my life|about myself|my life|my future|what should i do|what do i do|where (am|is) my life|nothing (is )?work\w*|everything is|no idea)\b/i;

// Telugu equivalents (emotion / broad life / "what should I do" / "help me").
const VAGUE_OR_EMOTIONAL_TE =
  /(బాధ|కష్ట|దిక్కుతోచ|ఆందోళన|కంగారు|జీవితం గురించి|నా గురించి|నా జీవితం|ఏం చేయాలి|ఏమి చేయాలి|సాయం|దారి తెలియడం లేదు|భవిష్యత్తు గురించి)/;

// A concrete anchor (a year, an age, an explicit yes/no target) means the
// person has already given us enough to read — do not pause on these.
const HAS_CONCRETE_ANCHOR =
  /\b(19|20)\d{2}\b|\bnext (year|month|two years|few years)\b|\bwhen\b|\bwhich (year|month|age)\b|\bhow (long|many)\b/i;

export function chatNeedsClarification(input: {
  question: string;
  hasPriorAssistantTurn: boolean;
  inferredTopic: string | null;
}): boolean {
  const question = input.question.trim();
  if (!question) return false;
  // Only ever pause on the opening substantive turn. Once a conversation is
  // under way (including right after our own clarifying question), answer.
  if (input.hasPriorAssistantTurn) return false;
  // A clear domain was detected, or the user selected a focus — read it.
  if (input.inferredTopic) return false;
  // A concrete time/target anchor means it is answerable as asked.
  if (HAS_CONCRETE_ANCHOR.test(question)) return false;
  const words = question.split(/\s+/).filter(Boolean).length;
  if (words > 14) return false; // a long, detailed message is not a vague one
  return (
    VAGUE_OR_EMOTIONAL.test(question) || VAGUE_OR_EMOTIONAL_TE.test(question)
  );
}
