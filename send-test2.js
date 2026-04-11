const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/v1/contact',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(JSON.stringify({
      "name": "Test User",
      "email": "abubackerm22@gmail.com",
      "phone": "1234567890",
      "message": "This is a test email to verify the contact form email sending is working correctly.",
      "recaptchaToken": "test"
    })),
  },
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Response: ${body}`);
  });
});

req.on('error', (e) => {
  console.error(`Error: ${e.message}`);
});

req.write(JSON.stringify({
  "name": "Test User",
  "email": "abubackerm22@gmail.com",
  "phone": "1234567890",
  "message": "This is a test email to verify the contact form email sending is working correctly.",
  "recaptchaToken": "test"
}));
req.end();

// Wait 5 seconds then check the API logs
setTimeout(() => {
  console.log('\n\n--- Checking if the API server is using stale env vars ---');
  console.log('The API needs to be restarted to pick up the new .env values.');
  console.log('Since nest start --watch only restarts on TS file changes, not .env changes.');
}, 2000);
