#!/usr/bin/env bash
set -euo pipefail

KAIZEN_REPO_URL="${KAIZEN_REPO_URL:-https://github.com/Hainrixz/kaizen.git}"
KAIZEN_BRANCH="${KAIZEN_BRANCH:-}"
KAIZEN_INSTALL_DIR="${KAIZEN_INSTALL_DIR:-$HOME/.kaizen/agent}"
DEFAULT_KAIZEN_BIN_DIR="$HOME/.local/bin"
KAIZEN_BIN_DIR_EXPLICIT="0"
if [[ -n "${KAIZEN_BIN_DIR+x}" ]]; then
  KAIZEN_BIN_DIR_EXPLICIT="1"
fi
KAIZEN_BIN_DIR="${KAIZEN_BIN_DIR:-$DEFAULT_KAIZEN_BIN_DIR}"
KAIZEN_AUTO_LAUNCH="${KAIZEN_AUTO_LAUNCH:-1}"
KAIZEN_AUTO_ONBOARD="${KAIZEN_AUTO_ONBOARD:-1}"

path_contains_dir() {
  local target_dir="$1"
  [[ -n "$target_dir" ]] && [[ ":$PATH:" == *":$target_dir:"* ]]
}

ensure_writable_dir() {
  local target_dir="$1"
  if [[ -d "$target_dir" ]]; then
    [[ -w "$target_dir" ]]
    return
  fi
  if [[ "$target_dir" == "$HOME/"* ]]; then
    mkdir -p "$target_dir" >/dev/null 2>&1
    [[ -d "$target_dir" && -w "$target_dir" ]]
    return
  fi
  return 1
}

select_bin_dir_if_needed() {
  if [[ "$KAIZEN_BIN_DIR_EXPLICIT" == "1" ]]; then
    return
  fi

  local candidates=()

  if path_contains_dir "/opt/homebrew/bin"; then
    candidates+=("/opt/homebrew/bin")
  fi
  if path_contains_dir "/usr/local/bin"; then
    candidates+=("/usr/local/bin")
  fi
  if path_contains_dir "$HOME/.local/bin"; then
    candidates+=("$HOME/.local/bin")
  fi
  if path_contains_dir "$HOME/bin"; then
    candidates+=("$HOME/bin")
  fi

  candidates+=("$HOME/.local/bin" "$HOME/bin")

  local candidate
  for candidate in "${candidates[@]}"; do
    if ensure_writable_dir "$candidate"; then
      KAIZEN_BIN_DIR="$candidate"
      return
    fi
  done

  KAIZEN_BIN_DIR="$DEFAULT_KAIZEN_BIN_DIR"
}

choose_shell_profile_file() {
  local shell_name
  shell_name="$(basename "${SHELL:-}")"
  case "$shell_name" in
    zsh)
      echo "$HOME/.zshrc"
      ;;
    bash)
      if [[ -f "$HOME/.bashrc" ]]; then
        echo "$HOME/.bashrc"
      else
        echo "$HOME/.bash_profile"
      fi
      ;;
    fish)
      echo "$HOME/.config/fish/config.fish"
      ;;
    *)
      echo "$HOME/.profile"
      ;;
  esac
}

ensure_bin_on_shell_path() {
  local bin_dir="$1"
  local profile_file shell_name start_marker end_marker path_line

  if path_contains_dir "$bin_dir"; then
    PATH_READY="yes"
    return 0
  fi

  profile_file="$(choose_shell_profile_file)"
  shell_name="$(basename "${SHELL:-}")"

  if [[ "$shell_name" == "fish" ]]; then
    path_line="fish_add_path \"$bin_dir\""
  else
    path_line="export PATH=\"$bin_dir:\$PATH\""
  fi

  start_marker="# >>> kaizen path >>>"
  end_marker="# <<< kaizen path <<<"

  if [[ -f "$profile_file" ]] && grep -F "$start_marker" "$profile_file" >/dev/null 2>&1; then
    PATH_READY="profile"
    PATH_PROFILE_FILE="$profile_file"
    PATH_PROFILE_UPDATED="no"
    return 0
  fi

  if ! mkdir -p "$(dirname "$profile_file")" >/dev/null 2>&1; then
    return 1
  fi

  {
    echo ""
    echo "$start_marker"
    echo "$path_line"
    echo "$end_marker"
  } >>"$profile_file" || return 1

  PATH_READY="profile"
  PATH_PROFILE_FILE="$profile_file"
  PATH_PROFILE_UPDATED="yes"
  return 0
}

