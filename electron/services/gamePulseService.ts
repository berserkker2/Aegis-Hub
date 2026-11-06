import { PulseData, PulseGiveaway, PulseDeal, PulseNewsItem } from '../src/types/game';
import { galaxyDbService } from './galaxyDbService';
import { steamAchievementService } from './steamAchievementService';

interface CheapSharkStore {
  storeID: string;
  storeName: string;
  isActive: number;
}

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

const DEFAULT_STORES_MAP: Record<string, string> = {
  '1': 'Steam',
  '2': 'GamersGate',
  '3': 'GreenManGaming',
  '7': 'GOG',
  '11': 'Humble Store',
  '25': 'Epic Games Store',
  '31': 'Blizzard Shop',
  '35': 'Fanatical',
};

export class GamePulseService {
  private cache: PulseData | null = null;
  private cacheTimestamp = 0;
  private storesMap: Record<string, string> = { ...DEFAULT_STORES_MAP };
  private storesLoaded = false;

  /**
   * Get all aggregated pulse data (giveaways, deals, news) with caching
   */
  public async getPulseData(forceRefresh = false): Promise<PulseData> {
    const now = Date.now();
    if (!forceRefresh && this.cache && now - this.cacheTimestamp < CACHE_TTL_MS) {
      return this.cache;
    }

    // Load store names in parallel
    if (!this.storesLoaded) {
      this.loadCheapSharkStores().catch(() => {});
    }

    const [giveaways, deals, news] = await Promise.all([
      this.fetchGiveaways().catch((err) => {
        console.warn('Failed to fetch giveaways from GamerPower:', err);
        return this.cache?.giveaways || [];
      }),
      this.fetchDeals().catch((err) => {
        console.warn('Failed to fetch deals from CheapShark:', err);
        return this.cache?.deals || [];
      }),
      this.fetchNews().catch((err) => {
        console.warn('Failed to fetch gaming news:', err);
        return this.cache?.news || [];
      }),
    ]);

    const steamAchievements = steamAchievementService.getRecentAchievements(6);
    const achievements =
      steamAchievements.length > 0
        ? steamAchievements
        : galaxyDbService.getRecentAchievements(6);

    const result: PulseData = {
      giveaways,
      deals,
      news,
      achievements,
      lastUpdated: now,
    };

    this.cache = result;
    this.cacheTimestamp = now;
    return result;
  }

  /**
   * Fetch 100% free games and giveaways from GamerPower and Amazon Prime Gaming
   */
  private async fetchGiveaways(): Promise<PulseGiveaway[]> {
    const [gamerPowerRes, amazonRes] = await Promise.allSettled([
      this.fetchGamerPowerGiveaways(),
      this.fetchAmazonPrimeGiveaways(),
    ]);

    const gpList = gamerPowerRes.status === 'fulfilled' ? gamerPowerRes.value : [];
    const amzList = amazonRes.status === 'fulfilled' ? amazonRes.value : [];

    // Deduplicate by normalized title
    const seenTitles = new Set<string>();
    const combined: PulseGiveaway[] = [];

    for (const g of [...gpList, ...amzList]) {
      const norm = g.title.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!seenTitles.has(norm)) {
        seenTitles.add(norm);
        combined.push(g);
      }
    }

