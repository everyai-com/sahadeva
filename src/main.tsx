import { StrictMode, Suspense, lazy, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import ChatApp from "./ChatApp";

const ProApp = lazy(() => import("./App"));

function Root() {
  const [pro, setPro] = useState(
    () => window.location.hash === "#pro" || window.location.search.includes("share="),
  );
  useEffect(() => {
    const onHash = () =>
      setPro(
        window.location.hash === "#pro" ||
          window.location.search.includes("share="),
      );
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return pro ? (
    <Suspense fallback={null}>
      <ProApp />
    </Suspense>
  ) : (
    <ChatApp />
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