read_config_run_mode() {
  if [[ ! -f "$KAIZEN_CONFIG_PATH" ]]; then
    echo "manual"
    return
  fi

  local detected
  detected="$(node -e '
const fs = require("node:fs");
const file = process.argv[1];
try {
  const raw = fs.readFileSync(file, "utf8");
  const parsed = JSON.parse(raw);
  const mode = parsed && parsed.defaults && typeof parsed.defaults.runMode === "string"
    ? parsed.defaults.runMode.trim().toLowerCase()
    : "manual";
  process.stdout.write(mode === "always-on" ? "always-on" : "manual");
} catch {
  process.stdout.write("manual");
}
' "$KAIZEN_CONFIG_PATH" 2>/dev/null || echo "manual")"

  if [[ "$detected" == "always-on" ]]; then
    echo "always-on"
  else
    echo "manual"
  fi
}

print_manual_next_steps() {
  local has_config="$1"
  local run_mode="$2"
  local step=1

  echo "run these manually:"
  if [[ "$has_config" != "yes" ]]; then
    echo "$step) kaizen onboard"
    step=$((step + 1))
    run_mode="manual"
  fi

  if [[ "$run_mode" == "always-on" ]]; then
    echo "$step) kaizen service install"
    step=$((step + 1))
    echo "$step) kaizen service start"
    step=$((step + 1))
    echo "$step) kaizen service status"
  else
    echo "$step) kaizen start"
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo-url)
      KAIZEN_REPO_URL="${2:-}"
      shift 2
      ;;
    --branch)
      KAIZEN_BRANCH="${2:-}"
      shift 2
      ;;
    --install-dir)
      KAIZEN_INSTALL_DIR="${2:-}"
      shift 2
      ;;
    --bin-dir)
      KAIZEN_BIN_DIR="${2:-}"
      shift 2
      ;;
    --no-launch)
      KAIZEN_AUTO_LAUNCH="0"
      shift
      ;;
    --no-onboard)
      KAIZEN_AUTO_ONBOARD="0"
      shift
      ;;
    *)
      echo "[kaizen installer] unknown option: $1" >&2
      exit 1
      ;;
  esac
done

select_bin_dir_if_needed

if [[ -z "$KAIZEN_REPO_URL" || -z "$KAIZEN_INSTALL_DIR" || -z "$KAIZEN_BIN_DIR" ]]; then
  echo "[kaizen installer] one or more required values are empty." >&2
  exit 1
fi

command -v git >/dev/null 2>&1 || {
  echo "[kaizen installer] git is required. install git and re-run."
  exit 1
}
command -v node >/dev/null 2>&1 || {
  echo "[kaizen installer] node.js is required (v20+). install node and re-run."
  exit 1
}
command -v corepack >/dev/null 2>&1 || {
  echo "[kaizen installer] corepack is required. install a node version that includes corepack and re-run."
  exit 1
}

NODE_VERSION="$(node -p 'process.versions.node')"
NODE_MAJOR="${NODE_VERSION%%.*}"
if [[ "$NODE_MAJOR" -lt 20 ]]; then
  echo "[kaizen installer] node v20+ is required. found: $NODE_VERSION"
  exit 1
fi

if [[ -z "$KAIZEN_BRANCH" ]]; then
  REMOTE_HEAD="$(git ls-remote --symref "$KAIZEN_REPO_URL" HEAD 2>/dev/null | awk '/^ref:/ {print $2}' | sed 's#refs/heads/##')"
  if [[ -n "$REMOTE_HEAD" ]]; then
    KAIZEN_BRANCH="$REMOTE_HEAD"
  else
    KAIZEN_BRANCH="main"
  fi
fi

echo "[kaizen installer] repo: $KAIZEN_REPO_URL"
echo "[kaizen installer] branch: $KAIZEN_BRANCH"
echo "[kaizen installer] install dir: $KAIZEN_INSTALL_DIR"
echo "[kaizen installer] bin dir: $KAIZEN_BIN_DIR"
echo "[kaizen installer] auto launch: $KAIZEN_AUTO_LAUNCH"
echo "[kaizen installer] auto onboard: $KAIZEN_AUTO_ONBOARD"

KAIZEN_CONFIG_PATH="${KAIZEN_CONFIG_PATH:-$HOME/.kaizen/kaizen.json}"
HAD_CONFIG_BEFORE_INSTALL="no"
if [[ -f "$KAIZEN_CONFIG_PATH" ]]; then
  HAD_CONFIG_BEFORE_INSTALL="yes"
fi

mkdir -p "$(dirname "$KAIZEN_INSTALL_DIR")"

if [[ -d "$KAIZEN_INSTALL_DIR/.git" ]]; then
  echo "[kaizen installer] updating existing install..."
  git -C "$KAIZEN_INSTALL_DIR" fetch origin "$KAIZEN_BRANCH" --depth 1
  git -C "$KAIZEN_INSTALL_DIR" checkout "$KAIZEN_BRANCH"
  git -C "$KAIZEN_INSTALL_DIR" pull --ff-only origin "$KAIZEN_BRANCH"
