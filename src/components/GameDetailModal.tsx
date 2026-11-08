import React, { useEffect, useState, useRef } from 'react';
import {
  X,
  Play,
  Download,
  Star,
  Clock,
  Calendar,
  Building2,
  Folder,
  Cloud,
  Edit3,
  Trash2,
  CheckCircle2,
  Award,
  Sparkles,
  ExternalLink,
  Images,
  Eye,
  EyeOff,
  Loader2
} from 'lucide-react';
import { Game } from '../types/game';
import { formatPlaytime, formatRelativeDate } from '../utils/formatters';
import { GameImage } from './GameImage';
import { GameGalleryModal, GameScreenshotItem } from './GameGalleryModal';
import { PlatformBadge } from './PlatformBadge';
import { AdjustPlaytimeModal } from './AdjustPlaytimeModal';

interface GameDetailModalProps {
  game: Game | null;
  onClose: () => void;
  onLaunchGame: (game: Game) => void;
  onInstallGame?: (game: Game) => void;
  onToggleFavorite: (gameId: string) => void;
  onEditGame: (game: Game) => void;
  onDeleteGame: (gameId: string) => void;
  onToggleInstalled?: (gameId: string) => void;
  onOpenArtworkPicker?: (game: Game) => void;
  onUpdateGame?: (game: Game, options?: { syncActivity?: boolean }) => void;
  onToggleHidden?: (gameId: string) => void;
  showPlatformBadges?: boolean;
}

