import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { app } from 'electron';
import { UserAchievement } from '../../src/types/game';

export interface GameAchievementProgress {
  appId: string;
  unlocked: number;
  total: number;
  percentage: number;
}

export class SteamAchievementService {
  private steamPath: string | null = null;
  private gameTitleMap = new Map<string, string>();
  private lastTitleMapLoad = 0;

  constructor() {
    this.findSteamPath();
  }

  private findSteamPath(): string | null {
    if (this.steamPath && fs.existsSync(this.steamPath)) {
      return this.steamPath;
    }

    const candidates = [
      'C:\\Program Files (x86)\\Steam',
      'C:\\Program Files\\Steam',
      'D:\\Steam',
      'E:\\Steam',
      'G:\\Games\\Steam',
      'G:\\Steam',
    ];

    for (const p of candidates) {
      if (fs.existsSync(p)) {
        this.steamPath = p;
        return p;
      }
    }

    return null;
  }

  /**
   * Refreshes local mapping from Steam AppID to game title
   */
  private loadGameTitles(): void {
    const now = Date.now();
    if (this.gameTitleMap.size > 0 && now - this.lastTitleMapLoad < 60000) {
      return;
    }

    this.lastTitleMapLoad = now;

    // 1. Try reading from launcher's games.json
    try {
      const userDataDir = app?.getPath ? app.getPath('userData') : '';
      if (userDataDir) {
        const gamesJsonPath = path.join(userDataDir, 'games.json');
        if (fs.existsSync(gamesJsonPath)) {
          const games = JSON.parse(fs.readFileSync(gamesJsonPath, 'utf-8'));
          if (Array.isArray(games)) {
            for (const g of games) {
              if (g.platform === 'steam') {
                const match =
                  g.id?.match(/\d+/) ||
                  (g.executablePath && g.executablePath.match(/rungameid\/(\d+)/i));
                if (match && g.title) {
                  this.gameTitleMap.set(match[1] || match[0], g.title);
                }
              }
            }
          }
        }
      }
    } catch {}

    // 2. Scan installed Steam manifests if available
    const steamDir = this.findSteamPath();
    if (steamDir) {
      const manifestDirs = [path.join(steamDir, 'steamapps')];
      
      // Parse libraryfolders.vdf for other libraries
      const libFoldersPath = path.join(steamDir, 'steamapps', 'libraryfolders.vdf');
      if (fs.existsSync(libFoldersPath)) {
        try {
          const content = fs.readFileSync(libFoldersPath, 'utf-8');
          const matches = content.matchAll(/"path"\s*"([^"]+)"/g);
          for (const m of matches) {
            const extraPath = m[1].replace(/\\\\/g, '\\');
            const extraSteamapps = path.join(extraPath, 'steamapps');
            if (fs.existsSync(extraSteamapps)) {
              manifestDirs.push(extraSteamapps);
            }
          }
        } catch {}
      }

      for (const mDir of manifestDirs) {
        try {
          if (!fs.existsSync(mDir)) continue;
          const files = fs.readdirSync(mDir);
          for (const file of files) {
            if (file.startsWith('appmanifest_') && file.endsWith('.acf')) {
              const appIdMatch = file.match(/appmanifest_(\d+)\.acf/);
              if (appIdMatch) {
                const appId = appIdMatch[1];
                if (!this.gameTitleMap.has(appId)) {
                  try {
                    const acf = fs.readFileSync(path.join(mDir, file), 'utf-8');
                    const nameMatch = acf.match(/"name"\s*"([^"]+)"/i);
                    if (nameMatch && nameMatch[1]) {
                      this.gameTitleMap.set(appId, nameMatch[1].trim());
                    }
                  } catch {}
                }
              }
            }
          }
        } catch {}
      }
    }
  }

  /**
   * Retrieves the most recently unlocked Steam achievements from local querycache
   */
  public getRecentAchievements(limit: number = 6): UserAchievement[] {
    const steamDir = this.findSteamPath();
    if (!steamDir) return [];

    const userdataDir = path.join(steamDir, 'userdata');
    if (!fs.existsSync(userdataDir)) return [];

    this.loadGameTitles();

    interface RawExtractedAchievement {
      gameTitle: string;
      achievementName: string;
      description?: string;
      unlockedAt?: string;
      iconUrl?: string;
      rarity?: number;
      unlockTimestamp: number;
    }

    const allUnlocked: RawExtractedAchievement[] = [];

    try {
      const userFolders = fs.readdirSync(userdataDir);

      for (const uid of userFolders) {
        // Skip non-numeric Steam userdata folders
        if (!/^\d+$/.test(uid)) continue;

        const querycacheDir = path.join(userdataDir, uid, 'querycache', 'achievements');
        if (!fs.existsSync(querycacheDir)) continue;

        const files = fs.readdirSync(querycacheDir);
        const userFiles = files.filter((f) => f.includes('user_achievements') && f.endsWith('.cachedmsg'));
        const schemaFiles = files.filter((f) => f.includes('schema') && f.endsWith('.cachedmsg'));
        const globalPercFiles = files.filter((f) => f.includes('globalpercentages') && f.endsWith('.cachedmsg'));

        for (const uf of userFiles) {
          const match = uf.match(/achievements_(\d+)_user_achievements/);
          if (!match) continue;
          const appId = match[1];

          const sf = schemaFiles.find((f) => f.startsWith(`achievements_${appId}_schema`));
          if (!sf) continue;

          try {
            const uRaw = fs.readFileSync(path.join(querycacheDir, uf));
            const uJson = JSON.parse(zlib.gunzipSync(uRaw).toString('utf-8'));

            const sRaw = fs.readFileSync(path.join(querycacheDir, sf));
            const sJson = JSON.parse(zlib.gunzipSync(sRaw).toString('utf-8'));

            // Optional: read global percentages for rarity if present
            const rarityMap = new Map<string, number>();
            const gpf = globalPercFiles.find((f) => f.startsWith(`achievements_${appId}_globalpercentages`));
            if (gpf) {
              try {
                const gRaw = fs.readFileSync(path.join(querycacheDir, gpf));
                const gJson = JSON.parse(zlib.gunzipSync(gRaw).toString('utf-8'));
                if (gJson?.data?.percentages) {
                  for (const [k, v] of Object.entries(gJson.data.percentages)) {
                    rarityMap.set(k, Math.round(Number(v)));
                  }
                }
              } catch {}
            }

            // Build schema map for fast lookup
            const schemaMap = new Map<any, any>();
            for (const group of sJson?.data?.groups || []) {
              for (const ach of group?.achievements || []) {
                if (ach.internal_key !== undefined) schemaMap.set(String(ach.internal_key), ach);
                if (ach.api_name) schemaMap.set(ach.api_name, ach);
              }
            }

            const gameTitle = this.gameTitleMap.get(appId) || `Steam App ${appId}`;

            for (const [key, uAch] of Object.entries<any>(uJson?.data?.achievements || {})) {
              if (uAch && uAch.unlocked) {
                const schema =
                  schemaMap.get(String(uAch.internal_key)) ||
                  schemaMap.get(key) ||
                  {};

                const achApiName = schema.api_name || key;
                const rarity = rarityMap.get(achApiName) || rarityMap.get(key);

                allUnlocked.push({
                  gameTitle,
                  achievementName: schema.name || achApiName || 'Achievement',
                  description: schema.description || undefined,
                  iconUrl: schema.icon_achieved || undefined,
                  unlockedAt: uAch.unlock_time
                    ? new Date(uAch.unlock_time * 1000).toISOString()
                    : undefined,
                  unlockTimestamp: uAch.unlock_time || 0,
                  rarity,
                });
              }
            }
          } catch {}
        }
      }
    } catch (err) {
      console.warn('Error reading Steam achievements from querycache:', err);
    }

    // Sort by most recently unlocked first
    allUnlocked.sort((a, b) => b.unlockTimestamp - a.unlockTimestamp);

    return allUnlocked.slice(0, limit).map(({ unlockTimestamp, ...rest }) => rest);
  }

  /**
   * Retrieves summary progress (unlocked count / total) for a specific Steam game
   */
  public getGameAchievementProgress(appId: string): GameAchievementProgress | null {
    const steamDir = this.findSteamPath();
    if (!steamDir) return null;

    const userdataDir = path.join(steamDir, 'userdata');
    if (!fs.existsSync(userdataDir)) return null;

    try {
      const userFolders = fs.readdirSync(userdataDir);
      for (const uid of userFolders) {
        if (!/^\d+$/.test(uid)) continue;

        const progressJsonPath = path.join(
          userdataDir,
          uid,
          'config',
          'librarycache',
          'achievement_progress.json'
        );

        if (fs.existsSync(progressJsonPath)) {
          try {
            const content = JSON.parse(fs.readFileSync(progressJsonPath, 'utf-8'));
            if (Array.isArray(content?.mapCache)) {
              for (const [cachedId, val] of content.mapCache) {
                if (String(cachedId) === String(appId) && val) {
                  return {
                    appId: String(appId),
                    unlocked: val.unlocked || 0,
                    total: val.total || 0,
                    percentage: Math.round(val.percentage || 0),
                  };
                }
              }
            }
          } catch {}
        }
      }
    } catch {}

    return null;
  }
}

export const steamAchievementService = new SteamAchievementService();
