# Kaizen Build Plan

## Goal

Build a focused worker-agent platform that:

- uses robust agent/runtime architecture
- keeps beginner-first guided build flow
- adds opinionated, task-focused agent profiles

## Step-by-step build sequence

1. Bootstrap CLI foundation
- Done: `src/cli.mjs`, banner, signature integrity checks, and starter generator.

2. Onboarding and auth layer
- Initial command flow implemented: `setup`, `onboard`, `status`, `start`, `chat`, `ui`, `init`.
- Onboarding is simplified to model + ability profile + interaction mode.
- V1 ability profile is `web-design`; future profiles plug into the same selector flow.
- OpenAI Codex OAuth wired through `kaizen auth login` and onboarding selection.

3. Focused command system
- Implement guided command ergonomics into Kaizen commands.
- Initial command targets: project planning, UI scaffold, feature iteration, deploy-ready checks.

4. Project profile engine
- Add profile templates for:
  - landing page
  - app/tool
  - web app dashboard
  - mobile-first web app

5. Non-terminal experience
- Add a thin local UI wrapper so users can trigger focused tasks without heavy CLI usage.

6. Packaging and installer
- Build install scripts for mac/linux and windows aligned with one-entry onboarding.

## Watermark and integrity

Kaizen follows `BLUEPRINT.md` requirements:

- startup splash
- package metadata credits
- header comment in core entry files
- generated output signatures
- hidden signature integrity constant + runtime check
- root `CREDITS.md`
- README badge