    return combined;
  }

  /**
   * Fetch free PC games from GamerPower (Epic, Steam, GOG, IndieGala, etc.)
   */
  private async fetchGamerPowerGiveaways(): Promise<PulseGiveaway[]> {
    try {
      const url = 'https://www.gamerpower.com/api/giveaways?type=game&sort-by=popularity';
      const res = await fetch(url, {
        headers: { 'User-Agent': 'AegisHub/1.0' },
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) {
        throw new Error(`GamerPower returned status ${res.status}`);
      }

      const data: any[] = await res.json();
      if (!Array.isArray(data)) return [];

      return data.map((item) => ({
        id: item.id || `giveaway-${Math.random()}`,
        title: item.title || 'Untitled Giveaway',
        worth: item.worth || 'Free',
        thumbnail: item.thumbnail || '',
        image: item.image || item.thumbnail || '',
        description: item.description || '',
        instructions: item.instructions || '',
        openGiveawayUrl: item.open_giveaway_url || '',
        publishedDate: item.published_date || '',
        type: item.type || 'Game',
        platforms: item.platforms || 'PC',
        endDate: item.end_date || undefined,
        users: item.users,
      }));
    } catch (err) {
      console.warn('Failed to fetch GamerPower giveaways:', err);
      return [];
    }
  }

  /**
   * Fetch free PC games from Amazon Prime Gaming via LootScraper feed
   */
  private async fetchAmazonPrimeGiveaways(): Promise<PulseGiveaway[]> {
    try {
      const url = 'https://feed.phenx.de/lootscraper_amazon_game.xml';
      const res = await fetch(url, {
        headers: { 'User-Agent': 'AegisHub/1.0' },
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) return [];
      const text = await res.text();
      const entries = text.match(/<entry>[\s\S]*?<\/entry>/g) || [];
      const active: PulseGiveaway[] = [];
      const now = new Date();

      for (const e of entries) {
        const titleM = e.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
        const linkM = e.match(/<link[^>]+href=["']([^"']+)["']/i);
        const imgM = e.match(/<img[^>]+src=["']([^"']+)["']/i);
        const validToM = e.match(/Offer valid to:<\/b>\s*([^<]+)/i);
        const descM = e.match(/<b>Description:<\/b>\s*([^<]+)/i);
        const priceM = e.match(/<b>Recommended price[^:]*:<\/b>\s*([^<]+)/i);

        let cleanTitle = titleM ? titleM[1].replace(/Amazon Prime \(Game, PC\) -\s*/i, '').trim() : '';
        let isExpired = false;
        let endDate: string | undefined = undefined;

        if (validToM) {
          const rawEnd = validToM[1].trim();
          const toDate = new Date(rawEnd);
          if (!isNaN(toDate.getTime())) {
            if (toDate < now) {
              isExpired = true;
            }
            endDate = rawEnd;
          }
        }

        if (!isExpired && cleanTitle) {
          const worthStr = priceM ? priceM[1].trim() : 'Free with Prime';
          active.push({
            id: `amazon-${Buffer.from(cleanTitle).toString('base64').slice(0, 12)}`,
            title: cleanTitle,
            worth: worthStr,
            thumbnail: imgM ? imgM[1] : '',
            image: imgM ? imgM[1] : '',
            description: descM ? descM[1].trim() : 'Free full PC game included with Amazon Prime Gaming.',
            instructions: 'Claim with your Amazon Prime subscription and play via Amazon Games App or linked store.',
            openGiveawayUrl: linkM ? linkM[1] : 'https://gaming.amazon.com/home',
            publishedDate: '',
            type: 'Game',
            platforms: 'PC, Amazon Games',
            endDate,
          });
        }
      }

      return active;
    } catch (err) {
      console.warn('Failed to fetch Amazon Prime Gaming giveaways:', err);
      return [];
    }
  }

  /**
   * Fetch top deals from CheapShark
   */
  private async fetchDeals(): Promise<PulseDeal[]> {
    const url = 'https://www.cheapshark.com/api/1.0/deals?pageSize=40&sortBy=DealRating&onSale=1';
    const res = await fetch(url, {
      headers: { 'User-Agent': 'AegisHub/1.0' },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      throw new Error(`CheapShark returned status ${res.status}`);
    }

    const data: any[] = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((item) => {
      const storeId = String(item.storeID || '1');
      const storeName = this.storesMap[storeId] || 'Digital Store';
      const savings = Math.round(parseFloat(item.savings || '0'));
      const metacriticScore = item.metacriticScore ? parseInt(item.metacriticScore, 10) : undefined;
      const steamRatingPercent = item.steamRatingPercent ? parseInt(item.steamRatingPercent, 10) : undefined;

      return {
        dealId: item.dealID,
        title: item.title || 'Unknown Game',
        salePrice: item.salePrice || '0.00',
        normalPrice: item.normalPrice || '0.00',
        savings,
        metacriticScore: metacriticScore && metacriticScore > 0 ? metacriticScore : undefined,
        steamRatingPercent: steamRatingPercent && steamRatingPercent > 0 ? steamRatingPercent : undefined,
        steamRatingText: item.steamRatingText || undefined,
        thumb: item.thumb || '',
        dealUrl: `https://www.cheapshark.com/redirect?dealID=${encodeURIComponent(item.dealID)}`,
        storeName,
        storeId,
        releaseDate: item.releaseDate,
      };
    });
  }

  /**
   * Load store name dictionary from CheapShark
   */
  private async loadCheapSharkStores(): Promise<void> {
    try {
      const res = await fetch('https://www.cheapshark.com/api/1.0/stores', {
        headers: { 'User-Agent': 'AegisHub/1.0' },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const stores: CheapSharkStore[] = await res.json();
        for (const s of stores) {
          if (s.storeID && s.storeName) {
            this.storesMap[s.storeID] = s.storeName;
          }
        }
        this.storesLoaded = true;
      }
    } catch {
      // Use default fallback stores
    }
  }

  /**
   * Fetch gaming news from official RSS feeds (Eurogamer, IGN, PC Gamer)
   */
  private async fetchNews(): Promise<PulseNewsItem[]> {
    const feeds = [
      { name: 'IGN', url: 'https://feeds.feedburner.com/ign/news' },
      { name: 'PC Gamer', url: 'https://www.pcgamer.com/rss/' },
      { name: 'Eurogamer', url: 'https://www.eurogamer.net/feed/news' },
    ];

    const results = await Promise.allSettled(
      feeds.map(async (feed) => {
        const res = await fetch(feed.url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AegisHub/1.0' },
          signal: AbortSignal.timeout(7000),
        });
        if (!res.ok) return [];
        const xml = await res.text();
        return this.parseRssXml(xml, feed.name);
      })
    );

    const allNews: PulseNewsItem[] = [];
    for (const r of results) {
      if (r.status === 'fulfilled' && Array.isArray(r.value)) {
        allNews.push(...r.value);
      }
    }

    // Sort newest first
    allNews.sort((a, b) => {
      const timeA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const timeB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return timeB - timeA;
    });

    // Provide up to 75 articles for rich pagination
    return allNews.slice(0, 75);
  }

  /**
   * Decode common HTML entities cleanly
   */
  private decodeHtml(str: string): string {
    return str
      .replace(/<!\[CDATA\[|\]\]>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#0?39;/g, "'")
      .replace(/&#8217;/g, "'")
      .replace(/&#8216;/g, "'")
      .replace(/&#8220;/g, '"')
      .replace(/&#8221;/g, '"')
      .replace(/&hellip;/g, '...')
      .replace(/&ndash;/g, '–')
      .replace(/&mdash;/g, '—')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  }

  /**
   * Parse RSS XML feeds safely without external bulky libraries
   */
  private parseRssXml(xml: string, sourceName: string): PulseNewsItem[] {
    const items: PulseNewsItem[] = [];
    const itemRegex = /<item[\s\S]*?<\/item>/gi;
    let match: RegExpExecArray | null;

    let index = 0;
    while ((match = itemRegex.exec(xml)) !== null && index < 30) {
      index++;
      const raw = match[0];
      const titleMatch = raw.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
      const linkMatch = raw.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
      const descMatch = raw.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
      const dateMatch = raw.match(/<pubDate>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/pubDate>/i);

      // Extract categories/tags if present
      const categoryMatches = raw.match(/<category[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/category>/gi) || [];
      const categories: string[] = categoryMatches
        .map((cat) => {
          const m = cat.match(/<category[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/category>/i);
          return m ? this.decodeHtml(m[1]) : '';
        })
        .filter((c) => c.length > 0 && c.length < 35);

      // Search for image in enclosure, media:content, media:thumbnail or embedded img
      const imgMatch =
        raw.match(/<enclosure[^>]+url=["']([^"']+)["']/i) ||
        raw.match(/<media:content[^>]+url=["']([^"']+)["']/i) ||
        raw.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i) ||
        raw.match(/<img[^>]+src=["']([^"']+)["']/i);

      const title = titleMatch ? this.decodeHtml(titleMatch[1]) : '';
      const link = linkMatch ? linkMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';

      let snippet = descMatch
        ? this.decodeHtml(descMatch[1].replace(/<[^>]+>/g, ' '))
        : '';

      // Normalize multiple spaces
      snippet = snippet.replace(/\s+/g, ' ').trim();

      if (snippet.length > 190) {
        snippet = snippet.slice(0, 187) + '...';
      }

      const imageUrl = imgMatch ? imgMatch[1].replace(/&amp;/g, '&') : undefined;
      const publishedAt = dateMatch ? dateMatch[1].trim() : '';

      // First 5 items from each major news outlet are editorial top stories/headlines
      const isTopStory = index <= 5;

      if (title && link) {
        items.push({
          id: `${sourceName.toLowerCase()}-${index}-${Buffer.from(title).toString('base64').slice(0, 10)}`,
          title,
          snippet,
          url: link,
          source: sourceName,
          publishedAt,
          imageUrl,
          isTopStory,
          categories: categories.length > 0 ? categories : undefined,
        });
      }
    }

    return items;
  }
}

export const gamePulseService = new GamePulseService();