else
  if [[ -d "$KAIZEN_INSTALL_DIR" ]]; then
    echo "[kaizen installer] install dir exists but is not a git checkout: $KAIZEN_INSTALL_DIR" >&2
    echo "[kaizen installer] remove that directory (or use --install-dir) and run again." >&2
    exit 1
  fi
  echo "[kaizen installer] cloning kaizen..."
  git clone --depth 1 --branch "$KAIZEN_BRANCH" "$KAIZEN_REPO_URL" "$KAIZEN_INSTALL_DIR"
fi

echo "[kaizen installer] installing dependencies..."
(
  cd "$KAIZEN_INSTALL_DIR"
  corepack enable >/dev/null 2>&1 || true
  corepack pnpm install --frozen-lockfile
  corepack pnpm build
)

mkdir -p "$KAIZEN_BIN_DIR"
cat >"$KAIZEN_BIN_DIR/kaizen" <<EOF
#!/usr/bin/env bash
set -euo pipefail
KAIZEN_INSTALL_DIR="$KAIZEN_INSTALL_DIR"
exec node "\$KAIZEN_INSTALL_DIR/kaizen.mjs" "\$@"
EOF
chmod +x "$KAIZEN_BIN_DIR/kaizen"

PATH_READY="no"
PATH_PROFILE_FILE=""
PATH_PROFILE_UPDATED="no"
if ! ensure_bin_on_shell_path "$KAIZEN_BIN_DIR"; then
  PATH_READY="no"
fi

echo ""
echo "kaizen installed."
echo "launcher: $KAIZEN_BIN_DIR/kaizen"

if [[ "$PATH_READY" == "profile" ]]; then
  echo ""
  if [[ "$PATH_PROFILE_UPDATED" == "yes" ]]; then
    echo "added $KAIZEN_BIN_DIR to PATH in: $PATH_PROFILE_FILE"
  else
    echo "PATH already configured in: $PATH_PROFILE_FILE"
  fi
  echo "open a new terminal (or run: source \"$PATH_PROFILE_FILE\") to use 'kaizen' everywhere."
elif [[ "$PATH_READY" == "no" ]]; then
  echo ""
  echo "could not auto-update your shell profile."
  echo "add this to a shell profile to use 'kaizen' from anywhere:"
  echo "export PATH=\"$KAIZEN_BIN_DIR:\$PATH\""
fi

echo ""
if [[ "$KAIZEN_AUTO_LAUNCH" == "1" ]]; then
  if [[ -t 1 && -t 2 && -r /dev/tty && -w /dev/tty ]]; then
    if [[ "$HAD_CONFIG_BEFORE_INSTALL" == "no" ]]; then
      if [[ "$KAIZEN_AUTO_ONBOARD" == "1" ]]; then
        echo "[kaizen installer] launching onboarding..."
        "$KAIZEN_BIN_DIR/kaizen" onboard </dev/tty >/dev/tty 2>/dev/tty || true
      else
        echo "[kaizen installer] onboarding skipped (--no-onboard)."
      fi
    else
      echo "[kaizen installer] existing config found. skipping onboarding."
    fi

    HAS_CONFIG_NOW="no"
    if [[ -f "$KAIZEN_CONFIG_PATH" ]]; then
      HAS_CONFIG_NOW="yes"
    fi
    RUN_MODE="$(read_config_run_mode)"

    if [[ "$RUN_MODE" == "always-on" && "$HAS_CONFIG_NOW" == "yes" ]]; then
      echo "[kaizen installer] run mode is always-on. installing and starting service..."
      "$KAIZEN_BIN_DIR/kaizen" service install </dev/tty >/dev/tty 2>/dev/tty || true
      "$KAIZEN_BIN_DIR/kaizen" service start </dev/tty >/dev/tty 2>/dev/tty || true
      "$KAIZEN_BIN_DIR/kaizen" service status </dev/tty >/dev/tty 2>/dev/tty || true
    elif [[ "$HAS_CONFIG_NOW" == "yes" ]]; then
      echo "[kaizen installer] run mode is manual. launching kaizen..."
      "$KAIZEN_BIN_DIR/kaizen" start </dev/tty >/dev/tty 2>/dev/tty || true
    else
      echo "no Kaizen config found yet."
      print_manual_next_steps "no" "manual"
    fi
  else
    echo "interactive terminal not available, skipping auto-launch."
    HAS_CONFIG_NOW="no"
    if [[ -f "$KAIZEN_CONFIG_PATH" ]]; then
      HAS_CONFIG_NOW="yes"
    fi
    print_manual_next_steps "$HAS_CONFIG_NOW" "$(read_config_run_mode)"
  fi
else
  echo "auto-launch disabled."
  HAS_CONFIG_NOW="no"
  if [[ -f "$KAIZEN_CONFIG_PATH" ]]; then
    HAS_CONFIG_NOW="yes"
  fi
  print_manual_next_steps "$HAS_CONFIG_NOW" "$(read_config_run_mode)"
fi
