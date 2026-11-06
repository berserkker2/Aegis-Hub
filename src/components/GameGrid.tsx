import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ArrowUpDown,
  Filter,
  Gamepad2,
  FolderSync,
  Plus,
  SlidersHorizontal,
  Cloud,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { Game, GamePlatform } from '../types/game';
import { GameCard } from './GameCard';
import { LibraryViewSlider, getViewMode, getThumbnailWidth } from './LibraryViewSlider';
import { GameListView } from './GameListView';
import { GameIconView } from './GameIconView';


interface GameGridProps {
  games: Game[];
  searchQuery: string;
  selectedFilter: string;
  selectedPlatform: GamePlatform | 'all';
  onSelectGame: (game: Game) => void;
  onLaunchGame: (game: Game, e: React.MouseEvent) => void;
  onInstallGame?: (game: Game, e: React.MouseEvent) => void;
  onToggleFavorite: (gameId: string, e: React.MouseEvent) => void;
  onEditGame: (game: Game, e: React.MouseEvent) => void;
  onOpenArtworkPicker?: (game: Game, e: React.MouseEvent) => void;
  onToggleHidden?: (gameId: string, e: React.MouseEvent) => void;
  onOpenAddGame: () => void;
  onOpenScanner: () => void;
  showPlatformBadges?: boolean;
}

type SortOption = 'lastPlayed' | 'title' | 'playtime' | 'rating' | 'addedDate';

