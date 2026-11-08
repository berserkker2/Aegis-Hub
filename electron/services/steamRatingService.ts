import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { Game } from '../../src/types/game';

export interface SteamReviewScore {
  appId: string;
  rating: number;
  scoreDesc?: string;
  totalReviews: number;
  cachedAt?: string;
}

interface CachedRating {
  rating: number;
  scoreDesc?: string;
  totalReviews: number;
  cachedAt: string;
}

export class SteamRatingService {
  private cacheFilePath: string;
  private cache: Map<string, CachedRating> = new Map();
  private isLoaded = false;

  constructor() {
    const userData = app ? app.getPath('userData') : path.join(process.env.APPDATA || '.', 'game-launcher');
    this.cacheFilePath = path.join(userData, 'steam-ratings.json');
    this.loadCache();
  }

  private loadCache(): void {
    if (this.isLoaded) return;
    try {
      if (fs.existsSync(this.cacheFilePath)) {
        const raw = fs.readFileSync(this.cacheFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        for (const [k, v] of Object.entries(parsed)) {
          this.cache.set(k, v as CachedRating);
        }
      }
      this.isLoaded = true;
    } catch (err) {
      console.warn('Failed to load Steam ratings cache:', err);
      this.isLoaded = true;
    }
  }

  private saveCache(): void {
    try {
      const obj: Record<string, CachedRating> = {};
      for (const [k, v] of this.cache.entries()) {
        obj[k] = v;
      }
      const dir = path.dirname(this.cacheFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.cacheFilePath, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Failed to save Steam ratings cache:', err);
    }
  }

  public getCachedRating(appId: string): number | undefined {
    this.loadCache();
    return this.cache.get(appId)?.rating;
  }

  public getCachedScore(appId: string): CachedRating | undefined {
    this.loadCache();
    return this.cache.get(appId);
  }

  /**
   * Fetches the user review rating & details for a single Steam AppID
   */
  public async getSteamScore(appId: string): Promise<CachedRating | undefined> {
    this.loadCache();
    const cached = this.cache.get(appId);
    if (cached) {
      return cached;
    }

    // 1. Query the official Steam Web API for User Reviews
    try {
      const inputData = {
        appid: parseInt(appId, 10),
        filter: 2,
        languages: ['all'],
        purchase_type: 1,
        num_per_page: 0,
      };
      const url = `https://api.steampowered.com/IUserReviewsService/GetAppReviews/v1/?input_json=${encodeURIComponent(
        JSON.stringify(inputData)
      )}`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SteamGameLauncher/1.0',
          'Accept': 'application/json',
        },
      });

      if (res.ok) {
        const json = await res.json();
        const summary = json?.response?.query_summary;
        if (summary && typeof summary.total_reviews === 'number' && summary.total_reviews > 0) {
          const rating = Math.round((summary.total_positive / summary.total_reviews) * 100);
          const entry: CachedRating = {
            rating,
            scoreDesc: summary.review_score_desc,
            totalReviews: summary.total_reviews,
            cachedAt: new Date().toISOString(),
          };
          this.cache.set(appId, entry);
          this.saveCache();
          return entry;
        }
      }
    } catch (err) {
      // Ignore network errors
    }

