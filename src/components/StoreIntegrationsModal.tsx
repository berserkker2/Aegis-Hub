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
  Sparkles,
  Cloud,
  Check
} from 'lucide-react';
import { StoreAccount, Game, GamePlatform } from '../types/game';
import { LocalDetectedAccount } from '../types/electron';

interface StoreIntegrationsModalProps {
  onClose: () => void;
  onGamesImported: (games: Game[]) => void;
}

export const StoreIntegrationsModal: React.FC<StoreIntegrationsModalProps> = ({
  onClose,
  onGamesImported,
}) => {
  const [accounts, setAccounts] = useState<StoreAccount[]>([]);
  const [localDetected, setLocalDetected] = useState<LocalDetectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggingInPlatform, setLoggingInPlatform] = useState<GamePlatform | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchAccountsAndDetected = async () => {
    setLoading(true);
    try {
      if (window.api?.getStoreAccounts) {
        const list = await window.api.getStoreAccounts();
        setAccounts(list);
      }
      if (window.api?.detectLocalAccounts) {
        const detected = await window.api.detectLocalAccounts();
        setLocalDetected(detected);
      }
    } catch (err) {
      console.error('Error fetching accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountsAndDetected();
  }, []);

  // Real OAuth / In-App Browser Login
  const handleOpenBrowserLogin = async (platform: GamePlatform) => {
    setLoggingInPlatform(platform);
    setErrorMessage(null);
    try {
      if (window.api?.openStoreLogin) {
        const result = await window.api.openStoreLogin(platform);
        onGamesImported(result.games);
        await fetchAccountsAndDetected();
      }
    } catch (err: any) {
      console.error('Login window error:', err);
      setErrorMessage(err.message || 'Login was cancelled or failed.');
    } finally {
      setLoggingInPlatform(null);
    }
  };

  // 1-Click Sync for Auto-Detected Local Account (Steam)
  const handleSyncDetectedAccount = async (detected: LocalDetectedAccount) => {
    setLoggingInPlatform(detected.platform);
    setErrorMessage(null);
    try {
      if (window.api?.syncStoreAccount) {
        const result = await window.api.syncStoreAccount(
          detected.platform,
          detected.accountIdentifier
        );
        onGamesImported(result.games);
        await fetchAccountsAndDetected();
      }
    } catch (err: any) {
      console.error('Local sync error:', err);
      setErrorMessage(err.message || 'Sync failed.');
    } finally {
      setLoggingInPlatform(null);
    }
  };

  const handleDisconnect = async (platform: GamePlatform) => {
    if (window.api?.disconnectStoreAccount) {
      await window.api.disconnectStoreAccount(platform);
      await fetchAccountsAndDetected();
    }
  };

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
              <h2 className="text-base font-bold text-white">Store Integrations & Cloud Library Login</h2>
              <p className="text-xs text-slate-400">
                Log in via official store pages to pick up your owned games (installed & uninstalled)
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

        {/* Modal Scrollable Body */}
        <div className="mt-4 space-y-4 overflow-y-auto flex-1 pr-1">
          {/* Error notice if login fails */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-800 text-xs text-red-300 flex items-center justify-between">
              <span>{errorMessage}</span>
              <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Auto-Detected Local Windows Account Card (Steam) */}
          {localDetected.length > 0 && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/60 via-slate-900 to-indigo-950/60 border border-blue-500/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Auto-Detected PC Account
                  </span>
                </div>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-semibold border border-emerald-500/30">
                  Ready to Sync
                </span>
              </div>

              {localDetected.map((det) => (
                <div key={det.accountIdentifier} className="flex items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-3">
                    <img
                      src={det.avatarUrl}
                      alt={det.displayName}
                      className="w-9 h-9 rounded-full border border-blue-400/50"
                    />
                    <div>
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        <span>{det.displayName}</span>
                        <span className="text-[10px] font-semibold text-sky-400 bg-sky-500/10 px-2 py-0.2 rounded-full border border-sky-500/20">
                          STEAM
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">{det.details}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSyncDetectedAccount(det)}
                    disabled={loggingInPlatform === det.platform}
                    className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-1.5 transition disabled:opacity-50 shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loggingInPlatform === det.platform ? 'animate-spin' : ''}`} />
                    <span>{loggingInPlatform === det.platform ? 'Syncing...' : '1-Click Sync'}</span>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Why Steam Zero-Logout Works Explanation */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-semibold text-white">
                Genuine In-App Store Login & Persistent Sync
              </div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Clicking <strong>"Log In with Store"</strong> opens the genuine official login window (Steam, GOG, Epic) directly inside the launcher. You can safely enter your credentials and 2FA. For Steam, we also read your local Windows active session, eliminating the session timeouts that plague GOG Galaxy!
              </p>
            </div>
          </div>

          {/* Supported Store Accounts List */}
          <div className="space-y-3">
            {accounts.map((account) => {
              const isLoggingIn = loggingInPlatform === account.platform;

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
                          <span>Connected ({account.totalOwnedGames} games)</span>
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

                  {/* Actions: Log in via browser window or Disconnect */}
                  <div className="flex items-center gap-2 shrink-0">
                    {account.connected ? (
                      <>
                        <button
                          onClick={() => handleOpenBrowserLogin(account.platform)}
                          disabled={isLoggingIn}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isLoggingIn ? 'animate-spin' : ''}`} />
                          <span>Resync</span>
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
                        onClick={() => handleOpenBrowserLogin(account.platform)}
                        disabled={isLoggingIn}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-md shadow-blue-600/20 transition flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>{isLoggingIn ? 'Waiting for Login...' : `Log In with ${account.name}`}</span>
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
            All credentials are handled inside official store web pages and never stored in plain text.
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
