import React, { useState, useEffect } from 'react';
import { X, Search, Image, Sparkles, Check, FolderOpen, RefreshCw, Layers, Link as LinkIcon } from 'lucide-react';
import { Game } from '../types/game';
import { ArtworkOption } from '../types/electron';

interface ArtworkPickerModalProps {
  game: Game;
  onClose: () => void;
  onSaveArtwork: (gameId: string, coverUrl: string, bannerUrl: string) => void;
}

export const ArtworkPickerModal: React.FC<ArtworkPickerModalProps> = ({
  game,
  onClose,
  onSaveArtwork,
}) => {
  const [searchTerm, setSearchTerm] = useState(game.title);
  const [loading, setLoading] = useState(false);
  const [coverOptions, setCoverOptions] = useState<ArtworkOption[]>([]);
  const [bannerOptions, setBannerOptions] = useState<ArtworkOption[]>([]);

  const [selectedCover, setSelectedCover] = useState(game.coverUrl);
  const [selectedBanner, setSelectedBanner] = useState(game.bannerUrl);

  // Custom online URL inputs
  const [customCoverUrl, setCustomCoverUrl] = useState('');
  const [showCoverUrlInput, setShowCoverUrlInput] = useState(false);
  const [customBannerUrl, setCustomBannerUrl] = useState('');
  const [showBannerUrlInput, setShowBannerUrlInput] = useState(false);

  const fetchSuggestions = async (title: string) => {
    if (!title.trim() || !window.api?.searchArtworkSuggestions) return;
    setLoading(true);
    try {
      const platformOrEmuId = game.platform === 'emulator' ? (game.storeId || 'emulator') : game.platform;
      const res = await window.api.searchArtworkSuggestions(title.trim(), platformOrEmuId);
      setCoverOptions(res.covers || []);
      setBannerOptions(res.banners || []);

      if (res.covers.length > 0 && !selectedCover) {
        setSelectedCover(res.covers[0].url);
      }
      if (res.banners.length > 0 && !selectedBanner) {
        setSelectedBanner(res.banners[0].url);
      }
    } catch (err) {
      console.error('Error fetching artwork suggestions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions(game.title);
  }, [game.title]);

  const handleBrowseLocalCover = async () => {
    if (window.api?.selectFile) {
      const file = await window.api.selectFile([
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] },
      ]);
      if (file) {
        const mediaUrl = window.api.toMediaUrl ? await window.api.toMediaUrl(file) : file;
        setSelectedCover(mediaUrl);
      }
    }
  };

  const handleBrowseLocalBanner = async () => {
    if (window.api?.selectFile) {
      const file = await window.api.selectFile([
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] },
      ]);
      if (file) {
        const mediaUrl = window.api.toMediaUrl ? await window.api.toMediaUrl(file) : file;
        setSelectedBanner(mediaUrl);
      }
    }
  };

  const handleApplyCustomCoverUrl = () => {
    const trimmed = customCoverUrl.trim();
    if (trimmed && (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:'))) {
      setSelectedCover(trimmed);
      setCustomCoverUrl('');
      setShowCoverUrlInput(false);
    }
  };

  const handleApplyCustomBannerUrl = () => {
    const trimmed = customBannerUrl.trim();
    if (trimmed && (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:'))) {
      setSelectedBanner(trimmed);
      setCustomBannerUrl('');
      setShowBannerUrlInput(false);
    }
  };

  const handleSave = () => {
    onSaveArtwork(game.id, selectedCover, selectedBanner);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Image className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Import & Choose Artwork</h2>
              <p className="text-xs text-slate-400">
                Pick independent box art and wide hero backgrounds for <span className="text-slate-200 font-semibold">{game.title}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-2 py-3 border-b border-slate-800/80 shrink-0">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search title on Steam and web art databases..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchSuggestions(searchTerm)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 outline-none focus:border-blue-500"
            />
          </div>
          <button
            onClick={() => fetchSuggestions(searchTerm)}
            disabled={loading}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Search</span>
          </button>
        </div>

        {/* Content Body: Selectors */}
        <div className="flex-1 overflow-y-auto py-4 space-y-6 pr-1">
          {/* Section 1: Vertical Covers (2:3) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                  <span>1. Thumbnail Poster (Vertical 2:3 Aspect)</span>
                  <span className="text-[10px] text-blue-400 font-normal">Used on grid cards</span>
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCoverUrlInput(!showCoverUrlInput)}
                  className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border transition ${
                    showCoverUrlInput
                      ? 'bg-blue-600 text-white border-blue-500'
                      : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
                  }`}
                >
                  <LinkIcon className="w-3.5 h-3.5 text-blue-400" />
                  <span>Custom Web URL</span>
                </button>
                <button
                  type="button"
                  onClick={handleBrowseLocalCover}
                  className="flex items-center gap-1 text-xs text-slate-300 hover:text-white bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                  <span>Upload from PC</span>
                </button>
              </div>
            </div>

            {/* Custom URL Input Bar for Cover */}
            {showCoverUrlInput && (
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-blue-500/40">
                <LinkIcon className="w-4 h-4 text-blue-400 shrink-0 ml-1" />
                <input
                  type="url"
                  placeholder="Paste direct online image URL (https://...)"
                  value={customCoverUrl}
                  onChange={(e) => setCustomCoverUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyCustomCoverUrl()}
                  className="w-full bg-transparent text-xs text-slate-200 outline-none placeholder:text-slate-500"
                />
                <button
                  type="button"
                  onClick={handleApplyCustomCoverUrl}
                  disabled={!customCoverUrl.trim()}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-semibold rounded-lg shrink-0 transition"
                >
                  Apply URL
                </button>
              </div>
            )}

            {loading ? (
              <div className="py-8 text-center text-xs text-slate-500">Searching official box arts...</div>
            ) : coverOptions.length === 0 && !selectedCover ? (
              <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 text-xs text-slate-400 text-center">
                No web covers found automatically. You can upload an image file from your PC, paste an online URL or adjust the search title.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {/* Custom uploaded or current cover if not in coverOptions */}
                {selectedCover && !coverOptions.some((c) => c.url === selectedCover) && (
                  <div
                    onClick={() => setSelectedCover(selectedCover)}
                    className="group relative aspect-[2/3] rounded-xl overflow-hidden cursor-pointer border-2 border-blue-500 shadow-lg shadow-blue-500/25 ring-2 ring-blue-500/30"
                  >
                    <img src={selectedCover} alt="Selected Custom Cover" className="w-full h-full object-cover" />
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                    <div className="absolute inset-x-0 bottom-0 p-1.5 bg-slate-950/80 backdrop-blur-sm text-[9px] text-blue-300 font-semibold truncate">
                      Custom Selected
                    </div>
                  </div>
                )}
                {coverOptions.map((opt, i) => {
                  const isSelected = selectedCover === opt.url;
                  return (
                    <div
                      key={`${opt.url}-${i}`}
                      onClick={() => setSelectedCover(opt.url)}
                      className={`group relative aspect-[2/3] rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                        isSelected
                          ? 'border-blue-500 shadow-lg shadow-blue-500/25 ring-2 ring-blue-500/30'
                          : 'border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <img src={opt.previewUrl} alt={opt.label} className="w-full h-full object-cover" />
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 p-1.5 bg-slate-950/80 backdrop-blur-sm text-[9px] text-slate-300 truncate">
                        {opt.source}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Wide Hero Banners (16:9) */}
          <div className="space-y-3 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                  <span>2. Page Background Banner (Wide 16:9 Aspect)</span>
                  <span className="text-[10px] text-purple-400 font-normal">Used on hero header</span>
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowBannerUrlInput(!showBannerUrlInput)}
                  className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border transition ${
                    showBannerUrlInput
                      ? 'bg-purple-600 text-white border-purple-500'
                      : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
                  }`}
                >
                  <LinkIcon className="w-3.5 h-3.5 text-purple-400" />
                  <span>Custom Web URL</span>
                </button>
                <button
                  type="button"
                  onClick={handleBrowseLocalBanner}
                  className="flex items-center gap-1 text-xs text-slate-300 hover:text-white bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                  <span>Upload from PC</span>
                </button>
              </div>
            </div>

            {/* Custom URL Input Bar for Banner */}
            {showBannerUrlInput && (
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-purple-500/40">
                <LinkIcon className="w-4 h-4 text-purple-400 shrink-0 ml-1" />
                <input
                  type="url"
                  placeholder="Paste direct online banner/wallpaper URL (https://...)"
                  value={customBannerUrl}
                  onChange={(e) => setCustomBannerUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyCustomBannerUrl()}
                  className="w-full bg-transparent text-xs text-slate-200 outline-none placeholder:text-slate-500"
                />
                <button
                  type="button"
                  onClick={handleApplyCustomBannerUrl}
                  disabled={!customBannerUrl.trim()}
                  className="px-3 py-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs font-semibold rounded-lg shrink-0 transition"
                >
                  Apply URL
                </button>
              </div>
            )}

            {loading ? (
              <div className="py-8 text-center text-xs text-slate-500">Searching wallpapers & screenshots...</div>
            ) : bannerOptions.length === 0 && !selectedBanner ? (
              <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 text-xs text-slate-400 text-center">
                No web wallpapers found automatically. You can upload an image from your PC.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {/* Custom uploaded or current banner if not in bannerOptions */}
                {selectedBanner && !bannerOptions.some((b) => b.url === selectedBanner) && (
                  <div
                    onClick={() => setSelectedBanner(selectedBanner)}
                    className="group relative aspect-[16/9] rounded-xl overflow-hidden cursor-pointer border-2 border-purple-500 shadow-lg shadow-purple-500/25 ring-2 ring-purple-500/30"
                  >
                    <img src={selectedBanner} alt="Selected Custom Banner" className="w-full h-full object-cover" />
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center shadow">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                    <div className="absolute inset-x-0 bottom-0 p-1.5 bg-slate-950/80 backdrop-blur-sm text-[9px] text-purple-300 font-semibold truncate">
                      Custom Selected Banner
                    </div>
                  </div>
                )}
                {bannerOptions.map((opt, i) => {
                  const isSelected = selectedBanner === opt.url;
                  return (
                    <div
                      key={`${opt.url}-${i}`}
                      onClick={() => setSelectedBanner(opt.url)}
                      className={`group relative aspect-[16/9] rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                        isSelected
                          ? 'border-purple-500 shadow-lg shadow-purple-500/25 ring-2 ring-purple-500/30'
                          : 'border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <img src={opt.previewUrl} alt={opt.label} className="w-full h-full object-cover" />
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center shadow">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 p-1.5 bg-slate-950/80 backdrop-blur-sm text-[9px] text-slate-300 truncate">
                        {opt.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 shrink-0">
          <div className="text-xs text-slate-400">
            Selected artwork will be cached locally on your computer.
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-blue-600/30 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Apply Selected Artwork</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
