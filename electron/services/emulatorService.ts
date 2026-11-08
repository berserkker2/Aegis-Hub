import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { Game } from '../../src/types/game';

export interface EmulatorPreset {
  id: string;
  name: string;
  shortName: string;
  consoleName: string;
  systemKey: string;
  websiteUrl?: string;
  downloadUrl?: string;
  consoleCategory: 'sony' | 'nintendo' | 'sega' | 'microsoft' | 'other';
  color: string;
  badgeBg: string;
  extensions: string[];
  launchArgs: (romPath: string) => string[];
  candidateExePaths: () => string[];
  findRomPaths: (exeDir?: string) => string[];
  extractGamesFromConfig?: (exeDir?: string) => { title: string; romPath: string; id?: string }[];
}

export interface EmulatorConfig {
  id: string;
  name: string;
  shortName: string;
  consoleName: string;
  consoleCategory: 'sony' | 'nintendo' | 'sega' | 'microsoft' | 'other' | 'custom' | string;
  executablePath?: string;
  installed: boolean;
  romPaths: string[];
  gamesCount: number;
  color: string;
  badgeBg: string;
  thumbnailUrl?: string;
  bannerUrl?: string;
  customArgs?: string;
  customExtensions?: string[];
  isCustom?: boolean;
  enabled?: boolean;
  systemKey?: string;
  websiteUrl?: string;
  downloadUrl?: string;
  customLogoUrl?: string;
}

const APPDATA = process.env.APPDATA || '';
const LOCALAPPDATA = process.env.LOCALAPPDATA || '';
const USERPROFILE = process.env.USERPROFILE || '';

export const DEFAULT_FALLBACK_EXTENSIONS = [
  // Disc images & General archives
  '.iso', '.chd', '.bin', '.cue', '.cso', '.zip', '.7z', '.rar', '.gz', '.img', '.mdf', '.rom',
  // Nintendo Switch & Switch 2
  '.nsp', '.xci', '.nsz', '.xcz', '.nup', '.nca',
  // Nintendo Wii / Wii U / GameCube
  '.wbfs', '.rvz', '.gcm', '.gcz', '.wux', '.wud', '.wua', '.rpx', '.ciso', '.wia',
  // Nintendo Handhelds (GB/GBC/GBA/NDS/3DS)
  '.gb', '.gbc', '.gba', '.nds', '.3ds', '.cia', '.cci',
  // Classic Nintendo (NES/SNES/N64)
  '.nes', '.sfc', '.smc', '.z64', '.n64', '.v64',
  // Sony PlayStation (PS1/PS2/PS3/PSP/PS Vita)
  '.pbp', '.pkg', '.elf',
  // Sega (Genesis/MD/Saturn/Dreamcast)
  '.md', '.gen', '.smd', '.cdi', '.gdi',
  // Microsoft Xbox / Xbox 360
  '.xbe', '.xex',
];

function cleanRomTitle(filename: string, fullPath?: string): string {
  // Strip file extension
  let title = path.basename(filename, path.extname(filename));

  // If filename is just numbers or very short and fullPath is provided, check parent folder
  if (/^(\d+|[a-zA-Z]{1,3})([_-].*)?$/.test(title) && fullPath) {
    const parentDir = path.basename(path.dirname(fullPath));
    if (parentDir && parentDir.length > 3 && !/^\d+$/.test(parentDir)) {
      title = parentDir;
    }
  }

  // Remove leading scene numbers like '4840 - ', '0832 - ', '3055 - ', '5535_-_'
  title = title.replace(/^\d{3,5}\s*[-_.]+\s*/i, '');

  // Remove region tags: (Europe), (USA), (Japan), (En,Fr,De), (v1.0), etc.
  title = title.replace(/\([^)]*\)/g, ' ');

  // Remove dump tags: [!], [b1], [v0], [TitleID], etc.
  title = title.replace(/\[[^\]]*\]/g, ' ');

  // Handle specific known translations/hacks
  if (/^b-gyakuken2/i.test(title)) return 'Ace Attorney Investigations 2';
  if (/^tott_en|Tales_Of_The_Tempest/i.test(title) || (fullPath && /tott_en/i.test(fullPath))) return 'Tales of the Tempest';
  if (/^Fata\s*lFrame\s*3/i.test(title)) return 'Fatal Frame III - The Tormented';
  if (/^Fata\s*lFrame\s*2/i.test(title)) return 'Fatal Frame II - Crimson Butterfly';
  if (/^Fata\s*lFrame/i.test(title)) return 'Fatal Frame';
  if (/^disgaea\s*psp/i.test(title)) return 'Disgaea - Afternoon of Darkness';
  if (/^brave\s*story/i.test(title)) return 'Brave Story - New Traveler';

  // Replace underscores and dots with spaces first so words are properly separated
  title = title.replace(/[._]/g, ' ');

  // Remove release group suffixes and common dump group tags
  title = title.replace(/\b(undub|independent|repack|trashman|legacy|venom|xenophobia|supremacy|sweetnds|ddumpers)\b/gi, ' ');

  // Expand CamelCase if filename had no spaces (e.g. OcarinaOfTime -> Ocarina Of Time)
  if (/^[a-z]+[A-Z0-9]/.test(title) && !title.trim().includes(' ')) {
    title = title.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([a-zA-Z])(\d+)/g, '$1 $2');
  }

  // Handle ', The'
  title = title.replace(/,\s*The\b/i, '');
  if (/^Legend of Zelda/i.test(title)) {
    title = 'The ' + title;
  }

  title = title.replace(/\s+/g, ' ').trim();

  // Capitalize words nicely if all lowercase
  if (title === title.toLowerCase()) {
    title = title
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  return title || path.basename(filename);
}

