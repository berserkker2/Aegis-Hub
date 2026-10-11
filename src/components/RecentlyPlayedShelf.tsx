import React from 'react';
import { Play, Clock, Star, Flame, ChevronRight } from 'lucide-react';
import { Game } from '../types/game';
import { formatPlaytime, formatRelativeDate, getPlatformBadge } from '../utils/formatters';

interface RecentlyPlayedShelfProps {
  games: Game[];
  onSelectGame: (game: Game) => void;
  onLaunchGame: (game: Game, e: React.MouseEvent) => void;
  onToggleFavorite: (gameId: string, e: React.MouseEvent) => void;
}

export const RecentlyPlayedShelf: React.FC<RecentlyPlayedShelfProps> = ({
  games,
  onSelectGame,
  onLaunchGame,
  onToggleFavorite,
}) => {
  // Sort by lastPlayed descending, pick up to 5
  const recentGames = [...games]
    .filter(g => g.lastPlayed)
    .sort((a, b) => new Date(b.lastPlayed!).getTime() - new Date(a.lastPlayed!).getTime())
    .slice(0, 5);

  if (recentGames.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <span>Recently Played</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-blue-400 font-mono">
              {recentGames.length}
            </span>
          </h2>
        </div>
        <div className="text-xs text-slate-400 flex items-center gap-1 font-medium">
          <span>Jump back in</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
        {recentGames.map((game) => {
          const badge = getPlatformBadge(game.platform);
          return (
            <div
              key={game.id}
              onClick={() => onSelectGame(game)}
              className="group relative h-48 rounded-xl overflow-hidden bg-slate-900 border border-slate-800/80 hover:border-blue-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 cursor-pointer flex flex-col justify-between p-3.5"
            >
              {/* Background Banner with zoom effect */}
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-500 ease-out group-hover:scale-105"
                style={{
                  backgroundImage: `url("${game.bannerUrl || game.coverUrl}")`,
                }}
              />

              {/* Multi-step gradient overlay for readability and gaming vibe */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-900/40" />
              <div className="absolute inset-0 bg-blue-950/10 group-hover:bg-blue-600/10 transition-colors duration-300" />

              {/* Top Row: Platform Badge & Favorite Button */}
              <div className="relative z-10 flex items-center justify-between">
                <span className={`text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full border backdrop-blur-md ${badge.bg} ${badge.color}`}>
                  {badge.name}
                </span>

                <button
                  onClick={(e) => onToggleFavorite(game.id, e)}
                  title={game.favorite ? 'Remove from favorites' : 'Add to favorites'}
                  className="w-7 h-7 rounded-full bg-slate-950/60 hover:bg-slate-900 backdrop-blur-md border border-slate-700/60 flex items-center justify-center text-slate-300 hover:text-amber-400 transition"
                >
                  <Star
                    className={`w-3.5 h-3.5 ${
                      game.favorite
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-slate-400 hover:text-amber-300'
                    }`}
                  />
                </button>
              </div>

              {/* Bottom Info: Title, Playtime & Play Button */}
              <div className="relative z-10 flex items-end justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors line-clamp-1 drop-shadow-md">
                    {game.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1 text-slate-300">
                      <Clock className="w-3 h-3 text-blue-400" />
                      {formatRelativeDate(game.lastPlayed)}
                    </span>
                    <span>•</span>
                    <span className="font-mono text-slate-400">
                      {formatPlaytime(game.playtimeMinutes)}
                    </span>
                  </div>
                </div>

                {/* Instant Play Button */}
                <button
                  onClick={(e) => onLaunchGame(game, e)}
                  title={`Launch ${game.title}`}
                  className="w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-600/40 transform transition-transform group-hover:scale-110 active:scale-95 shrink-0"
                >
                  <Play className="w-4 h-4 fill-white ml-0.5" />
                </button>
              </div>

              {/* Running indicator banner if active */}
              {game.isRunning && (
                <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-semibold backdrop-blur-md">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>RUNNING</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
