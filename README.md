# Aegis Hub

A modern, high-performance universal PC game launcher inspired by **GOG Galaxy** with dark mode visuals, seamless library management, automatic PC scanning, and multi-store integrations.

---

## ✨ Features (Version 1.0)

### 1. 🎮 Dual Game Addition (Manual + Automatic Scanning)
- **Automatic Smart PC Scanner**:
  - Scans **Epic Games Launcher** installed manifests (`C:\ProgramData\Epic\EpicGamesLauncher\Data\Manifests\*.item`).
  - Scans **GOG Galaxy** directories and Windows registry keys (`HKLM\SOFTWARE\GOG.com\Games`).
  - Scans **Steam** libraries via local `libraryfolders.vdf` and `appmanifest_*.acf` files.
  - Scans **Windows Registry** (`Uninstall` keys) for DRM-free and standalone PC games.
  - Custom folder scanner: choose any drive folder (e.g., `D:\Games`, `C:\RetroGames`) to scan recursively.
  - Interactive import modal with checkboxes to choose which discovered games to import.
- **Manual Game Adder**:
  - Add any `.exe`, `.lnk`, or `.bat` file with a native file picker.
  - Set custom title, developer, genres, tags, description, and favorite status.
  - Pick custom vertical cover art and wide hero banners from local disk or web URLs.

### 2. 🛡️ Permanent Steam Solution (Zero Logout Issues)
- **Why GOG Galaxy Fails**: Other launchers attempt to link Steam via web browser cookies or OAuth, which expire constantly and force you to re-login every few days.
- **The Aegis Solution**: Aegis Hub directly reads local Steam manifest files (`steamapps/appmanifest_<appid>.acf`) and launches games seamlessly via `steam://rungameid/<appid>`.
- **Zero logins required**: Never disconnects, works 100% offline, and fetches official high-definition Steam box art automatically.

### 3. 🕹️ Store Integrations & Sources
- **Steam**: Local manifest and ACF library detection.
- **Epic Games Store**: Manifest parser & URI protocol runner (`com.epicgames.launcher://apps/...`).
- **GOG Galaxy**: Registry detection and DRM-Free offline installs.
- **PC Standalone**: Custom executables, emulated games, itch.io, or indie titles.

### 4. 🖼️ Visual Game Grid & Customization
- **High-Definition Cover Grid**:
  - Vertical box art with standard 2:3 poster aspect ratio.
  - Sleek dark theme with gaming neon glows, hover elevation, and status indicators.
  - Platform badges (Steam, Epic, GOG, PC Standalone).
  - Favorite star toggle with 1 click.
  - Quick launch play button on hover.
  - Running indicator with glowing pulse when a game is active.
- **Sorting & Filtering**:
  - Sort by: *Recently Played, Alphabetical (A-Z), Playtime, Highest Rated, Date Added*.
  - Filter by: *Store platform, Genres, Favorites, Recently Played*.
  - Adjustable grid sizing (*Standard Grid* vs *Large Posters*).

### 5. ⏱️ "Recently Played" Top Shelf
- Dedicated top carousel showing your most recently played titles.
- Wide cinematic banners with play overlay button.
- Relative date stamps (e.g. *Just now, 2 hours ago, Yesterday, 3 days ago*) and total logged playtime.

### 6. 📖 Immersive Game Detail Pages
- Cinematic hero banner with multi-layer ambient dark gradient.
- High-res cover thumbnail.
- Big **PLAY** button with real-time process monitoring (changes to **RUNNING** while the game is open).
- Statistics board: Total Playtime, Last Played, Developer, Publisher, Rating.
- Full synopsis, genres pills, and custom tags.
- Direct customization controls: Edit metadata, change cover/banner, toggle favorites, or remove from library.

### 7. ⏱️ Accurate Playtime Tracking
- Background process watcher:
  - Tracks process start and exit times.
  - Automatically records and increments total minutes played.
  - Updates the "Last Played" timestamp and moves the game to the top of the *Recently Played* shelf.
- Persistent local JSON database stored in user data directory (`games.json`).

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or newer recommended, v22 tested)
- npm (v9 or newer)

### Running in Development
```bash
npm run dev
```
This starts both Vite (React frontend) and Electron concurrently with live hot-reloading.

### Running Standalone / Production Build
```bash
npm run build
npm start
```
This builds the optimized production assets with Vite and compiles the Electron main process via esbuild.

---

## 📁 Project Structure

```
Game launcher/
├── electron/
│   ├── main.ts               # Electron window, IPC handlers, process tracking
│   ├── preload.ts            # Secure contextBridge API for the frontend
│   ├── store.ts              # Persistent library store & seed games
│   └── scanners/
│       ├── epicScanner.ts     # Epic Games manifests scanner
│       ├── gogScanner.ts      # GOG Galaxy registry & directory scanner
│       ├── steamScanner.ts    # Steam ACF & libraryfolders scanner
│       └── registryScanner.ts # Windows Registry software scanner
├── src/
│   ├── components/
│   │   ├── TitleBar.tsx              # Frameless drag bar & window controls
│   │   ├── Sidebar.tsx               # Store filters, navigation, quick stats
│   │   ├── RecentlyPlayedShelf.tsx   # Top recent games carousel
│   │   ├── GameGrid.tsx              # Library grid with sorting & filters
│   │   ├── GameCard.tsx              # Poster cards with hover actions
│   │   ├── GameDetailModal.tsx       # Immersive game overview page
│   │   ├── AddGameModal.tsx          # Manual game adding modal
│   │   ├── EditGameModal.tsx         # Game customization modal
│   │   ├── ScannerModal.tsx          # Smart PC detection modal
│   │   └── StoreIntegrationsModal.tsx# Store status & sync modal
│   ├── types/
│   │   ├── game.ts           # Game, store, and scanner TypeScript types
│   │   └── electron.d.ts     # Window.api IPC type definitions
│   ├── utils/
│   │   └── formatters.ts     # Playtime, relative dates, placeholder covers
│   ├── App.tsx               # Main application orchestration
│   ├── main.tsx              # React DOM root
│   └── index.css             # Tailwind v4 dark gaming styling
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```
