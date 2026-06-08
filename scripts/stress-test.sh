#!/bin/bash

# Stress Test Script - 50 Concurrent Users
# Tests product catalog, search, and variant loading

API_URL="${API_URL:-http://localhost:3000/v1}"
CONCURRENT_USERS=50
REQUESTS_PER_USER=10
TOTAL_REQUESTS=$((CONCURRENT_USERS * REQUESTS_PER_USER))

echo "========================================="
echo "Stress Test Configuration"
echo "========================================="
echo "API URL: $API_URL"
echo "Concurrent Users: $CONCURRENT_USERS"
echo "Requests per User: $REQUESTS_PER_USER"
echo "Total Requests: $TOTAL_REQUESTS"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to run a single user session
run_user_session() {
  local user_id=$1
  local results_file="/tmp/stress_test_user_${user_id}.log"
  
  echo "User $user_id starting session..." > "$results_file"
  
  for i in $(seq 1 $REQUESTS_PER_USER); do
    local start_time=$(date +%s%N)
    local endpoint=""
    local url=""
    
    # Randomly choose endpoint to test (simulates real user behavior)
    local rand=$((RANDOM % 10))
    
    case $rand in
      0|1|2) # 30% - Browse products (paginated)
        local page=$((RANDOM % 100 + 1))
        endpoint="GET /catalog/products?page=$page"
        url="${API_URL}/catalog/products?page=$page"
        ;;
      3|4) # 20% - View product details
        local product_id=$((RANDOM % 10000 + 1))
        endpoint="GET /catalog/products/$product_id"
        url="${API_URL}/catalog/products/$product_id"
        ;;
      5) # 10% - Search products
        local search_terms=("phone" "laptop" "camera" "watch" "headphones" "tablet")
        local search="${search_terms[$((RANDOM % 6))]}"
        endpoint="GET /catalog/products?search=$search"
        url="${API_URL}/catalog/products?search=$search"
        ;;
      6|7) # 20% - Browse by category
        local category_id=$((RANDOM % 50 + 1))
        endpoint="GET /catalog/products?categoryId=$category_id"
        url="${API_URL}/catalog/products?categoryId=$category_id"
        ;;
      8|9) # 20% - Browse cells
        endpoint="GET /catalog/cells"
        url="${API_URL}/catalog/cells"
        ;;
    esac
    
    # Make request
    local response=$(curl -s -w "\n%{http_code}" -o "/tmp/response_${user_id}_${i}.json" "$url" 2>&1)
    local http_code=$(echo "$response" | tail -n1)
    local end_time=$(date +%s%N)
    local duration=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds
    
    # Log result
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local status="SUCCESS"
    if [ "$http_code" -ne 200 ] && [ "$http_code" -ne 404 ]; then
      status="FAILED"
      echo -e "${RED}User $user_id: $endpoint - $status (HTTP $http_code) - ${duration}ms${NC}"
    else
      echo -e "${GREEN}User $user_id: $endpoint - $status - ${duration}ms${NC}"
    fi
    
    echo "$timestamp|$endpoint|$status|$http_code|${duration}ms" >> "$results_file"
    
    # Small random delay between requests (simulates real user think time)
    sleep 0.$((RANDOM % 5))
  done
  
  echo "User $user_id session completed" >> "$results_file"
}

# Run all users in parallel
echo "Starting stress test with $CONCURRENT_USERS concurrent users..."
echo ""

# Start all user sessions in background
for i in $(seq 1 $CONCURRENT_USERS); do
  run_user_session $i &
done

# Wait for all sessions to complete
wait

echo ""
echo "========================================="
echo "Stress Test Complete"
echo "========================================="
echo ""

# Aggregate results
echo "Aggregating results..."

local total_requests=0
local success_requests=0
local failed_requests=0
local total_time=0
local max_time=0
local min_time=999999

for i in $(seq 1 $CONCURRENT_USERS); do
  local results_file="/tmp/stress_test_user_${i}.log"
  if [ -f "$results_file" ]; then
    while IFS='|' read -r timestamp endpoint status code time; do
      # Skip header/sessions lines
      if [[ ! $status =~ ^(SUCCESS|FAILED)$ ]]; then
        continue
      fi
      
      total_requests=$((total_requests + 1))
      
      local time_ms=$(echo $time | sed 's/ms//')
      
      if [ "$status" == "SUCCESS" ]; then
        success_requests=$((success_requests + 1))
        total_time=$((total_time + time_ms))
        
        if [ $time_ms -gt $max_time ]; then
          max_time=$time_ms
        fi
        
        if [ $time_ms -lt $min_time ]; then
          min_time=$time_ms
        fi
      else
        failed_requests=$((failed_requests + 1))
      fi
    done < "$results_file"
  fi
done

# Calculate averages
if [ $success_requests -gt 0 ]; then
  local avg_time=$((total_time / success_requests))
else
  local avg_time=0
fi

local success_rate=$(echo "scale=2; $success_requests * 100 / $total_requests" | bc)

echo "========================================="
echo "Test Results Summary"
echo "========================================="
echo "Total Requests: $total_requests"
echo "Successful: $success_requests"
echo "Failed: $failed_requests"
echo "Success Rate: ${success_rate}%"
echo ""
echo "Response Times:"
echo "  Average: ${avg_time}ms"
echo "  Min: ${min_time}ms"
echo "  Max: ${max_time}ms"
echo ""

# Check for SLA breaches
if [ $(echo "$success_rate < 95" | bc) -eq 1 ]; then
  echo -e "${RED}❌ SLA BREACH: Success rate below 95%${NC}"
  echo "Recommendations:"
  echo "  1. Check database connection pool size"
  echo "  2. Add database indexes for slow queries"
  echo "  3. Consider caching frequently accessed data"
  echo "  4. Scale up server resources"
else
  echo -e "${GREEN}✅ Success rate meets 95% SLA${NC}"
fi

if [ $avg_time -gt 1000 ]; then
  echo -e "${YELLOW}⚠️  WARNING: Average response time > 1s${NC}"
  echo "Recommendations:"
  echo "  1. Profile slow database queries"
  echo "  2. Add Redis caching for product listings"
  echo "  3. Optimize database queries"
  echo "  4. Consider CDN for static assets"
else
  echo -e "${GREEN}✅ Response time within acceptable range${NC}"
fi

echo ""
echo "========================================="
echo "Cleanup"
echo "========================================="
read -p "Remove temporary log files? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  rm -f /tmp/stress_test_user_*.log
  rm -f /tmp/response_*.json
  echo "Cleanup complete"
fi

echo ""
echo "Detailed logs saved in /tmp/stress_test_user_*.log"
