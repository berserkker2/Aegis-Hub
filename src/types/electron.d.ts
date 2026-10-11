import { Game, LauncherSettings, ScanResult, StoreAccountStatus } from './game';

declare global {
  interface Window {
    api?: {
      getGames: () => Promise<Game[]>;
      saveGames: (games: Game[]) => Promise<boolean>;
      getSettings: () => Promise<LauncherSettings>;
      saveSettings: (settings: LauncherSettings) => Promise<boolean>;
      launchGame: (gameId: string) => Promise<{ success: boolean; message?: string }>;
      scanPC: () => Promise<ScanResult[]>;
      scanFolder: (dirPath: string) => Promise<ScanResult[]>;
      selectFile: (filters: { name: string; extensions: string[] }[]) => Promise<string | null>;
      selectFolder: () => Promise<string | null>;
      getStoreStatuses: () => Promise<StoreAccountStatus[]>;
      windowMinimize: () => void;
      windowMaximize: () => void;
      windowClose: () => void;
      isMaximized: () => Promise<boolean>;
      onGameStatusChange: (callback: (data: { gameId: string; isRunning: boolean; elapsedMinutes?: number }) => void) => () => void;
    };
  }
}

export {};
