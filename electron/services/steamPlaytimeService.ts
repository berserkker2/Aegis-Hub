import fs from 'fs';
import path from 'path';
import { Game } from '../../src/types/game';

export interface SteamAppStats {
  minutes: number;
  lastPlayed?: string;
  lastLaunch?: number;
  lastExit?: number;
  sessionDurationMinutes?: number;
}

export interface ActivityStore {
  getActivity(): Record<string, number>;
  recordDailyActivity(dateStr: string, minutes: number): void;
}

function toLocalDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export class SteamPlaytimeService {
  private steamPath: string | null = null;

  constructor() {
    this.findSteamPath();
  }

  private findSteamPath(): string | null {
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
   * Scans all Steam user accounts on the machine and extracts playtime & last played per AppID
   */
  public getLocalPlaytimes(): Map<string, SteamAppStats> {
    const statsMap = new Map<string, SteamAppStats>();
    if (!this.steamPath) return statsMap;

    const userdataDir = path.join(this.steamPath, 'userdata');
    if (!fs.existsSync(userdataDir)) return statsMap;

    try {
      const userFolders = fs.readdirSync(userdataDir);

      for (const userFolder of userFolders) {
        // Steam IDs in userdata are numeric (e.g. 30189585)
        if (!/^\d+$/.test(userFolder)) continue;

        const configPath = path.join(userdataDir, userFolder, 'config', 'localconfig.vdf');
        if (!fs.existsSync(configPath)) continue;

        try {
          const content = fs.readFileSync(configPath, 'utf-8');
          this.parseLocalConfig(content, statsMap);
        } catch (err) {
          console.warn(`Failed to read localconfig.vdf for user ${userFolder}:`, err);
        }
      }
    } catch (err) {
      console.warn('Failed to scan Steam userdata directory:', err);
    }

    return statsMap;
  }

  /**
   * Robust line-by-line parser for Valve KeyValues format that correctly handles nested blocks
   * (e.g., cloud, autocloud) inside each app's configuration.
   */
  private parseLocalConfig(content: string, statsMap: Map<string, SteamAppStats>): void {
    const lines = content.split(/\r?\n/);

    let currentAppId: string | null = null;
    let appDepth = 0;
    let depth = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      if (line === '{') {
        depth++;
        continue;
      }

      if (line === '}') {
        depth--;
        if (currentAppId && depth <= appDepth) {
          currentAppId = null;
        }
        continue;
      }

      const match = line.match(/^"([^"]+)"(?:\s+"([^"]+)")?/);
      if (!match) continue;

      const key = match[1];
      const val = match[2];

      const nextLine = (i + 1 < lines.length) ? lines[i + 1].trim() : '';
      const isSection = (val === undefined) && (nextLine === '{');

      if (isSection && /^\d+$/.test(key)) {
        currentAppId = key;
        appDepth = depth;
        if (!statsMap.has(currentAppId)) {
          statsMap.set(currentAppId, { minutes: 0, lastPlayed: undefined });
        }
        continue;
      }

      if (currentAppId && val !== undefined) {
        const appStat = statsMap.get(currentAppId);
        if (appStat) {
          if (/^Play[tT]ime$/i.test(key)) {
            const mins = parseInt(val, 10) || 0;
            if (mins > appStat.minutes) {
              appStat.minutes = mins;
            }
          } else if (/^LastPlayed$/i.test(key)) {
            const sec = parseInt(val, 10);
            if (sec > 0) {
              try {
                appStat.lastPlayed = new Date(sec * 1000).toISOString();
              } catch {}
            }
          } else if (/^lastlaunch$/i.test(key)) {
            const sec = parseInt(val, 10);
            if (sec > 0) appStat.lastLaunch = sec;
          } else if (/^lastexit$/i.test(key)) {
            const sec = parseInt(val, 10);
            if (sec > 0) appStat.lastExit = sec;
          }
        }
      }
    }

    // Compute session durations where both lastLaunch and lastExit were extracted
    for (const appStat of statsMap.values()) {
      if (appStat.lastExit && appStat.lastLaunch && appStat.lastExit > appStat.lastLaunch) {
        const diffSec = appStat.lastExit - appStat.lastLaunch;
        if (diffSec >= 15 && diffSec <= 86400) {
          appStat.sessionDurationMinutes = Math.round(diffSec / 60);
        }
      }
    }
  }

  /**
   * Syncs games library with real Steam playtimes directly from disk and records daily activity
   */
  public syncGamesPlaytime(games: Game[], store?: ActivityStore): { updatedCount: number; games: Game[] } {
    const steamStats = this.getLocalPlaytimes();
    if (steamStats.size === 0) {
      return { updatedCount: 0, games };
    }

    let updatedCount = 0;

    for (const game of games) {
      // Find Steam AppId
      let appId = game.storeId;
      if (!appId && game.executablePath) {
        const match = game.executablePath.match(/steam:\/\/rungameid\/(\d+)/);
        if (match) appId = match[1];
      }
      if (!appId && game.id) {
        const match = game.id.match(/steam-(\d+)/) || game.id.match(/steam-cloud-(\d+)/);
        if (match) appId = match[1];
      }

      // Also check if game title matches or if it's Detroit Become Human specifically
      if (!appId && game.title.toLowerCase().includes('detroit')) {
        appId = '1222140';
      }

      if (!appId) continue;

      const stat = steamStats.get(appId);
      if (stat) {
        let changed = false;
        const previousMins = game.playtimeMinutes || 0;

        if (stat.minutes > previousMins) {
          const diffMins = stat.minutes - previousMins;
          game.playtimeMinutes = stat.minutes;
          changed = true;

          if (store && diffMins > 0) {
            const sessionDate = stat.lastExit
              ? toLocalDateStr(new Date(stat.lastExit * 1000))
              : (stat.lastPlayed ? toLocalDateStr(new Date(stat.lastPlayed)) : toLocalDateStr(new Date()));
            store.recordDailyActivity(sessionDate, diffMins);
          }
        }

        if (stat.lastPlayed && (!game.lastPlayed || new Date(stat.lastPlayed) > new Date(game.lastPlayed))) {
          game.lastPlayed = stat.lastPlayed;
          changed = true;
        }

        // Also ensure recent session duration from autocloud is counted if today/current week has 0 or less
        if (store && stat.lastExit && stat.sessionDurationMinutes && stat.sessionDurationMinutes > 0) {
          const sessionDate = toLocalDateStr(new Date(stat.lastExit * 1000));
          const currentActivity = store.getActivity();
          const now = Date.now();
          const sessionTime = stat.lastExit * 1000;
          // If session happened within the last 7 days (current week)
          if (now - sessionTime < 7 * 24 * 60 * 60 * 1000) {
            const recordedForDay = currentActivity[sessionDate] || 0;
            if (recordedForDay < stat.sessionDurationMinutes) {
              store.recordDailyActivity(sessionDate, stat.sessionDurationMinutes - recordedForDay);
            }
          }
        }

        if (changed) {
          updatedCount++;
        }
      }
    }

    return { updatedCount, games };
  }
}

export const steamPlaytimeService = new SteamPlaytimeService();
