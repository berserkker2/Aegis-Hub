import { app, BrowserWindow, ipcMain, dialog, shell, protocol, net, screen, Tray, Menu, MenuItemConstructorOptions, nativeImage, powerMonitor } from 'electron';
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';
import { spawn, ChildProcess } from 'child_process';
import { LauncherStore } from './store';
import { scanEpicGames } from './scanners/epicScanner';
import { scanGogGames } from './scanners/gogScanner';
import { scanSteamGames } from './scanners/steamScanner';
import { scanWindowsRegistryGames } from './scanners/registryScanner';
import { lookupGameArtwork, scrapeEmulatorGameMetadata } from './services/artworkService';
import { StoreAccountService } from './services/storeAccountService';
import { StoreAuthManager } from './services/storeAuthManager';
import { ImageManager } from './services/imageManager';
import { galaxyDbService } from './services/galaxyDbService';
import { steamAchievementService } from './services/steamAchievementService';
import { steamPlaytimeService } from './services/steamPlaytimeService';
import { steamRatingService } from './services/steamRatingService';
import { gameCategoryService } from './services/gameCategoryService';
import { genreEnrichmentService } from './services/genreEnrichmentService';
import { emulatorService, isBiosOrSystemFile } from './services/emulatorService';
import { gameGalleryService } from './services/gameGalleryService';
import { gameDiscoveryService } from './services/gameDiscoveryService';
import { steamDiscoveryService } from './services/steamDiscoveryService';
import { geminiService } from './services/geminiService';
import { gamePulseService } from './services/gamePulseService';
import { gameInstallationService } from './services/gameInstallationService';
import { epicDirectService } from './services/epicDirectService';
import { steamOwnedService } from './services/steamOwnedService';
import { ubisoftDirectService } from './services/ubisoftDirectService';
import { eaDirectService } from './services/eaDirectService';
import { updaterService } from './services/updaterService';
import { Game, GamePlatform, LauncherSettings, ScanResult } from '../src/types/game';

// Global uncaught exception handlers to prevent dialog crashes
process.on('uncaughtException', (err) => {
  console.error('[Main Process] Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[Main Process] Unhandled Rejection:', reason);
});

// Register custom protocols for local media before app is ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'aegis-media',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      bypassCSP: true,
      corsEnabled: true,
    },
  },
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

// Support for true self-contained portable mode:
// When running as an electron-builder portable executable, store all data in "Aegis Hub Data" beside the .exe
if (process.env.PORTABLE_EXECUTABLE_DIR) {
  try {
    const portableDataDir = path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'Aegis Hub Data');
    if (!fs.existsSync(portableDataDir)) {
      fs.mkdirSync(portableDataDir, { recursive: true });
    }
    app.setPath('userData', portableDataDir);
  } catch (err) {
    console.warn('Failed to initialize portable data directory beside executable:', err);
  }
}

let mainWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;
const store = new LauncherStore();
const accountService = new StoreAccountService();
const authManager = new StoreAuthManager();
const imageManager = new ImageManager();

// Track running games: gameId -> { startTime: number, process?: any }
const runningGames = new Map<string, { startTime: number; process?: any }>();

let isInBigPicture = process.argv.includes('--bigpicture');
let wasInBigPictureBeforeSuspend = false;

function getSuspendFlagPath(): string {
  return path.join(app.getPath('userData'), 'bigpicture-suspend.flag');
}

function getSavedWindowState(): { width: number; height: number; x?: number; y?: number; isMaximized: boolean } {
  const defaultState = {
    width: 1320,
    height: 860,
    x: undefined as number | undefined,
    y: undefined as number | undefined,
    isMaximized: false,
  };

  try {
    const stateFile = path.join(app.getPath('userData'), 'window-state.json');
    if (fs.existsSync(stateFile)) {
      const data = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
      let { width, height, x, y, isMaximized } = data;

      width = typeof width === 'number' && width >= 800 ? width : defaultState.width;
      height = typeof height === 'number' && height >= 600 ? height : defaultState.height;

      // If a previous session accidentally saved the full display screen resolution as unmaximized bounds (from Big Picture),
      // sanitize it back to normal centered desktop window dimensions:
      const primaryDisplay = screen.getPrimaryDisplay();
      if (
        !isMaximized &&
        x === 0 &&
        y === 0 &&
        primaryDisplay &&
        width === primaryDisplay.bounds.width &&
        height === primaryDisplay.bounds.height
      ) {
        width = Math.min(1366, primaryDisplay.workArea.width - 80);
        height = Math.min(840, primaryDisplay.workArea.height - 60);
        x = Math.round((primaryDisplay.workArea.width - width) / 2);
        y = Math.round((primaryDisplay.workArea.height - height) / 2);
      }

      if (typeof x === 'number' && typeof y === 'number') {
        const displays = screen.getAllDisplays();
        const isVisible = displays.some((d) => {
          const b = d.bounds;
          return x >= b.x && x < b.x + b.width && y >= b.y && y < b.y + b.height;
        });
        if (!isVisible) {
          x = undefined;
          y = undefined;
        }
      } else {
        x = undefined;
        y = undefined;
      }

      return { width, height, x, y, isMaximized: Boolean(isMaximized) };
    }
  } catch (err) {
    console.warn('Error reading window state:', err);
  }

  return defaultState;
}

function saveWindowState(win: BrowserWindow) {
  try {
    // CRITICAL: NEVER overwrite desktop window bounds if currently in Big Picture or Fullscreen!
    if (isInBigPicture || win.isFullScreen()) {
      return;
    }

    const stateFile = path.join(app.getPath('userData'), 'window-state.json');
    const isMaximized = win.isMaximized();
    if (!isMaximized) {
      const bounds = win.getBounds();
      // Double safety: don't save if bounds match entire screen
      const primaryDisplay = screen.getPrimaryDisplay();
      if (
        primaryDisplay &&
        bounds.x === 0 &&
        bounds.y === 0 &&
        bounds.width === primaryDisplay.bounds.width &&
        bounds.height === primaryDisplay.bounds.height
      ) {
        return;
      }

      fs.writeFileSync(
        stateFile,
        JSON.stringify({
          width: bounds.width,
          height: bounds.height,
          x: bounds.x,
          y: bounds.y,
          isMaximized: false,
        }),
        'utf-8'
      );
    } else {
      let existing: any = {};
      try {
        if (fs.existsSync(stateFile)) {
          existing = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
        }
      } catch {}
      fs.writeFileSync(
        stateFile,
        JSON.stringify({
          ...existing,
          isMaximized: true,
        }),
        'utf-8'
      );
    }
  } catch (err) {
    console.warn('Error saving window state:', err);
  }
}

function getAppIcon(): nativeImage {
  const iconPath = path.join(__dirname, 'assets', 'aegis_logo.png');
  if (fs.existsSync(iconPath)) {
    return nativeImage.createFromPath(iconPath);
  }
  const rootIconPath = path.join(__dirname, '../logos/aegis_logo.png');
  if (fs.existsSync(rootIconPath)) {
    return nativeImage.createFromPath(rootIconPath);
  }
  return nativeImage.createEmpty();
}

function getSettingsAppIcon(): nativeImage {
  const candidatePaths = [
    path.join(__dirname, 'assets', 'aegis_settings_logo.png'),
    path.join(__dirname, '../logos', 'aegis_settings_logo.png'),
    path.join(__dirname, '../public', 'aegis_settings_logo.png'),
    path.join(process.cwd(), 'logos', 'aegis_settings_logo.png'),
  ];
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      return nativeImage.createFromPath(p);
    }
  }
  return getAppIcon();
}

function getTrayIconImage(color?: 'white' | 'black'): nativeImage {
  const settings = store.getSettings();
  const selectedColor = color || settings.trayIconColor || 'white';
  const fileName = selectedColor === 'black' ? 'aegis_logo_b.png' : 'aegis_logo_w.png';

  const assetPath = path.join(__dirname, 'assets', fileName);
  if (fs.existsSync(assetPath)) {
    return nativeImage.createFromPath(assetPath).resize({ width: 16, height: 16 });
  }

  const rootPath = path.join(__dirname, '../logos', fileName);
  if (fs.existsSync(rootPath)) {
    return nativeImage.createFromPath(rootPath).resize({ width: 16, height: 16 });
  }

  // Fallback icon if png missing
  const iconDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAA2klEQVR4nO2OUQcCQRSF+1+JJJJIJJFEIiUlpaSk9Ivb2Z19PT0NY8zZsWtn9DCH72Hcc+98jUZMTEzMv6X5yeETp0DrncMnToH2S8InToHOU8InToHuQ0IHwFdhzhhFO4Wf9+4SOvohhdmx4epTgf4tg45NwOywvu2toAKDawYdm4DZYX3bW0EFhpcMJvoR27zKDhUYnVPUgS5gm1OB8SlFCKjA5JgiBFRgehAIARWY7QVCQAXmOwEGXarz1mIrwCgrUOnWcpOAUVag0q3VOgGjrECdt2JivOYHa7uNbeFHaRoAAAAASUVORK5CYII=';
  return nativeImage.createFromDataURL(iconDataUrl);
}

function updateTrayIcon(color?: 'white' | 'black') {
  if (!tray) return;
  const icon = getTrayIconImage(color);
  tray.setImage(icon);
}

function syncLoginItemSettings(settings: LauncherSettings) {
  if (process.platform !== 'win32' && process.platform !== 'darwin') return;
  try {
    const openAtLogin = Boolean(settings.startWithWindows);
    const isMinimized = settings.startupWindowMode === 'minimized';
    const args: string[] = ['--autostart'];
    if (isMinimized) {
      args.push('--hidden');
    }
    app.setLoginItemSettings({
      openAtLogin,
      openAsHidden: isMinimized,
      args,
    });
  } catch (err) {
    console.warn('Failed to set login item settings:', err);
  }
}

