import https from 'https';

export interface SteamReleaseItem {
  id: string; // AppId as string
  title: string;
  coverUrl: string; // High-res 2:3 vertical cover (library_capsule_2x / library_capsule)
  headerUrl: string; // Wide fallback
  bannerUrl?: string; // Wide 16:9 hero banner
  releaseDateStr: string;
  parsedDate?: string; // YYYY-MM-DD
  price?: string;
  originalPrice?: string;
  discountPercent?: string;
  steamUrl: string;
  isComingSoon?: boolean;
  shortDescription?: string;
  developer?: string;
  publisher?: string;
  isAdult?: boolean;
}

export interface ReleaseMonthSection {
  monthKey: string; // e.g. "2026-11"
  label: string;    // e.g. "November 2026"
  isRecentReleases?: boolean;
  games: SteamReleaseItem[];
}

export interface SteamReleasesResponse {
  currentPeriod: string; // e.g. "2026-11"
  sections: ReleaseMonthSection[];
  availableYears: number[];
  cachedAt: number;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

// Master catalog cache so switching months is instantaneous
interface MasterCatalogCache {
  popularNew: SteamReleaseItem[];
  topReleasedByMonth: Map<string, SteamReleaseItem[]>;
  upcomingByMonth: Map<string, SteamReleaseItem[]>;
  timestamp: number;
}

let masterCache: MasterCatalogCache | null = null;
const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

function fetchJson(url: string, timeoutMs = 10000): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        },
        timeout: timeoutMs,
      },
      (res) => {
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
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout fetching ${url}`));
    });
    req.on('error', (err) => {
      reject(err);
    });
  });
}

function buildAssetUrl(assetFormat: string | undefined, filename: string | undefined, appId: number): string {
  if (!filename) {
    return `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/library_600x900.jpg`;
  }
  if (filename.startsWith('http')) return filename;

  if (assetFormat) {
    const relativePath = assetFormat.replace('${FILENAME}', filename);
    return `https://shared.akamai.steamstatic.com/store_item_assets/${relativePath}`;
  }

  return `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/${filename}`;
}

function formatReleaseDateDisplay(unixSeconds?: number, customMsg?: string): { display: string; iso?: string; monthKey?: string } {
  if (!unixSeconds || unixSeconds <= 0) {
    return { display: customMsg || 'Coming Soon' };
  }
  const dt = new Date(unixSeconds * 1000);
  const year = dt.getUTCFullYear();
  const monthIdx = dt.getUTCMonth(); // 0-11
  const day = dt.getUTCDate();

  const monthStr = String(monthIdx + 1).padStart(2, '0');
  const dayStr = String(day).padStart(2, '0');

  return {
    display: `${day} ${SHORT_MONTHS[monthIdx]}, ${year}`,
    iso: `${year}-${monthStr}-${dayStr}`,
    monthKey: `${year}-${monthStr}`,
  };
}

function mapStoreItemToRelease(item: any, isUpcoming = false): { release: SteamReleaseItem; monthKey?: string; releaseTimestamp: number } | null {
  if (!item || !item.appid || !item.name) return null;

  const appId = Number(item.appid);
  const assets = item.assets || {};
  const assetFormat: string | undefined = assets.asset_url_format;

  // Adult / NSFW detection via Steam content descriptors (3 = Adult Only sexual content, 4 = Frequent Nudity / Sexual content)
  const descriptorIds: number[] = item.content_descriptorids || [];
  const isAdultDescriptor = descriptorIds.includes(3) || descriptorIds.includes(4);

  // Adult text heuristic as safety net
  const titleLower = String(item.name).toLowerCase();
  const adultRegex = /\b(hentai|erotic|erotica|nsfw|porn|xxx|r18|r-18|waifu strip|strip poker)\b/i;
  const isAdult = isAdultDescriptor || adultRegex.test(titleLower);

  // Prefer high-resolution 2:3 vertical poster (library_capsule_2x -> library_capsule -> main_capsule -> header)
  const verticalFile = assets.library_capsule_2x || assets.library_capsule || assets.hero_capsule || assets.main_capsule || assets.header;
  const headerFile = assets.header_2x || assets.header || assets.main_capsule || assets.small_capsule;
  const heroFile = assets.library_hero_2x || assets.library_hero || assets.main_capsule_2x || assets.main_capsule || headerFile;

  const coverUrl = buildAssetUrl(assetFormat, verticalFile, appId);
  const headerUrl = buildAssetUrl(assetFormat, headerFile, appId);
  const bannerUrl = buildAssetUrl(assetFormat, heroFile, appId);

  const relUnix: number = item.release?.steam_release_date || 0;
  const customMsg: string | undefined = item.release?.custom_release_date_message;
  const { display, iso, monthKey } = formatReleaseDateDisplay(relUnix, customMsg);

  const basicInfo = item.basic_info || {};
  const shortDescription: string | undefined = basicInfo.short_description
    ? String(basicInfo.short_description).trim()
    : undefined;
  const developer: string | undefined = basicInfo.developers?.[0]?.name || undefined;
  const publisher: string | undefined = basicInfo.publishers?.[0]?.name || developer || undefined;

  // Price & Discount
  const purchase = item.best_purchase_option;
  let price: string | undefined = undefined;
  let originalPrice: string | undefined = undefined;
  let discountPercent: string | undefined = undefined;

  if (purchase) {
    if (purchase.formatted_final_price) {
      price = purchase.formatted_final_price;
    }
    if (purchase.discount_pct && purchase.discount_pct > 0) {
      discountPercent = `-${purchase.discount_pct}%`;
      if (purchase.formatted_original_price && purchase.formatted_original_price !== price) {
        originalPrice = purchase.formatted_original_price;
      }
    }
  } else if (item.is_free) {
    price = 'Free';
  }

  // Exact official store path from Steam API
  const storePath = item.store_url_path
    ? `https://store.steampowered.com/${item.store_url_path.replace(/^\/+/, '')}`
    : `https://store.steampowered.com/app/${appId}/`;

  return {
    release: {
      id: String(appId),
      title: item.name,
      coverUrl,
      headerUrl,
      bannerUrl,
      releaseDateStr: display,
      parsedDate: iso,
      price,
      originalPrice,
      discountPercent,
      steamUrl: storePath,
      isComingSoon: isUpcoming || Boolean(item.release?.is_coming_soon),
      shortDescription,
      developer,
      publisher,
      isAdult,
    },
    monthKey,
    releaseTimestamp: relUnix,
  };
}

