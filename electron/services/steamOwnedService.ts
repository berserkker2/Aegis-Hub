import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { Game } from '../../src/types/game';
import { genreEnrichmentService } from './genreEnrichmentService';
import { galaxyDbService } from './galaxyDbService';

interface AppInfo {
  name: string;
  type: string;
}

interface LocalSteamPlaytime {
  playtimeMinutes: number;
  lastPlayed?: string;
}

export class SteamOwnedService {
  private cachedAppInfo: Map<string, AppInfo> | null = null;
  private steamPath: string | null = null;

  constructor() {
    this.findSteamPath();
  }

  public getSteamPath(): string | null {
    if (this.steamPath && fs.existsSync(this.steamPath)) {
      return this.steamPath;
    }
    return this.findSteamPath();
  }

  private findSteamPath(): string | null {
    // 1. Try registry query
    try {
      const stdout = execSync('reg query "HKCU\\Software\\Valve\\Steam" /v SteamPath', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
      const match = stdout.match(/SteamPath\s+REG_SZ\s+(.*)/i);
      if (match && match[1]) {
        const found = match[1].trim();
        if (fs.existsSync(found)) {
          this.steamPath = found;
          return found;
        }
      }
    } catch {
      // Ignore registry error and fallback
    }

    // 2. Standard fallback paths
    const candidates = [
      'C:\\Program Files (x86)\\Steam',
      'C:\\Program Files\\Steam',
      'D:\\Steam',
      'E:\\Steam',
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
   * Parse appcache/appinfo.vdf to get official Steam app names and types
   */
  private loadAppInfoMap(steamPath: string): Map<string, AppInfo> {
    if (this.cachedAppInfo) return this.cachedAppInfo;

    const map = new Map<string, AppInfo>();
    const appInfoPath = path.join(steamPath, 'appcache', 'appinfo.vdf');
    if (!fs.existsSync(appInfoPath)) return map;

    try {
      const buf = fs.readFileSync(appInfoPath);
      if (buf.length < 24) return map;

      const stringTableOffset = Number(buf.readBigUInt64LE(8));
      if (stringTableOffset <= 0 || stringTableOffset >= buf.length) return map;

      const stringCount = buf.readUInt32LE(stringTableOffset);
      const stringTable: string[] = [];
      let strStart = stringTableOffset + 4;

      for (let i = strStart; i < buf.length && stringTable.length < stringCount; i++) {
        if (buf[i] === 0) {
          stringTable.push(buf.subarray(strStart, i).toString('utf-8'));
          strStart = i + 1;
        }
      }

      const nameKeyIndex = stringTable.indexOf('name');
      const typeKeyIndex = stringTable.indexOf('type');
      if (nameKeyIndex === -1 || typeKeyIndex === -1) return map;

      const namePattern = Buffer.alloc(5);
      namePattern[0] = 0x01;
      namePattern.writeUInt32LE(nameKeyIndex, 1);

      const typePattern = Buffer.alloc(5);
      typePattern[0] = 0x01;
      typePattern.writeUInt32LE(typeKeyIndex, 1);

      let offset = 16;
      while (offset < stringTableOffset - 8) {
        const appId = buf.readUInt32LE(offset);
        if (appId === 0) break;
        const size = buf.readUInt32LE(offset + 4);
        const dataStart = offset + 64;
        const dataEnd = offset + 8 + size;
        if (dataEnd > stringTableOffset) break;

        const slice = buf.subarray(dataStart, dataEnd);

        let name = '';
        let type = '';

        const nIdx = slice.indexOf(namePattern);
        if (nIdx !== -1) {
          const s = nIdx + 5;
          const e = slice.indexOf(0, s);
          if (e !== -1) {
            name = slice.subarray(s, e).toString('utf-8');
          }
        }

        const tIdx = slice.indexOf(typePattern);
        if (tIdx !== -1) {
          const s = tIdx + 5;
          const e = slice.indexOf(0, s);
          if (e !== -1) {
            type = slice.subarray(s, e).toString('utf-8').toLowerCase();
          }
        }

        if (name) {
          map.set(appId.toString(), { name, type });
        }

        offset = dataEnd;
      }

      this.cachedAppInfo = map;
    } catch (err) {
      console.error('Error parsing Steam appinfo.vdf:', err);
    }

    return map;
  }

  /**
   * Scans local Steam files for all owned games
   */
  public getOwnedSteamGames(): Game[] {
    const steamPath = this.getSteamPath();
    if (!steamPath) return [];

    const appInfoMap = this.loadAppInfoMap(steamPath);
    const userDataDir = path.join(steamPath, 'userdata');
    if (!fs.existsSync(userDataDir)) return [];

    const userDirs = fs.readdirSync(userDataDir).filter(d => /^\d+$/.test(d));
    const candidateIds = new Set<string>();
    const playtimes = new Map<string, LocalSteamPlaytime>();
    const cacheJsonDirMap = new Map<string, string>(); // appId -> cacheJsonFilePath

    // 0. Populate candidate IDs and metadata from cloud multi-store cache (GOG Galaxy DB)
    const cloudGames = galaxyDbService.isAvailable() ? galaxyDbService.getCloudGames('steam') : [];
    const cloudGamesMap = new Map<string, Game>();
    for (const cg of cloudGames) {
      if (cg.storeId) {
        cloudGamesMap.set(cg.storeId, cg);
        candidateIds.add(cg.storeId);
      }
    }

    // 0.5 Populate candidate IDs from global Steam appcache/librarycache
    const globalLibCache = path.join(steamPath, 'appcache', 'librarycache');
    if (fs.existsSync(globalLibCache)) {
      try {
        const libEntries = fs.readdirSync(globalLibCache);
        for (const entry of libEntries) {
          if (/^\d+$/.test(entry)) {
            candidateIds.add(entry);
          }
        }
      } catch {}
    }

    for (const uid of userDirs) {
      const cacheDir = path.join(userDataDir, uid, 'config', 'librarycache');
      if (fs.existsSync(cacheDir)) {
        try {
          const files = fs.readdirSync(cacheDir);
          for (const f of files) {
            if (f.endsWith('.json') && f !== 'achievement_progress.json') {
              const appId = f.replace('.json', '');
              if (/^\d+$/.test(appId)) {
                candidateIds.add(appId);
                cacheJsonDirMap.set(appId, path.join(cacheDir, f));
              }
            }
          }
        } catch {}
      }

      const localConfigPath = path.join(userDataDir, uid, 'config', 'localconfig.vdf');
      if (fs.existsSync(localConfigPath)) {
        try {
          const content = fs.readFileSync(localConfigPath, 'utf-8');
          const lcMatches = content.matchAll(/"apps"\s*\{([\s\S]*?)\n\t\t\t\t\}/g);
          for (const m of lcMatches) {
            const inner = m[1];
            const appMatches = inner.matchAll(/"(\d+)"\s*\{([\s\S]*?)\}/g);
            for (const am of appMatches) {
              const aid = am[1];
              candidateIds.add(aid);
              const playMatch = am[2].match(/"Playtime"\s*"(\d+)"/);
              const lastMatch = am[2].match(/"LastPlayed"\s*"(\d+)"/);
              if (playMatch || lastMatch) {
                playtimes.set(aid, {
                  playtimeMinutes: playMatch ? parseInt(playMatch[1], 10) : 0,
                  lastPlayed: lastMatch ? new Date(parseInt(lastMatch[1], 10) * 1000).toISOString() : undefined,
                });
              }
            }
          }
        } catch {}
      }
    }

    // Find installed Steam apps to mark installed state correctly
    const installedAppIds = new Set<string>();
    const libraryPaths: string[] = [steamPath];
    const libraryFoldersVdf = path.join(steamPath, 'steamapps', 'libraryfolders.vdf');
    if (fs.existsSync(libraryFoldersVdf)) {
      try {
        const lfContent = fs.readFileSync(libraryFoldersVdf, 'utf-8');
        const pathMatches = lfContent.matchAll(/"path"\s+"([^"]+)"/g);
        for (const m of pathMatches) {
          const cleanPath = m[1].replace(/\\\\/g, '\\');
          if (fs.existsSync(cleanPath) && !libraryPaths.includes(cleanPath)) {
            libraryPaths.push(cleanPath);
          }
        }
      } catch {}
    }

    for (const lib of libraryPaths) {
      const saDir = path.join(lib, 'steamapps');
      if (fs.existsSync(saDir)) {
        try {
          const files = fs.readdirSync(saDir);
          for (const f of files) {
            if (f.startsWith('appmanifest_') && f.endsWith('.acf')) {
              const aid = f.replace('appmanifest_', '').replace('.acf', '');
              if (/^\d+$/.test(aid)) {
                installedAppIds.add(aid);
                candidateIds.add(aid);
              }
            }
          }
        } catch {}
      }
    }

    const games: Game[] = [];

    for (const appId of candidateIds) {
      const info = appInfoMap.get(appId);
      const cloudGame = cloudGamesMap.get(appId);

      // Filter out non-games (tools, applications, configs, demos, etc.)
      // Special-case: Half-Life 2: Lost Coast (appId 340) is a standalone playable chapter categorized as 'tool' in appinfo
      if (info && info.type !== 'game' && appId !== '340') {
        continue;
      }

      let title = (info ? info.name : '') || cloudGame?.title || '';

      // Try reading metadata from librarycache json if exists
      let description = cloudGame?.description || 'Owned on Steam cloud library.';
      let developer = cloudGame?.developer || '';
      let publisher = cloudGame?.publisher || '';

      const cacheJsonPath = cacheJsonDirMap.get(appId);
      if (cacheJsonPath && fs.existsSync(cacheJsonPath)) {
        try {
          const raw = fs.readFileSync(cacheJsonPath, 'utf-8');
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const dataMap = new Map<string, any>(parsed);
            const descObj = dataMap.get('descriptions')?.data;
            if (descObj) {
              const snippet = descObj.strSnippet || descObj.strFullDescription;
              if (snippet) {
                // Strip Steam markup tags like [b], [img], [h2]
                description = snippet.replace(/\[\/?(?:b|i|u|h\d|img|imgvid|url|quote|code|spoiler)[^\]]*\]/gi, '').trim();
              }
            }
            const assoc = dataMap.get('associations')?.data;
            if (assoc) {
              if (Array.isArray(assoc.rgDevelopers) && assoc.rgDevelopers.length > 0) {
                developer = assoc.rgDevelopers[0].strName || '';
              }
              if (Array.isArray(assoc.rgPublishers) && assoc.rgPublishers.length > 0) {
                publisher = assoc.rgPublishers[0].strName || '';
              }
            }
          }
        } catch {}
      }

      // If title could not be resolved from Steam appinfo.vdf or cloud cache, it is not a registered owned game
      if (!title || title.trim().length === 0 || title.startsWith('Steam Game (')) {
        continue;
      }

      // Filter out internal Spacewar placeholder (appId 480)
      if (appId === '480') {
        continue;
      }

      // Filter out common tools, playtests, or redistributables
      const lowerTitle = title.toLowerCase();
      if (
        lowerTitle.includes('steamworks common') ||
        lowerTitle.includes('steamvr') ||
        lowerTitle.includes('proton') ||
        lowerTitle.includes('steam linux') ||
        /\b(open\s*beta|playtest|test\s*server|public\s*test)\b/i.test(title) ||
        /forza horizon 6|pragmata/i.test(title)
      ) {
        continue;
      }

      title = title.replace(/[®™]/g, '').trim();

      // Check local cached artwork
      const localCover = path.join(steamPath, 'appcache', 'librarycache', appId, 'library_600x900.jpg');
      const localHero = path.join(steamPath, 'appcache', 'librarycache', appId, 'library_hero.jpg');

      const coverUrl = fs.existsSync(localCover)
        ? `aegis-media:///${localCover.replace(/\\/g, '/')}`
        : (cloudGame?.coverUrl || `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`);

      const bannerUrl = fs.existsSync(localHero)
        ? `aegis-media:///${localHero.replace(/\\/g, '/')}`
        : (cloudGame?.bannerUrl || `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_hero.jpg`);

      const pt = playtimes.get(appId);
      const playtimeMinutes = pt ? pt.playtimeMinutes : (cloudGame?.playtimeMinutes || 0);
      const lastPlayed = pt ? pt.lastPlayed : cloudGame?.lastPlayed;
      const isInstalled = installedAppIds.has(appId);

      const genres = cloudGame?.genres?.length
        ? genreEnrichmentService.normalizeAndEnrichGenres(title, cloudGame.genres, [], [], appId, 'steam')
        : genreEnrichmentService.normalizeAndEnrichGenres(title, ['Steam Cloud'], [], [], appId, 'steam');

      games.push({
        id: `steam-cloud-${appId}`,
        title,
        executablePath: `steam://rungameid/${appId}`,
        installUrl: `steam://install/${appId}`,
        platform: 'steam',
        storeId: appId,
        coverUrl,
        bannerUrl,
        description,
        summary: description.slice(0, 200),
        genres,
        tags: ['STEAM Cloud', isInstalled ? 'Installed' : 'Uninstalled'],
        developer,
        publisher,
        favorite: false,
        hidden: false,
        installed: isInstalled,
        playtimeMinutes,
        lastPlayed,
        addedDate: new Date().toISOString(),
      });
    }

    return games;
  }
}

export const steamOwnedService = new SteamOwnedService();
