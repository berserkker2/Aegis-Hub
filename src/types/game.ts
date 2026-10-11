export type GamePlatform = 'manual' | 'steam' | 'epic' | 'gog' | 'ubisoft' | 'ea' | 'xbox';

export interface Game {
  id: string;
  title: string;
  executablePath: string;
  launchArgs?: string;
  platform: GamePlatform;
  bannerUrl: string;
  coverUrl: string;
  iconUrl?: string;
  description: string;
  summary?: string;
  genres: string[];
  tags: string[];
  releaseDate?: string;
  developer?: string;
  publisher?: string;
  rating?: number;
  favorite: boolean;
  hidden: boolean;
  installPath?: string;
  playtimeMinutes: number;
  lastPlayed?: string; // ISO date string
  addedDate: string; // ISO date string
  isRunning?: boolean;
}

export interface StoreAccountStatus {
  platform: GamePlatform;
  name: string;
  connected: boolean;
  detectedGamesCount: number;
  installPath?: string;
  description: string;
  color: string;
}

export interface ScanResult {
  title: string;
  executablePath: string;
  platform: GamePlatform;
  installPath?: string;
  coverUrl?: string;
  bannerUrl?: string;
  description?: string;
  genres?: string[];
}

export interface LauncherSettings {
  closeOnLaunch: boolean;
  minimizeToTray: boolean;
  autoScanOnStartup: boolean;
  libraryViewMode: 'grid' | 'compact' | 'list';
  gridSize: 'small' | 'medium' | 'large';
  sortBy: 'title' | 'lastPlayed' | 'playtime' | 'recentlyAdded';
  sortOrder: 'asc' | 'desc';
  scanPaths: string[];
}
