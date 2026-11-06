import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  Play,
  FolderOpen,
  ArrowUp,
  ArrowDown,
  LayoutGrid,
  Sparkles,
  ExternalLink,
  MessageSquare,
  Music,
  Globe,
  Video,
  Wrench,
  Gamepad2,
  Check,
  AlertCircle
} from 'lucide-react';
import { CustomApp } from '../types/game';

interface CustomAppsSettingsTabProps {
  customApps?: CustomApp[];
  onSaveApps: (apps: CustomApp[]) => void;
}

const PRESET_POPULAR_APPS: Omit<CustomApp, 'id'>[] = [
  {
    name: 'Discord',
    executablePath: 'discord://',
    category: 'communication',
    description: 'Voice, video, and text communication for gamers',
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3670/3670157.png',
  },
  {
    name: 'Spotify',
    executablePath: 'spotify:',
    category: 'media',
    description: 'Music, playlists, and podcasts',
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/174/174872.png',
  },
  {
    name: 'Google Chrome',
    executablePath: 'chrome.exe',
    category: 'browser',
    description: 'Fast web browser and walkthrough guides',
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/888/888846.png',
  },
  {
    name: 'Microsoft Edge',
    executablePath: 'msedge.exe',
    category: 'browser',
    description: 'Web browser with controller navigation',
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/5968/5968779.png',
  },
  {
    name: 'OBS Studio',
    executablePath: 'obs64.exe',
    category: 'streaming',
    description: 'Live streaming and gameplay recording',
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/5968/5968534.png',
  },
  {
    name: 'RetroArch',
    executablePath: 'retroarch.exe',
    category: 'utility',
    description: 'All-in-one retro game frontend',
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/686/686589.png',
  },
  {
    name: 'Kodi',
    executablePath: 'kodi.exe',
    category: 'media',
    description: 'Home theater and 10-foot entertainment center',
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/1006/1006771.png',
  },
  {
    name: 'Steam',
    executablePath: 'steam://open/main',
    category: 'game',
    description: 'Open Steam Client directly',
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3670/3670274.png',
  },
];

