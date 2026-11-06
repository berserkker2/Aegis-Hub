import https from 'https';
import http from 'http';
import { ArtworkSearchResult } from '../../src/types/game';

// Curated high quality distinct images for popular titles
const KNOWN_GAMES_ART: Record<string, { cover: string; banner: string; genres: string[]; dev: string }> = {
  'resident evil 2': {
    cover: 'https://cdn.cloudflare.steamstatic.com/steam/apps/883710/library_600x900.jpg',
    banner: 'https://cdn.cloudflare.steamstatic.com/steam/apps/883710/library_hero.jpg',
    genres: ['Survival Horror', 'Action'],
    dev: 'Capcom',
  },
  'resident evil requiem': {
    cover: 'https://cdn.cloudflare.steamstatic.com/steam/apps/883710/library_600x900.jpg',
    banner: 'https://cdn.cloudflare.steamstatic.com/steam/apps/883710/library_hero.jpg',
    genres: ['Survival Horror', 'Action'],
    dev: 'Capcom',
  },
  'a plague tale: requiem': {
    cover: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1182900/library_600x900.jpg',
    banner: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1182900/library_hero.jpg',
    genres: ['Action-Adventure', 'Stealth', 'Story Rich'],
    dev: 'Asobo Studio',
  },
  'silent hill 2': {
    cover: 'https://cdn.cloudflare.steamstatic.com/steam/apps/2124490/library_600x900.jpg',
    banner: 'https://cdn.cloudflare.steamstatic.com/steam/apps/2124490/library_hero.jpg',
    genres: ['Survival Horror', 'Psychological Horror'],
    dev: 'Bloober Team',
  },
  'the witcher 3': {
    cover: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?auto=format&fit=crop&w=600&q=80',
    banner: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1920&q=80',
    genres: ['RPG', 'Open World', 'Action'],
    dev: 'CD PROJEKT RED',
  },
  'cyberpunk 2077': {
    cover: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=600&q=80',
    banner: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1920&q=80',
    genres: ['RPG', 'Action', 'Cyberpunk'],
    dev: 'CD PROJEKT RED',
  },
  'detroit become human': {
    cover: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1222140/library_600x900.jpg',
    banner: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1222140/library_hero.jpg',
    genres: ['Adventure', 'Story Rich', 'Sci-Fi'],
    dev: 'Quantic Dream',
  },
  'elden ring': {
    cover: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=600&q=80',
    banner: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=80',
    genres: ['Souls-like', 'Action RPG', 'Open World'],
    dev: 'FromSoftware',
  },
  'hades': {
    cover: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=600&q=80',
    banner: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1920&q=80',
    genres: ['Roguelike', 'Action', 'Indie'],
    dev: 'Supergiant Games',
  },
  'balatro': {
    cover: 'https://images.unsplash.com/photo-1520697830682-bbb6e85e2b0b?auto=format&fit=crop&w=600&q=80',
    banner: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=1920&q=80',
    genres: ['Roguelike', 'Deckbuilder', 'Strategy'],
    dev: 'LocalThunk',
  },
  'grand theft auto v': {
    cover: 'https://cdn.cloudflare.steamstatic.com/steam/apps/271590/library_600x900.jpg',
    banner: 'https://cdn.cloudflare.steamstatic.com/steam/apps/271590/library_hero.jpg',
    genres: ['Action', 'Open World', 'Shooter'],
    dev: 'Rockstar North',
  },
  'red dead redemption 2': {
    cover: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1174180/library_600x900.jpg',
    banner: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1174180/library_hero.jpg',
    genres: ['Action', 'Adventure', 'Open World'],
    dev: 'Rockstar Games',
  },
  'hollow knight': {
    cover: 'https://cdn.cloudflare.steamstatic.com/steam/apps/367520/library_600x900.jpg',
    banner: 'https://cdn.cloudflare.steamstatic.com/steam/apps/367520/library_hero.jpg',
    genres: ['Metroidvania', 'Souls-like', '2D'],
    dev: 'Team Cherry',
  },
};