async function querySteamStore(options: {
  count: number;
  start: number;
  sort: number;
  releasedOnly?: boolean;
  comingSoonOnly?: boolean;
}): Promise<any[]> {
  const payload = {
    query: {
      count: options.count,
      start: options.start,
      sort: options.sort,
      filters: {
        ...(options.releasedOnly ? { released_only: true } : {}),
        ...(options.comingSoonOnly ? { coming_soon_only: true } : {}),
        type_filters: {
          include_games: true,
        },
      },
    },
    context: {
      language: 'english',
      country_code: 'PT',
      steam_realm: 1,
    },
    data_request: {
      include_assets: true,
      include_release: true,
      include_best_purchase_option: true,
      include_basic_info: true,
      include_content_descriptors: true,
    },
  };

  const url = `https://api.steampowered.com/IStoreQueryService/Query/v1/?input_json=${encodeURIComponent(
    JSON.stringify(payload)
  )}`;
  const res = await fetchJson(url);
  return res?.response?.store_items || [];
}

export class SteamDiscoveryService {
  private async ensureMasterCatalog(): Promise<MasterCatalogCache> {
    if (masterCache && Date.now() - masterCache.timestamp < CACHE_TTL_MS) {
      return masterCache;
    }

    // Fetch in parallel:
    // 1. Popular New Releases (sort: 20, released_only: true) -> Most relevant recent releases
    // 2. Top Sellers / Relevant Released Games across pages (sort: 11, count: 500 x 3) -> Covers past months & years
    // 3. Most Popular & Wishlisted Upcoming Releases (coming_soon_only: true, sort: 11 & 12) -> Covers future months
    const [popNewRaw, relPage1, relPage2, relPage3, upSellers, upWishlisted] = await Promise.all([
      querySteamStore({ count: 120, start: 0, sort: 20, releasedOnly: true }),
      querySteamStore({ count: 500, start: 0, sort: 11, releasedOnly: true }),
      querySteamStore({ count: 500, start: 500, sort: 11, releasedOnly: true }),
      querySteamStore({ count: 500, start: 1000, sort: 11, releasedOnly: true }),
      querySteamStore({ count: 500, start: 0, sort: 11, comingSoonOnly: true }),
      querySteamStore({ count: 500, start: 0, sort: 12, comingSoonOnly: true }),
    ]);

    const nowSec = Math.floor(Date.now() / 1000);
    const thirtyDaysAgoSec = nowSec - 35 * 24 * 60 * 60; // 30-35 days window for Recent Releases

    // 1. Process Popular New Releases (Last 30 days, only relevant titles, sorted by popularity/recency)
    const popularNew: SteamReleaseItem[] = [];
    const seenPopIds = new Set<string>();

    for (const raw of [...popNewRaw, ...relPage1]) {
      const mapped = mapStoreItemToRelease(raw, false);
      if (!mapped) continue;
      if (seenPopIds.has(mapped.release.id)) continue;

      if (mapped.releaseTimestamp >= thirtyDaysAgoSec && mapped.releaseTimestamp <= nowSec + 86400) {
        seenPopIds.add(mapped.release.id);
        popularNew.push(mapped.release);
      }
    }

    // 2. Process Top Released Games by Month (for past months navigation)
    const topReleasedByMonth = new Map<string, SteamReleaseItem[]>();
    const seenRelIds = new Set<string>();

    for (const raw of [...popNewRaw, ...relPage1, ...relPage2, ...relPage3]) {
      const mapped = mapStoreItemToRelease(raw, false);
      if (!mapped || !mapped.monthKey) continue;
      if (seenRelIds.has(mapped.release.id)) continue;
      seenRelIds.add(mapped.release.id);

      const list = topReleasedByMonth.get(mapped.monthKey) || [];
      list.push(mapped.release);
      topReleasedByMonth.set(mapped.monthKey, list);
    }

    // 3. Process Upcoming Games by Month (for next 3 months & future navigation)
    const upcomingByMonth = new Map<string, SteamReleaseItem[]>();
    const seenUpIds = new Set<string>();

    for (const raw of [...upSellers, ...upWishlisted]) {
      const mapped = mapStoreItemToRelease(raw, true);
      if (!mapped || !mapped.monthKey) continue;
      if (seenUpIds.has(mapped.release.id)) continue;
      seenUpIds.add(mapped.release.id);

      const list = upcomingByMonth.get(mapped.monthKey) || [];
      list.push(mapped.release);
      upcomingByMonth.set(mapped.monthKey, list);
    }

    masterCache = {
      popularNew,
      topReleasedByMonth,
      upcomingByMonth,
      timestamp: Date.now(),
    };

    return masterCache;
  }

