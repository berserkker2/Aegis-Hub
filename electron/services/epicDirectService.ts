import { BrowserWindow, session, app } from 'electron';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { Game, StoreAccount } from '../../src/types/game';
import { genreEnrichmentService } from './genreEnrichmentService';

export interface EpicTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  accountId: string;
  displayName: string;
}

export interface EpicCatalogItem {
  id: string;
  title: string;
  description?: string;
  developer?: string;
  publisher?: string;
  keyImages?: Array<{ type: string; url: string }>;
  categories?: Array<{ path: string }>;
}

const CLIENT_ID = '34a02cf8f4414e29b15921876da36f9a';
const CLIENT_SECRET = 'daafbccc737745039dffe53d94fc76cf';
const BASIC_AUTH = 'Basic MzRhMDJjZjhmNDQxNGUyOWIxNTkyMTg3NmRhMzZmOWE6ZGFhZmJjY2M3Mzc3NDUwMzlkZmZlNTNkOTRmYzc2Y2Y=';

export class EpicDirectService {
  private tokensFilePath: string;
  private catalogCacheFilePath: string;
  private catalogCache: Map<string, EpicCatalogItem> = new Map();

  constructor() {
    const dataDir = app ? app.getPath('userData') : path.join(process.cwd(), '.launcher-data');
    this.tokensFilePath = path.join(dataDir, 'epic-tokens.json');
    this.catalogCacheFilePath = path.join(dataDir, 'epic-catalog-cache.json');
    this.loadCatalogCache();
  }

  private loadCatalogCache(): void {
    try {
      if (fs.existsSync(this.catalogCacheFilePath)) {
        const raw = fs.readFileSync(this.catalogCacheFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        for (const [k, v] of Object.entries(parsed)) {
          this.catalogCache.set(k, v as EpicCatalogItem);
        }
      }
    } catch (e) {
      console.warn('Failed to load Epic catalog cache:', e);
    }
  }

  private saveCatalogCache(): void {
    try {
      const obj: Record<string, EpicCatalogItem> = {};
      for (const [k, v] of this.catalogCache.entries()) {
        obj[k] = v;
      }
      fs.writeFileSync(this.catalogCacheFilePath, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Failed to save Epic catalog cache:', e);
    }
  }

  public hasSavedTokens(): boolean {
    try {
      if (fs.existsSync(this.tokensFilePath)) {
        const raw = fs.readFileSync(this.tokensFilePath, 'utf-8');
        const tokens = JSON.parse(raw);
        return !!tokens.refreshToken;
      }
    } catch {}
    return false;
  }

  public getSavedTokens(): EpicTokens | null {
    try {
      if (fs.existsSync(this.tokensFilePath)) {
        const raw = fs.readFileSync(this.tokensFilePath, 'utf-8');
        return JSON.parse(raw);
      }
    } catch {}
    return null;
  }

  public saveTokens(tokens: EpicTokens): void {
    try {
      fs.writeFileSync(this.tokensFilePath, JSON.stringify(tokens, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save Epic tokens:', err);
    }
  }

  public clearTokens(): void {
    try {
      if (fs.existsSync(this.tokensFilePath)) {
        fs.unlinkSync(this.tokensFilePath);
      }
    } catch {}
  }

  private postForm(url: string, bodyParams: Record<string, string>, authHeader?: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const postData = new URLSearchParams(bodyParams).toString();

      const headers: Record<string, string> = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData).toString(),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      };

      if (authHeader) {
        headers['Authorization'] = authHeader;
      }

      const req = https.request(
        {
          hostname: parsedUrl.hostname,
          path: parsedUrl.pathname + parsedUrl.search,
          method: 'POST',
          headers,
        },
        (res) => {
          let data = '';
          res.on('data', (c) => (data += c));
          res.on('end', () => {
            try {
              const json = JSON.parse(data);
              if (res.statusCode && res.statusCode >= 400) {
                return reject(new Error(json.errorMessage || json.error_description || `HTTP ${res.statusCode}: ${data}`));
              }
              resolve(json);
            } catch (err) {
              reject(new Error(`Failed to parse JSON response (HTTP ${res.statusCode}): ${data.slice(0, 200)}`));
            }
          });
        }
      );

      req.on('error', reject);
      req.setTimeout(12000, () => {
        req.destroy();
        reject(new Error('Epic API request timeout'));
      });

      req.write(postData);
      req.end();
    });
  }

