import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  HardDrive,
  FolderOpen,
  CheckSquare,
  Square,
  RefreshCw,
  Plus,
  Image,
  Check,
  Cloud
} from 'lucide-react';
import { Game, ScanResult } from '../types/game';
import { getPlaceholderCover, getPlaceholderBanner } from '../utils/formatters';
import { GameImage } from './GameImage';
import { PlatformBadge } from './PlatformBadge';

interface ScannerModalProps {
  onClose: () => void;
  onImportGames: (newGames: Game[]) => void;
  existingGames: Game[];
}

export const ScannerModal: React.FC<ScannerModalProps> = ({
  onClose,
  onImportGames,
  existingGames,
}) => {
  const [scanning, setScanning] = useState(false);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [customFolder, setCustomFolder] = useState('');
  const [hasScanned, setHasScanned] = useState(false);
  const [includeCloud, setIncludeCloud] = useState(true);

  const existingExecutables = new Set(
    existingGames.map((g) => g.executablePath.toLowerCase().trim())
  );
  const existingTitles = new Set(
    existingGames.map((g) => g.title.toLowerCase().trim())
  );
  const existingStoreKeys = new Set(
    existingGames.filter((g) => g.storeId).map((g) => `${g.platform}-${g.storeId}`)
  );

  const startScan = async (withCloud: boolean = includeCloud) => {
    setScanning(true);
    setHasScanned(false);
    try {
      let results: ScanResult[] = [];
      if (window.api?.scanPC) {
        results = await window.api.scanPC();
      }

      // Also pull uninstalled cloud games from linked stores if checked
      if (withCloud && window.api?.getCloudGames) {
        try {
          const cloudGames = await window.api.getCloudGames();
          const cloudResults: ScanResult[] = cloudGames.map((cg) => ({
            title: cg.title,
            executablePath: cg.executablePath,
            platform: cg.platform,
            storeId: cg.storeId,
            coverUrl: cg.coverUrl,
            bannerUrl: cg.bannerUrl,
            description: cg.description,
            genres: cg.genres,
            installed: false,
          }));
          results = [...results, ...cloudResults];
        } catch (err) {
          console.error('Error fetching cloud games in scanner:', err);
        }
      }

      const newItems = results.filter((r) => {
        const storeKey = r.storeId ? `${r.platform}-${r.storeId}` : '';
        const titleKey = r.title.toLowerCase().trim();
        const exeKey = r.executablePath.toLowerCase().trim();

        if (existingTitles.has(titleKey)) return false;
        if (storeKey && existingStoreKeys.has(storeKey)) return false;
        if (r.installed !== false && existingExecutables.has(exeKey)) return false;
        return true;
      });

      setScanResults(newItems);
      setSelectedIndices(new Set(newItems.map((_, i) => i)));
      setHasScanned(true);
    } catch (err) {
      console.error('Scan error:', err);
    } finally {
      setScanning(false);
    }
  };

  const handleScanCustomFolder = async () => {
    if (!window.api?.selectFolder) return;
    const folder = await window.api.selectFolder();
    if (!folder) return;
    setCustomFolder(folder);
    setScanning(true);
    try {
      const results = await window.api.scanFolder(folder);
      const newItems = results.filter(
        (r) =>
          !existingExecutables.has(r.executablePath.toLowerCase().trim()) &&
          !existingTitles.has(r.title.toLowerCase().trim())
      );
      setScanResults(newItems);
      setSelectedIndices(new Set(newItems.map((_, i) => i)));
      setHasScanned(true);
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    startScan(true);
  }, []);

  const toggleSelectAll = () => {
    if (selectedIndices.size === scanResults.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(scanResults.map((_, i) => i)));
    }
  };

  const toggleIndex = (index: number) => {
    const updated = new Set(selectedIndices);
    if (updated.has(index)) {
      updated.delete(index);
    } else {
      updated.add(index);
    }
    setSelectedIndices(updated);
  };

  const handleImport = () => {
    const toImport: Game[] = [];
    selectedIndices.forEach((idx) => {
      const item = scanResults[idx];
      if (item) {
        const isInstalled = item.installed !== false;
        const id = `${item.platform}-${item.storeId || item.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        toImport.push({
          id,
          title: item.title,
          executablePath: item.executablePath,
          installUrl: !isInstalled ? item.executablePath : undefined,
          platform: item.platform,
          storeId: item.storeId,
          installPath: item.installPath,
          coverUrl: item.coverUrl || getPlaceholderCover(item.title),
          bannerUrl: item.bannerUrl || getPlaceholderBanner(item.title),
          description: item.description || (isInstalled ? `Detected game on PC (${item.platform})` : `Owned in ${item.platform.toUpperCase()} Cloud`),
          genres: item.genres || ['PC Game'],
          tags: isInstalled ? ['Auto-Detected', item.platform] : ['Cloud Owned', item.platform],
          favorite: false,
          hidden: false,
          installed: isInstalled,
          playtimeMinutes: item.playtimeMinutes || 0,
          lastPlayed: item.lastPlayed,
          rating: item.rating,
          addedDate: new Date().toISOString(),
        });
      }
    });

    onImportGames(toImport);
    onClose();
  };

  const cloudCount = scanResults.filter((r) => r.installed === false).length;
  const installedCount = scanResults.filter((r) => r.installed !== false).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Sparkles className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Smart PC & Cloud Game Scanner</h2>
              <p className="text-xs text-slate-400">
                Detects installed PC games and uninstalled games from linked stores (Steam, Epic, GOG, etc.)
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

        {/* Action strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 py-3 border-b border-slate-800/80 shrink-0 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => startScan(includeCloud)}
              disabled={scanning}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${scanning ? 'animate-spin' : ''}`} />
              <span>{scanning ? 'Scanning...' : 'Rescan'}</span>
            </button>

            <button
              onClick={handleScanCustomFolder}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition"
            >
              <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Custom Directory...</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white select-none">
              <input
                type="checkbox"
                checked={includeCloud}
                onChange={(e) => {
                  const val = e.target.checked;
                  setIncludeCloud(val);
                  startScan(val);
                }}
                className="rounded accent-blue-600 cursor-pointer"
              />
              <span>Include Cloud Stores</span>
            </label>

            {scanResults.length > 0 && (
              <button
                onClick={toggleSelectAll}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium"
              >
                {selectedIndices.size === scanResults.length ? 'Deselect All' : 'Select All'}
              </button>
            )}
          </div>
        </div>

        {/* Results summary if scanned */}
        {hasScanResultsHeader(hasScanned, scanResults.length, installedCount, cloudCount)}

        {/* Scan Results List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2.5 min-h-[240px]">
          {scanning ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-3" />
              <div className="text-sm font-semibold text-slate-200">Scanning PC & Cloud Stores...</div>
              <div className="text-xs text-slate-400 mt-1 max-w-sm">
                Examining local Epic manifests, Steam library folders, GOG Galaxy & cloud store caches.
              </div>
            </div>
          ) : scanResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <HardDrive className="w-10 h-10 text-slate-600 mb-3" />
              <div className="text-sm font-semibold text-slate-300">
                {hasScanned ? 'All detected games are already in your library' : 'Ready to scan'}
              </div>
              <div className="text-xs text-slate-500 mt-1 max-w-xs">
                To sync games from other stores, open the Store Integrations modal.
              </div>
            </div>
          ) : (
            scanResults.map((result, idx) => {
              const isSelected = selectedIndices.has(idx);
              const isInstalled = result.installed !== false;

              return (
                <div
                  key={`${result.executablePath}-${idx}`}
                  onClick={() => toggleIndex(idx)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition cursor-pointer ${
                    isSelected
                      ? 'bg-blue-950/20 border-blue-500/40 text-white'
                      : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <button
                      type="button"
                      className="text-blue-400 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleIndex(idx);
                      }}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 fill-blue-600/20 text-blue-500" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-600" />
                      )}
                    </button>

                    {/* Cover art preview thumbnail */}
                    <div className="w-10 h-14 rounded-md overflow-hidden bg-slate-900 border border-slate-800 shrink-0 relative">
                      <GameImage
                        src={result.coverUrl}
                        alt={result.title}
                        title={result.title}
                        platform={result.platform}
                        type="cover"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold truncate text-slate-100">
                          {result.title}
                        </span>
                        <PlatformBadge platform={result.platform} size="xs" />
                        {!isInstalled && (
                          <span className="text-[9px] font-semibold uppercase px-1.5 py-0.2 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center gap-1">
                            <Cloud className="w-2.5 h-2.5" />
                            <span>Cloud</span>
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate font-mono mt-0.5">
                        {result.executablePath}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-400">
            {selectedIndices.size} of {scanResults.length} games selected
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={selectedIndices.size === 0}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-blue-600/30 transition disabled:opacity-50 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Import Selected ({selectedIndices.size})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

function hasScanResultsHeader(hasScanned: boolean, total: number, installed: number, cloud: number) {
  if (!hasScanned || total === 0) return null;
  return (
    <div className="px-1 py-1.5 text-xs text-slate-400 flex items-center gap-3">
      <span>Found {total} unimported games</span>
      {installed > 0 && <span className="text-emerald-400 font-semibold">• {installed} Installed</span>}
      {cloud > 0 && <span className="text-sky-400 font-semibold">• {cloud} Cloud Store</span>}
    </div>
  );
}
