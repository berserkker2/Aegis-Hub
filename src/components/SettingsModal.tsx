import React, { useState, useEffect } from 'react';
import {
  X,
  Settings as SettingsIcon,
  Sliders,
  FolderSync,
  Sparkles,
  Cloud,
  RotateCcw,
  Check,
  CheckCircle2,
  HardDrive,
  Layers,
  Monitor,
  Tv,
  Flame,
  Star,
  Clock,
  ArrowRight,
  EyeOff,
  Gamepad2,
  Download,
  Upload,
  Save,
  LayoutGrid,
  Info,
  Heart,
  Cpu,
  Minus,
  Square,
  Maximize2,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { GamePlatform, LauncherSettings, EmulatorConfig, CustomApp, Game } from '../types/game';
import { EmulationSettingsTab } from './EmulationSettingsTab';
import { CustomAppsSettingsTab } from './CustomAppsSettingsTab';
import { StoreIntegrationsTab } from './StoreIntegrationsTab';
import { APP_VERSION_INFO } from '../version';
import aegisLogo from '../assets/logos/aegis_logo_w.webp';
import aegisSettingsLogo from '../assets/logos/aegis_settings_logo.png';
import kofiLogo from '../assets/logos/kofi_logo.webp';

const KOFI_URL = 'https://ko-fi.com/aegishub';

const AegisPulseIcon: React.FC<{ className?: string }> = () => (
  <img src={aegisLogo} alt="Aegis Pulse" className="w-3.5 h-3.5 object-contain brightness-110" />
);

interface SettingsModalProps {
  settings: LauncherSettings;
  onSaveSettings: (settings: LauncherSettings) => void;
  onClose: () => void;
  onOpenScanner: () => void;
  onOpenStoreLinks?: () => void;
  onGamesImported?: (games: Game[]) => void;
  onFetchMissingArtwork: () => void;
  onSyncSteamPlaytime?: () => void;
  onSyncSteamRatings?: () => void;
  onSyncAllCategories?: () => void;
  onResetData: () => void;
  onRestoreBackup?: (result: { settings: LauncherSettings; games: any[]; dailyActivity?: Record<string, number> }) => void;
  hiddenGamesCount?: number;
  onShowHiddenGames?: () => void;
  onScanEmulators?: () => void;
  onScrapeEmulators?: () => void;
  isScrapingEmulators?: boolean;
  scrapingProgress?: { current: number; total: number; gameTitle: string; coverUrl?: string } | null;
  emulators?: EmulatorConfig[];
  onUpdateEmulator?: (updated: EmulatorConfig) => void;
  onDeleteEmulator?: (emulatorId: string) => void;
  initialTab?: 'defaults' | 'stores' | 'tools' | 'emulation' | 'apps' | 'about';
  isWindow?: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onSaveSettings,
  onClose,
  onOpenScanner,
  onOpenStoreLinks,
  onGamesImported,
  onFetchMissingArtwork,
  onSyncSteamPlaytime,
  onSyncSteamRatings,
  onSyncAllCategories,
  onResetData,
  onRestoreBackup,
  hiddenGamesCount,
  onShowHiddenGames,
  onScanEmulators,
  onScrapeEmulators,
  isScrapingEmulators,
  scrapingProgress,
  emulators = [],
  onUpdateEmulator,
  onDeleteEmulator,
  initialTab = 'defaults',
  isWindow = false,
}) => {
  const [activeTab, setActiveTab] = useState<'defaults' | 'stores' | 'tools' | 'emulation' | 'apps' | 'about'>(initialTab);
  const [currentSettings, setCurrentSettings] = useState<LauncherSettings>(settings);
  const [isSavedNotice, setIsSavedNotice] = useState(false);
  const [isMax, setIsMax] = useState(false);

  // App Update State
  const [updateInfo, setUpdateInfo] = useState<{
    hasUpdate: boolean;
    currentVersion: string;
    latestVersion: string;
    releaseName?: string;
    releaseNotes?: string;
    downloadUrl?: string;
    fileName?: string;
    fileSize?: number;
  } | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isDownloadingUpdate, setIsDownloadingUpdate] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [isReadyToInstall, setIsReadyToInstall] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const checkForAppUpdates = async () => {
    if (!window.api?.checkForUpdates) return;
    setIsCheckingUpdate(true);
    setUpdateError(null);
    try {
      const res = await window.api.checkForUpdates();
      setUpdateInfo(res);
    } catch (err: any) {
      setUpdateError(err?.message || 'Error checking for updates');
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const startDownloadUpdate = async () => {
    if (!updateInfo?.downloadUrl || !window.api?.downloadUpdate) return;
    setIsDownloadingUpdate(true);
    setDownloadProgress(0);
    setUpdateError(null);

    const cleanup = window.api.onUpdateDownloadProgress?.((p) => {
      setDownloadProgress(p.percent);
    });

    try {
      const res = await window.api.downloadUpdate(
        updateInfo.downloadUrl,
        updateInfo.fileName || `AegisHub-Setup-${updateInfo.latestVersion}.exe`
      );
      if (res.success) {
        setIsReadyToInstall(true);
      } else {
        setUpdateError(res.error || 'Failed to download installer');
      }
    } catch (err: any) {
      setUpdateError(err?.message || 'Download error');
    } finally {
      setIsDownloadingUpdate(false);
      cleanup?.();
    }
  };

  const handleInstallNow = async () => {
    if (!window.api?.installUpdate) return;
    try {
      await window.api.installUpdate();
    } catch (err: any) {
      setUpdateError(err?.message || 'Failed to launch installer');
    }
  };

  useEffect(() => {
    if (activeTab === 'about' && !updateInfo && !isCheckingUpdate) {
      checkForAppUpdates();
    }
  }, [activeTab]);

  useEffect(() => {
    if (isWindow && window.api?.isMaximized) {
      window.api.isMaximized().then(setIsMax);
    }
  }, [isWindow]);

  const libraryFilterOptions = [
    { id: 'pulse', label: 'Aegis Pulse', icon: AegisPulseIcon, desc: 'Gaming news, giveaways of the week, top deals, and recently played' },
    { id: 'favorites', label: 'Favorites', icon: Star, desc: 'Only titles marked with a favorite star' },
    { id: 'all', label: 'All Games', icon: Layers, desc: 'Show complete collection of all games' },
    { id: 'installed', label: 'Installed', icon: HardDrive, desc: 'Only games currently installed and playable on your PC' },
    { id: 'cloud', label: 'Cloud / Owned', icon: Cloud, desc: 'Games owned on linked store accounts (Steam, GOG, Epic)' },
    { id: 'emulators', label: 'Emulators', icon: Gamepad2, desc: 'Emulators shelf and retro game ROMs collection' },
    { id: 'recent', label: 'Recently Played', icon: Clock, desc: 'Games sorted by last played session' },
    { id: 'recommended', label: 'Discovery', icon: Sparkles, desc: 'New releases, game catalog, and recommendations' },
    ...(currentSettings.showHiddenGamesCollection
      ? [{ id: 'hidden', label: 'Hidden Games', icon: EyeOff, desc: 'Hidden titles and background utilities' }]
      : []),
  ];

  const platformOptions: { id: GamePlatform | 'all'; name: string }[] = [
    { id: 'all', name: 'All Sources' },
    { id: 'steam', name: 'Steam' },
    { id: 'epic', name: 'Epic Games' },
    { id: 'gog', name: 'GOG Galaxy' },
    { id: 'ea', name: 'EA App' },
    { id: 'ubisoft', name: 'Ubisoft Connect' },
    { id: 'xbox', name: 'Xbox' },
    { id: 'manual', name: 'Local' },
  ];

  const handleUpdate = (updates: Partial<LauncherSettings>) => {
    const next = { ...currentSettings, ...updates };
    setCurrentSettings(next);
    onSaveSettings(next);
    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 2000);
  };

  const [isExportingBackup, setIsExportingBackup] = useState(false);
  const [isImportingBackup, setIsImportingBackup] = useState(false);
  const [backupFeedback, setBackupFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleExportBackup = async () => {
    if (!window.api?.exportBackup) return;
    setIsExportingBackup(true);
    setBackupFeedback(null);
    try {
      const res = await window.api.exportBackup();
      if (res.success) {
        setBackupFeedback({
          type: 'success',
          message: `Backup saved successfully (${res.gamesCount ?? 0} games included).`,
        });
      } else if (!res.canceled) {
        setBackupFeedback({
          type: 'error',
          message: res.message || 'Failed to export backup.',
        });
      }
    } catch (err: any) {
      setBackupFeedback({
        type: 'error',
        message: err?.message || 'Error exporting backup.',
      });
    } finally {
      setIsExportingBackup(false);
    }
  };

  const handleImportBackup = async () => {
    if (!window.api?.importBackup) return;
    setIsImportingBackup(true);
    setBackupFeedback(null);
    try {
      const res = await window.api.importBackup();
      if (res.success) {
        if (res.settings) {
          setCurrentSettings(res.settings);
          onSaveSettings(res.settings);
        }
        if (onRestoreBackup && res.settings && res.games) {
          onRestoreBackup({ settings: res.settings, games: res.games, dailyActivity: res.dailyActivity });
        }
        setBackupFeedback({
          type: 'success',
          message: `Backup restored! Library, artwork, playtime and settings successfully synced (${(res.updatedGamesCount ?? 0) + (res.addedGamesCount ?? 0)} games updated).`,
        });
      } else if (!res.canceled) {
        setBackupFeedback({
          type: 'error',
          message: res.message || 'Failed to restore backup.',
        });
      }
    } catch (err: any) {
      setBackupFeedback({
        type: 'error',
        message: err?.message || 'Error restoring backup.',
      });
    } finally {
      setIsImportingBackup(false);
    }
  };

  const tabs = [
    {
      id: 'defaults' as const,
      label: 'Default Libraries & Startup',
      icon: Sliders,
      activeColor: 'bg-blue-600/15 text-blue-400 border-blue-500/30',
      iconColor: 'text-blue-400',
      indicatorColor: 'bg-blue-500',
    },
    {
      id: 'stores' as const,
      label: 'Stores & Cloud Sources',
      icon: Cloud,
      activeColor: 'bg-blue-600/15 text-blue-400 border-blue-500/30',
      iconColor: 'text-blue-400',
      indicatorColor: 'bg-blue-500',
    },
    {
      id: 'tools' as const,
      label: 'Scanner & Artwork Tools',
      icon: FolderSync,
      activeColor: 'bg-blue-600/15 text-blue-400 border-blue-500/30',
      iconColor: 'text-blue-400',
      indicatorColor: 'bg-blue-500',
    },
    {
      id: 'emulation' as const,
      label: 'Emulation',
      icon: Gamepad2,
      activeColor: 'bg-violet-600/15 text-violet-400 border-violet-500/30',
      iconColor: 'text-violet-400',
      indicatorColor: 'bg-violet-500',
    },
    {
      id: 'apps' as const,
      label: 'Apps & Shortcuts',
      icon: LayoutGrid,
      activeColor: 'bg-indigo-600/15 text-indigo-400 border-indigo-500/30',
      iconColor: 'text-indigo-400',
      indicatorColor: 'bg-indigo-500',
    },
    {
      id: 'about' as const,
      label: 'About',
      icon: Info,
      activeColor: 'bg-cyan-600/15 text-cyan-400 border-cyan-500/30',
      iconColor: 'text-cyan-400',
      indicatorColor: 'bg-cyan-500',
    },
  ];

  const content = (
    <div
      className={
        isWindow
          ? 'w-screen h-screen flex flex-col bg-slate-900 overflow-hidden select-none'
          : 'relative w-full max-w-5xl h-[88vh] max-h-[860px] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col'
      }
    >
      {/* Header */}
      {isWindow ? (
        <div className="h-10 bg-slate-950/95 border-b border-slate-800 flex items-center justify-between px-3 shrink-0 app-drag-region select-none">
          <div className="flex items-center gap-2.5 no-drag">
            <img src={aegisSettingsLogo} alt="Aegis Hub Settings" className="w-4 h-4 object-contain" />
            <span className="text-xs font-bold text-slate-200 tracking-wide">Aegis Hub Settings</span>
            {isSavedNotice && (
              <span className="text-[10px] font-normal text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 animate-fade-in">
                <Check className="w-2.5 h-2.5" /> Saved
              </span>
            )}
          </div>

          <div className="flex items-center no-drag">
            <button
              type="button"
              onClick={() => window.api?.windowMinimize?.()}
              className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800/60 transition cursor-pointer"
              title="Minimize"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={async () => {
                window.api?.windowMaximize?.();
                if (window.api?.isMaximized) {
                  setIsMax(await window.api.isMaximized());
                }
              }}
              className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800/60 transition cursor-pointer"
              title={isMax ? 'Restore' : 'Maximize'}
            >
              {isMax ? <Square className="w-3 h-3 text-slate-400" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-red-600 transition cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0 bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <SettingsIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Launcher Settings & Configuration</span>
                {isSavedNotice && (
                  <span className="text-[11px] font-normal text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 animate-fade-in">
                    <Check className="w-3 h-3" /> Saved
                  </span>
                )}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

        {/* Main Body: Vertical Navigation Sidebar + Tab Content */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Vertical Sidebar */}
          <aside className="w-56 sm:w-64 shrink-0 bg-slate-950/50 border-r border-slate-800 flex flex-col justify-between p-3 select-none">
            <div className="space-y-1">
              <div className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider text-slate-500">
                Navigation
              </div>
              {tabs.map((tab) => {
                const isSelected = activeTab === tab.id;
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all duration-150 cursor-pointer group border ${
                      isSelected
                        ? `${tab.activeColor} shadow-sm font-bold`
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <IconComponent
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isSelected ? tab.iconColor : 'text-slate-500 group-hover:text-slate-300'
                        }`}
                      />
                      <span className="truncate">{tab.label}</span>
                    </div>
                    {isSelected && (
                      <span className={`w-1.5 h-1.5 rounded-full ${tab.indicatorColor} shrink-0`} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Support / Buy Me A Coffee (Ko-fi) */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  if (window.api?.openExternal) {
                    window.api.openExternal(KOFI_URL);
                  } else {
                    window.open(KOFI_URL, '_blank');
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between bg-gradient-to-r from-red-500/15 via-rose-500/10 to-amber-500/10 hover:from-red-500/25 hover:via-rose-500/20 hover:to-amber-500/20 text-rose-200 hover:text-white border border-rose-500/30 hover:border-rose-400/50 shadow-sm transition-all duration-200 cursor-pointer group"
                title="Support Aegis Hub on Ko-fi"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={kofiLogo}
                    alt="Ko-fi"
                    className="w-4 h-4 object-contain shrink-0 group-hover:scale-110 transition-transform"
                  />
                  <span className="truncate font-bold">Buy me a coffee</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-rose-400/70 group-hover:text-rose-300 shrink-0" />
              </button>
            </div>
          </aside>

          {/* Tab Body */}
          <main className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">
          {/* TAB 1: DEFAULT LIBRARIES & STARTUP */}
          {activeTab === 'defaults' && (
            <div className="space-y-6">
              {/* Default Library View */}
              <div>
                <h3 className="text-sm font-bold text-white mb-2.5">Default Startup Library View</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {libraryFilterOptions.map((opt) => {
                    const isSelected = (currentSettings.defaultFilter || 'all') === opt.id;
                    const IconComp = opt.icon;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => handleUpdate({ defaultFilter: opt.id as any })}
                        className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                          isSelected
                            ? 'bg-blue-600/15 border-blue-500 text-white shadow-md'
                            : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/40'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          <IconComp className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold">{opt.label}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-blue-400" />}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{opt.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Default Platform Source */}
              <div>
                <h3 className="text-sm font-bold text-white mb-2.5">Default Startup Source & Store</h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {platformOptions.map((p) => {
                    const isSelected = (currentSettings.defaultPlatform || 'all') === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleUpdate({ defaultPlatform: p.id })}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold transition text-left ${
                          isSelected
                            ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm'
                            : 'bg-slate-950/50 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <span className="truncate flex-1">{p.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Collections & Visibility */}
              <div className="pt-4 border-t border-slate-800/80 space-y-3">
                <h3 className="text-sm font-bold text-white">Collections & Visibility</h3>
                <div className="space-y-2">
                  <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-slate-800 hover:border-slate-700 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-blue-400" />
                      <span className="text-xs font-semibold text-slate-200">Show Store & Platform Badges on Games</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={currentSettings.showPlatformBadges ?? true}
                      onChange={(e) => handleUpdate({ showPlatformBadges: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-600 bg-slate-800 border-slate-700 focus:ring-0 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-slate-800 hover:border-slate-700 cursor-pointer">
                    <div className="pr-4">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-rose-400" />
                        <span className="text-xs font-semibold text-slate-200">Filter Out Adult / NSFW Games</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                        Hides games with adult-only sexual content or nudity from discovery, recommendations, and releases.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={currentSettings.filterAdultGames ?? true}
                      onChange={(e) => handleUpdate({ filterAdultGames: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-600 bg-slate-800 border-slate-700 focus:ring-0 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-slate-800 hover:border-slate-700 cursor-pointer">
                    <div className="pr-4">
                      <div className="flex items-center gap-2">
                        <EyeOff className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-semibold text-slate-200">Show "Hidden Games" Collection</span>
                        {hiddenGamesCount !== undefined && hiddenGamesCount > 0 && (
                          <span className="text-[10px] font-mono bg-slate-800 px-1.5 py-0.5 rounded text-amber-400">
                            {hiddenGamesCount} hidden
                          </span>
                        )}
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={currentSettings.showHiddenGamesCollection ?? false}
                      onChange={(e) => handleUpdate({ showHiddenGamesCollection: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-600 bg-slate-800 border-slate-700 focus:ring-0 cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              {/* Launcher Behavior */}
              <div className="pt-4 border-t border-slate-800/80 space-y-3">
                <h3 className="text-sm font-bold text-white">Launcher Behavior & System Tray</h3>
                <div className="space-y-2">
                  <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-slate-800 hover:border-slate-700 cursor-pointer">
                    <div className="pr-4">
                      <span className="text-xs font-semibold text-slate-200">Minimize to System Tray on Close</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Clicking the close (X) button keeps Aegis Hub running in the background near the Windows clock. Right-click the tray icon to exit.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={currentSettings.closeToTray || false}
                      onChange={(e) => handleUpdate({ closeToTray: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-600 bg-slate-800 border-slate-700 focus:ring-0 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-slate-800 hover:border-slate-700 cursor-pointer">
                    <div className="pr-4">
                      <span className="text-xs font-semibold text-slate-200">Minimize on Game Launch</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">Minimize Aegis Hub to system tray when a game starts</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={currentSettings.minimizeToTray || false}
                      onChange={(e) => handleUpdate({ minimizeToTray: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-600 bg-slate-800 border-slate-700 focus:ring-0 cursor-pointer"
                    />
                  </label>

                  {/* System Tray Icon Style / Color */}
                  <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-xs font-semibold text-slate-200">System Tray Icon Color</span>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Choose whether the Aegis Hub icon on the Windows taskbar tray is white or black:
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => handleUpdate({ trayIconColor: 'white' })}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold transition ${
                          (currentSettings.trayIconColor || 'white') === 'white'
                            ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center p-0.5">
                            <img src={new URL('../assets/logos/aegis_logo_w.webp', import.meta.url).href} alt="White" className="w-full h-full object-contain" />
                          </div>
                          <span>White Icon (Default)</span>
                        </div>
                        {(currentSettings.trayIconColor || 'white') === 'white' && (
                          <Check className="w-3.5 h-3.5 text-blue-400" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleUpdate({ trayIconColor: 'black' })}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold transition ${
                          currentSettings.trayIconColor === 'black'
                            ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-md bg-slate-200 border border-slate-300 flex items-center justify-center p-0.5">
                            <img src={new URL('../assets/logos/aegis_logo_b.webp', import.meta.url).href} alt="Black" className="w-full h-full object-contain" />
                          </div>
                          <span>Black Icon</span>
                        </div>
                        {currentSettings.trayIconColor === 'black' && (
                          <Check className="w-3.5 h-3.5 text-blue-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-slate-800 hover:border-slate-700 cursor-pointer">
                    <div>
                      <span className="text-xs font-semibold text-slate-200">Auto-Scan on Startup</span>
                      <p className="text-[11px] text-slate-400">Silently check for new game installations when opening the app</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={currentSettings.autoScanOnStartup || false}
                      onChange={(e) => handleUpdate({ autoScanOnStartup: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-600 bg-slate-800 border-slate-700 focus:ring-0"
                    />
                  </label>
                </div>
              </div>

              {/* Startup & Big Picture Behavior */}
              <div className="pt-4 border-t border-slate-800/80 space-y-3">
                <div className="flex items-center gap-2">
                  <Tv className="w-4 h-4 text-blue-400" />
                  <h3 className="text-sm font-bold text-white">Startup & Big Picture Behavior</h3>
                </div>

                <div className="space-y-2">
                  {/* Start in Big Picture Mode */}
                  <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-slate-800 hover:border-slate-700 cursor-pointer">
                    <div className="pr-4">
                      <span className="text-xs font-semibold text-slate-200">Start in Big Picture Mode</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Always launch Aegis Hub directly into the console TV full-screen interface.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={currentSettings.startInBigPicture || false}
                      onChange={(e) => handleUpdate({ startInBigPicture: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-600 bg-slate-800 border-slate-700 focus:ring-0 cursor-pointer"
                    />
                  </label>

                  {/* Start with Windows */}
                  <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-slate-800 hover:border-slate-700 cursor-pointer">
                    <div className="pr-4">
                      <span className="text-xs font-semibold text-slate-200">Start with Windows</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Automatically launch Aegis Hub when you turn on or sign in to Windows.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={currentSettings.startWithWindows || false}
                      onChange={(e) => handleUpdate({ startWithWindows: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-600 bg-slate-800 border-slate-700 focus:ring-0 cursor-pointer"
                    />
                  </label>

                  {/* Startup Window State (Minimized vs Maximized) */}
                  {currentSettings.startWithWindows && (
                    <div className="p-3.5 rounded-xl bg-blue-950/25 border border-blue-900/50 space-y-2.5">
                      <div>
                        <span className="text-xs font-semibold text-slate-200">Windows Startup Window Mode</span>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Choose how Aegis Hub opens when Windows boots up:
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleUpdate({ startupWindowMode: 'minimized' })}
                          className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold transition ${
                            currentSettings.startupWindowMode === 'minimized'
                              ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm'
                              : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div className="text-left">
                            <div className="font-semibold">Minimized</div>
                            <div className="text-[10px] text-slate-400 font-normal">Hidden in System Tray</div>
                          </div>
                          {currentSettings.startupWindowMode === 'minimized' && (
                            <Check className="w-3.5 h-3.5 text-blue-400" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleUpdate({ startupWindowMode: 'maximized' })}
                          className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold transition ${
                            (currentSettings.startupWindowMode || 'maximized') === 'maximized'
                              ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm'
                              : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div className="text-left">
                            <div className="font-semibold">Maximized</div>
                            <div className="text-[10px] text-slate-400 font-normal">
                              {currentSettings.startInBigPicture ? 'Big Picture Fullscreen' : 'Maximized Window'}
                            </div>
                          </div>
                          {(currentSettings.startupWindowMode || 'maximized') === 'maximized' && (
                            <Check className="w-3.5 h-3.5 text-blue-400" />
                          )}
                        </button>
                      </div>

                      {currentSettings.startInBigPicture && (currentSettings.startupWindowMode || 'maximized') === 'maximized' && (
                        <p className="text-[11px] text-emerald-400/90 bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-800/40 leading-relaxed">
                          ✨ <strong>Big Picture Fullscreen:</strong> Com as opções "Maximizada" e "Start in Big Picture Mode" ativadas, o Aegis Hub iniciará automaticamente em Big Picture em ecrã inteiro assim que o Windows ligar.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STORES & CLOUD SOURCES */}
          {activeTab === 'stores' && (
            <div className="space-y-4">
              <StoreIntegrationsTab onGamesImported={onGamesImported} />
            </div>
          )}

          {/* TAB 3: SCANNER & ARTWORK TOOLS */}
          {activeTab === 'tools' && (
            <div className="space-y-4">
              {/* Smart PC Scanner */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <FolderSync className="w-4 h-4 text-emerald-400" />
                    <span>Smart PC Scanner</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 max-w-md">
                    Automatically scans all hard drives, Steam, Epic, GOG libraries and Windows Registry for installed games.
                  </p>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    onOpenScanner();
                  }}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition shrink-0 ml-4 flex items-center gap-1.5"
                >
                  <FolderSync className="w-3.5 h-3.5" />
                  <span>Scan Computer</span>
                </button>
              </div>

              {/* Online Missing Artwork Finder */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <span>Online Artwork Lookup (Steam & GOG)</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 max-w-md">
                    Iterates through your library to find games with missing covers or placeholders, downloading official 2:3 vertical box art and wide banners.
                  </p>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    onFetchMissingArtwork();
                  }}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition shrink-0 ml-4 flex items-center gap-1.5 shadow"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Fetch Missing Covers</span>
                </button>
              </div>

              {/* Steam Local Playtime Sync */}
              {onSyncSteamPlaytime && (
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      <Clock className="w-4 h-4 text-sky-400" />
                      <span>Sync Steam Playtime (Local Client)</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 max-w-md">
                      Reads hours played and last played timestamps directly from your local Steam client files without requiring API keys.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      onClose();
                      onSyncSteamPlaytime();
                    }}
                    className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold transition shrink-0 ml-4 flex items-center gap-1.5 shadow"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Sync Playtime</span>
                  </button>
                </div>
              )}

              {/* Steam Store Reviews & Ratings Sync */}
              {onSyncSteamRatings && (
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      <Star className="w-4 h-4 text-amber-400" />
                      <span>Fetch Steam Ratings & Reviews</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 max-w-md">
                      Fetches official Steam Store positive review percentage scores (e.g. 95% rating) for all Steam games in your library.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      onClose();
                      onSyncSteamRatings();
                    }}
                    className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold transition shrink-0 ml-4 flex items-center gap-1.5 shadow"
                  >
                    <Star className="w-3.5 h-3.5" />
                    <span>Sync Ratings</span>
                  </button>
                </div>
              )}

              {/* Game Categories & Genres Sync */}
              {onSyncAllCategories && (
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-purple-400" />
                      <span>Sync Categories & Genres</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 max-w-md">
                      Finds official genres and community tags (Horror, Action, RPG, Open World, etc.) for games that are missing categories.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      onClose();
                      onSyncAllCategories();
                    }}
                    className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold transition shrink-0 ml-4 flex items-center gap-1.5 shadow"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Sync Categories</span>
                  </button>
                </div>
              )}

              {/* Hidden Games & Utility Apps Management */}
              {onShowHiddenGames && (
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      <EyeOff className="w-4 h-4 text-amber-400" />
                      <span>Hidden Games & Utility Apps</span>
                      <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded-full text-slate-300">
                        {hiddenGamesCount || 0} hidden
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 max-w-md">
                      View and manage hidden games or background tools like Wallpaper Engine that were excluded from your regular library.
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={currentSettings.showHiddenGamesCollection ?? false}
                        onChange={(e) => handleUpdate({ showHiddenGamesCollection: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600 bg-slate-800 border-slate-700 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-[11px] font-medium text-slate-300">Show in Sidebar</span>
                    </label>
                    <button
                      onClick={() => {
                        handleUpdate({ showHiddenGamesCollection: true });
                        onClose();
                        onShowHiddenGames();
                      }}
                      className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold transition shrink-0 flex items-center gap-1.5 shadow"
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>View Hidden ({hiddenGamesCount || 0})</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Gemini AI & Recommendations Configuration */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/40 via-purple-950/40 to-slate-950/60 border border-blue-500/30 space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Gemini AI Game Search & Recommendations</span>
                  </h4>
                  <p className="text-[11px] text-slate-300 mt-1 max-w-lg">
                    Power natural language game search in the <strong>Discovery</strong> tab using Google Gemini (model <code>gemini-3.8-flash</code>).
                  </p>
                </div>

                <div className="space-y-2 pt-1">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Google Gemini API Key
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        placeholder="AIzaSy..."
                        value={currentSettings.geminiApiKey || ''}
                        onChange={(e) => handleUpdate({ geminiApiKey: e.target.value.trim() })}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (window.api?.openExternal) {
                            window.api.openExternal('https://aistudio.google.com/app/apikey');
                          } else {
                            window.open('https://aistudio.google.com/app/apikey', '_blank');
                          }
                        }}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-lg text-xs font-semibold border border-slate-700 transition flex items-center gap-1 shrink-0"
                      >
                        <span>Get Free Key</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Keys are free from Google AI Studio. Stored securely and only used locally on your PC.
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-800/60">
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      RAWG API Key (Optional live catalog)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        placeholder="Enter optional RAWG API key..."
                        value={currentSettings.rawgApiKey || ''}
                        onChange={(e) => handleUpdate({ rawgApiKey: e.target.value.trim() })}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (window.api?.openExternal) {
                            window.api.openExternal('https://rawg.io/apidocs');
                          } else {
                            window.open('https://rawg.io/apidocs', '_blank');
                          }
                        }}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold border border-slate-700 transition flex items-center gap-1 shrink-0"
                      >
                        <span>RAWG.io</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Local Settings & Playtime Backup */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      <Save className="w-4 h-4 text-emerald-400" />
                      <span>Local Settings & Playtime Backup</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 max-w-md">
                      Save or restore your launcher preferences, API keys, tracked playtime, and activity history to a local JSON file. Store account logins are excluded for security.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleExportBackup}
                      disabled={isExportingBackup || isImportingBackup}
                      className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition shrink-0 flex items-center gap-1.5 shadow disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{isExportingBackup ? 'Exporting...' : 'Export Backup'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleImportBackup}
                      disabled={isExportingBackup || isImportingBackup}
                      className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition shrink-0 flex items-center gap-1.5 shadow disabled:opacity-50"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isImportingBackup ? 'Restoring...' : 'Restore Backup'}</span>
                    </button>
                  </div>
                </div>
                {backupFeedback && (
                  <div
                    className={`text-[11px] px-3 py-2 rounded-lg flex items-center gap-2 ${
                      backupFeedback.type === 'success'
                        ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-300'
                        : 'bg-red-950/40 border border-red-500/30 text-red-300'
                    }`}
                  >
                    {backupFeedback.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    ) : (
                      <X className="w-4 h-4 shrink-0 text-red-400" />
                    )}
                    <span>{backupFeedback.message}</span>
                  </div>
                )}
              </div>

              {/* Danger Zone: Reset Data */}
              <div className="pt-4 border-t border-slate-800">
                <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/30 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-red-300 flex items-center gap-2">
                      <RotateCcw className="w-4 h-4 text-red-400" />
                      <span>Clear Cache & Reset Library</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 max-w-md">
                      Deletes local media cache and resets the games list to default seed titles.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to wipe all launcher cache and reset library?')) {
                        onClose();
                        onResetData();
                      }
                    }}
                    className="px-3.5 py-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-lg text-xs font-semibold transition shrink-0 ml-4"
                  >
                    <span>Reset Data</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: EMULATION */}
          {activeTab === 'emulation' && (
            <EmulationSettingsTab
              emulators={emulators}
              onUpdateEmulator={onUpdateEmulator}
              onDeleteEmulator={onDeleteEmulator}
              onScanEmulators={onScanEmulators}
              onScrapeEmulators={onScrapeEmulators}
              isScrapingEmulators={isScrapingEmulators}
              scrapingProgress={scrapingProgress}
            />
          )}

          {/* TAB 5: APPS & SHORTCUTS */}
          {activeTab === 'apps' && (
            <CustomAppsSettingsTab
              customApps={currentSettings.customApps}
              onSaveApps={(updatedApps) => handleUpdate({ customApps: updatedApps })}
            />
          )}

          {/* TAB 6: ABOUT AEGIS HUB */}
          {activeTab === 'about' && (
            <div className="space-y-6 select-text cursor-text">
              {/* Hero Banner */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-950/40 via-slate-900 to-indigo-950/30 border border-blue-500/20 p-6 flex flex-col md:flex-row items-center gap-6">
                <div className="w-20 h-20 rounded-2xl bg-slate-950/80 border border-blue-500/30 shadow-lg shadow-blue-900/20 flex items-center justify-center p-3 relative shrink-0">
                  <img
                    src={new URL('../assets/logos/aegis_logo.webp', import.meta.url).href}
                    alt="Aegis Hub"
                    className="w-full h-full object-contain filter drop-shadow(0 0 12px rgba(59,130,246,0.5))"
                  />
                  <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-blue-600 text-[9px] font-bold text-white uppercase tracking-wider">
                    Beta
                  </div>
                </div>

                <div className="text-center md:text-left flex-1">
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
                    <h2 className="text-xl font-bold text-white tracking-wide">Aegis Hub</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      v{APP_VERSION_INFO.version}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                    A modern, unified gaming dashboard and TV Big Picture experience built for PC gamers, and retro enthusiasts.
                  </p>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-3 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-400" />
                      Build Date: <strong className="text-slate-200">{APP_VERSION_INFO.buildDate}</strong>
                    </span>
                  </div>
                </div>

                {/* Check Update Button */}
                <div className="shrink-0 flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={checkForAppUpdates}
                    disabled={isCheckingUpdate || isDownloadingUpdate}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-blue-600/20"
                  >
                    <FolderSync className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
                    <span>{isCheckingUpdate ? 'Checking...' : 'Check for Updates'}</span>
                  </button>
                </div>
              </div>

              {/* Updates Notification / Download Card */}
              {updateInfo && (
                <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-4 shadow-xl">
                  {updateInfo.hasUpdate ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                          </span>
                          <div>
                            <h3 className="text-sm font-bold text-white">
                              New Update Available: <span className="text-emerald-400">{updateInfo.releaseName || updateInfo.latestVersion}</span>
                            </h3>
                            <p className="text-[11px] text-slate-400">
                              Current version: v{updateInfo.currentVersion} • Latest: v{updateInfo.latestVersion}
                            </p>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2">
                          {!isReadyToInstall ? (
                            <button
                              type="button"
                              onClick={startDownloadUpdate}
                              disabled={isDownloadingUpdate || !updateInfo.downloadUrl}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-600/20"
                            >
                              <Download className={`w-3.5 h-3.5 ${isDownloadingUpdate ? 'animate-bounce' : ''}`} />
                              <span>{isDownloadingUpdate ? `Downloading ${downloadProgress}%` : 'Update Now (1-Click)'}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={handleInstallNow}
                              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-extrabold transition flex items-center gap-2 shadow-lg shadow-amber-500/20 animate-pulse"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Restart & Install Update</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Download Progress Bar */}
                      {isDownloadingUpdate && (
                        <div className="space-y-1.5 pt-1">
                          <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                            <div
                              className="bg-emerald-500 h-2 transition-all duration-300 rounded-full"
                              style={{ width: `${downloadProgress}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                            <span>Downloading update installer...</span>
                            <span>{downloadProgress}%</span>
                          </div>
                        </div>
                      )}

                      {/* Release Notes */}
                      {updateInfo.releaseNotes && (
                        <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl text-xs text-slate-300 space-y-1 max-h-40 overflow-y-auto">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">What's New:</span>
                          <p className="whitespace-pre-line leading-relaxed text-[11px] text-slate-300">
                            {updateInfo.releaseNotes}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <div className="flex items-center gap-2 text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="font-semibold">Aegis Hub is up to date! (v{updateInfo.currentVersion})</span>
                      </div>
                      <span className="text-[11px] text-slate-500">No updates found on GitHub</span>
                    </div>
                  )}

                  {updateError && (
                    <div className="p-2.5 bg-red-950/50 border border-red-500/30 rounded-lg text-xs text-red-300">
                      {updateError}
                    </div>
                  )}
                </div>
              )}

              {/* Quick Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/80">
                  <div className="flex items-center gap-2 text-xs font-bold text-white mb-1.5">
                    <Tv className="w-4 h-4 text-blue-400" />
                    <span>Big Picture Experience</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Full controller navigation (Xbox, PS, Switch), virtual keyboard search, and smooth TV layout.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/80">
                  <div className="flex items-center gap-2 text-xs font-bold text-white mb-1.5">
                    <Cloud className="w-4 h-4 text-indigo-400" />
                    <span>Multi-Store Libraries</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Native sync for Steam, Epic Games, GOG Galaxy, Ubisoft, EA App, and local manual games.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/80">
                  <div className="flex items-center gap-2 text-xs font-bold text-white mb-1.5">
                    <Gamepad2 className="w-4 h-4 text-violet-400" />
                    <span>Retro Emulation</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Integrated ROM scanners and automatic artwork scraping across 15+ console platforms and custom emulators.
                  </p>
                </div>
              </div>

              {/* Runtime & Technology Stack */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-blue-400" />
                  <span>Runtime & Technology Stack</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/60">
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">Framework</div>
                    <div className="font-bold text-slate-200 mt-0.5">Electron & React 19</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/60">
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">Bundler</div>
                    <div className="font-bold text-slate-200 mt-0.5">Vite 8 & Tailwind CSS</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/60">
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">License</div>
                    <div className="font-bold text-emerald-400 mt-0.5">Open Source (MIT)</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/60">
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">Distribution</div>
                    <div className="font-bold text-slate-200 mt-0.5">Portable & NSIS Setup</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/60">
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">Platform</div>
                    <div className="font-bold text-slate-200 mt-0.5">Windows 10 / 11 (x64)</div>
                  </div>
                </div>
              </div>

              {/* Community & Credits */}
              <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-rose-500 fill-rose-500/20 shrink-0" />
                  <span>Crafted with passion for gamers, built for seamless play.</span>
                </div>
              </div>

              {/* Ko-fi Support Link */}
              <div className="flex items-center gap-2 px-1">
                <button
                  type="button"
                  onClick={() => {
                    if (window.api?.openExternal) {
                      window.api.openExternal(KOFI_URL);
                    } else {
                      window.open(KOFI_URL, '_blank');
                    }
                  }}
                  className="inline-flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors"
                >
                  <img src={kofiLogo} alt="Ko-fi" className="w-4 h-4 object-contain shrink-0" />
                  <span>And if you wanna support me you can buy me a coffee</span>
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between shrink-0">
        <div className="text-[11px] text-slate-500 flex items-center gap-2">
          <span>Aegis Hub {APP_VERSION_INFO.version} ({APP_VERSION_INFO.releaseChannel})</span>
        </div>
        <button
          onClick={onClose}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  );

  if (isWindow) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-hidden animate-fade-in">
      {content}
    </div>
  );
};
