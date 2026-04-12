#!/bin/bash
# ---------------------------------------------------------------------------
# cache-warm.sh — Bounded post-deploy cache warming
#
# Warms the most important caches after a deploy or restart:
#   1. Category tree  (Redis read-through + Nginx proxy cache)
#   2. /products      (Next.js ISR + Redis + Nginx)
#   3. Top-N priority URLs from a static list (configurable)
#
# Does NOT walk all leaf slugs — long-tail pages cold-start on first request.
#
# Usage:
#   ./deploy/cache-warm.sh                    # defaults
#   ./deploy/cache-warm.sh --top 20           # warm top 20 priority URLs
#   ./deploy/cache-warm.sh --skip-nextjs      # only warm API (Redis + Nginx)
#   ./deploy/cache-warm.sh --api-only         # alias for --skip-nextjs
#   ./deploy/cache-warm.sh --priority-list /path/to/urls.txt
#
# Environment (read from .env in project root):
#   API_URL          – base URL for the NestJS API   (default http://localhost:3001)
#   WEB_URL          – base URL for the Next.js app  (default http://localhost:3005)
#   REVALIDATION_SECRET – secret for Next.js on-demand revalidation
#   WARM_MAX_URLS    – max priority URLs to warm     (default 10)
#   WARM_TIMEOUT     – per-request timeout in seconds (default 15)
# ---------------------------------------------------------------------------

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${GREEN}[WARM]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARM]${NC} $1"; }
err()  { echo -e "${RED}[WARM]${NC} $1" >&2; }

# ---------------------------------------------------------------------------
# Defaults
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="${PROJECT_DIR}/.env"

MAX_URLS=10
TIMEOUT=15
SKIP_NEXTJS=false
PRIORITY_LIST=""

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
  case "$1" in
    --top)
      MAX_URLS="${2:-10}"
      shift 2
      ;;
    --timeout)
      TIMEOUT="${2:-15}"
      shift 2
      ;;
    --skip-nextjs|--api-only)
      SKIP_NEXTJS=true
      shift
      ;;
    --priority-list)
      PRIORITY_LIST="${2:-}"
      if [ ! -f "$PRIORITY_LIST" ]; then
        err "Priority list not found: $PRIORITY_LIST"
        exit 1
      fi
      shift 2
      ;;
    -h|--help)
      head -20 "$0" | grep '^#' | sed 's/^# \?//'
      exit 0
      ;;
    *)
      err "Unknown argument: $1"
      exit 1
      ;;
  esac
done

# ---------------------------------------------------------------------------
# Load .env
# ---------------------------------------------------------------------------
API_URL="http://localhost:3001"
WEB_URL="http://localhost:3005"
REVALIDATION_SECRET=""
WARM_MAX_URLS=""

if [ -f "$ENV_FILE" ]; then
  while IFS='=' read -r key val; do
    # Skip comments and empty lines
    [[ "$key" =~ ^#.*$ || -z "$key" ]] && continue
    # Trim whitespace
    key=$(echo "$key" | xargs)
    val=$(echo "$val" | xargs)
    # Strip surrounding quotes
    val="${val%\"}"
    val="${val#\"}"
    val="${val%\'}"
    val="${val#\'}"
    case "$key" in
      API_URL)              API_URL="$val" ;;
      WEB_URL)              WEB_URL="$val" ;;
      REVALIDATION_SECRET)  REVALIDATION_SECRET="$val" ;;
      WARM_MAX_URLS)        WARM_MAX_URLS="$val" ;;
    esac
  done < "$ENV_FILE"
fi

# Override with env vars / args
MAX_URLS="${WARM_MAX_URLS:-$MAX_URLS}"
CURL_ARGS="-sf -o /dev/null -w '%{http_code}' --max-time $TIMEOUT --compressed"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
warmed=0
failed=0

warm_url() {
  local url="$1"
  local label="${2:-$url}"
  local code

  code=$(curl $CURL_ARGS "$url" 2>/dev/null || echo "000")

  if [ "$code" = "200" ]; then
    log "  $label → $code"
    ((warmed++))
  else
    warn "  $label → $code (non-200, cache may not be populated)"
    ((failed++))
  fi
}

# ---------------------------------------------------------------------------
# 1. Warm category tree (Redis read-through)
# ---------------------------------------------------------------------------
log "Warming category tree (Redis)..."
warm_url "${API_URL}/v1/catalog/categories/tree" "GET /v1/catalog/categories/tree"

# ---------------------------------------------------------------------------
# 2. Warm /products page (Next.js ISR + triggers client-side tree fetch)
# ---------------------------------------------------------------------------
if [ "$SKIP_NEXTJS" = false ]; then
  log "Warming /products page (Next.js ISR)..."
  warm_url "${WEB_URL}/products" "GET /products"
fi

