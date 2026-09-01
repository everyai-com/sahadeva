import { useEffect } from "react";
import "./base.css";
import { LangProvider, useLang } from "./lang";
import { DataProvider, useData } from "./data";
import { useRoute, navigate, type Route } from "./router";
import { WelcomeScreen } from "./screens/WelcomeScreen";
import { TodayScreen } from "./screens/TodayScreen";
import { AskScreen } from "./screens/AskScreen";
import { ChartScreen } from "./screens/ChartScreen";
import { MoreScreen } from "./screens/MoreScreen";
import { OnboardingScreen } from "./screens/OnboardingScreen";
import { DashaScreen } from "./screens/DashaScreen";
import { MatchScreen } from "./screens/MatchScreen";
import { RemediesScreen } from "./screens/RemediesScreen";

function Screens() {
  const route = useRoute();
  const { profile, meLoaded } = useData();
  const { chosen } = useLang();

  // No profile yet → force onboarding once we know the account state.
  const needsOnboarding = meLoaded && !profile;
  useEffect(() => {
    if (chosen && needsOnboarding && route !== "onboarding") navigate("onboarding");
  }, [chosen, needsOnboarding, route]);

  // First run: pick a language before anything else.
  if (!chosen) return <WelcomeScreen onChosen={() => navigate(profile ? "ask" : "onboarding")} />;

  if (!meLoaded) return null;

  const effective: Route = needsOnboarding ? "onboarding" : route;

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
      return <DashaScreen />;
    case "match":
      return <MatchScreen />;
    case "remedies":
      return <RemediesScreen />;
    case "today":
    default:
      return <TodayScreen />;
  }
}

function Frame() {
  const { lang } = useLang();
  return (
    <div className="sahadev-web" lang={lang}>
      <div className="phone">
        <div className="island" aria-hidden="true" />
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