function createWindow() {
  const winState = getSavedWindowState();
  const appIcon = getAppIcon();
  const isHiddenStartup = process.argv.includes('--hidden');

  mainWindow = new BrowserWindow({
    width: winState.width,
    height: winState.height,
    x: winState.x,
    y: winState.y,
    minWidth: 1024,
    minHeight: 680,
    frame: false,
    backgroundColor: '#0b0e14',
    title: 'Aegis Hub',
    icon: appIcon.isEmpty() ? undefined : appIcon,
    show: !isHiddenStartup,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
  });

  const settings = store.getSettings();
  if (winState.isMaximized || (settings.startupWindowMode === 'maximized' && !settings.startInBigPicture && process.argv.includes('--autostart'))) {
    mainWindow.maximize();
  }

  let resizeTimer: any = null;
  const debouncedSave = () => {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isFullScreen() && !isInBigPicture) {
        saveWindowState(mainWindow);
      }
    }, 300);
  };

  mainWindow.on('resize', debouncedSave);
  mainWindow.on('move', debouncedSave);
  mainWindow.on('focus', () => {
    try {
      const currentGames = store.getGames();
      const { updatedCount, games } = steamPlaytimeService.syncGamesPlaytime(currentGames, store);
      if (updatedCount > 0) {
        store.saveGames(games);
        mainWindow?.webContents.send('games-updated', games);
      }
    } catch (err) {
      console.warn('Focus steam playtime sync failed:', err);
    }
  });
  mainWindow.on('close', (event) => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isFullScreen() && !isInBigPicture) {
      saveWindowState(mainWindow);
    }

    const settings = store.getSettings();
    if (!isQuitting && settings.closeToTray) {
      event.preventDefault();
      mainWindow?.hide();
      return;
    }
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

  mainWindow.webContents.on('context-menu', (_event, params) => {
    if (params.selectionText && params.selectionText.trim().length > 0) {
      const menu = Menu.buildFromTemplate([
        { role: 'copy', label: 'Copy' },
        { role: 'selectAll', label: 'Select All' },
      ]);
      menu.popup();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function openSettingsWindow(initialTab?: string) {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    if (initialTab) {
      settingsWindow.webContents.send('set-settings-tab', initialTab);
    }
    if (settingsWindow.isMinimized()) {
      settingsWindow.restore();
    }
    settingsWindow.show();
    settingsWindow.focus();
    return;
  }

  const settingsIcon = getSettingsAppIcon();
  settingsWindow = new BrowserWindow({
    width: 1040,
    height: 740,
    minWidth: 860,
    minHeight: 580,
    frame: false,
    backgroundColor: '#0b0e14',
    title: 'Aegis Hub Settings',
    icon: settingsIcon.isEmpty() ? undefined : settingsIcon,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
  });

  if (process.platform === 'win32' && !settingsIcon.isEmpty()) {
    settingsWindow.setIcon(settingsIcon);
    try {
      const iconPath = path.join(__dirname, 'assets', 'aegis_settings_logo.png');
      settingsWindow.setAppDetails({
        appId: 'com.aegis.launcher.settings',
        appIconPath: fs.existsSync(iconPath) ? iconPath : undefined,
        relaunchDisplayName: 'Aegis Hub Settings',
      });
    } catch {}
  }

  const indexPath = path.join(__dirname, '../dist/index.html');
  const isDev = process.env.NODE_ENV === 'development';
  const query = { view: 'settings', tab: initialTab || '' };

  if (isDev) {
    const devUrl = `http://localhost:5173/?view=settings${initialTab ? `&tab=${initialTab}` : ''}`;
    settingsWindow.loadURL(devUrl).catch(() => {
      if (fs.existsSync(indexPath)) {
        settingsWindow?.loadFile(indexPath, { query });
      }
    });
  } else if (fs.existsSync(indexPath)) {
    settingsWindow.loadFile(indexPath, { query });
  } else {
    settingsWindow.loadURL(`http://localhost:5173/?view=settings${initialTab ? `&tab=${initialTab}` : ''}`);
  }

  settingsWindow.once('ready-to-show', () => {
    settingsWindow?.show();
    if (initialTab) {
      settingsWindow?.webContents.send('set-settings-tab', initialTab);
    }
  });

  settingsWindow.webContents.on('context-menu', (_event, params) => {
    if (params.selectionText && params.selectionText.trim().length > 0) {
      const menu = Menu.buildFromTemplate([
        { role: 'copy', label: 'Copy' },
        { role: 'selectAll', label: 'Select All' },
      ]);
      menu.popup();
    }
  });

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

function getRecentGamesForTray(): Game[] {
  try {
    const games = store.getGames();
    const installed = games.filter((g) => !g.hidden && g.installed !== false);

    // Primary sort: games with lastPlayed timestamp (most recent first)
    const played = installed.filter((g) => Boolean(g.lastPlayed));
    played.sort((a, b) => new Date(b.lastPlayed!).getTime() - new Date(a.lastPlayed!).getTime());

    if (played.length >= 10) {
      return played.slice(0, 10);
    }

    // Fill remaining slots up to 10 with other installed games
    const playedIds = new Set(played.map((g) => g.id));
    const remaining = installed
      .filter((g) => !playedIds.has(g.id))
      .sort((a, b) => (b.playtimeMinutes || 0) - (a.playtimeMinutes || 0));

    return [...played, ...remaining].slice(0, 10);
  } catch (err) {
    console.warn('Error fetching recent games for tray:', err);
    return [];
  }
}

function buildTrayContextMenu(): Menu {
  const recentGames = getRecentGamesForTray();

  const recentMenuItems: MenuItemConstructorOptions[] = recentGames.length > 0
    ? recentGames.map((g) => ({
        label: g.title.length > 38 ? g.title.substring(0, 36) + '...' : g.title,
        click: async () => {
          await launchGameCore(g.id);
          updateTrayMenu();
        },
      }))
    : [
        {
          label: 'No recent games',
          enabled: false,
        },
      ];

  const template: MenuItemConstructorOptions[] = [
    {
      label: 'Open Aegis Hub',
      click: () => {
        if (mainWindow) {
          if (!mainWindow.isVisible()) mainWindow.show();
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.focus();
        } else {
          createWindow();
        }
      },
    },
    {
      label: 'Recent Games',
      submenu: recentMenuItems,
    },
    {
      label: 'Settings & Options...',
      click: () => {
        openSettingsWindow();
      },
    },
    { type: 'separator' },
    {
      label: 'Exit Aegis Hub',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ];

  return Menu.buildFromTemplate(template);
}

function updateTrayMenu() {
  if (!tray) return;
  try {
    const menu = buildTrayContextMenu();
    tray.setContextMenu(menu);
  } catch (err) {
    console.warn('Failed to update tray context menu:', err);
  }
}

function createTray() {
  if (tray) return;

  const icon = getTrayIconImage();

  tray = new Tray(icon);
  tray.setToolTip('Aegis Hub');

  updateTrayMenu();

  // Refresh recent games submenu when right-clicked
  tray.on('right-click', () => {
    updateTrayMenu();
  });

  // Left-click on tray icon restores/toggles launcher window
  tray.on('click', () => {
    if (mainWindow) {
      if (!mainWindow.isVisible()) {
        mainWindow.show();
        mainWindow.focus();
      } else if (mainWindow.isMinimized()) {
        mainWindow.restore();
        mainWindow.focus();
      } else {
        mainWindow.focus();
      }
    } else {
      createWindow();
    }
  });

  tray.on('double-click', () => {
    if (mainWindow) {
      if (!mainWindow.isVisible()) mainWindow.show();
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    } else {
      createWindow();
    }
  });
}

// Helper to merge newly synced cloud games while preserving enriched genres, tags, descriptions, and user preferences
const mergeSyncedCloudGame = (prev: Game | undefined, cg: Game): Game => {
  if (!prev) return cg;
  const hasEnrichedPrevGenres =
    prev.genres &&
    prev.genres.length > 0 &&
    !genreEnrichmentService.isPlaceholderOrGenericGenres(prev.genres, prev.title, prev.storeId, prev.platform);
  const hasEnrichedCgGenres =
    cg.genres &&
    cg.genres.length > 0 &&
    !genreEnrichmentService.isPlaceholderOrGenericGenres(cg.genres, cg.title, cg.storeId, cg.platform);

  const hasEnrichedPrevDesc =
    prev.description && !gameCategoryService.isGenericDescription(prev.description, prev.title);
  const hasEnrichedCgDesc =
    cg.description && !gameCategoryService.isGenericDescription(cg.description, cg.title);

  return {
    ...cg,
    favorite: prev.favorite || cg.favorite,
    hidden: prev.hidden || cg.hidden,
    // @ts-ignore
    customCoverUrl: (prev as any).customCoverUrl,
    // @ts-ignore
    customBannerUrl: (prev as any).customBannerUrl,
    genres: hasEnrichedCgGenres ? cg.genres : hasEnrichedPrevGenres ? prev.genres : cg.genres,
    tags: prev.tags && prev.tags.length > 0 ? Array.from(new Set([...cg.tags, ...prev.tags])) : cg.tags,
    description: hasEnrichedCgDesc ? cg.description : hasEnrichedPrevDesc ? prev.description : cg.description,
    summary: prev.summary || cg.summary,
    developer: cg.developer || prev.developer,
    publisher: cg.publisher || prev.publisher,
    releaseDate: cg.releaseDate || prev.releaseDate,
    rating: typeof cg.rating === 'number' && cg.rating > 0 ? cg.rating : prev.rating,
    playtimeMinutes: Math.max(prev.playtimeMinutes || 0, cg.playtimeMinutes || 0),
    lastPlayed: prev.lastPlayed || cg.lastPlayed,
  };
};

// Automatically enriches genres in the background for any newly added or synced games lacking real genres
const triggerBackgroundGenreSyncIfNeeded = (gamesList?: Game[]) => {
  setTimeout(async () => {
    try {
      const currentGames = gamesList || store.getGames();
      const needsGenreSync = currentGames.some(
        (g) => g.platform !== 'emulator' && genreEnrichmentService.isPlaceholderOrGenericGenres(g.genres, g.title, g.storeId, g.platform)
      );
      if (needsGenreSync) {
        const { updatedCount } = await genreEnrichmentService.syncAllLibraryGenres(currentGames);
        if (updatedCount > 0) {
          store.saveGames(currentGames);
          const wins = BrowserWindow.getAllWindows();
          for (const win of wins) {
            win.webContents.send('games-updated', currentGames);
          }
        }
      }
    } catch (err) {
      console.warn('[GenreSync] Background genre enrichment error:', err);
    }
  }, 150);
};

app.on('before-quit', () => {
  isQuitting = true;
  try {
    const flagPath = getSuspendFlagPath();
    if (fs.existsSync(flagPath)) {
      fs.unlinkSync(flagPath);
    }
  } catch {}
});

app.whenReady().then(() => {
  // Listen for system sleep / suspend and wake events
  powerMonitor.on('suspend', () => {
    if (isInBigPicture || (mainWindow && mainWindow.isFullScreen())) {
      wasInBigPictureBeforeSuspend = true;
      try {
        fs.writeFileSync(getSuspendFlagPath(), '1', 'utf-8');
      } catch (err) {
        console.warn('Failed to write suspend flag:', err);
      }
    }
  });

  powerMonitor.on('resume', () => {
    const flagPath = getSuspendFlagPath();
    const hadFlag = fs.existsSync(flagPath);
    if (hadFlag) {
      try {
        fs.unlinkSync(flagPath);
      } catch {}
    }

    if (wasInBigPictureBeforeSuspend || hadFlag) {
      wasInBigPictureBeforeSuspend = false;
      if (mainWindow && !mainWindow.isDestroyed()) {
        isInBigPicture = true;
        if (!mainWindow.isFullScreen()) {
          mainWindow.setFullScreen(true);
        }
        setTimeout(() => {
          mainWindow?.webContents.send('restore-big-picture');
        }, 150);
      }
    }
  });
  // Handle aegis-media:// and legacy nexus-media:// local image loading reliably without Chromium sandbox blocks
  const handleMediaProtocol = async (request: Request) => {
    try {
      // Strip scheme 'aegis-media://' or 'nexus-media://'
      let raw = request.url.replace(/^(?:aegis|nexus)-media:\/\//i, '');
      // Strip legacy 'local/' prefix if present
      if (raw.startsWith('local/')) raw = raw.slice(6);
      // Discard query params and hash fragments (e.g. ?t=123456)
      raw = raw.split('?')[0].split('#')[0];
      // Decode percent-encoded characters (spaces, special chars)
      raw = decodeURIComponent(raw);
      // Remove any leading slashes or backslashes before the Windows drive letter or Unix root
      while (raw.startsWith('/') || raw.startsWith('\\')) {
        raw = raw.slice(1);
      }
      // If starts with a drive letter missing colon (e.g. 'c/Users' or 'C/Users' from host normalization), restore colon
      if (/^[a-zA-Z][\/\\]/.test(raw)) {
        raw = raw[0] + ':' + raw.slice(1);
      }
      const normalizedPath = path.normalize(raw);

      if (!fs.existsSync(normalizedPath)) {
        console.warn('media protocol 404:', normalizedPath, 'from request:', request.url);
        return new Response('Media file not found on disk', {
          status: 404,
          headers: { 'Cache-Control': 'no-store' },
        });
      }

      const fileBuffer = await fs.promises.readFile(normalizedPath);
      const ext = path.extname(normalizedPath).toLowerCase();
      let contentType = 'image/jpeg';
      if (ext === '.png') contentType = 'image/png';
      else if (ext === '.webp') contentType = 'image/webp';
      else if (ext === '.gif') contentType = 'image/gif';
      else if (ext === '.svg') contentType = 'image/svg+xml';

      return new Response(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'no-cache, must-revalidate',
        },
      });
    } catch (err: any) {
      console.error('media protocol error:', err);
      return new Response(`Error reading media: ${err?.message}`, { status: 500 });
    }
  };

  protocol.handle('aegis-media', handleMediaProtocol);
  protocol.handle('nexus-media', handleMediaProtocol);

  createWindow();
  createTray();
  syncLoginItemSettings(store.getSettings());

  // Initial auto-sync of Steam playtimes and daily activity
  try {
    const currentGames = store.getGames();
    const { updatedCount, games } = steamPlaytimeService.syncGamesPlaytime(currentGames, store);
    if (updatedCount > 0) {
      store.saveGames(games);
    }
  } catch (err) {
    console.warn('Initial Steam playtime sync failed:', err);
  }

  // Initial silent background auto-sync for cloud libraries on launch
  setTimeout(async () => {
    try {
      let currentGames = store.getGames();
      let hasChanges = false;

      // 1. Epic Games auto-sync
      if (epicDirectService.hasSavedTokens()) {
        try {
          console.log('[AutoSync] Running background Epic Games sync...');
          const epicGames = await epicDirectService.fetchOwnedGames();
          const prevEpicMap = new Map<string, Game>();
          for (const g of currentGames.filter(g => g.platform === 'epic')) {
            if (g.storeId) prevEpicMap.set(g.storeId, g);
            prevEpicMap.set(g.title.toLowerCase().trim(), g);
          }

          const updatedEpicGames = epicGames.map(cg => {
            const prev = (cg.storeId ? prevEpicMap.get(cg.storeId) : undefined) || prevEpicMap.get(cg.title.toLowerCase().trim());
            return mergeSyncedCloudGame(prev, cg);
          });

          const nonEpic = currentGames.filter(g => g.platform !== 'epic');
          currentGames = [...nonEpic, ...updatedEpicGames];
          hasChanges = true;

          const accounts = accountService.getAccounts();
          const epicAcc = accounts.find(a => a.platform === 'epic');
          if (epicAcc) {
            epicAcc.totalOwnedGames = epicGames.length;
            epicAcc.connected = true;
            epicAcc.lastSynced = new Date().toISOString();
            accountService.saveAccounts(accounts);
          }
        } catch (err: any) {
          console.warn('[AutoSync] Background Epic sync skipped/error:', err.message);
        }
      }

      // 2. Direct Steam auto-sync
      try {
        const steamGames = steamOwnedService.getOwnedSteamGames();
        if (steamGames.length > 0) {
          console.log('[AutoSync] Running background Steam sync...');
          const prevSteamMap = new Map<string, Game>();
          for (const g of currentGames.filter(g => g.platform === 'steam')) {
            if (g.storeId) prevSteamMap.set(g.storeId, g);
            prevSteamMap.set(g.title.toLowerCase().trim(), g);
          }

          const updatedSteamGames = steamGames.map(cg => {
            const prev = (cg.storeId ? prevSteamMap.get(cg.storeId) : undefined) || prevSteamMap.get(cg.title.toLowerCase().trim());
            return mergeSyncedCloudGame(prev, cg);
          });

          const nonSteam = currentGames.filter(g => g.platform !== 'steam');
          currentGames = [...nonSteam, ...updatedSteamGames];
          hasChanges = true;

          const accounts = accountService.getAccounts();
          const steamAcc = accounts.find(a => a.platform === 'steam');
          if (steamAcc) {
            steamAcc.totalOwnedGames = steamGames.length;
            steamAcc.connected = true;
            steamAcc.lastSynced = new Date().toISOString();
            accountService.saveAccounts(accounts);
          }
        }
      } catch (err: any) {
        console.warn('[AutoSync] Background Steam sync skipped/error:', err.message);
      }

      // 3. Ubisoft Connect auto-sync & token health check
      if (ubisoftDirectService.hasSavedTokens()) {
        try {
          const isExpired = ubisoftDirectService.isTokenExpired();
          const accounts = accountService.getAccounts();
          const ubiAcc = accounts.find(a => a.platform === 'ubisoft');
          if (isExpired) {
            console.log('[AutoSync] Ubisoft token expired, marking re-authentication required.');
            if (ubiAcc) {
              ubiAcc.needsReauth = true;
              ubiAcc.description = 'Session token expired. Re-authentication required.';
              accountService.saveAccounts(accounts);
            }
          } else {
            console.log('[AutoSync] Running background Ubisoft Connect sync...');
            const ubiGames = await ubisoftDirectService.fetchOwnedGames();
            if (ubiGames.length > 0) {
              const prevUbiMap = new Map<string, Game>();
              for (const g of currentGames.filter(g => g.platform === 'ubisoft')) {
                if (g.storeId) prevUbiMap.set(g.storeId, g);
                prevUbiMap.set(g.title.toLowerCase().trim(), g);
              }
              const updatedUbiGames = ubiGames.map(cg => {
                const prev = (cg.storeId ? prevUbiMap.get(cg.storeId) : undefined) || prevUbiMap.get(cg.title.toLowerCase().trim());
                return mergeSyncedCloudGame(prev, cg);
              });
              const nonUbi = currentGames.filter(g => g.platform !== 'ubisoft');
              currentGames = [...nonUbi, ...updatedUbiGames];
              hasChanges = true;
            }
            if (ubiAcc) {
              ubiAcc.needsReauth = false;
              ubiAcc.connected = true;
              if (ubiGames.length > 0) ubiAcc.totalOwnedGames = ubiGames.length;
              ubiAcc.lastSynced = new Date().toISOString();
              accountService.saveAccounts(accounts);
            }
          }
        } catch (err: any) {
          console.warn('[AutoSync] Background Ubisoft sync error:', err.message);
          const accounts = accountService.getAccounts();
          const ubiAcc = accounts.find(a => a.platform === 'ubisoft');
          if (ubiAcc && (err.message.includes('expired') || err.message.includes('re-auth'))) {
            ubiAcc.needsReauth = true;
            ubiAcc.description = 'Session token expired. Re-authentication required.';
            accountService.saveAccounts(accounts);
          }
        }
      }

      // 4. EA App auto-sync & token health check
      if (eaDirectService.hasSavedTokens()) {
        try {
          const isExpired = eaDirectService.isTokenExpired();
          const accounts = accountService.getAccounts();
          const eaAcc = accounts.find(a => a.platform === 'ea');
          if (isExpired) {
            console.log('[AutoSync] EA App token expired, marking re-authentication required.');
            if (eaAcc) {
              eaAcc.needsReauth = true;
              eaAcc.description = 'Session token expired. Re-authentication required.';
              accountService.saveAccounts(accounts);
            }
          } else {
            console.log('[AutoSync] Running background EA App sync...');
            const eaGames = await eaDirectService.fetchOwnedGames();
            if (eaGames.length > 0) {
              const prevEaMap = new Map<string, Game>();
              for (const g of currentGames.filter(g => g.platform === 'ea')) {
                if (g.storeId) prevEaMap.set(g.storeId, g);
                prevEaMap.set(g.title.toLowerCase().trim(), g);
              }
              const updatedEaGames = eaGames.map(cg => {
                const prev = (cg.storeId ? prevEaMap.get(cg.storeId) : undefined) || prevEaMap.get(cg.title.toLowerCase().trim());
                return mergeSyncedCloudGame(prev, cg);
              });
              const nonEa = currentGames.filter(g => g.platform !== 'ea');
              currentGames = [...nonEa, ...updatedEaGames];
              hasChanges = true;
            }
            if (eaAcc) {
              eaAcc.needsReauth = false;
              eaAcc.connected = true;
              if (eaGames.length > 0) eaAcc.totalOwnedGames = eaGames.length;
              eaAcc.lastSynced = new Date().toISOString();
              accountService.saveAccounts(accounts);
            }
          }
        } catch (err: any) {
          console.warn('[AutoSync] Background EA sync error:', err.message);
          const accounts = accountService.getAccounts();
          const eaAcc = accounts.find(a => a.platform === 'ea');
          if (eaAcc && (err.message.includes('expired') || err.message.includes('re-auth'))) {
            eaAcc.needsReauth = true;
            eaAcc.description = 'Session token expired. Re-authentication required.';
            accountService.saveAccounts(accounts);
          }
        }
      }

      if (hasChanges) {
        store.saveGames(currentGames);
        const windows = BrowserWindow.getAllWindows();
        for (const win of windows) {
          win.webContents.send('games-updated', currentGames);
        }
      }

      // Broadcast store accounts update to UI
      const finalAccounts = accountService.getAccounts();
      const allWins = BrowserWindow.getAllWindows();
      for (const win of allWins) {
        win.webContents.send('store-accounts-updated', finalAccounts);
      }

      // Background genre enrichment for any games with missing or placeholder genres
      triggerBackgroundGenreSyncIfNeeded(currentGames);
    } catch (err: any) {
      console.warn('[AutoSync] Background auto-sync error:', err.message);
    }
  }, 2500);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else if (mainWindow) {
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
  });
});

app.on('window-all-closed', () => {
  const settings = store.getSettings();
  if (process.platform !== 'darwin' && !settings.closeToTray) {
    app.quit();
  }
});

// Window controls IPC
ipcMain.on('window-minimize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
  win?.minimize();
});

ipcMain.on('window-maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
  if (win?.isMaximized()) {
    win.unmaximize();
  } else {
    win?.maximize();
  }
});

