import React from 'react';
import { Play, Star, MoreVertical, Clock, Download, Cloud, Image as ImageIcon, EyeOff } from 'lucide-react';
import { Game } from '../types/game';
import { formatPlaytime, getPlatformBadge } from '../utils/formatters';
import { GameImage } from './GameImage';
import { PlatformBadge } from './PlatformBadge';

interface GameListViewProps {
  games: Game[];
  onSelectGame: (game: Game) => void;
  onLaunchGame: (game: Game, e: React.MouseEvent) => void;
  onInstallGame?: (game: Game, e: React.MouseEvent) => void;
  onToggleFavorite: (gameId: string, e: React.MouseEvent) => void;
  onEditGame: (game: Game, e: React.MouseEvent) => void;
  onOpenArtworkPicker?: (game: Game, e: React.MouseEvent) => void;
  accentColor?: 'blue' | 'violet';
  showPlatformBadges?: boolean;
}

export const GameListView: React.FC<GameListViewProps> = React.memo(({
  games,
  onSelectGame,
  onLaunchGame,
  onInstallGame,
  onToggleFavorite,
  onEditGame,
  onOpenArtworkPicker,
  accentColor = 'blue',
  showPlatformBadges = true,
}) => {
  const isViolet = accentColor === 'violet';
  const activeHoverText = isViolet ? 'group-hover:text-violet-400' : 'group-hover:text-blue-400';
  const playBg = isViolet ? 'bg-violet-600 hover:bg-violet-500' : 'bg-blue-600 hover:bg-blue-500';

  return (
    <div className="w-full bg-slate-950/60 rounded-xl border border-slate-800/80 overflow-hidden shadow-xl">
      {/* Table Header */}
      <div className="grid grid-cols-12 gap-3 px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider select-none">
        <div className="col-span-6 sm:col-span-5 md:col-span-4 flex items-center">
          <span>Game Title</span>
        </div>
        <div className="col-span-3 sm:col-span-2 md:col-span-2 flex items-center">
          <span>Store / Platform</span>
        </div>
        <div className="hidden md:flex md:col-span-3 items-center">
          <span>Category / Genres</span>
        </div>
        <div className="hidden sm:flex sm:col-span-3 md:col-span-2 items-center">
          <span>Time Played</span>
        </div>
        <div className="col-span-3 sm:col-span-2 md:col-span-1 flex items-center justify-end">
          <span>Actions</span>
        </div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-slate-800/60">
        {games.map((game, index) => {
          const badge = getPlatformBadge(game.platform);
          const isInstalled = game.installed !== false;

          return (
            <div
              key={`${game.id}-${game.executablePath || index}`}
              onClick={() => onSelectGame(game)}
              className="group grid grid-cols-12 gap-3 px-4 py-2.5 items-center hover:bg-slate-800/50 transition-colors duration-150 cursor-pointer select-none [content-visibility:auto] [contain-intrinsic-size:auto_60px]"
            >
              {/* Title & Icon */}
              <div className="col-span-6 sm:col-span-5 md:col-span-4 flex items-center gap-3 min-w-0">
                <div className="relative w-10 h-12 rounded-md overflow-hidden bg-slate-900 border border-slate-850 shrink-0 shadow">
                  <GameImage
                    src={game.coverUrl}
                    alt={game.title}
                    title={game.title}
                    platform={game.platform}
                    type="cover"
                    className="w-full h-full object-cover"
                  />
                  {game.isRunning && (
                    <div className="absolute top-1 left-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  )}
                </div>

                <div className="min-w-0 flex flex-col justify-center">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs sm:text-sm font-semibold text-slate-200 ${activeHoverText} transition-colors truncate`}>
                      {game.title}
                    </span>
                    {game.favorite && (
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 mt-0.5">
                    {game.isRunning && (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Running
                      </span>
                    )}
                    {!isInstalled && (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-0.5">
                        <Cloud className="w-2.5 h-2.5 text-blue-400" />
                        <span>Cloud</span>
                      </span>
                    )}
                    {game.hidden && (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-0.5">
                        <EyeOff className="w-2.5 h-2.5 text-amber-400" />
                        <span>Hidden</span>
                      </span>
                    )}
                    {game.rating && (
                      <span className="text-[10px] text-amber-400 font-medium">
                        ★ {game.rating}%
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Store / Platform */}
              <div className="col-span-3 sm:col-span-2 md:col-span-2 flex items-center gap-2 min-w-0">
                {showPlatformBadges && <PlatformBadge platform={game.platform} size="sm" />}
                <span className="text-xs text-slate-300 font-medium hidden sm:inline truncate">
                  {badge.name}
                </span>
              </div>

              {/* Category / Genres */}
              <div className="hidden md:flex md:col-span-3 items-center gap-1.5 overflow-hidden">
                {game.genres && game.genres.length > 0 ? (
                  game.genres.slice(0, 3).map((g) => (
                    <span
                      key={g}
                      className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-slate-850 text-slate-400 border border-slate-800 truncate"
                    >
                      {g}
                    </span>
                  ))
                ) : (
                  <span className="text-[11px] text-slate-600 italic">No genres</span>
                )}
              </div>

              {/* Time Played */}
              <div className="hidden sm:flex sm:col-span-3 md:col-span-2 items-center text-xs text-slate-300">
                {isInstalled ? (
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>{formatPlaytime(game.playtimeMinutes)}</span>
                  </span>
                ) : (
                  <span className="text-slate-500 text-[11px]">Ready to install</span>
                )}
              </div>

              {/* Actions */}
              <div className="col-span-3 sm:col-span-2 md:col-span-1 flex items-center justify-end gap-1">
                {/* Favorite toggle */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(game.id, e);
                  }}
                  title={game.favorite ? 'Favorited' : 'Add to Favorites'}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-slate-800 transition"
                >
                  <Star
                    className={`w-3.5 h-3.5 ${
                      game.favorite ? 'text-amber-400 fill-amber-400' : ''
                    }`}
                  />
                </button>

                {/* Play / Install Button */}
                {isInstalled ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onLaunchGame(game, e);
                    }}
                    className={`p-1.5 rounded-lg ${playBg} text-white shadow-md transition transform hover:scale-105 active:scale-95`}
                    title={`Play ${game.title}`}
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onInstallGame) onInstallGame(game, e);
                      else onLaunchGame(game, e);
                    }}
                    className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition transform hover:scale-105 active:scale-95"
                    title={`Install ${game.title}`}
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Edit / More button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditGame(game, e);
                  }}
                  title="Game options"
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition opacity-0 group-hover:opacity-100"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
