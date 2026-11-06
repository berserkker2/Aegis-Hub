import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { Game } from '../../src/types/game';

export interface InstalledGameInfo {
  storeId: string;
  catalogItemId?: string;
  catalogNamespace?: string;
  appName?: string;
  title?: string;
  installDir: string;
  executablePath?: string;
  launchUri?: string;
  platform: 'steam' | 'epic' | 'gog';
}

export class GameInstallationService {
  private lastScanTime = 0;
  private cachedSteam = new Map<string, InstalledGameInfo>();
  private cachedEpic = new Map<string, InstalledGameInfo>();
  private cachedGog = new Map<string, InstalledGameInfo>();

  /**
   * Refreshes the local installed games cache if older than 10 seconds (or forced)
   */
  public refreshCache(force = false): void {
    const now = Date.now();
    if (!force && now - this.lastScanTime < 10000) {
      return;
    }

    this.cachedSteam = this.scanInstalledSteam();
    this.cachedEpic = this.scanInstalledEpic();
    this.cachedGog = this.scanInstalledGog();
    this.lastScanTime = now;
  }

  /**
   * Finds all Steam library directories on Windows
   */
  public getSteamLibraryPaths(): string[] {
    let steamPath = 'C:\\Program Files (x86)\\Steam';
    try {
      const out = execSync('reg query "HKCU\\Software\\Valve\\Steam" /v SteamPath').toString();
      const match = out.match(/SteamPath\s+REG_SZ\s+(.*)/i);
      if (match && match[1]) {
        steamPath = match[1].trim().replace(/\//g, '\\');
      }
    } catch {
      // Fallback
    }

    if (!fs.existsSync(steamPath)) {
      const defaults = [
        'C:\\Program Files (x86)\\Steam',
        'C:\\Program Files\\Steam',
        'D:\\Steam',
        'E:\\Steam',
        'G:\\Steam',
      ];
      for (const d of defaults) {
        if (fs.existsSync(d)) {
          steamPath = d;
          break;
        }
      }
    }

    const libs = [steamPath];
    const libVdf = path.join(steamPath, 'steamapps', 'libraryfolders.vdf');
    if (fs.existsSync(libVdf)) {
      try {
        const content = fs.readFileSync(libVdf, 'utf-8');
        const pathMatches = content.matchAll(/"path"\s+"([^"]+)"/g);
        for (const m of pathMatches) {
          const cleanPath = m[1].replace(/\\\\/g, '\\');
          if (fs.existsSync(cleanPath) && !libs.some(l => l.toLowerCase() === cleanPath.toLowerCase())) {
            libs.push(cleanPath);
          }
        }
      } catch (err) {
        console.error('Error parsing Steam libraryfolders.vdf:', err);
      }
    }

    return libs;
  }

