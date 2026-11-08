import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import {
  Gamepad2,
  Tv,
  Settings2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Plus,
  Play
} from 'lucide-react';
import { EmulatorConfig } from '../types/game';
import { getSystemLogo } from '../utils/emulatorSystems';
import { EmulatorSettingsModal } from './EmulatorSettingsModal';
import { useDragScroll } from '../hooks/useDragScroll';

interface SmoothScrollTask {
  targetLeft: number;
  rafId: number | null;
}

const activeShelfScrolls = new WeakMap<HTMLElement, SmoothScrollTask>();

function smoothScrollShelf(el: HTMLElement, deltaLeft: number) {
  let task = activeShelfScrolls.get(el);
  const maxLeft = Math.max(0, el.scrollWidth - el.clientWidth);
  const baseLeft = task && task.rafId !== null ? task.targetLeft : el.scrollLeft;
  const nextTarget = Math.max(0, Math.min(baseLeft + deltaLeft, maxLeft));

  if (!task) {
    task = { targetLeft: nextTarget, rafId: null };
    activeShelfScrolls.set(el, task);
  } else {
    task.targetLeft = nextTarget;
  }

  if (task.rafId !== null) return;

  const step = () => {
    const t = activeShelfScrolls.get(el);
    if (!t) return;
    const current = el.scrollLeft;
    const diff = t.targetLeft - current;
    if (Math.abs(diff) > 0.5) {
      el.scrollLeft = current + diff * 0.22;
      t.rafId = requestAnimationFrame(step);
    } else {
      el.scrollLeft = t.targetLeft;
      t.rafId = null;
    }
  };

  task.rafId = requestAnimationFrame(step);
}

interface EmulatorShelfProps {
  emulators: EmulatorConfig[];
  selectedEmulatorId: string | 'all';
  onSelectEmulatorId: (id: string | 'all') => void;
  onLaunchEmulator: (emulatorId: string, e: React.MouseEvent) => void;
  onScanEmulators: () => void;
  onUpdateEmulator?: (updated: EmulatorConfig) => void;
  onDuplicateEmulator?: (emulator: EmulatorConfig) => void;
  onDeleteEmulator?: (emulatorId: string) => void;
  onOpenSettingsTab?: (tab: 'emulation') => void;
  isScanning?: boolean;
}

