import { BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { app } from 'electron';
import { Game } from '../../src/types/game';
import { genreEnrichmentService } from './genreEnrichmentService';
import { galaxyDbService } from './galaxyDbService';

export interface EaTokens {
  code?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenType?: string;
  expiresAt: number;
  userId?: string;
  personaName?: string;
  remidCookie?: string;
  sidCookie?: string;
}

export class EaDirectService {
  private tokensFilePath: string;

  constructor() {
    const dataDir = app ? app.getPath('userData') : path.join(process.cwd(), '.launcher-data');
    this.tokensFilePath = path.join(dataDir, 'ea-tokens.json');
  }

  public hasSavedTokens(): boolean {
    return fs.existsSync(this.tokensFilePath);
  }

  public getSavedTokens(): EaTokens | null {
    try {
      if (fs.existsSync(this.tokensFilePath)) {
        const raw = fs.readFileSync(this.tokensFilePath, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error('Error loading EA tokens:', err);
    }
    return null;
  }

  public saveTokens(tokens: EaTokens): void {
    try {
      fs.writeFileSync(this.tokensFilePath, JSON.stringify(tokens, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving EA tokens:', err);
    }
  }

  public clearTokens(): void {
    try {
      if (fs.existsSync(this.tokensFilePath)) {
        fs.unlinkSync(this.tokensFilePath);
      }
    } catch (err) {
      console.error('Error clearing EA tokens:', err);
    }
  }

  public isTokenExpired(): boolean {
    const tokens = this.getSavedTokens();
    if (!tokens) return true;
    return Date.now() > (tokens.expiresAt - 120000);
  }

  /**
   * Opens EA authentication window and captures code / session cookies
   */
  public authenticateWithWindow(
    authWindow: BrowserWindow,
    authSession: any
  ): Promise<{ tokens: EaTokens; games: Game[] }> {
    return new Promise((resolve, reject) => {
      const loginUrl =
        'https://accounts.ea.com/connect/auth?response_type=code&client_id=EADOTCOM-WEB-SERVER&display=junoWeb/login&locale=en_US&release_type=prod&redirect_uri=https://www.ea.com/ea-play';
      authWindow.loadURL(loginUrl);

      let completed = false;

      const finishSuccess = async (code: string, personaName = 'EA Gamer', userId = '') => {
        if (completed) return;
        completed = true;
        clearInterval(pollTimer);

        try {
          let remidCookie = '';
          let sidCookie = '';
          try {
            const cookies = await authSession.cookies.get({ domain: 'ea.com' });
            for (const c of cookies) {
              if (c.name === 'remid') remidCookie = c.value;
              if (c.name === 'sid') sidCookie = c.value;
            }
          } catch {}

          const tokens: EaTokens = {
            code,
            expiresAt: Date.now() + 14 * 24 * 60 * 60 * 1000, // remid session cookie typical lifetime
            personaName,
            userId,
            remidCookie,
            sidCookie,
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
        try {
          const cookies = await authSession.cookies.get({ domain: 'ea.com' });
          const remid = cookies.find((c: any) => c.name === 'remid');
          if (remid && remid.value) {
            let persona = 'EA Gamer';
            try {
              const res = await authWindow.webContents.executeJavaScript(`
                (() => {
                  const el = document.querySelector('[data-user-name], .profile-name, .ea-player-name, .user-name');
                  return el ? el.innerText.trim() : null;
                })()
              `);
              if (res) persona = res;
            } catch {}
            await finishSuccess('ea-remid-auth', persona);
            return true;
          }
        } catch {}

        if (url.includes('ea.com/ea-play') || url.includes('code=')) {
          const match = url.match(/[?&]code=([a-zA-Z0-9_-]+)/);
          const code = match ? match[1] : 'ea-authorized';

          let persona = 'EA Gamer';
          try {
            const res = await authWindow.webContents.executeJavaScript(`
              (() => {
                const el = document.querySelector('[data-user-name], .profile-name, .ea-player-name, .user-name');
                return el ? el.innerText.trim() : null;
              })()
            `);
            if (res) persona = res;
          } catch {}

          await finishSuccess(code, persona);
          return true;
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
          reject(new Error('EA login window was closed before completion.'));
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
   * Fetches owned EA games using local EA/Origin manifests or EA API
   */
  public async fetchOwnedGames(tokens?: EaTokens): Promise<Game[]> {
    const activeTokens = tokens || this.getSavedTokens();
    if (!activeTokens) {
      throw new Error('Not authenticated with EA App.');
    }

    if (this.isTokenExpired()) {
      throw new Error('EA App authentication expired. Re-authentication required.');
    }

    // Detect installed or cached local content
    const games: Game[] = [];
    const localContentDir = 'C:\\ProgramData\\Origin\\LocalContent';

    if (fs.existsSync(localContentDir)) {
      try {
        const folders = fs.readdirSync(localContentDir);
        for (const folder of folders) {
          const folderPath = path.join(localContentDir, folder);
          if (fs.statSync(folderPath).isDirectory()) {
            const title = folder.replace(/[®™]/g, '').trim();
            const storeId = `Origin.OFR.50.${folder.replace(/\s+/g, '')}`;
            const genres = genreEnrichmentService.normalizeAndEnrichGenres(title, ['EA Play'], []);

            games.push({
              id: `ea-local-${folder.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
              title,
              executablePath: `origin2://game/launch?offerIds=${storeId}`,
              installUrl: `origin2://game/launch?offerIds=${storeId}`,
              platform: 'ea',
              storeId,
              coverUrl: 'https://media.contentapi.ea.com/content/dam/ea/common/ea-app-favicon.png',
              bannerUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1920&q=80',
              description: `Owned EA title (${title}).`,
              genres,
              tags: ['EA App', 'Cloud'],
              favorite: false,
              hidden: false,
              installed: false,
              playtimeMinutes: 0,
              addedDate: new Date().toISOString(),
            });
          }
        }
      } catch (err) {
        console.warn('Error reading EA local content:', err);
      }
    }

    // Merge cloud multi-store games if available
    if (galaxyDbService.isAvailable()) {
      const cloudGames = galaxyDbService.getCloudGames('ea');
      for (const cg of cloudGames) {
        if (!games.some(g => (g.storeId && g.storeId === cg.storeId) || g.title.toLowerCase().trim() === cg.title.toLowerCase().trim())) {
          games.push(cg);
        }
      }
    }

    return games;
  }
}

export const eaDirectService = new EaDirectService();