async function fetchJson(url: string, timeoutMs = 4500, retries = 1): Promise<any> {
  const doFetch = () =>
    new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      const req = client.get(
        url,
        {
          headers: {
            'User-Agent': 'AegisHubLauncher/1.0 (https://github.com/aegishub; contact: info@aegishub.local)',
            'Accept': 'application/json',
          },
        },
        (res) => {
          if (res.statusCode === 429) {
            res.resume();
            return reject(new Error('Status 429'));
          }
          if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
            res.resume();
            return reject(new Error(`Status ${res.statusCode}`));
          }
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(e);
            }
          });
        }
      );

      req.on('error', reject);
      req.setTimeout(timeoutMs, () => {
        req.destroy();
        reject(new Error('Timeout'));
      });
    });

  try {
    return await doFetch();
  } catch (err: any) {
    if (retries > 0 && err?.message?.includes('429')) {
      await new Promise((r) => setTimeout(r, 1200));
      return fetchJson(url, timeoutMs, retries - 1);
    }
    throw err;
  }
}

/**
 * Libretro system mapping for console boxarts
 */
export const LIBRETRO_SYSTEM_MAP: Record<string, string[]> = {
  pcsx2: ['Sony - PlayStation 2'],
  ps2: ['Sony - PlayStation 2'],
  ppsspp: ['Sony - PlayStation Portable'],
  psp: ['Sony - PlayStation Portable'],
  desmume: ['Nintendo - Nintendo DS'],
  melonds: ['Nintendo - Nintendo DS'],
  ds: ['Nintendo - Nintendo DS'],
  citra: ['Nintendo - Nintendo 3DS'],
  '3ds': ['Nintendo - Nintendo 3DS'],
  dolphin: ['Nintendo - GameCube', 'Nintendo - Wii'],
  gamecube: ['Nintendo - GameCube'],
  wii: ['Nintendo - Wii'],
  duckstation: ['Sony - PlayStation'],
  epsxe: ['Sony - PlayStation'],
  ps1: ['Sony - PlayStation'],
  playstation: ['Sony - PlayStation'],
  rpcs3: ['Sony - PlayStation 3'],
  ps3: ['Sony - PlayStation 3'],
  cemu: ['Nintendo - Wii U'],
  wiiu: ['Nintendo - Wii U'],
  ryujinx: ['Nintendo - Nintendo Switch'],
  yuzu: ['Nintendo - Nintendo Switch'],
  switch: ['Nintendo - Nintendo Switch'],
  dosbox: ['DOS'],
  dos: ['DOS'],
  scummvm: ['ScummVM', 'DOS'],
  retroarch: ['DOS', 'Sony - PlayStation', 'Nintendo - Game Boy Advance', 'Nintendo - Super Nintendo Entertainment System', 'Sega - Mega Drive - Genesis'],
  mame: ['MAME', 'FBNeo - Arcade Games', 'SNK - Neo Geo'],
  snes9x: ['Nintendo - Super Nintendo Entertainment System'],
  snes: ['Nintendo - Super Nintendo Entertainment System'],
  fceux: ['Nintendo - Nintendo Entertainment System'],
  nestopia: ['Nintendo - Nintendo Entertainment System'],
  nes: ['Nintendo - Nintendo Entertainment System'],
  mgba: ['Nintendo - Game Boy Advance', 'Nintendo - Game Boy Color', 'Nintendo - Game Boy'],
  gameboy: ['Nintendo - Game Boy Advance', 'Nintendo - Game Boy Color', 'Nintendo - Game Boy'],
  gba: ['Nintendo - Game Boy Advance'],
  gbc: ['Nintendo - Game Boy Color'],
  gb: ['Nintendo - Game Boy'],
  project64: ['Nintendo - Nintendo 64'],
  n64: ['Nintendo - Nintendo 64'],
  redream: ['Sega - Dreamcast'],
  dreamcast: ['Sega - Dreamcast'],
  flycast: ['Sega - Dreamcast', 'Sega - Naomi'],
  xemu: ['Microsoft - Xbox'],
  xbox: ['Microsoft - Xbox'],
  xenia: ['Microsoft - Xbox 360'],
  xbox360: ['Microsoft - Xbox 360'],
  genesis: ['Sega - Mega Drive - Genesis'],
  megadrive: ['Sega - Mega Drive - Genesis'],
  saturn: ['Sega - Saturn'],
  amiga: ['Commodore - Amiga'],
};

function checkHeadUrl(url: string, timeoutMs = 2500): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const client = url.startsWith('https') ? https : http;
      const req = client.request(url, { method: 'HEAD', headers: { 'User-Agent': 'AegisHub/1.0' } }, (res) => {
        resolve(res.statusCode === 200);
      });
      req.on('error', () => resolve(false));
      req.setTimeout(timeoutMs, () => {
        req.destroy();
        resolve(false);
      });
      req.end();
    } catch {
      resolve(false);
    }
  });
}

/**
 * Generates accurate candidates for Libretro No-Intro boxart file names
 */
