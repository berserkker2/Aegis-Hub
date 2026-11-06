import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import https from 'https';
import http from 'http';
import { app } from 'electron';
import { cleanGameTitle, lookupLibretroArtwork } from './artworkService';

export interface ArtworkOption {
  url: string;
  type: 'cover' | 'banner';
  label: string;
  source: string;
  previewUrl: string;
}

export class ImageManager {
  private cacheDir: string;
  private coversDir: string;
  private bannersDir: string;
  private artworkCache = new Map<string, { covers: ArtworkOption[]; banners: ArtworkOption[]; timestamp: number }>();

  constructor() {
    const baseDir = app ? app.getPath('userData') : path.join(process.cwd(), '.launcher-data');
    this.cacheDir = path.join(baseDir, 'media-cache');
    this.coversDir = path.join(this.cacheDir, 'covers');
    this.bannersDir = path.join(this.cacheDir, 'banners');

    [this.cacheDir, this.coversDir, this.bannersDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Converts a local disk path into a safe, valid aegis-media:// URL for Electron Chromium
   */
  public toMediaUrl(localPath: string): string {
    if (!localPath) return '';
    if (localPath.startsWith('http://') || localPath.startsWith('https://') || localPath.startsWith('data:')) {
      return localPath;
    }
    const cleanPath = localPath.replace(/\\/g, '/');
    return `aegis-media:///${cleanPath}`;
  }

  /**
   * Downloads a remote web image and caches it locally on disk.
   * Returns a local aegis-media:// URL that loads instantly and offline.
   */
  public async cacheRemoteImage(url: string, type: 'cover' | 'banner', gameId: string): Promise<string> {
    if (!url || !url.startsWith('http')) {
      return url;
    }

    try {
      const hash = crypto.createHash('md5').update(`${gameId}-${url}`).digest('hex');
      const targetDir = type === 'cover' ? this.coversDir : this.bannersDir;
      const targetFile = path.join(targetDir, `${hash}.jpg`);

      if (fs.existsSync(targetFile)) {
        try {
          const stat = fs.statSync(targetFile);
          if (stat.size > 500) {
            return this.toMediaUrl(targetFile);
          }
        } catch {}
      }

      await this.downloadFile(url, targetFile);
      return this.toMediaUrl(targetFile);
    } catch (err) {
      console.warn(`Failed to cache image ${url}:`, err);
      return url; // fallback to web URL
    }
  }

  private async downloadFile(url: string, destPath: string): Promise<void> {
    const BROWSER_UA =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

    const res = await fetch(url, {
      headers: {
        'User-Agent': BROWSER_UA,
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        ...(url.includes('wikimedia.org') || url.includes('wikipedia.org')
          ? { Referer: 'https://en.wikipedia.org/' }
          : {}),
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      throw new Error(`Download failed with status ${res.status}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (buffer.length < 500) {
      throw new Error(`Downloaded file too small (${buffer.length} bytes)`);
    }

    const tempPath = `${destPath}.tmp.${Date.now()}`;
    await fs.promises.writeFile(tempPath, buffer);
    await fs.promises.rename(tempPath, destPath);
  }

  /**
   * Searches for multiple high-definition covers and hero banners for a given game title.
   * Gives users choices to pick their favorite thumbnail and background!
   */
  public async searchArtworkSuggestions(
    title: string,
    platformOrEmuId?: string
  ): Promise<{ covers: ArtworkOption[]; banners: ArtworkOption[] }> {
    const cleanTitle = cleanGameTitle(title);
    if (!cleanTitle) return { covers: [], banners: [] };

    // Check in-memory cache first (instant response)
    const cacheKey = `${cleanTitle.toLowerCase()}::${platformOrEmuId || ''}`;
    const cached = this.artworkCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 1000 * 60 * 15) {
      return { covers: [...cached.covers], banners: [...cached.banners] };
    }

    const covers: ArtworkOption[] = [];
    const banners: ArtworkOption[] = [];

    // Run all artwork providers concurrently in parallel
    const taskLibretro = async () => {
      try {
        const libretroMatch = await lookupLibretroArtwork(cleanTitle, platformOrEmuId);
        if (libretroMatch && libretroMatch.coverUrl) {
          return {
            cover: {
              url: libretroMatch.coverUrl,
              previewUrl: libretroMatch.coverUrl,
              type: 'cover' as const,
              label: `${cleanTitle} - Official Console Box Art`,
              source: 'Libretro CDN',
            },
            banner: {
              url: libretroMatch.bannerUrl,
              previewUrl: libretroMatch.bannerUrl,
              type: 'banner' as const,
              label: `${cleanTitle} - Libretro Wallpaper`,
              source: 'Libretro CDN',
            },
          };
        }
      } catch {}
      return null;
    };

    const taskWikipedia = async () => {
      const localCovers: ArtworkOption[] = [];
      const localBanners: ArtworkOption[] = [];
      try {
        const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
          cleanTitle + ' video game'
        )}&format=json&utf8=1`;
        const searchRes = await this.fetchJson(searchUrl, 2500);
        if (searchRes?.query?.search && Array.isArray(searchRes.query.search)) {
          const topItems = searchRes.query.search.slice(0, 2);
          const summaries = await Promise.allSettled(
            topItems.map((item: any) =>
              this.fetchJson(
                `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(item.title)}`,
                2500
              )
            )
          );
          for (const res of summaries) {
            if (res.status === 'fulfilled' && res.value) {
              const sumRes = res.value;
              const img = sumRes?.originalimage?.source || sumRes?.thumbnail?.source;
              if (img) {
                localCovers.push({
                  url: img,
                  previewUrl: img,
                  type: 'cover',
                  label: `${sumRes.title || cleanTitle} - Wikipedia Box Art`,
                  source: 'Wikipedia Official Article',
                });
                localBanners.push({
                  url: img,
                  previewUrl: img,
                  type: 'banner',
                  label: `${sumRes.title || cleanTitle} - Wikipedia Hero`,
                  source: 'Wikipedia Official Article',
                });
              }
            }
          }
        }
      } catch {}
      return { covers: localCovers, banners: localBanners };
    };

    const taskSteam = async () => {
      const localCovers: ArtworkOption[] = [];
      const localBanners: ArtworkOption[] = [];
      try {
        const searchUrl = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(
          cleanTitle
        )}&l=english&cc=US`;
        const res = await this.fetchJson(searchUrl, 2500);

        if (res && res.items && res.items.length > 0) {
          const items = res.items.slice(0, 4);
          for (const item of items) {
            const appId = item.id;
            const gameName = item.name;

            localCovers.push({
              url: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`,
              previewUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`,
              type: 'cover',
              label: `${gameName} - Official Poster`,
              source: 'Steam Library CDN',
            });

            localCovers.push({
              url: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900_2x.jpg`,
              previewUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900_2x.jpg`,
              type: 'cover',
              label: `${gameName} - Ultra HD Box Art`,
              source: 'Steam High-Res CDN',
            });

            localBanners.push({
              url: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_hero.jpg`,
              previewUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_hero.jpg`,
              type: 'banner',
              label: `${gameName} - Hero Artwork`,
              source: 'Steam Banner CDN',
            });

            localBanners.push({
              url: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`,
              previewUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`,
              type: 'banner',
              label: `${gameName} - Store Header`,
              source: 'Steam Store',
            });
          }

          // Fetch screenshots in parallel for the first 2 items with tight timeout
          const detailPromises = items.slice(0, 2).map(async (item: any) => {
            try {
              const detailUrl = `https://store.steampowered.com/api/appdetails?appids=${item.id}`;
              const details = await this.fetchJson(detailUrl, 2000);
              const appId = item.id;
              if (details && details[appId]?.data?.screenshots) {
                const screens = details[appId].data.screenshots;
                for (let i = 0; i < Math.min(3, screens.length); i++) {
                  localBanners.push({
                    url: screens[i].path_full,
                    previewUrl: screens[i].path_thumbnail,
                    type: 'banner',
                    label: `${item.name} - Cinematic Wallpaper #${i + 1}`,
                    source: 'Steam HD Screenshot',
                  });
                }
              }
            } catch {}
          });
          await Promise.allSettled(detailPromises);
        }
      } catch {}
      return { covers: localCovers, banners: localBanners };
    };

