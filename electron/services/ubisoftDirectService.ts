import { BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { app } from 'electron';
import { Game } from '../../src/types/game';
import { genreEnrichmentService } from './genreEnrichmentService';
import { galaxyDbService } from './galaxyDbService';

export interface UbisoftTokens {
  ticket: string;
  sessionId?: string;
  rememberDeviceTicket?: string;
  userId: string;
  username: string;
  expiresAt: number;
}

const CLUB_APPID = 'b8fde481-327d-4031-85ce-7c10a202a700';
const CLUB_GENOME_ID = 'fbd6791c-a6c6-4206-a75e-77234080b87b';

export class UbisoftDirectService {
  private tokensFilePath: string;

  constructor() {
    const dataDir = app ? app.getPath('userData') : path.join(process.cwd(), '.launcher-data');
    this.tokensFilePath = path.join(dataDir, 'ubisoft-tokens.json');
  }

  public hasSavedTokens(): boolean {
    return fs.existsSync(this.tokensFilePath);
  }

  public getSavedTokens(): UbisoftTokens | null {
    try {
      if (fs.existsSync(this.tokensFilePath)) {
        const raw = fs.readFileSync(this.tokensFilePath, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error('Error loading Ubisoft tokens:', err);
    }
    return null;
  }

  public saveTokens(tokens: UbisoftTokens): void {
    try {
      fs.writeFileSync(this.tokensFilePath, JSON.stringify(tokens, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving Ubisoft tokens:', err);
    }
  }

  public clearTokens(): void {
    try {
      if (fs.existsSync(this.tokensFilePath)) {
        fs.unlinkSync(this.tokensFilePath);
      }
    } catch (err) {
      console.error('Error clearing Ubisoft tokens:', err);
    }
  }

  public isTokenExpired(): boolean {
    const tokens = this.getSavedTokens();
    if (!tokens) return true;
    // Expire 2 minutes early to be safe
    return Date.now() > (tokens.expiresAt - 120000);
  }

  /**
   * Opens Ubisoft authentication flow inside provided BrowserWindow
   */
  public authenticateWithWindow(
    authWindow: BrowserWindow,
    authSession: any
  ): Promise<{ tokens: UbisoftTokens; games: Game[] }> {
    return new Promise((resolve, reject) => {
      const loginUrl = `https://connect.ubisoft.com/login?appId=${CLUB_APPID}&genomeId=${CLUB_GENOME_ID}&lang=en-US&nextUrl=https%3A%2F%2Fconnect.ubisoft.com%2Fready`;
      authWindow.loadURL(loginUrl);

      let completed = false;

      const finishSuccess = async (rawLoginData: any, rememberTicket?: string) => {
        if (completed) return;
        completed = true;
        clearInterval(pollTimer);

        try {
          const parsed = typeof rawLoginData === 'string' ? JSON.parse(rawLoginData) : rawLoginData;
          const ticket = parsed.ticket || parsed.token || '';
          const userId = parsed.userId || parsed.profile?.userId || 'ubisoft-user';
          const username = parsed.username || parsed.profile?.username || 'Ubisoft Gamer';
          const sessionId = parsed.sessionId || '';
          // Typical ticket lifetime is ~3 hours or from expiration string
          const expiresAt = parsed.expiration
            ? new Date(parsed.expiration).getTime()
            : Date.now() + 3 * 60 * 60 * 1000;

          const tokens: UbisoftTokens = {
            ticket,
            sessionId,
            rememberDeviceTicket: rememberTicket || parsed.rememberDeviceTicket,
            userId,
            username,
            expiresAt,
          };

          this.saveTokens(tokens);
          const games = await this.fetchOwnedGames(tokens);
          if (!authWindow.isDestroyed()) authWindow.close();
          resolve({ tokens, games });
        } catch (err: any) {
          reject(err);
        }
      };

      const checkUrlForAuth = async (url: string) => {
        if (completed) return false;
        if (url.includes('connect.ubisoft.com/ready') || url.includes('rememberMeTicket') || url.includes('ticket=')) {
          // Extract data from cookies or localStorage
          try {
            const cookies = await authSession.cookies.get({ domain: 'ubisoft.com' });
            let rememberTicket = '';
            for (const c of cookies) {
              if (c.name.includes('rememberDeviceTicket') || c.name.includes('ubi_ticket')) {
                rememberTicket = c.value;
              }
            }

            const storageData = await authWindow.webContents.executeJavaScript(`
              (() => {
                try {
                  const data = localStorage.getItem('PRODloginData') || localStorage.getItem('loginData');
                  const profile = localStorage.getItem('PRODlastProfile') || localStorage.getItem('lastProfile');
                  return { data: data ? JSON.parse(data) : null, profile: profile ? JSON.parse(profile) : null };
                } catch(e) {
                  return null;
                }
              })()
            `);

            if (storageData && storageData.data && (storageData.data.ticket || storageData.data.token)) {
              const merged = { ...storageData.data, profile: storageData.profile };
              await finishSuccess(merged, rememberTicket);
              return true;
            }
          } catch (e) {
            console.warn('Error reading Ubisoft local storage:', e);
          }
        }
        return false;
      };

      const pollTimer = setInterval(async () => {
        if (completed) {
          clearInterval(pollTimer);
          return;
        }
        try {
          if (!authWindow.isDestroyed()) {
            const currentUrl = authWindow.webContents.getURL();
            await checkUrlForAuth(currentUrl);
          } else {
            clearInterval(pollTimer);
          }
        } catch {
          clearInterval(pollTimer);
        }
      }, 1200);

      authWindow.on('closed', () => {
        clearInterval(pollTimer);
        if (!completed) {
          completed = true;
          reject(new Error('Ubisoft login window was closed before completion.'));
        }
      });

      authWindow.webContents.on('will-navigate', (_event, url) => {
        checkUrlForAuth(url);
      });

      authWindow.webContents.on('will-redirect', (_event, url) => {
        checkUrlForAuth(url);
      });

      authWindow.webContents.on('did-navigate', async (_event, url) => {
        await checkUrlForAuth(url);
      });

      authWindow.webContents.on('did-navigate-in-page', async (_event, url) => {
        await checkUrlForAuth(url);
      });
    });
  }

  /**
   * Fetches owned games using Ubisoft GraphQL API
   */
  public async fetchOwnedGames(tokens?: UbisoftTokens): Promise<Game[]> {
    const activeTokens = tokens || this.getSavedTokens();
    if (!activeTokens || !activeTokens.ticket) {
      throw new Error('Not authenticated with Ubisoft Connect.');
    }

    if (this.isTokenExpired()) {
      throw new Error('Ubisoft authentication expired. Re-authentication required.');
    }

    const payload = JSON.stringify({
      query: `
        query {
          viewer {
            me {
              games(filterBy: { isOwned: true }) {
                nodes {
                  id
                  name
                  type
                  spaceId
                  slug
                  platform
                }
              }
            }
          }
        }
      `,
    });

    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'public-ubiservices.ubi.com',
        path: '/v1/profiles/me/uplay/graphql',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Ubi-AppId': CLUB_APPID,
          Authorization: `ubi_v1 t=${activeTokens.ticket}`,
          'Ubi-SessionId': activeTokens.sessionId || '',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      };

      const req = https.request(options, (res) => {
        if (res.statusCode === 401 || res.statusCode === 403) {
          return reject(new Error('Ubisoft authentication expired. Re-authentication required.'));
        }

        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            const rawGames = data?.data?.viewer?.me?.games?.nodes || [];
            const games: Game[] = [];

            for (const item of rawGames) {
              const title = (item.name || item.slug || '').replace(/[®™]/g, '').trim();
              if (!title) continue;

              const storeId = item.id || item.spaceId;
              const genres = genreEnrichmentService.normalizeAndEnrichGenres(title, ['Ubisoft'], []);

              games.push({
                id: `ubisoft-cloud-${storeId}`,
                title,
                executablePath: `uplay://launch/${storeId}/0`,
                installUrl: `uplay://install/${storeId}`,
                platform: 'ubisoft',
                storeId,
                coverUrl: `https://ubisoftconnect.com/img/games/${storeId}.jpg`,
                bannerUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1920&q=80',
                description: `Owned on Ubisoft Connect account (@${activeTokens.username}).`,
                genres,
                tags: ['Ubisoft Connect', 'Cloud'],
                favorite: false,
                hidden: false,
                installed: false,
                playtimeMinutes: 0,
                addedDate: new Date().toISOString(),
              });
            }

            if (galaxyDbService.isAvailable()) {
              const cloudGames = galaxyDbService.getCloudGames('ubisoft');
              for (const cg of cloudGames) {
                if (!games.some(g => (g.storeId && g.storeId === cg.storeId) || g.title.toLowerCase().trim() === cg.title.toLowerCase().trim())) {
                  games.push(cg);
                }
              }
            }

            resolve(games);
          } catch (err) {
            if (galaxyDbService.isAvailable()) {
              const fallbackGames = galaxyDbService.getCloudGames('ubisoft');
              if (fallbackGames.length > 0) {
                return resolve(fallbackGames);
              }
            }
            reject(new Error('Failed to parse Ubisoft API response'));
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(12000, () => {
        req.destroy();
        reject(new Error('Ubisoft API connection timeout'));
      });

      req.write(payload);
      req.end();
    });
  }
}

export const ubisoftDirectService = new UbisoftDirectService();
