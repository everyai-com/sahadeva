# Sahadeva app icon

## Meaning

The mark is a field rather than a single Graha. The open center represents the person: present, unobscured, and never reduced to a prediction. The crossing paths represent time, family, choice, and celestial relationships acting together. The enclosing circle represents a coherent interpretive method. No ray owns the center, so the mark must not be described as Sūrya.

## Canonical files

- `app-icon.svg`: full-bleed, opaque store master. Platforms apply their own corner mask.
- `app-icon-preview.svg`: rounded preview for presentations and documentation only.
- `app-icon-monochrome.svg`: one-color fallback.
- `app-icon-small.svg`: optically simplified version for 16–48px display.
- `app-icon-construction.svg`: safe-zone and geometry reference; never ship it.

## Construction

- Canvas: 64 × 64 construction units.
- Live artwork stays inside the central 56 × 56 area.
- The 48 × 48 square is the conservative cross-platform safe zone.
- The center remains open. Do not insert a deity, planet, letter, photograph, or profile image.
- Primary master uses cultural ink with antique-gold geometry. Gradients may create depth but may not introduce another accent family.

## Usage

- Use the full-bleed master for Apple and Google store exports.
- Use the small variant below 48px and test it at actual size.
- Let iOS, Android, and launchers apply their native masks.
- Always export store icons without transparency.
- Keep the icon visually separate from devotional and Graha illustrations.

## Prohibited changes

- Do not round the store master before submission.
- Do not turn the center into a sun disc.
- Do not add zodiac glyphs, initials, shadows, neon, galaxy textures, or fate-signalling red/green.
- Do not stretch, rotate, crop, redraw, or vary individual paths.
- Do not use the detailed master when the simplified small-size version is required.
