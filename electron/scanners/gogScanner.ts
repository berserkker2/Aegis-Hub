import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ScanResult } from '../../src/types/game';

const execAsync = promisify(exec);

export async function scanGogGames(): Promise<ScanResult[]> {
  const results: ScanResult[] = [];
  const foundTitles = new Set<string>();

  // 1. Try scanning common GOG folders
  const commonGogDirs = [
    'C:\\Program Files (x86)\\GOG Galaxy\\Games',
    'C:\\Program Files\\GOG Galaxy\\Games',
    'C:\\GOG Games',
    'D:\\GOG Games',
  ];

  for (const baseDir of commonGogDirs) {
    if (fs.existsSync(baseDir)) {
      try {
        const subdirs = fs.readdirSync(baseDir, { withFileTypes: true });
        for (const dirent of subdirs) {
          if (dirent.isDirectory()) {
            const gameDir = path.join(baseDir, dirent.name);
            const exeFiles = findMainExecutable(gameDir);
            if (exeFiles.length > 0 && !foundTitles.has(dirent.name)) {
              foundTitles.add(dirent.name);
              results.push({
                title: formatGameTitle(dirent.name),
                executablePath: exeFiles[0],
                platform: 'gog',
                installPath: gameDir,
                description: `Installed via GOG Galaxy in ${gameDir}`,
                genres: ['GOG Game'],
              });
            }
          }
        }
      } catch {
        // Ignore folder read error
      }
    }
  }

  // 2. Query Windows registry for GOG Games
  try {
    const regKeys = [
      'HKLM\\SOFTWARE\\GOG.com\\Games',
      'HKLM\\SOFTWARE\\WOW6432Node\\GOG.com\\Games',
    ];

    for (const key of regKeys) {
      try {
        const { stdout } = await execAsync(`reg query "${key}"`);
        const subKeyLines = stdout.split('\r\n').filter(l => l.trim().startsWith(key));

        for (const subKey of subKeyLines) {
          try {
            const { stdout: details } = await execAsync(`reg query "${subKey}"`);
            let gameName = '';
            let gamePath = '';
            let exeName = '';

            const lines = details.split('\r\n');
            for (const line of lines) {
              const match = line.trim().match(/^(\w+)\s+REG_\w+\s+(.*)$/);
              if (match) {
                const [, varName, varValue] = match;
                if (varName.toLowerCase() === 'gamename') gameName = varValue;
                if (varName.toLowerCase() === 'path') gamePath = varValue;
                if (varName.toLowerCase() === 'exe') exeName = varValue;
              }
            }

            if (gameName && (gamePath || exeName) && !foundTitles.has(gameName)) {
              foundTitles.add(gameName);
              const fullExe = exeName ? (path.isAbsolute(exeName) ? exeName : path.join(gamePath, exeName)) : gamePath;
              results.push({
                title: gameName,
                executablePath: fullExe,
                platform: 'gog',
                installPath: gamePath,
                description: `Installed via GOG in ${gamePath}`,
                genres: ['GOG Game'],
              });
            }
          } catch {
            // Skip subkey
          }
        }
      } catch {
        // Registry key not present
      }
    }
  } catch (err) {
    // Registry scan skipped
  }

  return results;
}

function findMainExecutable(dir: string): string[] {
  try {
    const files = fs.readdirSync(dir);
    const exes = files
      .filter(f => f.toLowerCase().endsWith('.exe'))
      .filter(f => !f.toLowerCase().includes('uninstall') && !f.toLowerCase().includes('crash') && !f.toLowerCase().includes('setup') && !f.toLowerCase().includes('update'))
      .map(f => path.join(dir, f));
    return exes;
  } catch {
    return [];
  }
}

function formatGameTitle(folderName: string): string {
  return folderName.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
