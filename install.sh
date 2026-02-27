#!/usr/bin/env bash
set -euo pipefail

KAIZEN_REPO_URL="${KAIZEN_REPO_URL:-https://github.com/Hainrixz/kaizen.git}"
KAIZEN_BRANCH="${KAIZEN_BRANCH:-}"
KAIZEN_INSTALL_DIR="${KAIZEN_INSTALL_DIR:-$HOME/.kaizen/agent}"
KAIZEN_BIN_DIR="${KAIZEN_BIN_DIR:-$HOME/.local/bin}"
KAIZEN_AUTO_LAUNCH="${KAIZEN_AUTO_LAUNCH:-1}"

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
    *)
      echo "[kaizen installer] unknown option: $1" >&2
      exit 1
      ;;
  esac
done

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

if [[ ":$PATH:" == *":$KAIZEN_BIN_DIR:"* ]]; then
  PATH_READY="yes"
else
  PATH_READY="no"
fi

echo ""
echo "kaizen installed."
echo "launcher: $KAIZEN_BIN_DIR/kaizen"

if [[ "$PATH_READY" == "no" ]]; then
  echo ""
  echo "add this to your shell profile to use 'kaizen' from anywhere:"
  echo "export PATH=\"$KAIZEN_BIN_DIR:\$PATH\""
fi

echo ""
if [[ "$KAIZEN_AUTO_LAUNCH" == "1" ]]; then
  if [[ -t 1 && -t 2 && -r /dev/tty && -w /dev/tty ]]; then
    if [[ "$HAD_CONFIG_BEFORE_INSTALL" == "no" ]]; then
      echo "[kaizen installer] launching onboarding..."
      "$KAIZEN_BIN_DIR/kaizen" onboard </dev/tty >/dev/tty 2>/dev/tty || true
    else
      echo "[kaizen installer] existing config found. skipping onboarding."
    fi

    echo "[kaizen installer] launching kaizen..."
    "$KAIZEN_BIN_DIR/kaizen" start </dev/tty >/dev/tty 2>/dev/tty || true
  else
    echo "interactive terminal not available, skipping auto-launch."
    echo "run these manually:"
    if [[ "$HAD_CONFIG_BEFORE_INSTALL" == "no" ]]; then
      echo "1) kaizen onboard"
      echo "2) kaizen start"
    else
      echo "1) kaizen start"
    fi
  fi
else
  echo "auto-launch disabled."
  echo "run these manually:"
  if [[ "$HAD_CONFIG_BEFORE_INSTALL" == "no" ]]; then
    echo "1) kaizen onboard"
    echo "2) kaizen start"
  else
    echo "1) kaizen start"
  fi
fi
