import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ScanResult } from '../../src/types/game';

const execAsync = promisify(exec);

const IGNORE_PATTERNS = [
  'microsoft', 'windows', 'driver', 'nvidia', 'amd', 'intel', 'redistributable',
  'visual c++', 'update', 'directx', 'realtek', 'adobe', 'google', 'mozilla',
  'antivirus', 'malware', 'sdk', 'framework', 'vulkan', 'package', 'service',
  'client', 'launcher', 'agent', 'support', 'tool', 'system'
];

export async function scanWindowsRegistryGames(): Promise<ScanResult[]> {
  const results: ScanResult[] = [];
  const foundNames = new Set<string>();

  const registryPaths = [
    'HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
    'HKLM\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
    'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
  ];

  for (const regPath of registryPaths) {
    try {
      const { stdout } = await execAsync(`reg query "${regPath}"`);
      const subKeys = stdout.split('\r\n').filter(l => l.trim().startsWith(regPath));

      for (const subKey of subKeys.slice(0, 150)) { // Limit to avoid long scan times
        try {
          const { stdout: details } = await execAsync(`reg query "${subKey}"`);
          let displayName = '';
          let installLocation = '';
          let displayIcon = '';

          for (const line of details.split('\r\n')) {
            const match = line.trim().match(/^(\w+)\s+REG_\w+\s+(.*)$/);
            if (match) {
              const [, key, val] = match;
              if (key.toLowerCase() === 'displayname') displayName = val;
              if (key.toLowerCase() === 'installlocation') installLocation = val;
              if (key.toLowerCase() === 'displayicon') displayIcon = val.replace(/,.*$/, '').replace(/"/g, '');
            }
          }

          if (!displayName || foundNames.has(displayName.toLowerCase())) continue;

          // Check if likely a game and not a utility
          const lowerName = displayName.toLowerCase();
          const isIgnored = IGNORE_PATTERNS.some(pat => lowerName.includes(pat));
          if (isIgnored) continue;

          // Check if executable exists
          let exePath = '';
          if (displayIcon && displayIcon.toLowerCase().endsWith('.exe') && fs.existsSync(displayIcon)) {
            exePath = displayIcon;
          } else if (installLocation && fs.existsSync(installLocation)) {
            const exes = findExes(installLocation);
            if (exes.length > 0) exePath = exes[0];
          }

          if (exePath) {
            foundNames.add(displayName.toLowerCase());
            results.push({
              title: displayName,
              executablePath: exePath,
              platform: 'manual',
              installPath: installLocation || path.dirname(exePath),
              description: `Detected on PC in ${installLocation || path.dirname(exePath)}`,
              genres: ['PC Game'],
            });
          }
        } catch {
          // Skip
        }
      }
    } catch {
      // Reg path not found
    }
  }

  return results;
}

function findExes(dir: string): string[] {
  try {
    const files = fs.readdirSync(dir);
    return files
      .filter(f => f.toLowerCase().endsWith('.exe'))
      .filter(f => !f.toLowerCase().includes('unins') && !f.toLowerCase().includes('crash'))
      .map(f => path.join(dir, f));
  } catch {
    return [];
  }
}