    const taskGOG = async () => {
      const localCovers: ArtworkOption[] = [];
      const localBanners: ArtworkOption[] = [];
      try {
        const gogUrl = `https://catalog.gog.com/v1/catalog?query=${encodeURIComponent(cleanTitle)}`;
        const gogRes = await this.fetchJson(gogUrl, 2500);
        if (gogRes && gogRes.products && gogRes.products.length > 0) {
          for (const product of gogRes.products.slice(0, 3)) {
            if (product.coverVertical) {
              localCovers.push({
                url: product.coverVertical,
                previewUrl: product.coverVertical,
                type: 'cover',
                label: `${product.title} - GOG Poster`,
                source: 'GOG Official Store',
              });
            }
            if (product.coverHorizontal) {
              localBanners.push({
                url: product.coverHorizontal,
                previewUrl: product.coverHorizontal,
                type: 'banner',
                label: `${product.title} - GOG Landscape Banner`,
                source: 'GOG Official Store',
              });
            }
          }
        }
      } catch {}
      return { covers: localCovers, banners: localBanners };
    };

    const taskArchive = async () => {
      const localCovers: ArtworkOption[] = [];
      const localBanners: ArtworkOption[] = [];
      try {
        const archUrl = `https://archive.org/advancedsearch.php?q=title%3A(${encodeURIComponent(
          cleanTitle
        )})+AND+mediatype%3A(software)&fl[]=identifier,title,description&rows=4&output=json`;
        const archRes = await this.fetchJson(archUrl, 2500);
        if (archRes?.response?.docs && archRes.response.docs.length > 0) {
          for (const doc of archRes.response.docs) {
            const imgUrl = `https://archive.org/services/img/${doc.identifier}`;
            localCovers.push({
              url: imgUrl,
              previewUrl: imgUrl,
              type: 'cover',
              label: `${doc.title || cleanTitle} - Vintage Box Scan`,
              source: 'Internet Archive Classics',
            });
            localBanners.push({
              url: imgUrl,
              previewUrl: imgUrl,
              type: 'banner',
              label: `${doc.title || cleanTitle} - Archive Scan`,
              source: 'Internet Archive Classics',
            });
          }
        }
      } catch {}
      return { covers: localCovers, banners: localBanners };
    };

