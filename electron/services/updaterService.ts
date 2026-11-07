import { app, shell } from 'electron';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { APP_VERSION_INFO } from '../../src/version';

export interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseName?: string;
  releaseNotes?: string;
  publishedAt?: string;
  downloadUrl?: string;
  fileName?: string;
  fileSize?: number;
}

export interface UpdateDownloadProgress {
  percent: number;
  transferred: number;
  total: number;
}

class UpdaterService {
  private owner = 'berserkker2';
  private repo = 'Aegis-Hub';
  private downloadedFilePath: string | null = null;
  private isDownloading = false;

  /**
   * Cleans version string (e.g. 'v1.0.0-b06112026' -> 'b06112026' or 'v1.0.1' -> '1.0.1')
   */
  private cleanVersion(v: string): string {
    return (v || '')
      .trim()
      .replace(/^v/i, '')
      .replace(/^1\.0\.0-/i, '');
  }

  /**
   * Compares two versions: returns 1 if vA > vB, -1 if vA < vB, 0 if equal
   */
  public compareVersions(vA: string, vB: string): number {
    const cleanA = this.cleanVersion(vA);
    const cleanB = this.cleanVersion(vB);

    if (cleanA === cleanB) return 0;

    // Support standard semver x.y.z
    const partsA = cleanA.split('.').map((p) => parseInt(p, 10));
    const partsB = cleanB.split('.').map((p) => parseInt(p, 10));

    const isSemverA = partsA.length > 1 && partsA.every((n) => !isNaN(n));
    const isSemverB = partsB.length > 1 && partsB.every((n) => !isNaN(n));

    if (isSemverA && isSemverB) {
      const maxLen = Math.max(partsA.length, partsB.length);
      for (let i = 0; i < maxLen; i++) {
        const valA = partsA[i] || 0;
        const valB = partsB[i] || 0;
        if (valA > valB) return 1;
        if (valA < valB) return -1;
      }
      return 0;
    }

    // Support build-date style versions like b06112026 or b06112026-1 (DDMMYYYY[-REV])
    const dateMatchA = cleanA.match(/^b?(\d{2})(\d{2})(\d{4})(?:[-.]?(\d+))?$/i);
    const dateMatchB = cleanB.match(/^b?(\d{2})(\d{2})(\d{4})(?:[-.]?(\d+))?$/i);
    if (dateMatchA && dateMatchB) {
      const numA = parseInt(`${dateMatchA[3]}${dateMatchA[2]}${dateMatchA[1]}`, 10);
      const numB = parseInt(`${dateMatchB[3]}${dateMatchB[2]}${dateMatchB[1]}`, 10);
      if (numA > numB) return 1;
      if (numA < numB) return -1;

      const revA = parseInt(dateMatchA[4] || '0', 10);
      const revB = parseInt(dateMatchB[4] || '0', 10);
      if (revA > revB) return 1;
      if (revA < revB) return -1;
      return 0;
    }

    return cleanA.localeCompare(cleanB);
  }

  /**
   * Checks GitHub Releases API for the latest published release with installer assets
   */
  public async checkForUpdates(): Promise<UpdateInfo> {
    const currentVer = APP_VERSION_INFO.version || app.getVersion();
    const headers = {
      'User-Agent': 'AegisHub-Updater/1.0',
      Accept: 'application/vnd.github.v3+json',
    };

    try {
      // 1. Fetch recent releases to find the latest valid release with installer binary
      let release: any = null;
      try {
        const listRes = await fetch(`https://api.github.com/repos/${this.owner}/${this.repo}/releases?per_page=10`, {
          headers,
          signal: AbortSignal.timeout(10000),
        });
        if (listRes.ok) {
          const releases: any[] = await listRes.json();
          if (Array.isArray(releases) && releases.length > 0) {
            // Find all releases that have an executable asset (.exe)
            const withExe = releases.filter((r) => {
              if (r.draft) return false;
              const assets = Array.isArray(r.assets) ? r.assets : [];
              return assets.some((a: any) => (a.name || '').toLowerCase().endsWith('.exe'));
            });

            // Sort by version descending using compareVersions
            withExe.sort((a, b) => this.compareVersions(b.tag_name || b.name, a.tag_name || a.name));
            if (withExe.length > 0) {
              release = withExe[0];
            }
          }
        }
      } catch {}

      // 2. Fallback to /releases/latest if list failed
      if (!release) {
        const res = await fetch(`https://api.github.com/repos/${this.owner}/${this.repo}/releases/latest`, {
          headers,
          signal: AbortSignal.timeout(10000),
        });

        if (res.status === 404) {
          return {
            hasUpdate: false,
            currentVersion: currentVer,
            latestVersion: currentVer,
            releaseNotes: 'No releases published yet on GitHub repository.',
          };
        }

        if (!res.ok) {
          throw new Error(`GitHub API responded with HTTP ${res.status}`);
        }

        release = await res.json();
      }

      const latestTag = release.tag_name || release.name || '';
      const hasUpdate = this.compareVersions(latestTag, currentVer) > 0;

      // Find Windows installer asset (.exe)
      const assets = Array.isArray(release.assets) ? release.assets : [];
      const exeAsset =
        assets.find((a: any) => {
          const name = (a.name || '').toLowerCase();
          return name.endsWith('.exe') && (name.includes('setup') || name.includes('installer') || !name.includes('portable'));
        }) ||
        assets.find((a: any) => (a.name || '').toLowerCase().endsWith('.exe'));

      return {
        hasUpdate,
        currentVersion: currentVer,
        latestVersion: this.cleanVersion(latestTag),
        releaseName: release.name || latestTag,
        releaseNotes: release.body || '',
        publishedAt: release.published_at,
        downloadUrl: exeAsset?.browser_download_url,
        fileName: exeAsset?.name,
        fileSize: exeAsset?.size,
      };
    } catch (err: any) {
      console.warn('[Updater] Check failed:', err?.message || err);
      return {
        hasUpdate: false,
        currentVersion: currentVer,
        latestVersion: currentVer,
        releaseNotes: `Could not check for updates (${err?.message || 'Network error'})`,
      };
    }
  }

