import { StrictMode, Suspense, lazy, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import WebApp from "./webapp/WebApp";

const ProApp = lazy(() => import("./App"));
const LegacyChatApp = lazy(() => import("./ChatApp"));
const ReviewStudio = lazy(() => import("./ReviewStudio"));
// Only needed for ?chart= share links — kept out of the default bundle.
const SharedChartView = lazy(() =>
  import("./ChatApp").then((m) => ({ default: m.SharedChartView })),
);

/** Which top-level experience the current URL selects. */
function surfaceFor(): "pro" | "review" | "legacy" | "web" {
  const hash = window.location.hash;
  if (hash === "#pro" || window.location.search.includes("share=")) return "pro";
  if (hash === "#review") return "review";
  if (hash === "#chat") return "legacy"; // the previous default chat UI, kept reachable
  return "web";
}

function Root() {
  const [surface, setSurface] = useState(surfaceFor);
  useEffect(() => {
    const onHash = () => setSurface(surfaceFor());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const sharedToken = new URLSearchParams(window.location.search).get("chart");
  if (sharedToken) return <Suspense fallback={null}><SharedChartView token={sharedToken} /></Suspense>;
  if (surface === "review") return <Suspense fallback={null}><ReviewStudio /></Suspense>;
  if (surface === "pro") return <Suspense fallback={null}><ProApp /></Suspense>;
  if (surface === "legacy") return <Suspense fallback={null}><LegacyChatApp /></Suspense>;
  return <WebApp />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
