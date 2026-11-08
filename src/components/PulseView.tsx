import React, { useState, useEffect, useMemo } from 'react';
import {
  Gift,
  Tag,
  Newspaper,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Flame,
  Clock,
  Globe,
  Layers,
  Percent,
  CheckCircle2,
  Calendar,
  AlertCircle,
  TrendingUp,
  Gamepad2,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  BookmarkCheck,
  Radio,
  Play,
  Trophy,
  HardDrive,
  Star,
  Moon,
  Compass
} from 'lucide-react';
import { Game, PulseData, PulseGiveaway, PulseDeal, PulseNewsItem, UserAchievement } from '../types/game';
import { RecentlyPlayedShelf } from './RecentlyPlayedShelf';
import { toLocalDateStr } from '../utils/formatters';
import steamLogo from '../assets/logos/steam.webp';
import epicLogo from '../assets/logos/epic.webp';
import gogLogo from '../assets/logos/gog.webp';
import xboxLogo from '../assets/logos/xbox.webp';

interface PulseViewProps {
  games: Game[];
  onSelectGame: (game: Game) => void;
  onLaunchGame: (game: Game, e: React.MouseEvent) => void;
  onToggleFavorite: (gameId: string, e: React.MouseEvent) => void;
  onNavigateToLibrary?: () => void;
  showPlatformBadges?: boolean;
}