ipcMain.on('window-close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && win !== mainWindow) {
    win.close();
    return;
  }
  const settings = store.getSettings();
  if (!isQuitting && settings.closeToTray) {
    mainWindow?.hide();
    return;
  }
  app.quit();
});

ipcMain.on('app-quit', () => {
  isQuitting = true;
  app.quit();
});

ipcMain.handle('is-maximized', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
  return win?.isMaximized() || false;
});

ipcMain.handle('open-settings-window', (_event, tab?: string) => {
  openSettingsWindow(tab);
  return true;
});

ipcMain.handle('set-fullscreen', (_event, full: boolean) => {
  if (mainWindow) {
    if (full) {
      // Save current desktop bounds before entering Big Picture
      if (!mainWindow.isFullScreen() && !isInBigPicture) {
        saveWindowState(mainWindow);
      }
      isInBigPicture = true;
      mainWindow.setFullScreen(true);
    } else {
      isInBigPicture = false;
      mainWindow.setFullScreen(false);
      // Restore normal desktop bounds
      const state = getSavedWindowState();
      if (!state.isMaximized && state.width && state.height) {
        mainWindow.setSize(state.width, state.height);
        if (state.x !== undefined && state.y !== undefined) {
          mainWindow.setPosition(state.x, state.y);
        } else {
          mainWindow.center();
        }
      } else if (state.isMaximized) {
        mainWindow.maximize();
      }
    }
    return mainWindow.isFullScreen();
  }
  return false;
});

ipcMain.handle('is-fullscreen', () => {
  return mainWindow?.isFullScreen() || false;
});

ipcMain.handle('check-start-big-picture', () => {
  const flagPath = getSuspendFlagPath();
  if (fs.existsSync(flagPath)) {
    try {
      fs.unlinkSync(flagPath);
    } catch {}
    isInBigPicture = true;
    return true;
  }
  // When launching hidden to tray with Windows, don't trigger Big Picture fullscreen
  if (process.argv.includes('--hidden')) {
    return false;
  }
  if (process.argv.includes('--bigpicture')) {
    isInBigPicture = true;
    return true;
  }
  const settings = store.getSettings();
  if (settings.startInBigPicture) {
    isInBigPicture = true;
    return true;
  }
  return false;
});

