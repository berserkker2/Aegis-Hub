import React, { useEffect, useState } from 'react';
import { X, CheckCircle2, AlertCircle, RefreshCw, Layers, ShieldCheck, ExternalLink, HardDrive } from 'lucide-react';
import { StoreAccountStatus } from '../types/game';

interface StoreIntegrationsModalProps {
  onClose: () => void;
  onTriggerScan: () => void;
}

export const StoreIntegrationsModal: React.FC<StoreIntegrationsModalProps> = ({
  onClose,
  onTriggerScan,
}) => {
  const [stores, setStores] = useState<StoreAccountStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStores = async () => {
    setLoading(true);
    if (window.api?.getStoreStatuses) {
      try {
        const list = await window.api.getStoreStatuses();
        setStores(list);
      } catch (err) {
        console.error('Error getting store statuses:', err);
      }
    } else {
      // Mock for browser dev preview
      setStores([
        {
          platform: 'steam',
          name: 'Steam',
          connected: true,
          detectedGamesCount: 14,
          installPath: 'C:\\Program Files (x86)\\Steam',
          description: 'Direct local ACF manifests & libraryfolders detection. 100% login-free, eliminates the logout problems common on GOG Galaxy.',
          color: '#1b2838',
        },
        {
          platform: 'epic',
          name: 'Epic Games Store',
          connected: true,
          detectedGamesCount: 6,
          installPath: 'C:\\ProgramData\\Epic',
          description: 'Epic Games Launcher manifest detector & URI protocol runner.',
          color: '#2a2a2a',
        },
        {
          platform: 'gog',
          name: 'GOG Galaxy',
          connected: true,
          detectedGamesCount: 3,
          installPath: 'C:\\Program Files (x86)\\GOG Galaxy\\Games',
          description: 'GOG Galaxy installed games and DRM-Free offline installers detection.',
          color: '#6c2b96',
        },
        {
          platform: 'manual',
          name: 'PC Standalone & Windows Apps',
          connected: true,
          detectedGamesCount: 22,
          description: 'Direct executable links (.exe), DRM-free indie games, custom ROMs or shortcuts.',
          color: '#3b82f6',
        },
      ]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStores();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
              <Layers className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Store Integrations & Sources</h2>
              <p className="text-xs text-slate-400">
                Link and synchronize game libraries from Epic Games, GOG Galaxy, Steam & PC
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

        {/* Highlight Note About Steam Solution */}
        <div className="mt-4 p-3.5 rounded-xl bg-blue-950/30 border border-blue-500/30 text-xs text-blue-200 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-white">
              Permanent Steam Solution (Zero Session Logouts)
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              Other launchers frequently disconnect from Steam because Steam web sessions expire constantly. Nexus Launcher solves this by reading local <span className="font-mono text-blue-300">appmanifest_*.acf</span> files directly from your PC storage. This requires <strong>no login credentials</strong>, works offline, and will never log you out!
            </p>
          </div>
        </div>

        {/* Store List */}
        <div className="mt-4 space-y-3 max-h-[360px] overflow-y-auto">
          {stores.map((store) => (
            <div
              key={store.platform}
              className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/80 hover:border-slate-700 transition flex items-start justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">{store.name}</span>
                  {store.connected ? (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" />
                      Active / Detected
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                      <AlertCircle className="w-3 h-3" />
                      Not Found on PC
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  {store.description}
                </p>

                {store.installPath && (
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
                    <HardDrive className="w-3 h-3 text-slate-600" />
                    <span className="truncate">{store.installPath}</span>
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  onClose();
                  onTriggerScan();
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition shrink-0 flex items-center gap-1.5"
              >
                <RefreshCw className="w-3 h-3 text-blue-400" />
                <span>Sync</span>
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            More stores (Ubisoft Connect, EA App, Battle.net) can also be scanned.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-blue-600/30 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
