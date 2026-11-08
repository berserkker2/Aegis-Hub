import { contextBridge, ipcRenderer } from 'electron';
import {
  Game,
  GamePlatform,
  LauncherSettings,
  ScanResult,
  StoreAccount,
  ArtworkSearchResult
} from '../src/types/game';

contextBridge.exposeInMainWorld('api', {
  getGames: (): Promise<Game[]> => ipcRenderer.invoke('get-games'),
  saveGames: (games: Game[]): Promise<boolean> => ipcRenderer.invoke('save-games', games),
  getSettings: (): Promise<LauncherSettings> => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: LauncherSettings): Promise<boolean> => ipcRenderer.invoke('save-settings', settings),
  exportBackup: (): Promise<any> => ipcRenderer.invoke('export-backup'),
  importBackup: (): Promise<any> => ipcRenderer.invoke('import-backup'),
  resetLauncherData: (): Promise<Game[]> => ipcRenderer.invoke('reset-launcher-data'),
  launchGame: (gameId: string) => ipcRenderer.invoke('launch-game', gameId),
  installGame: (gameId: string) => ipcRenderer.invoke('install-game', gameId),
  scanPC: (): Promise<ScanResult[]> => ipcRenderer.invoke('scan-pc'),
  scanFolder: (dirPath: string): Promise<ScanResult[]> => ipcRenderer.invoke('scan-folder', dirPath),
  selectFile: (filters: { name: string; extensions: string[] }[]): Promise<string | null> => ipcRenderer.invoke('select-file', filters),
  selectFolder: (): Promise<string | null> => ipcRenderer.invoke('select-folder'),
  searchArtwork: (title: string, platformOrEmuId?: string): Promise<ArtworkSearchResult | null> =>
    ipcRenderer.invoke('search-artwork', title, platformOrEmuId),
  searchArtworkSuggestions: (title: string, platformOrEmuId?: string): Promise<{ covers: any[]; banners: any[] }> =>
    ipcRenderer.invoke('search-artwork-suggestions', title, platformOrEmuId),
  cacheImage: (url: string, type: 'cover' | 'banner', gameId: string): Promise<string> =>
    ipcRenderer.invoke('cache-image', { url, type, gameId }),
  toMediaUrl: (localPath: string): Promise<string> => ipcRenderer.invoke('to-media-url', localPath),
  getStoreAccounts: (): Promise<StoreAccount[]> => ipcRenderer.invoke('get-store-accounts'),
  detectLocalAccounts: (): Promise<any[]> => ipcRenderer.invoke('detect-local-accounts'),
  openStoreLogin: (platform: GamePlatform): Promise<{ account: StoreAccount; games: Game[] }> =>
    ipcRenderer.invoke('open-store-login', platform),
  syncStoreAccount: (platform: GamePlatform, identifier: string, apiKey?: string): Promise<{ account: StoreAccount; games: Game[] }> =>
    ipcRenderer.invoke('sync-store-account', { platform, identifier, apiKey }),
  disconnectStoreAccount: (platform: GamePlatform): Promise<boolean> =>
    ipcRenderer.invoke('disconnect-store-account', platform),
  hasGalaxyDatabase: (): Promise<boolean> => ipcRenderer.invoke('has-galaxy-database'),
  getCloudGames: (platform?: GamePlatform): Promise<Game[]> => ipcRenderer.invoke('get-cloud-games', platform),
  importAllCloudGames: (platform?: GamePlatform): Promise<{ addedCount: number; total: number; games: Game[] }> =>
    ipcRenderer.invoke('import-all-cloud-games', platform),
  autoFetchMissingArtwork: (): Promise<{ updatedCount: number; games: Game[] }> =>
    ipcRenderer.invoke('auto-fetch-all-missing-artwork'),
  syncSteamPlaytime: (): Promise<{ updatedCount: number; games: Game[] }> =>
    ipcRenderer.invoke('sync-steam-playtime'),
  syncSteamRatings: (): Promise<{ updatedCount: number; games: Game[] }> =>
    ipcRenderer.invoke('sync-steam-ratings'),
  getSteamRating: (args: { title: string; storeId?: string; platform?: string; installUrl?: string; id?: string }): Promise<{ appId: string; rating: number; scoreDesc?: string; totalReviews: number } | null> =>
    ipcRenderer.invoke('get-steam-rating', args),
  syncInstallationStatus: (): Promise<{ updatedCount: number; installedCount: number; games: Game[] }> =>
    ipcRenderer.invoke('sync-installation-status'),
  fetchGameCategories: (game: Game): Promise<{ genres: string[]; tags?: string[]; developer?: string; publisher?: string; releaseDate?: string; summary?: string; description?: string } | null> =>
    ipcRenderer.invoke('fetch-game-categories', game),
  syncAllCategories: (): Promise<{ updatedCount: number; games: Game[] }> =>
    ipcRenderer.invoke('sync-all-categories'),
  getGameGallery: (game: Game): Promise<{ screenshots: { id: number; thumbnail: string; full: string }[] }> =>
    ipcRenderer.invoke('get-game-gallery', game),
  openExternal: (url: string): Promise<boolean> =>
    ipcRenderer.invoke('open-external-url', url),
  getEmulators: (): Promise<any> => ipcRenderer.invoke('get-emulators'),
  scanEmulators: (): Promise<any> => ipcRenderer.invoke('scan-emulators'),
  scrapeAllEmulatorsMetadata: (options?: { emulatorId?: string; forceRefresh?: boolean }): Promise<{ updatedCount: number; totalCount: number; games: any[] }> =>
    ipcRenderer.invoke('scrape-all-emulators-metadata', options),
  scrapeSingleGameMetadata: (gameId: string): Promise<{ success: boolean; game?: any; games?: any[]; message?: string }> =>
    ipcRenderer.invoke('scrape-single-game-metadata', gameId),
  onScraperProgress: (callback: (data: { current: number; total: number; gameTitle: string; coverUrl?: string }) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('scraper-progress', handler);
    return () => {
      ipcRenderer.removeListener('scraper-progress', handler);
    };
  },
  launchEmulator: (emulatorId: string): Promise<any> => ipcRenderer.invoke('launch-emulator', emulatorId),
  downloadEmulator: (emulatorId: string, downloadUrl?: string, name?: string): Promise<any> =>
    ipcRenderer.invoke('download-emulator', emulatorId, downloadUrl, name),
  updateEmulatorConfig: (emulator: any): Promise<boolean> => ipcRenderer.invoke('update-emulator-config', emulator),
  deleteEmulatorConfig: (emulatorId: string): Promise<boolean> => ipcRenderer.invoke('delete-emulator-config', emulatorId),
  launchCustomApp: (app: any): Promise<{ success: boolean; message?: string }> =>
    ipcRenderer.invoke('launch-custom-app', app),
  getRecommendedGames: (options?: any): Promise<any> => ipcRenderer.invoke('get-recommended-games', options),
  getSteamReleases: (args?: { year?: number; month?: number }): Promise<any> =>
    ipcRenderer.invoke('get-steam-releases', args),
  askGeminiRecommendedGames: (prompt: string, apiKey?: string, excludeTitles?: string[]): Promise<any> =>
    ipcRenderer.invoke('ask-gemini-recommended-games', { prompt, apiKey, excludeTitles }),
  getPulseData: (forceRefresh?: boolean): Promise<any> => ipcRenderer.invoke('get-pulse-data', forceRefresh),
  getRecentAchievements: (limit?: number): Promise<any> => ipcRenderer.invoke('get-recent-achievements', limit),
  getGameAchievementProgress: (appId: string): Promise<any> => ipcRenderer.invoke('get-game-achievement-progress', appId),
  getDailyActivity: (): Promise<Record<string, number>> => ipcRenderer.invoke('get-daily-activity'),
  recordDailyActivity: (dateStr: string, minutes: number): Promise<boolean> =>
    ipcRenderer.invoke('record-daily-activity', dateStr, minutes),
  onDailyActivityUpdated: (callback: (activity: Record<string, number>) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('daily-activity-updated', handler);
    return () => {
      ipcRenderer.removeListener('daily-activity-updated', handler);
    };
  },
  windowMinimize: (): void => ipcRenderer.send('window-minimize'),
  windowMaximize: (): void => ipcRenderer.send('window-maximize'),
  windowClose: (): void => ipcRenderer.send('window-close'),
  appQuit: (): void => ipcRenderer.send('app-quit'),
  isMaximized: (): Promise<boolean> => ipcRenderer.invoke('is-maximized'),
  setFullscreen: (full: boolean): Promise<boolean> => ipcRenderer.invoke('set-fullscreen', full),
  isFullscreen: (): Promise<boolean> => ipcRenderer.invoke('is-fullscreen'),
  checkStartBigPicture: (): Promise<boolean> => ipcRenderer.invoke('check-start-big-picture'),
  checkForUpdates: (): Promise<any> => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: (downloadUrl: string, fileName: string): Promise<any> =>
    ipcRenderer.invoke('download-update', { downloadUrl, fileName }),
  installUpdate: (installerPath?: string): Promise<any> =>
    ipcRenderer.invoke('install-update', installerPath),
  onUpdateDownloadProgress: (callback: (progress: { percent: number; transferred: number; total: number }) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('update-download-progress', listener);
    return () => ipcRenderer.removeListener('update-download-progress', listener);
  },
  systemPowerAction: (action: 'shutdown' | 'restart' | 'sleep'): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('system-power-action', action),
  onGameStatusChange: (callback: (data: { gameId: string; isRunning: boolean; elapsedMinutes?: number }) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('game-status-changed', listener);
    return () => ipcRenderer.removeListener('game-status-changed', listener);
  },
  onOpenSettings: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('open-settings', listener);
    return () => ipcRenderer.removeListener('open-settings', listener);
  },
  openSettingsWindow: (tab?: string): Promise<boolean> => ipcRenderer.invoke('open-settings-window', tab),
  onSettingsUpdated: (callback: (settings: LauncherSettings) => void) => {
    const listener = (_event: any, settings: LauncherSettings) => callback(settings);
    ipcRenderer.on('settings-updated', listener);
    return () => ipcRenderer.removeListener('settings-updated', listener);
  },
  onSetSettingsTab: (callback: (tab: string) => void) => {
    const listener = (_event: any, tab: string) => callback(tab);
    ipcRenderer.on('set-settings-tab', listener);
    return () => ipcRenderer.removeListener('set-settings-tab', listener);
  },
  onGamesUpdated: (callback: (games: Game[]) => void) => {
    const listener = (_event: any, games: Game[]) => callback(games);
    ipcRenderer.on('games-updated', listener);
    return () => ipcRenderer.removeListener('games-updated', listener);
  },
  onStoreAccountsUpdated: (callback: (accounts: StoreAccount[]) => void) => {
    const listener = (_event: any, accounts: StoreAccount[]) => callback(accounts);
    ipcRenderer.on('store-accounts-updated', listener);
    return () => ipcRenderer.removeListener('store-accounts-updated', listener);
  },
  onEmulatorsUpdated: (callback: (emulators: any[]) => void) => {
    const listener = (_event: any, emulators: any[]) => callback(emulators);
    ipcRenderer.on('emulators-updated', listener);
    return () => ipcRenderer.removeListener('emulators-updated', listener);
  },
  onRestoreBigPicture: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('restore-big-picture', listener);
    return () => ipcRenderer.removeListener('restore-big-picture', listener);
  },
  isMainWindowFocused: (): Promise<boolean> => ipcRenderer.invoke('is-main-window-focused'),
  onMainWindowFocus: (callback: (focused: boolean) => void) => {
    const listener = (_event: any, focused: boolean) => callback(focused);
    ipcRenderer.on('main-window-focused', listener);
    return () => ipcRenderer.removeListener('main-window-focused', listener);
  },
});
