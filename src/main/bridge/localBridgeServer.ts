import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import type { BrowserWindow } from 'electron';
import type { ExtensionEvent } from '../../shared/types';

const ingestSchema = z.object({
  token: z.string().min(1),
  source: z.enum(['popup', 'content-script']),
  page: z.object({
    url: z.string().max(2048),
    title: z.string().max(300),
  }),
  selectedText: z.string().max(60_000).optional(),
  note: z.string().max(1000).optional(),
  createdAt: z.string().min(1),
});

const events: ExtensionEvent[] = [];

function json(res: ServerResponse, status: number, payload: unknown) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
  });
  res.end(JSON.stringify(payload));
}

function readBody(req: IncomingMessage, maxBytes = 65_536) {
  return new Promise<string>((resolve, reject) => {
    let size = 0;
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk: string) => {
      size += Buffer.byteLength(chunk);
      if (size > maxBytes) {
        reject(new Error('payload_too_large'));
        req.destroy();
        return;
      }
      body += chunk;
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

export function listExtensionEvents() {
  return events.slice().reverse();
}

export function startLocalBridge(mainWindow: BrowserWindow, port: number, token: string) {
  const server = createServer(async (req, res) => {
    if (!req.url) return json(res, 404, { ok: false });

    if (req.method === 'OPTIONS') return json(res, 204, {});

    if (req.method === 'GET' && req.url === '/health') {
      return json(res, 200, {
        ok: true,
        app: 'predictive-maintenance-demo',
        version: '0.1.0',
      });
    }

    if (req.method === 'POST' && req.url === '/extension/ingest') {
      try {
        const parsed = ingestSchema.parse(JSON.parse(await readBody(req)));
        if (parsed.token !== token) return json(res, 403, { ok: false, error: 'invalid_token' });

        const event: ExtensionEvent = {
          id: nanoid(10),
          source: parsed.source,
          page: parsed.page,
          selectedText: parsed.selectedText,
          note: parsed.note,
          createdAt: parsed.createdAt,
        };
        events.push(event);
        if (events.length > 50) events.shift();

        mainWindow.webContents.send('extension:event', event);
        return json(res, 200, { ok: true, eventId: event.id });
      } catch (error) {
        const status = error instanceof Error && error.message === 'payload_too_large' ? 413 : 400;
        return json(res, status, { ok: false, error: 'invalid_payload' });
      }
    }

    return json(res, 404, { ok: false, error: 'not_found' });
  });

  server.listen(port, '127.0.0.1');
  return server;
}
