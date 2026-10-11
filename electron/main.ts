import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { LauncherStore } from './store';
import { scanEpicGames } from './scanners/epicScanner';
import { scanGogGames } from './scanners/gogScanner';
import { scanSteamGames } from './scanners/steamScanner';
import { scanWindowsRegistryGames } from './scanners/registryScanner';
import { Game, GamePlatform, LauncherSettings, ScanResult, StoreAccountStatus } from '../src/types/game';

let mainWindow: BrowserWindow | null = null;
const store = new LauncherStore();

// Track running games: gameId -> { startTime: number, process?: any }
const runningGames = new Map<string, { startTime: number; process?: any }>();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1024,
    minHeight: 680,
    frame: false,
    backgroundColor: '#0b0e14',
    title: 'Nexus Launcher',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // Allows loading local file:// covers or thumbnails
    },
  });

  // In development, load Vite dev server; otherwise load production build
  const indexPath = path.join(__dirname, '../dist/index.html');
  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173').catch(() => {
      if (fs.existsSync(indexPath)) {
        mainWindow?.loadFile(indexPath);
      }
    });
  } else if (fs.existsSync(indexPath)) {
    mainWindow.loadFile(indexPath);
  } else {
    mainWindow.loadURL('http://localhost:5173');
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Window controls IPC
ipcMain.on('window-minimize', () => {
  mainWindow?.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.on('window-close', () => {
  mainWindow?.close();
});

ipcMain.handle('is-maximized', () => {
  return mainWindow?.isMaximized() || false;
});

// Library Storage IPC
ipcMain.handle('get-games', () => {
  const games = store.getGames();
  // Annotate currently running state
  return games.map(g => ({
    ...g,
    isRunning: runningGames.has(g.id),
  }));
});

ipcMain.handle('save-games', (_event, games: Game[]) => {
  store.saveGames(games);
  return true;
});

ipcMain.handle('get-settings', () => {
  return store.getSettings();
});

ipcMain.handle('save-settings', (_event, settings: LauncherSettings) => {
  store.saveSettings(settings);
  return true;
});

// File / Folder selection dialogs
ipcMain.handle('select-file', async (_event, filters: { name: string; extensions: string[] }[]) => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: filters || [
      { name: 'Executables and Shortcuts', extensions: ['exe', 'lnk', 'bat'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle('select-folder', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

// Launch Game IPC
ipcMain.handle('launch-game', async (_event, gameId: string) => {
  const games = store.getGames();
  const game = games.find(g => g.id === gameId);

  if (!game) {
    return { success: false, message: 'Game not found in library.' };
  }

  const execPath = game.executablePath;
  const startTime = Date.now();

  try {
    // Check if protocol URI (steam://, com.epicgames.launcher://, etc.)
    if (execPath.includes('://')) {
      await shell.openExternal(execPath);
      runningGames.set(gameId, { startTime });
      mainWindow?.webContents.send('game-status-changed', { gameId, isRunning: true });

      // Update last played immediately
      game.lastPlayed = new Date().toISOString();
      store.saveGames(games);

      // Simulate process tracking or clear after 10 seconds for protocol handlers
      setTimeout(() => {
        runningGames.delete(gameId);
        mainWindow?.webContents.send('game-status-changed', { gameId, isRunning: false, elapsedMinutes: 1 });
      }, 10000);

      return { success: true };
    }

    // Local Executable
    if (!fs.existsSync(execPath)) {
      return { success: false, message: `Executable not found at path: ${execPath}` };
    }

    const gameProcess = spawn(execPath, [], {
      detached: true,
      cwd: path.dirname(execPath),
      shell: true,
    });

    runningGames.set(gameId, { startTime, process: gameProcess });
    mainWindow?.webContents.send('game-status-changed', { gameId, isRunning: true });

    game.lastPlayed = new Date().toISOString();
    store.saveGames(games);

    gameProcess.on('close', () => {
      const durationMs = Date.now() - startTime;
      const minutesPlayed = Math.max(1, Math.round(durationMs / 60000));

      runningGames.delete(gameId);

      // Update total playtime
      const currentGames = store.getGames();
      const target = currentGames.find(g => g.id === gameId);
      if (target) {
        target.playtimeMinutes = (target.playtimeMinutes || 0) + minutesPlayed;
        target.lastPlayed = new Date().toISOString();
        store.saveGames(currentGames);
      }

      mainWindow?.webContents.send('game-status-changed', {
        gameId,
        isRunning: false,
        elapsedMinutes: minutesPlayed,
      });
    });

    return { success: true };
  } catch (err: any) {
    console.error('Failed to launch game:', err);
    return { success: false, message: err?.message || 'Failed to start game process.' };
  }
});

// PC Scanners IPC
ipcMain.handle('scan-pc', async () => {
  const [epicGames, gogGames, steamGames, registryGames] = await Promise.all([
    scanEpicGames(),
    scanGogGames(),
    scanSteamGames(),
    scanWindowsRegistryGames(),
  ]);

  const allFound = [...epicGames, ...gogGames, ...steamGames, ...registryGames];
  
  // Deduplicate by normalized title
  const uniqueMap = new Map<string, ScanResult>();
  for (const item of allFound) {
    const key = item.title.toLowerCase().trim();
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, item);
    }
  }

  return Array.from(uniqueMap.values());
});

// Custom folder scanner IPC
ipcMain.handle('scan-folder', async (_event, dirPath: string) => {
  const results: ScanResult[] = [];
  if (!fs.existsSync(dirPath)) return results;

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const subDir = path.join(dirPath, entry.name);
        try {
          const files = fs.readdirSync(subDir);
          const exes = files.filter(f => f.toLowerCase().endsWith('.exe') && !f.toLowerCase().includes('unins'));
          if (exes.length > 0) {
            results.push({
              title: entry.name.replace(/[-_]/g, ' '),
              executablePath: path.join(subDir, exes[0]),
              platform: 'manual',
              installPath: subDir,
              description: `Found in ${subDir}`,
              genres: ['PC Game'],
            });
          }
        } catch {
          // Skip
        }
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.exe')) {
        results.push({
          title: path.parse(entry.name).name.replace(/[-_]/g, ' '),
          executablePath: path.join(dirPath, entry.name),
          platform: 'manual',
          installPath: dirPath,
          description: `Executable in ${dirPath}`,
          genres: ['PC Game'],
        });
      }
    }
  } catch (err) {
    console.error('Error scanning custom folder:', err);
  }

  return results;
});

// Store Account Statuses IPC
ipcMain.handle('get-store-statuses', async () => {
  const epicManifests = 'C:\\ProgramData\\Epic\\EpicGamesLauncher\\Data\\Manifests';
  const gogDir = 'C:\\Program Files (x86)\\GOG Galaxy\\Games';
  const steamDir = 'C:\\Program Files (x86)\\Steam';

  const statuses: StoreAccountStatus[] = [
    {
      platform: 'steam',
      name: 'Steam',
      connected: fs.existsSync(steamDir),
      detectedGamesCount: 0,
      installPath: fs.existsSync(steamDir) ? steamDir : undefined,
      description: 'Local Steam Library (Manifest & ACF auto-detection, no login expiration issues).',
      color: '#1b2838',
    },
    {
      platform: 'epic',
      name: 'Epic Games Store',
      connected: fs.existsSync(manifestsDirExists(epicManifests)),
      detectedGamesCount: 0,
      installPath: manifestsDirExists(epicManifests) ? 'C:\\ProgramData\\Epic' : undefined,
      description: 'Epic Games Launcher manifest detector & URI launcher.',
      color: '#2a2a2a',
    },
    {
      platform: 'gog',
      name: 'GOG Galaxy',
      connected: fs.existsSync(gogDir),
      detectedGamesCount: 0,
      installPath: fs.existsSync(gogDir) ? gogDir : undefined,
      description: 'GOG Galaxy & DRM-Free local game detector.',
      color: '#6c2b96',
    },
    {
      platform: 'manual',
      name: 'Manual / Standalone',
      connected: true,
      detectedGamesCount: 0,
      description: 'Direct executable links (.exe), DRM-free indie games, custom ROMs or shortcuts.',
      color: '#3b82f6',
    },
  ];

  return statuses;
});

function manifestsDirExists(p: string): string {
  return fs.existsSync(p) ? p : '';
}
