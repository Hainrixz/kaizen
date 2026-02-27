> 🔏 Built by [@soyEnriqueRocha](https://instagram.com/soyEnriqueRocha) x [@tododeia](https://instagram.com/tododeia)

# Kaizen

![Kaizen mascot](./assets/kaizen-mascot.png)

Kaizen is a focused project-builder agent workspace with guided, task-oriented workflows.

V1 is profile-driven and starts with one ability profile: **web-design**.

Architecture notes: see `docs/ARCHITECTURE_NOTES.md`.

## Current status

- Project scaffold is ready for local or remote install
- First runnable CLI scaffold added in `src/entry.ts`
- Watermark/signature blueprint integrated from `BLUEPRINT.md`
- Onboarding flow now asks for:
  - arrow-key selection UI for menu choices
  - model provider (`openai-codex` or `local`)
  - ability profile (`web-design` in v1)
  - interaction mode (`terminal` or `localhost`)
  - where to save projects (`desktop`, `documents`, `home`, or custom path)

## Quick start

```bash
git clone https://github.com/Hainrixz/kaizen.git
cd kaizen
corepack pnpm install
corepack pnpm start
# or:
corepack pnpm start onboard
# dev mode (runs TypeScript without build):
corepack pnpm dev
```

## One-command install

macOS + Linux:

```bash
curl -fsSL https://raw.githubusercontent.com/Hainrixz/kaizen/main/install.sh | bash
```

Windows (PowerShell):

```powershell
iwr -useb https://raw.githubusercontent.com/Hainrixz/kaizen/main/install.ps1 | iex
```

After install:

```bash
kaizen onboard
kaizen start
```

## Commands

- `kaizen help`
- `kaizen setup [--workspace <dir>] [--workspace-location desktop|documents|home|custom] [--model openai-codex|local] [--ability-profile web-design]`
- `kaizen onboard [--workspace <dir>] [--workspace-location desktop|documents|home|custom] [--model openai-codex|local] [--ability-profile web-design] [--interaction terminal|localhost]`
- `kaizen status`
- `kaizen auth status`
- `kaizen auth login --provider openai-codex`
- `kaizen start` (uses configured interaction mode)
- `kaizen chat` (terminal chat mode)
- `kaizen ui` (localhost mode on port 3000)
- `kaizen init <project-name> [--focus <mode>]`

## Recommended v1 flow

```bash
git clone https://github.com/Hainrixz/kaizen.git
cd kaizen
corepack pnpm install
corepack pnpm start onboard
corepack pnpm start start
```

## Next build steps

1. Build the Kaizen auth/onboarding flow into dedicated modules.
2. Expand guided commands into focused worker tasks.
3. Add agent profiles (landing page, app, web app, mobile-first UI).
4. Build a non-terminal UX wrapper so users can run focused tasks with less CLI friction.