export function generateLibretroTitleVariants(rawTitle: string): string[] {
  let base = rawTitle.replace(/\.[a-z0-9]+$/i, '').trim();
  // Strip leading scene numbers (e.g. 0832 - )
  base = base.replace(/^\d{3,5}\s*[-_.]+\s*/i, '');
  // Strip bracketed/parentheses tags
  base = base.replace(/\(.*?\)/g, ' ').replace(/\[.*?\]/g, ' ').replace(/\s+/g, ' ').trim();

  // Known name fixes
  base = base.replace(/\bStarFox\b/i, 'Star Fox');

  const titleCase = (s: string) =>
    s.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());

  const bases = new Set<string>();
  bases.add(base);
  bases.add(titleCase(base));

  // If contains ' - ', also add version with normalized dash and without dash
  if (base.includes(' - ')) {
    bases.add(base.replace(/\s+-\s+/g, ' - '));
    bases.add(base.replace(/\s+-\s+/g, ' '));
  } else if (base.includes(': ')) {
    bases.add(base.replace(/:\s+/g, ' - '));
    bases.add(base.replace(/:\s+/g, ' '));
  }

  // Pokemon casing
  if (/pokemon/i.test(base)) {
    bases.add(base.replace(/soulsilver/i, 'SoulSilver').replace(/heartgold/i, 'HeartGold'));
    bases.add(titleCase(base).replace(/soulsilver/i, 'SoulSilver').replace(/heartgold/i, 'HeartGold'));
  }

  // The Legend of Zelda -> Legend of Zelda, The - Subtitle
  if (/^The\s+(.+)/i.test(base)) {
    const withoutThe = base.replace(/^The\s+/i, '');
    if (withoutThe.includes(' - ')) {
      const parts = withoutThe.split(' - ');
      bases.add(`${parts[0]}, The - ${parts.slice(1).join(' - ')}`);
    } else {
      bases.add(`${withoutThe}, The`);
    }
  }

  const regionSuffixes = [
    '(USA)',
    '(USA, Australia) (En,Es)',
    '(USA, Europe) (NDSi Enhanced)',
    '(USA) (En,Fr)',
    '(USA) (En,Fr,Es)',
    '(USA) (En,Fr,De,Es,It)',
    '(USA, Australia)',
    '(Europe)',
    '(Europe) (En,Fr,De,Es,It)',
    '(Europe) (En,Fr,De)',
    '(Japan)',
    '(World)',
    '',
  ];

  const fullCandidates: string[] = [];
  for (const b of bases) {
    for (const reg of regionSuffixes) {
      const candidate = reg ? `${b} ${reg}`.trim() : b;
      if (!fullCandidates.includes(candidate)) {
        fullCandidates.push(candidate);
      }
    }
  }
  return fullCandidates;
}

/**
 * Searches Libretro Open Thumbnails repository for authentic console & retro box arts
 */
export async function lookupLibretroArtwork(
  titleOrClean: string,
  platformOrEmuId?: string
): Promise<ArtworkSearchResult | null> {
  const commonSystems = [
    'DOS',
    'Sony - PlayStation',
    'Sony - PlayStation 2',
    'Nintendo - Super Nintendo Entertainment System',
    'Nintendo - Nintendo 64',
    'Nintendo - Game Boy Advance',
    'Nintendo - Nintendo DS',
    'Sega - Mega Drive - Genesis',
  ];
  const systems = platformOrEmuId
    ? LIBRETRO_SYSTEM_MAP[platformOrEmuId.toLowerCase()] || commonSystems
    : commonSystems;

  const titleVariants = generateLibretroTitleVariants(titleOrClean);

  for (const system of systems) {
    for (const variant of titleVariants) {
      const encodedSystem = encodeURIComponent(system);
      const encodedTitle = encodeURIComponent(variant);
      const url = `https://thumbnails.libretro.com/${encodedSystem}/Named_Boxarts/${encodedTitle}.png`;
      const exists = await checkHeadUrl(url);
      if (exists) {
        return {
          title: titleOrClean,
          coverUrl: url,
          bannerUrl: url,
          genres: ['Console / Retro', system.replace(/^[^-]+-\s*/, '')],
        };
      }
    }
  }
  return null;
}

/**
 * Searches Wikipedia's official articles for high-definition original box art
 */
