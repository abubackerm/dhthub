const https = require('https');
const querystring = require('querystring');
const fs = require('fs');
const path = require('path');

// Load .env manually
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const eqIndex = trimmed.indexOf('=');
  if (eqIndex === -1) return;
  const key = trimmed.substring(0, eqIndex).trim();
  let value = trimmed.substring(eqIndex + 1).trim();
  if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
  envVars[key] = value;
});

const tenantId = envVars.MS_TENANT_ID;
const clientId = envVars.MS_CLIENT_ID;
const clientSecret = envVars.MS_CLIENT_SECRET;

console.log('Tenant ID:', tenantId);
console.log('Client ID:', clientId);
console.log('Client Secret:', clientSecret ? clientSecret.substring(0, 8) + '...' : 'NOT SET');

const postData = querystring.stringify({
  grant_type: 'client_credentials',
  client_id: clientId,
  client_secret: clientSecret,
  scope: 'https://graph.microsoft.com/.default',
});

const options = {
  hostname: 'login.microsoftonline.com',
  port: 443,
  path: `/${tenantId}/oauth2/v2.0/token`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(postData),
  },
};

console.log('\nRequesting token from:', `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`);

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => {
    console.log('\nStatus:', res.statusCode);
    console.log('Content-Type:', res.headers['content-type']);
    console.log('\nResponse body:');
    console.log(body.substring(0, 1000));
  });
});

req.on('error', (e) => {
  console.error('Request error:', e.message);
});

req.write(postData);
req.end();
