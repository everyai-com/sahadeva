// Golden set for the deterministic tool router. Each row is a realistic user
// question paired with the intent recommend_tools should classify it as. Used
// by toolRouter.test.ts to measure routing accuracy and guard against silent
// regressions as the tool surface grows. Add new rows whenever a real question
// routes wrong — fix the router, then keep the row as a regression anchor.

export interface GoldenCase {
  q: string;
  intent: string;
  note?: string;
}

export const ROUTER_GOLDEN: GoldenCase[] = [
  // relationship-nonmarital
  { q: "Are Ravi and I good business partners?", intent: "relationship-nonmarital" },
  { q: "compatibility with my co-founder before we start the company", intent: "relationship-nonmarital" },
  { q: "will my brother and I get along running the shop?", intent: "relationship-nonmarital" },
  { q: "is my best friend and I compatible", intent: "relationship-nonmarital" },
  { q: "how well do I work with my new manager?", intent: "relationship-nonmarital" },
  { q: "me and my roommate keep fighting, are we compatible", intent: "relationship-nonmarital" },
  { q: "compatibility with my father", intent: "relationship-nonmarital" },
  { q: "parent and child compatibility for me and my daughter", intent: "relationship-nonmarital" },
  { q: "should I take this person as my mentor?", intent: "relationship-nonmarital" },

  // marriage-match
  { q: "Should I marry this girl, check our kundli match", intent: "marriage-match" },
  { q: "gun milan for our horoscopes", intent: "marriage-match" },
  { q: "what is our ashtakoota score", intent: "marriage-match" },
  { q: "horoscope matching for marriage", intent: "marriage-match" },
  { q: "are we compatible as husband and wife", intent: "marriage-match" },
  { q: "porutham between the two charts", intent: "marriage-match" },

  // marriage-timing
  { q: "when will I get married?", intent: "marriage-timing" },
  { q: "at what age will my marriage happen", intent: "marriage-timing" },
  { q: "is there a delay in marriage in my chart", intent: "marriage-timing" },
  { q: "which year is good for my wedding", intent: "marriage-timing" },

  // muhurta
  { q: "best date to start my company next month", intent: "muhurta" },
  { q: "auspicious time to buy a car in October", intent: "muhurta" },
  { q: "good muhurat for griha pravesh", intent: "muhurta" },
  { q: "when should I sign the contract", intent: "muhurta" },
  { q: "shubh time to travel next week", intent: "muhurta" },

  // prashna
  { q: "Will I get the job? yes or no", intent: "prashna" },
  { q: "I lost my ring, where is it", intent: "prashna" },
  { q: "will it happen or not", intent: "prashna" },
  { q: "should I accept this offer", intent: "prashna" },
  { q: "horary question: will I win the case", intent: "prashna" },

  // daily-panchanga
  { q: "what's today's panchang and rahu kaal?", intent: "daily-panchanga" },
  { q: "tell me today's tithi and nakshatra", intent: "daily-panchanga" },
  { q: "choghadiya for today", intent: "daily-panchanga" },
  { q: "is today an auspicious day almanac", intent: "daily-panchanga" },

  // transits-timing
  { q: "what is happening right now with saturn transit?", intent: "transits-timing" },
  { q: "am I in sade sati", intent: "transits-timing" },
  { q: "what's coming in the next few months", intent: "transits-timing" },
  { q: "current period in my life these days", intent: "transits-timing" },

  // dasha
  { q: "what is my current mahadasha", intent: "dasha" },
  { q: "explain my vimshottari dasha timeline", intent: "dasha" },
  { q: "which planet's antardasha am I running", intent: "dasha" },

  // remedies
  { q: "What remedies should I do for my career?", intent: "remedies" },
  { q: "what mantra reduces my saturn dosha", intent: "remedies" },
  { q: "which gemstone should I wear", intent: "remedies" },
  { q: "upay for rahu", intent: "remedies" },

  // dosha
  { q: "Am I manglik?", intent: "dosha" },
  { q: "do I have kaal sarp dosha", intent: "dosha" },
  { q: "is there any dosham in my chart", intent: "dosha" },

  // full-report
  { q: "Tell me everything about my life", intent: "full-report" },
  { q: "give me a complete life reading", intent: "full-report" },
  { q: "I want a full kundli report pdf", intent: "full-report" },

  // chart-image
  { q: "draw my north indian chart", intent: "chart-image" },
  { q: "show me my rasi chart image", intent: "chart-image" },

  // yogas
  { q: "do I have any raj yoga", intent: "yogas" },
  { q: "what special combinations are in my chart", intent: "yogas" },

  // career / wealth (structured)
  { q: "which career field suits me", intent: "career" },
  { q: "will I become rich, what about my finances", intent: "wealth" },

  // rectification
  { q: "I don't know my exact birth time, can you rectify it", intent: "rectification" },

  // general fallback
  { q: "what is the meaning of my life", intent: "general-consultation" },
  { q: "tell me something interesting about myself", intent: "general-consultation" },
  { q: "hello", intent: "general-consultation" },
];