export const EmulatorShelf: React.FC<EmulatorShelfProps> = React.memo(({
  emulators,
  selectedEmulatorId,
  onSelectEmulatorId,
  onLaunchEmulator,
  onScanEmulators,
  onUpdateEmulator,
  onDuplicateEmulator,
  onDeleteEmulator,
  onOpenSettingsTab,
  isScanning = false,
}) => {
  const [editingEmulator, setEditingEmulator] = useState<EmulatorConfig | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { isDragging } = useDragScroll(scrollRef);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Strictly filter only emulators that are active/enabled in Settings
  const activeEmulators = useMemo(
    () => emulators.filter((e) => e.enabled === true),
    [emulators]
  );

  const updateScrollButtons = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const nextLeft = scrollLeft > 10;
    const nextRight = scrollLeft < scrollWidth - clientWidth - 10;
    setCanScrollLeft((prev) => (prev !== nextLeft ? nextLeft : prev));
    setCanScrollRight((prev) => (prev !== nextRight ? nextRight : prev));
  }, []);

  useEffect(() => {
    updateScrollButtons();
    const el = scrollRef.current;
    if (!el) return;

    let rafId: number | null = null;
    const onScrollOrResize = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        updateScrollButtons();
      });
    };

    el.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      el.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [activeEmulators.length, updateScrollButtons]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = 520;
    smoothScrollShelf(scrollRef.current, direction === 'left' ? -scrollAmount : scrollAmount);
  };

  const handleOpenSettings = (emu: EmulatorConfig, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingEmulator(emu);
  };

  const handleAddNewEmulator = () => {
    const newConfig: EmulatorConfig = {
      id: `custom_emu_${Date.now()}`,
      name: 'Custom Emulator Instance',
      shortName: 'Custom',
      consoleName: 'Retro System',
      consoleCategory: 'other',
      installed: false,
      romPaths: [],
      gamesCount: 0,
      color: 'text-violet-400',
      badgeBg: 'bg-violet-500/15 border-violet-500/30 text-violet-300',
      isCustom: true,
      enabled: true,
      systemKey: 'custom',
    };
    setEditingEmulator(newConfig);
  };

  const totalRoms = useMemo(
    () => emulators.reduce((sum, e) => sum + (e.gamesCount || 0), 0),
    [emulators]
  );

  return (
    <section className="mb-6 select-none">
      {/* Shelf Header */}
      <div className="flex items-center justify-between mb-2.5 px-1">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-4 rounded-full bg-violet-500 shadow-sm shadow-violet-500/50" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <span>Configured Systems</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-violet-300 font-mono">
              {activeEmulators.length} active
            </span>
          </h2>
        </div>

        {/* Actions & Navigation Arrows */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAddNewEmulator}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition shadow-sm"
            title="Add a custom emulator instance"
          >
            <Plus className="w-3.5 h-3.5 text-violet-400" />
            <span className="hidden sm:inline">Add Custom</span>
          </button>

          <button
            type="button"
            onClick={onScanEmulators}
            disabled={isScanning}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 text-xs font-medium transition shadow-sm disabled:opacity-50"
            title="Rescan configured folders for newly added ROMs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isScanning ? 'Scanning...' : 'Rescan'}</span>
          </button>

          {/* Navigation Arrows */}
          <div className="flex items-center gap-1 ml-1">
            <button
              type="button"
              onClick={() => handleScroll('left')}
              disabled={!canScrollLeft}
              title="Previous systems"
              className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition disabled:opacity-25 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleScroll('right')}
              disabled={!canScrollRight}
              title="Next systems"
              className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition disabled:opacity-25 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Single Row Horizontal Scroll Container matching Recently Played */}
      <div
        ref={scrollRef}
        className={`flex items-center gap-3 overflow-x-auto py-1 px-0.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] cursor-grab active:cursor-grabbing ${
          isDragging ? 'cursor-grabbing select-none [&_*]:cursor-grabbing [&_*]:select-none' : ''
        }`}
      >
        {/* "All Systems" Aggregated Card */}
        <div
          onClick={() => onSelectEmulatorId('all')}
          className={`shrink-0 w-60 sm:w-64 h-24 rounded-xl relative group transition-[transform,border-color] duration-200 ease-out transform-gpu cursor-pointer border overflow-hidden ${
            selectedEmulatorId === 'all'
              ? 'bg-slate-900 border-violet-500 ring-2 ring-violet-500/40'
              : 'bg-slate-900/90 border-slate-800/90 hover:border-slate-700 hover:bg-slate-900'
          }`}
        >
          {/* Top right: Total ROM count */}
          <div className="absolute top-2 right-2 z-10 pointer-events-none">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-950/90 text-violet-300 border border-slate-800">
              {totalRoms}
            </span>
          </div>

          {/* Center visual: Stylized multi-system representation */}
          <div className="absolute inset-0 flex items-center justify-center p-3 pointer-events-none">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-violet-600/25 border border-violet-500/30 text-violet-300 flex items-center justify-center">
                <Tv className="w-4 h-4" />
              </div>
              <span
                className="text-sm font-black tracking-wider uppercase text-white transition-colors"
                style={{ textShadow: '0 0 10px rgba(255, 255, 255, 0.3)' }}
              >
                All Systems
              </span>
            </div>
          </div>
        </div>

        {/* Individual System / Emulator Cards */}
        {activeEmulators.map((emu) => {
          const isSelected = selectedEmulatorId === emu.id;
          const systemLogo = emu.customLogoUrl || getSystemLogo(emu.systemKey || emu.id || emu.consoleName);
          const isPlayable = Boolean(emu.installed && emu.executablePath);

          return (
            <div
              key={emu.id}
              onClick={() => onSelectEmulatorId(selectedEmulatorId === emu.id ? 'all' : emu.id)}
              className={`shrink-0 w-60 sm:w-64 h-24 rounded-xl relative group transition-[transform,border-color] duration-200 ease-out transform-gpu cursor-pointer border overflow-hidden ${
                isSelected
                  ? 'bg-slate-900 border-violet-500 ring-2 ring-violet-500/40'
                  : 'bg-slate-900/90 border-slate-800/90 hover:border-slate-700 hover:bg-slate-900'
              }`}
            >
              {/* Top right: Number of games */}
              <div className="absolute top-2 right-2 z-10 pointer-events-none">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-950/90 text-slate-300 border border-slate-800">
                  {emu.gamesCount}
                </span>
              </div>

              {/* Center: System Logo filling the card prominently with minimal margins */}
              <div className="absolute inset-0 flex items-center justify-center p-2 sm:p-2.5 pointer-events-none">
                <img
                  src={systemLogo}
                  alt={emu.consoleName || emu.name}
                  decoding="async"
                  className="w-full h-full max-h-[82%] object-contain transition-transform duration-200 ease-out will-change-transform group-hover:scale-105"
                  style={{
                    filter: isSelected
                      ? 'drop-shadow(0 0 6px rgba(255, 255, 255, 0.85))'
                      : 'drop-shadow(0 0 3px rgba(255, 255, 255, 0.35))',
                  }}
                />
              </div>

              {/* Bottom right: Play button (launches emulator directly, greyed out if not installed) */}
              <div className="absolute bottom-2 right-2 z-10">
                {isPlayable ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onLaunchEmulator(emu.id, e);
                    }}
                    title={`Launch ${emu.name || 'Emulator'}`}
                    className="w-7 h-7 rounded-lg bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center transition-transform duration-150 transform-gpu shadow-md hover:scale-105 active:scale-95"
                  >
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    title="Emulator not installed or configured in Settings"
                    className="w-7 h-7 rounded-lg bg-slate-800/80 border border-slate-700/40 text-slate-500 flex items-center justify-center cursor-not-allowed opacity-40"
                  >
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {activeEmulators.length === 0 && (
          <div className="flex items-center justify-between w-full p-4 rounded-xl bg-slate-900/60 border border-dashed border-slate-800 text-slate-400 text-xs">
            <span>No emulation systems currently activated.</span>
            {onOpenSettingsTab && (
              <button
                type="button"
                onClick={() => onOpenSettingsTab('emulation')}
                className="px-3 py-1 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium transition"
              >
                Activate Systems in Settings
              </button>
            )}
          </div>
        )}
      </div>

      {/* Emulator Configuration Modal */}
      {editingEmulator && (
        <EmulatorSettingsModal
          emulator={editingEmulator}
          isOpen={Boolean(editingEmulator)}
          onClose={() => setEditingEmulator(null)}
          onSave={(updated) => {
            if (onUpdateEmulator) onUpdateEmulator(updated);
            setEditingEmulator(null);
          }}
          onDuplicate={(dup) => {
            if (onDuplicateEmulator) onDuplicateEmulator(dup);
            setEditingEmulator(null);
          }}
          onDelete={(id) => {
            if (onDeleteEmulator) onDeleteEmulator(id);
            setEditingEmulator(null);
          }}
        />
      )}
    </section>
  );
});
