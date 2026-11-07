import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { RecentlyPlayedShelf } from './components/RecentlyPlayedShelf';
import { GameGrid } from './components/GameGrid';
import { GameDetailModal } from './components/GameDetailModal';
import { AddGameModal } from './components/AddGameModal';
import { EditGameModal } from './components/EditGameModal';
import { ScannerModal } from './components/ScannerModal';
import { StoreIntegrationsModal } from './components/StoreIntegrationsModal';
import { ArtworkPickerModal } from './components/ArtworkPickerModal';
import { SettingsModal } from './components/SettingsModal';
import { EmulatorView } from './components/EmulatorView';
import { RecommendedView } from './components/RecommendedView';
import { PulseView } from './components/PulseView';
import { BigPictureView } from './components/BigPictureView';
import { Game, GamePlatform, LauncherSettings, EmulatorConfig, StoreAccount } from './types/game';

export const App: React.FC = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedPlatform, setSelectedPlatform] = useState<GamePlatform | 'all'>('all');
  const [emulators, setEmulators] = useState<EmulatorConfig[]>([]);
  const [isScanningEmulators, setIsScanningEmulators] = useState(false);
  const [isScrapingEmulators, setIsScrapingEmulators] = useState(false);
  const [scrapingProgress, setScrapingProgress] = useState<{ current: number; total: number; gameTitle: string; coverUrl?: string } | null>(null);

  const [settings, setSettings] = useState<LauncherSettings>({
    closeOnLaunch: false,
    minimizeToTray: false,
    closeToTray: false,
    autoScanOnStartup: false,
    startInBigPicture: false,
    startWithWindows: false,
    startupWindowMode: 'maximized',
    libraryViewMode: 'grid',
    gridSize: 'medium',
    sortBy: 'lastPlayed',
    sortOrder: 'desc',
    scanPaths: [],
    defaultFilter: 'all',
    defaultPlatform: 'all',
    showHiddenGamesCollection: false,
    showPlatformBadges: true,
    filterAdultGames: true,
  });

  // Modals state
  const [selectedGameForDetail, setSelectedGameForDetail] = useState<Game | null>(null);
  const [selectedGameForEdit, setSelectedGameForEdit] = useState<Game | null>(null);
  const [artworkPickerGame, setArtworkPickerGame] = useState<Game | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const [isStoreLinksModalOpen, setIsStoreLinksModalOpen] = useState(false);
  const [storeAccounts, setStoreAccounts] = useState<StoreAccount[]>([]);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'defaults' | 'stores' | 'tools' | 'emulation' | 'apps' | 'about'>('defaults');
  const [isBigPictureMode, setIsBigPictureMode] = useState(false);

  const handleEnterBigPicture = useCallback(async () => {
    setIsBigPictureMode(true);
    if (window.api?.setFullscreen) {
      await window.api.setFullscreen(true);
    }
  }, []);

  const handleExitBigPicture = useCallback(async () => {
    setIsBigPictureMode(false);
    if (window.api?.setFullscreen) {
      await window.api.setFullscreen(false);
    }
  }, []);

  // Toast notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  }, []);

  // Refresh entire games collection from storage
  const reloadGamesFromStorage = async () => {
    if (window.api?.getGames) {
      try {
        const freshList = await window.api.getGames();
        setGames([...freshList]);
        return freshList;
      } catch (err) {
        console.error('Failed to reload games:', err);
      }
    }
    return null;
  };

  // Refresh store accounts
  const reloadStoreAccounts = async () => {
    if (window.api?.getStoreAccounts) {
      try {
        const accs = await window.api.getStoreAccounts();
        if (accs) setStoreAccounts(accs);
      } catch (err) {
        console.error('Failed to load store accounts:', err);
      }
    }
  };

  // Load settings and games on startup
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      // Load launcher settings and apply startup preferences
      if (window.api?.getSettings) {
        try {
          const loaded = await window.api.getSettings();
          if (loaded) {
            setSettings(loaded);
            if (loaded.defaultFilter) {
              if (loaded.defaultFilter === 'hidden' && !loaded.showHiddenGamesCollection) {
                setSelectedFilter('all');
              } else {
                setSelectedFilter(loaded.defaultFilter);
              }
            }
            if (loaded.defaultPlatform) {
              setSelectedPlatform(loaded.defaultPlatform);
            }
          }
        } catch (err) {
          console.error('Failed to load settings:', err);
        }
      }

      // Load games and store accounts
      await reloadGamesFromStorage();
      await reloadStoreAccounts();

      // Load emulators and automatically scan configured folders for new ROMs on startup
      if (window.api?.scanEmulators) {
        try {
          const res = await window.api.scanEmulators();
          if (res) {
            setEmulators(res.emulators);
            if (res.games) {
              setGames(res.games);
            }
          }
        } catch (err) {
          console.error('Failed to auto-scan emulators on startup:', err);
          if (window.api?.getEmulators) {
            const loadedEmus = await window.api.getEmulators();
            setEmulators(loadedEmus);
          }
        }
      } else if (window.api?.getEmulators) {
        try {
          const loadedEmus = await window.api.getEmulators();
          setEmulators(loadedEmus);
        } catch (err) {
          console.error('Failed to load emulators:', err);
        }
      }

      setLoading(false);
    };

    loadData();

    // Subscribe to game execution events
    let unsubGameStatus: (() => void) | undefined;
    if (window.api?.onGameStatusChange) {
      unsubGameStatus = window.api.onGameStatusChange((data) => {
        setGames((prev) =>
          prev.map((g) => {
            if (g.id === data.gameId) {
              return {
                ...g,
                isRunning: data.isRunning,
                lastPlayed: new Date().toISOString(),
                playtimeMinutes: data.elapsedMinutes
                  ? (g.playtimeMinutes || 0) + data.elapsedMinutes
                  : g.playtimeMinutes,
              };
            }
            return g;
          })
        );

        setSelectedGameForDetail((prev) => {
          if (prev && prev.id === data.gameId) {
            return {
              ...prev,
              isRunning: data.isRunning,
              lastPlayed: new Date().toISOString(),
              playtimeMinutes: data.elapsedMinutes
                ? (prev.playtimeMinutes || 0) + data.elapsedMinutes
                : prev.playtimeMinutes,
            };
          }
          return prev;
        });

        if (data.isRunning) {
          showToast('Game started. Playtime tracking is active.');
        } else if (data.elapsedMinutes) {
          showToast(`Game closed. Recorded ${data.elapsedMinutes}m playtime.`);
        }
      });
    }

    // Subscribe to open-settings events from system tray
    let unsubSettings: (() => void) | undefined;
    if (window.api?.onOpenSettings) {
      unsubSettings = window.api.onOpenSettings(() => {
        if (window.api?.openSettingsWindow && !isBigPictureMode) {
          window.api.openSettingsWindow('defaults');
        } else {
          setIsSettingsModalOpen(true);
        }
      });
    }

    // Subscribe to settings updates across independent windows
    let unsubSettingsUpdated: (() => void) | undefined;
    if (window.api?.onSettingsUpdated) {
      unsubSettingsUpdated = window.api.onSettingsUpdated((newSettings) => {
        setSettings(newSettings);
      });
    }

    // Subscribe to background games updates (e.g. cloud auto-sync)
    let unsubGamesUpdated: (() => void) | undefined;
    if (window.api?.onGamesUpdated) {
      unsubGamesUpdated = window.api.onGamesUpdated((updatedGames) => {
        setGames(updatedGames);
      });
    }

    // Subscribe to store account updates (e.g. token expiration status)
    let unsubAccountsUpdated: (() => void) | undefined;
    if (window.api?.onStoreAccountsUpdated) {
      unsubAccountsUpdated = window.api.onStoreAccountsUpdated((updatedAccounts) => {
        setStoreAccounts(updatedAccounts);
      });
    }

    // Subscribe to restore-big-picture event (e.g. on resume from sleep)
    let unsubRestoreBigPic: (() => void) | undefined;
    if (window.api?.onRestoreBigPicture) {
      unsubRestoreBigPic = window.api.onRestoreBigPicture(() => {
        handleEnterBigPicture();
      });
    }

    return () => {
      if (unsubGameStatus) unsubGameStatus();
      if (unsubSettings) unsubSettings();
      if (unsubSettingsUpdated) unsubSettingsUpdated();
      if (unsubGamesUpdated) unsubGamesUpdated();
      if (unsubAccountsUpdated) unsubAccountsUpdated();
      if (unsubRestoreBigPic) unsubRestoreBigPic();
    };
  }, []);

  // Check if launcher was started with --bigpicture command line argument
  useEffect(() => {
    if (window.api?.checkStartBigPicture) {
      window.api.checkStartBigPicture().then((startInBigPic) => {
        if (startInBigPic) {
          handleEnterBigPicture();
        }
      });
    }
  }, []);

  // Global F11 / Alt+Enter key toggle for Big Picture mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F11' || (e.altKey && e.key === 'Enter')) {
        e.preventDefault();
        if (isBigPictureMode) {
          handleExitBigPicture();
        } else {
          handleEnterBigPicture();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isBigPictureMode]);

  // Controller / Gamepad shortcut to enter Big Picture mode from Desktop
  // Uses a lightweight 100ms interval instead of 60-144Hz requestAnimationFrame to keep desktop scrolling silky smooth
  useEffect(() => {
    if (isBigPictureMode) return;

    let wasPressed = false;
    let intervalId: number | null = null;

    const checkGamepad = () => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      let isPressedNow = false;

      for (const gp of gamepads) {
        if (!gp || !gp.connected) continue;
        const b = gp.buttons;
        // Button 16: Guide / Home button
        const guidePressed = Boolean(b[16]?.pressed);
        // Button 9: Start / Menu / Options
        const startPressed = Boolean(b[9]?.pressed);
        // Button 8: Select / Back / View
        const selectPressed = Boolean(b[8]?.pressed);

        if (guidePressed || startPressed || (selectPressed && startPressed)) {
          isPressedNow = true;
          break;
        }
      }

      if (isPressedNow && !wasPressed) {
        handleEnterBigPicture();
      }
      wasPressed = isPressedNow;
    };

    const startPolling = () => {
      if (intervalId === null) {
        intervalId = window.setInterval(checkGamepad, 100);
      }
    };

    const stopPollingIfNone = () => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      const hasConnected = Array.from(gamepads).some((gp) => gp && gp.connected);
      if (!hasConnected && intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    };

    // Start immediately in case a controller is already connected, or wait for gamepadconnected
    startPolling();
    window.addEventListener('gamepadconnected', startPolling);
    window.addEventListener('gamepaddisconnected', stopPollingIfNone);

    return () => {
      if (intervalId !== null) window.clearInterval(intervalId);
      window.removeEventListener('gamepadconnected', startPolling);
      window.removeEventListener('gamepaddisconnected', stopPollingIfNone);
    };
  }, [isBigPictureMode, handleEnterBigPicture]);

  const saveGamesToStore = useCallback(async (updatedGames: Game[]) => {
    setGames([...updatedGames]);
    if (window.api?.saveGames) {
      const sanitized = updatedGames.map((g) => ({ ...g, isRunning: false }));
      await window.api.saveGames(sanitized);
    }
  }, []);

  const handleSaveSettings = useCallback((newSettings: LauncherSettings) => {
    setSettings(newSettings);
    if (window.api?.saveSettings) {
      window.api.saveSettings(newSettings);
    }
    if (!newSettings.showHiddenGamesCollection && selectedFilter === 'hidden') {
      setSelectedFilter('all');
    }
    showToast('Launcher preferences updated.');
  }, [selectedFilter, showToast]);

  const handleInstallGame = useCallback(async (game: Game, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    showToast(`Prompting ${game.platform.toUpperCase()} store installer for ${game.title}...`);
    if (window.api?.installGame) {
      await window.api.installGame(game.id);
    }
  }, [showToast]);

  const handleLaunchGame = useCallback(async (game: Game, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // If not installed, trigger install flow
    if (game.installed === false) {
      return handleInstallGame(game, e);
    }

    // Mark running in UI immediately without persisting isRunning: true to disk
    setGames((prev) =>
      prev.map((g) =>
        g.id === game.id
          ? { ...g, isRunning: true, lastPlayed: new Date().toISOString() }
          : g
      )
    );
    setSelectedGameForDetail((prev) =>
      prev && prev.id === game.id
        ? {
            ...prev,
            isRunning: true,
            lastPlayed: new Date().toISOString(),
          }
        : prev
    );

    if (window.api?.launchGame) {
      const res = await window.api.launchGame(game.id);
      if (!res.success) {
        showToast(res.message || 'O executável não foi encontrado no caminho especificado.');
        setGames((prev) =>
          prev.map((g) => (g.id === game.id ? { ...g, isRunning: false } : g))
        );
        setSelectedGameForDetail((prev) =>
          prev && prev.id === game.id ? { ...prev, isRunning: false } : prev
        );
      }
    } else {
      showToast(`Launching ${game.title}...`);
    }
  }, [handleInstallGame, showToast]);

  const handleToggleFavorite = useCallback(async (gameId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setGames((prev) => {
      const updated = prev.map((g) =>
        g.id === gameId ? { ...g, favorite: !g.favorite } : g
      );
      if (window.api?.saveGames) {
        const sanitized = updated.map((g) => ({ ...g, isRunning: false }));
        window.api.saveGames(sanitized);
      }
      return updated;
    });
    setSelectedGameForDetail((prev) =>
      prev && prev.id === gameId ? { ...prev, favorite: !prev.favorite } : prev
    );
  }, []);

  const handleToggleInstalled = useCallback(async (gameId: string) => {
    setGames((prev) => {
      const updated = prev.map((g) =>
        g.id === gameId ? { ...g, installed: g.installed === false ? true : false } : g
      );
      if (window.api?.saveGames) {
        const sanitized = updated.map((g) => ({ ...g, isRunning: false }));
        window.api.saveGames(sanitized);
      }
      return updated;
    });
    setSelectedGameForDetail((prev) =>
      prev && prev.id === gameId
        ? { ...prev, installed: prev.installed === false ? true : false }
        : prev
    );
    showToast('Updated installation status.');
  }, [showToast]);

  const handleToggleHidden = useCallback(async (gameId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    let targetTitle = '';
    let nextHidden = false;
    setGames((prev) => {
      const targetGame = prev.find((g) => g.id === gameId);
      if (!targetGame) return prev;
      targetTitle = targetGame.title;
      nextHidden = !targetGame.hidden;
      const updated = prev.map((g) =>
        g.id === gameId ? { ...g, hidden: nextHidden } : g
      );
      if (window.api?.saveGames) {
        const sanitized = updated.map((g) => ({ ...g, isRunning: false }));
        window.api.saveGames(sanitized);
      }
      return updated;
    });
    if (!targetTitle) return;
    setSelectedGameForDetail((prev) =>
      prev && prev.id === gameId ? { ...prev, hidden: nextHidden } : prev
    );
    showToast(
      nextHidden
        ? `"${targetTitle}" hidden from library.`
        : `"${targetTitle}" restored to library.`
    );
  }, [showToast]);

  const handleEditGame = useCallback((game: Game, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedGameForEdit(game);
  }, []);

  const handleSelectGame = useCallback((game: Game) => {
    setSelectedGameForDetail(game);
  }, []);

  const handleOpenArtworkPicker = useCallback((game: Game, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setArtworkPickerGame(game);
  }, []);

  const handleOpenAddModal = useCallback(() => {
    setIsAddModalOpen(true);
  }, []);

  const handleOpenScannerModal = useCallback(() => {
    setIsScannerModalOpen(true);
  }, []);

  const handleOpenStoreIntegrationsModal = useCallback(() => {
    setIsStoreLinksModalOpen(true);
  }, []);

  const handleOpenSettingsModal = useCallback(() => {
    if (window.api?.openSettingsWindow && !isBigPictureMode) {
      window.api.openSettingsWindow('defaults');
    } else {
      setSettingsInitialTab('defaults');
      setIsSettingsModalOpen(true);
    }
  }, [isBigPictureMode]);

  const handleOpenSettingsTab = useCallback((tab: 'defaults' | 'stores' | 'tools' | 'emulation' | 'apps' | 'about' | 'about-update') => {
    if (window.api?.openSettingsWindow && !isBigPictureMode) {
      window.api.openSettingsWindow(tab);
    } else {
      setSettingsInitialTab(tab === 'about-update' ? 'about' : tab);
      setIsSettingsModalOpen(true);
    }
  }, [isBigPictureMode]);

  const handleOpenUpdateSettings = useCallback(() => {
    handleOpenSettingsTab('about-update');
  }, [handleOpenSettingsTab]);

  const handleSaveEdit = async (updatedGame: Game) => {
    if (updatedGame.id.startsWith('discovery-')) {
      if (selectedGameForDetail?.id === updatedGame.id) {
        setSelectedGameForDetail(updatedGame);
      }
      return;
    }

    setGames((prev) => {
      const next = prev.map((g) => (g.id === updatedGame.id ? updatedGame : g));
      if (window.api?.saveGames) {
        window.api.saveGames(next);
      }
      return next;
    });

    if (selectedGameForDetail?.id === updatedGame.id) {
      setSelectedGameForDetail(updatedGame);
    }
    showToast(`Updated details for ${updatedGame.title}.`);
  };

  const handleSaveArtwork = async (gameId: string, coverUrl: string, bannerUrl: string) => {
    // 1. Immediately apply the chosen artwork in React state so the UI updates with zero delay!
    setGames((prev) =>
      prev.map((g) => (g.id === gameId ? { ...g, coverUrl, bannerUrl } : g))
    );
    if (selectedGameForDetail?.id === gameId) {
      setSelectedGameForDetail((prev) =>
        prev ? { ...prev, coverUrl, bannerUrl } : null
      );
    }

    // 2. Cache remote images locally on disk in the background for offline use
    let finalCover = coverUrl;
    let finalBanner = bannerUrl;

    if (window.api?.cacheImage) {
      if (coverUrl.startsWith('http')) {
        try {
          finalCover = await window.api.cacheImage(coverUrl, 'cover', gameId);
        } catch (e) {
          console.warn('Cover cache fallback:', e);
        }
      }
      if (bannerUrl.startsWith('http')) {
        try {
          finalBanner = await window.api.cacheImage(bannerUrl, 'banner', gameId);
        } catch (e) {
          console.warn('Banner cache fallback:', e);
        }
      }
    }

    // 3. Persist the final (cached or local) artwork in store and state
    setGames((prev) => {
      const next = prev.map((g) =>
        g.id === gameId ? { ...g, coverUrl: finalCover, bannerUrl: finalBanner } : g
      );
      if (window.api?.saveGames) {
        window.api.saveGames(next);
      }
      return next;
    });

    if (selectedGameForDetail?.id === gameId) {
      setSelectedGameForDetail((prev) =>
        prev ? { ...prev, coverUrl: finalCover, bannerUrl: finalBanner } : null
      );
    }
    showToast('Artwork updated and applied.');
  };

  const handleDeleteGame = async (gameId: string) => {
    const game = games.find((g) => g.id === gameId);
    if (window.confirm(`Are you sure you want to remove "${game?.title}" from your launcher library?`)) {
      const updated = games.filter((g) => g.id !== gameId);
      await saveGamesToStore(updated);
      setSelectedGameForDetail(null);
      showToast(`Removed from library.`);
    }
  };

  const handleAddGame = async (newGame: Game) => {
    const updated = [newGame, ...games];
    await saveGamesToStore(updated);
    await reloadGamesFromStorage();

    // Ensure the new game is immediately visible in the active view
    setSelectedFilter('all');
    setSelectedPlatform('all');
    showToast(`Added ${newGame.title} to library.`);
  };

  const handleImportScannedGames = async (newGames: Game[]) => {
    if (newGames.length === 0) return;
    const existingTitles = new Set(games.map((g) => g.title.toLowerCase().trim()));
    const existingKeys = new Set(games.map((g) => `${g.platform}-${g.storeId || g.id}`));

    const filtered = newGames.filter((g) => {
      const key = `${g.platform}-${g.storeId || g.id}`;
      return !existingTitles.has(g.title.toLowerCase().trim()) && !existingKeys.has(key);
    });

    if (filtered.length === 0) {
      showToast('All scanned titles are already in your library.');
      return;
    }

    const updated = [...games, ...filtered];
    await saveGamesToStore(updated);
    await reloadGamesFromStorage();
    showToast(`Successfully imported ${filtered.length} new games into your library!`);
  };

  const handleResetData = async () => {
    if (window.api?.resetLauncherData) {
      const cleanGames = await window.api.resetLauncherData();
      setGames(cleanGames);
      setSelectedGameForDetail(null);
      setSelectedGameForEdit(null);
      setArtworkPickerGame(null);
      showToast('Cache and data wiped clean. Library reset to default.');
    }
  };

  const handleFetchMissingArtwork = async () => {
    if (window.api?.autoFetchMissingArtwork) {
      showToast('Searching online databases (Steam & GOG) for missing covers...');
      try {
        const res = await window.api.autoFetchMissingArtwork();
        if (res.updatedCount > 0) {
          setGames([...res.games]);
          showToast(`Found and updated covers for ${res.updatedCount} games!`);
        } else {
          showToast('All games already have artwork or no new online matches found.');
        }
      } catch (err) {
        showToast('Online artwork search encountered an issue.');
      }
    }
  };

  const handleSyncSteamPlaytime = async () => {
    if (window.api?.syncSteamPlaytime) {
      showToast('Reading playtime directly from local Steam client...');
      try {
        const res = await window.api.syncSteamPlaytime();
        if (res.updatedCount > 0) {
          setGames([...res.games]);
          showToast(`Synced playtime hours for ${res.updatedCount} Steam titles!`);
        } else {
          showToast('Steam playtimes are already up to date.');
        }
      } catch (err) {
        showToast('Encountered an issue reading Steam playtime.');
      }
    }
  };

  const handleSyncSteamRatings = async () => {
    if (window.api?.syncSteamRatings) {
      showToast('Fetching live review scores from Steam Store...');
      try {
        const res = await window.api.syncSteamRatings();
        if (res.updatedCount > 0) {
          setGames([...res.games]);
          showToast(`Updated review ratings for ${res.updatedCount} Steam titles!`);
        } else {
          showToast('Steam ratings are already up to date.');
        }
      } catch (err) {
        showToast('Encountered an issue fetching Steam ratings.');
      }
    }
  };

  const handleSyncAllCategories = async () => {
    if (window.api?.syncAllCategories) {
      showToast('Finding official genres and community tags...');
      try {
        const res = await window.api.syncAllCategories();
        if (res.updatedCount > 0) {
          setGames([...res.games]);
          showToast(`Updated categories & tags for ${res.updatedCount} games!`);
        } else {
          showToast('All game categories are already up to date.');
        }
      } catch (err) {
        showToast('Encountered an issue fetching game categories.');
      }
    }
  };

  const handleScanEmulators = async () => {
    if (!window.api?.scanEmulators) return;
    setIsScanningEmulators(true);
    showToast('Scanning PC for installed emulators and game ROMs...');
    try {
      const res = await window.api.scanEmulators();
      if (res) {
        setEmulators(res.emulators);
        if (res.games) {
          setGames([...res.games]);
        }
        const totalRoms = res.emulators.reduce((sum: number, e: EmulatorConfig) => sum + (e.gamesCount || 0), 0);
        const activeCount = res.emulators.filter((e: EmulatorConfig) => e.installed).length;
        showToast(`Discovered ${activeCount} emulators and ${totalRoms} game ROMs!`);
      }
    } catch (err) {
      showToast('Encountered an issue scanning emulators.');
    } finally {
      setIsScanningEmulators(false);
    }
  };

  const handleScrapeEmulators = async () => {
    if (!window.api?.scrapeAllEmulatorsMetadata) return;
    setIsScrapingEmulators(true);
    setScrapingProgress(null);

    let cleanupProgress: (() => void) | undefined;
    if (window.api?.onScraperProgress) {
      cleanupProgress = window.api.onScraperProgress((data) => {
        setScrapingProgress(data);
      });
    }

    try {
      const res = await window.api.scrapeAllEmulatorsMetadata();
      if (res && res.games) {
        setGames([...res.games]);
        showToast(`Metadata & covers updated for ${res.updatedCount} of ${res.totalCount} emulated games!`);
      }
    } catch (err: any) {
      showToast('Encountered an issue scraping emulator metadata.');
    } finally {
      setIsScrapingEmulators(false);
      setScrapingProgress(null);
      if (cleanupProgress) cleanupProgress();
    }
  };

  const handleLaunchEmulator = async (emulatorId: string, e: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const emu = emulators.find((e) => e.id === emulatorId);
    showToast(`Opening ${emu?.name || emulatorId} emulator application...`);
    if (window.api?.launchEmulator) {
      const res = await window.api.launchEmulator(emulatorId);
      if (!res.success) {
        showToast(res.message || 'Failed to start emulator executable.');
      }
    }
  };

  const handleUpdateEmulator = async (updated: EmulatorConfig) => {
    if (window.api?.updateEmulatorConfig) {
      await window.api.updateEmulatorConfig(updated);
      setEmulators((prev) => {
        const idx = prev.findIndex((e) => e.id === updated.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = updated;
          return next;
        }
        return [...prev, updated];
      });

      // Update games executable path if modified
      if (updated.executablePath) {
        setGames((prev) =>
          prev.map((g) =>
            g.platform === 'emulator' && g.storeId === updated.id
              ? { ...g, executablePath: updated.executablePath! }
              : g
          )
        );
      }
      showToast(`Updated settings for ${updated.name}.`);
      handleScanEmulators();
    }
  };

  const handleDuplicateEmulator = async (duplicate: EmulatorConfig) => {
    if (window.api?.updateEmulatorConfig) {
      await window.api.updateEmulatorConfig(duplicate);
      setEmulators((prev) => [...prev, duplicate]);
      showToast(`Created new instance: ${duplicate.name}`);
      handleScanEmulators();
    }
  };

  const handleDeleteEmulator = async (emulatorId: string) => {
    if (window.api?.deleteEmulatorConfig) {
      await window.api.deleteEmulatorConfig(emulatorId);
      setEmulators((prev) => prev.filter((e) => e.id !== emulatorId));
      showToast('Removed emulator instance.');
    }
  };

  const {
    totalVisibleCount,
    favoriteCount,
    recentCount,
    installedCount,
    cloudCount,
    hiddenCount,
    emulatorGamesCount,
  } = useMemo(() => {
    let totalVisible = 0;
    let fav = 0;
    let recent = 0;
    let installed = 0;
    let cloud = 0;
    let hidden = 0;
    let emulator = 0;

    for (let i = 0; i < games.length; i++) {
      const g = games[i];
      if (g.hidden) {
        hidden++;
        continue;
      }
      totalVisible++;
      if (g.favorite) fav++;
      if (g.lastPlayed) recent++;
      if (g.installed !== false) installed++;
      else cloud++;
      if (g.platform === 'emulator') emulator++;
    }

    return {
      totalVisibleCount: totalVisible,
      favoriteCount: fav,
      recentCount: Math.min(100, recent),
      installedCount: installed,
      cloudCount: cloud,
      hiddenCount: hidden,
      emulatorGamesCount: emulator,
    };
  }, [games]);

  if (isBigPictureMode) {
    return (
      <>
        <BigPictureView
          games={games}
          emulators={emulators}
          settings={settings}
          onLaunchGame={handleLaunchGame}
          onToggleFavorite={handleToggleFavorite}
          onExitBigPicture={handleExitBigPicture}
          onUpdateGame={handleSaveEdit}
          onOpenSettings={(tab) => {
            setSettingsInitialTab(tab || 'defaults');
            setIsSettingsModalOpen(true);
          }}
        />

        {isSettingsModalOpen && (
          <SettingsModal
            settings={settings}
            onSaveSettings={handleSaveSettings}
            onClose={() => setIsSettingsModalOpen(false)}
            onOpenScanner={() => setIsScannerModalOpen(true)}
            onOpenStoreLinks={() => setIsStoreLinksModalOpen(true)}
            onGamesImported={(importedGames) => {
              setGames(importedGames);
              saveGamesToStore(importedGames);
            }}
            onFetchMissingArtwork={handleFetchMissingArtwork}
            onSyncSteamPlaytime={handleSyncSteamPlaytime}
            onSyncSteamRatings={handleSyncSteamRatings}
            onSyncAllCategories={handleSyncAllCategories}
            onResetData={handleResetData}
            onRestoreBackup={(result) => {
              setSettings(result.settings);
              if (result.games) {
                setGames(result.games);
              }
              showToast('Settings & Playtime backup restored successfully!');
            }}
            hiddenGamesCount={hiddenCount}
            onShowHiddenGames={() => setSelectedFilter('hidden')}
            onScanEmulators={handleScanEmulators}
            onScrapeEmulators={handleScrapeEmulators}
            isScrapingEmulators={isScrapingEmulators}
            scrapingProgress={scrapingProgress}
            emulators={emulators}
            onUpdateEmulator={handleUpdateEmulator}
            onDeleteEmulator={handleDeleteEmulator}
            initialTab={settingsInitialTab}
          />
        )}

        {/* Global Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-12 right-12 z-50 flex items-center gap-2 bg-slate-900/95 text-slate-100 px-5 py-3 rounded-2xl border border-slate-700 shadow-2xl backdrop-blur-md text-sm font-semibold animate-fade-in">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
            <span>{toastMessage}</span>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
      {/* Frameless Top Window Bar */}
      <TitleBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenSettings={handleOpenSettingsModal}
        onOpenUpdateSettings={handleOpenUpdateSettings}
        onEnterBigPicture={handleEnterBigPicture}
      />

      {/* Main App Body */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Navigation Sidebar */}
        <Sidebar
          currentFilter={selectedFilter}
          onSelectFilter={setSelectedFilter}
          selectedPlatform={selectedPlatform}
          onSelectPlatform={setSelectedPlatform}
          totalGames={totalVisibleCount}
          installedCount={installedCount}
          cloudCount={cloudCount}
          favoriteGamesCount={favoriteCount}
          recentGamesCount={recentCount}
          hiddenGamesCount={hiddenCount}
          emulatorGamesCount={emulatorGamesCount}
          showHiddenCollection={settings.showHiddenGamesCollection ?? false}
          onOpenAddGame={handleOpenAddModal}
          storeAccounts={storeAccounts}
          onOpenStoreIntegrations={handleOpenStoreIntegrationsModal}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-gradient-to-b from-slate-900/50 via-slate-950 to-slate-950">
          <div className="w-full space-y-6">
            {selectedFilter === 'pulse' ? (
              <PulseView
                games={games}
                onSelectGame={handleSelectGame}
                onLaunchGame={handleLaunchGame}
                onToggleFavorite={handleToggleFavorite}
                onNavigateToLibrary={() => setSelectedFilter('all')}
                showPlatformBadges={settings.showPlatformBadges ?? true}
              />
            ) : selectedFilter === 'recommended' ? (
              <RecommendedView
                settings={settings}
                libraryGames={games}
                onSelectGame={handleSelectGame}
                onLaunchGame={handleLaunchGame}
                onOpenSettings={() => handleOpenSettingsTab('tools')}
              />
            ) : selectedFilter === 'emulators' ? (
              <EmulatorView
                games={games}
                emulators={emulators}
                searchQuery={searchQuery}
                onSelectGame={handleSelectGame}
                onLaunchGame={handleLaunchGame}
                onToggleFavorite={handleToggleFavorite}
                onEditGame={handleEditGame}
                onOpenArtworkPicker={handleOpenArtworkPicker}
                onToggleHidden={handleToggleHidden}
                onLaunchEmulator={handleLaunchEmulator}
                onScanEmulators={handleScanEmulators}
                onUpdateEmulator={handleUpdateEmulator}
                onDuplicateEmulator={handleDuplicateEmulator}
                onDeleteEmulator={handleDeleteEmulator}
                onOpenSettingsTab={handleOpenSettingsTab}
                isScanning={isScanningEmulators}
              />
            ) : (
              <>
                {/* Top Shelf: Recently Played Games */}
                {selectedFilter !== 'favorites' && selectedFilter !== 'cloud' && selectedFilter !== 'hidden' && selectedFilter !== 'recent' && !searchQuery && (
                  <RecentlyPlayedShelf
                    games={games}
                    onSelectGame={handleSelectGame}
                    onLaunchGame={handleLaunchGame}
                    onToggleFavorite={handleToggleFavorite}
                    showPlatformBadges={settings.showPlatformBadges ?? true}
                  />
                )}

                {/* Games Grid Library */}
                <GameGrid
                  games={games}
                  searchQuery={searchQuery}
                  selectedFilter={selectedFilter}
                  selectedPlatform={selectedPlatform}
                  onSelectGame={handleSelectGame}
                  onLaunchGame={handleLaunchGame}
                  onInstallGame={handleInstallGame}
                  onToggleFavorite={handleToggleFavorite}
                  onEditGame={handleEditGame}
                  onOpenArtworkPicker={handleOpenArtworkPicker}
                  onToggleHidden={handleToggleHidden}
                  onOpenAddGame={handleOpenAddModal}
                  onOpenScanner={handleOpenScannerModal}
                  showPlatformBadges={settings.showPlatformBadges ?? true}
                />
              </>
            )}
          </div>
        </main>
      </div>

      {/* Modals */}
      {selectedGameForDetail && (
        <GameDetailModal
          game={selectedGameForDetail}
          onClose={() => setSelectedGameForDetail(null)}
          onLaunchGame={handleLaunchGame}
          onInstallGame={handleInstallGame}
          onToggleFavorite={handleToggleFavorite}
          onEditGame={(g) => setSelectedGameForEdit(g)}
          onDeleteGame={handleDeleteGame}
          onToggleInstalled={handleToggleInstalled}
          onOpenArtworkPicker={(g) => setArtworkPickerGame(g)}
          onUpdateGame={handleSaveEdit}
          onToggleHidden={handleToggleHidden}
          showPlatformBadges={settings.showPlatformBadges ?? true}
        />
      )}

      {isAddModalOpen && (
        <AddGameModal
          onClose={() => setIsAddModalOpen(false)}
          onAddGame={handleAddGame}
          onImportBatchGames={handleImportScannedGames}
          existingGames={games}
        />
      )}

      {selectedGameForEdit && (
        <EditGameModal
          game={selectedGameForEdit}
          onClose={() => setSelectedGameForEdit(null)}
          onSave={handleSaveEdit}
        />
      )}

      {artworkPickerGame && (
        <ArtworkPickerModal
          game={artworkPickerGame}
          onClose={() => setArtworkPickerGame(null)}
          onSaveArtwork={handleSaveArtwork}
        />
      )}

      {isScannerModalOpen && (
        <ScannerModal
          existingGames={games}
          onClose={() => setIsScannerModalOpen(false)}
          onImportGames={handleImportScannedGames}
        />
      )}

      {isStoreLinksModalOpen && (
        <StoreIntegrationsModal
          onClose={() => {
            setIsStoreLinksModalOpen(false);
            reloadStoreAccounts();
            reloadGamesFromStorage();
          }}
          onGamesImported={handleImportScannedGames}
        />
      )}

      {isSettingsModalOpen && (
        <SettingsModal
          settings={settings}
          onSaveSettings={handleSaveSettings}
          onClose={() => setIsSettingsModalOpen(false)}
          onOpenScanner={() => setIsScannerModalOpen(true)}
          onOpenStoreLinks={() => setIsStoreLinksModalOpen(true)}
          onGamesImported={(importedGames) => {
            setGames(importedGames);
            saveGamesToStore(importedGames);
          }}
          onFetchMissingArtwork={handleFetchMissingArtwork}
          onSyncSteamPlaytime={handleSyncSteamPlaytime}
          onSyncSteamRatings={handleSyncSteamRatings}
          onSyncAllCategories={handleSyncAllCategories}
          onResetData={handleResetData}
          onRestoreBackup={(result) => {
            setSettings(result.settings);
            if (result.games) {
              setGames(result.games);
            }
            showToast('Settings & Playtime backup restored successfully!');
          }}
          hiddenGamesCount={hiddenCount}
          onShowHiddenGames={() => setSelectedFilter('hidden')}
          onScanEmulators={handleScanEmulators}
          onScrapeEmulators={handleScrapeEmulators}
          isScrapingEmulators={isScrapingEmulators}
          scrapingProgress={scrapingProgress}
          emulators={emulators}
          onUpdateEmulator={handleUpdateEmulator}
          onDeleteEmulator={handleDeleteEmulator}
          initialTab={settingsInitialTab}
        />
      )}

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-slate-900/95 text-slate-100 px-4 py-2.5 rounded-xl border border-slate-700 shadow-2xl backdrop-blur-md text-xs font-medium animate-fade-in">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default App;
