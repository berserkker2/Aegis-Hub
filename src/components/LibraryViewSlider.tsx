import React from 'react';
import { List, Grid2X2, LayoutGrid } from 'lucide-react';

export type ViewMode = 'list' | 'icons' | 'grid';

export interface LibraryViewSliderProps {
  value: number; // 0 to 100
  onChange: (value: number) => void;
  accentColor?: 'blue' | 'violet';
}

export function getViewMode(val: number): ViewMode {
  if (val < 15) return 'list';
  if (val < 35) return 'icons';
  return 'grid';
}

export function getThumbnailWidth(val: number): number {
  const clamped = Math.max(35, Math.min(100, val));
  const ratio = (clamped - 35) / 65;
  // Scales between 145px (compact poster) and 285px (large poster)
  return Math.round(145 + ratio * 140);
}

export const LibraryViewSlider: React.FC<LibraryViewSliderProps> = ({
  value,
  onChange,
  accentColor = 'blue',
}) => {
  const currentMode = getViewMode(value);
  const isViolet = accentColor === 'violet';
  const activeTextClass = isViolet ? 'text-violet-400' : 'text-blue-400';
  const activeBgClass = isViolet ? 'bg-violet-600' : 'bg-blue-600';

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = Number(e.target.value);
    // Hard stops for List (0) and Icons (25)
    if (rawVal < 15) {
      onChange(0);
    } else if (rawVal < 35) {
      onChange(25);
    } else {
      onChange(rawVal);
    }
  };

  const getModeLabel = () => {
    if (currentMode === 'list') return 'List View';
    if (currentMode === 'icons') return 'Icon View';
    return `Grid View (${getThumbnailWidth(value)}px)`;
  };

  return (
    <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 select-none">
      {/* Quick Jump Buttons */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => onChange(0)}
          title="List View (Table)"
          className={`p-1 rounded transition-colors ${
            currentMode === 'list'
              ? `bg-slate-800 ${activeTextClass}`
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <List className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => onChange(25)}
          title="Icon View (Compact)"
          className={`p-1 rounded transition-colors ${
            currentMode === 'icons'
              ? `bg-slate-800 ${activeTextClass}`
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Grid2X2 className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => onChange(value < 35 ? 65 : value)}
          title="Grid View (Posters)"
          className={`p-1 rounded transition-colors ${
            currentMode === 'grid'
              ? `bg-slate-800 ${activeTextClass}`
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Vertical separator */}
      <div className="h-4 w-px bg-slate-800" />

      {/* Slider Track with hard-stop snaps & smooth resize */}
      <div className="relative flex items-center w-24 sm:w-28 group" title={getModeLabel()}>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={value}
          onChange={handleSliderChange}
          className={`w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer view-slider ${
            isViolet ? 'slider-violet' : ''
          }`}
        />

        {/* Small subtle visual markers for hard stops */}
        <div className="absolute left-0 w-1.5 h-1.5 rounded-full bg-slate-700 pointer-events-none -translate-x-0.5" />
        <div className="absolute left-[25%] w-1.5 h-1.5 rounded-full bg-slate-700 pointer-events-none -translate-x-0.5" />
      </div>
    </div>
  );
};
