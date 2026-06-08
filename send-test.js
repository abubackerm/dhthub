const http = require('http');

const data = JSON.stringify({
  "name": "Test User",
  "email": "abubackerm22@gmail.com",
  "phone": "1234567890",
  "message": "This is a test email to verify the contact form email sending is working correctly.",
  "recaptchaToken": "test"
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/v1/contact',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
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

req.write(data);
req.end();
