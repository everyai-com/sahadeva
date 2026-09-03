type PostHogClient = typeof import("posthog-js").default;

const projectToken =
  import.meta.env.VITE_POSTHOG_PROJECT_TOKEN ||
  "phc_mvuWiRNDCrSiyQPJMPzd6ZuHNfQz9p4kxwjjpDcHdwuv";
const apiHost = import.meta.env.VITE_POSTHOG_HOST ||
  (typeof window !== "undefined" ? `${window.location.origin}/dawn` : "https://us.i.posthog.com");

const enabled = typeof window !== "undefined" && Boolean(projectToken);
let client: PostHogClient | null = null;
let pendingUserId: string | null = null;
let loading: Promise<PostHogClient | null> | null = null;

function loadClient(): Promise<PostHogClient | null> {
  if (!enabled) return Promise.resolve(null);
  if (client) return Promise.resolve(client);
  if (loading) return loading;
  loading = import("posthog-js")
    .then(({ default: posthog }) => {
      posthog.init(projectToken, {
        api_host: apiHost,
        ui_host: "https://us.posthog.com",
        defaults: "2026-05-30",
        person_profiles: "always",
        autocapture: { dom_event_allowlist: ["click"], element_allowlist: ["button", "a"] },
        capture_pageview: true,
        capture_pageleave: true,
        session_recording: { maskAllInputs: true, maskTextSelector: "*" },
        property_denylist: [
          "email", "name", "question", "prompt", "response", "reading",
          "birth_date", "birth_time", "birth_place",
        ],
      });
      client = posthog;
      if (pendingUserId) posthog.identify(pendingUserId);
      return posthog;
    })
    .catch(() => null);
  return loading;
}

if (enabled)
  window.setTimeout(() => {
    void loadClient();
  }, 0);

export function analyticsCapture(
  event: string,
  properties: Record<string, string | number | boolean | null | undefined> = {},
) {
  void loadClient().then((posthog) => posthog?.capture(event, properties));
}

export function analyticsIdentify(userId: string) {
  if (!userId) return;
  pendingUserId = userId;
  void loadClient().then((posthog) => posthog?.identify(userId));
}

export function analyticsReset() {
  pendingUserId = null;
  void loadClient().then((posthog) => posthog?.reset());
}
