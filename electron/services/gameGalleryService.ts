import fs from 'fs';
import path from 'path';
import { app } from 'electron';

export interface GameScreenshot {
  id: number;
  thumbnail: string;
  full: string;
}

export interface GalleryResult {
  screenshots: GameScreenshot[];
}

export class GameGalleryService {
  private cacheFilePath: string;
  private cache: Map<string, GalleryResult> = new Map();
  private isLoaded = false;

  constructor() {
    const userData = (app && typeof app.getPath === 'function')
      ? app.getPath('userData')
      : path.join(process.env.APPDATA || '.', 'game-launcher');
    this.cacheFilePath = path.join(userData, 'game-gallery-cache.json');
    this.loadCache();
  }

  private loadCache(): void {
    if (this.isLoaded) return;
    try {
      if (fs.existsSync(this.cacheFilePath)) {
        const raw = fs.readFileSync(this.cacheFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        for (const [k, v] of Object.entries(parsed)) {
          this.cache.set(k.toLowerCase(), v as GalleryResult);
        }
      }
      this.isLoaded = true;
    } catch (err) {
      console.warn('Failed to load gallery cache:', err);
      this.isLoaded = true;
    }
  }

  private saveCache(): void {
    try {
      const obj: Record<string, GalleryResult> = {};
      for (const [k, v] of this.cache.entries()) {
        obj[k] = v;
      }
      const dir = path.dirname(this.cacheFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.cacheFilePath, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Failed to save gallery cache:', err);
    }
  }

  private cleanTitle(title: string): string {
    return title
      .replace(/[®™]/g, '')
      .replace(/\s*-\s*Amazon Prime\s*$/i, '')
      .replace(/\s*\(.*?\)\s*/g, ' ')
      .replace(/\s*\[.*?\]\s*/g, ' ')
      .replace(/[-:]\s*(The\s+)?(Standard|Deluxe|Gold|Ultimate|Complete|Legacy|Remastered|Enhanced|Director's Cut|GOTY|Game of the Year|Celebration|Digital Deluxe|Premium Online).*$/i, '')
      .replace(/\b(Standard|Deluxe|Gold|Ultimate|Complete|Legacy|Remastered|Enhanced|Director's Cut|GOTY|Game of the Year|Celebration|Digital Deluxe|Premium Online)\s*(Edition|Collection)?\b/gi, '')
      .replace(/\s*[-:]\s*$/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private isCloseMatch(candidate: string, target: string): boolean {
    const c = candidate.toLowerCase().replace(/[^a-z0-9]/g, '');
    const t = target.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (c === t) return true;
    if (c.includes(t) || t.includes(c)) {
      const minLen = Math.min(c.length, t.length);
      const maxLen = Math.max(c.length, t.length);
      return minLen / maxLen > 0.45;
    }
    return false;
  }

  public async fetchGameGallery(game: {
    title: string;
    platform?: string;
    storeId?: string;
    bannerUrl?: string;
    coverUrl?: string;
  }): Promise<GalleryResult> {
    if (!game || !game.title) {
      return { screenshots: [] };
    }

    this.loadCache();

    let appId = (game.platform === 'steam' && game.storeId)
      ? game.storeId.replace(/\D/g, '')
      : null;

    const clean = this.cleanTitle(game.title);
    const platformKey = game.platform ? game.platform.toLowerCase() : 'game';
    const cacheKey = (appId && game.platform === 'steam')
      ? `steam:${appId}`
      : `${platformKey}:${clean.toLowerCase().trim()}`;

    if (this.cache.has(cacheKey.toLowerCase())) {
      return this.cache.get(cacheKey.toLowerCase())!;
    }

    const commonHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
    };

    const screenshots: GameScreenshot[] = [];

    // 1. Search Steam Store if no AppID yet
    if (!appId && clean.length > 1) {
      try {
        const searchUrl = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(clean)}&l=english&cc=US`;
        const res = await fetch(searchUrl, { headers: commonHeaders });
        if (res.ok) {
          const json = await res.json();
          if (json && json.items && json.items.length > 0) {
            const first = json.items[0];
            if (this.isCloseMatch(first.name, clean)) {
              appId = first.id.toString();
            }
          }
        }
      } catch {}
    }

    // 2. Fetch from Steam AppDetails
    if (appId) {
      try {
        const detailUrl = `https://store.steampowered.com/api/appdetails?appids=${appId}&l=english&cc=US`;
        const res = await fetch(detailUrl, { headers: commonHeaders });
        if (res.ok) {
          const json = await res.json();
          if (json && json[appId] && json[appId].data && Array.isArray(json[appId].data.screenshots)) {
            for (const item of json[appId].data.screenshots) {
              if (item.path_full) {
                screenshots.push({
                  id: item.id || screenshots.length,
                  thumbnail: item.path_thumbnail || item.path_full,
                  full: item.path_full,
                });
              }
            }
          }
        }
      } catch {}
    }

    // 3. Fallback to GOG Product API if platform is GOG and no screenshots yet
    if (screenshots.length === 0 && game.platform === 'gog' && game.storeId && /^\d+$/.test(game.storeId)) {
      try {
        const gogUrl = `https://api.gog.com/products/${game.storeId}?expand=screenshots`;
        const res = await fetch(gogUrl, { headers: commonHeaders });
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json.screenshots)) {
            json.screenshots.forEach((s: any, idx: number) => {
              if (s.formatter_template_url) {
                const full = s.formatter_template_url.replace('{formatter}', '1920');
                const thumb = s.formatter_template_url.replace('{formatter}', '800');
                screenshots.push({
                  id: idx,
                  thumbnail: thumb,
                  full,
                });
              }
            });
          }
        }
      } catch {}
    }

    // 4. Wikipedia / Wikimedia media fallback (Great for emulated/retro & console exclusives)
    if (screenshots.length === 0 && clean.length > 1) {
      try {
        const wikiSearchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(clean + ' video game')}&format=json&utf8=1`;
        const sRes = await fetch(wikiSearchUrl, { headers: commonHeaders });
        if (sRes.ok) {
          const sJson = await sRes.json();
          const pageTitle = sJson.query?.search?.[0]?.title;
          if (pageTitle) {
            const mUrl = `https://en.wikipedia.org/api/rest_v1/page/media-list/${encodeURIComponent(pageTitle)}`;
            const mRes = await fetch(mUrl, { headers: commonHeaders });
            if (mRes.ok) {
              const mJson = await mRes.json();
              const validCandidates = (mJson.items || []).filter((item: any) => {
                const t = (item.title || '').toLowerCase();
                return (
                  !t.endsWith('.svg') &&
                  !t.includes('icon') &&
                  !t.includes('flag') &&
                  !t.includes('welcome') &&
                  !t.includes('logo') &&
                  !t.includes('stub') &&
                  !t.includes('symbol') &&
                  !t.includes('portal')
                );
              }).slice(0, 8);

              if (validCandidates.length > 0) {
                const titles = validCandidates.map((c: any) => c.title);
                const infoUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(titles.join('|'))}&prop=imageinfo&iiprop=url|thumburl&iiurlwidth=800&format=json`;
                const infoRes = await fetch(infoUrl, { headers: commonHeaders });
                if (infoRes.ok) {
                  const infoJson = await infoRes.json();
                  let imgId = 100;
                  for (const page of Object.values(infoJson.query?.pages || {})) {
                    const p = page as any;
                    const info = p.imageinfo?.[0];
                    if (info && info.url) {
                      screenshots.push({
                        id: imgId++,
                        thumbnail: info.thumburl || info.url,
                        full: info.url,
                      });
                    }
                  }
                }
              }
            }
          }
        }
      } catch {}
    }

    // 5. If still empty, fall back to game bannerUrl if available and valid
    if (screenshots.length === 0 && game.bannerUrl && !game.bannerUrl.startsWith('data:image/svg')) {
      screenshots.push({
        id: 1,
        thumbnail: game.bannerUrl,
        full: game.bannerUrl,
      });
    }

    const result: GalleryResult = { screenshots };
    if (screenshots.length > 0) {
      this.cache.set(cacheKey.toLowerCase(), result);
      this.saveCache();
    }

    return result;
  }
}

export const gameGalleryService = new GameGalleryService();
