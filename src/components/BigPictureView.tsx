import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Play,
  Star,
  Info,
  Search,
  Gamepad2,
  Tv,
  Clock,
  HardDrive,
  Layers,
  Sparkles,
  LogOut,
  Volume2,
  VolumeX,
  X,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Image as ImageIcon,
  CheckCircle2,
  Minimize2,
  Maximize2,
  Flame,
  ArrowRight,
  Keyboard,
  SlidersHorizontal,
  Filter,
  RotateCcw,
  ArrowUpDown,
  Check,
  LayoutGrid,
  Sliders,
  Power,
  Moon,
  XCircle
} from 'lucide-react';
import { Game, GamePlatform, LauncherSettings, EmulatorConfig, CustomApp } from '../types/game';
import { formatPlaytime, formatRelativeDate, getPlatformBadge } from '../utils/formatters';
import { GameImage } from './GameImage';
import { PlatformBadge } from './PlatformBadge';
import { getSystemLogo, getSystemDefinition } from '../utils/emulatorSystems';
import {
  useGamepadNavigation,
  GamepadNavCallbacks,
  InputDeviceType
} from '../hooks/useGamepadNavigation';
import {
  playNavMoveSound,
  playNavSelectSound,
  playNavBackSound,
  playLaunchGameSound,
  isBigPictureSoundEnabled,
  setBigPictureSoundEnabled
} from '../utils/bigPictureSound';
import aegisLogo from '../assets/logos/aegis_logo_w.webp';

function cleanGameDescription(text?: string, preserveParagraphs = false): string {
  if (!text) return '';
  const cleaned = text
    .replace(/\[\/?(?:b|i|u|h\d|img|imgvid|url|quote|code|spoiler)[^\]]*\]/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '');
  if (!preserveParagraphs) {
    return cleaned.replace(/\s+/g, ' ').trim();
  }
  return cleaned.replace(/\n{3,}/g, '\n\n').trim();
}

interface ControllerGlyphProps {
  type: InputDeviceType;
  action: 'confirm' | 'back' | 'details' | 'favorite' | 'filter' | 'tabs' | 'navigate' | 'menu';
  className?: string;
}

const ControllerGlyph: React.FC<ControllerGlyphProps> = React.memo(({ type, action, className = '' }) => {
  if (type === 'keyboard') {
    switch (action) {
      case 'confirm':
        return (
          <kbd className={`px-1.5 py-0.5 rounded bg-slate-800 text-blue-400 border border-slate-600 font-mono text-[10px] font-bold shadow ${className}`}>
            Enter
          </kbd>
        );
      case 'back':
        return (
          <kbd className={`px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-600 font-mono text-[10px] font-bold shadow ${className}`}>
            Esc
          </kbd>
        );
      case 'details':
        return (
          <kbd className={`w-5 h-5 rounded bg-slate-800 text-purple-400 border border-slate-600 font-mono text-[10px] font-bold inline-flex items-center justify-center shadow ${className}`}>
            D
          </kbd>
        );
      case 'favorite':
        return (
          <kbd className={`w-5 h-5 rounded bg-slate-800 text-amber-400 border border-slate-600 font-mono text-[10px] font-bold inline-flex items-center justify-center shadow ${className}`}>
            F
          </kbd>
        );
      case 'filter':
        return (
          <kbd className={`w-5 h-5 rounded bg-slate-800 text-blue-400 border border-slate-600 font-mono text-[10px] font-bold inline-flex items-center justify-center shadow ${className}`}>
            Y
          </kbd>
        );
      case 'tabs':
        return (
          <kbd className={`px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-600 font-mono text-[10px] font-bold shadow ${className}`}>
            Q / E
          </kbd>
        );
      case 'navigate':
        return (
          <kbd className={`px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-600 font-mono text-[10px] font-bold shadow ${className}`}>
            ↑ ↓ ← →
          </kbd>
        );
      case 'menu':
        return (
          <kbd className={`px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-600 font-mono text-[10px] font-bold shadow ${className}`}>
            M
          </kbd>
        );
    }
  }

  if (type === 'playstation') {
    switch (action) {
      case 'confirm':
        return (
          <span className={`w-5 h-5 rounded-full bg-blue-600 text-blue-100 font-bold text-[11px] inline-flex items-center justify-center shadow border border-blue-400/40 ${className}`}>
            ✕
          </span>
        );
      case 'back':
        return (
          <span className={`w-5 h-5 rounded-full bg-rose-600 text-rose-100 font-bold text-[11px] inline-flex items-center justify-center shadow border border-rose-400/40 ${className}`}>
            ○
          </span>
        );
      case 'details':
        return (
          <span className={`w-5 h-5 rounded-full bg-pink-600 text-pink-100 font-bold text-[11px] inline-flex items-center justify-center shadow border border-pink-400/40 ${className}`}>
            □
          </span>
        );
      case 'favorite':
      case 'filter':
        return (
          <span className={`w-5 h-5 rounded-full bg-emerald-600 text-emerald-100 font-bold text-[11px] inline-flex items-center justify-center shadow border border-emerald-400/40 ${className}`}>
            △
          </span>
        );
      case 'tabs':
        return (
          <span className={`px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold text-[10px] border border-slate-700 shadow ${className}`}>
            L1 / R1
          </span>
        );
      case 'navigate':
        return (
          <span className={`px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold text-[10px] border border-slate-700 shadow ${className}`}>
            D-Pad / L-Stick
          </span>
        );
      case 'menu':
        return (
          <span className={`px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold text-[10px] border border-slate-700 shadow ${className}`}>
            Options
          </span>
        );
    }
  }

  if (type === 'switch') {
    switch (action) {
      case 'confirm':
        return (
          <span className={`w-5 h-5 rounded-full bg-red-600 text-white font-bold text-[10px] inline-flex items-center justify-center shadow border border-red-400/30 ${className}`}>
            A
          </span>
        );
      case 'back':
        return (
          <span className={`w-5 h-5 rounded-full bg-slate-700 text-white font-bold text-[10px] inline-flex items-center justify-center shadow border border-slate-500/30 ${className}`}>
            B
          </span>
        );
      case 'details':
      case 'filter':
        return (
          <span className={`w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[10px] inline-flex items-center justify-center shadow border border-blue-400/30 ${className}`}>
            X
          </span>
        );
      case 'favorite':
        return (
          <span className={`w-5 h-5 rounded-full bg-amber-500 text-white font-bold text-[10px] inline-flex items-center justify-center shadow border border-amber-400/30 ${className}`}>
            Y
          </span>
        );
      case 'tabs':
        return (
          <span className={`px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold text-[10px] border border-slate-700 shadow ${className}`}>
            L / R
          </span>
        );
      case 'navigate':
        return (
          <span className={`px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold text-[10px] border border-slate-700 shadow ${className}`}>
            D-Pad / Stick
          </span>
        );
      case 'menu':
        return (
          <span className={`px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold text-[10px] border border-slate-700 shadow ${className}`}>
            +
          </span>
        );
    }
  }

  // Default: Xbox
  switch (action) {
    case 'confirm':
      return (
        <span className={`w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[10px] inline-flex items-center justify-center shadow border border-emerald-400/30 ${className}`}>
          A
        </span>
      );
    case 'back':
      return (
        <span className={`w-5 h-5 rounded-full bg-red-600 text-white font-bold text-[10px] inline-flex items-center justify-center shadow border border-red-400/30 ${className}`}>
          B
        </span>
      );
    case 'details':
      return (
        <span className={`w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[10px] inline-flex items-center justify-center shadow border border-blue-400/30 ${className}`}>
          X
        </span>
      );
    case 'favorite':
    case 'filter':
      return (
        <span className={`w-5 h-5 rounded-full bg-amber-500 text-white font-bold text-[10px] inline-flex items-center justify-center shadow border border-amber-400/30 ${className}`}>
          Y
        </span>
      );
    case 'tabs':
      return (
        <span className={`px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold text-[10px] border border-slate-700 shadow ${className}`}>
          LB / RB
        </span>
      );
    case 'navigate':
      return (
        <span className={`px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold text-[10px] border border-slate-700 shadow ${className}`}>
          D-Pad / Stick
        </span>
      );
    case 'menu':
      return (
        <span className={`px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold text-[10px] border border-slate-700 shadow ${className}`}>
          Start
        </span>
      );
  }
});

interface SmoothScrollTask {
  targetLeft?: number;
  targetTop?: number;
  rafId: number | null;
}

const activeSmoothScrolls = new WeakMap<HTMLElement, SmoothScrollTask>();

/**
 * High-performance continuous lerp scroll that maintains momentum across rapid
 * key/gamepad navigation instead of resetting velocity to 0 like browser `behavior: 'smooth'`.
 */
function smoothScrollElement(
  el: HTMLElement,
  options: { left?: number; top?: number }
) {
  let task = activeSmoothScrolls.get(el);
  if (!task) {
    task = { rafId: null };
    activeSmoothScrolls.set(el, task);
  }

  if (options.left !== undefined) {
    const maxLeft = Math.max(0, el.scrollWidth - el.clientWidth);
    task.targetLeft = Math.max(0, Math.min(options.left, maxLeft));
  }
  if (options.top !== undefined) {
    const maxTop = Math.max(0, el.scrollHeight - el.clientHeight);
    task.targetTop = Math.max(0, Math.min(options.top, maxTop));
  }

  if (task.rafId !== null) return;

  const step = () => {
    const t = activeSmoothScrolls.get(el);
    if (!t) return;

    let keepGoing = false;

    if (t.targetLeft !== undefined) {
      const currentLeft = el.scrollLeft;
      const diffLeft = t.targetLeft - currentLeft;
      if (Math.abs(diffLeft) > 0.5) {
        el.scrollLeft = currentLeft + diffLeft * 0.2;
        keepGoing = true;
      } else {
        el.scrollLeft = t.targetLeft;
        t.targetLeft = undefined;
      }
    }

    if (t.targetTop !== undefined) {
      const currentTop = el.scrollTop;
      const diffTop = t.targetTop - currentTop;
      if (Math.abs(diffTop) > 0.5) {
        el.scrollTop = currentTop + diffTop * 0.2;
        keepGoing = true;
      } else {
        el.scrollTop = t.targetTop;
        t.targetTop = undefined;
      }
    }

    if (keepGoing) {
      t.rafId = requestAnimationFrame(step);
    } else {
      t.rafId = null;
    }
  };

  task.rafId = requestAnimationFrame(step);
}

interface LibraryGameCardProps {
  game: Game;
  isFocused: boolean;
  idx: number;
  prefix: string;
  ringColor?: string;
  onFocus: (idx: number) => void;
  onLaunch: (game: Game) => void;
  onRegisterRef: (key: string, el: HTMLDivElement | null) => void;
  showPlatformBadge?: boolean;
}

