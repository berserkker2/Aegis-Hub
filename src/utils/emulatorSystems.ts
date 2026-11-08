import logo3ds from '../assets/emulator-logos/3ds.webp';
import logoDreamcast from '../assets/emulator-logos/dreamcast.webp';
import logoDs from '../assets/emulator-logos/DS.webp';
import logoGameboy from '../assets/emulator-logos/gameboy.webp';
import logoGamecube from '../assets/emulator-logos/gamecube.webp';
import logoMegadrive from '../assets/emulator-logos/megadrive.webp';
import logoPlaystation from '../assets/emulator-logos/playstation.webp';
import logoPs2 from '../assets/emulator-logos/ps2.webp';
import logoPs3 from '../assets/emulator-logos/ps3.webp';
import logoPsp from '../assets/emulator-logos/psp.webp';
import logoRetroarch from '../assets/emulator-logos/retroarch.webp';
import logoSaturn from '../assets/emulator-logos/saturn.webp';
import logoSnes from '../assets/emulator-logos/SNES.webp';
import logoSwitch from '../assets/emulator-logos/switch.webp';
import logoWii from '../assets/emulator-logos/wii.webp';
import logoXbox from '../assets/emulator-logos/xbox.webp';
import logoXbox360 from '../assets/emulator-logos/xbox360.webp';

export interface EmulatorPresetInfo {
  id: string;
  name: string;
  websiteUrl: string;
  downloadUrl?: string; // Direct portable download link if available
  candidateExeNames: string[];
  defaultExtensions: string[];
  defaultArgs?: string;
  description: string;
}

export interface SystemDefinition {
  systemKey: string;
  name: string;
  shortName: string;
  logo: string;
  category: 'nintendo' | 'sony' | 'sega' | 'microsoft' | 'other';
  supportedConsoles: string[];
  emulators: EmulatorPresetInfo[];
  defaultExtensions: string[];
}

