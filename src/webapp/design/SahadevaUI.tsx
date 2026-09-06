import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

export function Button({ tone = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "primary" | "secondary" | "quiet" }) {
  return <button className={`sd-button sd-button--${tone} ${className}`.trim()} {...props} />;
}

export function EntityChip({ icon, name, meaning }: { icon?: ReactNode; name: string; meaning?: string }) {
  return <span className="sd-chip">{icon}<span><b>{name}</b>{meaning && <small>{meaning}</small>}</span></span>;
}

export function ConfidenceBadge({ level, children }: { level: "calculated" | "classical" | "synthesis" | "variant"; children?: ReactNode }) {
  const labels = { calculated: "Calculated", classical: "Classical interpretation", synthesis: "AI synthesis", variant: "Tradition / variant" };
  return <span className={`sd-confidence sd-confidence--${level}`}><i aria-hidden="true" />{children || labels[level]}</span>;
}

export function ExplanationCard({ what, why, action, technical }: { what: ReactNode; why: ReactNode; action?: ReactNode; technical?: ReactNode }) {
  return (
    <article className="sd-explanation">
      <p className="sd-kicker">What this means</p><div className="sd-what">{what}</div>
      <div className="sd-why"><b>Why</b>{why}</div>
      {action && <div className="sd-action"><b>What may help</b>{action}</div>}
      {technical && <details><summary>See the astrology</summary><div>{technical}</div></details>}
    </article>
  );
}

export function StatePanel({ state, title, children, action }: { state: "loading" | "empty" | "offline" | "error" | "uncertain" | "permission" | "partial"; title: string; children: ReactNode; action?: ReactNode }) {
  return <section className={`sd-state sd-state--${state}`} role={state === "error" ? "alert" : "status"}><StateGlyph state={state}/><div><h3>{title}</h3><div>{children}</div>{action && <footer>{action}</footer>}</div></section>;
}

function StateGlyph({ state }: { state: string }) {
  const paths: Record<string,string> = {
    loading:"M12 3a9 9 0 0 1 9 9M12 21a9 9 0 0 1-9-9", empty:"M4 8h16v11H4zM8 8l2-3h4l2 3", offline:"M4 8c4-4 12-4 16 0M7 12c3-3 7-3 10 0M10 16c1-1 3-1 4 0M4 4l16 16", error:"M12 3 21 20H3L12 3ZM12 8v6M12 17v.1", uncertain:"M12 3v9l5 3M12 21a9 9 0 1 0 0-18", permission:"M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5z", partial:"M4 4h10l6 6v10H4zM14 4v6h6M8 15h8"
  };
  return <svg className="sd-state__glyph" viewBox="0 0 24 24" aria-hidden="true"><path d={paths[state]} /></svg>;
}

export function Timeline({ children, label, ...props }: HTMLAttributes<HTMLDivElement> & { label: string }) {
  return <div className="sd-timeline" role="img" aria-label={label} {...props}>{children}</div>;
}

export function TimelineSegment({ width, state = "future", children }: { width: number; state?: "past" | "current" | "future"; children: ReactNode }) {
  return <span className={`sd-timeline__segment is-${state}`} style={{ flexGrow: width }}>{children}</span>;
}
