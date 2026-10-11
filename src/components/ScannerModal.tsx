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
  Check
} from 'lucide-react';
import { Game, ScanResult } from '../types/game';
import { getPlatformBadge, getPlaceholderCover, getPlaceholderBanner } from '../utils/formatters';
import { GameImage } from './GameImage';

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
  const [editingArtIndex, setEditingArtIndex] = useState<number | null>(null);

  const existingExecutables = new Set(
    existingGames.map((g) => g.executablePath.toLowerCase().trim())
  );
  const existingTitles = new Set(
    existingGames.map((g) => g.title.toLowerCase().trim())
  );

  const startScan = async () => {
    setScanning(true);
    setHasScanned(false);
    try {
      let results: ScanResult[] = [];
      if (window.api?.scanPC) {
        results = await window.api.scanPC();
      }

      const newItems = results.filter(
        (r) =>
          !existingExecutables.has(r.executablePath.toLowerCase().trim()) &&
          !existingTitles.has(r.title.toLowerCase().trim())
      );

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
    startScan();
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

  const handlePickLocalCoverForScanItem = async (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.api?.selectFile) {
      const file = await window.api.selectFile([
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] },
      ]);
      if (file) {
        setScanResults((prev) =>
          prev.map((item, idx) =>
            idx === index ? { ...item, coverUrl: file } : item
          )
        );
      }
    }
  };

  const handleImport = () => {
    const toImport: Game[] = [];
    selectedIndices.forEach((idx) => {
      const item = scanResults[idx];
      if (item) {
        toImport.push({
          id: `scanned-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          title: item.title,
          executablePath: item.executablePath,
          platform: item.platform,
          installPath: item.installPath,
          coverUrl: item.coverUrl || getPlaceholderCover(item.title),
          bannerUrl: item.bannerUrl || getPlaceholderBanner(item.title),
          description: item.description || `Detected game on PC (${item.platform})`,
          genres: item.genres || ['PC Game'],
          tags: ['Auto-Detected', item.platform],
          favorite: false,
          hidden: false,
          installed: true,
          playtimeMinutes: 0,
          addedDate: new Date().toISOString(),
        });
      }
    });

    onImportGames(toImport);
    onClose();
  };

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
              <h2 className="text-base font-bold text-white">Smart PC Game Scanner</h2>
              <p className="text-xs text-slate-400">
                Detecting Steam libraries, Epic Games manifests, GOG Galaxy & Windows registry
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
        <div className="flex items-center justify-between py-3 border-b border-slate-800/80 shrink-0 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={startScan}
              disabled={scanning}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${scanning ? 'animate-spin' : ''}`} />
              <span>{scanning ? 'Scanning PC...' : 'Rescan PC'}</span>
            </button>

            <button
              onClick={handleScanCustomFolder}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition"
            >
              <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Scan Custom Directory...</span>
            </button>
          </div>

          {scanResults.length > 0 && (
            <button
              onClick={toggleSelectAll}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium"
            >
              {selectedIndices.size === scanResults.length ? 'Deselect All' : 'Select All'}
            </button>
          )}
        </div>

        {/* Scan Results List with Thumbnail Art Preview */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2.5 min-h-[240px]">
          {scanning ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-3" />
              <div className="text-sm font-semibold text-slate-200">Scanning your computer...</div>
              <div className="text-xs text-slate-400 mt-1 max-w-sm">
                Examining local Epic manifests, Steam library folders, GOG files, and Windows installed games registry.
              </div>
            </div>
          ) : scanResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <HardDrive className="w-10 h-10 text-slate-600 mb-3" />
              <div className="text-sm font-semibold text-slate-300">
                {hasScanned ? 'No new unimported games found' : 'Ready to scan'}
              </div>
              <div className="text-xs text-slate-500 mt-1 max-w-xs">
                All detected games may already be in your library, or you can scan a custom directory like <span className="font-mono text-slate-400">D:\Games</span>.
              </div>
            </div>
          ) : (
            scanResults.map((result, idx) => {
              const isSelected = selectedIndices.has(idx);
              const badge = getPlatformBadge(result.platform);

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

                    {/* Thumbnail Art Preview */}
                    <div className="w-10 aspect-[2/3] rounded-lg overflow-hidden bg-slate-900 border border-slate-700/80 shrink-0">
                      <GameImage
                        src={result.coverUrl || ''}
                        alt={result.title}
                        title={result.title}
                        platform={result.platform}
                        type="cover"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-100 truncate flex items-center gap-2">
                        <span className="truncate">{result.title}</span>
                        <span className={`text-[9px] font-semibold px-2 py-0.2 rounded-full border shrink-0 ${badge.bg} ${badge.color}`}>
                          {badge.name}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 truncate mt-0.5">
                        {result.executablePath}
                      </div>
                    </div>
                  </div>

                  {/* Artwork Customization Button during import */}
                  <div className="shrink-0 ml-2">
                    <button
                      type="button"
                      onClick={(e) => handlePickLocalCoverForScanItem(idx, e)}
                      title="Select custom cover image before importing"
                      className="px-2 py-1 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 flex items-center gap-1 transition"
                    >
                      <Image className="w-3 h-3 text-blue-400" />
                      <span className="hidden sm:inline">Change Art</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800 shrink-0">
          <div className="text-xs text-slate-400">
            {scanResults.length > 0 ? (
              <span>
                <strong className="text-slate-200">{selectedIndices.size}</strong> of {scanResults.length} games selected
              </span>
            ) : null}
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
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-lg shadow-blue-600/30 flex items-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Import Selected ({selectedIndices.size})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
