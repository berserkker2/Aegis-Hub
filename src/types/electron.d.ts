import {
  Game,
  GamePlatform,
  LauncherSettings,
  ScanResult,
  StoreAccount,
  ArtworkSearchResult,
  EmulatorConfig,
  PulseData,
  CustomApp,
  SteamReleasesResponse
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
      exportBackup: () => Promise<{ success: boolean; canceled?: boolean; filePath?: string; gamesCount?: number; message?: string }>;
      importBackup: () => Promise<{
        success: boolean;
        canceled?: boolean;
        message?: string;
        updatedGamesCount?: number;
        addedGamesCount?: number;
        settings?: LauncherSettings;
        games?: Game[];
        dailyActivity?: Record<string, number>;
      }>;
      resetLauncherData: () => Promise<Game[]>;
      launchGame: (gameId: string) => Promise<{ success: boolean; message?: string }>;
      installGame: (gameId: string) => Promise<{ success: boolean; message?: string }>;
      scanPC: () => Promise<ScanResult[]>;
      scanFolder: (dirPath: string) => Promise<ScanResult[]>;
      selectFile: (filters: { name: string; extensions: string[] }[]) => Promise<string | null>;
      selectFolder: () => Promise<string | null>;
      searchArtwork: (title: string, platformOrEmuId?: string) => Promise<ArtworkSearchResult | null>;
      searchArtworkSuggestions: (title: string, platformOrEmuId?: string) => Promise<{ covers: ArtworkOption[]; banners: ArtworkOption[] }>;
      cacheImage: (url: string, type: 'cover' | 'banner', gameId: string) => Promise<string>;
      toMediaUrl: (localPath: string) => Promise<string>;
      getStoreAccounts: () => Promise<StoreAccount[]>;
      detectLocalAccounts: () => Promise<LocalDetectedAccount[]>;
      openStoreLogin: (platform: GamePlatform) => Promise<{ account: StoreAccount; games: Game[] }>;
      syncStoreAccount: (platform: GamePlatform, identifier: string, apiKey?: string) => Promise<{ account: StoreAccount; games: Game[] }>;
      disconnectStoreAccount: (platform: GamePlatform) => Promise<boolean>;
      hasGalaxyDatabase: () => Promise<boolean>;
      getCloudGames: (platform?: GamePlatform) => Promise<Game[]>;
      importAllCloudGames: (platform?: GamePlatform) => Promise<{ addedCount: number; total: number; games: Game[] }>;
      autoFetchMissingArtwork: () => Promise<{ updatedCount: number; games: Game[] }>;
      syncSteamPlaytime: () => Promise<{ updatedCount: number; games: Game[] }>;
      syncSteamRatings: () => Promise<{ updatedCount: number; games: Game[] }>;
      syncInstallationStatus: () => Promise<{ updatedCount: number; installedCount: number; games: Game[] }>;
      fetchGameCategories: (game: Game) => Promise<{ genres: string[]; tags?: string[]; developer?: string; publisher?: string; releaseDate?: string; summary?: string; description?: string } | null>;
      syncAllCategories: () => Promise<{ updatedCount: number; games: Game[] }>;
      getGameGallery: (game: Game) => Promise<{ screenshots: { id: number; thumbnail: string; full: string }[] }>;
      openExternal: (url: string) => Promise<boolean>;
      getEmulators: () => Promise<EmulatorConfig[]>;
      scanEmulators: () => Promise<{ emulators: EmulatorConfig[]; games: Game[] }>;
      scrapeAllEmulatorsMetadata: () => Promise<{ updatedCount: number; totalCount: number; games: Game[] }>;
      scrapeSingleGameMetadata: (gameId: string) => Promise<{ success: boolean; game?: Game; games?: Game[]; message?: string }>;
      onScraperProgress: (callback: (data: { current: number; total: number; gameTitle: string; coverUrl?: string }) => void) => () => void;
      launchEmulator: (emulatorId: string) => Promise<{ success: boolean; message?: string }>;
      downloadEmulator: (emulatorId: string, downloadUrl?: string, name?: string) => Promise<{ success: boolean; message?: string; executablePath?: string; fallbackUrl?: string }>;
      updateEmulatorConfig: (emulator: EmulatorConfig) => Promise<boolean>;
      deleteEmulatorConfig: (emulatorId: string) => Promise<boolean>;
      launchCustomApp: (app: CustomApp) => Promise<{ success: boolean; message?: string }>;
      getRecommendedGames: (options?: { platform?: string; store?: string; genre?: string; query?: string; page?: number; excludeTitles?: string[] }) => Promise<RecommendedGame[]>;
      getSteamReleases: (args?: { year?: number; month?: number }) => Promise<SteamReleasesResponse>;
      askGeminiRecommendedGames: (prompt: string, apiKey?: string, excludeTitles?: string[]) => Promise<{ games: RecommendedGame[]; error?: string }>;
      getPulseData: (forceRefresh?: boolean) => Promise<PulseData>;
      getRecentAchievements: (limit?: number) => Promise<UserAchievement[]>;
      getGameAchievementProgress: (appId: string) => Promise<{ appId: string; unlocked: number; total: number; percentage: number } | null>;
      getDailyActivity: () => Promise<Record<string, number>>;
      recordDailyActivity: (dateStr: string, minutes: number) => Promise<boolean>;
      windowMinimize: () => void;
      windowMaximize: () => void;
      windowClose: () => void;
      appQuit: () => void;
      isMaximized: () => Promise<boolean>;
      setFullscreen: (full: boolean) => Promise<boolean>;
      isFullscreen: () => Promise<boolean>;
      checkStartBigPicture: () => Promise<boolean>;
      checkForUpdates: () => Promise<{
        hasUpdate: boolean;
        currentVersion: string;
        latestVersion: string;
        releaseName?: string;
        releaseNotes?: string;
        publishedAt?: string;
        downloadUrl?: string;
        fileName?: string;
        fileSize?: number;
      }>;
      downloadUpdate: (downloadUrl: string, fileName: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;
      installUpdate: (installerPath?: string) => Promise<{ success: boolean; error?: string }>;
      onUpdateDownloadProgress: (callback: (progress: { percent: number; transferred: number; total: number }) => void) => () => void;
      systemPowerAction: (action: 'shutdown' | 'restart' | 'sleep') => Promise<{ success: boolean }>;
      onGameStatusChange: (callback: (data: { gameId: string; isRunning: boolean; elapsedMinutes?: number }) => void) => () => void;
      onOpenSettings: (callback: () => void) => () => void;
      openSettingsWindow: (tab?: string) => Promise<boolean>;
      onSettingsUpdated: (callback: (settings: LauncherSettings) => void) => () => void;
      onSetSettingsTab: (callback: (tab: string) => void) => () => void;
      onGamesUpdated: (callback: (games: Game[]) => void) => () => void;
      onStoreAccountsUpdated: (callback: (accounts: StoreAccount[]) => void) => () => void;
      onRestoreBigPicture: (callback: () => void) => () => void;
    };
  }
}

export {};
