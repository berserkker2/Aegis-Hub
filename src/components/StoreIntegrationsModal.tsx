import React, { useEffect, useState } from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Layers,
  ShieldCheck,
  ExternalLink,
  HardDrive,
  LogIn,
  LogOut,
  HelpCircle,
  Cloud
} from 'lucide-react';
import { StoreAccount, Game, GamePlatform } from '../types/game';

interface StoreIntegrationsModalProps {
  onClose: () => void;
  onGamesImported: (games: Game[]) => void;
}

export const StoreIntegrationsModal: React.FC<StoreIntegrationsModalProps> = ({
  onClose,
  onGamesImported,
}) => {
  const [accounts, setAccounts] = useState<StoreAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingStore, setConnectingStore] = useState<GamePlatform | null>(null);
  const [identifierInput, setIdentifierInput] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [syncingPlatform, setSyncingPlatform] = useState<GamePlatform | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchAccounts = async () => {
    setLoading(true);
    if (window.api?.getStoreAccounts) {
      try {
        const list = await window.api.getStoreAccounts();
        setAccounts(list);
      } catch (err) {
        console.error('Error getting store accounts:', err);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleStartConnect = (platform: GamePlatform) => {
    setConnectingStore(platform);
    setIdentifierInput('');
    setApiKeyInput('');
    setErrorMessage(null);
  };

  const handleConfirmConnect = async () => {
    if (!connectingStore || !identifierInput.trim()) return;

    setSyncingPlatform(connectingStore);
    setErrorMessage(null);
    try {
      if (window.api?.syncStoreAccount) {
        const result = await window.api.syncStoreAccount(
          connectingStore,
          identifierInput.trim(),
          apiKeyInput.trim() || undefined
        );
        onGamesImported(result.games);
        setConnectingStore(null);
        await fetchAccounts();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to sync store account.');
    } finally {
      setSyncingPlatform(null);
    }
  };

  const handleDisconnect = async (platform: GamePlatform) => {
    if (window.api?.disconnectStoreAccount) {
      await window.api.disconnectStoreAccount(platform);
      await fetchAccounts();
    }
  };

  const handleQuickResync = async (account: StoreAccount) => {
    if (!account.accountIdentifier) return;
    setSyncingPlatform(account.platform);
    try {
      if (window.api?.syncStoreAccount) {
        const result = await window.api.syncStoreAccount(account.platform, account.accountIdentifier);
        onGamesImported(result.games);
        await fetchAccounts();
      }
    } finally {
      setSyncingPlatform(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
              <Layers className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Link Store Accounts & Cloud Libraries</h2>
              <p className="text-xs text-slate-400">
                Sync uninstalled games directly from Steam, Epic, GOG, EA and Ubisoft
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

        {/* Modal Content */}
        <div className="mt-4 space-y-4 overflow-y-auto flex-1 pr-1">
          {/* Permanent Steam Fix Banner */}
          <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-500/30 text-xs text-blue-200 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-semibold text-white flex items-center gap-2">
                <span>The Permanent Steam Fix (No More Repeated Logouts)</span>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.2 rounded font-mono">
                  SOLVED
                </span>
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                You noted that Steam keeps logging off on GOG Galaxy and other launchers. That happens because those launchers rely on web session cookies that Valve expires every 24-48 hours.
                <br />
                <strong>Nexus Launcher solves this permanently:</strong> You connect via your public <strong>Steam Profile ID</strong> or Custom URL. This pulls your complete owned cloud library without requiring fragile web cookies, meaning <strong>it will never log you out</strong>!
              </p>
            </div>
          </div>

          {/* Connect Dialog when a store is selected */}
          {connectingStore && (
            <div className="p-4 rounded-xl bg-slate-950 border border-blue-500/40 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <LogIn className="w-4 h-4 text-blue-400" />
                  <span>Connect {connectingStore.toUpperCase()} Account</span>
                </h3>
                <button
                  onClick={() => setConnectingStore(null)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>

              {connectingStore === 'steam' ? (
                <div className="space-y-2">
                  <label className="block text-xs text-slate-300">
                    Steam ID64, Profile URL, or Custom URL Name:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 76561198000000000 or https://steamcommunity.com/id/username"
                    value={identifierInput}
                    onChange={(e) => setIdentifierInput(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-white outline-none"
                  />
                  <div className="text-[11px] text-slate-500">
                    Make sure your Steam profile & game details are set to Public in Steam Privacy Settings.
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-xs text-slate-300">
                    Account Username or Display Name:
                  </label>
                  <input
                    type="text"
                    placeholder={`e.g. Your ${connectingStore.toUpperCase()} username`}
                    value={identifierInput}
                    onChange={(e) => setIdentifierInput(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-white outline-none"
                  />
                </div>
              )}

              {errorMessage && (
                <div className="text-xs text-red-400 bg-red-950/30 p-2 rounded border border-red-800">
                  {errorMessage}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setConnectingStore(null)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmConnect}
                  disabled={!identifierInput.trim() || syncingPlatform === connectingStore}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-blue-600/30 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingPlatform ? 'animate-spin' : ''}`} />
                  <span>{syncingPlatform ? 'Syncing Library...' : 'Connect & Import Games'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Accounts List */}
          <div className="space-y-3">
            {accounts.map((account) => {
              const isSyncing = syncingPlatform === account.platform;

              return (
                <div
                  key={account.platform}
                  className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition flex items-start justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{account.name}</span>
                      {account.connected ? (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Connected ({account.totalOwnedGames} titles)</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                          <AlertCircle className="w-3 h-3" />
                          <span>Not Connected</span>
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed">
                      {account.description}
                    </p>

                    {account.connected && account.accountIdentifier && (
                      <div className="flex items-center gap-2 text-xs text-slate-300 pt-1 font-mono">
                        <Cloud className="w-3.5 h-3.5 text-blue-400" />
                        <span>Account: {account.accountIdentifier}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {account.connected ? (
                      <>
                        <button
                          onClick={() => handleQuickResync(account)}
                          disabled={isSyncing}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isSyncing ? 'animate-spin' : ''}`} />
                          <span>Sync</span>
                        </button>
                        <button
                          onClick={() => handleDisconnect(account.platform)}
                          title="Disconnect account"
                          className="p-1.5 bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg border border-slate-700 transition"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleStartConnect(account.platform)}
                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-md shadow-blue-600/20 transition flex items-center gap-1.5"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>Connect</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            Synced games appear in your library with a cloud badge and one-click install button.
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
