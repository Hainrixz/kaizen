# Design System Guide (Premium iOS Style)

## Intent

Deliver a premium, modern, tech-forward UI that feels calm, precise, and high-trust while staying practical for operational workflows.

## Visual principles

1. Layered depth
- use translucent cards and navigation chrome over a gradient atmosphere.
- reserve stronger elevation for active surfaces only.

2. Controlled contrast
- prioritize readability and scanability over decorative effects.
- keep text contrast high in both dark and light themes.

3. Brand restraint
- mascot appears as a subtle brand anchor in header/empty states.
- avoid mascot dominance inside primary control workflows.

4. Rhythm and spacing
- keep consistent spacing scale and card radius system.
- avoid dense walls of controls; group actions by intent.

## Interaction principles

1. Motion is informative
- apply short transitions for tab/state changes and feedback.
- motion should clarify state transitions, not distract.

2. High confidence controls
- clear hover, press, and focus-visible states on every actionable element.
- destructive actions must be visually differentiated.

3. Keyboard and accessibility
- complete keyboard support for navigation and chat send/cancel flows.
- focus rings remain visible and color-safe in all themes.

## Layout principles

1. Desktop
- navigation rail + main content surface.
- chat and control panels use distinct visual grouping.

2. Mobile
- compact top chrome.
- touch-friendly controls and reduced horizontal complexity.

## Performance and quality

- keep UI state local and deterministic.
- avoid unnecessary rerender churn.
- preserve responsive behavior and reduced-motion fallbacks.
