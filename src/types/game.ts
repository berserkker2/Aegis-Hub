export type GamePlatform = 'manual' | 'steam' | 'epic' | 'gog' | 'ubisoft' | 'ea' | 'xbox' | 'emulator';

export interface EmulatorConfig {
  id: string;
  name: string;
  shortName: string;
  consoleName: string;
  consoleCategory: 'sony' | 'nintendo' | 'sega' | 'microsoft' | 'other' | 'custom' | string;
  executablePath?: string;
  installed: boolean;
  romPaths: string[];
  gamesCount: number;
  color: string;
  badgeBg: string;
  thumbnailUrl?: string;
  bannerUrl?: string;
  customArgs?: string;
  customExtensions?: string[];
  isCustom?: boolean;
  enabled?: boolean;
  systemKey?: string;
  websiteUrl?: string;
  downloadUrl?: string;
  customLogoUrl?: string;
}

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
  needsReauth?: boolean;
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
  playtimeMinutes?: number;
  lastPlayed?: string;
  rating?: number;
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

export interface StoreLinkItem {
  id: string; // 'steam' | 'epic' | 'gog' | 'xbox' | 'playstation' | 'nintendo' | 'ea' | 'ubisoft'
  name: string;
  url: string;
  price?: string;
}

export interface RecommendedGame {
  id: string;
  title: string;
  coverUrl: string;
  bannerUrl?: string;
  rating?: number;
  releaseDate?: string;
  genres: string[];
  platforms: string[]; // e.g. ['PC', 'PlayStation 5', 'Xbox Series X', 'Nintendo Switch']
  stores: StoreLinkItem[];
  description?: string;
  aiRecommendationReason?: string;
  recommendationBadge?: string;
}

export interface CustomApp {
  id: string;
  name: string;
  executablePath: string;
  arguments?: string;
  iconUrl?: string;
  category?: 'communication' | 'media' | 'browser' | 'streaming' | 'utility' | 'game' | 'other';
  description?: string;
}

export interface LauncherSettings {
  closeOnLaunch: boolean;
  minimizeToTray: boolean;
  closeToTray: boolean;
  autoScanOnStartup: boolean;
  startInBigPicture?: boolean;
  startWithWindows?: boolean;
  startupWindowMode?: 'minimized' | 'maximized';
  libraryViewMode: 'grid' | 'compact' | 'list';
  gridSize: 'small' | 'medium' | 'large';
  sortBy: 'title' | 'lastPlayed' | 'playtime' | 'recentlyAdded';
  sortOrder: 'asc' | 'desc';
  scanPaths: string[];
  defaultFilter?: string; // 'all' | 'installed' | 'cloud' | 'favorites' | 'recent'
  defaultPlatform?: GamePlatform | 'all';
  showHiddenGamesCollection?: boolean;
  showPlatformBadges?: boolean;
  filterAdultGames?: boolean;
  autoCheckUpdates?: boolean;
  trayIconColor?: 'white' | 'black';
  geminiApiKey?: string;
  rawgApiKey?: string;
  customApps?: CustomApp[];
}

export interface PulseGiveaway {
  id: number | string;
  title: string;
  worth: string;
  thumbnail: string;
  image: string;
  description: string;
  instructions: string;
  openGiveawayUrl: string;
  publishedDate: string;
  type: string;
  platforms: string;
  endDate?: string;
  users?: number;
}

export interface PulseDeal {
  dealId: string;
  title: string;
  salePrice: string;
  normalPrice: string;
  savings: number;
  metacriticScore?: number;
  steamRatingPercent?: number;
  steamRatingText?: string;
  thumb: string;
  dealUrl: string;
  storeName: string;
  storeId: string;
  releaseDate?: number;
}

export interface PulseNewsItem {
  id: string;
  title: string;
  snippet: string;
  url: string;
  source: string; // e.g. 'IGN' | 'PC Gamer' | 'Eurogamer'
  publishedAt: string;
  imageUrl?: string;
  isTopStory?: boolean;
  categories?: string[];
}

export interface UserAchievement {
  gameTitle: string;
  achievementName: string;
  description?: string;
  unlockedAt?: string;
  iconUrl?: string;
  rarity?: number;
}

export interface PulseData {
  giveaways: PulseGiveaway[];
  deals: PulseDeal[];
  news: PulseNewsItem[];
  achievements?: UserAchievement[];
  lastUpdated: number;
}

export interface SteamReleaseItem {
  id: string;
  title: string;
  coverUrl: string;
  headerUrl: string;
  bannerUrl?: string;
  releaseDateStr: string;
  parsedDate?: string;
  price?: string;
  originalPrice?: string;
  discountPercent?: string;
  steamUrl: string;
  isComingSoon?: boolean;
  shortDescription?: string;
  developer?: string;
  publisher?: string;
  isAdult?: boolean;
}

export interface ReleaseMonthSection {
  monthKey: string;
  label: string;
  isRecentReleases?: boolean;
  games: SteamReleaseItem[];
}

export interface SteamReleasesResponse {
  currentPeriod: string;
  sections: ReleaseMonthSection[];
  availableYears: number[];
  cachedAt: number;
}


