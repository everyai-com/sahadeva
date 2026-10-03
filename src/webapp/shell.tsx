import type { ReactNode } from "react";
import { useLang } from "./lang";
import { navigate, type Route } from "./router";

/**
 * Top safe-area spacer. The real device draws its own clock and battery, so
 * this only keeps content clear of the notch / status bar (see base.css).
 */
export function StatusBar() {
  return <div className="statusbar" aria-hidden="true" />;
}

const TAB_ICONS: Record<string, ReactNode> = {
  today: (
    <svg viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" />
    </svg>
  ),
  ask: (
    <svg viewBox="0 0 24 24">
      <path d="M4 5h16v11H9l-5 4V5Z" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24">
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
      <path d="M14.5 13.2a2.6 2.6 0 1 0 0 4.6 3 3 0 0 1 0-4.6Z" />
    </svg>
  ),
  chart: (
    <svg viewBox="0 0 24 24">
      <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />
    </svg>
  ),
  more: (
    <svg viewBox="0 0 24 24">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  ),
};

/** Bottom tab bar. `current` marks which of the four tabs is active. */
export function TabBar({ current }: { current: "today" | "ask" | "calendar" | "chart" | "more" }) {
  const { t } = useLang();
  const tabs: Array<{ id: "today" | "ask" | "calendar" | "chart" | "more"; route: Route; label: string }> = [
    { id: "today", route: "today", label: t("Today", "ఈ రోజు") },
    { id: "ask", route: "ask", label: t("Ask", "అడగండి") },
    { id: "calendar", route: "calendar", label: t("Panchangam", "పంచాంగం") },
    { id: "chart", route: "chart", label: t("Chart", "జాతకం") },
    { id: "more", route: "more", label: t("More", "మరిన్ని") },
  ];
  return (
    <nav className="tabbar" data-od-id="tabbar" aria-label={t("Main", "ప్రధాన మెను")}>
      <span className="railbrand" aria-hidden="true" />
      {tabs.map((tab) => (
        <a
          key={tab.id}
          className="tab"
          href={`#${tab.route}`}
          aria-current={current === tab.id ? "page" : undefined}
          onClick={(e) => {
            e.preventDefault();
            navigate(tab.route);
          }}
        >
          {TAB_ICONS[tab.id]}
          <span>{tab.label}</span>
        </a>
      ))}
    </nav>
  );
}

/** Back button used by the pushed screens (chart/dasha/match/remedies). */
export function BackButton({ to = "more" as Route }: { to?: Route }) {
  return (
    <div className="topbar" data-od-id="topbar">
      <a
        className="backbtn"
        href={`#${to}`}
        aria-label="Back"
        onClick={(e) => {
          e.preventDefault();
          navigate(to);
        }}
      >
        <svg viewBox="0 0 24 24">
          <path d="M15 5l-7 7 7 7" />
        </svg>
      </a>
    </div>
  );
}
