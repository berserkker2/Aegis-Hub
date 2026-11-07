import React, { useEffect, useState } from 'react';
import { SettingsModal } from './SettingsModal';
import { LauncherSettings, EmulatorConfig, Game } from '../types/game';

export const SettingsWindow: React.FC = () => {
  const [settings, setSettings] = useState<LauncherSettings | null>(null);
  const [emulators, setEmulators] = useState<EmulatorConfig[]>([]);
  const [hiddenGamesCount, setHiddenGamesCount] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'defaults' | 'stores' | 'tools' | 'emulation' | 'apps' | 'about'>(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'about-update') return 'about';
    if (tabParam && ['defaults', 'stores', 'tools', 'emulation', 'apps', 'about'].includes(tabParam)) {
      return tabParam as any;
    }
    return 'defaults';
  });
  const [autoStartUpdate, setAutoStartUpdate] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') === 'about-update';
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'about-update') {
      setActiveTab('about');
      setAutoStartUpdate(true);
    } else if (tabParam && ['defaults', 'stores', 'tools', 'emulation', 'apps', 'about'].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }

    const unsubTab = window.api?.onSetSettingsTab?.((tab) => {
      if (tab === 'about-update') {
        setActiveTab('about');
        setAutoStartUpdate(true);
      } else if (['defaults', 'stores', 'tools', 'emulation', 'apps', 'about'].includes(tab)) {
        setActiveTab(tab as any);
      }
    });

    const loadData = async () => {
      if (window.api?.getSettings) {
        const s = await window.api.getSettings();
        setSettings(s);
      }
      if (window.api?.getEmulators) {
        const emus = await window.api.getEmulators();
        setEmulators(emus || []);
      }
      if (window.api?.getGames) {
        const games = await window.api.getGames();
        setHiddenGamesCount(games.filter((g: Game) => g.hidden).length);
      }
    };

    loadData();

    const unsubSettings = window.api?.onSettingsUpdated?.((newSettings) => {
      setSettings(newSettings);
    });

    return () => {
      if (unsubTab) unsubTab();
      if (unsubSettings) unsubSettings();
    };
  }, []);

  if (!settings) {
    return (
      <div className="w-screen h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          <span>Loading settings...</span>
        </div>
      </div>
    );
  }

  const handleSaveSettings = (newSettings: LauncherSettings) => {
    setSettings(newSettings);
    if (window.api?.saveSettings) {
      window.api.saveSettings(newSettings);
    }
  };

  const handleClose = () => {
    if (window.api?.windowClose) {
      window.api.windowClose();
    } else {
      window.close();
    }
  };

  const handleUpdateEmulator = (updated: EmulatorConfig) => {
    setEmulators((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    if (window.api?.updateEmulatorConfig) {
      window.api.updateEmulatorConfig(updated);
    }
  };

  const handleDeleteEmulator = (id: string) => {
    setEmulators((prev) => prev.filter((e) => e.id !== id));
    if (window.api?.deleteEmulatorConfig) {
      window.api.deleteEmulatorConfig(id);
    }
  };

  const handleResetData = async () => {
    if (window.api?.resetLauncherData) {
      await window.api.resetLauncherData();
      handleClose();
    }
  };

  return (
    <SettingsModal
      isWindow={true}
      settings={settings}
      onSaveSettings={handleSaveSettings}
      onClose={handleClose}
      initialTab={activeTab}
      autoStartUpdate={autoStartUpdate}
      emulators={emulators}
      hiddenGamesCount={hiddenGamesCount}
      onUpdateEmulator={handleUpdateEmulator}
      onDeleteEmulator={handleDeleteEmulator}
      onResetData={handleResetData}
      onFetchMissingArtwork={() => {}}
      onOpenScanner={() => {}}
    />
  );
};
