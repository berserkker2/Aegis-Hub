import React, { useState } from 'react';
import {
  X,
  FolderOpen,
  FileCode,
  Image as ImageIcon,
  Trash2,
  Plus,
  Save,
  CheckCircle2,
  AlertCircle,
  Copy,
  Terminal,
  Sparkles,
  RotateCcw
} from 'lucide-react';
import { EmulatorConfig } from '../types/game';
import { getEmulatorDefaultBanner } from '../utils/emulatorArtwork';

interface EmulatorSettingsModalProps {
  emulator: EmulatorConfig;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: EmulatorConfig) => void;
  onDuplicate?: (emulator: EmulatorConfig) => void;
  onDelete?: (emulatorId: string) => void;
}

export const EmulatorSettingsModal: React.FC<EmulatorSettingsModalProps> = ({
  emulator,
  isOpen,
  onClose,
  onSave,
  onDuplicate,
  onDelete,
}) => {
  if (!isOpen) return null;

  const defaultBanner = getEmulatorDefaultBanner(emulator.id, emulator.consoleName);

  const [name, setName] = useState(emulator.name || '');
  const [consoleName, setConsoleName] = useState(emulator.consoleName || '');
  const [consoleCategory, setConsoleCategory] = useState<'sony' | 'nintendo' | 'sega' | 'microsoft' | 'other'>(
    emulator.consoleCategory || 'sony'
  );
  const [executablePath, setExecutablePath] = useState(emulator.executablePath || '');
  const [romPaths, setRomPaths] = useState<string[]>(emulator.romPaths || []);
  const [thumbnailUrl, setThumbnailUrl] = useState(emulator.thumbnailUrl || '');
  const [customArgs, setCustomArgs] = useState(emulator.customArgs || '');
  const [customExtensions, setCustomExtensions] = useState(
    (emulator.customExtensions && emulator.customExtensions.join(', ')) || ''
  );
  const [isSaving, setIsSaving] = useState(false);

  // File picker for Executable
  const handleBrowseExecutable = async () => {
    if (!window.api?.selectFile) return;
    const file = await window.api.selectFile([
      { name: 'Executables (*.exe)', extensions: ['exe'] },
      { name: 'All Files', extensions: ['*'] },
    ]);
    if (file) {
      setExecutablePath(file);
    }
  };

  // Folder picker for ROM directories
  const handleAddRomFolder = async () => {
    if (!window.api?.selectFolder) return;
    const folder = await window.api.selectFolder();
    if (folder && !romPaths.includes(folder)) {
      setRomPaths([...romPaths, folder]);
    }
  };

  const handleRemoveRomFolder = (index: number) => {
    setRomPaths(romPaths.filter((_, i) => i !== index));
  };

  const handleUpdateRomFolder = (index: number, newPath: string) => {
    const updated = [...romPaths];
    updated[index] = newPath;
    setRomPaths(updated);
  };

  const handleBrowseRomFolderAtIndex = async (index: number) => {
    if (!window.api?.selectFolder) return;
    const folder = await window.api.selectFolder();
    if (folder) {
      handleUpdateRomFolder(index, folder);
    }
  };

  // Image file picker for Thumbnail
  const handleBrowseImage = async () => {
    if (!window.api?.selectFile) return;
    const file = await window.api.selectFile([
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'svg'] },
    ]);
    if (file) {
      if (window.api.toMediaUrl) {
        const mediaUrl = await window.api.toMediaUrl(file);
        setThumbnailUrl(mediaUrl);
      } else {
        setThumbnailUrl(file);
      }
    }
  };

  const handleResetImage = () => {
    setThumbnailUrl('');
  };

  const handleSave = () => {
    setIsSaving(true);
    const exts = customExtensions
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0)
      .map((e) => (e.startsWith('.') ? e : `.${e}`));

    const validRomPaths = romPaths
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const updated: EmulatorConfig = {
      ...emulator,
      name: name.trim() || emulator.name,
      consoleName: consoleName.trim() || emulator.consoleName,
      consoleCategory,
      executablePath: executablePath.trim(),
      installed: Boolean(executablePath.trim()),
      romPaths: validRomPaths,
      thumbnailUrl: thumbnailUrl.trim() || undefined,
      customArgs: customArgs.trim() || undefined,
      customExtensions: exts.length > 0 ? exts : undefined,
    };

    onSave(updated);
    setIsSaving(false);
    onClose();
  };

  const handleDuplicate = () => {
    if (onDuplicate) {
      const cloned: EmulatorConfig = {
        ...emulator,
        id: `${emulator.id}_instance_${Date.now()}`,
        name: `${name} (Instance 2)`,
        isCustom: true,
      };
      onDuplicate(cloned);
      onClose();
    }
  };

  const handleDelete = () => {
    if (onDelete && confirm(`Are you sure you want to remove this emulator configuration (${name})?`)) {
      onDelete(emulator.id);
      onClose();
    }
  };

  const activeImage = thumbnailUrl || defaultBanner;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-6 rounded-full bg-violet-500 shadow-sm shadow-violet-500/50" />
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Configure Emulator:</span>
                <span className="text-violet-400">{emulator.name}</span>
              </h2>
              <p className="text-xs text-slate-400">
                Change executable instances, custom ROM directories and artwork
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 1. Thumbnail / Artwork Preview & Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-violet-400" />
                Thumbnail & Artwork Banner
              </span>
              <span className="text-[10px] text-slate-400 normal-case">
                Displays prominently on the emulator card
              </span>
            </label>

            <div className="flex flex-col sm:flex-row gap-4 items-start bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80">
              {/* Preview image */}
              <div className="relative w-full sm:w-48 h-28 rounded-lg overflow-hidden border border-slate-700 bg-slate-900 shrink-0 group shadow-md">
                <img
                  src={activeImage}
                  alt={name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2">
                  <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                    {consoleName || 'Console'}
                  </span>
                </div>
              </div>

              {/* Actions & URL Input */}
              <div className="flex-1 space-y-2.5 w-full">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleBrowseImage}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-sm transition"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Browse Image File...</span>
                  </button>

                  {thumbnailUrl && (
                    <button
                      type="button"
                      onClick={handleResetImage}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
                      title="Reset to default artwork"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Default Art</span>
                    </button>
                  )}
                </div>

                <div>
                  <input
                    type="text"
                    value={thumbnailUrl}
                    onChange={(e) => setThumbnailUrl(e.target.value)}
                    placeholder="Paste web Image URL or local file path..."
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Accepts PNG, JPG, WebP or SVG. Leave empty to use the built-in system banner.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Emulator Name & Console */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Emulator Name / Instance Title
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. PCSX2 (Main) or PCSX2 - Silent Hill"
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-violet-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Console / System Name
              </label>
              <input
                type="text"
                value={consoleName}
                onChange={(e) => setConsoleName(e.target.value)}
                placeholder="e.g. PlayStation 2, Nintendo Switch"
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>

          {/* 3. Executable Path (.exe) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Executable File (.exe)</span>
              {executablePath ? (
                <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Path Configured
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] text-amber-400">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Not configured
                </span>
              )}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={executablePath}
                onChange={(e) => setExecutablePath(e.target.value)}
                placeholder="C:\Emulators\PCSX2\pcsx2.exe"
                className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-violet-500"
              />
              <button
                type="button"
                onClick={handleBrowseExecutable}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition shrink-0 border border-slate-700"
              >
                <FolderOpen className="w-3.5 h-3.5 text-violet-400" />
                <span>Browse...</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Select the exact executable for this instance (e.g. standard version, nightly build, or custom instance).
            </p>
          </div>

          {/* 4. ROM & ISO Directories (Multiple Folders Supported) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-300">
                  ROM & ISO Directories ({romPaths.length})
                </label>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-950/80 text-violet-300 border border-violet-500/30 font-medium">
                  Multiple Folders Supported
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddRomFolder}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 text-xs font-semibold transition shadow-sm"
              >
                <Plus className="w-3 h-3" />
                <span>Add Folder</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-400 mb-2">
              Add any number of directories where you store your games (e.g. across different drives).
            </p>

            {romPaths.length === 0 ? (
              <div
                onClick={handleAddRomFolder}
                className="p-4 text-center rounded-xl bg-slate-950/60 border border-dashed border-slate-700 hover:border-violet-500 cursor-pointer text-xs text-slate-400 hover:text-white transition flex flex-col items-center gap-1.5"
              >
                <FolderOpen className="w-5 h-5 text-violet-400" />
                <span>Click to add your games/ISOs folder</span>
                <span className="text-[10px] text-slate-500">You can add multiple folders across your PC</span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {romPaths.map((folder, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-950 border border-slate-800 focus-within:border-violet-500/80 transition shadow-inner"
                    >
                      <FolderOpen className="w-4 h-4 text-violet-400 shrink-0 ml-1.5" />
                      <input
                        type="text"
                        value={folder}
                        onChange={(e) => handleUpdateRomFolder(index, e.target.value)}
                        placeholder="e.g. D:\Games\ISOs"
                        className="flex-1 bg-transparent border-none text-xs font-mono text-slate-200 focus:outline-none px-1"
                      />
                      <button
                        type="button"
                        onClick={() => handleBrowseRomFolderAtIndex(index)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold transition shrink-0 border border-slate-700/80"
                        title="Browse to change this folder..."
                      >
                        Browse...
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveRomFolder(index)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition shrink-0 mr-0.5"
                        title="Remove folder"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddRomFolder}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-slate-800 hover:border-violet-500/60 bg-slate-950/40 hover:bg-slate-900/60 text-xs font-semibold text-slate-400 hover:text-violet-300 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Another Folder</span>
                </button>
              </div>
            )}
          </div>

          {/* 5. Advanced Settings (Custom Arguments & Extensions) */}
          <div className="pt-2 border-t border-slate-800 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-slate-400" />
                <span>Custom CLI Arguments Template</span>
              </label>
              <input
                type="text"
                value={customArgs}
                onChange={(e) => setCustomArgs(e.target.value)}
                placeholder="e.g. -fullscreen -batch or -b -e %ROM%"
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-violet-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Leave empty for emulator defaults. Use <code className="text-violet-300 font-mono">%ROM%</code> to specify where the ROM path is inserted.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Custom File Extensions
              </label>
              <input
                type="text"
                value={customExtensions}
                onChange={(e) => setCustomExtensions(e.target.value)}
                placeholder=".iso, .chd, .bin, .cso, .gz"
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2">
            {onDuplicate && (
              <button
                type="button"
                onClick={handleDuplicate}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition border border-slate-700"
                title="Create a duplicate of this emulator to configure another instance"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Duplicate Instance</span>
              </button>
            )}

            {(emulator.isCustom || onDelete) && (
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold transition border border-red-500/20"
                title="Delete this emulator instance"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-lg shadow-violet-600/30 transition disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save & Apply</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
