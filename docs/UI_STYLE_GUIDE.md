# UI Style Guide (Kaizen Local UI)

Last verified: **February 27, 2026**

## Theme and mood

- default: dark-first premium interface
- optional: manual light mode toggle with visual parity
- atmosphere: layered, calm, high-trust blue gradients with frosted surfaces

## Token rules

- define core visual values in `ui/src/styles/tokens.css`
- consume semantic tokens in `ui/src/styles/base.css`
- avoid hardcoded one-off colors in component templates

Core token groups:

- background and text tokens (`--kaizen-bg*`, `--kaizen-text*`)
- glass and border tokens (`--glass-*`)
- elevation and focus tokens (`--shadow-*`)
- spacing/radius tokens (`--space-*`, `--radius-*`)
- motion tokens (`--dur-*`, `--ease-standard`)

## Spacing and rhythm

- use a consistent spacing cadence from token scale
- keep section groups visually separated by card boundaries
- avoid stacking more than one dense control cluster without a heading or intro line

## Typography

- system-first premium stack (`SF Pro Text`, `Inter`, `Segoe UI`, fallback sans)
- headings short and lowercase in control views
- body text optimized for scanability in operational workflows

## Accessibility

- preserve visible `:focus-visible` styling on all interactive controls
- maintain contrast-safe text in both dark and light themes
- support reduced-motion preference with motion fallback rules
- keep mobile touch targets comfortable and consistent

## Mascot usage constraints

- mascot appears as subtle brand anchor only:
  - header brand block
  - empty-state hints
- mascot should not dominate work panels or obstruct control tasks
