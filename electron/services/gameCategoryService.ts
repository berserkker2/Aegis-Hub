import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { Game } from '../../src/types/game';
import { genreEnrichmentService } from './genreEnrichmentService';
import { scrapeEmulatorGameMetadata } from './artworkService';

interface CategoryResult {
  genres: string[];
  tags: string[];
  developer?: string;
  publisher?: string;
  releaseDate?: string;
  summary?: string;
  description?: string;
}

const GENERIC_GENRES = new Set([
  'steam library',
  'pc game',
  'epic cloud',
  'gog cloud',
  'steam cloud',
  'epic games',
  'auto-detected',
  'cloud owned',
  'manual entry',
]);

const GENERIC_DESCRIPTION_PATTERNS = [
  /Steam Game \(AppID: \d+\)/i,
  /Installed via Epic Games Launcher/i,
  /GOG Game:/i,
  /Installed game detected on Windows PC/i,
  /Owned on Steam/i,
  /Owned on Epic Games Store/i,
  /Owned on \w+ (?:Games Store )?account/i,
  /Owned on \w+ (?:Store )?account/i,
  /Owned in \w+ Cloud/i,
  /Detected game on PC/i,
  /Owned on \w+ cloud library/i,
  /Launches seamlessly without requiring browser login/i,
  /No description provided/i,
  /Emulated title for/i,
  /Classic retro title/i,
  /Experience classic retro/i,
];

const PRIORITY_GENRE_TAGS = [
  'Horror',
  'Survival Horror',
  'Psychological Horror',
  'Terror',
  'Open World',
  'Sci-fi',
  'Cyberpunk',
  'Story Rich',
  'Souls-like',
  'Roguelike',
  'Roguelite',
  'Metroidvania',
  'Choices Matter',
  'Stealth',
  'Zombies',
  'Post-apocalyptic',
  'FPS',
  'Third-Person Shooter',
  'JRPG',
  'Visual Novel',
  'City Builder',
  'Tower Defense',
  'Puzzle',
  'Fighting',
  'Racing',
  'Sports',
];

export class GameCategoryService {
  private cacheFilePath: string;
  private cache: Map<string, CategoryResult> = new Map();
  private isLoaded = false;

  constructor() {
    const userData = app ? app.getPath('userData') : path.join(process.env.APPDATA || '.', 'game-launcher');
    this.cacheFilePath = path.join(userData, 'game-categories.json');
    this.loadCache();
  }

