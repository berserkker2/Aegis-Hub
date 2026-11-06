import { BrowserWindow, session } from 'electron';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { Game, GamePlatform, StoreAccount } from '../../src/types/game';
import { galaxyDbService } from './galaxyDbService';
import { epicDirectService } from './epicDirectService';
import { ubisoftDirectService } from './ubisoftDirectService';
import { eaDirectService } from './eaDirectService';

export interface LocalDetectedAccount {
  platform: GamePlatform;
  displayName: string;
  accountIdentifier: string;
  avatarUrl?: string;
  details: string;
}

export class StoreAuthManager {
  /**
   * Automatically detects accounts logged in locally on Windows (Steam, Heroic, etc.)
   */
  public detectLocalAccounts(): LocalDetectedAccount[] {
    const detected: LocalDetectedAccount[] = [];

    // 1. Detect Local Steam Account from loginusers.vdf
    const steamVdfPath = 'C:\\Program Files (x86)\\Steam\\config\\loginusers.vdf';
    if (fs.existsSync(steamVdfPath)) {
      try {
        const content = fs.readFileSync(steamVdfPath, 'utf-8');
        const userBlockMatch = content.match(/"(\d{17})"\s*\{([\s\S]*?)\}/);
        if (userBlockMatch) {
          const steamId64 = userBlockMatch[1];
          const block = userBlockMatch[2];
          const personaMatch = block.match(/"PersonaName"\s*"([^"]+)"/i);
          const accountMatch = block.match(/"AccountName"\s*"([^"]+)"/i);

          const personaName = personaMatch ? personaMatch[1] : 'Steam Gamer';
          const accountName = accountMatch ? accountMatch[1] : steamId64;

          detected.push({
            platform: 'steam',
            displayName: personaName,
            accountIdentifier: steamId64,
            details: `PC Steam account @${accountName} (SteamID: ${steamId64})`,
            avatarUrl: 'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_medium.jpg',
          });
        }
      } catch (err) {
        console.error('Error reading Steam loginusers.vdf:', err);
      }
    }

    // 1.5. Detect Direct Epic Account if authenticated
    if (epicDirectService.hasSavedTokens()) {
      const epicTokens = epicDirectService.getSavedTokens();
      if (epicTokens) {
        detected.push({
          platform: 'epic',
          displayName: epicTokens.displayName || 'Epic Gamer',
          accountIdentifier: epicTokens.accountId,
          details: `Direct Epic Games account (@${epicTokens.displayName}) - API connected`,
          avatarUrl: 'https://static-assets-prod.epicgames.com/epic-store/static/favicon.ico',
        });
      }
    }

    // 2. Detect Multi-Store Accounts from Galaxy DB (Epic, Ubisoft, EA, GOG)
    if (galaxyDbService.isAvailable()) {
      const externalAccounts = galaxyDbService.getConnectedAccounts();
      for (const ext of externalAccounts) {
        if (ext.platform === 'steam' && detected.some(d => d.platform === 'steam')) {
          // Already added from local Steam
          continue;
        }
        if (ext.platform === 'epic' && detected.some(d => d.platform === 'epic')) {
          // Already added from direct Epic
          continue;
        }

        const count = galaxyDbService.getCloudGames(ext.platform).length;
        let avatarUrl = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=100&q=80';
        let storeLabel = ext.platform.toUpperCase();

        if (ext.platform === 'epic') {
          avatarUrl = 'https://static-assets-prod.epicgames.com/epic-store/static/favicon.ico';
          storeLabel = 'Epic Games';
        } else if (ext.platform === 'ubisoft') {
          avatarUrl = 'https://ubisoftconnect.com/favicon.ico';
          storeLabel = 'Ubisoft Connect';
        } else if (ext.platform === 'ea') {
          avatarUrl = 'https://media.contentapi.ea.com/content/dam/ea/common/ea-app-favicon.png';
          storeLabel = 'EA App';
        }

        detected.push({
          platform: ext.platform,
          displayName: ext.accountName,
          accountIdentifier: ext.accountName,
          details: `${storeLabel} linked account (@${ext.accountName}) - ${count} cloud games ready`,
          avatarUrl,
        });
      }

      // Check GOG itself
      const gogGamesCount = galaxyDbService.getCloudGames('gog').length;
      if (gogGamesCount > 0 && !detected.some(d => d.platform === 'gog')) {
        detected.push({
          platform: 'gog',
          displayName: 'GOG Galaxy Library',
          accountIdentifier: 'GOG Account',
          details: `GOG DRM-Free library - ${gogGamesCount} cloud games ready`,
          avatarUrl: 'https://www.gog.com/favicon.ico',
        });
      }
    }

    return detected;
  }

  /**
   * Opens an official in-app browser window for real OAuth / login
   */
  public openStoreLoginWindow(
    parentWindow: BrowserWindow | null,
    platform: GamePlatform
  ): Promise<{ account: StoreAccount; games: Game[] }> {
    return new Promise((resolve, reject) => {
      const partition = `persist:${platform}_auth_session`;
      const authSession = session.fromPartition(partition);

      const authWindow = new BrowserWindow({
        width: 600,
        height: 720,
        title: `Log in to ${platform.toUpperCase()}`,
        parent: parentWindow || undefined,
        modal: true,
        backgroundColor: '#121721',
        autoHideMenuBar: true,
        webPreferences: {
          partition,
          nodeIntegration: false,
          contextIsolation: true,
        },
      });

      let completed = false;

      const finishSuccess = (account: StoreAccount, games: Game[]) => {
        if (completed) return;
        completed = true;
        authWindow.close();
        resolve({ account, games });
      };

      authWindow.on('closed', () => {
        if (!completed) {
          reject(new Error('Login window was closed before completing authentication.'));
        }
      });

      if (platform === 'gog') {
        const gogAuthUrl =
          'https://auth.gog.com/auth?client_id=46899977054714467&redirect_uri=https://embed.gog.com/on_login_success?origin=client&response_type=code&layout=client2';

        authWindow.loadURL(gogAuthUrl);

        authWindow.webContents.on('will-redirect', async (_event, url) => {
          if (url.includes('on_login_success')) {
            try {
              // Extract cookies and query owned games from GOG API
              const cookies = await authSession.cookies.get({ domain: 'gog.com' });
              const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');

              // Fetch owned games
              const rawData = await this.fetchWithCookies('https://embed.gog.com/user/data/games', cookieHeader);
              const data = JSON.parse(rawData);

              const ownedIds = data.owned || [];
              const games: Game[] = [];

              // Query user info
              let username = 'GOG Gamer';
              try {
                const userRaw = await this.fetchWithCookies('https://embed.gog.com/userData.json', cookieHeader);
                const userData = JSON.parse(userRaw);
                if (userData.username) username = userData.username;
              } catch {}

              for (const gId of ownedIds.slice(0, 30)) {
                games.push({
                  id: `gog-cloud-${gId}`,
                  title: `GOG Game #${gId}`,
                  executablePath: '',
                  installUrl: `goggalaxy://openStoreGame/${gId}`,
                  platform: 'gog',
                  storeId: String(gId),
                  coverUrl: `https://images.gog-statics.com/${gId}_glx_vertical_cover.jpg`,
                  bannerUrl: `https://images.gog-statics.com/${gId}_glx_hero.jpg`,
                  description: 'Owned on your GOG account. DRM-free library.',
                  genres: ['GOG Library'],
                  tags: ['GOG Cloud', 'DRM-Free'],
                  favorite: false,
                  hidden: false,
                  installed: false,
                  playtimeMinutes: 0,
                  addedDate: new Date().toISOString(),
                });
              }

              const account: StoreAccount = {
                platform: 'gog',
                name: 'GOG Galaxy',
                connected: true,
                accountIdentifier: username,
                totalOwnedGames: ownedIds.length || games.length,
                lastSynced: new Date().toISOString(),
                description: `Authenticated as ${username}.`,
                authType: 'oauth_token',
                color: '#6c2b96',
              };

              finishSuccess(account, games);
            } catch (err: any) {
              console.error('GOG sync failed:', err);
              reject(err);
            }
          }
        });
      } else if (platform === 'steam') {
        const steamLoginUrl = 'https://steamcommunity.com/login/home/?goto=my%2Fgames';
        authWindow.loadURL(steamLoginUrl);

        authWindow.webContents.on('did-navigate', async (_event, url) => {
          // Check if successfully logged into profile / games
          if (url.includes('steamcommunity.com/id/') || url.includes('steamcommunity.com/profiles/')) {
            try {
              const cookies = await authSession.cookies.get({ domain: 'steamcommunity.com' });
              const loginCookie = cookies.find((c) => c.name === 'steamLoginSecure');

              let steamId = '';
              if (loginCookie) {
                // steamLoginSecure value format: <steamId64>%7C%7C<token>
                steamId = decodeURIComponent(loginCookie.value).split('||')[0];
              }

              if (!steamId) {
                const match = url.match(/profiles\/(\d{17})/);
                if (match) steamId = match[1];
              }

              if (steamId) {
                // Fetch public XML
                const xmlUrl = `https://steamcommunity.com/profiles/${steamId}/games?tab=all&xml=1`;
                const xml = await this.fetchSimple(xmlUrl);

                const nameMatch =
                  xml.match(/<steamID><!\[CDATA\[(.*?)\]\]><\/steamID>/) ||
                  xml.match(/<steamID>(.*?)<\/steamID>/);
                const personaName = nameMatch ? nameMatch[1] : 'Steam Gamer';

                const games: Game[] = [];
                const gameBlocks = xml.split('<game>');
                for (let i = 1; i < gameBlocks.length; i++) {
                  const block = gameBlocks[i];
                  const appIdMatch = block.match(/<appID>(\d+)<\/appID>/);
                  const titleMatch =
                    block.match(/<name><!\[CDATA\[(.*?)\]\]><\/name>/) ||
                    block.match(/<name>(.*?)<\/name>/);
                  const hoursMatch = block.match(/<hoursOnRecord>([\d.]+)<\/hoursOnRecord>/);

                  if (appIdMatch && titleMatch) {
                    const appId = appIdMatch[1];
                    const hours = hoursMatch ? parseFloat(hoursMatch[1]) : 0;

                    games.push({
                      id: `steam-${appId}`,
                      title: titleMatch[1],
                      executablePath: `steam://rungameid/${appId}`,
                      installUrl: `steam://install/${appId}`,
                      platform: 'steam',
                      storeId: appId,
                      coverUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`,
                      bannerUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_hero.jpg`,
                      description: 'Owned on your authenticated Steam account.',
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

                const account: StoreAccount = {
                  platform: 'steam',
                  name: 'Steam',
                  connected: true,
                  accountIdentifier: personaName,
                  totalOwnedGames: games.length,
                  lastSynced: new Date().toISOString(),
                  description: `Authenticated as ${personaName} (${steamId}).`,
                  authType: 'steam_id',
                  color: '#1b2838',
                };

                finishSuccess(account, games);
              }
            } catch (err: any) {
              console.error('Steam login parsing error:', err);
            }
          }
        });
      } else if (platform === 'epic') {
        epicDirectService
          .authenticateWithWindow(authWindow, authSession)
          .then(({ tokens, games }) => {
            const account: StoreAccount = {
              platform: 'epic',
              name: 'Epic Games Store',
              connected: true,
              accountIdentifier: tokens.displayName,
              totalOwnedGames: games.length,
              lastSynced: new Date().toISOString(),
              description: 'Directly authenticated via Epic Games API.',
              authType: 'oauth_token',
              color: '#2a2a2a',
            };
            finishSuccess(account, games);
          })
          .catch((err) => {
            if (!completed) {
              completed = true;
              try {
                if (!authWindow.isDestroyed()) authWindow.close();
              } catch {}
              reject(err);
            }
          });
      } else if (platform === 'ubisoft') {
        ubisoftDirectService
          .authenticateWithWindow(authWindow, authSession)
          .then(({ tokens, games }) => {
            const account: StoreAccount = {
              platform: 'ubisoft',
              name: 'Ubisoft Connect',
              connected: true,
              accountIdentifier: tokens.username,
              totalOwnedGames: games.length,
              lastSynced: new Date().toISOString(),
              description: 'Directly authenticated via Ubisoft Connect API.',
              authType: 'oauth_token',
              color: '#0070d6',
              needsReauth: false,
            };
            finishSuccess(account, games);
          })
          .catch((err) => {
            if (!completed) {
              completed = true;
              try {
                if (!authWindow.isDestroyed()) authWindow.close();
              } catch {}
              reject(err);
            }
          });
      } else if (platform === 'ea') {
        eaDirectService
          .authenticateWithWindow(authWindow, authSession)
          .then(({ tokens, games }) => {
            const account: StoreAccount = {
              platform: 'ea',
              name: 'EA App',
              connected: true,
              accountIdentifier: tokens.personaName || 'EA User',
              totalOwnedGames: games.length,
              lastSynced: new Date().toISOString(),
              description: 'Directly authenticated via EA App API.',
              authType: 'oauth_token',
              color: '#f05a28',
              needsReauth: false,
            };
            finishSuccess(account, games);
          })
          .catch((err) => {
            if (!completed) {
              completed = true;
              try {
                if (!authWindow.isDestroyed()) authWindow.close();
              } catch {}
              reject(err);
            }
          });
      }
    });
  }

  private fetchWithCookies(url: string, cookieHeader: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      const req = client.get(
        url,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Cookie: cookieHeader,
          },
        },
        (res) => {
          let body = '';
          res.on('data', (c) => (body += c));
          res.on('end', () => resolve(body));
        }
      );
      req.on('error', reject);
    });
  }

  private fetchSimple(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      const req = client.get(url, { headers: { 'User-Agent': 'AegisHub/1.0' } }, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => resolve(body));
      });
      req.on('error', reject);
    });
  }
}
