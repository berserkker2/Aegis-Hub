import React from 'react';
import { X, Layers } from 'lucide-react';
import { Game } from '../types/game';
import { StoreIntegrationsTab } from './StoreIntegrationsTab';

interface StoreIntegrationsModalProps {
  onClose: () => void;
  onGamesImported: (games: Game[]) => void;
}

export const StoreIntegrationsModal: React.FC<StoreIntegrationsModalProps> = ({
  onClose,
  onGamesImported,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
              <Layers className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Store Integrations &amp; Cloud Library</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="mt-4 flex-1 overflow-y-auto pr-1">
          <StoreIntegrationsTab onGamesImported={onGamesImported} />
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            Aegis Hub syncs directly from your PC without storing passwords.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-blue-600/30 transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
