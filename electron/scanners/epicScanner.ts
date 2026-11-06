import fs from 'fs';
import path from 'path';
import { ScanResult } from '../../src/types/game';
import { lookupGameArtwork, generateDistinctArtwork } from '../services/artworkService';

export async function scanEpicGames(): Promise<ScanResult[]> {
  const results: ScanResult[] = [];
  const manifestsDir = 'C:\\ProgramData\\Epic\\EpicGamesLauncher\\Data\\Manifests';

  if (!fs.existsSync(manifestsDir)) {
    return results;
  }

  try {
    const files = fs.readdirSync(manifestsDir);
    for (const file of files) {
      if (!file.endsWith('.item')) continue;

      const filePath = path.join(manifestsDir, file);
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const manifest = JSON.parse(content);

        const title = manifest.DisplayName;
        const installLoc = manifest.InstallLocation;
        const launchExe = manifest.LaunchExecutable;
        const appName = manifest.AppName;
        const namespace = manifest.CatalogNamespace || '';
        const catalogItemId = manifest.CatalogItemId || '';

        if (title && installLoc) {
          const fullExePath = launchExe ? path.join(installLoc, launchExe) : installLoc;
          const art = (await lookupGameArtwork(title)) || generateDistinctArtwork(title);

          const launchUri = (namespace && catalogItemId)
            ? `com.epicgames.launcher://apps/${encodeURIComponent(namespace)}%3A${encodeURIComponent(catalogItemId)}%3A${encodeURIComponent(appName)}?action=launch&silent=true`
            : `com.epicgames.launcher://apps/${appName}?action=launch&silent=true`;

          results.push({
            title,
            executablePath: launchUri,
            platform: 'epic',
            installPath: installLoc,
            storeId: catalogItemId || appName,
            coverUrl: art.coverUrl,
            bannerUrl: art.bannerUrl,
            description: `Installed via Epic Games Launcher in ${installLoc}`,
            genres: art.genres || ['Action', 'Epic Games'],
            installed: true,
          });
        }
      } catch (err) {
        // Skip unreadable manifest
      }
    }
  } catch (err) {
    console.error('Error scanning Epic Games:', err);
  }

  return results;
}
