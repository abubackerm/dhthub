#!/bin/bash
set -euo pipefail

GREEN='\033[0;32m'
NC='\033[0m'

log() { echo -e "${GREEN}[DEPLOY]${NC} $1"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

log "Pulling latest code..."
git pull origin main

log "Installing dependencies..."
pnpm install --frozen-lockfile 2>&1 | tail -3

log "Building all apps..."
pnpm build 2>&1 | tail -10

log "Regenerating Prisma client..."
pnpm --filter api db:generate 2>&1 | tail -3

log "Running database migrations..."
pnpm --filter api db:migrate:deploy 2>&1 | tail -3

log "Restarting PM2 apps..."
pm2 restart all

log "Deployment complete!"
pm2 status
