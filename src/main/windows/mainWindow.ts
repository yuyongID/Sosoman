import { BrowserWindow } from 'electron';
import path from 'path';

let mainWindow: BrowserWindow | null = null;

/**
 * Factory method for the primary BrowserWindow instance.
 * Keeping creation logic encapsulated allows us to swap window options or load
 * URLs without touching the app lifecycle wiring.
 */
export async function createMainWindow(): Promise<BrowserWindow> {
  if (mainWindow) {
    return mainWindow;
  }

  const isDevelopment = process.env.NODE_ENV === 'development';
  const projectRoot = path.resolve(__dirname, '../../..');
  const preloadPath = isDevelopment
    ? path.join(projectRoot, 'scripts/preload.cjs')
    : path.join(__dirname, '../preload/index.js');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      preload: preloadPath,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    await mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // TODO: hook into real renderer build path once the bundler pipeline is ready.
    await mainWindow.loadFile(path.join(__dirname, '../../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}
