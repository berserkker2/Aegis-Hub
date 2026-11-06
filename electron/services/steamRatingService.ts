import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { Game } from '../../src/types/game';

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

  /**
   * Fetches the user review rating for a single Steam AppID
   */
  public async fetchRating(appId: string): Promise<number | undefined> {
    this.loadCache();
    const cached = this.cache.get(appId);
    if (cached) {
      return cached.rating;
    }

    try {
      const url = `https://store.steampowered.com/appreviews/${appId}?json=1&purchase_type=all&num_per_page=0`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SteamGameLauncher/1.0',
        },
      });

      if (!res.ok) {
        return undefined;
      }

      const json = await res.json();
      if (json && json.query_summary) {
        const { total_reviews, total_positive, review_score_desc } = json.query_summary;
        if (typeof total_reviews === 'number' && total_reviews > 0) {
          const rating = Math.round((total_positive / total_reviews) * 100);
          this.cache.set(appId, {
            rating,
            scoreDesc: review_score_desc,
            totalReviews: total_reviews,
            cachedAt: new Date().toISOString(),
          });
          this.saveCache();
          return rating;
        }
      }
    } catch (err) {
      // Ignore network errors
    }

    return undefined;
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
