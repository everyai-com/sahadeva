import type { BirthInput } from "./schema";
import type { RectificationRequest } from "./rectification";

export type BtrChatMessage = { role: "user" | "assistant"; content: string };

type PartialEvent = {
  topic: RectificationRequest["events"][number]["topic"];
  label: string;
  year?: number;
  month?: number;
  day?: number;
};

export type BtrChatStep =
  | { active: false }
  | { active: true; response: string; request?: RectificationRequest };

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
  apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7,
  aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10,
  october: 10, nov: 11, november: 11, dec: 12, december: 12,
  జనవరి:1, ఫిబ్రవరి:2, మార్చి:3, ఏప్రిల్:4, మే:5, జూన్:6,
  జూలై:7, ఆగస్టు:8, సెప్టెంబర్:9, అక్టోబర్:10, నవంబర్:11, డిసెంబర్:12,
};

const TOPIC_PATTERNS: Array<[PartialEvent["topic"], RegExp]> = [
  ["career", /job|career|work|promotion|business|joined|resign|layoff/i],
  ["marriage", /marri|wedding|relationship|partner|divorc|engag/i],
  ["education", /school|college|univers|degree|education|exam|graduat/i],
  ["children", /child|baby|son|daughter|pregnan|birth of/i],
  ["property", /house|home|property|land|moved|relocat/i],
  ["wealth", /money|wealth|loan|debt|financial|income/i],
  ["spirituality", /spiritual|initiat|pilgrimage|practice/i],
  ["career", /ఉద్యోగ|వృత్తి|ప్రమోషన్/],
  ["marriage", /పెళ్లి|వివాహ|భాగస్వామి/],
  ["education", /చదువు|విద్య|డిగ్రీ|పరీక్ష/],
  ["children", /పిల్ల|బిడ్డ|కుమార|కుమార్తె/],
  ["property", /ఇల్లు|స్థలం|ఆస్తి|మారాను/],
];

function topicOf(text: string) {
  return TOPIC_PATTERNS.find(([, pattern]) => pattern.test(text))?.[0];
}

function dateParts(text: string): Pick<PartialEvent, "year" | "month" | "day"> {
  const iso = text.match(/\b((?:19|20)\d{2})-(0?[1-9]|1[0-2])-(0?[1-9]|[12]\d|3[01])\b/);
  if (iso) return { year: +iso[1], month: +iso[2], day: +iso[3] };
  const monthName = Object.keys(MONTHS).find((name) => /[^\x00-\x7F]/.test(name) ? text.includes(name) : new RegExp(`\\b${name}\\b`, "i").test(text));
  const year = text.match(/\b((?:19|20)\d{2})\b/);
  const dayBefore = text.match(/\b(0?[1-9]|[12]\d|3[01])(?:st|nd|rd|th)?\s+(?:of\s+)?(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)/i);
  const dayAfter = text.match(/(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(0?[1-9]|[12]\d|3[01])(?:st|nd|rd|th)?/i);
  const standaloneDay = text.match(/(?:around|about|on|the)?\s*\b(0?[1-9]|[12]\d|3[01])(?:st|nd|rd|th)\b/i);
  return {
    year: year ? +year[1] : undefined,
    month: monthName ? MONTHS[monthName] : undefined,
    day: dayBefore ? +dayBefore[1] : dayAfter ? +dayAfter[1] : standaloneDay ? +standaloneDay[1] : undefined,
  };
}

function validDate(event: PartialEvent) {
  if (!event.year || !event.month || !event.day) return false;
  const date = new Date(Date.UTC(event.year, event.month - 1, event.day));
  return date.getUTCFullYear() === event.year && date.getUTCMonth() === event.month - 1 && date.getUTCDate() === event.day;
}

function isoDate(event: PartialEvent) {
  return `${event.year}-${String(event.month).padStart(2, "0")}-${String(event.day).padStart(2, "0")}T00:00:00.000Z`;
}

function clock(total: number) {
  const bounded = Math.max(0, Math.min(1439, total));
  return `${String(Math.floor(bounded / 60)).padStart(2, "0")}:${String(bounded % 60).padStart(2, "0")}`;
}

export function handleBtrChat(messages: BtrChatMessage[], profile: BirthInput): BtrChatStep {
  const start = messages.findIndex((message) => message.role === "user" && (/\b(?:btr|birth[ -]?time rectification|rectify (?:my )?birth time)\b/i.test(message.content)||/జనన సమయ.*సవరణ/.test(message.content)));
  if (start < 0) return { active: false };
  if (messages.slice(start).some((message) => message.role === "assistant" && message.content.startsWith("Birth-time rectification result"))) return { active: false };

  const events: PartialEvent[] = [];
  let pending: PartialEvent | null = null;
  for (const message of messages.slice(start + 1)) {
    if (message.role !== "user") continue;
    const topic = topicOf(message.content);
    const parts = dateParts(message.content);
    if (pending && !topic) {
      const current: PartialEvent = pending;
      pending = {
        topic: current.topic,
        label: current.label,
        year: parts.year ?? current.year,
        month: parts.month ?? current.month,
        day: parts.day ?? current.day,
      };
    } else if (topic) {
      if (pending && validDate(pending)) events.push(pending);
      pending = { topic, label: message.content.slice(0, 120), ...parts };
    } else continue;
    if (pending && validDate(pending)) {
      events.push(pending);
      pending = null;
    }
  }

  if (pending) {
    if (!pending.year) return { active: true, response: `I have the ${pending.topic} event, but I need its year. What year did it happen?` };
    if (!pending.month) return { active: true, response: `I have the year ${pending.year} for the ${pending.topic} event. Which month did it happen?` };
    if (!pending.day) return { active: true, response: `I have ${Object.keys(MONTHS).find((key) => MONTHS[key] === pending!.month && key.length > 3) || pending.month} ${pending.year}. What was the approximate day of the month?` };
    return { active: true, response: "That date is not valid. Please give the event date again, including day, month, and year." };
  }

  if (events.length < 2) return { active: true, response: events.length ? "Got it. Please share one more confirmed life event with its type and date—for example, “started a job on 15 June 2021.”" : "I can do birth-time rectification. First, share a confirmed life event and its date—for example, a job change, marriage, graduation, childbirth, or relocation. Include day, month, and year if you know them; I’ll ask for anything missing." };

  const baseMinutes = +profile.time.slice(0, 2) * 60 + +profile.time.slice(3);
  const radius = Math.max(15, profile.birthTimeAccuracyMinutes || 30);
  const request: RectificationRequest = {
    baseInput: profile,
    earliestTime: clock(baseMinutes - radius),
    latestTime: clock(baseMinutes + radius),
    stepMinutes: 5,
    events: events.slice(0, 10).map((event, index) => ({ id: `chat-event-${index + 1}`, date: isoDate(event), topic: event.topic, importance: 4 })),
    holdoutEventId: `chat-event-${Math.min(events.length, 10)}`,
  };
  return { active: true, response: "", request };
}
