import React, { useState, useEffect } from 'react';
import { Minus, Square, Copy, X, Search, Settings as SettingsIcon, Tv, Sparkles } from 'lucide-react';
import aegisLogo from '../assets/logos/aegis_logo.webp';

interface TitleBarProps {
  onSearchChange: (query: string) => void;
  searchQuery: string;
  onOpenSettings?: () => void;
  onOpenUpdateSettings?: () => void;
  onEnterBigPicture?: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = React.memo(({
  onSearchChange,
  searchQuery,
  onOpenSettings,
  onOpenUpdateSettings,
  onEnterBigPicture,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [updateAvailableTag, setUpdateAvailableTag] = useState<string | null>(null);

  useEffect(() => {
    if (window.api?.isMaximized) {
      window.api.isMaximized().then(setIsMaximized);
    }

    // Check updates silently in background on startup if autoCheckUpdates is enabled (default true)
    if (window.api?.checkForUpdates) {
      const runCheck = async () => {
        try {
          const settings = await window.api?.getSettings?.();
          if (settings && settings.autoCheckUpdates === false) {
            return; // Auto-updates disabled by user
          }
          const res = await window.api.checkForUpdates();
          if (res?.hasUpdate && res.latestVersion) {
            setUpdateAvailableTag(res.latestVersion);
          }
        } catch {}
      };
      runCheck();
    }
  }, []);

  const handleMinimize = () => {
    window.api?.windowMinimize();
  };

  const handleMaximize = async () => {
    window.api?.windowMaximize();
    if (window.api?.isMaximized) {
      const max = await window.api.isMaximized();
      setIsMaximized(max);
    }
  };

  const handleClose = () => {
    window.api?.windowClose();
  };

  return (
    <header className="app-drag-region h-11 bg-slate-950 border-b border-slate-800/80 flex items-center justify-between px-3 z-50 select-none">
      {/* Brand Logo & Name */}
      <div className="flex items-center gap-2.5 no-drag">
        <div className="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center shadow-lg shadow-blue-500/20 ring-1 ring-white/10 shrink-0 bg-slate-900/80">
          <img src={aegisLogo} alt="Aegis Hub" className="w-full h-full object-contain p-0.5" />
        </div>
        <span className="font-extrabold tracking-wider text-sm bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
          AEGIS HUB
        </span>
      </div>

      {/* Global Search Bar */}
      <div className="flex-1 max-w-md mx-6 no-drag">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search games, genres, platforms..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-slate-900/90 text-xs text-slate-200 placeholder-slate-500 pl-8 pr-8 py-1.5 rounded-full border border-slate-800 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 text-slate-500 hover:text-slate-300 text-xs"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Actions & Window Controls */}
      <div className="flex items-center gap-2 no-drag">
        {updateAvailableTag && (onOpenUpdateSettings || onOpenSettings) && (
          <button
            onClick={onOpenUpdateSettings || onOpenSettings}
            title={`Aegis Hub v${updateAvailableTag} is available! Click to update.`}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-emerald-300 hover:text-white bg-emerald-950/60 hover:bg-emerald-800/80 rounded-md border border-emerald-500/50 transition group shadow-sm animate-pulse cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span className="font-bold text-[11px]">Update v{updateAvailableTag}</span>
          </button>
        )}

        {onEnterBigPicture && (
          <button
            onClick={onEnterBigPicture}
            title="Enter Big Picture Mode (F11 / Alt+Enter / Gamepad Guide or Start)"
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-blue-300 hover:text-white bg-blue-600/20 hover:bg-blue-600/35 rounded-md border border-blue-500/35 transition group shadow-sm"
          >
            <Tv className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline font-bold">Big Picture</span>
            <kbd className="hidden md:inline-flex text-[9px] font-mono px-1 py-0.5 bg-blue-900/60 text-blue-200 border border-blue-500/30 rounded ml-0.5">
              F11
            </kbd>
          </button>
        )}

        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            title="Launcher Settings & Tools"
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 rounded-md border border-slate-800 transition group"
          >
            <SettingsIcon className="w-3.5 h-3.5 text-blue-400 group-hover:rotate-45 transition-transform duration-300" />
            <span className="hidden sm:inline font-medium">Settings</span>
          </button>
        )}

        <div className="h-4 w-[1px] bg-slate-800 mx-1" />

        {/* Window controls */}
        <div className="flex items-center">
          <button
            onClick={handleMinimize}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 rounded transition"
            title="Minimize"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleMaximize}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 rounded transition"
            title={isMaximized ? "Restore" : "Maximize"}
          >
            {isMaximized ? <Copy className="w-3 h-3" /> : <Square className="w-3 h-3" />}
          </button>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-red-600 rounded transition"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
});
