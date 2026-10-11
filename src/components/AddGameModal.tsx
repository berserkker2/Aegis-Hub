import React, { useState } from 'react';
import { X, FolderOpen, Image, Plus, Gamepad, Sparkles } from 'lucide-react';
import { Game, GamePlatform } from '../types/game';
import { getPlaceholderCover, getPlaceholderBanner } from '../utils/formatters';

interface AddGameModalProps {
  onClose: () => void;
  onAddGame: (game: Game) => void;
}

export const AddGameModal: React.FC<AddGameModalProps> = ({ onClose, onAddGame }) => {
  const [title, setTitle] = useState('');
  const [executablePath, setExecutablePath] = useState('');
  const [platform, setPlatform] = useState<GamePlatform>('manual');
  const [coverUrl, setCoverUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [description, setDescription] = useState('');
  const [genresInput, setGenresInput] = useState('Action, Adventure');
  const [developer, setDeveloper] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);

  const handleBrowseExecutable = async () => {
    if (window.api?.selectFile) {
      const selected = await window.api.selectFile([
        { name: 'Executables and Shortcuts', extensions: ['exe', 'lnk', 'bat'] },
        { name: 'All Files', extensions: ['*'] },
      ]);
      if (selected) {
        setExecutablePath(selected);
        if (!title) {
          // Infer title from file name
          const cleanName = selected
            .split(/[\\/]/)
            .pop()
            ?.replace(/\.(exe|lnk|bat)$/i, '')
            .replace(/[-_]/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase());
          if (cleanName) setTitle(cleanName);
        }
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
    if (!title.trim() || !executablePath.trim()) return;

    const genres = genresInput
      .split(',')
      .map((g) => g.trim())
      .filter(Boolean);

    const newGame: Game = {
      id: `game-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: title.trim(),
      executablePath: executablePath.trim(),
      platform,
      coverUrl: coverUrl.trim() || getPlaceholderCover(title),
      bannerUrl: bannerUrl.trim() || getPlaceholderBanner(title),
      description: description.trim() || `Custom game added manually: ${title}`,
      genres: genres.length > 0 ? genres : ['PC Game'],
      tags: ['Custom', platform],
      developer: developer.trim() || undefined,
      favorite: isFavorite,
      hidden: false,
      playtimeMinutes: 0,
      addedDate: new Date().toISOString(),
    };

    onAddGame(newGame);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Gamepad className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Add Game Manually</h2>
              <p className="text-xs text-slate-400">Link an executable (.exe) or custom application</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Game Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Game Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Grand Theft Auto V, Minecraft, Hollow Knight"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none transition"
            />
          </div>

          {/* Executable Path */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Executable Path or Launch Command <span className="text-red-400">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                placeholder="C:\Games\GameTitle\game.exe"
                value={executablePath}
                onChange={(e) => setExecutablePath(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none transition font-mono"
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

          {/* Platform & Developer */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Platform</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as GamePlatform)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none transition"
              >
                <option value="manual">PC Standalone / DRM-Free</option>
                <option value="steam">Steam</option>
                <option value="epic">Epic Games</option>
                <option value="gog">GOG Galaxy</option>
                <option value="ea">EA App</option>
                <option value="ubisoft">Ubisoft Connect</option>
                <option value="xbox">Xbox / Microsoft Store</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Developer / Studio</label>
              <input
                type="text"
                placeholder="e.g. Rockstar Games, Valve"
                value={developer}
                onChange={(e) => setDeveloper(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none transition"
              />
            </div>
          </div>

          {/* Cover & Banner URLs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Cover Art (URL or File)
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="https://... or select file"
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 outline-none transition"
                />
                <button
                  type="button"
                  onClick={handleBrowseCover}
                  title="Select image from PC"
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition shrink-0"
                >
                  <Image className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Hero Banner (URL or File)
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="https://... or select file"
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 outline-none transition"
                />
                <button
                  type="button"
                  onClick={handleBrowseBanner}
                  title="Select banner from PC"
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition shrink-0"
                >
                  <Image className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Genres */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Genres (comma separated)</label>
            <input
              type="text"
              placeholder="Action, RPG, Open World, Shooter"
              value={genresInput}
              onChange={(e) => setGenresInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none transition"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
            <textarea
              rows={2}
              placeholder="Brief summary or notes about the game..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none transition resize-none"
            />
          </div>

          {/* Favorite checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isFav"
              checked={isFavorite}
              onChange={(e) => setIsFavorite(e.target.checked)}
              className="rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0"
            />
            <label htmlFor="isFav" className="text-xs text-slate-300 font-medium cursor-pointer">
              Add directly to Favorites
            </label>
          </div>

          {/* Submit buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
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
              <Plus className="w-4 h-4" />
              <span>Add to Library</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
