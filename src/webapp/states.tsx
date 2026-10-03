import { useLang } from "./lang";

export type ErrorKind = "rate" | "offline" | "input" | "server";

/** Classify an error raised by the api.ts fetch helpers ("<status>: <message>"). */
export function errorKind(error: unknown): ErrorKind {
  const text = String(error instanceof Error ? error.message : (error ?? ""));
  if (typeof navigator !== "undefined" && navigator.onLine === false) return "offline";
  if (/^429\b|rate limit/i.test(text)) return "rate";
  if (/failed to fetch|networkerror|load failed/i.test(text)) return "offline";
  if (/^4\d\d\b/.test(text)) return "input";
  return "server";
}

/** The human part of an api.ts error, without the status prefix. */
export function errorText(error: unknown): string {
  return String(error instanceof Error ? error.message : (error ?? "")).replace(/^\d{3}:\s*/, "");
}

/**
 * One consistent failure state: says what failed, why in plain words, and
 * offers a retry — instead of a dead-end sentence.
 */
export function ErrorNote({ what, error, onRetry }: { what: string; error?: unknown; onRetry?: () => void }) {
  const { t } = useLang();
  const kind = errorKind(error);
  const why =
    kind === "rate"
      ? t("Too many requests in the last minute. Wait a moment and try again.", "నిమిషంలో చాలా అభ్యర్థనలు వచ్చాయి. కొంచెం ఆగి మళ్ళీ ప్రయత్నించండి.")
      : kind === "offline"
        ? t("You seem to be offline. Check your connection and try again.", "ఇంటర్నెట్ కనెక్షన్ లేనట్టుంది. చూసి మళ్ళీ ప్రయత్నించండి.")
        : kind === "input"
          ? t("Some birth details look incomplete. Check them in More → Edit birth details.", "కొన్ని జనన వివరాలు అసంపూర్ణంగా ఉన్నాయి. More → జనన వివరాలు మార్చండి లో చూడండి.")
          : t("Something went wrong on our side. Try again.", "మా వైపు ఏదో పొరపాటు జరిగింది. మళ్ళీ ప్రయత్నించండి.");
  return (
    <div className="statenote" role="alert">
      <p className="statewhat">{what}</p>
      <p className="statewhy">{why}</p>
      {onRetry && (
        <button className="stateretry" type="button" onClick={onRetry}>
          {t("Try again", "మళ్ళీ ప్రయత్నించండి")}
        </button>
      )}
    </div>
  );
}
