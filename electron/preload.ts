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
  resetLauncherData: (): Promise<Game[]> => ipcRenderer.invoke('reset-launcher-data'),
  launchGame: (gameId: string) => ipcRenderer.invoke('launch-game', gameId),
  installGame: (gameId: string) => ipcRenderer.invoke('install-game', gameId),
  scanPC: (): Promise<ScanResult[]> => ipcRenderer.invoke('scan-pc'),
  scanFolder: (dirPath: string): Promise<ScanResult[]> => ipcRenderer.invoke('scan-folder', dirPath),
  selectFile: (filters: { name: string; extensions: string[] }[]): Promise<string | null> => ipcRenderer.invoke('select-file', filters),
  selectFolder: (): Promise<string | null> => ipcRenderer.invoke('select-folder'),
  searchArtwork: (title: string): Promise<ArtworkSearchResult | null> => ipcRenderer.invoke('search-artwork', title),
  searchArtworkSuggestions: (title: string): Promise<{ covers: any[]; banners: any[] }> =>
    ipcRenderer.invoke('search-artwork-suggestions', title),
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
  windowMinimize: (): void => ipcRenderer.send('window-minimize'),
  windowMaximize: (): void => ipcRenderer.send('window-maximize'),
  windowClose: (): void => ipcRenderer.send('window-close'),
  isMaximized: (): Promise<boolean> => ipcRenderer.invoke('is-maximized'),
  onGameStatusChange: (callback: (data: { gameId: string; isRunning: boolean; elapsedMinutes?: number }) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('game-status-changed', listener);
    return () => ipcRenderer.removeListener('game-status-changed', listener);
  },
});
