import React, { useState } from 'react';
import { X, FolderOpen, Image, Save, Star } from 'lucide-react';
import { Game, GamePlatform } from '../types/game';

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
  const [favorite, setFavorite] = useState(game.favorite);

  const handleBrowseExecutable = async () => {
    if (window.api?.selectFile) {
      const selected = await window.api.selectFile([
        { name: 'Executables and Shortcuts', extensions: ['exe', 'lnk', 'bat'] },
        { name: 'All Files', extensions: ['*'] },
      ]);
      if (selected) setExecutablePath(selected);
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
      favorite,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white">Customize Game Details</h2>
            <p className="text-xs text-slate-400">Edit visuals, launcher target and metadata</p>
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
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Executable Target</label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={executablePath}
                onChange={(e) => setExecutablePath(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none font-mono"
              />
              <button
                type="button"
                onClick={handleBrowseExecutable}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Browse</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Cover Art URL or Local File</label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 outline-none"
                />
                <button
                  type="button"
                  onClick={handleBrowseCover}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition shrink-0"
                >
                  <Image className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Banner Art URL or Local File</label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 outline-none"
                />
                <button
                  type="button"
                  onClick={handleBrowseBanner}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition shrink-0"
                >
                  <Image className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Platform</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as GamePlatform)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none"
              >
                <option value="manual">PC Standalone</option>
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
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Genres</label>
            <input
              type="text"
              value={genresInput}
              onChange={(e) => setGenresInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none"
            />
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

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="editFav"
              checked={favorite}
              onChange={(e) => setFavorite(e.target.checked)}
              className="rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0"
            />
            <label htmlFor="editFav" className="text-xs text-slate-300 font-medium cursor-pointer">
              Mark as Favorite
            </label>
          </div>

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
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
