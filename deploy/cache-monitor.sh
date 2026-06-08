#!/bin/bash
# =============================================================================
# Cache Observability Monitor
# =============================================================================
# Checks Redis memory pressure, keyspace sizes, and logs warnings.
# Designed to run via cron (e.g. every 5 minutes) for pre-go-live monitoring.
#
# Usage:
#   ./cache-monitor.sh              # Full check
#   ./cache-monitor.sh --json       # JSON output (for scripted consumption)
#   ./cache-monitor.sh --quiet      # Only output on warnings/errors
#
# Cron example (every 5 minutes, log to file):
#   */5 * * * * /opt/dynamic_hub/deploy/cache-monitor.sh --quiet >> /opt/dynamic_hub/logs/cache-monitor.log 2>&1
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="${PROJECT_DIR}/.env"
LOG_PREFIX="[CACHE-MONITOR]"
ALERT_THRESHOLD="${REDIS_MEMORY_ALERT_THRESHOLD:-80}"

# Load env
if [ -f "$ENV_FILE" ]; then
  REDIS_PASSWORD="${REDIS_PASSWORD:-$(grep '^REDIS_PASSWORD=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")}"
fi

JSON_MODE=false
QUIET_MODE=false

for arg in "$@"; do
  case "$arg" in
    --json)  JSON_MODE=true ;;
    --quiet) QUIET_MODE=true ;;
  esac
done

log() {
  if [ "$QUIET_MODE" = true ]; then return; fi
  echo "$(date '+%Y-%m-%d %H:%M:%S') $LOG_PREFIX $1"
}

warn() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') $LOG_PREFIX WARNING: $1" >&2
  # Also log to PM2-style log if available
  [ -f "${PROJECT_DIR}/logs/api-error.log" ] && \
    echo "$(date '+%Y-%m-%d %H:%M:%S') $LOG_PREFIX WARNING: $1" >> "${PROJECT_DIR}/logs/api-error.log"
}

critical() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') $LOG_PREFIX CRITICAL: $1" >&2
  [ -f "${PROJECT_DIR}/logs/api-error.log" ] && \
    echo "$(date '+%Y-%m-%d %H:%M:%S') $LOG_PREFIX CRITICAL: $1" >> "${PROJECT_DIR}/logs/api-error.log"
}

get_redis_info() {
  docker exec dht-redis redis-cli -a "$REDIS_PASSWORD" "$1" 2>/dev/null
}

# ---------------------------------------------------------------------------
# 1. Redis memory check
# ---------------------------------------------------------------------------
REDIS_MEMORY_INFO=$(get_redis_info "INFO memory")
REDIS_MAXMEMORY=$(get_redis_info "CONFIG GET maxmemory" | tail -1)

if [ -z "$REDIS_MEMORY_INFO" ] || [ -z "$REDIS_MAXMEMORY" ]; then
  warn "Cannot reach Redis — skipping memory check"
  REDIS_USED_MB=0
  REDIS_LIMIT_MB=0
  REDIS_PCT=0
  FRAG_RATIO=0
  HAS_MEMORY_DATA=false
else
  HAS_MEMORY_DATA=true
  REDIS_USED_BYTES=$(echo "$REDIS_MEMORY_INFO" | grep '^used_memory:' | awk -F: '{print $2}' | tr -d '\r')
  REDIS_RSS_BYTES=$(echo "$REDIS_MEMORY_INFO" | grep '^used_memory_rss:' | awk -F: '{print $2}' | tr -d '\r')
  REDIS_USED_MB=$((REDIS_USED_BYTES / 1024 / 1024))
  REDIS_LIMIT_BYTES=$(echo "$REDIS_MAXMEMORY" | tr -d '\r')
  REDIS_LIMIT_MB=$((REDIS_LIMIT_BYTES / 1024 / 1024))
  REDIS_PCT=0
  if [ "$REDIS_LIMIT_BYTES" -gt 0 ]; then
    REDIS_PCT=$((REDIS_USED_BYTES * 100 / REDIS_LIMIT_BYTES))
  fi
  FRAG_RATIO=0
  if [ "$REDIS_USED_BYTES" -gt 0 ]; then
    FRAG_RATIO=$(echo "scale=2; $REDIS_RSS_BYTES / $REDIS_USED_BYTES" | bc 2>/dev/null || echo "0")
  fi
fi

# ---------------------------------------------------------------------------
# 2. Keyspace sampling via SCAN
# ---------------------------------------------------------------------------
KEYSPACE_CATALOG=0
KEYSPACE_PRODUCT=0
KEYSPACE_BULLMQ=0

if [ "$HAS_MEMORY_DATA" = true ]; then
  # Count catalog keys (SCAN-based, non-blocking)
  KEYSPACE_CATALOG=$(docker exec dht-redis redis-cli -a "$REDIS_PASSWORD" --scan --pattern "catalog:*" 2>/dev/null | wc -l)
  KEYSPACE_PRODUCT=$(docker exec dht-redis redis-cli -a "$REDIS_PASSWORD" --scan --pattern "product:*" 2>/dev/null | wc -l)
  KEYSPACE_BULLMQ=$(docker exec dht-redis redis-cli -a "$REDIS_PASSWORD" --scan --pattern "bull:*" 2>/dev/null | wc -l)
fi

# ---------------------------------------------------------------------------
# 3. Nginx cache stats (from access log, last 10 minutes)
# ---------------------------------------------------------------------------
NGINX_ACCESS_LOG="/var/log/nginx/access.log"
NGINX_HIT=0
NGINX_MISS=0
NGINX_BYPASS=0
NGINX_NONE=0

