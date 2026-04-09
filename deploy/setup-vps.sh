#!/bin/bash
set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[SETUP]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

if [[ "$(pwd)" != "$PROJECT_DIR" ]]; then
  err "Please run this script from $PROJECT_DIR"
fi

# ─────────────────────────────────────────────
# Phase 1: System Dependencies
# ─────────────────────────────────────────────
log "Phase 1: Installing system dependencies..."

sudo apt-get update -qq
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y -qq
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
  curl git build-essential nginx certbot python3-certbot-nginx \
  software-properties-common apt-transport-https ca-certificates \
  gnupg lsb-release ufw jq

# ─────────────────────────────────────────────
# Phase 2: Docker
# ─────────────────────────────────────────────
log "Phase 2: Installing Docker CE..."

if ! command -v docker &>/dev/null; then
  # Add Docker official GPG key
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg 2>/dev/null
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
  sudo usermod -aG docker "$(whoami)"
  log "Docker installed. Added $(whoami) to docker group."
else
  log "Docker already installed, skipping."
fi

# ─────────────────────────────────────────────
# Phase 3: Node.js 24 LTS + pnpm + PM2
# ─────────────────────────────────────────────
log "Phase 3: Installing Node.js, pnpm, and PM2..."

if ! command -v node &>/dev/null || [[ "$(node -v)" != "v24"* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash - 2>/dev/null
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq nodejs
  log "Node.js $(node -v) installed."
else
  log "Node.js $(node -v) already installed, skipping."
fi

# Enable corepack for pnpm
sudo corepack enable
sudo corepack prepare pnpm@9 --activate 2>/dev/null || true
log "pnpm $(pnpm -v) ready."

if ! command -v pm2 &>/dev/null; then
  sudo npm install -g pm2
  log "PM2 $(pm2 -v | head -1) installed."
else
  log "PM2 already installed, skipping."
fi

# ─────────────────────────────────────────────
# Phase 4: Firewall
# ─────────────────────────────────────────────
log "Phase 4: Configuring firewall (UFW)..."

sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw --force enable
log "Firewall configured: SSH(22), HTTP(80), HTTPS(443)."

# ─────────────────────────────────────────────
# Phase 5: Environment
# ─────────────────────────────────────────────
log "Phase 5: Setting up environment..."

if [[ ! -f "$PROJECT_DIR/.env" ]]; then
  cp "$SCRIPT_DIR/.env.production" "$PROJECT_DIR/.env"
  warn "Production .env created from template."
  warn "IMPORTANT: Edit $PROJECT_DIR/.env and set all CHANGE_ME_* values before continuing!"
  warn "Then re-run this script to continue setup."
  exit 0
else
  log ".env already exists, skipping template copy."
fi

# Verify no placeholder values remain
if grep -q 'CHANGE_ME' "$PROJECT_DIR/.env"; then
  err "Found CHANGE_ME_* placeholders in .env. Please edit $PROJECT_DIR/.env with real values first."
fi

log "Environment configured."

# ─────────────────────────────────────────────
# Phase 6: Docker Infrastructure
# ─────────────────────────────────────────────
log "Phase 6: Starting Docker infrastructure..."

# Source env for docker-compose variable substitution
set -a; source "$PROJECT_DIR/.env"; set +a

docker network create dht-hub-network 2>/dev/null || true
docker compose -f "$SCRIPT_DIR/docker-compose.infra.yml" up -d

log "Waiting for infrastructure containers to become healthy..."
timeout 120 bash -c '
  until docker compose -f "'"$SCRIPT_DIR"'/docker-compose.infra.yml" ps --format json 2>/dev/null | jq -r ".Health // empty" | grep -qv "unhealthy\|starting"; do
    echo "  Waiting..."; sleep 5
  done
' || warn "Some containers may not be fully healthy yet — check with: docker compose ps"

log "Docker infrastructure started."

# ─────────────────────────────────────────────
# Phase 7: Install & Build
# ─────────────────────────────────────────────
log "Phase 7: Installing dependencies and building..."

cd "$PROJECT_DIR"
pnpm install --frozen-lockfile 2>&1 | tail -3

# Build all apps via turbo
pnpm build 2>&1 | tail -10

log "Build complete."

# ─────────────────────────────────────────────
# Phase 8: Database
# ─────────────────────────────────────────────
log "Phase 8: Running database migrations..."

pnpm --filter api db:generate 2>&1 | tail -3
pnpm --filter api db:migrate:deploy 2>&1 | tail -3

log "Database migrations applied."

# ─────────────────────────────────────────────
# Phase 9: PM2 Apps
# ─────────────────────────────────────────────
log "Phase 9: Starting PM2 applications..."

mkdir -p "$PROJECT_DIR/logs"
pm2 delete all 2>/dev/null || true
pm2 start "$SCRIPT_DIR/ecosystem.config.js"
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u "$(whoami)" --hp "/home/$(whoami)" 2>/dev/null || true

log "PM2 apps started: api, web, workers"

# ─────────────────────────────────────────────
# Phase 10: Nginx
# ─────────────────────────────────────────────
log "Phase 10: Configuring Nginx..."

sudo mkdir -p /var/www/html
sudo cp "$SCRIPT_DIR/nginx/default.conf" /etc/nginx/sites-available/default
sudo nginx -t && sudo systemctl reload nginx

log "Nginx configured (HTTP only — SSL will be set up after DNS is pointing here)."

# ─────────────────────────────────────────────
# Phase 11: Verify
# ─────────────────────────────────────────────
log "Phase 11: Verifying services..."

sleep 3

# Check API
if curl -sf http://localhost:3001/v1/health > /dev/null 2>&1; then
  log "API: OK (http://localhost:3001)"
else
  warn "API: Not responding yet — check: pm2 logs api"
fi

# Check Web
if curl -sf http://localhost:3005 > /dev/null 2>&1; then
  log "Web: OK (http://localhost:3005)"
else
  warn "Web: Not responding yet — check: pm2 logs web"
fi

# Check Docker services
for svc in dht-postgres dht-redis dht-meilisearch; do
  if docker ps --format '{{.Names}}' | grep -q "$svc"; then
    log "$svc: Running"
  else
    warn "$svc: Not running"
  fi
done

echo ""
echo "=========================================="
log "VPS Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Ensure DNS A records point www.verdeum.in and verdeum.in to this server IP"
echo "  2. Run SSL setup: sudo certbot --nginx -d www.verdeum.in -d verdeum.in"
echo "  3. Verify: curl https://www.verdeum.in"
echo ""
echo "Useful commands:"
echo "  pm2 logs          # View all logs"
echo "  pm2 monit         # Live monitoring"
echo "  pm2 restart all   # Restart all apps"
echo "  docker compose ps # Check infrastructure"
echo ""
