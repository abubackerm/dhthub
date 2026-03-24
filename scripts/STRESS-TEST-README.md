# Stress Testing Tools

This directory contains stress testing scripts to simulate concurrent user load on your API.

## Features

- **50 concurrent users** (configurable)
- **10 requests per user** (configurable)
- **Total: 500 concurrent requests**
- Simulates real user behavior with randomized endpoint selection
- Detailed metrics and SLA assessment
- Available in 3 formats: PowerShell, Bash, and Node.js

## What Gets Tested

The stress test simulates real user browsing behavior:

1. **Browse Products (30%)** - Paginated product listings
2. **View Product Details (20%)** - Individual product pages with variants
3. **Search Products (10%)** - Keyword search functionality
4. **Browse by Category (20%)** - Category-filtered product listings
5. **Browse Cells (20%)** - Cell catalog browsing

## Prerequisites

### PowerShell
```powershell
# Windows PowerShell 5.1+ or PowerShell Core 6+
$PSVersionTable.PSVersion
```

### Bash
```bash
# Linux/macOS with curl installed
curl --version
# Requires bc for calculations
bc --version
```

### Node.js
```bash
# Node.js 12+ (no additional dependencies needed)
node --version
```

## Usage

### Option 1: PowerShell (Windows)
```powershell
# Basic usage (default: 50 users, 10 requests each)
.\scripts\stress-test.ps1

# Custom configuration
.\scripts\stress-test.ps1 -ApiUrl "http://localhost:3000/v1" -ConcurrentUsers 100 -RequestsPerUser 20

# Test production environment
.\scripts\stress-test.ps1 -ApiUrl "https://api.yourdomain.com/v1"
```

### Option 2: Bash (Linux/macOS)
```bash
# Make executable
chmod +x scripts/stress-test.sh

# Basic usage
API_URL="http://localhost:3000/v1" ./scripts/stress-test.sh

# Or set in environment
export API_URL="http://localhost:3000/v1"
./scripts/stress-test.sh

# Custom configuration
CONCURRENT_USERS=100 REQUESTS_PER_USER=20 ./scripts/stress-test.sh
```

### Option 3: Node.js (Cross-platform)
```bash
# Basic usage
node scripts/stress-test.js

# Custom configuration
node scripts/stress-test.js --api-url "http://localhost:3000/v1" --users 100 --requests 20

# Test production
node scripts/stress-test.js --api-url "https://api.yourdomain.com/v1" --users 100
```

### Option 4: Using NPM Scripts
Add to your `package.json`:

```json
{
  "scripts": {
    "stress:test": "node scripts/stress-test.js",
    "stress:test:prod": "node scripts/stress-test.js --api-url \"https://api.yourdomain.com/v1\"",
    "stress:test:heavy": "node scripts/stress-test.js --users 100 --requests 20"
  }
}
```

Then run:
```bash
pnpm stress:test
pnpm stress:test:prod
pnpm stress:test:heavy
```

## Output Example

```
=========================================
Stress Test Configuration
=========================================
API URL: http://localhost:3000/v1
Concurrent Users: 50
Requests per User: 10
Total Requests: 500
=========================================

Starting stress test with 50 concurrent users...

User 1: GET /catalog/products?page=42 - SUCCESS - 156ms
User 2: GET /catalog/products/8473 - SUCCESS - 203ms
User 3: GET /catalog/products?search=laptop - SUCCESS - 412ms
...

=========================================
Test Results Summary
=========================================
Total Requests: 500
Successful: 485
Failed: 15
Success Rate: 97.0%
Test Duration: 12s
Requests/Second: 41.67

Response Times:
  Average: 245ms
  Min: 45ms
  Max: 1234ms

Response Time Distribution:
  <100ms: 120 (24.7%)
  100-500ms: 315 (65.0%)
  500ms-1s: 40 (8.2%)
  >1s: 10 (2.1%)

Status Code Breakdown:
  200: 485 (97.0%)
  404: 12 (2.4%)
  500: 3 (0.6%)

=========================================
SLA Assessment
=========================================
✅ Success rate meets 95% SLA
✅ Response time within acceptable range
```

## Metrics Explained

### Performance Metrics
- **Success Rate**: Percentage of successful HTTP requests (target: >95%)
- **Average Response Time**: Mean response time in milliseconds (target: <500ms)
- **Min/Max**: Fastest and slowest response times
- **Requests/Second**: Throughput calculation

### Response Time Distribution
- **<100ms**: Excellent performance
- **100-500ms**: Good performance
- **500ms-1s**: Acceptable but needs optimization
- **>1s**: Poor performance, investigate bottlenecks

