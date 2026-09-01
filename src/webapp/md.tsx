import type { ReactNode } from "react";

/**
 * Minimal, dependency-free Markdown renderer for the assistant's replies.
 * Handles: #/##/### headings, - / * bullet lists, 1. numbered lists,
 * **bold**, *italic*, and paragraphs. Everything else is plain text.
 * The assistant's output is trusted model text, but we still render as
 * React elements (no dangerouslySetInnerHTML) so raw HTML can't inject.
 */
export function Markdown({ text }: { text: string }) {
  return <>{renderBlocks(text)}</>;
}

function renderBlocks(text: string): ReactNode[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const out: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let para: string[] = [];
  let key = 0;

  const flushPara = () => {
    if (para.length) {
      out.push(
        <p className="mdp" key={key++}>
          {renderInline(para.join(" "))}
        </p>,
      );
      para = [];
    }
  };
  const flushList = () => {
    if (list) {
      const items = list.items.map((it, i) => <li key={i}>{renderInline(it)}</li>);
      out.push(
        list.ordered ? (
          <ol className="mdlist" key={key++}>
            {items}
          </ol>
        ) : (
          <ul className="mdlist" key={key++}>
            {items}
          </ul>
        ),
      );
      list = null;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      flushPara();
      flushList();
      continue;
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      flushPara();
      flushList();
      const level = Math.min(heading[1].length, 3);
      const Tag = (level <= 1 ? "h3" : level === 2 ? "h4" : "h4") as "h3" | "h4";
      out.push(
        <Tag className="mdh" key={key++}>
          {renderInline(heading[2])}
        </Tag>,
      );
      continue;
    }
    const bullet = /^[-*•]\s+(.*)$/.exec(line);
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      flushPara();
      const ordered = !!numbered;
      if (!list || list.ordered !== ordered) {
        flushList();
        list = { ordered, items: [] };
      }
      list.items.push((bullet ? bullet[1] : numbered![1]).trim());
      continue;
    }
    flushList();
    para.push(line.trim());
  }
  flushPara();
  flushList();
  return out;
}

/** Inline **bold** and *italic*. */
function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  // Split on **bold** first, then *italic* inside plain runs.
  const boldParts = text.split(/(\*\*[^*]+\*\*)/g);
  boldParts.forEach((part, i) => {
    const b = /^\*\*([^*]+)\*\*$/.exec(part);
    if (b) {
      nodes.push(<strong key={`b${i}`}>{b[1]}</strong>);
      return;
    }
    const italicParts = part.split(/(\*[^*]+\*)/g);
    italicParts.forEach((ip, j) => {
      const it = /^\*([^*]+)\*$/.exec(ip);
      if (it) nodes.push(<em key={`i${i}-${j}`}>{it[1]}</em>);
      else if (ip) nodes.push(ip);
    });
  });
  return nodes;
}