ipcMain.handle('system-power-action', async (_event, action: 'shutdown' | 'restart' | 'sleep') => {
  const flagPath = getSuspendFlagPath();

  if (action === 'shutdown' || action === 'restart') {
    wasInBigPictureBeforeSuspend = false;
    try {
      if (fs.existsSync(flagPath)) fs.unlinkSync(flagPath);
    } catch {}
  } else if (action === 'sleep') {
    wasInBigPictureBeforeSuspend = isInBigPicture || (mainWindow?.isFullScreen() ?? false);
    if (wasInBigPictureBeforeSuspend) {
      try {
        fs.writeFileSync(flagPath, '1', 'utf-8');
      } catch (err) {
        console.warn('Failed to write suspend flag:', err);
      }
    }
  }

  const { exec } = await import('child_process');
  if (process.platform === 'win32') {
    if (action === 'shutdown') {
      exec('shutdown /s /t 1');
    } else if (action === 'restart') {
      exec('shutdown /r /t 1');
    } else if (action === 'sleep') {
      exec('powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Application]::SetSuspendState([System.Windows.Forms.PowerState]::Suspend, $false, $false)"');
    }
    return { success: true };
  } else if (process.platform === 'darwin') {
    if (action === 'shutdown') {
      exec('osascript -e \'tell app "System Events" to shut down\'');
    } else if (action === 'restart') {
      exec('osascript -e \'tell app "System Events" to restart\'');
    } else if (action === 'sleep') {
      exec('osascript -e \'tell app "System Events" to sleep\'');
    }
    return { success: true };
  } else {
    // Linux
    if (action === 'shutdown') {
      exec('systemctl poweroff || shutdown -h now');
    } else if (action === 'restart') {
      exec('systemctl reboot || reboot');
    } else if (action === 'sleep') {
      exec('systemctl suspend');
    }
    return { success: true };
  }
});

// Library Storage IPC
ipcMain.handle('get-games', () => {
  const games = store.getGames();
  const { updatedCount } = steamPlaytimeService.syncGamesPlaytime(games);
  const { updatedCount: genreUpdatedCount } = genreEnrichmentService.enrichAllGamesSync(games);
  const { updatedCount: installUpdatedCount } = gameInstallationService.syncInstallationStatus(games);
  
  let ratingUpdated = false;
  for (const g of games) {
    if (g.platform === 'steam' && g.storeId && (typeof g.rating !== 'number' || g.rating === 0)) {
      const cached = steamRatingService.getCachedRating(g.storeId);
      if (typeof cached === 'number' && cached > 0) {
        g.rating = cached;
        ratingUpdated = true;
      }
    }
  }

  if (updatedCount > 0 || ratingUpdated || genreUpdatedCount > 0 || installUpdatedCount > 0) {
    store.saveGames(games);
  }

  return games.map(g => {
    let coverUrl = g.coverUrl;
    let bannerUrl = g.bannerUrl;
    let storeId = g.storeId;

    if (!storeId && g.executablePath) {
      const match = g.executablePath.match(/steam:\/\/rungameid\/(\d+)/);
      if (match) storeId = match[1];
    }
    if (!storeId && g.id.startsWith('steam-')) {
      const match = g.id.match(/steam-(\d+)/);
      if (match) storeId = match[1];
    }

    if (g.platform === 'steam' && storeId) {
      if (!coverUrl || coverUrl.startsWith('data:image/svg')) {
        coverUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${storeId}/library_600x900.jpg`;
      }
      if (!bannerUrl || bannerUrl.startsWith('data:image/svg')) {
        bannerUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${storeId}/library_hero.jpg`;
      }
    }

    return {
      ...g,
      storeId: storeId || g.storeId,
      coverUrl,
      bannerUrl,
      isRunning: runningGames.has(g.id),
    };
  });
});

ipcMain.handle('sync-steam-playtime', () => {
  const currentGames = store.getGames();
  const { updatedCount, games } = steamPlaytimeService.syncGamesPlaytime(currentGames, store);
  if (updatedCount > 0) {
    store.saveGames(games);
  }
  return { updatedCount, games };
});

ipcMain.handle('sync-steam-ratings', async () => {
  const currentGames = store.getGames();
  const { updatedCount, games } = await steamRatingService.syncGamesRatings(currentGames);
  if (updatedCount > 0) {
    store.saveGames(games);
  }
  return { updatedCount, games };
});

ipcMain.handle('sync-installation-status', () => {
  const currentGames = store.getGames();
  const { updatedCount, installedCount } = gameInstallationService.syncInstallationStatus(currentGames, true);
  if (updatedCount > 0) {
    store.saveGames(currentGames);
  }
  return { updatedCount, installedCount, games: currentGames };
});

ipcMain.handle('fetch-game-categories', async (_event, game: Game) => {
  const result = await gameCategoryService.fetchCategoriesForGame({
    title: game.title,
    platform: game.platform,
    storeId: game.storeId,
  });
  if (result) {
    const games = store.getGames();
    const target = games.find((g) => g.id === game.id);
    if (target) {
      target.genres = result.genres;
      if (result.tags) {
        target.tags = Array.from(new Set([...(target.tags || []), ...result.tags]));
      }
      if (result.developer && (target.platform === 'emulator' || !target.developer || target.developer === 'Unknown')) {
        target.developer = result.developer;
      }
      if (result.publisher && (target.platform === 'emulator' || !target.publisher || target.publisher === 'Independent' || target.publisher.includes('|language=') || target.publisher.includes('</ref>') || target.publisher.includes('}}'))) {
        target.publisher = result.publisher;
      }
      if (result.releaseDate && (target.platform === 'emulator' || !target.releaseDate)) {
        target.releaseDate = result.releaseDate;
      }
      if (result.description && (!target.description || gameCategoryService.isGenericDescription(target.description) || target.description.startsWith('Emulated title for'))) {
        target.description = result.description;
      }
      if (result.summary && (!target.summary || gameCategoryService.isGenericDescription(target.summary) || target.summary.startsWith('Emulated title for'))) {
        target.summary = result.summary;
      }
      store.saveGames(games);
    }
  }
  return result;
});

ipcMain.handle('sync-all-categories', async () => {
  const games = store.getGames();
  const { updatedCount, games: updatedGames } = await gameCategoryService.syncMissingCategories(games);
  if (updatedCount > 0) {
    store.saveGames(updatedGames);
  }
  return { updatedCount, games: updatedGames };
});

ipcMain.handle('get-game-gallery', async (_event, game: Game) => {
  return await gameGalleryService.fetchGameGallery({
    title: game.title,
    platform: game.platform,
    storeId: game.storeId,
    bannerUrl: game.bannerUrl,
    coverUrl: game.coverUrl,
  });
});

ipcMain.handle('open-external-url', async (_event, url: string) => {
  if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('steam://'))) {
    await shell.openExternal(url);
    return true;
  }
  return false;
});

ipcMain.handle('save-games', (_event, games: Game[]) => {
  store.saveGames(games);
  updateTrayMenu();
  triggerBackgroundGenreSyncIfNeeded(games);
  return true;
});

ipcMain.handle('get-settings', () => {
  return store.getSettings();
});

ipcMain.handle('save-settings', (_event, settings: LauncherSettings) => {
  store.saveSettings(settings);
  if (settings.trayIconColor) {
    updateTrayIcon(settings.trayIconColor);
  }
  syncLoginItemSettings(settings);
  BrowserWindow.getAllWindows().forEach((win) => {
    if (!win.isDestroyed()) {
      win.webContents.send('settings-updated', settings);
    }
  });
  return true;
});

// Daily Activity History IPC
ipcMain.handle('get-daily-activity', () => {
  try {
    const currentGames = store.getGames();
    const { updatedCount, games } = steamPlaytimeService.syncGamesPlaytime(currentGames, store);
    if (updatedCount > 0) {
      store.saveGames(games);
    }
  } catch (err) {
    console.warn('get-daily-activity auto-sync failed:', err);
  }
  return store.getActivity();
});

ipcMain.handle('record-daily-activity', (_event, dateStr: string, minutes: number) => {
  store.recordDailyActivity(dateStr, minutes);
  return true;
});

ipcMain.handle('get-recommended-games', async (_event, options?: { platform?: string; store?: string; genre?: string; query?: string; yearFrom?: number; yearTo?: number; excludeTitles?: string[] }) => {
  const settings = store.getSettings();
  const libraryGames = store.getGames();
  const filterAdult = settings.filterAdultGames !== false;
  return gameDiscoveryService.getRecommendedGames({
    ...options,
    rawgApiKey: settings.rawgApiKey,
    libraryGames,
    filterAdult,
  });
});

ipcMain.handle('get-steam-releases', async (_event, args?: { year?: number; month?: number }) => {
  const settings = store.getSettings();
  const filterAdult = settings.filterAdultGames !== false; // Default true
  return steamDiscoveryService.getReleases(args?.year, args?.month, filterAdult);
});

ipcMain.handle('ask-gemini-recommended-games', async (_event, args: { prompt: string; apiKey?: string; excludeTitles?: string[] }) => {
  const settings = store.getSettings();
  const apiKey = args.apiKey || settings.geminiApiKey || '';
  const filterAdult = settings.filterAdultGames !== false;
  return geminiService.getAiRecommendations(args.prompt, apiKey, {
    excludeTitles: args.excludeTitles,
    filterAdult,
  });
});

ipcMain.handle('get-pulse-data', async (_event, forceRefresh?: boolean) => {
  try {
    const currentGames = store.getGames();
    const { updatedCount, games } = steamPlaytimeService.syncGamesPlaytime(currentGames, store);
    if (updatedCount > 0) {
      store.saveGames(games);
    }
  } catch (err) {
    console.warn('get-pulse-data auto-sync failed:', err);
  }
  return gamePulseService.getPulseData(Boolean(forceRefresh));
});

ipcMain.handle('get-recent-achievements', async (_event, limit?: number) => {
  const steamAchs = steamAchievementService.getRecentAchievements(limit || 6);
  if (steamAchs.length > 0) return steamAchs;
  return galaxyDbService.getRecentAchievements(limit || 6);
});

ipcMain.handle('get-game-achievement-progress', async (_event, appId: string) => {
  return steamAchievementService.getGameAchievementProgress(appId);
});

// App Update IPC Handlers
ipcMain.handle('check-for-updates', async () => {
  return updaterService.checkForUpdates();
});

ipcMain.handle('download-update', async (event, args: { downloadUrl: string; fileName: string }) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  return updaterService.downloadUpdate(args.downloadUrl, args.fileName, (progress) => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('update-download-progress', progress);
    }
  });
});

ipcMain.handle('install-update', async (_event, installerPath?: string) => {
  return updaterService.installAndRestart(installerPath);
});

ipcMain.handle('reset-launcher-data', () => {
  const dataDir = app.getPath('userData');
  const gamesFile = path.join(dataDir, 'games.json');
  const accountsFile = path.join(dataDir, 'store-accounts.json');
  const mediaCache = path.join(dataDir, 'media-cache');

  try {
    if (fs.existsSync(gamesFile)) fs.unlinkSync(gamesFile);
    if (fs.existsSync(accountsFile)) fs.unlinkSync(accountsFile);
    if (fs.existsSync(mediaCache)) fs.rmSync(mediaCache, { recursive: true, force: true });
  } catch (err) {
    console.error('Error clearing data:', err);
  }

  return store.getGames();
});

