import { app, BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { Game } from '../../src/types/game';
import { scanInstalledXboxApps } from '../scanners/xboxScanner';

export interface XboxTokens {
  accessToken: string;
  refreshToken?: string;
  xstsToken: string;
  uhs: string;
  xuid: string;
  gamertag: string;
  expiresAt: number;
}

const XBOX_CLIENT_ID = '38cd2fa8-66fd-4760-afb2-405eb65d5b0c';
const XBOX_REDIRECT_URI = 'https://login.live.com/oauth20_desktop.srf';
const XBOX_SCOPE = 'Xboxlive.signin Xboxlive.offline_access';

const EXCLUDED_TITLES = new Set([
  'xbox',
  'xbox app',
  'xbox console companion',
  'xbox game bar',
  'microsoft store',
  'gaming services',
  'xbox accessories',
  'xbox avatars',
  'xbox insider hub',
]);

export class XboxDirectService {
  private tokenPath: string;

  constructor() {
    try {
      this.tokenPath = path.join(app.getPath('userData'), 'xbox-tokens.json');
    } catch {
      this.tokenPath = path.join(process.cwd(), '.launcher-data', 'xbox-tokens.json');
    }
  }

  public hasSavedTokens(): boolean {
    return fs.existsSync(this.tokenPath);
  }

  public getSavedTokens(): XboxTokens | null {
    try {
      if (fs.existsSync(this.tokenPath)) {
        const raw = fs.readFileSync(this.tokenPath, 'utf-8');
        return JSON.parse(raw) as XboxTokens;
      }
    } catch (err) {
      console.error('Error reading saved Xbox tokens:', err);
    }
    return null;
  }

  public saveTokens(tokens: XboxTokens): void {
    try {
      const dir = path.dirname(this.tokenPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.tokenPath, JSON.stringify(tokens, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving Xbox tokens:', err);
    }
  }

  public clearTokens(): void {
    try {
      if (fs.existsSync(this.tokenPath)) {
        fs.unlinkSync(this.tokenPath);
      }
    } catch (err) {
      console.error('Error clearing Xbox tokens:', err);
    }
  }

  public isTokenExpired(): boolean {
    const tokens = this.getSavedTokens();
    if (!tokens) return true;
    return Date.now() >= tokens.expiresAt - 60000;
  }

  private postJson(url: string, body: any, extraHeaders: Record<string, string> = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      const payload = JSON.stringify(body);
      const parsed = new URL(url);
      const req = https.request(
        {
          hostname: parsed.hostname,
          path: parsed.pathname + parsed.search,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Content-Length': Buffer.byteLength(payload),
            ...extraHeaders,
          },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              try {
                resolve(JSON.parse(data));
              } catch (e) {
                reject(e);
              }
            } else {
              reject(new Error(`HTTP ${res.statusCode} (${parsed.hostname}${parsed.pathname}): ${data.slice(0, 200)}`));
            }
          });
        }
      );
      req.on('error', reject);
      req.setTimeout(15000, () => {
        req.destroy();
        reject(new Error('Xbox API request timed out'));
      });
      req.write(payload);
      req.end();
    });
  }

  private getJson(url: string, headers: Record<string, string> = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      const parsed = new URL(url);
      const req = https.request(
        {
          hostname: parsed.hostname,
          path: parsed.pathname + parsed.search,
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            ...headers,
          },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              try {
                resolve(JSON.parse(data));
              } catch (e) {
                reject(e);
              }
            } else {
              reject(new Error(`HTTP ${res.statusCode} (${parsed.hostname}${parsed.pathname}): ${data.slice(0, 200)}`));
            }
          });
        }
      );
      req.on('error', reject);
      req.setTimeout(15000, () => {
        req.destroy();
        reject(new Error('Xbox API request timed out'));
      });
      req.end();
    });
  }

  private postForm(url: string, params: Record<string, string>): Promise<any> {
    return new Promise((resolve, reject) => {
      const payload = new URLSearchParams(params).toString();
      const parsed = new URL(url);
      const req = https.request(
        {
          hostname: parsed.hostname,
          path: parsed.pathname + parsed.search,
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Content-Length': Buffer.byteLength(payload),
          },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              try {
                resolve(JSON.parse(data));
              } catch (e) {
                reject(e);
              }
            } else {
              reject(new Error(`HTTP ${res.statusCode} (${parsed.hostname}${parsed.pathname}): ${data.slice(0, 200)}`));
            }
          });
        }
      );
      req.on('error', reject);
      req.setTimeout(15000, () => {
        req.destroy();
        reject(new Error('Xbox OAuth token request timed out'));
      });
      req.write(payload);
      req.end();
    });
  }

  /**
   * Exchanges an OAuth2 authorization_code for Microsoft Live access_token + refresh_token.
   */
  private async exchangeCodeForOAuthTokens(code: string): Promise<{ access_token: string; refresh_token?: string; expires_in?: number }> {
    return this.postForm('https://login.live.com/oauth20_token.srf', {
      grant_type: 'authorization_code',
      code,
      scope: XBOX_SCOPE,
      client_id: XBOX_CLIENT_ID,
      redirect_uri: XBOX_REDIRECT_URI,
    });
  }

  /**
   * Refreshes an expired Microsoft Live token using refresh_token.
   */
  private async refreshOAuthTokens(refreshToken: string): Promise<XboxTokens> {
    const tokenRes = await this.postForm('https://login.live.com/oauth20_token.srf', {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      scope: XBOX_SCOPE,
      client_id: XBOX_CLIENT_ID,
      redirect_uri: XBOX_REDIRECT_URI,
    });
    const tokens = await this.exchangeLiveTokenForXbox(
      tokenRes.access_token,
      Number(tokenRes.expires_in || 3600),
      tokenRes.refresh_token || refreshToken
    );
    this.saveTokens(tokens);
    return tokens;
  }

  /**
   * Exchanges a Microsoft Live OAuth access_token for Xbox Live XSTS credentials.
   */
  private async exchangeLiveTokenForXbox(
    accessToken: string,
    expiresInSec = 3600,
    refreshToken?: string
  ): Promise<XboxTokens> {
    const xblAuth = await this.postJson(
      'https://user.auth.xboxlive.com/user/authenticate',
      {
        RelyingParty: 'http://auth.xboxlive.com',
        TokenType: 'JWT',
        Properties: {
          AuthMethod: 'RPS',
          SiteName: 'user.auth.xboxlive.com',
          RpsTicket: `d=${accessToken}`,
        },
      },
      { 'x-xbl-contract-version': '1' }
    );

    const xblToken: string = xblAuth?.Token;
    const uhs: string = xblAuth?.DisplayClaims?.xui?.[0]?.uhs;
    if (!xblToken || !uhs) {
      throw new Error('Failed to authenticate with Xbox Live.');
    }

    const xstsAuth = await this.postJson(
      'https://xsts.auth.xboxlive.com/xsts/authorize',
      {
        RelyingParty: 'http://xboxlive.com',
        TokenType: 'JWT',
        Properties: {
          SandboxId: 'RETAIL',
          UserTokens: [xblToken],
        },
      },
      { 'x-xbl-contract-version': '1' }
    );

    const xstsToken: string = xstsAuth?.Token;
    const xui = xstsAuth?.DisplayClaims?.xui?.[0];
    const xuid: string = xui?.xid || '';
    const gamertag: string = xui?.gtg || 'Xbox Gamer';

    if (!xstsToken || !xuid) {
      throw new Error('Failed to authorize XSTS token for Xbox account.');
    }

    return {
      accessToken,
      refreshToken,
      xstsToken,
      uhs: xui?.uhs || uhs,
      xuid,
      gamertag,
      expiresAt: Date.now() + expiresInSec * 1000,
    };
  }

  /**
   * Opens Microsoft OAuth login window and captures authorization code for Xbox Live.
   */
  public authenticateWithWindow(
    authWindow: BrowserWindow,
    authSession: any
  ): Promise<{ tokens: XboxTokens; games: Game[] }> {
    return new Promise((resolve, reject) => {
      const query = new URLSearchParams({
        client_id: XBOX_CLIENT_ID,
        response_type: 'code',
        approval_prompt: 'auto',
        scope: XBOX_SCOPE,
        redirect_uri: XBOX_REDIRECT_URI,
        prompt: 'select_account',
      });
      const loginUrl = `https://login.live.com/oauth20_authorize.srf?${query.toString()}`;

      let completed = false;

      const handleRedirectUrl = async (url: string) => {
        if (completed) return;
        if (!url.startsWith(XBOX_REDIRECT_URI)) return;

        const hashIndex = url.indexOf('#');
        const queryIndex = url.indexOf('?');
        const rawParams = queryIndex >= 0 ? url.slice(queryIndex + 1).split('#')[0] : hashIndex >= 0 ? url.slice(hashIndex + 1) : '';
        const params = new URLSearchParams(rawParams);

        const error = params.get('error');
        if (error) {
          completed = true;
          reject(new Error(params.get('error_description') || error));
          return;
        }

        const code = params.get('code');
        if (!code) return;

        completed = true;

        try {
          const oauthRes = await this.exchangeCodeForOAuthTokens(code);
          const tokens = await this.exchangeLiveTokenForXbox(
            oauthRes.access_token,
            Number(oauthRes.expires_in || 3600),
            oauthRes.refresh_token
          );
          this.saveTokens(tokens);
          const games = await this.fetchOwnedGames(tokens);
          if (!authWindow.isDestroyed()) authWindow.close();
          resolve({ tokens, games });
        } catch (err) {
          try {
            if (!authWindow.isDestroyed()) authWindow.close();
          } catch {}
          reject(err);
        }
      };

      authWindow.webContents.on('will-redirect', (_e, url) => handleRedirectUrl(url));
      authWindow.webContents.on('did-navigate', (_e, url) => handleRedirectUrl(url));
      authWindow.webContents.on('did-finish-load', () => {
        if (!authWindow.isDestroyed()) {
          handleRedirectUrl(authWindow.webContents.getURL());
        }
      });

      authWindow.on('closed', () => {
        if (!completed) {
          reject(new Error('Login window was closed before completing Microsoft authentication.'));
        }
      });

      const loadLogin = async () => {
        try {
          if (authSession?.clearStorageData) {
            await authSession.clearStorageData({ storages: ['cookies'] });
          }
        } catch {}
        if (!authWindow.isDestroyed()) {
          authWindow.loadURL(loginUrl);
        }
      };

      loadLogin();
    });
  }

  /**
   * Resolves a Microsoft Store 12-character ProductId (BigId) from a PackageFamilyName (PFN) or XboxTitleId.
   */
  public async resolveStoreProductId(pfn?: string, titleId?: string): Promise<string> {
    const queries: Array<[string, string]> = [];
    if (pfn) queries.push(['PackageFamilyName', pfn]);
    if (titleId && /^\d+$/.test(titleId)) queries.push(['XboxTitleId', titleId]);

    for (const [altId, val] of queries) {
      try {
        const url = `https://displaycatalog.mp.microsoft.com/v7.0/products/lookup?alternateId=${altId}&Value=${encodeURIComponent(
          val
        )}&market=US&languages=en-us&fieldsTemplate=browse`;
        const res = await this.getJson(url);
        if (Array.isArray(res?.BigIds) && res.BigIds.length > 0 && typeof res.BigIds[0] === 'string') {
          return res.BigIds[0];
        }
      } catch {}
    }
    return '';
  }

  /**
   * Fetches owned/played PC & Xbox titles from TitleHub and merges with locally installed Xbox PC games.
   */
  public async fetchOwnedGames(providedTokens?: XboxTokens): Promise<Game[]> {
    const tokens = providedTokens || this.getSavedTokens();
    const installedApps = await scanInstalledXboxApps();
    const installedByPfn = new Map<string, (typeof installedApps)[0]>();
    const installedByTitle = new Map<string, (typeof installedApps)[0]>();

    for (const appInfo of installedApps) {
      if (appInfo.packageFamilyName) {
        installedByPfn.set(appInfo.packageFamilyName.toLowerCase(), appInfo);
      }
      installedByTitle.set(appInfo.title.toLowerCase().trim(), appInfo);
    }

    const games: Game[] = [];
    const seenKeys = new Set<string>();

    if (tokens && !this.isTokenExpired()) {
      const headers = {
        Authorization: `XBL3.0 x=${tokens.uhs};${tokens.xstsToken}`,
        'x-xbl-contract-version': '2',
        'Accept-Language': 'en-US',
      };
      const baseUrl = `https://titlehub.xboxlive.com/users/xuid(${encodeURIComponent(tokens.xuid)})/titles/titlehistory/decoration`;

      let data: any = null;
      try {
        data = await this.getJson(`${baseUrl}/detail,image`, headers);
      } catch (err1: any) {
        console.warn('[XboxDirectService] TitleHub detail,image failed, retrying detail only:', err1?.message);
        try {
          data = await this.getJson(`${baseUrl}/detail`, headers);
        } catch (err2: any) {
          console.warn('[XboxDirectService] TitleHub fallback failed, continuing with local Xbox games:', err2?.message);
        }
      }

      const titles: any[] = Array.isArray(data?.titles) ? data.titles : [];

      // Filter strictly to real Xbox / Microsoft Store PC games (must have a Store PackageFamilyName 'pfn',
      // type === 'Game', and 'PC' in devices — excludes Win32 Steam/Epic games tracked by Windows Game Bar)
      const validPcTitles = titles.filter((t) => {
        const name: string = (t.name || '').trim();
        if (!name || EXCLUDED_TITLES.has(name.toLowerCase())) return false;
        const pfn: string = (t.pfn || '').trim();
        if (!pfn) return false;
        const typeStr = String(t.type || 'Game').toLowerCase();
        if (typeStr !== 'game') return false;
        const devices: string[] = Array.isArray(t.devices) ? t.devices : [];
        return devices.some((d) => d.toLowerCase() === 'pc');
      });

      for (const t of validPcTitles) {
        const name: string = (t.name || '').trim();
        const pfn: string = (t.pfn || '').trim();

        const matchedLocal =
          (pfn ? installedByPfn.get(pfn.toLowerCase()) : undefined) ||
          installedByTitle.get(name.toLowerCase());

        const titleId = String(t.titleId || t.modernTitleId || name);
        const key = (matchedLocal?.packageFamilyName || pfn || titleId).toLowerCase();
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);

        let productId = matchedLocal?.storeId || t.detail?.productId || t.detail?.availabilities?.[0]?.ProductId || '';
        if (!productId) {
          productId = await this.resolveStoreProductId(pfn, titleId);
        }

        const storeUri = productId
          ? `msxbox://game/?productId=${productId}`
          : `ms-windows-store://pdp/?PFN=${encodeURIComponent(pfn)}`;

        const heroImg =
          t.images?.find((img: any) => img.type === 'TitledHeroArt' || img.type === 'SuperHeroArt')?.url ||
          t.displayImage ||
          '';
        const boxImg =
          t.images?.find((img: any) => img.type === 'BoxArt' || img.type === 'Poster')?.url ||
          t.displayImage ||
          '';

        const lastPlayedRaw = t.titleHistory?.lastTimePlayed;
        const lastPlayed =
          lastPlayedRaw && !String(lastPlayedRaw).startsWith('0001-')
            ? new Date(lastPlayedRaw).toISOString()
            : undefined;

        games.push({
          id: `xbox-${titleId}`,
          title: name,
          executablePath: matchedLocal?.executablePath || storeUri,
          installUrl: storeUri,
          installPath: matchedLocal?.installPath,
          platform: 'xbox',
          storeId: productId || titleId,
          coverUrl: boxImg,
          bannerUrl: heroImg || boxImg,
          description: t.detail?.description || `${name} on Xbox / Microsoft Store.`,
          developer: t.detail?.developerName || undefined,
          publisher: t.detail?.publisherName || undefined,
          releaseDate: t.detail?.releaseDate ? String(t.detail.releaseDate).split('T')[0] : undefined,
          genres: Array.isArray(t.detail?.genres) && t.detail.genres.length > 0 ? t.detail.genres : ['Xbox PC'],
          tags: ['Xbox', matchedLocal ? 'Installed' : 'Cloud'],
          favorite: false,
          hidden: false,
          installed: Boolean(matchedLocal),
          playtimeMinutes: 0,
          addedDate: new Date().toISOString(),
          lastPlayed,
        });
      }
    }

    // Ensure any locally installed Xbox PC games not in TitleHub are also included
    for (const local of installedApps) {
      const key = (local.packageFamilyName || local.title).toLowerCase();
      if (seenKeys.has(key) || games.some((g) => g.title.toLowerCase() === local.title.toLowerCase())) {
        continue;
      }
      seenKeys.add(key);

      games.push({
        id: `xbox-local-${local.storeId || local.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        title: local.title,
        executablePath: local.executablePath || '',
        installUrl: local.storeId ? `ms-windows-store://pdp/?ProductId=${local.storeId}` : undefined,
        installPath: local.installPath,
        platform: 'xbox',
        storeId: local.storeId,
        coverUrl: '',
        bannerUrl: '',
        description: `${local.title} installed via Xbox / Microsoft Store.`,
        genres: ['Xbox PC'],
        tags: ['Xbox', 'Installed'],
        favorite: false,
        hidden: false,
        installed: true,
        playtimeMinutes: 0,
        addedDate: new Date().toISOString(),
      });
    }

    return games;
  }

  public async syncOwnedGames(): Promise<{ tokens: XboxTokens; games: Game[] }> {
    let tokens = this.getSavedTokens();
    if (!tokens) {
      throw new Error('No saved Xbox tokens found.');
    }
    if (this.isTokenExpired() && tokens.refreshToken) {
      tokens = await this.refreshOAuthTokens(tokens.refreshToken);
    }
    const games = await this.fetchOwnedGames(tokens);
    return { tokens, games };
  }
}

export const xboxDirectService = new XboxDirectService();