  /**
   * Scans all installed Steam apps across all Steam libraries
   */
  public scanInstalledSteam(): Map<string, InstalledGameInfo> {
    const installed = new Map<string, InstalledGameInfo>();
    const libs = this.getSteamLibraryPaths();

    for (const lib of libs) {
      const steamapps = path.join(lib, 'steamapps');
      if (!fs.existsSync(steamapps)) continue;

      try {
        const files = fs.readdirSync(steamapps);
        for (const f of files) {
          const m = f.match(/^appmanifest_(\d+)\.acf$/i);
          if (!m) continue;

          const appId = m[1];
          // Skip Steamworks redistributables, proton runtimes
          if (['228980', '1007', '1070560', '1391110', '1493710'].includes(appId)) continue;

          const manifestPath = path.join(steamapps, f);
          try {
            const content = fs.readFileSync(manifestPath, 'utf-8');
            const nameMatch = content.match(/"name"\s+"([^"]+)"/i);
            const dirMatch = content.match(/"installdir"\s+"([^"]+)"/i);
            const installDir = dirMatch ? path.join(steamapps, 'common', dirMatch[1]) : '';

            installed.set(appId, {
              storeId: appId,
              title: nameMatch ? nameMatch[1] : undefined,
              installDir,
              executablePath: `steam://rungameid/${appId}`,
              platform: 'steam',
            });
          } catch {
            // Skip unreadable manifest
          }
        }
      } catch {
        // Skip inaccessible steamapps dir
      }
    }

    return installed;
  }

  /**
   * Scans installed Epic Games via local manifests (.item)
   */
  public scanInstalledEpic(): Map<string, InstalledGameInfo> {
    const installed = new Map<string, InstalledGameInfo>();
    const manifestsDir = 'C:\\ProgramData\\Epic\\EpicGamesLauncher\\Data\\Manifests';
    if (!fs.existsSync(manifestsDir)) return installed;

    try {
      const files = fs.readdirSync(manifestsDir);
      for (const file of files) {
        if (!file.endsWith('.item')) continue;

        try {
          const raw = fs.readFileSync(path.join(manifestsDir, file), 'utf-8');
          const manifest = JSON.parse(raw);
          if (manifest.AppName && manifest.InstallLocation && fs.existsSync(manifest.InstallLocation)) {
            const launchExe = manifest.LaunchExecutable
              ? path.join(manifest.InstallLocation, manifest.LaunchExecutable)
              : undefined;

            // Generate proper modern 3-part protocol URI: com.epicgames.launcher://apps/{Namespace}%3A{CatalogItemId}%3A{AppName}?action=launch&silent=true
            const namespace = manifest.CatalogNamespace || '';
            const catalogItemId = manifest.CatalogItemId || '';
            const appName = manifest.AppName;
            const launchUri = (namespace && catalogItemId)
              ? `com.epicgames.launcher://apps/${encodeURIComponent(namespace)}%3A${encodeURIComponent(catalogItemId)}%3A${encodeURIComponent(appName)}?action=launch&silent=true`
              : `com.epicgames.launcher://apps/${appName}?action=launch&silent=true`;

            const info: InstalledGameInfo = {
              storeId: manifest.AppName,
              catalogItemId,
              catalogNamespace: namespace,
              appName,
              title: manifest.DisplayName,
              installDir: manifest.InstallLocation,
              executablePath: launchExe && fs.existsSync(launchExe) ? launchExe : undefined,
              launchUri,
              platform: 'epic',
            };

            // Index by AppName (e.g. 923130ebb546417b9d3115507f752d34, Flounder)
            installed.set(appName.toLowerCase(), info);

            // Index by CatalogItemId (e.g. bd12aa292a6b401286908fe1fa312f83, 8b349f0ac14b4adcada58adea62bddf7)
            if (catalogItemId) {
              installed.set(catalogItemId.toLowerCase(), info);
            }

            // Index by DisplayName (e.g. "darkwood", "3 out of 10, ep 1: \"welcome to shovelworks\"")
            if (manifest.DisplayName) {
              installed.set(manifest.DisplayName.toLowerCase().trim(), info);
            }
          }
        } catch {
          // Skip corrupt item
        }
      }
    } catch {
      // Ignore
    }

    return installed;
  }

  /**
   * Scans installed GOG Galaxy games via Windows Registry and folders
   */
  public scanInstalledGog(): Map<string, InstalledGameInfo> {
    const installed = new Map<string, InstalledGameInfo>();
    const regKeys = [
      'HKLM\\SOFTWARE\\WOW6432Node\\GOG.com\\Games',
      'HKLM\\SOFTWARE\\GOG.com\\Games',
    ];

    for (const regKey of regKeys) {
      try {
        const out = execSync(`reg query "${regKey}" 2>nul`).toString();
        const lines = out.split('\r\n').map(l => l.trim()).filter(Boolean);
        for (const line of lines) {
          if (line.startsWith('HKEY_')) {
            try {
              const subOut = execSync(`reg query "${line}" 2>nul`).toString();
              const idMatch = subOut.match(/gameID\s+REG_SZ\s+(.*)/i);
              const pathMatch = subOut.match(/path\s+REG_SZ\s+(.*)/i);
              const nameMatch = subOut.match(/gameName\s+REG_SZ\s+(.*)/i);
              const exeMatch = subOut.match(/exe\s+REG_SZ\s+(.*)/i);

              const gameId = idMatch ? idMatch[1].trim() : line.split('\\').pop() || '';
              const installPath = pathMatch ? pathMatch[1].trim() : '';
              if (gameId && installPath && fs.existsSync(installPath)) {
                const exePath = exeMatch ? path.join(installPath, exeMatch[1].trim()) : undefined;
                installed.set(gameId, {
                  storeId: gameId,
                  title: nameMatch ? nameMatch[1].trim() : undefined,
                  installDir: installPath,
                  executablePath: exePath && fs.existsSync(exePath) ? exePath : undefined,
                  platform: 'gog',
                });
              }
            } catch {
              // Skip
            }
          }
        }
      } catch {
        // Registry key not found
      }
    }

    return installed;
  }

  /**
   * Helper to extract a Steam AppID from game metadata
   */
  public extractSteamAppId(game: Game): string | null {
    if (game.storeId && /^\d+$/.test(game.storeId)) return game.storeId;
    if (game.executablePath) {
      const m = game.executablePath.match(/steam:\/\/rungameid\/(\d+)/i);
      if (m) return m[1];
    }
    if (game.installUrl) {
      const m = game.installUrl.match(/steam:\/\/install\/(\d+)/i);
      if (m) return m[1];
    }
    if (game.id.startsWith('steam-')) {
      const m = game.id.match(/steam-(?:cloud-)?(\d+)/i);
      if (m) return m[1];
    }
    return null;
  }

  /**
   * Checks whether a specific game is actually installed on this PC
   */
  public isGameInstalled(game: Game): boolean {
    this.refreshCache();

    if (game.platform === 'steam') {
      const appId = this.extractSteamAppId(game);
      if (appId && this.cachedSteam.has(appId)) return true;
      if (game.installPath && fs.existsSync(game.installPath)) return true;
      return false;
    }

    if (game.platform === 'epic') {
      if (game.storeId && this.cachedEpic.has(game.storeId.toLowerCase())) return true;
      if (game.title && this.cachedEpic.has(game.title.toLowerCase().trim())) return true;
      if (game.installPath && fs.existsSync(game.installPath)) return true;
      return false;
    }

    if (game.platform === 'gog') {
      if (game.storeId && this.cachedGog.has(game.storeId)) return true;
      if (game.installPath && fs.existsSync(game.installPath)) return true;
      return false;
    }

    // Local / Emulator / Manual
    if (game.executablePath && fs.existsSync(game.executablePath)) return true;
    if (game.installPath && fs.existsSync(game.installPath)) return true;

    return game.installed !== false;
  }

  /**
   * Synchronizes the `installed` boolean of all games in the library based on disk reality.
   * Modifies the games array in place and returns { updatedCount, installedCount }.
   */
  public syncInstallationStatus(games: Game[], force = false): { updatedCount: number; installedCount: number } {
    this.refreshCache(force);
    let updatedCount = 0;
    let installedCount = 0;

    for (const game of games) {
      const wasInstalled = game.installed !== false;
      let isInstalled = wasInstalled;

      if (game.platform === 'steam') {
        const appId = this.extractSteamAppId(game);
        if (appId && this.cachedSteam.has(appId)) {
          const info = this.cachedSteam.get(appId)!;
          isInstalled = true;
          if (info.installDir && (!game.installPath || !fs.existsSync(game.installPath))) {
            game.installPath = info.installDir;
          }
          if (!game.executablePath || !game.executablePath.includes('://')) {
            game.executablePath = `steam://rungameid/${appId}`;
          }
        } else {
          // No appmanifest found on disk for this Steam AppID
          isInstalled = false;
        }
      } else if (game.platform === 'epic') {
        const epicKey = (game.storeId ? game.storeId.toLowerCase() : '') || (game.title ? game.title.toLowerCase().trim() : '');
        const info = this.cachedEpic.get(epicKey) || (game.title ? this.cachedEpic.get(game.title.toLowerCase().trim()) : undefined);

        if (info) {
          isInstalled = true;
          if (info.installDir && (!game.installPath || !fs.existsSync(game.installPath))) {
            game.installPath = info.installDir;
          }
          if (info.launchUri) {
            game.executablePath = info.launchUri;
          } else if (info.executablePath && (!game.executablePath || !fs.existsSync(game.executablePath))) {
            game.executablePath = info.executablePath;
          }
        } else if (game.installPath && fs.existsSync(game.installPath)) {
          isInstalled = true;
        } else {
          isInstalled = false;
        }
      } else if (game.platform === 'gog') {
        if (game.storeId && this.cachedGog.has(game.storeId)) {
          const info = this.cachedGog.get(game.storeId)!;
          isInstalled = true;
          if (info.installDir && (!game.installPath || !fs.existsSync(game.installPath))) {
            game.installPath = info.installDir;
          }
          if (info.executablePath && (!game.executablePath || !fs.existsSync(game.executablePath))) {
            game.executablePath = info.executablePath;
          }
        } else if (game.installPath && fs.existsSync(game.installPath)) {
          isInstalled = true;
        } else {
          isInstalled = false;
        }
      }

      if (isInstalled !== wasInstalled) {
        game.installed = isInstalled;
        if (game.tags) {
          if (isInstalled) {
            game.tags = game.tags.filter(t => t.toLowerCase() !== 'uninstalled');
          } else {
            if (!game.tags.includes('Uninstalled')) {
              game.tags.push('Uninstalled');
            }
          }
        }
        updatedCount++;
      }

      if (game.installed) {
        installedCount++;
      }
    }

    return { updatedCount, installedCount };
  }
}

export const gameInstallationService = new GameInstallationService();
