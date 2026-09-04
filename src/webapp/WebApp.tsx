import { lazy, Suspense, useEffect, type ReactNode } from "react";
import "./base.css";
import { LangProvider, useLang } from "./lang";
import { DataProvider, useData } from "./data";
import { useRoute, navigate, type Route } from "./router";
import { setOnboardingMode } from "./onboardingMode";
import { WelcomeScreen } from "./screens/WelcomeScreen";
import { TodayScreen } from "./screens/TodayScreen";
import { AskScreen } from "./screens/AskScreen";
import { ChartScreen } from "./screens/ChartScreen";
import { MoreScreen } from "./screens/MoreScreen";
import { OnboardingScreen } from "./screens/OnboardingScreen";
const DashaScreen = lazy(() => import("./screens/DashaScreen").then((module) => ({ default: module.DashaScreen })));
const MatchScreen = lazy(() => import("./screens/MatchScreen").then((module) => ({ default: module.MatchScreen })));
const RemediesScreen = lazy(() => import("./screens/RemediesScreen").then((module) => ({ default: module.RemediesScreen })));
const LegalScreens = lazy(() => import("./screens/LegalScreen"));

function Deferred({ children }: { children: ReactNode }) {
  return <Suspense fallback={<main className="screen route-loading" aria-label="Loading"><span /></main>}>{children}</Suspense>;
}

function Screens() {
  const route = useRoute();
  const { profile, meLoaded } = useData();
  const { chosen } = useLang();

  // No profile yet → force onboarding once we know the account state.
  const needsOnboarding = meLoaded && !profile;
  useEffect(() => {
    if (chosen && needsOnboarding && !["onboarding", "privacy", "terms", "not-found"].includes(route)) {
      setOnboardingMode("new");
      navigate("onboarding");
    }
  }, [chosen, needsOnboarding, route]);

  // Legal and not-found pages must be reachable before onboarding or language selection.
  if (route === "privacy") return <Deferred><LegalScreens kind="privacy" /></Deferred>;
  if (route === "terms") return <Deferred><LegalScreens kind="terms" /></Deferred>;
  if (route === "not-found") return <Deferred><LegalScreens notFound /></Deferred>;

  // First run: pick a language before anything else.
  if (!chosen) return <WelcomeScreen onChosen={() => navigate(profile ? "ask" : "onboarding")} />;

  if (!meLoaded) return null;

  const effective: Route = needsOnboarding && !["privacy", "terms", "not-found"].includes(route) ? "onboarding" : route;

  switch (effective) {
    case "onboarding":
      return <OnboardingScreen />;
    case "ask":
      return <AskScreen />;
    case "chart":
      return <ChartScreen />;
    case "more":
      return <MoreScreen />;
    case "dasha":
      return <Deferred><DashaScreen /></Deferred>;
    case "match":
      return <Deferred><MatchScreen /></Deferred>;
    case "remedies":
      return <Deferred><RemediesScreen /></Deferred>;
    case "today":
    default:
      return <TodayScreen />;
  }
}

function Frame() {
  const { lang } = useLang();
  return (
    <div className="sahadev-web" lang={lang}>
      <a className="skip-link" href="#content">Skip to content</a>
      <div className="phone">
        <Screens />
      </div>
    </div>
  );
}

export default function WebApp() {
  return (
    <LangProvider>
      <DataProvider>
        <Frame />
      </DataProvider>
    </LangProvider>
  );
}
