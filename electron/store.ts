import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { Game, LauncherSettings } from '../src/types/game';

const defaultSettings: LauncherSettings = {
  closeOnLaunch: false,
  minimizeToTray: false,
  closeToTray: false,
  autoScanOnStartup: false,
  startInBigPicture: false,
  startWithWindows: false,
  startupWindowMode: 'maximized',
  libraryViewMode: 'grid',
  gridSize: 'medium',
  sortBy: 'lastPlayed',
  sortOrder: 'desc',
  scanPaths: [
    'C:\\Games',
    'D:\\Games',
    'C:\\Program Files\\GOG Galaxy\\Games',
    'C:\\Program Files (x86)\\GOG Galaxy\\Games',
  ],
  defaultFilter: 'all',
  defaultPlatform: 'all',
  showHiddenGamesCollection: false,
  showPlatformBadges: true,
  filterAdultGames: true,
  trayIconColor: 'white',
  customApps: [
    {
      id: 'app-discord',
      name: 'Discord',
      executablePath: 'discord://',
      category: 'communication',
      description: 'Voice, video, and text chat',
      iconUrl: 'https://cdn-icons-png.flaticon.com/512/3670/3670157.png',
    },
    {
      id: 'app-spotify',
      name: 'Spotify',
      executablePath: 'spotify:',
      category: 'media',
      description: 'Music and podcasts for gaming',
      iconUrl: 'https://cdn-icons-png.flaticon.com/512/174/174872.png',
    },
    {
      id: 'app-chrome',
      name: 'Google Chrome',
      executablePath: 'chrome.exe',
      category: 'browser',
      description: 'Web browser and gaming guides',
      iconUrl: 'https://cdn-icons-png.flaticon.com/512/888/888846.png',
    },
  ],
};

export class LauncherStore {
  private dataDir: string;
  private gamesFilePath: string;
  private settingsFilePath: string;
  private activityFilePath: string;

  constructor() {
    try {
      this.dataDir = app ? app.getPath('userData') : path.join(process.cwd(), '.launcher-data');
    } catch {
      this.dataDir = path.join(process.cwd(), '.launcher-data');
    }

    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    this.gamesFilePath = path.join(this.dataDir, 'games.json');
    this.settingsFilePath = path.join(this.dataDir, 'settings.json');
    this.activityFilePath = path.join(this.dataDir, 'activity.json');
  }

  public getActivity(): Record<string, number> {
    try {
      if (fs.existsSync(this.activityFilePath)) {
        const raw = fs.readFileSync(this.activityFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      }
    } catch (err) {
      console.error('Error reading activity store:', err);
    }
    return {};
  }

  public recordDailyActivity(dateStr: string, minutes: number): void {
    try {
      const activity = this.getActivity();
      activity[dateStr] = Math.max(0, (activity[dateStr] || 0) + minutes);
      fs.writeFileSync(this.activityFilePath, JSON.stringify(activity, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error writing activity store:', err);
    }
  }

  public saveActivity(activity: Record<string, number>): void {
    try {
      fs.writeFileSync(this.activityFilePath, JSON.stringify(activity, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error writing activity store:', err);
    }
  }

  public getGames(): Game[] {
    try {
      if (fs.existsSync(this.gamesFilePath)) {
        const raw = fs.readFileSync(this.gamesFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.map((g: Game) => ({
            ...g,
            installed: g.installed !== undefined ? g.installed : true,
            isRunning: false,
          }));
        }
      }
    } catch (err) {
      console.error('Error reading games store:', err);
    }

    // Clean initial state: no hardcoded placeholders
    return [];
  }

  public saveGames(games: Game[]): void {
    try {
      // Ensure ephemeral runtime flag `isRunning` is never persisted to disk
      const sanitized = games.map((g: Game) => {
        const { isRunning, ...rest } = g;
        return rest;
      });
      fs.writeFileSync(this.gamesFilePath, JSON.stringify(sanitized, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error writing games store:', err);
    }
  }

  public getSettings(): LauncherSettings {
    try {
      if (fs.existsSync(this.settingsFilePath)) {
        const raw = fs.readFileSync(this.settingsFilePath, 'utf-8');
        return { ...defaultSettings, ...JSON.parse(raw) };
      }
    } catch (err) {
      console.error('Error reading settings store:', err);
    }
    return defaultSettings;
  }

  public saveSettings(settings: LauncherSettings): void {
    try {
      fs.writeFileSync(this.settingsFilePath, JSON.stringify(settings, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error writing settings store:', err);
    }
  }
}
