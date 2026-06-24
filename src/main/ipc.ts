import { ipcMain, type BrowserWindow } from 'electron';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import type { ChatRequest, ExtensionEvent } from '../shared/types';
import { getDashboardSnapshot } from './mock/analytics';
import { streamMaintenanceAssistant, getLlmStatus } from './llm/anthropicClient';
import { listExtensionEvents } from './bridge/localBridgeServer';

const chatSendSchema = z.object({
  requestId: z.string().min(1),
  userText: z.string().min(1).max(4096),
  selectedCylinderUid: z.string().optional(),
  includeSnapshot: z.boolean(),
});

const activeRequests = new Set<string>();

export function registerIpcHandlers(mainWindow: BrowserWindow) {
  ipcMain.handle('dashboard:getSnapshot', (_event, selectedCylinderUid?: string) => {
    return getDashboardSnapshot(selectedCylinderUid);
  });

  ipcMain.handle('app:getStatus', () => {
    const bridgePort = Number(process.env.ELECTRON_BRIDGE_PORT || '17654');
    return {
      llm: getLlmStatus(),
      bridge: {
        port: bridgePort,
        tokenConfigured: Boolean(process.env.ELECTRON_BRIDGE_TOKEN),
      },
    };
  });

  ipcMain.handle('chat:send', (_event, payload: unknown) => {
    const parsed = chatSendSchema.parse(payload) as ChatRequest;
    if (activeRequests.has(parsed.requestId)) return { accepted: true, requestId: parsed.requestId };

    activeRequests.add(parsed.requestId);
    streamMaintenanceAssistant(mainWindow.webContents, parsed);

    const doneCleanup = (message: { requestId: string }) => {
      if (message.requestId === parsed.requestId) activeRequests.delete(parsed.requestId);
    };
    ipcMain.on('chat:done-internal', (_e, msg) => doneCleanup(msg));
    ipcMain.on('chat:error-internal', (_e, msg) => doneCleanup(msg));

    return { accepted: true, requestId: parsed.requestId };
  });

  ipcMain.handle('chat:cancel', (_event, requestId: string) => {
    activeRequests.delete(requestId);
    return { cancelled: true };
  });

  ipcMain.handle('extension:listEvents', () => {
    return listExtensionEvents();
  });

  // ── Window controls for frameless title bar ──
  ipcMain.on('window:minimize', () => mainWindow.minimize());
  ipcMain.on('window:maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });
  ipcMain.on('window:close', () => mainWindow.close());

  const knownExtensions = new Set<string>();

  mainWindow.webContents.on('ipc-message', (_event, channel) => {
    if (channel === 'chat:done') {
      const msg = { requestId: '' };
      activeRequests.delete(msg.requestId);
      return;
    }
    if (channel === 'chat:error') {
      const msg = { requestId: '' };
      activeRequests.delete(msg.requestId);
      return;
    }
  });

  setInterval(() => {
    const updated = listExtensionEvents();
    const newEvents = updated.filter((ev) => !knownExtensions.has(ev.id));
    for (const ev of newEvents) {
      knownExtensions.add(ev.id);
      mainWindow.webContents.send('extension:event', ev);
    }
  }, 3000);
}
