import { RecommendedGame, StoreLinkItem, Game } from '../src/types/game';

interface RawgGameResult {
  id: number;
  name: string;
  background_image?: string;
  rating?: number;
  released?: string;
  genres?: Array<{ id: number; name: string; slug: string }>;
  platforms?: Array<{ platform: { id: number; name: string; slug: string } }>;
  stores?: Array<{ store: { id: number; name: string; slug: string } }>;
  short_screenshots?: Array<{ id: number; image: string }>;
}

const POPULAR_CURATED_GAMES: RecommendedGame[] = [
  {
    id: 'rec-witcher-3',
    title: 'The Witcher 3: Wild Hunt',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/292030/library_600x900.jpg',
    bannerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/292030/library_hero.jpg',
    rating: 96,
    releaseDate: '2015-05-18',
    genres: ['RPG', 'Open World', 'Action', 'Fantasy'],
    platforms: ['PC', 'PlayStation 5', 'PlayStation 4', 'Xbox Series X|S', 'Xbox One', 'Nintendo Switch'],
    stores: [
      { id: 'steam', name: 'Steam', url: 'https://store.steampowered.com/app/292030/' },
      { id: 'gog', name: 'GOG', url: 'https://www.gog.com/game/the_witcher_3_wild_hunt' },
      { id: 'epic', name: 'Epic Games', url: 'https://store.epicgames.com/p/the-witcher-3-wild-hunt' },
    ],
    description: 'You are Geralt of Rivia, mercenary monster slayer. Before you stands a war-torn, monster-infested continent you can explore at will.',
  },
  {
    id: 'rec-cyberpunk-2077',
    title: 'Cyberpunk 2077',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1091500/library_600x900.jpg',
    bannerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1091500/library_hero.jpg',
    rating: 90,
    releaseDate: '2020-12-10',
    genres: ['RPG', 'Open World', 'Sci-Fi', 'FPS', 'Action'],
    platforms: ['PC', 'PlayStation 5', 'Xbox Series X|S'],
    stores: [
      { id: 'steam', name: 'Steam', url: 'https://store.steampowered.com/app/1091500/' },
      { id: 'gog', name: 'GOG', url: 'https://www.gog.com/game/cyberpunk_2077' },
      { id: 'epic', name: 'Epic Games', url: 'https://store.epicgames.com/p/cyberpunk-2077' },
    ],
    description: 'Cyberpunk 2077 is an open-world, action-adventure RPG set in Night City, a megalopolis obsessed with power, glamour, and body modification.',
  },
  {
    id: 'rec-baldurs-gate-3',
    title: "Baldur's Gate 3",
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1086940/library_600x900.jpg',
    bannerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1086940/library_hero.jpg',
    rating: 97,
    releaseDate: '2023-08-03',
    genres: ['RPG', 'Turn-Based', 'Fantasy', 'Strategy', 'Co-op'],
    platforms: ['PC', 'PlayStation 5', 'Xbox Series X|S'],
    stores: [
      { id: 'steam', name: 'Steam', url: 'https://store.steampowered.com/app/1086940/' },
      { id: 'gog', name: 'GOG', url: 'https://www.gog.com/game/baldurs_gate_iii' },
    ],
    description: 'Gather your party and return to the Forgotten Realms in a tale of fellowship and betrayal, sacrifice and survival, and the lure of absolute power.',
  },
  {
    id: 'rec-elden-ring',
    title: 'ELDEN RING',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1245620/library_600x900.jpg',
    bannerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1245620/library_hero.jpg',
    rating: 95,
    releaseDate: '2022-02-25',
    genres: ['Action RPG', 'Souls-like', 'Open World', 'Dark Fantasy'],
    platforms: ['PC', 'PlayStation 5', 'PlayStation 4', 'Xbox Series X|S', 'Xbox One'],
    stores: [
      { id: 'steam', name: 'Steam', url: 'https://store.steampowered.com/app/1245620/' },
    ],
    description: 'Rise, Tarnished, and be guided by grace to brandish the power of the Elden Ring and become an Elden Lord in the Lands Between.',
  },
  {
    id: 'rec-hades-2',
    title: 'Hades II',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1145350/library_600x900.jpg',
    bannerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1145350/library_hero.jpg',
    rating: 94,
    releaseDate: '2024-05-06',
    genres: ['Roguelike', 'Action', 'Indie', 'Hack and Slash', 'Mythology'],
    platforms: ['PC'],
    stores: [
      { id: 'steam', name: 'Steam', url: 'https://store.steampowered.com/app/1145350/' },
      { id: 'epic', name: 'Epic Games', url: 'https://store.epicgames.com/p/hades-ii' },
    ],
    description: 'Battle beyond the Underworld using dark sorcery to take on the Titan of Time in this bewitching sequel to the award-winning roguelike dungeon crawler.',
  },
  {
    id: 'rec-red-dead-redemption-2',
    title: 'Red Dead Redemption 2',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1174180/library_600x900.jpg',
    bannerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1174180/library_hero.jpg',
    rating: 97,
    releaseDate: '2019-12-05',
    genres: ['Action', 'Open World', 'Adventure', 'Western', 'Story Rich'],
    platforms: ['PC', 'PlayStation 4', 'Xbox One'],
    stores: [
      { id: 'steam', name: 'Steam', url: 'https://store.steampowered.com/app/1174180/' },
      { id: 'epic', name: 'Epic Games', url: 'https://store.epicgames.com/p/red-dead-redemption-2' },
    ],
    description: 'Winner of over 175 Game of the Year Awards and recipient of over 250 perfect scores, RDR2 is the epic tale of outlaw Arthur Morgan.',
  },
  {
    id: 'rec-black-myth-wukong',
    title: 'Black Myth: Wukong',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/2358720/library_600x900.jpg',
    bannerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/2358720/library_hero.jpg',
    rating: 92,
    releaseDate: '2024-08-20',
    genres: ['Action RPG', 'Souls-like', 'Mythology', 'Adventure'],
    platforms: ['PC', 'PlayStation 5'],
    stores: [
      { id: 'steam', name: 'Steam', url: 'https://store.steampowered.com/app/2358720/' },
      { id: 'epic', name: 'Epic Games', url: 'https://store.epicgames.com/p/black-myth-wukong-87a72b' },
    ],
    description: 'Black Myth: Wukong is an action RPG rooted in Chinese mythology. Set out as the Destined One to uncover the obscured truth beneath the glorious legend.',
  },
  {
    id: 'rec-balatro',
    title: 'Balatro',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/2379780/library_600x900.jpg',
    bannerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/2379780/library_hero.jpg',
    rating: 96,
    releaseDate: '2024-02-20',
    genres: ['Roguelike', 'Deckbuilder', 'Strategy', 'Indie', 'Card Game'],
    platforms: ['PC', 'PlayStation 5', 'Xbox Series X|S', 'Nintendo Switch'],
    stores: [
      { id: 'steam', name: 'Steam', url: 'https://store.steampowered.com/app/2379780/' },
    ],
    description: 'The poker roguelike. Balatro is a hypnotically satisfying deckbuilder where you play illegal poker hands, discover game-changing jokers, and trigger adrenaline-fueled combos.',
  },
  {
    id: 'rec-hollow-knight-silksong',
    title: 'Hollow Knight',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/367520/library_600x900.jpg',
    bannerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/367520/library_hero.jpg',
    rating: 95,
    releaseDate: '2017-02-24',
    genres: ['Metroidvania', 'Souls-like', 'Platformer', '2D', 'Indie'],
    platforms: ['PC', 'PlayStation 4', 'Xbox One', 'Nintendo Switch'],
    stores: [
      { id: 'steam', name: 'Steam', url: 'https://store.steampowered.com/app/367520/' },
      { id: 'gog', name: 'GOG', url: 'https://www.gog.com/game/hollow_knight' },
    ],
    description: 'Forge your own path in Hollow Knight! An epic action adventure through a vast ruined kingdom of insects and heroes.',
  },
  {
    id: 'rec-helldivers-2',
    title: 'HELLDIVERS™ 2',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/553850/library_600x900.jpg',
    bannerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/553850/library_hero.jpg',
    rating: 88,
    releaseDate: '2024-02-08',
    genres: ['Shooter', 'Action', 'Co-op', 'Third-Person Shooter', 'Sci-Fi'],
    platforms: ['PC', 'PlayStation 5'],
    stores: [
      { id: 'steam', name: 'Steam', url: 'https://store.steampowered.com/app/553850/' },
      { id: 'playstation', name: 'PlayStation', url: 'https://store.playstation.com/en-us/concept/10006757' },
    ],
    description: "The Galaxy's Last Line of Offence. Enlist in the Helldivers and join the fight for freedom across a hostile galaxy in a fast, frantic third-person shooter.",
  },
  {
    id: 'rec-forza-horizon-5',
    title: 'Forza Horizon 5',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1551360/library_600x900.jpg',
    bannerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1551360/library_hero.jpg',
    rating: 92,
    releaseDate: '2021-11-09',
    genres: ['Racing', 'Open World', 'Driving', 'Sports', 'Action'],
    platforms: ['PC', 'Xbox Series X|S', 'Xbox One'],
    stores: [
      { id: 'steam', name: 'Steam', url: 'https://store.steampowered.com/app/1551360/' },
      { id: 'xbox', name: 'Xbox Store', url: 'https://www.xbox.com/games/store/forza-horizon-5-standard-edition/9nkx70bb77rx' },
    ],
    description: 'Your Ultimate Horizon Adventure awaits! Explore the vibrant and ever-evolving open world landscapes of Mexico with limitless, fun driving action in hundreds of the world’s greatest cars.',
  },
  {
    id: 'rec-persona-3-reload',
    title: 'Persona 3 Reload',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/2161700/library_600x900.jpg',
    bannerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/2161700/library_hero.jpg',
    rating: 93,
    releaseDate: '2024-02-02',
    genres: ['JRPG', 'Anime', 'Turn-Based', 'Story Rich', 'RPG'],
    platforms: ['PC', 'PlayStation 5', 'PlayStation 4', 'Xbox Series X|S', 'Xbox One'],
    stores: [
      { id: 'steam', name: 'Steam', url: 'https://store.steampowered.com/app/2161700/' },
      { id: 'xbox', name: 'Xbox Store', url: 'https://www.xbox.com/games/store/persona-3-reload/9n5q16n2z437' },
    ],
    description: 'Step into the shoes of a transfer student thrust into an unexpected fate when entering the hour "hidden" between one day and the next. Awaken an incredible power and chase the mysteries of the Dark Hour.',
  },
  {
    id: 'rec-cs-go',
    title: 'Counter-Strike: Global Offensive',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/730/library_600x900.jpg',
    bannerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/730/library_hero.jpg',
    rating: 90,
    releaseDate: '2012-08-21',
    genres: ['Shooter', 'FPS', 'Action', 'Multiplayer', 'Competitive', 'eSports'],
    platforms: ['PC'],
    stores: [
      { id: 'steam', name: 'Steam', url: 'https://store.steampowered.com/app/730/' },
    ],
    description: 'Counter-Strike: Global Offensive expands upon the team-based action gameplay that it pioneered when it was launched 19 years ago.',
  },
  {
    id: 'rec-gta-v',
    title: 'Grand Theft Auto V',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/271590/library_600x900.jpg',
    bannerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/271590/library_hero.jpg',
    rating: 96,
    releaseDate: '2013-09-17',
    genres: ['Action', 'Open World', 'Shooter', 'Crime', 'Multiplayer'],
    platforms: ['PC', 'PlayStation 5', 'PlayStation 4', 'Xbox Series X|S', 'Xbox One'],
    stores: [
      { id: 'steam', name: 'Steam', url: 'https://store.steampowered.com/app/271590/' },
      { id: 'epic', name: 'Epic Games', url: 'https://store.epicgames.com/p/grand-theft-auto-v' },
    ],
    description: 'When a young street hustler, a retired bank robber and a terrifying psychopath find themselves entangled with some of the most frightening and deranged elements of the criminal underworld.',
  },
  {
    id: 'rec-half-life-2',
    title: 'Half-Life 2',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/220/library_600x900.jpg',
    bannerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/220/library_hero.jpg',
    rating: 96,
    releaseDate: '2004-11-16',
    genres: ['Shooter', 'FPS', 'Action', 'Sci-Fi'],
    platforms: ['PC'],
    stores: [
      { id: 'steam', name: 'Steam', url: 'https://store.steampowered.com/app/220/' },
    ],
    description: 'By taking the adrenaline, action and emotional response of the original, and adding startling new realism and responsiveness, Half-Life 2 opens the door to a world where player presence affects everything.',
  },
  {
    id: 'rec-portal-2',
    title: 'Portal 2',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/620/library_600x900.jpg',
    bannerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/620/library_hero.jpg',
    rating: 98,
    releaseDate: '2011-04-19',
    genres: ['Puzzle', 'Adventure', 'Sci-Fi', 'Co-op'],
    platforms: ['PC', 'PlayStation 3', 'Xbox 360', 'Nintendo Switch'],
    stores: [
      { id: 'steam', name: 'Steam', url: 'https://store.steampowered.com/app/620/' },
    ],
    description: 'The Perpetual Testing Initiative has been expanded to allow you to design co-op puzzles for you and your friends!',
  },
  {
    id: 'rec-skyrim',
    title: 'The Elder Scrolls V: Skyrim Special Edition',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/489830/library_600x900.jpg',
    bannerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/489830/library_hero.jpg',
    rating: 94,
    releaseDate: '2011-11-11',
    genres: ['RPG', 'Open World', 'Fantasy', 'Adventure', 'Action'],
    platforms: ['PC', 'PlayStation 5', 'PlayStation 4', 'Xbox Series X|S', 'Xbox One', 'Nintendo Switch'],
    stores: [
      { id: 'steam', name: 'Steam', url: 'https://store.steampowered.com/app/489830/' },
      { id: 'gog', name: 'GOG', url: 'https://www.gog.com/game/the_elder_scrolls_v_skyrim_special_edition' },
    ],
    description: 'Winner of more than 200 Game of the Year Awards, Skyrim Special Edition brings the epic fantasy to life in stunning detail.',
  },
  {
    id: 'rec-civ-6',
    title: "Sid Meier's Civilization VI",
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/289070/library_600x900.jpg',
    bannerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/289070/library_hero.jpg',
    rating: 88,
    releaseDate: '2016-10-21',
    genres: ['Strategy', 'Turn-Based', 'Historical'],
    platforms: ['PC', 'PlayStation 4', 'Xbox One', 'Nintendo Switch'],
    stores: [
      { id: 'steam', name: 'Steam', url: 'https://store.steampowered.com/app/289070/' },
      { id: 'epic', name: 'Epic Games', url: 'https://store.epicgames.com/p/sid-meiers-civilization-vi' },
    ],
    description: 'Civilization VI offers new ways to engage with your world: cities now physically expand across the map, active research in technology and culture unlocks new potential.',
  },
  {
    id: 'rec-xcom-2',
    title: 'XCOM 2',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/268500/library_600x900.jpg',
    bannerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/268500/library_hero.jpg',
    rating: 88,
    releaseDate: '2016-02-05',
    genres: ['Strategy', 'Turn-Based', 'Tactical', 'Sci-Fi'],
    platforms: ['PC', 'PlayStation 4', 'Xbox One', 'Nintendo Switch'],
    stores: [
      { id: 'steam', name: 'Steam', url: 'https://store.steampowered.com/app/268500/' },
      { id: 'gog', name: 'GOG', url: 'https://www.gog.com/game/xcom_2' },
      { id: 'epic', name: 'Epic Games', url: 'https://store.epicgames.com/p/xcom-2' },
    ],
    description: 'Earth has changed. Twenty years have passed since world leaders offered an unconditional surrender to alien forces. As the leader of a guerrilla force facing impossible odds, you must ignite a global resistance.',
  },
  {
    id: 'rec-aoe2-de',
    title: 'Age of Empires II: Definitive Edition',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/813780/library_600x900.jpg',
    bannerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/813780/library_hero.jpg',
    rating: 92,
    releaseDate: '2019-11-14',
    genres: ['Strategy', 'RTS', 'Historical', 'Multiplayer'],
    platforms: ['PC', 'Xbox Series X|S', 'Xbox One'],
    stores: [
      { id: 'steam', name: 'Steam', url: 'https://store.steampowered.com/app/813780/' },
      { id: 'xbox', name: 'Xbox Store', url: 'https://www.xbox.com/games/store/age-of-empires-ii-definitive-edition/9njdd0jgppq6' },
    ],
    description: 'Age of Empires II: Definitive Edition celebrates the 20th anniversary of one of the most popular strategy games ever with stunning 4K Ultra HD graphics and new campaigns.',
  },
  {
    id: 'rec-doom-eternal',
    title: 'DOOM Eternal',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/782330/library_600x900.jpg',
    bannerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/782330/library_hero.jpg',
    rating: 91,
    releaseDate: '2020-03-20',
    genres: ['Shooter', 'FPS', 'Action', 'Fast-Paced'],
    platforms: ['PC', 'PlayStation 5', 'PlayStation 4', 'Xbox Series X|S', 'Xbox One', 'Nintendo Switch'],
    stores: [
      { id: 'steam', name: 'Steam', url: 'https://store.steampowered.com/app/782330/' },
      { id: 'epic', name: 'Epic Games', url: 'https://store.epicgames.com/p/doom-eternal' },
    ],
    description: "Hell's armies have invaded Earth. Become the Slayer in an epic single-player campaign to conquer demons across dimensions and stop the final destruction of humanity.",
  },
  {
    id: 'rec-slay-the-spire',
    title: 'Slay the Spire',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/646570/library_600x900.jpg',
    bannerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/646570/library_hero.jpg',
    rating: 97,
    releaseDate: '2019-01-23',
    genres: ['Roguelike', 'Deckbuilder', 'Strategy', 'Indie', 'Card Game'],
    platforms: ['PC', 'PlayStation 4', 'Xbox One', 'Nintendo Switch'],
    stores: [
      { id: 'steam', name: 'Steam', url: 'https://store.steampowered.com/app/646570/' },
      { id: 'gog', name: 'GOG', url: 'https://www.gog.com/game/slay_the_spire' },
    ],
    description: 'We fused card games and roguelikes together to make the best single player deckbuilder we could. Craft a unique deck, encounter bizarre creatures, and discover relics of immense power!',
  },
  {
    id: 'rec-dead-cells',
    title: 'Dead Cells',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/588650/library_600x900.jpg',
    bannerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/588650/library_hero.jpg',
    rating: 96,
    releaseDate: '2018-08-06',
    genres: ['Roguelike', 'Action', 'Metroidvania', 'Indie', '2D'],
    platforms: ['PC', 'PlayStation 4', 'Xbox One', 'Nintendo Switch'],
    stores: [
      { id: 'steam', name: 'Steam', url: 'https://store.steampowered.com/app/588650/' },
      { id: 'gog', name: 'GOG', url: 'https://www.gog.com/game/dead_cells' },
      { id: 'epic', name: 'Epic Games', url: 'https://store.epicgames.com/p/dead-cells' },
    ],
    description: 'Dead Cells is a rogue-lite, metroidvania inspired, action-platformer. You will explore a sprawling, ever-changing castle... assuming you are able to fight your way past its keepers in 2D souls-lite combat.',
  },
  {
    id: 'rec-dark-souls-3',
    title: 'DARK SOULS™ III',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/374320/library_600x900.jpg',
    bannerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/374320/library_hero.jpg',
    rating: 93,
    releaseDate: '2016-04-12',
    genres: ['Souls-like', 'Action RPG', 'Dark Fantasy', 'RPG'],
    platforms: ['PC', 'PlayStation 4', 'Xbox One'],
    stores: [
      { id: 'steam', name: 'Steam', url: 'https://store.steampowered.com/app/374320/' },
    ],
    description: 'Dark Souls continues to push the boundaries with the latest, ambitious chapter in the critically-acclaimed and genre-defining series. Prepare yourself and Embrace The Darkness!',
  },
  {
    id: 'rec-sekiro',
    title: 'Sekiro™: Shadows Die Twice',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/814380/library_600x900.jpg',
    bannerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/814380/library_hero.jpg',
    rating: 95,
    releaseDate: '2019-03-22',
    genres: ['Souls-like', 'Action', 'Adventure', 'Ninja'],
    platforms: ['PC', 'PlayStation 4', 'Xbox One'],
    stores: [
      { id: 'steam', name: 'Steam', url: 'https://store.steampowered.com/app/814380/' },
    ],
    description: 'Carve your own clever path to vengeance in the award-winning adventure from developer FromSoftware, creators of Bloodborne and the Dark Souls series.',
  },
  {
    id: 'rec-god-of-war',
    title: 'God of War',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1593500/library_600x900.jpg',
    bannerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1593500/library_hero.jpg',
    rating: 96,
    releaseDate: '2022-01-14',
    genres: ['Action', 'Adventure', 'Mythology', 'Story Rich'],
    platforms: ['PC', 'PlayStation 5', 'PlayStation 4'],
    stores: [
      { id: 'steam', name: 'Steam', url: 'https://store.steampowered.com/app/1593500/' },
      { id: 'epic', name: 'Epic Games', url: 'https://store.epicgames.com/p/god-of-war' },
      { id: 'gog', name: 'GOG', url: 'https://www.gog.com/game/god_of_war' },
    ],
    description: 'His vengeance against the Gods of Olympus years behind him, Kratos now lives as a man in the realm of Norse Gods and monsters.',
  },
  {
    id: 'rec-monster-hunter-world',
    title: 'Monster Hunter: World',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/582010/library_600x900.jpg',
    bannerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/582010/library_hero.jpg',
    rating: 90,
    releaseDate: '2018-08-09',
    genres: ['Action RPG', 'Co-op', 'Open World', 'Action', 'Adventure'],
    platforms: ['PC', 'PlayStation 4', 'Xbox One'],
    stores: [
      { id: 'steam', name: 'Steam', url: 'https://store.steampowered.com/app/582010/' },
    ],
    description: 'Welcome to a new world! In Monster Hunter: World, enjoy the ultimate hunting experience, using everything at your disposal to hunt monsters in a new world teeming with surprises and excitement.',
  },
  {
    id: 'rec-fallout-nv',
    title: 'Fallout: New Vegas',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/22380/library_600x900.jpg',
    bannerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/22380/library_hero.jpg',
    rating: 95,
    releaseDate: '2010-10-19',
    genres: ['RPG', 'Open World', 'Shooter', 'Post-Apocalyptic'],
    platforms: ['PC', 'PlayStation 3', 'Xbox 360'],
    stores: [
      { id: 'steam', name: 'Steam', url: 'https://store.steampowered.com/app/22380/' },
      { id: 'gog', name: 'GOG', url: 'https://www.gog.com/game/fallout_new_vegas_ultimate_edition' },
      { id: 'epic', name: 'Epic Games', url: 'https://store.epicgames.com/p/fallout-new-vegas--ultimate-edition' },
    ],
    description: "Welcome to Vegas. New Vegas. It’s the kind of town where you dig your own grave prior to being shot in the head and left for dead... and that’s before things really get ugly.",
  },
  {
    id: 'rec-stardew-valley',
    title: 'Stardew Valley',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/413150/library_600x900.jpg',
    bannerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/413150/library_hero.jpg',
    rating: 98,
    releaseDate: '2016-02-26',
    genres: ['Indie', 'Simulation', 'RPG', 'Relaxing', 'Adventure'],
    platforms: ['PC', 'PlayStation 4', 'Xbox One', 'Nintendo Switch'],
    stores: [
      { id: 'steam', name: 'Steam', url: 'https://store.steampowered.com/app/413150/' },
      { id: 'gog', name: 'GOG', url: 'https://www.gog.com/game/stardew_valley' },
    ],
    description: "You've inherited your grandfather's old farm plot in Stardew Valley. Armed with hand-me-down tools and a few coins, you set out to begin your new life.",
  },
  {
    id: 'rec-disco-elysium',
    title: 'Disco Elysium - The Final Cut',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/632470/library_600x900.jpg',
    bannerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/632470/library_hero.jpg',
    rating: 97,
    releaseDate: '2019-10-15',
    genres: ['RPG', 'Story Rich', 'Detective', 'Indie'],
    platforms: ['PC', 'PlayStation 5', 'PlayStation 4', 'Xbox Series X|S', 'Xbox One', 'Nintendo Switch'],
    stores: [
      { id: 'steam', name: 'Steam', url: 'https://store.steampowered.com/app/632470/' },
      { id: 'gog', name: 'GOG', url: 'https://www.gog.com/game/disco_elysium' },
      { id: 'epic', name: 'Epic Games', url: 'https://store.epicgames.com/p/disco-elysium' },
    ],
    description: 'Disco Elysium - The Final Cut is the definitive edition of the groundbreaking role playing game. You’re a detective with a unique skill system at your disposal and a whole city block to carve your path across.',
  },
  {
    id: 'rec-celeste',
    title: 'Celeste',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/504230/library_600x900.jpg',
    bannerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/504230/library_hero.jpg',
    rating: 97,
    releaseDate: '2018-01-25',
    genres: ['Indie', 'Platformer', '2D', 'Adventure'],
    platforms: ['PC', 'PlayStation 4', 'Xbox One', 'Nintendo Switch'],
    stores: [
      { id: 'steam', name: 'Steam', url: 'https://store.steampowered.com/app/504230/' },
      { id: 'epic', name: 'Epic Games', url: 'https://store.epicgames.com/p/celeste' },
    ],
    description: 'Help Madeline survive her inner demons on her journey to the top of Celeste Mountain, in this super-tight, hand-crafted platformer from the creators of multiplayer classic TowerFall.',
  },
  {
    id: 'rec-batman-arkham-city',
    title: 'Batman: Arkham City - Game of the Year Edition',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/200260/library_600x900.jpg',
    bannerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/200260/library_hero.jpg',
    rating: 94,
    releaseDate: '2011-10-18',
    genres: ['Action', 'Open World', 'Superhero', 'Adventure', 'Stealth'],
    platforms: ['PC', 'PlayStation 4', 'Xbox One', 'Nintendo Switch'],
    stores: [
      { id: 'steam', name: 'Steam', url: 'https://store.steampowered.com/app/200260/' },
      { id: 'gog', name: 'GOG', url: 'https://www.gog.com/game/batman_arkham_city_goty' },
      { id: 'epic', name: 'Epic Games', url: 'https://store.epicgames.com/p/batman-arkham-city' },
    ],
    description: 'Batman: Arkham City builds upon the intense, atmospheric foundation of Batman: Arkham Asylum, sending players flying into the expansive Arkham City.',
  },
  {
    id: 'rec-metal-slug-3',
    title: 'Metal Slug 3',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/250180/library_600x900.jpg',
    bannerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/250180/library_hero.jpg',
    rating: 90,
    releaseDate: '2000-03-23',
    genres: ['Action', 'Arcade', 'Shooter', 'Co-op', 'Retro'],
    platforms: ['PC', 'Arcade', 'Neo Geo', 'PlayStation 4', 'Xbox One', 'Nintendo Switch'],
    stores: [
      { id: 'steam', name: 'Steam', url: 'https://store.steampowered.com/app/250180/' },
      { id: 'gog', name: 'GOG', url: 'https://www.gog.com/game/metal_slug_3' },
    ],
    description: 'The masterpiece of 2D action-shooting, "METAL SLUG 3" heads to Steam! Use various weapons and slugs to fight your way through the battlefield!',
  },
  {
    id: 'rec-pacman-cedx',
    title: 'PAC-MAN Championship Edition DX+',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/236450/library_600x900.jpg',
    bannerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/236450/library_hero.jpg',
    rating: 95,
    releaseDate: '2013-09-25',
    genres: ['Arcade', 'Action', 'Retro', 'Classic'],
    platforms: ['PC', 'Arcade', 'PlayStation 3', 'Xbox 360'],
    stores: [
      { id: 'steam', name: 'Steam', url: 'https://store.steampowered.com/app/236450/' },
    ],
    description: 'Get ready for more ghost chaining and frantic action in PAC-MAN CE-DX+! The award-winning video game makes a smashing debut on Steam with even more content!',
  },
  {
    id: 'rec-kof-2002-um',
    title: 'THE KING OF FIGHTERS 2002 UNLIMITED MATCH',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/222440/library_600x900.jpg',
    bannerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/222440/library_hero.jpg',
    rating: 94,
    releaseDate: '2002-12-31',
    genres: ['Arcade', 'Fighting', 'Action', 'Retro', 'Classic'],
    platforms: ['PC', 'Arcade', 'Neo Geo', 'PlayStation 4', 'PlayStation 2'],
    stores: [
      { id: 'steam', name: 'Steam', url: 'https://store.steampowered.com/app/222440/' },
      { id: 'gog', name: 'GOG', url: 'https://www.gog.com/game/the_king_of_fighters_2002_unlimited_match' },
    ],
    description: 'THE KING OF FIGHTERS 2002 UNLIMITED MATCH is a fully upgraded version of KOF 2002, the masterpiece of the 2D fighting game series.',
  },
  {
    id: 'rec-garou-motw',
    title: 'GAROU: MARK OF THE WOLVES',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/366240/library_600x900.jpg',
    bannerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/366240/library_hero.jpg',
    rating: 93,
    releaseDate: '1999-11-26',
    genres: ['Arcade', 'Fighting', 'Action', 'Retro', 'Classic'],
    platforms: ['PC', 'Arcade', 'Neo Geo', 'PlayStation 4', 'Dreamcast'],
    stores: [
      { id: 'steam', name: 'Steam', url: 'https://store.steampowered.com/app/366240/' },
      { id: 'gog', name: 'GOG', url: 'https://www.gog.com/game/garou_mark_of_the_wolves' },
    ],
    description: 'This latest installment in the legendary "FATAL FURY" series welcomes Rock Howard with numerous new game mechanics.',
  },
  {
    id: 'rec-metal-slug-x',
    title: 'METAL SLUG X',
    coverUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/312610/library_600x900.jpg',
    bannerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/312610/library_hero.jpg',
    rating: 92,
    releaseDate: '1999-02-28',
    genres: ['Arcade', 'Action', 'Shooter', 'Retro', 'Classic'],
    platforms: ['PC', 'Arcade', 'Neo Geo', 'PlayStation', 'Nintendo Switch'],
    stores: [
      { id: 'steam', name: 'Steam', url: 'https://store.steampowered.com/app/312610/' },
      { id: 'gog', name: 'GOG', url: 'https://www.gog.com/game/metal_slug_x' },
    ],
    description: 'METAL SLUG X, a masterpiece in 2D action-shooting, continues to fascinate millions of fans worldwide to this day with its intricate dot-pixel graphics!',
  },
];