    const taskDDG = async () => {
      const localCovers: ArtworkOption[] = [];
      const localBanners: ArtworkOption[] = [];
      try {
        const [ddgCoversRes, ddgBannersRes] = await Promise.allSettled([
          this.fetchDuckDuckGoImages(`${cleanTitle} video game box art cover`, 'photo', 6),
          this.fetchDuckDuckGoImages(`${cleanTitle} video game wallpaper banner`, 'wallpaper', 4),
        ]);

        if (ddgCoversRes.status === 'fulfilled') {
          for (const item of ddgCoversRes.value) {
            localCovers.push({
              url: item.url,
              previewUrl: item.thumbnail || item.url,
              type: 'cover',
              label: `${item.title || cleanTitle} - Web Box Art`,
              source: 'Web Database (MobyGames / Fanart / SteamGrid)',
            });
          }
        }

        if (ddgBannersRes.status === 'fulfilled') {
          for (const item of ddgBannersRes.value) {
            localBanners.push({
              url: item.url,
              previewUrl: item.thumbnail || item.url,
              type: 'banner',
              label: `${item.title || cleanTitle} - HD Wallpaper`,
              source: 'Web HD Wallpaper',
            });
          }
        }
      } catch {}
      return { covers: localCovers, banners: localBanners };
    };

