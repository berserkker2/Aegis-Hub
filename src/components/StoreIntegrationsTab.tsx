import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Check,
  LogIn,
  LogOut,
  X
} from 'lucide-react';
import { StoreAccount, Game, GamePlatform } from '../types/game';
import { LocalDetectedAccount } from '../types/electron';
import { PlatformBadge } from './PlatformBadge';

interface StoreIntegrationsTabProps {
  onGamesImported?: (games: Game[]) => void;
}

export const StoreIntegrationsTab: React.FC<StoreIntegrationsTabProps> = ({
  onGamesImported,
}) => {
  const [accounts, setAccounts] = useState<StoreAccount[]>([]);
  const [localDetected, setLocalDetected] = useState<LocalDetectedAccount[]>([]);
  const [hasGalaxyDb, setHasGalaxyDb] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loggingInPlatform, setLoggingInPlatform] = useState<GamePlatform | null>(null);
  const [importingAll, setImportingAll] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
      if (window.api?.hasGalaxyDatabase) {
        const hasDb = await window.api.hasGalaxyDatabase();
        setHasGalaxyDb(hasDb);
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

  // Import all cloud games at once
  const handleImportAllStores = async () => {
    setImportingAll(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      if (window.api?.importAllCloudGames) {
        const result = await window.api.importAllCloudGames();
        onGamesImported?.(result.games);
        setSuccessMessage(`Imported ${result.addedCount} cloud titles! Library now has ${result.total} total games.`);
        await fetchAccountsAndDetected();
      }
    } catch (err: any) {
      console.error('Import all stores error:', err);
      setErrorMessage(err.message || 'Failed to import cloud games.');
    } finally {
      setImportingAll(false);
    }
  };

  // 1-Click Sync for Auto-Detected Local Account (Steam, Epic, GOG, etc.)
  const handleSyncDetectedAccount = async (detected: LocalDetectedAccount) => {
    setLoggingInPlatform(detected.platform);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      if (window.api?.syncStoreAccount) {
        const result = await window.api.syncStoreAccount(
          detected.platform,
          detected.accountIdentifier
        );
        onGamesImported?.(result.games);
        setSuccessMessage(`Synced ${result.games.length} games for ${detected.platform.toUpperCase()}!`);
        await fetchAccountsAndDetected();
      }
    } catch (err: any) {
      console.error('Local sync error:', err);
      setErrorMessage(err.message || 'Sync failed.');
    } finally {
      setLoggingInPlatform(null);
    }
  };

  // Browser login fallback
  const handleOpenBrowserLogin = async (platform: GamePlatform) => {
    setLoggingInPlatform(platform);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      if (window.api?.openStoreLogin) {
        const result = await window.api.openStoreLogin(platform);
        onGamesImported?.(result.games);
        setSuccessMessage(`Connected ${platform.toUpperCase()}!`);
        await fetchAccountsAndDetected();
      }
    } catch (err: any) {
      console.error('Login window error:', err);
      setErrorMessage(err.message || 'Login was cancelled or failed.');
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
    <div className="space-y-4">
      {/* Status notices */}
      {errorMessage && (
        <div className="p-3 rounded-xl bg-red-950/40 border border-red-800 text-xs text-red-300 flex items-center justify-between animate-fade-in">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-white cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-xs text-emerald-300 flex items-center justify-between animate-fade-in">
          <span className="flex items-center gap-1.5 font-medium">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            {successMessage}
          </span>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-white cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Master Hub Card (All stores import) */}
      {hasGalaxyDb && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-purple-950/80 via-indigo-950/80 to-slate-900 border border-purple-500/40 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Multi-Store Master Hub Detected
              </span>
            </div>
            <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-semibold border border-purple-500/30">
              1,300+ Games Available
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Found your local store master cache. Sync all owned titles across Epic Games, Steam, GOG, Ubisoft and EA with posters, hero art & descriptions.
          </p>
          <div className="pt-1 flex items-center justify-between gap-3">
            <span className="text-[11px] text-slate-400">Zero login credentials required</span>
            <button
              onClick={handleImportAllStores}
              disabled={importingAll}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-purple-600/30 flex items-center gap-2 transition disabled:opacity-50 shrink-0 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${importingAll ? 'animate-spin' : ''}`} />
              <span>{importingAll ? 'Importing All Titles...' : '1-Click Import All Cloud Games'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Auto-Detected Local PC Accounts Card */}
      {localDetected.length > 0 && (
        <div className="p-4 rounded-xl bg-slate-950/70 border border-blue-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Connected PC Accounts Detected
              </span>
            </div>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-semibold border border-emerald-500/30">
              {localDetected.length} Ready to Sync
            </span>
          </div>

          <div className="space-y-2.5 divide-y divide-slate-800/60 pt-1">
            {localDetected.map((det) => (
              <div key={det.accountIdentifier + det.platform} className="flex items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={det.avatarUrl}
                    alt={det.displayName}
                    className="w-8 h-8 rounded-full border border-slate-700 object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white flex items-center gap-2 truncate">
                      <span>{det.displayName}</span>
                      <PlatformBadge platform={det.platform} size="xs" />
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">{det.details}</div>
                  </div>
                </div>

                <button
                  onClick={() => handleSyncDetectedAccount(det)}
                  disabled={loggingInPlatform === det.platform || importingAll}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-md shadow-blue-600/20 flex items-center gap-1.5 transition disabled:opacity-50 shrink-0 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${loggingInPlatform === det.platform ? 'animate-spin' : ''}`} />
                  <span>{loggingInPlatform === det.platform ? 'Syncing...' : 'Sync Store'}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Store List */}
      <div className="space-y-2.5">
        <div className="px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          All Supported Stores
        </div>

        {loading && accounts.length === 0 ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-slate-950/40 border border-slate-800 animate-pulse" />
            ))}
          </div>
        ) : (
          accounts.map((account) => {
            const isLoggingIn = loggingInPlatform === account.platform;

            return (
              <div
                key={account.platform}
                className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition flex items-center justify-between gap-4"
              >
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <PlatformBadge platform={account.platform} size="sm" />
                    <span className="text-sm font-bold text-white">{account.name}</span>
                    {account.needsReauth ? (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                        <AlertCircle className="w-3 h-3 text-amber-400" />
                        <span>Re-authentication Required</span>
                      </span>
                    ) : account.connected ? (
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

                  <p className="text-[11px] text-slate-400 leading-snug line-clamp-1">
                    {account.description}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {account.connected ? (
                    <>
                      {account.needsReauth ? (
                        <button
                          onClick={() => handleOpenBrowserLogin(account.platform)}
                          disabled={isLoggingIn || importingAll}
                          className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold rounded-lg border border-amber-500/50 shadow-md shadow-amber-500/20 transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                          title="Log in again to refresh your expired session"
                        >
                          <LogIn className="w-3.5 h-3.5 text-amber-400" />
                          <span>Re-authenticate</span>
                        </button>
                      ) : (
                        (account.platform === 'epic' || account.platform === 'ubisoft' || account.platform === 'ea') && !account.description.includes('API') && (
                          <button
                            onClick={() => handleOpenBrowserLogin(account.platform)}
                            disabled={isLoggingIn || importingAll}
                            className="px-2.5 py-1.5 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 text-xs font-semibold rounded-lg border border-purple-500/40 transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                            title={`Connect directly via official ${account.name} API`}
                          >
                            <LogIn className="w-3 h-3 text-purple-300" />
                            <span>Link Direct API</span>
                          </button>
                        )
                      )}
                      <button
                        onClick={() => handleSyncDetectedAccount({
                          platform: account.platform,
                          displayName: account.name,
                          accountIdentifier: account.accountIdentifier || 'auto',
                          details: '',
                        })}
                        disabled={isLoggingIn || importingAll}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      >
                        <RefreshCw className={`w-3 h-3 text-blue-400 ${isLoggingIn ? 'animate-spin' : ''}`} />
                        <span>Resync</span>
                      </button>
                      <button
                        onClick={() => handleDisconnect(account.platform)}
                        title="Disconnect account"
                        className="p-1.5 bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg border border-slate-700 transition cursor-pointer"
                      >
                        <LogOut className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        if (account.platform === 'epic' || account.platform === 'ubisoft' || account.platform === 'ea') {
                          handleOpenBrowserLogin(account.platform);
                        } else if (hasGalaxyDb) {
                          handleSyncDetectedAccount({
                            platform: account.platform,
                            displayName: account.name,
                            accountIdentifier: 'auto',
                            details: '',
                          });
                        } else {
                          handleOpenBrowserLogin(account.platform);
                        }
                      }}
                      disabled={isLoggingIn || importingAll}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-md shadow-blue-600/20 transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      <LogIn className="w-3 h-3" />
                      <span>{isLoggingIn ? 'Connecting...' : `Connect ${account.name}`}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800/80">
        Aegis Hub syncs directly from your PC without storing passwords.
      </div>
    </div>
  );
};
