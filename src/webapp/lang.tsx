import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ElementType,
  type ReactNode,
} from "react";

export type Lang = "en" | "te";

const KEY = "sahadev.lang";
const CHOSEN_KEY = "sahadev.lang.set"; // marks that the user has picked a language

type LangCtx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** True once the user has explicitly chosen a language (first-run gate). */
  chosen: boolean;
  /** Pick the right string for the active language. */
  t: (en: string, te?: string) => string;
};

const Ctx = createContext<LangCtx | null>(null);

function readInitial(): Lang {
  try {
    return localStorage.getItem(KEY) === "te" ? "te" : "en";
  } catch {
    return "en";
  }
}
function readChosen(): boolean {
  try {
    return localStorage.getItem(CHOSEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readInitial);
  const [chosen, setChosen] = useState<boolean>(readChosen);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    setChosen(true);
    try {
      localStorage.setItem(KEY, l);
      localStorage.setItem(CHOSEN_KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback(
    (en: string, te?: string) => (lang === "te" && te ? te : en),
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, chosen, t }), [lang, setLang, chosen, t]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLang(): LangCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLang must be used inside <LangProvider>");
  return ctx;
}

/**
 * The EN / తెలుగు segmented toggle used on every screen.
 * Matches the prototype `.langtog` markup exactly.
 */
export function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <div className="langtog" role="group" aria-label="Language / భాష">
      <button
        type="button"
        data-lang="en"
        aria-pressed={lang === "en"}
        onClick={() => setLang("en")}
      >
        EN
      </button>
      <button
        type="button"
        data-lang="te"
        aria-pressed={lang === "te"}
        onClick={() => setLang("te")}
      >
        తె
      </button>
    </div>
  );
}

/**
 * Render a translated string that may contain trusted inline HTML
 * (entities, <br/>, <b>…). Content is static, author-controlled copy
 * ported from the prototypes, so dangerouslySetInnerHTML is safe here.
 */
export function Rich({
  en,
  te,
  as: Tag = "span",
  className,
}: {
  en: string;
  te?: string;
  as?: ElementType;
  className?: string;
}) {
  const { lang } = useLang();
  const html = lang === "te" && te ? te : en;
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
