#!/bin/sh
set -eu

# ──────────────────────────────────────────────────────────────
# Drone CI Secret Setup for Kanopy Deployments
# Installs Drone CLI (if missing), then configures all 4 required
# secrets: staging_kubernetes_token, prod_kubernetes_token,
# ecr_access_key, ecr_secret_key.
# ──────────────────────────────────────────────────────────────

NAMESPACE="industrysolutions"
DRONE_SERVER_URL="https://drone.corp.mongodb.com"

# ── Colors ───────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
fail()  { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ── 1. Install Drone CLI if not present ──────────────────────
install_drone_cli() {
  if command -v drone &>/dev/null; then
    ok "Drone CLI already installed: $(drone --version 2>&1 || true)"
    return
  fi

  info "Drone CLI not found — installing via Homebrew..."
  if ! command -v brew &>/dev/null; then
    fail "Homebrew not found. Install it first: https://brew.sh"
  fi
  brew install drone-cli
  command -v drone &>/dev/null || fail "Drone CLI installation failed."
  ok "Drone CLI installed: $(drone --version 2>&1 || true)"
}

# ── 2. Configure Drone credentials ──────────────────────────
configure_drone_token() {
  export DRONE_SERVER="$DRONE_SERVER_URL"

  if [ -z "${DRONE_TOKEN:-}" ]; then
    echo ""
    warn "DRONE_TOKEN is not set."
    echo "  1. Open https://drone.corp.mongodb.com/account"
    echo "  2. Copy your personal token"
    echo ""
    printf "Paste your Drone token: "
    read -r DRONE_TOKEN
    [ -z "$DRONE_TOKEN" ] && fail "Token cannot be empty."
  fi
  export DRONE_TOKEN
  ok "Drone credentials configured (server: $DRONE_SERVER)"
}

# ── 3. Determine repo name ──────────────────────────────────
resolve_repo() {
  # Try to detect from git remote
  local remote_url
  remote_url=$(git remote get-url origin 2>/dev/null || true)

  local detected_repo=""
  detected_repo=$(echo "$remote_url" | sed -n 's|.*github\.com[:/]\(.*\)\.git$|\1|p')
  if [ -z "$detected_repo" ]; then
    detected_repo=$(echo "$remote_url" | sed -n 's|.*github\.com[:/]\(.*\)$|\1|p')
  fi

  echo ""
  if [ -n "$detected_repo" ]; then
    info "Detected repo from git remote: ${CYAN}${detected_repo}${NC}"
    printf "Use this repo? [Y/n]: "
    read -r confirm
    if [ "$confirm" != "n" ] && [ "$confirm" != "N" ]; then
      REPO="$detected_repo"
      return
    fi
  fi

  echo "  The repo must match what's activated in Drone."
  echo "  Format: mongodb-industry-solutions/<repo-name>"
  echo "  Example: mongodb-industry-solutions/leaf-financial-demo"
  echo ""
  printf "Enter the full Drone repo path: "
  read -r REPO
  [ -z "$REPO" ] && fail "Repo cannot be empty."
}

# ── 4. Verify prerequisites ─────────────────────────────────
check_kubectl() {
  command -v kubectl &>/dev/null || fail "kubectl not found. Install it first."
  ok "kubectl found"
}

# ── 5. Set secrets ───────────────────────────────────────────
set_secret() {
  local name="$1" value="$2"
  info "Setting secret: ${name}"
  drone secret update --repository "$REPO" --name "$name" --data "$value" 2>/dev/null \
    || drone secret add --repository "$REPO" --name "$name" --data "$value"
  ok "Secret '${name}' configured"
}

setup_secrets() {
  echo ""
  info "─── Staging kubernetes token ───"
  kubectl config use-context api.staging.corp.mongodb.com
  kubectl config set-context --current --namespace="$NAMESPACE"
  local staging_token
  staging_token=$(kubectl get secret kanopy-cicd-token -o jsonpath='{.data.token}' | base64 --decode)
  set_secret "staging_kubernetes_token" "$staging_token"

  echo ""
  info "─── Production kubernetes token ───"
  kubectl config use-context api.prod.corp.mongodb.com
  kubectl config set-context --current --namespace="$NAMESPACE"
  local prod_token
  prod_token=$(kubectl get secret kanopy-cicd-token -o jsonpath='{.data.token}' | base64 --decode)
  set_secret "prod_kubernetes_token" "$prod_token"

  echo ""
  info "─── ECR credentials (from prod context) ───"
  local ecr_access ecr_secret
  ecr_access=$(kubectl get secret ecr -o jsonpath='{.data.ecr_access_key}' | base64 --decode)
  ecr_secret=$(kubectl get secret ecr -o jsonpath='{.data.ecr_secret_key}' | base64 --decode)
  set_secret "ecr_access_key" "$ecr_access"
  set_secret "ecr_secret_key" "$ecr_secret"
}

# ── Main ─────────────────────────────────────────────────────
main() {
  echo ""
  echo -e "${CYAN}╔══════════════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║   Drone CI Secret Setup — Kanopy Deployments    ║${NC}"
  echo -e "${CYAN}╚══════════════════════════════════════════════════╝${NC}"
  echo ""

  install_drone_cli
  configure_drone_token
  check_kubectl
  resolve_repo

  echo ""
  info "Repo:      ${CYAN}${REPO}${NC}"
  info "Namespace: ${CYAN}${NAMESPACE}${NC}"
  info "Drone:     ${CYAN}${DRONE_SERVER}${NC}"
  echo ""
  printf "Proceed with secret setup? [Y/n]: "
  read -r go
  [ "$go" = "n" ] || [ "$go" = "N" ] && { info "Aborted."; exit 0; }

  setup_secrets

  echo ""
  echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║   All 4 Drone secrets configured successfully   ║${NC}"
  echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "  Secrets set for: ${CYAN}${REPO}${NC}"
  echo -e "    • staging_kubernetes_token"
  echo -e "    • prod_kubernetes_token"
  echo -e "    • ecr_access_key"
  echo -e "    • ecr_secret_key"
  echo ""
  echo -e "  Next: push to ${CYAN}staging${NC} branch to trigger a staging build."
  echo -e "  Drone UI: ${CYAN}https://drone.corp.mongodb.com/${REPO}${NC}"
  echo ""
}

main "$@"