export const SYSTEM_DEFINITIONS: SystemDefinition[] = [
  // 1. Nintendo Switch 2
  {
    systemKey: 'switch2',
    name: 'Nintendo Switch 2',
    shortName: 'Switch 2',
    logo: logoSwitch,
    category: 'nintendo',
    supportedConsoles: ['Nintendo Switch 2', 'Switch 2'],
    defaultExtensions: ['.nup', '.nsp', '.xci', '.nsz', '.xcz', '.nca'],
    emulators: [
      {
        id: 'lichii',
        name: 'Lichii',
        websiteUrl: 'https://github.com/',
        candidateExeNames: ['lichii.exe', 'Lichii.exe'],
        defaultExtensions: ['.nup', '.nsp', '.xci', '.nsz', '.xcz', '.nca'],
        defaultArgs: '%ROM%',
        description: 'Next-generation Nintendo Switch 2 emulator.',
      },
    ],
  },

  // 2. Nintendo Switch
  {
    systemKey: 'switch',
    name: 'Nintendo Switch',
    shortName: 'Switch',
    logo: logoSwitch,
    category: 'nintendo',
    supportedConsoles: ['Nintendo Switch'],
    defaultExtensions: ['.nsp', '.xci', '.nca', '.nsz', '.nup', '.xcz'],
    emulators: [
      {
        id: 'ryujinx',
        name: 'Ryujinx',
        websiteUrl: 'https://ryujinx.org/',
        downloadUrl: 'https://github.com/Ryujinx/release-channel-master/releases/latest',
        candidateExeNames: ['Ryujinx.exe', 'Ryujinx.Ava.exe'],
        defaultExtensions: ['.nsp', '.xci', '.nca', '.nsz', '.nup', '.xcz'],
        defaultArgs: '%ROM%',
        description: 'Open-source Nintendo Switch emulator focused on accuracy and compatibility.',
      },
      {
        id: 'torzu',
        name: 'Torzu / Suyu',
        websiteUrl: 'https://github.com/torzu-emu/torzu',
        candidateExeNames: ['torzu.exe', 'suyu.exe', 'yuzu.exe'],
        defaultExtensions: ['.nsp', '.xci', '.nca', '.nsz', '.nup', '.xcz'],
        defaultArgs: '-f -g %ROM%',
        description: 'Community-maintained Switch emulation fork with high performance.',
      },
    ],
  },

  // 2. Sony PlayStation 2
  {
    systemKey: 'ps2',
    name: 'PlayStation 2',
    shortName: 'PS2',
    logo: logoPs2,
    category: 'sony',
    supportedConsoles: ['PlayStation 2', 'PS2'],
    defaultExtensions: ['.iso', '.chd', '.bin', '.cso', '.gz', '.mdf', '.img'],
    emulators: [
      {
        id: 'pcsx2',
        name: 'PCSX2',
        websiteUrl: 'https://pcsx2.net/downloads/',
        downloadUrl: 'https://github.com/PCSX2/pcsx2/releases/latest',
        candidateExeNames: ['pcsx2-qtx64.exe', 'pcsx2.exe', 'pcsx2-qt.exe'],
        defaultExtensions: ['.iso', '.chd', '.bin', '.cso', '.gz', '.mdf'],
        defaultArgs: '-batch %ROM%',
        description: 'The premier PlayStation 2 emulator with widescreen and HD upscaling support.',
      },
    ],
  },

  // 3. Sony PlayStation (PS1 / PSX)
  {
    systemKey: 'playstation',
    name: 'PlayStation 1',
    shortName: 'PS1',
    logo: logoPlaystation,
    category: 'sony',
    supportedConsoles: ['PlayStation', 'PS1', 'PSX'],
    defaultExtensions: ['.chd', '.cue', '.iso', '.pbp', '.bin', '.m3u'],
    emulators: [
      {
        id: 'duckstation',
        name: 'DuckStation',
        websiteUrl: 'https://www.duckstation.org/',
        downloadUrl: 'https://github.com/stenzek/duckstation/releases/latest',
        candidateExeNames: ['duckstation-qt-x64-ReleaseLTCG.exe', 'duckstation.exe', 'duckstation-nogui-x64-ReleaseLTCG.exe'],
        defaultExtensions: ['.chd', '.cue', '.iso', '.pbp', '.bin', '.m3u'],
        defaultArgs: '-batch -fullscreen %ROM%',
        description: 'High performance, modern PS1 emulator featuring PGXP geometry correction.',
      },
      {
        id: 'epsxe',
        name: 'ePSXe',
        websiteUrl: 'https://www.epsxe.com/download.php',
        candidateExeNames: ['ePSXe.exe'],
        defaultExtensions: ['.iso', '.cue', '.bin', '.img'],
        defaultArgs: '-nogui -loadbin %ROM%',
        description: 'Classic standalone PlayStation emulator with plugin architecture.',
      },
    ],
  },

  // 4. Sony PlayStation 3
  {
    systemKey: 'ps3',
    name: 'PlayStation 3',
    shortName: 'PS3',
    logo: logoPs3,
    category: 'sony',
    supportedConsoles: ['PlayStation 3', 'PS3'],
    defaultExtensions: ['.pkg', '.iso', '.bin', '.self'],
    emulators: [
      {
        id: 'rpcs3',
        name: 'RPCS3',
        websiteUrl: 'https://rpcs3.net/download',
        downloadUrl: 'https://github.com/RPCS3/rpcs3-binaries-windows/releases/latest',
        candidateExeNames: ['rpcs3.exe'],
        defaultExtensions: ['.pkg', '.iso', '.bin'],
        defaultArgs: '--no-gui %ROM%',
        description: 'Open-source Sony PlayStation 3 emulator and debugger written in C++.',
      },
    ],
  },

  // 5. Sony PlayStation Portable
  {
    systemKey: 'psp',
    name: 'PlayStation Portable',
    shortName: 'PSP',
    logo: logoPsp,
    category: 'sony',
    supportedConsoles: ['PlayStation Portable', 'PSP'],
    defaultExtensions: ['.iso', '.cso', '.pbp', '.chd'],
    emulators: [
      {
        id: 'ppsspp',
        name: 'PPSSPP',
        websiteUrl: 'https://www.ppsspp.org/download/',
        downloadUrl: 'https://github.com/hrydgard/ppsspp/releases/latest',
        candidateExeNames: ['PPSSPPWindows64.exe', 'PPSSPPWindows.exe', 'PPSSPP.exe'],
        defaultExtensions: ['.iso', '.cso', '.pbp', '.chd'],
        defaultArgs: '%ROM%',
        description: 'Fast, feature-rich PSP emulator with upscaled HD textures and shader support.',
      },
    ],
  },

  // 6. Nintendo Game Boy (GB / GBC / GBA)
  {
    systemKey: 'gameboy',
    name: 'Game Boy / Color / Advance',
    shortName: 'Game Boy',
    logo: logoGameboy,
    category: 'nintendo',
    supportedConsoles: ['Game Boy', 'Game Boy Color', 'Game Boy Advance', 'GBA', 'GBC', 'GB'],
    defaultExtensions: ['.gba', '.gbc', '.gb', '.zip', '.7z'],
    emulators: [
      {
        id: 'mgba',
        name: 'mGBA',
        websiteUrl: 'https://mgba.io/downloads.html',
        downloadUrl: 'https://github.com/mgba-emu/mgba/releases/latest',
        candidateExeNames: ['mGBA.exe'],
        defaultExtensions: ['.gba', '.gbc', '.gb', '.zip'],
        defaultArgs: '-f %ROM%',
        description: 'Extremely accurate and fast emulator for Game Boy Advance, Color, and original Game Boy.',
      },
      {
        id: 'vbam',
        name: 'VisualBoyAdvance-M',
        websiteUrl: 'https://visualboyadvance-m.org/',
        downloadUrl: 'https://github.com/visualboyadvance-m/visualboyadvance-m/releases/latest',
        candidateExeNames: ['visualboyadvance-m.exe', 'vbam.exe'],
        defaultExtensions: ['.gba', '.gbc', '.gb', '.zip'],
        defaultArgs: '%ROM%',
        description: 'Modern fork of the beloved VisualBoyAdvance emulator.',
      },
    ],
  },

  // 7. Nintendo SNES & NES (covers NES, SNES, Super Famicom)
  {
    systemKey: 'snes',
    name: 'Super Nintendo / NES',
    shortName: 'SNES / NES',
    logo: logoSnes,
    category: 'nintendo',
    supportedConsoles: ['Super Nintendo', 'SNES', 'NES', 'Famicom', 'Super Famicom'],
    defaultExtensions: ['.sfc', '.smc', '.nes', '.fig', '.zip', '.7z'],
    emulators: [
      {
        id: 'snes9x',
        name: 'Snes9x',
        websiteUrl: 'https://sites.google.com/site/bearsoft/snes9x',
        downloadUrl: 'https://github.com/snes9xgit/snes9x/releases/latest',
        candidateExeNames: ['snes9x-x64.exe', 'snes9x.exe'],
        defaultExtensions: ['.sfc', '.smc', '.fig', '.zip'],
        defaultArgs: '%ROM%',
        description: 'Classic, highly portable Super Nintendo Entertainment System emulator.',
      },
      {
        id: 'mesen',
        name: 'Mesen',
        websiteUrl: 'https://www.mesen.ca/',
        downloadUrl: 'https://github.com/SourMesen/Mesen2/releases/latest',
        candidateExeNames: ['Mesen.exe'],
        defaultExtensions: ['.nes', '.sfc', '.smc', '.gb', '.pce'],
        defaultArgs: '%ROM%',
        description: 'High-accuracy multi-system emulator for NES, SNES, Game Boy, and PC Engine.',
      },
    ],
  },

  // 8. Nintendo DS
  {
    systemKey: 'ds',
    name: 'Nintendo DS',
    shortName: 'NDS',
    logo: logoDs,
    category: 'nintendo',
    supportedConsoles: ['Nintendo DS', 'NDS', 'DS'],
    defaultExtensions: ['.nds', '.dsi', '.zip', '.7z'],
    emulators: [
      {
        id: 'melonds',
        name: 'MelonDS',
        websiteUrl: 'https://melonds.kuribo64.net/downloads.php',
        downloadUrl: 'https://github.com/melonDS-emu/melonDS/releases/latest',
        candidateExeNames: ['melonDS.exe'],
        defaultExtensions: ['.nds', '.dsi', '.zip'],
        defaultArgs: '%ROM%',
        description: 'Modern Nintendo DS and DSi emulator with Wi-Fi multiplayer simulation.',
      },
      {
        id: 'desmume',
        name: 'DeSmuME',
        websiteUrl: 'http://desmume.org/download/',
        candidateExeNames: ['DeSmuME_0.9.13_x64.exe', 'DeSmuME.exe'],
        defaultExtensions: ['.nds', '.zip'],
        defaultArgs: '%ROM%',
        description: 'Established Nintendo DS dual-screen emulator.',
      },
    ],
  },

  // 9. Nintendo 3DS
  {
    systemKey: '3ds',
    name: 'Nintendo 3DS',
    shortName: '3DS',
    logo: logo3ds,
    category: 'nintendo',
    supportedConsoles: ['Nintendo 3DS', '3DS'],
    defaultExtensions: ['.3ds', '.cia', '.cxi', '.3dsx'],
    emulators: [
      {
        id: 'lime3ds',
        name: 'Lime3DS / Citra',
        websiteUrl: 'https://lime3ds.github.io/',
        downloadUrl: 'https://github.com/Lime3DS/Lime3DS/releases/latest',
        candidateExeNames: ['lime3ds-gui.exe', 'citra-qt.exe', 'lime3ds.exe'],
        defaultExtensions: ['.3ds', '.cia', '.cxi', '.3dsx'],
        defaultArgs: '%ROM%',
        description: 'Active fork of Citra providing smooth Nintendo 3DS emulation and multiplayer.',
      },
    ],
  },

  // 10. Nintendo GameCube
  {
    systemKey: 'gamecube',
    name: 'Nintendo GameCube',
    shortName: 'GameCube',
    logo: logoGamecube,
    category: 'nintendo',
    supportedConsoles: ['Nintendo GameCube', 'GameCube', 'NGC'],
    defaultExtensions: ['.iso', '.gcm', '.rvz', '.ciso'],
    emulators: [
      {
        id: 'dolphin',
        name: 'Dolphin (GameCube)',
        websiteUrl: 'https://dolphin-emu.org/download/',
        candidateExeNames: ['Dolphin.exe'],
        defaultExtensions: ['.iso', '.gcm', '.rvz', '.ciso'],
        defaultArgs: '-b -e %ROM%',
        description: 'The golden standard for GameCube emulation with 4K rendering and HD netplay.',
      },
    ],
  },

  // 11. Nintendo Wii & Wii U
  {
    systemKey: 'wii',
    name: 'Nintendo Wii / Wii U',
    shortName: 'Wii / Wii U',
    logo: logoWii,
    category: 'nintendo',
    supportedConsoles: ['Nintendo Wii', 'Wii', 'Wii U'],
    defaultExtensions: ['.iso', '.wbfs', '.rvz', '.wad', '.wua', '.rpx'],
    emulators: [
      {
        id: 'dolphin_wii',
        name: 'Dolphin (Wii)',
        websiteUrl: 'https://dolphin-emu.org/download/',
        candidateExeNames: ['Dolphin.exe'],
        defaultExtensions: ['.iso', '.wbfs', '.rvz', '.wad'],
        defaultArgs: '-b -e %ROM%',
        description: 'Dolphin with full MotionPlus and Wiimote emulation support.',
      },
      {
        id: 'cemu',
        name: 'Cemu (Wii U)',
        websiteUrl: 'https://cemu.info/',
        downloadUrl: 'https://github.com/cemu-project/Cemu/releases/latest',
        candidateExeNames: ['Cemu.exe'],
        defaultExtensions: ['.wua', '.rpx', '.wud', '.wux'],
        defaultArgs: '-f -g %ROM%',
        description: 'Highly optimized Wii U emulator with massive graphic pack modding community.',
      },
    ],
  },

  // 12. Sega Mega Drive / Genesis
  {
    systemKey: 'megadrive',
    name: 'Sega Mega Drive / Genesis',
    shortName: 'Mega Drive',
    logo: logoMegadrive,
    category: 'sega',
    supportedConsoles: ['Sega Mega Drive', 'Sega Genesis', 'Mega Drive', 'Genesis'],
    defaultExtensions: ['.bin', '.gen', '.md', '.smd', '.zip', '.7z'],
    emulators: [
      {
        id: 'blastem',
        name: 'BlastEm',
        websiteUrl: 'https://www.retrodev.com/blastem/',
        candidateExeNames: ['blastem.exe'],
        defaultExtensions: ['.bin', '.gen', '.md', '.smd', '.zip'],
        defaultArgs: '%ROM%',
        description: 'Cycle-accurate 16-bit Sega Genesis/Mega Drive emulator.',
      },
      {
        id: 'fusion',
        name: 'Kega Fusion',
        websiteUrl: 'https://www.carpeludum.com/kega-fusion/',
        candidateExeNames: ['Fusion.exe'],
        defaultExtensions: ['.bin', '.gen', '.md', '.smd', '.zip'],
        defaultArgs: '%ROM%',
        description: 'Renowned classic emulator for SG-1000, Master System, Game Gear, Genesis and 32X.',
      },
    ],
  },

  // 13. Sega Saturn
  {
    systemKey: 'saturn',
    name: 'Sega Saturn',
    shortName: 'Saturn',
    logo: logoSaturn,
    category: 'sega',
    supportedConsoles: ['Sega Saturn', 'Saturn'],
    defaultExtensions: ['.chd', '.cue', '.iso', '.bin', '.mdf'],
    emulators: [
      {
        id: 'kronos',
        name: 'Kronos / Mednafen',
        websiteUrl: 'https://github.com/FCare/Kronos/releases',
        downloadUrl: 'https://github.com/FCare/Kronos/releases/latest',
        candidateExeNames: ['kronos.exe', 'mednafen.exe'],
        defaultExtensions: ['.chd', '.cue', '.iso', '.bin'],
        defaultArgs: '%ROM%',
        description: 'Advanced Sega Saturn emulator with OpenGL and ST-V arcade board support.',
      },
    ],
  },

  // 14. Sega Dreamcast
  {
    systemKey: 'dreamcast',
    name: 'Sega Dreamcast',
    shortName: 'Dreamcast',
    logo: logoDreamcast,
    category: 'sega',
    supportedConsoles: ['Sega Dreamcast', 'Dreamcast', 'NAOMI'],
    defaultExtensions: ['.chd', '.cdi', '.gdi', '.cue'],
    emulators: [
      {
        id: 'flycast',
        name: 'Flycast',
        websiteUrl: 'https://github.com/flyinghead/flycast',
        downloadUrl: 'https://github.com/flyinghead/flycast/releases/latest',
        candidateExeNames: ['flycast.exe'],
        defaultExtensions: ['.chd', '.cdi', '.gdi', '.cue'],
        defaultArgs: '%ROM%',
        description: 'Multi-platform Sega Dreamcast, Naomi, and Atomiswave emulator with Vulkan support.',
      },
      {
        id: 'redream',
        name: 'Redream',
        websiteUrl: 'https://redream.io/download',
        candidateExeNames: ['redream.exe'],
        defaultExtensions: ['.chd', '.cdi', '.gdi'],
        defaultArgs: '%ROM%',
        description: 'Sleek, plug-and-play Dreamcast emulator with 4K render capabilities.',
      },
    ],
  },

  // 15. Microsoft Xbox (Original)
  {
    systemKey: 'xbox',
    name: 'Original Xbox',
    shortName: 'Xbox',
    logo: logoXbox,
    category: 'microsoft',
    supportedConsoles: ['Xbox', 'Original Xbox'],
    defaultExtensions: ['.iso', '.xbe', '.chd'],
    emulators: [
      {
        id: 'xemu',
        name: 'Xemu',
        websiteUrl: 'https://xemu.app/',
        downloadUrl: 'https://github.com/xemu-project/xemu/releases/latest',
        candidateExeNames: ['xemu.exe'],
        defaultExtensions: ['.iso', '.xbe', '.chd'],
        defaultArgs: '-dvd_path %ROM%',
        description: 'Low-level original Xbox emulator focused on stability and accuracy.',
      },
    ],
  },

  // 16. Microsoft Xbox 360
  {
    systemKey: 'xbox360',
    name: 'Xbox 360',
    shortName: 'Xbox 360',
    logo: logoXbox360,
    category: 'microsoft',
    supportedConsoles: ['Xbox 360', 'X360'],
    defaultExtensions: ['.iso', '.xex', '.god'],
    emulators: [
      {
        id: 'xenia',
        name: 'Xenia',
        websiteUrl: 'https://xenia.jp/download/',
        downloadUrl: 'https://github.com/xenia-project/release-builds/releases/latest',
        candidateExeNames: ['xenia.exe', 'xenia_canary.exe'],
        defaultExtensions: ['.iso', '.xex'],
        defaultArgs: '%ROM%',
        description: 'Experimental modern Xbox 360 research emulator.',
      },
    ],
  },

  // 17. Multi-System Frontend (RetroArch)
  {
    systemKey: 'retroarch',
    name: 'RetroArch (Multi-System)',
    shortName: 'RetroArch',
    logo: logoRetroarch,
    category: 'other',
    supportedConsoles: ['All Systems', 'Multi-System'],
    defaultExtensions: ['.iso', '.chd', '.bin', '.cue', '.zip', '.7z', '.nes', '.sfc', '.gba'],
    emulators: [
      {
        id: 'retroarch',
        name: 'RetroArch',
        websiteUrl: 'https://www.retroarch.com/?page=platforms',
        downloadUrl: 'https://buildbot.libretro.com/stable/',
        candidateExeNames: ['retroarch.exe'],
        defaultExtensions: ['.iso', '.chd', '.bin', '.cue', '.zip', '.7z', '.nes', '.sfc', '.gba'],
        defaultArgs: '-L cores\\ %ROM%',
        description: 'Universal cross-platform frontend for game engines, media players and emulator cores.',
      },
    ],
  },
];