  /**
   * Downloads the update .exe to the Windows Temp folder with progress reporting
   */
  public async downloadUpdate(
    downloadUrl: string,
    fileName: string,
    onProgress?: (progress: UpdateDownloadProgress) => void
  ): Promise<{ success: boolean; filePath?: string; error?: string }> {
    if (this.isDownloading) {
      return { success: false, error: 'A download is already in progress.' };
    }

    try {
      this.isDownloading = true;
      const tempDir = app.getPath('temp');
      let targetFilePath = path.join(tempDir, fileName || `AegisHub-Update-${Date.now()}.exe`);
      if (fs.existsSync(targetFilePath)) {
        try {
          fs.unlinkSync(targetFilePath);
        } catch {
          targetFilePath = path.join(tempDir, `AegisHub-Update-${Date.now()}.exe`);
        }
      }

      const res = await fetch(downloadUrl, {
        headers: { 'User-Agent': 'AegisHub-Updater/1.0' },
      });

      if (!res.ok) {
        throw new Error(`Download HTTP error ${res.status}`);
      }

      const contentLength = res.headers.get('content-length');
      const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

      const fileStream = fs.createWriteStream(targetFilePath);
      let transferredBytes = 0;

      const body = res.body;
      if (!body) {
        throw new Error('Response body is null');
      }

      // Read stream
      const reader = (body as any).getReader ? (body as any).getReader() : null;
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            fileStream.write(Buffer.from(value));
            transferredBytes += value.length;
            if (totalBytes > 0 && onProgress) {
              const percent = Math.min(100, Math.round((transferredBytes / totalBytes) * 100));
              onProgress({ percent, transferred: transferredBytes, total: totalBytes });
            }
          }
        }
      } else {
        // Fallback for node stream
        const buffer = Buffer.from(await res.arrayBuffer());
        fileStream.write(buffer);
        transferredBytes = buffer.length;
        if (onProgress) {
          onProgress({ percent: 100, transferred: transferredBytes, total: transferredBytes });
        }
      }

      await new Promise<void>((resolve, reject) => {
        fileStream.end(() => resolve());
        fileStream.on('error', reject);
      });

      this.downloadedFilePath = targetFilePath;
      return { success: true, filePath: targetFilePath };
    } catch (err: any) {
      console.error('[Updater] Download error:', err);
      return { success: false, error: err?.message || 'Failed to download update' };
    } finally {
      this.isDownloading = false;
    }
  }

  /**
   * Quits the app and runs the downloaded installer
   */
  public installAndRestart(installerPath?: string): { success: boolean; error?: string } {
    const target = installerPath || this.downloadedFilePath;
    if (!target || !fs.existsSync(target)) {
      return { success: false, error: 'Installer file not found on disk.' };
    }

    try {
      console.log('[Updater] Spawning installer and quitting app:', target);
      // Launch installer detached without shell:true so Windows CreateProcess handles paths with spaces cleanly
      const child = spawn(target, [], {
        detached: true,
        stdio: 'ignore',
        windowsHide: false,
      });
      child.on('error', (err) => {
        console.error('[Updater] Spawn error, falling back to shell.openPath:', err);
        shell.openPath(target).catch(console.error);
      });
      child.unref();

      // Exit launcher cleanly so the installer can overwrite the app files
      setTimeout(() => {
        app.quit();
        setTimeout(() => {
          app.exit(0);
        }, 400);
      }, 400);

      return { success: true };
    } catch (err: any) {
      console.error('[Updater] Install launch error:', err);
      return { success: false, error: err?.message || 'Failed to launch installer' };
    }
  }
}

export const updaterService = new UpdaterService();
