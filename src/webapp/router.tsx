import { useEffect, useState } from "react";

export type Route =
  | "today"
  | "ask"
  | "chart"
  | "more"
  | "onboarding"
  | "dasha"
  | "match"
  | "remedies"
  | "prashna"
  | "privacy"
  | "terms"
  | "support"
  | "not-found";

const ROUTES: Route[] = [
  "today",
  "ask",
  "chart",
  "more",
  "onboarding",
  "dasha",
  "match",
  "remedies",
  "prashna",
  "privacy",
  "terms",
  "support",
];

/** The default landing screen — Ask (అడగండి), framed around the jatakam. */
export const DEFAULT_ROUTE: Route = "ask";

function parse(): Route {
  const pathRoute = window.location.pathname.replace(/^\/+|\/+$/g, "");
  if (pathRoute) return (ROUTES as string[]).includes(pathRoute) ? pathRoute as Route : "not-found";
  const raw = window.location.hash.replace(/^#/, "").split("?")[0].trim();
  return (ROUTES as string[]).includes(raw) ? (raw as Route) : DEFAULT_ROUTE;
}

export function navigate(route: Route) {
  if (window.location.hash !== `#${route}`) {
    window.location.hash = `#${route}`;
  }
  // The main scroll region should reset when a route changes.
  requestAnimationFrame(() => {
    const el = document.querySelector(".phone .screen, .phone .thread");
    if (el) el.scrollTop = 0;
  });
}

/** Current route, kept in sync with the URL hash. */
export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(parse);
  useEffect(() => {
    const onHash = () => setRoute(parse());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return route;
}