# ---------------------------------------------------------------------------
# 3. Warm top-N priority URLs
# ---------------------------------------------------------------------------
# Priority list sources (in order):
#   1. --priority-list file (one URL per line, comments with #)
#   2. deploy/cache-warm-priority.txt (repo-committed static list)
#   3. Dynamic: extract leaf slugs from the tree API and warm their filter/leaf data
# ---------------------------------------------------------------------------
warm_priority_urls() {
  local urls=()

  if [ -n "$PRIORITY_LIST" ]; then
    log "Using priority list: $PRIORITY_LIST"
    while IFS= read -r line; do
      line=$(echo "$line" | xargs)
      [[ -z "$line" || "$line" =~ ^# ]] && continue
      urls+=("$line")
    done < "$PRIORITY_LIST"
  elif [ -f "${PROJECT_DIR}/deploy/cache-warm-priority.txt" ]; then
    log "Using repo priority list: deploy/cache-warm-priority.txt"
    while IFS= read -r line; do
      line=$(echo "$line" | xargs)
      [[ -z "$line" || "$line" =~ ^# ]] && continue
      urls+=("$line")
    done < "${PROJECT_DIR}/deploy/cache-warm-priority.txt"
  else
    # Dynamic: extract leaf slugs from the tree and warm the top-level categories
    log "No static priority list found — warming top-level category endpoints from tree..."
    local tree_json
    tree_json=$(curl -sf --max-time "$TIMEOUT" "${API_URL}/v1/catalog/categories/tree?maxDepth=1" 2>/dev/null || echo "[]")

    if [ "$tree_json" != "[]" ] && [ -n "$tree_json" ]; then
      # Extract slug from each top-level category using python3 (available on Ubuntu)
      local slugs
      slugs=$(echo "$tree_json" | python3 -c "
import sys, json
tree = json.load(sys.stdin)
for cat in tree:
    slug = cat.get('slug', '')
    has_children = cat.get('hasChildren', len(cat.get('children', [])) > 0)
    # For branch categories, warm consolidated data; for leaves, warm leaf data
    if slug:
        print(f'branch:{slug}' if has_children else f'leaf:{slug}')
" 2>/dev/null || true)

      while IFS= read -r entry; do
        [[ -z "$entry" ]] && continue
        if [[ "$entry" == branch:* ]]; then
          slug="${entry#branch:}"
          urls+=("${API_URL}/v1/catalog/categories/${slug}/consolidated-leaf-data")
        else
          slug="${entry#leaf:}"
          urls+=("${API_URL}/v1/catalog/categories/${slug}/leaf-data")
          urls+=("${API_URL}/v1/catalog/categories/${slug}/filter-data")
        fi
      done <<< "$slugs"
    else
      warn "Could not fetch category tree for dynamic priority URLs"
    fi
  fi

  # Cap to MAX_URLS
  if [ ${#urls[@]} -gt "$MAX_URLS" ]; then
    log "Capping to $MAX_URLS of ${#urls[@]} priority URLs"
    urls=("${urls[@]:0:$MAX_URLS}")
  fi

  if [ ${#urls[@]} -eq 0 ]; then
    warn "No priority URLs to warm"
    return
  fi

  log "Warming ${#urls[@]} priority URLs (max $MAX_URLS)..."
  for url in "${urls[@]}"; do
    warm_url "$url"
  done
}

warm_priority_urls

# ---------------------------------------------------------------------------
# 4. Trigger Next.js on-demand revalidation for ISR tags (if secret available)
# ---------------------------------------------------------------------------
if [ "$SKIP_NEXTJS" = false ] && [ -n "$REVALIDATION_SECRET" ]; then
  log "Triggering Next.js revalidation for 'catalog' tag..."

  reval_code=$(curl -sf -o /dev/null -w '%{http_code}' \
    --max-time "$TIMEOUT" \
    -X POST "${WEB_URL}/api/revalidate" \
    -H "Content-Type: application/json" \
    -H "x-revalidation-secret: ${REVALIDATION_SECRET}" \
    -d '{"tag":"catalog"}' 2>/dev/null || echo "000")

  if [ "$reval_code" = "200" ]; then
    log "  Revalidation 'catalog' → $reval_code"
  else
    warn "  Revalidation 'catalog' → $reval_code (may need REVALIDATION_SECRET in .env)"
  fi

  # Also revalidate 'product' tag for any product pages that may be cached
  log "Triggering Next.js revalidation for 'product' tag..."

  reval_code=$(curl -sf -o /dev/null -w '%{http_code}' \
    --max-time "$TIMEOUT" \
    -X POST "${WEB_URL}/api/revalidate" \
    -H "Content-Type: application/json" \
    -H "x-revalidation-secret: ${REVALIDATION_SECRET}" \
    -d '{"tag":"product"}' 2>/dev/null || echo "000")

  if [ "$reval_code" = "200" ]; then
    log "  Revalidation 'product' → $reval_code"
  else
    warn "  Revalidation 'product' → $reval_code"
  fi
elif [ "$SKIP_NEXTJS" = false ]; then
  warn "REVALIDATION_SECRET not set — skipping Next.js tag revalidation"
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
log "Cache warming complete: ${warmed} warmed, ${failed} failed"
if [ "$failed" -gt 0 ]; then
  exit 1
fi
