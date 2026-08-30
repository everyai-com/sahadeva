# Shared layouts

## `src/main.tsx` — root route/layout switch

```tsx
import { StrictMode, Suspense, lazy, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import ChatApp, { SharedChartView } from "./ChatApp";
const ProApp = lazy(() => import("./App"));
const ReviewStudio = lazy(() => import("./ReviewStudio"));
function Root() {
  const [pro, setPro] = useState(() => window.location.hash === "#pro" || window.location.search.includes("share="));
  useEffect(() => { const onHash = () => setPro(window.location.hash === "#pro" || window.location.search.includes("share=")); window.addEventListener("hashchange", onHash); return () => window.removeEventListener("hashchange", onHash); }, []);
  const sharedToken = new URLSearchParams(window.location.search).get("chart");
  if (sharedToken) return <SharedChartView token={sharedToken} />;
  if (window.location.hash === "#review") return <Suspense fallback={null}><ReviewStudio /></Suspense>;
  return pro ? <Suspense fallback={null}><ProApp /></Suspense> : <ChatApp />;
}
createRoot(document.getElementById("root")!).render(<StrictMode><Root /></StrictMode>);
```

## Primary chat shell

`src/ChatApp.tsx` renders a centered, responsive, single-column chat shell: sticky translucent header; scrollable message stream; contextual chips; optional mode banners; fixed composer; modal/sheet overlays. On desktop it supports normal/wide/full detail-dock modes. The actual render branch begins around line 1530 and remains the source of truth.
