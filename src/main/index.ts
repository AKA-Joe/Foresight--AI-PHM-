import { app, BrowserWindow, nativeImage } from 'electron';
import { join } from 'node:path';
import { registerIpcHandlers } from './ipc';
import { startLocalBridge } from './bridge/localBridgeServer';

// Set app identity for Windows taskbar icon
app.setAppUserModelId('com.telecom.aura-phm');

const isDev = !app.isPackaged;
const bridgePort = Number(process.env.ELECTRON_BRIDGE_PORT || '17654');
const bridgeToken = process.env.ELECTRON_BRIDGE_TOKEN || 'demo-bridge-token';

const PROTOCOL = 'mingjian';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  const iconPath = join(__dirname, '../../assets/icon.png');
  let icon;
  try { icon = nativeImage.createFromPath(iconPath); } catch { icon = undefined; }

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1080,
    minHeight: 720,
    frame: false,
    titleBarStyle: 'hidden',
    autoHideMenuBar: true,
    icon: icon || undefined,
    title: '明鉴——AI+设备预测性维护平台',
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('http://localhost') && !url.startsWith('file://') && !url.startsWith(PROTOCOL + '://')) {
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

// ── Protocol handler ──
function handleProtocolLaunch(url: string) {
  console.log('[protocol] launched via:', url);
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  } else {
    createWindow();
  }
}

// macOS: open-url event
app.on('open-url', (event, url) => {
  event.preventDefault();
  handleProtocolLaunch(url);
});

// Windows: single-instance lock + second-instance protocol handling
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, commandLine) => {
    const url = commandLine.find((arg) => arg.startsWith(PROTOCOL + '://'));
    if (url) {
      handleProtocolLaunch(url);
    } else if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

app.whenReady().then(() => {
  // ── Register protocol AFTER app is ready (required for Windows registry) ──
  const registered = app.setAsDefaultProtocolClient(PROTOCOL);
  console.log('[protocol] registered:', PROTOCOL, 'success:', registered);

  createWindow();
  if (mainWindow) {
    registerIpcHandlers(mainWindow);
    startLocalBridge(mainWindow, bridgePort, bridgeToken);
  }

  // Handle protocol launch on startup
  const protoArg = process.argv.find((arg) => arg.startsWith(PROTOCOL + '://'));
  if (protoArg) {
    handleProtocolLaunch(protoArg);
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
