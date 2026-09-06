# Sahadeva design system

## Philosophy

Sahadeva is a translation system, not an astrology skin. It carries a concept through five distinct layers without confusing one for another:

1. Sanskrit source identity
2. Literal meaning
3. Classical Jyotiṣa interpretation
4. Plain-language consumer meaning
5. Visual DNA: shape, material, motion, and behavior

The governing principle is **the right layer at the right moment**. Complexity remains available, but the default experience answers what is happening, why it matters, what it may mean, and what can help before exposing technical detail.

## Visual thesis

The brand mark is a field, not a single Graha: a calm center held inside interdependent paths. It represents the person at the center of time, family, and celestial relationships. It deliberately avoids resembling Sūrya so that the whole brand is not reduced to one planet.

The interface uses warm paper, cultural ink, restrained indigo interaction, and sparing copper-gold. Gold indicates heritage or source; indigo indicates interaction. Neither is a universal good/bad signal.

## Canonical tokens

Tokens live in `src/webapp/base.css`. The stable semantic set is canvas, surface, raised surface, primary/secondary text, border, cultural ink, interaction accent, copper, and antique gold. Spacing follows a 4px base. Important text never drops below 13px. Reading columns stay under 760px.

## Navagraha grammar

All glyphs are made from circle, arc, axis, ray, intersection, enclosure, break, dissolution, and shadow. Their official motion verbs are:

| Graha | Silhouette | Motion |
|---|---|---|
| Sūrya | radial | radiate |
| Chandra | phased curve | cycle |
| Maṅgala | directional axis | pierce |
| Budha | connected nodes | connect |
| Guru | opening ring | expand |
| Śukra | crystalline symmetry | clarify |
| Śani | weighted baseline | settle |
| Rāhu | occluded circle | cover |
| Ketu | fragmented tail | dissolve |

Each is shipped as a monochrome-capable 24px glyph, 48px symbol, and 128px emblem. The Navagraha registry at `public/brand/sahadeva/registry.json` and system registry at `public/brand/sahadeva/system-registry.json` are canonical. Do not invent alternates without versioning the registries.

## Usage rules

- Always pair unfamiliar symbols with a name and short human meaning.
- Never use color as the only signal.
- Use micro glyphs in charts and timelines, symbols in cards, emblems in education, and illustration only for narrative depth.
- Do not use Western planetary glyphs as the primary identity.
- No galaxy gradients, neon, generic mandala wallpaper, fear imagery, or red/green fate coding.
- Respect `prefers-reduced-motion`; no bounce or elastic motion.

## Asset license and reuse

All deterministic SVG assets in `public/brand/sahadeva` are source-controlled with the application and inherit the repository license unless a separate brand-asset license is adopted. Use `registry.json` for stable paths and identity metadata.

The remaining production scope is tracked in `SAHADEVA_DESIGN_COMPLETION_ROADMAP.md`.

## Production and QA

Run `node scripts/generate-sahadeva-assets.mjs` and `node scripts/generate-sahadeva-system-assets.mjs` to reproduce the vector families from source. Every release must pass source, recognition, consumer, cultural, modernity, story, and 20px reduction tests. The monochrome glyph is authoritative; contextual material color is secondary. Source and approval status are governed by `SAHADEVA_ASSET_PROVENANCE.md`; visual consistency never substitutes for cultural validation.
