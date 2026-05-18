// scripts/lib/env.js
// Loads web-app/.env.local into process.env if POSTGRES_URL isn't already set.
// Allows scripts to be invoked via `node scripts/X.js` without dotenv-cli.
// Resolves the .env.local path relative to web-app/ (this file lives at web-app/scripts/lib/).

const fs = require('fs');
const path = require('path');

if (!process.env.POSTGRES_URL) {
  const envPath = path.join(__dirname, '..', '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq < 0) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  }
}

module.exports = {};
