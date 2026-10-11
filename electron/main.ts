import { app, BrowserWindow, ipcMain, dialog, shell, protocol, net } from 'electron';
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';
import { spawn } from 'child_process';
import { LauncherStore } from './store';
import { scanEpicGames } from './scanners/epicScanner';
import { scanGogGames } from './scanners/gogScanner';
import { scanSteamGames } from './scanners/steamScanner';
import { scanWindowsRegistryGames } from './scanners/registryScanner';
import { lookupGameArtwork } from './services/artworkService';
import { StoreAccountService } from './services/storeAccountService';
import { StoreAuthManager } from './services/storeAuthManager';
import { ImageManager } from './services/imageManager';
import { Game, GamePlatform, LauncherSettings, ScanResult } from '../src/types/game';

// Register custom protocol for local media before app is ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'nexus-media',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      bypassCSP: true,
      corsEnabled: true,
    },
  },
]);

let mainWindow: BrowserWindow | null = null;
const store = new LauncherStore();
const accountService = new StoreAccountService();
const authManager = new StoreAuthManager();
const imageManager = new ImageManager();

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
      webSecurity: false,
    },
  });

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
  // Handle nexus-media:// local image loading
  protocol.handle('nexus-media', (request) => {
    let decoded = decodeURIComponent(request.url.replace(/^nexus-media:\/\/(local\/)?/, ''));
    if (decoded.startsWith('/') && decoded.charAt(2) === ':') {
      decoded = decoded.substring(1);
    }
    const fileUrl = pathToFileURL(decoded).toString();
    return net.fetch(fileUrl);
  });

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

// Artwork Lookup & Caching IPC
ipcMain.handle('search-artwork', async (_event, title: string) => {
  return await lookupGameArtwork(title);
});

ipcMain.handle('search-artwork-suggestions', async (_event, title: string) => {
  return await imageManager.searchArtworkSuggestions(title);
});

ipcMain.handle('cache-image', async (_event, { url, type, gameId }: { url: string; type: 'cover' | 'banner'; gameId: string }) => {
  return await imageManager.cacheRemoteImage(url, type, gameId);
});

ipcMain.handle('to-media-url', (_event, localPath: string) => {
  return imageManager.toMediaUrl(localPath);
});

// Store Accounts & Cloud Sync IPC
ipcMain.handle('get-store-accounts', () => {
  return accountService.getAccounts();
});

ipcMain.handle('detect-local-accounts', () => {
  return authManager.detectLocalAccounts();
});

// Real OAuth / Webview Login Window IPC
ipcMain.handle('open-store-login', async (_event, platform: GamePlatform) => {
  try {
    const result = await authManager.openStoreLoginWindow(mainWindow, platform);

    // Save account state
    const accounts = accountService.getAccounts();
    const index = accounts.findIndex(a => a.platform === platform);
    if (index >= 0) {
      accounts[index] = result.account;
    } else {
      accounts.push(result.account);
    }
    accountService.saveAccounts(accounts);

    // Merge newly synced cloud games into library
    const currentGames = store.getGames();
    const currentTitles = new Set(currentGames.map(g => g.title.toLowerCase().trim()));
    const currentStoreIds = new Set(currentGames.filter(g => g.storeId).map(g => `${g.platform}-${g.storeId}`));

    const toAdd: Game[] = [];
    for (const cloudGame of result.games) {
      const key = `${cloudGame.platform}-${cloudGame.storeId}`;
      if (!currentTitles.has(cloudGame.title.toLowerCase().trim()) && !currentStoreIds.has(key)) {
        toAdd.push(cloudGame);
      }
    }

    if (toAdd.length > 0) {
      const merged = [...currentGames, ...toAdd];
      store.saveGames(merged);
    }

    return result;
  } catch (err: any) {
    console.error('Store login error:', err);
    throw err;
  }
});

