import {
  Game,
  GamePlatform,
  LauncherSettings,
  ScanResult,
  StoreAccount,
  ArtworkSearchResult
} from './game';

declare global {
  interface Window {
    api?: {
      getGames: () => Promise<Game[]>;
      saveGames: (games: Game[]) => Promise<boolean>;
      getSettings: () => Promise<LauncherSettings>;
      saveSettings: (settings: LauncherSettings) => Promise<boolean>;
      launchGame: (gameId: string) => Promise<{ success: boolean; message?: string }>;
      installGame: (gameId: string) => Promise<{ success: boolean; message?: string }>;
      scanPC: () => Promise<ScanResult[]>;
      scanFolder: (dirPath: string) => Promise<ScanResult[]>;
      selectFile: (filters: { name: string; extensions: string[] }[]) => Promise<string | null>;
      selectFolder: () => Promise<string | null>;
      searchArtwork: (title: string) => Promise<ArtworkSearchResult | null>;
      getStoreAccounts: () => Promise<StoreAccount[]>;
      syncStoreAccount: (platform: GamePlatform, identifier: string, apiKey?: string) => Promise<{ account: StoreAccount; games: Game[] }>;
      disconnectStoreAccount: (platform: GamePlatform) => Promise<boolean>;
      windowMinimize: () => void;
      windowMaximize: () => void;
      windowClose: () => void;
      isMaximized: () => Promise<boolean>;
      onGameStatusChange: (callback: (data: { gameId: string; isRunning: boolean; elapsedMinutes?: number }) => void) => () => void;
    };
  }
}

export {};