export const CustomAppsSettingsTab: React.FC<CustomAppsSettingsTabProps> = ({
  customApps = [],
  onSaveApps,
}) => {
  const [apps, setApps] = useState<CustomApp[]>(customApps);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAppId, setEditingAppId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [executablePath, setExecutablePath] = useState('');
  const [args, setArgs] = useState('');
  const [category, setCategory] = useState<CustomApp['category']>('utility');
  const [iconUrl, setIconUrl] = useState('');
  const [description, setDescription] = useState('');
  const [launchMessage, setLaunchMessage] = useState<{ id: string; success: boolean; message: string } | null>(null);

  const handleOpenAdd = () => {
    setEditingAppId(null);
    setName('');
    setExecutablePath('');
    setArgs('');
    setCategory('utility');
    setIconUrl('');
    setDescription('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (app: CustomApp) => {
    setEditingAppId(app.id);
    setName(app.name);
    setExecutablePath(app.executablePath);
    setArgs(app.arguments || '');
    setCategory(app.category || 'utility');
    setIconUrl(app.iconUrl || '');
    setDescription(app.description || '');
    setIsFormOpen(true);
  };

  const handleBrowsePath = async () => {
    if (window.api?.selectFile) {
      const selected = await window.api.selectFile([
        { name: 'Executables and Shortcuts', extensions: ['exe', 'lnk', 'bat', 'cmd'] },
        { name: 'All Files', extensions: ['*'] },
      ]);
      if (selected) {
        setExecutablePath(selected);
        if (!name) {
          // Extract file name without extension
          const base = selected.split(/[\/\\]/).pop() || '';
          const clean = base.replace(/\.[^.]+$/, '');
          setName(clean.charAt(0).toUpperCase() + clean.slice(1));
        }
      }
    }
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !executablePath.trim()) return;

    let updatedList: CustomApp[];
    if (editingAppId) {
      updatedList = apps.map((a) =>
        a.id === editingAppId
          ? {
              ...a,
              name: name.trim(),
              executablePath: executablePath.trim(),
              arguments: args.trim() || undefined,
              category,
              iconUrl: iconUrl.trim() || undefined,
              description: description.trim() || undefined,
            }
          : a
      );
    } else {
      const newApp: CustomApp = {
        id: `custom-app-${Date.now()}`,
        name: name.trim(),
        executablePath: executablePath.trim(),
        arguments: args.trim() || undefined,
        category,
        iconUrl: iconUrl.trim() || undefined,
        description: description.trim() || undefined,
      };
      updatedList = [...apps, newApp];
    }

    setApps(updatedList);
    onSaveApps(updatedList);
    setIsFormOpen(false);
  };

  const handleDelete = (id: string) => {
    const updated = apps.filter((a) => a.id !== id);
    setApps(updated);
    onSaveApps(updated);
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= apps.length) return;
    const reordered = [...apps];
    const temp = reordered[index];
    reordered[index] = reordered[targetIdx];
    reordered[targetIdx] = temp;
    setApps(reordered);
    onSaveApps(reordered);
  };

  const handleAddPreset = (preset: Omit<CustomApp, 'id'>) => {
    // Avoid exact duplicate
    if (apps.some((a) => a.name.toLowerCase() === preset.name.toLowerCase())) {
      return;
    }
    const newApp: CustomApp = {
      ...preset,
      id: `custom-app-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    const updated = [...apps, newApp];
    setApps(updated);
    onSaveApps(updated);
  };

  const handleTestLaunch = async (app: CustomApp) => {
    if (window.api?.launchCustomApp) {
      const res = await window.api.launchCustomApp(app);
      setLaunchMessage({
        id: app.id,
        success: res.success,
        message: res.success ? 'App launched successfully!' : res.message || 'Failed to launch app',
      });
      setTimeout(() => setLaunchMessage(null), 3000);
    }
  };

  const getCategoryIcon = (cat?: CustomApp['category']) => {
    switch (cat) {
      case 'communication':
        return <MessageSquare className="w-3.5 h-3.5 text-blue-400" />;
      case 'media':
        return <Music className="w-3.5 h-3.5 text-emerald-400" />;
      case 'browser':
        return <Globe className="w-3.5 h-3.5 text-amber-400" />;
      case 'streaming':
        return <Video className="w-3.5 h-3.5 text-rose-400" />;
      case 'game':
        return <Gamepad2 className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <Wrench className="w-3.5 h-3.5 text-indigo-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-indigo-400" />
            Big Picture Apps & Shortcuts Menu
          </h3>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Custom App</span>
        </button>
      </div>

      {/* Quick Presets Section */}
      <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80">
        <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-300">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Quick Presets (One-click Add)</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESET_POPULAR_APPS.map((preset) => {
            const alreadyAdded = apps.some((a) => a.name.toLowerCase() === preset.name.toLowerCase());
            return (
              <button
                key={preset.name}
                onClick={() => handleAddPreset(preset)}
                disabled={alreadyAdded}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition cursor-pointer ${
                  alreadyAdded
                    ? 'bg-slate-900/50 border-slate-800 text-slate-500 opacity-60 cursor-not-allowed'
                    : 'bg-slate-900 hover:bg-slate-800 border-slate-700 hover:border-indigo-500/60 text-slate-200 hover:text-white shadow-sm'
                }`}
                title={alreadyAdded ? 'Already added to apps' : `Add ${preset.name}`}
              >
                {preset.iconUrl ? (
                  <img src={preset.iconUrl} alt={preset.name} className="w-3.5 h-3.5 object-contain" />
                ) : (
                  getCategoryIcon(preset.category)
                )}
                <span>{preset.name}</span>
                {alreadyAdded ? <Check className="w-3 h-3 text-emerald-400" /> : <Plus className="w-3 h-3 text-slate-400" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* App Form Modal / Drawer */}
      {isFormOpen && (
        <div className="p-4 rounded-xl bg-slate-900 border border-indigo-500/40 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-indigo-400" />
              {editingAppId ? 'Edit Application' : 'Add New Application'}
            </h4>
            <button
              onClick={() => setIsFormOpen(false)}
              className="text-slate-400 hover:text-white text-xs"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSaveForm} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  App Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Discord, Spotify, Chrome"
                  required
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as CustomApp['category'])}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="communication">Communication (Discord, Teams, Telegram)</option>
                  <option value="media">Media & Music (Spotify, Kodi, Plex)</option>
                  <option value="browser">Web Browser (Chrome, Edge, Firefox)</option>
                  <option value="streaming">Streaming & Recording (OBS, Twitch)</option>
                  <option value="utility">Utility / Tool (RetroArch, Calculator, Explorer)</option>
                  <option value="game">Game / Store Launcher (Steam, Epic, Battlenet)</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Executable Path or Protocol URI <span className="text-rose-400">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={executablePath}
                  onChange={(e) => setExecutablePath(e.target.value)}
                  placeholder="e.g. C:\Program Files\App.exe, discord://, spotify:, or chrome.exe"
                  required
                  className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleBrowsePath}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs text-slate-200 flex items-center gap-1.5 shrink-0 transition"
                  title="Browse local file"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>Browse .exe</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Launch Arguments <span className="text-slate-500">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={args}
                  onChange={(e) => setArgs(e.target.value)}
                  placeholder="e.g. --fullscreen or -v"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Icon URL <span className="text-slate-500">(Optional image/PNG link)</span>
                </label>
                <input
                  type="text"
                  value={iconUrl}
                  onChange={(e) => setIconUrl(e.target.value)}
                  placeholder="https://... or data:image/..."
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Description <span className="text-slate-500">(Optional)</span>
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief summary or description shown in the menu"
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow transition"
              >
                {editingAppId ? 'Update App' : 'Add App'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Apps List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-semibold">
          <span>Configured Applications ({apps.length})</span>
          <span>Order in Big Picture</span>
        </div>

        {apps.length === 0 ? (
          <div className="p-8 rounded-xl bg-slate-950/40 border border-dashed border-slate-800 text-center space-y-3">
            <LayoutGrid className="w-8 h-8 text-slate-600 mx-auto" />
            <div className="text-xs text-slate-400">
              No apps configured yet. Click <strong>Add Custom App</strong> or use one of the Quick Presets above!
            </div>
          </div>
        ) : (
          apps.map((app, idx) => (
            <div
              key={app.id}
              className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/90 hover:border-slate-700 flex items-center justify-between gap-3 transition group"
            >
              {/* App Left Info */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
                  {app.iconUrl ? (
                    <img src={app.iconUrl} alt={app.name} className="w-6 h-6 object-contain" />
                  ) : (
                    getCategoryIcon(app.category)
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white truncate">{app.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-medium">
                      {app.category || 'App'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 truncate max-w-md font-mono text-[11px] mt-0.5">
                    {app.executablePath}
                    {app.arguments && <span className="text-indigo-400 ml-1.5">{app.arguments}</span>}
                  </div>
                </div>
              </div>

              {/* Status / Test message */}
              {launchMessage && launchMessage.id === app.id && (
                <div
                  className={`text-xs px-2.5 py-1 rounded-md flex items-center gap-1.5 shrink-0 animate-fade-in ${
                    launchMessage.success ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
                  }`}
                >
                  {launchMessage.success ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                  <span>{launchMessage.message}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleTestLaunch(app)}
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-emerald-900/60 border border-slate-800 hover:border-emerald-600/50 text-slate-300 hover:text-emerald-300 transition"
                  title="Test Launch App"
                >
                  <Play className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => handleMove(idx, 'up')}
                  disabled={idx === 0}
                  className={`p-1.5 rounded-lg border text-slate-400 transition ${
                    idx === 0
                      ? 'border-transparent text-slate-700 cursor-not-allowed'
                      : 'bg-slate-900 hover:bg-slate-800 border-slate-800 hover:text-white'
                  }`}
                  title="Move Up"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => handleMove(idx, 'down')}
                  disabled={idx === apps.length - 1}
                  className={`p-1.5 rounded-lg border text-slate-400 transition ${
                    idx === apps.length - 1
                      ? 'border-transparent text-slate-700 cursor-not-allowed'
                      : 'bg-slate-900 hover:bg-slate-800 border-slate-800 hover:text-white'
                  }`}
                  title="Move Down"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => handleOpenEdit(app)}
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-600 text-slate-400 hover:text-white transition"
                  title="Edit App"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => handleDelete(app.id)}
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-900/40 border border-slate-800 hover:border-rose-600/40 text-slate-400 hover:text-rose-400 transition"
                  title="Delete App"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
