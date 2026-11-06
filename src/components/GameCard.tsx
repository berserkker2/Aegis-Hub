import React from 'react';
import { Play, Star, MoreVertical, Clock, Download, Cloud, Image as ImageIcon, Eye, EyeOff } from 'lucide-react';
import { Game } from '../types/game';
import { formatPlaytime } from '../utils/formatters';
import { GameImage } from './GameImage';
import { PlatformBadge } from './PlatformBadge';

interface GameCardProps {
  game: Game;
  onSelectGame: (game: Game) => void;
  onLaunchGame: (game: Game, e: React.MouseEvent) => void;
  onInstallGame?: (game: Game, e: React.MouseEvent) => void;
  onToggleFavorite: (gameId: string, e: React.MouseEvent) => void;
  onEditGame: (game: Game, e: React.MouseEvent) => void;
  onOpenArtworkPicker?: (game: Game, e: React.MouseEvent) => void;
  onToggleHidden?: (gameId: string, e: React.MouseEvent) => void;
  showPlatformBadge?: boolean;
}

export const GameCard: React.FC<GameCardProps> = React.memo(({
  game,
  onSelectGame,
  onLaunchGame,
  onInstallGame,
  onToggleFavorite,
  onEditGame,
  onOpenArtworkPicker,
  showPlatformBadge = true,
}) => {
  const isInstalled = game.installed !== false;

  return (
    <div
      onClick={() => onSelectGame(game)}
      className="group relative flex flex-col rounded-xl overflow-hidden bg-slate-900 border border-slate-800/80 hover:border-blue-500/60 transition-[transform,border-color] duration-200 ease-out transform-gpu will-change-transform hover:-translate-y-0.5 cursor-pointer [content-visibility:auto] [contain-intrinsic-size:auto_310px]"
    >
      {/* Box art container - 2:3 vertical aspect ratio */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-950">
        <GameImage
          src={game.coverUrl}
          alt={game.title}
          title={game.title}
          platform={game.platform}
          type="cover"
          className="w-full h-full object-cover transition-transform duration-300 ease-out will-change-transform group-hover:scale-[1.04]"
        />

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-80 group-hover:opacity-50 transition-opacity duration-200 pointer-events-none" />

        {/* Top Badges and Action icons */}
        <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between z-10">
          <div className="flex items-center gap-1.5">
            {showPlatformBadge && <PlatformBadge platform={game.platform} size="sm" />}
            {!isInstalled && (
              <span
                title="Owned in cloud account (not installed locally)"
                className="w-6 h-6 rounded-lg bg-slate-950/90 text-blue-400 border border-slate-700/70 flex items-center justify-center shadow-sm"
              >
                <Cloud className="w-3.5 h-3.5" />
              </span>
            )}
            {game.hidden && (
              <span
                title="Hidden from active library"
                className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-slate-950/90 text-amber-300 border border-amber-500/40 flex items-center gap-1"
              >
                <EyeOff className="w-2.5 h-2.5 text-amber-400" />
                <span>Hidden</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={(e) => onToggleFavorite(game.id, e)}
              title={game.favorite ? 'Favorited' : 'Add to Favorites'}
              className="w-7 h-7 rounded-full bg-slate-950/85 hover:bg-slate-900 border border-slate-700/70 flex items-center justify-center text-slate-300 hover:text-amber-400 transition-colors"
            >
              <Star
                className={`w-3.5 h-3.5 ${
                  game.favorite ? 'text-amber-400 fill-amber-400' : 'text-slate-400'
                }`}
              />
            </button>
            {onOpenArtworkPicker && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenArtworkPicker(game, e);
                }}
                title="Change or search artwork"
                className="w-7 h-7 rounded-full bg-slate-950/85 hover:bg-slate-900 border border-slate-700/70 flex items-center justify-center text-slate-400 hover:text-blue-400 transition-opacity duration-150 opacity-0 group-hover:opacity-100"
              >
                <ImageIcon className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={(e) => onEditGame(game, e)}
              title="Edit game info"
              className="w-7 h-7 rounded-full bg-slate-950/85 hover:bg-slate-900 border border-slate-700/70 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-opacity duration-150 opacity-0 group-hover:opacity-100"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Running status badge */}
        {game.isRunning && (
          <div className="absolute top-10 left-2.5 z-10 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-950/90 border border-emerald-500/50 text-emerald-400 text-[10px] font-semibold">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>RUNNING</span>
          </div>
        )}

        {/* Center Hover Action Button (Play if installed, Install if not installed) */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10 pointer-events-none">
          {isInstalled ? (
            <button
              onClick={(e) => onLaunchGame(game, e)}
              className="pointer-events-auto w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-lg transform-gpu transition-transform duration-150 hover:scale-110 active:scale-95"
              title={`Play ${game.title}`}
            >
              <Play className="w-5 h-5 fill-white ml-0.5" />
            </button>
          ) : (
            <button
              onClick={(e) => (onInstallGame ? onInstallGame(game, e) : onLaunchGame(game, e))}
              className="pointer-events-auto px-3.5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-lg transform-gpu transition-transform duration-150 hover:scale-105 active:scale-95"
              title={`Install ${game.title}`}
            >
              <Download className="w-4 h-4" />
              <span>Install</span>
            </button>
          )}
        </div>
      </div>

      {/* Card Footer Info */}
      <div className="p-3 bg-slate-900 border-t border-slate-800/80 flex flex-col justify-between flex-1">
        <div>
          <h3 className="text-xs font-bold text-slate-100 group-hover:text-blue-400 transition-colors duration-150 line-clamp-1">
            {game.title}
          </h3>
          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
            {isInstalled ? (
              <span className="flex items-center gap-1 text-slate-400">
                <Clock className="w-3 h-3 text-slate-500" />
                {formatPlaytime(game.playtimeMinutes)}
              </span>
            ) : (
              <span className="text-slate-500 text-[10px] font-medium">Ready to install</span>
            )}

            {game.rating && (
              <>
                <span>•</span>
                <span className="text-amber-400 font-semibold">{game.rating}%</span>
              </>
            )}
          </div>
        </div>

        {/* Genres tag line */}
        {game.genres && game.genres.length > 0 && (
          <div className="flex items-center gap-1 mt-2 overflow-hidden text-[10px] text-slate-500">
            {game.genres.slice(0, 2).map((g) => (
              <span key={g} className="px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 truncate">
                {g}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
