import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Gamepad2,
  Tv,
  ArrowUpDown,
  Search,
  FolderSync,
  SlidersHorizontal,
  Plus,
  Play,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { Game, EmulatorConfig } from '../types/game';
import { EmulatorShelf } from './EmulatorShelf';
import { GameCard } from './GameCard';
import { LibraryViewSlider, getViewMode, getThumbnailWidth } from './LibraryViewSlider';
import { GameListView } from './GameListView';
import { GameIconView } from './GameIconView';

interface EmulatorViewProps {
  games: Game[];
  emulators: EmulatorConfig[];
  searchQuery: string;
  onSelectGame: (game: Game) => void;
  onLaunchGame: (game: Game, e?: React.MouseEvent) => void;
  onToggleFavorite: (gameId: string, e?: React.MouseEvent) => void;
  onEditGame: (game: Game, e?: React.MouseEvent) => void;
  onOpenArtworkPicker?: (game: Game, e?: React.MouseEvent) => void;
  onToggleHidden?: (gameId: string, e?: React.MouseEvent) => void;
  onLaunchEmulator: (emulatorId: string, e: React.MouseEvent) => void;
  onScanEmulators: () => void;
  onUpdateEmulator?: (updated: EmulatorConfig) => void;
  onDuplicateEmulator?: (emulator: EmulatorConfig) => void;
  onDeleteEmulator?: (emulatorId: string) => void;
  onOpenSettingsTab?: (tab: 'emulation') => void;
  isScanning?: boolean;
}

type SortOption = 'lastPlayed' | 'title' | 'playtime' | 'rating' | 'addedDate';

