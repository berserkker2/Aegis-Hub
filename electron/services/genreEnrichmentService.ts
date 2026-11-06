import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { Game } from '../../src/types/game';

const CACHE_VERSION = '2';

const JUNK_OR_NON_GENRE_TAGS = new Set([
  'indie',
  'singleplayer',
  'single-player',
  'multiplayer',
  'online co-op',
  'co-op',
  'local co-op',
  'local multiplayer',
  '4 player local',
  'massively multiplayer',
  'pvp',
  'pve',
  'team-based',
  'first-person',
  'third person',
  'third-person',
  'top-down',
  'isometric',
  'side scroller',
  'female protagonist',
  'male protagonist',
  'villain protagonist',
  'silent protagonist',
  'protagonist',
  'great soundtrack',
  'soundtrack',
  'music',
  'difficult',
  'atmospheric',
  'dark',
  'realistic',
  'cinematic',
  'vr',
  'nudity',
  'sexual content',
  'gore',
  'violent',
  'violence',
  'blood',
  'mature',
  'nsfw',
  'hentai',
  'early access',
  'free to play',
  'remake',
  'remaster',
  'classic',
  'retro',
  'old school',
  'controller',
  'short',
  'linear',
  'nonlinear',
  'funny',
  'dark humor',
  'casual',
  'family friendly',
  'family sharing',
  'moddable',
  'mod',
  'fast-paced',
  'physics',
  'cartoony',
  'cartoon',
  'voxel',
  '1980s',
  '1990s',
  "1990's",
  '2d',
  '2.5d',
  '3d',
  'stylized',
  'minimalist',
  'relaxing',
  'cozy',
  'cute',
  'hand-drawn',
  'pixel graphics',
  'colorful',
  'beautiful',
  'psychedelic',
  'surreal',
  'lore-rich',
  'interactive fiction',
  'choices matter',
  'multiple endings',
  'dynamic narration',
  'replay value',
  'procedural generation',
  'character customization',
  'steam cloud',
  'epic cloud',
  'gog cloud',
  'pc game',
  'steam library',
  'epic games',
  'cloud owned',
  'auto-detected',
  'manual entry',
  'manual',
  'unknown',
  'quick-time events',
  'software',
  'utilities',
  'lgbtq+',
]);

const GENRE_NORMALIZATION: Record<string, string> = {
  'sci-fi': 'Sci-Fi',
  'science fiction': 'Sci-Fi',
  'action-adventure': 'Action-Adventure',
  'souls-like': 'Souls-like',
  'soulslike': 'Souls-like',
  'rogue-like': 'Roguelike',
  'roguelike': 'Roguelike',
  'rogue-lite': 'Roguelite',
  'roguelite': 'Roguelite',
  'action roguelike': 'Action Roguelike',
  'roguelike deckbuilder': 'Deckbuilder',
  'hack and slash': 'Hack and Slash',
  "beat 'em up": "Beat 'em up",
  "shoot 'em up": "Shoot 'Em Up",
  'open world survival craft': 'Survival',
  'fps': 'FPS',
  'first-person shooter': 'FPS',
  'third-person shooter': 'Third-Person Shooter',
  'rpg': 'RPG',
  'role-playing': 'RPG',
  'jrpg': 'JRPG',
  'crpg': 'CRPG',
  'arpg': 'Action RPG',
  'action rpg': 'Action RPG',
  'survival horror': 'Survival Horror',
  'psychological horror': 'Psychological Horror',
  'open world': 'Open World',
  'story rich': 'Story Rich',
  'space sim': 'Space Sim',
  'life sim': 'Life Sim',
  'automobile sim': 'Automobile Sim',
  'medical sim': 'Medical Sim',
  'immersive sim': 'Immersive Sim',
  'tower defense': 'Tower Defense',
  'city builder': 'City Builder',
  'base building': 'Base Building',
  'visual novel': 'Visual Novel',
  'turn-based strategy': 'Turn-Based Strategy',
  'turn-based tactics': 'Turn-Based Tactics',
  'turn-based combat': 'Turn-Based RPG',
  'puzzle platformer': 'Puzzle Platformer',
  '2d platformer': '2D Platformer',
  '3d platformer': '3D Platformer',
  'point & click': 'Point & Click',
};

