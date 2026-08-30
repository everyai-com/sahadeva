# Sahadeva — evolved editorial consultation system

## Product and experience

Sahadeva is a bilingual English/Telugu Jyotisha consultation product. Its advantage is not spectacle; it is complete, evidence-bound readings that feel personal, calm, and trustworthy. The core experience shifts between conversational asking, long-form reading, technical evidence, structured BTR, and follow-up exploration.

Primary jobs:

1. Enter or switch verified birth details with confidence.
2. Ask a natural question without learning astrology terminology.
3. Read a long profile without losing place or becoming overwhelmed.
4. Understand the direct answer first, then inspect evidence and uncertainty.
5. Continue with a focused follow-up tied to a section.
6. Save, share, download, or give precise feedback.

## Visual direction

Evolve the existing warm editorial identity. The product should feel like a beautifully edited private consultation notebook crossed with a rigorous research reader—not a generic chat app, enterprise dashboard, horoscope portal, or mystical neon interface.

Use:

- Warm mineral paper backgrounds with subtle depth.
- Deep charcoal ink and restrained vermilion accents.
- Editorial display serif only for titles and significant conclusions.
- Highly readable humanist sans for controls and long Telugu/English text.
- Fine rules, generous whitespace, calm section rhythm.
- Small evidence/status marks that feel like scholarly marginalia.
- Charts and technical evidence as deliberate artifacts, not decorative widgets.

Never use:

- Purple/blue AI gradients, glass-card overload, neon zodiac imagery.
- Dashboard grids full of equal-weight cards.
- Tiny low-contrast text or excessive pills.
- Decorative astrology symbols competing with content.
- Message bubbles for a 2,000–4,000-word complete profile.

## Core layout model

### Mobile

- Compact top bar with subject, consultation state, and clear navigation.
- Conversation stream for short exchanges.
- Long readings open into a dedicated reader surface with sticky progress and section navigator.
- Bottom composer adapts to context: “Ask Sahadeva” in chat; “Ask about this section” in reader.
- Evidence opens as a bottom sheet with a clear summary first.

### Desktop

- Three-zone adaptive workspace, not three permanent sidebars:
  - Left rail (collapsible): people, consultations, tools.
  - Center: conversation or editorial reading.
  - Right inspector (contextual): chart, evidence, timing, uncertainty.
- Reading center column remains 680–760px for legibility.
- Full-profile table of contents can pin beside the reading only when space permits.

## Color tokens

- `canvas`: #EEEAE2
- `surface`: #F8F5EE
- `surface-raised`: #FFFCF6
- `ink`: #24231F
- `ink-soft`: #6B685F
- `ink-faint`: #918C81
- `accent`: #B33927
- `accent-strong`: #8F2B1E
- `accent-soft`: #F0D8D0
- `line`: #CBC6BA
- `line-soft`: rgba(36,35,31,.09)
- `support`: #486A58
- `caution`: #9A6B25
- `opposition`: #8A4B43

Dark mode, if shown, uses warm near-black and parchment text—not pure black or saturated gradients.

## Typography

- UI/body: `Avenir Next`, Avenir, system-ui, sans-serif.
- Display: `Iowan Old Style`, Georgia, serif.
- Telugu: prioritize system Telugu fonts with generous line-height; never force the display serif on Telugu body copy.
- Reading body: 17–19px desktop, 16–18px mobile; line-height 1.72–1.85.
- Measure: 60–72 characters for English; visually equivalent comfortable Telugu measure.
- Eyebrows: 11–12px, 0.12em tracking, restrained uppercase only for English.

## Spacing, radius, elevation

- Base rhythm: 4, 8, 12, 16, 24, 32, 48, 64.
- Reading sections: 40–64px separation.
- Controls: minimum 44px touch target.
- Radius: 12px fields, 16px cards/sheets, 24px major surfaces, 999px only for genuine pills.
- Shadows: paper-like; one subtle hairline + low diffuse elevation. Avoid stacked glossy shadows.

## Components

- Header: quiet translucent paper, subject-first, never oversized.
- Direct Answer: editorial opening with a single strong conclusion, confidence/uncertainty nearby.
- Reading Section: numbered title, concise section takeaway, body, evidence disclosure, follow-up action.
- Evidence Ledger: supporting/opposing columns, source status, calculation facts, uncertainty; compact by default.
- Timing Strip: current period and next transition as an accessible timeline, not a complex chart.
- Section Navigator: progress + concise labels; collapses cleanly on mobile.
- Composer: contextual and calm; primary action vermilion.
- Feedback: low-emphasis after section, never a noisy button wall.
- BTR Event Card: progressive, numbered, explicit precision/confidence, clear validation.

## Interaction and motion

- 150–220ms easing for sheets, inspector, section focus, and state transitions.
- Preserve reading position across chat/reader/evidence transitions.
- Section selection scrolls smoothly and updates progress.
- Evidence disclosure never causes disorienting page jumps.
- Streaming shows stable section skeletons so content does not endlessly push the page.
- Respect reduced motion.

## Trust requirements

- Clearly distinguish calculated facts, traditional interpretation, uncertainty, and unreviewed sources.
- Never hide contrary evidence behind an alarming label.
- Show birth-time sensitivity near affected sections.
- Health and remedies remain bounded and non-prescriptive.
- Feedback state says “pending review,” never “verified.”

## Accessibility

- WCAG AA contrast minimum.
- Visible 3px focus ring using translucent accent.
- Semantic headings and landmarks.
- Keyboard-accessible section navigation, sheets, evidence disclosures, and actions.
- No interaction encoded only by color.
- English and Telugu layouts must tolerate text expansion without truncation.

Use ONLY these fonts, colors, spacing, and component styles. Do not introduce other visual styles, generic AI gradients, neon colors, or unrelated decorative motifs.
