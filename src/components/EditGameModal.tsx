import React, { useState } from 'react';
import { X, FolderOpen, Image, Save, Sparkles, Check, Clock, Calendar } from 'lucide-react';
import { Game, GamePlatform } from '../types/game';
import { isoToDateInput, dateInputToIso, formatPlaytime } from '../utils/formatters';

interface EditGameModalProps {
  game: Game | null;
  onClose: () => void;
  onSave: (updated: Game) => void;
}

export const EditGameModal: React.FC<EditGameModalProps> = ({ game, onClose, onSave }) => {
  if (!game) return null;

  const [title, setTitle] = useState(game.title);
  const [executablePath, setExecutablePath] = useState(game.executablePath);
  const [platform, setPlatform] = useState<GamePlatform>(game.platform);
  const [coverUrl, setCoverUrl] = useState(game.coverUrl);
  const [bannerUrl, setBannerUrl] = useState(game.bannerUrl);
  const [description, setDescription] = useState(game.description || '');
  const [genresInput, setGenresInput] = useState(game.genres?.join(', ') || '');
  const [developer, setDeveloper] = useState(game.developer || '');
  const [publisher, setPublisher] = useState(game.publisher || '');
  const [favorite, setFavorite] = useState(game.favorite);
  const [installed, setInstalled] = useState(game.installed !== false);
  const [hidden, setHidden] = useState(game.hidden || false);
  const [playtimeHours, setPlaytimeHours] = useState<number>(() => {
    const mins = Math.max(0, game.playtimeMinutes || 0);
    return Math.floor(mins / 60);
  });
  const [playtimeMinutesPart, setPlaytimeMinutesPart] = useState<number>(() => {
    const mins = Math.max(0, game.playtimeMinutes || 0);
    return mins % 60;
  });
  const [lastPlayedDate, setLastPlayedDate] = useState<string>(() => isoToDateInput(game.lastPlayed));
  const [searchingArt, setSearchingArt] = useState(false);
  const [artFound, setArtFound] = useState(false);

  const handleAutoSearchArtwork = async () => {
    if (!title.trim() || !window.api?.searchArtwork) return;
    setSearchingArt(true);
    setArtFound(false);
    try {
      const art = await window.api.searchArtwork(title.trim());
      if (art) {
        if (art.coverUrl) setCoverUrl(art.coverUrl);
        if (art.bannerUrl) setBannerUrl(art.bannerUrl);
        if (art.genres?.length) setGenresInput(art.genres.join(', '));
        if (art.developer) setDeveloper(art.developer);
        if (art.publisher) setPublisher(art.publisher);
        setArtFound(true);
      }
    } catch (err) {
      console.error('Artwork search error:', err);
    } finally {
      setSearchingArt(false);
    }
  };

  const handleBrowseExecutable = async () => {
    if (window.api?.selectFile) {
      const selected = await window.api.selectFile([
        { name: 'Executables and Shortcuts', extensions: ['exe', 'lnk', 'bat'] },
        { name: 'All Files', extensions: ['*'] },
      ]);
      if (selected) {
        setExecutablePath(selected);
        setInstalled(true);
      }
    }
  };

  const handleBrowseCover = async () => {
    if (window.api?.selectFile) {
      const selected = await window.api.selectFile([
        { name: 'Image Files', extensions: ['jpg', 'jpeg', 'png', 'webp'] },
      ]);
      if (selected) setCoverUrl(`file:///${selected.replace(/\\/g, '/')}`);
    }
  };

  const handleBrowseBanner = async () => {
    if (window.api?.selectFile) {
      const selected = await window.api.selectFile([
        { name: 'Image Files', extensions: ['jpg', 'jpeg', 'png', 'webp'] },
      ]);
      if (selected) setBannerUrl(`file:///${selected.replace(/\\/g, '/')}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const genres = genresInput
      .split(',')
      .map((g) => g.trim())
      .filter(Boolean);

    const totalPlaytimeMinutes = Math.max(0, (playtimeHours || 0) * 60 + (playtimeMinutesPart || 0));
    const newLastPlayed = dateInputToIso(lastPlayedDate);

    onSave({
      ...game,
      title: title.trim(),
      executablePath: executablePath.trim(),
      platform,
      coverUrl: coverUrl.trim(),
      bannerUrl: bannerUrl.trim(),
      description: description.trim(),
      genres,
      developer: developer.trim() || undefined,
      publisher: publisher.trim() || undefined,
      favorite,
      installed,
      hidden,
      playtimeMinutes: totalPlaytimeMinutes,
      lastPlayed: newLastPlayed,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div>
            <h2 className="text-base font-bold text-white">Customize Game Visuals & Details</h2>
            <p className="text-xs text-slate-400">Set distinct thumbnail cover and page hero background</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4 overflow-y-auto flex-1 pr-1">
          {/* Title & Auto-Search */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300">Title</label>
              <button
                type="button"
                onClick={handleAutoSearchArtwork}
                disabled={!title.trim() || searchingArt}
                className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-40 flex items-center gap-1 font-medium transition"
              >
                {artFound ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Artwork Updated!</span>
                  </>
                ) : (
                  <>
                    <Sparkles className={`w-3.5 h-3.5 ${searchingArt ? 'animate-spin' : ''}`} />
                    <span>{searchingArt ? 'Fetching...' : 'Auto-Fetch Art'}</span>
                  </>
                )}
              </button>
            </div>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none"
            />
          </div>

          {/* Executable Path */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Executable Target</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={executablePath}
                onChange={(e) => setExecutablePath(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none font-mono"
              />
              <button
                type="button"
                onClick={handleBrowseExecutable}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shrink-0"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Browse</span>
              </button>
            </div>
          </div>

          {/* Separate Visuals Box */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Image className="w-3.5 h-3.5 text-blue-400" />
              <span>Independent Images (Cover vs Background)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Thumbnail Cover */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  1. Thumbnail Poster (Vertical 2:3)
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={coverUrl}
                    onChange={(e) => setCoverUrl(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleBrowseCover}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition shrink-0"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                  </button>
                </div>
                {coverUrl && (
                  <div className="mt-2 w-20 aspect-[2/3] rounded-lg overflow-hidden border border-slate-700 bg-slate-900">
                    <img src={coverUrl} alt="Cover preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              {/* Background Banner */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  2. Page Background (Wide 16:9 Hero)
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={bannerUrl}
                    onChange={(e) => setBannerUrl(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleBrowseBanner}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition shrink-0"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                  </button>
                </div>
                {bannerUrl && (
                  <div className="mt-2 w-32 aspect-[16/9] rounded-lg overflow-hidden border border-slate-700 bg-slate-900">
                    <img src={bannerUrl} alt="Banner preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Platform</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as GamePlatform)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none"
              >
                <option value="manual">Local</option>
                <option value="steam">Steam</option>
                <option value="epic">Epic Games</option>
                <option value="gog">GOG Galaxy</option>
                <option value="ea">EA App</option>
                <option value="ubisoft">Ubisoft Connect</option>
                <option value="xbox">Xbox</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Developer</label>
              <input
                type="text"
                value={developer}
                onChange={(e) => setDeveloper(e.target.value)}
                placeholder="e.g. Remedy Entertainment"
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Publisher</label>
              <input
                type="text"
                value={publisher}
                onChange={(e) => setPublisher(e.target.value)}
                placeholder="e.g. Epic Games Publishing"
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none"
              />
            </div>
          </div>

          {/* Playtime & Last Played Activity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <span>Time Played</span>
                </label>
                <span className="text-[11px] font-mono text-blue-400">
                  {formatPlaytime(Math.max(0, (playtimeHours || 0) * 60 + (playtimeMinutesPart || 0)))}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[10px] text-slate-400 mb-0.5">Hours</div>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={playtimeHours}
                    onChange={(e) => setPlaytimeHours(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono outline-none"
                    placeholder="0"
                  />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 mb-0.5">Minutes</div>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    step="1"
                    value={playtimeMinutesPart}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 0;
                      setPlaytimeMinutesPart(Math.max(0, Math.min(59, val)));
                    }}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono outline-none"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-purple-400" />
                  <span>Last Played</span>
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      const y = d.getFullYear();
                      const m = String(d.getMonth() + 1).padStart(2, '0');
                      const day = String(d.getDate()).padStart(2, '0');
                      setLastPlayedDate(`${y}-${m}-${day}`);
                    }}
                    className="text-[10px] text-purple-400 hover:text-purple-300 underline cursor-pointer"
                  >
                    Today
                  </button>
                  <span className="text-[10px] text-slate-600">|</span>
                  <button
                    type="button"
                    onClick={() => setLastPlayedDate('')}
                    className="text-[10px] text-slate-500 hover:text-red-400 underline cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 mb-0.5">Date</div>
                <input
                  type="date"
                  value={lastPlayedDate}
                  onChange={(e) => setLastPlayedDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-purple-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 outline-none [color-scheme:dark]"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Genres (separated by comma)
            </label>
            <input
              type="text"
              value={genresInput}
              onChange={(e) => setGenresInput(e.target.value)}
              placeholder="e.g. Survival Horror, Action, Sci-Fi"
              className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none"
            />
            <div className="flex flex-wrap gap-1 mt-2">
              {[
                'Survival Horror',
                'Horror',
                'Action-Adventure',
                'Stealth',
                'Action',
                'Adventure',
                'Souls-like',
                'Metroidvania',
                'RPG',
                'FPS',
                'Open World',
                'Sci-Fi',
                'Story Rich',
              ].map((pg) => {
                const isSelected = genresInput
                  .toLowerCase()
                  .split(',')
                  .map((g) => g.trim())
                  .includes(pg.toLowerCase());
                return (
                  <button
                    key={pg}
                    type="button"
                    onClick={() => {
                      const current = genresInput
                        .split(',')
                        .map((g) => g.trim())
                        .filter(Boolean);
                      const exists = current.some((g) => g.toLowerCase() === pg.toLowerCase());
                      const next = exists
                        ? current.filter((g) => g.toLowerCase() !== pg.toLowerCase())
                        : [...current, pg];
                      setGenresInput(next.join(', '));
                    }}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '}
                    {pg}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none resize-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2 text-xs text-slate-300 font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={favorite}
                onChange={(e) => setFavorite(e.target.checked)}
                className="rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0"
              />
              <span>Favorite</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-slate-300 font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={installed}
                onChange={(e) => setInstalled(e.target.checked)}
                className="rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0"
              />
              <span>Installed locally on this PC</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-amber-300 font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={hidden}
                onChange={(e) => setHidden(e.target.checked)}
                className="rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-0"
              />
              <span>Hide from library & Recent shelf</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-blue-600/30 flex items-center gap-1.5 transition"
            >
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