const ULTRA_BROAD_GENRES = new Set(['action', 'adventure']);

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/gi, '&')
    .replace(/&#0?39;/gi, "'")
    .replace(/&rsquo;/gi, "'")
    .replace(/&lsquo;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .trim();
}

export class GenreEnrichmentService {
  private cacheFilePath: string;
  private cache: Map<string, string[]> = new Map();
  private steamTagMap: Map<number, string> | null = null;
  private isLoaded = false;

  constructor() {
    const userData = app ? app.getPath('userData') : path.join(process.env.APPDATA || '.', 'game-launcher');
    this.cacheFilePath = path.join(userData, 'genre-enrichment-cache.json');
    this.loadCache();
  }

  private loadCache(): void {
    if (this.isLoaded) return;
    try {
      if (fs.existsSync(this.cacheFilePath)) {
        const raw = fs.readFileSync(this.cacheFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && parsed.__cache_version__?.[0] === CACHE_VERSION) {
          for (const [k, v] of Object.entries(parsed)) {
            if (k !== '__cache_version__' && Array.isArray(v)) {
              this.cache.set(k.toLowerCase().trim(), v as string[]);
            }
          }
        } else {
          // Clear legacy v1 cache that had distorted priority sorting or mismatched titles
          this.cache.clear();
        }
      }
      this.isLoaded = true;
    } catch {
      this.isLoaded = true;
    }
  }

  private saveCache(): void {
    try {
      const obj: Record<string, string[]> = {
        __cache_version__: [CACHE_VERSION],
      };
      for (const [k, v] of this.cache.entries()) {
        obj[k] = v;
      }
      const dir = path.dirname(this.cacheFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.cacheFilePath, JSON.stringify(obj, null, 2), 'utf-8');
    } catch {}
  }

  /**
   * Cleans and sanitizes game title for searching
   */
  public cleanTitle(title: string): string {
    const original = title.replace(/[®™©]/g, '').trim();
    const cleaned = original
      .replace(/\s*-\s*Amazon Prime\s*$/i, '')
      .replace(/\s*\|.*$/g, '')
      .replace(/\s*\(.*?\)\s*/g, ' ')
      .replace(/\s*\[.*?\]\s*/g, ' ')
      .replace(
        /\b(Standard|Deluxe|Gold|Ultimate|Complete|Remastered|Enhanced|Definitive|Director's Cut|GOTY|Game of the Year|Anniversary|Warmastered|Deathinitive|Re-Elected)\s*(Edition|Collection|Cut)?\b/gi,
        ''
      )
      .replace(/[-:]+\s*$/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleaned) {
      // Fallback for titles like "[REDACTED]" where brackets are the entire title
      return original.replace(/[\[\]]/g, '').trim();
    }
    return cleaned;
  }

  private setCacheForGame(title: string, storeId: string | undefined, platform: string | undefined, genres: string[]): void {
    if (platform === 'steam' && storeId) {
      this.cache.set(`steam:${storeId}`, genres);
    }
    const rawTitleKey = `title:${title.toLowerCase().trim()}`;
    const cleanTitleKey = `title:${this.cleanTitle(title).toLowerCase()}`;
    this.cache.set(rawTitleKey, genres);
    if (cleanTitleKey !== 'title:') {
      this.cache.set(cleanTitleKey, genres);
    }
  }

  public getCachedGenres(title: string, storeId?: string, platform?: string): string[] | null {
    this.loadCache();
    if (platform === 'steam' && storeId && this.cache.has(`steam:${storeId}`)) {
      return this.cache.get(`steam:${storeId}`)!;
    }
    if (storeId && this.cache.has(`steam:${storeId}`)) {
      return this.cache.get(`steam:${storeId}`)!;
    }
    const rawKey = `title:${title.toLowerCase().trim()}`;
    if (this.cache.has(rawKey)) {
      return this.cache.get(rawKey)!;
    }
    const cleanKey = `title:${this.cleanTitle(title).toLowerCase()}`;
    if (cleanKey !== 'title:' && this.cache.has(cleanKey)) {
      return this.cache.get(cleanKey)!;
    }
    return null;
  }

  /**
   * Loads official Steam tag ID -> English tag name dictionary
   */
  private async ensureSteamTagMap(): Promise<Map<number, string>> {
    if (this.steamTagMap && this.steamTagMap.size > 0) {
      return this.steamTagMap;
    }
    const map = new Map<number, string>();
    try {
      const res = await fetch('https://store.steampowered.com/tagdata/populartags/english', {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SteamLauncher/1.0' },
      });
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) {
          for (const item of list) {
            if (typeof item.tagid === 'number' && typeof item.name === 'string') {
              map.set(item.tagid, item.name);
            }
          }
        }
      }
    } catch {}
    this.steamTagMap = map;
    return map;
  }

  /**
   * Batch fetches Steam user tags for up to hundreds of AppIDs in bulk using IStoreBrowseService/GetItems/v1
   */
  public async fetchSteamTagsBatch(appIds: string[]): Promise<Map<string, string[]>> {
    const result = new Map<string, string[]>();
    const uniqueIds = Array.from(new Set(appIds.filter((id) => /^\d+$/.test(id))));
    if (uniqueIds.length === 0) return result;

    const tagMap = await this.ensureSteamTagMap();
    if (tagMap.size === 0) return result;

    const chunkSize = 150;
    for (let i = 0; i < uniqueIds.length; i += chunkSize) {
      const chunk = uniqueIds.slice(i, i + chunkSize);
      try {
        const payload = {
          ids: chunk.map((id) => ({ appid: Number(id) })),
          context: { language: 'english', country_code: 'US', steam_realm: 1 },
          data_request: { include_tag_count: 14 },
        };
        const url = `https://api.steampowered.com/IStoreBrowseService/GetItems/v1/?input_json=${encodeURIComponent(
          JSON.stringify(payload)
        )}`;
        const res = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SteamLauncher/1.0' },
        });
        if (res.ok) {
          const json = await res.json();
          const items = json?.response?.store_items || [];
          for (const item of items) {
            if (item && item.appid && Array.isArray(item.tagids)) {
              const rawTags = item.tagids
                .map((tid: number) => tagMap.get(tid))
                .filter((name: string | undefined): name is string => Boolean(name));
              if (rawTags.length > 0) {
                result.set(String(item.appid), rawTags);
              }
            }
          }
        }
      } catch {}
    }

    return result;
  }

  /**
   * Fetches real Steam community user tags via the lightweight apphoverpublic endpoint
   */
  public async fetchSteamUserTags(appId: string): Promise<string[]> {
    try {
      const res = await fetch(`https://store.steampowered.com/apphoverpublic/${appId}?l=english`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SteamLauncher/1.0' },
      });
      if (!res.ok) return [];
      const html = await res.text();
      const matches = [...html.matchAll(/<div class="app_tag">([^<]+)<\/div>/g)].map((m) =>
        decodeHtmlEntities(m[1])
      );
      return matches;
    } catch {
      return [];
    }
  }

  /**
   * Searches Steam store for matching appId by title with strict title verification
   */
  public async searchSteamAppId(title: string): Promise<string | null> {
    const clean = this.cleanTitle(title);
    if (!clean || clean.length < 2) return null;

    const norm = (s: string) =>
      s
        .toLowerCase()
        .replace(/[®™©]/g, '')
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const rawTarget = norm(title);
    const cleanTarget = norm(clean);

    try {
      const searchUrl = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(clean)}&l=english&cc=US`;
      const res = await fetch(searchUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SteamLauncher/1.0' },
      });
      if (!res.ok) return null;
      const json = await res.json();
      const items: any[] = json?.items || [];
      if (items.length === 0) return null;

      let bestItem: any = null;
      let bestScore = -1;

      for (const item of items) {
        const itemName = String(item.name || '');
        if (/\b(soundtrack|ost|artbook|demo|playtest|mixtape|content pack|upgrade|season pass)\b/i.test(itemName) && !/soundtrack/i.test(title)) {
          continue;
        }

        const itemRaw = norm(itemName);
        const itemClean = norm(this.cleanTitle(itemName));

        let score = 0;
        if (itemRaw === rawTarget) {
          score = 100;
        } else if (itemClean === cleanTarget && cleanTarget.length > 0) {
          score = 95;
        } else if (itemClean.startsWith(cleanTarget + ' ') || cleanTarget.startsWith(itemClean + ' ')) {
          const extra = itemClean.replace(cleanTarget, '').replace(itemClean, '').trim();
          // Reject sequel number mismatches (e.g., "Subnautica" vs "Subnautica 2", "Control" vs "Control Resonant")
          if (/^(\d+|ii|iii|iv|v|vi|2|3|4|resonant|below zero|remake)$/i.test(extra)) {
            score = 20;
          } else {
            score = 80;
          }
        } else {
          const targetWords = cleanTarget.split(' ').filter((w) => w.length > 2);
          if (targetWords.length >= 2) {
            const matched = targetWords.filter((w) => itemClean.split(' ').includes(w));
            if (matched.length === targetWords.length) {
              score = 75;
            }
          }
        }

        if (score > bestScore && score >= 75) {
          bestScore = score;
          bestItem = item;
        }
      }

      if (bestItem) {
        return String(bestItem.id);
      }
    } catch {}
    return null;
  }

  /**
   * Fallback to GOG Catalog when a game is not on Steam
   */
  private async fetchGogGenresByTitle(title: string): Promise<string[]> {
    const clean = this.cleanTitle(title);
    if (!clean || clean.length < 2) return [];
    try {
      const gogUrl = `https://catalog.gog.com/v1/catalog?query=${encodeURIComponent(clean)}&limit=5`;
      const res = await fetch(gogUrl);
      if (!res.ok) return [];
      const json = await res.json();
      const products: any[] = json?.products || [];
      const cleanNorm = clean.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();

      for (const p of products) {
        const pClean = this.cleanTitle(p.title || '')
          .toLowerCase()
          .replace(/[^\w\s]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (pClean === cleanNorm || pClean.includes(cleanNorm) || cleanNorm.includes(pClean)) {
          const gogGenres = Array.isArray(p.genres)
            ? p.genres.map((g: any) => (typeof g === 'string' ? g : g.name || '')).filter(Boolean)
            : [];
          const gogTags = Array.isArray(p.tags)
            ? p.tags.map((t: any) => (typeof t === 'string' ? t : t.name || '')).filter(Boolean)
            : [];
          const combined = this.filterAndSortGenres([...gogGenres, ...gogTags]);
          if (combined.length > 0) return combined;
        }
      }
    } catch {}
    return [];
  }

  /**
   * Filters and normalizes tags into authentic genres while preserving Steam's natural community vote order
   */
  public filterAndSortGenres(tags: string[]): string[] {
    // Only inspect the top 10 tags so low-vote tangential tags at positions #14-#20 don't pollute primary genres
    const topRaw = tags.slice(0, 10);
    const specific: string[] = [];
    const broad: string[] = [];

    for (const t of topRaw) {
      const raw = decodeHtmlEntities(t);
      if (!raw) continue;
      const lower = raw.toLowerCase();
      if (JUNK_OR_NON_GENRE_TAGS.has(lower)) continue;

      const normalized = GENRE_NORMALIZATION[lower] || raw;
      const normLower = normalized.toLowerCase();
      if (JUNK_OR_NON_GENRE_TAGS.has(normLower)) continue;

      if (ULTRA_BROAD_GENRES.has(normLower)) {
        if (!broad.some((b) => b.toLowerCase() === normLower)) {
          broad.push(normalized);
        }
      } else {
        if (!specific.some((s) => s.toLowerCase() === normLower)) {
          specific.push(normalized);
        }
      }
    }

    // Specific genres stay in their exact Steam community vote rank order, with broad 'Action'/'Adventure' after
    return [...specific, ...broad].slice(0, 6);
  }

  /**
   * Checks whether a genres array is empty, generic, or the legacy ['Action', 'Adventure'] placeholder
   */
  public isPlaceholderOrGenericGenres(genres: string[] | undefined, title: string, storeId?: string, platform?: string): boolean {
    if (!genres || genres.length === 0) return true;
    const lower = genres.map((g) => g.trim().toLowerCase());
    if (lower.every((g) => JUNK_OR_NON_GENRE_TAGS.has(g))) return true;
    if (lower.length === 2 && lower[0] === 'action' && lower[1] === 'adventure') {
      // If it's literally ['Action', 'Adventure'] and not backed by our v2 cache, treat as placeholder
      const cached = this.getCachedGenres(title, storeId, platform);
      if (!cached || cached.join('|') !== 'Action|Adventure') {
        return true;
      }
    }
    return false;
  }

  /**
   * Dynamically resolves real genres for any game from Steam community tags or GOG with persistent caching
   */
  public async fetchRealGenresForGame(game: {
    title: string;
    storeId?: string;
    platform?: string;
  }): Promise<string[] | null> {
    this.loadCache();

    const existing = this.getCachedGenres(game.title, game.storeId, game.platform);
    if (existing && existing.length > 0) {
      return existing;
    }

    let appId: string | null = game.platform === 'steam' && game.storeId ? game.storeId : null;
    if (!appId) {
      appId = await this.searchSteamAppId(game.title);
    }

    if (appId) {
      const rawTags = await this.fetchSteamUserTags(appId);
      if (rawTags.length > 0) {
        const genres = this.filterAndSortGenres(rawTags);
        if (genres.length > 0) {
          this.setCacheForGame(game.title, game.storeId || appId, game.platform, genres);
          this.saveCache();
          return genres;
        }
      }
    }

    // Fallback to GOG Catalog if not found on Steam
    const gogGenres = await this.fetchGogGenresByTitle(game.title);
    if (gogGenres.length > 0) {
      this.setCacheForGame(game.title, game.storeId, game.platform, gogGenres);
      this.saveCache();
      return gogGenres;
    }

    return null;
  }

  /**
   * Normalizes, enriches, and orders genres synchronously using cache, themes, and existing tags
   */
  public normalizeAndEnrichGenres(
    title: string,
    currentGenres: string[] = [],
    themes: string[] = [],
    tags: string[] = [],
    storeId?: string,
    platform?: string
  ): string[] {
    const cached = this.getCachedGenres(title, storeId, platform);
    if (cached && cached.length > 0) {
      return cached;
    }

    // Combine all available metadata signals
    const combined = [...tags, ...themes, ...currentGenres];
    const filtered = this.filterAndSortGenres(combined);

    if (filtered.length > 0) {
      return filtered;
    }

    return [];
  }

  /**
   * Enriches a list of games in place using bulk Steam GetItems API + smart title resolution
   */
  public async syncAllLibraryGenres(
    games: Game[],
    onProgress?: (current: number, total: number) => void
  ): Promise<{ updatedCount: number; games: Game[] }> {
    this.loadCache();

    let updatedCount = 0;
    const total = games.length;
    let completed = 0;

    // 1. Bulk-resolve all Steam games that aren't in v2 cache yet using IStoreBrowseService/GetItems/v1
    const steamGamesToFetch = games.filter(
      (g) => g.platform === 'steam' && g.storeId && !this.getCachedGenres(g.title, g.storeId, g.platform)
    );

    if (steamGamesToFetch.length > 0) {
      const batchMap = await this.fetchSteamTagsBatch(steamGamesToFetch.map((g) => g.storeId!));
      for (const g of steamGamesToFetch) {
        const rawTags = batchMap.get(g.storeId!);
        if (rawTags && rawTags.length > 0) {
          const genres = this.filterAndSortGenres(rawTags);
          if (genres.length > 0) {
            this.setCacheForGame(g.title, g.storeId, 'steam', genres);
          }
        }
      }
      this.saveCache();
    }

    // 2. Apply cached genres immediately to all games in the library
    const remainingGames: Game[] = [];
    for (const game of games) {
      if (game.platform === 'emulator') {
        completed++;
        if (onProgress) onProgress(completed, total);
        continue;
      }

      const cached = this.getCachedGenres(game.title, game.storeId, game.platform);
      if (cached && cached.length > 0) {
        const oldStr = (game.genres || []).join('|');
        const newStr = cached.join('|');
        if (oldStr !== newStr) {
          game.genres = cached;
          updatedCount++;
        }
        completed++;
        if (onProgress) onProgress(completed, total);
      } else {
        remainingGames.push(game);
      }
    }

    // 3. Resolve remaining non-Steam (Epic, GOG, Ubisoft, EA) or uncached games:
    // Phase 3a: Resolve Steam AppIDs in parallel batches, then bulk-fetch tags via GetItems
    const searchBatchSize = 20;
    const resolvedAppIdMap = new Map<Game, string>();
    const nonSteamFallbacks: Game[] = [];

    for (let i = 0; i < remainingGames.length; i += searchBatchSize) {
      const batch = remainingGames.slice(i, i + searchBatchSize);
      await Promise.all(
        batch.map(async (game) => {
          try {
            const appId = await this.searchSteamAppId(game.title);
            if (appId) {
              resolvedAppIdMap.set(game, appId);
            } else {
              nonSteamFallbacks.push(game);
            }
          } catch {
            nonSteamFallbacks.push(game);
          }
        })
      );
    }

    if (resolvedAppIdMap.size > 0) {
      const appIdsToFetch = Array.from(new Set(resolvedAppIdMap.values()));
      const batchTagsMap = await this.fetchSteamTagsBatch(appIdsToFetch);

      for (const [game, appId] of resolvedAppIdMap.entries()) {
        const rawTags = batchTagsMap.get(appId);
        if (rawTags && rawTags.length > 0) {
          const genres = this.filterAndSortGenres(rawTags);
          if (genres.length > 0) {
            this.setCacheForGame(game.title, game.storeId, game.platform, genres);
            const oldStr = (game.genres || []).join('|');
            const newStr = genres.join('|');
            if (oldStr !== newStr) {
              game.genres = genres;
              updatedCount++;
            }
          }
        } else {
          nonSteamFallbacks.push(game);
        }
        completed++;
        if (onProgress) onProgress(Math.min(completed, total), total);
      }
      this.saveCache();
    }

    // Phase 3b: Fallback to GOG Catalog for titles not on Steam
    const fallbackBatchSize = 6;
    for (let i = 0; i < nonSteamFallbacks.length; i += fallbackBatchSize) {
      const batch = nonSteamFallbacks.slice(i, i + fallbackBatchSize);
      await Promise.all(
        batch.map(async (game) => {
          try {
            const gogGenres = await this.fetchGogGenresByTitle(game.title);
            if (gogGenres.length > 0) {
              this.setCacheForGame(game.title, game.storeId, game.platform, gogGenres);
              const oldStr = (game.genres || []).join('|');
              const newStr = gogGenres.join('|');
              if (oldStr !== newStr) {
                game.genres = gogGenres;
                updatedCount++;
              }
            } else {
              const cleaned = this.filterAndSortGenres(game.genres || []);
              const oldStr = (game.genres || []).join('|');
              const newStr = cleaned.join('|');
              if (oldStr !== newStr) {
                game.genres = cleaned;
                updatedCount++;
              }
            }
          } catch {
            // Ignore single game fetch failure
          } finally {
            completed++;
            if (onProgress) onProgress(Math.min(completed, total), total);
          }
        })
      );
    }

    this.saveCache();
    return { updatedCount, games };
  }

  /**
   * Synchronously applies v2 cached genres and cleans junk tags from existing genres
   */
  public enrichAllGamesSync(games: Game[]): { updatedCount: number; games: Game[] } {
    this.loadCache();
    let updatedCount = 0;

    for (const game of games) {
      if (game.platform === 'emulator') continue;

      const cached = this.getCachedGenres(game.title, game.storeId, game.platform);
      if (cached && cached.length > 0) {
        const oldStr = (game.genres || []).join('|');
        const newStr = cached.join('|');
        if (oldStr !== newStr) {
          game.genres = cached;
          updatedCount++;
        }
        continue;
      }

      if (game.genres && game.genres.length > 0) {
        if (this.isPlaceholderOrGenericGenres(game.genres, game.title, game.storeId, game.platform)) {
          game.genres = [];
          updatedCount++;
        } else {
          const cleaned = this.filterAndSortGenres(game.genres);
          const oldStr = game.genres.join('|');
          const newStr = cleaned.join('|');
          if (oldStr !== newStr) {
            game.genres = cleaned;
            updatedCount++;
          }
        }
      }
    }
    return { updatedCount, games };
  }
}

export const genreEnrichmentService = new GenreEnrichmentService();
