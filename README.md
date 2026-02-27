> 🔏 Built by [@soyEnriqueRocha](https://instagram.com/soyEnriqueRocha) x [@tododeia](https://instagram.com/tododeia)

# Kaizen

Kaizen is a focused project-builder agent workspace with guided, task-oriented workflows.

V1 is profile-driven and starts with one ability profile: **web-design**.

## Current status

- Separate workspace created at `/Users/mhenry/Desktop/Kaizen`
- First runnable CLI scaffold added in `src/cli.mjs`
- Watermark/signature blueprint integrated from `BLUEPRINT.md`
- Onboarding flow now asks for:
  - model provider (`openai-codex` or `local`)
  - ability profile (`web-design` in v1)
  - interaction mode (`terminal` or `localhost`)

## Quick start

```bash
cd /Users/mhenry/Desktop/Kaizen
corepack pnpm install
corepack pnpm start
# or:
corepack pnpm start onboard
```

## One-command install (OpenClaw style)

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
- `kaizen setup [--workspace <dir>] [--model openai-codex|local] [--ability-profile web-design]`
- `kaizen onboard [--model openai-codex|local] [--ability-profile web-design] [--interaction terminal|localhost]`
- `kaizen status`
- `kaizen auth status`
- `kaizen auth login --provider openai-codex`
- `kaizen start` (uses configured interaction mode)
- `kaizen chat` (terminal chat mode)
- `kaizen ui` (localhost mode on port 3000)
- `kaizen init <project-name> [--focus <mode>]`

## Recommended v1 flow

```bash
cd /Users/mhenry/Desktop/Kaizen
corepack pnpm install
corepack pnpm start onboard
corepack pnpm start start
```

## Next build steps

1. Build the Kaizen auth/onboarding flow into dedicated modules.
2. Expand guided commands into focused worker tasks.
3. Add agent profiles (landing page, app, web app, mobile-first UI).
4. Build a non-terminal UX wrapper so users can run focused tasks with less CLI friction.