export async function lookupWikipediaArtwork(cleanTitle: string): Promise<ArtworkSearchResult | null> {
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
      cleanTitle + ' video game'
    )}&format=json&utf8=1`;
    const searchRes = await fetchJson(searchUrl, 3500);
    const top = searchRes?.query?.search?.[0];
    if (top && top.title) {
      const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(top.title)}`;
      const summaryRes = await fetchJson(summaryUrl, 3500);
      const cover = summaryRes?.originalimage?.source || summaryRes?.thumbnail?.source;
      if (cover) {
        return {
          title: summaryRes.title || cleanTitle,
          coverUrl: cover,
          bannerUrl: cover,
          genres: ['Console / Retro'],
          description: summaryRes.extract,
        };
      }
    }
  } catch {}
  return null;
}

/**
 * Strips release tags, version numbers, brackets and file extensions to get clean game title
 */
export function cleanGameTitle(rawTitle: string): string {
  let t = rawTitle.replace(/\.[a-z0-9]+$/i, '');
  // Remove leading ROM scene numbers like '4840 - ', '0832 - ', '3055 - ', '5535_-_'
  t = t.replace(/^\d{3,5}\s*[-_.]+\s*/i, '');
  // Remove version numbers
  t = t.replace(/\bv?\d+(\.\d+)+\b/gi, '');
  // Remove dump tags, region tags
  t = t.replace(/\(.*?\)/g, ' ');
  t = t.replace(/\[.*?\]/g, ' ');

  // Handle specific known translations/hacks
  if (/^b-gyakuken2/i.test(t)) return 'Ace Attorney Investigations 2';
  if (/^tott_en|Tales_Of_The_Tempest/i.test(t)) return 'Tales of the Tempest';
  if (/^Fata\s*lFrame\s*3/i.test(t)) return 'Fatal Frame III - The Tormented';
  if (/^Fata\s*lFrame\s*2/i.test(t)) return 'Fatal Frame II - Crimson Butterfly';
  if (/^Fata\s*lFrame/i.test(t)) return 'Fatal Frame';
  if (/^disgaea\s*psp/i.test(t)) return 'Disgaea - Afternoon of Darkness';
  if (/^brave\s*story/i.test(t)) return 'Brave Story - New Traveler';

  // Remove release tags
  t = t.replace(/\b(undub|independent|repack|fitgirl|codex|cpi|flt|skidrow|plaza|goldberg|rip|portable|setup|build\s*\d+|gog|steam|x64|x86|win64|crack|cracked|trashman|legacy|venom|xenophobia|supremacy|sweetnds|ddumpers)\b/gi, ' ');

  // Expand CamelCase like FatalFrame3 -> Fatal Frame 3
  if (/^[a-z]+[A-Z0-9]/i.test(t) && !t.includes(' ')) {
    t = t.replace(/([a-z])([A-Z])/g, '$1 $2');
    t = t.replace(/([a-zA-Z])(\d+)/g, '$1 $2');
  }
  // Handle ', The'
  t = t.replace(/,\s*The\b/i, '');
  if (/^Legend of Zelda/i.test(t)) {
    t = 'The ' + t;
  }
  t = t.replace(/[-_.]/g, ' ');
  t = t.replace(/[™®:]/g, ' ');
  return t.replace(/\s+/g, ' ').trim();
}

/**
 * Searches online across Libretro Boxarts, Wikipedia, Steam Store and GOG databases for game artwork
 */