ipcMain.handle('sync-store-account', async (_event, { platform, identifier, apiKey }: { platform: GamePlatform; identifier: string; apiKey?: string }) => {
  let result: { account: any; games: Game[] };

  switch (platform) {
    case 'steam':
      result = await accountService.syncSteamAccount(identifier, apiKey);
      break;
    case 'epic':
      result = await accountService.syncEpicAccount(identifier);
      break;
    case 'gog':
      result = await accountService.syncGogAccount(identifier);
      break;
    case 'ea':
      result = await accountService.syncEaAccount(identifier);
      break;
    case 'ubisoft':
      result = await accountService.syncUbisoftAccount(identifier);
      break;
    default:
      throw new Error(`Unsupported platform ${platform}`);
  }

  // Update saved accounts list
  const accounts = accountService.getAccounts();
  const index = accounts.findIndex(a => a.platform === platform);
  if (index >= 0) {
    accounts[index] = result.account;
  } else {
    accounts.push(result.account);
  }
  accountService.saveAccounts(accounts);

  // Merge newly synced cloud games into library
  const currentGames = store.getGames();
  const currentTitles = new Set(currentGames.map(g => g.title.toLowerCase().trim()));
  const currentStoreIds = new Set(currentGames.filter(g => g.storeId).map(g => `${g.platform}-${g.storeId}`));

  const toAdd: Game[] = [];
  for (const cloudGame of result.games) {
    const key = `${cloudGame.platform}-${cloudGame.storeId}`;
    if (!currentTitles.has(cloudGame.title.toLowerCase().trim()) && !currentStoreIds.has(key)) {
      toAdd.push(cloudGame);
    }
  }

  if (toAdd.length > 0) {
    const merged = [...currentGames, ...toAdd];
    store.saveGames(merged);
  }

  return result;
});

ipcMain.handle('disconnect-store-account', (_event, platform: GamePlatform) => {
  const accounts = accountService.getAccounts();
  const target = accounts.find(a => a.platform === platform);
  if (target) {
    target.connected = false;
    target.accountIdentifier = undefined;
    target.totalOwnedGames = 0;
    accountService.saveAccounts(accounts);
  }
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

// Install Game IPC (for uninstalled cloud games)
ipcMain.handle('install-game', async (_event, gameId: string) => {
  const games = store.getGames();
  const game = games.find(g => g.id === gameId);
  if (!game) return { success: false, message: 'Game not found' };

  if (game.installUrl) {
    await shell.openExternal(game.installUrl);
    return { success: true };
  }

  if (game.platform === 'steam' && game.storeId) {
    await shell.openExternal(`steam://install/${game.storeId}`);
    return { success: true };
  }

  return { success: false, message: 'No installation URL available for this title.' };
});

// Launch Game IPC
ipcMain.handle('launch-game', async (_event, gameId: string) => {
  const games = store.getGames();
  const game = games.find(g => g.id === gameId);

  if (!game) {
    return { success: false, message: 'Game not found in library.' };
  }

  if (!game.installed && game.installUrl) {
    await shell.openExternal(game.installUrl);
    return { success: true, message: 'Prompted store installer.' };
  }

  const execPath = game.executablePath;
  const startTime = Date.now();

  try {
    if (execPath.includes('://')) {
      await shell.openExternal(execPath);
      runningGames.set(gameId, { startTime });
      mainWindow?.webContents.send('game-status-changed', { gameId, isRunning: true });

      game.lastPlayed = new Date().toISOString();
      store.saveGames(games);

      setTimeout(() => {
        runningGames.delete(gameId);
        mainWindow?.webContents.send('game-status-changed', { gameId, isRunning: false, elapsedMinutes: 1 });
      }, 10000);

      return { success: true };
    }

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
            const cleanTitle = entry.name.replace(/[-_]/g, ' ');
            const art = (await lookupGameArtwork(cleanTitle)) || {
              coverUrl: '',
              bannerUrl: '',
              genres: ['PC Game'],
            };

            results.push({
              title: cleanTitle,
              executablePath: path.join(subDir, exes[0]),
              platform: 'manual',
              installPath: subDir,
              coverUrl: art.coverUrl,
              bannerUrl: art.bannerUrl,
              description: `Found in ${subDir}`,
              genres: art.genres || ['PC Game'],
              installed: true,
            });
          }
        } catch {
          // Skip
        }
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.exe')) {
        const cleanTitle = path.parse(entry.name).name.replace(/[-_]/g, ' ');
        const art = (await lookupGameArtwork(cleanTitle)) || {
          coverUrl: '',
          bannerUrl: '',
          genres: ['PC Game'],
        };

        results.push({
          title: cleanTitle,
          executablePath: path.join(dirPath, entry.name),
          platform: 'manual',
          installPath: dirPath,
          coverUrl: art.coverUrl,
          bannerUrl: art.bannerUrl,
          description: `Executable in ${dirPath}`,
          genres: art.genres || ['PC Game'],
          installed: true,
        });
      }
    }
  } catch (err) {
    console.error('Error scanning custom folder:', err);
  }

  return results;
});
