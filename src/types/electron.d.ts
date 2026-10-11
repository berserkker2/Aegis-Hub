import {
  Game,
  GamePlatform,
  LauncherSettings,
  ScanResult,
  StoreAccount,
  ArtworkSearchResult
} from './game';

export interface ArtworkOption {
  url: string;
  type: 'cover' | 'banner';
  label: string;
  source: string;
  previewUrl: string;
}

export interface LocalDetectedAccount {
  platform: GamePlatform;
  displayName: string;
  accountIdentifier: string;
  avatarUrl?: string;
  details: string;
}

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
      searchArtworkSuggestions: (title: string) => Promise<{ covers: ArtworkOption[]; banners: ArtworkOption[] }>;
      cacheImage: (url: string, type: 'cover' | 'banner', gameId: string) => Promise<string>;
      toMediaUrl: (localPath: string) => Promise<string>;
      getStoreAccounts: () => Promise<StoreAccount[]>;
      detectLocalAccounts: () => Promise<LocalDetectedAccount[]>;
      openStoreLogin: (platform: GamePlatform) => Promise<{ account: StoreAccount; games: Game[] }>;
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
