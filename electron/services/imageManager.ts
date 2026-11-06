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
    const covers: ArtworkOption[] = [];
    const banners: ArtworkOption[] = [];

    const cleanTitle = cleanGameTitle(title);
    if (!cleanTitle) return { covers, banners };

    try {
      // 1. Check Libretro authentic console boxarts (high priority for retro & console games)
      try {
        const libretroMatch = await lookupLibretroArtwork(cleanTitle, platformOrEmuId);
        if (libretroMatch && libretroMatch.coverUrl) {
          covers.unshift({
            url: libretroMatch.coverUrl,
            previewUrl: libretroMatch.coverUrl,
            type: 'cover',
            label: `${cleanTitle} - Official Console Box Art`,
            source: 'Libretro CDN',
          });
          banners.unshift({
            url: libretroMatch.bannerUrl,
            previewUrl: libretroMatch.bannerUrl,
            type: 'banner',
            label: `${cleanTitle} - Libretro Wallpaper`,
            source: 'Libretro CDN',
          });
        }
      } catch {}

      // 2. Check Wikipedia articles for official original retail box art
      try {
        const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
          cleanTitle + ' video game'
        )}&format=json&utf8=1`;
        const searchRes = await this.fetchJson(searchUrl, 3500);
        if (searchRes?.query?.search) {
          for (const item of searchRes.query.search.slice(0, 2)) {
            const sumUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(item.title)}`;
            const sumRes = await this.fetchJson(sumUrl, 3500);
            const img = sumRes?.originalimage?.source || sumRes?.thumbnail?.source;
            if (img) {
              covers.push({
                url: img,
                previewUrl: img,
                type: 'cover',
                label: `${sumRes.title || cleanTitle} - Wikipedia Box Art`,
                source: 'Wikipedia Official Article',
              });
              banners.push({
                url: img,
                previewUrl: img,
                type: 'banner',
                label: `${sumRes.title || cleanTitle} - Wikipedia Hero`,
                source: 'Wikipedia Official Article',
              });
            }
          }
        }
      } catch {}

      // 3. Search Steam Store API
      const searchUrl = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(
        cleanTitle
      )}&l=english&cc=US`;
      const res = await this.fetchJson(searchUrl, 4000);

      if (res && res.items && res.items.length > 0) {
        for (const item of res.items.slice(0, 4)) {
          const appId = item.id;
          const gameName = item.name;

          // Vertical box arts (2:3 aspect)
          covers.push({
            url: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`,
            previewUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`,
            type: 'cover',
            label: `${gameName} - Official Poster`,
            source: 'Steam Library CDN',
          });

          covers.push({
            url: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900_2x.jpg`,
            previewUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900_2x.jpg`,
            type: 'cover',
            label: `${gameName} - Ultra HD Box Art`,
            source: 'Steam High-Res CDN',
          });

          // Horizontal hero banners (16:9 aspect)
          banners.push({
            url: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_hero.jpg`,
            previewUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_hero.jpg`,
            type: 'banner',
            label: `${gameName} - Hero Artwork`,
            source: 'Steam Banner CDN',
          });

          banners.push({
            url: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`,
            previewUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`,
            type: 'banner',
            label: `${gameName} - Store Header`,
            source: 'Steam Store',
          });

          // Try fetching screenshots for wide page backgrounds
          try {
            const detailUrl = `https://store.steampowered.com/api/appdetails?appids=${appId}`;
            const details = await this.fetchJson(detailUrl, 3000);
            if (details && details[appId] && details[appId].data && details[appId].data.screenshots) {
              const screens = details[appId].data.screenshots;
              for (let i = 0; i < Math.min(3, screens.length); i++) {
                banners.push({
                  url: screens[i].path_full,
                  previewUrl: screens[i].path_thumbnail,
                  type: 'banner',
                  label: `${gameName} - Cinematic Wallpaper #${i + 1}`,
                  source: 'Steam HD Screenshot',
                });
              }
            }
          } catch {
            // Screenshots fetch skipped
          }
        }
      }

      // 4. Query GOG Catalog for additional official artwork
      try {
        const gogUrl = `https://catalog.gog.com/v1/catalog?query=${encodeURIComponent(cleanTitle)}`;
        const gogRes = await this.fetchJson(gogUrl, 3500);
        if (gogRes && gogRes.products && gogRes.products.length > 0) {
          for (const product of gogRes.products.slice(0, 3)) {
            if (product.coverVertical) {
              covers.push({
                url: product.coverVertical,
                previewUrl: product.coverVertical,
                type: 'cover',
                label: `${product.title} - GOG Poster`,
                source: 'GOG Official Store',
              });
            }
            if (product.coverHorizontal) {
              banners.push({
                url: product.coverHorizontal,
                previewUrl: product.coverHorizontal,
                type: 'banner',
                label: `${product.title} - GOG Landscape Banner`,
                source: 'GOG Official Store',
              });
            }
          }
        }
      } catch {
        // GOG query skipped
      }

      // 5. Query Internet Archive for Vintage PC, DOS, and Retro Software Box Art
      try {
        const archUrl = `https://archive.org/advancedsearch.php?q=title%3A(${encodeURIComponent(
          cleanTitle
        )})+AND+mediatype%3A(software)&fl[]=identifier,title,description&rows=4&output=json`;
        const archRes = await this.fetchJson(archUrl, 3500);
        if (archRes?.response?.docs && archRes.response.docs.length > 0) {
          for (const doc of archRes.response.docs) {
            const imgUrl = `https://archive.org/services/img/${doc.identifier}`;
            covers.push({
              url: imgUrl,
              previewUrl: imgUrl,
              type: 'cover',
              label: `${doc.title || cleanTitle} - Vintage Box Scan`,
              source: 'Internet Archive Classics',
            });
            banners.push({
              url: imgUrl,
              previewUrl: imgUrl,
              type: 'banner',
              label: `${doc.title || cleanTitle} - Archive Scan`,
              source: 'Internet Archive Classics',
            });
          }
        }
      } catch {
        // Archive query skipped
      }

      // 6. Query Web Game Database (MobyGames, SteamGridDB, LaunchBox, Fanart via DuckDuckGo)
      try {
        const ddgCovers = await this.fetchDuckDuckGoImages(`${cleanTitle} video game box art cover`, 'photo', 6);
        for (const item of ddgCovers) {
          covers.push({
            url: item.url,
            previewUrl: item.thumbnail || item.url,
            type: 'cover',
            label: `${item.title || cleanTitle} - Web Box Art`,
            source: 'Web Database (MobyGames / Fanart / SteamGrid)',
          });
        }

        const ddgBanners = await this.fetchDuckDuckGoImages(`${cleanTitle} video game wallpaper banner`, 'wallpaper', 4);
        for (const item of ddgBanners) {
          banners.push({
            url: item.url,
            previewUrl: item.thumbnail || item.url,
            type: 'banner',
            label: `${item.title || cleanTitle} - HD Wallpaper`,
            source: 'Web HD Wallpaper',
          });
        }
      } catch {
        // Web search skipped
      }
    } catch (err) {
      console.warn('Artwork search error:', err);
    }

    // Deduplicate covers and banners by URL
    const uniqueCovers = covers.filter((c, idx, arr) => arr.findIndex((x) => x.url === c.url) === idx);
    const uniqueBanners = banners.filter((b, idx, arr) => arr.findIndex((x) => x.url === b.url) === idx);

    return { covers: uniqueCovers, banners: uniqueBanners };
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
        signal: AbortSignal.timeout(3500),
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
        signal: AbortSignal.timeout(3500),
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
