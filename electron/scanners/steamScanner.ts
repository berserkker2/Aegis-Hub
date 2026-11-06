import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ScanResult } from '../../src/types/game';
import { steamPlaytimeService } from '../services/steamPlaytimeService';
import { steamRatingService } from '../services/steamRatingService';

const execAsync = promisify(exec);

export async function scanSteamGames(): Promise<ScanResult[]> {
  const results: ScanResult[] = [];
  let steamPath: string | null = null;

  // 1. Find Steam Path from Registry
  try {
    const { stdout } = await execAsync('reg query "HKCU\\Software\\Valve\\Steam" /v SteamPath');
    const match = stdout.match(/SteamPath\s+REG_SZ\s+(.*)/i);
    if (match && match[1]) {
      steamPath = match[1].trim();
    }
  } catch {
    // Registry query failed, try standard fallback
  }

  if (!steamPath || !fs.existsSync(steamPath)) {
    const defaultPaths = [
      'C:\\Program Files (x86)\\Steam',
      'C:\\Program Files\\Steam',
      'D:\\Steam',
      'E:\\Steam',
    ];
    for (const p of defaultPaths) {
      if (fs.existsSync(p)) {
        steamPath = p;
        break;
      }
    }
  }

  if (!steamPath || !fs.existsSync(steamPath)) {
    return results;
  }

  // 2. Collect all Steam library paths from libraryfolders.vdf
  const libraryPaths: string[] = [steamPath];
  const libraryFoldersVdf = path.join(steamPath, 'steamapps', 'libraryfolders.vdf');

  if (fs.existsSync(libraryFoldersVdf)) {
    try {
      const content = fs.readFileSync(libraryFoldersVdf, 'utf-8');
      const pathMatches = content.matchAll(/"path"\s+"([^"]+)"/g);
      for (const m of pathMatches) {
        const cleanPath = m[1].replace(/\\\\/g, '\\');
        if (fs.existsSync(cleanPath) && !libraryPaths.includes(cleanPath)) {
          libraryPaths.push(cleanPath);
        }
      }
    } catch (err) {
      console.error('Error reading libraryfolders.vdf:', err);
    }
  }

  // 3. Scan each library for appmanifest_*.acf
  for (const libPath of libraryPaths) {
    const steamappsDir = path.join(libPath, 'steamapps');
    if (!fs.existsSync(steamappsDir)) continue;

    try {
      const files = fs.readdirSync(steamappsDir);
      for (const file of files) {
        if (!file.startsWith('appmanifest_') || !file.endsWith('.acf')) continue;

        const manifestPath = path.join(steamappsDir, file);
        try {
          const content = fs.readFileSync(manifestPath, 'utf-8');
          const appIdMatch = content.match(/"appid"\s+"(\d+)"/i);
          const nameMatch = content.match(/"name"\s+"([^"]+)"/i);
          const installDirMatch = content.match(/"installdir"\s+"([^"]+)"/i);

          if (appIdMatch && nameMatch) {
            const appId = appIdMatch[1];
            const name = nameMatch[1];

            // Filter out Steamworks Common Redistributables, proton, etc.
            if (
              name.includes('Steamworks Common') ||
              name.includes('Proton') ||
              name.includes('Steam Linux') ||
              name.includes('SteamVR')
            ) {
              continue;
            }

            const installFolder = installDirMatch
              ? path.join(steamappsDir, 'common', installDirMatch[1])
              : undefined;

            // Check if local cache has high-res artwork on disk
            const cdnCover = `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`;
            const cdnHero = `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_hero.jpg`;

            const localCoverPath = path.join(steamPath, 'appcache', 'librarycache', appId, 'library_600x900.jpg');
            const localHeroPath = path.join(steamPath, 'appcache', 'librarycache', appId, 'library_hero.jpg');

            const coverUrl = fs.existsSync(localCoverPath)
              ? `aegis-media:///${localCoverPath.replace(/\\/g, '/')}`
              : cdnCover;
            const bannerUrl = fs.existsSync(localHeroPath)
              ? `aegis-media:///${localHeroPath.replace(/\\/g, '/')}`
              : cdnHero;

            const statsMap = steamPlaytimeService.getLocalPlaytimes();
            const stat = statsMap.get(appId);
            const cachedRating = steamRatingService.getCachedRating(appId);

            results.push({
              title: name,
              executablePath: `steam://rungameid/${appId}`,
              platform: 'steam',
              storeId: appId,
              installPath: installFolder,
              coverUrl,
              bannerUrl,
              description: `Steam Game (AppID: ${appId}). Launches seamlessly without requiring browser login.`,
              genres: ['Steam Library'],
              installed: true,
              playtimeMinutes: stat?.minutes || 0,
              lastPlayed: stat?.lastPlayed,
              rating: cachedRating,
            });
          }
        } catch {
          // Skip corrupt acf
        }
      }
    } catch (err) {
      console.error(`Error scanning ${steamappsDir}:`, err);
    }
  }

  return results;
}
