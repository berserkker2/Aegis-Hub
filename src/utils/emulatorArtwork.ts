// High-quality atmospheric banner artworks for retro consoles and emulators
export interface ConsoleArtworkPreset {
  id: string;
  name: string;
  consoleName: string;
  category: 'sony' | 'nintendo' | 'sega' | 'microsoft' | 'other';
  color: string;
  badgeBg: string;
  defaultBanner: string;
}

// Generate styled SVG banners for consoles
function createConsoleBannerSvg(
  primaryColor: string,
  secondaryColor: string,
  accentColor: string,
  title: string,
  subtitle: string,
  symbol: string
): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${primaryColor}"/>
        <stop offset="60%" stop-color="${secondaryColor}"/>
        <stop offset="100%" stop-color="#020617"/>
      </linearGradient>
      <radialGradient id="glow" cx="80%" cy="20%" r="60%">
        <stop offset="0%" stop-color="${accentColor}" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#020617" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="100%" stop-color="#cbd5e1"/>
      </linearGradient>
    </defs>
    
    <!-- Background -->
    <rect width="800" height="450" fill="url(#bg)"/>
    <rect width="800" height="450" fill="url(#glow)"/>
    
    <!-- Geometric accents -->
    <circle cx="680" cy="180" r="160" fill="${accentColor}" opacity="0.08"/>
    <circle cx="680" cy="180" r="110" fill="none" stroke="${accentColor}" stroke-width="2" opacity="0.25"/>
    <circle cx="680" cy="180" r="70" fill="none" stroke="${accentColor}" stroke-width="1.5" stroke-dasharray="6 6" opacity="0.35"/>
    
    <!-- Subtle grid lines -->
    <line x1="0" y1="360" x2="800" y2="360" stroke="#ffffff" stroke-opacity="0.06" stroke-width="1"/>
    <line x1="0" y1="410" x2="800" y2="410" stroke="#ffffff" stroke-opacity="0.04" stroke-width="1"/>
    
    <!-- Console Glyph / Symbol -->
    <text x="680" y="210" fill="${accentColor}" font-size="76" font-family="'Segoe UI', Roboto, sans-serif" font-weight="900" text-anchor="middle" opacity="0.6">${symbol}</text>
    
    <!-- Text Elements -->
    <rect x="50" y="220" width="130" height="28" rx="14" fill="${accentColor}" opacity="0.25"/>
    <text x="115" y="239" fill="${accentColor}" font-size="12" font-family="'Segoe UI', Roboto, sans-serif" font-weight="700" letter-spacing="2" text-anchor="middle">${subtitle.toUpperCase()}</text>
    
    <text x="50" y="305" fill="url(#textGrad)" font-size="44" font-family="'Segoe UI', Roboto, sans-serif" font-weight="900" letter-spacing="-1">${title}</text>
    <text x="50" y="340" fill="#94a3b8" font-size="15" font-family="'Segoe UI', Roboto, sans-serif" font-weight="500">${subtitle} System Experience</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const DEFAULT_CONSOLE_ARTWORKS: Record<string, string> = {
  // All systems master banner
  all: createConsoleBannerSvg('#1e1b4b', '#0f172a', '#a855f7', 'Retro Vault', 'All Systems', '🎮'),

  // PCSX2 / PlayStation 2
  pcsx2: createConsoleBannerSvg('#032052', '#020b24', '#3b82f6', 'PlayStation 2', 'Sony Interactive', 'PS2'),

  // Dolphin / GameCube & Wii
  dolphin: createConsoleBannerSvg('#2e1065', '#0f172a', '#38bdf8', 'GameCube & Wii', 'Nintendo', 'GC'),

  // PPSSPP / PlayStation Portable
  ppsspp: createConsoleBannerSvg('#1e1b4b', '#020617', '#818cf8', 'PSP Portable', 'Sony Interactive', 'PSP'),

  // Ryujinx / Nintendo Switch
  ryujinx: createConsoleBannerSvg('#7f1d1d', '#082f49', '#ef4444', 'Nintendo Switch', 'Hybrid Console', 'NX'),

  // Yuzu / Nintendo Switch
  yuzu: createConsoleBannerSvg('#0c4a6e', '#881337', '#06b6d4', 'Nintendo Switch', 'Hybrid Console', 'NX'),

  // RPCS3 / PlayStation 3
  rpcs3: createConsoleBannerSvg('#450a0a', '#020617', '#f43f5e', 'PlayStation 3', 'Cell Broadband', 'PS3'),

  // DuckStation / PlayStation 1
  duckstation: createConsoleBannerSvg('#1e293b', '#0f172a', '#f59e0b', 'PlayStation 1', '32-Bit Classic', 'PS1'),

  // ePSXe / PlayStation 1
  epsxe: createConsoleBannerSvg('#1e293b', '#0f172a', '#10b981', 'PlayStation 1', '32-Bit Classic', 'PS1'),

  // Cemu / Wii U
  cemu: createConsoleBannerSvg('#0f172a', '#082f49', '#0284c7', 'Nintendo Wii U', 'HD Entertainment', 'WiiU'),

  // DeSmuME / Nintendo DS
  desmume: createConsoleBannerSvg('#1e293b', '#0f172a', '#64748b', 'Nintendo DS', 'Dual Screen', 'NDS'),

  // Citra / Nintendo 3DS
  citra: createConsoleBannerSvg('#831843', '#0f172a', '#ec4899', 'Nintendo 3DS', 'Stereoscopic 3D', '3DS'),

  // RetroArch / Multi-System
  retroarch: createConsoleBannerSvg('#312e81', '#0f172a', '#c084fc', 'RetroArch', 'Multi-System', 'RETRO'),
};

export function getEmulatorDefaultBanner(emulatorId: string, consoleName?: string): string {
  const normId = emulatorId.toLowerCase();
  for (const [key, banner] of Object.entries(DEFAULT_CONSOLE_ARTWORKS)) {
    if (normId.includes(key)) {
      return banner;
    }
  }

  // Fallback by console name
  if (consoleName) {
    const cLower = consoleName.toLowerCase();
    if (cLower.includes('playstation 2') || cLower.includes('ps2')) return DEFAULT_CONSOLE_ARTWORKS.pcsx2;
    if (cLower.includes('playstation 3') || cLower.includes('ps3')) return DEFAULT_CONSOLE_ARTWORKS.rpcs3;
    if (cLower.includes('playstation') || cLower.includes('ps1')) return DEFAULT_CONSOLE_ARTWORKS.duckstation;
    if (cLower.includes('psp') || cLower.includes('portable')) return DEFAULT_CONSOLE_ARTWORKS.ppsspp;
    if (cLower.includes('switch')) return DEFAULT_CONSOLE_ARTWORKS.ryujinx;
    if (cLower.includes('gamecube') || cLower.includes('wii')) return DEFAULT_CONSOLE_ARTWORKS.dolphin;
    if (cLower.includes('ds') || cLower.includes('3ds')) return DEFAULT_CONSOLE_ARTWORKS.citra;
  }

  return DEFAULT_CONSOLE_ARTWORKS.all;
}
