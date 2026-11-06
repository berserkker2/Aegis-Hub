import fs from 'fs';
import path from 'path';
import { Game, GamePlatform, StoreAccount } from '../../src/types/game';
import { genreEnrichmentService } from './genreEnrichmentService';

// We dynamically require node:sqlite to avoid issues in environments where it might differ
let DatabaseSync: any = null;
try {
  // @ts-ignore
  const sqliteModule = require('node:sqlite');
  DatabaseSync = sqliteModule.DatabaseSync;
} catch (e) {
  console.warn('node:sqlite not available:', e);
}

export interface GalaxyAccountInfo {
  platform: GamePlatform;
  accountName: string;
  externalId: string;
  status: string;
}

export class GalaxyDbService {
  private dbPath: string | null = null;

  constructor() {
    this.findDatabasePath();
  }

  private findDatabasePath(): string | null {
    const candidates = [
      'C:\\ProgramData\\GOG.com\\Galaxy\\storage\\galaxy-2.0.db',
      path.join(process.env.ALLUSERSPROFILE || 'C:\\ProgramData', 'GOG.com', 'Galaxy', 'storage', 'galaxy-2.0.db'),
      path.join(process.env.LOCALAPPDATA || '', 'GOG.com', 'Galaxy', 'storage', 'galaxy-2.0.db'),
    ];

    for (const p of candidates) {
      if (fs.existsSync(p)) {
        this.dbPath = p;
        return p;
      }
    }

    return null;
  }

  public isAvailable(): boolean {
    return !!this.dbPath && !!DatabaseSync;
  }

  public getDatabasePath(): string | null {
    return this.dbPath;
  }

  /**
   * Retrieves all external connected accounts recorded by GOG Galaxy (Epic, Steam, Ubisoft, Origin, Xbox, etc.)
   */
  public getConnectedAccounts(): GalaxyAccountInfo[] {
    if (!this.isAvailable() || !this.dbPath) return [];

    try {
      const db = new DatabaseSync(this.dbPath, { readOnly: true });
      const query = `
        SELECT 
          ea.externalPlatform as platform,
          ea.externalUserId as externalId,
          ea.userName as accountName,
          COALESCE(pc.connectionState, 'Connected') as status
        FROM ExternalAccounts ea
        LEFT JOIN PlatformConnections pc ON pc.platform = ea.externalPlatform AND pc.userId = ea.userId
      `;
      const rows = db.prepare(query).all();

      const results: GalaxyAccountInfo[] = [];
      for (const row of rows) {
        let platform: GamePlatform | null = null;
        switch (row.platform) {
          case 'steam':
            platform = 'steam';
            break;
          case 'epic':
            platform = 'epic';
            break;
          case 'gog':
            platform = 'gog';
            break;
          case 'uplay':
            platform = 'ubisoft';
            break;
          case 'origin':
            platform = 'ea';
            break;
          case 'xboxone':
            platform = 'xbox';
            break;
          default:
            break;
        }

        if (platform) {
          results.push({
            platform,
            accountName: row.accountName || row.externalId || platform,
            externalId: row.externalId || '',
            status: row.status || 'Connected',
          });
        }
      }

      return results;
    } catch (err) {
      console.error('Error reading Galaxy connected accounts:', err);
      return [];
    }
  }