  private loadCache(): void {
    if (this.isLoaded) return;
    try {
      if (fs.existsSync(this.cacheFilePath)) {
        const raw = fs.readFileSync(this.cacheFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        for (const [k, v] of Object.entries(parsed)) {
          this.cache.set(k.toLowerCase(), v as CategoryResult);
        }
      }
      this.isLoaded = true;
    } catch (err) {
      console.warn('Failed to load category cache:', err);
      this.isLoaded = true;
    }
  }

  private saveCache(): void {
    try {
      const obj: Record<string, CategoryResult> = {};
      for (const [k, v] of this.cache.entries()) {
        obj[k] = v;
      }
      const dir = path.dirname(this.cacheFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.cacheFilePath, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Failed to save category cache:', err);
    }
  }

  public isGenericGenres(genres?: string[], title = '', storeId?: string, platform?: string): boolean {
    if (!genres || genres.length === 0) return true;
    if (genres.every((g) => GENERIC_GENRES.has(g.trim().toLowerCase()))) return true;
    if (title && genreEnrichmentService.isPlaceholderOrGenericGenres(genres, title, storeId, platform)) {
      return true;
    }
    return false;
  }

  public isGenericDescription(desc?: string, title?: string): boolean {
    if (!desc || desc.trim().length < 25) return true;
    if (title && desc.trim().toLowerCase() === title.trim().toLowerCase()) return true;
    return GENERIC_DESCRIPTION_PATTERNS.some((pattern) => pattern.test(desc));
  }

  public cleanHtmlDescription(rawHtml: string): string {
    return rawHtml
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n### $1\n')
      .replace(/<li[^>]*>(.*?)<\/li>/gi, '• $1\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'")
      .replace(/&rsquo;/g, "'")
      .replace(/&lsquo;/g, "'")
      .replace(/&rdquo;/g, '"')
      .replace(/&ldquo;/g, '"')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private cleanTitle(title: string): string {
    return title
      .replace(/[®™]/g, '')
      .replace(/\s*-\s*Amazon Prime\s*$/i, '')
      .replace(/\s*\(.*?\)\s*/g, ' ')
      .replace(/\s*\[.*?\]\s*/g, ' ')
      .replace(/\b(Standard|Deluxe|Gold|Ultimate|Complete|Remastered|Enhanced|Director's Cut|GOTY|Game of the Year)\s+Edition\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Fetches genres and tags for a single game
   */
  public async fetchCategoriesForGame(game: {
    title: string;
    platform: string;
    storeId?: string;
  }): Promise<CategoryResult | null> {
    this.loadCache();

    const cacheKey = (game.storeId && game.platform === 'steam')
      ? `steam:${game.storeId}`
      : `title:${game.title.toLowerCase().trim()}`;

    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      const v2Genres = genreEnrichmentService.getCachedGenres(game.title, game.storeId, game.platform);
      if (v2Genres && v2Genres.length > 0) {
        cached.genres = v2Genres;
      }
      if (!this.isGenericGenres(cached.genres, game.title, game.storeId, game.platform)) {
        return cached;
      }
    }

    // 0. If it's an emulated title, query Wikipedia and retro DB exclusively
    // Never hit Steam Store or GOG to prevent PC tabletop modules or indie games from hijacking retro console metadata
    if (game.platform === 'emulator') {
      try {
        const emuMeta = await scrapeEmulatorGameMetadata(game.title, game.storeId);
        if (emuMeta) {
          const desc = emuMeta.description;
          const developer = emuMeta.developer;
          const publisher = emuMeta.publisher;
          const releaseDate = emuMeta.releaseDate;
          let genres = emuMeta.genres || [];

          genres = genreEnrichmentService.normalizeAndEnrichGenres(game.title, genres, [], []);
          const result: CategoryResult = {
            genres,
            tags: [],
            developer,
            publisher,
            releaseDate,
            summary: desc,
            description: desc,
          };
          this.cache.set(cacheKey, result);
          this.saveCache();
          return result;
        }
      } catch (err) {
        console.warn('Failed to scrape emulator metadata:', err);
      }
      return null;
    }

    let appId = (game.platform === 'steam' && game.storeId) ? game.storeId : null;
    const clean = this.cleanTitle(game.title);

    // 1. If no appId, search Steam Store (with strict title matching)
    if (!appId && clean.length > 1) {
      appId = await genreEnrichmentService.searchSteamAppId(game.title);
    }

    let genres: string[] = [];
    let tags: string[] = [];
    let developer: string | undefined;
    let publisher: string | undefined;
    let releaseDate: string | undefined;
    let summary: string | undefined;
    let description: string | undefined;

    // 2. Fetch from Steam AppDetails
    if (appId) {
      try {
        const detailUrl = `https://store.steampowered.com/api/appdetails?appids=${appId}`;
        const res = await fetch(detailUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 SteamGameLauncher/1.0' },
        });
        if (res.ok) {
          const json = await res.json();
          if (json && json[appId] && json[appId].data) {
            const data = json[appId].data;
            if (Array.isArray(data.genres)) {
              genres = data.genres.map((g: any) => g.description);
            }
            if (Array.isArray(data.developers) && data.developers.length > 0) {
              developer = data.developers[0];
            }
            if (Array.isArray(data.publishers) && data.publishers.length > 0) {
              publisher = data.publishers[0];
            }
            if (data.release_date?.date) {
              releaseDate = data.release_date.date;
            }
            if (data.short_description) {
              summary = data.short_description;
            }
            if (data.detailed_description || data.about_the_game) {
              description = this.cleanHtmlDescription(data.detailed_description || data.about_the_game);
            } else if (data.short_description) {
              description = data.short_description;
            }
          }
        }
      } catch {}

      // 3. Fetch real community user tags from Steam
      try {
        const steamTags = await genreEnrichmentService.fetchSteamUserTags(appId);
        if (steamTags.length > 0) {
          tags = steamTags.slice(0, 10);
          const filtered = genreEnrichmentService.filterAndSortGenres(steamTags);
          if (filtered.length > 0) {
            genres = filtered;
          }
        }
      } catch {}
    }

    // 4. Fallback to GOG Catalog if no Steam genres found (with strict title matching)
    if (genres.length === 0 && clean.length > 1) {
      try {
        const gogUrl = `https://catalog.gog.com/v1/catalog?query=${encodeURIComponent(clean)}`;
        const res = await fetch(gogUrl);
        if (res.ok) {
          const json = await res.json();
          if (json && json.products && json.products.length > 0) {
            const p = json.products[0];
            const pTitle = (p.title || '').toLowerCase().replace(/[^\w\s]/g, '');
            const cleanNorm = clean.toLowerCase().replace(/[^\w\s]/g, '');
            const targetWords = cleanNorm.split(/\s+/).filter((w) => w.length > 2);
            const matchedWords = targetWords.filter((w) => pTitle.includes(w));
            if (
              cleanNorm.includes(pTitle) ||
              pTitle.includes(cleanNorm) ||
              (targetWords.length > 0 && matchedWords.length / targetWords.length >= 0.6)
            ) {
              if (Array.isArray(p.genres)) {
                genres = p.genres.map((g: any) => (typeof g === 'string' ? g : g.name || ''));
              }
              if (Array.isArray(p.developers) && p.developers.length > 0) {
                developer = p.developers[0];
              }
              if (Array.isArray(p.publishers) && p.publishers.length > 0) {
                publisher = p.publishers[0];
              }
              if (p.releaseDate) {
                releaseDate = p.releaseDate;
              }
            }
          }
        }
      } catch {}
    }

    // 5. Fallback for any remaining titles lacking description
    if (!description && !summary) {
      try {
        const emuMeta = await scrapeEmulatorGameMetadata(game.title, game.storeId);
        if (emuMeta) {
          if (emuMeta.description) {
            description = emuMeta.description;
            summary = emuMeta.description;
          }
          if (emuMeta.developer && !developer) developer = emuMeta.developer;
          if (emuMeta.publisher && !publisher) publisher = emuMeta.publisher;
          if (emuMeta.releaseDate && !releaseDate) releaseDate = emuMeta.releaseDate;
          if (emuMeta.genres && emuMeta.genres.length > 0) {
            genres = Array.from(new Set([...genres, ...emuMeta.genres]));
          }
        }
      } catch {}
    }

    // Clean up empty strings or duplicates and apply genre intelligence
    genres = genreEnrichmentService.normalizeAndEnrichGenres(
      game.title,
      genres,
      [],
      tags,
      appId || game.storeId,
      game.platform
    );
    tags = Array.from(new Set(tags.filter((t) => t && t.trim().length > 0)));

    if (genres.length > 0 || description || summary) {
      const result: CategoryResult = {
        genres,
        tags,
        developer,
        publisher,
        releaseDate,
        summary,
        description,
      };
      this.cache.set(cacheKey, result);
      this.saveCache();
      return result;
    }

    return null;
  }

  /**
   * Enriches all games that currently lack real categories or have generic descriptions
   */
  public async syncMissingCategories(
    games: Game[],
    onProgress?: (current: number, total: number) => void
  ): Promise<{ updatedCount: number; games: Game[] }> {
    this.loadCache();

    // Run live dynamic Steam community tag extraction across library
    const { updatedCount: enrichedCount } = await genreEnrichmentService.syncAllLibraryGenres(games, onProgress);
    let updatedCount = enrichedCount;

    const targets = games.filter(
      (g) => this.isGenericGenres(g.genres, g.title, g.storeId, g.platform) || this.isGenericDescription(g.description, g.title)
    );
    if (targets.length === 0) {
      return { updatedCount, games };
    }
    const total = targets.length;
    let completed = 0;

    // Process in batches of 3
    const batchSize = 3;
    for (let i = 0; i < targets.length; i += batchSize) {
      const batch = targets.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (game) => {
          try {
            const result = await this.fetchCategoriesForGame({
              title: game.title,
              platform: game.platform,
              storeId: game.storeId,
            });

            if (result) {
              let changed = false;
              if (result.genres && result.genres.length > 0 && this.isGenericGenres(game.genres, game.title, game.storeId, game.platform)) {
                game.genres = result.genres;
                changed = true;
              }
              if (result.tags && result.tags.length > 0) {
                const set = new Set([...(game.tags || []), ...result.tags]);
                game.tags = Array.from(set);
              }
              if (!game.developer && result.developer) {
                game.developer = result.developer;
                changed = true;
              }
              if (!game.publisher && result.publisher) {
                game.publisher = result.publisher;
                changed = true;
              }
              if ((!game.description || this.isGenericDescription(game.description, game.title)) && (result.description || result.summary)) {
                game.description = (result.description || result.summary)!;
                changed = true;
              }
              if ((!game.summary || this.isGenericDescription(game.summary, game.title)) && result.summary) {
                game.summary = result.summary;
                changed = true;
              }
              if (changed) {
                updatedCount++;
              }
            }
          } catch {
            // Ignore
          } finally {
            completed++;
            if (onProgress) {
              onProgress(completed, total);
            }
          }
        })
      );

      if (i + batchSize < targets.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    this.saveCache();
    return { updatedCount, games };
  }
}

export const gameCategoryService = new GameCategoryService();
