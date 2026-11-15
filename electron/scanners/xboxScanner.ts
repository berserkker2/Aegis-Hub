import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ScanResult } from '../../src/types/game';

const execAsync = promisify(exec);

export interface InstalledXboxApp {
  title: string;
  appUserModelId: string;
  packageFamilyName: string;
  installPath?: string;
  executablePath?: string;
  storeId?: string;
}

/**
 * Extracts an XML attribute or tag value from MicrosoftGame.config
 */
function extractXmlAttr(xml: string, tag: string, attr: string): string | undefined {
  const tagRegex = new RegExp(`<${tag}\\b[^>]*\\b${attr}=["']([^"']+)["']`, 'i');
  const match = xml.match(tagRegex);
  return match ? match[1].trim() : undefined;
}

function extractXmlTag(xml: string, tag: string): string | undefined {
  const tagRegex = new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`, 'i');
  const match = xml.match(tagRegex);
  return match ? match[1].trim() : undefined;
}

/**
 * Scans all Windows fixed drives for .GamingRoot / XboxGames folders containing MicrosoftGame.config
 */
export function findXboxGameConfigs(): Array<{
  title: string;
  identityName?: string;
  executableName?: string;
  storeId?: string;
  installPath: string;
  directExePath?: string;
}> {
  const results: Array<{
    title: string;
    identityName?: string;
    executableName?: string;
    storeId?: string;
    installPath: string;
    directExePath?: string;
  }> = [];

  if (process.platform !== 'win32') return results;

  const candidateRoots = new Set<string>();
  const letters = 'CDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  for (const letter of letters) {
    const driveRoot = `${letter}:\\`;
    try {
      if (!fs.existsSync(driveRoot)) continue;

      const defaultXboxDir = path.join(driveRoot, 'XboxGames');
      if (fs.existsSync(defaultXboxDir)) {
        candidateRoots.add(defaultXboxDir);
      }

      const gamingRootFile = path.join(driveRoot, '.GamingRoot');
      if (fs.existsSync(gamingRootFile)) {
        try {
          const buf = fs.readFileSync(gamingRootFile);
          // .GamingRoot starts with "RGBX" + 4-byte version/header followed by UTF-16LE relative path
          const rawText = buf.slice(8).toString('utf16le').replace(/\0/g, '').trim();
          if (rawText) {
            const resolved = path.join(driveRoot, rawText);
            if (fs.existsSync(resolved)) {
              candidateRoots.add(resolved);
            }
          }
        } catch {}
      }
    } catch {}
  }

  for (const rootDir of candidateRoots) {
    try {
      const entries = fs.readdirSync(rootDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const gameDir = path.join(rootDir, entry.name);
        const contentDir = path.join(gameDir, 'Content');
        const configCandidates = [
          path.join(contentDir, 'MicrosoftGame.config'),
          path.join(gameDir, 'MicrosoftGame.config'),
        ];

        for (const configPath of configCandidates) {
          if (!fs.existsSync(configPath)) continue;
          try {
            const xml = fs.readFileSync(configPath, 'utf-8');
            const displayName =
              extractXmlAttr(xml, 'ShellVisuals', 'DefaultDisplayName') || entry.name;
            const identityName = extractXmlAttr(xml, 'Identity', 'Name');
            const executableName = extractXmlAttr(xml, 'Executable', 'Name');
            const storeId = extractXmlTag(xml, 'StoreId');

            const baseDir = path.dirname(configPath);
            const directExePath =
              executableName && fs.existsSync(path.join(baseDir, executableName))
                ? path.join(baseDir, executableName)
                : undefined;

            results.push({
              title: displayName,
              identityName,
              executableName,
              storeId,
              installPath: gameDir,
              directExePath,
            });
            break;
          } catch {}
        }
      }
    } catch {}
  }

  return results;
}

/**
 * Queries Windows Start Apps to resolve shell:AppsFolder!<AppID> for UWP / Microsoft Store games
 */
async function getStartAppsMap(): Promise<Array<{ Name: string; AppID: string }>> {
  if (process.platform !== 'win32') return [];
  try {
    const { stdout } = await execAsync(
      'powershell -NoProfile -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-StartApps | Select-Object Name, AppID | ConvertTo-Json -Compress"',
      { timeout: 6000, maxBuffer: 4 * 1024 * 1024 }
    );
    const trimmed = (stdout || '').trim();
    if (!trimmed) return [];
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
}

/**
 * Scans installed Microsoft Store / Xbox PC App games on Windows without requiring login.
 */
export async function scanInstalledXboxApps(): Promise<InstalledXboxApp[]> {
  if (process.platform !== 'win32') return [];

  const [configs, startApps] = await Promise.all([
    Promise.resolve(findXboxGameConfigs()),
    getStartAppsMap(),
  ]);

  const installed: InstalledXboxApp[] = [];
  const seenTitles = new Set<string>();

  for (const cfg of configs) {
    const normTitle = cfg.title.toLowerCase().trim();
    const normId = (cfg.identityName || '').toLowerCase().trim();

    // Match StartApp entry by PackageFamilyName prefix or exact title
    const matchedApp = startApps.find((app) => {
      if (!app?.AppID || !app.AppID.includes('!')) return false;
      const appIdLower = app.AppID.toLowerCase();
      const appNameLower = (app.Name || '').toLowerCase().trim();
      if (normId && appIdLower.startsWith(normId + '_')) return true;
      return appNameLower === normTitle;
    });

    const appUserModelId = matchedApp?.AppID || '';
    const packageFamilyName = appUserModelId ? appUserModelId.split('!')[0] : '';

    installed.push({
      title: cfg.title,
      appUserModelId,
      packageFamilyName,
      installPath: cfg.installPath,
      executablePath: appUserModelId
        ? `shell:AppsFolder\\${appUserModelId}`
        : cfg.directExePath || '',
      storeId: cfg.storeId || packageFamilyName || cfg.identityName,
    });
    seenTitles.add(normTitle);
  }

  return installed;
}

export async function scanXboxGames(): Promise<ScanResult[]> {
  const apps = await scanInstalledXboxApps();
  return apps
    .filter((a) => Boolean(a.executablePath))
    .map((a) => ({
      title: a.title,
      executablePath: a.executablePath!,
      platform: 'xbox' as const,
      storeId: a.storeId,
      installPath: a.installPath,
      installed: true,
    }));
}