  /**
   * Extracts cloud games from Galaxy DB, optionally filtered by platform
   */
  public getCloudGames(targetPlatform?: GamePlatform): Game[] {
    if (!this.isAvailable() || !this.dbPath) {
      if (!targetPlatform || targetPlatform === 'steam') {
        return steamOwnedService.getOwnedSteamGames();
      }
      return [];
    }

    try {
      const db = new DatabaseSync(this.dbPath, { readOnly: true });

      let whereClause = "WHERE lr.releaseKey NOT LIKE 'generic_%'";
      if (targetPlatform) {
        const platformPrefix = this.mapPlatformToPrefix(targetPlatform);
        if (platformPrefix) {
          whereClause = `WHERE lr.releaseKey LIKE '${platformPrefix}_%'`;
        }
      }

      const query = `
        SELECT 
          lr.releaseKey,
          MAX(CASE WHEN gp.gamePieceTypeId = 7 THEN gp.value END) as originalTitle,
          MAX(CASE WHEN gp.gamePieceTypeId = 61 THEN gp.value END) as title,
          MAX(CASE WHEN gp.gamePieceTypeId = 4 THEN gp.value END) as originalImages,
          MAX(CASE WHEN gp.gamePieceTypeId = 5 THEN gp.value END) as originalMeta,
          MAX(CASE WHEN gp.gamePieceTypeId = 1926 THEN gp.value END) as summary,
          gt.minutesInGame,
          lp.lastPlayedDate
        FROM LibraryReleases lr
        LEFT JOIN GamePieces gp ON gp.releaseKey = lr.releaseKey
        LEFT JOIN GameTimes gt ON gt.releaseKey = lr.releaseKey
        LEFT JOIN LastPlayedDates lp ON lp.gameReleaseKey = lr.releaseKey
        ${whereClause}
        GROUP BY lr.releaseKey
      `;

      const rows = db.prepare(query).all();
      const games: Game[] = [];

      for (const row of rows) {
        const releaseKey = String(row.releaseKey || '');
        const sepIndex = releaseKey.indexOf('_');
        if (sepIndex === -1) continue;

        const rawPlatform = releaseKey.substring(0, sepIndex);
        const storeId = releaseKey.substring(sepIndex + 1);

        const platform = this.mapPrefixToPlatform(rawPlatform);
        if (!platform) continue;

        // Parse title
        let title = '';
        if (row.title) {
          try {
            const parsed = JSON.parse(row.title);
            if (parsed.title) title = parsed.title;
          } catch {}
        }
        if (!title && row.originalTitle) {
          try {
            const parsed = JSON.parse(row.originalTitle);
            if (parsed.title) title = parsed.title;
          } catch {}
        }
        if (!title) {
          title = `${platform.toUpperCase()} Game (${storeId})`;
        }

        // Clean trademark characters that sometimes get weird encodings
        title = title.replace(/[®™]/g, '').trim();

        // Parse images
        let coverUrl = '';
        let bannerUrl = '';
        if (row.originalImages) {
          try {
            const imgs = JSON.parse(row.originalImages);
            if (imgs.verticalCover) coverUrl = imgs.verticalCover;
            if (imgs.background) bannerUrl = imgs.background;
          } catch {}
        }

        // Fallbacks for Steam covers if not present
        if (!coverUrl && platform === 'steam') {
          coverUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${storeId}/library_600x900.jpg`;
        }
        if (!bannerUrl && platform === 'steam') {
          bannerUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${storeId}/library_hero.jpg`;
        }

        // Parse metadata (genres, developer, etc.)
        let genres: string[] = [`${platform.toUpperCase()} Cloud`];
        let themes: string[] = [];
        let developer = '';
        let publisher = '';
        let rating: number | undefined = undefined;
        let releaseDate: string | undefined = undefined;

        if (row.originalMeta) {
          try {
            const meta = JSON.parse(row.originalMeta);
            if (Array.isArray(meta.genres) && meta.genres.length > 0) {
              genres = meta.genres;
            }
            if (Array.isArray(meta.themes) && meta.themes.length > 0) {
              themes = meta.themes;
            }
            if (Array.isArray(meta.developers) && meta.developers.length > 0) {
              developer = meta.developers[0];
            }
            if (Array.isArray(meta.publishers) && meta.publishers.length > 0) {
              publisher = meta.publishers[0];
            }
            if (typeof meta.criticsScore === 'number' && meta.criticsScore > 0) {
              rating = Math.round(meta.criticsScore);
            }
            if (meta.releaseDate) {
              releaseDate = new Date(meta.releaseDate * 1000).toISOString().split('T')[0];
            }
          } catch {}
        }

        genres = genreEnrichmentService.normalizeAndEnrichGenres(title, genres, themes, [], storeId, platform);

        // Parse description
        let description = `Owned on ${platform.toUpperCase()} cloud library.`;
        if (row.summary) {
          try {
            const sumObj = JSON.parse(row.summary);
            if (sumObj.summary) {
              description = sumObj.summary;
            }
          } catch {}
        }

        // Launch & Install URIs
        const { executablePath, installUrl } = this.buildStoreUrls(platform, storeId);

        const playtimeMinutes = typeof row.minutesInGame === 'number' ? row.minutesInGame : 0;
        const lastPlayed = row.lastPlayedDate ? new Date(row.lastPlayedDate).toISOString() : undefined;

        games.push({
          id: `${platform}-cloud-${storeId}`,
          title,
          executablePath,
          installUrl,
          platform,
          storeId,
          coverUrl: coverUrl || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80',
          bannerUrl: bannerUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1920&q=80',
          description,
          summary: description.slice(0, 200),
          genres,
          tags: [`${platform.toUpperCase()} Cloud`, 'Uninstalled'],
          developer,
          publisher,
          rating,
          releaseDate,
          favorite: false,
          hidden: false,
          installed: false, // Cloud game
          playtimeMinutes,
          lastPlayed,
          addedDate: new Date().toISOString(),
        });
      }

      return games;
    } catch (err) {
      console.error('Error extracting games from Galaxy DB:', err);
      return [];
    }
  }

