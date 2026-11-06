import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Play, Clock, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { Game } from '../types/game';
import { formatPlaytime, formatRelativeDate } from '../utils/formatters';
import { GameImage } from './GameImage';
import { PlatformBadge } from './PlatformBadge';

interface SmoothScrollTask {
  targetLeft: number;
  rafId: number | null;
}

const activeHorizontalScrolls = new WeakMap<HTMLElement, SmoothScrollTask>();

function smoothScrollHorizontal(el: HTMLElement, deltaLeft: number) {
  let task = activeHorizontalScrolls.get(el);
  const maxLeft = Math.max(0, el.scrollWidth - el.clientWidth);
  const baseLeft = task && task.rafId !== null ? task.targetLeft : el.scrollLeft;
  const nextTarget = Math.max(0, Math.min(baseLeft + deltaLeft, maxLeft));

  if (!task) {
    task = { targetLeft: nextTarget, rafId: null };
    activeHorizontalScrolls.set(el, task);
  } else {
    task.targetLeft = nextTarget;
  }

  if (task.rafId !== null) return;

  const step = () => {
    const t = activeHorizontalScrolls.get(el);
    if (!t) return;
    const current = el.scrollLeft;
    const diff = t.targetLeft - current;
    if (Math.abs(diff) > 0.5) {
      el.scrollLeft = current + diff * 0.22;
      t.rafId = requestAnimationFrame(step);
    } else {
      el.scrollLeft = t.targetLeft;
      t.rafId = null;
    }
  };

  task.rafId = requestAnimationFrame(step);
}

interface RecentGameCardProps {
  game: Game;
  onSelectGame: (game: Game) => void;
  onLaunchGame: (game: Game, e: React.MouseEvent) => void;
  onToggleFavorite: (gameId: string, e: React.MouseEvent) => void;
  showPlatformBadges?: boolean;
}

const RecentGameCard = React.memo<RecentGameCardProps>(({
  game,
  onSelectGame,
  onLaunchGame,
  onToggleFavorite,
  showPlatformBadges = true,
}) => {
  return (
    <div
      onClick={() => onSelectGame(game)}
      className="shrink-0 w-60 sm:w-64 group relative h-28 rounded-xl overflow-hidden bg-slate-900 border border-slate-800/80 hover:border-blue-500/60 transition-[transform,border-color] duration-200 ease-out transform-gpu will-change-transform hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between p-2.5"
    >
      {/* Distinct Background Banner */}
      <div className="absolute inset-0 overflow-hidden">
        <GameImage
          src={game.bannerUrl || game.coverUrl}
          alt={game.title}
          title={game.title}
          platform={game.platform}
          type="banner"
          className="w-full h-full object-cover transition-transform duration-300 ease-out will-change-transform group-hover:scale-[1.04]"
        />
      </div>

      {/* Multi-step gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-slate-900/40 pointer-events-none" />
      <div className="absolute inset-0 bg-blue-950/10 group-hover:bg-blue-600/10 transition-colors duration-200 pointer-events-none" />

      {/* Top Row: Platform Badge & Favorite Button */}
      <div className="relative z-10 flex items-center justify-between">
        {showPlatformBadges ? (
          <PlatformBadge platform={game.platform} size="sm" />
        ) : (
          <div />
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(game.id, e);
          }}
          title={game.favorite ? 'Remove from favorites' : 'Add to favorites'}
          className="w-6 h-6 rounded-full bg-slate-950/85 hover:bg-slate-900 border border-slate-700/70 flex items-center justify-center text-slate-300 hover:text-amber-400 transition-colors"
        >
          <Star
            className={`w-3 h-3 ${
              game.favorite
                ? 'text-amber-400 fill-amber-400'
                : 'text-slate-400 hover:text-amber-300'
            }`}
          />
        </button>
      </div>

      {/* Bottom Info: Title, Playtime & Play Button */}
      <div className="relative z-10 flex items-end justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors duration-150 line-clamp-1">
            {game.title}
          </h3>
          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400">
            <span className="flex items-center gap-1 text-slate-300 truncate">
              <Clock className="w-2.5 h-2.5 text-blue-400 shrink-0" />
              <span className="truncate">{formatRelativeDate(game.lastPlayed)}</span>
            </span>
            <span>•</span>
            <span className="font-mono text-slate-400 shrink-0">
              {formatPlaytime(game.playtimeMinutes)}
            </span>
          </div>
        </div>

        {/* Instant Play Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onLaunchGame(game, e);
          }}
          title={`Launch ${game.title}`}
          className="w-7 h-7 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-md transform-gpu transition-transform duration-150 group-hover:scale-110 active:scale-95 shrink-0"
        >
          <Play className="w-3 h-3 fill-white ml-0.5" />
        </button>
      </div>

      {/* Running indicator */}
      {game.isRunning && (
        <div className="absolute top-2 left-2 z-20 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-950/90 border border-emerald-500/50 text-emerald-400 text-[9px] font-semibold">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span>RUN</span>
        </div>
      )}
    </div>
  );
});