if [ -f "$NGINX_ACCESS_LOG" ]; then
  # Parse cache= field from custom log format (last 10 min)
  TEN_MIN_AGO=$(date -d '10 minutes ago' '+%d/%b/%Y:%H:%M' 2>/dev/null || date -v-10M '+%d/%b/%Y:%H:%M' 2>/dev/null)
  if [ -n "$TEN_MIN_AGO" ]; then
    RECENT_LOGS=$(awk -v since="$TEN_MIN_AGO" '$4 >= "[" since' "$NGINX_ACCESS_LOG" 2>/dev/null || echo "")
    NGINX_HIT=$(echo "$RECENT_LOGS" | grep -oP 'cache=HIT' | wc -l)
    NGINX_MISS=$(echo "$RECENT_LOGS" | grep -oP 'cache=MISS' | wc -l)
    NGINX_BYPASS=$(echo "$RECENT_LOGS" | grep -oP 'cache=BYPASS' | wc -l)
    NGINX_NONE=$(echo "$RECENT_LOGS" | grep -oP 'cache=NONE' | wc -l)
  fi
fi

# ---------------------------------------------------------------------------
# 4. Alerts
# ---------------------------------------------------------------------------
ALERTS=()

if [ "$REDIS_PCT" -ge 95 ]; then
  critical "Redis memory at ${REDIS_PCT}% (${REDIS_USED_MB}MB/${REDIS_LIMIT_MB}MB) — writes will fail with noeviction!"
  ALERTS+=("redis_memory_critical")
elif [ "$REDIS_PCT" -ge "$ALERT_THRESHOLD" ]; then
  warn "Redis memory at ${REDIS_PCT}% (${REDIS_USED_MB}MB/${REDIS_LIMIT_MB}MB) — above ${ALERT_THRESHOLD}% threshold"
  ALERTS+=("redis_memory_warning")
fi

if [ "$(echo "$FRAG_RATIO > 1.5" | bc 2>/dev/null)" = "1" ]; then
  warn "Redis fragmentation ratio ${FRAG_RATIO} — consider enabling activedefrag"
  ALERTS+=("redis_fragmentation")
fi

NGINX_TOTAL=$((NGINX_HIT + NGINX_MISS + NGINX_BYPASS + NGINX_NONE))
if [ "$NGINX_TOTAL" -gt 100 ]; then
  MISS_RATE=0
  if [ "$NGINX_TOTAL" -gt 0 ]; then
    MISS_RATE=$((NGINX_MISS * 100 / NGINX_TOTAL))
  fi
  if [ "$MISS_RATE" -gt 80 ]; then
    warn "Nginx cache miss rate ${MISS_RATE}% in last 10min (HIT=$NGINX_HIT MISS=$NGINX_MISS BYPASS=$NGINX_BYPASS NONE=$NGINX_NONE)"
    ALERTS+=("nginx_high_miss_rate")
  fi
fi

# ---------------------------------------------------------------------------
# 5. Output
# ---------------------------------------------------------------------------
if [ "$JSON_MODE" = true ]; then
  cat <<EOF
{
  "timestamp": "$(date -Iseconds)",
  "redis": {
    "usedMb": ${REDIS_USED_MB},
    "maxMb": ${REDIS_LIMIT_MB},
    "percentage": ${REDIS_PCT},
    "fragmentationRatio": ${FRAG_RATIO},
    "alertThreshold": ${ALERT_THRESHOLD},
    "keyspace": {
      "catalog": ${KEYSPACE_CATALOG},
      "product": ${KEYSPACE_PRODUCT},
      "bullmq": ${KEYSPACE_BULLMQ}
    }
  },
  "nginx": {
    "last10min": {
      "hit": ${NGINX_HIT},
      "miss": ${NGINX_MISS},
      "bypass": ${NGINX_BYPASS},
      "none": ${NGINX_NONE}
    }
  },
  "alerts": [$(printf '"%s",' "${ALERTS[@]}" | sed 's/,$//')]
}
EOF
else
  if [ "$QUIET_MODE" = false ]; then
    echo "=== Cache Observability Report ==="
    echo ""
    echo "Redis Memory:  ${REDIS_USED_MB}MB / ${REDIS_LIMIT_MB}MB (${REDIS_PCT}%)"
    echo "Frag Ratio:    ${FRAG_RATIO}"
    echo "Alert Thresh:  ${ALERT_THRESHOLD}%"
    echo ""
    echo "Keyspace:"
    echo "  catalog:*    ${KEYSPACE_CATALOG} keys"
    echo "  product:*    ${KEYSPACE_PRODUCT} keys"
    echo "  bull:*       ${KEYSPACE_BULLMQ} keys"
    echo ""
    echo "Nginx (last 10min):"
    echo "  HIT=${NGINX_HIT}  MISS=${NGINX_MISS}  BYPASS=${NGINX_BYPASS}  NONE=${NGINX_NONE}"
    echo ""
    if [ ${#ALERTS[@]} -eq 0 ]; then
      echo "Status: OK (no alerts)"
    else
      echo "Alerts: ${ALERTS[*]}"
    fi
  fi
fi

# Exit code: 0=healthy, 1=warning, 2=critical
if [ ${#ALERTS[@]} -eq 0 ]; then
  exit 0
fi
for alert in "${ALERTS[@]}"; do
  if [[ "$alert" == *critical* ]]; then
    exit 2
  fi
done
exit 1
