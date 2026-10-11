import React, { useState, useEffect } from 'react';
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
import { Game, GamePlatform } from './types/game';

export const App: React.FC = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedPlatform, setSelectedPlatform] = useState<GamePlatform | 'all'>('all');

  // Modals state
  const [selectedGameForDetail, setSelectedGameForDetail] = useState<Game | null>(null);
  const [selectedGameForEdit, setSelectedGameForEdit] = useState<Game | null>(null);
  const [artworkPickerGame, setArtworkPickerGame] = useState<Game | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const [isStoreLinksModalOpen, setIsStoreLinksModalOpen] = useState(false);

  // Toast notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Load games from store on mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      if (window.api?.getGames) {
        try {
          const list = await window.api.getGames();
          setGames(list);
        } catch (err) {
          console.error('Failed to load games:', err);
        }
      }
      setLoading(false);
    };

    loadData();

    // Subscribe to game execution events
    if (window.api?.onGameStatusChange) {
      const unsubscribe = window.api.onGameStatusChange((data) => {
        setGames((prev) =>
          prev.map((g) => {
            if (g.id === data.gameId) {
              const updated = {
                ...g,
                isRunning: data.isRunning,
                lastPlayed: new Date().toISOString(),
                playtimeMinutes: data.elapsedMinutes
                  ? (g.playtimeMinutes || 0) + data.elapsedMinutes
                  : g.playtimeMinutes,
              };
              if (selectedGameForDetail?.id === g.id) {
                setSelectedGameForDetail(updated);
              }
              return updated;
            }
            return g;
          })
        );

        if (data.isRunning) {
          showToast('Game started. Playtime tracking is active.');
        } else if (data.elapsedMinutes) {
          showToast(`Game closed. Recorded ${data.elapsedMinutes}m playtime.`);
        }
      });

      return () => unsubscribe();
    }
  }, []);

  const saveGamesToStore = (updatedGames: Game[]) => {
    setGames(updatedGames);
    if (window.api?.saveGames) {
      window.api.saveGames(updatedGames);
    }
  };

  const handleLaunchGame = async (game: Game, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // If not installed, trigger install flow
    if (game.installed === false) {
      return handleInstallGame(game, e);
    }

    // Mark running in UI immediately
    const updated = games.map((g) =>
      g.id === game.id
        ? { ...g, isRunning: true, lastPlayed: new Date().toISOString() }
        : g
    );
    saveGamesToStore(updated);
    if (selectedGameForDetail?.id === game.id) {
      setSelectedGameForDetail({
        ...selectedGameForDetail,
        isRunning: true,
        lastPlayed: new Date().toISOString(),
      });
    }

    if (window.api?.launchGame) {
      const res = await window.api.launchGame(game.id);
      if (!res.success) {
        showToast(`Failed to launch: ${res.message || 'Executable error'}`);
        saveGamesToStore(
          games.map((g) => (g.id === game.id ? { ...g, isRunning: false } : g))
        );
        if (selectedGameForDetail?.id === game.id) {
          setSelectedGameForDetail({ ...selectedGameForDetail, isRunning: false });
        }
      }
    } else {
      showToast(`Launching ${game.title}...`);
    }
  };

  const handleInstallGame = async (game: Game, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    showToast(`Prompting ${game.platform.toUpperCase()} store installer for ${game.title}...`);
    if (window.api?.installGame) {
      await window.api.installGame(game.id);
    }
  };

  const handleToggleFavorite = (gameId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = games.map((g) =>
      g.id === gameId ? { ...g, favorite: !g.favorite } : g
    );
    saveGamesToStore(updated);
    if (selectedGameForDetail?.id === gameId) {
      setSelectedGameForDetail((prev) =>
        prev ? { ...prev, favorite: !prev.favorite } : null
      );
    }
  };

  const handleToggleInstalled = (gameId: string) => {
    const updated = games.map((g) =>
      g.id === gameId ? { ...g, installed: g.installed === false ? true : false } : g
    );
    saveGamesToStore(updated);
    if (selectedGameForDetail?.id === gameId) {
      setSelectedGameForDetail((prev) =>
        prev ? { ...prev, installed: prev.installed === false ? true : false } : null
      );
    }
    showToast('Updated installation status.');
  };

  const handleEditGame = (game: Game, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedGameForEdit(game);
  };

  const handleSaveEdit = (updatedGame: Game) => {
    const updated = games.map((g) => (g.id === updatedGame.id ? updatedGame : g));
    saveGamesToStore(updated);
    if (selectedGameForDetail?.id === updatedGame.id) {
      setSelectedGameForDetail(updatedGame);
    }
    showToast(`Updated details for ${updatedGame.title}.`);
  };

  const handleSaveArtwork = async (gameId: string, coverUrl: string, bannerUrl: string) => {
    // Cache remote images in background so they are saved to hard drive
    let finalCover = coverUrl;
    let finalBanner = bannerUrl;

    if (window.api?.cacheImage) {
      if (coverUrl.startsWith('http')) {
        window.api.cacheImage(coverUrl, 'cover', gameId).then((cached) => {
          setGames((prev) =>
            prev.map((g) => (g.id === gameId ? { ...g, coverUrl: cached } : g))
          );
        });
      }
      if (bannerUrl.startsWith('http')) {
        window.api.cacheImage(bannerUrl, 'banner', gameId).then((cached) => {
          setGames((prev) =>
            prev.map((g) => (g.id === gameId ? { ...g, bannerUrl: cached } : g))
          );
        });
      }
    }

    const updated = games.map((g) =>
      g.id === gameId ? { ...g, coverUrl: finalCover, bannerUrl: finalBanner } : g
    );
    saveGamesToStore(updated);

    if (selectedGameForDetail?.id === gameId) {
      setSelectedGameForDetail((prev) =>
        prev ? { ...prev, coverUrl: finalCover, bannerUrl: finalBanner } : null
      );
    }
    showToast('Artwork updated and cached successfully.');
  };

  const handleDeleteGame = (gameId: string) => {
    const game = games.find((g) => g.id === gameId);
    if (window.confirm(`Are you sure you want to remove "${game?.title}" from your launcher library?`)) {
      const updated = games.filter((g) => g.id !== gameId);
      saveGamesToStore(updated);
      setSelectedGameForDetail(null);
      showToast(`Removed from library.`);
    }
  };

  const handleAddGame = (newGame: Game) => {
    const updated = [newGame, ...games];
    saveGamesToStore(updated);
    showToast(`Added ${newGame.title} to library.`);
  };

  const handleImportScannedGames = (newGames: Game[]) => {
    if (newGames.length === 0) return;
    const updated = [...newGames, ...games];
    saveGamesToStore(updated);
    showToast(`Successfully imported ${newGames.length} new games into your library!`);
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

  const favoriteCount = games.filter((g) => g.favorite).length;
  const recentCount = games.filter((g) => g.lastPlayed).length;
  const installedCount = games.filter((g) => g.installed !== false).length;
  const cloudCount = games.filter((g) => g.installed === false).length;

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
      {/* Frameless Top Window Bar */}
      <TitleBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenScanner={() => setIsScannerModalOpen(true)}
        onOpenStoreLinks={() => setIsStoreLinksModalOpen(true)}
      />

      {/* Main App Body */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Navigation Sidebar */}
        <Sidebar
          currentFilter={selectedFilter}
          onSelectFilter={setSelectedFilter}
          selectedPlatform={selectedPlatform}
          onSelectPlatform={setSelectedPlatform}
          totalGames={games.length}
          installedCount={installedCount}
          cloudCount={cloudCount}
          favoriteGamesCount={favoriteCount}
          recentGamesCount={recentCount}
          onOpenAddGame={() => setIsAddModalOpen(true)}
          onOpenScanner={() => setIsScannerModalOpen(true)}
          onOpenStoreLinks={() => setIsStoreLinksModalOpen(true)}
          onResetData={handleResetData}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-gradient-to-b from-slate-900/50 via-slate-950 to-slate-950">
          <div className="max-w-[1700px] mx-auto space-y-6">
            {/* Top Shelf: Recently Played Games (GOG Galaxy style hero carousel) */}
            {selectedFilter !== 'favorites' && selectedFilter !== 'cloud' && !searchQuery && (
              <RecentlyPlayedShelf
                games={games}
                onSelectGame={(g) => setSelectedGameForDetail(g)}
                onLaunchGame={handleLaunchGame}
                onToggleFavorite={handleToggleFavorite}
              />
            )}

            {/* Games Grid Library */}
            <GameGrid
              games={games}
              searchQuery={searchQuery}
              selectedFilter={selectedFilter}
              selectedPlatform={selectedPlatform}
              onSelectGame={(g) => setSelectedGameForDetail(g)}
              onLaunchGame={handleLaunchGame}
              onInstallGame={handleInstallGame}
              onToggleFavorite={handleToggleFavorite}
              onEditGame={handleEditGame}
              onOpenArtworkPicker={(g) => setArtworkPickerGame(g)}
              onOpenAddGame={() => setIsAddModalOpen(true)}
              onOpenScanner={() => setIsScannerModalOpen(true)}
            />
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
        />
      )}

      {isAddModalOpen && (
        <AddGameModal
          onClose={() => setIsAddModalOpen(false)}
          onAddGame={handleAddGame}
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
          onClose={() => setIsScannerModalOpen(false)}
          onImportGames={handleImportScannedGames}
          existingGames={games}
        />
      )}

      {isStoreLinksModalOpen && (
        <StoreIntegrationsModal
          onClose={() => setIsStoreLinksModalOpen(false)}
          onGamesImported={handleImportScannedGames}
        />
      )}

      {/* Floating Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-slate-900/95 border border-blue-500/40 text-xs font-semibold text-white shadow-2xl backdrop-blur-md flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
export default App;