export const EmulatorView: React.FC<EmulatorViewProps> = React.memo(({
  games,
  emulators,
  searchQuery,
  onSelectGame,
  onLaunchGame,
  onToggleFavorite,
  onEditGame,
  onOpenArtworkPicker,
  onToggleHidden,
  onLaunchEmulator,
  onScanEmulators,
  onUpdateEmulator,
  onDuplicateEmulator,
  onDeleteEmulator,
  onOpenSettingsTab,
  isScanning = false,
}) => {
  const [selectedEmulatorId, setSelectedEmulatorId] = useState<string | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('lastPlayed');
  const [sliderValue, setSliderValue] = useState<number>(() => {
    const saved = localStorage.getItem('nexus_library_view_slider');
    return saved !== null ? Number(saved) : 60;
  });
  const [subSearch, setSubSearch] = useState('');
  const sliderSaveTimerRef = useRef<number | null>(null);

  const handleSliderChange = (newVal: number) => {
    setSliderValue(newVal);
    if (sliderSaveTimerRef.current !== null) {
      window.clearTimeout(sliderSaveTimerRef.current);
    }
    sliderSaveTimerRef.current = window.setTimeout(() => {
      localStorage.setItem('nexus_library_view_slider', String(newVal));
    }, 150);
  };

  const viewMode = getViewMode(sliderValue);
  const thumbnailWidth = getThumbnailWidth(sliderValue);

  // All emulated games
  const emulatorGames = useMemo(() => {
    return games.filter((g) => g.platform === 'emulator' && !g.hidden);
  }, [games]);

  // Filtered games based on active emulator filter & query
  const filteredGames = useMemo(() => {
    const q = (searchQuery || subSearch).toLowerCase().trim();
    const selectedEmu = selectedEmulatorId !== 'all' ? emulators.find((e) => e.id === selectedEmulatorId) : undefined;
    const systemEmuIds = selectedEmu?.systemKey
      ? new Set(emulators.filter((e) => e.systemKey === selectedEmu.systemKey).map((e) => e.id))
      : null;

    const matched = emulatorGames.filter((game) => {
      // Emulator ID / System filter
      if (selectedEmulatorId !== 'all') {
        const isDirectMatch = game.storeId === selectedEmulatorId;
        const isSystemMatch = Boolean(systemEmuIds && game.storeId && systemEmuIds.has(game.storeId));
        if (!isDirectMatch && !isSystemMatch) {
          return false;
        }
      }

      // Global search or local search
      if (q) {
        const matchTitle = game.title.toLowerCase().includes(q);
        const matchGenres = game.genres?.some((g) => g.toLowerCase().includes(q));
        const matchDev = game.developer?.toLowerCase().includes(q);
        const matchStore = game.storeId?.toLowerCase().includes(q);
        if (!matchTitle && !matchGenres && !matchDev && !matchStore) return false;
      }

      return true;
    });

    if (sortBy === 'lastPlayed') {
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
  }, [emulatorGames, selectedEmulatorId, emulators, searchQuery, subSearch, sortBy]);

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
  }, [searchQuery, subSearch, selectedEmulatorId, sortBy]);

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

  // Active emulator name for toolbar
  const activeEmuConfig = emulators.find((e) => e.id === selectedEmulatorId);

  return (
    <div ref={containerRef} className="space-y-6">
      {/* 1. TOP SECTION: Configured Emulators Shelf */}
      <EmulatorShelf
        emulators={emulators}
        selectedEmulatorId={selectedEmulatorId}
        onSelectEmulatorId={setSelectedEmulatorId}
        onLaunchEmulator={onLaunchEmulator}
        onScanEmulators={onScanEmulators}
        onUpdateEmulator={onUpdateEmulator}
        onDuplicateEmulator={onDuplicateEmulator}
        onDeleteEmulator={onDeleteEmulator}
        onOpenSettingsTab={onOpenSettingsTab}
        isScanning={isScanning}
      />

      {/* 3. BOTTOM SECTION: Emulated Games Library Toolbar */}
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Tv className="w-4 h-4 text-violet-400" />
              <span>
                {selectedEmulatorId === 'all'
                  ? 'All Emulated Titles'
                  : `${activeEmuConfig?.name || selectedEmulatorId} Games`}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-violet-300 font-mono">
                {filteredGames.length}
              </span>
              {totalPages > 1 && (
                <span className="text-[11px] font-normal text-slate-400">
                  • Page {currentPage} of {totalPages}
                </span>
              )}
            </div>

            {/* Quick Emulator Filter Dropdown */}
            <select
              value={selectedEmulatorId}
              onChange={(e) => setSelectedEmulatorId(e.target.value)}
              style={{ colorScheme: 'dark' }}
              className="bg-slate-900 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-1 text-xs outline-none hover:border-slate-700 transition cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-slate-200">
                All Systems ({emulatorGames.length})
              </option>
              {emulators
                .filter((e) => e.installed || e.gamesCount > 0)
                .map((e) => (
                  <option key={e.id} value={e.id} className="bg-slate-900 text-slate-200">
                    {e.name} - {e.consoleName} ({e.gamesCount})
                  </option>
                ))}
            </select>

            {/* Refresh ROMs Button */}
            <button
              onClick={onScanEmulators}
              disabled={isScanning}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-600/15 hover:bg-violet-600/25 text-violet-300 border border-violet-500/30 text-xs font-semibold shadow-sm transition disabled:opacity-50"
              title="Rescan configured folders for newly added ROMs or ISOs"
            >
              <RefreshCw className={`w-3 h-3 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Refreshing...' : 'Refresh ROMs'}</span>
            </button>
          </div>

          {/* Right Tools: Sort & Grid switch */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                style={{ colorScheme: 'dark' }}
                className="bg-slate-900 text-slate-200 text-xs outline-none cursor-pointer border-none"
              >
                <option value="lastPlayed" className="bg-slate-900 text-slate-200 py-1">
                  Recently Played
                </option>
                <option value="title" className="bg-slate-900 text-slate-200 py-1">
                  Alphabetical (A-Z)
                </option>
                <option value="playtime" className="bg-slate-900 text-slate-200 py-1">
                  Most Played
                </option>
                <option value="rating" className="bg-slate-900 text-slate-200 py-1">
                  Highest Rated
                </option>
                <option value="addedDate" className="bg-slate-900 text-slate-200 py-1">
                  Date Added
                </option>
              </select>
            </div>

            {/* View Mode & Thumbnail Slider */}
            <LibraryViewSlider
              value={sliderValue}
              onChange={handleSliderChange}
              accentColor="violet"
            />
          </div>
        </div>

        {/* Emulated Games Grid or Empty State */}
        {filteredGames.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-2xl bg-slate-950/40 border border-dashed border-slate-800">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center text-slate-500 mb-4 border border-slate-800">
              <Gamepad2 className="w-8 h-8 text-violet-400" />
            </div>
            <h3 className="text-base font-bold text-slate-200">
              {selectedEmulatorId === 'all'
                ? 'No emulated games detected yet'
                : `No ROMs found for ${activeEmuConfig?.name || 'this emulator'}`}
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md">
              The launcher automatically reads games directly from your emulators (PCSX2, Dolphin, PPSSPP, Ryujinx, etc.).
              Click below to scan your PC and import your game libraries.
            </p>
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={onScanEmulators}
                disabled={isScanning}
                className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-violet-600/25 transition disabled:opacity-50"
              >
                <FolderSync className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
                <span>{isScanning ? 'Scanning Libraries...' : 'Scan Emulators & ROMs'}</span>
              </button>
            </div>
          </div>
        ) : viewMode === 'list' ? (
          <GameListView
            games={paginatedGames}
            onSelectGame={onSelectGame}
            onLaunchGame={(game, e) => onLaunchGame(game, e)}
            onToggleFavorite={(gameId, e) => onToggleFavorite(gameId, e)}
            onEditGame={(game, e) => onEditGame(game, e)}
            onOpenArtworkPicker={onOpenArtworkPicker}
            accentColor="violet"
          />
        ) : viewMode === 'icons' ? (
          <GameIconView
            games={paginatedGames}
            onSelectGame={onSelectGame}
            onLaunchGame={(game, e) => onLaunchGame(game, e)}
            onToggleFavorite={(gameId, e) => onToggleFavorite(gameId, e)}
            onEditGame={(game, e) => onEditGame(game, e)}
            accentColor="violet"
          />
        ) : (
          <div
            className="grid gap-4 games-grid-container"
            style={{
              gridTemplateColumns: `repeat(auto-fill, minmax(${thumbnailWidth}px, 1fr))`,
            }}
          >
            {paginatedGames.map((game, index) => (
              <GameCard
                key={`${game.id}-${game.executablePath || index}`}
                game={game}
                onSelectGame={onSelectGame}
                onLaunchGame={onLaunchGame}
                onToggleFavorite={onToggleFavorite}
                onEditGame={onEditGame}
                onOpenArtworkPicker={onOpenArtworkPicker}
                onToggleHidden={onToggleHidden}
              />
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-5 pb-2 border-t border-slate-800/80">
            <div className="text-xs text-slate-400 font-medium">
              Showing <span className="text-slate-200 font-semibold">{startIndex + 1}</span>–<span className="text-slate-200 font-semibold">{endIndex}</span> of <span className="text-slate-200 font-semibold">{filteredGames.length}</span> titles
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
                          ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30 font-bold'
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
    </div>
  );
});