export async function lookupGameArtwork(title: string, platformOrEmuId?: string): Promise<ArtworkSearchResult | null> {
  const cleanTitle = cleanGameTitle(title);
  if (!cleanTitle) return null;

  // 1. Check known games first
  const lowerTitle = cleanTitle.toLowerCase();
  for (const [key, val] of Object.entries(KNOWN_GAMES_ART)) {
    if (lowerTitle.includes(key) || key.includes(lowerTitle)) {
      return {
        title,
        coverUrl: val.cover,
        bannerUrl: val.banner,
        genres: val.genres,
        developer: val.dev,
      };
    }
  }

  // 2. If it's an emulator or console title, prioritize authentic console databases (Libretro & Wikipedia)
  const isEmulator = platformOrEmuId && (platformOrEmuId in LIBRETRO_SYSTEM_MAP || platformOrEmuId === 'emulator');
  if (isEmulator) {
    // Check Libretro box arts repository
    const libretroArt = await lookupLibretroArtwork(cleanTitle, platformOrEmuId);
    if (libretroArt) return libretroArt;

    // Check Wikipedia official box art
    const wikiArt = await lookupWikipediaArtwork(cleanTitle);
    if (wikiArt) return wikiArt;
  }

  // 3. Query Steam Store Search API (millions of PC titles)
  try {
    const searchUrl = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(
      cleanTitle
    )}&l=english&cc=US`;
    const res = await fetchJson(searchUrl, 3500);

    if (res && res.items && res.items.length > 0) {
      const match = res.items[0];
      const appId = match.id;
      const matchedTitle = match.name;

      const coverUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`;
      const bannerUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_hero.jpg`;

      // Try fetching details for genres and dev
      let genres = ['Action', 'Adventure'];
      let dev = '';
      try {
        const detailRes = await fetchJson(`https://store.steampowered.com/api/appdetails?appids=${appId}`, 3000);
        if (detailRes && detailRes[appId] && detailRes[appId].data) {
          const d = detailRes[appId].data;
          if (Array.isArray(d.genres)) {
            genres = d.genres.map((g: any) => g.description);
          }
          if (Array.isArray(d.developers) && d.developers.length > 0) {
            dev = d.developers[0];
          }
        }
      } catch {}

      return {
        title: matchedTitle || title,
        coverUrl,
        bannerUrl,
        genres,
        developer: dev,
      };
    }
  } catch {}

  // 4. Query GOG Catalog API (DRM-Free and Classic PC titles)
  try {
    const gogUrl = `https://catalog.gog.com/v1/catalog?query=${encodeURIComponent(cleanTitle)}`;
    const gogRes = await fetchJson(gogUrl, 3500);

    if (gogRes && gogRes.products && gogRes.products.length > 0) {
      const p = gogRes.products[0];
      if (p.coverVertical || p.coverHorizontal) {
        return {
          title: p.title || title,
          coverUrl: p.coverVertical || p.coverHorizontal,
          bannerUrl: p.coverHorizontal || p.coverVertical,
          genres: Array.isArray(p.genres) ? p.genres.map((g: any) => g.name || g) : ['PC Game'],
          developer: Array.isArray(p.developers) ? p.developers[0] : undefined,
        };
      }
    }
  } catch {}

  // 5. Fallback: check Wikipedia
  const wikiArt = await lookupWikipediaArtwork(cleanTitle);
  if (wikiArt) return wikiArt;

  // 6. Fallback: check Libretro common systems (DOS, PS1, PS2, SNES, Genesis)
  const libretroFallback = await lookupLibretroArtwork(cleanTitle);
  if (libretroFallback) return libretroFallback;

  // 7. Fallback: check Internet Archive for Vintage PC and Retro Software Box Art
  const archiveArt = await lookupArchiveOrgArtwork(cleanTitle);
  if (archiveArt) return archiveArt;

  // 8. Fallback: query Web Game Database (MobyGames, SteamGridDB, LaunchBox via Web Search)
  const webArt = await lookupWebArtwork(cleanTitle);
  if (webArt) return webArt;

  return null;
}

/**
 * Searches Internet Archive's massive software and vintage PC library for box scans
 */
export async function lookupArchiveOrgArtwork(cleanTitle: string): Promise<ArtworkSearchResult | null> {
  try {
    const archUrl = `https://archive.org/advancedsearch.php?q=title%3A(${encodeURIComponent(
      cleanTitle
    )})+AND+mediatype%3A(software)&fl[]=identifier,title,description&rows=2&output=json`;
    const res = await fetchJson(archUrl, 3500);
    const doc = res?.response?.docs?.[0];
    if (doc && doc.identifier) {
      const imgUrl = `https://archive.org/services/img/${doc.identifier}`;
      return {
        title: doc.title || cleanTitle,
        coverUrl: imgUrl,
        bannerUrl: imgUrl,
        genres: ['Classic / Vintage'],
        description: doc.description,
      };
    }
  } catch {}
  return null;
}

/**
 * Searches Web Game Databases (MobyGames, SteamGridDB, LaunchBox, Fanart via DuckDuckGo)
 */
