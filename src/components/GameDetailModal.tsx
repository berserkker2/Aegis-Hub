import React, { useEffect } from 'react';
import {
  X,
  Play,
  Download,
  Star,
  Clock,
  Calendar,
  Building2,
  Folder,
  Cloud,
  Edit3,
  Trash2,
  CheckCircle2,
  Award,
  Sparkles
} from 'lucide-react';
import { Game } from '../types/game';
import { formatPlaytime, formatRelativeDate, getPlatformBadge } from '../utils/formatters';
import { GameImage } from './GameImage';

interface GameDetailModalProps {
  game: Game | null;
  onClose: () => void;
  onLaunchGame: (game: Game) => void;
  onInstallGame?: (game: Game) => void;
  onToggleFavorite: (gameId: string) => void;
  onEditGame: (game: Game) => void;
  onDeleteGame: (gameId: string) => void;
  onToggleInstalled?: (gameId: string) => void;
  onOpenArtworkPicker?: (game: Game) => void;
}

export const GameDetailModal: React.FC<GameDetailModalProps> = ({
  game,
  onClose,
  onLaunchGame,
  onInstallGame,
  onToggleFavorite,
  onEditGame,
  onDeleteGame,
  onToggleInstalled,
  onOpenArtworkPicker,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!game) return null;

  const badge = getPlatformBadge(game.platform);
  const isInstalled = game.installed !== false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Close Button Top Right */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 w-9 h-9 rounded-full bg-slate-950/70 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 flex items-center justify-center transition shadow-lg"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1">
          {/* Distinct Page Background / Hero Banner Section */}
          <div className="relative h-72 sm:h-84 md:h-96 w-full overflow-hidden bg-slate-950">
            <GameImage
              src={game.bannerUrl}
              alt={`${game.title} background`}
              title={game.title}
              platform={game.platform}
              type="banner"
              className="w-full h-full object-cover object-center"
            />

            {/* Ambient gradients */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-transparent to-slate-950/40" />

            {/* Top platform & install status pill */}
            <div className="absolute top-4 left-6 z-10 flex items-center gap-2">
              <span
                className={`text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full border backdrop-blur-md ${badge.bg} ${badge.color}`}
              >
                {badge.name}
              </span>

              {!isInstalled && (
                <span className="text-xs font-semibold uppercase px-2.5 py-1 rounded-full bg-slate-900/90 text-slate-200 border border-slate-700 backdrop-blur-md flex items-center gap-1.5">
                  <Cloud className="w-3 h-3 text-blue-400" />
                  <span>Cloud Library (Not Installed)</span>
                </span>
              )}
            </div>
          </div>

          {/* Main Details Body */}
          <div className="px-6 sm:px-8 pb-8 -mt-24 sm:-mt-32 relative z-20">
            <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
              {/* Distinct Vertical Cover Art / Thumbnail Poster */}
              <div className="w-40 sm:w-48 md:w-56 aspect-[2/3] rounded-xl overflow-hidden shadow-2xl border-2 border-slate-700/80 shrink-0 bg-slate-950">
                <GameImage
                  src={game.coverUrl}
                  alt={`${game.title} cover`}
                  title={game.title}
                  platform={game.platform}
                  type="cover"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Title, Badges, and Action Bar */}
              <div className="flex-1 w-full pt-2">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <span className={`text-xs font-semibold uppercase px-2.5 py-0.5 rounded-full border ${badge.bg} ${badge.color}`}>
                    {game.platform.toUpperCase()}
                  </span>
                  {game.rating && (
                    <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                      <Award className="w-3.5 h-3.5" />
                      {game.rating}% Rating
                    </span>
                  )}
                  {game.releaseDate && (
                    <span className="flex items-center gap-1 text-xs text-slate-400 px-2.5 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/50">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {game.releaseDate}
                    </span>
                  )}
                </div>

                <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
                  {game.title}
                </h1>

                {game.summary && (
                  <p className="mt-2 text-sm text-slate-300 italic leading-relaxed">
                    "{game.summary}"
                  </p>
                )}

                {/* Primary Actions: Play / Install, Favorite, Edit */}
                <div className="flex flex-wrap items-center gap-3 mt-6">
                  {isInstalled ? (
                    <button
                      onClick={() => onLaunchGame(game)}
                      disabled={game.isRunning}
                      className={`flex items-center gap-2.5 px-7 py-3 rounded-xl font-bold text-sm tracking-wide uppercase shadow-lg transition-all transform active:scale-95 ${
                        game.isRunning
                          ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/50 cursor-default'
                          : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 text-white shadow-blue-600/30 ring-1 ring-white/20'
                      }`}
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>{game.isRunning ? 'Running' : 'Play Game'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => (onInstallGame ? onInstallGame(game) : onLaunchGame(game))}
                      className="flex items-center gap-2.5 px-7 py-3 rounded-xl font-bold text-sm tracking-wide uppercase shadow-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 ring-1 ring-white/20 transition-all transform active:scale-95"
                    >
                      <Download className="w-4 h-4" />
                      <span>Install Game</span>
                    </button>
                  )}

                  <button
                    onClick={() => onToggleFavorite(game.id)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-semibold border transition ${
                      game.favorite
                        ? 'bg-amber-500/15 text-amber-400 border-amber-500/40'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                    }`}
                  >
                    <Star
                      className={`w-4 h-4 ${
                        game.favorite ? 'fill-amber-400 text-amber-400' : 'text-slate-400'
                      }`}
                    />
                    <span>{game.favorite ? 'Favorited' : 'Favorite'}</span>
                  </button>

                  {onOpenArtworkPicker && (
                    <button
                      onClick={() => onOpenArtworkPicker(game)}
                      className="flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-semibold bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 transition"
                      title="Choose or search official box arts and wallpapers"
                    >
                      <Sparkles className="w-4 h-4 text-blue-400" />
                      <span>Choose Artwork</span>
                    </button>
                  )}

                  <button
                    onClick={() => onEditGame(game)}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Edit Info</span>
                  </button>

                  {onToggleInstalled && (
                    <button
                      onClick={() => onToggleInstalled(game.id)}
                      title="Toggle installed status"
                      className="flex items-center gap-1.5 px-3 py-3 rounded-xl text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition"
                    >
                      <CheckCircle2 className={`w-4 h-4 ${isInstalled ? 'text-emerald-400' : 'text-slate-500'}`} />
                      <span>{isInstalled ? 'Marked Installed' : 'Mark Installed'}</span>
                    </button>
                  )}

                  <button
                    onClick={() => onDeleteGame(game.id)}
                    title="Remove from library"
                    className="w-11 h-11 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-500/40 flex items-center justify-center transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8">
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <span>Time Played</span>
                </div>
                <div className="text-base font-bold text-white font-mono">
                  {formatPlaytime(game.playtimeMinutes)}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-purple-400" />
                  <span>Last Played</span>
                </div>
                <div className="text-sm font-semibold text-white">
                  {formatRelativeDate(game.lastPlayed)}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                  <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Developer</span>
                </div>
                <div className="text-sm font-semibold text-white truncate">
                  {game.developer || 'Unknown'}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                  <Folder className="w-3.5 h-3.5 text-amber-400" />
                  <span>Publisher</span>
                </div>
                <div className="text-sm font-semibold text-white truncate">
                  {game.publisher || 'Independent'}
                </div>
              </div>
            </div>

            {/* Description & Metadata Section */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Left 2 Cols: Description & Tags */}
              <div className="md:col-span-2 space-y-6">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">
                    About the Game
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                    {game.description || 'No description provided.'}
                  </p>
                </div>

                {/* Genres & Tags */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Genres & Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {game.genres?.map((g) => (
                      <span
                        key={g}
                        className="px-2.5 py-1 text-xs rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium"
                      >
                        {g}
                      </span>
                    ))}
                    {game.tags?.map((t) => (
                      <span
                        key={t}
                        className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 text-slate-300 border border-slate-700 font-medium"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Col: Technical Details & File Info */}
              <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 space-y-4 text-xs">
                <div>
                  <div className="text-slate-500 font-medium mb-1">Status</div>
                  <div className="text-slate-200 flex items-center gap-2">
                    {isInstalled ? (
                      <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Installed on this PC
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-slate-400 font-semibold">
                        <Cloud className="w-3.5 h-3.5 text-blue-400" />
                        Cloud / Not Installed
                      </span>
                    )}
                  </div>
                </div>

                {game.executablePath && (
                  <div>
                    <div className="text-slate-500 font-medium mb-1">Executable Target</div>
                    <div className="font-mono text-slate-300 break-all bg-slate-900 p-2 rounded border border-slate-800 text-[11px]">
                      {game.executablePath}
                    </div>
                  </div>
                )}

                {game.installPath && (
                  <div>
                    <div className="text-slate-500 font-medium mb-1">Installation Directory</div>
                    <div className="font-mono text-slate-300 break-all bg-slate-900 p-2 rounded border border-slate-800 text-[11px]">
                      {game.installPath}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-slate-500 font-medium mb-1">Date Added</div>
                  <div className="text-slate-300">
                    {new Date(game.addedDate).toLocaleDateString(undefined, {
                      dateStyle: 'medium',
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
