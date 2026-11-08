import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Search,
  ExternalLink,
  Flame,
  Star,
  Layers,
  Filter,
  Monitor,
  Gamepad2,
  Globe,
  Loader2,
  AlertCircle,
  Key,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Play,
  CalendarDays
} from 'lucide-react';
import {
  RecommendedGame,
  LauncherSettings,
  Game,
  SteamReleasesResponse,
  ReleaseMonthSection,
  SteamReleaseItem
} from '../types/game';
import { GameImage } from './GameImage';
import { PlatformBadge } from './PlatformBadge';
import { formatPlaytime } from '../utils/formatters';
import steamLogo from '../assets/logos/steam.webp';
import epicLogo from '../assets/logos/epic.webp';
import gogLogo from '../assets/logos/gog.webp';
import xboxLogo from '../assets/logos/xbox.webp';

interface RecommendedViewProps {
  settings: LauncherSettings;
  onOpenSettings: () => void;
  onSelectGameTitle?: (title: string) => void;
  libraryGames?: Game[];
  onSelectGame?: (game: Game) => void;
  onLaunchGame?: (game: Game) => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const RecommendedView: React.FC<RecommendedViewProps> = ({
  settings,
  onOpenSettings,
  libraryGames = [],
  onSelectGame,
  onLaunchGame,
}) => {
  // Mode switcher: 'catalog' = Search & Recommendations, 'releases' = New & Upcoming Releases
  const [activeTabMode, setActiveTabMode] = useState<'catalog' | 'releases'>('releases');

  // ===================== RELEASES STATE =====================
  const now = new Date();
  const [currentYear, setCurrentYear] = useState<number>(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(now.getMonth() + 1); // 1-12
  const [releasesData, setReleasesData] = useState<SteamReleasesResponse | null>(null);
  const [releasesLoading, setReleasesLoading] = useState<boolean>(false);
  const [releasesError, setReleasesError] = useState<string | null>(null);

  // ===================== CATALOG & RECOMMENDATIONS STATE =====================
  const [games, setGames] = useState<RecommendedGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Filters
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [selectedYearRange, setSelectedYearRange] = useState<string>('all');
  const [customYearFrom, setCustomYearFrom] = useState<string>('');
  const [customYearTo, setCustomYearTo] = useState<string>('');

  // Search Mode: true = Natural Language with Gemini, false = Instant Catalog Search
  const [isAiMode, setIsAiMode] = useState<boolean>(true);

  // Search inputs
  const [searchInput, setSearchInput] = useState<string>('');
  const [activeAiQuery, setActiveAiQuery] = useState<string | null>(null);

  const stores = [
    { id: 'all', label: 'All Sources / Stores' },
    { id: 'steam', label: 'Steam' },
    { id: 'epic', label: 'Epic Games' },
    { id: 'gog', label: 'GOG Galaxy' },
    { id: 'xbox', label: 'Xbox Store' },
    { id: 'playstation', label: 'PlayStation' },
  ];

  const genres = [
    { id: 'all', label: 'All Genres' },
    { id: 'rpg', label: 'RPG' },
    { id: 'action', label: 'Action' },
    { id: 'open world', label: 'Open World' },
    { id: 'roguelike', label: 'Roguelike' },
    { id: 'souls-like', label: 'Souls-like' },
    { id: 'shooter', label: 'Shooter / FPS' },
    { id: 'strategy', label: 'Strategy' },
    { id: 'indie', label: 'Indie' },
    { id: 'adventure', label: 'Adventure' },
    { id: 'turn-based', label: 'Turn-Based' },
  ];

  const yearPresets = [
    { id: 'all', label: 'All Years' },
    { id: '2020-2026', label: '2020 - 2026', from: 2020, to: 2026 },
    { id: '2015-2020', label: '2015 - 2020', from: 2015, to: 2020 },
    { id: '2010-2015', label: '2010 - 2015', from: 2010, to: 2015 },
    { id: '2000-2010', label: '2000 - 2010', from: 2000, to: 2010 },
    { id: 'retro', label: '< 2000 (Retro)', from: 1980, to: 1999 },
    { id: 'custom', label: 'Custom' },
  ];

  // ===================== STEAM RELEASES FETCHER =====================
  const loadReleases = async (year: number, month: number) => {
    setReleasesLoading(true);
    setReleasesError(null);
    try {
      if (window.api?.getSteamReleases) {
        const res = await window.api.getSteamReleases({ year, month });
        setReleasesData(res);
      }
    } catch (err: any) {
      console.error('[DiscoveryView] Error loading releases:', err);
      setReleasesError(err?.message || 'Failed to fetch Steam releases');
    } finally {
      setReleasesLoading(false);
    }
  };

  useEffect(() => {
    if (activeTabMode === 'releases') {
      loadReleases(currentYear, currentMonth);
    }
  }, [activeTabMode, currentYear, currentMonth, settings.filterAdultGames]);

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const handleJumpToCurrent = () => {
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth() + 1);
  };

  // ===================== CATALOG / AI FETCHER =====================
  const getActiveYears = () => {
    if (selectedYearRange === 'all') return { yearFrom: undefined, yearTo: undefined };
    if (selectedYearRange === 'custom') {
      const yf = customYearFrom.trim() ? parseInt(customYearFrom, 10) : undefined;
      const yt = customYearTo.trim() ? parseInt(customYearTo, 10) : undefined;
      return {
        yearFrom: !isNaN(yf as number) ? yf : undefined,
        yearTo: !isNaN(yt as number) ? yt : undefined,
      };
    }
    const preset = yearPresets.find((p) => p.id === selectedYearRange);
    return { yearFrom: preset?.from, yearTo: preset?.to };
  };

  const loadGames = async (query?: string, rotateCurrent: boolean = false) => {
    setLoading(true);
    try {
      if (window.api?.getRecommendedGames) {
        const { yearFrom, yearTo } = getActiveYears();
        const excludeTitles = rotateCurrent ? games.slice(0, 12).map((g) => g.title) : [];
        const data = await window.api.getRecommendedGames({
          platform: selectedPlatform,
          store: selectedStore,
          genre: selectedGenre,
          query: query !== undefined ? query : searchInput,
          excludeTitles,
          ...(yearFrom ? { yearFrom } : {}),
          ...(yearTo ? { yearTo } : {}),
        } as any);
        setGames(data);
      }
    } catch (err) {
      console.error('[RecommendedView] Error loading games:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTabMode === 'catalog' && !activeAiQuery) {
      loadGames();
    }
  }, [activeTabMode, selectedPlatform, selectedStore, selectedGenre, selectedYearRange, customYearFrom, customYearTo, settings.filterAdultGames]);

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) {
      setActiveAiQuery(null);
      setAiError(null);
      loadGames('', true);
      return;
    }

