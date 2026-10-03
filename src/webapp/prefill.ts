// Hands a suggested question from another screen to the Ask composer.
const KEY = "sahadev.ask.prefill";

export function prefillAsk(question: string) {
  try {
    sessionStorage.setItem(KEY, question);
  } catch {
    /* storage unavailable: Ask simply opens empty */
  }
}

/** Pure read, safe for a state initializer (StrictMode may call it twice). */
export function peekAskPrefill(): string {
  try {
    return sessionStorage.getItem(KEY) || "";
  } catch {
    return "";
  }
}

export function clearAskPrefill() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