    // Execute all providers in parallel
    const [libretroRes, steamRes, gogRes, wikiRes, archiveRes, ddgRes] = await Promise.allSettled([
      taskLibretro(),
      taskSteam(),
      taskGOG(),
      taskWikipedia(),
      taskArchive(),
      taskDDG(),
    ]);

    // Priority 1: Libretro (official console/retro boxart)
    if (libretroRes.status === 'fulfilled' && libretroRes.value) {
      if (libretroRes.value.cover) covers.push(libretroRes.value.cover);
      if (libretroRes.value.banner) banners.push(libretroRes.value.banner);
    }

    // Priority 2: Steam (high-res official assets)
    if (steamRes.status === 'fulfilled') {
      covers.push(...steamRes.value.covers);
      banners.push(...steamRes.value.banners);
    }

    // Priority 3: GOG official artwork
    if (gogRes.status === 'fulfilled') {
      covers.push(...gogRes.value.covers);
      banners.push(...gogRes.value.banners);
    }

    // Priority 4: Wikipedia retail box arts
    if (wikiRes.status === 'fulfilled') {
      covers.push(...wikiRes.value.covers);
      banners.push(...wikiRes.value.banners);
    }

    // Priority 5: Internet Archive retro & vintage software
    if (archiveRes.status === 'fulfilled') {
      covers.push(...archiveRes.value.covers);
      banners.push(...archiveRes.value.banners);
    }

    // Priority 6: Web search database
    if (ddgRes.status === 'fulfilled') {
      covers.push(...ddgRes.value.covers);
      banners.push(...ddgRes.value.banners);
    }

    // Deduplicate covers and banners by URL
    const uniqueCovers = covers.filter((c, idx, arr) => arr.findIndex((x) => x.url === c.url) === idx);
    const uniqueBanners = banners.filter((b, idx, arr) => arr.findIndex((x) => x.url === b.url) === idx);

    const result = { covers: uniqueCovers, banners: uniqueBanners };
    // Cache for 15 minutes
    this.artworkCache.set(cacheKey, { covers: uniqueCovers, banners: uniqueBanners, timestamp: Date.now() });

    return result;
  }

  private async fetchDuckDuckGoImages(
    query: string,
    filter: 'photo' | 'wallpaper' = 'photo',
    maxResults = 5
  ): Promise<{ url: string; thumbnail: string; title: string }[]> {
    const BROWSER_UA =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

    try {
      const tokenRes = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(query)}`, {
        headers: { 'User-Agent': BROWSER_UA },
        signal: AbortSignal.timeout(2500),
      });
      const html = await tokenRes.text();
      const vqdMatch = html.match(/vqd=([0-9-]+)/);
      if (!vqdMatch) return [];

      const vqd = vqdMatch[1];
      const filterParam = filter === 'wallpaper' ? '&f=,,,type:wallpaper' : '&f=,,,type:photo';
      const apiUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}${filterParam}`;

      const imgRes = await fetch(apiUrl, {
        headers: {
          'User-Agent': BROWSER_UA,
          'Referer': 'https://duckduckgo.com/',
        },
        signal: AbortSignal.timeout(2500),
      });

      if (!imgRes.ok) return [];
      const data = await imgRes.json();
      if (!data?.results || !Array.isArray(data.results)) return [];

      return data.results
        .filter((r: any) => r.image && typeof r.image === 'string' && r.image.startsWith('http'))
        .slice(0, maxResults)
        .map((r: any) => ({
          url: r.image,
          thumbnail: r.thumbnail || r.image,
          title: r.title || query,
        }));
    } catch {
      return [];
    }
  }

  private async fetchJson(url: string, timeoutMs = 5000): Promise<any> {
    const BROWSER_UA =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

    const res = await fetch(url, {
      headers: {
        'User-Agent': BROWSER_UA,
        'Accept': 'application/json, text/plain, */*',
      },
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) {
      throw new Error(`Status ${res.status}`);
    }
    return await res.json();
  }
}
