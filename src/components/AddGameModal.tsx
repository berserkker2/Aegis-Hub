import React, { useState } from 'react';
import { X, FolderOpen, Image, Plus, Gamepad, Sparkles, Check, FolderSearch, CheckSquare, Square, RefreshCw } from 'lucide-react';
import { Game, GamePlatform, ScanResult } from '../types/game';
import { getPlaceholderCover, getPlaceholderBanner } from '../utils/formatters';
import { GameImage } from './GameImage';

interface AddGameModalProps {
  onClose: () => void;
  onAddGame: (game: Game) => void;
  onImportBatchGames?: (games: Game[]) => void;
  existingGames?: Game[];
}

export const AddGameModal: React.FC<AddGameModalProps> = ({
  onClose,
  onAddGame,
  onImportBatchGames,
  existingGames = [],
}) => {
  const [activeTab, setActiveTab] = useState<'single' | 'folder'>('single');

  // Single game state
  const [title, setTitle] = useState('');
  const [executablePath, setExecutablePath] = useState('');
  const [platform, setPlatform] = useState<GamePlatform>('manual');
  const [coverUrl, setCoverUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [description, setDescription] = useState('');
  const [genresInput, setGenresInput] = useState('Action, Adventure');
  const [developer, setDeveloper] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [isInstalled, setIsInstalled] = useState(true);
  const [searchingArt, setSearchingArt] = useState(false);
  const [artFound, setArtFound] = useState(false);

  // Folder batch import state
  const [selectedFolder, setSelectedFolder] = useState('');
  const [folderScanning, setFolderScanning] = useState(false);
  const [folderResults, setFolderResults] = useState<ScanResult[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [folderHasScanned, setFolderHasScanned] = useState(false);

  const handleBrowseExecutable = async () => {
    if (window.api?.selectFile) {
      const selected = await window.api.selectFile([
        { name: 'Executables and Shortcuts', extensions: ['exe', 'lnk', 'bat'] },
        { name: 'All Files', extensions: ['*'] },
      ]);
      if (selected) {
        setExecutablePath(selected);
        if (!title) {
          const cleanName = selected
            .split(/[\\/]/)
            .pop()
            ?.replace(/\.(exe|lnk|bat)$/i, '')
            .replace(/[-_]/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase());
          if (cleanName) {
            setTitle(cleanName);
            handleAutoSearchArtwork(cleanName);
          }
        }
      }
    }
  };

  const handleAutoSearchArtwork = async (searchTitle?: string) => {
    const query = searchTitle || title;
    if (!query.trim() || !window.api?.searchArtwork) return;

    setSearchingArt(true);
    setArtFound(false);
    try {
      const art = await window.api.searchArtwork(query.trim());
      if (art) {
        if (art.coverUrl) setCoverUrl(art.coverUrl);
        if (art.bannerUrl) setBannerUrl(art.bannerUrl);
        if (art.genres?.length) setGenresInput(art.genres.join(', '));
        if (art.developer) setDeveloper(art.developer);
        setArtFound(true);
      }
    } catch (err) {
      console.error('Artwork search error:', err);
    } finally {
      setSearchingArt(false);
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
    if (!title.trim()) return;

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
      description: description.trim() || `Game added to Aegis Hub: ${title}`,
      genres: genres.length > 0 ? genres : ['PC Game'],
      tags: ['Custom', platform],
      developer: developer.trim() || undefined,
      favorite: isFavorite,
      hidden: false,
      installed: isInstalled,
      playtimeMinutes: 0,
      addedDate: new Date().toISOString(),
    };

    onAddGame(newGame);
    onClose();
  };

  const handleBrowseFolderToScan = async () => {
    if (!window.api?.selectFolder) return;
    const folder = await window.api.selectFolder();
    if (!folder) return;

    setSelectedFolder(folder);
    setFolderScanning(true);
    setFolderHasScanned(false);
    try {
      if (window.api?.scanFolder) {
        const results = await window.api.scanFolder(folder);
        // Exclude games already in library
        const existingExecs = new Set(existingGames.map((g) => g.executablePath.toLowerCase().trim()));
        const existingTitles = new Set(existingGames.map((g) => g.title.toLowerCase().trim()));

        const filtered = results.filter(
          (r) =>
            !existingExecs.has(r.executablePath.toLowerCase().trim()) &&
            !existingTitles.has(r.title.toLowerCase().trim())
        );

        setFolderResults(filtered);
        setSelectedIndices(new Set(filtered.map((_, i) => i)));
        setFolderHasScanned(true);
      }
    } catch (err) {
      console.error('Folder scan error:', err);
    } finally {
      setFolderScanning(false);
    }
  };

  const toggleSelectAllFolder = () => {
    if (selectedIndices.size === folderResults.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(folderResults.map((_, i) => i)));
    }
  };

  const toggleIndex = (index: number) => {
    const updated = new Set(selectedIndices);
    if (updated.has(index)) {
      updated.delete(index);
    } else {
      updated.add(index);
    }
    setSelectedIndices(updated);
  };

  const handleImportFolderGames = () => {
    const gamesToImport: Game[] = [];
    selectedIndices.forEach((idx) => {
      const item = folderResults[idx];
      if (item) {
        gamesToImport.push({
          id: `manual-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          title: item.title,
          executablePath: item.executablePath,
          platform: 'manual',
          installPath: item.installPath,
          coverUrl: item.coverUrl || getPlaceholderCover(item.title),
          bannerUrl: item.bannerUrl || getPlaceholderBanner(item.title),
          description: item.description || `Added from folder: ${item.installPath || item.executablePath}`,
          genres: item.genres || ['PC Game'],
          tags: ['Custom', 'Folder Import'],
          favorite: false,
          hidden: false,
          installed: true,
          playtimeMinutes: 0,
          addedDate: new Date().toISOString(),
        });
      }
    });

    if (gamesToImport.length > 0) {
      if (onImportBatchGames) {
        onImportBatchGames(gamesToImport);
      } else {
        // Fallback: add one by one
        gamesToImport.forEach((g) => onAddGame(g));
      }
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              {activeTab === 'single' ? <Gamepad className="w-4 h-4" /> : <FolderSearch className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Add Games</h2>
              <p className="text-xs text-slate-400">Add a single game or scan an entire folder of games</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 pt-3 pb-1 border-b border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('single')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'single'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Gamepad className="w-3.5 h-3.5" />
            <span>Single Game (.exe)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('folder')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'folder'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <FolderSearch className="w-3.5 h-3.5" />
            <span>Folder / Entire Directory</span>
          </button>
        </div>

        {activeTab === 'folder' ? (
          /* Entire Folder Import Tab */
          <div className="mt-4 flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Folder selection bar */}
            <div className="space-y-2 pb-3 shrink-0 border-b border-slate-800">
              <label className="block text-xs font-semibold text-slate-300">
                Choose Games Folder or External Drive
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  placeholder="e.g. D:\Games, G:\Epic Games, C:\Games..."
                  value={selectedFolder}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 font-mono"
                />
                <button
                  type="button"
                  onClick={handleBrowseFolderToScan}
                  disabled={folderScanning}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shrink-0 shadow"
                >
                  <FolderOpen className="w-4 h-4" />
                  <span>{selectedFolder ? 'Change Folder...' : 'Browse Folder...'}</span>
                </button>
              </div>
            </div>

            {/* Folder Scan Results */}
            <div className="flex-1 overflow-y-auto py-3 space-y-2 min-h-[220px]">
              {folderScanning ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-3" />
                  <div className="text-sm font-semibold text-slate-200">Scanning directory recursively...</div>
                  <div className="text-xs text-slate-400 mt-1 max-w-sm">
                    Searching for game executables and matching covers in {selectedFolder}
                  </div>
                </div>
              ) : !selectedFolder ? (
                <div className="flex flex-col items-center justify-center py-14 text-center">
                  <FolderSearch className="w-10 h-10 text-slate-600 mb-3" />
                  <div className="text-sm font-semibold text-slate-300">No folder selected</div>
                  <div className="text-xs text-slate-500 mt-1 max-w-xs">
                    Click "Browse Folder..." to select a folder containing one or more games. All games inside will be detected automatically.
                  </div>
                </div>
              ) : folderResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-center">
                  <Check className="w-10 h-10 text-emerald-500 mb-3" />
                  <div className="text-sm font-semibold text-slate-300">
                    {folderHasScanned ? 'No new unimported games found' : 'Ready'}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 max-w-xs">
                    All games found in this directory are already in your library.
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between pb-1 text-xs text-slate-400">
                    <span>Found {folderResults.length} new game(s)</span>
                    <button
                      type="button"
                      onClick={toggleSelectAllFolder}
                      className="text-blue-400 hover:text-blue-300 font-medium"
                    >
                      {selectedIndices.size === folderResults.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  {folderResults.map((result, idx) => {
                    const isSelected = selectedIndices.has(idx);

                    return (
                      <div
                        key={`${result.executablePath}-${idx}`}
                        onClick={() => toggleIndex(idx)}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition cursor-pointer ${
                          isSelected
                            ? 'bg-blue-950/30 border-blue-500/40 text-white'
                            : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <button
                            type="button"
                            className="text-blue-400 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleIndex(idx);
                            }}
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 fill-blue-600/20 text-blue-500" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-600" />
                            )}
                          </button>

                          <div className="w-9 h-12 rounded-md overflow-hidden bg-slate-900 border border-slate-800 shrink-0 relative">
                            <GameImage
                              src={result.coverUrl}
                              alt={result.title}
                              title={result.title}
                              platform="manual"
                              type="cover"
                              className="w-full h-full object-cover"
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold truncate text-slate-100">
                              {result.title}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate font-mono mt-0.5">
                              {result.executablePath}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            {/* Folder Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800 shrink-0">
              <div className="text-xs text-slate-400">
                {selectedIndices.size} of {folderResults.length} selected
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleImportFolderGames}
                  disabled={selectedIndices.size === 0}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-blue-600/30 flex items-center gap-1.5 transition disabled:opacity-40"
                >
                  <Plus className="w-4 h-4" />
                  <span>Import Selected ({selectedIndices.size})</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Scrollable Form Body */
          <form onSubmit={handleSubmit} className="mt-4 space-y-4 overflow-y-auto flex-1 pr-1">
          {/* Game Title with Auto-Fetch Button */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300">
                Game Title <span className="text-red-400">*</span>
              </label>
              <button
                type="button"
                onClick={() => handleAutoSearchArtwork()}
                disabled={!title.trim() || searchingArt}
                className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-40 flex items-center gap-1 font-medium transition"
              >
                {artFound ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Artwork Found!</span>
                  </>
                ) : (
                  <>
                    <Sparkles className={`w-3.5 h-3.5 ${searchingArt ? 'animate-spin' : ''}`} />
                    <span>{searchingArt ? 'Searching...' : 'Auto-Fetch Art'}</span>
                  </>
                )}
              </button>
            </div>
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
              Executable Path or Launch Command
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="C:\Games\GameTitle\game.exe (or leave blank if cloud owned)"
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
                <span>Browse .exe</span>
              </button>
            </div>
          </div>

          {/* Distinct Visuals Section */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Image className="w-3.5 h-3.5 text-blue-400" />
              <span>Separate Visuals (Thumbnail vs Background)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Thumbnail (Vertical 2:3) */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Thumbnail / Poster (2:3 Aspect)
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="URL or select file..."
                    value={coverUrl}
                    onChange={(e) => setCoverUrl(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={handleBrowseCover}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition shrink-0"
                    title="Select image from PC"
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

              {/* Background Banner (Wide 16:9) */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Page Background (16:9 Hero Wallpaper)
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="URL or select file..."
                    value={bannerUrl}
                    onChange={(e) => setBannerUrl(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={handleBrowseBanner}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition shrink-0"
                    title="Select image from PC"
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

          {/* Platform & Developer */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Platform / Store</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as GamePlatform)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none transition"
              >
                <option value="manual">Local</option>
                <option value="steam">Steam</option>
                <option value="epic">Epic Games Store</option>
                <option value="gog">GOG Galaxy</option>
                <option value="ea">EA App</option>
                <option value="ubisoft">Ubisoft Connect</option>
                <option value="xbox">Xbox / Windows Store</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Developer</label>
              <input
                type="text"
                placeholder="e.g. CD PROJEKT RED, Valve"
                value={developer}
                onChange={(e) => setDeveloper(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none transition"
              />
            </div>
          </div>

          {/* Genres */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Genres</label>
            <input
              type="text"
              placeholder="Action, RPG, Open World"
              value={genresInput}
              onChange={(e) => setGenresInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none transition"
            />
          </div>

          {/* Checkboxes: Favorite & Installed */}
          <div className="flex items-center gap-6 pt-1">
            <label className="flex items-center gap-2 text-xs text-slate-300 font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={isFavorite}
                onChange={(e) => setIsFavorite(e.target.checked)}
                className="rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0"
              />
              <span>Add directly to Favorites</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-slate-300 font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={isInstalled}
                onChange={(e) => setIsInstalled(e.target.checked)}
                className="rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0"
              />
              <span>Mark as Installed locally</span>
            </label>
          </div>

          {/* Submit buttons */}
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
              <Plus className="w-4 h-4" />
              <span>Add to Library</span>
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
};