const STOP_WORDS = new Set(['of', 'the', 'and', 'a', 'an', 'in', 'on', 'for', 'to', 'at', 'by', 'with']);

function romanToNumber(token: string): string {
  const map: Record<string, string> = {
    i: '1',
    ii: '2',
    iii: '3',
    iv: '4',
    v: '5',
    vi: '6',
    vii: '7',
    viii: '8',
    ix: '9',
    x: '10',
  };
  return map[token.toLowerCase()] || token;
}

function buildInitials(wordsList: string[]): string[] {
  if (wordsList.length < 2) return [];

  const map: Record<string, string> = {
    i: '1',
    ii: '2',
    iii: '3',
    iv: '4',
    v: '5',
    vi: '6',
    vii: '7',
    viii: '8',
    ix: '9',
    x: '10',
  };

  const rawInits = wordsList.map((w) => w[0]);
  const numInits = wordsList.map((w) => {
    const num = map[w.toLowerCase()];
    return num ? num : w[0];
  });

  const res = new Set<string>();

  // Literal initials (e.g. gtav, rdr2)
  const rawStr = rawInits.join('');
  res.add(rawStr);
  if (rawInits.length > 1 && /[0-9ivx]/.test(rawInits[rawInits.length - 1])) {
    res.add(`${rawInits.slice(0, -1).join('')} ${rawInits[rawInits.length - 1]}`);
  }

  // Number converted initials (e.g. gta5, gta 5)
  const numStr = numInits.join('');
  res.add(numStr);
  if (numInits.length > 1 && /[0-9]/.test(numInits[numInits.length - 1])) {
    res.add(`${numInits.slice(0, -1).join('')} ${numInits[numInits.length - 1]}`);
  }

  return Array.from(res);
}

