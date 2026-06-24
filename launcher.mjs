// Launcher daemon — pre-starts the app on launch, PPT button just focuses it
// Usage: node launcher.mjs
// Starts npm run dev IMMEDIATELY, so app is ready by the time you click

import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 9346;
let appProcess = null;

function json(res, status, data) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,OPTIONS',
    'access-control-allow-headers': 'content-type',
  });
  res.end(JSON.stringify(data));
}

// ── Pre-launch: start app immediately ──
console.log('[launcher] Pre-launching app — npm run dev...');
appProcess = spawn('npm', ['run', 'dev'], {
  cwd: __dirname,
  shell: true,
  stdio: 'inherit',
});

appProcess.on('close', (code) => {
  console.log('[launcher] App exited with code', code);
  appProcess = null;
});

appProcess.on('error', (err) => {
  console.error('[launcher] Failed to start:', err.message);
  appProcess = null;
});

// ── HTTP server: PPT button → focus window via bridge ──
const server = createServer((req, res) => {
  if (req.method === 'OPTIONS') return json(res, 204, {});

  if (req.method === 'GET' && req.url === '/health') {
    return json(res, 200, { ok: true, appRunning: appProcess !== null });
  }

  if (req.method === 'GET' && req.url === '/launch') {
    // Focus the app via its local bridge
    fetch('http://localhost:17654/launch')
      .then(() => {
        console.log('[launcher] App window focused');
        return json(res, 200, { ok: true, status: 'focused' });
      })
      .catch(() => {
        console.log('[launcher] App bridge not ready yet — still loading');
        return json(res, 200, { ok: true, status: 'loading' });
      });
    return;
  }

  return json(res, 404, { ok: false });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[launcher] Ready — app pre-launching in background`);
  console.log(`[launcher] PPT button → http://localhost:${PORT}/launch`);
});
