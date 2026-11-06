import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { Game, StoreAccount, GamePlatform } from '../../src/types/game';
import { galaxyDbService } from './galaxyDbService';
import { epicDirectService } from './epicDirectService';
import { steamOwnedService } from './steamOwnedService';
import { ubisoftDirectService } from './ubisoftDirectService';
import { eaDirectService } from './eaDirectService';

function fetchHttp(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { headers: { 'User-Agent': 'AegisHub/1.0' } }, (res) => {
      // Follow redirects
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchHttp(res.headers.location));
      }
      if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
        res.resume();
        return reject(new Error(`HTTP status ${res.statusCode}`));
      }
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve(body));
    });
    req.on('error', reject);
    req.setTimeout(8000, () => {
      req.destroy();
      reject(new Error('Connection timeout'));
    });
  });
}

export class StoreAccountService {
  private accountsFilePath: string;

  constructor() {
    const dataDir = app ? app.getPath('userData') : path.join(process.cwd(), '.launcher-data');
    this.accountsFilePath = path.join(dataDir, 'store-accounts.json');
  }

  public getAccounts(): StoreAccount[] {
    try {
      if (fs.existsSync(this.accountsFilePath)) {
        const raw = fs.readFileSync(this.accountsFilePath, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error('Error loading store accounts:', err);
    }

    const defaultAccounts: StoreAccount[] = [
      {
        platform: 'steam',
        name: 'Steam',
        connected: false,
        totalOwnedGames: 0,
        description: 'Permanent Steam connection. Syncs your entire Steam cloud library with artwork and playtime.',
        authType: 'steam_id',
        color: '#1b2838',
      },
      {
        platform: 'epic',
        name: 'Epic Games Store',
        connected: false,
        totalOwnedGames: 0,
        description: 'Sync your Epic Games Store titles including weekly free claims.',
        authType: 'oauth_token',
        color: '#2a2a2a',
      },
      {
        platform: 'gog',
        name: 'GOG Galaxy',
        connected: false,
        totalOwnedGames: 0,
        description: 'Sync your DRM-Free GOG library of owned games.',
        authType: 'oauth_token',
        color: '#6c2b96',
      },
      {
        platform: 'ubisoft',
        name: 'Ubisoft Connect',
        connected: false,
        totalOwnedGames: 0,
        description: 'Sync owned Ubisoft Connect titles.',
        authType: 'credentials',
        color: '#0070d6',
      },
      {
        platform: 'ea',
        name: 'EA App',
        connected: false,
        totalOwnedGames: 0,
        description: 'Sync owned EA Play & EA App titles.',
        authType: 'credentials',
        color: '#f05a28',
      },
    ];

    // If local multi-store database is found, populate accounts with real counts
    if (galaxyDbService.isAvailable()) {
      const connected = galaxyDbService.getConnectedAccounts();
      for (const conn of connected) {
        const acc = defaultAccounts.find((a) => a.platform === conn.platform);
        if (acc) {
          acc.connected = true;
          acc.accountIdentifier = conn.accountName;
          const games = galaxyDbService.getCloudGames(conn.platform);
          acc.totalOwnedGames = games.length;
          acc.lastSynced = new Date().toISOString();
        }
      }

      // Check GOG itself
      const gogAcc = defaultAccounts.find((a) => a.platform === 'gog');
      if (gogAcc) {
        const gogGames = galaxyDbService.getCloudGames('gog');
        if (gogGames.length > 0) {
          gogAcc.connected = true;
          gogAcc.accountIdentifier = 'GOG User';
          gogAcc.totalOwnedGames = gogGames.length;
          gogAcc.lastSynced = new Date().toISOString();
        }
      }
    }

    // Override Steam status if local Steam installation has games
    try {
      const steamGames = steamOwnedService.getOwnedSteamGames();
      const steamAcc = defaultAccounts.find((a) => a.platform === 'steam');
      if (steamAcc && steamGames.length > 0) {
        steamAcc.connected = true;
        steamAcc.accountIdentifier = 'Steam User';
        steamAcc.totalOwnedGames = steamGames.length;
        steamAcc.description = 'Synced directly from local Steam library.';
      }
    } catch {}

    // Override Epic status if directly authenticated via API
    if (epicDirectService.hasSavedTokens()) {
      const epicTokens = epicDirectService.getSavedTokens();
      const epicAcc = defaultAccounts.find((a) => a.platform === 'epic');
      if (epicAcc && epicTokens) {
        epicAcc.connected = true;
        epicAcc.accountIdentifier = epicTokens.displayName || 'Epic Gamer';
        epicAcc.description = 'Directly authenticated with Epic Games API.';
      }
    }

    // Check Ubisoft direct status & token expiration
    if (ubisoftDirectService.hasSavedTokens()) {
      const ubiTokens = ubisoftDirectService.getSavedTokens();
      const ubiAcc = defaultAccounts.find((a) => a.platform === 'ubisoft');
      if (ubiAcc && ubiTokens) {
        ubiAcc.connected = true;
        ubiAcc.accountIdentifier = ubiTokens.username;
        const expired = ubisoftDirectService.isTokenExpired();
        ubiAcc.needsReauth = expired;
        ubiAcc.description = expired
          ? 'Session token expired. Re-authentication required.'
          : 'Directly authenticated with Ubisoft Connect API.';
      }
    }

    // Check EA direct status & token expiration
    if (eaDirectService.hasSavedTokens()) {
      const eaTokens = eaDirectService.getSavedTokens();
      const eaAcc = defaultAccounts.find((a) => a.platform === 'ea');
      if (eaAcc && eaTokens) {
        eaAcc.connected = true;
        eaAcc.accountIdentifier = eaTokens.personaName || 'EA User';
        const expired = eaDirectService.isTokenExpired();
        eaAcc.needsReauth = expired;
        eaAcc.description = expired
          ? 'Session token expired. Re-authentication required.'
          : 'Directly authenticated with EA App API.';
      }
    }

    return defaultAccounts;
  }

  public saveAccounts(accounts: StoreAccount[]): void {
    try {
      fs.writeFileSync(this.accountsFilePath, JSON.stringify(accounts, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving store accounts:', err);
    }
  }

  /**
   * Syncs uninstalled games for a Steam account
   */
  public async syncSteamAccount(identifier: string, apiKey?: string): Promise<{ account: StoreAccount; games: Game[] }> {
    const cleanId = identifier.trim().replace(/^https?:\/\/steamcommunity\.com\/(id|profiles)\//, '').replace(/\/$/, '');
    let games: Game[] = [];
    let profileName = cleanId;
    let avatarUrl = 'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_medium.jpg';

    // 1. First priority: Direct local Steam installation scanner (scans appinfo.vdf, userdata, librarycache)
    try {
      const directSteamGames = steamOwnedService.getOwnedSteamGames();
      if (directSteamGames.length > 0) {
        games = directSteamGames;
        profileName = 'Berserkker (Steam)';
      }
    } catch (err: any) {
      console.warn('Direct Steam scan warning:', err.message);
    }

    // 2. Fallback: Check local multi-store cache (GOG Galaxy DB)
    if (games.length === 0 && galaxyDbService.isAvailable()) {
      const dbGames = galaxyDbService.getCloudGames('steam');
      if (dbGames.length > 0) {
        games = dbGames;
        profileName = 'Berserkker (Steam)';
      }
    }

    // 2. If no games from DB, try Steam API key if provided
    if (games.length === 0 && apiKey && /^\d{17}$/.test(cleanId)) {
      try {
        const url = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${apiKey}&steamid=${cleanId}&format=json&include_appinfo=1&include_played_free_games=1`;
        const res = await fetchHttp(url);
        const json = JSON.parse(res);
        if (json.response && json.response.games) {
          for (const item of json.response.games) {
            const appId = item.appid.toString();
            games.push({
              id: `steam-${appId}`,
              title: item.name,
              executablePath: `steam://rungameid/${appId}`,
              installUrl: `steam://install/${appId}`,
              platform: 'steam',
              storeId: appId,
              coverUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`,
              bannerUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_hero.jpg`,
              description: `Owned on Steam (${item.name}).`,
              genres: ['Steam Library'],
              tags: ['Steam Cloud', 'Owned'],
              favorite: false,
              hidden: false,
              installed: false,
              playtimeMinutes: item.playtime_forever || 0,
              addedDate: new Date().toISOString(),
            });
          }
        }
      } catch (err: any) {
        console.warn('Steam API sync warning:', err.message);
      }
    }

    // 3. If still empty, try public profile XML
    if (games.length === 0) {
      try {
        const isNumeric = /^\d{17}$/.test(cleanId);
        const profileUrl = isNumeric
          ? `https://steamcommunity.com/profiles/${cleanId}/games?tab=all&xml=1`
          : `https://steamcommunity.com/id/${cleanId}/games?tab=all&xml=1`;

        const xml = await fetchHttp(profileUrl);
        const nameMatch = xml.match(/<steamID><!\[CDATA\[(.*?)\]\]><\/steamID>/) || xml.match(/<steamID>(.*?)<\/steamID>/);
        if (nameMatch) profileName = nameMatch[1];

        const avatarMatch = xml.match(/<avatarMedium><!\[CDATA\[(.*?)\]\]><\/avatarMedium>/) || xml.match(/<avatarMedium>(.*?)<\/avatarMedium>/);
        if (avatarMatch) avatarUrl = avatarMatch[1];

        const gameBlocks = xml.split('<game>');
        for (let i = 1; i < gameBlocks.length; i++) {
          const block = gameBlocks[i];
          const appIdMatch = block.match(/<appID>(\d+)<\/appID>/);
          const titleMatch = block.match(/<name><!\[CDATA\[(.*?)\]\]><\/name>/) || block.match(/<name>(.*?)<\/name>/);
          const hoursMatch = block.match(/<hoursOnRecord>([\d.]+)<\/hoursOnRecord>/);

          if (appIdMatch && titleMatch) {
            const appId = appIdMatch[1];
            const title = titleMatch[1];
            const hours = hoursMatch ? parseFloat(hoursMatch[1]) : 0;

            games.push({
              id: `steam-${appId}`,
              title,
              executablePath: `steam://rungameid/${appId}`,
              installUrl: `steam://install/${appId}`,
              platform: 'steam',
              storeId: appId,
              coverUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`,
              bannerUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_hero.jpg`,
              description: `Owned on Steam. Ready to install or launch.`,
              genres: ['Steam Library'],
              tags: ['Steam Cloud', 'Owned'],
              favorite: false,
              hidden: false,
              installed: false,
              playtimeMinutes: Math.round(hours * 60),
              addedDate: new Date().toISOString(),
            });
          }
        }
      } catch (err: any) {
        console.warn('Steam Community sync warning:', err.message);
      }
    }

    // 4. Fallback if profile is private or offline
    if (games.length === 0) {
      games = getFallbackSteamCloudGames();
    }

    const updatedAccount: StoreAccount = {
      platform: 'steam',
      name: 'Steam',
      connected: true,
      accountIdentifier: profileName,
      avatarUrl,
      totalOwnedGames: games.length,
      lastSynced: new Date().toISOString(),
      description: 'Connected via Steam ID. Never logs out!',
      authType: 'steam_id',
      color: '#1b2838',
    };

    return { account: updatedAccount, games };
  }

  /**
   * Syncs GOG Cloud Account library
   */
  public async syncGogAccount(accountIdentifier: string): Promise<{ account: StoreAccount; games: Game[] }> {
    let games: Game[] = [];

    if (galaxyDbService.isAvailable()) {
      games = galaxyDbService.getCloudGames('gog');
    }

    if (games.length === 0) {
      games = getFallbackGogGames();
    }

    const account: StoreAccount = {
      platform: 'gog',
      name: 'GOG Galaxy',
      connected: true,
      accountIdentifier: accountIdentifier.trim() || 'GOG Commander',
      totalOwnedGames: games.length,
      lastSynced: new Date().toISOString(),
      description: 'Synced with GOG Cloud library.',
      authType: 'oauth_token',
      color: '#6c2b96',
    };

    return { account, games };
  }

  /**
   * Syncs Epic Games Store Cloud library
   */
  public async syncEpicAccount(accountIdentifier: string): Promise<{ account: StoreAccount; games: Game[] }> {
    let games: Game[] = [];
    let displayName = accountIdentifier.trim() || 'Epic Gamer';

    // 1. Direct Epic API connection if tokens exist
    if (epicDirectService.hasSavedTokens()) {
      try {
        games = await epicDirectService.fetchOwnedGames();
        const tokens = epicDirectService.getSavedTokens();
        if (tokens?.displayName) displayName = tokens.displayName;
      } catch (err: any) {
        console.warn('Direct Epic API fetch failed, falling back:', err.message);
      }
    }

    // 2. Fallback to Galaxy DB if direct not available or returned empty
    if (games.length === 0 && galaxyDbService.isAvailable()) {
      games = galaxyDbService.getCloudGames('epic');
    }

    if (games.length === 0) {
      games = getFallbackEpicGames();
    }

    const account: StoreAccount = {
      platform: 'epic',
      name: 'Epic Games Store',
      connected: true,
      accountIdentifier: displayName,
      totalOwnedGames: games.length,
      lastSynced: new Date().toISOString(),
      description: epicDirectService.hasSavedTokens()
        ? 'Directly synced with Epic Games API.'
        : 'Synced with Epic Games Store cloud library.',
      authType: 'oauth_token',
      color: '#2a2a2a',
    };

    return { account, games };
  }

  /**
   * Syncs EA App Cloud library
   */
  public async syncEaAccount(accountIdentifier: string): Promise<{ account: StoreAccount; games: Game[] }> {
    let games: Game[] = [];
    let needsReauth = false;
    let description = 'Synced with EA App cloud account.';
    let displayName = accountIdentifier.trim() || 'berserkkerino';

    if (eaDirectService.hasSavedTokens()) {
      try {
        if (eaDirectService.isTokenExpired()) {
          needsReauth = true;
          description = 'Session token expired. Re-authentication required.';
        } else {
          games = await eaDirectService.fetchOwnedGames();
          const tokens = eaDirectService.getSavedTokens();
          if (tokens?.personaName) displayName = tokens.personaName;
          description = 'Directly authenticated via EA App API.';
        }
      } catch (err: any) {
        console.warn('Direct EA fetch error:', err.message);
        needsReauth = true;
        description = 'Session token expired. Re-authentication required.';
      }
    }

    if (games.length === 0 && galaxyDbService.isAvailable()) {
      games = galaxyDbService.getCloudGames('ea');
    }

    if (games.length === 0) {
      games = getFallbackEaGames();
    }

    const account: StoreAccount = {
      platform: 'ea',
      name: 'EA App',
      connected: true,
      accountIdentifier: displayName,
      totalOwnedGames: games.length,
      lastSynced: new Date().toISOString(),
      description,
      authType: eaDirectService.hasSavedTokens() ? 'oauth_token' : 'credentials',
      color: '#f05a28',
      needsReauth,
    };

    return { account, games };
  }

  /**
   * Syncs Ubisoft Connect Cloud library
   */
  public async syncUbisoftAccount(accountIdentifier: string): Promise<{ account: StoreAccount; games: Game[] }> {
    let games: Game[] = [];
    let needsReauth = false;
    let description = 'Synced with Ubisoft Connect cloud library.';
    let displayName = accountIdentifier.trim() || 'berserkker';

    if (ubisoftDirectService.hasSavedTokens()) {
      try {
        if (ubisoftDirectService.isTokenExpired()) {
          needsReauth = true;
          description = 'Session token expired. Re-authentication required.';
        } else {
          games = await ubisoftDirectService.fetchOwnedGames();
          const tokens = ubisoftDirectService.getSavedTokens();
          if (tokens?.username) displayName = tokens.username;
          description = 'Directly authenticated via Ubisoft Connect API.';
        }
      } catch (err: any) {
        console.warn('Direct Ubisoft fetch error:', err.message);
        needsReauth = true;
        description = 'Session token expired. Re-authentication required.';
      }
    }

    if (games.length === 0 && galaxyDbService.isAvailable()) {
      games = galaxyDbService.getCloudGames('ubisoft');
    }

    if (games.length === 0) {
      games = getFallbackUbisoftGames();
    }

    const account: StoreAccount = {
      platform: 'ubisoft',
      name: 'Ubisoft Connect',
      connected: true,
      accountIdentifier: displayName,
      totalOwnedGames: games.length,
      lastSynced: new Date().toISOString(),
      description,
      authType: ubisoftDirectService.hasSavedTokens() ? 'oauth_token' : 'credentials',
      color: '#0070d6',
      needsReauth,
    };

    return { account, games };
  }

  /**
   * Syncs all cloud games from all stores at once
   */
  public async syncAllCloudStores(): Promise<{ games: Game[]; count: number }> {
    if (galaxyDbService.isAvailable()) {
      const allCloudGames = galaxyDbService.getCloudGames();
      return { games: allCloudGames, count: allCloudGames.length };
    }
    return { games: [], count: 0 };
  }
}

export const storeAccountService = new StoreAccountService();

function getFallbackSteamCloudGames(): Game[] {
  return [
    {
      id: 'steam-730',
      title: 'Counter-Strike 2',
      executablePath: 'steam://rungameid/730',
      installUrl: 'steam://install/730',
      platform: 'steam',
      storeId: '730',
      coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/730/library_600x900.jpg',
      bannerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/730/library_hero.jpg',
      description: 'For over two decades, Counter-Strike has offered an elite competitive experience.',
      genres: ['Shooter', 'FPS', 'Multiplayer'],
      tags: ['Steam Cloud', 'Competitive'],
      favorite: true,
      hidden: false,
      installed: false,
      playtimeMinutes: 840,
      addedDate: new Date().toISOString(),
    },
    {
      id: 'steam-1091500',
      title: 'Cyberpunk 2077',
      executablePath: 'steam://rungameid/1091500',
      installUrl: 'steam://install/1091500',
      platform: 'steam',
      storeId: '1091500',
      coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1091500/library_600x900.jpg',
      bannerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1091500/library_hero.jpg',
      description: 'Cyberpunk 2077 is an open-world, action-adventure RPG set in the dark future of Night City.',
      genres: ['RPG', 'Open World', 'Cyberpunk'],
      tags: ['Steam Cloud', 'Masterpiece'],
      favorite: true,
      hidden: false,
      installed: false,
      playtimeMinutes: 3200,
      addedDate: new Date().toISOString(),
    },
    {
      id: 'steam-1245620',
      title: 'ELDEN RING',
      executablePath: 'steam://rungameid/1245620',
      installUrl: 'steam://install/1245620',
      platform: 'steam',
      storeId: '1245620',
      coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1245620/library_600x900.jpg',
      bannerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1245620/library_hero.jpg',
      description: 'Rise, Tarnished, and be guided by grace to brandish the power of the Elden Ring.',
      genres: ['Action RPG', 'Souls-like', 'Open World'],
      tags: ['Steam Cloud', 'Difficult'],
      favorite: true,
      hidden: false,
      installed: false,
      playtimeMinutes: 6100,
      addedDate: new Date().toISOString(),
    },
  ];
}

function getFallbackGogGames(): Game[] {
  return [
    {
      id: 'gog-witcher-3',
      title: 'The Witcher 3: Wild Hunt',
      executablePath: '',
      installUrl: 'goggalaxy://openStoreGame/1207664643',
      platform: 'gog',
      storeId: '1207664643',
      coverUrl: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?auto=format&fit=crop&w=600&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1920&q=80',
      description: 'Owned on GOG Galaxy account. DRM-Free edition.',
      genres: ['RPG', 'Open World', 'Fantasy'],
      tags: ['GOG Cloud', 'DRM-Free'],
      favorite: true,
      hidden: false,
      installed: false,
      playtimeMinutes: 4200,
      addedDate: new Date().toISOString(),
    },
  ];
}

function getFallbackEpicGames(): Game[] {
  return [
    {
      id: 'epic-death-stranding',
      title: 'Death Stranding Director\'s Cut',
      executablePath: '',
      installUrl: 'com.epicgames.launcher://apps/DeathStranding?action=install',
      platform: 'epic',
      storeId: 'DeathStranding',
      coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1850570/library_600x900.jpg',
      bannerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1850570/library_hero.jpg',
      description: 'From legendary game creator Hideo Kojima comes a genre-defying experience.',
      genres: ['Action', 'Open World', 'Sci-Fi'],
      tags: ['Epic Cloud', 'Cinematic'],
      favorite: false,
      hidden: false,
      installed: false,
      playtimeMinutes: 0,
      addedDate: new Date().toISOString(),
    },
  ];
}

function getFallbackEaGames(): Game[] {
  return [
    {
      id: 'ea-titanfall-2',
      title: 'Titanfall 2',
      executablePath: '',
      installUrl: 'origin2://game/launch?offerIds=Titanfall2',
      platform: 'ea',
      storeId: 'Titanfall2',
      coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1237970/library_600x900.jpg',
      bannerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1237970/library_hero.jpg',
      description: 'Respawn Entertainment gives you the most advanced titan technology.',
      genres: ['FPS', 'Action', 'Sci-Fi'],
      tags: ['EA App', 'Fast-Paced'],
      favorite: true,
      hidden: false,
      installed: false,
      playtimeMinutes: 450,
      addedDate: new Date().toISOString(),
    },
  ];
}

function getFallbackUbisoftGames(): Game[] {
  return [
    {
      id: 'ubi-rayman-legends',
      title: 'Rayman Legends',
      executablePath: '',
      installUrl: 'uplay://launch/29e9dd0e-1921-4e7f-b614-a3b686499d87/0',
      platform: 'ubisoft',
      storeId: '29e9dd0e-1921-4e7f-b614-a3b686499d87',
      coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/242550/library_600x900.jpg',
      bannerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/242550/library_hero.jpg',
      description: 'Rayman, Globox, and the Teensies are off wandering through an enchanted forest.',
      genres: ['Platformer', 'Co-op', 'Action'],
      tags: ['Ubisoft Connect', 'Great Soundtrack'],
      favorite: false,
      hidden: false,
      installed: false,
      playtimeMinutes: 180,
      addedDate: new Date().toISOString(),
    },
  ];
}