### Status Code Breakdown
- **200**: Successful requests
- **404**: Not found (expected for random IDs)
- **500**: Server errors (investigate!)
- **Other**: Check logs for details

## SLA Thresholds

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Success Rate | >95% | 90-95% | <90% |
| Average Response Time | <500ms | 500-1000ms | >1000ms |
| Error Rate | <5% | 5-10% | >10% |

## Troubleshooting

### High Failure Rate (>5%)
1. **Check database connections**
   ```sql
   -- Check active connections
   SELECT count(*) FROM pg_stat_activity WHERE datname = 'your_database';
   ```

2. **Review database connection pool settings**
   - Check `DATABASE_URL` connection string
   - Verify pool size in `prisma-client.ts`

3. **Check server resources**
   ```bash
   # CPU/Memory usage
   top
   ```

4. **Review application logs**
   ```bash
   # API logs
   tail -f apps/api/logs/error.log
   ```

### Slow Response Times (>500ms)
1. **Profile database queries**
   ```sql
   -- Enable slow query log
   ALTER DATABASE your_database SET log_min_duration_statement = 100;
   ```

2. **Check for missing indexes**
   ```sql
   EXPLAIN ANALYZE SELECT * FROM products WHERE category_id = 1;
   ```

3. **Add caching** (Redis)
   ```typescript
   // Cache product listings
   await redis.setex(`products:page:${page}`, 300, JSON.stringify(products));
   ```

4. **Optimize N+1 queries**
   - Use `include` in Prisma queries
   - Batch loading with DataLoader pattern

### High Memory Usage
1. **Check for memory leaks**
   ```bash
   # Node.js heap snapshot
   node --inspect-brk apps/api/dist/main.js
   ```

2. **Review worker processes**
   - Check BullMQ queue size
   - Monitor worker memory usage

3. **Optimize data fetching**
   - Limit result sets
   - Use pagination properly

## Advanced Testing

### Custom Test Scenarios

Create a custom test script:

```javascript
// scripts/custom-test.js
const { runUserSession } = require('./stress-test.js');

async function customScenario() {
  // Test specific endpoint heavily
  for (let i = 0; i < 100; i++) {
    await makeRequest('http://localhost:3000/v1/catalog/products?page=' + i);
  }
}

customScenario();
```

### Load Testing with Artillery

For more advanced load testing, install Artillery:

```bash
npm install -g artillery
```

Create `artillery-config.yml`:
```yaml
config:
  target: "http://localhost:3000/v1"
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Ramp up"
scenarios:
  - name: "Browse Products"
    flow:
      - get:
          url: "/catalog/products"
```

Run:
```bash
artillery run artillery-config.yml
```

## Monitoring During Tests

### Database Monitoring
```sql
-- Active queries
SELECT pid, query, state, wait_event_type 
FROM pg_stat_activity 
WHERE datname = 'your_database';

-- Connection pool stats
SELECT count(*) as active_connections 
FROM pg_stat_activity 
WHERE state = 'active';
```

### API Server Monitoring
```bash
# Watch API logs
tail -f apps/api/logs/combined.log | grep "ERROR\|WARN"

# Monitor memory
watch -n 1 'ps aux | grep "node.*api"'
```

### Redis Monitoring (if using)
```bash
# Redis CLI
redis-cli INFO stats
redis-cli INFO memory
```

## Best Practices

1. **Start small**: Begin with 10 users, gradually increase
2. **Monitor continuously**: Watch logs during the test
3. **Test in staging first**: Never test directly on production
4. **Document results**: Save test outputs for comparison
5. **Test peak loads**: Simulate your expected traffic peak
6. **Include ramp-up**: Gradually increase load (simulate real traffic patterns)
7. **Test recovery**: See how the system recovers after the test

## When to Run Stress Tests

- **Before major releases**: Ensure new features don't degrade performance
- **After database migrations**: Validate query performance
- **When adding new features**: Test impact on existing endpoints
- **Regular intervals**: Weekly or monthly health checks
- **After infrastructure changes**: Verify scaling improvements

## Next Steps

If stress tests reveal issues:

1. **Add database indexes** for slow queries
2. **Implement Redis caching** for frequently accessed data
3. **Optimize API responses** (reduce payload size)
4. **Scale infrastructure** (add more instances)
5. **Implement rate limiting** to protect against abuse
6. **Add CDN** for static assets and images
7. **Use connection pooling** efficiently

## Support

For issues or questions:
- Check API logs: `apps/api/logs/`
- Check database logs: PostgreSQL log directory
- Review test logs: `/tmp/stress_test_user_*.log` (Linux) or `$env:TEMP\stress_test_user_*.log` (Windows)
