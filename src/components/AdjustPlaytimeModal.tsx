import React, { useState, useEffect } from 'react';
import { X, Clock, Calendar, Save, RotateCcw, Plus } from 'lucide-react';
import { formatPlaytime, formatRelativeDate, isoToDateInput, dateInputToIso } from '../utils/formatters';

interface AdjustPlaytimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameTitle: string;
  initialPlaytimeMinutes: number;
  initialLastPlayed?: string;
  onSave: (playtimeMinutes: number, lastPlayed?: string) => void;
}

export const AdjustPlaytimeModal: React.FC<AdjustPlaytimeModalProps> = ({
  isOpen,
  onClose,
  gameTitle,
  initialPlaytimeMinutes,
  initialLastPlayed,
  onSave,
}) => {
  const [hours, setHours] = useState<number>(0);
  const [minutes, setMinutes] = useState<number>(0);
  const [dateStr, setDateStr] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      const totalMinutes = Math.max(0, initialPlaytimeMinutes || 0);
      setHours(Math.floor(totalMinutes / 60));
      setMinutes(totalMinutes % 60);
      setDateStr(isoToDateInput(initialLastPlayed));
    }
  }, [isOpen, initialPlaytimeMinutes, initialLastPlayed]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentTotalMinutes = Math.max(0, (hours || 0) * 60 + (minutes || 0));
  const currentIsoDate = dateInputToIso(dateStr);

  const handleAddMinutes = (addedMinutes: number) => {
    const updated = Math.max(0, currentTotalMinutes + addedMinutes);
    setHours(Math.floor(updated / 60));
    setMinutes(updated % 60);
  };

  const handleSetPresetDate = (daysAgo: number | null) => {
    if (daysAgo === null) {
      setDateStr('');
      return;
    }
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setDateStr(`${y}-${m}-${day}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(currentTotalMinutes, currentIsoDate);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800/80 bg-slate-900/50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-blue-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-white leading-tight">Adjust Playtime & Activity</h2>
              <p className="text-xs text-slate-400 truncate mt-0.5">{gameTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-6">
          {/* Time Played Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                <span>Time Played</span>
              </label>
              <span className="text-xs font-mono font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                {formatPlaytime(currentTotalMinutes)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1 font-medium">Hours</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={hours}
                  onChange={(e) => setHours(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-sm font-mono text-white outline-none transition"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1 font-medium">Minutes</label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  step="1"
                  value={minutes}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10) || 0;
                    setMinutes(Math.max(0, Math.min(59, val)));
                  }}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-sm font-mono text-white outline-none transition"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Quick adjust chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => handleAddMinutes(30)}
                className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition flex items-center gap-1"
              >
                <Plus className="w-3 h-3 text-blue-400" /> 30m
              </button>
              <button
                type="button"
                onClick={() => handleAddMinutes(60)}
                className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition flex items-center gap-1"
              >
                <Plus className="w-3 h-3 text-blue-400" /> 1h
              </button>
              <button
                type="button"
                onClick={() => handleAddMinutes(300)}
                className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition flex items-center gap-1"
              >
                <Plus className="w-3 h-3 text-blue-400" /> 5h
              </button>
              <button
                type="button"
                onClick={() => handleAddMinutes(600)}
                className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition flex items-center gap-1"
              >
                <Plus className="w-3 h-3 text-blue-400" /> 10h
              </button>
              <button
                type="button"
                onClick={() => {
                  setHours(0);
                  setMinutes(0);
                }}
                className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-300 border border-slate-700/60 hover:border-red-500/30 transition flex items-center gap-1 ml-auto"
                title="Reset playtime to 0"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-800/80" />

          {/* Last Played Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-purple-400" />
                <span>Last Played</span>
              </label>
              <span className="text-xs font-semibold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                {formatRelativeDate(currentIsoDate)}
              </span>
            </div>

            <div>
              <input
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-lg px-3 py-2 text-sm text-white outline-none transition [color-scheme:dark]"
              />
            </div>

            {/* Quick preset date chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => handleSetPresetDate(0)}
                className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => handleSetPresetDate(1)}
                className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition"
              >
                Yesterday
              </button>
              <button
                type="button"
                onClick={() => handleSetPresetDate(7)}
                className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition"
              >
                1 Week Ago
              </button>
              <button
                type="button"
                onClick={() => handleSetPresetDate(null)}
                className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-300 border border-slate-700/60 hover:border-red-500/30 transition ml-auto"
              >
                Never (Clear)
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-blue-600/30 flex items-center gap-1.5 transition"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
