# Kaizen Design Skill Pack

Last verified: **February 27, 2026**

## Purpose

This pack stores design-focused skills separately from Kaizen core runtime logic.
It allows Kaizen to deliver premium UI/UX quality without changing command behavior, safety rules, or channel runtime logic.

## What is mirrored

1. Local mirrored sources from MakeSomething:
- `building-components`
- `web-design-guidelines`
- `vercel-react-best-practices`

2. Trusted marketplace sources from `skills.sh`:
- `vercel-labs/agent-skills:web-design-guidelines`
- `vercel-labs/agent-skills:vercel-react-best-practices`
- `anthropics/skills:frontend-design`
- `wshobson/agents:responsive-design`
- `wshobson/agents:accessibility-compliance`
- `wshobson/agents:web-component-design`

Review cadence:

- skill map review every 30 days (or during major UI profile updates)

## How Kaizen consumes this

- `src/mission-pack.ts` emits `DESIGN_SKILLS.md` inside each `web-design` profile.
- `src/prompt.ts` loads `DESIGN_SKILLS.md` as an active guidance layer.
- `src/skills-marketplace.ts` keeps trusted skill mappings with `tier` and `domain` classification.

This behavior is additive and does not replace Kaizen's main system prompt or workflow.

## Files

- `MIRROR_MANIFEST.json` - source-of-truth map and trust policy
- `SOURCE_MAP.md` - readable source mapping
- `DESIGN_SYSTEM_GUIDE.md` - condensed design directives used by Kaizen