/**
 * Dynamically computes title variants, acronyms and search representations
 * e.g., "Counter-Strike: Global Offensive" -> ["csgo", "cs go", "cs", "go", ...]
 * e.g., "Grand Theft Auto V" -> ["gtav", "gta v", "gta5", "gta 5", ...]
 */
export function getTitleVariantsAndAcronyms(title: string): string[] {
  const variants = new Set<string>();

  const clean = title.toLowerCase().replace(/['’]/g, '');
  const normalized = clean.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!normalized) return [];

  variants.add(normalized);
  variants.add(normalized.replace(/\s+/g, ''));

  const allWords = normalized.split(/\s+/).filter(Boolean);
  const significantWords = allWords.filter((w) => !STOP_WORDS.has(w) || allWords.length <= 2);

  for (const acr of buildInitials(allWords)) variants.add(acr);
  for (const acr of buildInitials(significantWords)) variants.add(acr);

  // Subtitle segments: split by ':' or '|' or ' - '
  const segments = clean.split(/\s*[:|]\s*|\s+-\s+/).filter(Boolean);
  if (segments.length > 1) {
    const segInitials: string[] = [];
    for (const seg of segments) {
      const segNormalized = seg.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
      const segWords = segNormalized.split(/\s+/).filter(Boolean);
      const segSignificant = segWords.filter((w) => !STOP_WORDS.has(w) || segWords.length <= 2);

      const inits = buildInitials(segWords);
      const initsSig = buildInitials(segSignificant);
      for (const i of [...inits, ...initsSig]) {
        variants.add(i);
      }
      const primaryInit = inits[0] || initsSig[0];
      if (primaryInit) {
        segInitials.push(primaryInit);
      } else if (segSignificant.length === 1) {
        segInitials.push(segSignificant[0]);
      }
    }
    if (segInitials.length > 1) {
      variants.add(segInitials.join(' ')); // e.g. "cs go"
      variants.add(segInitials.join(''));  // e.g. "csgo"
    }
  }

  // Convert roman numerals in title if present: e.g. "Grand Theft Auto V" -> "Grand Theft Auto 5"
  const romanConverted = allWords.map((w) => romanToNumber(w)).join(' ');
  if (romanConverted !== normalized) {
    variants.add(romanConverted);
    const convertedWords = romanConverted.split(/\s+/).filter(Boolean);
    const convertedSignificant = convertedWords.filter((w) => !STOP_WORDS.has(w) || convertedWords.length <= 2);
    for (const acr of buildInitials(convertedWords)) variants.add(acr);
    for (const acr of buildInitials(convertedSignificant)) variants.add(acr);
  }

  return Array.from(variants).filter(Boolean);
}

/**
 * Calculates store priority score.
 * Games available on Steam, Epic Games, or GOG receive highest priority.
 */
export function getStorePriorityScore(game: RecommendedGame): number {
  const storeIds = game.stores.map((s) => s.id.toLowerCase());
  const hasSteam = storeIds.some((id) => id.includes('steam'));
  const hasEpic = storeIds.some((id) => id.includes('epic'));
  const hasGog = storeIds.some((id) => id.includes('gog'));

  if (hasSteam || hasEpic || hasGog) {
    let score = 10000;
    if (hasSteam) score += 300;
    if (hasEpic) score += 200;
    if (hasGog) score += 100;
    return score;
  }

  return 0;
}

/**
 * Calculates relevance match score for a given query against a game title,
 * acronyms, description, and genres. Returns 0 if there is no genuine match.
 */
export function getGameMatchScore(game: RecommendedGame, query: string): number {
  if (!query.trim()) return 100; // baseline score when no search query

  const qClean = query.toLowerCase().replace(/['’]/g, '');
  const qNorm = qClean.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const qCompact = qNorm.replace(/\s+/g, '');
  const qTokens = qNorm.split(/\s+/).filter(Boolean);

  if (!qNorm) return 100;

  const titleClean = game.title.toLowerCase().replace(/['’]/g, '');
  const titleNorm = titleClean.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const titleCompact = titleNorm.replace(/\s+/g, '');

  // 1. Exact title match
  if (titleNorm === qNorm || titleCompact === qCompact) {
    return 1000;
  }

  // 2. Acronym exact match (e.g. "cs go" or "csgo" matching Counter-Strike: Global Offensive variants)
  const variants = getTitleVariantsAndAcronyms(game.title);
  if (variants.some((v) => v === qNorm || v.replace(/\s+/g, '') === qCompact)) {
    return 900;
  }

  // 3. Title starts with query
  if (titleNorm.startsWith(qNorm)) {
    return 800;
  }

  // 4. Title contains query phrase
  if (titleNorm.includes(qNorm)) {
    return 700;
  }

  // 5. Acronym variant contains or starts with query (if query has at least 2 chars)
  if (qCompact.length >= 2 && variants.some((v) => v.startsWith(qNorm) || v.replace(/\s+/g, '').startsWith(qCompact) || v.includes(qNorm))) {
    return 600;
  }

  // 6. All query tokens present in title words or variants
  const titleTokens = titleNorm.split(/\s+/);
  const allTokensInTitle = qTokens.every((qt) => {
    return titleTokens.some((tt) => tt.includes(qt) || tt.startsWith(qt));
  });
  if (allTokensInTitle) {
    return 500;
  }

  // 7. Multi-token queries: require substantial match (at least 60% of tokens, tokens must be >= 3 chars or exact word)
  if (qTokens.length > 1) {
    const matchedTokens = qTokens.filter((qt) => {
      if (qt.length < 3) {
        return titleTokens.includes(qt);
      }
      return titleTokens.some((tt) => tt.includes(qt));
    });
    if (matchedTokens.length >= Math.ceil(qTokens.length * 0.6)) {
      return 300 + Math.round((matchedTokens.length / qTokens.length) * 100);
    }
  } else if (qTokens.length === 1 && qTokens[0].length >= 3) {
    // Single token >= 3 letters matching part of title
    if (titleTokens.some((tt) => tt.includes(qTokens[0]))) {
      return 400;
    }
  }

  // 8. Matches genre or description
  const descNorm = (game.description || '').toLowerCase();
  const genreMatch = game.genres.some((g) => g.toLowerCase().includes(qNorm));
  if (genreMatch) {
    return 250;
  }
  if (descNorm.includes(qNorm)) {
    return 150;
  }

  return 0; // Exclude non-matches
}

const RAWG_GENRE_MAP: Record<string, string> = {
  rpg: 'role-playing-games-rpg',
  action: 'action',
  'open world': 'adventure',
  roguelike: 'indie',
  'souls-like': 'action',
  shooter: 'shooter',
  strategy: 'strategy',
  indie: 'indie',
  adventure: 'adventure',
  'turn-based': 'strategy',
  arcade: 'arcade',
  fighting: 'fighting',
  racing: 'racing',
  sports: 'sports',
  puzzle: 'puzzle',
  platformer: 'platformer',
  simulation: 'simulation',
};

const RAWG_PLATFORM_MAP: Record<string, string> = {
  pc: '4',
  playstation: '187,18,16,15,27,17,19',
  ps5: '187',
  ps4: '18',
  ps3: '16',
  ps2: '15',
  ps1: '27',
  psp: '17',
  psvita: '19',
  xbox: '186,1,14,80',
  'xbox-series': '186',
  'xbox-one': '1',
  xbox360: '14',
  'xbox-original': '80',
  nintendo: '7,8,9,10,11,13,24,26,43,49,79,83,105',
  switch: '7',
  '3ds': '8',
  ds: '9',
  'wii-u': '10',
  wii: '11',
  gamecube: '105',
  nintendo64: '83',
  gba: '24',
  gbc: '43',
  gameboy: '26',
  snes: '79',
  nes: '49',
  sega: '106,107,167',
  dreamcast: '106',
  saturn: '107',
  retro: '27,15,80,14,79,49,83,105,11,106,107,167,24,26,43,23,12',
  arcade: '23,12',
};

interface LibraryProfile {
  totalGames: number;
  genrePlaytime: Map<string, number>;
  genreFrequency: Map<string, number>;
  topPlaytimeGenres: string[];
  topFrequencyGenres: string[];
  topPlayedGame?: { title: string; minutes: number; genres: string[] };
  recentlyPlayedGame?: { title: string; lastPlayed: string; genres: string[] };
  libraryTitles: Set<string>;
}

function analyzeLibrary(libraryGames?: Game[]): LibraryProfile {
  const genrePlaytime = new Map<string, number>();
  const genreFrequency = new Map<string, number>();
  const libraryTitles = new Set<string>();
  let topPlayedGame: { title: string; minutes: number; genres: string[] } | undefined;
  let recentlyPlayedGame: { title: string; lastPlayed: string; genres: string[] } | undefined;

  if (!libraryGames || libraryGames.length === 0) {
    return {
      totalGames: 0,
      genrePlaytime,
      genreFrequency,
      topPlaytimeGenres: [],
      topFrequencyGenres: [],
      libraryTitles,
    };
  }

  let maxMinutes = 0;
  let latestPlayedTime = 0;

  for (const game of libraryGames) {
    if (game.title) {
      libraryTitles.add(game.title.toLowerCase().trim());
    }

    const minutes = game.playtimeMinutes || 0;
    const gameGenres = (game.genres || []).map((g) => g.trim()).filter(Boolean);

    if (minutes > maxMinutes) {
      maxMinutes = minutes;
      topPlayedGame = { title: game.title, minutes, genres: gameGenres };
    }

    if (game.lastPlayed) {
      const time = new Date(game.lastPlayed).getTime();
      if (!isNaN(time) && time > latestPlayedTime) {
        latestPlayedTime = time;
        recentlyPlayedGame = { title: game.title, lastPlayed: game.lastPlayed, genres: gameGenres };
      }
    }

    for (const g of gameGenres) {
      const gNorm = g.toLowerCase();
      genrePlaytime.set(gNorm, (genrePlaytime.get(gNorm) || 0) + minutes);
      genreFrequency.set(gNorm, (genreFrequency.get(gNorm) || 0) + 1);
    }
  }

  const topPlaytimeGenres = Array.from(genrePlaytime.entries())
    .filter(([_, mins]) => mins > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([g]) => g);

  const topFrequencyGenres = Array.from(genreFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([g]) => g);

  return {
    totalGames: libraryGames.length,
    genrePlaytime,
    genreFrequency,
    topPlaytimeGenres,
    topFrequencyGenres,
    topPlayedGame,
    recentlyPlayedGame,
    libraryTitles,
  };
}

function formatGenreName(g: string): string {
  const map: Record<string, string> = {
    rpg: 'RPG',
    action: 'Action',
    'open world': 'Open World',
    roguelike: 'Roguelike',
    'souls-like': 'Souls-like',
    shooter: 'Shooter / FPS',
    strategy: 'Strategy',
    indie: 'Indie',
    adventure: 'Adventure',
    'turn-based': 'Turn-Based',
    fps: 'FPS',
  };
  return map[g.toLowerCase()] || (g.charAt(0).toUpperCase() + g.slice(1));
}

function computePersonalization(game: RecommendedGame, profile: LibraryProfile): { bonus: number; badge: string } {
  const isOwned = profile.libraryTitles.has(game.title.toLowerCase().trim());
  if (isOwned) {
    return {
      bonus: -1800, // Demote slightly so unowned discovery games appear ahead
      badge: '✓ In Your Library',
    };
  }

  const gameGenresNorm = game.genres.map((g) => g.toLowerCase());

  // Priority 1: Playtime
  for (const favGenre of profile.topPlaytimeGenres) {
    if (gameGenresNorm.some((g) => g.includes(favGenre) || favGenre.includes(g))) {
      const mins = profile.genrePlaytime.get(favGenre) || 0;
      const hours = Math.round(mins / 60);
      // Balanced bonus so favorite genres are favored without locking the exact same static order
      const bonus = Math.min(Math.round(mins * 0.4), 500) + 550;
      const badge = hours >= 1
        ? `⭐ Based on your ${hours}h in ${formatGenreName(favGenre)}`
        : `⭐ Based on your playtime in ${formatGenreName(favGenre)}`;
      return { bonus, badge };
    }
  }

  // Priority 2: Recency (Recently played games)
  if (profile.recentlyPlayedGame) {
    const recentGenres = profile.recentlyPlayedGame.genres.map((g) => g.toLowerCase());
    const matchesRecent = gameGenresNorm.some((g) => recentGenres.some((rg) => rg.includes(g) || g.includes(rg)));
    if (matchesRecent) {
      return {
        bonus: 700,
        badge: `🔥 Similar to ${profile.recentlyPlayedGame.title} (recent)`,
      };
    }
  }

  // Priority 3: Games in library (Genre presence)
  for (const popGenre of profile.topFrequencyGenres) {
    if (gameGenresNorm.some((g) => g.includes(popGenre) || popGenre.includes(g))) {
      return {
        bonus: 450,
        badge: `🎮 Popular in your library (${formatGenreName(popGenre)})`,
      };
    }
  }

  // Priority 4: Universal fallback
  if (game.rating && game.rating >= 90) {
    return {
      bonus: 300,
      badge: `🌟 Acclaimed on Steam (${game.rating}%)`,
    };
  }

  return {
    bonus: 0,
    badge: '🏆 Community Favorite',
  };
}

export class GameDiscoveryService {
  /**
   * Search or list recommended games filtered by platform, store, genre, year range, and personalized by user's library.
   */
  public async getRecommendedGames(options?: {
    platform?: string;
    store?: string;
    genre?: string;
    query?: string;
    yearFrom?: number;
    yearTo?: number;
    rawgApiKey?: string;
    libraryGames?: Game[];
    filterAdult?: boolean;
    excludeTitles?: string[];
  }): Promise<RecommendedGame[]> {
    const {
      platform = 'all',
      store = 'all',
      genre = 'all',
      query = '',
      yearFrom,
      yearTo,
      rawgApiKey,
      libraryGames,
      filterAdult = true,
      excludeTitles = [],
    } = options || {};

    const excludeSet = new Set(excludeTitles.map((t) => t.toLowerCase().trim()).filter(Boolean));
    const profile = analyzeLibrary(libraryGames);
    let list: (RecommendedGame & { isFromRawg?: boolean })[] = [...POPULAR_CURATED_GAMES];

    // If a RAWG API Key is provided, fetch dynamic live games from RAWG!
    if (rawgApiKey) {
      try {
        const liveGames = await this.fetchFromRawg({
          platform,
          genre,
          query,
          yearFrom,
          yearTo,
          apiKey: rawgApiKey,
        });
        if (liveGames.length > 0) {
          const markedLiveGames = liveGames.map((g) => ({ ...g, isFromRawg: true }));
          // Combine live games with curated games to ensure rich pool of at least 40 items
          const liveTitles = new Set(liveGames.map((g) => g.title.toLowerCase()));
          const extraCurated = POPULAR_CURATED_GAMES.filter((g) => !liveTitles.has(g.title.toLowerCase()));
          list = [...markedLiveGames, ...extraCurated];
        }
      } catch (err) {
        console.warn('Failed to query RAWG API, using curated fallback:', err);
      }
    }

    // Apply client-side filters, scoring, and store prioritization
    const scoredList = list
      .map((game) => {
        // Platform filter:
        // If the game came directly from RAWG and RAWG was already queried with this platform, trust RAWG's server-side filter.
        // Otherwise (or for curated fallbacks), apply client-side platform matching.
        if (platform !== 'all' && (!game.isFromRawg || !RAWG_PLATFORM_MAP[platform.toLowerCase()])) {
          const pNorm = platform.toLowerCase();
          const matchesPlatform = game.platforms.some((p) => {
            const pL = p.toLowerCase();
            if (pNorm === 'pc') return pL.includes('pc') || pL.includes('windows');
            if (pNorm === 'ps5') return pL.includes('ps5') || pL.includes('playstation 5');
            if (pNorm === 'ps4') return pL.includes('ps4') || pL.includes('playstation 4');
            if (pNorm === 'ps3') return pL.includes('ps3') || pL.includes('playstation 3');
            if (pNorm === 'ps2') return pL.includes('ps2') || pL.includes('playstation 2');
            if (pNorm === 'ps1') return pL.includes('ps1') || pL.includes('playstation 1') || pL.includes('psx');
            if (pNorm === 'psp') return pL.includes('psp') || pL.includes('portable');
            if (pNorm === 'psvita') return pL.includes('vita');
            if (pNorm === 'playstation') return pL.includes('playstation') || pL.includes('ps');
            if (pNorm === 'xbox-series') return pL.includes('series') || pL.includes('xbox series');
            if (pNorm === 'xbox-one') return pL.includes('xbox one');
            if (pNorm === 'xbox360') return pL.includes('360');
            if (pNorm === 'xbox-original') return pL.includes('xbox') && !pL.includes('360') && !pL.includes('one') && !pL.includes('series');
            if (pNorm === 'xbox') return pL.includes('xbox');
            if (pNorm === 'switch') return pL.includes('switch');
            if (pNorm === '3ds') return pL.includes('3ds');
            if (pNorm === 'ds') return pL.includes('ds') && !pL.includes('3ds');
            if (pNorm === 'wii-u') return pL.includes('wii u');
            if (pNorm === 'wii') return pL.includes('wii') && !pL.includes('wii u');
            if (pNorm === 'gamecube') return pL.includes('gamecube') || pL.includes('cube');
            if (pNorm === 'nintendo64') return pL.includes('n64') || pL.includes('nintendo 64');
            if (pNorm === 'gba') return pL.includes('advance') || pL.includes('gba');
            if (pNorm === 'gbc') return pL.includes('game boy color') || pL.includes('gbc');
            if (pNorm === 'gameboy') return pL.includes('game boy') || pL.includes('gameboy');
            if (pNorm === 'snes') return pL.includes('snes') || pL.includes('super nintendo');
            if (pNorm === 'nes') return pL.includes('nes') || pL.includes('nintendo entertainment');
            if (pNorm === 'nintendo') return pL.includes('nintendo') || pL.includes('switch') || pL.includes('game boy') || pL.includes('wii') || pL.includes('snes');
            if (pNorm === 'dreamcast') return pL.includes('dreamcast');
            if (pNorm === 'saturn') return pL.includes('saturn');
            if (pNorm === 'genesis') return pL.includes('genesis') || pL.includes('mega drive');
            if (pNorm === 'sega') return pL.includes('sega') || pL.includes('dreamcast') || pL.includes('saturn') || pL.includes('genesis');
            if (pNorm === 'arcade') return pL.includes('arcade') || pL.includes('mame') || pL.includes('neo geo') || pL.includes('neogeo');
            if (pNorm === 'retro') return (!pL.includes('ps5') && !pL.includes('series') && !pL.includes('ps4')) || pL.includes('arcade') || pL.includes('retro');
            return pL.includes(pNorm);
          });
          if (!matchesPlatform) return null;
        }

        // Store filter
        if (store !== 'all') {
          const sNorm = store.toLowerCase();
          const hasStore = game.stores.some((s) => s.id.toLowerCase() === sNorm || s.name.toLowerCase().includes(sNorm));
          if (!hasStore) return null;
        }

        // Genre filter:
        // If the game came directly from RAWG and RAWG was already queried with this genre, trust RAWG's server-side filter.
        if (genre !== 'all' && (!game.isFromRawg || !RAWG_GENRE_MAP[genre.toLowerCase()])) {
          const gNorm = genre.toLowerCase();
          const hasGenre = game.genres.some((g) => g.toLowerCase().includes(gNorm));
          if (!hasGenre) return null;
        }

        // Year range filter
        if (yearFrom || yearTo) {
          if (game.releaseDate) {
            const releaseYear = parseInt(game.releaseDate.substring(0, 4), 10);
            if (!isNaN(releaseYear)) {
              if (yearFrom && releaseYear < yearFrom) return null;
              if (yearTo && releaseYear > yearTo) return null;
            }
          }
        }

        // Relevance match score
        const matchScore = getGameMatchScore(game, query);
        if (query.trim() && matchScore === 0) {
          return null; // Exclude non-matching games
        }

        // Adult / NSFW content filter
        if (filterAdult) {
          const adultRegex = /\b(hentai|erotic|erotica|nsfw|porn|xxx|r18|r-18|waifu strip|strip poker|adult only|adults only)\b/i;
          const hasAdultGenre = game.genres.some((g) => adultRegex.test(g));
          const hasAdultTitle = adultRegex.test(game.title);
          const hasAdultDesc = game.description ? adultRegex.test(game.description) : false;
          if (hasAdultGenre || hasAdultTitle || hasAdultDesc) {
            return null;
          }
        }

        // Personalization calculation (Playtime -> Recency -> Library -> Fallback)
        const personalization = computePersonalization(game, profile);
        game.recommendationBadge = personalization.badge;

        // Store priority score (Steam, Epic Games, GOG prioritized first)
        const storeScore = getStorePriorityScore(game);

        // Rating quality bonus (reward high scores >= 75, demote low scores < 70)
        const rating = game.rating || 80;
        let ratingBonus = 0;
        if (rating >= 90) ratingBonus = 1100;
        else if (rating >= 85) ratingBonus = 850;
        else if (rating >= 80) ratingBonus = 600;
        else if (rating >= 75) ratingBonus = 350;
        else if (rating < 70) ratingBonus = -900;

        // Relevance tiering + Controlled Randomization (Jitter)
        // Direct title matches (matchScore >= 600) stay at the very top;
        // broad/genre searches and discovery browsing get controlled randomization among high-rated matches.
        const isDirectTitleMatch = query.trim().length > 0 && matchScore >= 600;
        const relevanceWeight = isDirectTitleMatch ? matchScore * 8 : matchScore * 2.5;
        const randomJitter = isDirectTitleMatch
          ? Math.random() * 220
          : rating >= 75
          ? Math.random() * 1450
          : Math.random() * 300;

        const wasRecentlyShown = !isDirectTitleMatch && excludeSet.has(game.title.toLowerCase().trim());
        const rotationPenalty = wasRecentlyShown ? -850 : 0;

        const totalScore =
          storeScore +
          relevanceWeight +
          personalization.bonus +
          ratingBonus +
          randomJitter +
          rotationPenalty;

        return { game, totalScore };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    // Sort descending by totalScore (Steam/Epic/GOG first, then best relevance match, high rating & organic jitter)
    scoredList.sort((a, b) => b.totalScore - a.totalScore);

    // Ensure up to 40 games
    return scoredList.slice(0, 40).map((item) => item.game);
  }

  /**
   * Search RAWG live API
   */
  private async fetchFromRawg(params: {
    platform?: string;
    genre?: string;
    query?: string;
    yearFrom?: number;
    yearTo?: number;
    apiKey: string;
  }): Promise<RecommendedGame[]> {
    const url = new URL('https://api.rawg.io/api/games');
    url.searchParams.set('key', params.apiKey);
    url.searchParams.set('page_size', '40');

    // Genre filter
    if (params.genre && params.genre !== 'all') {
      const gKey = params.genre.toLowerCase();
      const rawgSlug = RAWG_GENRE_MAP[gKey] || gKey.replace(/\s+/g, '-');
      url.searchParams.set('genres', rawgSlug);
    }

    // Platform filter
    if (params.platform && params.platform !== 'all') {
      const pId = RAWG_PLATFORM_MAP[params.platform.toLowerCase()];
      if (pId) {
        url.searchParams.set('platforms', pId);
      }
    }

    // Year range filter
    if (params.yearFrom || params.yearTo) {
      const from = params.yearFrom ? `${params.yearFrom}-01-01` : '1980-01-01';
      const to = params.yearTo ? `${params.yearTo}-12-31` : '2030-12-31';
      url.searchParams.set('dates', `${from},${to}`);
    }

    if (params.query?.trim()) {
      url.searchParams.set('search', params.query.trim());
      url.searchParams.set('search_precise', 'true');
    } else {
      // Vary ordering/page among top-rated and most popular pools so repeated refreshes surface fresh high-scoring games
      const orderings = ['-added', '-rating', '-metacritic'];
      const chosenOrdering = orderings[Math.floor(Math.random() * orderings.length)];
      url.searchParams.set('ordering', chosenOrdering);
      if (!params.yearFrom && !params.yearTo && Math.random() < 0.45) {
        url.searchParams.set('page', '2');
      }
    }

    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'AegisHub/1.0' },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      throw new Error(`RAWG error: HTTP ${res.status}`);
    }

    const data = await res.json();
    const results: RawgGameResult[] = data.results || [];

    return results.map((g) => {
      const stores: StoreLinkItem[] = [];
      const platforms = (g.platforms || []).map((p) => p.platform.name);

      // Guess or map store URLs
      const slug = (g.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      for (const st of g.stores || []) {
        const sSlug = st.store.slug;
        if (sSlug === 'steam') {
          stores.push({ id: 'steam', name: 'Steam', url: `https://store.steampowered.com/search/?term=${encodeURIComponent(g.name)}` });
        } else if (sSlug === 'epic-games') {
          stores.push({ id: 'epic', name: 'Epic Games', url: `https://store.epicgames.com/en-US/browse?q=${encodeURIComponent(g.name)}` });
        } else if (sSlug === 'gog') {
          stores.push({ id: 'gog', name: 'GOG', url: `https://www.gog.com/games?query=${encodeURIComponent(g.name)}` });
        } else if (sSlug === 'playstation-store') {
          stores.push({ id: 'playstation', name: 'PlayStation', url: `https://store.playstation.com/en-us/search/${encodeURIComponent(g.name)}` });
        } else if (sSlug === 'xbox-store' || sSlug === 'xbox360') {
          stores.push({ id: 'xbox', name: 'Xbox', url: `https://www.xbox.com/search?q=${encodeURIComponent(g.name)}` });
        } else if (sSlug === 'nintendo') {
          stores.push({ id: 'nintendo', name: 'Nintendo eShop', url: `https://www.nintendo.com/search/#q=${encodeURIComponent(g.name)}` });
        }
      }

      // Default store lookup if none provided
      if (stores.length === 0) {
        stores.push({ id: 'steam', name: 'Steam', url: `https://store.steampowered.com/search/?term=${encodeURIComponent(g.name)}` });
      }

      return {
        id: `rawg-${g.id}`,
        title: g.name,
        coverUrl: g.background_image || '',
        bannerUrl: g.short_screenshots?.[0]?.image || g.background_image,
        rating: g.rating ? Math.round(g.rating * 20) : undefined, // Convert 0-5 to 0-100%
        releaseDate: g.released,
        genres: (g.genres || []).map((ge) => ge.name),
        platforms: platforms.length > 0 ? platforms : ['PC'],
        stores,
      };
    });
  }

  /**
   * Helper to enrich any game title with accurate official store links
   */
  public generateStoreLinksForGame(title: string, platforms: string[] = ['PC']): StoreLinkItem[] {
    const encoded = encodeURIComponent(title);
    const links: StoreLinkItem[] = [
      { id: 'steam', name: 'Steam', url: `https://store.steampowered.com/search/?term=${encoded}` },
      { id: 'epic', name: 'Epic Games', url: `https://store.epicgames.com/en-US/browse?q=${encoded}` },
      { id: 'gog', name: 'GOG Galaxy', url: `https://www.gog.com/games?query=${encoded}` },
    ];

    const isConsole = platforms.some((p) => {
      const pl = p.toLowerCase();
      return pl.includes('playstation') || pl.includes('xbox') || pl.includes('nintendo') || pl.includes('switch');
    });

    if (isConsole) {
      if (platforms.some((p) => p.toLowerCase().includes('playstation'))) {
        links.push({ id: 'playstation', name: 'PlayStation Store', url: `https://store.playstation.com/en-us/search/${encoded}` });
      }
      if (platforms.some((p) => p.toLowerCase().includes('xbox'))) {
        links.push({ id: 'xbox', name: 'Xbox Store', url: `https://www.xbox.com/search?q=${encoded}` });
      }
      if (platforms.some((p) => p.toLowerCase().includes('nintendo') || p.toLowerCase().includes('switch'))) {
        links.push({ id: 'nintendo', name: 'Nintendo eShop', url: `https://www.nintendo.com/search/#q=${encoded}` });
      }
    }

    return links;
  }
}

export const gameDiscoveryService = new GameDiscoveryService();
