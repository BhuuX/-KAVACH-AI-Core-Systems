import http from 'http';
import url from 'url';
import path from 'path';
import fs from 'fs';
import { StringDecoder } from 'string_decoder';

// Load environment variables from .env file
const envPath = path.join(process.cwd(), '.env');
console.log('[KAVACH API] Checking .env at:', envPath);
console.log('[KAVACH API] .env exists:', fs.existsSync(envPath));
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const firstEquals = trimmed.indexOf('=');
    if (firstEquals === -1) return;
    const key = trimmed.substring(0, firstEquals).trim();
    let value = trimmed.substring(firstEquals + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.substring(1, value.length - 1);
    }
    process.env[key] = value;
    console.log(`[KAVACH API] Set process.env.${key} = ${value ? '(set)' : '(empty)'}`);
  });
  console.log('[KAVACH API] Environment variables loaded from .env');
} else {
  console.log('[KAVACH API] WARNING: .env file not found!');
}
console.log('[KAVACH API] CATALYST_PROJECT_ID is:', process.env.CATALYST_PROJECT_ID);

const PORT = process.env.PORT || 3001;

const server = http.createServer(async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  // Parse URL & query params
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  req.query = parsedUrl.query;

  // Add Vercel/Express-like helpers to res
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  
  res.json = (data) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
    return res;
  };

  // Read body for POST/PUT requests
  const decoder = new StringDecoder('utf-8');
  let buffer = '';
  
  req.on('data', (chunk) => {
    buffer += decoder.write(chunk);
  });

  req.on('end', async () => {
    buffer += decoder.end();
    if (buffer && req.headers['content-type']?.includes('application/json')) {
      try {
        req.body = JSON.parse(buffer);
      } catch (e) {
        req.body = buffer;
      }
    } else {
      req.body = buffer ? { rawBody: buffer } : {};
    }

    // Resolve API route file
    // Example: /api/stats -> ./api/stats.js
    const relativePath = pathname.startsWith('/') ? pathname.substring(1) : pathname;
    const apiPath = relativePath.endsWith('.js') ? relativePath : `${relativePath}.js`;
    const filePath = path.join(process.cwd(), apiPath);

    if (fs.existsSync(filePath) && !fs.lstatSync(filePath).isDirectory()) {
      try {
        // Dynamically import the handler with a timestamp to avoid caching
        const modulePath = `./${apiPath.replace(/\\/g, '/')}?t=${Date.now()}`;
        const { default: handler } = await import(modulePath);
        
        if (typeof handler === 'function') {
          await handler(req, res);
        } else {
          res.status(500).json({ error: `Handler in ${apiPath} is not a default function` });
        }
      } catch (err) {
        console.error(`API Error in ${apiPath}:`, err);
        res.status(500).json({ error: err.message, stack: err.stack });
      }
    } else {
      res.status(404).json({ error: `API route not found: ${pathname}` });
    }
  });
});

server.listen(PORT, () => {
  console.log(`\x1b[32m[KAVACH API] Local server running at http://localhost:${PORT}\x1b[0m`);
});