export const GameGrid: React.FC<GameGridProps> = React.memo(({
  games,
  searchQuery,
  selectedFilter,
  selectedPlatform,
  onSelectGame,
  onLaunchGame,
  onInstallGame,
  onToggleFavorite,
  onEditGame,
  onOpenArtworkPicker,
  onToggleHidden,
  onOpenAddGame,
  onOpenScanner,
  showPlatformBadges = true,
}) => {
  const [sortBy, setSortBy] = useState<SortOption>('lastPlayed');
  const [sliderValue, setSliderValue] = useState<number>(() => {
    const saved = localStorage.getItem('aegis_library_view_slider') ?? localStorage.getItem('nexus_library_view_slider');
    return saved !== null ? Number(saved) : 60;
  });
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const sliderSaveTimerRef = useRef<number | null>(null);

  const handleSliderChange = (newVal: number) => {
    setSliderValue(newVal);
    if (sliderSaveTimerRef.current !== null) {
      window.clearTimeout(sliderSaveTimerRef.current);
    }
    sliderSaveTimerRef.current = window.setTimeout(() => {
      localStorage.setItem('aegis_library_view_slider', String(newVal));
    }, 150);
  };

  const viewMode = getViewMode(sliderValue);
  const thumbnailWidth = getThumbnailWidth(sliderValue);

  const allGenres = useMemo(() => {
    const set = new Set<string>();
    games.forEach((g) => g.genres?.forEach((genre) => set.add(genre)));
    return Array.from(set);
  }, [games]);

  const filteredGames = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const matched = games.filter((game) => {
      // Hidden items filter
      if (selectedFilter === 'hidden') {
        if (!game.hidden) return false;
      } else {
        if (game.hidden) return false;
      }

      // Sidebar category filter
      if (selectedFilter === 'favorites' && !game.favorite) return false;
      if (selectedFilter === 'recent' && !game.lastPlayed) return false;
      if (selectedFilter === 'installed' && game.installed === false) return false;
      if (selectedFilter === 'cloud' && game.installed !== false) return false;

      // Platform filter
      if (selectedPlatform !== 'all' && game.platform !== selectedPlatform) return false;

      // Genre filter
      if (selectedGenre !== 'all' && !game.genres?.includes(selectedGenre)) return false;

      // Query search
      if (q) {
        const matchTitle = game.title.toLowerCase().includes(q);
        const matchGenres = game.genres?.some((g) => g.toLowerCase().includes(q));
        const matchPlatform = game.platform.toLowerCase().includes(q);
        const matchDev = game.developer?.toLowerCase().includes(q);
        if (!matchTitle && !matchGenres && !matchPlatform && !matchDev) return false;
      }

      return true;
    });

    if (sortBy === 'lastPlayed' || selectedFilter === 'recent') {
      const withTs = matched.map((g) => ({
        g,
        ts: g.lastPlayed ? Date.parse(g.lastPlayed) || 0 : 0,
      }));
      withTs.sort((a, b) => b.ts - a.ts);
      return withTs.map((item) => item.g);
    }

    if (sortBy === 'addedDate') {
      const withTs = matched.map((g) => ({
        g,
        ts: g.addedDate ? Date.parse(g.addedDate) || 0 : 0,
      }));
      withTs.sort((a, b) => b.ts - a.ts);
      return withTs.map((item) => item.g);
    }

    return matched.sort((a, b) => {
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === 'playtime') {
        return (b.playtimeMinutes || 0) - (a.playtimeMinutes || 0);
      }
      if (sortBy === 'rating') {
        return (b.rating || 0) - (a.rating || 0);
      }
      return 0;
    });
  }, [games, searchQuery, selectedFilter, selectedPlatform, selectedGenre, sortBy]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [computedColumns, setComputedColumns] = useState<number>(() => {
    const minW = thumbnailWidth || 180;
    return Math.max(1, Math.floor((1200 + 16) / (minW + 16)));
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let rafId: number | null = null;
    const measure = () => {
      const width = el.clientWidth;
      if (width > 0) {
        const minW = viewMode === 'icons' ? 104 : thumbnailWidth;
        const gap = 16;
        const cols = Math.max(1, Math.floor((width + gap) / (minW + gap)));
        setComputedColumns((prev) => (prev !== cols ? cols : prev));
      }
    };

    measure();
    const ro = new ResizeObserver(() => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(measure);
    });
    ro.observe(el);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, [viewMode, thumbnailWidth]);

  // Page size: around 100 items, but an exact multiple of columns so the grid has NO empty holes
  const pageSize = useMemo(() => {
    if (viewMode === 'list') {
      return 100;
    }
    const cols = computedColumns > 0 ? computedColumns : 6;
    const target = 100;
    const rows = Math.max(1, Math.round(target / cols));
    return rows * cols;
  }, [viewMode, computedColumns]);

  const [currentPage, setCurrentPage] = useState<number>(1);

  // Reset to first page when any search/filter/sorting changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedFilter, selectedPlatform, selectedGenre, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredGames.length / pageSize));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredGames.length);
  const paginatedGames = useMemo(() => {
    return filteredGames.slice(startIndex, endIndex);
  }, [filteredGames, startIndex, endIndex]);

  const handlePageChange = (pageNum: number) => {
    const p = Math.max(1, Math.min(pageNum, totalPages));
    setCurrentPage(p);
    if (containerRef.current) {
      const parentScroll = containerRef.current.closest('main') || containerRef.current;
      if (parentScroll && parentScroll !== containerRef.current) {
        parentScroll.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [];
    pages.push(1);
    if (currentPage > 3) {
      pages.push('dots-1');
    }
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) {
      pages.push('dots-2');
    }
    pages.push(totalPages);
    return pages;
  }, [currentPage, totalPages]);

  return (
    <div ref={containerRef} className="space-y-4">
      {/* Grid Filter and Sorting Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-1 text-xs">
        <div className="flex items-center gap-2">
          <div className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <span>
              {selectedFilter === 'hidden'
                ? 'Hidden Games & Apps'
                : selectedFilter === 'recent'
                ? 'Recently Played'
                : selectedFilter === 'favorites'
                ? 'Favorites'
                : selectedFilter === 'installed'
                ? 'Installed Games'
                : selectedFilter === 'cloud'
                ? 'Cloud / Owned Games'
                : 'Library Games'}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
              {filteredGames.length}
            </span>
            {totalPages > 1 && (
              <span className="text-[11px] font-normal text-slate-400">
                • Page {currentPage} of {totalPages}
              </span>
            )}
          </div>

          {/* Genre selector pill */}
          {allGenres.length > 0 && (
            <select
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              style={{ colorScheme: 'dark' }}
              className="bg-slate-900 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-1 text-xs outline-none hover:border-slate-700 transition cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-slate-200">All Genres</option>
              {allGenres.map((g) => (
                <option key={g} value={g} className="bg-slate-900 text-slate-200">
                  {g}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Right tools: Sort dropdown & Grid size switch */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              style={{ colorScheme: 'dark' }}
              className="bg-slate-900 text-slate-200 text-xs outline-none cursor-pointer border-none"
            >
              <option value="lastPlayed" className="bg-slate-900 text-slate-200 py-1">Recently Played</option>
              <option value="title" className="bg-slate-900 text-slate-200 py-1">Alphabetical (A-Z)</option>
              <option value="playtime" className="bg-slate-900 text-slate-200 py-1">Most Played</option>
              <option value="rating" className="bg-slate-900 text-slate-200 py-1">Highest Rated</option>
              <option value="addedDate" className="bg-slate-900 text-slate-200 py-1">Date Added</option>
            </select>
          </div>

          {/* View Mode & Thumbnail Slider */}
          <LibraryViewSlider
            value={sliderValue}
            onChange={handleSliderChange}
            accentColor="blue"
          />
        </div>
      </div>

      {/* Hidden Games informative banner */}
      {selectedFilter === 'hidden' && (
        <div className="p-3.5 rounded-xl bg-amber-950/25 border border-amber-500/30 flex items-center gap-3 text-xs text-amber-200">
          <EyeOff className="w-5 h-5 text-amber-400 shrink-0" />
          <p className="leading-relaxed">
            These games and apps are hidden from your regular library views and Recently Played shelf.
            Hover over a game or click it to unhide and restore it to your active library at any time.
          </p>
        </div>
      )}

      {/* Grid or Empty State */}
      {filteredGames.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-2xl bg-slate-950/40 border border-dashed border-slate-800">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center text-slate-500 mb-4 border border-slate-800">
            {selectedFilter === 'hidden' ? (
              <EyeOff className="w-8 h-8 text-slate-500" />
            ) : (
              <Gamepad2 className="w-8 h-8" />
            )}
          </div>
          <h3 className="text-base font-bold text-slate-200">
            {selectedFilter === 'hidden' ? 'No hidden games or apps' : 'No games found'}
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            {selectedFilter === 'hidden'
              ? 'You have not hidden any games yet. You can hide games or utility apps (like Wallpaper Engine) directly from their details view or by hovering over any card.'
              : selectedFilter === 'cloud'
              ? 'Connect your Steam, Epic or GOG accounts to view owned games in the cloud.'
              : 'Try adjusting your search or filters, or add games automatically by scanning your PC.'}
          </p>
          {selectedFilter !== 'hidden' && (
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={onOpenScanner}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-blue-600/25 transition"
              >
                <FolderSync className="w-4 h-4" />
                <span>Scan Computer</span>
              </button>
              <button
                onClick={onOpenAddGame}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add Game Manually</span>
              </button>
            </div>
          )}
        </div>
      ) : viewMode === 'list' ? (
        <GameListView
          games={paginatedGames}
          onSelectGame={onSelectGame}
          onLaunchGame={onLaunchGame}
          onInstallGame={onInstallGame}
          onToggleFavorite={onToggleFavorite}
          onEditGame={onEditGame}
          onOpenArtworkPicker={onOpenArtworkPicker}
          accentColor="blue"
          showPlatformBadges={showPlatformBadges}
        />
      ) : viewMode === 'icons' ? (
        <GameIconView
          games={paginatedGames}
          onSelectGame={onSelectGame}
          onLaunchGame={onLaunchGame}
          onInstallGame={onInstallGame}
          onToggleFavorite={onToggleFavorite}
          onEditGame={onEditGame}
          accentColor="blue"
          showPlatformBadges={showPlatformBadges}
        />
      ) : (
        <div
          className="grid gap-4 games-grid-container"
          style={{
            gridTemplateColumns: `repeat(auto-fill, minmax(${thumbnailWidth}px, 1fr))`,
          }}
        >
          {paginatedGames.map((game) => (
            <GameCard
              key={`${game.id}-${game.coverUrl}`}
              game={game}
              onSelectGame={onSelectGame}
              onLaunchGame={onLaunchGame}
              onInstallGame={onInstallGame}
              onToggleFavorite={onToggleFavorite}
              onEditGame={onEditGame}
              onOpenArtworkPicker={onOpenArtworkPicker}
              onToggleHidden={onToggleHidden}
              showPlatformBadge={showPlatformBadges}
            />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-5 pb-2 border-t border-slate-800/80">
          <div className="text-xs text-slate-400 font-medium">
            Showing <span className="text-slate-200 font-semibold">{startIndex + 1}</span>–<span className="text-slate-200 font-semibold">{endIndex}</span> of <span className="text-slate-200 font-semibold">{filteredGames.length}</span> games
          </div>

          <div className="flex items-center gap-1.5 select-none">
            {/* First Page */}
            <button
              onClick={() => handlePageChange(1)}
              disabled={currentPage <= 1}
              title="First Page"
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>

            {/* Previous Page */}
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              title="Previous Page"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Prev</span>
            </button>

            {/* Page Numbers */}
            <div className="flex items-center gap-1">
              {pageNumbers.map((item, idx) => {
                if (typeof item === 'string') {
                  return (
                    <span key={`dots-${idx}`} className="px-1.5 text-slate-500 text-xs select-none">
                      •••
                    </span>
                  );
                }
                const isActive = item === currentPage;
                return (
                  <button
                    key={item}
                    onClick={() => handlePageChange(item)}
                    className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
                        : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>

            {/* Next Page */}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              title="Next Page"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Last Page */}
            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage >= totalPages}
              title="Last Page"
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
