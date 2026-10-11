export type GamePlatform = 'manual' | 'steam' | 'epic' | 'gog' | 'ubisoft' | 'ea' | 'xbox';

export interface Game {
  id: string;
  title: string;
  executablePath: string;
  launchArgs?: string;
  platform: GamePlatform;
  bannerUrl: string; // Wide 16:9 hero background image
  coverUrl: string;  // Vertical 2:3 poster thumbnail image
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
  installed: boolean; // true = installed locally, false = cloud owned
  installPath?: string;
  installUrl?: string; // e.g. steam://install/123 or launcher install URI
  storeId?: string; // AppId or Catalog ID
  playtimeMinutes: number;
  lastPlayed?: string; // ISO date string
  addedDate: string; // ISO date string
  isRunning?: boolean;
}

export interface StoreAccount {
  platform: GamePlatform;
  name: string;
  connected: boolean;
  accountIdentifier?: string; // Username, SteamID, Email
  avatarUrl?: string;
  totalOwnedGames: number;
  lastSynced?: string;
  description: string;
  authType: 'steam_id' | 'oauth_token' | 'local_manifest' | 'credentials';
  color: string;
}

export interface StoreAccountStatus extends StoreAccount {
  installPath?: string;
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
  storeId?: string;
  installed?: boolean;
}

export interface ArtworkSearchResult {
  title: string;
  coverUrl: string;
  bannerUrl: string;
  genres: string[];
  description?: string;
  developer?: string;
  releaseDate?: string;
  rating?: number;
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
