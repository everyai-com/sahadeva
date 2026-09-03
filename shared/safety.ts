export const PROHIBITED_INFERENCES = [
  "criminal conduct",
  "arrest or imprisonment",
  "court outcome",
  "medical diagnosis",
  "death or lifespan",
  "fertility or pregnancy outcome",
  "financial return",
  "relationship success or failure",
  "violence or abuse",
  "guaranteed event",
] as const;

export const SENSITIVE_TOPIC_POLICY = {
  schemaVersion: "sahadeva-sensitive-topic-policy-1",
  principle:
    "Sensitive topics remain answerable. Restrict unsupported verdicts, diagnoses, guarantees and accusations—not the topic itself.",
  allowed: [
    "reflective traditional interpretations clearly framed as possibilities",
    "uncertainty-aware planning suggestions and practical questions",
    "optional low-risk actions that leave the decision with the user",
    "encouragement to seek qualified medical, legal, financial, relationship or safety support when relevant",
  ],
  prohibited: [...PROHIBITED_INFERENCES],
  narrationRules: [
    "Use may, might, could, suggests or consider; never convert chart evidence into a factual outcome.",
    "State the relevant uncertainty without repeatedly disclaiming or refusing the whole subject.",
    "Do not diagnose, accuse, guarantee, threaten, prescribe professional action or decide for the user.",
    "Give practical steps that are useful even if the astrological interpretation is wrong.",
    "For immediate danger or urgent health concerns, prioritize real-world emergency or professional support.",
  ],
  decisionVocabulary: {
    publish: "Supported non-sensitive interpretation may be narrated with its evidence and limits.",
    caution: "Narrate only as a possibility and provide practical, optional suggestions.",
    abstain: "Do not state the proposed claim; replace it with a bounded reflection or practical suggestion when possible.",
  },
} as const;
