import React from 'react';
import {
  Library,
  Star,
  Clock,
  Plus,
  Flame,
  Layers,
  FolderSync,
  Compass,
  HardDrive
} from 'lucide-react';
import { GamePlatform } from '../types/game';

interface SidebarProps {
  currentFilter: string;
  onSelectFilter: (filter: string) => void;
  selectedPlatform: GamePlatform | 'all';
  onSelectPlatform: (platform: GamePlatform | 'all') => void;
  totalGames: number;
  favoriteGamesCount: number;
  recentGamesCount: number;
  onOpenAddGame: () => void;
  onOpenScanner: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentFilter,
  onSelectFilter,
  selectedPlatform,
  onSelectPlatform,
  totalGames,
  favoriteGamesCount,
  recentGamesCount,
  onOpenAddGame,
  onOpenScanner,
}) => {
  const platforms: { id: GamePlatform | 'all'; name: string; icon: string; color: string }[] = [
    { id: 'all', name: 'All Stores', icon: '🌐', color: 'text-slate-300' },
    { id: 'steam', name: 'Steam', icon: '🎮', color: 'text-sky-400' },
    { id: 'epic', name: 'Epic Games', icon: '⚡', color: 'text-slate-100' },
    { id: 'gog', name: 'GOG Galaxy', icon: '🟣', color: 'text-purple-400' },
    { id: 'manual', name: 'PC Standalone', icon: '💾', color: 'text-emerald-400' },
  ];

  return (
    <aside className="w-64 bg-slate-950/70 backdrop-blur-xl border-r border-slate-800/80 flex flex-col justify-between select-none z-10 shrink-0">
      <div className="p-3 space-y-5 overflow-y-auto">
        {/* Quick Add Button */}
        <div>
          <button
            onClick={onOpenAddGame}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-blue-600/25 transition-all transform active:scale-[0.98] ring-1 ring-white/10"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Game Manually</span>
          </button>
        </div>

        {/* Library Navigation */}
        <div className="space-y-1">
          <div className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Library
          </div>

          <button
            onClick={() => onSelectFilter('all')}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition ${
              currentFilter === 'all'
                ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                : 'text-slate-300 hover:bg-slate-900/80 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Library className="w-4 h-4" />
              <span>All Games</span>
            </div>
            <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400">
              {totalGames}
            </span>
          </button>

          <button
            onClick={() => onSelectFilter('favorites')}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition ${
              currentFilter === 'favorites'
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                : 'text-slate-300 hover:bg-slate-900/80 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400/20" />
              <span>Favorites</span>
            </div>
            <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400">
              {favoriteGamesCount}
            </span>
          </button>

          <button
            onClick={() => onSelectFilter('recent')}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition ${
              currentFilter === 'recent'
                ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                : 'text-slate-300 hover:bg-slate-900/80 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4" />
              <span>Recently Played</span>
            </div>
            <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400">
              {recentGamesCount}
            </span>
          </button>
        </div>

        {/* Store Platforms Filter */}
        <div className="space-y-1">
          <div className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>Stores & Sources</span>
            <Layers className="w-3 h-3 text-slate-500" />
          </div>

          {platforms.map((p) => {
            const isSelected = selectedPlatform === p.id;
            return (
              <button
                key={p.id}
                onClick={() => onSelectPlatform(p.id)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                  isSelected
                    ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                    : 'text-slate-400 hover:bg-slate-900/80 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-sm">{p.icon}</span>
                  <span className={isSelected ? 'text-white' : p.color}>{p.name}</span>
                </div>
                {isSelected && (
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>

        {/* Quick Discovery / PC Scan Promo Card */}
        <div className="p-3 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800/80 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold">
            <HardDrive className="w-3.5 h-3.5" />
            <span>Smart PC Scanner</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Auto-detect games across Steam, Epic, GOG Galaxy & installed drives in seconds.
          </p>
          <button
            onClick={onOpenScanner}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium rounded-lg border border-slate-700 transition"
          >
            <FolderSync className="w-3 h-3 text-blue-400" />
            <span>Scan Computer Now</span>
          </button>
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Launcher Ready</span>
        </div>
        <span className="text-slate-600 font-mono">v1.0.0</span>
      </div>
    </aside>
  );
};