export async function lookupWebArtwork(cleanTitle: string): Promise<ArtworkSearchResult | null> {
  const BROWSER_UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

  try {
    const q = `${cleanTitle} video game box art cover`;
    const tokenRes = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(q)}`, {
      headers: { 'User-Agent': BROWSER_UA },
      signal: AbortSignal.timeout(3500),
    });
    const html = await tokenRes.text();
    const vqdMatch = html.match(/vqd=([0-9-]+)/);
    if (!vqdMatch) return null;

    const apiUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(q)}&vqd=${vqdMatch[1]}&f=,,,type:photo`;
    const imgRes = await fetch(apiUrl, {
      headers: { 'User-Agent': BROWSER_UA, 'Referer': 'https://duckduckgo.com/' },
      signal: AbortSignal.timeout(3500),
    });

    if (!imgRes.ok) return null;
    const data = await imgRes.json();
    const coverUrl = data?.results?.[0]?.image;
    if (!coverUrl) return null;

    let bannerUrl = coverUrl;
    try {
      const wallUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(cleanTitle + ' video game wallpaper')}&vqd=${vqdMatch[1]}&f=,,,type:wallpaper`;
      const wallRes = await fetch(wallUrl, {
        headers: { 'User-Agent': BROWSER_UA, 'Referer': 'https://duckduckgo.com/' },
        signal: AbortSignal.timeout(3000),
      });
      if (wallRes.ok) {
        const wallData = await wallRes.json();
        if (wallData?.results?.[0]?.image) {
          bannerUrl = wallData.results[0].image;
        }
      }
    } catch {}

    return {
      title: cleanTitle,
      coverUrl,
      bannerUrl,
      genres: ['PC Game'],
    };
  } catch {}
  return null;
}

export function generateDistinctArtwork(title: string): { coverUrl: string; bannerUrl: string; genres: string[] } {
  const enc = encodeURIComponent(title.slice(0, 24));
  // Vertical poster with distinct gradient and title
  const coverSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900"><defs><linearGradient id="p" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%231e293b"/><stop offset="100%" stop-color="%23090d16"/></linearGradient></defs><rect width="600" height="900" fill="url(%23p)"/><circle cx="300" cy="400" r="90" fill="%233b82f6" opacity="0.15"/><polygon points="280,360 350,400 280,440" fill="%233b82f6"/><text x="300" y="560" fill="%23f1f5f9" font-size="28" font-family="sans-serif" font-weight="bold" text-anchor="middle">${enc}</text><text x="300" y="600" fill="%2364748b" font-size="16" font-family="sans-serif" text-anchor="middle">PC GAME</text></svg>`;

  // Horizontal wide wallpaper banner with distinct wider layout
  const bannerSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><defs><linearGradient id="b" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%230f172a"/><stop offset="100%" stop-color="%23020617"/></linearGradient><radialGradient id="r" cx="70%" cy="40%" r="50%"><stop offset="0%" stop-color="%234338ca" stop-opacity="0.3"/><stop offset="100%" stop-color="%23000000" stop-opacity="0"/></radialGradient></defs><rect width="1920" height="1080" fill="url(%23b)"/><rect width="1920" height="1080" fill="url(%23r)"/><text x="200" y="580" fill="%23e2e8f0" font-size="64" font-family="sans-serif" font-weight="800">${enc}</text></svg>`;

  return { coverUrl: coverSvg, bannerUrl: bannerSvg, genres: ['Action', 'PC Game'] };
}

