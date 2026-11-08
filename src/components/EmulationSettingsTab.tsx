import React, { useState } from 'react';
import {
  Gamepad2,
  FolderOpen,
  FolderSync,
  ExternalLink,
  Download,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  RefreshCw,
  Sliders,
  ChevronDown,
  ChevronUp,
  Folder,
  X,
  FileCode,
  Sparkles
} from 'lucide-react';
import { EmulatorConfig } from '../types/game';
import { SYSTEM_DEFINITIONS, SystemDefinition, getSystemLogo } from '../utils/emulatorSystems';
import { EmulatorSettingsModal } from './EmulatorSettingsModal';

interface EmulationSettingsTabProps {
  emulators: EmulatorConfig[];
  onUpdateEmulator?: (updated: EmulatorConfig) => void;
  onDeleteEmulator?: (emulatorId: string) => void;
  onScanEmulators?: () => void;
  onScrapeEmulators?: () => void;
  isScrapingEmulators?: boolean;
  scrapingProgress?: { current: number; total: number; gameTitle: string; coverUrl?: string } | null;
}

export const EmulationSettingsTab: React.FC<EmulationSettingsTabProps> = ({
  emulators,
  onUpdateEmulator,
  onDeleteEmulator,
  onScanEmulators,
  onScrapeEmulators,
  isScrapingEmulators = false,
  scrapingProgress = null,
}) => {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadNotice, setDownloadNotice] = useState<{ id: string; message: string; success: boolean } | null>(null);
  const [expandedSystemKey, setExpandedSystemKey] = useState<string | null>(null);
  const [selectedSubEmu, setSelectedSubEmu] = useState<Record<string, string>>({}); // systemKey -> emulatorId
  const [editingCustomEmulator, setEditingCustomEmulator] = useState<EmulatorConfig | null>(null);

  const handleAddNewCustom = () => {
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
    setEditingCustomEmulator(newConfig);
  };

  // Find matching emulator configs for a system
  const getEmusForSystem = (system: SystemDefinition): EmulatorConfig[] => {
    return emulators.filter((e) => {
      if (e.systemKey && e.systemKey.toLowerCase() === system.systemKey.toLowerCase()) return true;
      if (system.emulators.some((preset) => preset.id.toLowerCase() === e.id.toLowerCase())) return true;
      return system.supportedConsoles.some((c) =>
        (e.consoleName || '').toLowerCase().includes(c.toLowerCase())
      );
    });
  };

  // Determine if a system is toggled active
  const isSystemActive = (system: SystemDefinition): boolean => {
    const emus = getEmusForSystem(system);
    if (emus.length === 0) return false;
    return emus.some((e) => e.enabled === true);
  };

  // Toggle active state for a system
  const handleToggleSystem = (system: SystemDefinition, enable: boolean) => {
    const matchingEmus = getEmusForSystem(system);

    if (matchingEmus.length > 0) {
      // Update existing emulator configs for this system
      matchingEmus.forEach((emu) => {
        if (onUpdateEmulator) {
          onUpdateEmulator({ ...emu, enabled: enable });
        }
      });
    } else if (enable) {
      // First time activating this system: create default config from preset
      const defaultPreset = system.emulators[0];
      const newConfig: EmulatorConfig = {
        id: defaultPreset ? defaultPreset.id : `emu_${system.systemKey}`,
        name: defaultPreset ? defaultPreset.name : system.name,
        shortName: system.shortName,
        consoleName: system.name,
        consoleCategory: system.category,
        installed: false,
        romPaths: [],
        gamesCount: 0,
        color: 'text-violet-400',
        badgeBg: 'bg-violet-500/15 border-violet-500/30 text-violet-300',
        enabled: true,
        systemKey: system.systemKey,
        websiteUrl: defaultPreset?.websiteUrl,
        downloadUrl: defaultPreset?.downloadUrl,
      };
      if (onUpdateEmulator) {
        onUpdateEmulator(newConfig);
      }
    }

    if (enable) {
      setExpandedSystemKey(system.systemKey);
    }
  };

  // File Picker for Executable
  const handleBrowseExecutable = async (emu: EmulatorConfig) => {
    if (!window.api?.selectFile) return;
    const file = await window.api.selectFile([
      { name: 'Executables (*.exe)', extensions: ['exe'] },
      { name: 'All Files', extensions: ['*'] },
    ]);
    if (file && onUpdateEmulator) {
      onUpdateEmulator({
        ...emu,
        executablePath: file,
        installed: true,
      });
    }
  };

  // Download & Install portable emulator package
  const handleDownloadEmulator = async (emu: EmulatorConfig, downloadUrl?: string) => {
    if (!window.api?.downloadEmulator) {
      // Fallback in web view: open external link
      if (emu.websiteUrl) window.open(emu.websiteUrl, '_blank');
      return;
    }

    setDownloadingId(emu.id);
    setDownloadNotice(null);

    try {
      const res = await window.api.downloadEmulator(emu.id, downloadUrl || emu.downloadUrl);
      if (res.success && res.executablePath) {
        if (onUpdateEmulator) {
          onUpdateEmulator({
            ...emu,
            executablePath: res.executablePath,
            installed: true,
          });
        }
        setDownloadNotice({
          id: emu.id,
          message: res.message || 'Emulator downloaded and configured successfully!',
          success: true,
        });
      } else {
        setDownloadNotice({
          id: emu.id,
          message: res.message || 'Direct package not found. Opened official download site.',
          success: false,
        });
      }
    } catch (err: any) {
      setDownloadNotice({
        id: emu.id,
        message: `Download failed: ${err.message}`,
        success: false,
      });
    } finally {
      setDownloadingId(null);
    }
  };

  // Open official project website
  const handleOpenWebsite = (url?: string) => {
    if (!url) return;
    if (window.api?.openExternal) {
      window.api.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  };

  // Add ROM directory
  const handleAddRomFolder = async (emu: EmulatorConfig) => {
    if (!window.api?.selectFolder) return;
    const folder = await window.api.selectFolder();
    if (folder && onUpdateEmulator) {
      const paths = emu.romPaths || [];
      if (!paths.includes(folder)) {
        onUpdateEmulator({
          ...emu,
          romPaths: [...paths, folder],
        });
      }
    }
  };

  // Remove ROM directory
  const handleRemoveRomFolder = (emu: EmulatorConfig, folderIndex: number) => {
    if (!onUpdateEmulator) return;
    const paths = (emu.romPaths || []).filter((_, i) => i !== folderIndex);
    onUpdateEmulator({
      ...emu,
      romPaths: paths,
    });
  };

  const customEmulators = emulators.filter((e) => e.isCustom);

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Controls */}
      <div className="p-4 rounded-xl bg-violet-950/30 border border-violet-500/30 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-600/30 border border-violet-500/40 text-violet-300 flex items-center justify-center shrink-0">
            <Gamepad2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Emulation Systems & Platforms</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-900/60 text-violet-300 border border-violet-500/40">
                {SYSTEM_DEFINITIONS.length} Systems Available
              </span>
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onScrapeEmulators && (
            <button
              type="button"
              onClick={onScrapeEmulators}
              disabled={isScrapingEmulators}
              className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-violet-600/30 disabled:opacity-50"
              title="Automatically search and download authentic box art, descriptions, developer, publisher, and release dates for all emulated games"
            >
              <Sparkles className={`w-3.5 h-3.5 text-amber-300 ${isScrapingEmulators ? 'animate-spin' : ''}`} />
              <span>{isScrapingEmulators ? 'Scraping Info & Covers...' : 'Auto-Fetch Info & Covers'}</span>
            </button>
          )}

          {onScanEmulators && (
            <button
              type="button"
              onClick={onScanEmulators}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Rescan ROMs</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleAddNewCustom}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition"
          >
            <Plus className="w-3.5 h-3.5 text-violet-400" />
            <span>Add Custom</span>
          </button>
        </div>
      </div>

      {/* Live Scraping Progress Banner */}
      {isScrapingEmulators && scrapingProgress && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-950/80 via-slate-900 to-indigo-950/80 border border-violet-500/50 shadow-2xl space-y-3 animate-fade-in select-none">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
              <span className="text-xs font-bold uppercase tracking-wider text-violet-200">
                Fetching Retro Metadata & Official Covers
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-violet-300">
              {scrapingProgress.current} / {scrapingProgress.total} ({Math.round((scrapingProgress.current / Math.max(1, scrapingProgress.total)) * 100)}%)
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-violet-500/30 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-indigo-400 transition-all duration-300 rounded-full shadow-sm"
              style={{ width: `${Math.round((scrapingProgress.current / Math.max(1, scrapingProgress.total)) * 100)}%` }}
            />
          </div>

          {/* Active Item Preview */}
          <div className="flex items-center gap-3 pt-1">
            {scrapingProgress.coverUrl && !scrapingProgress.coverUrl.startsWith('data:image/svg') ? (
              <img
                src={scrapingProgress.coverUrl}
                alt="Preview"
                className="w-8 h-10 object-cover rounded-md border border-white/10 shrink-0 shadow-md"
              />
            ) : (
              <div className="w-8 h-10 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                <Gamepad2 className="w-4 h-4 text-slate-500" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">
                {scrapingProgress.gameTitle}
              </p>
              <p className="text-[11px] text-slate-400">
                Querying Libretro CDN, Wikipedia synopsis & metadata...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Systems List */}
      <div className="space-y-3">
        {SYSTEM_DEFINITIONS.map((system) => {
          const active = isSystemActive(system);
          const isExpanded = expandedSystemKey === system.systemKey;
          const matchingEmus = getEmusForSystem(system);

          // Active or selected emulator within this system
          const activeSubEmuId =
            selectedSubEmu[system.systemKey] ||
            (matchingEmus[0] ? matchingEmus[0].id : system.emulators[0]?.id);

          const currentEmuConfig = matchingEmus.find((e) => e.id === activeSubEmuId) || matchingEmus[0];
          const currentPreset = system.emulators.find((e) => e.id === activeSubEmuId) || system.emulators[0];

          const isDownloading = downloadingId === (currentEmuConfig?.id || currentPreset?.id);
          const notice = downloadNotice?.id === (currentEmuConfig?.id || currentPreset?.id) ? downloadNotice : null;

          return (
            <div
              key={system.systemKey}
              className={`rounded-2xl border transition-all overflow-hidden ${
                active
                  ? 'bg-slate-900 border-slate-700 shadow-md'
                  : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700/80'
              }`}
            >
              {/* System Card Row */}
              <div className="p-3.5 flex items-center justify-between gap-4">
                {/* Left: Logo & Title */}
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  {/* System Logo */}
                  <div className="w-24 h-10 px-2 py-1 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-center shrink-0">
                    <img
                      src={system.logo}
                      alt={system.name}
                      className="max-h-7 w-auto object-contain"
                      style={{
                        filter: active
                          ? 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.7))'
                          : 'grayscale(60%) opacity(0.6)',
                      }}
                    />
                  </div>

                  {/* Title & Consoles */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-white truncate">{system.name}</h4>
                      {active ? (
                        <span className="text-[10px] font-medium px-2 py-0.2 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-400">
                          Active in Launcher
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-2 py-0.2 rounded-full bg-slate-800 text-slate-400">
                          Disabled
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      Covers: {system.supportedConsoles.join(', ')}
                    </p>
                  </div>
                </div>

                {/* Right: Toggle Switch & Expand Button */}
                <div className="flex items-center gap-3 shrink-0">
                  {/* Toggle Switch */}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={(e) => handleToggleSystem(system, e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>

                  {/* Expand / Collapse Details Button */}
                  <button
                    type="button"
                    onClick={() => setExpandedSystemKey(isExpanded ? null : system.systemKey)}
                    className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                    title={isExpanded ? 'Collapse settings' : 'Expand settings and paths'}
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Expanded Configuration Section */}
              {isExpanded && (
                <div className="p-4 border-t border-slate-800 bg-slate-950/50 space-y-4 animate-fade-in">
                  {/* Sub-Emulator Selector if multiple exist for this system */}
                  {system.emulators.length > 1 && (
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                        Installed / Available Emulators for this system:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {system.emulators.map((preset) => {
                          const isCurrent = (currentPreset?.id || '') === preset.id;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() =>
                                setSelectedSubEmu({
                                  ...selectedSubEmu,
                                  [system.systemKey]: preset.id,
                                })}
                              className={`px-3 py-1 rounded-xl text-xs font-semibold border transition ${
                                isCurrent
                                  ? 'bg-violet-600/25 border-violet-500 text-white shadow-sm'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              {preset.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Current Emulator Details & Status */}
                  <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-white">
                          {currentPreset?.name || currentEmuConfig?.name}
                        </span>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {currentPreset?.description || 'Custom configured retro emulator.'}
                        </p>
                      </div>

                      {/* Status badge */}
                      {currentEmuConfig?.executablePath ? (
                        <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Configured</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[11px] text-amber-400 bg-amber-950/60 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-medium">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Needs .exe</span>
                        </div>
                      )}
                    </div>

                    {/* Notice alert */}
                    {notice && (
                      <div
                        className={`p-2.5 rounded-lg text-xs font-medium flex items-center justify-between ${
                          notice.success
                            ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
                            : 'bg-blue-950/60 border border-blue-500/40 text-blue-300'
                        }`}
                      >
                        <span>{notice.message}</span>
                        <button onClick={() => setDownloadNotice(null)}>
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Path & Browse row */}
                    <div>
                      <span className="text-[11px] font-semibold text-slate-300 block mb-1">
                        Executable Path (.exe) — Manual Path:
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={currentEmuConfig?.executablePath || ''}
                          placeholder="No executable selected. Click Browse or Download below..."
                          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (currentEmuConfig) {
                              handleBrowseExecutable(currentEmuConfig);
                            } else {
                              handleToggleSystem(system, true);
                            }
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition shrink-0"
                          title="Browse for executable on your PC"
                        >
                          <FolderOpen className="w-3.5 h-3.5 text-violet-400" />
                          <span>Browse...</span>
                        </button>
                      </div>
                    </div>

                    {/* Actions Row: Download + Official Website */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {/* Download Button */}
                      <button
                        type="button"
                        disabled={isDownloading}
                        onClick={() => {
                          const targetConfig = currentEmuConfig || {
                            id: currentPreset.id,
                            name: currentPreset.name,
                            shortName: system.shortName,
                            consoleName: system.name,
                            consoleCategory: system.category,
                            installed: false,
                            romPaths: [],
                            gamesCount: 0,
                            color: 'text-violet-400',
                            badgeBg: 'bg-violet-500/15 border-violet-500/30 text-violet-300',
                            enabled: true,
                            systemKey: system.systemKey,
                            downloadUrl: currentPreset.downloadUrl,
                            websiteUrl: currentPreset.websiteUrl,
                          };
                          handleDownloadEmulator(targetConfig, currentPreset.downloadUrl);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow disabled:opacity-50"
                        title="Download portable release directly or fetch package"
                      >
                        <Download className={`w-3.5 h-3.5 ${isDownloading ? 'animate-bounce' : ''}`} />
                        <span>{isDownloading ? 'Downloading & Extracting...' : 'Download'}</span>
                      </button>

                      {/* Official Website Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenWebsite(currentPreset?.websiteUrl || currentEmuConfig?.websiteUrl)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
                        title="Visit official website or release repository in browser"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                        <span>Official Website</span>
                      </button>
                    </div>

                    {/* ROM Folders Configuration */}
                    <div className="pt-2 border-t border-slate-800/80">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-semibold text-slate-300">
                          Game ROMs & ISOs Folders:
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (currentEmuConfig) {
                              handleAddRomFolder(currentEmuConfig);
                            }
                          }}
                          className="text-[11px] font-semibold text-violet-400 hover:text-violet-300 flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add ROM Folder</span>
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        {(currentEmuConfig?.romPaths || []).map((folder, fIndex) => (
                          <div
                            key={fIndex}
                            className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 font-mono"
                          >
                            <span className="truncate flex-1 mr-2">{folder}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveRomFolder(currentEmuConfig!, fIndex)}
                              className="text-slate-500 hover:text-red-400 transition"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}

                        {(!currentEmuConfig?.romPaths || currentEmuConfig.romPaths.length === 0) && (
                          <p className="text-[11px] text-slate-500 italic">
                            No folders specified. Click "Add ROM Folder" to scan your games for this system.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Custom Emulators List */}
      {customEmulators.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span>Custom User Emulators ({customEmulators.length})</span>
            </h4>
            <button
              type="button"
              onClick={handleAddNewCustom}
              className="px-2.5 py-1 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 text-xs font-medium flex items-center gap-1 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Custom</span>
            </button>
          </div>

          <div className="space-y-2">
            {customEmulators.map((custom) => {
              const customLogo = custom.customLogoUrl || getSystemLogo(custom.systemKey || custom.id || custom.consoleName);
              return (
                <div
                  key={custom.id}
                  className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition"
                >
                  <div
                    className="min-w-0 flex-1 cursor-pointer flex items-center gap-3"
                    onClick={() => setEditingCustomEmulator(custom)}
                  >
                    <div className="w-14 h-9 px-1.5 py-0.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 shadow-sm">
                      <img
                        src={customLogo}
                        alt={custom.name}
                        className="max-h-7 max-w-full object-contain filter drop-shadow(0 0 4px rgba(255, 255, 255, 0.4))"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h5 className="text-xs font-bold text-white hover:text-violet-300 transition truncate">
                          {custom.name}
                        </h5>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-950/60 border border-violet-500/30 text-violet-300 shrink-0">
                          {custom.consoleName}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono shrink-0">
                          {custom.gamesCount || 0} ROMs
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 font-mono truncate">
                        {custom.executablePath || 'No executable path'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditingCustomEmulator(custom)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition"
                    >
                      <Sliders className="w-3.5 h-3.5 text-violet-400" />
                      <span>Configure</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (onDeleteEmulator && window.confirm(`Delete custom emulator "${custom.name}"?`)) {
                          onDeleteEmulator(custom.id);
                        }
                      }}
                      className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/50 text-red-400 transition"
                      title="Delete custom emulator"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Custom Emulator Modal */}
      {editingCustomEmulator && (
        <EmulatorSettingsModal
          emulator={editingCustomEmulator}
          isOpen={Boolean(editingCustomEmulator)}
          onClose={() => setEditingCustomEmulator(null)}
          onSave={(updated) => {
            if (onUpdateEmulator) onUpdateEmulator(updated);
            setEditingCustomEmulator(null);
          }}
          onDelete={(id) => {
            if (onDeleteEmulator) onDeleteEmulator(id);
            setEditingCustomEmulator(null);
          }}
        />
      )}
    </div>
  );
};
