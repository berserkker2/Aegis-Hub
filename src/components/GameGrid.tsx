import React, { useState, useMemo } from 'react';
import {
  ArrowUpDown,
  Filter,
  Grid3X3,
  LayoutGrid,
  Gamepad2,
  FolderSync,
  Plus,
  SlidersHorizontal,
  Cloud
} from 'lucide-react';
import { Game, GamePlatform } from '../types/game';
import { GameCard } from './GameCard';

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
  onOpenAddGame: () => void;
  onOpenScanner: () => void;
}

type SortOption = 'lastPlayed' | 'title' | 'playtime' | 'rating' | 'addedDate';

export const GameGrid: React.FC<GameGridProps> = ({
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
  onOpenAddGame,
  onOpenScanner,
}) => {
  const [sortBy, setSortBy] = useState<SortOption>('lastPlayed');
  const [gridSize, setGridSize] = useState<'medium' | 'large'>('medium');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');

  const allGenres = useMemo(() => {
    const set = new Set<string>();
    games.forEach((g) => g.genres?.forEach((genre) => set.add(genre)));
    return Array.from(set);
  }, [games]);

  const filteredGames = useMemo(() => {
    return games
      .filter((game) => {
        // Query search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = game.title.toLowerCase().includes(q);
          const matchGenres = game.genres?.some((g) => g.toLowerCase().includes(q));
          const matchPlatform = game.platform.toLowerCase().includes(q);
          const matchDev = game.developer?.toLowerCase().includes(q);
          if (!matchTitle && !matchGenres && !matchPlatform && !matchDev) return false;
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

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'lastPlayed') {
          const timeA = a.lastPlayed ? new Date(a.lastPlayed).getTime() : 0;
          const timeB = b.lastPlayed ? new Date(b.lastPlayed).getTime() : 0;
          return timeB - timeA;
        }
        if (sortBy === 'title') {
          return a.title.localeCompare(b.title);
        }
        if (sortBy === 'playtime') {
          return (b.playtimeMinutes || 0) - (a.playtimeMinutes || 0);
        }
        if (sortBy === 'rating') {
          return (b.rating || 0) - (a.rating || 0);
        }
        if (sortBy === 'addedDate') {
          return new Date(b.addedDate).getTime() - new Date(a.addedDate).getTime();
        }
        return 0;
      });
  }, [games, searchQuery, selectedFilter, selectedPlatform, selectedGenre, sortBy]);

  return (
    <div className="space-y-4">
      {/* Grid Filter and Sorting Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-1 text-xs">
        <div className="flex items-center gap-2">
          <div className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <span>Library Games</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
              {filteredGames.length}
            </span>
          </div>

          {/* Genre selector pill */}
          {allGenres.length > 0 && (
            <select
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-1 text-xs outline-none hover:border-slate-700 transition"
            >
              <option value="all">All Genres</option>
              {allGenres.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Right tools: Sort dropdown & Grid size switch */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-transparent text-slate-200 text-xs outline-none cursor-pointer"
            >
              <option value="lastPlayed">Recently Played</option>
              <option value="title">Alphabetical (A-Z)</option>
              <option value="playtime">Most Played</option>
              <option value="rating">Highest Rated</option>
              <option value="addedDate">Date Added</option>
            </select>
          </div>

          {/* Grid Size switcher */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setGridSize('medium')}
              className={`p-1 rounded ${
                gridSize === 'medium' ? 'bg-slate-800 text-blue-400' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Standard Grid"
            >
              <Grid3X3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setGridSize('large')}
              className={`p-1 rounded ${
                gridSize === 'large' ? 'bg-slate-800 text-blue-400' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Large Posters"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid or Empty State */}
      {filteredGames.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-2xl bg-slate-950/40 border border-dashed border-slate-800">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center text-slate-500 mb-4 border border-slate-800">
            <Gamepad2 className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-200">No games found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            {selectedFilter === 'cloud'
              ? 'Connect your Steam, Epic or GOG accounts to view owned games in the cloud.'
              : 'Try adjusting your search or filters, or add games automatically by scanning your PC.'}
          </p>
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
        </div>
      ) : (
        <div
          className={`grid gap-4 ${
            gridSize === 'medium'
              ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
              : 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
          }`}
        >
          {filteredGames.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              onSelectGame={onSelectGame}
              onLaunchGame={onLaunchGame}
              onInstallGame={onInstallGame}
              onToggleFavorite={onToggleFavorite}
              onEditGame={onEditGame}
              onOpenArtworkPicker={onOpenArtworkPicker}
            />
          ))}
        </div>
      )}
    </div>
  );
};
