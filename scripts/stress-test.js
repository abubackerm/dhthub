/**
 * Stress Test Script - 50 Concurrent Users
 * Tests product catalog, search, and variant loading
 * 
 * Usage: node scripts/stress-test.js [options]
 * Options:
 *   --api-url <url>     API base URL (default: http://localhost:3000/v1)
 *   --users <number>    Concurrent users (default: 50)
 *   --requests <number> Requests per user (default: 10)
 */

const http = require('http');

// Parse command line arguments
const args = process.argv.slice(2);
const config = {
  apiUrl: 'http://localhost:3000/v1',
  concurrentUsers: 50,
  requestsPerUser: 10
};

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--api-url' && args[i + 1]) {
    config.apiUrl = args[i + 1];
    i++;
  } else if (args[i] === '--users' && args[i + 1]) {
    config.concurrentUsers = parseInt(args[i + 1]);
    i++;
  } else if (args[i] === '--requests' && args[i + 1]) {
    config.requestsPerUser = parseInt(args[i + 1]);
    i++;
  }
}

const totalRequests = config.concurrentUsers * config.requestsPerUser;

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m'
};

console.log(`${colors.cyan}=========================================${colors.reset}`);
console.log(`${colors.cyan}Stress Test Configuration${colors.reset}`);
console.log(`${colors.cyan}=========================================${colors.reset}`);
console.log(`API URL: ${config.apiUrl}`);
console.log(`Concurrent Users: ${config.concurrentUsers}`);
console.log(`Requests per User: ${config.requestsPerUser}`);
console.log(`Total Requests: ${totalRequests}`);
console.log(`${colors.cyan}=========================================${colors.reset}`);
console.log('');

// Results storage
const results = {
  totalRequests: 0,
  successful: 0,
  failed: 0,
  totalTime: 0,
  maxTime: 0,
  minTime: Infinity,
  errors: {},
  statusCodeCounts: {},
  responseTimeDistribution: {
    '<100ms': 0,
    '100-500ms': 0,
    '500ms-1s': 0,
    '>1s': 0
  }
};

// Search terms for testing
const searchTerms = ['phone', 'laptop', 'camera', 'watch', 'headphones', 'tablet'];

// Function to make HTTP request
function makeRequest(url, userId, requestId) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const req = http.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const duration = Date.now() - startTime;
        resolve({
          userId,
          requestId,
          url,
          statusCode: res.statusCode,
          duration,
          success: res.statusCode >= 200 && res.statusCode < 300,
          dataLength: data.length
        });
      });
    });
    
    req.on('error', (error) => {
      const duration = Date.now() - startTime;
      resolve({
        userId,
        requestId,
        url,
        statusCode: 0,
        duration,
        success: false,
        error: error.message
      });
    });
    
    req.setTimeout(30000, () => {
      req.destroy();
      const duration = Date.now() - startTime;
      resolve({
        userId,
        requestId,
        url,
        statusCode: 0,
        duration,
        success: false,
        error: 'Timeout'
      });
    });
  });
}