  private fetchJson(url: string, bearerToken?: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      };
      if (bearerToken) {
        headers['Authorization'] = `Bearer ${bearerToken}`;
      }

      const req = https.request(
        {
          hostname: parsedUrl.hostname,
          path: parsedUrl.pathname + parsedUrl.search,
          method: 'GET',
          headers,
        },
        (res) => {
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            return resolve(this.fetchJson(res.headers.location, bearerToken));
          }
          let data = '';
          res.on('data', (c) => (data += c));
          res.on('end', () => {
            try {
              const json = JSON.parse(data);
              if (res.statusCode && res.statusCode >= 400) {
                return reject(new Error(json.errorMessage || json.error_description || `HTTP ${res.statusCode}`));
              }
              resolve(json);
            } catch (err) {
              reject(new Error(`Failed to parse JSON (HTTP ${res.statusCode})`));
            }
          });
        }
      );

      req.on('error', reject);
      req.setTimeout(12000, () => {
        req.destroy();
        reject(new Error('Epic API request timeout'));
      });
      req.end();
    });
  }

  /**
   * Exchanges an authorization code or exchange code for OAuth tokens
   */
  public async exchangeCode(code: string, isExchangeCode = false): Promise<EpicTokens> {
    const url = 'https://account-public-service-prod.ol.epicgames.com/account/api/oauth/token';
    const params: Record<string, string> = {
      grant_type: isExchangeCode ? 'exchange_code' : 'authorization_code',
      token_type: 'eg1',
    };
    if (isExchangeCode) {
      params['exchange_code'] = code;
    } else {
      params['code'] = code;
    }

    const res = await this.postForm(url, params, BASIC_AUTH);
    const tokens: EpicTokens = {
      accessToken: res.access_token,
      refreshToken: res.refresh_token,
      expiresAt: Date.now() + (res.expires_in || 28800) * 1000,
      accountId: res.account_id,
      displayName: res.displayName || 'Epic Gamer',
    };

    this.saveTokens(tokens);
    return tokens;
  }

  /**
   * Refreshes the access token using the stored refresh token
   */
  public async refreshAccessToken(): Promise<EpicTokens | null> {
    const tokens = this.getSavedTokens();
    if (!tokens || !tokens.refreshToken) return null;

    try {
      const url = 'https://account-public-service-prod.ol.epicgames.com/account/api/oauth/token';
      const params = {
        grant_type: 'refresh_token',
        refresh_token: tokens.refreshToken,
        token_type: 'eg1',
      };

      const res = await this.postForm(url, params, BASIC_AUTH);
      const updated: EpicTokens = {
        accessToken: res.access_token,
        refreshToken: res.refresh_token,
        expiresAt: Date.now() + (res.expires_in || 28800) * 1000,
        accountId: res.account_id || tokens.accountId,
        displayName: res.displayName || tokens.displayName,
      };

      this.saveTokens(updated);
      return updated;
    } catch (err: any) {
      console.warn('Failed to refresh Epic token:', err.message);
      return null;
    }
  }

  /**
   * Retrieves a valid access token, automatically refreshing if close to expiry
   */
  public async getValidAccessToken(): Promise<string | null> {
    const tokens = this.getSavedTokens();
    if (!tokens) return null;

    // Refresh if within 5 minutes of expiring
    if (Date.now() > tokens.expiresAt - 300000) {
      const refreshed = await this.refreshAccessToken();
      return refreshed ? refreshed.accessToken : null;
    }

    return tokens.accessToken;
  }

  /**
   * Opens the official Epic Games login window to authenticate
   */
  public openLoginWindow(): Promise<{ tokens: EpicTokens; games: Game[] }> {
    return new Promise((resolve, reject) => {
      const authSession = session.fromPartition('persist:epic-login');
      const authWindow = new BrowserWindow({
        width: 620,
        height: 750,
        title: 'Sign in to Epic Games Store',
        autoHideMenuBar: true,
        modal: true,
        webPreferences: {
          session: authSession,
          nodeIntegration: false,
          contextIsolation: true,
        },
      });

      const loginUrl = `https://www.epicgames.com/id/login?redirectUrl=https%3A%2F%2Fwww.epicgames.com%2Fid%2Fapi%2Fredirect%3FclientId%3D${CLIENT_ID}%26responseType%3Dcode`;
      authWindow.loadURL(loginUrl);

      let handled = false;

      const finishWithCode = async (code: string, isExchange = false) => {
        if (handled) return;
        handled = true;
        try {
          if (!authWindow.isDestroyed()) authWindow.close();
          const tokens = await this.exchangeCode(code, isExchange);
          const games = await this.fetchOwnedGames(tokens);
          resolve({ tokens, games });
        } catch (err) {
          reject(err);
        }
      };

      // 1. Intercept navigation to redirectUrl
      const checkUrlForCode = (url: string) => {
        if (url.includes('epicgames.com/id/api/redirect') || url.includes('code=')) {
          const match = url.match(/[?&]code=([a-zA-Z0-9_-]+)/);
          if (match && match[1]) {
            finishWithCode(match[1], false);
            return true;
          }
        }
        return false;
      };

      authWindow.webContents.on('will-navigate', (_event, url) => {
        checkUrlForCode(url);
      });

      authWindow.webContents.on('will-redirect', (_event, url) => {
        checkUrlForCode(url);
      });

      authWindow.webContents.on('did-navigate', async (_event, url) => {
        if (checkUrlForCode(url)) return;

        // If Epic landed on the redirect JSON response page
        if (url.includes('epicgames.com/id/api/redirect')) {
          try {
            const bodyText = await authWindow.webContents.executeJavaScript('document.body.innerText');
            const parsed = JSON.parse(bodyText);
            if (parsed.authorizationCode) {
              finishWithCode(parsed.authorizationCode, false);
              return;
            }
          } catch {}
        }

        // If user finished login and reached account/store page, get exchange code via session cookies
        if (
          url.includes('epicgames.com/account') ||
          url.includes('store.epicgames.com')
        ) {
          try {
            // Fetch exchange code via Epic's API endpoint
            const exchangeRes = await authWindow.webContents.executeJavaScript(`
              fetch('https://www.epicgames.com/id/api/exchange', { method: 'POST', credentials: 'include' })
                .then(r => r.json())
                .catch(() => null)
            `);
            if (exchangeRes && exchangeRes.code) {
              finishWithCode(exchangeRes.code, true);
              return;
            }
          } catch {}
        }
      });

      authWindow.on('closed', () => {
        if (!handled) {
          reject(new Error('Epic Games authentication was cancelled by user.'));
        }
      });
    });
  }

  /**
   * Authenticates using an existing BrowserWindow and session
   */
  public authenticateWithWindow(authWindow: BrowserWindow, authSession: any): Promise<{ tokens: EpicTokens; games: Game[] }> {
    return new Promise((resolve, reject) => {
      const loginUrl = `https://www.epicgames.com/id/login?redirectUrl=https%3A%2F%2Fwww.epicgames.com%2Fid%2Fapi%2Fredirect%3FclientId%3D${CLIENT_ID}%26responseType%3Dcode`;
      authWindow.loadURL(loginUrl);

      let handled = false;

      const finishWithCode = async (code: string, isExchange = false) => {
        if (handled) return;
        handled = true;
        try {
          const tokens = await this.exchangeCode(code, isExchange);
          const games = await this.fetchOwnedGames(tokens);
          resolve({ tokens, games });
        } catch (err) {
          reject(err);
        }
      };

      const checkUrlForCode = (url: string) => {
        if (url.includes('epicgames.com/id/api/redirect') || url.includes('code=')) {
          const match = url.match(/[?&]code=([a-zA-Z0-9_-]+)/);
          if (match && match[1]) {
            finishWithCode(match[1], false);
            return true;
          }
        }
        return false;
      };

      authWindow.webContents.on('will-navigate', (_event, url) => {
        checkUrlForCode(url);
      });

      authWindow.webContents.on('will-redirect', (_event, url) => {
        checkUrlForCode(url);
      });

      authWindow.webContents.on('did-navigate', async (_event, url) => {
        if (checkUrlForCode(url)) return;

        if (url.includes('epicgames.com/id/api/redirect')) {
          try {
            const bodyText = await authWindow.webContents.executeJavaScript('document.body.innerText');
            const parsed = JSON.parse(bodyText);
            if (parsed.authorizationCode) {
              finishWithCode(parsed.authorizationCode, false);
              return;
            }
          } catch {}
        }

        if (
          url.includes('epicgames.com/account') ||
          url.includes('store.epicgames.com')
        ) {
          try {
            const exchangeRes = await authWindow.webContents.executeJavaScript(`
              fetch('https://www.epicgames.com/id/api/exchange', { method: 'POST', credentials: 'include' })
                .then(r => r.json())
                .catch(() => null)
            `);
            if (exchangeRes && exchangeRes.code) {
              finishWithCode(exchangeRes.code, true);
              return;
            }
          } catch {}
        }
      });
    });
  }

  /**
   * Fetches all user owned games using the Epic Online Services API
   */
  public async fetchOwnedGames(tokens?: EpicTokens): Promise<Game[]> {
    let accessToken: string | null = null;
    let accountId = '';

    if (tokens) {
      accessToken = tokens.accessToken;
      accountId = tokens.accountId;
    } else {
      accessToken = await this.getValidAccessToken();
      const saved = this.getSavedTokens();
      if (saved) accountId = saved.accountId;
    }

    if (!accessToken || !accountId) {
      throw new Error('Not authenticated with Epic Games Store.');
    }

    // 1. Fetch user assets (playable/launchable items)
    let assets: any[] = [];
    try {
      const assetsUrl = 'https://launcher-public-service-prod06.ol.epicgames.com/launcher/api/public/assets/Windows?label=Live';
      assets = await this.fetchJson(assetsUrl, accessToken);
    } catch (err: any) {
      console.warn('Failed to fetch Epic assets, falling back to entitlements:', err.message);
    }

    // 2. Fetch user entitlements (all owned licenses)
    let entitlements: any[] = [];
    try {
      const entUrl = `https://entitlement-public-service-prod08.ol.epicgames.com/entitlement/api/account/${accountId}/entitlements?start=0&count=5000`;
      entitlements = await this.fetchJson(entUrl, accessToken);
    } catch (err: any) {
      console.warn('Failed to fetch Epic entitlements:', err.message);
    }

    // Build map of item ID -> asset info
    const assetMap = new Map<string, any>();
    for (const a of assets) {
      if (a.catalogItemId) {
        assetMap.set(a.catalogItemId, a);
      }
      if (a.appName) {
        assetMap.set(a.appName, a);
      }
    }

    // Collect all unique catalog item IDs and namespaces to resolve
    const itemsToQuery = new Map<string, string>(); // catalogItemId -> namespace
    const ownedCatalogItemIds = new Set<string>();

    for (const e of entitlements) {
      if (e.catalogItemId && e.entitlementType !== 'AUDIENCE') {
        ownedCatalogItemIds.add(e.catalogItemId);
        if (e.namespace && !this.catalogCache.has(e.catalogItemId)) {
          itemsToQuery.set(e.catalogItemId, e.namespace);
        }
      }
    }

    for (const a of assets) {
      if (a.catalogItemId) {
        ownedCatalogItemIds.add(a.catalogItemId);
        if (a.namespace && !this.catalogCache.has(a.catalogItemId)) {
          itemsToQuery.set(a.catalogItemId, a.namespace);
        }
      }
    }

    // 3. Batch query catalog metadata for any items not in local cache
    if (itemsToQuery.size > 0) {
      const namespaceGroups = new Map<string, string[]>();
      for (const [id, ns] of itemsToQuery.entries()) {
        const list = namespaceGroups.get(ns) || [];
        list.push(id);
        namespaceGroups.set(ns, list);
      }

      for (const [ns, ids] of namespaceGroups.entries()) {
        // Query in chunks of 50
        for (let i = 0; i < ids.length; i += 50) {
          const chunk = ids.slice(i, i + 50);
          try {
            const queryUrl = `https://catalog-public-service-prod06.ol.epicgames.com/catalog/api/shared/namespace/${ns}/bulk/items?id=${chunk.join('&id=')}&country=US&locale=en-US`;
            const catalogData = await this.fetchJson(queryUrl, accessToken);
            for (const [id, item] of Object.entries(catalogData)) {
              this.catalogCache.set(id, item as EpicCatalogItem);
            }
          } catch (e) {
            console.warn(`Failed to fetch catalog chunk for namespace ${ns}:`, e);
          }
        }
      }
      this.saveCatalogCache();
    }

    // 4. Check locally installed Epic games to match install status
    const installedMap = this.detectInstalledEpicGames();

    // 5. Construct Game objects
    const games: Game[] = [];
    const seenTitles = new Set<string>();

    for (const catalogId of ownedCatalogItemIds) {
      const catalogItem = this.catalogCache.get(catalogId);
      const asset = assetMap.get(catalogId);

      const title = catalogItem?.title || asset?.appName || '';
      if (!title) continue;

      const cleanTitle = title.replace(/[®™]/g, '').trim();
      const titleLower = cleanTitle.toLowerCase();

      // Filter out non-games by Epic category
      const categories = catalogItem?.categories?.map((c) => c.path.toLowerCase()) || [];
      if (
        categories.some(
          (c) =>
            c.startsWith('assets') ||
            c.startsWith('engines') ||
            c === 'subscription' ||
            c === 'testing' ||
            c === 'deprecated' ||
            c === 'digitalextras' ||
            c === 'audience' ||
            (c.startsWith('addons') && !cleanTitle.includes('Wintermute') && !categories.some((cat) => cat.includes('launchable')))
        )
      ) {
        continue;
      }

      // Filter DLCs, soundtracks, art books, wallpapers, packs, cosmetic skins
      if (
        /\b(soundtrack|ost|artbook|art\s*book|wallpaper|content\s*pack|puzzle\s*pack|map\s*pack|skin|audience|friend\s*invite)\b/i.test(cleanTitle) ||
        /\b(save\s*the\s*world|lego\s*fortnite\s*content|dying\s*light\s*the\s*bozak|dying\s*light\s*the\s*following|peril\s*on\s*gorgon|battle\s*pack|gold\s*edition\s*pack)\b/i.test(cleanTitle) ||
        /^(unreal\s*engine|4\.\d+|lea\s*observatory|pistola|omega\s*armor|paperbag|folkevening)/i.test(cleanTitle)
      ) {
        continue;
      }

      // Deduplicate titles ignoring punctuation differences (e.g. "Game" vs "Game:" or legacy codenames)
      const normalizedKey = cleanTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (seenTitles.has(normalizedKey)) continue;
      seenTitles.add(normalizedKey);

      // Resolve artwork (supports all Epic Games Store artwork types: DieselGameBoxTall, OfferImageTall, DieselGameBox, etc.)
      let coverUrl = '';
      let bannerUrl = '';
      if (catalogItem?.keyImages) {
        for (const img of catalogItem.keyImages) {
          if (
            img.type === 'DieselGameBoxTall' ||
            img.type === 'OfferImageTall' ||
            img.type === 'DieselStoreFrontTall' ||
            img.type === 'Thumbnail' ||
            img.type === 'CodeRedemption_340x440'
          ) {
            if (!coverUrl) coverUrl = img.url;
          }
          if (
            img.type === 'DieselGameBox' ||
            img.type === 'DieselGameBoxWide' ||
            img.type === 'OfferImageWide' ||
            img.type === 'DieselStoreFrontWide' ||
            img.type === 'featuredMedia' ||
            img.type === 'Featured' ||
            img.type === 'Screenshot'
          ) {
            if (!bannerUrl) bannerUrl = img.url;
          }
        }

        // Fallback: check aspect ratio from dimensions if specific types were not present
        if (!coverUrl || !bannerUrl) {
          for (const img of catalogItem.keyImages) {
            if (img.width && img.height) {
              if (!coverUrl && img.height > img.width) coverUrl = img.url;
              if (!bannerUrl && img.width > img.height) bannerUrl = img.url;
            }
          }
        }
      }

      const appName = asset?.appName || catalogId;
      const installedInfo =
        installedMap.get(catalogId.toLowerCase()) ||
        installedMap.get(appName.toLowerCase()) ||
        installedMap.get(titleLower);
      const isInstalled = !!installedInfo;

      const executablePath = installedInfo?.launchUri || `com.epicgames.launcher://apps/${appName}?action=launch&silent=true`;
      const installUrl = `https://store.epicgames.com/en-US/browse?q=${encodeURIComponent(cleanTitle)}`;

      const description = catalogItem?.description || `Owned on Epic Games Store account.`;
      const developer = catalogItem?.developer || '';
      const genres = genreEnrichmentService.normalizeAndEnrichGenres(cleanTitle, ['Epic Games'], [], [], catalogId, 'epic');

      games.push({
        id: `epic-cloud-${catalogId}`,
        title: cleanTitle,
        executablePath,
        installUrl,
        platform: 'epic',
        storeId: catalogId,
        coverUrl: coverUrl || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80',
        bannerUrl: bannerUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1920&q=80',
        description,
        summary: description.slice(0, 200),
        genres,
        tags: ['EPIC Cloud', isInstalled ? 'Installed' : 'Uninstalled'],
        developer,
        favorite: false,
        hidden: false,
        installed: isInstalled,
        playtimeMinutes: 0,
        addedDate: new Date().toISOString(),
      });
    }

    return games;
  }

  /**
   * Reads C:\ProgramData\Epic\EpicGamesLauncher\Data\Manifests to see what is installed
   */
  private detectInstalledEpicGames(): Map<string, { appName: string; displayName: string; installLocation: string; launchUri: string; catalogItemId: string }> {
    const map = new Map<string, { appName: string; displayName: string; installLocation: string; launchUri: string; catalogItemId: string }>();
    const manifestDir = 'C:\\ProgramData\\Epic\\EpicGamesLauncher\\Data\\Manifests';
    if (!fs.existsSync(manifestDir)) return map;

    try {
      const files = fs.readdirSync(manifestDir);
      for (const f of files) {
        if (f.endsWith('.item')) {
          try {
            const raw = fs.readFileSync(path.join(manifestDir, f), 'utf-8');
            const data = JSON.parse(raw);
            if (data.AppName && data.DisplayName && data.InstallLocation && fs.existsSync(data.InstallLocation)) {
              const ns = data.CatalogNamespace || '';
              const catId = data.CatalogItemId || '';
              const app = data.AppName;
              const launchUri = (ns && catId)
                ? `com.epicgames.launcher://apps/${encodeURIComponent(ns)}%3A${encodeURIComponent(catId)}%3A${encodeURIComponent(app)}?action=launch&silent=true`
                : `com.epicgames.launcher://apps/${app}?action=launch&silent=true`;

              const info = {
                appName: data.AppName,
                displayName: data.DisplayName,
                installLocation: data.InstallLocation || '',
                launchUri,
                catalogItemId: catId,
              };

              map.set(data.AppName.toLowerCase(), info);
              if (catId) {
                map.set(catId.toLowerCase(), info);
              }
              map.set(data.DisplayName.toLowerCase().trim(), info);
            }
          } catch {}
        }
      }
    } catch {}

    return map;
  }
}

export const epicDirectService = new EpicDirectService();
