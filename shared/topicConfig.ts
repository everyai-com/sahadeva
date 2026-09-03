import type { GrahaName } from "./schema";

export const TIMING_TOPICS = [
  "career",
  "marriage",
  "wealth",
  "education",
  "children",
  "property",
  "spirituality",
] as const;

export type TimingTopic = (typeof TIMING_TOPICS)[number];

export type TimingTopicConfig = {
  house: number;
  secondaryHouses: readonly number[];
  karakas: readonly GrahaName[];
  primaryVarga: string;
  vargas: readonly string[];
  label: string;
};

/**
 * Canonical domain anatomy shared by judgment, Varga, timing, MCP and chat.
 * Education uses the 4th as its primary formal-learning house, with the 5th
 * retained explicitly for intellect. Changing a convention belongs here and
 * must update the registry regression test rather than drifting per feature.
 */
export const TIMING_TOPIC_CONFIG: Record<TimingTopic, TimingTopicConfig> = {
  career: { house: 10, secondaryHouses: [2, 6, 11], karakas: ["Saturn", "Sun", "Mercury"], primaryVarga: "D10", vargas: ["D1", "D10"], label: "career and work" },
  marriage: { house: 7, secondaryHouses: [2, 8, 11], karakas: ["Venus", "Jupiter"], primaryVarga: "D9", vargas: ["D1", "D9"], label: "marriage and partnership" },
  wealth: { house: 2, secondaryHouses: [5, 9, 11], karakas: ["Jupiter", "Venus", "Mercury"], primaryVarga: "D2", vargas: ["D1", "D2", "D9"], label: "money and resources" },
  education: { house: 4, secondaryHouses: [2, 5, 9], karakas: ["Mercury", "Jupiter"], primaryVarga: "D24", vargas: ["D1", "D24"], label: "education and learning" },
  children: { house: 5, secondaryHouses: [2, 9, 11], karakas: ["Jupiter"], primaryVarga: "D7", vargas: ["D1", "D7"], label: "children and creativity" },
  property: { house: 4, secondaryHouses: [2, 11, 12], karakas: ["Mars", "Venus"], primaryVarga: "D4", vargas: ["D1", "D4"], label: "home, property and vehicles" },
  spirituality: { house: 9, secondaryHouses: [5, 8, 12], karakas: ["Jupiter", "Ketu"], primaryVarga: "D20", vargas: ["D1", "D20"], label: "meaning and spiritual practice" },
};

export const SIGN_LORDS: readonly GrahaName[] = [
  "Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury",
  "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter",
];
