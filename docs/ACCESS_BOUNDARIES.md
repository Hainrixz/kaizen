# Access Boundaries

Kaizen enforces access scope before model turn execution.

## Scope levels

1. `workspace` (default)
- only paths inside configured workspace are allowed

2. `workspace-plus`
- workspace plus explicit allowlist paths
- allowlist stored in `access.allowPaths`

3. `full`
- unrestricted filesystem scope
- explicit typed consent required each enable action

## Configuration

Use:

```bash
kaizen config --access workspace
kaizen config --access workspace-plus --allow-path ~/Documents --allow-path ~/Desktop
kaizen config --access full --accept-full-access-risk true --yes
```

Or interactive:

```bash
kaizen config
```

## Consent marker

When full access is enabled after confirmation:

- `~/.kaizen/run/full-access-consent.json` is written.

When scope is reduced or autonomy is disabled:

- marker is cleared.

