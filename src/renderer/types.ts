import type { AppStatus, ChatDeltaEvent, ChatDoneEvent, ChatErrorEvent, DashboardSnapshot, ExtensionEvent } from '../shared/types';

interface ChatApi {
  send(userText: string, opts?: { selectedCylinderUid?: string; includeSnapshot?: boolean }): Promise<string>;
  onDelta(callback: (event: ChatDeltaEvent) => void): () => void;
  onDone(callback: (event: ChatDoneEvent) => void): () => void;
  onError(callback: (event: ChatErrorEvent) => void): () => void;
  cancel(requestId: string): void;
}

interface DashboardApi {
  getSnapshot(selectedCylinderUid?: string): Promise<DashboardSnapshot>;
}

interface ExtensionApi {
  listEvents(): Promise<ExtensionEvent[]>;
  onEvent(callback: (event: ExtensionEvent) => void): () => void;
}

interface AppApi {
  getStatus(): Promise<AppStatus>;
}

interface WinApi {
  minimize(): void;
  maximize(): void;
  close(): void;
}

interface PredMaintApi {
  dashboard: DashboardApi;
  chat: ChatApi;
  extension: ExtensionApi;
  app: AppApi;
  window: WinApi;
}

declare global {
  interface Window {
    predMaint: PredMaintApi;
  }
}

export {};
