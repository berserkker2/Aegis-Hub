import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { Game, LauncherSettings } from '../src/types/game';

const defaultSettings: LauncherSettings = {
  closeOnLaunch: false,
  minimizeToTray: false,
  autoScanOnStartup: false,
  libraryViewMode: 'grid',
  gridSize: 'medium',
  sortBy: 'lastPlayed',
  sortOrder: 'desc',
  scanPaths: [
    'C:\\Games',
    'D:\\Games',
    'C:\\Program Files\\GOG Galaxy\\Games',
    'C:\\Program Files (x86)\\GOG Galaxy\\Games',
  ],
};

const defaultSeedGames: Game[] = [
  {
    id: 'witcher-3-wild-hunt',
    title: 'The Witcher 3: Wild Hunt',
    executablePath: 'C:\\Games\\The Witcher 3\\bin\\x64\\witcher3.exe',
    platform: 'gog',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/292030/library_600x900.jpg',
    bannerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/292030/library_hero.jpg',
    description: 'You are Geralt of Rivia, mercenary monster slayer. Before you stands a war-torn, monster-infested continent you can explore at will. Your current contract? Tracking down Ciri — the Child of Prophecy, a living weapon that can alter the shape of the world.',
    summary: 'Master the sword, concoct lethal mixtures, and explore a vast dark fantasy open world.',
    genres: ['RPG', 'Open World', 'Action', 'Fantasy'],
    tags: ['Story Rich', 'Masterpiece', 'Atmospheric', 'Singleplayer'],
    releaseDate: '2015-05-18',
    developer: 'CD PROJEKT RED',
    publisher: 'CD PROJEKT RED',
    rating: 98,
    favorite: true,
    hidden: false,
    installed: true,
    playtimeMinutes: 4280,
    lastPlayed: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    addedDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
  },
  {
    id: 'cyberpunk-2077',
    title: 'Cyberpunk 2077: Phantom Liberty',
    executablePath: 'C:\\Games\\Cyberpunk 2077\\bin\\x64\\Cyberpunk2077.exe',
    platform: 'gog',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1091500/library_600x900.jpg',
    bannerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1091500/library_hero.jpg',
    description: 'Cyberpunk 2077 is an open-world, action-adventure RPG set in Night City, a megalopolis obsessed with power, glamour, and body modification. Take on high-stakes espionage in Dogtown alongside sleeper agent Solomon Reed.',
    summary: 'An open-world action-adventure RPG set in the dystopian megalopolis of Night City.',
    genres: ['Action', 'RPG', 'Sci-Fi', 'Cyberpunk'],
    tags: ['First-Person', 'Great Soundtrack', 'Story Rich'],
    releaseDate: '2020-12-10',
    developer: 'CD PROJEKT RED',
    publisher: 'CD PROJEKT RED',
    rating: 92,
    favorite: true,
    hidden: false,
    installed: true,
    playtimeMinutes: 3120,
    lastPlayed: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(), // yesterday
    addedDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
  },
  {
    id: 'elden-ring',
    title: 'ELDEN RING: Shadow of the Erdtree',
    executablePath: 'C:\\Games\\ELDEN RING\\Game\\eldenring.exe',
    platform: 'steam',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1245620/library_600x900.jpg',
    bannerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1245620/library_hero.jpg',
    description: 'THE NEW FANTASY ACTION RPG. Rise, Tarnished, and be guided by grace to brandish the power of the Elden Ring and become an Elden Lord in the Lands Between.',
    summary: 'A vast world where open fields with a variety of situations and huge dungeons connect seamlessly.',
    genres: ['Action RPG', 'Souls-like', 'Dark Fantasy'],
    tags: ['Difficult', 'Atmospheric', 'Lore-Rich', 'Masterpiece'],
    releaseDate: '2022-02-25',
    developer: 'FromSoftware Inc.',
    publisher: 'Bandai Namco Entertainment',
    rating: 96,
    favorite: true,
    hidden: false,
    installed: true,
    playtimeMinutes: 8450,
    lastPlayed: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
    addedDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(),
  },
  {
    id: 'hades-2',
    title: 'Hades II',
    executablePath: 'C:\\Games\\Hades II\\Ship\\Hades2.exe',
    platform: 'epic',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1145350/library_600x900.jpg',
    bannerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1145350/library_hero.jpg',
    description: 'Battle beyond the Underworld using dark sorcery to take on the Titan of Time in this bewitching sequel to the award-winning rogue-like dungeon crawler.',
    summary: 'The Princess of the Underworld faces Chronos in an all-new rogue-like god-like odyssey.',
    genres: ['Roguelike', 'Action', 'Hack and Slash', 'Indie'],
    tags: ['Mythology', 'Fast-Paced', 'Replay Value'],
    releaseDate: '2024-05-06',
    developer: 'Supergiant Games',
    publisher: 'Supergiant Games',
    rating: 95,
    favorite: false,
    hidden: false,
    installed: true,
    playtimeMinutes: 1420,
    lastPlayed: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
    addedDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(),
  },
  {
    id: 'balatro',
    title: 'Balatro',
    executablePath: 'C:\\Games\\Balatro\\Balatro.exe',
    platform: 'manual',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/2379780/library_600x900.jpg',
    bannerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/2379780/library_hero.jpg',
    description: 'The poker roguelike. Balatro is a hypnotically satisfying deckbuilder where you play illegal poker hands, discover game-changing jokers, and trigger adrenaline-fueled, outrageous combos.',
    summary: 'A poker-themed roguelike deck builder featuring crazy multipliers and endless synergies.',
    genres: ['Roguelike', 'Deckbuilder', 'Strategy', 'Indie'],
    tags: ['Addictive', 'Casual', 'Turn-Based'],
    releaseDate: '2024-02-20',
    developer: 'LocalThunk',
    publisher: 'Playstack',
    rating: 97,
    favorite: false,
    hidden: false,
    installed: true,
    playtimeMinutes: 2980,
    lastPlayed: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(),
    addedDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
  },
  {
    id: 'hollow-knight',
    title: 'Hollow Knight',
    executablePath: 'C:\\Games\\Hollow Knight\\hollow_knight.exe',
    platform: 'gog',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/367520/library_600x900.jpg',
    bannerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/367520/library_hero.jpg',
    description: 'Forge your own path in Hollow Knight! An epic action adventure through a vast ruined kingdom of insects and heroes. Explore twisting caverns, battle tainted creatures and befriend bizarre bugs.',
    summary: 'Ascend through a hauntingly beautiful, hand-drawn subterranean world.',
    genres: ['Metroidvania', 'Action', 'Indie', 'Adventure'],
    tags: ['Atmospheric', 'Difficult', '2D', 'Masterpiece'],
    releaseDate: '2017-02-24',
    developer: 'Team Cherry',
    publisher: 'Team Cherry',
    rating: 99,
    favorite: true,
    hidden: false,
    installed: true,
    playtimeMinutes: 720,
    lastPlayed: new Date(Date.now() - 1000 * 60 * 60 * 240).toISOString(),
    addedDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
  }
];

