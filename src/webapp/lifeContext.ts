/** What the person told Sahadeva about their life (job, family, current concern).
 *  Stored locally, sent with every question so guidance is concrete. */
const KEY = "sahadev.webchat.context";
export const LIFE_CONTEXT_MAX = 600;

export function getLifeContext(): string {
  try {
    return (localStorage.getItem(KEY) || "").slice(0, LIFE_CONTEXT_MAX);
  } catch {
    return "";
  }
}
export function setLifeContext(text: string) {
  try {
    const clean = text.replace(/\s+/g, " ").trim().slice(0, LIFE_CONTEXT_MAX);
    if (clean) localStorage.setItem(KEY, clean);
    else localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