interface RecentlyPlayedShelfProps {
  games: Game[];
  onSelectGame: (game: Game) => void;
  onLaunchGame: (game: Game, e: React.MouseEvent) => void;
  onToggleFavorite: (gameId: string, e: React.MouseEvent) => void;
  title?: string;
  extraHeaderRight?: React.ReactNode;
  showPlatformBadges?: boolean;
}

export const RecentlyPlayedShelf: React.FC<RecentlyPlayedShelfProps> = React.memo(({
  games,
  onSelectGame,
  onLaunchGame,
  onToggleFavorite,
  title = 'Recently Played',
  extraHeaderRight,
  showPlatformBadges = true,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const recentGames = useMemo(() => {
    const withTimestamps: { game: Game; ts: number }[] = [];
    for (let i = 0; i < games.length; i++) {
      const g = games[i];
      if (g.lastPlayed && !g.hidden) {
        withTimestamps.push({ game: g, ts: Date.parse(g.lastPlayed) || 0 });
      }
    }
    withTimestamps.sort((a, b) => b.ts - a.ts);
    return withTimestamps.slice(0, 20).map((item) => item.game);
  }, [games]);

  const updateScrollButtons = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const nextLeft = scrollLeft > 10;
    const nextRight = scrollLeft < scrollWidth - clientWidth - 10;
    setCanScrollLeft((prev) => (prev !== nextLeft ? nextLeft : prev));
    setCanScrollRight((prev) => (prev !== nextRight ? nextRight : prev));
  }, []);

  useEffect(() => {
    updateScrollButtons();
    const el = scrollRef.current;
    if (!el) return;

    let rafId: number | null = null;
    const onScrollOrResize = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        updateScrollButtons();
      });
    };

    el.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      el.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [recentGames.length, updateScrollButtons]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = 520;
    smoothScrollHorizontal(scrollRef.current, direction === 'left' ? -scrollAmount : scrollAmount);
  };

  if (recentGames.length === 0) return null;

  return (
    <section className="mb-6 select-none">
      {/* Shelf Header */}
      <div className="flex items-center justify-between mb-2.5 px-1">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-400" />
          <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
            <span>{title}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-blue-400 font-mono font-bold">
              {recentGames.length}
            </span>
          </h2>
        </div>

        {/* Navigation Arrows & Actions */}
        <div className="flex items-center gap-3">
          {extraHeaderRight}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleScroll('left')}
              disabled={!canScrollLeft}
              title="Previous recent games"
              className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleScroll('right')}
              disabled={!canScrollRight}
              title="Next recent games"
              className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Single Row Horizontal Scroll Container */}
      <div
        ref={scrollRef}
        className="flex items-center gap-3 overflow-x-auto py-1 px-0.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {recentGames.map((game) => (
          <RecentGameCard
            key={`${game.id}-${game.coverUrl}-${game.bannerUrl}`}
            game={game}
            onSelectGame={onSelectGame}
            onLaunchGame={onLaunchGame}
            onToggleFavorite={onToggleFavorite}
            showPlatformBadges={showPlatformBadges}
          />
        ))}
      </div>
    </section>
  );
});
