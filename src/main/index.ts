import { app, BrowserWindow, shell } from 'electron';
import { join } from 'node:path';
import { registerIpcHandlers } from './ipc';
import { startLocalBridge } from './bridge/localBridgeServer';

const isDev = !app.isPackaged;
const bridgePort = Number(process.env.ELECTRON_BRIDGE_PORT || '17654');
const bridgeToken = process.env.ELECTRON_BRIDGE_TOKEN || 'demo-bridge-token';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1080,
    minHeight: 720,
    title: '非标设备 5G+AI 预测性维护演示平台',
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('http://localhost') && !url.startsWith('file://')) {
      event.preventDefault();
    }
  });

  if (isDev) {
    const port = process.env.ELECTRON_RENDERER_URL ? new URL(process.env.ELECTRON_RENDERER_URL).port : '5173';
    mainWindow.loadURL(`http://localhost:${port}`);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  if (mainWindow) {
    registerIpcHandlers(mainWindow);
    startLocalBridge(mainWindow, bridgePort, bridgeToken);
  }
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
