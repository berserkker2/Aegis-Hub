import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import https from 'https';
import http from 'http';
import { app } from 'electron';

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
   * Converts a local disk path into a safe, valid nexus-media:// URL for Electron Chromium
   */
  public toMediaUrl(localPath: string): string {
    if (!localPath) return '';
    if (localPath.startsWith('http://') || localPath.startsWith('https://') || localPath.startsWith('data:')) {
      return localPath;
    }
    const cleanPath = localPath.replace(/\\/g, '/');
    return `nexus-media:///${cleanPath}`;
  }

  /**
   * Downloads a remote web image and caches it locally on disk.
   * Returns a local nexus-media:// URL that loads instantly and offline.
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
        return this.toMediaUrl(targetFile);
      }

      await this.downloadFile(url, targetFile);
      return this.toMediaUrl(targetFile);
    } catch (err) {
      console.warn(`Failed to cache image ${url}:`, err);
      return url; // fallback to web URL
    }
  }

  private downloadFile(url: string, destPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      const file = fs.createWriteStream(destPath);

      const req = client.get(url, { headers: { 'User-Agent': 'NexusLauncher/1.0' } }, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close();
          fs.unlink(destPath, () => {});
          return resolve(this.downloadFile(res.headers.location, destPath));
        }

        if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
          file.close();
          fs.unlink(destPath, () => {});
          return reject(new Error(`Download failed with status ${res.statusCode}`));
        }

        res.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      });

      req.on('error', (err) => {
        file.close();
        fs.unlink(destPath, () => {});
        reject(err);
      });

      req.setTimeout(8000, () => {
        req.destroy();
        file.close();
        fs.unlink(destPath, () => {});
        reject(new Error('Download timeout'));
      });
    });
  }

  /**
   * Searches for multiple high-definition covers and hero banners for a given game title.
   * Gives users choices to pick their favorite thumbnail and background!
   */
  public async searchArtworkSuggestions(
    title: string
  ): Promise<{ covers: ArtworkOption[]; banners: ArtworkOption[] }> {
    const covers: ArtworkOption[] = [];
    const banners: ArtworkOption[] = [];

    const cleanTitle = title
      .replace(/[™®:]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    try {
      // 1. Search Steam Store API
      const searchUrl = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(
        cleanTitle
      )}&l=english&cc=US`;
      const res = await this.fetchJson(searchUrl, 4000);

      if (res && res.items && res.items.length > 0) {
        for (const item of res.items.slice(0, 3)) {
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
    } catch (err) {
      console.warn('Artwork search error:', err);
    }

    return { covers, banners };
  }

  private fetchJson(url: string, timeoutMs = 4000): Promise<any> {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      const req = client.get(url, { headers: { 'User-Agent': 'NexusLauncher/1.0' } }, (res) => {
        if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
          res.resume();
          return reject(new Error(`Status ${res.statusCode}`));
        }
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      });
      req.on('error', reject);
      req.setTimeout(timeoutMs, () => {
        req.destroy();
        reject(new Error('Timeout'));
      });
    });
  }
}
