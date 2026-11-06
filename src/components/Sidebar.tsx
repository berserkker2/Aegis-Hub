import React from 'react';
import {
  Star,
  Layers,
  HardDrive,
  Cloud,
  Clock,
  Plus,
  EyeOff,
  Gamepad2,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { GamePlatform, StoreAccount } from '../types/game';
import { getPlatformBadge } from '../utils/formatters';
import aegisLogo from '../assets/logos/aegis_logo_w.webp';

interface SidebarProps {
  currentFilter: string;
  onSelectFilter: (filter: string) => void;
  selectedPlatform: GamePlatform | 'all';
  onSelectPlatform: (platform: GamePlatform | 'all') => void;
  totalGames: number;
  installedCount: number;
  cloudCount: number;
  favoriteGamesCount: number;
  recentGamesCount: number;
  hiddenGamesCount: number;
  emulatorGamesCount: number;
  showHiddenCollection?: boolean;
  onOpenAddGame: () => void;
  storeAccounts?: StoreAccount[];
  onOpenStoreIntegrations?: () => void;
}

const PLATFORMS: { id: GamePlatform | 'all'; name: string }[] = [
  { id: 'all', name: 'All Sources' },
  { id: 'steam', name: 'Steam' },
  { id: 'epic', name: 'Epic Games' },
  { id: 'gog', name: 'GOG Galaxy' },
  { id: 'ea', name: 'EA App' },
  { id: 'ubisoft', name: 'Ubisoft Connect' },
  { id: 'xbox', name: 'Xbox' },
  { id: 'manual', name: 'Local' },
];

export const Sidebar: React.FC<SidebarProps> = React.memo(({
  currentFilter,
  onSelectFilter,
  selectedPlatform,
  onSelectPlatform,
  totalGames,
  installedCount,
  cloudCount,
  favoriteGamesCount,
  recentGamesCount,
  hiddenGamesCount,
  emulatorGamesCount,
  showHiddenCollection = false,
  onOpenAddGame,
  storeAccounts = [],
  onOpenStoreIntegrations,
}) => {
  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800/80 flex flex-col h-full select-none shrink-0 z-20">
      {/* Top Action: Add Game */}
      <div className="p-3 border-b border-slate-800/80">
        <button
          onClick={onOpenAddGame}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-600/20 transition group"
        >
          <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
          <span>Add Game Manually</span>
        </button>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {/* Hub / Pulse Section */}
        <div>
          <button
            onClick={() => onSelectFilter('pulse')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition ${
              currentFilter === 'pulse'
                ? 'bg-gradient-to-r from-blue-600/30 via-indigo-600/20 to-blue-900/10 text-white border border-blue-500/40 shadow-sm'
                : 'text-slate-300 hover:bg-slate-900/80 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-4 h-4 flex items-center justify-center shrink-0">
                <img src={aegisLogo} alt="Aegis Pulse" className="w-4 h-4 object-contain brightness-110" />
              </div>
              <span className="tracking-wide">Aegis Pulse</span>
            </div>
            <span className="text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Live
            </span>
          </button>
        </div>

        {/* Collections & Filters */}
        <div className="space-y-1">
          <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
            Collections
          </div>

          {/* 1. Favorites at the very top */}
          <button
            onClick={() => onSelectFilter('favorites')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
              currentFilter === 'favorites'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-300 hover:bg-slate-900/80 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Star className="w-4 h-4" />
              <span>Favorites</span>
            </div>
            <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded-full text-slate-400 border border-slate-800">
              {favoriteGamesCount}
            </span>
          </button>

          {/* 2. All Games */}
          <button
            onClick={() => onSelectFilter('all')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
              currentFilter === 'all'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-300 hover:bg-slate-900/80 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Layers className="w-4 h-4" />
              <span>All Games</span>
            </div>
            <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded-full text-slate-400 border border-slate-800">
              {totalGames}
            </span>
          </button>

          {/* 3. Installed */}
          <button
            onClick={() => onSelectFilter('installed')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
              currentFilter === 'installed'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-300 hover:bg-slate-900/80 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <HardDrive className="w-4 h-4" />
              <span>Installed</span>
            </div>
            <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded-full text-slate-400 border border-slate-800">
              {installedCount}
            </span>
          </button>

          {/* 4. Cloud / Owned */}
          <button
            onClick={() => onSelectFilter('cloud')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
              currentFilter === 'cloud'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-300 hover:bg-slate-900/80 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Cloud className="w-4 h-4" />
              <span>Cloud / Owned</span>
            </div>
            <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded-full text-slate-400 border border-slate-800">
              {cloudCount}
            </span>
          </button>

          {/* 5. Emulators */}
          <button
            onClick={() => onSelectFilter('emulators')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
              currentFilter === 'emulators'
                ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                : 'text-slate-300 hover:bg-slate-900/80 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Gamepad2 className="w-4 h-4 text-violet-400" />
              <span>Emulators</span>
            </div>
            <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded-full text-violet-300 border border-slate-800">
              {emulatorGamesCount}
            </span>
          </button>

          {/* 6. Recently Played */}
          <button
            onClick={() => onSelectFilter('recent')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
              currentFilter === 'recent'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-300 hover:bg-slate-900/80 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4" />
              <span>Recently Played</span>
            </div>
            <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded-full text-slate-400 border border-slate-800">
              {recentGamesCount}
            </span>
          </button>

          {/* 7. Discovery (New Releases & Recommendations) */}
          <button
            onClick={() => onSelectFilter('recommended')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
              currentFilter === 'recommended'
                ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-300 hover:bg-slate-900/80 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Discovery</span>
            </div>
            <span className="text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              NEW
            </span>
          </button>

          {/* 7. Hidden Games (only visible if enabled in Settings) */}
          {showHiddenCollection && (
            <button
              onClick={() => onSelectFilter('hidden')}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                currentFilter === 'hidden'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:bg-slate-900/80 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <EyeOff className="w-4 h-4" />
                <span>Hidden Games</span>
              </div>
              <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded-full text-slate-400 border border-slate-800">
                {hiddenGamesCount}
              </span>
            </button>
          )}
        </div>

        {/* Sources & Stores Filter */}
        <div className="space-y-1">
          <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
            Sources & Stores
          </div>

          {PLATFORMS.map((p) => {
            const isSelected = selectedPlatform === p.id;
            const badge = p.id !== 'all' ? getPlatformBadge(p.id) : null;
            const account = storeAccounts.find((a) => a.platform === p.id);
            const isReauthNeeded = !!account?.needsReauth;

            return (
              <button
                key={p.id}
                onClick={() => onSelectPlatform(p.id)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                  isSelected
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : isReauthNeeded
                    ? 'bg-amber-950/20 text-amber-200 border border-amber-600/30 hover:bg-amber-950/40'
                    : 'text-slate-300 hover:bg-slate-900/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {badge ? (
                    <img
                      src={badge.logo}
                      alt={p.name}
                      className="w-4 h-4 object-contain shrink-0"
                      style={{ filter: 'drop-shadow(0 0 2px rgba(255, 255, 255, 0.85))' }}
                    />
                  ) : (
                    <Layers className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="truncate">{p.name}</span>
                    {isReauthNeeded && (
                      <span className="text-[10px] text-amber-400 font-bold whitespace-nowrap">
                        (Re-authentication Required)
                      </span>
                    )}
                  </div>
                </div>

                {isReauthNeeded ? (
                  <span
                    onClick={(e) => {
                      if (onOpenStoreIntegrations) {
                        e.stopPropagation();
                        onOpenStoreIntegrations();
                      }
                    }}
                    title="Session token expired. Click to re-authenticate."
                    className="flex items-center gap-1 text-[9px] font-bold text-amber-300 bg-amber-500/20 border border-amber-500/40 px-1.5 py-0.5 rounded-full hover:bg-amber-500/40 transition shrink-0 ml-1.5 cursor-pointer"
                  >
                    <AlertTriangle className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                    <span>Relog</span>
                  </span>
                ) : isSelected ? (
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse shrink-0" />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
});