    if (isAiMode) {
      const cleanInput = searchInput.trim();
      const previousForSamePrompt =
        activeAiQuery && activeAiQuery.trim().toLowerCase() === cleanInput.toLowerCase()
          ? games.map((g) => g.title)
          : [];

      setAiLoading(true);
      setAiError(null);
      setActiveAiQuery(cleanInput);

      try {
        if (window.api?.askGeminiRecommendedGames) {
          const res = await window.api.askGeminiRecommendedGames(
            cleanInput,
            settings.geminiApiKey,
            previousForSamePrompt
          );
          if (res.error) {
            setAiError(res.error);
          } else if (res.games && res.games.length > 0) {
            setGames(res.games);
          } else {
            setAiError('No matching game recommendations found for this prompt.');
          }
        }
      } catch (err: any) {
        setAiError(err.message || 'Error communicating with Gemini');
      } finally {
        setAiLoading(false);
      }
    } else {
      setActiveAiQuery(null);
      setAiError(null);
      loadGames(searchInput, true);
    }
  };

  const handleClearAi = () => {
    setActiveAiQuery(null);
    setSearchInput('');
    setAiError(null);
    loadGames('');
  };

  const openStoreUrl = (url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.api?.openExternal) {
      window.api.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const getStoreLogo = (storeId: string) => {
    const s = storeId.toLowerCase();
    if (s.includes('steam')) return steamLogo;
    if (s.includes('epic')) return epicLogo;
    if (s.includes('gog')) return gogLogo;
    if (s.includes('xbox')) return xboxLogo;
    return null;
  };

  // Check if target game is owned in library (strict exact match or exact storeId)
  const findLibraryGame = (item: SteamReleaseItem): Game | undefined => {
    if (!libraryGames || libraryGames.length === 0) return undefined;
    const clean = item.title.toLowerCase().replace(/[^a-z0-9]/g, '');
    return libraryGames.find((lg) => {
      if (lg.platform === 'steam' && lg.storeId && String(lg.storeId) === String(item.id)) {
        return true;
      }
      const lgClean = lg.title.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!lgClean || !clean) return false;
      return lgClean === clean;
    });
  };

  // Convert a SteamReleaseItem into a Game object so clicking the card opens GameDetailModal consistently
  const handleSelectSteamRelease = (item: SteamReleaseItem, libGame?: Game) => {
    if (!onSelectGame) return;
    if (libGame) {
      onSelectGame(libGame);
      return;
    }

    const previewGame: Game = {
      id: `discovery-steam-${item.id}`,
      title: item.title,
      executablePath: '',
      platform: 'steam',
      bannerUrl: item.bannerUrl || item.headerUrl || item.coverUrl,
      coverUrl: item.coverUrl,
      description: item.shortDescription || `Steam Game (AppID: ${item.id})`,
      summary: item.shortDescription,
      genres: [],
      tags: [],
      releaseDate: item.releaseDateStr,
      developer: item.developer || 'Unknown',
      publisher: item.publisher || item.developer || 'Independent',
      favorite: false,
      hidden: false,
      installed: false,
      installUrl: item.steamUrl,
      storeId: item.id,
      playtimeMinutes: 0,
      addedDate: new Date().toISOString(),
    };
    onSelectGame(previewGame);
  };

  // Convert a RecommendedGame from Search & Recommendations into a Game object for GameDetailModal
  const handleSelectRecommendedGame = (game: RecommendedGame) => {
    if (!onSelectGame) return;
    const clean = game.title.toLowerCase().replace(/[^a-z0-9]/g, '');
    const libGame = libraryGames?.find((lg) => {
      const lgClean = lg.title.toLowerCase().replace(/[^a-z0-9]/g, '');
      return lgClean && clean && lgClean === clean;
    });
    if (libGame) {
      onSelectGame(libGame);
      return;
    }

    const steamStore = game.stores?.find((s) => s.id.toLowerCase().includes('steam'));
    const firstStore = steamStore || game.stores?.[0];
    const appIdMatch = steamStore?.url.match(/\/app\/(\d+)/);

    const previewGame: Game = {
      id: `discovery-rec-${game.id}`,
      title: game.title,
      executablePath: '',
      platform: 'steam',
      bannerUrl: game.bannerUrl || game.coverUrl,
      coverUrl: game.coverUrl,
      description: game.description || game.aiRecommendationReason || 'No description provided.',
      summary: game.aiRecommendationReason || game.description,
      genres: game.genres || [],
      tags: [],
      releaseDate: game.releaseDate,
      rating: game.rating,
      favorite: false,
      hidden: false,
      installed: false,
      installUrl: firstStore?.url || `https://store.steampowered.com/search/?term=${encodeURIComponent(game.title)}`,
      storeId: appIdMatch ? appIdMatch[1] : undefined,
      playtimeMinutes: 0,
      addedDate: new Date().toISOString(),
    };
    onSelectGame(previewGame);
  };

  const yearsList = releasesData?.availableYears || [
    now.getFullYear() - 3,
    now.getFullYear() - 2,
    now.getFullYear() - 1,
    now.getFullYear(),
    now.getFullYear() + 1,
    now.getFullYear() + 2,
  ];

  return (
    <div className="space-y-6">
      {/* Top Segmented Control (Discovery Switcher) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Discovery</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Explore newly released and upcoming games or get personalized catalog recommendations.
          </p>
        </div>

        {/* Tab pills */}
        <div className="inline-flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800 self-start sm:self-auto shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTabMode('releases')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeTabMode === 'releases'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <span>New & Upcoming Releases</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTabMode('catalog')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeTabMode === 'catalog'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <span>Search & Recommendations</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: NEW & UPCOMING RELEASES (STEAM TIMELINE, ZERO ICONS ON HEADERS)     */}
      {/* ========================================================================= */}
      {activeTabMode === 'releases' && (
        <div className="space-y-8">
          {/* Timeline Navigation & Date Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md">
            {/* Quick Month Stepper */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrevMonth}
                title="Previous Month"
                className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                title="Next Month"
                className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleJumpToCurrent}
                className="ml-2 px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold transition"
              >
                Current Month
              </button>
            </div>

            {/* Direct Month & Year Selectors */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <select
                  value={currentMonth}
                  onChange={(e) => setCurrentMonth(parseInt(e.target.value, 10))}
                  className="appearance-none bg-slate-950 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 text-white text-xs font-semibold rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:border-blue-500 cursor-pointer transition shadow-sm"
                >
                  {MONTH_NAMES.map((mName, idx) => (
                    <option key={mName} value={idx + 1}>
                      {mName}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <div className="relative">
                <select
                  value={currentYear}
                  onChange={(e) => setCurrentYear(parseInt(e.target.value, 10))}
                  className="appearance-none bg-slate-950 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 text-white text-xs font-semibold rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:border-blue-500 cursor-pointer transition shadow-sm"
                >
                  {yearsList.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <button
                type="button"
                onClick={() => loadReleases(currentYear, currentMonth)}
                title="Refresh Releases"
                className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${releasesLoading ? 'animate-spin text-blue-400' : ''}`} />
              </button>
            </div>
          </div>

          {/* Loading & Error Indicators */}
          {releasesLoading && (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-xs text-slate-400 font-medium">Fetching Steam releases and artwork...</p>
            </div>
          )}

          {releasesError && !releasesLoading && (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{releasesError}</span>
            </div>
          )}

          {/* Releases Sections (Recent Releases + Next 3 Months) */}
          {!releasesLoading && releasesData && releasesData.sections.length > 0 && (
            <div className="space-y-16 pb-12">
              {releasesData.sections.map((sec) => (
                <section key={sec.monthKey} className="space-y-5">
                  {/* Clean Typography Header - Strictly NO icons */}
                  <div className="flex items-baseline justify-between border-b border-slate-800/80 pb-3">
                    <h2 className="text-xl font-bold text-white tracking-wide">
                      {sec.label}
                    </h2>
                    <span className="text-xs font-semibold text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded-md border border-slate-800">
                      {sec.games.length} {sec.games.length === 1 ? 'game' : 'games'}
                    </span>
                  </div>

                  {sec.games.length === 0 ? (
                    <div className="p-6 rounded-xl bg-slate-950/50 border border-slate-900 text-center">
                      <p className="text-xs text-slate-500">No scheduled releases found for this timeframe.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-3.5">
                      {sec.games.map((item) => {
                        const libGame = findLibraryGame(item);

                        return (
                          <div
                            key={item.id}
                            onClick={() => handleSelectSteamRelease(item, libGame)}
                            className="group relative flex flex-col bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800/80 hover:border-blue-500/50 rounded-xl overflow-hidden transition duration-200 cursor-pointer shadow-lg hover:shadow-blue-500/10 hover:-translate-y-1"
                          >
                            {/* Vertical 2:3 Cover Poster */}
                            <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-950 flex items-center justify-center">
                              <img
                                src={item.coverUrl}
                                alt={item.title}
                                className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                                loading="lazy"
                                onError={(e) => {
                                  // Fallback to direct Steam capsule if error
                                  const target = e.currentTarget;
                                  if (target.src !== item.headerUrl) {
                                    target.src = item.headerUrl;
                                  }
                                }}
                              />

                              {/* Release Date badge on cover */}
                              <div className="absolute top-1.5 left-1.5 z-10 px-1.5 py-0.5 rounded-md bg-black/85 backdrop-blur-md text-[9px] font-bold text-slate-200 border border-white/10 shadow-sm">
                                {item.releaseDateStr}
                              </div>

                              {/* Discount badge if present */}
                              {item.discountPercent && (
                                <div className="absolute top-1.5 right-1.5 z-10 px-1 py-0.5 rounded bg-emerald-600 text-[9px] font-black text-white shadow-sm">
                                  {item.discountPercent}
                                </div>
                              )}

                              {/* Hover overlay button */}
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2 z-20">
                                {libGame ? (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (onLaunchGame) onLaunchGame(libGame);
                                      else if (onSelectGame) onSelectGame(libGame);
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-lg shadow-emerald-600/30 transition transform group-hover:scale-105"
                                  >
                                    <Play className="w-3 h-3 fill-current" />
                                    <span>Play</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(e) => openStoreUrl(item.steamUrl, e)}
                                    className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-lg shadow-blue-600/30 transition transform group-hover:scale-105"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    <span>Steam</span>
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Card Details */}
                            <div className="p-2.5 flex flex-col flex-1 justify-between gap-1">
                              <div>
                                <h3
                                  title={item.title}
                                  className="text-[11px] font-bold text-white group-hover:text-blue-400 transition line-clamp-1 leading-snug"
                                >
                                  {item.title}
                                </h3>
                              </div>

                              <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[10px]">
                                {item.price ? (
                                  <div className="flex items-center gap-1">
                                    {item.originalPrice && (
                                      <span className="line-through text-slate-500 text-[9px]">
                                        {item.originalPrice}
                                      </span>
                                    )}
                                    <span className="font-bold text-emerald-400">{item.price}</span>
                                  </div>
                                ) : (
                                  <span className="text-[9px] font-medium text-slate-400">
                                    {item.isComingSoon ? 'Coming Soon' : 'Free / Available'}
                                  </span>
                                )}

                                <img
                                  src={steamLogo}
                                  alt="Steam"
                                  className="w-3 h-3 object-contain opacity-70 group-hover:opacity-100 transition"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: SEARCH & RECOMMENDATIONS (GEMINI AI + CATALOG SEARCH)              */}
      {/* ========================================================================= */}
      {activeTabMode === 'catalog' && (
        <div className="space-y-6">
          {/* Search Hero Banner */}
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-blue-950/80 via-slate-900 to-amber-950/40 border border-slate-800 p-6 md:p-8 shadow-2xl">
            <div className="relative z-10 max-w-3xl space-y-4">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Search & Recommendations
              </h1>

              <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">
                Browse top-rated games across all platforms or use <strong>natural language AI</strong> with Google Gemini to describe exactly what kind of experience you are in the mood for.
              </p>

              {/* Search Mode Toggle (AI Natural Language vs Classic Catalog) */}
              <div className="flex items-center gap-2 pt-2">
                <div className="bg-slate-950/80 p-1 rounded-xl border border-slate-800 flex items-center gap-1 shadow-inner">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAiMode(true);
                      if (activeAiQuery) handleClearAi();
                    }}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                      isAiMode
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md shadow-orange-500/20'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 fill-current" />
                    <span>Gemini AI Search</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsAiMode(false);
                      if (activeAiQuery) handleClearAi();
                    }}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                      !isAiMode
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Classic Catalog Search</span>
                  </button>
                </div>
              </div>

              {/* Search Bar Input */}
              <form onSubmit={handleSearchSubmit} className="pt-2">
                <div className="relative flex items-center">
                  <div className="absolute left-4 text-slate-400 pointer-events-none">
                    {isAiMode ? (
                      <Sparkles className="w-5 h-5 text-amber-400" />
                    ) : (
                      <Search className="w-5 h-5 text-blue-400" />
                    )}
                  </div>
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder={
                      isAiMode
                        ? 'Describe a vibe, genre, or mood (e.g. "atmospheric sci-fi horror with deep lore")'
                        : 'Search game title, genre or keyword in catalog...'
                    }
                    className="w-full pl-12 pr-32 py-3 bg-slate-950/90 border border-slate-700/80 rounded-xl text-white placeholder-slate-400 text-sm focus:outline-none focus:border-amber-500/70 focus:ring-2 focus:ring-amber-500/20 shadow-inner transition"
                  />
                  <div className="absolute right-2 flex items-center gap-1.5">
                    <button
                      type="submit"
                      disabled={aiLoading || loading}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                        isAiMode
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                          : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20'
                      }`}
                    >
                      {aiLoading || loading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Searching...</span>
                        </>
                      ) : isAiMode ? (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Ask Gemini</span>
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4" />
                          <span>Filter Catalog</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>

              {/* Quick suggestions shown when in AI mode */}
              {isAiMode && (
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-400">
                  <span className="text-[11px] text-slate-500">Try asking:</span>
                  {[
                    'Co-op horror games to play with friends',
                    'Challenging Metroidvanias with pixel art',
                    'Relaxing open-world exploration like Zelda',
                  ].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSearchInput(s)}
                      className="text-[11px] px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition border border-slate-700/50"
                    >
                      "{s}"
                    </button>
                  ))}
                </div>
              )}

              {/* AI Active Query Badge / Reset */}
              {activeAiQuery && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300">
                  <div className="flex items-center gap-2 truncate pr-2">
                    <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>AI Recommendations for: <strong>"{activeAiQuery}"</strong></span>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearAi}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-xs font-semibold shrink-0 transition"
                  >
                    Clear AI Filter
                  </button>
                </div>
              )}

              {/* API Key prompt if not configured */}
              {!settings.geminiApiKey && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-blue-950/40 border border-blue-500/30 text-xs text-blue-300">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>Want natural language search? Add your free Google Gemini API Key in Settings.</span>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenSettings}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-semibold shrink-0 transition"
                  >
                    Open Settings
                  </button>
                </div>
              )}

              {aiError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{aiError}</span>
                </div>
              )}
            </div>
          </div>

          {/* Filter Toolbar (Platforms, Stores, Genres) */}
          {!activeAiQuery && (
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Platform Dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 shrink-0">
                    <Monitor className="w-3.5 h-3.5 text-blue-400" /> Platform:
                  </span>
                  <div className="relative">
                    <select
                      value={selectedPlatform}
                      onChange={(e) => setSelectedPlatform(e.target.value)}
                      className="appearance-none bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-white text-xs font-semibold rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer transition shadow-sm"
                    >
                      <option value="all">All Platforms</option>
                      <optgroup label="PC & Computers">
                        <option value="pc">PC (Windows)</option>
                      </optgroup>
                      <optgroup label="Sony PlayStation">
                        <option value="playstation">All PlayStation</option>
                        <option value="ps5">PlayStation 5</option>
                        <option value="ps4">PlayStation 4</option>
                        <option value="ps3">PlayStation 3</option>
                        <option value="ps2">PlayStation 2</option>
                        <option value="ps1">PlayStation 1 (PSX)</option>
                        <option value="psp">PlayStation Portable (PSP)</option>
                        <option value="psvita">PlayStation Vita</option>
                      </optgroup>
                      <optgroup label="Microsoft Xbox">
                        <option value="xbox">All Xbox</option>
                        <option value="xbox-series">Xbox Series X|S</option>
                        <option value="xbox-one">Xbox One</option>
                        <option value="xbox360">Xbox 360</option>
                        <option value="xbox-original">Original Xbox</option>
                      </optgroup>
                      <optgroup label="Nintendo Consoles & Handhelds">
                        <option value="nintendo">All Nintendo</option>
                        <option value="switch">Nintendo Switch</option>
                        <option value="3ds">Nintendo 3DS</option>
                        <option value="ds">Nintendo DS</option>
                        <option value="wii-u">Nintendo Wii U</option>
                        <option value="wii">Nintendo Wii</option>
                        <option value="gamecube">Nintendo GameCube</option>
                        <option value="nintendo64">Nintendo 64</option>
                        <option value="gba">Game Boy Advance</option>
                        <option value="gbc">Game Boy Color</option>
                        <option value="gameboy">Original Game Boy</option>
                        <option value="snes">Super Nintendo (SNES)</option>
                        <option value="nes">NES (Famicom)</option>
                      </optgroup>
                      <optgroup label="Sega Systems">
                        <option value="sega">All Sega</option>
                        <option value="dreamcast">Sega Dreamcast</option>
                        <option value="saturn">Sega Saturn</option>
                        <option value="genesis">Sega Genesis / Mega Drive</option>
                      </optgroup>
                      <optgroup label="Retro & Classics">
                        <option value="retro">All Retro Systems</option>
                        <option value="arcade">Arcade (MAME / Neo Geo)</option>
                      </optgroup>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Store pills */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5" /> Store:
                  </span>
                  {stores.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedStore(s.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        selectedStore === s.id
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Genres row */}
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800/80">
                <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" /> Genre:
                </span>
                {genres.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setSelectedGenre(g.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                      selectedGenre === g.id
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Catalog Games Grid */}
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
              <p className="text-xs text-slate-400 font-medium">Loading recommendations catalog...</p>
            </div>
          ) : games.length === 0 ? (
            <div className="py-16 text-center rounded-2xl bg-slate-900/40 border border-slate-800 p-8 space-y-3">
              <Flame className="w-8 h-8 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-white">No Games Found</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No games matched your current filter criteria. Try resetting filters or using a broader query.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedPlatform('all');
                  setSelectedStore('all');
                  setSelectedGenre('all');
                  setSelectedYearRange('all');
                  setSearchInput('');
                  loadGames('');
                }}
                className="mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {games.map((game) => (
                <div
                  key={game.id}
                  onClick={() => handleSelectRecommendedGame(game)}
                  className="group relative flex flex-col bg-slate-900/90 border border-slate-800/80 rounded-2xl overflow-hidden hover:border-amber-500/40 transition duration-200 cursor-pointer shadow-xl flex-1 justify-between"
                >
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-950">
                    <img
                      src={game.bannerUrl || game.coverUrl}
                      alt={game.title}
                      className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>

                  <div className="p-4 flex flex-col flex-1 justify-between gap-3">
                    <div className="space-y-2">
                      <h3 className="text-sm font-bold text-white group-hover:text-amber-400 transition line-clamp-1">
                        {game.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {game.genres.slice(0, 3).map((g) => (
                          <span
                            key={g}
                            className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60"
                          >
                            {g}
                          </span>
                        ))}
                        {game.releaseDate && (
                          <span className="text-[10px] text-slate-500 ml-auto">
                            {game.releaseDate.split('-')[0]}
                          </span>
                        )}
                      </div>
                      {game.aiRecommendationReason && (
                        <p className="text-[11px] text-amber-300/90 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20 italic leading-snug">
                          "{game.aiRecommendationReason}"
                        </p>
                      )}
                      {!game.aiRecommendationReason && game.description && (
                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                          {game.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Available on Stores:
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {game.stores && game.stores.length > 0 ? (
                          game.stores.map((st) => {
                            const logo = getStoreLogo(st.id);
                            return (
                              <button
                                key={st.id + st.url}
                                type="button"
                                onClick={(e) => openStoreUrl(st.url, e)}
                                title={`Open ${game.title} on ${st.name}`}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 hover:border-slate-600 text-xs font-semibold transition group/btn"
                              >
                                {logo ? (
                                  <img src={logo} alt={st.name} className="w-3.5 h-3.5 object-contain" />
                                ) : (
                                  <ExternalLink className="w-3 h-3 text-slate-400 group-hover/btn:text-white" />
                                )}
                                <span>{st.name}</span>
                              </button>
                            );
                          })
                        ) : (
                          <button
                            type="button"
                            onClick={(e) =>
                              openStoreUrl(
                                `https://store.steampowered.com/search/?term=${encodeURIComponent(game.title)}`,
                                e
                              )
                            }
                            title={`Search for ${game.title} on Steam`}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 hover:border-slate-600 text-xs font-semibold transition group/btn"
                          >
                            <ExternalLink className="w-3 h-3 text-slate-400 group-hover/btn:text-white" />
                            <span>Search Online</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
