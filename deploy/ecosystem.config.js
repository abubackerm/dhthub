const fs = require('fs');
const path = require('path');

// Load environment from project root .env
const envPath = path.resolve(__dirname, '..', '.env');
const envVars = {};
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    // Remove surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    envVars[key] = val;
  }
}

module.exports = {
  apps: [
    {
      name: 'api',
      cwd: '/opt/dynamic_hub/apps/api',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: { ...envVars, NODE_ENV: 'production' },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/opt/dynamic_hub/logs/api-error.log',
      out_file: '/opt/dynamic_hub/logs/api-out.log',
      merge_logs: true,
      max_memory_restart: '512M',
      restart_delay: 3000,
    },
    {
      name: 'web',
      cwd: '/opt/dynamic_hub/apps/web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3005',
      instances: 1,
      exec_mode: 'fork',
      interpreter: 'node',
      env: { ...envVars, NODE_ENV: 'production', PORT: 3005 },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/opt/dynamic_hub/logs/web-error.log',
      out_file: '/opt/dynamic_hub/logs/web-out.log',
      merge_logs: true,
      max_memory_restart: '1G',
      restart_delay: 3000,
    },
    {
      name: 'workers',
      cwd: '/opt/dynamic_hub/apps/workers',
      script: 'node_modules/tsx/dist/cli.mjs',
      args: 'index.ts',
      instances: 1,
      exec_mode: 'fork',
      interpreter: 'node',
      env: { ...envVars, NODE_ENV: 'production' },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/opt/dynamic_hub/logs/workers-error.log',
      out_file: '/opt/dynamic_hub/logs/workers-out.log',
      merge_logs: true,
      max_memory_restart: '512M',
      restart_delay: 3000,
    },
  ],
};