  private mapPrefixToPlatform(raw: string): GamePlatform | null {
    switch (raw.toLowerCase()) {
      case 'steam':
        return 'steam';
      case 'epic':
        return 'epic';
      case 'gog':
        return 'gog';
      case 'uplay':
        return 'ubisoft';
      case 'origin':
        return 'ea';
      case 'xboxone':
        return 'xbox';
      default:
        return null;
    }
  }

  private mapPlatformToPrefix(p: GamePlatform): string | null {
    switch (p) {
      case 'steam':
        return 'steam';
      case 'epic':
        return 'epic';
      case 'gog':
        return 'gog';
      case 'ubisoft':
        return 'uplay';
      case 'ea':
        return 'origin';
      case 'xbox':
        return 'xboxone';
      default:
        return null;
    }
  }

  private buildStoreUrls(platform: GamePlatform, storeId: string): { executablePath: string; installUrl: string } {
    switch (platform) {
      case 'steam':
        return {
          executablePath: `steam://rungameid/${storeId}`,
          installUrl: `steam://install/${storeId}`,
        };
      case 'epic':
        return {
          executablePath: `com.epicgames.launcher://apps/${storeId}?action=launch`,
          installUrl: `com.epicgames.launcher://apps/${storeId}?action=install`,
        };
      case 'gog':
        return {
          executablePath: `goggalaxy://openGameView/${storeId}`,
          installUrl: `goggalaxy://openStoreGame/${storeId}`,
        };
      case 'ubisoft':
        return {
          executablePath: `uplay://launch/${storeId}/0`,
          installUrl: `uplay://launch/${storeId}/0`,
        };
      case 'ea':
        return {
          executablePath: `origin2://game/launch?offerIds=${storeId}`,
          installUrl: `origin2://game/launch?offerIds=${storeId}`,
        };
      case 'xbox':
        return {
          executablePath: `ms-windows-store://pdp/?ProductId=${storeId}`,
          installUrl: `ms-windows-store://pdp/?ProductId=${storeId}`,
        };
      default:
        return {
          executablePath: '',
          installUrl: '',
        };
    }
  }

  /**
   * Retrieves latest unlocked achievements from local Galaxy DB
   */
  public getRecentAchievements(limit: number = 5): {
    gameTitle: string;
    achievementName: string;
    description?: string;
    unlockedAt?: string;
    iconUrl?: string;
    rarity?: number;
  }[] {
    if (!this.isAvailable() || !this.dbPath) return [];

    try {
      const db = new DatabaseSync(this.dbPath, { readOnly: true });
      const query = `
        SELECT 
          ua.gameReleaseKey,
          ua.unlockTime,
          a.imageUnlockedUrl,
          a.rarity,
          la.name as achievementName,
          la.description as achievementDescription,
          MAX(CASE WHEN gp.gamePieceTypeId = 61 THEN gp.value END) as titleJson,
          MAX(CASE WHEN gp.gamePieceTypeId = 7 THEN gp.value END) as originalTitleJson
        FROM UserAchievements ua
        JOIN Achievements a ON a.gameReleaseKey = ua.gameReleaseKey AND a.apikey = ua.apikey
        LEFT JOIN LocalizedAchievements la ON la.gameReleaseKey = ua.gameReleaseKey AND la.apikey = ua.apikey
        LEFT JOIN GamePieces gp ON gp.releaseKey = ua.gameReleaseKey
        WHERE ua.isUnlocked = 1 AND ua.unlockTime IS NOT NULL
        GROUP BY ua.gameReleaseKey, ua.apikey
        ORDER BY ua.unlockTime DESC
        LIMIT ?
      `;

      const rows = db.prepare(query).all(limit);
      const results = [];

      for (const r of rows) {
        let title = 'Game';
        try {
          const t = JSON.parse(r.titleJson || r.originalTitleJson);
          if (t.title) title = t.title;
        } catch {}

        title = title.replace(/[®™]/g, '').trim();

        results.push({
          gameTitle: title,
          achievementName: r.achievementName || 'Achievement',
          description: r.achievementDescription || undefined,
          unlockedAt: r.unlockTime || undefined,
          iconUrl: r.imageUnlockedUrl || undefined,
          rarity: r.rarity ? Math.round(r.rarity) : undefined,
        });
      }

      return results;
    } catch (err) {
      console.warn('Failed to query user achievements from Galaxy DB:', err);
      return [];
    }
  }
}

export const galaxyDbService = new GalaxyDbService();