export const GameDetailModal: React.FC<GameDetailModalProps> = ({
  game,
  onClose,
  onLaunchGame,
  onInstallGame,
  onToggleFavorite,
  onEditGame,
  onDeleteGame,
  onToggleInstalled,
  onOpenArtworkPicker,
  onUpdateGame,
  onToggleHidden,
  showPlatformBadges = true,
}) => {
  const [screenshots, setScreenshots] = useState<GameScreenshotItem[]>([]);
  const [isGalleryLoading, setIsGalleryLoading] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [galleryInitialIndex, setGalleryInitialIndex] = useState(0);
  const [isAdjustPlaytimeOpen, setIsAdjustPlaytimeOpen] = useState(false);
  const [steamScore, setSteamScore] = useState<{
    appId?: string;
    rating: number;
    scoreDesc?: string;
    totalReviews?: number;
  } | null>(() => (game?.rating ? { rating: game.rating } : null));
  const pendingOpenRef = useRef(false);

  // Fetch official Steam Review score whenever a game is opened in GameDetailModal
  useEffect(() => {
    if (!game) {
      setSteamScore(null);
      return;
    }

    let isCancelled = false;

    if (game.rating) {
      setSteamScore((prev) => (prev?.scoreDesc ? prev : { rating: game.rating! }));
    } else {
      setSteamScore(null);
    }

    if (window.api?.getSteamRating) {
      window.api
        .getSteamRating({
          title: game.title,
          storeId: game.storeId,
          platform: game.platform,
          installUrl: game.installUrl,
          id: game.id,
        })
        .then((res) => {
          if (!isCancelled && res) {
            setSteamScore(res);
            if (!game.rating && res.rating && !game.id.startsWith('discovery-') && onUpdateGame) {
              onUpdateGame({ ...game, rating: res.rating }, { syncActivity: false });
            }
          }
        })
        .catch(() => {});
    }

    return () => {
      isCancelled = true;
    };
  }, [game?.id, game?.title, game?.storeId, game?.platform]);

  const handleSavePlaytime = (newPlaytimeMinutes: number, newLastPlayed?: string, syncWithActivity: boolean = true) => {
    if (!game || !onUpdateGame) return;
    onUpdateGame(
      {
        ...game,
        playtimeMinutes: newPlaytimeMinutes,
        lastPlayed: newLastPlayed,
      },
      { syncActivity: syncWithActivity }
    );
  };

  const isStorePlatform = game
    ? ['steam', 'epic', 'gog', 'ubisoft', 'ea', 'xbox'].includes(game.platform.toLowerCase())
    : false;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isGalleryOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isGalleryOpen]);

  // Fetch official store screenshots gallery for store platforms only (Steam, Epic, GOG, Ubisoft, EA, Xbox)
  useEffect(() => {
    pendingOpenRef.current = false;
    if (!game || !isStorePlatform) {
      setScreenshots([]);
      setIsGalleryLoading(false);
      return;
    }

    setScreenshots([]);
    setIsGalleryLoading(true);

    if (window.api?.getGameGallery) {
      window.api
        .getGameGallery(game)
        .then((res) => {
          if (res && Array.isArray(res.screenshots) && res.screenshots.length > 0) {
            setScreenshots(res.screenshots);
            if (pendingOpenRef.current) {
              setGalleryInitialIndex(0);
              setIsGalleryOpen(true);
              pendingOpenRef.current = false;
            }
          }
        })
        .catch(() => {})
        .finally(() => {
          setIsGalleryLoading(false);
        });
    } else {
      setIsGalleryLoading(false);
    }
  }, [game?.id, game?.platform]);

  // Auto-fetch categories & real descriptions if missing or generic
  useEffect(() => {
    if (!game) return;
    const genericList = [
      'steam library',
      'pc game',
      'epic cloud',
      'gog cloud',
      'steam cloud',
      'epic games',
      'auto-detected',
      'cloud owned',
      'manual entry',
    ];
    const genericDescPatterns = [
      /Steam Game \(AppID: \d+\)/i,
      /Installed via Epic Games Launcher/i,
      /GOG Game:/i,
      /Installed game detected on Windows PC/i,
      /Owned on Steam/i,
      /Owned on Epic Games Store/i,
      /Owned in \w+ Cloud/i,
      /Detected game on PC/i,
      /Owned on \w+ cloud library/i,
      /Launches seamlessly without requiring browser login/i,
      /No description provided/i,
      /Emulated title for/i,
      /Classic retro title/i,
      /Experience classic retro/i,
      /^Found in /i,
      /^Game added to Aegis Hub/i,
      /^Game added to /i,
    ];

    const isActionAdvPlaceholder =
      game.genres?.length === 2 &&
      game.genres[0].toLowerCase() === 'action' &&
      game.genres[1].toLowerCase() === 'adventure';

    const isGenericGenres =
      !game.genres ||
      game.genres.length === 0 ||
      isActionAdvPlaceholder ||
      game.genres.every((g) => genericList.includes(g.trim().toLowerCase()));

    const isGenericDesc =
      !game.description ||
      game.description.trim().length < 25 ||
      genericDescPatterns.some((rx) => rx.test(game.description));

    const isMissingEmuMeta =
      game.platform === 'emulator' &&
      (!game.developer || game.developer === 'Unknown' || !game.publisher || game.publisher === 'Independent' || !game.releaseDate);

    if ((isGenericGenres || isGenericDesc || isMissingEmuMeta) && window.api?.fetchGameCategories) {
      window.api
        .fetchGameCategories(game)
        .then((res) => {
          if (res) {
            const dev = (!game.developer || game.developer === 'Unknown') && res.developer ? res.developer : game.developer;
            const pub = (!game.publisher || game.publisher === 'Independent') && res.publisher ? res.publisher : (game.publisher && game.publisher !== 'Independent' ? game.publisher : (res.publisher || dev || 'Independent'));

            const updated: Game = {
              ...game,
              genres: res.genres && res.genres.length > 0 && isGenericGenres ? res.genres : game.genres,
              tags: res.tags ? Array.from(new Set([...(game.tags || []), ...res.tags])) : game.tags,
              developer: dev,
              publisher: pub,
              releaseDate: !game.releaseDate && res.releaseDate ? res.releaseDate : game.releaseDate,
              description: isGenericDesc && (res.description || res.summary) ? (res.description || res.summary)! : game.description,
              summary: res.summary || game.summary,
            };
            if (onUpdateGame) {
              onUpdateGame(updated);
            }
          }
        })
        .catch(() => {});
    }
  }, [game?.id]);

  if (!game) return null;

  const isInstalled = game.installed !== false;
  const isDiscoveryPreview = game.id.startsWith('discovery-');

  const getStoreUrl = (g: Game): string | null => {
    if (g.installUrl && (g.installUrl.startsWith('http://') || g.installUrl.startsWith('https://'))) {
      return g.installUrl;
    }
    switch (g.platform) {
      case 'steam':
        return g.storeId
          ? `https://store.steampowered.com/app/${g.storeId}`
          : `https://store.steampowered.com/search/?term=${encodeURIComponent(g.title)}`;
      case 'epic':
        return `https://store.epicgames.com/browse?q=${encodeURIComponent(g.title)}`;
      case 'gog':
        return g.storeId && /^\d+$/.test(g.storeId)
          ? `https://www.gog.com/game/${g.storeId}`
          : `https://www.gog.com/games?query=${encodeURIComponent(g.title)}`;
      case 'ea':
        return `https://www.ea.com/search?q=${encodeURIComponent(g.title)}`;
      case 'ubisoft':
        return `https://store.ubisoft.com/search?q=${encodeURIComponent(g.title)}`;
      case 'xbox':
        return `https://www.xbox.com/search?q=${encodeURIComponent(g.title)}`;
      default:
        return null;
    }
  };

  const getStoreLabel = (platform: string): string => {
    switch (platform) {
      case 'steam': return 'Steam Store';
      case 'epic': return 'Epic Store';
      case 'gog': return 'GOG Store';
      case 'ea': return 'EA Store';
      case 'ubisoft': return 'Ubisoft Store';
      case 'xbox': return 'Xbox Store';
      default: return 'Store';
    }
  };

  const storeUrl = getStoreUrl(game);

  const handleOpenStore = (url: string) => {
    if (window.api?.openExternal) {
      window.api.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Close Button Top Right */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 w-9 h-9 rounded-full bg-slate-950/70 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 flex items-center justify-center transition shadow-lg"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 select-text">
          {/* Distinct Page Background / Hero Banner Section */}
          <div className="relative h-72 sm:h-84 md:h-96 w-full overflow-hidden bg-slate-950 select-none">
            <GameImage
              key={game.bannerUrl}
              src={game.bannerUrl}
              alt={`${game.title} background`}
              title={game.title}
              platform={game.platform}
              type="banner"
              className="w-full h-full object-cover object-center"
            />

            {/* Ambient gradients */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-transparent to-slate-950/40" />

            {/* Top install status pill (if not installed) */}
            <div className="absolute top-4 left-6 z-10 flex items-center gap-2">
              {isDiscoveryPreview ? (
                <span className="text-xs font-semibold uppercase px-2.5 py-1 rounded-full bg-slate-900/90 text-amber-300 border border-amber-500/30 backdrop-blur-md flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>Discovery Store Preview</span>
                </span>
              ) : !isInstalled ? (
                <span className="text-xs font-semibold uppercase px-2.5 py-1 rounded-full bg-slate-900/90 text-slate-200 border border-slate-700 backdrop-blur-md flex items-center gap-1.5">
                  <Cloud className="w-3 h-3 text-blue-400" />
                  <span>Cloud Library (Not Installed)</span>
                </span>
              ) : null}
            </div>
          </div>

          {/* Main Details Body */}
          <div className="px-6 sm:px-8 pb-8 -mt-24 sm:-mt-32 relative z-20 select-text">
            <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
              {/* Distinct Vertical Cover Art / Thumbnail Poster */}
              <div
                onClick={() => {
                  if (isStorePlatform) {
                    if (screenshots.length > 0) {
                      setGalleryInitialIndex(0);
                      setIsGalleryOpen(true);
                    } else if (isGalleryLoading) {
                      pendingOpenRef.current = true;
                    }
                  }
                }}
                className={`group relative w-40 sm:w-48 md:w-56 aspect-[2/3] rounded-xl overflow-hidden shadow-2xl border-2 shrink-0 bg-slate-950 transition-all ${
                  isStorePlatform
                    ? 'cursor-pointer border-slate-700/80 hover:border-blue-500/80 hover:shadow-blue-500/20 transform hover:scale-[1.02] active:scale-[0.99]'
                    : 'border-slate-700/80'
                }`}
                title={
                  isStorePlatform
                    ? screenshots.length > 0
                      ? `Click to view gallery (${screenshots.length} screenshots)`
                      : isGalleryLoading
                      ? 'Loading screenshots gallery (click to open when ready)...'
                      : 'Store screenshots gallery'
                    : undefined
                }
              >
                <GameImage
                  key={game.coverUrl}
                  src={game.coverUrl}
                  alt={`${game.title} cover`}
                  title={game.title}
                  platform={game.platform}
                  type="cover"
                  className={`w-full h-full object-cover transition duration-300 ${
                    isStorePlatform && (screenshots.length > 0 || isGalleryLoading) ? 'group-hover:brightness-75' : ''
                  }`}
                />

                {/* Screenshot counter badge on cover */}
                {isStorePlatform && screenshots.length > 0 && (
                  <div className="absolute top-2.5 right-2.5 z-10 px-2 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-700/80 text-[10px] font-medium text-slate-200 flex items-center gap-1 shadow-md">
                    <Images className="w-3 h-3 text-blue-400" />
                    <span>{screenshots.length}</span>
                  </div>
                )}

                {/* Hover overlay */}
                {isStorePlatform && (
                  <div className={`absolute inset-0 bg-black/45 flex flex-col items-center justify-center gap-2 transition-opacity duration-200 text-white pointer-events-none ${
                    isGalleryLoading || screenshots.length > 0 ? 'opacity-0 group-hover:opacity-100' : 'hidden'
                  }`}>
                    {isGalleryLoading ? (
                      <>
                        <div className="w-10 h-10 rounded-full bg-slate-900/90 border border-slate-700 flex items-center justify-center shadow-lg">
                          <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                        </div>
                        <span className="text-[11px] font-semibold tracking-wide drop-shadow bg-slate-950/80 px-2.5 py-0.5 rounded-full border border-slate-700">
                          Loading Gallery...
                        </span>
                      </>
                    ) : screenshots.length > 0 ? (
                      <>
                        <div className="w-10 h-10 rounded-full bg-slate-900/90 border border-slate-700 flex items-center justify-center shadow-lg">
                          <Images className="w-5 h-5 text-blue-400" />
                        </div>
                        <span className="text-[11px] font-semibold tracking-wide drop-shadow bg-slate-950/80 px-2.5 py-0.5 rounded-full border border-slate-700">
                          View Gallery ({screenshots.length})
                        </span>
                      </>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Title, Badges, and Action Bar */}
              <div className="flex-1 w-full pt-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {showPlatformBadges && (
                    <PlatformBadge platform={game.platform} size="xs" showLabel />
                  )}
                  {steamScore ? (
                    <div
                      className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border transition-all ${
                        steamScore.rating >= 80
                          ? 'bg-cyan-950/40 text-cyan-300 border-cyan-500/30'
                          : steamScore.rating >= 70
                          ? 'bg-blue-950/40 text-blue-300 border-blue-500/30'
                          : steamScore.rating >= 40
                          ? 'bg-amber-950/40 text-amber-300 border-amber-500/30'
                          : 'bg-rose-950/40 text-rose-300 border-rose-500/30'
                      }`}
                      title={
                        steamScore.totalReviews
                          ? `Steam User Reviews: ${steamScore.scoreDesc || `${steamScore.rating}% Positive`} (${steamScore.totalReviews.toLocaleString()} reviews)`
                          : `Steam Rating: ${steamScore.rating}%`
                      }
                    >
                      <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                        <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.029 4.524 4.524s-2.03 4.524-4.524 4.524h-.105l-4.076 2.871c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 14.819C1.929 20.097 6.74 24 12.001 24c6.624 0 11.999-5.375 11.999-12S18.604 0 11.979 0z" />
                      </svg>
                      <span className="font-bold">{steamScore.rating}%</span>
                      {steamScore.scoreDesc && (
                        <span className="hidden sm:inline font-medium opacity-90 truncate max-w-[160px]">
                          {steamScore.scoreDesc}
                        </span>
                      )}
                      {steamScore.totalReviews && steamScore.totalReviews > 0 && (
                        <span className="text-[10px] opacity-75 hidden md:inline">
                          ({steamScore.totalReviews.toLocaleString()})
                        </span>
                      )}
                    </div>
                  ) : game.rating ? (
                    <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                      <Award className="w-3.5 h-3.5" />
                      {game.rating}% Rating
                    </span>
                  ) : isStorePlatform ? (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 px-2.5 py-0.5 rounded-full bg-slate-900/60 border border-slate-800 animate-pulse">
                      <svg className="w-3.5 h-3.5 fill-current shrink-0 opacity-60" viewBox="0 0 24 24">
                        <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.029 4.524 4.524s-2.03 4.524-4.524 4.524h-.105l-4.076 2.871c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 14.819C1.929 20.097 6.74 24 12.001 24c6.624 0 11.999-5.375 11.999-12S18.604 0 11.979 0z" />
                      </svg>
                      <span className="text-[11px]">Steam Score...</span>
                    </div>
                  ) : null}
                  {game.releaseDate && (
                    <span className="flex items-center gap-1 text-xs text-slate-400 px-2.5 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/50">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {game.releaseDate}
                    </span>
                  )}
                  {game.hidden && (
                    <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                      Hidden Game
                    </span>
                  )}
                </div>

                {/* Title in single line with ellipsis */}
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight truncate select-text cursor-text" title={game.title}>
                  {game.title}
                </h1>

                {/* Summary / Description in up to 2 lines with ellipsis */}
                {(game.summary || game.description) && (
                  <p className="mt-1.5 text-xs sm:text-sm text-slate-300 italic line-clamp-2 leading-relaxed select-text cursor-text" title={game.summary || game.description}>
                    "{game.summary || game.description}"
                  </p>
                )}

                {/* Action Rows & Quick Stats Container */}
                <div className="space-y-3 mt-5">
                  {/* Primary Row: Play/Install, Favorite, Choose Artwork, Edit Info, Store Link */}
                  <div className="flex flex-wrap items-center gap-2.5 select-none">
                    {isDiscoveryPreview ? (
                      storeUrl && (
                        <button
                          onClick={() => handleOpenStore(storeUrl)}
                          className="flex items-center gap-2.5 px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm tracking-wide uppercase shadow-lg bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:via-indigo-500 hover:to-blue-600 text-white shadow-blue-600/30 ring-1 ring-white/20 transition-all transform active:scale-95"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>Open on {getStoreLabel(game.platform)}</span>
                        </button>
                      )
                    ) : isInstalled ? (
                      <button
                        onClick={() => onLaunchGame(game)}
                        disabled={game.isRunning}
                        className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm tracking-wide uppercase shadow-lg transition-all transform active:scale-95 ${
                          game.isRunning
                            ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/50 cursor-default'
                            : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 text-white shadow-blue-600/30 ring-1 ring-white/20'
                        }`}
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>{game.isRunning ? 'Running' : 'Play Game'}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => (onInstallGame ? onInstallGame(game) : onLaunchGame(game))}
                        className="flex items-center gap-2.5 px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm tracking-wide uppercase shadow-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 ring-1 ring-white/20 transition-all transform active:scale-95"
                      >
                        <Download className="w-4 h-4" />
                        <span>Install Game</span>
                      </button>
                    )}

                    {!isDiscoveryPreview && (
                      <>
                        <button
                          onClick={() => onToggleFavorite(game.id)}
                          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition ${
                            game.favorite
                              ? 'bg-amber-500/15 text-amber-400 border-amber-500/40'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                          }`}
                        >
                          <Star
                            className={`w-3.5 h-3.5 ${
                              game.favorite ? 'fill-amber-400 text-amber-400' : 'text-slate-400'
                            }`}
                          />
                          <span>{game.favorite ? 'Favorited' : 'Favorite'}</span>
                        </button>

                        {onOpenArtworkPicker && (
                          <button
                            onClick={() => onOpenArtworkPicker(game)}
                            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                            title="Choose or search official box arts and wallpapers"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-slate-400" />
                            <span>Choose Artwork</span>
                          </button>
                        )}

                        <button
                          onClick={() => onEditGame(game)}
                          className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                          title="Edit game details and metadata"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                          <span>Edit Info</span>
                        </button>
                      </>
                    )}

                    {!isDiscoveryPreview && storeUrl && (
                      <button
                        onClick={() => handleOpenStore(storeUrl)}
                        className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                        title={`Open ${game.title} on ${getStoreLabel(game.platform)}`}
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                        <span>{getStoreLabel(game.platform)}</span>
                      </button>
                    )}
                  </div>

                  {/* Secondary Row: Mark Installed, Hide Game, Delete (Compact) */}
                  {!isDiscoveryPreview && (
                    <div className="flex flex-wrap items-center gap-2 select-none">
                      {onToggleInstalled && (
                        <button
                          onClick={() => onToggleInstalled(game.id)}
                          title="Toggle installed status"
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700 transition"
                        >
                          <CheckCircle2 className={`w-3.5 h-3.5 ${isInstalled ? 'text-emerald-400' : 'text-slate-500'}`} />
                          <span>{isInstalled ? 'Marked Installed' : 'Mark Installed'}</span>
                        </button>
                      )}

                      {onToggleHidden && (
                        <button
                          onClick={() => onToggleHidden(game.id)}
                          title={game.hidden ? 'Restore game to library' : 'Hide game from library and Recently Played'}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition ${
                            game.hidden
                              ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/30'
                              : 'bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          {game.hidden ? (
                            <>
                              <Eye className="w-3.5 h-3.5 text-amber-400" />
                              <span>Unhide Game</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                              <span>Hide Game</span>
                            </>
                          )}
                        </button>
                      )}

                      <button
                        onClick={() => onDeleteGame(game.id)}
                        title="Remove from library"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-slate-800/60 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-500/30 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  )}

                  {/* Quick Stats Grid: Time Played, Last Played, Developer, Publisher (Aligned with Cover) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAdjustPlaytimeOpen(true)}
                      title="Click to edit playtime and last played date"
                      className="group p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-900/50 transition-all text-left flex flex-col justify-between cursor-pointer min-w-0"
                    >
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-1 w-full">
                        <div className="flex items-center gap-1.5 truncate">
                          <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span className="truncate">Time Played</span>
                        </div>
                        <span className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 group-hover:text-blue-400 transition shrink-0">
                          <Edit3 className="w-3 h-3" />
                        </span>
                      </div>
                      <div className="text-sm sm:text-base font-bold text-white font-mono group-hover:text-blue-200 transition-colors truncate">
                        {formatPlaytime(game.playtimeMinutes)}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsAdjustPlaytimeOpen(true)}
                      title="Click to edit playtime and last played date"
                      className="group p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-purple-500/50 hover:bg-slate-900/50 transition-all text-left flex flex-col justify-between cursor-pointer min-w-0"
                    >
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-1 w-full">
                        <div className="flex items-center gap-1.5 truncate">
                          <Calendar className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          <span className="truncate">Last Played</span>
                        </div>
                        <span className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 group-hover:text-purple-400 transition shrink-0">
                          <Edit3 className="w-3 h-3" />
                        </span>
                      </div>
                      <div className="text-xs sm:text-sm font-semibold text-white group-hover:text-purple-200 transition-colors truncate">
                        {formatRelativeDate(game.lastPlayed)}
                      </div>
                    </button>

                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-left flex flex-col justify-between min-w-0 select-text">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1 truncate">
                        <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">Developer</span>
                      </div>
                      <div className="text-xs sm:text-sm font-semibold text-white truncate select-text cursor-text" title={game.developer || 'Unknown'}>
                        {game.developer || 'Unknown'}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-left flex flex-col justify-between min-w-0 select-text">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1 truncate">
                        <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="truncate">Publisher</span>
                      </div>
                      <div
                        className="text-xs sm:text-sm font-semibold text-white truncate select-text cursor-text"
                        title={game.publisher && game.publisher !== 'Independent' ? game.publisher : (game.developer && game.developer !== 'Unknown' ? game.developer : 'Independent')}
                      >
                        {game.publisher && game.publisher !== 'Independent' ? game.publisher : (game.developer && game.developer !== 'Unknown' ? game.developer : 'Independent')}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Description & Metadata Section */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Left 2 Cols: Description & Tags */}
              <div className="md:col-span-2 space-y-6 select-text">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3 select-none">
                    About the Game
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line select-text cursor-text">
                    {game.description || 'No description provided.'}
                  </p>
                </div>

                {/* Genres & Tags */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 select-none">
                    Genres & Tags
                  </h3>
                  <div className="flex flex-wrap gap-2 select-text">
                    {game.genres?.map((g) => (
                      <span
                        key={g}
                        className="px-2.5 py-1 text-xs rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium select-text cursor-text"
                      >
                        {g}
                      </span>
                    ))}
                    {game.tags?.map((t) => (
                      <span
                        key={t}
                        className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 text-slate-300 border border-slate-700 font-medium select-text cursor-text"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Col: Technical Details & File Info */}
              <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 space-y-4 text-xs select-text">
                <div>
                  <div className="text-slate-500 font-medium mb-1 select-none">Status</div>
                  <div className="text-slate-200 flex items-center gap-2 select-text">
                    {isDiscoveryPreview ? (
                      <span className="flex items-center gap-1 text-amber-300 font-semibold">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        Available on Steam Store
                      </span>
                    ) : isInstalled ? (
                      <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Installed on this PC
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-slate-400 font-semibold">
                        <Cloud className="w-3.5 h-3.5 text-blue-400" />
                        Cloud / Not Installed
                      </span>
                    )}
                  </div>
                </div>

                {game.executablePath && (
                  <div>
                    <div className="text-slate-500 font-medium mb-1 select-none">Executable Target</div>
                    <div className="font-mono text-slate-300 break-all bg-slate-900 p-2 rounded border border-slate-800 text-[11px] select-text cursor-text">
                      {game.executablePath}
                    </div>
                  </div>
                )}

                {game.installPath && (
                  <div>
                    <div className="text-slate-500 font-medium mb-1 select-none">Installation Directory</div>
                    <div className="font-mono text-slate-300 break-all bg-slate-900 p-2 rounded border border-slate-800 text-[11px] select-text cursor-text">
                      {game.installPath}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-slate-500 font-medium mb-1 select-none">Date Added</div>
                  <div className="text-slate-300 select-text cursor-text">
                    {new Date(game.addedDate).toLocaleDateString(undefined, {
                      dateStyle: 'medium',
                    })}
                  </div>
                </div>

                {steamScore && (
                  <div>
                    <div className="text-slate-500 font-medium mb-1 select-none flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 fill-current text-slate-400" viewBox="0 0 24 24">
                        <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.029 4.524 4.524s-2.03 4.524-4.524 4.524h-.105l-4.076 2.871c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 14.819C1.929 20.097 6.74 24 12.001 24c6.624 0 11.999-5.375 11.999-12S18.604 0 11.979 0z" />
                      </svg>
                      <span>Steam Reviews</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between">
                        <span
                          className={`font-bold ${
                            steamScore.rating >= 80
                              ? 'text-cyan-400'
                              : steamScore.rating >= 70
                              ? 'text-blue-400'
                              : steamScore.rating >= 40
                              ? 'text-amber-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {steamScore.scoreDesc || `${steamScore.rating}% Positive`}
                        </span>
                        <span className="font-mono text-slate-200 font-bold">{steamScore.rating}%</span>
                      </div>
                      {steamScore.totalReviews && steamScore.totalReviews > 0 && (
                        <div className="text-[11px] text-slate-400">
                          Based on {steamScore.totalReviews.toLocaleString()} reviews on Steam
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Official Store Screenshots Gallery Section */}
            {screenshots.length > 0 && (
              <div className="mt-8 pt-6 border-t border-slate-800/80">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Images className="w-4 h-4 text-blue-400" />
                    <span>Official Store Screenshots ({screenshots.length})</span>
                  </h3>
                  <button
                    onClick={() => {
                      setGalleryInitialIndex(0);
                      setIsGalleryOpen(true);
                    }}
                    className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition flex items-center gap-1"
                  >
                    <span>View All</span>
                    <span>→</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {screenshots.slice(0, 4).map((s, idx) => (
                    <div
                      key={s.id || idx}
                      onClick={() => {
                        setGalleryInitialIndex(idx);
                        setIsGalleryOpen(true);
                      }}
                      className="group relative aspect-video rounded-xl overflow-hidden border border-slate-800/90 bg-slate-950 cursor-pointer shadow-md hover:border-blue-500/60 hover:shadow-blue-500/10 transition-all transform hover:scale-[1.02] active:scale-[0.99]"
                      title="Click to view full screenshot"
                    >
                      <img
                        src={s.thumbnail}
                        alt=""
                        className="w-full h-full object-cover group-hover:brightness-90 transition duration-200"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                        <div className="w-8 h-8 rounded-full bg-slate-900/90 text-white flex items-center justify-center shadow">
                          <Images className="w-4 h-4 text-blue-400" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen Lightbox Gallery Modal */}
      <GameGalleryModal
        game={game}
        screenshots={screenshots}
        initialIndex={galleryInitialIndex}
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        onSetBanner={(url) => {
          if (onUpdateGame) {
            onUpdateGame({ ...game, bannerUrl: url });
          }
        }}
      />

      {/* Adjust Playtime & Last Played Modal */}
      <AdjustPlaytimeModal
        isOpen={isAdjustPlaytimeOpen}
        onClose={() => setIsAdjustPlaytimeOpen(false)}
        gameTitle={game.title}
        initialPlaytimeMinutes={game.playtimeMinutes || 0}
        initialLastPlayed={game.lastPlayed}
        onSave={handleSavePlaytime}
      />
    </div>
  );
};