export function isBiosOrSystemFile(filename: string): boolean {
  const base = path.basename(filename).toLowerCase();
  const title = cleanRomTitle(filename).toLowerCase();
  return (
    base.startsWith('scph') ||
    title.startsWith('scph') ||
    base.includes('bios') ||
    title.includes('bios') ||
    base.startsWith('erom') ||
    title === 'erom' ||
    base.startsWith('rom1') ||
    base.startsWith('rom2') ||
    title === 'rom1' ||
    title === 'rom2' ||
    base.startsWith('firmware') ||
    title.startsWith('firmware')
  );
}

export const EMULATOR_PRESETS: EmulatorPreset[] = [
  // 1. PCSX2 (PlayStation 2)
  {
    id: 'pcsx2',
    name: 'PCSX2',
    shortName: 'PCSX2',
    consoleName: 'PlayStation 2',
    systemKey: 'ps2',
    websiteUrl: 'https://pcsx2.net/downloads/',
    downloadUrl: 'https://github.com/PCSX2/pcsx2/releases/latest',
    consoleCategory: 'sony',
    color: 'text-blue-400',
    badgeBg: 'bg-blue-500/15 border-blue-500/30 text-blue-300',
    extensions: ['.iso', '.chd', '.bin', '.cso', '.gz', '.elf'],
    launchArgs: (romPath) => ['-fullscreen', '-batch', romPath],
    candidateExePaths: () => {
      const candidates = [
        'D:\\Emulators\\PCSX2\\pcsx2.exe',
        'D:\\Emulators\\PCSX2\\pcsx2-qtx64.exe',
        'C:\\Program Files\\PCSX2\\pcsx2-qtx64.exe',
        'C:\\Program Files\\PCSX2\\pcsx2.exe',
        'C:\\Program Files (x86)\\PCSX2\\pcsx2.exe',
        path.join(LOCALAPPDATA, 'Programs', 'PCSX2', 'pcsx2-qtx64.exe'),
      ];
      // Check for portable installations inside D:\Emulators\PCSX2
      if (fs.existsSync('D:\\Emulators\\PCSX2')) {
        try {
          const findExeInDir = (dir: string, depth = 0): string | null => {
            if (depth > 2) return null;
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
              const full = path.join(dir, entry.name);
              if (entry.isFile() && /^pcsx2.*\.exe$/i.test(entry.name)) {
                return full;
              }
              if (entry.isDirectory()) {
                const found = findExeInDir(full, depth + 1);
                if (found) return found;
              }
            }
            return null;
          };
          const found = findExeInDir('D:\\Emulators\\PCSX2');
          if (found && !candidates.includes(found)) {
            candidates.push(found);
          }
        } catch {}
      }
      return candidates;
    },
    findRomPaths: (exeDir) => {
      const paths = new Set<string>();
      // Check PCSX2.ini for explicit user game folders
      const iniLocations = [
        path.join(USERPROFILE, 'Documents', 'PCSX2', 'inis', 'PCSX2.ini'),
        path.join(APPDATA, 'PCSX2', 'inis', 'PCSX2.ini'),
        exeDir ? path.join(exeDir, 'inis', 'PCSX2.ini') : '',
      ].filter(Boolean);

      for (const iniPath of iniLocations) {
        if (fs.existsSync(iniPath)) {
          try {
            const content = fs.readFileSync(iniPath, 'utf8');
            const match = content.match(/RecursivePaths\s*=\s*(.+)/i);
            if (match && match[1]) {
              match[1].split(';').forEach((p) => {
                const trimmed = p.trim();
                if (trimmed && fs.existsSync(trimmed)) paths.add(trimmed);
              });
            }
          } catch {}
        }
      }
      return Array.from(paths);
    },
  },

  // 2. Dolphin (GameCube / Wii)
  {
    id: 'dolphin',
    name: 'Dolphin',
    shortName: 'Dolphin',
    consoleName: 'Nintendo GameCube',
    systemKey: 'gamecube',
    websiteUrl: 'https://dolphin-emu.org/download/',
    consoleCategory: 'nintendo',
    color: 'text-sky-400',
    badgeBg: 'bg-sky-500/15 border-sky-500/30 text-sky-300',
    extensions: ['.iso', '.rvz', '.wbfs', '.gcm', '.wad', '.ciso'],
    launchArgs: (romPath) => ['-b', '-e', romPath],
    candidateExePaths: () => [
      'D:\\Emulators\\Dolphin-x64\\Dolphin.exe',
      'D:\\Emulators\\Dolphin\\DX12\\Dolphin.exe',
      'D:\\Emulators\\Dolphin\\Dolphin.exe',
      'C:\\Program Files\\Dolphin\\Dolphin.exe',
      path.join(LOCALAPPDATA, 'Programs', 'Dolphin', 'Dolphin.exe'),
    ],
    findRomPaths: (exeDir) => {
      const paths = new Set<string>();
      const iniLocations = [
        path.join(USERPROFILE, 'Documents', 'Dolphin Emulator', 'Config', 'Dolphin.ini'),
        path.join(APPDATA, 'Dolphin Emulator', 'Config', 'Dolphin.ini'),
        exeDir ? path.join(exeDir, 'User', 'Config', 'Dolphin.ini') : '',
      ].filter(Boolean);

      for (const iniPath of iniLocations) {
        if (fs.existsSync(iniPath)) {
          try {
            const content = fs.readFileSync(iniPath, 'utf8');
            const lines = content.split('\n');
            for (const line of lines) {
              const m = line.match(/^ISOPath\d*\s*=\s*(.+)/i);
              if (m && m[1]) {
                const p = m[1].trim();
                if (p && fs.existsSync(p)) paths.add(p);
              }
            }
          } catch {}
        }
      }
      if (exeDir && fs.existsSync(path.join(exeDir, 'Games'))) paths.add(path.join(exeDir, 'Games'));
      return Array.from(paths);
    },
  },

  // 3. PPSSPP (PlayStation Portable)
  {
    id: 'ppsspp',
    name: 'PPSSPP',
    shortName: 'PPSSPP',
    consoleName: 'Sony PSP',
    systemKey: 'psp',
    websiteUrl: 'https://www.ppsspp.org/download/',
    downloadUrl: 'https://github.com/hrydgard/ppsspp/releases/latest',
    consoleCategory: 'sony',
    color: 'text-indigo-400',
    badgeBg: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300',
    extensions: ['.iso', '.cso', '.pbp'],
    launchArgs: (romPath) => [romPath],
    candidateExePaths: () => [
      'D:\\Emulators\\ppsspp\\PPSSPPWindows64.exe',
      'D:\\Emulators\\ppsspp\\PPSSPPWindows.exe',
      'D:\\Emulators\\ppsspp 1.3\\ppsspp\\PPSSPPWindows64.exe',
      'C:\\Program Files\\PPSSPP\\PPSSPPWindows64.exe',
    ],
    findRomPaths: (exeDir) => {
      const paths = new Set<string>();
      if (fs.existsSync('D:\\Emulators\\ROMS psp')) paths.add('D:\\Emulators\\ROMS psp');
      if (exeDir) {
        const memstick = path.join(exeDir, 'memstick', 'PSP', 'GAME');
        if (fs.existsSync(memstick)) paths.add(memstick);
      }
      return Array.from(paths);
    },
  },

  // 4. Ryujinx (Nintendo Switch)
  {
    id: 'ryujinx',
    name: 'Ryujinx',
    shortName: 'Ryujinx',
    consoleName: 'Nintendo Switch',
    systemKey: 'switch',
    websiteUrl: 'https://ryujinx.org/',
    downloadUrl: 'https://github.com/Ryujinx/release-channel-master/releases/latest',
    consoleCategory: 'nintendo',
    color: 'text-red-400',
    badgeBg: 'bg-red-500/15 border-red-500/30 text-red-300',
    extensions: ['.nsp', '.xci', '.nsz', '.xcz', '.nup', '.nca'],
    launchArgs: (romPath) => ['-f', romPath],
    candidateExePaths: () => [
      path.join(LOCALAPPDATA, 'Programs', 'Ryujinx', 'Ryujinx.exe'),
      path.join(APPDATA, 'Ryujinx', 'Ryujinx.exe'),
      'C:\\Program Files\\Ryujinx\\Ryujinx.exe',
      'D:\\Emulators\\Ryujinx\\Ryujinx.exe',
    ],
    findRomPaths: () => {
      const paths = new Set<string>();
      const configPath = path.join(APPDATA, 'Ryujinx', 'Config.json');
      if (fs.existsSync(configPath)) {
        try {
          const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          if (Array.isArray(cfg.game_dirs)) {
            cfg.game_dirs.forEach((p: string) => {
              if (p && fs.existsSync(p)) paths.add(p);
            });
          }
        } catch {}
      }
      return Array.from(paths);
    },
  },

  // 5. Yuzu (Nintendo Switch)
  {
    id: 'yuzu',
    name: 'Yuzu / Torzu',
    shortName: 'Yuzu',
    consoleName: 'Nintendo Switch',
    systemKey: 'switch',
    websiteUrl: 'https://github.com/torzu-emu/torzu',
    consoleCategory: 'nintendo',
    color: 'text-cyan-400',
    badgeBg: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300',
    extensions: ['.nsp', '.xci', '.nsz', '.xcz', '.nup', '.nca'],
    launchArgs: (romPath) => ['-f', '-g', romPath],
    candidateExePaths: () => [
      path.join(LOCALAPPDATA, 'yuzu', 'yuzu-windows-msvc', 'yuzu.exe'),
      path.join(LOCALAPPDATA, 'Programs', 'yuzu', 'yuzu.exe'),
      'D:\\Emulators\\yuzu\\yuzu.exe',
    ],
    findRomPaths: () => {
      const paths = new Set<string>();
      const configPath = path.join(APPDATA, 'yuzu', 'config', 'qt-config.ini');
      if (fs.existsSync(configPath)) {
        try {
          const content = fs.readFileSync(configPath, 'utf8');
          const lines = content.split('\n');
          for (const line of lines) {
            const m = line.match(/^paths\\\d+\\path\s*=\s*(.+)/i);
            if (m && m[1]) {
              const p = m[1].trim();
              if (p && fs.existsSync(p)) paths.add(p);
            }
          }
        } catch {}
      }
      return Array.from(paths);
    },
  },

  // 6. RPCS3 (PlayStation 3)
  {
    id: 'rpcs3',
    name: 'RPCS3',
    shortName: 'RPCS3',
    consoleName: 'PlayStation 3',
    systemKey: 'ps3',
    websiteUrl: 'https://rpcs3.net/download',
    downloadUrl: 'https://github.com/RPCS3/rpcs3-binaries-windows/releases/latest',
    consoleCategory: 'sony',
    color: 'text-amber-400',
    badgeBg: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
    extensions: ['.bin', '.iso'],
    launchArgs: (romPath) => ['--no-gui', romPath],
    candidateExePaths: () => [
      path.join(LOCALAPPDATA, 'Programs', 'rpcs3', 'rpcs3.exe'),
      'C:\\Program Files\\RPCS3\\rpcs3.exe',
      'D:\\Emulators\\RPCS3\\rpcs3.exe',
      'G:\\Emulators\\RPCS3\\rpcs3.exe',
    ],
    findRomPaths: () => [],
    extractGamesFromConfig: () => {
      const results: { title: string; romPath: string; id?: string }[] = [];
      const gamesYaml = path.join(APPDATA, 'rpcs3', 'games.yml');
      if (fs.existsSync(gamesYaml)) {
        try {
          const content = fs.readFileSync(gamesYaml, 'utf8');
          const lines = content.split('\n');
          let currentPath = '';
          let currentTitle = '';
          let currentId = '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('- path:')) {
              if (currentPath && currentTitle) {
                results.push({ title: currentTitle, romPath: currentPath, id: currentId });
              }
              currentPath = trimmed.replace('- path:', '').trim().replace(/^['"]|['"]$/g, '');
              currentTitle = '';
              currentId = '';
            } else if (trimmed.startsWith('title:')) {
              currentTitle = trimmed.replace('title:', '').trim().replace(/^['"]|['"]$/g, '');
            } else if (trimmed.startsWith('serial:') || trimmed.startsWith('product_code:')) {
              currentId = trimmed.replace(/serial:|product_code:/, '').trim().replace(/^['"]|['"]$/g, '');
            }
          }
          if (currentPath && currentTitle) {
            results.push({ title: currentTitle, romPath: currentPath, id: currentId });
          }
        } catch {}
      }
      return results;
    },
  },

  // 7. Cemu (Wii U)
  {
    id: 'cemu',
    name: 'Cemu',
    shortName: 'Cemu',
    consoleName: 'Nintendo Wii / Wii U',
    systemKey: 'wii',
    websiteUrl: 'https://cemu.info/',
    downloadUrl: 'https://github.com/cemu-project/Cemu/releases/latest',
    consoleCategory: 'nintendo',
    color: 'text-teal-400',
    badgeBg: 'bg-teal-500/15 border-teal-500/30 text-teal-300',
    extensions: ['.wua', '.rpx', '.wud', '.wux'],
    launchArgs: (romPath) => ['-f', '-g', romPath],
    candidateExePaths: () => [
      path.join(LOCALAPPDATA, 'Cemu', 'Cemu.exe'),
      'C:\\Program Files\\Cemu\\Cemu.exe',
      'D:\\Emulators\\Cemu\\Cemu.exe',
    ],
    findRomPaths: () => {
      const paths = new Set<string>();
      const settingsXmlLocations = [
        path.join(LOCALAPPDATA, 'Cemu', 'settings.xml'),
        path.join(APPDATA, 'Cemu', 'settings.xml'),
      ];
      for (const p of settingsXmlLocations) {
        if (fs.existsSync(p)) {
          try {
            const content = fs.readFileSync(p, 'utf8');
            const matches = content.matchAll(/<Entry>([^<]+)<\/Entry>/g);
            for (const m of matches) {
              if (m[1] && fs.existsSync(m[1].trim())) paths.add(m[1].trim());
            }
          } catch {}
        }
      }
      return Array.from(paths);
    },
  },

  // 8. DuckStation (PlayStation 1)
  {
    id: 'duckstation',
    name: 'DuckStation',
    shortName: 'DuckStation',
    consoleName: 'PlayStation 1',
    systemKey: 'playstation',
    websiteUrl: 'https://www.duckstation.org/',
    downloadUrl: 'https://github.com/stenzek/duckstation/releases/latest',
    consoleCategory: 'sony',
    color: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
    extensions: ['.chd', '.cue', '.iso', '.bin', '.pbp'],
    launchArgs: (romPath) => ['-batch', '-fullscreen', romPath],
    candidateExePaths: () => [
      path.join(USERPROFILE, 'Documents', 'DuckStation', 'duckstation-qt-x64-ReleaseLTCG.exe'),
      path.join(LOCALAPPDATA, 'DuckStation', 'duckstation-qt.exe'),
      'C:\\Program Files\\DuckStation\\duckstation-qt.exe',
      'D:\\Emulators\\DuckStation\\duckstation-qt.exe',
    ],
    findRomPaths: () => {
      const paths = new Set<string>();
      const iniLocations = [
        path.join(USERPROFILE, 'Documents', 'DuckStation', 'settings.ini'),
        path.join(APPDATA, 'DuckStation', 'settings.ini'),
      ];
      for (const ini of iniLocations) {
        if (fs.existsSync(ini)) {
          try {
            const content = fs.readFileSync(ini, 'utf8');
            const match = content.match(/RecursivePaths\s*=\s*(.+)/i);
            if (match && match[1]) {
              match[1].split(';').forEach((p) => {
                if (p.trim() && fs.existsSync(p.trim())) paths.add(p.trim());
              });
            }
          } catch {}
        }
      }
      return Array.from(paths);
    },
  },

  // 9. ePSXe (PlayStation 1)
  {
    id: 'epsxe',
    name: 'ePSXe',
    shortName: 'ePSXe',
    consoleName: 'PlayStation 1',
    systemKey: 'playstation',
    websiteUrl: 'https://www.epsxe.com/download.php',
    consoleCategory: 'sony',
    color: 'text-violet-400',
    badgeBg: 'bg-violet-500/15 border-violet-500/30 text-violet-300',
    extensions: ['.iso', '.bin', '.cue', '.img'],
    launchArgs: (romPath) => ['-nogui', '-loadbin', romPath],
    candidateExePaths: () => [
      'D:\\Emulators\\ePSXe205\\ePSXe.exe',
      'D:\\Emulators\\ePSXe202-1\\ePSXe.exe',
      'D:\\Emulators\\EPSXe 1.9.25\\ePSXe.exe',
    ],
    findRomPaths: (exeDir) => {
      const paths = new Set<string>();
      if (exeDir) {
        const isos = path.join(exeDir, 'isos');
        if (fs.existsSync(isos)) paths.add(isos);
      }
      return Array.from(paths);
    },
  },

  // 10. DeSmuME (Nintendo DS)
  {
    id: 'desmume',
    name: 'DeSmuME',
    shortName: 'DeSmuME',
    consoleName: 'Nintendo DS',
    systemKey: 'ds',
    websiteUrl: 'http://desmume.org/download/',
    consoleCategory: 'nintendo',
    color: 'text-pink-400',
    badgeBg: 'bg-pink-500/15 border-pink-500/30 text-pink-300',
    extensions: ['.nds', '.dsi'],
    launchArgs: (romPath) => [romPath],
    candidateExePaths: () => [
      'D:\\Emulators\\NDS\\H\\DeSmuME_X432R_x64.exe',
      'D:\\Emulators\\NDS\\V\\DeSmuME_X432R_x64.exe',
      'D:\\Emulators\\NDS\\Z\\DeSmuME_X432R_x64.exe',
      'D:\\Emulators\\NDS\\DeSmuME.exe',
    ],
    findRomPaths: () => {
      const paths = new Set<string>();
      if (fs.existsSync('D:\\Emulators\\NDS\\ROMS')) paths.add('D:\\Emulators\\NDS\\ROMS');
      return Array.from(paths);
    },
  },

  // 11. Citra (Nintendo 3DS)
  {
    id: 'citra',
    name: 'Citra / Lime3DS',
    shortName: 'Citra',
    consoleName: 'Nintendo 3DS',
    systemKey: '3ds',
    websiteUrl: 'https://lime3ds.github.io/',
    downloadUrl: 'https://github.com/Lime3DS/Lime3DS/releases/latest',
    consoleCategory: 'nintendo',
    color: 'text-orange-400',
    badgeBg: 'bg-orange-500/15 border-orange-500/30 text-orange-300',
    extensions: ['.3ds', '.cia', '.cxi'],
    launchArgs: (romPath) => [romPath],
    candidateExePaths: () => [
      path.join(LOCALAPPDATA, 'Citra', 'citra-qt.exe'),
      path.join(APPDATA, 'Citra', 'citra-qt.exe'),
      'C:\\Program Files\\Citra\\citra-qt.exe',
      'D:\\Emulators\\Citra\\citra-qt.exe',
    ],
    findRomPaths: () => {
      const paths = new Set<string>();
      const configPath = path.join(APPDATA, 'Citra', 'config', 'qt-config.ini');
      if (fs.existsSync(configPath)) {
        try {
          const content = fs.readFileSync(configPath, 'utf8');
          const lines = content.split('\n');
          for (const line of lines) {
            const m = line.match(/^paths\\\d+\\path\s*=\s*(.+)/i);
            if (m && m[1]) {
              const p = m[1].trim();
              if (p && fs.existsSync(p)) paths.add(p);
            }
          }
        } catch {}
      }
      return Array.from(paths);
    },
  },

  // 12. RetroArch (Multi-System)
  {
    id: 'retroarch',
    name: 'RetroArch',
    shortName: 'RetroArch',
    consoleName: 'Multi-System',
    systemKey: 'retroarch',
    websiteUrl: 'https://www.retroarch.com/?page=platforms',
    downloadUrl: 'https://buildbot.libretro.com/stable/',
    consoleCategory: 'other',
    color: 'text-purple-400',
    badgeBg: 'bg-purple-500/15 border-purple-500/30 text-purple-300',
    extensions: ['.iso', '.chd', '.bin', '.cue', '.nes', '.sfc', '.smc', '.gba', '.gb', '.gen', '.md'],
    launchArgs: (romPath) => [romPath],
    candidateExePaths: () => [
      path.join(APPDATA, 'RetroArch', 'retroarch.exe'),
      'C:\\Program Files\\RetroArch\\retroarch.exe',
      'D:\\Emulators\\RetroArch\\retroarch.exe',
    ],
    findRomPaths: () => [],
    extractGamesFromConfig: () => {
      const results: { title: string; romPath: string; id?: string }[] = [];
      const playlistDir = path.join(APPDATA, 'RetroArch', 'playlists');
      if (fs.existsSync(playlistDir)) {
        try {
          const files = fs.readdirSync(playlistDir).filter((f) => f.endsWith('.lpl'));
          for (const f of files) {
            try {
              const content = JSON.parse(fs.readFileSync(path.join(playlistDir, f), 'utf8'));
              if (Array.isArray(content.items)) {
                for (const item of content.items) {
                  if (item.path && fs.existsSync(item.path)) {
                    results.push({
                      title: item.label || cleanRomTitle(item.path),
                      romPath: item.path,
                    });
                  }
                }
              }
            } catch {}
          }
        } catch {}
      }
      return results;
    },
  },

  // 13. mGBA (Game Boy / Color / Advance)
  {
    id: 'mgba',
    name: 'mGBA',
    shortName: 'mGBA',
    consoleName: 'Game Boy / Advance',
    systemKey: 'gameboy',
    websiteUrl: 'https://mgba.io/downloads.html',
    downloadUrl: 'https://github.com/mgba-emu/mgba/releases/latest',
    consoleCategory: 'nintendo',
    color: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
    extensions: ['.gba', '.gbc', '.gb', '.zip', '.7z'],
    launchArgs: (romPath) => ['-f', romPath],
    candidateExePaths: () => [
      'D:\\Emulators\\mGBA\\mGBA.exe',
      'C:\\Program Files\\mGBA\\mGBA.exe',
      path.join(LOCALAPPDATA, 'mGBA', 'mGBA.exe'),
    ],
    findRomPaths: (exeDir) => (exeDir ? [path.join(exeDir, 'roms')] : []),
  },

  // 14. Snes9x (Super Nintendo / NES)
  {
    id: 'snes9x',
    name: 'Snes9x',
    shortName: 'Snes9x',
    consoleName: 'Super Nintendo / NES',
    systemKey: 'snes',
    websiteUrl: 'https://sites.google.com/site/bearsoft/snes9x',
    downloadUrl: 'https://github.com/snes9xgit/snes9x/releases/latest',
    consoleCategory: 'nintendo',
    color: 'text-violet-400',
    badgeBg: 'bg-violet-500/15 border-violet-500/30 text-violet-300',
    extensions: ['.sfc', '.smc', '.nes', '.fig', '.zip'],
    launchArgs: (romPath) => [romPath],
    candidateExePaths: () => [
      'D:\\Emulators\\snes9x\\snes9x-x64.exe',
      'D:\\Emulators\\snes9x\\snes9x.exe',
      'C:\\Program Files\\snes9x\\snes9x.exe',
    ],
    findRomPaths: (exeDir) => (exeDir ? [path.join(exeDir, 'Roms')] : []),
  },

  // 15. Flycast / NullDC / Demul (Sega Dreamcast)
  {
    id: 'flycast',
    name: 'Flycast / Dreamcast',
    shortName: 'Flycast',
    consoleName: 'Sega Dreamcast',
    systemKey: 'dreamcast',
    websiteUrl: 'https://github.com/flyinghead/flycast',
    downloadUrl: 'https://github.com/flyinghead/flycast/releases/latest',
    consoleCategory: 'sega',
    color: 'text-orange-400',
    badgeBg: 'bg-orange-500/15 border-orange-500/30 text-orange-300',
    extensions: ['.chd', '.cdi', '.gdi', '.cue'],
    launchArgs: (romPath) => [romPath],
    candidateExePaths: () => [
      'D:\\Emulators\\nullDC r141\\nullDC_Win32_Release-NoTrace.exe',
      'D:\\Emulators\\NullDC 1.0.4\\nullDC_100b1_6.exe',
      'D:\\Emulators\\demul07a_221215\\demul.exe',
      'D:\\Emulators\\flycast\\flycast.exe',
    ],
    findRomPaths: (exeDir) => (exeDir ? [path.join(exeDir, 'Roms')] : []),
  },

  // 16. BlastEm (Sega Mega Drive / Genesis)
  {
    id: 'blastem',
    name: 'BlastEm / Mega Drive',
    shortName: 'BlastEm',
    consoleName: 'Sega Mega Drive / Genesis',
    systemKey: 'megadrive',
    websiteUrl: 'https://www.retrodev.com/blastem/',
    consoleCategory: 'sega',
    color: 'text-amber-400',
    badgeBg: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
    extensions: ['.bin', '.gen', '.md', '.smd', '.zip'],
    launchArgs: (romPath) => [romPath],
    candidateExePaths: () => ['D:\\Emulators\\BlastEm\\blastem.exe', 'D:\\Emulators\\Fusion\\Fusion.exe'],
    findRomPaths: (exeDir) => (exeDir ? [path.join(exeDir, 'roms')] : []),
  },

  // 17. Kronos (Sega Saturn)
  {
    id: 'kronos',
    name: 'Kronos / Saturn',
    shortName: 'Kronos',
    consoleName: 'Sega Saturn',
    systemKey: 'saturn',
    websiteUrl: 'https://github.com/FCare/Kronos/releases',
    downloadUrl: 'https://github.com/FCare/Kronos/releases/latest',
    consoleCategory: 'sega',
    color: 'text-cyan-400',
    badgeBg: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300',
    extensions: ['.chd', '.cue', '.iso', '.bin'],
    launchArgs: (romPath) => [romPath],
    candidateExePaths: () => ['D:\\Emulators\\Kronos\\kronos.exe'],
    findRomPaths: (exeDir) => (exeDir ? [path.join(exeDir, 'roms')] : []),
  },

  // 18. Xemu (Original Xbox)
  {
    id: 'xemu',
    name: 'Xemu',
    shortName: 'Xemu',
    consoleName: 'Original Xbox',
    systemKey: 'xbox',
    websiteUrl: 'https://xemu.app/',
    downloadUrl: 'https://github.com/xemu-project/xemu/releases/latest',
    consoleCategory: 'microsoft',
    color: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
    extensions: ['.iso', '.xbe'],
    launchArgs: (romPath) => ['-dvd_path', romPath],
    candidateExePaths: () => ['D:\\Emulators\\Xemu\\xemu.exe', path.join(LOCALAPPDATA, 'Programs', 'Xemu', 'xemu.exe')],
    findRomPaths: () => [],
  },

  // 19. Xenia (Xbox 360)
  {
    id: 'xenia',
    name: 'Xenia',
    shortName: 'Xenia',
    consoleName: 'Xbox 360',
    systemKey: 'xbox360',
    websiteUrl: 'https://xenia.jp/download/',
    downloadUrl: 'https://github.com/xenia-project/release-builds/releases/latest',
    consoleCategory: 'microsoft',
    color: 'text-green-400',
    badgeBg: 'bg-green-500/15 border-green-500/30 text-green-300',
    extensions: ['.iso', '.xex'],
    launchArgs: (romPath) => [romPath],
    candidateExePaths: () => ['D:\\Emulators\\Xenia\\xenia.exe', 'D:\\Emulators\\Xenia\\xenia_canary.exe'],
    findRomPaths: () => [],
  },
];

export class EmulatorService {
  private configFilePath: string;

  constructor() {
    const dataDir = app ? app.getPath('userData') : path.join(process.cwd(), '.launcher-data');
    this.configFilePath = path.join(dataDir, 'emulators.json');
  }

  public getSavedConfigs(): EmulatorConfig[] {
    try {
      if (fs.existsSync(this.configFilePath)) {
        return JSON.parse(fs.readFileSync(this.configFilePath, 'utf8'));
      }
    } catch (err) {
      console.error('Error reading emulator configs:', err);
    }
    return [];
  }

  public saveConfigs(configs: EmulatorConfig[]): void {
    try {
      fs.writeFileSync(this.configFilePath, JSON.stringify(configs, null, 2), 'utf8');
    } catch (err) {
      console.error('Error writing emulator configs:', err);
    }
  }

  public deleteConfig(id: string): void {
    const configs = this.getSavedConfigs().filter((c) => c.id !== id);
    this.saveConfigs(configs);
  }

  public scanEmulatorsAndGames(existingGames: Game[] = []): { emulators: EmulatorConfig[]; games: Game[] } {
    const saved = this.getSavedConfigs();
    const savedMap = new Map<string, EmulatorConfig>(saved.map((s) => [s.id, s]));

    const detectedEmulators: EmulatorConfig[] = [];
    const discoveredGames: Game[] = [];

    const existingRomPaths = new Set(
      existingGames
        .filter((g) => g.executablePath)
        .map((g) => g.executablePath.toLowerCase().trim())
    );

    const presetIds = new Set(EMULATOR_PRESETS.map((p) => p.id));

    // 1. Process Built-in Presets
    for (const preset of EMULATOR_PRESETS) {
      const savedItem = savedMap.get(preset.id);
      let exePath = savedItem?.executablePath;

      // Verify or discover executable if not explicitly set
      if (!exePath || !fs.existsSync(exePath)) {
        const candidates = preset.candidateExePaths();
        for (const candidate of candidates) {
          if (fs.existsSync(candidate)) {
            exePath = candidate;
            break;
          }
        }
      }

      const isInstalled = Boolean(exePath && fs.existsSync(exePath));
      const exeDir = exePath ? path.dirname(exePath) : undefined;

      // Discover ROM paths (combine user-defined paths and auto-detected paths)
      const romPathsSet = new Set<string>(savedItem?.romPaths || []);
      const detectedRomPaths = preset.findRomPaths(exeDir);
      detectedRomPaths.forEach((p) => romPathsSet.add(p));

      // Extract games directly from config (RPCS3, RetroArch, etc.)
      const directGames = preset.extractGamesFromConfig ? preset.extractGamesFromConfig(exeDir) : [];

      // Scan directories for rom files
      const extensions = savedItem?.customExtensions && savedItem.customExtensions.length > 0
        ? savedItem.customExtensions
        : preset.extensions;

      const scannedGamesFromDirs: { title: string; romPath: string }[] = [];
      for (const dir of romPathsSet) {
        if (fs.existsSync(dir)) {
          this.scanDirForRoms(dir, extensions, scannedGamesFromDirs, 3);
        }
      }

      const allFoundRoms = [...directGames, ...scannedGamesFromDirs];
      // Deduplicate by romPath and cleaned title / gameId
      const seenRoms = new Set<string>();
      const seenGameIds = new Set<string>();
      const uniqueRoms: { title: string; romPath: string; id?: string }[] = [];
      for (const item of allFoundRoms) {
        if (isBiosOrSystemFile(item.title) || isBiosOrSystemFile(item.romPath)) continue;
        const norm = item.romPath.toLowerCase().trim();
        const cleanedTitle = cleanRomTitle(item.title, item.romPath);
        const gameId = `emu-${preset.id}-${cleanedTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        if (!seenRoms.has(norm) && !seenGameIds.has(gameId)) {
          seenRoms.add(norm);
          seenGameIds.add(gameId);
          uniqueRoms.push(item);
        }
      }

      const isEnabled = savedItem?.enabled !== undefined
        ? savedItem.enabled
        : Boolean(isInstalled || uniqueRoms.length > 0);

      const emuConfig: EmulatorConfig = {
        id: preset.id,
        name: savedItem?.name || preset.name,
        shortName: preset.shortName,
        consoleName: savedItem?.consoleName || preset.consoleName,
        consoleCategory: preset.consoleCategory,
        executablePath: exePath,
        installed: isInstalled,
        romPaths: Array.from(romPathsSet),
        gamesCount: uniqueRoms.length,
        color: preset.color,
        badgeBg: preset.badgeBg,
        thumbnailUrl: savedItem?.thumbnailUrl,
        bannerUrl: savedItem?.bannerUrl,
        customArgs: savedItem?.customArgs,
        customExtensions: savedItem?.customExtensions,
        enabled: isEnabled,
        systemKey: preset.systemKey,
        websiteUrl: savedItem?.websiteUrl || preset.websiteUrl,
        downloadUrl: savedItem?.downloadUrl || preset.downloadUrl,
        customLogoUrl: savedItem?.customLogoUrl,
      };

      detectedEmulators.push(emuConfig);

      // Create Game objects for any games
      for (const romItem of uniqueRoms) {
        const norm = romItem.romPath.toLowerCase().trim();
        const cleanedTitle = cleanRomTitle(romItem.title, romItem.romPath);
        const gameId = `emu-${preset.id}-${cleanedTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

        // Build args string
        let launchArgsStr = '';
        if (savedItem?.customArgs) {
          launchArgsStr = savedItem.customArgs.includes('%ROM%')
            ? savedItem.customArgs.replace('%ROM%', `"${romItem.romPath}"`)
            : `${savedItem.customArgs} "${romItem.romPath}"`;
        } else {
          const argsArray = preset.launchArgs(romItem.romPath);
          launchArgsStr = argsArray.map((a) => (a.includes(' ') ? `"${a}"` : a)).join(' ');
        }

        const game: Game = {
          id: gameId,
          title: cleanedTitle,
          executablePath: exePath || romItem.romPath,
          launchArgs: launchArgsStr,
          platform: 'emulator',
          storeId: preset.id,
          coverUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%231e1b4b"/><stop offset="100%" stop-color="%230f172a"/></linearGradient></defs><rect width="600" height="900" fill="url(%23g)"/><circle cx="300" cy="380" r="90" fill="%238b5cf6" opacity="0.15"/><path d="M260 340 L340 380 L260 420 Z" fill="%23a78bfa"/><text x="300" y="520" fill="%23f1f5f9" font-size="28" font-family="sans-serif" font-weight="bold" text-anchor="middle">${encodeURIComponent(cleanedTitle.slice(0, 24))}</text><rect x="220" y="560" width="160" height="28" rx="14" fill="%238b5cf6" opacity="0.3"/><text x="300" y="579" fill="%23c4b5fd" font-size="12" font-family="sans-serif" font-weight="bold" text-anchor="middle">${encodeURIComponent(preset.consoleName)}</text></svg>`,
          bannerUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%231e1b4b"/><stop offset="100%" stop-color="%2309090b"/></linearGradient></defs><rect width="1920" height="1080" fill="url(%23g)"/><text x="960" y="540" fill="%2364748b" font-size="44" font-family="sans-serif" font-weight="bold" text-anchor="middle">${encodeURIComponent(cleanedTitle)}</text></svg>`,
          description: `Emulated title for ${preset.consoleName} running via ${preset.name}.`,
          genres: ['Emulated', preset.consoleName],
          tags: ['Emulation', preset.name, preset.consoleName],
          favorite: false,
          hidden: false,
          installed: true,
          installPath: path.dirname(romItem.romPath),
          playtimeMinutes: 0,
          addedDate: new Date().toISOString(),
        };

        discoveredGames.push(game);
      }
    }

    // 2. Process User Custom Emulator Instances
    for (const savedItem of saved) {
      if (presetIds.has(savedItem.id)) continue;

      const exePath = savedItem.executablePath;
      const isInstalled = Boolean(exePath && fs.existsSync(exePath));
      const extensions = (savedItem.customExtensions && savedItem.customExtensions.length > 0
        ? savedItem.customExtensions
        : DEFAULT_FALLBACK_EXTENSIONS
      ).map((e) => (e.startsWith('.') ? e.toLowerCase().trim() : `.${e.toLowerCase().trim()}`));

      const scannedGamesFromDirs: { title: string; romPath: string }[] = [];
      for (const dir of savedItem.romPaths || []) {
        if (fs.existsSync(dir)) {
          this.scanDirForRoms(dir, extensions, scannedGamesFromDirs, 3);
        }
      }

      // Deduplicate by romPath and cleaned title / gameId
      const seenRoms = new Set<string>();
      const seenGameIds = new Set<string>();
      const uniqueRoms: { title: string; romPath: string; id?: string }[] = [];
      for (const item of scannedGamesFromDirs) {
        if (isBiosOrSystemFile(item.title) || isBiosOrSystemFile(item.romPath)) continue;
        const norm = item.romPath.toLowerCase().trim();
        const cleanedTitle = cleanRomTitle(item.title, item.romPath);
        const gameId = `emu-${savedItem.id}-${cleanedTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        if (!seenRoms.has(norm) && !seenGameIds.has(gameId)) {
          seenRoms.add(norm);
          seenGameIds.add(gameId);
          uniqueRoms.push(item);
        }
      }

      const customConfig: EmulatorConfig = {
        ...savedItem,
        installed: isInstalled,
        gamesCount: uniqueRoms.length,
        isCustom: true,
        enabled: savedItem.enabled !== undefined ? savedItem.enabled : true,
        systemKey: savedItem.systemKey || 'custom',
      };

      detectedEmulators.push(customConfig);

      for (const romItem of uniqueRoms) {
        const cleanedTitle = cleanRomTitle(romItem.title, romItem.romPath);
        const gameId = `emu-${savedItem.id}-${cleanedTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

        let launchArgsStr = '';
        if (savedItem.customArgs) {
          launchArgsStr = savedItem.customArgs.includes('%ROM%')
            ? savedItem.customArgs.replace('%ROM%', `"${romItem.romPath}"`)
            : `${savedItem.customArgs} "${romItem.romPath}"`;
        } else {
          launchArgsStr = `"${romItem.romPath}"`;
        }

        const game: Game = {
          id: gameId,
          title: cleanedTitle,
          executablePath: exePath || romItem.romPath,
          launchArgs: launchArgsStr,
          platform: 'emulator',
          storeId: savedItem.id,
          coverUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%231e1b4b"/><stop offset="100%" stop-color="%230f172a"/></linearGradient></defs><rect width="600" height="900" fill="url(%23g)"/><circle cx="300" cy="380" r="90" fill="%238b5cf6" opacity="0.15"/><path d="M260 340 L340 380 L260 420 Z" fill="%23a78bfa"/><text x="300" y="520" fill="%23f1f5f9" font-size="28" font-family="sans-serif" font-weight="bold" text-anchor="middle">${encodeURIComponent(cleanedTitle.slice(0, 24))}</text><rect x="220" y="560" width="160" height="28" rx="14" fill="%238b5cf6" opacity="0.3"/><text x="300" y="579" fill="%23c4b5fd" font-size="12" font-family="sans-serif" font-weight="bold" text-anchor="middle">${encodeURIComponent(savedItem.consoleName || 'Retro')}</text></svg>`,
          bannerUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%231e1b4b"/><stop offset="100%" stop-color="%2309090b"/></linearGradient></defs><rect width="1920" height="1080" fill="url(%23g)"/><text x="960" y="540" fill="%2364748b" font-size="44" font-family="sans-serif" font-weight="bold" text-anchor="middle">${encodeURIComponent(cleanedTitle)}</text></svg>`,
          description: `Emulated title for ${savedItem.consoleName} running via ${savedItem.name}.`,
          genres: ['Emulated', savedItem.consoleName],
          tags: ['Emulation', savedItem.name, savedItem.consoleName],
          favorite: false,
          hidden: false,
          installed: true,
          installPath: path.dirname(romItem.romPath),
          playtimeMinutes: 0,
          addedDate: new Date().toISOString(),
        };

        discoveredGames.push(game);
      }
    }

    this.saveConfigs(detectedEmulators);
    return { emulators: detectedEmulators, games: discoveredGames };
  }

  private scanDirForRoms(
    dir: string,
    extensions: string[],
    output: { title: string; romPath: string }[],
    maxDepth = 3
  ): void {
    if (maxDepth <= 0) return;
    try {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        let stat: fs.Stats;
        try {
          stat = fs.statSync(fullPath);
        } catch {
          continue;
        }

        if (stat.isDirectory()) {
          const dirLower = item.toLowerCase();
          // Strictly skip internal bios, firmware, plugins, cache, shaders, crap folders
          if (
            [
              'bios',
              'firmware',
              'bis',
              'sdcard',
              'nand',
              'sysdata',
              'shaders',
              'logs',
              'cheats',
              'cache',
              'plugins',
              'memcards',
              'snaps',
              'textures',
              'lang',
              'locales',
              'crap',
            ].includes(dirLower)
          ) {
            continue;
          }
          this.scanDirForRoms(fullPath, extensions, output, maxDepth - 1);
        } else if (stat.isFile()) {
          const ext = path.extname(item).toLowerCase();
          if (extensions.some((e) => (e.startsWith('.') ? e.toLowerCase() : `.${e.toLowerCase()}`) === ext)) {
            // Strictly exclude any BIOS or firmware files
            if (!isBiosOrSystemFile(item)) {
              output.push({
                title: item,
                romPath: fullPath,
              });
            }
          }
        }
      }
    } catch {}
  }
}

export const emulatorService = new EmulatorService();