function cleanWikiValue(str: string): string {
  if (!str) return '';
  let s = str
    .replace(/<ref[\s\S]*?<\/ref>/gi, '')
    .replace(/<ref[^>]*\/>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<br\s*\/?>[\s\S]*$/i, '')
    .replace(/<[^>]+>/g, '');

  // 1. Handle vgrelease template
  // e.g. {{vgrelease|JP/NA|Tecmo|EU/AU|[[Take-Two Interactive]]}}
  // or {{vgrelease|JP|[[Sony Computer Entertainment]]|NA|[[Atlus USA]]|EU|[[505 Games]]}}
  if (/vgrelease/i.test(s)) {
    const innerMatch = s.match(/\{\{vgrelease\s*\|([^}]+)\}\}/i);
    if (innerMatch) {
      const tokens = innerMatch[1].split('|').map((t) =>
        t.replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, (_m, p) => p).trim()
      ).filter(Boolean);
      const regionRegex = /^(?:JP|NA|EU|AU|PAL|WW|US|UK|INT|ROW|ASIA|KOR|CHN|GER|FRA)(?:\/(?:JP|NA|EU|AU|PAL|WW|US|UK|INT|ROW|ASIA))?$/i;
      const names: string[] = [];
      for (let i = 0; i < tokens.length; i++) {
        const tok = tokens[i];
        if (tok.includes('=')) {
          const val = tok.split('=')[1].trim();
          if (val && !regionRegex.test(val)) names.push(val);
        } else if (regionRegex.test(tok) && i + 1 < tokens.length) {
          names.push(tokens[i + 1].trim());
          i++;
        } else if (!regionRegex.test(tok)) {
          names.push(tok);
        }
      }
      if (names.length > 0) {
        s = Array.from(new Set(names.filter((n) => n.length > 1))).join(', ');
      }
    }
  }

  // 2. Strip efn footnotes like {{efn|...}}
  s = s.replace(/\{\{efn[\s\S]*?\}\}/gi, '');

  // 3. Resolve all wikilinks [[Target|Display]] -> Display
  s = s.replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, (_m, p) => p);

  // 3. Strip any leftover template syntax, template arguments (e.g. |language=ja}}), dangling refs
  s = s.replace(/\{\{[^}]*\}\}/g, '');
  s = s.replace(/\{\{[^|}]*\|/g, '');
  s = s.replace(/\|[a-z0-9_-]+\s*=\s*[^|}\s]+/gi, '');
  s = s.replace(/<\/?[a-z0-9_-]+>/gi, '');
  s = s.replace(/[{}|]/g, ' ');
  s = s.replace(/['*]/g, '');
  s = s.replace(/&nbsp;/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  s = s.replace(/^(?:ref|\/ref)\b/gi, '').replace(/\b(?:ref|\/ref)$/gi, '').trim();

  return s;
}

function pickBestWikiMatch(
  candidates: Array<{ title: string; snippet?: string }>,
  targetTitle: string
): { title: string; snippet?: string } | null {
  if (!candidates || candidates.length === 0) return null;

  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const targetNorm = norm(targetTitle);
  const targetWords = targetNorm.split(' ').filter((w) => w.length > 1);
  const targetNumerals = targetNorm.match(/\b(i|ii|iii|iv|v|vi|vii|viii|ix|x|\d+)\b/g) || [];

  let bestCandidate = candidates[0];
  let highestScore = -999;

  for (const c of candidates) {
    const cTitleNorm = norm(c.title.replace(/\s*\([^)]*\)$/, ''));
    let score = 0;

    if (cTitleNorm === targetNorm) {
      score += 100;
    } else if (cTitleNorm.startsWith(targetNorm) || targetNorm.startsWith(cTitleNorm)) {
      score += 50;
    }

    const cWords = new Set(cTitleNorm.split(' ').filter((w) => w.length > 1));
    let matchedWords = 0;
    for (const w of targetWords) {
      if (cWords.has(w)) matchedWords++;
    }
    score += matchedWords * 10;

    const cNumerals = cTitleNorm.match(/\b(i|ii|iii|iv|v|vi|vii|viii|ix|x|\d+)\b/g) || [];
    for (const num of targetNumerals) {
      if (cNumerals.includes(num)) {
        score += 35;
      } else {
        score -= 25;
      }
    }
    for (const num of cNumerals) {
      if (!targetNumerals.includes(num)) {
        score -= 25;
      }
    }

    const targetParts = targetTitle.split(/[:\-]/);
    if (targetParts.length > 1) {
      const subtitleWords = norm(targetParts.slice(1).join(' ')).split(' ').filter((w) => w.length > 2);
      for (const sw of subtitleWords) {
        if (cWords.has(sw)) {
          score += 25;
        } else {
          score -= 15;
        }
      }
    }

    if (/list of|franchise|series|characters|soundtrack/i.test(c.title)) {
      score -= 60;
    }

    if (score > highestScore) {
      highestScore = score;
      bestCandidate = c;
    }
  }

  return bestCandidate;
}

export interface ScrapedGameMetadata {
  title?: string;
  coverUrl?: string;
  bannerUrl?: string;
  description?: string;
  developer?: string;
  publisher?: string;
  releaseDate?: string;
  genres?: string[];
}

/**
 * Automatically scrapes high-resolution covers, authentic banners, descriptions,
 * developer, publisher, release year, and genres for emulated retro titles.
 */
export async function scrapeEmulatorGameMetadata(
  rawTitle: string,
  platformOrEmuId?: string
): Promise<ScrapedGameMetadata | null> {
  const cleanTitle = cleanGameTitle(rawTitle);
  if (!cleanTitle && !rawTitle) return null;

  const result: ScrapedGameMetadata = {
    title: cleanTitle || rawTitle,
  };

  // 1. Check Libretro authentic box arts CDN (top priority for authentic console packaging)
  try {
    let libretro = await lookupLibretroArtwork(rawTitle, platformOrEmuId);
    if (!libretro && cleanTitle && cleanTitle !== rawTitle) {
      libretro = await lookupLibretroArtwork(cleanTitle, platformOrEmuId);
    }
    if (libretro && libretro.coverUrl) {
      result.coverUrl = libretro.coverUrl;
      result.bannerUrl = libretro.bannerUrl || libretro.coverUrl;
      if (libretro.genres && libretro.genres.length > 0) {
        result.genres = libretro.genres;
      }
    }
  } catch {}

  // 2. Query Wikipedia for synopsis, original cover, developer, publisher, and year
  try {
    const searchQueries = [
      rawTitle.includes(' - ') ? rawTitle.replace(/\s+-\s+/g, ': ') + ' video game' : '',
      cleanTitle ? cleanTitle + ' video game' : '',
      cleanTitle,
      rawTitle,
    ].filter(Boolean);

    let topMatch: any = null;
    for (const q of searchQueries) {
      try {
        const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
          q
        )}&format=json&utf8=1`;
        const searchRes = await fetchJson(searchUrl, 3800);
        const candidates = searchRes?.query?.search;
        if (candidates && candidates.length > 0) {
          const best = pickBestWikiMatch(candidates, cleanTitle || rawTitle);
          if (best) {
            topMatch = best;
            break;
          }
        }
      } catch {}
    }

    if (topMatch && topMatch.title) {
      // 2a. Fetch Summary (Synopsis & Official Image)
      try {
        const sumUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topMatch.title)}`;
        const sumRes = await fetchJson(sumUrl, 3800);
        if (sumRes?.extract) {
          result.description = sumRes.extract.trim();
        }
        const wikiImage = sumRes?.originalimage?.source || sumRes?.thumbnail?.source;
        if (wikiImage) {
          if (!result.coverUrl) result.coverUrl = wikiImage;
          if (!result.bannerUrl) result.bannerUrl = wikiImage;
        }
      } catch {}

      // 2b. Fetch Wikitext Section 0 (Infobox: developer, publisher, release date, genres)
      try {
        const parseUrl = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(
          topMatch.title
        )}&prop=wikitext&section=0&format=json`;
        const parseRes = await fetchJson(parseUrl, 3800);
        const wikitext = parseRes?.parse?.wikitext?.['*'] || '';

        if (wikitext) {
          // Pre-strip all <ref>...</ref>, <ref/> and comments from wikitext to prevent nested citations inside developer from matching |publisher= inside {{cite web}}
          const cleanInfobox = wikitext
            .replace(/<ref[\s\S]*?<\/ref>/gi, '')
            .replace(/<ref[^>]*\/>/gi, '')
            .replace(/<!--[\s\S]*?-->/g, '');

          const devMatch = cleanInfobox.match(/\|\s*developer\s*=\s*([^\n]+)/i);
          if (devMatch) {
            const dev = cleanWikiValue(devMatch[1]);
            if (dev && !dev.includes('{{') && dev.length < 80) {
              result.developer = dev;
            }
          }

          const pubMatch = cleanInfobox.match(/\|\s*publisher\s*=\s*([^\n]+)/i);
          if (pubMatch) {
            const pub = cleanWikiValue(pubMatch[1]);
            if (pub && !pub.includes('{{') && pub.length < 80) {
              result.publisher = pub;
            }
          }

          if (result.developer && !result.publisher) {
            result.publisher = result.developer;
          }

          const relMatch = wikitext.match(/\|\s*released?\s*=\s*([^\n]+)/i);
          const yearMatch = (relMatch ? relMatch[1] : wikitext).match(/\b(19\d\d|20\d\d)\b/);
          if (yearMatch) {
            result.releaseDate = yearMatch[1];
          }

          const genreMatch = wikitext.match(/\|\s*genres?\s*=\s*([^\n]+)/i);
          if (genreMatch) {
            const rawGenres = genreMatch[1];
            const links = [...rawGenres.matchAll(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g)]
              .map((m) => m[1])
              .filter((g) => !/video game|list of/i.test(g) && g.length > 2);
            if (links.length > 0) {
              result.genres = links;
            }
          }
        }
      } catch {}
    }
  } catch {}

  // 3. Fallback to Steam Store API for HD banner or genres if missing (only if title matches)
  if (!result.coverUrl || !result.bannerUrl || !result.genres) {
    try {
      const searchUrl = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(
        cleanTitle
      )}&l=english&cc=US`;
      const res = await fetchJson(searchUrl, 3500);
      if (res?.items?.[0]) {
        const item = res.items[0];
        const normItem = (item.name || '').toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
        const normTarget = cleanTitle.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
        if (normItem.includes(normTarget) || normTarget.includes(normItem)) {
          if (!result.coverUrl) {
            result.coverUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${item.id}/library_600x900.jpg`;
          }
          if (!result.bannerUrl) {
            result.bannerUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${item.id}/library_hero.jpg`;
          }
        }
      }
    } catch {}
  }

  return result;
}
