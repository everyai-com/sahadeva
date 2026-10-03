import { useEffect } from "react";

/**
 * Keeps the app the size of the *visible* viewport while the on-screen
 * keyboard is open. Mobile browsers shrink only the visual viewport, so a
 * 100dvh shell otherwise slides its bottom (the Ask composer, Continue
 * buttons) behind the keyboard. The focused field is then scrolled back into
 * view once the keyboard has settled.
 */
export function useKeyboardSafeViewport() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement;
    let frame = 0;
    let fullHeight = vv.height;
    const typing = () => {
      const el = document.activeElement as HTMLElement | null;
      return Boolean(el && (/^(TEXTAREA|SELECT)$/.test(el.tagName) || (el.tagName === "INPUT" && !/^(button|checkbox|radio|range|submit)$/.test((el as HTMLInputElement).type))));
    };
    const apply = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!typing()) fullHeight = Math.max(fullHeight, vv.height);
        // The keyboard is up when a text field has focus and the viewport lost a keyboard's worth of height.
        root.dataset.keyboard = typing() && vv.height < fullHeight - 120 ? "open" : "closed";
        root.style.setProperty("--app-h", `${Math.round(vv.height)}px`);
        // iOS scrolls the layout viewport under the keyboard; pin it back.
        if (vv.offsetTop > 0 && window.scrollY !== 0) window.scrollTo(0, 0);
      });
    };
    const revealFocused = () => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || !/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      window.setTimeout(() => el.scrollIntoView({ block: "nearest", behavior: "smooth" }), 280);
    };
    apply();
    vv.addEventListener("resize", apply);
    vv.addEventListener("scroll", apply);
    vv.addEventListener("resize", revealFocused);
    document.addEventListener("focusin", revealFocused);
    document.addEventListener("focusin", apply);
    document.addEventListener("focusout", apply);
    return () => {
      document.removeEventListener("focusin", apply);
      document.removeEventListener("focusout", apply);
      delete root.dataset.keyboard;
      cancelAnimationFrame(frame);
      vv.removeEventListener("resize", apply);
      vv.removeEventListener("scroll", apply);
      vv.removeEventListener("resize", revealFocused);
      document.removeEventListener("focusin", revealFocused);
      root.style.removeProperty("--app-h");
    };
  }, []);
}
