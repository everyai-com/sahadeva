// Sender for Expo's push service (https://docs.expo.dev/push-notifications).
// Unlike Web Push, Expo tickets carry the payload inline, so the caller passes
// the already-built title and body. No server-held credentials are required;
// the Expo push token itself authorizes delivery to the device.

export type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  sound?: "default" | null;
  data?: Record<string, unknown>;
};

export type ExpoTicket = {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
};

const ENDPOINT = "https://exp.host/--/api/v2/push/send";

export function isExpoPushToken(token: string): boolean {
  return /^ExponentPushToken\[[^\]]+\]$/.test(token) || /^ExpoPushToken\[[^\]]+\]$/.test(token);
}

// Sends a batch (Expo accepts up to 100 messages per request) and returns one
// ticket per message, in order. A network failure surfaces as all-error tickets
// so the caller can decide whether to retry or drop.
export async function sendExpoPush(
  messages: ExpoPushMessage[],
  accessToken?: string,
): Promise<ExpoTicket[]> {
  if (messages.length === 0) return [];
  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(messages),
    });
    if (!response.ok) {
      return messages.map(() => ({ status: "error", message: `HTTP ${response.status}` }));
    }
    const payload = (await response.json()) as { data?: ExpoTicket[] };
    return payload.data ?? messages.map(() => ({ status: "error", message: "No ticket returned" }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "network error";
    return messages.map(() => ({ status: "error", message }));
  }
}