export const PulseView: React.FC<PulseViewProps> = ({
  games,
  onSelectGame,
  onLaunchGame,
  onToggleFavorite,
  onNavigateToLibrary,
  showPlatformBadges = true,
}) => {
  const [pulseData, setPulseData] = useState<PulseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [recentAchievements, setRecentAchievements] = useState<UserAchievement[]>([]);
  const [dailyActivity, setDailyActivity] = useState<Record<string, number>>({});

  // Filters & sorting states
  const [selectedGiveawayPlatform, setSelectedGiveawayPlatform] = useState<string>('all');
  const [selectedDealStore, setSelectedDealStore] = useState<string>('all');
  const [selectedDealSort, setSelectedDealSort] = useState<'dealRating' | 'savings' | 'price'>('dealRating');
  const [selectedNewsSource, setSelectedNewsSource] = useState<string>('all');
  const [newsSortBy, setNewsSortBy] = useState<'relevant' | 'newest'>('relevant');
  const [topStoryPage, setTopStoryPage] = useState<number>(1);
  const TOP_STORIES_PER_PAGE = 4;
  const [newsPage, setNewsPage] = useState<number>(1);
  const NEWS_PER_PAGE = 9;

  const hasRecentGames = games.some((g) => g.lastPlayed && !g.hidden);

  const loadPulseData = async (forceRefresh = false) => {
    if (forceRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      if (window.api?.getPulseData) {
        const data = await window.api.getPulseData(forceRefresh);
        setPulseData(data);
        if (data?.achievements && data.achievements.length > 0) {
          setRecentAchievements(data.achievements);
        }
      }
      if (window.api?.getRecentAchievements) {
        const achs = await window.api.getRecentAchievements(6);
        if (achs && achs.length > 0) {
          setRecentAchievements(achs);
        }
      }
      if (window.api?.getDailyActivity) {
        const act = await window.api.getDailyActivity();
        if (act) {
          setDailyActivity(act);
        }
      }
    } catch (err: any) {
      console.error('Failed to load Aegis Pulse data:', err);
      setError('Unable to load live gaming updates right now. Please check your internet connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPulseData();
  }, []);

  useEffect(() => {
    if (window.api?.onDailyActivityUpdated) {
      const cleanup = window.api.onDailyActivityUpdated((updated) => {
        if (updated) {
          setDailyActivity(updated);
        }
      });
      return cleanup;
    }
  }, []);

  const openUrl = (url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!url) return;
    if (window.api?.openExternal) {
      window.api.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const getStoreLogo = (storeName: string) => {
    const s = storeName.toLowerCase();
    if (s.includes('steam')) return steamLogo;
    if (s.includes('epic')) return epicLogo;
    if (s.includes('gog')) return gogLogo;
    if (s.includes('xbox')) return xboxLogo;
    return null;
  };

  const formatRelativeTime = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 60) return `${Math.max(1, diffMins)}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getGiveawayStorePriority = (item: PulseGiveaway): number => {
    const p = item.platforms.toLowerCase();
    if (p.includes('epic')) return 1;
    if (p.includes('steam')) return 2;
    if (p.includes('gog')) return 3;
    if (p.includes('amazon') || p.includes('prime')) return 4;
    return 5;
  };

  const getGiveawayStoreInfo = (item: PulseGiveaway) => {
    const p = item.platforms.toLowerCase();
    if (p.includes('epic')) return { name: 'Epic Games Store', logo: epicLogo, isAmazon: false };
    if (p.includes('steam')) return { name: 'Steam', logo: steamLogo, isAmazon: false };
    if (p.includes('gog')) return { name: 'GOG Galaxy', logo: gogLogo, isAmazon: false };
    if (p.includes('amazon') || p.includes('prime')) return { name: 'Amazon Prime Gaming', logo: null, isAmazon: true };
    if (p.includes('itch')) return { name: 'itch.io', logo: null, isAmazon: false };
    return { name: item.platforms || 'DRM-Free PC', logo: null, isAmazon: false };
  };

  // Filter and sort giveaways (Epic Games -> Steam -> GOG -> Amazon -> Others)
  const filteredGiveaways = (pulseData?.giveaways || [])
    .filter((item) => {
      if (selectedGiveawayPlatform === 'all') return true;
      const p = item.platforms.toLowerCase();
      if (selectedGiveawayPlatform === 'epic') return p.includes('epic');
      if (selectedGiveawayPlatform === 'steam') return p.includes('steam');
      if (selectedGiveawayPlatform === 'gog') return p.includes('gog');
      if (selectedGiveawayPlatform === 'amazon') return p.includes('amazon') || p.includes('prime');
      if (selectedGiveawayPlatform === 'pc') return p.includes('pc') || p.includes('drm-free');
      return true;
    })
    .sort((a, b) => getGiveawayStorePriority(a) - getGiveawayStorePriority(b));

  // Filter and sort deals
  const filteredDeals = (pulseData?.deals || [])
    .filter((deal) => {
      if (selectedDealStore === 'all') return true;
      const s = deal.storeName.toLowerCase();
      if (selectedDealStore === 'steam') return s.includes('steam');
      if (selectedDealStore === 'epic') return s.includes('epic');
      if (selectedDealStore === 'gog') return s.includes('gog');
      if (selectedDealStore === 'humble') return s.includes('humble');
      if (selectedDealStore === 'fanatical') return s.includes('fanatical');
      return true;
    })
    .sort((a, b) => {
      if (selectedDealSort === 'savings') {
        return b.savings - a.savings;
      }
      if (selectedDealSort === 'price') {
        return parseFloat(a.salePrice) - parseFloat(b.salePrice);
      }
      // default: deal rating / quality
      return (b.metacriticScore || 70) - (a.metacriticScore || 70);
    });

  // User library matching dictionary
  const userGameNames = useMemo(() => {
    return games
      .filter((g) => !g.hidden && g.name && g.name.trim().length >= 3)
      .map((g) => ({
        id: g.id,
        name: g.name.trim(),
        clean: g.name.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim(),
      }));
  }, [games]);

  const getNewsLibraryMatch = (news: PulseNewsItem): string | null => {
    const titleClean = ` ${news.title.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ')} `;
    const categoriesClean = (news.categories || []).map((c) => c.toLowerCase());

    for (const game of userGameNames) {
      if (game.clean.length >= 4) {
        if (
          titleClean.includes(` ${game.clean} `) ||
          categoriesClean.some((c) => c.includes(game.clean))
        ) {
          return game.name;
        }
      }
    }
    return null;
  };

  // Detect routine noise (guides, puzzle hints, wordle, hardware minor sales)
  const isRoutineOrGuide = (news: PulseNewsItem): boolean => {
    const text = `${news.title} ${news.snippet || ''}`.toLowerCase();
    return (
      /\b(wordle|quordle|connections hint|strands hint|daily puzzle|crossword)\b/i.test(text) ||
      /\b(hints? and answers?|today'?s answer|clues and answers)\b/i.test(text) ||
      /\b(how to (get|find|beat|unlock|catch|craft|farm|defeat|romance|solve))\b/i.test(text) ||
      /\b(where to (find|get|buy))\b/i.test(text) ||
      /\b(best (build|builds|weapons?|armor|talents?|perks?|classes|settings))\b/i.test(text) ||
      /\b(tier list|walkthrough|interactive map|beginner'?s guide)\b/i.test(text) ||
      /\b(deal alert|save \$\d+|save \£\d+|cheap deal|discount on (a|the|this))\b/i.test(text) ||
      /\b(server status|servers down|scheduled maintenance)\b/i.test(text)
    );
  };

  // Calculate genuine industry impact score for a story
  const calculateNewsImpactScore = (news: PulseNewsItem): number => {
    const title = news.title.toLowerCase();
    const categories = (news.categories || []).map((c) => c.toLowerCase());
    const snippet = (news.snippet || '').toLowerCase();
    const fullText = `${title} ${categories.join(' ')} ${snippet}`;

    // Discard routine noise
    if (isRoutineOrGuide(news)) {
      return -50;
    }

    let score = 0;

    // 1. Personal Library Match (highest relevance for the user)
    const libMatch = getNewsLibraryMatch(news);
    if (libMatch) {
      score += 100;
    }

    // 2. Big Announcements & Industry Milestones
    if (/\b(announce|announces|announced|announcement)\b/i.test(title)) score += 35;
    if (/\b(reveal|reveals|revealed|unveil|unveils|unveiled)\b/i.test(title)) score += 35;
    if (/\b(trailer|gameplay trailer|first trailer|official trailer|teaser)\b/i.test(title)) score += 30;
    if (/\b(release date|launch date|delayed to|delay|launching on)\b/i.test(title)) score += 35;
    if (/\b(review|in-depth review|verdict|review discussion)\b/i.test(title)) score += 35;
    if (/\b(sequel|prequel|remake|remaster|reboot)\b/i.test(title)) score += 25;
    if (/\b(confirmed|officially confirmed|developer confirms)\b/i.test(title)) score += 20;
    if (/\b(system requirements|specs revealed|pc specs)\b/i.test(title)) score += 20;

    // 3. Major Consoles, Hardware & Iconic Franchises
    if (/\b(nintendo switch 2|switch 2|next-gen switch)\b/i.test(fullText)) score += 40;
    if (/\b(playstation 6|ps6|playstation 5 pro|ps5 pro)\b/i.test(fullText)) score += 35;
    if (/\b(steam deck|steam machine|valve index|gabe newell)\b/i.test(fullText)) score += 35;
    if (/\b(gta 6|grand theft auto (vi|6)|rockstar games)\b/i.test(fullText)) score += 40;
    if (/\b(elder scrolls|witcher 4|witcher|half-life|silksong|hollow knight|elden ring|cyberpunk|zelda|mario)\b/i.test(fullText)) score += 30;

    // 4. Category tags provided by the publication
    if (categories.some((c) => c.includes('review') || c.includes('exclusive') || c.includes('breaking'))) {
      score += 25;
    }

    // 5. Editorial bonus for top articles from the outlet
    if (news.isTopStory) {
      score += 15;
    }

    // 6. Recency freshness boost
    if (news.publishedAt) {
      const hoursAgo = (Date.now() - new Date(news.publishedAt).getTime()) / (1000 * 60 * 60);
      if (hoursAgo >= 0 && hoursAgo <= 12) score += 20;
      else if (hoursAgo <= 24) score += 10;
      else if (hoursAgo <= 48) score += 5;
    }

    return score;
  };

  // Top Stories: Distinct curated section of up to 16 high-impact stories
  const topStories = useMemo(() => {
    const list = pulseData?.news || [];
    if (list.length === 0) return [];

    // Filter out obvious guides/routine noise unless it matches user library
    const eligible = list.filter((n) => {
      if (getNewsLibraryMatch(n)) return true;
      return !isRoutineOrGuide(n);
    });

    const sorted = [...eligible].sort((a, b) => {
      const scoreA = calculateNewsImpactScore(a);
      const scoreB = calculateNewsImpactScore(b);
      if (scoreB !== scoreA) return scoreB - scoreA;

      const timeA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const timeB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return timeB - timeA;
    });

    return sorted.slice(0, 16);
  }, [pulseData?.news, userGameNames]);

  // Set of Top Story IDs - strictly excluded from Latest News to avoid ANY duplicates!
  const topStoryIds = useMemo(() => {
    return new Set(topStories.map((s) => s.id));
  }, [topStories]);

  // Top Stories Pagination
  const totalTopStoryPages = Math.max(1, Math.ceil(topStories.length / TOP_STORIES_PER_PAGE));
  const currentTopStoryPage = Math.min(topStoryPage, totalTopStoryPages);
  const paginatedTopStories = useMemo(() => {
    const start = (currentTopStoryPage - 1) * TOP_STORIES_PER_PAGE;
    return topStories.slice(start, start + TOP_STORIES_PER_PAGE);
  }, [topStories, currentTopStoryPage]);

  // Count news matching library games
  const libraryNewsCount = useMemo(() => {
    return (pulseData?.news || []).filter((item) => !!getNewsLibraryMatch(item)).length;
  }, [pulseData?.news, userGameNames]);

  // Filter and sort Latest News (EXCLUDES articles already present in Top Stories!)
  const filteredLatestNews = useMemo(() => {
    const list = (pulseData?.news || []).filter((item) => !topStoryIds.has(item.id));

    let result = list.filter((item) => {
      if (selectedNewsSource === 'all') return true;
      if (selectedNewsSource === 'library') return !!getNewsLibraryMatch(item);
      return item.source.toLowerCase().includes(selectedNewsSource.toLowerCase());
    });

    if (newsSortBy === 'relevant') {
      result = [...result].sort((a, b) => {
        const aLib = getNewsLibraryMatch(a) ? 50 : 0;
        const bLib = getNewsLibraryMatch(b) ? 50 : 0;
        if (bLib !== aLib) return bLib - aLib;

        const timeA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const timeB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return timeB - timeA;
      });
    } else {
      // Newest first
      result = [...result].sort((a, b) => {
        const timeA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const timeB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return timeB - timeA;
      });
    }

    return result;
  }, [pulseData?.news, topStoryIds, selectedNewsSource, newsSortBy, userGameNames]);

  // Pagination calculations for Latest News
  const totalNewsPages = Math.max(1, Math.ceil(filteredLatestNews.length / NEWS_PER_PAGE));
  const currentNewsPage = Math.min(newsPage, totalNewsPages);
  const paginatedLatestNews = useMemo(() => {
    const start = (currentNewsPage - 1) * NEWS_PER_PAGE;
    return filteredLatestNews.slice(start, start + NEWS_PER_PAGE);
  }, [filteredLatestNews, currentNewsPage]);

  // --- STATS FOR PULSE COMMAND CENTER ---
  // 1a. Weekly Activity Day-by-Day (Monday to Sunday)
  const weeklyDaysData = useMemo(() => {
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const fullDayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const now = new Date();

    // Current day in ISO week: Monday is 1, Sunday is 7
    const currentDayOfWeek = now.getDay(); // 0 is Sun, 1 is Mon, ... 6 is Sat
    const isoDay = currentDayOfWeek === 0 ? 7 : currentDayOfWeek;
    const todayIndex = isoDay - 1; // 0 for Mon, 1 for Tue, 2 for Wed, 3 for Thu, 4 for Fri, 5 for Sat, 6 for Sun

    // Monday of the current week (local calendar week)
    const monday = new Date(now);
    monday.setDate(now.getDate() - todayIndex);
    monday.setHours(12, 0, 0, 0); // Noon prevents any daylight saving or timezone boundary issues

    const days: { dayName: string; short: string; hours: number; isToday: boolean; isFuture: boolean; dateStr: string }[] = [];
    let weekTotalMins = 0;

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = toLocalDateStr(d);
      const dayName = fullDayNames[i];
      const short = dayNames[i].slice(0, 1);
      const isToday = i === todayIndex;
      const isFuture = i > todayIndex;

      // Real recorded minutes for this specific day from activity store
      const dayMins = dailyActivity[dateStr] || 0;
      weekTotalMins += dayMins;

      const formattedTime = dayMins === 0
        ? '0m'
        : dayMins < 60
        ? `${dayMins}m`
        : `${(dayMins / 60).toFixed(1)}h`;

      days.push({
        dayName,
        short,
        minutes: dayMins,
        hours: Math.round((dayMins / 60) * 10) / 10,
        formattedTime,
        isToday,
        isFuture,
        dateStr,
      });
    }

    const maxMins = Math.max(60, ...days.map((d) => d.minutes));
    return { days, maxMins, weekTotalMins };
  }, [dailyActivity]);

  // 1b. Playtime Summary Stats
  const { totalHours, weeklyTimeDisplay, weeklyHours, activeGamesThisWeek, activeStreakDays } = useMemo(() => {
    let totalMins = 0;
    for (const game of games) {
      if (!game.hidden) {
        totalMins += game.playtimeMinutes || 0;
      }
    }

    // Active games played this current week (from Monday 00:00:00 to now)
    const now = new Date();
    const currentDayOfWeek = now.getDay();
    const isoDay = currentDayOfWeek === 0 ? 7 : currentDayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() - (isoDay - 1));
    monday.setHours(0, 0, 0, 0);
    const mondayTime = monday.getTime();

    let recentGamesCount = 0;
    for (const game of games) {
      if (game.hidden || !game.lastPlayed) continue;
      const lastTime = new Date(game.lastPlayed).getTime();
      if (lastTime >= mondayTime) {
        recentGamesCount++;
      }
    }

    // Active streak: consecutive days with played activity ending today (or yesterday)
    let streak = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const str = toLocalDateStr(d);
      if ((dailyActivity[str] || 0) > 0) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    const tHours = (totalMins / 60).toFixed(1);
    const weeklyTimeDisplay = weeklyDaysData.weekTotalMins === 0
      ? '0m'
      : weeklyDaysData.weekTotalMins < 60
      ? `${weeklyDaysData.weekTotalMins}m`
      : `${(weeklyDaysData.weekTotalMins / 60).toFixed(1)}h`;

    const totalTimeDisplay = totalMins < 60
      ? `${totalMins}m`
      : `${tHours}h`;

    return {
      totalHours: totalTimeDisplay,
      weeklyTimeDisplay,
      weeklyHours: (weeklyDaysData.weekTotalMins / 60).toFixed(1),
      activeGamesThisWeek: recentGamesCount,
      activeStreakDays: streak,
    };
  }, [games, dailyActivity, weeklyDaysData.weekTotalMins]);

  // 1c. Library Exploration & Gaming Habit
  const { libraryExplored, playerHabit } = useMemo(() => {
    const unhidden = games.filter((g) => !g.hidden);
    const total = unhidden.length || 1;
    const played = unhidden.filter((g) => (g.playtimeMinutes || 0) > 0).length;
    const percentage = Math.round((played / total) * 100);

    let nightOwlCount = 0;
    let eveningCount = 0;
    let afternoonCount = 0;
    let morningCount = 0;
    let weekendCount = 0;
    let totalTimestamps = 0;

    for (const g of unhidden) {
      if (g.lastPlayed) {
        try {
          const d = new Date(g.lastPlayed);
          const h = d.getHours();
          const day = d.getDay();
          totalTimestamps++;

          if (day === 0 || day === 6) weekendCount++;
          if (h >= 21 || h < 4) nightOwlCount++;
          else if (h >= 17) eveningCount++;
          else if (h >= 12) afternoonCount++;
          else morningCount++;
        } catch {}
      }
    }

    let habit = {
      label: 'Night Owl',
      detail: '20h - 00h',
    };

    if (totalTimestamps > 0) {
      if (weekendCount / totalTimestamps > 0.6) {
        habit = { label: 'Weekend Warrior', detail: 'Sat & Sun' };
      } else if (nightOwlCount >= eveningCount && nightOwlCount >= afternoonCount && nightOwlCount >= morningCount) {
        habit = { label: 'Night Owl', detail: '20h - 00h' };
      } else if (eveningCount >= afternoonCount && eveningCount >= morningCount) {
        habit = { label: 'Evening Player', detail: '18h - 22h' };
      } else if (afternoonCount >= morningCount) {
        habit = { label: 'Daytime Player', detail: '13h - 18h' };
      } else {
        habit = { label: 'Early Bird', detail: '07h - 12h' };
      }
    }

    return {
      libraryExplored: {
        played,
        total,
        percentage,
      },
      playerHabit: habit,
    };
  }, [games]);

  // 2. Most Played Games (Top 3)
  const mostPlayedGames = useMemo(() => {
    const valid = games.filter((g) => !g.hidden && (g.playtimeMinutes || 0) > 0);
    const sorted = [...valid].sort((a, b) => {
      const timeDiff = (b.playtimeMinutes || 0) - (a.playtimeMinutes || 0);
      if (timeDiff !== 0) return timeDiff;
      const aRecent = a.lastPlayed ? new Date(a.lastPlayed).getTime() : 0;
      const bRecent = b.lastPlayed ? new Date(b.lastPlayed).getTime() : 0;
      return bRecent - aRecent;
    });

    if (sorted.length >= 3) {
      return sorted.slice(0, 3);
    }
    const installed = games.filter((g) => g.installed && !g.hidden && !sorted.some((s) => s.id === g.id));
    const combined = [...sorted, ...installed];
    return combined.slice(0, 3);
  }, [games]);

  // 3. Top Genres
  const topGenres = useMemo(() => {
    const genreMap: Record<string, number> = {};
    for (const g of games) {
      if (g.hidden) continue;
      const weight = Math.max(1, Math.round((g.playtimeMinutes || 0) / 60) + (g.favorite ? 3 : 1));
      for (const genre of g.genres || []) {
        if (!genre || genre.trim().length < 2) continue;
        const clean = genre.trim();
        if (clean.toLowerCase() === 'game' || clean.toLowerCase() === 'games') continue;
        genreMap[clean] = (genreMap[clean] || 0) + weight;
      }
    }

    const sorted = Object.entries(genreMap).sort((a, b) => b[1] - a[1]);
    const totalScore = sorted.reduce((sum, [, val]) => sum + val, 0) || 1;

    return sorted.slice(0, 5).map(([name, score]) => ({
      name,
      percentage: Math.round((score / totalScore) * 100),
    }));
  }, [games]);

  // 4. Latest Unlocked Achievements (2 achievements)
  const latestAchievements = useMemo(() => {
    const list = recentAchievements.length > 0 ? recentAchievements : pulseData?.achievements || [];
    return list.slice(0, 2);
  }, [recentAchievements, pulseData?.achievements]);

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* COMMAND CENTER HERO DASHBOARD */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/70 border border-slate-800 p-4 sm:p-5 shadow-2xl">
        {/* Banner Section Header */}
        <div className="flex items-center justify-between mb-3.5 px-0.5">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-sm">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-200">
              Gaming Pulse &amp; Activity Overview
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* CARD 1: Playtime & Activity with Weekly Activity Chart */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700 transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Activity & Playtime</span>
              <div className="w-6 h-6 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="my-1.5 flex items-center justify-between gap-2">
              {/* Left: Playtime Numbers */}
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-white">{weeklyTimeDisplay}</span>
                  <span className="text-xs text-slate-400 font-medium">this week</span>
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  {totalHours} total across library
                </div>
              </div>

              {/* Right: Weekly Activity Bar Chart (7 Days of the Week) */}
              <div className="shrink-0 flex items-end gap-1.5 bg-slate-900/60 border border-slate-800/60 px-2 py-1.5 rounded-xl">
                {weeklyDaysData.days.map((d) => {
                  const barHeightPercent = d.minutes > 0
                    ? Math.max(15, Math.round((d.minutes / weeklyDaysData.maxMins) * 100))
                    : 0;
                  return (
                    <div
                      key={d.dateStr}
                      className="group/day relative flex flex-col items-center cursor-pointer"
                    >
                      {/* Tooltip on hover */}
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover/day:flex items-center px-1.5 py-0.5 rounded bg-slate-950 text-[9px] font-bold text-white border border-slate-700 whitespace-nowrap z-20 shadow-lg pointer-events-none">
                        {d.dayName}: {d.formattedTime}
                      </div>

                      {/* Bar Track & Fill */}
                      <div className={`w-2.5 sm:w-3 h-8 bg-slate-950/80 rounded-full overflow-hidden flex flex-col justify-end border ${
                        d.isFuture ? 'border-slate-800/40 opacity-40' : 'border-slate-800/80'
                      }`}>
                        {barHeightPercent > 0 && (
                          <div
                            className={`w-full rounded-full transition-all duration-500 ${
                              d.isToday
                                ? 'bg-gradient-to-t from-cyan-500 to-blue-400 shadow-[0_0_6px_rgba(56,189,248,0.6)]'
                                : 'bg-gradient-to-t from-blue-600 to-indigo-400'
                            }`}
                            style={{ height: `${barHeightPercent}%` }}
                          />
                        )}
                      </div>

                      {/* Day Label */}
                      <span
                        className={`text-[9px] font-bold mt-1 ${
                          d.isToday ? 'text-cyan-400 font-black' : d.isFuture ? 'text-slate-600' : 'text-slate-500 group-hover/day:text-slate-300'
                        }`}
                      >
                        {d.short}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Middle: Library Exploration Progress (Idea 6) */}
            <div className="space-y-1 my-1 pt-1.5 border-t border-slate-900">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-400 font-medium flex items-center gap-1">
                  <Compass className="w-3 h-3 text-cyan-400" />
                  <span>Library Explored</span>
                </span>
                <span className="text-slate-300 font-mono font-semibold">
                  {libraryExplored.played} / {libraryExplored.total} ({libraryExplored.percentage}%)
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800/60">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-500"
                  style={{ width: `${Math.max(4, libraryExplored.percentage)}%` }}
                />
              </div>
            </div>

            {/* Bottom: Prime Time Habit (Idea 5) & Weekly Streak */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-900 text-[10px]">
              {/* Prime Time Habit */}
              <div
                className="flex items-center gap-1.5 text-slate-300"
                title={`Dominant gaming habit based on your session history (${playerHabit.detail})`}
              >
                <div className="w-4 h-4 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                  <Moon className="w-2.5 h-2.5" />
                </div>
                <span className="font-semibold truncate">
                  {playerHabit.label}
                  <span className="text-slate-500 ml-1 font-normal font-mono">({playerHabit.detail})</span>
                </span>
              </div>

              {/* Weekly Streak / Status */}
              <div className="shrink-0 font-medium">
                {weeklyDaysData.weekTotalMins > 0 ? (
                  <span className="text-amber-400 font-semibold flex items-center gap-1">
                    <Flame className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span>{activeStreakDays > 1 ? `${activeStreakDays}d streak` : `${activeGamesThisWeek} games`}</span>
                  </span>
                ) : (
                  <span className="text-slate-500">0m this week</span>
                )}
              </div>
            </div>
          </div>

          {/* CARD 2: Most Played Games (Top 3) */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700 transition">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Most Played Games</span>
              <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Trophy className="w-3.5 h-3.5" />
              </div>
            </div>

            {mostPlayedGames.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 my-auto">
                {mostPlayedGames.map((game, idx) => {
                  const hours = (game.playtimeMinutes || 0) >= 60
                    ? `${Math.round((game.playtimeMinutes || 0) / 60)}h`
                    : `${game.playtimeMinutes || 0}m`;

                  return (
                    <div key={game.id} className="flex flex-col min-w-0">
                      {/* Thumbnail with Hover Play Button */}
                      <div
                        onClick={(e) => onLaunchGame(game, e)}
                        title={`Play ${game.title}`}
                        className="group/game relative w-full aspect-[3/4] rounded-lg overflow-hidden bg-slate-900 border border-slate-800 hover:border-indigo-500/70 cursor-pointer transition shadow-sm"
                      >
                        <img
                          src={game.coverUrl || game.bannerUrl}
                          alt={game.title}
                          className="w-full h-full object-cover group-hover/game:scale-105 transition duration-300"
                        />
                        {/* Rank Badge */}
                        <span className="absolute top-1 left-1 px-1 py-0.2 rounded bg-slate-950/80 text-[8px] font-black text-indigo-300 border border-indigo-500/30 shadow-sm pointer-events-none">
                          #{idx + 1}
                        </span>

                        {/* Hover Play Button Overlay */}
                        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[1px] opacity-0 group-hover/game:opacity-100 transition duration-200 flex items-center justify-center">
                          <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg group-hover/game:scale-110 active:scale-95 transition">
                            <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                          </div>
                        </div>
                      </div>

                      {/* Name & Hours Below */}
                      <div className="mt-1.5 min-w-0">
                        <h4 className="text-[10px] font-bold text-white truncate leading-tight" title={game.title}>
                          {game.title}
                        </h4>
                        <div className="text-[9px] text-indigo-300 font-semibold truncate mt-0.5">
                          {hours}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="my-2 text-xs text-slate-500">No games played yet</div>
            )}
          </div>

          {/* CARD 3: Top Genres (Gamer DNA) */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700 transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Top Genres</span>
              <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="my-1.5 space-y-1.5">
              {topGenres.length > 0 ? (
                topGenres.map((g, idx) => {
                  const colors = [
                    'bg-emerald-500',
                    'bg-cyan-500',
                    'bg-blue-500',
                    'bg-indigo-500',
                    'bg-purple-500',
                  ];
                  return (
                    <div key={g.name} className="space-y-0.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-300 font-medium truncate max-w-[120px]">{g.name}</span>
                        <span className="text-slate-400 font-mono text-[10px]">{g.percentage}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${colors[idx % colors.length]}`}
                          style={{ width: `${Math.max(8, g.percentage)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-xs text-slate-500 py-2">Add games with genres to view stats</div>
              )}
            </div>

            <div className="text-[10px] text-slate-400 font-medium pt-1">
              Based on library gameplay
            </div>
          </div>

          {/* CARD 4: Pulse & Latest Achievements */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700 transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pulse & Achievements</span>
              <div className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Trophy className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="my-1.5 space-y-2">
              {/* Free Promotions */}
              <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-900">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Gift className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Free Promotions</span>
                </span>
                <span className="font-bold text-emerald-400">
                  {pulseData?.giveaways?.length || 0} active
                </span>
              </div>

              {/* Latest Achievements (Top 2) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Recent Achievements
                  </span>
                </div>

                {latestAchievements.length > 0 ? (
                  <div className="space-y-1.5">
                    {latestAchievements.map((ach, idx) => (
                      <div
                        key={`${ach.gameTitle}-${ach.achievementName}-${idx}`}
                        className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition"
                        title={ach.description ? `${ach.achievementName} - ${ach.description}` : ach.achievementName}
                      >
                        <div className="w-7 h-7 rounded bg-slate-950 border border-slate-800 shrink-0 overflow-hidden flex items-center justify-center">
                          {ach.iconUrl ? (
                            <img src={ach.iconUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Trophy className="w-3.5 h-3.5 text-amber-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[11px] font-bold text-white truncate leading-tight">
                              {ach.achievementName}
                            </span>
                            {ach.rarity && (
                              <span className="text-[8px] font-bold px-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                                {ach.rarity}%
                              </span>
                            )}
                          </div>
                          <div className="text-[9px] text-slate-400 truncate mt-0.5">
                            {ach.gameTitle}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-2 rounded-lg bg-slate-900/40 border border-slate-800/40 text-[10px] text-slate-500 italic text-center">
                    No achievements recorded yet
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-900">
              <span className="text-[10px] text-slate-500 truncate">
                {pulseData?.lastUpdated ? `Sync ${formatRelativeTime(new Date(pulseData.lastUpdated).toISOString())}` : 'Live'}
              </span>

              <button
                type="button"
                onClick={() => loadPulseData(true)}
                disabled={refreshing}
                className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 active:scale-95 disabled:opacity-50 text-slate-200 text-[10px] font-bold border border-slate-700 transition"
                title="Refresh gaming pulse"
              >
                <RefreshCw className={`w-2.5 h-2.5 ${refreshing ? 'animate-spin text-blue-400' : ''}`} />
                <span>{refreshing ? 'Syncing...' : 'Sync'}</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* TOP SECTION: Continue Playing Shelf */}
      <div>
        {hasRecentGames ? (
          <RecentlyPlayedShelf
            games={games}
            title="Continue Playing"
            extraHeaderRight={
              onNavigateToLibrary && (
                <button
                  onClick={onNavigateToLibrary}
                  className="text-xs text-blue-400 hover:text-blue-300 font-semibold hover:underline"
                >
                  View Full Library &rarr;
                </button>
              )
            }
            onSelectGame={onSelectGame}
            onLaunchGame={onLaunchGame}
            onToggleFavorite={onToggleFavorite}
            showPlatformBadges={showPlatformBadges}
          />
        ) : (
          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <h2 className="text-base font-bold text-white tracking-wide">Continue Playing</h2>
              </div>
              {onNavigateToLibrary && (
                <button
                  onClick={onNavigateToLibrary}
                  className="text-xs text-blue-400 hover:text-blue-300 font-semibold hover:underline"
                >
                  View Full Library &rarr;
                </button>
              )}
            </div>
            <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 text-center space-y-2">
              <p className="text-sm text-slate-300">You haven't launched any games yet.</p>
              <p className="text-xs text-slate-500">
                Start any game from your library and it will appear right here for quick 1-click access!
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => loadPulseData(true)}
            className="px-3 py-1 bg-red-900/60 hover:bg-red-800 text-white rounded-md text-xs font-semibold"
          >
            Retry
          </button>
        </div>
      )}

      {/* SECTION 1: 🎁 Free Games of the Week (Giveaways) */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-wide">Free Games of the Week</h2>
              {pulseData?.giveaways && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  {filteredGiveaways.length} Available
                </span>
              )}
            </div>
          </div>

          {/* Platform filter pills (ordered: All -> Epic -> Steam -> GOG -> Amazon -> Other) */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: 'All Stores' },
              { id: 'epic', label: 'Epic Games' },
              { id: 'steam', label: 'Steam' },
              { id: 'gog', label: 'GOG' },
              { id: 'amazon', label: 'Amazon Prime' },
              { id: 'pc', label: 'Other / DRM-Free' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedGiveawayPlatform(p.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                  selectedGiveawayPlatform === p.id
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 rounded-xl bg-slate-900/60 border border-slate-800 animate-pulse" />
            ))}
          </div>
        ) : filteredGiveaways.length === 0 ? (
          <div className="p-8 rounded-xl bg-slate-900/40 border border-slate-800/80 text-center text-slate-400 text-xs">
            No active giveaways matching this filter.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {filteredGiveaways.slice(0, 30).map((item) => {
              const storeInfo = getGiveawayStoreInfo(item);
              return (
                <div
                  key={item.id}
                  onClick={(e) => openUrl(item.openGiveawayUrl, e)}
                  className={`group cursor-pointer bg-slate-900 border rounded-xl overflow-hidden flex flex-col shadow-md transition-all duration-300 ${
                    storeInfo.isAmazon
                      ? 'border-slate-800 hover:border-indigo-500/50 hover:shadow-indigo-950/30'
                      : 'border-slate-800 hover:border-emerald-500/50 hover:shadow-emerald-950/30'
                  }`}
                >
                  {/* Smaller Thumbnail */}
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-950">
                    <img
                      src={item.image || item.thumbnail}
                      alt={item.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {/* Badge */}
                    {storeInfo.isAmazon ? (
                      <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-indigo-600/90 backdrop-blur-sm text-white text-[9px] font-black uppercase tracking-wider shadow">
                        Prime
                      </div>
                    ) : (
                      <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-emerald-500/95 backdrop-blur-sm text-slate-950 text-[9px] font-black uppercase tracking-wider shadow">
                        Free
                      </div>
                    )}
                  </div>

                  {/* Content: Title & Store underneath */}
                  <div className="p-2.5 flex-1 flex flex-col justify-between space-y-2.5">
                    <div className="space-y-1">
                      <h3
                        title={item.title}
                        className={`text-xs font-bold text-white transition line-clamp-1 leading-snug ${
                          storeInfo.isAmazon ? 'group-hover:text-indigo-400' : 'group-hover:text-emerald-400'
                        }`}
                      >
                        {item.title}
                      </h3>

                      {/* Store directly underneath title */}
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium truncate">
                        {storeInfo.logo && (
                          <img src={storeInfo.logo} alt="" className="w-3.5 h-3.5 object-contain shrink-0" />
                        )}
                        <span className="truncate">{storeInfo.name}</span>
                      </div>
                    </div>

                    {/* Bottom Row: Free to keep & Claim */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1">
                      <div className="min-w-0">
                        {item.worth && item.worth !== 'N/A' && (
                          <div className="text-[9px] text-slate-400 truncate">
                            {item.worth.toLowerCase().includes('free') ? (
                              item.worth
                            ) : (
                              <>Save <span className="line-through text-slate-500">{item.worth}</span></>
                            )}
                          </div>
                        )}
                        <div className={`text-[10px] font-extrabold truncate ${storeInfo.isAmazon ? 'text-indigo-400' : 'text-emerald-400'}`}>
                          {storeInfo.isAmazon ? 'WITH PRIME' : 'FREE TO KEEP'}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => openUrl(item.openGiveawayUrl, e)}
                        className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-white text-xs font-bold transition shadow ${
                          storeInfo.isAmazon
                            ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/30'
                            : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/30'
                        }`}
                      >
                        <span>Claim</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* SECTION 2: 🔥 Top Deals & Discounts (CheapShark) */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-wide">Top Deals & Discounts</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                Daily Highlights
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Store filter */}
            <select
              value={selectedDealStore}
              onChange={(e) => setSelectedDealStore(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-200 text-xs font-semibold rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-500"
            >
              <option value="all">All Stores</option>
              <option value="steam">Steam Store</option>
              <option value="epic">Epic Games Store</option>
              <option value="gog">GOG Galaxy</option>
              <option value="humble">Humble Store</option>
              <option value="fanatical">Fanatical</option>
            </select>

            {/* Sort filter */}
            <select
              value={selectedDealSort}
              onChange={(e) => setSelectedDealSort(e.target.value as any)}
              className="bg-slate-900 border border-slate-800 text-slate-200 text-xs font-semibold rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-500"
            >
              <option value="dealRating">Best Value & Acclaim</option>
              <option value="savings">Biggest Discount %</option>
              <option value="price">Lowest Sale Price</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-44 rounded-xl bg-slate-900/60 border border-slate-800 animate-pulse" />
            ))}
          </div>
        ) : filteredDeals.length === 0 ? (
          <div className="p-8 rounded-xl bg-slate-900/40 border border-slate-800/80 text-center text-slate-400 text-xs">
            No deals currently match this filter.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredDeals.slice(0, 16).map((deal) => {
              const storeLogo = getStoreLogo(deal.storeName);
              return (
                <div
                  key={deal.dealId}
                  onClick={(e) => openUrl(deal.dealUrl, e)}
                  className="group cursor-pointer bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-xl overflow-hidden flex flex-col justify-between p-3.5 shadow-lg hover:shadow-amber-950/30 transition-all duration-300"
                >
                  <div className="flex gap-3">
                    {/* Thumbnail */}
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-slate-950 shrink-0 border border-slate-800">
                      <img
                        src={deal.thumb}
                        alt={deal.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>

                    {/* Meta */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1 truncate">
                          {storeLogo && <img src={storeLogo} alt="" className="w-3 h-3 object-contain shrink-0" />}
                          <span className="truncate">{deal.storeName}</span>
                        </span>
                        {deal.metacriticScore && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-950 text-amber-400 border border-amber-500/30 shrink-0">
                            ★ {deal.metacriticScore}
                          </span>
                        )}
                      </div>

                      <h3 className="text-xs font-bold text-white group-hover:text-amber-400 transition line-clamp-2 leading-tight">
                        {deal.title}
                      </h3>
                    </div>
                  </div>

                  {/* Pricing row */}
                  <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-red-600 text-white text-xs font-black">
                        -{deal.savings}%
                      </span>
                      <div className="flex flex-col">
                        <span className="text-[10px] line-through text-slate-500 leading-none">
                          ${deal.normalPrice}
                        </span>
                        <span className="text-sm font-extrabold text-white leading-tight">
                          ${deal.salePrice}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => openUrl(deal.dealUrl, e)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold transition"
                    >
                      <span>View</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* SECTION 3: 🔥 Top Stories & Headlines (Dedicated Section) */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-wide">Top Stories & Headlines</h2>
              {topStories.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  {topStories.length} Featured
                </span>
              )}
            </div>
          </div>

          {/* Top Stories Navigation Arrows */}
          {totalTopStoryPages > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 mr-1">
                {currentTopStoryPage} / {totalTopStoryPages}
              </span>
              <button
                onClick={() => setTopStoryPage((p) => Math.max(1, p - 1))}
                disabled={currentTopStoryPage <= 1}
                className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed border border-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition shadow-sm"
                title="Previous top stories"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTopStoryPage((p) => Math.min(totalTopStoryPages, p + 1))}
                disabled={currentTopStoryPage >= totalTopStoryPages}
                className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed border border-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition shadow-sm"
                title="Next top stories"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-52 rounded-xl bg-slate-900/60 border border-slate-800 animate-pulse" />
            ))}
          </div>
        ) : topStories.length === 0 ? (
          <div className="p-8 rounded-xl bg-slate-900/40 border border-slate-800/80 text-center text-slate-400 text-xs">
            No top stories available.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {paginatedTopStories.map((article) => {
              const libMatch = getNewsLibraryMatch(article);
              const isEurogamer = article.source.toLowerCase().includes('eurogamer');
              const isIgn = article.source.toLowerCase().includes('ign');
              const isPc = article.source.toLowerCase().includes('pc gamer');

              return (
                <article
                  key={`top-${article.id}`}
                  onClick={(e) => openUrl(article.url, e)}
                  className={`group cursor-pointer bg-slate-900 border rounded-xl overflow-hidden flex flex-col justify-between shadow-md transition-all duration-300 hover:shadow-xl ${
                    libMatch
                      ? 'border-purple-500/50 hover:border-purple-400'
                      : 'border-slate-800 hover:border-amber-500/40'
                  }`}
                >
                  <div>
                    {/* Compact Thumbnail (Vertical height reduced to h-30) */}
                    <div className="relative h-30 w-full overflow-hidden bg-slate-950">
                      {article.imageUrl ? (
                        <img
                          src={article.imageUrl}
                          alt={article.title}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-950 text-slate-700">
                          <Newspaper className="w-8 h-8" />
                        </div>
                      )}

                      {/* Badges on Image */}
                      <div className="absolute top-2 left-2 flex flex-wrap gap-1 items-center">
                        {libMatch ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-600/95 backdrop-blur-sm text-white text-[9px] font-black uppercase tracking-wider shadow">
                            <Gamepad2 className="w-2.5 h-2.5" />
                            <span>{libMatch}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/95 backdrop-blur-sm text-slate-950 text-[9px] font-black uppercase tracking-wider shadow">
                            <Flame className="w-2.5 h-2.5 fill-slate-950" />
                            <span>Top Story</span>
                          </span>
                        )}

                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider text-white shadow backdrop-blur-sm ${
                            isIgn
                              ? 'bg-red-600/90'
                              : isEurogamer
                              ? 'bg-cyan-600/90'
                              : isPc
                              ? 'bg-orange-600/90'
                              : 'bg-slate-800/90'
                          }`}
                        >
                          {article.source}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-3 space-y-1.5">
                      <div className="text-[10px] text-slate-500">
                        {formatRelativeTime(article.publishedAt)}
                      </div>
                      <h3 className="text-xs font-bold text-white group-hover:text-amber-400 transition leading-snug line-clamp-2">
                        {article.title}
                      </h3>
                      {article.snippet && (
                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                          {article.snippet}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="p-3 pt-0">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-400 group-hover:underline">
                      <span>Read on {article.source}</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* SECTION 4: 📰 Latest Gaming News Feed (Deduplicated - excludes Top Stories) */}
      <section id="latest-news-section" className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-wide">Latest Gaming News</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                {filteredLatestNews.length} Stories
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Source Filters */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              {[
                { id: 'all', label: 'All News' },
                { id: 'eurogamer', label: 'Eurogamer' },
                { id: 'ign', label: 'IGN' },
                { id: 'pc gamer', label: 'PC Gamer' },
                ...(libraryNewsCount > 0 ? [{ id: 'library', label: `In Library (${libraryNewsCount})` }] : []),
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setSelectedNewsSource(s.id);
                    setNewsPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                    selectedNewsSource === s.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Sort Toggle: Relevant vs Newest */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => {
                  setNewsSortBy('relevant');
                  setNewsPage(1);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  newsSortBy === 'relevant'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
                title="Sort by library games & editorial priority"
              >
                <Sparkles className="w-3 h-3 text-blue-300" />
                <span>Relevant</span>
              </button>
              <button
                onClick={() => {
                  setNewsSortBy('newest');
                  setNewsPage(1);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  newsSortBy === 'newest'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
                title="Sort strictly by newest publication time"
              >
                <Clock className="w-3 h-3" />
                <span>Newest</span>
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-44 rounded-xl bg-slate-900/60 border border-slate-800 animate-pulse" />
            ))}
          </div>
        ) : filteredLatestNews.length === 0 ? (
          <div className="p-8 rounded-xl bg-slate-900/40 border border-slate-800/80 text-center text-slate-400 text-xs">
            No news articles matching this filter.
          </div>
        ) : (
          <div className="space-y-5">
            {/* Articles Grid - Compact vertical height (h-24) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {paginatedLatestNews.map((article) => {
                const libMatch = getNewsLibraryMatch(article);
                const isEurogamer = article.source.toLowerCase().includes('eurogamer');
                const isIgn = article.source.toLowerCase().includes('ign');
                const isPc = article.source.toLowerCase().includes('pc gamer');

                return (
                  <article
                    key={article.id}
                    onClick={(e) => openUrl(article.url, e)}
                    className={`group cursor-pointer bg-slate-900 border rounded-xl overflow-hidden flex flex-col justify-between shadow-md hover:shadow-xl transition-all duration-300 ${
                      libMatch
                        ? 'border-purple-500/40 hover:border-purple-400'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      {/* Compact Thumbnail (Vertical height reduced to h-24 = 96px) */}
                      {article.imageUrl ? (
                        <div className="relative h-24 w-full overflow-hidden bg-slate-950">
                          <img
                            src={article.imageUrl}
                            alt={article.title}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute top-2 left-2 flex flex-wrap gap-1 items-center">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider text-white shadow ${
                                isIgn
                                  ? 'bg-red-600'
                                  : isEurogamer
                                  ? 'bg-cyan-600'
                                  : isPc
                                  ? 'bg-orange-600'
                                  : 'bg-slate-950/90 border border-slate-700'
                              }`}
                            >
                              {article.source}
                            </span>

                            {libMatch && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-600 text-white text-[9px] font-black uppercase tracking-wider shadow">
                                <Gamepad2 className="w-2.5 h-2.5" />
                                <span>{libMatch}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="p-2.5 border-b border-slate-800/80 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider text-white ${
                                isIgn
                                  ? 'bg-red-600'
                                  : isEurogamer
                                  ? 'bg-cyan-600'
                                  : isPc
                                  ? 'bg-orange-600'
                                  : 'bg-slate-950/90 border border-slate-700'
                              }`}
                            >
                              {article.source}
                            </span>
                            {libMatch && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-600 text-white text-[9px] font-black uppercase tracking-wider shadow">
                                <Gamepad2 className="w-2.5 h-2.5" />
                                <span>{libMatch}</span>
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500">
                            {formatRelativeTime(article.publishedAt)}
                          </span>
                        </div>
                      )}

                      <div className="p-3 space-y-1">
                        {article.imageUrl && (
                          <div className="text-[10px] text-slate-500">
                            {formatRelativeTime(article.publishedAt)}
                          </div>
                        )}
                        <h3 className="text-xs font-bold text-white group-hover:text-blue-400 transition leading-snug line-clamp-2">
                          {article.title}
                        </h3>
                        {article.snippet && (
                          <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                            {article.snippet}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="p-3 pt-0">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-400 group-hover:underline">
                        <span>Read on {article.source}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Pagination Controls (< e >) */}
            {totalNewsPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-800/80">
                <button
                  onClick={() => {
                    setNewsPage((p) => Math.max(1, p - 1));
                    document.getElementById('latest-news-section')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  disabled={currentNewsPage <= 1}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-800 text-xs font-bold text-slate-300 hover:text-white transition shadow-sm"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <div className="flex items-center gap-1">
                  {[...Array(totalNewsPages)].map((_, idx) => {
                    const pageNum = idx + 1;
                    if (
                      pageNum === 1 ||
                      pageNum === totalNewsPages ||
                      Math.abs(pageNum - currentNewsPage) <= 1
                    ) {
                      return (
                        <button
                          key={pageNum}
                          onClick={() => {
                            setNewsPage(pageNum);
                            document.getElementById('latest-news-section')?.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className={`w-7 h-7 rounded-lg text-xs font-bold transition ${
                            currentNewsPage === pageNum
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    }
                    if (
                      (pageNum === 2 && currentNewsPage > 3) ||
                      (pageNum === totalNewsPages - 1 && currentNewsPage < totalNewsPages - 2)
                    ) {
                      return (
                        <span key={`dots-${pageNum}`} className="text-slate-600 px-1 text-xs font-bold">
                          ...
                        </span>
                      );
                    }
                    return null;
                  })}
                </div>

                <button
                  onClick={() => {
                    setNewsPage((p) => Math.min(totalNewsPages, p + 1));
                    document.getElementById('latest-news-section')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  disabled={currentNewsPage >= totalNewsPages}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-800 text-xs font-bold text-slate-300 hover:text-white transition shadow-sm"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};
