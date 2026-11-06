import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Image as ImageIcon, Sparkles, Download, Check } from 'lucide-react';
import { Game } from '../types/game';

export interface GameScreenshotItem {
  id: number;
  thumbnail: string;
  full: string;
}

interface GameGalleryModalProps {
  game: Game;
  screenshots: GameScreenshotItem[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  onSetBanner?: (url: string) => void;
}

export const GameGalleryModal: React.FC<GameGalleryModalProps> = ({
  game,
  screenshots,
  initialIndex = 0,
  isOpen,
  onClose,
  onSetBanner,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [bannerApplied, setBannerApplied] = useState(false);
  const [loadingImg, setLoadingImg] = useState(false);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, screenshots.length]);

  if (!isOpen || screenshots.length === 0) return null;

  const current = screenshots[currentIndex];

  const handlePrev = () => {
    setBannerApplied(false);
    setLoadingImg(true);
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : screenshots.length - 1));
  };

  const handleNext = () => {
    setBannerApplied(false);
    setLoadingImg(true);
    setCurrentIndex((prev) => (prev < screenshots.length - 1 ? prev + 1 : 0));
  };

  const handleApplyBanner = () => {
    if (onSetBanner && current) {
      onSetBanner(current.full);
      setBannerApplied(true);
      setTimeout(() => setBannerApplied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950/95 backdrop-blur-2xl select-none animate-fade-in overflow-hidden">
      {/* Top Bar */}
      <div className="h-16 border-b border-slate-800/80 px-6 flex items-center justify-between shrink-0 bg-slate-950/80">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <ImageIcon className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white leading-none">{game.title}</h2>
            <p className="text-[11px] text-slate-400 mt-1">Official Store Gallery</p>
          </div>
        </div>

        {/* Center counter */}
        <div className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono font-medium text-slate-300">
          {currentIndex + 1} / {screenshots.length}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {onSetBanner && (
            <button
              onClick={handleApplyBanner}
              disabled={bannerApplied}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition border ${
                bannerApplied
                  ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700 hover:border-slate-600'
              }`}
              title="Set current screenshot as game hero banner wallpaper"
            >
              {bannerApplied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
              <span>{bannerApplied ? 'Banner Applied' : 'Set as Banner'}</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700/80 flex items-center justify-center transition"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Preview Area */}
      <div className="flex-1 relative flex items-center justify-center p-4 sm:p-8 overflow-hidden">
        {/* Left Arrow */}
        <button
          onClick={handlePrev}
          className="absolute left-4 sm:left-8 z-20 w-12 h-12 rounded-full bg-slate-950/70 hover:bg-blue-600 text-slate-300 hover:text-white border border-slate-700 hover:border-blue-500 flex items-center justify-center transition shadow-2xl backdrop-blur-md transform hover:scale-105 active:scale-95"
          title="Previous image (Left Arrow)"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Active Full Image */}
        <div className="relative max-w-full max-h-full flex items-center justify-center">
          <img
            key={current.full}
            src={current.full}
            alt={`${game.title} screenshot ${currentIndex + 1}`}
            onLoad={() => setLoadingImg(false)}
            className="max-h-[72vh] max-w-[92vw] object-contain rounded-xl shadow-2xl border border-slate-800/80 select-none transition-opacity duration-300"
          />
        </div>

        {/* Right Arrow */}
        <button
          onClick={handleNext}
          className="absolute right-4 sm:right-8 z-20 w-12 h-12 rounded-full bg-slate-950/70 hover:bg-blue-600 text-slate-300 hover:text-white border border-slate-700 hover:border-blue-500 flex items-center justify-center transition shadow-2xl backdrop-blur-md transform hover:scale-105 active:scale-95"
          title="Next image (Right Arrow)"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Bottom Thumbnail Strip */}
      <div className="h-24 border-t border-slate-800/80 bg-slate-950/90 px-6 flex items-center gap-3 overflow-x-auto shrink-0 scrollbar-thin">
        {screenshots.map((s, idx) => (
          <button
            key={s.id || idx}
            onClick={() => {
              setBannerApplied(false);
              setCurrentIndex(idx);
            }}
            className={`relative h-16 aspect-video rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
              idx === currentIndex
                ? 'border-blue-500 ring-2 ring-blue-500/50 scale-105 z-10'
                : 'border-slate-800 opacity-60 hover:opacity-100 hover:border-slate-600'
            }`}
          >
            <img src={s.thumbnail} alt="" className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
};