// Local Backup & Restore IPC (Settings, API Keys, and Playtime - NO store credentials)
ipcMain.handle('export-backup', async () => {
  if (!mainWindow) return { success: false, message: 'Main window not available' };

  const defaultDate = new Date().toISOString().slice(0, 10);
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Aegis Hub Local Backup',
    defaultPath: `aegis-backup-${defaultDate}.json`,
    filters: [{ name: 'JSON Backup', extensions: ['json'] }],
  });

  if (result.canceled || !result.filePath) {
    return { success: false, canceled: true };
  }

  try {
    const settings = store.getSettings();
    // Exclude store accounts and tokens - strictly export settings & API keys
    const safeSettings: Partial<LauncherSettings> = {
      geminiApiKey: settings.geminiApiKey,
      rawgApiKey: settings.rawgApiKey,
      closeOnLaunch: settings.closeOnLaunch,
      minimizeToTray: settings.minimizeToTray,
      closeToTray: settings.closeToTray,
      autoScanOnStartup: settings.autoScanOnStartup,
      libraryViewMode: settings.libraryViewMode,
      gridSize: settings.gridSize,
      sortBy: settings.sortBy,
      sortOrder: settings.sortOrder,
      scanPaths: settings.scanPaths,
      defaultFilter: settings.defaultFilter,
      defaultPlatform: settings.defaultPlatform,
      showHiddenGamesCollection: settings.showHiddenGamesCollection,
      showPlatformBadges: settings.showPlatformBadges,
      trayIconColor: settings.trayIconColor,
    };

    const dailyActivity = store.getActivity();
    const games = store.getGames();

    // Export games with artwork, metadata, and custom properties
    const backupGames = games.map((g) => ({
      id: g.id,
      title: g.title,
      platform: g.platform,
      storeId: g.storeId,
      executablePath: g.executablePath,
      launchArgs: g.launchArgs,
      installPath: g.installPath,
      installUrl: g.installUrl,
      coverUrl: g.coverUrl,
      bannerUrl: g.bannerUrl,
      logoUrl: g.logoUrl,
      iconUrl: g.iconUrl,
      description: g.description,
      summary: g.summary,
      developer: g.developer,
      publisher: g.publisher,
      releaseDate: g.releaseDate,
      genres: g.genres,
      tags: g.tags,
      rating: g.rating,
      favorite: g.favorite || false,
      hidden: g.hidden || false,
      installed: g.installed !== false,
      playtimeMinutes: g.playtimeMinutes || 0,
      lastPlayed: g.lastPlayed,
    }));

    // For backwards compatibility with v1 restore tools
    const gamesPlaytime = backupGames.map((g) => ({
      id: g.id,
      title: g.title,
      platform: g.platform,
      storeId: g.storeId,
      playtimeMinutes: g.playtimeMinutes,
      lastPlayed: g.lastPlayed,
      favorite: g.favorite,
      hidden: g.hidden,
    }));

    const backupPayload = {
      backupVersion: 2,
      app: 'Aegis Hub',
      exportedAt: new Date().toISOString(),
      settings: safeSettings,
      dailyActivity,
      games: backupGames,
      gamesPlaytime,
    };

    fs.writeFileSync(result.filePath, JSON.stringify(backupPayload, null, 2), 'utf-8');
    return { success: true, filePath: result.filePath, gamesCount: backupGames.length };
  } catch (err: any) {
    console.error('Failed to export backup:', err);
    return { success: false, message: err?.message || 'Error exporting backup' };
  }
});