const LibraryGameCard = React.memo<LibraryGameCardProps>(({
  game,
  isFocused,
  idx,
  prefix,
  ringColor = 'blue',
  onFocus,
  onLaunch,
  onRegisterRef,
  showPlatformBadge = true,
}) => {
  return (
    <div
      ref={(el) => onRegisterRef(`${prefix}-0-${idx}`, el)}
      onClick={() => onFocus(idx)}
      onDoubleClick={() => onLaunch(game)}
      className={`group relative rounded-[1vh] overflow-hidden cursor-pointer select-none transition-transform duration-200 ease-out will-change-transform ${
        isFocused
          ? ringColor === 'violet'
            ? 'scale-[1.06] border-2 border-violet-400 shadow-[0_0_25px_rgba(139,92,246,0.45),0_10px_25px_rgba(0,0,0,0.85)] z-20'
            : 'scale-[1.06] border-2 border-white/40 shadow-[0_0_25px_rgba(59,130,246,0.45),0_10px_25px_rgba(0,0,0,0.85)] z-20'
          : 'scale-100 hover:scale-[1.02] border border-slate-800/80 z-0'
      }`}
    >
      <div className="aspect-[2/3] w-full bg-slate-900 relative">
        <GameImage
          src={game.coverUrl}
          alt={game.title}
          title={game.title}
          platform={game.platform}
          type="cover"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-90 pointer-events-none" />
        {showPlatformBadge && (
          <div className="absolute top-[0.8vh] left-[0.8vh] z-10 pointer-events-none scale-90 origin-top-left">
            <PlatformBadge platform={game.platform} size="xs" />
          </div>
        )}
        {game.favorite && (
          <div className="absolute top-[0.8vh] right-[0.8vh] z-10 w-[2.2vh] h-[2.2vh] rounded-full bg-slate-950/85 flex items-center justify-center border border-amber-500/40 pointer-events-none">
            <Star className="w-[1.2vh] h-[1.2vh] fill-amber-400 text-amber-400" />
          </div>
        )}
        <div className="absolute bottom-[0.8vh] left-[1vh] right-[1vh] pointer-events-none">
          <h3 className="text-[1.25vh] font-bold text-white truncate leading-tight">
            {game.title}
          </h3>
          {game.playtimeMinutes !== undefined && game.playtimeMinutes > 0 && (
            <div className="text-[1.05vh] text-slate-400 mt-[0.3vh]">
              {formatPlaytime(game.playtimeMinutes)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

interface HomeGameCardProps {
  game: Game;
  rowIdx: number;
  idx: number;
  isFocused: boolean;
  isRowFocused: boolean;
  /** -1 = left of focused card in active row, 0 = focused or inactive row, 1 = right of focused card in active row */
  shiftDir: -1 | 0 | 1;
  onFocus: (rowIdx: number, idx: number) => void;
  onLaunch: (game: Game) => void;
  onRegisterRef: (key: string, el: HTMLDivElement | null) => void;
  showPlatformBadge?: boolean;
}

const HomeGameCard = React.memo<HomeGameCardProps>(({
  game,
  rowIdx,
  idx,
  isFocused,
  isRowFocused,
  shiftDir,
  onFocus,
  onLaunch,
  onRegisterRef,
  showPlatformBadge = true,
}) => {
  // Pure GPU-composited transform (scale + translate) with viewport-relative sizing (vh-based)
  // Large & prominent TV-scale cards guaranteeing 2 full visible rows without overflowing!
  let transformClasses: string;
  if (isFocused) {
    transformClasses =
      'scale-[1.06] -translate-y-[0.8vh] z-30 border-2 border-white/40 shadow-[0_0_28px_rgba(59,130,246,0.5),0_14px_32px_rgba(0,0,0,0.9)]';
  } else if (isRowFocused) {
    const shiftClass = shiftDir === -1 ? '-translate-x-[0.6vw]' : shiftDir === 1 ? 'translate-x-[0.6vw]' : '';
    transformClasses = `scale-[0.95] ${shiftClass} hover:scale-[0.98] border border-slate-800/80 z-10`;
  } else {
    transformClasses = 'scale-[0.90] origin-top opacity-65 hover:opacity-85 border border-slate-800/60 z-0';
  }

  return (
    <div
      ref={(el) => onRegisterRef(`home-${rowIdx}-${idx}`, el)}
      onClick={() => onFocus(rowIdx, idx)}
      onDoubleClick={() => onLaunch(game)}
      className={`group relative flex-shrink-0 w-[18.5vh] max-w-[18vw] rounded-[1.2vh] overflow-hidden cursor-pointer select-none transition-transform duration-[240ms] ease-out will-change-transform ${transformClasses}`}
    >
      {/* Poster */}
      <div className="aspect-[2/3] w-full bg-slate-900 relative">
        <GameImage
          src={game.coverUrl}
          alt={game.title}
          title={game.title}
          platform={game.platform}
          type="cover"
          className="w-full h-full object-cover"
        />

        {/* Clean bottom gradient shadow for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/25 to-transparent opacity-95 pointer-events-none" />

        {/* Platform badge */}
        {showPlatformBadge && (
          <div className="absolute top-[0.9vh] left-[0.9vh] z-10 pointer-events-none scale-100 origin-top-left">
            <PlatformBadge platform={game.platform} size="xs" />
          </div>
        )}

        {/* Favorite star */}
        {game.favorite && (
          <div className="absolute top-[0.9vh] right-[0.9vh] z-10 w-[2.6vh] h-[2.6vh] rounded-full bg-slate-950/85 flex items-center justify-center border border-amber-500/40 pointer-events-none shadow">
            <Star className="w-[1.4vh] h-[1.4vh] fill-amber-400 text-amber-400" />
          </div>
        )}

        {/* Bottom info */}
        <div className="absolute bottom-[0.9vh] left-[1.1vh] right-[1.1vh] pointer-events-none">
          <h3 className="text-[1.45vh] font-bold text-white truncate leading-tight">
            {game.title}
          </h3>
          <div className="flex items-center justify-between text-[1.2vh] text-slate-300 mt-[0.3vh]">
            <span className="truncate">
              {game.playtimeMinutes && game.playtimeMinutes > 0
                ? formatPlaytime(game.playtimeMinutes)
                : 'Not played'}
            </span>
            {game.installed !== false && (
              <span
                className="w-[0.9vh] h-[0.9vh] rounded-full bg-emerald-400 shrink-0 ml-[0.6vh]"
                title="Installed"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

interface VirtualKeyItem {
  id: string;
  label: string;
  value?: string;
  action?: 'caps' | 'space' | 'backspace' | 'clear' | 'done';
  widthClass?: string;
}

const VK_ROWS: VirtualKeyItem[][] = [
  // Row 0: Numbers
  [
    { id: '1', label: '1', value: '1' },
    { id: '2', label: '2', value: '2' },
    { id: '3', label: '3', value: '3' },
    { id: '4', label: '4', value: '4' },
    { id: '5', label: '5', value: '5' },
    { id: '6', label: '6', value: '6' },
    { id: '7', label: '7', value: '7' },
    { id: '8', label: '8', value: '8' },
    { id: '9', label: '9', value: '9' },
    { id: '0', label: '0', value: '0' },
  ],
  // Row 1: QWERTY Row 1
  [
    { id: 'q', label: 'Q', value: 'q' },
    { id: 'w', label: 'W', value: 'w' },
    { id: 'e', label: 'E', value: 'e' },
    { id: 'r', label: 'R', value: 'r' },
    { id: 't', label: 'T', value: 't' },
    { id: 'y', label: 'Y', value: 'y' },
    { id: 'u', label: 'U', value: 'u' },
    { id: 'i', label: 'I', value: 'i' },
    { id: 'o', label: 'O', value: 'o' },
    { id: 'p', label: 'P', value: 'p' },
  ],
  // Row 2: QWERTY Row 2
  [
    { id: 'a', label: 'A', value: 'a' },
    { id: 's', label: 'S', value: 's' },
    { id: 'd', label: 'D', value: 'd' },
    { id: 'f', label: 'F', value: 'f' },
    { id: 'g', label: 'G', value: 'g' },
    { id: 'h', label: 'H', value: 'h' },
    { id: 'j', label: 'J', value: 'j' },
    { id: 'k', label: 'K', value: 'k' },
    { id: 'l', label: 'L', value: 'l' },
    { id: 'dash', label: '-', value: '-' },
  ],
  // Row 3: QWERTY Row 3
  [
    { id: 'z', label: 'Z', value: 'z' },
    { id: 'x', label: 'X', value: 'x' },
    { id: 'c', label: 'C', value: 'c' },
    { id: 'v', label: 'V', value: 'v' },
    { id: 'b', label: 'B', value: 'b' },
    { id: 'n', label: 'N', value: 'n' },
    { id: 'm', label: 'M', value: 'm' },
    { id: 'dot', label: '.', value: '.' },
    { id: 'colon', label: ':', value: ':' },
    { id: 'slash', label: '/', value: '/' },
  ],
  // Row 4: Action Keys
  [
    { id: 'caps', label: 'CAPS', action: 'caps', widthClass: 'w-[6.2vw]' },
    { id: 'clear', label: 'Limpar', action: 'clear', widthClass: 'w-[6.2vw]' },
    { id: 'space', label: 'ESPAÇO', action: 'space', widthClass: 'flex-1 min-w-[10vw]' },
    { id: 'backspace', label: '⌫ Apagar', action: 'backspace', widthClass: 'w-[7.5vw]' },
    { id: 'done', label: 'Concluir ↵', action: 'done', widthClass: 'w-[8.5vw]' },
  ],
];

interface BigPictureViewProps {
  games: Game[];
  emulators?: EmulatorConfig[];
  settings: LauncherSettings;
  onLaunchGame: (game: Game) => void;
  onToggleFavorite: (gameId: string) => void;
  onExitBigPicture: () => void;
  onOpenSettings?: (tab?: 'defaults' | 'stores' | 'tools' | 'emulation' | 'apps' | 'about') => void;
  onUpdateGame?: (game: Game) => void;
}

type BigPictureTab = 'home' | 'library' | 'emulators' | 'search';
type FilterModalSection = 'platforms' | 'sort' | 'status' | 'year' | 'genres' | 'actions';

export const BigPictureView: React.FC<BigPictureViewProps> = ({
  games,
  emulators = [],
  settings,
  onLaunchGame,
  onToggleFavorite,
  onExitBigPicture,
  onOpenSettings,
  onUpdateGame,
}) => {
  const [activeTab, setActiveTab] = useState<BigPictureTab>('home');
  const [focusedRow, setFocusedRow] = useState<number>(0); // 0: hero actions, 1+: carousels
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [selectedGameForDetails, setSelectedGameForDetails] = useState<Game | null>(null);
  const [isFetchingDetailsMetadata, setIsFetchingDetailsMetadata] = useState(false);

  // Big Picture Windows-style Apps & Tools Menu State
  const [isAppMenuOpen, setIsAppMenuOpen] = useState(false);
  const [appMenuFocusedIndex, setAppMenuFocusedIndex] = useState(0);
  const [appSearchQuery, setAppSearchQuery] = useState('');
  const [appLaunchToast, setAppLaunchToast] = useState<string | null>(null);
  const appGridRef = useRef<HTMLDivElement>(null);

  // Power & Exit Modal State
  const [isPowerMenuOpen, setIsPowerMenuOpen] = useState(false);
  const [powerMenuFocusedIndex, setPowerMenuFocusedIndex] = useState(0);
  const [pendingPowerAction, setPendingPowerAction] = useState<'shutdown' | 'restart' | null>(null);
  const [powerConfirmIndex, setPowerConfirmIndex] = useState<number>(0);

  // Search tab focus & typing states
  const [isSearchInputActive, setIsSearchInputActive] = useState(false);
  const [searchFocusTarget, setSearchFocusTarget] = useState<'input' | 'grid'>('input');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // On-Screen Virtual Keyboard state (Gamepad / Controller Search)
  const [isVirtualKeyboardOpen, setIsVirtualKeyboardOpen] = useState(false);
  const [vkRow, setVkRow] = useState(1); // start on Q row
  const [vkCol, setVkCol] = useState(4); // start on T
  const [isVkCaps, setIsVkCaps] = useState(false);

  // Mouse idle / autohide state for controller and keyboard immersion
  const [isMouseIdle, setIsMouseIdle] = useState(false);
  const mouseIdleTimerRef = useRef<number | null>(null);

  const showPlatformBadges = settings?.showPlatformBadges !== false;

  useEffect(() => {
    const handleMouseMove = () => {
      setIsMouseIdle(false);
      if (mouseIdleTimerRef.current) {
        window.clearTimeout(mouseIdleTimerRef.current);
      }
      mouseIdleTimerRef.current = window.setTimeout(() => {
        setIsMouseIdle(true);
      }, 3000);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (mouseIdleTimerRef.current) {
        window.clearTimeout(mouseIdleTimerRef.current);
      }
    };
  }, []);

  const powerOptions = useMemo(() => [
    {
      id: 'exit',
      label: 'Sair do Big Picture',
      sublabel: 'Voltar ao modo de janela desktop normal',
      icon: LogOut,
      activeTheme: 'border-blue-500 bg-blue-950/70 text-white ring-2 ring-blue-500/50 shadow-lg shadow-blue-500/20'
    },
    {
      id: 'quit',
      label: 'Fechar Aplicação',
      sublabel: 'Encerrar o Aegis Hub completamente',
      icon: XCircle,
      activeTheme: 'border-purple-500 bg-purple-950/70 text-white ring-2 ring-purple-500/50 shadow-lg shadow-purple-500/20'
    },
    {
      id: 'sleep',
      label: 'Suspender',
      sublabel: 'Colocar o computador em modo de suspensão',
      icon: Moon,
      activeTheme: 'border-indigo-500 bg-indigo-950/70 text-white ring-2 ring-indigo-500/50 shadow-lg shadow-indigo-500/20'
    },
    {
      id: 'restart',
      label: 'Reiniciar PC',
      sublabel: 'Reiniciar o computador com segurança',
      icon: RotateCcw,
      activeTheme: 'border-amber-500 bg-amber-950/70 text-white ring-2 ring-amber-500/50 shadow-lg shadow-amber-500/20'
    },
    {
      id: 'shutdown',
      label: 'Desligar PC',
      sublabel: 'Encerrar e desligar o computador',
      icon: Power,
      activeTheme: 'border-rose-500 bg-rose-950/70 text-white ring-2 ring-rose-500/50 shadow-lg shadow-rose-500/20'
    },
    {
      id: 'cancel',
      label: 'Cancelar',
      sublabel: 'Voltar ao Big Picture',
      icon: X,
      activeTheme: 'border-slate-500 bg-slate-800 text-white ring-2 ring-slate-500/40 shadow-lg'
    }
  ], []);

  const executePowerAction = (actionId: string) => {
    playNavSelectSound();
    if (actionId === 'shutdown') {
      setPendingPowerAction('shutdown');
      setPowerConfirmIndex(0);
      return;
    }
    if (actionId === 'restart') {
      setPendingPowerAction('restart');
      setPowerConfirmIndex(0);
      return;
    }
    setIsPowerMenuOpen(false);
    setPendingPowerAction(null);
    if (actionId === 'exit') {
      onExitBigPicture();
    } else if (actionId === 'quit') {
      if (window.api?.appQuit) {
        window.api.appQuit();
      } else if (window.api?.windowClose) {
        window.api.windowClose();
      }
    } else if (actionId === 'sleep') {
      window.api?.systemPowerAction('sleep');
    }
  };

  const handleConfirmPowerAction = (confirmed: boolean) => {
    if (!confirmed) {
      playNavBackSound();
      setPendingPowerAction(null);
      return;
    }
    playNavSelectSound();
    const action = pendingPowerAction;
    setIsPowerMenuOpen(false);
    setPendingPowerAction(null);
    if (action === 'shutdown') {
      window.api?.systemPowerAction('shutdown');
    } else if (action === 'restart') {
      window.api?.systemPowerAction('restart');
    }
  };

  const customApps: CustomApp[] = useMemo(() => {
    if (settings?.customApps && settings.customApps.length > 0) {
      return settings.customApps;
    }
    return [
      {
        id: 'app-discord',
        name: 'Discord',
        executablePath: 'discord://',
        category: 'communication',
        description: 'Voice, video, and text communication',
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/3670/3670157.png',
      },
      {
        id: 'app-spotify',
        name: 'Spotify',
        executablePath: 'spotify:',
        category: 'media',
        description: 'Music, playlists, and podcasts',
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/174/174872.png',
      },
      {
        id: 'app-chrome',
        name: 'Google Chrome',
        executablePath: 'chrome.exe',
        category: 'browser',
        description: 'Fast web browser and walkthroughs',
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/888/888846.png',
      },
    ];
  }, [settings?.customApps]);

  const filteredCustomApps = useMemo(() => {
    if (!appSearchQuery.trim()) return customApps;
    const q = appSearchQuery.toLowerCase();
    return customApps.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.category && a.category.toLowerCase().includes(q)) ||
        (a.description && a.description.toLowerCase().includes(q))
    );
  }, [customApps, appSearchQuery]);

  const handleLaunchCustomApp = async (app: CustomApp) => {
    playLaunchGameSound();
    setIsAppMenuOpen(false);
    setAppLaunchToast(`Launching ${app.name}...`);
    setTimeout(() => setAppLaunchToast(null), 3000);

    if (window.api?.launchCustomApp) {
      const res = await window.api.launchCustomApp(app);
      if (!res.success) {
        setAppLaunchToast(`Error opening ${app.name}: ${res.message || 'File not found'}`);
        setTimeout(() => setAppLaunchToast(null), 4000);
      }
    } else if (window.api?.openExternal && app.executablePath.includes('://')) {
      window.api.openExternal(app.executablePath);
    }
  };

  const activeDetailsGame = useMemo(() => {
    if (!selectedGameForDetails) return null;
    return games.find((g) => g.id === selectedGameForDetails.id) || selectedGameForDetails;
  }, [games, selectedGameForDetails]);

  const getGameConsoleName = (game?: Game | null): string => {
    if (!game) return '';
    if (game.platform !== 'emulator') {
      return getPlatformBadge(game.platform).name;
    }
    const emu = emulators.find((e) => e.id === game.storeId);
    if (emu?.consoleName) return emu.consoleName;
    if (emu?.shortName) return emu.shortName;
    const sys = getSystemDefinition(emu?.systemKey || game.storeId || '');
    if (sys?.name) return sys.name;
    if (game.tags) {
      for (const t of game.tags) {
        const sysDef = getSystemDefinition(t);
        if (sysDef?.name) return sysDef.name;
      }
    }
    if (game.genres) {
      for (const g of game.genres) {
        const sysDef = getSystemDefinition(g);
        if (sysDef?.name) return sysDef.name;
      }
      const specificGenre = game.genres.find(
        (g) => g !== 'Emulated' && !g.toLowerCase().includes('retro') && g !== 'Emulation'
      );
      if (specificGenre) return specificGenre;
    }
    if (game.storeId) {
      const lower = game.storeId.toLowerCase();
      if (lower.includes('desmume') || lower.includes('melon') || lower.includes('nds')) return 'Nintendo DS';
      if (lower.includes('pcsx2') || lower.includes('ps2')) return 'PlayStation 2';
      if (lower.includes('ppsspp') || lower.includes('psp')) return 'Sony PSP';
      if (lower.includes('rpcs3') || lower.includes('ps3')) return 'PlayStation 3';
      if (lower.includes('duckstation') || lower.includes('epsxe') || lower.includes('ps1') || lower.includes('psx')) return 'PlayStation';
      if (lower.includes('dolphin')) return 'GameCube / Wii';
      if (lower.includes('mgba') || lower.includes('gba')) return 'Game Boy Advance';
      if (lower.includes('snes')) return 'Super Nintendo';
      if (lower.includes('citra') || lower.includes('3ds')) return 'Nintendo 3DS';
      if (lower.includes('ryujinx') || lower.includes('yuzu') || lower.includes('switch')) return 'Nintendo Switch';
    }
    return 'Retro System';
  };

  const getGameReleaseYear = (game?: Game | null): string => {
    if (!game) return '';
    if (game.releaseDate) {
      const year = new Date(game.releaseDate).getFullYear();
      if (year && !isNaN(year) && year > 1970 && year < 2035) return String(year);
      const match = String(game.releaseDate).match(/\b(19\d\d|20\d\d)\b/);
      if (match) return match[1];
    }
    if (game.tags) {
      for (const t of game.tags) {
        const match = t.match(/\b(19\d\d|20\d\d)\b/);
        if (match) return match[1];
      }
    }
    return '';
  };

  const [isFetchingEmuMetadata, setIsFetchingEmuMetadata] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [soundOn, setSoundOn] = useState<boolean>(() => isBigPictureSoundEnabled());
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filterFocus, setFilterFocus] = useState<{
    section: FilterModalSection;
    index: number;
  }>({ section: 'platforms', index: 0 });
  const [libraryFilters, setLibraryFilters] = useState<{
    platforms: GamePlatform[];
    genres: string[];
    yearRange: string;
    installedOnly: boolean;
    favoritesOnly: boolean;
    sortBy: 'title-asc' | 'title-desc' | 'recent' | 'playtime' | 'release-desc' | 'release-asc' | 'added';
  }>({
    platforms: [],
    genres: [],
    yearRange: 'all',
    installedOnly: false,
    favoritesOnly: false,
    sortBy: 'title-asc',
  });
  const [galleryScreenshots, setGalleryScreenshots] = useState<{ id: number; thumbnail?: string; full: string }[]>([]);
  const [activeScreenshotIdx, setActiveScreenshotIdx] = useState<number>(0);
  const [isLoadingGallery, setIsLoadingGallery] = useState(false);

  // Emulator Screenshots Gallery State
  const [emuScreenshots, setEmuScreenshots] = useState<{ id: number; thumbnail: string; full: string }[]>([]);
  const [activeEmuScreenshotIdx, setActiveEmuScreenshotIdx] = useState<number>(0);
  const [isLoadingEmuGallery, setIsLoadingEmuGallery] = useState(false);
  const [isGalleryFullscreen, setIsGalleryFullscreen] = useState(false);

  // EmulationStation Mode State
  const [selectedSystemIndex, setSelectedSystemIndex] = useState<number>(0);
  const [selectedEmuGameIndex, setSelectedEmuGameIndex] = useState<number>(0);
  const emuSystemPillsRef = useRef<Record<number, HTMLButtonElement | null>>({});
  const emuGameListRef = useRef<Record<number, HTMLDivElement | null>>({});
  const emuCarouselContainerRef = useRef<HTMLDivElement | null>(null);

  // Live clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 10000);
    return () => clearInterval(timer);
  }, []);

  // Filtered rows for Home Tab
  const recentGames = useMemo(() => {
    return [...games]
      .filter((g) => g.lastPlayed && !g.hidden)
      .sort((a, b) => new Date(b.lastPlayed!).getTime() - new Date(a.lastPlayed!).getTime())
      .slice(0, 20);
  }, [games]);

  const favoriteGames = useMemo(() => {
    return games.filter((g) => g.favorite && !g.hidden);
  }, [games]);

  const installedGames = useMemo(() => {
    return games.filter((g) => g.installed !== false && !g.hidden);
  }, [games]);

  const emulatedGames = useMemo(() => {
    return games.filter((g) => g.platform === 'emulator' && !g.hidden);
  }, [games]);

  // Emulator Systems List (EmulationStation layout)
  const emulatorSystems = useMemo(() => {
    const map = new Map<string, { id: string; name: string; shortName: string; logo: string; count: number; systemKey?: string }>();

    // Count games per system
    emulatedGames.forEach((g) => {
      const emu = emulators.find((e) => e.id === g.storeId);
      let key = (emu?.systemKey && emu.systemKey !== 'custom') ? emu.systemKey : (g.storeId || 'other');
      let name = emu?.consoleName || emu?.name || g.storeId || 'Retro System';
      let shortName = emu?.shortName || key.toUpperCase();
      let logo = emu?.customLogoUrl || getSystemLogo(emu?.systemKey || emu?.consoleName || g.storeId || '');

      if (!emu) {
        const tagMatch = g.tags?.find((t) => getSystemDefinition(t));
        const genreMatch = g.genres?.find((gr) => getSystemDefinition(gr));
        const sysDef = getSystemDefinition(tagMatch || genreMatch || g.storeId || '');
        if (sysDef) {
          key = sysDef.systemKey;
          name = sysDef.name;
          shortName = sysDef.shortName;
          logo = sysDef.logo;
        }
      }

      if (!map.has(key)) {
        map.set(key, { id: key, name, shortName, logo, count: 0, systemKey: key });
      }
      map.get(key)!.count += 1;
    });

    // Also include configured/installed emulators from settings even if count is 0
    emulators.forEach((emu) => {
      const key = (emu.systemKey && emu.systemKey !== 'custom') ? emu.systemKey : emu.id;
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          name: emu.consoleName || emu.name,
          shortName: emu.shortName || key.toUpperCase(),
          logo: emu.customLogoUrl || getSystemLogo(emu.systemKey || emu.consoleName || emu.id),
          count: 0,
          systemKey: key,
        });
      }
    });

    const systems = Array.from(map.values()).sort((a, b) => b.count - a.count);

    return [
      {
        id: 'all',
        name: 'All Retro Systems',
        shortName: 'All Systems',
        logo: getSystemLogo('retroarch'),
        count: emulatedGames.length,
      },
      ...systems,
    ];
  }, [emulatedGames, emulators]);

  const activeSystem = emulatorSystems[selectedSystemIndex] || emulatorSystems[0];

  const activeSystemGames = useMemo(() => {
    if (!activeSystem || activeSystem.id === 'all') {
      return emulatedGames;
    }
    return emulatedGames.filter((g) => {
      const emu = emulators.find((e) => e.id === g.storeId);
      const key = emu?.systemKey || g.storeId;
      if (key === activeSystem.id || key === activeSystem.systemKey) return true;
      if (g.storeId === activeSystem.id) return true;
      if (g.tags?.some((t) => t.toLowerCase().includes(activeSystem.id.toLowerCase()) || (activeSystem.shortName && t.toLowerCase().includes(activeSystem.shortName.toLowerCase())))) return true;
      if (g.genres?.some((gr) => gr.toLowerCase().includes(activeSystem.id.toLowerCase()) || (activeSystem.shortName && gr.toLowerCase().includes(activeSystem.shortName.toLowerCase())))) return true;
      return false;
    });
  }, [emulatedGames, activeSystem, emulators]);

  const activeEmuGame = activeSystemGames[selectedEmuGameIndex] || activeSystemGames[0] || null;

  useEffect(() => {
    if (activeTab === 'emulators') {
      const centerActiveSystem = (smooth = true) => {
        const container = emuCarouselContainerRef.current;
        const el = emuSystemPillsRef.current[selectedSystemIndex];
        if (container && el) {
          const containerWidth = container.clientWidth;
          const cardLeft = el.offsetLeft;
          const cardWidth = el.offsetWidth;
          const targetScrollLeft = cardLeft - (containerWidth / 2) + (cardWidth / 2);
          container.scrollTo({
            left: Math.max(0, targetScrollLeft),
            behavior: smooth ? 'smooth' : 'auto',
          });
        }
      };

      const timer = setTimeout(() => centerActiveSystem(true), 25);
      const handleResize = () => centerActiveSystem(false);
      window.addEventListener('resize', handleResize);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [selectedSystemIndex, activeTab]);

  useEffect(() => {
    if (activeTab === 'emulators') {
      const el = emuGameListRef.current[selectedEmuGameIndex];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      if (emuDescriptionRef.current) {
        emuDescriptionRef.current.scrollTop = 0;
      }
    }
  }, [selectedEmuGameIndex, activeTab]);

  // Auto-enrich active emulator game with synopsis and metadata if generic or missing
  useEffect(() => {
    if (!activeEmuGame || activeTab !== 'emulators') return;
    const isGenericDesc =
      !activeEmuGame.description ||
      activeEmuGame.description.startsWith('Emulated title for') ||
      activeEmuGame.description.length < 25;
    const isMissingMeta = !activeEmuGame.developer || !activeEmuGame.releaseDate;

    if ((isGenericDesc || isMissingMeta) && window.api?.fetchGameCategories) {
      let isMounted = true;
      setIsFetchingEmuMetadata(true);
      window.api
        .fetchGameCategories(activeEmuGame)
        .then((res) => {
          if (!isMounted || !res) return;
          const updated: Game = {
            ...activeEmuGame,
            genres: res.genres && res.genres.length > 0 ? res.genres : activeEmuGame.genres,
            tags: res.tags ? Array.from(new Set([...(activeEmuGame.tags || []), ...res.tags])) : activeEmuGame.tags,
            developer: (!activeEmuGame.developer || activeEmuGame.developer === 'Unknown') && res.developer ? res.developer : activeEmuGame.developer,
            publisher: (!activeEmuGame.publisher || activeEmuGame.publisher === 'Independent') && res.publisher ? res.publisher : activeEmuGame.publisher,
            releaseDate: !activeEmuGame.releaseDate && res.releaseDate ? res.releaseDate : activeEmuGame.releaseDate,
            description: (isGenericDesc && (res.description || res.summary)) ? res.description || res.summary : activeEmuGame.description,
            summary: (isGenericDesc && (res.summary || res.description)) ? res.summary || res.description : activeEmuGame.summary,
          };
          if (onUpdateGame) {
            onUpdateGame(updated);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (isMounted) setIsFetchingEmuMetadata(false);
        });

      return () => {
        isMounted = false;
      };
    }
  }, [activeEmuGame?.id, activeTab]);

  // Fetch emulator game screenshots when active emulator game changes
  useEffect(() => {
    if (!activeEmuGame || activeTab !== 'emulators') {
      setEmuScreenshots([]);
      return;
    }
    let isMounted = true;
    setIsLoadingEmuGallery(true);
    setActiveEmuScreenshotIdx(0);

    if (window.api?.getGameGallery) {
      window.api
        .getGameGallery(activeEmuGame)
        .then((res) => {
          if (isMounted) {
            setEmuScreenshots(res?.screenshots || []);
            setIsLoadingEmuGallery(false);
          }
        })
        .catch(() => {
          if (isMounted) setIsLoadingEmuGallery(false);
        });
    } else {
      setIsLoadingEmuGallery(false);
    }

    return () => {
      isMounted = false;
    };
  }, [activeEmuGame?.id, activeTab]);

  // Available Genres with game counts
  const availableGenres = useMemo(() => {
    const counts: Record<string, number> = {};
    games.forEach((g) => {
      if (g.hidden) return;
      g.genres?.forEach((genre) => {
        const trimmed = genre.trim();
        if (trimmed) {
          counts[trimmed] = (counts[trimmed] || 0) + 1;
        }
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([genre, count]) => ({ genre, count }));
  }, [games]);

  // Available Platforms with game counts
  const availablePlatforms = useMemo(() => {
    const counts: Record<string, number> = {};
    games.forEach((g) => {
      if (g.hidden) return;
      counts[g.platform] = (counts[g.platform] || 0) + 1;
    });
    const platformMeta: { id: GamePlatform; name: string }[] = [
      { id: 'steam', name: 'Steam' },
      { id: 'epic', name: 'Epic Games' },
      { id: 'gog', name: 'GOG Galaxy' },
      { id: 'ea', name: 'EA App' },
      { id: 'ubisoft', name: 'Ubisoft Connect' },
      { id: 'xbox', name: 'Xbox' },
      { id: 'emulator', name: 'Emulators / ROMs' },
      { id: 'manual', name: 'Local / Manual' },
    ];
    return platformMeta
      .filter((p) => (counts[p.id] || 0) > 0)
      .map((p) => ({ ...p, count: counts[p.id] || 0 }));
  }, [games]);

  // Number of active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (libraryFilters.platforms.length > 0) count += libraryFilters.platforms.length;
    if (libraryFilters.genres.length > 0) count += libraryFilters.genres.length;
    if (libraryFilters.yearRange !== 'all') count += 1;
    if (libraryFilters.installedOnly) count += 1;
    if (libraryFilters.favoritesOnly) count += 1;
    if (libraryFilters.sortBy !== 'title-asc') count += 1;
    return count;
  }, [libraryFilters]);

  // Library filtered & sorted games
  const libraryGames = useMemo(() => {
    const filtered = games.filter((g) => {
      if (g.hidden) return false;

      // Platform filter
      if (libraryFilters.platforms.length > 0) {
        if (!libraryFilters.platforms.includes(g.platform)) return false;
      }

      // Installed filter
      if (libraryFilters.installedOnly && g.installed === false) {
        return false;
      }

      // Favorites filter
      if (libraryFilters.favoritesOnly && !g.favorite) {
        return false;
      }

      // Genres filter
      if (libraryFilters.genres.length > 0) {
        const hasGenre = g.genres?.some((genre) => libraryFilters.genres.includes(genre));
        if (!hasGenre) return false;
      }

      // Year range filter
      if (libraryFilters.yearRange !== 'all') {
        const y = parseInt(g.releaseDate?.slice(0, 4) || '0', 10);
        if (libraryFilters.yearRange === '2024+') {
          if (y < 2024) return false;
        } else if (libraryFilters.yearRange === '2020-2023') {
          if (y < 2020 || y > 2023) return false;
        } else if (libraryFilters.yearRange === '2015-2019') {
          if (y < 2015 || y > 2019) return false;
        } else if (libraryFilters.yearRange === '2010-2014') {
          if (y < 2010 || y > 2014) return false;
        } else if (libraryFilters.yearRange === '2000-2009') {
          if (y < 2000 || y > 2009) return false;
        } else if (libraryFilters.yearRange === 'retro') {
          if (y <= 0 || y >= 2000) return false;
        }
      }

      return true;
    });

    return [...filtered].sort((a, b) => {
      switch (libraryFilters.sortBy) {
        case 'title-desc':
          return b.title.localeCompare(a.title);
        case 'recent': {
          const tA = a.lastPlayed ? new Date(a.lastPlayed).getTime() : 0;
          const tB = b.lastPlayed ? new Date(b.lastPlayed).getTime() : 0;
          return tB - tA;
        }
        case 'playtime':
          return (b.playtimeMinutes || 0) - (a.playtimeMinutes || 0);
        case 'release-desc':
          return (b.releaseDate || '').localeCompare(a.releaseDate || '');
        case 'release-asc':
          return (a.releaseDate || '').localeCompare(b.releaseDate || '');
        case 'added':
          return (b.addedDate || '').localeCompare(a.addedDate || '');
        case 'title-asc':
        default:
          return a.title.localeCompare(b.title);
      }
    });
  }, [games, libraryFilters]);

  // Search results (fallback to library games when query is empty so games are always visible)
  const searchResults = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) {
      return [...games]
        .filter((g) => !g.hidden)
        .sort((a, b) => {
          const tA = a.lastPlayed ? new Date(a.lastPlayed).getTime() : 0;
          const tB = b.lastPlayed ? new Date(b.lastPlayed).getTime() : 0;
          if (tA !== tB) return tB - tA;
          return a.title.localeCompare(b.title);
        });
    }
    return games.filter((g) => {
      if (g.hidden) return false;
      return (
        g.title.toLowerCase().includes(q) ||
        g.platform.toLowerCase().includes(q) ||
        g.genres?.some((genre) => genre.toLowerCase().includes(q))
      );
    });
  }, [games, searchQuery]);

  // Current active row items depending on tab (capped at 36 per shelf so Home doesn't mount hundreds of offscreen cards)
  const homeRows = useMemo(() => {
    const rows: { id: string; title: string; items: Game[] }[] = [];
    if (recentGames.length > 0) {
      rows.push({ id: 'recent', title: 'Jump Back In', items: recentGames.slice(0, 36) });
    }
    if (favoriteGames.length > 0) {
      rows.push({ id: 'favorites', title: 'Favorites', items: favoriteGames.slice(0, 36) });
    }
    if (installedGames.length > 0) {
      rows.push({ id: 'installed', title: 'Installed & Ready', items: installedGames.slice(0, 36) });
    }
    if (emulatedGames.length > 0) {
      rows.push({ id: 'emulators', title: 'Retro & Emulation', items: emulatedGames.slice(0, 36) });
    }
    if (rows.length === 0 && games.length > 0) {
      rows.push({ id: 'all', title: 'All Titles', items: games.filter((g) => !g.hidden).slice(0, 36) });
    }
    return rows;
  }, [recentGames, favoriteGames, installedGames, emulatedGames, games]);

  // Determine focused game for hero spotlight
  const currentFocusedGame = useMemo<Game | null>(() => {
    if (selectedGameForDetails) return selectedGameForDetails;

    if (activeTab === 'home') {
      if (homeRows.length > 0) {
        const row = homeRows[Math.min(focusedRow, homeRows.length - 1)];
        if (row && row.items.length > 0) {
          return row.items[Math.min(focusedIndex, row.items.length - 1)] || null;
        }
      }
      return recentGames[0] || games[0] || null;
    }

    if (activeTab === 'library') {
      return libraryGames[Math.min(focusedIndex, libraryGames.length - 1)] || null;
    }

    if (activeTab === 'emulators') {
      return activeEmuGame || emulatedGames[0] || null;
    }

    if (activeTab === 'search') {
      if (searchFocusTarget === 'input') {
        return searchResults[0] || null;
      }
      return searchResults[Math.min(focusedIndex, searchResults.length - 1)] || null;
    }

    return games[0] || null;
  }, [
    activeTab,
    homeRows,
    focusedRow,
    focusedIndex,
    libraryGames,
    emulatedGames,
    activeEmuGame,
    searchResults,
    searchFocusTarget,
    recentGames,
    games,
    selectedGameForDetails,
  ]);

  // Auto-enrich focused game (Home / Library) if description is missing or generic
  useEffect(() => {
    if (!currentFocusedGame || activeTab === 'emulators') return;
    const desc = currentFocusedGame.description;
    const isGenericDesc =
      !desc ||
      desc.trim().length < 25 ||
      desc.trim().toLowerCase() === currentFocusedGame.title.trim().toLowerCase() ||
      /Owned on (?:Steam|Epic Games Store|\w+ (?:Store )?account|\w+ Cloud)/i.test(desc) ||
      /Installed via Epic Games Launcher/i.test(desc);

    if (!isGenericDesc || !window.api?.fetchGameCategories) return;

    let isMounted = true;
    const timer = setTimeout(() => {
      window.api
        ?.fetchGameCategories(currentFocusedGame)
        .then((res) => {
          if (!isMounted || !res) return;
          if (res.description || res.summary) {
            const updated: Game = {
              ...currentFocusedGame,
              genres: res.genres && res.genres.length > 0 ? res.genres : currentFocusedGame.genres,
              developer: (!currentFocusedGame.developer || currentFocusedGame.developer === 'Unknown') && res.developer ? res.developer : currentFocusedGame.developer,
              publisher: (!currentFocusedGame.publisher || currentFocusedGame.publisher === 'Independent') && res.publisher ? res.publisher : currentFocusedGame.publisher,
              releaseDate: !currentFocusedGame.releaseDate && res.releaseDate ? res.releaseDate : currentFocusedGame.releaseDate,
              description: res.description || res.summary || currentFocusedGame.description,
              summary: res.summary || res.description || currentFocusedGame.summary,
            };
            if (onUpdateGame) onUpdateGame(updated);
          }
        })
        .catch(() => {});
    }, 450);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [currentFocusedGame?.id, activeTab]);

  // Auto-scroll active card into view fluidly without animation queue delay
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const rowRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const mainScrollRef = useRef<HTMLElement | null>(null);
  const searchScrollRef = useRef<HTMLDivElement | null>(null);
  const emuDescriptionRef = useRef<HTMLDivElement | null>(null);
  const detailsDescriptionRef = useRef<HTMLDivElement | null>(null);
  const detailsModalRef = useRef<HTMLDivElement | null>(null);
  const prevFocusedRowRef = useRef<number>(focusedRow);
  const prevActiveTabRef = useRef<string>(activeTab);

  const handleCardFocus = React.useCallback((idx: number) => {
    setFocusedIndex(idx);
    playNavSelectSound();
  }, []);

  const handleHomeCardFocus = React.useCallback((rowIdx: number, idx: number) => {
    setFocusedRow(rowIdx);
    setFocusedIndex(idx);
    playNavSelectSound();
  }, []);

  const handleSearchCardFocus = React.useCallback((idx: number) => {
    setSearchFocusTarget('grid');
    setFocusedIndex(idx);
    playNavSelectSound();
  }, []);

  const handleCardLaunch = React.useCallback((game: Game) => {
    playLaunchGameSound();
    onLaunchGame(game);
  }, [onLaunchGame]);

  const handleRegisterCardRef = React.useCallback((key: string, el: HTMLDivElement | null) => {
    cardRefs.current[key] = el;
  }, []);

  const handleVirtualKeyPress = React.useCallback((key: VirtualKeyItem) => {
    if (key.action === 'caps') {
      playNavSelectSound();
      setIsVkCaps((prev) => !prev);
    } else if (key.action === 'space') {
      playNavSelectSound();
      setSearchQuery((prev) => prev + ' ');
      setFocusedIndex(0);
    } else if (key.action === 'backspace') {
      playNavBackSound();
      setSearchQuery((prev) => prev.slice(0, -1));
      setFocusedIndex(0);
    } else if (key.action === 'clear') {
      playNavBackSound();
      setSearchQuery('');
      setFocusedIndex(0);
    } else if (key.action === 'done') {
      playNavSelectSound();
      setIsVirtualKeyboardOpen(false);
      if (searchResults.length > 0) {
        setSearchFocusTarget('grid');
        setFocusedIndex(0);
      } else {
        setSearchFocusTarget('input');
      }
    } else if (key.value) {
      playNavSelectSound();
      const char = isVkCaps ? key.value.toUpperCase() : key.value.toLowerCase();
      setSearchQuery((prev) => prev + char);
      setFocusedIndex(0);
    }
  }, [isVkCaps, searchResults.length]);

  useEffect(() => {
    const key = activeTab === 'home' ? `home-${focusedRow}-${focusedIndex}` : `${activeTab}-0-${focusedIndex}`;
    const el = cardRefs.current[key];
    const mainEl = mainScrollRef.current;
    if (!el) return;

    if (activeTab === 'home') {
      const rowChanged = prevFocusedRowRef.current !== focusedRow || prevActiveTabRef.current !== activeTab;
      prevFocusedRowRef.current = focusedRow;
      prevActiveTabRef.current = activeTab;

      // Only perform vertical scrolling when changing rows, never when moving horizontally
      if (rowChanged && mainEl) {
        if (focusedRow === 0) {
          smoothScrollElement(mainEl, { top: 0 });
        } else {
          const rowEl = rowRefs.current[focusedRow];
          if (rowEl) {
            const rowTop = rowEl.offsetTop;
            const rowBottom = rowTop + rowEl.offsetHeight;
            const viewTop = mainEl.scrollTop;
            const viewHeight = mainEl.clientHeight;
            const viewBottom = viewTop + viewHeight;
            const topMargin = Math.max(20, Math.round(window.innerHeight * 0.03));
            const bottomMargin = Math.max(90, Math.round(window.innerHeight * 0.13));

            if (rowTop < viewTop + topMargin) {
              smoothScrollElement(mainEl, { top: Math.max(0, rowTop - topMargin) });
            } else if (rowBottom > viewBottom - bottomMargin) {
              smoothScrollElement(mainEl, { top: rowBottom - viewHeight + bottomMargin });
            }
          }
        }
      }

      // Smooth horizontal scroll ONLY the carousel container with continuous velocity lerp
      const carousel = el.parentElement;
      if (carousel) {
        const targetLeft = el.offsetLeft - (carousel.clientWidth / 2) + (el.offsetWidth / 2);
        smoothScrollElement(carousel, { left: Math.max(0, targetLeft) });
      }
      return;
    }

    const scrollContainer = activeTab === 'search' ? (searchScrollRef.current || mainEl) : mainEl;
    if (!scrollContainer) return;

    const cols = getGridColumns();

    // If on the first row of the grid, smoothly scroll all the way to top: 0
    if (focusedIndex < cols) {
      if (scrollContainer.scrollTop !== 0) {
        smoothScrollElement(scrollContainer, { top: 0 });
      }
      return;
    }

    // High-precision viewport bounds calculation using getBoundingClientRect
    const cardRect = el.getBoundingClientRect();
    const containerRect = scrollContainer.getBoundingClientRect();

    // Bottom clearance includes the 9vh fixed footer, its dark gradient shadow overlay,
    // plus comfortable breathing room so the full card (title, playtime, badges) is 100% visible
    const bottomClearance = Math.max(120, Math.round(window.innerHeight * 0.15));
    const topClearance = Math.max(20, Math.round(window.innerHeight * 0.025));

    const visibleTop = containerRect.top + topClearance;
    const visibleBottom = window.innerHeight - bottomClearance;

    if (cardRect.bottom > visibleBottom) {
      const diff = cardRect.bottom - visibleBottom;
      smoothScrollElement(scrollContainer, { top: scrollContainer.scrollTop + diff });
    } else if (cardRect.top < visibleTop) {
      const diff = visibleTop - cardRect.top;
      smoothScrollElement(scrollContainer, { top: Math.max(0, scrollContainer.scrollTop - diff) });
    }
  }, [activeTab, focusedRow, focusedIndex]);

  // Fetch gallery screenshots when details modal opens
  useEffect(() => {
    if (!selectedGameForDetails) {
      setGalleryScreenshots([]);
      return;
    }

    if (detailsDescriptionRef.current) {
      detailsDescriptionRef.current.scrollTop = 0;
    }
    if (detailsModalRef.current) {
      detailsModalRef.current.scrollTop = 0;
    }

    let isMounted = true;
    setIsLoadingGallery(true);
    setActiveScreenshotIdx(0);

    if (window.api?.getGameGallery) {
      window.api
        .getGameGallery(selectedGameForDetails)
        .then((res) => {
          if (isMounted) {
            setGalleryScreenshots(res?.screenshots || []);
            setIsLoadingGallery(false);
          }
        })
        .catch(() => {
          if (isMounted) setIsLoadingGallery(false);
        });
    } else {
      setIsLoadingGallery(false);
    }

    return () => {
      isMounted = false;
    };
  }, [selectedGameForDetails]);

  // Auto-fetch categories & real descriptions if missing or generic when opening details modal
  useEffect(() => {
    if (!selectedGameForDetails) return;
    const currentGame = games.find((g) => g.id === selectedGameForDetails.id) || selectedGameForDetails;

    const genericList = [
      'steam library',
      'pc game',
      'epic cloud',
      'gog cloud',
      'steam cloud',
      'auto-detected',
      'cloud owned',
      'manual entry',
    ];
    const genericDescPatterns = [
      /Steam Game \(AppID: \d+\)/i,
      /Installed via Epic Games Launcher/i,
      /GOG Game:/i,
      /Installed game detected on Windows PC/i,
      /Owned on Steam/i,
      /Owned on Epic Games Store/i,
      /Owned on \w+ (?:Games Store )?account/i,
      /Owned on \w+ (?:Store )?account/i,
      /Owned in \w+ Cloud/i,
      /Detected game on PC/i,
      /Owned on \w+ cloud library/i,
      /Launches seamlessly without requiring browser login/i,
      /No description provided/i,
      /Emulated title for/i,
      /Classic retro title/i,
      /Experience classic retro/i,
    ];

    const isGenericGenres =
      !currentGame.genres ||
      currentGame.genres.length === 0 ||
      currentGame.genres.every((g) => genericList.includes(g.trim().toLowerCase()));

    const isGenericDesc =
      !currentGame.description ||
      currentGame.description.trim().length < 25 ||
      currentGame.description.trim().toLowerCase() === currentGame.title.trim().toLowerCase() ||
      genericDescPatterns.some((rx) => rx.test(currentGame.description));

    if ((isGenericGenres || isGenericDesc) && window.api?.fetchGameCategories) {
      let isMounted = true;
      setIsFetchingDetailsMetadata(true);
      window.api
        .fetchGameCategories(currentGame)
        .then((res) => {
          if (!isMounted || !res) return;
          const updated: Game = {
            ...currentGame,
            genres: res.genres && res.genres.length > 0 && isGenericGenres ? res.genres : currentGame.genres,
            tags: res.tags ? Array.from(new Set([...(currentGame.tags || []), ...res.tags])) : currentGame.tags,
            developer: (!currentGame.developer || currentGame.developer === 'Unknown') && res.developer ? res.developer : currentGame.developer,
            publisher: (!currentGame.publisher || currentGame.publisher === 'Independent') && res.publisher ? res.publisher : currentGame.publisher,
            description: isGenericDesc && (res.description || res.summary) ? (res.description || res.summary)! : currentGame.description,
            summary: res.summary || currentGame.summary,
          };
          setSelectedGameForDetails(updated);
          if (onUpdateGame) {
            onUpdateGame(updated);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (isMounted) setIsFetchingDetailsMetadata(false);
        });

      return () => {
        isMounted = false;
      };
    }
  }, [selectedGameForDetails?.id]);

  // Filter Modal Focus & Navigation
  const getSectionItemCount = (sec: FilterModalSection): number => {
    switch (sec) {
      case 'platforms':
        return 1 + availablePlatforms.length;
      case 'sort':
        return 7;
      case 'status':
        return 2;
      case 'year':
        return 7;
      case 'genres':
        return availableGenres.length;
      case 'actions':
        return activeFilterCount > 0 ? 2 : 1;
      default:
        return 1;
    }
  };

  const getSectionCols = (sec: FilterModalSection): number => {
    switch (sec) {
      case 'platforms':
      case 'sort':
      case 'year':
        return 4;
      case 'status':
      case 'actions':
        return 2;
      case 'genres':
        return 4;
      default:
        return 4;
    }
  };

  const getActiveFilterSections = (): FilterModalSection[] => {
    const list: FilterModalSection[] = ['platforms', 'sort', 'status', 'year'];
    if (availableGenres.length > 0) list.push('genres');
    list.push('actions');
    return list;
  };

  const handleModalNavLeft = () => {
    playNavMoveSound();
    setFilterFocus((prev) => ({
      ...prev,
      index: Math.max(0, prev.index - 1),
    }));
  };

  const handleModalNavRight = () => {
    playNavMoveSound();
    setFilterFocus((prev) => {
      const max = getSectionItemCount(prev.section) - 1;
      return {
        ...prev,
        index: Math.min(max, prev.index + 1),
      };
    });
  };

  const handleModalNavUp = () => {
    playNavMoveSound();
    setFilterFocus((prev) => {
      const cols = getSectionCols(prev.section);
      if (prev.index >= cols) {
        return { ...prev, index: prev.index - cols };
      }
      const sections = getActiveFilterSections();
      const currIdx = sections.indexOf(prev.section);
      if (currIdx > 0) {
        const prevSec = sections[currIdx - 1];
        const prevTotal = getSectionItemCount(prevSec);
        const prevCols = getSectionCols(prevSec);
        const colPos = prev.index % cols;
        const lastRowStart = Math.floor((prevTotal - 1) / prevCols) * prevCols;
        const targetIdx = Math.min(prevTotal - 1, lastRowStart + Math.min(colPos, (prevTotal - 1) % prevCols));
        return { section: prevSec, index: targetIdx };
      }
      return prev;
    });
  };

  const handleModalNavDown = () => {
    playNavMoveSound();
    setFilterFocus((prev) => {
      const cols = getSectionCols(prev.section);
      const total = getSectionItemCount(prev.section);
      if (prev.index + cols < total) {
        return { ...prev, index: prev.index + cols };
      }
      const sections = getActiveFilterSections();
      const currIdx = sections.indexOf(prev.section);
      if (currIdx < sections.length - 1) {
        const nextSec = sections[currIdx + 1];
        const nextTotal = getSectionItemCount(nextSec);
        const nextCols = getSectionCols(nextSec);
        const colPos = prev.index % cols;
        const targetIdx = Math.min(nextTotal - 1, colPos % nextCols);
        return { section: nextSec, index: targetIdx };
      }
      return prev;
    });
  };

  const handleModalConfirm = () => {
    playNavSelectSound();
    const { section, index } = filterFocus;

    if (section === 'platforms') {
      if (index === 0) {
        setLibraryFilters((prev) => ({ ...prev, platforms: [] }));
      } else {
        const p = availablePlatforms[index - 1];
        if (p) {
          setLibraryFilters((prev) => {
            const exists = prev.platforms.includes(p.id);
            return {
              ...prev,
              platforms: exists ? prev.platforms.filter((x) => x !== p.id) : [...prev.platforms, p.id],
            };
          });
        }
      }
      return;
    }

    if (section === 'sort') {
      const sortIds: (typeof libraryFilters.sortBy)[] = [
        'title-asc',
        'title-desc',
        'recent',
        'playtime',
        'release-desc',
        'release-asc',
        'added',
      ];
      if (sortIds[index]) {
        setLibraryFilters((prev) => ({ ...prev, sortBy: sortIds[index] }));
      }
      return;
    }

    if (section === 'status') {
      if (index === 0) {
        setLibraryFilters((prev) => ({ ...prev, installedOnly: !prev.installedOnly }));
      } else {
        setLibraryFilters((prev) => ({ ...prev, favoritesOnly: !prev.favoritesOnly }));
      }
      return;
    }

    if (section === 'year') {
      const yearIds = ['all', '2024+', '2020-2023', '2015-2019', '2010-2014', '2000-2009', 'retro'];
      if (yearIds[index]) {
        setLibraryFilters((prev) => ({ ...prev, yearRange: yearIds[index] }));
      }
      return;
    }

    if (section === 'genres') {
      const g = availableGenres[index];
      if (g) {
        setLibraryFilters((prev) => {
          const exists = prev.genres.includes(g.genre);
          return {
            ...prev,
            genres: exists ? prev.genres.filter((x) => x !== g.genre) : [...prev.genres, g.genre],
          };
        });
      }
      return;
    }

    if (section === 'actions') {
      if (index === 0) {
        setIsFilterModalOpen(false);
        setFocusedIndex(0);
      } else if (index === 1 && activeFilterCount > 0) {
        setLibraryFilters({
          platforms: [],
          genres: [],
          yearRange: 'all',
          installedOnly: false,
          favoritesOnly: false,
          sortBy: 'title-asc',
        });
      }
      return;
    }
  };

  // Scroll focused element into view within the filter modal
  useEffect(() => {
    if (!isFilterModalOpen) return;
    const el = document.getElementById(`filter-btn-${filterFocus.section}-${filterFocus.index}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isFilterModalOpen, filterFocus]);

  // Handle Gamepad / Keyboard Navigation
  const handleGamepadLeft = () => {
    if (isPowerMenuOpen) {
      if (pendingPowerAction) {
        playNavMoveSound();
        setPowerConfirmIndex(0);
      }
      return;
    }
    if (isVirtualKeyboardOpen) {
      playNavMoveSound();
      setVkCol((prev) => {
        const rowLen = VK_ROWS[vkRow].length;
        return prev > 0 ? prev - 1 : rowLen - 1;
      });
      return;
    }
    if (isSearchInputActive) return;
    if (isGalleryFullscreen) {
      playNavMoveSound();
      if (activeTab === 'emulators' && emuScreenshots.length > 0) {
        setActiveEmuScreenshotIdx((prev) => (prev > 0 ? prev - 1 : emuScreenshots.length - 1));
      } else if (galleryScreenshots.length > 0) {
        setActiveScreenshotIdx((prev) => (prev > 0 ? prev - 1 : galleryScreenshots.length - 1));
      }
      return;
    }
    if (isAppMenuOpen) {
      playNavMoveSound();
      setAppMenuFocusedIndex((prev) => (prev > 0 ? prev - 1 : Math.max(0, filteredCustomApps.length - 1)));
      return;
    }
    if (isFilterModalOpen) {
      handleModalNavLeft();
      return;
    }
    playNavMoveSound();
    if (selectedGameForDetails) {
      if (galleryScreenshots.length > 0) {
        setActiveScreenshotIdx((prev) => (prev > 0 ? prev - 1 : galleryScreenshots.length - 1));
      }
      return;
    }
    if (activeTab === 'emulators') {
      setSelectedSystemIndex((prev) => {
        const next = prev > 0 ? prev - 1 : emulatorSystems.length - 1;
        setSelectedEmuGameIndex(0);
        return next;
      });
      return;
    }
    if (activeTab === 'search' && searchFocusTarget === 'input') {
      return;
    }
    setFocusedIndex((prev) => Math.max(0, prev - 1));
  };

  const handleGamepadRight = () => {
    if (isPowerMenuOpen) {
      if (pendingPowerAction) {
        playNavMoveSound();
        setPowerConfirmIndex(1);
      }
      return;
    }
    if (isVirtualKeyboardOpen) {
      playNavMoveSound();
      setVkCol((prev) => {
        const rowLen = VK_ROWS[vkRow].length;
        return prev < rowLen - 1 ? prev + 1 : 0;
      });
      return;
    }
    if (isSearchInputActive) return;
    if (isGalleryFullscreen) {
      playNavMoveSound();
      if (activeTab === 'emulators' && emuScreenshots.length > 0) {
        setActiveEmuScreenshotIdx((prev) => (prev < emuScreenshots.length - 1 ? prev + 1 : 0));
      } else if (galleryScreenshots.length > 0) {
        setActiveScreenshotIdx((prev) => (prev < galleryScreenshots.length - 1 ? prev + 1 : 0));
      }
      return;
    }
    if (isAppMenuOpen) {
      playNavMoveSound();
      setAppMenuFocusedIndex((prev) => (prev < filteredCustomApps.length - 1 ? prev + 1 : 0));
      return;
    }
    if (isFilterModalOpen) {
      handleModalNavRight();
      return;
    }
    playNavMoveSound();
    if (selectedGameForDetails) {
      if (galleryScreenshots.length > 0) {
        setActiveScreenshotIdx((prev) => (prev < galleryScreenshots.length - 1 ? prev + 1 : 0));
      }
      return;
    }

    if (activeTab === 'emulators') {
      setSelectedSystemIndex((prev) => {
        const next = prev < emulatorSystems.length - 1 ? prev + 1 : 0;
        setSelectedEmuGameIndex(0);
        return next;
      });
      return;
    }

    if (activeTab === 'search' && searchFocusTarget === 'input') {
      return;
    }

    let maxIdx = 0;
    if (activeTab === 'home') {
      const row = homeRows[focusedRow];
      maxIdx = (row?.items.length || 1) - 1;
    } else if (activeTab === 'library') {
      maxIdx = Math.max(0, libraryGames.length - 1);
    } else if (activeTab === 'search') {
      maxIdx = Math.max(0, searchResults.length - 1);
    }
    setFocusedIndex((prev) => Math.min(maxIdx, prev + 1));
  };

  const getGridColumns = () => {
    // Ultra-fast viewport matching for:
    // grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-9 2xl:grid-cols-10
    const w = typeof window !== 'undefined' ? window.innerWidth : 1280;
    if (w >= 1536) return 10; // 2xl
    if (w >= 1280) return 9;  // xl
    if (w >= 1024) return 8;  // lg
    if (w >= 768) return 6;   // md
    if (w >= 640) return 4;   // sm
    return 3;                 // default
  };

  const moveVerticalInGrid = (direction: 'up' | 'down') => {
    const totalItems =
      activeTab === 'library'
        ? libraryGames.length
        : activeTab === 'search'
        ? searchResults.length
        : 0;

    if (totalItems <= 1) return;

    const cols = getGridColumns();
    if (direction === 'down') {
      setFocusedIndex((prev) => {
        const next = prev + cols;
        if (next < totalItems) {
          return next;
        }
        // If next is past totalItems, check if there is a row below us
        const currentRow = Math.floor(prev / cols);
        const lastRow = Math.floor((totalItems - 1) / cols);
        if (currentRow < lastRow) {
          return totalItems - 1;
        }
        // Already on the last row: don't move
        return prev;
      });
    } else {
      setFocusedIndex((prev) => {
        if (prev - cols >= 0) {
          return prev - cols;
        }
        // Already on the top row: don't move
        return prev;
      });
    }
  };

  const handleGamepadUp = () => {
    if (isPowerMenuOpen) {
      playNavMoveSound();
      if (pendingPowerAction) {
        setPowerConfirmIndex((prev) => (prev === 0 ? 1 : 0));
        return;
      }
      setPowerMenuFocusedIndex((prev) => Math.max(0, prev - 1));
      return;
    }
    if (isVirtualKeyboardOpen) {
      playNavMoveSound();
      if (vkRow === 0) {
        setIsVirtualKeyboardOpen(false);
        setSearchFocusTarget('input');
        return;
      }
      setVkRow((prevRow) => {
        const nextRow = prevRow - 1;
        setVkCol((prevCol) => {
          const currLen = VK_ROWS[prevRow].length;
          const nextLen = VK_ROWS[nextRow].length;
          return Math.min(nextLen - 1, Math.round((prevCol / (currLen - 1)) * (nextLen - 1)));
        });
        return nextRow;
      });
      return;
    }
    if (isAppMenuOpen) {
      playNavMoveSound();
      setAppMenuFocusedIndex((prev) => (prev >= 3 ? prev - 3 : prev));
      return;
    }
    if (isFilterModalOpen) {
      handleModalNavUp();
      return;
    }
    playNavMoveSound();
    if (selectedGameForDetails) return;

    if (activeTab === 'emulators') {
      setSelectedEmuGameIndex((prev) => Math.max(0, prev - 1));
      return;
    }

    if (activeTab === 'search') {
      if (searchFocusTarget === 'grid') {
        const cols = getGridColumns();
        if (focusedIndex < cols) {
          setSearchFocusTarget('input');
          return;
        }
      }
      moveVerticalInGrid('up');
      return;
    }

    if (activeTab === 'home') {
      setFocusedRow((prev) => {
        const next = Math.max(0, prev - 1);
        const row = homeRows[next];
        if (row && row.items.length > 0) {
          setFocusedIndex((prevIdx) => Math.min(prevIdx, row.items.length - 1));
        }
        return next;
      });
    } else {
      moveVerticalInGrid('up');
    }
  };

  const handleGamepadDown = () => {
    if (isPowerMenuOpen) {
      playNavMoveSound();
      if (pendingPowerAction) {
        setPowerConfirmIndex((prev) => (prev === 0 ? 1 : 0));
        return;
      }
      setPowerMenuFocusedIndex((prev) => Math.min(powerOptions.length - 1, prev + 1));
      return;
    }
    if (isVirtualKeyboardOpen) {
      playNavMoveSound();
      if (vkRow >= VK_ROWS.length - 1) {
        if (searchResults.length > 0) {
          setIsVirtualKeyboardOpen(false);
          setSearchFocusTarget('grid');
          setFocusedIndex(0);
        }
        return;
      }
      setVkRow((prevRow) => {
        const nextRow = prevRow + 1;
        setVkCol((prevCol) => {
          const currLen = VK_ROWS[prevRow].length;
          const nextLen = VK_ROWS[nextRow].length;
          return Math.min(nextLen - 1, Math.round((prevCol / (currLen - 1)) * (nextLen - 1)));
        });
        return nextRow;
      });
      return;
    }
    if (isAppMenuOpen) {
      playNavMoveSound();
      setAppMenuFocusedIndex((prev) => (prev + 3 < filteredCustomApps.length ? prev + 3 : prev));
      return;
    }
    if (isFilterModalOpen) {
      handleModalNavDown();
      return;
    }
    playNavMoveSound();
    if (selectedGameForDetails) return;

    if (activeTab === 'emulators') {
      setSelectedEmuGameIndex((prev) =>
        Math.min(Math.max(0, activeSystemGames.length - 1), prev + 1)
      );
      return;
    }

    if (activeTab === 'search') {
      if (searchFocusTarget === 'input') {
        if (searchResults.length > 0) {
          setSearchFocusTarget('grid');
          setFocusedIndex(0);
        }
        return;
      }
      moveVerticalInGrid('down');
      return;
    }

    if (activeTab === 'home') {
      setFocusedRow((prev) => {
        const next = Math.min(Math.max(0, homeRows.length - 1), prev + 1);
        const row = homeRows[next];
        if (row && row.items.length > 0) {
          setFocusedIndex((prevIdx) => Math.min(prevIdx, row.items.length - 1));
        }
        return next;
      });
    } else {
      moveVerticalInGrid('down');
    }
  };

  const handleGamepadConfirm = () => {
    if (isPowerMenuOpen) {
      if (pendingPowerAction) {
        handleConfirmPowerAction(powerConfirmIndex === 0);
        return;
      }
      executePowerAction(powerOptions[powerMenuFocusedIndex].id);
      return;
    }

    if (isVirtualKeyboardOpen) {
      const key = VK_ROWS[vkRow]?.[vkCol];
      if (key) {
        handleVirtualKeyPress(key);
      }
      return;
    }

    if (isAppMenuOpen) {
      if (filteredCustomApps[appMenuFocusedIndex]) {
        handleLaunchCustomApp(filteredCustomApps[appMenuFocusedIndex]);
      }
      return;
    }

    if (isFilterModalOpen) {
      handleModalConfirm();
      return;
    }

    if (activeTab === 'search' && searchFocusTarget === 'input') {
      if (inputDeviceType !== 'keyboard') {
        playNavSelectSound();
        setIsVirtualKeyboardOpen(true);
        setVkRow(1);
        setVkCol(4);
      } else {
        if (!isSearchInputActive) {
          playNavSelectSound();
          setIsSearchInputActive(true);
          setTimeout(() => searchInputRef.current?.focus(), 20);
        }
      }
      return;
    }

    if (selectedGameForDetails) {
      playLaunchGameSound();
      onLaunchGame(selectedGameForDetails);
      setSelectedGameForDetails(null);
      return;
    }

    if (currentFocusedGame) {
      playLaunchGameSound();
      onLaunchGame(currentFocusedGame);
    }
  };

  const handleGamepadBack = () => {
    playNavBackSound();
    if (isVirtualKeyboardOpen) {
      setIsVirtualKeyboardOpen(false);
      setSearchFocusTarget('input');
      return;
    }
    if (isSearchInputActive || document.activeElement === searchInputRef.current) {
      searchInputRef.current?.blur();
      setIsSearchInputActive(false);
      return;
    }
    if (isGalleryFullscreen) {
      setIsGalleryFullscreen(false);
      return;
    }
    if (isPowerMenuOpen) {
      if (pendingPowerAction) {
        setPendingPowerAction(null);
        return;
      }
      setIsPowerMenuOpen(false);
      return;
    }
    if (isAppMenuOpen) {
      setIsAppMenuOpen(false);
      return;
    }
    if (isFilterModalOpen) {
      setIsFilterModalOpen(false);
      return;
    }
    if (selectedGameForDetails) {
      setSelectedGameForDetails(null);
      return;
    }
    if (activeTab === 'search' && searchFocusTarget === 'grid') {
      setSearchFocusTarget('input');
      return;
    }
    // At root level: Open Power & Exit Menu!
    setPendingPowerAction(null);
    setIsPowerMenuOpen(true);
    setPowerMenuFocusedIndex(0);
  };

  const handleGamepadActionX = () => {
    if (isPowerMenuOpen || isAppMenuOpen) return;
    if (isVirtualKeyboardOpen) {
      playNavBackSound();
      setSearchQuery((prev) => prev.slice(0, -1));
      setFocusedIndex(0);
      return;
    }
    if (isSearchInputActive) return;
    if (activeTab === 'emulators') {
      if (emuScreenshots.length > 0) {
        playNavSelectSound();
        setIsGalleryFullscreen((prev) => !prev);
      }
      return;
    }
    if (currentFocusedGame) {
      playNavSelectSound();
      setSelectedGameForDetails(currentFocusedGame);
    }
  };

  const handleGamepadActionY = () => {
    if (isPowerMenuOpen || isAppMenuOpen) return;
    if (isVirtualKeyboardOpen) {
      playNavSelectSound();
      setSearchQuery((prev) => prev + ' ');
      setFocusedIndex(0);
      return;
    }
    if (isSearchInputActive) return;
    if (isFilterModalOpen) {
      playNavBackSound();
      setIsFilterModalOpen(false);
      return;
    }
    if (activeTab === 'library') {
      playNavSelectSound();
      setIsFilterModalOpen(true);
      setFilterFocus({ section: 'platforms', index: 0 });
      return;
    }
    if (currentFocusedGame) {
      playNavSelectSound();
      onToggleFavorite(currentFocusedGame.id);
    }
  };

  const tabs: BigPictureTab[] = ['home', 'library', 'emulators', 'search'];

  const handleGamepadPrevTab = () => {
    if (selectedGameForDetails || isFilterModalOpen || isAppMenuOpen || isPowerMenuOpen || isSearchInputActive || isVirtualKeyboardOpen) return;
    playNavSelectSound();
    const currIdx = tabs.indexOf(activeTab);
    const nextIdx = currIdx > 0 ? currIdx - 1 : tabs.length - 1;
    setActiveTab(tabs[nextIdx]);
    setFocusedRow(0);
    setFocusedIndex(0);
    setSearchFocusTarget('input');
    setIsSearchInputActive(false);
    setIsVirtualKeyboardOpen(false);
    searchInputRef.current?.blur();
  };

  const handleGamepadNextTab = () => {
    if (selectedGameForDetails || isFilterModalOpen || isAppMenuOpen || isPowerMenuOpen || isSearchInputActive || isVirtualKeyboardOpen) return;
    playNavSelectSound();
    const currIdx = tabs.indexOf(activeTab);
    const nextIdx = currIdx < tabs.length - 1 ? currIdx + 1 : 0;
    setActiveTab(tabs[nextIdx]);
    setFocusedRow(0);
    setFocusedIndex(0);
    setSearchFocusTarget('input');
    setIsSearchInputActive(false);
    setIsVirtualKeyboardOpen(false);
    searchInputRef.current?.blur();
  };

  const navCallbacks: GamepadNavCallbacks = {
    onLeft: handleGamepadLeft,
    onRight: handleGamepadRight,
    onUp: handleGamepadUp,
    onDown: handleGamepadDown,
    onConfirm: handleGamepadConfirm,
    onBack: handleGamepadBack,
    onActionX: handleGamepadActionX,
    onActionY: handleGamepadActionY,
    onPrevTab: handleGamepadPrevTab,
    onNextTab: handleGamepadNextTab,
    onToggleBigPicture: onExitBigPicture,
    onStart: () => {
      if (isVirtualKeyboardOpen) {
        playNavSelectSound();
        setIsVirtualKeyboardOpen(false);
        if (searchResults.length > 0) {
          setSearchFocusTarget('grid');
          setFocusedIndex(0);
        } else {
          setSearchFocusTarget('input');
        }
        return;
      }
      playNavSelectSound();
      setIsAppMenuOpen((prev) => !prev);
    },
    onGuide: () => {
      playNavSelectSound();
      setIsAppMenuOpen((prev) => !prev);
    },
    onRightStickY: (value: number) => {
      // Moderate scroll speed proportional to screen height (around 6px per frame on 1080p at full tilt)
      const speed = Math.max(4, Math.round(window.innerHeight * 0.006));
      const scrollDelta = value * speed;

      // 1. If Game Details Modal is open: scroll details description or modal body
      if (selectedGameForDetails && activeDetailsGame) {
        const detailsDescEl = detailsDescriptionRef.current;
        if (detailsDescEl && detailsDescEl.scrollHeight > detailsDescEl.clientHeight) {
          detailsDescEl.scrollTop += scrollDelta;
          return;
        }
        if (detailsModalRef.current) {
          detailsModalRef.current.scrollTop += scrollDelta;
        }
        return;
      }

      // 2. If in Emulators tab: scroll active emulator game description box
      if (activeTab === 'emulators') {
        const emuDescEl = emuDescriptionRef.current;
        if (emuDescEl) {
          emuDescEl.scrollTop += scrollDelta;
        }
        return;
      }
    },
    onInputActivity: () => {
      setIsMouseIdle(true);
      if (mouseIdleTimerRef.current) {
        window.clearTimeout(mouseIdleTimerRef.current);
      }
    },
  };

  const { isGamepadActive, controllerName, inputDeviceType } = useGamepadNavigation(navCallbacks, {
    enabled: true,
  });

  // Auto-scroll focused app tile inside Start Menu container without shifting the modal or viewport
  useEffect(() => {
    if (!isAppMenuOpen || !appGridRef.current) return;
    const container = appGridRef.current;
    const el = document.getElementById(`app-tile-${appMenuFocusedIndex}`);
    if (el) {
      const elTop = el.offsetTop;
      const elHeight = el.offsetHeight;
      const containerScrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;

      if (elTop < containerScrollTop) {
        container.scrollTo({ top: Math.max(0, elTop - 12), behavior: 'smooth' });
      } else if (elTop + elHeight > containerScrollTop + containerHeight) {
        container.scrollTo({ top: elTop + elHeight - containerHeight + 12, behavior: 'smooth' });
      }
    }
  }, [isAppMenuOpen, appMenuFocusedIndex]);

  // Reset scroll to top when opening the Apps Menu
  useEffect(() => {
    if (isAppMenuOpen && appGridRef.current) {
      appGridRef.current.scrollTop = 0;
    }
  }, [isAppMenuOpen]);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setBigPictureSoundEnabled(next);
    if (next) playNavSelectSound();
  };

  const [debouncedBackdrop, setDebouncedBackdrop] = useState<string | null>(null);

  useEffect(() => {
    const target =
      (activeTab === 'emulators' && emuScreenshots[activeEmuScreenshotIdx]?.full) ||
      currentFocusedGame?.bannerUrl ||
      currentFocusedGame?.coverUrl ||
      null;

    const timer = setTimeout(() => {
      setDebouncedBackdrop(target);
    }, 90);

    return () => clearTimeout(timer);
  }, [
    currentFocusedGame?.id,
    currentFocusedGame?.bannerUrl,
    currentFocusedGame?.coverUrl,
    activeTab,
    activeEmuScreenshotIdx,
    emuScreenshots,
  ]);

  return (
    <div
      className={`fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col overflow-hidden select-none font-sans ${
        isMouseIdle ? 'cursor-none select-none' : ''
      }`}
    >
      {/* Dynamic Ambient Cinematic Backdrop (Debounced for 60+ FPS navigation) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-300 ease-out scale-105 filter blur-3xl opacity-25"
          style={{ backgroundImage: debouncedBackdrop ? `url(${debouncedBackdrop})` : undefined }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/60 to-transparent" />
      </div>

      {/* 1. TOP HEADER (10-foot Bar - Viewport-proportional) */}
      <header className="relative z-10 px-[2vw] py-[0.8vh] h-[6vh] flex items-center justify-between bg-slate-950/70 backdrop-blur-md shrink-0">
        {/* Brand & Clock */}
        <div className="flex items-center gap-[0.8vw]">
          <div className="flex items-center gap-[0.5vw]">
            <div className="w-[3.2vh] h-[3.2vh] rounded-[0.7vh] bg-blue-600/30 flex items-center justify-center border border-blue-500/40 shadow-md shadow-blue-500/20">
              <img src={aegisLogo} alt="Aegis Hub" className="w-[1.8vh] h-[1.8vh] object-contain" />
            </div>
            <span className="text-[1.7vh] font-black tracking-wider text-white">
              AEGIS <span className="text-blue-500">BIG PICTURE</span>
            </span>
          </div>

          <div className="h-[2.4vh] w-[1px] bg-slate-800 mx-[0.4vw]" />

          {/* Clock */}
          <div className="flex items-center gap-[0.4vw] text-slate-300 font-mono text-[1.4vh] font-semibold">
            <Clock className="w-[1.6vh] h-[1.6vh] text-blue-400" />
            <span>{currentTime}</span>
          </div>

          {/* Controller / Peripheral status indicator */}
          <div
            className={`flex items-center gap-[0.4vw] px-[0.8vw] py-[0.3vh] rounded-full text-[1.25vh] font-semibold border shadow-sm transition-colors ${
              inputDeviceType !== 'keyboard'
                ? inputDeviceType === 'playstation'
                  ? 'bg-blue-950/60 border-blue-500/40 text-blue-300'
                  : inputDeviceType === 'switch'
                  ? 'bg-red-950/60 border-red-500/40 text-red-300'
                  : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-900 border-slate-800 text-slate-300'
            }`}
          >
            {inputDeviceType === 'keyboard' ? (
              <Keyboard className="w-[1.5vh] h-[1.5vh] text-blue-400" />
            ) : (
              <Gamepad2 className="w-[1.5vh] h-[1.5vh]" />
            )}
            <span>{controllerName}</span>
          </div>
        </div>

        {/* Center Navigation Tabs */}
        <nav className="flex items-center gap-[0.4vw] bg-slate-900/60 border border-slate-800/60 rounded-[1vh] p-[0.3vh] shadow-lg">
          <button
            onClick={() => {
              playNavSelectSound();
              setIsVirtualKeyboardOpen(false);
              setActiveTab('home');
              setFocusedRow(0);
              setFocusedIndex(0);
            }}
            className={`px-[1.2vw] py-[0.6vh] rounded-[0.7vh] text-[1.35vh] font-bold transition flex items-center gap-[0.4vw] ${
              activeTab === 'home'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Flame className="w-[1.6vh] h-[1.6vh]" />
            <span>Home</span>
          </button>

          <button
            onClick={() => {
              playNavSelectSound();
              setIsVirtualKeyboardOpen(false);
              setActiveTab('library');
              setFocusedIndex(0);
            }}
            className={`px-[1.2vw] py-[0.6vh] rounded-[0.7vh] text-[1.35vh] font-bold transition flex items-center gap-[0.4vw] ${
              activeTab === 'library'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-[1.6vh] h-[1.6vh]" />
            <span>Library ({games.length})</span>
          </button>

          <button
            onClick={() => {
              playNavSelectSound();
              setIsVirtualKeyboardOpen(false);
              setActiveTab('emulators');
              setFocusedIndex(0);
            }}
            className={`px-[1.2vw] py-[0.6vh] rounded-[0.7vh] text-[1.35vh] font-bold transition flex items-center gap-[0.4vw] ${
              activeTab === 'emulators'
                ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Tv className="w-[1.6vh] h-[1.6vh]" />
            <span>Emulators ({emulatedGames.length})</span>
          </button>

          <button
            onClick={() => {
              playNavSelectSound();
              setIsVirtualKeyboardOpen(false);
              setActiveTab('search');
              setSearchFocusTarget('input');
              setIsSearchInputActive(false);
              setFocusedIndex(0);
            }}
            className={`px-[1.2vw] py-[0.6vh] rounded-[0.7vh] text-[1.35vh] font-bold transition flex items-center gap-[0.4vw] ${
              activeTab === 'search'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Search className="w-[1.6vh] h-[1.6vh]" />
            <span>Search</span>
          </button>
        </nav>

        {/* Right Tools & Exit */}
        <div className="flex items-center gap-[0.5vw]">
          <button
            onClick={toggleSound}
            title={soundOn ? 'Mute Sound FX' : 'Enable Sound FX'}
            className="w-[3.6vh] h-[3.6vh] rounded-[0.7vh] bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 transition"
          >
            {soundOn ? <Volume2 className="w-[1.6vh] h-[1.6vh] text-blue-400" /> : <VolumeX className="w-[1.6vh] h-[1.6vh] text-slate-500" />}
          </button>

          <button
            onClick={() => {
              playNavSelectSound();
              setIsPowerMenuOpen(true);
              setPowerMenuFocusedIndex(0);
            }}
            title="Power & Exit (Esc)"
            className="flex items-center gap-[0.4vw] px-[1vw] py-[0.6vh] rounded-[0.7vh] bg-slate-900 hover:bg-rose-950/60 border border-slate-800 hover:border-rose-500/40 text-slate-300 hover:text-rose-200 text-[1.3vh] font-bold transition shadow cursor-pointer"
          >
            <Power className="w-[1.5vh] h-[1.5vh] text-rose-400" />
            <span>Power (Esc)</span>
          </button>
        </div>
      </header>

      {/* 2. PINNED HERO SPOTLIGHT BANNER (Viewport-relative, prominent & legible) */}
      {currentFocusedGame && activeTab !== 'emulators' && activeTab !== 'search' && (
        <section className="relative z-20 px-[2vw] py-[1.2vh] bg-slate-950/95 border-b border-slate-800/80 shrink-0 shadow-2xl">
          <div className="w-full flex items-center justify-start gap-[1.2vw]">
            {/* 1. Left Column: Poster Cover Artwork */}
            <div className="h-[13.5vh] aspect-[2/3] rounded-[1vh] overflow-hidden shadow-xl border border-slate-700/80 shrink-0 bg-slate-900">
              <GameImage
                src={currentFocusedGame.coverUrl}
                alt={currentFocusedGame.title}
                title={currentFocusedGame.title}
                platform={currentFocusedGame.platform}
                type="cover"
                className="w-full h-full object-cover"
              />
            </div>

            {/* 2. Middle & Right: Title, Badges/Genres & Actions */}
            <div className="space-y-[0.5vh] min-w-0 flex-1 text-left">
              {/* Row 1: Title + Playtime */}
              <div className="flex items-center gap-[0.8vw]">
                <h1
                  className="text-[2.4vh] font-black text-white tracking-tight drop-shadow-md truncate"
                  title={currentFocusedGame.title}
                >
                  {currentFocusedGame.title}
                </h1>
                {currentFocusedGame.playtimeMinutes && currentFocusedGame.playtimeMinutes > 0 ? (
                  <span className="text-[1.2vh] text-slate-300 bg-slate-800/80 px-[0.7vw] py-[0.25vh] rounded-full border border-slate-700 font-mono shrink-0">
                    {formatPlaytime(currentFocusedGame.playtimeMinutes)}
                  </span>
                ) : null}
              </div>

              {/* Row 2: Badges (Platform, Favorite, Installed) + Genres together */}
              <div className="flex items-center gap-[0.5vw] flex-wrap">
                {currentFocusedGame.platform === 'emulator' ? (
                  <span className="flex items-center gap-[0.4vw] text-[1.25vh] px-[0.7vw] py-[0.25vh] rounded-full bg-violet-600/20 text-violet-300 border border-violet-500/30 font-bold">
                    <Tv className="w-[1.4vh] h-[1.4vh] text-violet-400" />
                    <span>{getGameConsoleName(currentFocusedGame)}</span>
                  </span>
                ) : (
                  showPlatformBadges && <PlatformBadge platform={currentFocusedGame.platform} size="xs" />
                )}

                {currentFocusedGame.favorite && (
                  <span className="flex items-center gap-[0.4vw] text-[1.2vh] px-[0.6vw] py-[0.25vh] rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                    <Star className="w-[1.3vh] h-[1.3vh] fill-amber-400 text-amber-400" /> Favorite
                  </span>
                )}

                {currentFocusedGame.installed !== false && (
                  <span className="flex items-center gap-[0.4vw] text-[1.2vh] px-[0.6vw] py-[0.25vh] rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                    <CheckCircle2 className="w-[1.3vh] h-[1.3vh] text-emerald-400" /> Installed
                  </span>
                )}

                {/* Genres / Tags inline beside store badge */}
                {currentFocusedGame.genres && currentFocusedGame.genres.length > 0 && (
                  <>
                    <span className="text-slate-600 text-[1.3vh]">•</span>
                    {currentFocusedGame.genres.slice(0, 4).map((g) => (
                      <span
                        key={g}
                        className="text-[1.15vh] font-medium px-[0.6vw] py-[0.25vh] rounded-md bg-slate-900/90 text-slate-300 border border-slate-800"
                      >
                        {g}
                      </span>
                    ))}
                  </>
                )}
              </div>

              {/* Row 3: Action Buttons with Dynamic Controller Glyphs */}
              <div className="flex items-center gap-[0.6vw] pt-[0.2vh]">
                <button
                  onClick={() => {
                    playLaunchGameSound();
                    onLaunchGame(currentFocusedGame);
                  }}
                  className="flex items-center gap-[0.5vw] px-[1.4vw] py-[0.8vh] bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-[0.8vh] font-bold text-[1.4vh] shadow-lg shadow-blue-600/30 hover:shadow-blue-500/50 transition-all duration-200"
                >
                  <Play className="w-[1.5vh] h-[1.5vh] fill-white" />
                  <span>PLAY NOW</span>
                  <ControllerGlyph type={inputDeviceType} action="confirm" className="ml-0.5 scale-95" />
                </button>

                <button
                  onClick={() => {
                    playNavSelectSound();
                    setSelectedGameForDetails(currentFocusedGame);
                  }}
                  className="flex items-center gap-[0.5vw] px-[1.2vw] py-[0.8vh] bg-slate-800/90 hover:bg-slate-700 active:scale-95 text-slate-200 rounded-[0.8vh] font-bold text-[1.35vh] border border-slate-700 transition"
                >
                  <Info className="w-[1.5vh] h-[1.5vh] text-blue-400" />
                  <span>Details</span>
                  <ControllerGlyph type={inputDeviceType} action="details" className="ml-0.5 scale-95" />
                </button>

                <button
                  onClick={() => {
                    playNavSelectSound();
                    onToggleFavorite(currentFocusedGame.id);
                  }}
                  className="flex items-center gap-[0.4vw] px-[1vw] py-[0.8vh] bg-slate-800/90 hover:bg-slate-700 active:scale-95 text-slate-200 rounded-[0.8vh] border border-slate-700 transition"
                  title="Toggle Favorite"
                >
                  <Star
                    className={`w-[1.5vh] h-[1.5vh] ${
                      currentFocusedGame.favorite
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-400'
                    }`}
                  />
                  <ControllerGlyph type={inputDeviceType} action="favorite" className="scale-95" />
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 3. MAIN CONTENT AREA (Scrollable below pinned banner - Viewport-proportional) */}
      <main
        ref={mainScrollRef}
        className={`relative z-10 flex-1 ${
          activeTab === 'emulators'
            ? 'overflow-hidden px-[2vw] pt-[0.5vh] pb-[6vh] flex flex-col'
            : activeTab === 'search'
            ? 'overflow-hidden px-[1vw] pt-[1vh] pb-0 flex flex-col'
            : 'overflow-y-auto px-[0.5vw] pt-[1.5vh] pb-[18vh] space-y-[0.5vh]'
        }`}
      >

        {/* TAB 1: HOME CAROUSEL ROWS */}
        {activeTab === 'home' && (
          <div className="space-y-[0.5vh] pt-[0.5vh]">
            {homeRows.map((row, rowIdx) => {
              const isRowFocused = focusedRow === rowIdx;

              return (
                <div
                  key={row.id}
                  ref={(el) => {
                    rowRefs.current[rowIdx] = el;
                  }}
                  className={`space-y-0 relative ${
                    isRowFocused ? 'z-30' : 'z-10'
                  }`}
                >
                  {/* Row Header */}
                  <div className="flex items-center justify-between px-[3.5vw] pt-[0.8vh]">
                    <h2
                      className={`flex items-center gap-[0.5vw] transition-colors duration-150 ${
                        isRowFocused
                          ? 'text-[1.85vh] font-black text-white'
                          : 'text-[1.45vh] font-semibold text-slate-400'
                      }`}
                    >
                      <span>{row.title}</span>
                      <span
                        className={`text-[1.15vh] px-[0.5vw] py-[0.1vh] rounded-full font-mono ${
                          isRowFocused
                            ? 'bg-blue-600/30 text-blue-300 border border-blue-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {row.items.length}
                      </span>
                    </h2>
                  </div>

                  {/* Horizontal Scrolling Carousel (Generous padding & negative margins so the 32px glow is never clipped by the overflow boundaries) */}
                  <div className="flex items-center gap-[1.2vw] overflow-x-auto pt-[6vh] pb-[4vh] px-[3.5vw] -mt-[4vh] -mb-[2.5vh] no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    {row.items.map((game, idx) => {
                      const isFocused = isRowFocused && focusedIndex === idx;
                      const shiftDir: -1 | 0 | 1 = !isRowFocused
                        ? 0
                        : idx < focusedIndex
                        ? -1
                        : idx > focusedIndex
                        ? 1
                        : 0;

                      return (
                        <HomeGameCard
                          key={`${row.id}-${game.id}`}
                          game={game}
                          rowIdx={rowIdx}
                          idx={idx}
                          isFocused={isFocused}
                          isRowFocused={isRowFocused}
                          shiftDir={shiftDir}
                          onFocus={handleHomeCardFocus}
                          onLaunch={handleCardLaunch}
                          onRegisterRef={handleRegisterCardRef}
                          showPlatformBadge={showPlatformBadges}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: LIBRARY VIEW */}
        {activeTab === 'library' && (
          <div className="space-y-5">
            {/* Library Control Bar: Filters & Sorting Button + Active Tags */}
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => {
                  playNavSelectSound();
                  setIsFilterModalOpen(true);
                }}
                className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-bold transition shadow-md active:scale-95 ${
                  activeFilterCount > 0
                    ? 'bg-blue-600 text-white shadow-blue-600/30 ring-2 ring-blue-400'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 hover:border-slate-600'
                }`}
              >
                <ControllerGlyph type={inputDeviceType} action="filter" />
                <SlidersHorizontal className="w-4 h-4 text-blue-400" />
                <span>Filters & Sorting</span>
                {activeFilterCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-white text-blue-700 text-[11px] font-black flex items-center justify-center shadow">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* Quick filter status chips */}
              <div className="flex items-center gap-2 flex-wrap">
                {libraryFilters.platforms.length > 0 && (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-950/80 border border-blue-500/40 text-blue-300 text-xs font-semibold">
                    <span>{libraryFilters.platforms.map((p) => p.toUpperCase()).join(', ')}</span>
                    <button
                      onClick={() => setLibraryFilters((prev) => ({ ...prev, platforms: [] }))}
                      className="hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {libraryFilters.genres.length > 0 && (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-950/80 border border-purple-500/40 text-purple-300 text-xs font-semibold">
                    <span>Genres: {libraryFilters.genres.slice(0, 2).join(', ')}{libraryFilters.genres.length > 2 ? ` +${libraryFilters.genres.length - 2}` : ''}</span>
                    <button
                      onClick={() => setLibraryFilters((prev) => ({ ...prev, genres: [] }))}
                      className="hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {libraryFilters.yearRange !== 'all' && (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 text-xs font-semibold">
                    <span>Year: {libraryFilters.yearRange}</span>
                    <button
                      onClick={() => setLibraryFilters((prev) => ({ ...prev, yearRange: 'all' }))}
                      className="hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {libraryFilters.installedOnly && (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
                    <span>Installed Only</span>
                    <button
                      onClick={() => setLibraryFilters((prev) => ({ ...prev, installedOnly: false }))}
                      className="hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {libraryFilters.favoritesOnly && (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-950/80 border border-amber-500/40 text-amber-300 text-xs font-semibold">
                    <span>Favorites Only</span>
                    <button
                      onClick={() => setLibraryFilters((prev) => ({ ...prev, favoritesOnly: false }))}
                      className="hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {libraryFilters.sortBy !== 'title-asc' && (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 text-xs font-semibold">
                    <ArrowUpDown className="w-3 h-3 text-blue-400" />
                    <span>
                      {libraryFilters.sortBy === 'recent'
                        ? 'Recently Played'
                        : libraryFilters.sortBy === 'playtime'
                        ? 'Playtime'
                        : libraryFilters.sortBy === 'release-desc'
                        ? 'Release (New)'
                        : libraryFilters.sortBy === 'release-asc'
                        ? 'Release (Old)'
                        : libraryFilters.sortBy === 'title-desc'
                        ? 'Z to A'
                        : 'Added'}
                    </span>
                    <button
                      onClick={() => setLibraryFilters((prev) => ({ ...prev, sortBy: 'title-asc' }))}
                      className="hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {activeFilterCount > 0 && (
                  <button
                    onClick={() => {
                      playNavSelectSound();
                      setLibraryFilters({
                        platforms: [],
                        genres: [],
                        yearRange: 'all',
                        installedOnly: false,
                        favoritesOnly: false,
                        sortBy: 'title-asc',
                      });
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300 font-bold ml-1 hover:underline"
                  >
                    Reset All
                  </button>
                )}
              </div>

              {/* Counter on Right */}
              <div className="ml-auto text-xs text-slate-400 font-medium">
                Showing <strong className="text-white font-bold">{libraryGames.length}</strong> titles
              </div>
            </div>

            {/* Grid of Games */}
            <div id="library-grid" className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-9 2xl:grid-cols-10 gap-3">
              {libraryGames.map((game, idx) => (
                <LibraryGameCard
                  key={`lib-${game.id}`}
                  game={game}
                  isFocused={focusedIndex === idx}
                  idx={idx}
                  prefix="library"
                  onFocus={handleCardFocus}
                  onLaunch={handleCardLaunch}
                  onRegisterRef={handleRegisterCardRef}
                  showPlatformBadge={showPlatformBadges}
                />
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: EMULATORS VIEW (Viewport-proportional & compact layout) */}
        {activeTab === 'emulators' && (
          <div className="flex-1 flex flex-col min-h-0 gap-[1vh] overflow-hidden select-none animate-fade-in">
            {/* 1. TOP SYSTEMS BAR / CAROUSEL (Proportional to viewport) */}
            <div className="relative shrink-0 bg-slate-900/70 border border-slate-800/80 rounded-[1.2vh] p-[0.8vh] backdrop-blur-xl shadow-xl overflow-hidden h-[10.5vh] flex items-center">
              {/* Left & Right edge gradient fades */}
              <div className="pointer-events-none absolute left-[4vh] top-0 bottom-0 w-[4vw] bg-gradient-to-r from-slate-900 via-slate-900/80 to-transparent z-20" />
              <div className="pointer-events-none absolute right-[4vh] top-0 bottom-0 w-[4vw] bg-gradient-to-l from-slate-900 via-slate-900/80 to-transparent z-20" />

              <div className="flex items-center justify-between gap-[0.6vw] w-full relative">
                {/* Previous System button */}
                <button
                  onClick={() => {
                    playNavMoveSound();
                    setSelectedSystemIndex((prev) => {
                      const next = prev > 0 ? prev - 1 : emulatorSystems.length - 1;
                      setSelectedEmuGameIndex(0);
                      return next;
                    });
                  }}
                  className="w-[4.4vh] h-[4.4vh] rounded-[0.9vh] bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center shrink-0 transition z-30 shadow-lg border border-slate-700/60 cursor-pointer"
                  title="Previous System (←)"
                >
                  <ChevronLeft className="w-[2.2vh] h-[2.2vh]" />
                </button>

                {/* Systems Carousel list */}
                <div
                  ref={emuCarouselContainerRef}
                  className="flex-1 overflow-x-auto flex items-center gap-[0.9vw] scroll-smooth py-[0.4vh] select-none no-scrollbar [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                  style={{
                    paddingLeft: 'calc(50% - 9vh)',
                    paddingRight: 'calc(50% - 9vh)',
                  }}
                >
                  {emulatorSystems.map((sys, sIdx) => {
                    const isSelected = selectedSystemIndex === sIdx;
                    return (
                      <button
                        key={sys.id}
                        ref={(el) => (emuSystemPillsRef.current[sIdx] = el)}
                        onClick={() => {
                          playNavSelectSound();
                          setSelectedSystemIndex(sIdx);
                          setSelectedEmuGameIndex(0);
                        }}
                        className={`group relative shrink-0 w-[17.5vh] h-[8.2vh] rounded-[1.1vh] border transition-all duration-300 ease-out cursor-pointer overflow-hidden ${
                          isSelected
                            ? 'scale-105 opacity-100 z-20 bg-slate-900 border-violet-500 shadow-xl shadow-violet-500/40 ring-2 ring-violet-400'
                            : 'scale-90 opacity-45 hover:opacity-75 hover:scale-95 bg-slate-950/70 border-slate-800/80 shadow-md'
                        }`}
                        title={sys.name}
                      >
                        {/* Top right: Game count */}
                        <div className="absolute top-[0.5vh] right-[0.7vh] z-10 pointer-events-none">
                          <span
                            className={`text-[1.2vh] font-mono font-bold px-[0.6vw] py-[0.15vh] rounded-full border shadow-sm transition-colors duration-300 ${
                              isSelected
                                ? 'bg-violet-950/95 text-violet-200 border-violet-500/60'
                                : 'bg-slate-950/80 text-slate-500 border-slate-800'
                            }`}
                          >
                            {sys.count}
                          </span>
                        </div>

                        {/* Center: System Logo */}
                        <div className="absolute inset-0 flex items-center justify-center p-[0.8vh] pointer-events-none">
                          {sys.id === 'all' ? (
                            <div className={`flex items-center justify-center gap-[0.5vw] transition-transform duration-300 ${isSelected ? 'scale-105' : 'scale-90'}`}>
                              <div
                                className={`w-[3vh] h-[3vh] rounded-[0.6vh] flex items-center justify-center border shadow-sm transition-colors duration-300 ${
                                  isSelected
                                    ? 'bg-violet-600/30 border-violet-400/50 text-white'
                                    : 'bg-violet-950/30 border-violet-500/20 text-violet-400/70'
                                }`}
                              >
                                <Tv className="w-[1.8vh] h-[1.8vh]" />
                              </div>
                              <span
                                className="text-[1.6vh] font-black tracking-wider uppercase text-white"
                                style={{ textShadow: isSelected ? '0 0 12px rgba(255, 255, 255, 0.5)' : 'none' }}
                              >
                                ALL
                              </span>
                            </div>
                          ) : (
                            <img
                              src={sys.logo}
                              alt={sys.shortName}
                              className={`w-full h-full object-contain transition-all duration-300 ${
                                isSelected ? 'max-h-[85%] scale-105' : 'max-h-[72%] scale-95 opacity-75'
                              }`}
                              style={{
                                filter: isSelected
                                  ? 'drop-shadow(0 0 6px rgba(255, 255, 255, 0.95)) drop-shadow(0 0 14px rgba(167, 139, 250, 0.6))'
                                  : 'drop-shadow(0 0 2px rgba(255, 255, 255, 0.25))',
                              }}
                              loading="eager"
                            />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Next System button */}
                <button
                  onClick={() => {
                    playNavMoveSound();
                    setSelectedSystemIndex((prev) => {
                      const next = prev < emulatorSystems.length - 1 ? prev + 1 : 0;
                      setSelectedEmuGameIndex(0);
                      return next;
                    });
                  }}
                  className="w-[4.4vh] h-[4.4vh] rounded-[0.9vh] bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center shrink-0 transition z-30 shadow-lg border border-slate-700/60 cursor-pointer"
                  title="Next System (→)"
                >
                  <ChevronRight className="w-[2.2vh] h-[2.2vh]" />
                </button>
              </div>
            </div>

            {/* 2. SPLIT VIEW: 50% LEFT (GAME LIST) | 50% RIGHT (GAME PREVIEW) */}
            <div className="flex-1 min-h-0 flex flex-row gap-[1.4vw] overflow-hidden">
              {/* Left Column: Game List (50% screen width as requested) */}
              <div className="w-1/2 flex-1 shrink-0 flex flex-col min-h-0 bg-slate-900/60 border border-slate-800/80 rounded-[1.3vh] p-[1.3vh] backdrop-blur-xl shadow-2xl">
                {/* List Header */}
                <div className="shrink-0 flex items-center justify-between pb-[0.9vh] border-b border-slate-800/80 px-[0.6vw]">
                  <div className="flex items-center gap-[0.5vw] min-w-0">
                    <Tv className="w-[2.2vh] h-[2.2vh] text-violet-400 shrink-0" />
                    <span className="text-[1.85vh] font-black text-white truncate tracking-tight">
                      {activeSystem.name}
                    </span>
                  </div>
                  <span className="text-[1.35vh] px-[0.9vw] py-[0.3vh] rounded-full bg-violet-600/20 text-violet-300 border border-violet-500/30 font-mono font-bold shrink-0">
                    {activeSystemGames.length} titles
                  </span>
                </div>

                {/* Scrollable Game Rows */}
                <div className="flex-1 overflow-y-auto space-y-[0.6vh] pr-[0.4vw] pt-[0.7vh] scroll-smooth">
                  {activeSystemGames.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-[4vh] text-center px-[1vw] space-y-[1vh]">
                      <Gamepad2 className="w-[5vh] h-[5vh] text-slate-600 animate-pulse" />
                      <p className="text-[1.7vh] font-bold text-slate-300">No ROMs Found for {activeSystem.shortName}</p>
                      <p className="text-[1.35vh] text-slate-500 max-w-sm">
                        Configure ROM directories in Settings to automatically scan games for this system.
                      </p>
                    </div>
                  ) : (
                    activeSystemGames.map((game, idx) => {
                      const isFocused = selectedEmuGameIndex === idx;
                      const releaseYear = getGameReleaseYear(game);
                      return (
                        <div
                          key={`emu-list-${game.id}`}
                          ref={(el) => (emuGameListRef.current[idx] = el)}
                          onClick={() => {
                            playNavSelectSound();
                            setSelectedEmuGameIndex(idx);
                          }}
                          onDoubleClick={() => {
                            playLaunchGameSound();
                            onLaunchGame(game);
                          }}
                          className={`group relative flex items-center gap-[0.9vw] px-[1.1vw] py-[0.85vh] rounded-[0.9vh] cursor-pointer transition-all duration-150 ${
                            isFocused
                              ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/40 font-semibold scale-[1.01]'
                              : 'bg-slate-950/45 hover:bg-slate-800/70 text-slate-300'
                          }`}
                        >
                          {/* Thumbnail */}
                          <div className="w-[5.4vh] h-[7.2vh] rounded-[0.7vh] overflow-hidden shrink-0 border border-white/10 bg-slate-900 shadow-sm">
                            <GameImage
                              src={game.coverUrl}
                              alt={game.title}
                              title={game.title}
                              platform={game.platform}
                              type="cover"
                              className="w-full h-full object-cover"
                            />
                          </div>

                          {/* Game Info */}
                          <div className="flex-1 min-w-0 text-left">
                            <h4 className="text-[1.7vh] font-bold truncate text-white leading-snug">
                              {game.title}
                            </h4>
                            <div className="flex items-center gap-[0.5vw] text-[1.35vh] text-slate-300 mt-[0.3vh] truncate">
                              <span className="truncate font-semibold text-violet-300">
                                {getGameConsoleName(game)}
                              </span>
                              {releaseYear ? (
                                <>
                                  <span className="opacity-40">•</span>
                                  <span className="text-slate-400 font-mono font-medium">
                                    {releaseYear}
                                  </span>
                                </>
                              ) : null}
                              {game.playtimeMinutes && game.playtimeMinutes > 0 ? (
                                <>
                                  <span className="opacity-40">•</span>
                                  <span className="font-mono text-violet-200 font-bold">
                                    {formatPlaytime(game.playtimeMinutes)}
                                  </span>
                                </>
                              ) : null}
                            </div>
                          </div>

                          {/* Right Indicator (Favorite or Arrow) */}
                          <div className="shrink-0 flex items-center gap-[0.4vw] pr-[0.3vw]">
                            {game.favorite && (
                              <Star className="w-[1.8vh] h-[1.8vh] fill-amber-400 text-amber-400" />
                            )}
                            {isFocused && (
                              <ChevronRight className="w-[2vh] h-[2vh] text-white animate-pulse" />
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column: Game Preview & Details Panel (50% screen width as requested) */}
              <div className="w-1/2 flex-1 min-h-0 flex flex-col bg-slate-900/70 border border-slate-800/80 rounded-[1.3vh] p-[1.5vh] backdrop-blur-xl shadow-2xl overflow-y-auto space-y-[1.3vh] relative">
                {activeEmuGame ? (
                  <>
                    {/* Top Row: Left Sub-column (Cover + Play/Favorite buttons) & Right Sub-column (Info + Metadata + Description) */}
                    <div className="flex flex-row gap-[1.3vw] items-start shrink-0">
                      {/* Left Sub-column: Poster Cover + Buttons directly underneath */}
                      <div className="w-[23vh] shrink-0 flex flex-col gap-[0.9vh]">
                        {/* Vertical Poster Cover */}
                        <div className="aspect-[2/3] w-full rounded-[1.1vh] overflow-hidden border border-slate-700/80 shadow-2xl shadow-violet-950/40 bg-slate-950 relative group">
                          <GameImage
                            src={activeEmuGame.coverUrl}
                            alt={activeEmuGame.title}
                            title={activeEmuGame.title}
                            platform={activeEmuGame.platform}
                            type="cover"
                            className="w-full h-full object-cover"
                          />
                          {activeEmuGame.favorite && (
                            <div className="absolute top-[0.8vh] right-[0.8vh] w-[2.8vh] h-[2.8vh] rounded-full bg-slate-900/90 backdrop-blur-md flex items-center justify-center border border-amber-500/40 shadow">
                              <Star className="w-[1.5vh] h-[1.5vh] fill-amber-400 text-amber-400" />
                            </div>
                          )}
                        </div>

                        {/* Action Buttons: Under the Cover as requested */}
                        <div className="flex items-center gap-[0.5vw] w-full">
                          <button
                            onClick={() => {
                              playLaunchGameSound();
                              onLaunchGame(activeEmuGame);
                            }}
                            className="flex-1 flex items-center justify-center gap-[0.5vw] py-[1.05vh] bg-violet-600 hover:bg-violet-500 active:scale-95 text-white rounded-[0.9vh] font-black text-[1.5vh] shadow-lg shadow-violet-600/40 hover:shadow-violet-500/60 transition-all cursor-pointer"
                          >
                            <Play className="w-[1.8vh] h-[1.8vh] fill-white" />
                            <span>PLAY</span>
                            <ControllerGlyph type={inputDeviceType} action="confirm" className="scale-100" />
                          </button>

                          <button
                            onClick={() => {
                              playNavSelectSound();
                              onToggleFavorite(activeEmuGame.id);
                            }}
                            className="px-[1vw] py-[1.05vh] bg-slate-800/90 hover:bg-slate-700 active:scale-95 text-slate-200 rounded-[0.9vh] border border-slate-700 transition cursor-pointer flex items-center justify-center"
                            title="Toggle Favorite"
                          >
                            <Star
                              className={`w-[1.8vh] h-[1.8vh] ${
                                activeEmuGame.favorite
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-slate-400'
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Right Sub-column: Header, Metadata Grid & Description to the right */}
                      <div className="flex-1 min-w-0 space-y-[0.9vh] text-left">
                        {/* System Badge & Status */}
                        <div className="flex items-center gap-[0.5vw] flex-wrap">
                          <span className="flex items-center gap-[0.4vw] px-[0.9vw] py-[0.35vh] rounded-[0.7vh] bg-violet-600/20 text-violet-300 border border-violet-500/40 text-[1.35vh] font-extrabold tracking-wide">
                            <Tv className="w-[1.6vh] h-[1.6vh] text-violet-400" />
                            <span>{getGameConsoleName(activeEmuGame)}</span>
                          </span>
                          <span className="flex items-center gap-[0.4vw] text-[1.35vh] font-bold px-[0.9vw] py-[0.35vh] rounded-[0.7vh] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-[1.6vh] h-[1.6vh] text-emerald-400" />
                            <span>Ready to Play</span>
                          </span>
                        </div>

                        {/* Title */}
                        <h2 className="text-[2.7vh] font-black text-white leading-tight drop-shadow tracking-tight line-clamp-2">
                          {activeEmuGame.title}
                        </h2>

                        {/* Metadata Cards Grid */}
                        <div className="grid grid-cols-3 gap-[0.5vw]">
                          <div className="p-[0.85vh] rounded-[0.7vh] bg-slate-950/60 border border-slate-800/80">
                            <span className="text-[1.15vh] font-bold text-slate-400 uppercase tracking-wider block">
                              Playtime
                            </span>
                            <span className="text-[1.4vh] font-mono font-bold text-white mt-[0.1vh] block truncate">
                              {formatPlaytime(activeEmuGame.playtimeMinutes || 0)}
                            </span>
                          </div>

                          <div className="p-[0.85vh] rounded-[0.7vh] bg-slate-950/60 border border-slate-800/80">
                            <span className="text-[1.15vh] font-bold text-slate-400 uppercase tracking-wider block">
                              Last Played
                            </span>
                            <span className="text-[1.4vh] font-bold text-slate-200 mt-[0.1vh] block truncate">
                              {activeEmuGame.lastPlayed
                                ? formatRelativeDate(activeEmuGame.lastPlayed)
                                : 'Never'}
                            </span>
                          </div>

                          <div className="p-[0.85vh] rounded-[0.7vh] bg-slate-950/60 border border-slate-800/80">
                            <span className="text-[1.15vh] font-bold text-slate-400 uppercase tracking-wider block">
                              Release Date
                            </span>
                            <span
                              className="text-[1.4vh] font-mono font-bold text-slate-200 mt-[0.1vh] block truncate"
                              title={activeEmuGame.releaseDate || getGameReleaseYear(activeEmuGame) || 'N/A'}
                            >
                              {activeEmuGame.releaseDate || getGameReleaseYear(activeEmuGame) || 'N/A'}
                            </span>
                          </div>

                          <div className="p-[0.85vh] rounded-[0.7vh] bg-slate-950/60 border border-slate-800/80">
                            <span className="text-[1.15vh] font-bold text-slate-400 uppercase tracking-wider block">
                              Developer
                            </span>
                            <span
                              className="text-[1.4vh] font-bold text-slate-200 mt-[0.1vh] block truncate"
                              title={activeEmuGame.developer || 'Unknown'}
                            >
                              {activeEmuGame.developer || 'Unknown'}
                            </span>
                          </div>

                          <div className="p-[0.85vh] rounded-[0.7vh] bg-slate-950/60 border border-slate-800/80">
                            <span className="text-[1.15vh] font-bold text-slate-400 uppercase tracking-wider block">
                              Publisher
                            </span>
                            <span
                              className="text-[1.4vh] font-bold text-slate-200 mt-[0.1vh] block truncate"
                              title={activeEmuGame.publisher && activeEmuGame.publisher !== 'Independent' ? activeEmuGame.publisher : (activeEmuGame.developer && activeEmuGame.developer !== 'Unknown' ? activeEmuGame.developer : 'Independent')}
                            >
                              {activeEmuGame.publisher && activeEmuGame.publisher !== 'Independent' ? activeEmuGame.publisher : (activeEmuGame.developer && activeEmuGame.developer !== 'Unknown' ? activeEmuGame.developer : 'Independent')}
                            </span>
                          </div>

                          <div className="p-[0.85vh] rounded-[0.7vh] bg-slate-950/60 border border-slate-800/80">
                            <span className="text-[1.15vh] font-bold text-slate-400 uppercase tracking-wider block">
                              System
                            </span>
                            <span className="text-[1.4vh] font-bold text-violet-300 mt-[0.1vh] block truncate">
                              {getGameConsoleName(activeEmuGame)}
                            </span>
                          </div>
                        </div>

                        {/* Description to the Right (Legible and comfortable) */}
                        <div className="space-y-[0.4vh] text-left">
                          <div className="flex items-center justify-between">
                            <h4 className="text-[1.35vh] font-bold text-slate-400 uppercase tracking-wider">
                              About the Game
                            </h4>
                            {isFetchingEmuMetadata && (
                              <span className="text-[1.2vh] font-medium text-violet-400 animate-pulse flex items-center gap-[0.4vw]">
                                <span className="w-[0.6vh] h-[0.6vh] rounded-full bg-violet-400 animate-ping" />
                                Fetching details...
                              </span>
                            )}
                          </div>
                          <div
                            ref={emuDescriptionRef}
                            className="p-[1.25vh] rounded-[0.9vh] bg-slate-950/60 border border-slate-800/80 text-[1.45vh] text-slate-200 leading-relaxed font-normal whitespace-pre-line max-h-[19vh] overflow-y-auto"
                          >
                            {cleanGameDescription(activeEmuGame.description || activeEmuGame.summary, true) ||
                              (isFetchingEmuMetadata
                                ? 'Fetching official description...'
                                : 'Experience classic retro gameplay on this emulated console. Launch instantly with full controller support.')}
                          </div>
                        </div>

                        {/* Genres & Categories Tags */}
                        {(() => {
                          const allTags = Array.from(
                            new Set([
                              ...(activeEmuGame.genres || []),
                              ...(activeEmuGame.tags || []),
                            ])
                          ).filter((t) => t && t !== 'Emulated' && !t.toLowerCase().includes('retro') && t !== 'Emulation');

                          if (allTags.length === 0) return null;

                          return (
                            <div className="flex items-center gap-[0.4vw] flex-wrap pt-[0.2vh]">
                              {allTags.slice(0, 6).map((g) => (
                                <span
                                  key={g}
                                  className="text-[1.25vh] font-bold px-[0.8vw] py-[0.25vh] rounded-[0.6vh] bg-violet-950/70 border border-violet-500/40 text-violet-200 shadow-sm"
                                >
                                  {g}
                                </span>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Screenshots & Media Gallery - Prominent */}
                    {(emuScreenshots.length > 0 || isLoadingEmuGallery) && (
                      <div className="space-y-[0.6vh] text-left shrink-0 pt-[0.4vh]">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[1.4vh] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-[0.4vw]">
                            <ImageIcon className="w-[1.8vh] h-[1.8vh] text-violet-400" />
                            <span>
                              Screenshots & Media{' '}
                              {emuScreenshots.length > 0 && (
                                <span className="text-violet-300 font-mono">
                                  ({emuScreenshots.length})
                                </span>
                              )}
                            </span>
                          </h4>
                          <div className="flex items-center gap-[0.4vw]">
                            {isLoadingEmuGallery && (
                              <span className="text-[1.2vh] text-violet-400 animate-pulse flex items-center gap-[0.4vw] font-medium">
                                <span className="w-[0.6vh] h-[0.6vh] rounded-full bg-violet-400 animate-ping" />
                                Loading screenshots...
                              </span>
                            )}
                          </div>
                        </div>

                        {emuScreenshots.length > 0 && (
                          <div className="flex gap-[1vw] overflow-x-auto pb-[0.8vh] pt-[0.3vh] scroll-smooth no-scrollbar select-none">
                            {emuScreenshots.map((shot, sIdx) => {
                              const isSelected = activeEmuScreenshotIdx === sIdx;
                              return (
                                <div
                                  key={shot.id || sIdx}
                                  onClick={() => {
                                    setActiveEmuScreenshotIdx(sIdx);
                                    playNavSelectSound();
                                    setIsGalleryFullscreen(true);
                                  }}
                                  onMouseEnter={() => setActiveEmuScreenshotIdx(sIdx)}
                                  className={`group relative shrink-0 h-[17.5vh] aspect-video rounded-[0.9vh] overflow-hidden bg-black/95 border cursor-pointer transition-all duration-200 shadow-md flex items-center justify-center p-[0.4vh] ${
                                    isSelected
                                      ? 'border-violet-500 ring-2 ring-violet-500/50 scale-[1.02] shadow-violet-950/60'
                                      : 'border-slate-800 hover:border-violet-500/70 hover:scale-[1.01]'
                                  }`}
                                  title="Click to view fullscreen"
                                >
                                  <img
                                    src={shot.thumbnail || shot.full}
                                    alt={`${activeEmuGame.title} screenshot ${sIdx + 1}`}
                                    className="max-h-full max-w-full w-auto h-auto object-contain rounded-[0.6vh] transition-transform duration-300 group-hover:scale-105"
                                    loading="lazy"
                                  />

                                  {/* Hover overlay with badge and fullscreen icon */}
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-[0.8vh] pointer-events-none">
                                    <span className="text-[1.2vh] font-semibold text-white drop-shadow flex items-center gap-[0.4vw]">
                                      <Maximize2 className="w-[1.5vh] h-[1.5vh] text-violet-400" />
                                      <span>Click to enlarge</span>
                                    </span>
                                    <span className="text-[1.2vh] font-mono text-slate-300 drop-shadow">
                                      {sIdx + 1} / {emuScreenshots.length}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full py-[4vh] text-center px-[1vw] space-y-[1.2vh] text-slate-500">
                    <Gamepad2 className="w-[5vh] h-[5vh] text-slate-700 animate-pulse" />
                    <p className="text-[1.7vh] font-bold text-slate-300">Select a game from the list to preview</p>
                    <p className="text-[1.35vh] text-slate-500 max-w-sm">
                      Use the Up and Down directional buttons to browse your retro collection.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SEARCH VIEW */}
        {activeTab === 'search' && (
          <div className="flex-1 min-h-0 flex flex-col select-none">
            {/* 1. PERMANENT PINNED TOP BAR (Shrink-0: Search Bar + Virtual Keyboard + Results Header) */}
            <div className="shrink-0 space-y-[0.8vh] pb-[0.6vh]">
              {/* Search Bar Container - Transitions between compact (when VK open) and full generous size (when VK closed / keyboard mode) */}
              <div
                onClick={() => {
                  if (inputDeviceType !== 'keyboard') {
                    playNavSelectSound();
                    setIsVirtualKeyboardOpen(true);
                    setVkRow(1);
                    setVkCol(4);
                  } else {
                    setIsSearchInputActive(true);
                    setSearchFocusTarget('input');
                    searchInputRef.current?.focus();
                  }
                }}
                className={`relative mx-auto rounded-[1.2vh] flex items-center transition-all duration-200 cursor-pointer ${
                  isVirtualKeyboardOpen
                    ? 'h-[4.2vh] max-w-[50vw]'
                    : 'h-[5.8vh] max-w-[56vw]'
                } ${
                  searchFocusTarget === 'input' && !isSearchInputActive && !isVirtualKeyboardOpen
                    ? 'ring-2 ring-blue-500 border-2 border-blue-400 bg-slate-900 shadow-lg shadow-blue-500/20'
                    : isVirtualKeyboardOpen
                    ? 'ring-2 ring-blue-500/80 border border-blue-400 bg-slate-900 shadow-xl shadow-blue-600/30'
                    : isSearchInputActive
                    ? 'ring-2 ring-blue-500/60 border border-blue-500 bg-slate-900'
                    : 'bg-slate-900/90 border border-slate-700/80 hover:border-slate-600'
                }`}
              >
                <Search
                  className={`absolute left-[1.2vw] top-1/2 -translate-y-1/2 transition-colors ${
                    isVirtualKeyboardOpen ? 'w-[2vh] h-[2vh]' : 'w-[2.4vh] h-[2.4vh]'
                  } ${
                    searchFocusTarget === 'input' || isSearchInputActive || isVirtualKeyboardOpen ? 'text-blue-400' : 'text-slate-400'
                  }`}
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder={isVirtualKeyboardOpen ? '' : 'Search games, platforms, genres...'}
                  value={searchQuery}
                  onFocus={() => {
                    if (inputDeviceType === 'keyboard') {
                      setIsSearchInputActive(true);
                      setSearchFocusTarget('input');
                    }
                  }}
                  onBlur={() => {
                    setIsSearchInputActive(false);
                  }}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setFocusedIndex(0);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      e.stopPropagation();
                      searchInputRef.current?.blur();
                      setIsSearchInputActive(false);
                      setIsVirtualKeyboardOpen(false);
                      playNavBackSound();
                    } else if (e.key === 'Enter') {
                      e.preventDefault();
                      searchInputRef.current?.blur();
                      setIsSearchInputActive(false);
                      setIsVirtualKeyboardOpen(false);
                      playNavSelectSound();
                      if (searchResults.length > 0) {
                        setSearchFocusTarget('grid');
                        setFocusedIndex(0);
                      }
                    }
                  }}
                  className={`w-full bg-transparent pl-[3.5vw] pr-[15vw] py-0 h-full text-white placeholder-slate-500 focus:outline-none font-semibold select-text ${
                    isVirtualKeyboardOpen ? 'text-[1.35vh]' : 'text-[1.65vh]'
                  }`}
                />

                {/* Action Hint / Status indicator on right */}
                <div className="absolute right-[0.8vw] top-1/2 -translate-y-1/2 flex items-center gap-[0.5vw]">
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSearchQuery('');
                        if (inputDeviceType === 'keyboard') {
                          searchInputRef.current?.focus();
                        }
                      }}
                      className="p-[0.5vh] rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                      title="Limpar pesquisa"
                    >
                      <X className={isVirtualKeyboardOpen ? 'w-[1.5vh] h-[1.5vh]' : 'w-[1.8vh] h-[1.8vh]'} />
                    </button>
                  )}

                  {/* On-Screen Keyboard toggle button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      playNavSelectSound();
                      setIsVirtualKeyboardOpen((prev) => !prev);
                    }}
                    className={`p-[0.6vh] rounded-[0.6vh] border transition cursor-pointer ${
                      isVirtualKeyboardOpen
                        ? 'bg-blue-600/30 border-blue-500/60 text-blue-300'
                        : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                    title={isVirtualKeyboardOpen ? 'Fechar teclado virtual' : 'Abrir teclado virtual'}
                  >
                    <Keyboard className={isVirtualKeyboardOpen ? 'w-[1.6vh] h-[1.6vh]' : 'w-[2vh] h-[2vh]'} />
                  </button>

                  {isSearchInputActive ? (
                    <span className="text-[1.1vh] font-semibold text-slate-300 bg-slate-800/90 px-[0.6vw] py-[0.3vh] rounded-[0.6vh] border border-slate-700 pointer-events-none flex items-center gap-[0.3vw]">
                      <span className="text-slate-400">Esc / B</span> Voltar
                    </span>
                  ) : isVirtualKeyboardOpen ? (
                    <span className="text-[1.1vh] font-semibold text-emerald-200 bg-emerald-950/70 px-[0.7vw] py-[0.3vh] rounded-[0.6vh] border border-emerald-500/40 pointer-events-none flex items-center gap-[0.3vw] shadow-sm">
                      <span className="w-[0.8vh] h-[0.8vh] rounded-full bg-emerald-400 animate-pulse" />
                      <span>Teclado Ativo</span>
                    </span>
                  ) : searchFocusTarget === 'input' ? (
                    <span className="text-[1.1vh] font-semibold text-blue-200 bg-blue-900/60 px-[0.7vw] py-[0.3vh] rounded-[0.6vh] border border-blue-500/40 pointer-events-none flex items-center gap-[0.3vw] shadow-sm">
                      <ControllerGlyph type={inputDeviceType} action="confirm" className="scale-90" />
                      <span>{inputDeviceType === 'keyboard' ? 'Enter para pesquisar' : 'Abrir Teclado'}</span>
                    </span>
                  ) : null}
                </div>
              </div>

              {/* On-Screen Virtual Keyboard for Gamepad Navigation */}
              {isVirtualKeyboardOpen && (
                <div className="bg-slate-900/95 border border-slate-700/80 rounded-[1.4vh] p-[0.9vh] shadow-2xl backdrop-blur-xl w-full max-w-[54vw] mx-auto space-y-[0.6vh] animate-fade-in select-none">
                  {/* Live typing indicator header */}
                  <div className="flex items-center justify-between px-[0.6vw] pb-[0.3vh] border-b border-slate-800 text-[1.15vh] text-slate-400">
                    <div className="flex items-center gap-[0.4vw]">
                      <Keyboard className="w-[1.6vh] h-[1.6vh] text-blue-400" />
                      <span className="font-semibold text-slate-300">Teclado Virtual Aegis</span>
                      {isVkCaps && (
                        <span className="px-[0.5vw] py-[0.1vh] rounded-[0.4vh] bg-blue-600/30 text-blue-300 border border-blue-500/40 text-[1vh] font-bold">
                          CAPS ATIVO
                        </span>
                      )}
                    </div>
                    <span className="text-slate-400 font-mono text-[1.1vh]">
                      {searchQuery.length} {searchQuery.length === 1 ? 'caractere' : 'caracteres'}
                    </span>
                  </div>

                  {/* Keyboard Grid */}
                  <div className="space-y-[0.45vh]">
                    {VK_ROWS.map((row, rIdx) => (
                      <div key={`vk-row-${rIdx}`} className="flex items-center justify-center gap-[0.35vw]">
                        {row.map((key, cIdx) => {
                          const isFocused = vkRow === rIdx && vkCol === cIdx;
                          const displayLabel = key.value
                            ? (isVkCaps ? key.label.toUpperCase() : key.label.toLowerCase())
                            : key.label;

                          let colorClasses = '';
                          if (key.action === 'done') {
                            colorClasses = isFocused
                              ? 'bg-emerald-600 text-white border-2 border-emerald-300 shadow-[0_0_16px_rgba(16,185,129,0.7)] scale-[1.05] z-20 font-black'
                              : 'bg-emerald-950/70 text-emerald-300 border border-emerald-700/60 hover:bg-emerald-900/60 font-bold';
                          } else if (key.action === 'caps' && isVkCaps) {
                            colorClasses = isFocused
                              ? 'bg-blue-600 text-white border-2 border-white shadow-[0_0_16px_rgba(59,130,246,0.7)] scale-[1.05] z-20 font-black'
                              : 'bg-blue-900/80 text-blue-200 border border-blue-500 font-bold';
                          } else if (key.action === 'clear') {
                            colorClasses = isFocused
                              ? 'bg-rose-600 text-white border-2 border-rose-300 shadow-[0_0_16px_rgba(244,63,94,0.7)] scale-[1.05] z-20 font-black'
                              : 'bg-slate-800/80 text-slate-400 border border-slate-700/80 hover:text-white font-bold';
                          } else {
                            colorClasses = isFocused
                              ? 'bg-blue-600 text-white border-2 border-white/90 shadow-[0_0_18px_rgba(59,130,246,0.75)] scale-[1.08] z-20 font-black'
                              : 'bg-slate-800/90 hover:bg-slate-750 text-slate-200 border border-slate-700/80 hover:border-slate-600 font-bold';
                          }

                          const widthClass = key.widthClass || 'w-[4.4vw]';

                          return (
                            <button
                              key={key.id}
                              type="button"
                              onClick={() => {
                                setVkRow(rIdx);
                                setVkCol(cIdx);
                                handleVirtualKeyPress(key);
                              }}
                              onMouseEnter={() => {
                                setVkRow(rIdx);
                                setVkCol(cIdx);
                              }}
                              className={`h-[3.6vh] ${widthClass} rounded-[0.7vh] flex items-center justify-center text-[1.35vh] transition-all duration-100 cursor-pointer select-none ${colorClasses}`}
                            >
                              {displayLabel}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>

                  {/* Controller Quick Shortcut Legend */}
                  <div className="pt-[0.5vh] border-t border-slate-800/80 flex items-center justify-between text-[1.1vh] text-slate-400 flex-wrap gap-[0.6vw]">
                    <div className="flex items-center gap-[0.3vw]">
                      <ControllerGlyph type={inputDeviceType} action="confirm" className="scale-90" />
                      <span>Inserir</span>
                    </div>
                    <div className="flex items-center gap-[0.3vw]">
                      <ControllerGlyph type={inputDeviceType} action="details" className="scale-90" />
                      <span>Apagar (X / □)</span>
                    </div>
                    <div className="flex items-center gap-[0.3vw]">
                      <ControllerGlyph type={inputDeviceType} action="favorite" className="scale-90" />
                      <span>Espaço (Y / △)</span>
                    </div>
                    <div className="flex items-center gap-[0.3vw]">
                      <ControllerGlyph type={inputDeviceType} action="menu" className="scale-90" />
                      <span>Concluir (Start)</span>
                    </div>
                    <div className="flex items-center gap-[0.3vw]">
                      <ControllerGlyph type={inputDeviceType} action="back" className="scale-90" />
                      <span>Fechar (B / Esc)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Results Grid Header */}
              <div className="flex items-center justify-between px-[0.6vw] pt-[0.2vh] text-[1.25vh] text-slate-400 font-semibold">
                <span className="flex items-center gap-[0.4vw]">
                  {searchQuery.trim() ? (
                    <>
                      <span>Resultados da pesquisa:</span>
                      <strong className="text-white font-bold">"{searchQuery}"</strong>
                      <span className="text-slate-500 font-mono">({searchResults.length})</span>
                    </>
                  ) : (
                    <>
                      <span>Biblioteca de Jogos:</span>
                      <span className="text-slate-500 font-mono">({searchResults.length})</span>
                    </>
                  )}
                </span>
                {searchFocusTarget === 'grid' && (
                  <span className="text-blue-400 flex items-center gap-[0.4vw] text-[1.2vh]">
                    <ControllerGlyph type={inputDeviceType} action="confirm" className="scale-90" />
                    <span>Jogar / Abrir</span>
                  </span>
                )}
              </div>
            </div>

            {/* 2. SCROLLABLE RESULTS CONTAINER (flex-1 min-h-0 overflow-y-auto pb-[18vh]) */}
            <div
              ref={searchScrollRef}
              className="flex-1 min-h-0 overflow-y-auto pb-[18vh] px-[0.2vw] pt-[0.4vh] scroll-smooth"
            >
              {searchResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-[5vh] text-center space-y-[1vh] text-slate-500">
                  <Search className="w-[4vh] h-[4vh] text-slate-700" />
                  <p className="text-[1.6vh] font-bold text-slate-300">Nenhum jogo encontrado</p>
                  <p className="text-[1.3vh] text-slate-500">Tente pesquisar por outro título, plataforma ou categoria.</p>
                </div>
              ) : (
                <div id="search-grid" className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-9 2xl:grid-cols-10 gap-[0.8vw]">
                  {searchResults.map((game, idx) => (
                    <LibraryGameCard
                      key={`search-${game.id}`}
                      game={game}
                      isFocused={searchFocusTarget === 'grid' && focusedIndex === idx}
                      idx={idx}
                      prefix="search"
                      onFocus={handleSearchCardFocus}
                      onLaunch={handleCardLaunch}
                      onRegisterRef={handleRegisterCardRef}
                      showPlatformBadge={showPlatformBadges}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* 3. DETAILS MODAL (Fullscreen Responsive Game Overview) */}
      {selectedGameForDetails && activeDetailsGame && (
        <div
          ref={detailsModalRef}
          className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-2xl flex flex-col overflow-y-auto animate-fade-in select-none"
        >
          {/* Background Ambient Glow from Banner/Cover */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            {activeDetailsGame.bannerUrl || activeDetailsGame.coverUrl ? (
              <div
                className="absolute inset-0 bg-cover bg-center opacity-15 blur-3xl scale-110"
                style={{
                  backgroundImage: `url(${activeDetailsGame.bannerUrl || activeDetailsGame.coverUrl})`,
                }}
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/90 to-slate-950/70" />
          </div>

          <div className="relative z-10 w-full max-w-[calc(100vh*4/3)] mx-auto my-auto px-6 sm:px-8 lg:px-10 py-6 sm:py-8 flex flex-col space-y-6">
            {/* Top Bar */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
              <div className="flex items-center gap-3 min-w-0">
                {showPlatformBadges && <PlatformBadge platform={activeDetailsGame.platform} size="md" />}
                <div className="min-w-0">
                  <h2 className="text-2xl sm:text-3xl font-black text-white truncate drop-shadow select-text cursor-text">
                    {activeDetailsGame.title}
                  </h2>
                  {(activeDetailsGame.summary || activeDetailsGame.description) && (
                    <p className="mt-0.5 text-xs sm:text-sm text-slate-300 italic line-clamp-1 leading-relaxed max-w-2xl select-text cursor-text">
                      "{activeDetailsGame.summary || activeDetailsGame.description}"
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  playNavBackSound();
                  setSelectedGameForDetails(null);
                }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition shadow shrink-0"
                title="Back (Esc / B)"
              >
                <ControllerGlyph type={inputDeviceType} action="back" />
                <span className="text-xs font-bold">Back</span>
                <X className="w-4 h-4 ml-0.5" />
              </button>
            </div>

            {/* Content Body: Left (Cover & Actions) | Right (Full Details) */}
            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start flex-1 min-h-0 w-full">
              {/* Left Column: Hero Poster & Quick Launch (Increased Thumbnail) */}
              <div className="w-full sm:w-72 md:w-80 lg:w-[320px] xl:w-[350px] shrink-0 space-y-4">
                <div className="aspect-[2/3] w-full rounded-2xl overflow-hidden border border-slate-700/80 shadow-2xl relative bg-slate-900">
                  <GameImage
                    src={activeDetailsGame.coverUrl}
                    alt={activeDetailsGame.title}
                    title={activeDetailsGame.title}
                    platform={activeDetailsGame.platform}
                    type="cover"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Action: Play Game */}
                <button
                  onClick={() => {
                    playLaunchGameSound();
                    onLaunchGame(activeDetailsGame);
                    setSelectedGameForDetails(null);
                  }}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-sm sm:text-base shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2.5 transition active:scale-95"
                >
                  <Play className="w-5 h-5 fill-white" />
                  <span>PLAY GAME</span>
                  <ControllerGlyph type={inputDeviceType} action="confirm" className="ml-1" />
                </button>

                {/* Action: Toggle Favorite */}
                <button
                  onClick={() => {
                    playNavSelectSound();
                    onToggleFavorite(activeDetailsGame.id);
                    setSelectedGameForDetails((prev) =>
                      prev ? { ...prev, favorite: !prev.favorite } : null
                    );
                  }}
                  className="w-full py-3 bg-slate-900/90 hover:bg-slate-800 text-slate-200 rounded-2xl font-bold text-xs sm:text-sm border border-slate-800 flex items-center justify-center gap-2 transition active:scale-95"
                >
                  <Star
                    className={`w-4 h-4 ${
                      activeDetailsGame.favorite
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-400'
                    }`}
                  />
                  <span>{activeDetailsGame.favorite ? 'In Favorites' : 'Add to Favorites'}</span>
                  <ControllerGlyph type={inputDeviceType} action="favorite" className="ml-1" />
                </button>
              </div>

              {/* Right Column: Metadata, Tags, Overview & Gallery */}
              <div className="flex-1 min-w-0 space-y-5 text-left w-full">
                {/* Metadata Cards Grid (3x2 in 4:3) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {/* Total Playtime */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Total Playtime
                    </span>
                    <span className="text-sm sm:text-base font-extrabold text-white mt-0.5 block">
                      {formatPlaytime(activeDetailsGame.playtimeMinutes || 0)}
                    </span>
                  </div>

                  {/* Last Session */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Last Session
                    </span>
                    <span className="text-sm sm:text-base font-extrabold text-white mt-0.5 block truncate">
                      {activeDetailsGame.lastPlayed
                        ? formatRelativeDate(activeDetailsGame.lastPlayed)
                        : 'Never'}
                    </span>
                  </div>

                  {/* Status */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Status
                    </span>
                    <span className="text-sm sm:text-base font-extrabold text-emerald-400 mt-0.5 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      {activeDetailsGame.installed !== false ? 'Installed' : 'In Library'}
                    </span>
                  </div>

                  {/* Developer */}
                  {activeDetailsGame.developer && (
                    <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Developer
                      </span>
                      <span
                        className="text-sm font-bold text-slate-200 mt-0.5 block truncate"
                        title={activeDetailsGame.developer}
                      >
                        {activeDetailsGame.developer}
                      </span>
                    </div>
                  )}

                  {/* Publisher */}
                  {activeDetailsGame.publisher && (
                    <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Publisher
                      </span>
                      <span
                        className="text-sm font-bold text-slate-200 mt-0.5 block truncate"
                        title={activeDetailsGame.publisher}
                      >
                        {activeDetailsGame.publisher}
                      </span>
                    </div>
                  )}

                  {/* Release Date */}
                  {activeDetailsGame.releaseDate && (
                    <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Release Date
                      </span>
                      <span
                        className="text-sm font-bold text-slate-200 mt-0.5 block truncate"
                        title={activeDetailsGame.releaseDate}
                      >
                        {activeDetailsGame.releaseDate}
                      </span>
                    </div>
                  )}
                </div>

                {/* Genres & Tags Section */}
                {(() => {
                  const allTags = Array.from(
                    new Set([
                      ...(activeDetailsGame.genres || []),
                      ...(activeDetailsGame.tags || []),
                    ])
                  ).filter(Boolean);

                  if (allTags.length === 0) return null;

                  return (
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Genres & Tags
                      </h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        {allTags.map((tag) => (
                          <span
                            key={tag}
                            className="text-xs font-semibold px-3 py-1 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 shadow-sm"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Description / Synopsis Section */}
                {(() => {
                  const rawDesc = activeDetailsGame.description || activeDetailsGame.summary;
                  const desc = cleanGameDescription(rawDesc, true) || rawDesc;

                  return (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          About the Game
                        </h3>
                        {isFetchingDetailsMetadata && (
                          <span className="text-[11px] font-medium text-blue-400 animate-pulse flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
                            Fetching description...
                          </span>
                        )}
                      </div>
                      <div
                        ref={detailsDescriptionRef}
                        className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/70 text-sm sm:text-base text-slate-300 leading-relaxed font-normal whitespace-pre-line max-h-72 overflow-y-auto pr-3 select-text cursor-text"
                      >
                        {desc ||
                          (isFetchingDetailsMetadata
                            ? 'Fetching official description...'
                            : 'No description provided.')}
                      </div>
                    </div>
                  );
                })()}

                {/* Screenshots Gallery - All screenshots side by side */}
                {galleryScreenshots.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                        <span>Screenshots ({galleryScreenshots.length})</span>
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                        <span className="text-[11px] text-slate-400">Click any image for fullscreen</span>
                      </div>
                    </div>

                    <div className="flex gap-4 overflow-x-auto pb-4 pt-1 scroll-smooth no-scrollbar select-none">
                      {galleryScreenshots.map((shot, sIdx) => {
                        const isSelected = activeScreenshotIdx === sIdx;
                        return (
                          <div
                            key={shot.id || sIdx}
                            onClick={() => {
                              setActiveScreenshotIdx(sIdx);
                              playNavSelectSound();
                              setIsGalleryFullscreen(true);
                            }}
                            onMouseEnter={() => setActiveScreenshotIdx(sIdx)}
                            className={`group relative shrink-0 w-80 sm:w-96 lg:w-[440px] h-48 sm:h-56 lg:h-64 rounded-2xl overflow-hidden bg-black/95 border-2 cursor-pointer transition-all duration-200 shadow-xl flex items-center justify-center p-2 ${
                              isSelected
                                ? 'border-blue-500 ring-2 ring-blue-500/50 scale-[1.02] shadow-blue-950/60'
                                : 'border-slate-800 hover:border-blue-500/70 hover:scale-[1.01]'
                            }`}
                            title="Click to view fullscreen"
                          >
                            <img
                              src={shot.thumbnail || shot.full}
                              alt={`${activeDetailsGame.title} screenshot ${sIdx + 1}`}
                              className="max-h-full max-w-full w-auto h-auto object-contain rounded-xl transition-transform duration-300 group-hover:scale-105"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3.5 pointer-events-none">
                              <span className="text-xs font-semibold text-white drop-shadow flex items-center gap-1.5">
                                <Maximize2 className="w-3.5 h-3.5 text-blue-400" />
                                <span>Click to enlarge</span>
                              </span>
                              <span className="text-xs font-mono text-slate-300 drop-shadow">
                                {sIdx + 1} / {galleryScreenshots.length}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3.5. LIBRARY FILTERS & SORTING MODAL */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-2xl flex items-center justify-center p-4 sm:p-8 animate-fade-in select-none">
          <div className="relative w-full max-w-4xl bg-slate-900/95 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Library Filters & Sorting</h2>
                  <p className="text-xs text-slate-400">
                    Filter by store, genre, release period, and change display order
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {activeFilterCount > 0 && (
                  <button
                    onClick={() => {
                      playNavSelectSound();
                      setLibraryFilters({
                        platforms: [],
                        genres: [],
                        yearRange: 'all',
                        installedOnly: false,
                        favoritesOnly: false,
                        sortBy: 'title-asc',
                      });
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                    <span>Reset All</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    playNavBackSound();
                    setIsFilterModalOpen(false);
                  }}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                  title="Close (Esc / B)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Section 1: Stores & Platforms */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-blue-400" />
                    <span>Stores & Platforms</span>
                  </h3>
                  {libraryFilters.platforms.length > 0 && (
                    <button
                      onClick={() => setLibraryFilters((prev) => ({ ...prev, platforms: [] }))}
                      className="text-xs text-blue-400 hover:underline font-semibold"
                    >
                      Select All Stores
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <button
                    id="filter-btn-platforms-0"
                    onMouseEnter={() => setFilterFocus({ section: 'platforms', index: 0 })}
                    onClick={() => {
                      playNavSelectSound();
                      setLibraryFilters((prev) => ({ ...prev, platforms: [] }));
                    }}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-bold transition ${
                      libraryFilters.platforms.length === 0
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                        : 'bg-slate-950/60 text-slate-300 border-slate-800 hover:bg-slate-800'
                    } ${
                      isFilterModalOpen && filterFocus.section === 'platforms' && filterFocus.index === 0
                        ? 'ring-4 ring-blue-400 scale-[1.03] shadow-2xl z-20 brightness-110'
                        : ''
                    }`}
                  >
                    <span>All Stores</span>
                    <span className="text-[10px] opacity-75">{games.filter((g) => !g.hidden).length}</span>
                  </button>

                  {availablePlatforms.map((p, pIdx) => {
                    const isSelected = libraryFilters.platforms.includes(p.id);
                    const btnIdx = pIdx + 1;
                    const isFocused =
                      isFilterModalOpen && filterFocus.section === 'platforms' && filterFocus.index === btnIdx;

                    return (
                      <button
                        key={p.id}
                        id={`filter-btn-platforms-${btnIdx}`}
                        onMouseEnter={() => setFilterFocus({ section: 'platforms', index: btnIdx })}
                        onClick={() => {
                          playNavSelectSound();
                          setLibraryFilters((prev) => {
                            const exists = prev.platforms.includes(p.id);
                            return {
                              ...prev,
                              platforms: exists
                                ? prev.platforms.filter((x) => x !== p.id)
                                : [...prev.platforms, p.id],
                            };
                          });
                        }}
                        className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-bold transition ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                            : 'bg-slate-950/60 text-slate-300 border-slate-800 hover:bg-slate-800'
                        } ${isFocused ? 'ring-4 ring-blue-400 scale-[1.03] shadow-2xl z-20 brightness-110' : ''}`}
                      >
                        <span className="truncate">{p.name}</span>
                        <span className="text-[10px] opacity-75">{p.count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 2: Sorting Order */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <ArrowUpDown className="w-4 h-4 text-blue-400" />
                  <span>Sorting Order</span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: 'title-asc', label: 'Title (A - Z)' },
                    { id: 'title-desc', label: 'Title (Z - A)' },
                    { id: 'recent', label: 'Recently Played' },
                    { id: 'playtime', label: 'Most Played' },
                    { id: 'release-desc', label: 'Release (Newest)' },
                    { id: 'release-asc', label: 'Release (Oldest)' },
                    { id: 'added', label: 'Recently Added' },
                  ].map((s, sIdx) => {
                    const isSelected = libraryFilters.sortBy === s.id;
                    const isFocused =
                      isFilterModalOpen && filterFocus.section === 'sort' && filterFocus.index === sIdx;

                    return (
                      <button
                        key={s.id}
                        id={`filter-btn-sort-${sIdx}`}
                        onMouseEnter={() => setFilterFocus({ section: 'sort', index: sIdx })}
                        onClick={() => {
                          playNavSelectSound();
                          setLibraryFilters((prev) => ({ ...prev, sortBy: s.id as any }));
                        }}
                        className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold transition text-left ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                            : 'bg-slate-950/60 text-slate-300 border-slate-800 hover:bg-slate-800'
                        } ${isFocused ? 'ring-4 ring-blue-400 scale-[1.03] shadow-2xl z-20 brightness-110' : ''}`}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 3: Status Toggles */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Quick Status Filters</span>
                </h3>

                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    id="filter-btn-status-0"
                    onMouseEnter={() => setFilterFocus({ section: 'status', index: 0 })}
                    onClick={() => {
                      playNavSelectSound();
                      setLibraryFilters((prev) => ({ ...prev, installedOnly: !prev.installedOnly }));
                    }}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition ${
                      libraryFilters.installedOnly
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/30'
                        : 'bg-slate-950/60 text-slate-300 border-slate-800 hover:bg-slate-800'
                    } ${
                      isFilterModalOpen && filterFocus.section === 'status' && filterFocus.index === 0
                        ? 'ring-4 ring-emerald-400 scale-[1.03] shadow-2xl z-20 brightness-110'
                        : ''
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Installed Only</span>
                  </button>

                  <button
                    id="filter-btn-status-1"
                    onMouseEnter={() => setFilterFocus({ section: 'status', index: 1 })}
                    onClick={() => {
                      playNavSelectSound();
                      setLibraryFilters((prev) => ({ ...prev, favoritesOnly: !prev.favoritesOnly }));
                    }}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition ${
                      libraryFilters.favoritesOnly
                        ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-600/30'
                        : 'bg-slate-950/60 text-slate-300 border-slate-800 hover:bg-slate-800'
                    } ${
                      isFilterModalOpen && filterFocus.section === 'status' && filterFocus.index === 1
                        ? 'ring-4 ring-amber-400 scale-[1.03] shadow-2xl z-20 brightness-110'
                        : ''
                    }`}
                  >
                    <Star className="w-4 h-4" />
                    <span>Favorites Only</span>
                  </button>
                </div>
              </div>

              {/* Section 4: Release Period */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  <span>Release Year</span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: 'all', label: 'All Years' },
                    { id: '2024+', label: '2024 - 2026 (Recent)' },
                    { id: '2020-2023', label: '2020 - 2023' },
                    { id: '2015-2019', label: '2015 - 2019' },
                    { id: '2010-2014', label: '2010 - 2014' },
                    { id: '2000-2009', label: '2000 - 2009' },
                    { id: 'retro', label: 'Classics (< 2000)' },
                  ].map((y, yIdx) => {
                    const isSelected = libraryFilters.yearRange === y.id;
                    const isFocused =
                      isFilterModalOpen && filterFocus.section === 'year' && filterFocus.index === yIdx;

                    return (
                      <button
                        key={y.id}
                        id={`filter-btn-year-${yIdx}`}
                        onMouseEnter={() => setFilterFocus({ section: 'year', index: yIdx })}
                        onClick={() => {
                          playNavSelectSound();
                          setLibraryFilters((prev) => ({ ...prev, yearRange: y.id }));
                        }}
                        className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold transition text-left ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                            : 'bg-slate-950/60 text-slate-300 border-slate-800 hover:bg-slate-800'
                        } ${isFocused ? 'ring-4 ring-blue-400 scale-[1.03] shadow-2xl z-20 brightness-110' : ''}`}
                      >
                        {y.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 5: Genres */}
              {availableGenres.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <Layers className="w-4 h-4 text-blue-400" />
                      <span>Genres ({availableGenres.length})</span>
                    </h3>
                    {libraryFilters.genres.length > 0 && (
                      <button
                        onClick={() => setLibraryFilters((prev) => ({ ...prev, genres: [] }))}
                        className="text-xs text-blue-400 hover:underline font-semibold"
                      >
                        Clear Genres
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2 flex-wrap max-h-48 overflow-y-auto p-1">
                    {availableGenres.map((g, gIdx) => {
                      const isSelected = libraryFilters.genres.includes(g.genre);
                      const isFocused =
                        isFilterModalOpen && filterFocus.section === 'genres' && filterFocus.index === gIdx;

                      return (
                        <button
                          key={g.genre}
                          id={`filter-btn-genres-${gIdx}`}
                          onMouseEnter={() => setFilterFocus({ section: 'genres', index: gIdx })}
                          onClick={() => {
                            playNavSelectSound();
                            setLibraryFilters((prev) => {
                              const exists = prev.genres.includes(g.genre);
                              return {
                                ...prev,
                                genres: exists
                                  ? prev.genres.filter((x) => x !== g.genre)
                                  : [...prev.genres, g.genre],
                              };
                            });
                          }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                              : 'bg-slate-950/60 text-slate-300 border-slate-800 hover:bg-slate-800'
                          } ${isFocused ? 'ring-4 ring-blue-400 scale-[1.03] shadow-2xl z-20 brightness-110' : ''}`}
                        >
                          <span>{g.genre}</span>
                          <span className="text-[10px] opacity-70 font-mono">({g.count})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Found <strong className="text-white font-bold">{libraryGames.length}</strong> matching titles
              </span>

              <div className="flex items-center gap-3">
                {activeFilterCount > 0 && (
                  <button
                    id="filter-btn-actions-1"
                    onMouseEnter={() => setFilterFocus({ section: 'actions', index: 1 })}
                    onClick={() => {
                      playNavSelectSound();
                      setLibraryFilters({
                        platforms: [],
                        genres: [],
                        yearRange: 'all',
                        installedOnly: false,
                        favoritesOnly: false,
                        sortBy: 'title-asc',
                      });
                    }}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition ${
                      isFilterModalOpen && filterFocus.section === 'actions' && filterFocus.index === 1
                        ? 'ring-4 ring-red-400 scale-[1.03] shadow-2xl z-20 text-white'
                        : ''
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                    <span>Reset All</span>
                  </button>
                )}

                <button
                  id="filter-btn-actions-0"
                  onMouseEnter={() => setFilterFocus({ section: 'actions', index: 0 })}
                  onClick={() => {
                    playNavSelectSound();
                    setIsFilterModalOpen(false);
                    setFocusedIndex(0);
                  }}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition active:scale-95 ${
                    isFilterModalOpen && filterFocus.section === 'actions' && filterFocus.index === 0
                      ? 'ring-4 ring-white scale-[1.03] shadow-2xl z-20'
                      : ''
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>Apply & View Results ({libraryGames.length})</span>
                </button>
              </div>
            </div>

            {/* Bottom Modal Controller Guide */}
            <div className="px-6 py-2.5 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 shrink-0">
              <div className="flex items-center gap-5">
                <div className="flex items-center gap-1.5">
                  <ControllerGlyph type={inputDeviceType} action="confirm" />
                  <span className="text-slate-300 font-semibold">Select / Toggle</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ControllerGlyph type={inputDeviceType} action="back" />
                  <span className="text-slate-300 font-semibold">Close</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ControllerGlyph type={inputDeviceType} action="navigate" />
                  <span className="text-slate-300 font-semibold">Navigate Options</span>
                </div>
              </div>
              <span className="text-slate-500 font-mono text-[11px]">B / Esc to close</span>
            </div>
          </div>
        </div>
      )}

      {/* 5. WINDOWS-STYLE APPS & TOOLS START MENU OVERLAY */}
      {isAppMenuOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-end pr-[2vw] sm:pr-[2.5vw] pb-[8.5vh] bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => {
            playNavBackSound();
            setIsAppMenuOpen(false);
          }}
        >
          <div
            className="w-[580px] max-w-[94vw] max-h-[80vh] flex flex-col bg-slate-950/95 border border-slate-700/80 rounded-3xl shadow-2xl backdrop-blur-2xl overflow-hidden animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Header */}
            <div className="px-6 py-4 border-b border-slate-800/80 bg-slate-900/60 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
                  <img src={aegisLogo} alt="Aegis" className="w-5 h-5 object-contain brightness-110" />
                </div>
                <h2 className="text-sm font-bold text-white tracking-wide">Quick Apps</h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsAppMenuOpen(false);
                    onOpenSettings?.('apps');
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  title="Manage apps in settings"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Manage Apps</span>
                </button>
                <button
                  onClick={() => {
                    playNavBackSound();
                    setIsAppMenuOpen(false);
                  }}
                  className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
                  title="Close (Esc / B)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Search Bar / Quick Filter if more than 6 apps */}
            {customApps.length > 6 && (
              <div className="px-6 pt-3 shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={appSearchQuery}
                    onChange={(e) => {
                      setAppSearchQuery(e.target.value);
                      setAppMenuFocusedIndex(0);
                    }}
                    placeholder="Search apps..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            {/* Grid of Apps */}
            <div ref={appGridRef} className="relative flex-1 min-h-0 overflow-y-auto p-5 max-h-[440px]">
              {filteredCustomApps.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
                    <LayoutGrid className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-300">No applications found</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Add your favorite apps like Discord, Spotify, or Chrome in Settings.
                  </p>
                  <button
                    onClick={() => {
                      setIsAppMenuOpen(false);
                      onOpenSettings?.('apps');
                    }}
                    className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/30 cursor-pointer"
                  >
                    Open Settings &gt; Apps
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3.5">
                  {filteredCustomApps.map((app, idx) => {
                    const isFocused = appMenuFocusedIndex === idx;
                    return (
                      <button
                        key={app.id}
                        id={`app-tile-${idx}`}
                        onClick={() => handleLaunchCustomApp(app)}
                        onMouseEnter={() => setAppMenuFocusedIndex(idx)}
                        className={`relative p-3.5 rounded-2xl flex flex-col items-center text-center gap-2.5 transition-colors duration-150 cursor-pointer select-none group border-2 ${
                          isFocused
                            ? 'bg-gradient-to-b from-indigo-900/60 to-slate-900/90 border-indigo-400 shadow-xl shadow-indigo-900/40 ring-2 ring-indigo-500/50'
                            : 'bg-slate-900/70 hover:bg-slate-800/80 border-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        <div className="w-14 h-14 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-center shadow-md overflow-hidden p-2 group-hover:scale-105 transition-transform">
                          {app.iconUrl ? (
                            <img src={app.iconUrl} alt={app.name} className="w-10 h-10 object-contain drop-shadow" />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-indigo-950 border border-indigo-700/50 flex items-center justify-center text-indigo-300 font-bold text-lg">
                              {app.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>

                        <div className="w-full min-w-0">
                          <h3 className="text-xs font-bold text-white truncate drop-shadow-sm group-hover:text-indigo-200">
                            {app.name}
                          </h3>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5 capitalize">
                            {app.category || 'App'}
                          </p>
                        </div>

                        {isFocused && (
                          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-indigo-400 shadow-sm shadow-indigo-400 animate-ping" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom System Actions & Controller Guide */}
            <div className="px-6 py-3 bg-slate-950 border-t border-slate-800/90 flex items-center justify-between text-xs text-slate-400 shrink-0">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <ControllerGlyph type={inputDeviceType} action="confirm" />
                  <span className="text-slate-300 font-semibold">Launch</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ControllerGlyph type={inputDeviceType} action="back" />
                  <span className="text-slate-300 font-semibold">Close</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ControllerGlyph type={inputDeviceType} action="navigate" />
                  <span className="text-slate-300 font-semibold">Select</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => {
                    setIsAppMenuOpen(false);
                    onOpenSettings?.('apps');
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition"
                  title="Manage Applications in Settings"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Settings</span>
                </button>

                <button
                  onClick={() => {
                    setIsAppMenuOpen(false);
                    setIsPowerMenuOpen(true);
                    setPowerMenuFocusedIndex(0);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-rose-950/60 border border-slate-800 hover:border-rose-800 text-slate-300 hover:text-rose-300 transition"
                  title="Power & Exit"
                >
                  <Power className="w-3.5 h-3.5 text-rose-400" />
                  <span>Power</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. POWER & SYSTEM MODAL */}
      {isPowerMenuOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-xl animate-fade-in select-none p-4"
          onClick={() => {
            playNavBackSound();
            if (pendingPowerAction) {
              setPendingPowerAction(null);
              return;
            }
            setIsPowerMenuOpen(false);
          }}
        >
          <div
            className="w-full max-w-md bg-slate-900/95 border border-slate-700/80 rounded-3xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient top light */}
            <div
              className={`absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-48 blur-3xl rounded-full pointer-events-none transition-colors ${
                pendingPowerAction === 'shutdown'
                  ? 'bg-rose-500/20'
                  : pendingPowerAction === 'restart'
                  ? 'bg-amber-500/20'
                  : 'bg-rose-500/10'
              }`}
            />

            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 relative z-10">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg text-white transition-colors ${
                    pendingPowerAction === 'shutdown'
                      ? 'bg-gradient-to-tr from-rose-600 to-red-500 shadow-rose-600/30'
                      : pendingPowerAction === 'restart'
                      ? 'bg-gradient-to-tr from-amber-600 to-yellow-500 shadow-amber-600/30'
                      : 'bg-gradient-to-tr from-rose-600 to-amber-500 shadow-rose-600/20'
                  }`}
                >
                  {pendingPowerAction === 'restart' ? (
                    <RotateCcw className="w-5 h-5" />
                  ) : (
                    <Power className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h2 className="text-base font-black text-white tracking-wide">
                    {pendingPowerAction === 'shutdown'
                      ? 'Confirmar Encerramento'
                      : pendingPowerAction === 'restart'
                      ? 'Confirmar Reinicialização'
                      : 'Opções de Energia'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {pendingPowerAction
                      ? 'Por favor confirme para prosseguir'
                      : 'Selecione uma ação ou prima Esc para cancelar'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  playNavBackSound();
                  if (pendingPowerAction) {
                    setPendingPowerAction(null);
                    return;
                  }
                  setIsPowerMenuOpen(false);
                }}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body: Confirmation Screen or Power Options List */}
            {pendingPowerAction ? (
              <div className="py-4 text-center space-y-5 relative z-10 animate-fade-in">
                <div
                  className={`w-14 h-14 rounded-3xl mx-auto flex items-center justify-center shadow-2xl animate-pulse ${
                    pendingPowerAction === 'shutdown'
                      ? 'bg-rose-600/20 border border-rose-500/50 text-rose-400 shadow-rose-600/30'
                      : 'bg-amber-600/20 border border-amber-500/50 text-amber-400 shadow-amber-600/30'
                  }`}
                >
                  {pendingPowerAction === 'shutdown' ? (
                    <Power className="w-7 h-7" />
                  ) : (
                    <RotateCcw className="w-7 h-7" />
                  )}
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-base font-black text-white">
                    {pendingPowerAction === 'shutdown'
                      ? 'Tem a certeza que deseja desligar o PC?'
                      : 'Tem a certeza que deseja reiniciar o PC?'}
                  </h3>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                    {pendingPowerAction === 'shutdown'
                      ? 'O computador será desligado com segurança e todos os processos abertos serão terminados.'
                      : 'O computador será reiniciado e o sistema será reinicializado.'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => handleConfirmPowerAction(true)}
                    onMouseEnter={() => setPowerConfirmIndex(0)}
                    className={`py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer border ${
                      powerConfirmIndex === 0
                        ? pendingPowerAction === 'shutdown'
                          ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400 ring-2 ring-rose-500/50 shadow-lg shadow-rose-600/40 scale-[1.02]'
                          : 'bg-amber-600 hover:bg-amber-500 text-white border-amber-400 ring-2 ring-amber-500/50 shadow-lg shadow-amber-600/40 scale-[1.02]'
                        : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border-slate-700'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    <span>
                      {pendingPowerAction === 'shutdown' ? 'Sim, Desligar' : 'Sim, Reiniciar'}
                    </span>
                  </button>

                  <button
                    onClick={() => handleConfirmPowerAction(false)}
                    onMouseEnter={() => setPowerConfirmIndex(1)}
                    className={`py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer border ${
                      powerConfirmIndex === 1
                        ? 'bg-slate-800 text-white border-slate-500 ring-2 ring-slate-500/50 shadow-lg scale-[1.02]'
                        : 'bg-slate-900/80 hover:bg-slate-800/80 text-slate-400 border-slate-800'
                    }`}
                  >
                    <X className="w-4 h-4" />
                    <span>Cancelar</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 mt-4 relative z-10">
                {powerOptions.map((opt, idx) => {
                  const isSelected = powerMenuFocusedIndex === idx;
                  const IconComponent = opt.icon;

                  return (
                    <button
                      key={opt.id}
                      onClick={() => executePowerAction(opt.id)}
                      onMouseEnter={() => setPowerMenuFocusedIndex(idx)}
                      className={`w-full flex items-center gap-3.5 p-3 rounded-2xl border transition-all text-left cursor-pointer ${
                        isSelected
                          ? opt.activeTheme + ' scale-[1.02]'
                          : 'border-slate-800 bg-slate-900/80 hover:bg-slate-800/60 text-slate-300'
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                          isSelected ? 'bg-white/10 text-white' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold truncate flex items-center justify-between">
                          <span>{opt.label}</span>
                          {isSelected && (
                            <div className="flex items-center gap-1.5 opacity-90 text-[11px] font-normal">
                              <ControllerGlyph type={inputDeviceType} action="confirm" />
                              <span>Confirmar</span>
                            </div>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{opt.sublabel}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Footer controller legend */}
            <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 relative z-10">
              <div className="flex items-center gap-1.5">
                <ControllerGlyph type={inputDeviceType} action="confirm" />
                <span>Confirmar</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ControllerGlyph type={inputDeviceType} action="back" />
                <span>Voltar / Cancelar (Esc)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* App Launch Notification Toast */}
      {appLaunchToast && (
        <div className="fixed top-8 right-8 z-50 flex items-center gap-2.5 bg-slate-900/95 text-white px-5 py-3 rounded-2xl border border-indigo-500/60 shadow-2xl backdrop-blur-md text-sm font-semibold animate-fade-in">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-ping" />
          <span>{appLaunchToast}</span>
        </div>
      )}

      {/* 4. BOTTOM CONTROLLER GUIDE BAR (Floating overlay over content - Viewport-proportional) */}
      <footer className="fixed bottom-0 left-0 right-0 z-20 px-[2.5vw] h-[9vh] flex items-end pb-[1.4vh] bg-gradient-to-t from-slate-950 via-slate-950/95 via-45% to-transparent justify-between text-[1.35vh] text-slate-200 select-none pointer-events-none drop-shadow-[0_-8px_16px_rgba(0,0,0,0.8)]">
        {/* Left: Controller Guide Tips */}
        <div className="flex items-center gap-[1.2vw] flex-wrap pointer-events-auto drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
          {activeTab === 'emulators' ? (
            <>
              <div className="flex items-center gap-[0.4vw]">
                <ControllerGlyph type={inputDeviceType} action="confirm" className="scale-90" />
                <span className="text-slate-100 font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">Play / Select</span>
              </div>

              <div className="flex items-center gap-[0.4vw]">
                <ControllerGlyph type={inputDeviceType} action="back" className="scale-90" />
                <span className="text-slate-100 font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">Back</span>
              </div>

              <div className="flex items-center gap-[0.4vw]">
                <ControllerGlyph type={inputDeviceType} action="details" className="scale-90" />
                <span className="text-slate-100 font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">Screenshots</span>
              </div>

              <div className="flex items-center gap-[0.4vw]">
                <ControllerGlyph type={inputDeviceType} action="favorite" className="scale-90" />
                <span className="text-slate-100 font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">Favorite</span>
              </div>

              <div className="flex items-center gap-[0.4vw]">
                <ControllerGlyph type={inputDeviceType} action="tabs" className="scale-90" />
                <span className="text-slate-100 font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">Tabs</span>
              </div>

              <div className="flex items-center gap-[0.4vw]">
                {inputDeviceType === 'keyboard' ? (
                  <kbd className="px-[0.4vw] py-[0.1vh] rounded bg-slate-800 text-slate-200 border border-slate-600 font-mono text-[1vh] font-bold shadow">
                    ← →
                  </kbd>
                ) : (
                  <span className="px-[0.4vw] py-[0.1vh] rounded bg-slate-800 text-slate-200 font-bold text-[1vh] border border-slate-700 shadow">
                    ◄ ►
                  </span>
                )}
                <span className="text-slate-100 font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">Change System</span>
              </div>

              <div className="flex items-center gap-[0.4vw]">
                {inputDeviceType === 'keyboard' ? (
                  <kbd className="px-[0.4vw] py-[0.1vh] rounded bg-slate-800 text-slate-200 border border-slate-600 font-mono text-[1vh] font-bold shadow">
                    ↑ ↓
                  </kbd>
                ) : (
                  <span className="px-[0.4vw] py-[0.1vh] rounded bg-slate-800 text-slate-200 font-bold text-[1vh] border border-slate-700 shadow">
                    ▲ ▼
                  </span>
                )}
                <span className="text-slate-100 font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">Select Game</span>
              </div>

              <div className="flex items-center gap-[0.4vw]">
                {inputDeviceType === 'keyboard' ? (
                  <kbd className="px-[0.4vw] py-[0.1vh] rounded bg-slate-800 text-slate-200 border border-slate-600 font-mono text-[1vh] font-bold shadow">
                    R-Stick
                  </kbd>
                ) : (
                  <span className="px-[0.4vw] py-[0.1vh] rounded bg-slate-800 text-slate-200 font-bold text-[1vh] border border-slate-700 shadow">
                    RS ▲▼
                  </span>
                )}
                <span className="text-slate-100 font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">Scroll Descrição</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-[0.4vw]">
                <ControllerGlyph type={inputDeviceType} action="confirm" className="scale-90" />
                <span className="text-slate-100 font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">Play / Select</span>
              </div>

              <div className="flex items-center gap-[0.4vw]">
                <ControllerGlyph type={inputDeviceType} action="back" className="scale-90" />
                <span className="text-slate-100 font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">Back</span>
              </div>

              <div className="flex items-center gap-[0.4vw]">
                <ControllerGlyph type={inputDeviceType} action="details" className="scale-90" />
                <span className="text-slate-100 font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">Details</span>
              </div>

              {activeTab === 'library' ? (
                <button
                  onClick={() => {
                    playNavSelectSound();
                    setIsFilterModalOpen((prev) => !prev);
                  }}
                  className="flex items-center gap-[0.4vw] px-[0.8vw] py-[0.4vh] rounded-[0.6vh] bg-blue-950/90 border border-blue-400/60 text-blue-200 hover:bg-blue-900/80 hover:text-white cursor-pointer shadow-md transition"
                  title="Open Filters & Sorting (Y / △ / X)"
                >
                  <ControllerGlyph type={inputDeviceType} action="filter" className="scale-90" />
                  <SlidersHorizontal className="w-[1.4vh] h-[1.4vh] text-blue-400" />
                  <span className="text-white font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">Filters & Sorting</span>
                  {activeFilterCount > 0 && (
                    <span className="px-[0.4vw] py-[0.1vh] rounded-full bg-blue-600 text-[1vh] text-white font-bold">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              ) : (
                <div className="flex items-center gap-[0.4vw]">
                  <ControllerGlyph type={inputDeviceType} action="favorite" className="scale-90" />
                  <span className="text-slate-100 font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">Favorite</span>
                </div>
              )}

              <div className="flex items-center gap-[0.4vw]">
                <ControllerGlyph type={inputDeviceType} action="tabs" className="scale-90" />
                <span className="text-slate-100 font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">Tabs</span>
              </div>

              <div className="flex items-center gap-[0.4vw]">
                <ControllerGlyph type={inputDeviceType} action="navigate" className="scale-90" />
                <span className="text-slate-100 font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">Navigate</span>
              </div>
            </>
          )}
        </div>

        {/* Right: Windows-Style Apps & Tools Button */}
        <div className="flex items-center pointer-events-auto drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
          <button
            onClick={() => {
              playNavSelectSound();
              setIsAppMenuOpen((prev) => !prev);
            }}
            className={`flex items-center gap-[0.5vw] px-[1.2vw] py-[0.6vh] rounded-full border shadow-xl transition-all duration-200 cursor-pointer group focus:outline-none focus:ring-2 focus:ring-indigo-500/80 ${
              isAppMenuOpen
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 border-indigo-400 text-white shadow-indigo-500/30 scale-105'
                : 'bg-slate-900/95 hover:bg-slate-800/95 border-slate-700 hover:border-indigo-500/60 text-slate-200 hover:text-white shadow-black/80'
            }`}
            title="Open Apps & Tools Menu (Press M, Guide, or Controller Start)"
          >
            <div className="w-[2.4vh] h-[2.4vh] rounded-full bg-gradient-to-tr from-blue-600 via-indigo-500 to-violet-500 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
              <img src={aegisLogo} alt="Aegis" className="w-[1.4vh] h-[1.4vh] object-contain brightness-110" />
            </div>
            <span className="font-bold text-[1.35vh] tracking-wide">Apps & Tools</span>
            <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 scale-95">
              <ControllerGlyph type={inputDeviceType} action="menu" />
            </div>
          </button>
        </div>
      </footer>

      {/* 6. FULLSCREEN SCREENSHOT LIGHTBOX MODAL */}
      {isGalleryFullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col p-4 sm:p-6 animate-fade-in select-none overflow-hidden"
          onClick={() => {
            playNavBackSound();
            setIsGalleryFullscreen(false);
          }}
        >
          {/* Top Bar */}
          <div
            className="shrink-0 flex items-center justify-between text-white z-20 pointer-events-auto pb-3 px-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-violet-600/30 flex items-center justify-center border border-violet-500/40 shadow-lg">
                <ImageIcon className="w-4 h-4 text-violet-300" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">
                  {activeTab === 'emulators' ? activeEmuGame?.title : selectedGameForDetails?.title}
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  Screenshot{' '}
                  {activeTab === 'emulators'
                    ? `${activeEmuScreenshotIdx + 1} of ${emuScreenshots.length}`
                    : `${activeScreenshotIdx + 1} of ${galleryScreenshots.length}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800 shadow-md">
                <ControllerGlyph type={inputDeviceType} action="navigate" />
                <span>Next / Previous</span>
              </div>
              <button
                onClick={() => {
                  playNavBackSound();
                  setIsGalleryFullscreen(false);
                }}
                className="w-8 h-8 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center border border-slate-800 transition cursor-pointer"
                title="Close (Esc / B)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Center Image Container - 100% Fit To Screen */}
          <div
            className="flex-1 min-h-0 w-full flex items-center justify-center relative overflow-hidden pointer-events-auto p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={
                activeTab === 'emulators'
                  ? emuScreenshots[activeEmuScreenshotIdx]?.full
                  : galleryScreenshots[activeScreenshotIdx]?.full
              }
              alt="Fullscreen Screenshot"
              className="max-h-full max-w-full w-auto h-auto object-contain rounded-2xl shadow-2xl border border-slate-800/80 animate-scale-up select-none"
            />

            {/* Left / Right Nav buttons */}
            {(activeTab === 'emulators' ? emuScreenshots.length : galleryScreenshots.length) > 1 && (
              <>
                <button
                  onClick={() => {
                    playNavMoveSound();
                    if (activeTab === 'emulators') {
                      setActiveEmuScreenshotIdx((prev) => (prev > 0 ? prev - 1 : emuScreenshots.length - 1));
                    } else {
                      setActiveScreenshotIdx((prev) => (prev > 0 ? prev - 1 : galleryScreenshots.length - 1));
                    }
                  }}
                  className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-2xl bg-black/70 hover:bg-violet-600 text-white flex items-center justify-center transition border border-slate-700/60 shadow-2xl cursor-pointer"
                  title="Previous"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                <button
                  onClick={() => {
                    playNavMoveSound();
                    if (activeTab === 'emulators') {
                      setActiveEmuScreenshotIdx((prev) => (prev < emuScreenshots.length - 1 ? prev + 1 : 0));
                    } else {
                      setActiveScreenshotIdx((prev) => (prev < galleryScreenshots.length - 1 ? prev + 1 : 0));
                    }
                  }}
                  className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-2xl bg-black/70 hover:bg-violet-600 text-white flex items-center justify-center transition border border-slate-700/60 shadow-2xl cursor-pointer"
                  title="Next"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
