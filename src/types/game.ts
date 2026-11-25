export type WorldId = 'temple' | 'himalaya' | 'jungle' | 'kathmandu' | 'everest';

export type CharacterId =
  | 'trekker'
  | 'traditional'
  | 'football'
  | 'student'
  | 'himalayan_exp'
  | 'jungle_exp'
  | 'golden';

export type OutfitId =
  | 'trekking'
  | 'traditional_outfit'
  | 'snow_outfit'
  | 'jungle_outfit'
  | 'golden_outfit';

export type PowerUpType = 'magnet' | 'shield' | 'speed' | 'double_coins' | 'super_jump';

export type GamePhase = 'menu' | 'playing' | 'paused' | 'gameover';

export type MissionPeriod = 'daily' | 'weekly' | 'achievement';

export type MissionMetric =
  | 'distance'
  | 'coins_total'
  | 'coins_run'
  | 'jumps'
  | 'slides'
  | 'survive_seconds'
  | 'turns'
  | 'powerups';

export interface WorldConfig {
  id: WorldId;
  name: string;
  subtitle: string;
  description: string;
  unlockCost: number;
  skyTop: number;
  skyHorizon: number;
  fogColor: number;
  fogDensity: number;
  sunColor: number;
  sunIntensity: number;
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  groundColor: number;
  pathColor: number;
  trimColor: number;
  accentColor: string;
  badgeColor: string;
  hasSnow?: boolean;
}

export interface CharacterConfig {
  id: CharacterId;
  name: string;
  title: string;
  description: string;
  cost: number;
  defaultOutfit: OutfitId;
  skinTone: number;
  hairColor: number;
  hatStyle: 'cap' | 'dhaka_topi' | 'headband' | 'none' | 'fur_hood' | 'safari' | 'crown';
  backpackStyle: 'trek' | 'satchel' | 'none' | 'expedition' | 'royal_cape';
}

export interface OutfitConfig {
  id: OutfitId;
  name: string;
  description: string;
  cost: number;
  torsoColor: number;
  accentColor: number;
  pantsColor: number;
  shoeColor: number;
  scarfColor: number;
  metalness?: number;
  roughness?: number;
}

export interface MissionConfig {
  id: string;
  title: string;
  period: MissionPeriod;
  metric: MissionMetric;
  target: number;
  rewardCoins: number;
  rewardXp: number;
}

export interface GameSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  vibrationEnabled: boolean;
  quality: 'high' | 'balanced';
}

export interface SaveData {
  totalCoins: number;
  bestDistance: number;
  bestScore: number;
  totalDistance: number;
  runsCount: number;
  xp: number;
  level: number;
  selectedWorld: WorldId;
  unlockedWorlds: WorldId[];
  selectedCharacter: CharacterId;
  unlockedCharacters: CharacterId[];
  selectedOutfit: OutfitId;
  unlockedOutfits: OutfitId[];
  missionProgress: Record<string, number>;
  claimedMissions: string[];
  dailyResetKey: string;
  weeklyResetKey: string;
  dailyRewardDay: number;
  lastDailyClaimDate: string;
  settings: GameSettings;
}

export interface ActivePowerUp {
  type: PowerUpType;
  remaining: number;
  duration: number;
}

export interface HudSnapshot {
  distance: number;
  coins: number;
  score: number;
  speed: number;
  dangerLevel: number; // 0 = safe, 1 = creature very close
  hasShield: boolean;
  activePowerUps: ActivePowerUp[];
  turnPrompt: 'left' | 'right' | 'choice' | null;
}

export interface RunSummary {
  distance: number;
  coins: number;
  score: number;
  durationSeconds: number;
  jumps: number;
  slides: number;
  turns: number;
  powerUpsCollected: number;
  isNewBestDistance: boolean;
  isNewBestScore: boolean;
  reason: 'obstacle' | 'fell' | 'caught';
  worldId: WorldId;
}