    // 2. Fallback: Query Steam Store AppDetails API for Metacritic score
    try {
      const detailUrl = `https://store.steampowered.com/api/appdetails?appids=${appId}&l=english&cc=US`;
      const dRes = await fetch(detailUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SteamGameLauncher/1.0',
        },
      });
      if (dRes.ok) {
        const dJson = await dRes.json();
        const meta = dJson?.[appId]?.data?.metacritic;
        if (meta && typeof meta.score === 'number') {
          const entry: CachedRating = {
            rating: meta.score,
            scoreDesc: 'Metacritic',
            totalReviews: 0,
            cachedAt: new Date().toISOString(),
          };
          this.cache.set(appId, entry);
          this.saveCache();
          return entry;
        }
      }
    } catch {}

    return undefined;
  }

  private isTitleClose(s1: string, s2: string): boolean {
    const norm = (s: string) =>
      s
        .toLowerCase()
        .replace(/[^a-z0-9]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const n1 = norm(s1);
    const n2 = norm(s2);
    if (!n1 || !n2) return false;
    if (n1 === n2) return true;
    if (n1.startsWith(n2) || n2.startsWith(n1)) return true;
    const w1 = n1.split(' ').filter((w) => w.length > 2);
    const w2 = n2.split(' ').filter((w) => w.length > 2);
    const common = w1.filter((w) => w2.includes(w));
    return common.length >= Math.min(2, Math.min(w1.length, w2.length)) && common.length > 0;
  }

  public async resolveAppId(title: string, storeId?: string): Promise<string | undefined> {
    if (storeId && /^\d+$/.test(storeId)) {
      return storeId;
    }

    const cleanTitle = title
      .replace(/\(.*?\)/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/\.[a-z0-9]+$/i, '')
      .replace(/™|®|©/g, '')
      .trim();
    if (!cleanTitle || cleanTitle.length < 2) return undefined;

    try {
      const searchUrl = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(
        cleanTitle
      )}&l=english&cc=US`;
      const res = await fetch(searchUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SteamGameLauncher/1.0' },
      });
      if (res.ok) {
        const json = await res.json();
        if (json && json.items && json.items.length > 0) {
          const matched = json.items.find((it: any) => this.isTitleClose(it.name, cleanTitle)) || json.items[0];
          if (matched && this.isTitleClose(matched.name, cleanTitle)) {
            return String(matched.id);
          }
        }
      }
    } catch {}

    return undefined;
  }

  /**
   * Retrieves or discovers the Steam review score for any game (library or discovery)
   */
  public async getSteamScoreForGame(
    title: string,
    storeId?: string,
    platform?: string,
    idOrUrl?: string
  ): Promise<SteamReviewScore | null> {
    let appId: string | undefined = undefined;

    if (storeId && /^\d+$/.test(storeId)) {
      appId = storeId;
    } else if (storeId) {
      const match = storeId.match(/\d{3,}/);
      if (match) appId = match[0];
    }

    if (!appId && idOrUrl) {
      const match = idOrUrl.match(/(?:app\/|steam[-:]|rungameid\/)(\d+)/i);
      if (match) appId = match[1];
    }

    if (!appId) {
      appId = await this.resolveAppId(title, storeId);
    }

    if (!appId) return null;

    const score = await this.getSteamScore(appId);
    if (!score) return null;

    return {
      appId,
      rating: score.rating,
      scoreDesc: score.scoreDesc,
      totalReviews: score.totalReviews,
      cachedAt: score.cachedAt,
    };
  }

  /**
   * Fetches the user review rating for a single Steam AppID
   */
  public async fetchRating(appId: string): Promise<number | undefined> {
    const score = await this.getSteamScore(appId);
    return score?.rating;
  }

  /**
   * Synchronizes ratings for an array of games.
   * Updates any Steam game missing a rating.
   */
  public async syncGamesRatings(
    games: Game[],
    onProgress?: (current: number, total: number) => void
  ): Promise<{ updatedCount: number; games: Game[] }> {
    this.loadCache();

    // Identify Steam games that need a rating
    const steamGames = games.filter(
      (g) => g.platform === 'steam' && g.storeId && (typeof g.rating !== 'number' || g.rating === 0)
    );

    if (steamGames.length === 0) {
      return { updatedCount: 0, games };
    }

    let updatedCount = 0;
    const total = steamGames.length;
    let completed = 0;

    // Process in batches of 4 concurrent requests with a small interval
    const batchSize = 4;
    for (let i = 0; i < steamGames.length; i += batchSize) {
      const batch = steamGames.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (game) => {
          const appId = game.storeId!;
          try {
            const rating = await this.fetchRating(appId);
            if (typeof rating === 'number' && rating > 0) {
              game.rating = rating;
              updatedCount++;
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

      // Brief delay to be polite to Steam API
      if (i + batchSize < steamGames.length) {
        await new Promise((resolve) => setTimeout(resolve, 80));
      }
    }

    this.saveCache();
    return { updatedCount, games };
  }
}

export const steamRatingService = new SteamRatingService();
