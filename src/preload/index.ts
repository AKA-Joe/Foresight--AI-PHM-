import { contextBridge, ipcRenderer } from 'electron';
import type { AppStatus, ChatDeltaEvent, ChatDoneEvent, ChatErrorEvent, DashboardSnapshot, ExtensionEvent } from '../shared/types';

type PredMaintApi = {
  dashboard: {
    getSnapshot(selectedCylinderUid?: string): Promise<DashboardSnapshot>;
  };
  chat: {
    send(userText: string, opts?: { selectedCylinderUid?: string; includeSnapshot?: boolean }): Promise<string>;
    onDelta(callback: (event: ChatDeltaEvent) => void): () => void;
    onDone(callback: (event: ChatDoneEvent) => void): () => void;
    onError(callback: (event: ChatErrorEvent) => void): () => void;
    cancel(requestId: string): void;
  };
  extension: {
    listEvents(): Promise<ExtensionEvent[]>;
    onEvent(callback: (event: ExtensionEvent) => void): () => void;
  };
  app: {
    getStatus(): Promise<AppStatus>;
  };
  window: {
    minimize(): void;
    maximize(): void;
    close(): void;
  };
};

const api: PredMaintApi = {
  dashboard: {
    getSnapshot: (selectedCylinderUid?: string) =>
      ipcRenderer.invoke('dashboard:getSnapshot', selectedCylinderUid),
  },
  chat: {
    send: async (userText, opts) => {
      const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      await ipcRenderer.invoke('chat:send', {
        requestId,
        userText,
        selectedCylinderUid: opts?.selectedCylinderUid,
        includeSnapshot: opts?.includeSnapshot ?? true,
      });
      return requestId;
    },
    onDelta: (callback) => {
      const handler = (_event: Electron.IpcRendererEvent, e: ChatDeltaEvent) => callback(e);
      ipcRenderer.on('chat:delta', handler);
      return () => ipcRenderer.removeListener('chat:delta', handler);
    },
    onDone: (callback) => {
      const handler = (_event: Electron.IpcRendererEvent, e: ChatDoneEvent) => callback(e);
      ipcRenderer.on('chat:done', handler);
      return () => ipcRenderer.removeListener('chat:done', handler);
    },
    onError: (callback) => {
      const handler = (_event: Electron.IpcRendererEvent, e: ChatErrorEvent) => callback(e);
      ipcRenderer.on('chat:error', handler);
      return () => ipcRenderer.removeListener('chat:error', handler);
    },
    cancel: (requestId) => ipcRenderer.invoke('chat:cancel', requestId),
  },
  extension: {
    listEvents: () => ipcRenderer.invoke('extension:listEvents'),
    onEvent: (callback) => {
      const handler = (_event: Electron.IpcRendererEvent, e: ExtensionEvent) => callback(e);
      ipcRenderer.on('extension:event', handler);
      return () => ipcRenderer.removeListener('extension:event', handler);
    },
  },
  app: {
    getStatus: () => ipcRenderer.invoke('app:getStatus'),
  },
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
  },
};

contextBridge.exposeInMainWorld('predMaint', api);

// Forward splash-replay signal from main process to renderer
ipcRenderer.on('replay-splash', () => {
  window.dispatchEvent(new CustomEvent('replay-splash'));
});
