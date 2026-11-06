import React from 'react';
import { Play, Star, MoreVertical, Download, Cloud, EyeOff } from 'lucide-react';
import { Game } from '../types/game';
import { GameImage } from './GameImage';
import { PlatformBadge } from './PlatformBadge';

interface GameIconViewProps {
  games: Game[];
  onSelectGame: (game: Game) => void;
  onLaunchGame: (game: Game, e: React.MouseEvent) => void;
  onInstallGame?: (game: Game, e: React.MouseEvent) => void;
  onToggleFavorite: (gameId: string, e: React.MouseEvent) => void;
  onEditGame: (game: Game, e: React.MouseEvent) => void;
  accentColor?: 'blue' | 'violet';
  showPlatformBadges?: boolean;
}

export const GameIconView: React.FC<GameIconViewProps> = React.memo(({
  games,
  onSelectGame,
  onLaunchGame,
  onInstallGame,
  onToggleFavorite,
  onEditGame,
  accentColor = 'blue',
  showPlatformBadges = true,
}) => {
  const isViolet = accentColor === 'violet';
  const activeHoverText = isViolet ? 'group-hover:text-violet-400' : 'group-hover:text-blue-400';
  const playBg = isViolet ? 'bg-violet-600 hover:bg-violet-500' : 'bg-blue-600 hover:bg-blue-500';

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-3 sm:gap-4 select-none games-grid-container">
      {games.map((game, index) => {
        const isInstalled = game.installed !== false;

        return (
          <div
            key={`${game.id}-${game.executablePath || index}`}
            onClick={() => onSelectGame(game)}
            className="group flex flex-col items-center p-2 rounded-xl hover:bg-slate-800/60 transition-colors duration-150 cursor-pointer relative [content-visibility:auto] [contain-intrinsic-size:auto_130px]"
          >
            {/* Square Icon Container */}
            <div className="relative w-20 h-20 sm:w-22 sm:h-22 rounded-2xl overflow-hidden bg-slate-900 border border-slate-800/90 group-hover:border-slate-700 shadow-md transition-colors duration-200 transform-gpu">
              <GameImage
                src={game.coverUrl}
                alt={game.title}
                title={game.title}
                platform={game.platform}
                type="cover"
                className="w-full h-full object-cover transition-transform duration-200 ease-out transform-gpu group-hover:scale-105"
              />

              {/* Dark overlay on hover */}
              <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none" />

              {/* Top-left: Small Platform indicator icon */}
              {showPlatformBadges && (
                <div className="absolute top-1 left-1 z-10">
                  <PlatformBadge platform={game.platform} size="xs" />
                </div>
              )}

              {/* Top-right: Favorite star or cloud icon */}
              <div className="absolute top-1 right-1 z-10 flex items-center gap-0.5">
                {game.favorite && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(game.id, e);
                    }}
                    title="Favorited"
                    className="p-0.5 rounded-full bg-slate-950/85 text-amber-400"
                  >
                    <Star className="w-2.5 h-2.5 fill-amber-400" />
                  </button>
                )}
                {!isInstalled && (
                  <span
                    title="In cloud (not installed)"
                    className="p-0.5 rounded-full bg-slate-950/85 text-blue-400"
                  >
                    <Cloud className="w-2.5 h-2.5" />
                  </span>
                )}
                {game.hidden && (
                  <span
                    title="Hidden"
                    className="p-0.5 rounded-full bg-amber-950/90 text-amber-400"
                  >
                    <EyeOff className="w-2.5 h-2.5" />
                  </span>
                )}
              </div>

              {/* Running indicator */}
              {game.isRunning && (
                <div className="absolute bottom-1 left-1 z-10 flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-emerald-950/90 border border-emerald-500/40 text-[8px] text-emerald-400 font-bold">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>RUN</span>
                </div>
              )}

              {/* Center Play Button Overlay on hover */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10">
                {isInstalled ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onLaunchGame(game, e);
                    }}
                    className={`w-8 h-8 rounded-full ${playBg} text-white flex items-center justify-center shadow-lg transform transition-transform hover:scale-110 active:scale-95`}
                    title={`Play ${game.title}`}
                  >
                    <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onInstallGame) onInstallGame(game, e);
                      else onLaunchGame(game, e);
                    }}
                    className="w-8 h-8 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-lg transform transition-transform hover:scale-110 active:scale-95"
                    title={`Install ${game.title}`}
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Title Underneath (Windows Icon Style) */}
            <div className="w-full text-center mt-1.5 px-0.5">
              <span
                className={`text-[11px] font-medium text-slate-200 ${activeHoverText} line-clamp-2 leading-snug transition-colors break-words`}
                title={game.title}
              >
                {game.title}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
});
