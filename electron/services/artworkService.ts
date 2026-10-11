import https from 'https';
import http from 'http';
import { ArtworkSearchResult } from '../../src/types/game';

// Curated high quality distinct images for popular titles
const KNOWN_GAMES_ART: Record<string, { cover: string; banner: string; genres: string[]; dev: string }> = {
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

function fetchJson(url: string, timeoutMs = 4000): Promise<any> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { headers: { 'User-Agent': 'NexusGameLauncher/1.0' } }, (res) => {
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
    });

    req.on('error', reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

export async function lookupGameArtwork(title: string): Promise<ArtworkSearchResult | null> {
  const cleanTitle = title
    .replace(/[™®:]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  // 1. Check known games first
  for (const [key, val] of Object.entries(KNOWN_GAMES_ART)) {
    if (cleanTitle.includes(key)) {
      return {
        title,
        coverUrl: val.cover,
        bannerUrl: val.banner,
        genres: val.genres,
        developer: val.dev,
      };
    }
  }

  // 2. Query Steam Store Search API (works for almost any PC game regardless of store)
  try {
    const searchUrl = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(
      cleanTitle.slice(0, 30)
    )}&l=english&cc=US`;
    const res = await fetchJson(searchUrl, 3000);

    if (res && res.items && res.items.length > 0) {
      const match = res.items[0];
      const appId = match.id;
      const matchedTitle = match.name;

      const coverUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`;
      const bannerUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_hero.jpg`;

      return {
        title: matchedTitle || title,
        coverUrl,
        bannerUrl,
        genres: ['Action', 'Adventure'],
      };
    }
  } catch {
    // API search timeout or network error, fallback to SVG artwork
  }

  return null;
}

export function generateDistinctArtwork(title: string): { coverUrl: string; bannerUrl: string } {
  const enc = encodeURIComponent(title.slice(0, 24));
  // Vertical poster with distinct gradient and title
  const coverSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900"><defs><linearGradient id="p" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%231e293b"/><stop offset="100%" stop-color="%23090d16"/></linearGradient></defs><rect width="600" height="900" fill="url(%23p)"/><circle cx="300" cy="400" r="90" fill="%233b82f6" opacity="0.15"/><polygon points="280,360 350,400 280,440" fill="%233b82f6"/><text x="300" y="560" fill="%23f1f5f9" font-size="28" font-family="sans-serif" font-weight="bold" text-anchor="middle">${enc}</text><text x="300" y="600" fill="%2364748b" font-size="16" font-family="sans-serif" text-anchor="middle">PC GAME</text></svg>`;

  // Horizontal wide wallpaper banner with distinct wider layout
  const bannerSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><defs><linearGradient id="b" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%230f172a"/><stop offset="100%" stop-color="%23020617"/></linearGradient><radialGradient id="r" cx="70%" cy="40%" r="50%"><stop offset="0%" stop-color="%234338ca" stop-opacity="0.3"/><stop offset="100%" stop-color="%23000000" stop-opacity="0"/></radialGradient></defs><rect width="1920" height="1080" fill="url(%23b)"/><rect width="1920" height="1080" fill="url(%23r)"/><text x="200" y="580" fill="%23e2e8f0" font-size="64" font-family="sans-serif" font-weight="800">${enc}</text></svg>`;

  return { coverUrl: coverSvg, bannerUrl: bannerSvg };
}