export class LauncherStore {
  private dataDir: string;
  private gamesFilePath: string;
  private settingsFilePath: string;

  constructor() {
    try {
      this.dataDir = app ? app.getPath('userData') : path.join(process.cwd(), '.launcher-data');
    } catch {
      this.dataDir = path.join(process.cwd(), '.launcher-data');
    }

    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    this.gamesFilePath = path.join(this.dataDir, 'games.json');
    this.settingsFilePath = path.join(this.dataDir, 'settings.json');
  }

  public getGames(): Game[] {
    try {
      if (fs.existsSync(this.gamesFilePath)) {
        const raw = fs.readFileSync(this.gamesFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((g: Game) => ({
            ...g,
            installed: g.installed !== undefined ? g.installed : true,
          }));
        }
      }
    } catch (err) {
      console.error('Error reading games store:', err);
    }

    // Seed defaults
    this.saveGames(defaultSeedGames);
    return defaultSeedGames;
  }

  public saveGames(games: Game[]): void {
    try {
      fs.writeFileSync(this.gamesFilePath, JSON.stringify(games, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error writing games store:', err);
    }
  }

  public getSettings(): LauncherSettings {
    try {
      if (fs.existsSync(this.settingsFilePath)) {
        const raw = fs.readFileSync(this.settingsFilePath, 'utf-8');
        return { ...defaultSettings, ...JSON.parse(raw) };
      }
    } catch (err) {
      console.error('Error reading settings store:', err);
    }
    return defaultSettings;
  }

  public saveSettings(settings: LauncherSettings): void {
    try {
      fs.writeFileSync(this.settingsFilePath, JSON.stringify(settings, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error writing settings store:', err);
    }
  }
}