export function getSystemDefinition(keyOrConsole: string): SystemDefinition | undefined {
  const norm = (keyOrConsole || '').toLowerCase().trim();
  
  // Direct match by system key
  const byKey = SYSTEM_DEFINITIONS.find((s) => s.systemKey.toLowerCase() === norm);
  if (byKey) return byKey;

  // Match by supported consoles
  return SYSTEM_DEFINITIONS.find((s) =>
    s.supportedConsoles.some((c) => c.toLowerCase() === norm || norm.includes(c.toLowerCase()))
  );
}

export function getSystemLogo(systemKeyOrConsole: string): string {
  const sys = getSystemDefinition(systemKeyOrConsole);
  if (sys) return sys.logo;
  // Fallbacks based on common substrings
  const lower = (systemKeyOrConsole || '').toLowerCase();
  if (lower.includes('switch') || lower.includes('yuzu') || lower.includes('ryujinx')) return logoSwitch;
  if (lower.includes('ps2') || lower.includes('pcsx2')) return logoPs2;
  if (lower.includes('ps3') || lower.includes('rpcs3')) return logoPs3;
  if (lower.includes('psp') || lower.includes('ppsspp')) return logoPsp;
  if (lower.includes('ps1') || lower.includes('duckstation') || lower.includes('epsxe') || lower.includes('playstation')) return logoPlaystation;
  if (lower.includes('gameboy') || lower.includes('gba') || lower.includes('gbc') || lower.includes('gb') || lower.includes('mgba')) return logoGameboy;
  if (lower.includes('snes') || lower.includes('nes') || lower.includes('snes9x') || lower.includes('mesen')) return logoSnes;
  if (lower.includes('3ds') || lower.includes('citra') || lower.includes('lime3ds')) return logo3ds;
  if (lower.includes('ds') || lower.includes('desmume') || lower.includes('melonds')) return logoDs;
  if (lower.includes('gamecube')) return logoGamecube;
  if (lower.includes('wii')) return logoWii;
  if (lower.includes('megadrive') || lower.includes('genesis')) return logoMegadrive;
  if (lower.includes('saturn')) return logoSaturn;
  if (lower.includes('dreamcast') || lower.includes('flycast') || lower.includes('redream')) return logoDreamcast;
  if (lower.includes('360') || lower.includes('xenia')) return logoXbox360;
  if (lower.includes('xbox') || lower.includes('xemu')) return logoXbox;
  return logoRetroarch;
}
