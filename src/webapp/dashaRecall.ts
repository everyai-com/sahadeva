import type { Profile } from "./api";

const PREFIX = "sahadeva.dasha-recall.v2";

export type DashaRecall = {
  lord: string;
  startIso: string;
  endIso: string;
  text: string;
};

function profileKey(profile: Profile): string {
  return `${PREFIX}:${profile.date}:${profile.time}:${profile.latitude.toFixed(3)}:${profile.longitude.toFixed(3)}`;
}

export function getDashaRecalls(profile: Profile): DashaRecall[] {
  try {
    const value = JSON.parse(localStorage.getItem(profileKey(profile)) || "[]");
    return Array.isArray(value) ? value.filter((item) => item && typeof item.text === "string") : [];
  } catch {
    return [];
  }
}

export function saveDashaRecall(profile: Profile, recall: DashaRecall): void {
  const recalls = getDashaRecalls(profile);
  const id = `${recall.lord}:${recall.startIso}`;
  const next = recall.text.trim()
    ? [recall, ...recalls.filter((item) => `${item.lord}:${item.startIso}` !== id)].slice(0, 20)
    : recalls.filter((item) => `${item.lord}:${item.startIso}` !== id);
  try {
    localStorage.setItem(profileKey(profile), JSON.stringify(next));
  } catch {
    /* The form remains usable when browser storage is unavailable. */
  }
}

export function dashaRecallContext(profile: Profile | null): string {
  if (!profile) return "";
  const facts = getDashaRecalls(profile)
    .filter((item) => item.text.trim())
    .slice(0, 8)
    .map((item) => `User-reported life history during ${item.lord} period (${item.startIso.slice(0, 10)} to ${item.endIso.slice(0, 10)}): ${item.text.replace(/\s+/g, " ").trim()}`);
  return facts.length ? `Reported by the user in Life periods:\n${facts.join("\n")}` : "";
}
