# Design Skill Usage in Kaizen

Last verified: **February 27, 2026**

## Why this exists

Kaizen uses a separate design-skill layer so web-design quality improves without changing runtime behavior, permissions, or safety defaults.

## Runtime integration

1. Profile generation:
- `src/mission-pack.ts` emits `DESIGN_SKILLS.md` into each `web-design` profile.

2. Prompt composition:
- `src/prompt.ts` loads `DESIGN_SKILLS.md` between `SKILLS_INDEX.md` and `WORKFLOW.md`.

3. Marketplace sync:
- `src/skills-marketplace.ts` provides trusted UI/UX skill mappings with `tier` and `domain` metadata.

## Behavior guarantees

- Kaizen mission stays focused on build execution.
- Design layer is additive guidance, not strict blocking logic.
- Existing command interfaces and RPC contracts remain unchanged.

## Skill source policy

- trusted-only design sources are enabled by default
- backend-only skills are excluded from this pack
- source map is maintained in `docs/design-skill-pack/MIRROR_MANIFEST.json`