  async getReleases(targetYear?: number, targetMonth?: number, filterAdult = true): Promise<SteamReleasesResponse> {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1; // 1-12

    const year = targetYear && targetYear >= 1995 && targetYear <= 2030 ? targetYear : curYear;
    const month = targetMonth && targetMonth >= 1 && targetMonth <= 12 ? targetMonth : curMonth;

    const currentPeriodKey = `${year}-${String(month).padStart(2, '0')}`;
    const isCurrentPeriod = year === curYear && month === curMonth;

    const availableYears: number[] = [];
    for (let yr = curYear - 8; yr <= curYear + 2; yr++) {
      availableYears.push(yr);
    }

    try {
      const catalog = await this.ensureMasterCatalog();

      // Calculate the 3 consecutive months starting from (year, month)
      const targetMonths: { year: number; month: number; label: string; monthKey: string }[] = [];
      let y = year;
      let m = month;

      for (let i = 0; i < 3; i++) {
        const mKey = `${y}-${String(m).padStart(2, '0')}`;
        const mLabel = `${MONTH_NAMES[m - 1]} ${y}`;
        targetMonths.push({ year: y, month: m, label: mLabel, monthKey: mKey });
        m++;
        if (m > 12) {
          m = 1;
          y++;
        }
      }

      const sections: ReleaseMonthSection[] = [];

      const filterItem = (item: SteamReleaseItem) => {
        if (!filterAdult) return true;
        return !item.isAdult;
      };

      // When viewing the current month, show "Recent Releases" (Most relevant games from the last 30 days)
      if (isCurrentPeriod) {
        sections.push({
          monthKey: 'recent',
          label: 'Recent Releases',
          isRecentReleases: true,
          games: catalog.popularNew.filter(filterItem).slice(0, 36),
        });
      }

      // Add the 3 consecutive months
      for (const mInfo of targetMonths) {
        const isFutureOrCurrentMonth =
          mInfo.year > curYear || (mInfo.year === curYear && mInfo.month >= curMonth);

        let gamesForMonth: SteamReleaseItem[] = [];

        if (isFutureOrCurrentMonth) {
          // For current & future months, show upcoming releases (and for current month if not in recent, or upcoming first)
          const upcoming = catalog.upcomingByMonth.get(mInfo.monthKey) || [];
          gamesForMonth = upcoming.filter(filterItem).slice(0, 36);
        } else {
          // For past months, show the top relevant released games of that month
          const released = catalog.topReleasedByMonth.get(mInfo.monthKey) || [];
          gamesForMonth = released.filter(filterItem).slice(0, 36);
        }

        sections.push({
          monthKey: mInfo.monthKey,
          label: mInfo.label,
          games: gamesForMonth,
        });
      }

      return {
        currentPeriod: currentPeriodKey,
        sections,
        availableYears,
        cachedAt: catalog.timestamp,
      };
    } catch (err) {
      console.error('[SteamDiscoveryService] Error building releases:', err);
      return {
        currentPeriod: currentPeriodKey,
        sections: [],
        availableYears,
        cachedAt: Date.now(),
      };
    }
  }
}

export const steamDiscoveryService = new SteamDiscoveryService();
