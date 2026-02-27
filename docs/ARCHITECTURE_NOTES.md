# Architecture Notes (Kaizen)

Last verified: **February 27, 2026**

## Purpose

This file keeps Kaizen aligned to its own architecture as a focused project-building agent platform.

## Core architecture

1. Thin runtime wrapper
- `kaizen.mjs` is a small bootstrap entrypoint only.

2. TypeScript-first core
- All product logic lives under `src/**/*.ts`.

3. Built runtime output
- Build output goes to `dist/`.
- Runtime executes `dist/entry.js`.

4. Guided onboarding
- First-run flow is `kaizen onboard`.
- Onboarding sets:
  - model provider
  - ability profile
  - interaction mode
  - default workspace location
  - context guard configuration
  - ability skill-pack installation paths

5. Installer-first distribution
- One-command install scripts:
  - `install.sh` for macOS/Linux
  - `install.ps1` for Windows
- Primary distribution command is served from the branded domain:
  - `https://tododeia.com/install.sh`
  - `https://tododeia.com/install.ps1`
- Domain installer bootstraps the latest Kaizen installer from GitHub.

6. Context continuity
- Context guard is enabled by default with a 65% threshold.
- Session compression writes persistent markdown memory under `.kaizen/memory/`.

7. Ability skill packs
- Each ability installs a model-agnostic pack composed of:
  - `SYSTEM_PROMPT.md`
  - `WALKTHROUGH.md`
  - `SKILLS_INDEX.md`
  - `WORKFLOW.md`
  - `OUTPUT_TEMPLATE.md`
  - `MARKETPLACE_SKILLS.md`
  - `skills/*.md` execution docs
- Onboarding optionally syncs curated `skills.sh` dependencies into workspace `.agents/skills`.
- Runtime prompt loading includes these files so behavior remains consistent across providers.

## Product direction

- Keep Kaizen focused and profile-driven.
- Expand capabilities by adding profiles, not by bloating a single generic flow.
- Keep setup simple so non-technical users can start fast.

## Current status checklist

- [x] TypeScript core migration
- [x] Compiled runtime pipeline (`dist/entry.js`)
- [x] One-command install scripts
- [x] Guided onboarding
- [x] Context guard + markdown memory trail
- [x] Web-design skill pack with workflow and execution docs
- [x] Guided walkthrough + marketplace skills sync for web-design
- [ ] Rich local UI chat shell (future)
- [ ] Expanded profile marketplace (future)

## Guardrails

- Keep `kaizen.mjs` thin.
- Keep logic inside TypeScript modules in `src/`.
- Keep onboarding short and clear.
- Keep public docs brand-pure to Kaizen only.
