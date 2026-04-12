#!/bin/bash
set -euo pipefail

GREEN='\033[0;32m'
NC='\033[0m'

log() { echo -e "${GREEN}[DEPLOY]${NC} $1"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

log "Pulling latest code..."
git pull origin master

log "Installing dependencies..."
pnpm install --frozen-lockfile 2>&1 | tail -3

log "Building all apps..."
pnpm build 2>&1 | tail -10

log "Regenerating Prisma client..."
pnpm --filter api db:generate 2>&1 | tail -3

log "Pushing database schema (db push)..."
pnpm --filter api db:push 2>&1 | tail -5

log "Restarting PM2 apps (zero-downtime reload for cluster)..."
pm2 reload all || pm2 restart all

# Wait for API to be ready, then warm caches
log "Waiting for API to be ready..."
for i in $(seq 1 12); do
  if curl -sf http://localhost:3001/v1/health > /dev/null 2>&1; then
    log "API is ready"
    break
  fi
  if [ "$i" -eq 12 ]; then
    log "WARNING: API did not become ready in 60s — skipping cache warming"
  else
    sleep 5
  fi
done

if curl -sf http://localhost:3001/v1/health > /dev/null 2>&1; then
  log "Warming caches (tree + /products + priority URLs)..."
  bash "$SCRIPT_DIR/cache-warm.sh" 2>&1 | sed 's/^/  /' || log "Cache warming had failures (non-blocking)"
fi

# Verify Redis memory is within budget
REDIS_MAXMEMORY="${REDIS_MAXMEMORY:-1gb}"
REDIS_USED_MB=$(docker exec dht-redis redis-cli -a "$REDIS_PASSWORD" INFO memory 2>/dev/null | grep '^used_memory:' | awk -F: '{print int($2/1024/1024)}')
REDIS_LIMIT_MB=$(docker exec dht-redis redis-cli -a "$REDIS_PASSWORD" CONFIG GET maxmemory 2>/dev/null | tail -1 | awk '{printf "%.0f", $1/1024/1024}')
if [ -n "$REDIS_USED_MB" ] && [ -n "$REDIS_LIMIT_MB" ]; then
  log "Redis memory: ${REDIS_USED_MB}MB / ${REDIS_LIMIT_MB}MB limit"
  REDIS_PCT=$((REDIS_USED_MB * 100 / REDIS_LIMIT_MB))
  if [ "$REDIS_PCT" -ge 95 ]; then
    log "CRITICAL: Redis memory at ${REDIS_PCT}% — writes may fail with noeviction policy!"
  elif [ "$REDIS_PCT" -ge 80 ]; then
    log "WARNING: Redis memory at ${REDIS_PCT}% — approaching alert threshold"
  fi
fi

# Verify API health
sleep 3
HEALTH_STATUS=$(curl -sf http://localhost:3001/v1/health 2>/dev/null || echo '{"status":"unreachable"}')
HEALTH_CACHE_STATUS=$(echo "$HEALTH_STATUS" | python3 -c "import sys,json; print(json.load(sys.stdin).get('cache',{}).get('status','unknown'))" 2>/dev/null || echo "unknown")
if [ "$HEALTH_CACHE_STATUS" = "healthy" ]; then
  log "Cache health: OK"
elif [ "$HEALTH_CACHE_STATUS" = "warning" ]; then
  log "WARNING: Cache health check returned warnings — check logs"
  CACHE_WARNINGS=$(echo "$HEALTH_STATUS" | python3 -c "import sys,json; [print(f'  - {w}') for w in json.load(sys.stdin).get('cache',{}).get('warnings',[])]" 2>/dev/null)
  [ -n "$CACHE_WARNINGS" ] && echo "$CACHE_WARNINGS"
elif [ "$HEALTH_CACHE_STATUS" = "critical" ]; then
  log "CRITICAL: Cache health check failed — immediate attention needed!"
else
  log "Health endpoint not reachable — API may still be starting up"
fi

log "Deployment complete!"
pm2 status
