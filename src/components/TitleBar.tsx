import React, { useState, useEffect } from 'react';
import { Minus, Square, Copy, X, Gamepad2, Search, SlidersHorizontal, Sparkles } from 'lucide-react';

interface TitleBarProps {
  onSearchChange: (query: string) => void;
  searchQuery: string;
  onOpenScanner: () => void;
  onOpenStoreLinks: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  onSearchChange,
  searchQuery,
  onOpenScanner,
  onOpenStoreLinks,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (window.api?.isMaximized) {
      window.api.isMaximized().then(setIsMaximized);
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
    <header className="app-drag-region h-11 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between px-3 z-50 select-none">
      {/* Brand Logo & Name */}
      <div className="flex items-center gap-3 no-drag">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20 ring-1 ring-white/10">
          <Gamepad2 className="w-4 h-4 text-white" />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-extrabold tracking-wider text-sm bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            NEXUS
          </span>
          <span className="text-[10px] font-semibold tracking-widest uppercase px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
            LAUNCHER
          </span>
        </div>
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
        <button
          onClick={onOpenStoreLinks}
          title="Linked Game Stores"
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 rounded-md border border-slate-800 transition"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden sm:inline font-medium">Store Links</span>
        </button>

        <button
          onClick={onOpenScanner}
          title="Auto-scan PC for games"
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-blue-300 hover:text-blue-100 bg-blue-500/10 hover:bg-blue-500/20 rounded-md border border-blue-500/30 transition"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
          <span className="hidden sm:inline font-medium">Scan PC</span>
        </button>

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
};