ipcMain.handle('import-backup', async () => {
  if (!mainWindow) return { success: false, message: 'Main window not available' };

  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Aegis Hub Backup File',
    properties: ['openFile'],
    filters: [{ name: 'JSON Backup', extensions: ['json'] }],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { success: false, canceled: true };
  }

  try {
    const filePath = result.filePaths[0];
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);

    if (!data || typeof data !== 'object') {
      return { success: false, message: 'Invalid backup file format.' };
    }

    // 1. Restore settings & API keys
    if (data.settings && typeof data.settings === 'object') {
      const current = store.getSettings();
      const updatedSettings: LauncherSettings = {
        ...current,
        ...(data.settings.geminiApiKey ? { geminiApiKey: data.settings.geminiApiKey } : {}),
        ...(data.settings.rawgApiKey ? { rawgApiKey: data.settings.rawgApiKey } : {}),
        ...(data.settings.closeOnLaunch !== undefined ? { closeOnLaunch: data.settings.closeOnLaunch } : {}),
        ...(data.settings.minimizeToTray !== undefined ? { minimizeToTray: data.settings.minimizeToTray } : {}),
        ...(data.settings.closeToTray !== undefined ? { closeToTray: data.settings.closeToTray } : {}),
        ...(data.settings.autoScanOnStartup !== undefined ? { autoScanOnStartup: data.settings.autoScanOnStartup } : {}),
        ...(data.settings.libraryViewMode ? { libraryViewMode: data.settings.libraryViewMode } : {}),
        ...(data.settings.gridSize ? { gridSize: data.settings.gridSize } : {}),
        ...(data.settings.sortBy ? { sortBy: data.settings.sortBy } : {}),
        ...(data.settings.sortOrder ? { sortOrder: data.settings.sortOrder } : {}),
        ...(Array.isArray(data.settings.scanPaths) ? { scanPaths: data.settings.scanPaths } : {}),
        ...(data.settings.defaultFilter ? { defaultFilter: data.settings.defaultFilter } : {}),
        ...(data.settings.defaultPlatform ? { defaultPlatform: data.settings.defaultPlatform } : {}),
        ...(data.settings.showHiddenGamesCollection !== undefined ? { showHiddenGamesCollection: data.settings.showHiddenGamesCollection } : {}),
        ...(data.settings.showPlatformBadges !== undefined ? { showPlatformBadges: data.settings.showPlatformBadges } : {}),
        ...(data.settings.trayIconColor ? { trayIconColor: data.settings.trayIconColor } : {}),
      };
      store.saveSettings(updatedSettings);
    }

    // 2. Restore daily activity (merge with existing so no days are lost)
    if (data.dailyActivity && typeof data.dailyActivity === 'object') {
      const currentActivity = store.getActivity();
      const mergedActivity = { ...currentActivity };
      for (const [dateStr, mins] of Object.entries(data.dailyActivity)) {
        if (typeof mins === 'number' && mins > 0) {
          mergedActivity[dateStr] = Math.max(mergedActivity[dateStr] || 0, mins);
        }
      }
      store.saveActivity(mergedActivity);
    }

    // 3. Helper validation functions to prevent broken paths & missing files
    const isImageAccessible = (imgSrc?: string): boolean => {
      if (!imgSrc || typeof imgSrc !== 'string') return false;
      const trimmed = imgSrc.trim();
      if (!trimmed) return false;
      // Web URLs or embedded Data URIs are accessible
      if (
        trimmed.startsWith('http://') ||
        trimmed.startsWith('https://') ||
        trimmed.startsWith('data:image/')
      ) {
        return true;
      }
      // Check local file path (supports aegis-media://, nexus-media://, file://, or plain filesystem path)
      try {
        let localPath = trimmed
          .replace(/^(?:aegis|nexus)-media:\/\/(?:local\/)?/i, '')
          .replace(/^file:\/\/\/?/i, '');
        localPath = decodeURIComponent(localPath);
        while (localPath.startsWith('/') || localPath.startsWith('\\')) {
          localPath = localPath.slice(1);
        }
        return fs.existsSync(localPath);
      } catch {
        return false;
      }
    };

    const isExecutableAccessible = (exePath?: string): boolean => {
      if (!exePath || typeof exePath !== 'string') return false;
      const trimmed = exePath.trim();
      if (!trimmed) return false;
      // Store launcher protocol URIs (e.g. steam://rungameid/..., com.epicgames.launcher://, uplay://, origin2://)
      if (/^[a-z0-9+.-]+:\/\//i.test(trimmed)) {
        return true;
      }
      // Filesystem path
      try {
        return fs.existsSync(trimmed);
      } catch {
        return false;
      }
    };

    // 4. Restore games, metadata, custom artwork, playtime, and status
    let updatedGamesCount = 0;
    let addedGamesCount = 0;
    const currentGames = store.getGames();
    const currentGamesMap = new Map<string, Game>();
    for (const g of currentGames) {
      if (g.id) currentGamesMap.set(g.id, g);
    }

    const backupList: any[] = Array.isArray(data.games)
      ? data.games
      : Array.isArray(data.gamesPlaytime)
      ? data.gamesPlaytime
      : [];

    const newGamesToAdd: Game[] = [];

    for (const b of backupList) {
      if (!b || typeof b !== 'object') continue;

      try {
        // Try finding matching existing game in current library
        let existing =
          (b.id && currentGamesMap.get(b.id)) ||
          currentGames.find(
            (g) =>
              (b.storeId && g.storeId && b.platform === g.platform && String(b.storeId) === String(g.storeId)) ||
              (b.title && g.title && b.title.trim().toLowerCase() === g.title.trim().toLowerCase())
          );

        if (existing) {
          let modified = false;

          // 1. Playtime & Last Played (keep highest / most recent)
          if (typeof b.playtimeMinutes === 'number' && b.playtimeMinutes > (existing.playtimeMinutes || 0)) {
            existing.playtimeMinutes = b.playtimeMinutes;
            modified = true;
          }
          if (b.lastPlayed && (!existing.lastPlayed || new Date(b.lastPlayed) > new Date(existing.lastPlayed))) {
            existing.lastPlayed = b.lastPlayed;
            modified = true;
          }
          if (b.favorite !== undefined && b.favorite !== existing.favorite) {
            existing.favorite = b.favorite;
            modified = true;
          }
          if (b.hidden !== undefined && b.hidden !== existing.hidden) {
            existing.hidden = b.hidden;
            modified = true;
          }

          // 2. Custom Title (apply customized title from backup)
          if (b.title && typeof b.title === 'string' && b.title.trim() && b.title.trim() !== existing.title) {
            existing.title = b.title.trim();
            modified = true;
          }

          // 3. Covers & Banners (skip if local path was deleted or is missing)
          if (b.coverUrl && isImageAccessible(b.coverUrl) && b.coverUrl !== existing.coverUrl) {
            existing.coverUrl = b.coverUrl;
            modified = true;
          }
          if (b.bannerUrl && isImageAccessible(b.bannerUrl) && b.bannerUrl !== existing.bannerUrl) {
            existing.bannerUrl = b.bannerUrl;
            modified = true;
          }
          if (b.iconUrl && isImageAccessible(b.iconUrl) && b.iconUrl !== existing.iconUrl) {
            existing.iconUrl = b.iconUrl;
            modified = true;
          }
          if (b.logoUrl && isImageAccessible(b.logoUrl) && b.logoUrl !== existing.logoUrl) {
            existing.logoUrl = b.logoUrl;
            modified = true;
          }

          // 4. Metadata: description, summary, genres, developer, publisher
          if (
            b.description &&
            typeof b.description === 'string' &&
            b.description.trim().length > (existing.description || '').trim().length
          ) {
            existing.description = b.description;
            modified = true;
          }
          if (b.summary && typeof b.summary === 'string' && b.summary.trim()) {
            existing.summary = b.summary;
            modified = true;
          }
          if (Array.isArray(b.genres) && b.genres.length > 0 && (!existing.genres || existing.genres.length === 0)) {
            existing.genres = b.genres;
            modified = true;
          }
          if (b.developer && (!existing.developer || existing.developer === 'Unknown')) {
            existing.developer = b.developer;
            modified = true;
          }
          if (b.publisher && (!existing.publisher || existing.publisher === 'Independent')) {
            existing.publisher = b.publisher;
            modified = true;
          }

          if (modified) {
            updatedGamesCount++;
          }
        } else {
          // Game not currently in library.
          // Skip if it is a manual or emulator game whose executable/ROM no longer exists on disk
          if (b.platform === 'manual' || b.platform === 'emulator') {
            if (!isExecutableAccessible(b.executablePath)) {
              // Executable or ROM no longer exists at original path: skip item safely!
              continue;
            }
          }

          // Build clean restored game object
          const newGame: Game = {
            id: b.id || `game-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            title: b.title || 'Unknown Title',
            platform: b.platform || 'manual',
            executablePath: b.executablePath || '',
            launchArgs: b.launchArgs,
            installPath: b.installPath,
            installUrl: b.installUrl,
            coverUrl: isImageAccessible(b.coverUrl) ? b.coverUrl : '',
            bannerUrl: isImageAccessible(b.bannerUrl) ? b.bannerUrl : '',
            iconUrl: isImageAccessible(b.iconUrl) ? b.iconUrl : undefined,
            logoUrl: isImageAccessible(b.logoUrl) ? b.logoUrl : undefined,
            description: b.description || '',
            summary: b.summary,
            genres: Array.isArray(b.genres) ? b.genres : ['PC Game'],
            tags: Array.isArray(b.tags) ? b.tags : [],
            developer: b.developer,
            publisher: b.publisher,
            releaseDate: b.releaseDate,
            rating: typeof b.rating === 'number' ? b.rating : undefined,
            favorite: Boolean(b.favorite),
            hidden: Boolean(b.hidden),
            installed: b.installed !== false,
            playtimeMinutes: typeof b.playtimeMinutes === 'number' ? b.playtimeMinutes : 0,
            lastPlayed: b.lastPlayed,
          };

          newGamesToAdd.push(newGame);
          currentGamesMap.set(newGame.id, newGame);
          addedGamesCount++;
        }
      } catch (errItem) {
        console.warn('Skipping corrupt backup game item:', errItem);
      }
    }

    const finalGames = [...currentGames, ...newGamesToAdd];
    if (updatedGamesCount > 0 || addedGamesCount > 0) {
      store.saveGames(finalGames);
      // Broadcast updated games to any open windows
      const windows = BrowserWindow.getAllWindows();
      for (const win of windows) {
        win.webContents.send('games-updated', finalGames);
      }
    }

    const currentSettings = store.getSettings();
    return {
      success: true,
      updatedGamesCount,
      addedGamesCount,
      settings: currentSettings,
      games: finalGames,
      dailyActivity: store.getActivity(),
    };
  } catch (err: any) {
    console.error('Failed to import backup:', err);
    return { success: false, message: err?.message || 'Error restoring backup' };
  }
});

// Artwork Lookup & Caching IPC
ipcMain.handle('search-artwork', async (_event, title: string, platformOrEmuId?: string) => {
  return await lookupGameArtwork(title, platformOrEmuId);
});

ipcMain.handle('search-artwork-suggestions', async (_event, title: string, platformOrEmuId?: string) => {
  return await imageManager.searchArtworkSuggestions(title, platformOrEmuId);
});

ipcMain.handle('cache-image', async (_event, { url, type, gameId }: { url: string; type: 'cover' | 'banner'; gameId: string }) => {
  return await imageManager.cacheRemoteImage(url, type, gameId);
});

ipcMain.handle('to-media-url', (_event, localPath: string) => {
  return imageManager.toMediaUrl(localPath);
});

// Auto-fetch missing artwork from online stores for Local and cloud games
ipcMain.handle('auto-fetch-all-missing-artwork', async () => {
  const currentGames = store.getGames();
  let updatedCount = 0;

  for (const game of currentGames) {
    let storeId = game.storeId;
    if (!storeId && game.executablePath) {
      const match = game.executablePath.match(/steam:\/\/rungameid\/(\d+)/);
      if (match) storeId = match[1];
    }
    if (!storeId && game.id.startsWith('steam-')) {
      const match = game.id.match(/steam-(\d+)/);
      if (match) storeId = match[1];
    }

    const isMissingCover =
      !game.coverUrl ||
      game.coverUrl.startsWith('data:image/svg') ||
      game.coverUrl.includes('placeholder');

    if (isMissingCover) {
      if (game.platform === 'steam' && storeId) {
        game.storeId = storeId;
        game.coverUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${storeId}/library_600x900.jpg`;
        game.bannerUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${storeId}/library_hero.jpg`;
        updatedCount++;
        continue;
      }

      // Online lookup (Libretro Boxarts + Wikipedia + Steam Store API + GOG Catalog API)
      const platformOrEmuId = game.platform === 'emulator' ? (game.storeId || 'emulator') : game.platform;
      const art = await lookupGameArtwork(game.title, platformOrEmuId);
      if (art && art.coverUrl) {
        game.coverUrl = art.coverUrl;
        if (art.bannerUrl && (!game.bannerUrl || game.bannerUrl.startsWith('data:image/svg'))) {
          game.bannerUrl = art.bannerUrl;
        }
        if (art.genres && (!game.genres || game.genres.length === 0 || game.genres[0] === 'PC Game')) {
          game.genres = art.genres;
        }
        if (art.developer && !game.developer) {
          game.developer = art.developer;
        }
        updatedCount++;
      }
    }
  }

  if (updatedCount > 0) {
    store.saveGames(currentGames);
  }

  return { updatedCount, games: currentGames };
});

// Bulk Scrape metadata and artwork for all emulated games
ipcMain.handle('scrape-all-emulators-metadata', async () => {
  const currentGames = store.getGames();
  const emuGames = currentGames.filter((g) => g.platform === 'emulator' && !g.hidden);
  let updatedCount = 0;
  const total = emuGames.length;

  for (let i = 0; i < emuGames.length; i++) {
    const game = emuGames[i];
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('scraper-progress', {
        current: i + 1,
        total,
        gameTitle: game.title,
        coverUrl: game.coverUrl,
      });
    }

    try {
      const platformOrEmuId = game.storeId || 'emulator';
      const meta = await scrapeEmulatorGameMetadata(game.title, platformOrEmuId);
      // Brief pause between requests to prevent API rate limiting
      await new Promise((r) => setTimeout(r, 200));
      if (meta) {
        let changed = false;
        if (meta.coverUrl && (!game.coverUrl || game.coverUrl.startsWith('data:image/svg') || game.coverUrl.includes('placeholder'))) {
          game.coverUrl = meta.coverUrl;
          changed = true;
        }
        if (meta.bannerUrl && (!game.bannerUrl || game.bannerUrl.startsWith('data:image/svg'))) {
          game.bannerUrl = meta.bannerUrl;
          changed = true;
        }
        if (meta.description && (!game.description || game.description.startsWith('Emulated title for'))) {
          game.description = meta.description;
          changed = true;
        }
        if (meta.developer) {
          game.developer = meta.developer;
          changed = true;
        }
        if (meta.publisher) {
          game.publisher = meta.publisher;
          changed = true;
        }
        if (meta.releaseDate) {
          game.releaseDate = meta.releaseDate;
          changed = true;
        }
        if (meta.genres && meta.genres.length > 0) {
          const isGeneric = !game.genres || game.genres.length === 0 || game.genres.every((g) => g === 'Emulated' || g.toLowerCase().includes('retro'));
          if (isGeneric) {
            game.genres = meta.genres;
            changed = true;
          }
        }
        if (changed) {
          updatedCount++;
        }
      }
    } catch (e: any) {
      console.warn(`[Scraper] Failed to scrape metadata for ${game.title}:`, e?.message);
    }
  }

  if (updatedCount > 0) {
    store.saveGames(currentGames);
  }

  return { updatedCount, totalCount: total, games: currentGames };
});

// Single game metadata scrape
ipcMain.handle('scrape-single-game-metadata', async (_event, gameId: string) => {
  const currentGames = store.getGames();
  const game = currentGames.find((g) => g.id === gameId);
  if (!game) return { success: false, message: 'Game not found' };

  try {
    const meta = await scrapeEmulatorGameMetadata(game.title, game.storeId || game.platform);
    if (meta) {
      if (meta.coverUrl) game.coverUrl = meta.coverUrl;
      if (meta.bannerUrl) game.bannerUrl = meta.bannerUrl;
      if (meta.description) game.description = meta.description;
      if (meta.developer) game.developer = meta.developer;
      if (meta.publisher) game.publisher = meta.publisher;
      if (meta.releaseDate) game.releaseDate = meta.releaseDate;
      if (meta.genres && meta.genres.length > 0) game.genres = meta.genres;

      store.saveGames(currentGames);
      return { success: true, game, games: currentGames };
    }
  } catch (e: any) {
    return { success: false, message: e?.message };
  }
  return { success: false, message: 'No metadata found' };
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

    // Merge newly synced cloud games into library (refresh platform items while preserving favorites & custom art)
    const currentGames = store.getGames();
    const prevMap = new Map<string, Game>();
    for (const g of currentGames.filter(g => g.platform === platform)) {
      if (g.storeId) prevMap.set(g.storeId, g);
      prevMap.set(g.title.toLowerCase().trim(), g);
    }

    const updatedPlatformGames = result.games.map(cg => {
      const prev = (cg.storeId ? prevMap.get(cg.storeId) : undefined) || prevMap.get(cg.title.toLowerCase().trim());
      return mergeSyncedCloudGame(prev, cg);
    });

    const otherGames = currentGames.filter(g => g.platform !== platform);
    const merged = [...otherGames, ...updatedPlatformGames];
    store.saveGames(merged);
    triggerBackgroundGenreSyncIfNeeded(merged);

    return { account: result.account, games: updatedPlatformGames };
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

  // Merge newly synced cloud games into library (refresh platform items while preserving favorites & custom art)
  const currentGames = store.getGames();
  const prevMap = new Map<string, Game>();
  for (const g of currentGames.filter(g => g.platform === platform)) {
    if (g.storeId) prevMap.set(g.storeId, g);
    prevMap.set(g.title.toLowerCase().trim(), g);
  }

  const updatedPlatformGames = result.games.map(cg => {
    const prev = (cg.storeId ? prevMap.get(cg.storeId) : undefined) || prevMap.get(cg.title.toLowerCase().trim());
    return mergeSyncedCloudGame(prev, cg);
  });

  const otherGames = currentGames.filter(g => g.platform !== platform);
  const merged = [...otherGames, ...updatedPlatformGames];
  store.saveGames(merged);
  triggerBackgroundGenreSyncIfNeeded(merged);

  return { account: result.account, games: updatedPlatformGames };
});

ipcMain.handle('disconnect-store-account', (_event, platform: GamePlatform) => {
  if (platform === 'epic') {
    epicDirectService.clearTokens();
  }
  if (platform === 'ea') {
    eaDirectService.clearTokens();
  }
  if (platform === 'ubisoft') {
    ubisoftDirectService.clearTokens();
  }
  const accounts = accountService.getAccounts();
  const target = accounts.find(a => a.platform === platform);
  if (target) {
    target.connected = false;
    target.accountIdentifier = undefined;
    target.totalOwnedGames = 0;
    target.needsReauth = false;
    accountService.saveAccounts(accounts);
  }
  return true;
});

// Cloud Multi-Store Database IPC
ipcMain.handle('has-galaxy-database', () => {
  return galaxyDbService.isAvailable();
});

ipcMain.handle('get-cloud-games', (_event, platform?: GamePlatform) => {
  return galaxyDbService.getCloudGames(platform);
});

ipcMain.handle('import-all-cloud-games', async (_event, platform?: GamePlatform) => {
  const cloudGames = galaxyDbService.getCloudGames(platform);
  const currentGames = store.getGames();
  const currentPlatformStoreIds = new Set(
    currentGames.filter(g => g.storeId).map(g => `${g.platform}-${g.storeId}`)
  );
  const currentPlatformTitles = new Set(
    currentGames.map(g => `${g.platform}-${g.title.toLowerCase().trim()}`)
  );

  const toAdd: Game[] = [];
  for (const cloudGame of cloudGames) {
    const key = `${cloudGame.platform}-${cloudGame.storeId}`;
    const titleKey = `${cloudGame.platform}-${cloudGame.title.toLowerCase().trim()}`;
    if (!currentPlatformStoreIds.has(key) && !currentPlatformTitles.has(titleKey)) {
      toAdd.push(cloudGame);
      currentPlatformStoreIds.add(key);
      currentPlatformTitles.add(titleKey);
    }
  }

  const merged = [...currentGames, ...toAdd];
  store.saveGames(merged);
  triggerBackgroundGenreSyncIfNeeded(merged);

  // Also update accounts counts in store accounts
  const accounts = accountService.getAccounts();
  for (const acc of accounts) {
    const count = merged.filter(g => g.platform === acc.platform).length;
    if (count > 0) {
      acc.totalOwnedGames = count;
      acc.connected = true;
    }
  }
  accountService.saveAccounts(accounts);

  return { addedCount: toAdd.length, total: merged.length, games: merged };
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

  // Proactively check if the game is already installed on this PC
  if (gameInstallationService.isGameInstalled(game)) {
    game.installed = true;
    if (game.tags) {
      game.tags = game.tags.filter(t => t.toLowerCase() !== 'uninstalled');
    }
    store.saveGames(games);
    mainWindow?.webContents.send('games-updated', games);

    // Launch it seamlessly since it is already installed!
    if (game.executablePath) {
      await shell.openExternal(game.executablePath);
      const startTime = Date.now();
      runningGames.set(game.id, { startTime });
      mainWindow?.webContents.send('game-status-changed', { gameId: game.id, isRunning: true });
    }
    return { success: true, message: 'Game is already installed. Launching now!' };
  }

  if (game.platform === 'epic') {
    const epicUrl = game.installUrl || `https://store.epicgames.com/en-US/browse?q=${encodeURIComponent(game.title)}`;
    await shell.openExternal(epicUrl);
    return { success: true };
  }

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

// Launch Game Core logic (used by IPC and Tray context menu)
async function launchGameCore(gameId: string): Promise<{ success: boolean; message?: string }> {
  const games = store.getGames();
  const game = games.find(g => g.id === gameId);

  if (!game) {
    return { success: false, message: 'Game not found in library.' };
  }

  // If marked not installed, check if it is physically installed on disk right now
  if (!game.installed) {
    if (gameInstallationService.isGameInstalled(game)) {
      game.installed = true;
      if (game.tags) {
        game.tags = game.tags.filter(t => t.toLowerCase() !== 'uninstalled');
      }
      store.saveGames(games);
    } else if (game.installUrl) {
      await shell.openExternal(game.installUrl);
      return { success: true, message: 'Prompted store installer.' };
    }
  }

  const execPath = game.executablePath;
  const startTime = Date.now();

  try {
    // 1. Epic Games Launcher Protocol (preferred for Epic games to sync cloud saves, achievements, and EOS)
    if (game.platform === 'epic') {
      // Use the resolved executablePath which contains the validated 3-part launcher URI
      // (or fallback to apps/${storeId} only if executablePath is missing)
      const epicUri = (execPath && execPath.startsWith('com.epicgames.launcher://'))
        ? execPath
        : (game.storeId ? `com.epicgames.launcher://apps/${game.storeId}?action=launch&silent=true` : '');

      if (epicUri) {
        try {
          await shell.openExternal(epicUri);
          runningGames.set(gameId, { startTime });
          mainWindow?.webContents.send('game-status-changed', { gameId, isRunning: true });

          game.lastPlayed = new Date().toISOString();
          store.saveGames(games);
          updateTrayMenu();

          const currentSettings = store.getSettings();
          if (currentSettings.minimizeToTray && mainWindow) {
            mainWindow.hide();
          }

          setTimeout(() => {
            runningGames.delete(gameId);
            mainWindow?.webContents.send('game-status-changed', { gameId, isRunning: false, elapsedMinutes: 0 });
            if (currentSettings.minimizeToTray && mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.show();
            }
          }, 10000);

          return { success: true };
        } catch (epicErr) {
          console.warn('Failed to launch via Epic URI, falling back to executable:', epicErr);
        }
      }
    }

    // 2. URI Protocol Launcher (Steam, GOG Galaxy, etc.)
    if (execPath && execPath.includes('://')) {
      await shell.openExternal(execPath);
      runningGames.set(gameId, { startTime });
      mainWindow?.webContents.send('game-status-changed', { gameId, isRunning: true });

      game.lastPlayed = new Date().toISOString();
      store.saveGames(games);
      updateTrayMenu();

      const currentSettings = store.getSettings();
      if (currentSettings.minimizeToTray && mainWindow) {
        mainWindow.hide();
      }

      setTimeout(() => {
        runningGames.delete(gameId);
        mainWindow?.webContents.send('game-status-changed', { gameId, isRunning: false, elapsedMinutes: 0 });
        if (currentSettings.minimizeToTray && mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.show();
        }
      }, 10000);

      return { success: true };
    }

    // 3. Local Executable Launcher (Manual games, GOG standalone, Emulators, Local .exe)
    let finalExe = execPath;
    const spawnArgs: string[] = [];

    if (game.platform === 'emulator') {
      const configs = emulatorService.getSavedConfigs();
      const emu = configs.find((c) => c.id === game.storeId);
      if (emu && emu.executablePath && fs.existsSync(emu.executablePath)) {
        finalExe = emu.executablePath;
      }
    }

    if (game.launchArgs) {
      const regex = /[^\s"']+|"([^"]*)"|'([^']*)'/g;
      let match;
      while ((match = regex.exec(game.launchArgs)) !== null) {
        spawnArgs.push(match[1] || match[2] || match[0]);
      }
    }

    if (!finalExe || !fs.existsSync(finalExe)) {
      return {
        success: false,
        message: finalExe
          ? `O executável não foi encontrado no caminho especificado: "${finalExe}"`
          : 'O executável não foi encontrado no caminho especificado.',
      };
    }

    const isBatch = finalExe.toLowerCase().endsWith('.bat') || finalExe.toLowerCase().endsWith('.cmd');

    let gameProcess: ChildProcess | null = null;
    let fallbackAttempted = false;

    const runShellFallback = async () => {
      if (fallbackAttempted) return;
      fallbackAttempted = true;
      runningGames.delete(gameId);

      const err = await shell.openPath(finalExe);
      if (!err) {
        runningGames.set(gameId, { startTime });
        mainWindow?.webContents.send('game-status-changed', { gameId, isRunning: true });

        game.lastPlayed = new Date().toISOString();
        store.saveGames(games);
        updateTrayMenu();

        const currentSettings = store.getSettings();
        if (currentSettings.minimizeToTray && mainWindow) {
          mainWindow.hide();
        }

        setTimeout(() => {
          runningGames.delete(gameId);
          mainWindow?.webContents.send('game-status-changed', { gameId, isRunning: false, elapsedMinutes: 1 });
          if (currentSettings.minimizeToTray && mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.show();
          }
        }, 10000);
      } else {
        console.error('shell.openPath failed:', err);
        mainWindow?.webContents.send('game-status-changed', { gameId, isRunning: false });
      }
    };

    try {
      gameProcess = spawn(finalExe, spawnArgs, {
        detached: true,
        cwd: path.dirname(finalExe),
        stdio: 'ignore',
        shell: isBatch,
      });
    } catch (syncErr: any) {
      console.warn('Direct spawn failed synchronously, falling back to shell.openPath:', syncErr);
      await runShellFallback();
      return { success: true };
    }

    // CRITICAL: Attach 'error' handler IMMEDIATELY to prevent Uncaught Exception
    gameProcess.on('error', async (err: any) => {
      console.warn(`gameProcess emitted error for "${finalExe}" (${err?.code}): falling back to shell.openPath`);
      await runShellFallback();
    });

    gameProcess.unref();

    runningGames.set(gameId, { startTime, process: gameProcess });
    mainWindow?.webContents.send('game-status-changed', { gameId, isRunning: true });

    game.lastPlayed = new Date().toISOString();
    store.saveGames(games);
    updateTrayMenu();

    const currentSettings = store.getSettings();
    if (currentSettings.minimizeToTray && mainWindow) {
      mainWindow.hide();
    }

    let processExited = false;
    const handleProcessExit = () => {
      if (processExited || fallbackAttempted) return;
      processExited = true;

      const durationMs = Date.now() - startTime;
      const minutesPlayed = durationMs < 60000 ? (durationMs >= 15000 ? 1 : 0) : Math.round(durationMs / 60000);

      runningGames.delete(gameId);

      if (minutesPlayed > 0) {
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        store.recordDailyActivity(todayStr, minutesPlayed);

        const currentGames = store.getGames();
        const target = currentGames.find(g => g.id === gameId);
        if (target) {
          target.playtimeMinutes = (target.playtimeMinutes || 0) + minutesPlayed;
          target.lastPlayed = new Date().toISOString();
          store.saveGames(currentGames);
          updateTrayMenu();
        }
      }

      mainWindow?.webContents.send('game-status-changed', {
        gameId,
        isRunning: false,
        elapsedMinutes: minutesPlayed,
      });

      if (currentSettings.minimizeToTray && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
      }
    };

    gameProcess.on('close', handleProcessExit);
    gameProcess.on('exit', handleProcessExit);

    return { success: true };
  } catch (err: any) {
    console.error('Failed to launch game:', err);
    return { success: false, message: err?.message || 'Failed to start game process.' };
  }
}

// Launch Game IPC
ipcMain.handle('launch-game', async (_event, gameId: string) => {
  return await launchGameCore(gameId);
});

// Launch Custom App IPC (Big Picture Quick Start Menu & Settings)
ipcMain.handle('launch-custom-app', async (_event, customApp: { name: string; executablePath: string; arguments?: string }) => {
  if (!customApp || !customApp.executablePath) {
    return { success: false, message: 'No executable path provided' };
  }

  const rawPath = customApp.executablePath.trim();

  // 1. URI Protocols (e.g. discord://, spotify:, steam:, https://)
  if (rawPath.includes('://') || rawPath.startsWith('spotify:') || rawPath.startsWith('steam:')) {
    try {
      await shell.openExternal(rawPath);
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Failed to open protocol URL' };
    }
  }

  // 2. Expand environment variables like %APPDATA%, %LOCALAPPDATA%, %ProgramFiles%
  const expandedPath = rawPath.replace(/%([^%]+)%/g, (_, n) => process.env[n] || _);

  // 3. Local executable or shortcut
  if (fs.existsSync(expandedPath)) {
    const isExeOrBat = /\.(exe|bat|cmd)$/i.test(expandedPath);
    if (isExeOrBat && customApp.arguments) {
      const spawnArgs: string[] = [];
      const regex = /[^\s"']+|"([^"]*)"|'([^']*)'/g;
      let match;
      while ((match = regex.exec(customApp.arguments)) !== null) {
        spawnArgs.push(match[1] || match[2] || match[0]);
      }
      try {
        const proc = spawn(expandedPath, spawnArgs, {
          detached: true,
          cwd: path.dirname(expandedPath),
          stdio: 'ignore',
          shell: expandedPath.toLowerCase().endsWith('.bat') || expandedPath.toLowerCase().endsWith('.cmd'),
        });
        proc.on('error', async () => {
          await shell.openPath(expandedPath);
        });
        proc.unref();
        return { success: true };
      } catch {
        const err = await shell.openPath(expandedPath);
        if (err) return { success: false, message: err };
        return { success: true };
      }
    }

    const err = await shell.openPath(expandedPath);
    if (err) {
      return { success: false, message: err };
    }
    return { success: true };
  }

  // 4. Try system command / PATH (e.g. 'chrome.exe', 'notepad.exe', 'calc.exe', 'obs64.exe')
  try {
    const proc = spawn(expandedPath, customApp.arguments ? customApp.arguments.split(/\s+/).filter(Boolean) : [], {
      detached: true,
      stdio: 'ignore',
      shell: true,
    });
    proc.on('error', async () => {
      await shell.openExternal(`https://${encodeURIComponent(expandedPath)}`);
    });
    proc.unref();
    return { success: true };
  } catch (e: any) {
    return { success: false, message: e?.message || `Application not found: ${expandedPath}` };
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

  const currentGames = store.getGames();
  const { updatedCount } = gameInstallationService.syncInstallationStatus(currentGames, true);
  if (updatedCount > 0) {
    store.saveGames(currentGames);
  }

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

// Custom folder scanner IPC (Supports single games or entire directory folders recursively)
ipcMain.handle('scan-folder', async (_event, dirPath: string) => {
  const results: ScanResult[] = [];
  if (!fs.existsSync(dirPath)) return results;

  const IGNORED_NAMES = new Set([
    'windows',
    'system volume information',
    '$recycle.bin',
    'node_modules',
    '.git',
    'commonredist',
    '_commonredist',
    'redist',
    'support',
    'directx',
    'easyanticheat',
    'battleye',
    'crashreports',
  ]);

  const EXCLUDE_EXE_PATTERNS = /(unins|crash|reporter|update|setup|installer|patcher|helper|launcher_helper|dxwebsetup|vcredist|dotnet|ue4prereq|eac_|easyanticheat|unitycrash)/i;

  const candidates: { title: string; exePath: string; dir: string }[] = [];

  const inspectDirectory = (dir: string, depth = 0) => {
    if (depth > 3) return;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const dirExes: string[] = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const lowerName = entry.name.toLowerCase();
          if (!IGNORED_NAMES.has(lowerName)) {
            inspectDirectory(path.join(dir, entry.name), depth + 1);
          }
        } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.exe')) {
          if (!EXCLUDE_EXE_PATTERNS.test(entry.name)) {
            dirExes.push(entry.name);
          }
        }
      }

      // If this directory has qualifying executables, find the best main game executable
      if (dirExes.length > 0) {
        const dirName = path.basename(dir);
        // Prioritize exe matching folder name, or clean game title
        let chosenExe = dirExes[0];
        const folderClean = dirName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const match = dirExes.find(e => {
          const exeClean = path.parse(e).name.toLowerCase().replace(/[^a-z0-9]/g, '');
          return folderClean.includes(exeClean) || exeClean.includes(folderClean);
        });
        if (match) {
          chosenExe = match;
        }

        const cleanTitle = path.parse(chosenExe).name
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase());

        candidates.push({
          title: cleanTitle.length > 2 ? cleanTitle : dirName.replace(/[-_]/g, ' '),
          exePath: path.join(dir, chosenExe),
          dir,
        });
      }
    } catch {
      // Skip inaccessible directories
    }
  };

  inspectDirectory(dirPath, 0);

  // De-duplicate candidates by executable path
  const seenExes = new Set<string>();
  for (const cand of candidates) {
    if (seenExes.has(cand.exePath.toLowerCase())) continue;
    seenExes.add(cand.exePath.toLowerCase());

    const art = (await lookupGameArtwork(cand.title)) || {
      coverUrl: '',
      bannerUrl: '',
      genres: ['PC Game'],
    };

    results.push({
      title: cand.title,
      executablePath: cand.exePath,
      platform: 'manual',
      installPath: cand.dir,
      coverUrl: art.coverUrl,
      bannerUrl: art.bannerUrl,
      description: `Discovered in folder ${cand.dir}`,
      genres: art.genres || ['PC Game'],
      installed: true,
    });
  }

  return results;
});

// Emulators IPC Handlers
ipcMain.handle('get-emulators', () => {
  let configs = emulatorService.getSavedConfigs();
  if (configs.length === 0) {
    const res = emulatorService.scanEmulatorsAndGames(store.getGames());
    configs = res.emulators;
    if (res.games.length > 0) {
      const current = store.getGames();
      const existingIds = new Set(current.map((g) => g.id));
      const toAdd = res.games.filter((g) => !existingIds.has(g.id));
      if (toAdd.length > 0) {
        store.saveGames([...current, ...toAdd]);
      }
    }
  }
  return configs;
});

ipcMain.handle('scan-emulators', async () => {
  const currentGames = store.getGames();
  const { emulators, games: foundGames } = emulatorService.scanEmulatorsAndGames(currentGames);

  // Keep non-emulated titles (Steam, Epic, GOG, manual PC games)
  const nonEmulatedGames = currentGames.filter((g) => g.platform !== 'emulator');

  // Filter out any BIOS or system files from found games and deduplicate by id
  const seenFoundIds = new Set<string>();
  const uniqueFoundGames: Game[] = [];
  for (const g of foundGames) {
    if (isBiosOrSystemFile(g.title)) continue;
    if (!seenFoundIds.has(g.id)) {
      seenFoundIds.add(g.id);
      uniqueFoundGames.push(g);
    }
  }

  // Map previously existing emulated games to preserve stats and custom covers
  const existingEmuMap = new Map<string, Game>();
  for (const g of currentGames) {
    if (g.platform === 'emulator' && !isBiosOrSystemFile(g.title)) {
      existingEmuMap.set(g.id, g);
    }
  }

  const mergedEmuGames = uniqueFoundGames.map((found) => {
    const prev = existingEmuMap.get(found.id);
    if (prev) {
      return {
        ...found,
        playtimeMinutes: prev.playtimeMinutes || 0,
        lastPlayed: prev.lastPlayed,
        favorite: prev.favorite || false,
        coverUrl: (prev.coverUrl && !prev.coverUrl.startsWith('data:image/svg')) ? prev.coverUrl : found.coverUrl,
        bannerUrl: (prev.bannerUrl && !prev.bannerUrl.startsWith('data:image/svg')) ? prev.bannerUrl : found.bannerUrl,
      };
    }
    return found;
  });

  const merged = [...nonEmulatedGames, ...mergedEmuGames];
  store.saveGames(merged);

  return { emulators, games: merged.map(g => ({ ...g, isRunning: runningGames.has(g.id) })) };
});

ipcMain.handle('launch-emulator', async (_event, emulatorId: string) => {
  const configs = emulatorService.getSavedConfigs();
  const emu = configs.find((c) => c.id === emulatorId);
  if (!emu || !emu.executablePath || !fs.existsSync(emu.executablePath)) {
    return { success: false, message: `Emulator executable not found for ${emulatorId}.` };
  }
  try {
    spawn(emu.executablePath, [], {
      detached: true,
      cwd: path.dirname(emu.executablePath),
      shell: true,
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle('download-emulator', async (_event, emulatorId: string, downloadUrl?: string) => {
  const configs = emulatorService.getSavedConfigs();
  const emu = configs.find((c) => c.id === emulatorId);
  const targetUrl = downloadUrl || emu?.downloadUrl || emu?.websiteUrl;

  if (!targetUrl) {
    return { success: false, message: 'No download URL available for this emulator.' };
  }

  try {
    const userData = app.getPath('userData');
    const downloadsDir = path.join(userData, 'downloads');
    const emuInstallDir = path.join(userData, 'emulators', emulatorId);
    if (!fs.existsSync(downloadsDir)) fs.mkdirSync(downloadsDir, { recursive: true });
    if (!fs.existsSync(emuInstallDir)) fs.mkdirSync(emuInstallDir, { recursive: true });

    let directDownloadAssetUrl: string | null = null;
    let assetFileName = `${emulatorId}-release.zip`;

    // 1. Check if GitHub release URL
    const ghMatch = targetUrl.match(/github\.com\/([^/]+)\/([^/]+)\/releases(?:\/latest)?/i);
    if (ghMatch) {
      const owner = ghMatch[1];
      const repo = ghMatch[2];
      try {
        const ghApiRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`, {
          headers: { 'User-Agent': 'AegisHub/1.0' },
        });
        if (ghApiRes.ok) {
          const releaseData: any = await ghApiRes.json();
          if (Array.isArray(releaseData.assets)) {
            const asset =
              releaseData.assets.find((a: any) => {
                const fn = (a.name || '').toLowerCase();
                return (
                  (fn.includes('win') || fn.includes('x64') || fn.includes('windows')) &&
                  (fn.endsWith('.zip') || fn.endsWith('.7z') || fn.endsWith('.exe')) &&
                  !fn.includes('source') &&
                  !fn.includes('symbols')
                );
              }) ||
              releaseData.assets.find((a: any) => (a.name || '').toLowerCase().endsWith('.zip'));

            if (asset && asset.browser_download_url) {
              directDownloadAssetUrl = asset.browser_download_url;
              assetFileName = asset.name || assetFileName;
            }
          }
        }
      } catch (err) {
        console.warn('Failed to query GitHub release API:', err);
      }
    } else if (targetUrl.endsWith('.zip') || targetUrl.endsWith('.7z') || targetUrl.endsWith('.exe')) {
      directDownloadAssetUrl = targetUrl;
      assetFileName = path.basename(targetUrl.split('?')[0]);
    }

    if (!directDownloadAssetUrl) {
      // Fallback: open official download website
      if (emu?.websiteUrl || targetUrl) {
        shell.openExternal(emu?.websiteUrl || targetUrl);
        return {
          success: false,
          fallbackUrl: emu?.websiteUrl || targetUrl,
          message: 'Direct download package not found. Opening the official release page in your browser!',
        };
      }
      return { success: false, message: 'Could not resolve release download URL.' };
    }

    // 2. Download the file
    const downloadFilePath = path.join(downloadsDir, assetFileName);
    const resp = await fetch(directDownloadAssetUrl);
    if (!resp.ok) {
      throw new Error(`Download HTTP error ${resp.status}`);
    }
    const buffer = Buffer.from(await resp.arrayBuffer());
    fs.writeFileSync(downloadFilePath, buffer);

    // 3. Extract if .zip / .tar
    if (assetFileName.toLowerCase().endsWith('.zip')) {
      const { execSync } = await import('child_process');
      execSync(`tar -xf "${downloadFilePath}" -C "${emuInstallDir}"`, { stdio: 'ignore' });
    } else if (assetFileName.toLowerCase().endsWith('.exe')) {
      const destExe = path.join(emuInstallDir, assetFileName);
      fs.copyFileSync(downloadFilePath, destExe);
    }

    // 4. Find executable in emuInstallDir
    const findExe = (dir: string, depth = 0): string | null => {
      if (depth > 3) return null;
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const full = path.join(dir, item.name);
        if (item.isFile() && item.name.toLowerCase().endsWith('.exe')) {
          const lowerName = item.name.toLowerCase();
          if (!lowerName.includes('uninstall') && !lowerName.includes('crash') && !lowerName.includes('update')) {
            return full;
          }
        }
        if (item.isDirectory()) {
          const nested = findExe(full, depth + 1);
          if (nested) return nested;
        }
      }
      return null;
    };

    const foundExe = findExe(emuInstallDir);
    if (foundExe) {
      if (emu) {
        emu.executablePath = foundExe;
        emu.installed = true;
        emulatorService.saveConfigs(configs);
      }
      return { success: true, executablePath: foundExe, message: `Installed successfully!` };
    } else {
      return {
        success: true,
        message: `Extracted to ${emuInstallDir}. Please specify the executable manually.`,
      };
    }
  } catch (err: any) {
    console.error('Download emulator error:', err);
    if (emu?.websiteUrl || targetUrl) {
      shell.openExternal(emu?.websiteUrl || targetUrl);
    }
    return {
      success: false,
      fallbackUrl: emu?.websiteUrl || targetUrl,
      message: `Direct download encountered an issue (${err.message}). Opened official download page in browser.`,
    };
  }
});

ipcMain.handle('update-emulator-config', (_event, emulator: any) => {
  const configs = emulatorService.getSavedConfigs();
  const idx = configs.findIndex((c) => c.id === emulator.id);
  if (idx >= 0) {
    configs[idx] = { ...configs[idx], ...emulator };
  } else {
    configs.push(emulator);
  }
  emulatorService.saveConfigs(configs);

  // If executablePath changed, update in library games for this emulator
  if (emulator.executablePath) {
    const currentGames = store.getGames();
    let changed = false;
    for (const g of currentGames) {
      if (g.platform === 'emulator' && g.storeId === emulator.id) {
        g.executablePath = emulator.executablePath;
        changed = true;
      }
    }
    if (changed) {
      store.saveGames(currentGames);
    }
  }

  return true;
});

ipcMain.handle('delete-emulator-config', (_event, emulatorId: string) => {
  emulatorService.deleteConfig(emulatorId);
  return true;
});