// Function to run a single user session
async function runUserSession(userId) {
  const userResults = {
    userId,
    totalRequests: 0,
    successful: 0,
    failed: 0,
    totalTime: 0,
    maxTime: 0,
    minTime: Infinity
  };
  
  const sessionResults = [];
  
  for (let i = 1; i <= config.requestsPerUser; i++) {
    const rand = Math.floor(Math.random() * 10);
    let endpoint = '';
    let url = '';
    
    // Randomly choose endpoint to test (simulates real user behavior)
    switch (rand) {
      case 0:
      case 1:
      case 2: // 30% - Browse products (paginated)
        const page = Math.floor(Math.random() * 100) + 1;
        endpoint = `GET /catalog/products?page=${page}`;
        url = `${config.apiUrl}/catalog/products?page=${page}`;
        break;
      case 3:
      case 4: // 20% - View product details
        const productId = Math.floor(Math.random() * 10000) + 1;
        endpoint = `GET /catalog/products/${productId}`;
        url = `${config.apiUrl}/catalog/products/${productId}`;
        break;
      case 5: // 10% - Search products
        const search = searchTerms[Math.floor(Math.random() * searchTerms.length)];
        endpoint = `GET /catalog/products?search=${search}`;
        url = `${config.apiUrl}/catalog/products?search=${search}`;
        break;
      case 6:
      case 7: // 20% - Browse by category
        const categoryId = Math.floor(Math.random() * 50) + 1;
        endpoint = `GET /catalog/products?categoryId=${categoryId}`;
        url = `${config.apiUrl}/catalog/products?categoryId=${categoryId}`;
        break;
      case 8:
      case 9: // 20% - Browse cells
        endpoint = 'GET /catalog/cells';
        url = `${config.apiUrl}/catalog/cells`;
        break;
    }
    
    const result = await makeRequest(url, userId, i);
    sessionResults.push(result);
    
    userResults.totalRequests++;
    
    if (result.success) {
      userResults.successful++;
      userResults.totalTime += result.duration;
      
      if (result.duration > userResults.maxTime) {
        userResults.maxTime = result.duration;
      }
      
      if (result.duration < userResults.minTime) {
        userResults.minTime = result.duration;
      }
      
      console.log(`${colors.green}User ${userId}: ${endpoint} - SUCCESS - ${result.duration}ms${colors.reset}`);
    } else {
      userResults.failed++;
      console.log(`${colors.red}User ${userId}: ${endpoint} - FAILED (HTTP ${result.statusCode}) - ${result.duration}ms${colors.reset}`);
      
      // Track errors
      const errorKey = result.error || `HTTP ${result.statusCode}`;
      results.errors[errorKey] = (results.errors[errorKey] || 0) + 1;
    }
    
    // Track status codes
    results.statusCodeCounts[result.statusCode] = (results.statusCodeCounts[result.statusCode] || 0) + 1;
    
    // Track response time distribution
    if (result.success) {
      if (result.duration < 100) {
        results.responseTimeDistribution['<100ms']++;
      } else if (result.duration < 500) {
        results.responseTimeDistribution['100-500ms']++;
      } else if (result.duration < 1000) {
        results.responseTimeDistribution['500ms-1s']++;
      } else {
        results.responseTimeDistribution['>1s']++;
      }
    }
    
    // Small random delay between requests (simulates real user think time)
    const delay = Math.floor(Math.random() * 400) + 100;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  return { userResults, sessionResults };
}

// Main test execution
async function runStressTest() {
  console.log(`Starting stress test with ${config.concurrentUsers} concurrent users...`);
  console.log('');
  
  const startTime = Date.now();
  
  // Start all user sessions concurrently
  const userPromises = [];
  for (let i = 1; i <= config.concurrentUsers; i++) {
    userPromises.push(runUserSession(i));
  }
  
  const userResults = await Promise.all(userPromises);
  
  const totalTime = Date.now() - startTime;
  
  // Aggregate results
  console.log('');
  console.log(`${colors.cyan}Aggregating results...${colors.reset}`);
  
  userResults.forEach(({ userResults: ur }) => {
    results.totalRequests += ur.totalRequests;
    results.successful += ur.successful;
    results.failed += ur.failed;
    results.totalTime += ur.totalTime;
    
    if (ur.maxTime > results.maxTime) {
      results.maxTime = ur.maxTime;
    }
    
    if (ur.minTime < results.minTime) {
      results.minTime = ur.minTime;
    }
  });
  
  const avgTime = results.successful > 0 ? Math.round(results.totalTime / results.successful) : 0;
  const successRate = ((results.successful / results.totalRequests) * 100).toFixed(2);
  const requestsPerSecond = (results.totalRequests / (totalTime / 1000)).toFixed(2);
  
  console.log('');
  console.log(`${colors.cyan}=========================================${colors.reset}`);
  console.log(`${colors.cyan}Test Results Summary${colors.reset}`);
  console.log(`${colors.cyan}=========================================${colors.reset}`);
  console.log(`Total Requests: ${results.totalRequests}`);
  console.log(`Successful: ${results.successful}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Success Rate: ${successRate}%`);
  console.log(`Test Duration: ${Math.round(totalTime / 1000)}s`);
  console.log(`Requests/Second: ${requestsPerSecond}`);
  console.log('');
  console.log('Response Times:');
  console.log(`  Average: ${avgTime}ms`);
  console.log(`  Min: ${results.minTime}ms`);
  console.log(`  Max: ${results.maxTime}ms`);
  console.log('');
  
  console.log('Response Time Distribution:');
  Object.entries(results.responseTimeDistribution).forEach(([range, count]) => {
    const percentage = ((count / results.successful) * 100).toFixed(1);
    console.log(`  ${range}: ${count} (${percentage}%)`);
  });
  console.log('');
  
  if (Object.keys(results.statusCodeCounts).length > 0) {
    console.log('Status Code Breakdown:');
    Object.entries(results.statusCodeCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([code, count]) => {
        const percentage = ((count / results.totalRequests) * 100).toFixed(1);
        console.log(`  ${code}: ${count} (${percentage}%)`);
      });
    console.log('');
  }
  
  if (Object.keys(results.errors).length > 0) {
    console.log(`${colors.red}Error Breakdown:${colors.reset}`);
    Object.entries(results.errors)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([error, count]) => {
        console.log(`  ${error}: ${count}`);
      });
    console.log('');
  }
  
  // Check for SLA breaches
  console.log(`${colors.cyan}=========================================${colors.reset}`);
  console.log('SLA Assessment');
  console.log(`${colors.cyan}=========================================${colors.reset}`);
  
  if (parseFloat(successRate) < 95) {
    console.log(`${colors.red}❌ SLA BREACH: Success rate below 95%${colors.reset}`);
    console.log('Recommendations:');
    console.log('  1. Check database connection pool size');
    console.log('  2. Add database indexes for slow queries');
    console.log('  3. Consider caching frequently accessed data');
    console.log('  4. Scale up server resources');
  } else {
    console.log(`${colors.green}✅ Success rate meets 95% SLA${colors.reset}`);
  }
  
  if (avgTime > 1000) {
    console.log(`${colors.yellow}⚠️  WARNING: Average response time > 1s${colors.reset}`);
    console.log('Recommendations:');
    console.log('  1. Profile slow database queries');
    console.log('  2. Add Redis caching for product listings');
    console.log('  3. Optimize database queries');
    console.log('  4. Consider CDN for static assets');
  } else if (avgTime > 500) {
    console.log(`${colors.yellow}⚠️  WARNING: Average response time > 500ms${colors.reset}`);
    console.log('Recommendations:');
    console.log('  1. Consider adding database indexes');
    console.log('  2. Add Redis caching for frequently accessed data');
  } else {
    console.log(`${colors.green}✅ Response time within acceptable range${colors.reset}`);
  }
  
  console.log('');
  console.log(`${colors.cyan}=========================================${colors.reset}`);
  console.log(`${colors.cyan}Stress Test Complete${colors.reset}`);
  console.log(`${colors.cyan}=========================================${colors.reset}`);
}

// Run the test
runStressTest().catch(console.error);
