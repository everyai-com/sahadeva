# Theme

## Compact token summary

- Product mood: warm editorial Jyotisha, quiet and trustworthy rather than occult/neon.
- UI font: `Avenir Next`, Avenir, system UI.
- Display font: serif token used for Sahadeva/editorial headings.
- Core ink: `#24231f`; muted `#6b685f`.
- Warm canvas: `#eeebe4`; paper/surface `#f7f5ef`.
- Accent: vermilion `#b33927`; soft accent used for glows and selected states.
- Hairline: `#cbc6ba`; base radius `14px`, pills `999px`.
- Chat shell: max-width 760px; full viewport height; desktop supports wider dock states.
- Motion: restrained 150–220ms transforms/opacity; no decorative perpetual animation.
- Accessibility: 3px accent focus ring, minimum 40px header targets, mobile safe-area padding.
- Breakpoints: primary compact/mobile split near 760px; expanded detail modes above ~1100px.

## Source token blocks

```css
:root {
  font-family: "Avenir Next", Avenir, system-ui, sans-serif;
  color: #24231f;
  background: #eeebe4;
  --accent: #b33927;
  --ink: #24231f;
  --muted: #6b685f;
  --paper: #f7f5ef;
  --line: #cbc6ba;
  --radius: 14px;
}
body:has(.chat-shell), body:has(.onboard) {
  color: var(--ink);
  font-family: var(--font-ui);
  background: radial-gradient(120% 70% at 50% -10%, var(--accent-soft) 0%, transparent 60%), var(--bg);
  background-attachment: fixed;
}
.chat-shell { display:flex; flex-direction:column; height:100dvh; max-width:760px; margin:0 auto; }
```

Raw sources: `src/styles.css` (professional workspace) and `src/chat.css` (consumer product). Both are large; use their relevant selector ranges plus this compact token summary in generation payloads.
