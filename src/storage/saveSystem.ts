import {
  CHARACTERS,
  DAILY_REWARDS,
  MISSIONS,
  OUTFITS,
  WORLDS,
} from '../data/gameData';
import type {
  CharacterId,
  GameSettings,
  OutfitId,
  RunSummary,
  SaveData,
  WorldId,
} from '../types/game';

const STORAGE_KEY = 'nepal_runner_3d_save_v1';

function getTodayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getWeekKey(): string {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now.getTime() - jan1.getTime()) / 86400000);
  const week = Math.ceil((days + jan1.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function getXpForNextLevel(level: number): number {
  return 150 + (level - 1) * 110;
}

export function createDefaultSaveData(): SaveData {
  return {
    totalCoins: 150,
    bestDistance: 0,
    bestScore: 0,
    totalDistance: 0,
    runsCount: 0,
    xp: 0,
    level: 1,
    selectedWorld: 'temple',
    unlockedWorlds: ['temple'],
    selectedCharacter: 'trekker',
    unlockedCharacters: ['trekker'],
    selectedOutfit: 'trekking',
    unlockedOutfits: ['trekking'],
    missionProgress: {},
    claimedMissions: [],
    dailyResetKey: getTodayKey(),
    weeklyResetKey: getWeekKey(),
    dailyRewardDay: 0,
    lastDailyClaimDate: '',
    settings: {
      soundEnabled: true,
      musicEnabled: true,
      vibrationEnabled: true,
      quality: 'high',
    },
  };
}

const VALID_WORLDS = new Set<WorldId>(WORLDS.map((w) => w.id));
const VALID_CHARS = new Set<CharacterId>(CHARACTERS.map((c) => c.id));
const VALID_OUTFITS = new Set<OutfitId>(OUTFITS.map((o) => o.id));

function sanitizeSaveData(raw: unknown): SaveData {
  const defaults = createDefaultSaveData();
  if (!raw || typeof raw !== 'object') {
    return defaults;
  }

  const obj = raw as Record<string, unknown>;
  const safeNum = (val: unknown, fallback: number, min = 0) =>
    typeof val === 'number' && Number.isFinite(val) && val >= min ? Math.floor(val) : fallback;

  const unlockedWorlds = Array.isArray(obj.unlockedWorlds)
    ? (obj.unlockedWorlds.filter((id): id is WorldId => typeof id === 'string' && VALID_WORLDS.has(id as WorldId)))
    : defaults.unlockedWorlds;
  if (!unlockedWorlds.includes('temple')) unlockedWorlds.unshift('temple');

  const unlockedCharacters = Array.isArray(obj.unlockedCharacters)
    ? (obj.unlockedCharacters.filter(
        (id): id is CharacterId => typeof id === 'string' && VALID_CHARS.has(id as CharacterId)
      ))
    : defaults.unlockedCharacters;
  if (!unlockedCharacters.includes('trekker')) unlockedCharacters.unshift('trekker');

  const unlockedOutfits = Array.isArray(obj.unlockedOutfits)
    ? (obj.unlockedOutfits.filter(
        (id): id is OutfitId => typeof id === 'string' && VALID_OUTFITS.has(id as OutfitId)
      ))
    : defaults.unlockedOutfits;
  if (!unlockedOutfits.includes('trekking')) unlockedOutfits.unshift('trekking');

  const selectedWorld =
    typeof obj.selectedWorld === 'string' && unlockedWorlds.includes(obj.selectedWorld as WorldId)
      ? (obj.selectedWorld as WorldId)
      : 'temple';

  const selectedCharacter =
    typeof obj.selectedCharacter === 'string' &&
    unlockedCharacters.includes(obj.selectedCharacter as CharacterId)
      ? (obj.selectedCharacter as CharacterId)
      : 'trekker';

  const selectedOutfit =
    typeof obj.selectedOutfit === 'string' &&
    unlockedOutfits.includes(obj.selectedOutfit as OutfitId)
      ? (obj.selectedOutfit as OutfitId)
      : 'trekking';

  const rawProgress =
    obj.missionProgress && typeof obj.missionProgress === 'object'
      ? (obj.missionProgress as Record<string, unknown>)
      : {};
  const missionProgress: Record<string, number> = {};
  for (const [k, v] of Object.entries(rawProgress)) {
    if (typeof v === 'number' && Number.isFinite(v) && v >= 0) {
      missionProgress[k] = Math.floor(v);
    }
  }

  const claimedMissions = Array.isArray(obj.claimedMissions)
    ? obj.claimedMissions.filter((id): id is string => typeof id === 'string')
    : [];

  const rawSettings =
    obj.settings && typeof obj.settings === 'object' ? (obj.settings as Record<string, unknown>) : {};
  const settings: GameSettings = {
    soundEnabled:
      typeof rawSettings.soundEnabled === 'boolean'
        ? rawSettings.soundEnabled
        : defaults.settings.soundEnabled,
    musicEnabled:
      typeof rawSettings.musicEnabled === 'boolean'
        ? rawSettings.musicEnabled
        : defaults.settings.musicEnabled,
    vibrationEnabled:
      typeof rawSettings.vibrationEnabled === 'boolean'
        ? rawSettings.vibrationEnabled
        : defaults.settings.vibrationEnabled,
    quality: rawSettings.quality === 'balanced' ? 'balanced' : 'high',
  };

  let data: SaveData = {
    totalCoins: safeNum(obj.totalCoins, defaults.totalCoins),
    bestDistance: safeNum(obj.bestDistance, defaults.bestDistance),
    bestScore: safeNum(obj.bestScore, defaults.bestScore),
    totalDistance: safeNum(obj.totalDistance, defaults.totalDistance),
    runsCount: safeNum(obj.runsCount, defaults.runsCount),
    xp: safeNum(obj.xp, defaults.xp),
    level: safeNum(obj.level, defaults.level, 1),
    selectedWorld,
    unlockedWorlds: Array.from(new Set(unlockedWorlds)),
    selectedCharacter,
    unlockedCharacters: Array.from(new Set(unlockedCharacters)),
    selectedOutfit,
    unlockedOutfits: Array.from(new Set(unlockedOutfits)),
    missionProgress,
    claimedMissions: Array.from(new Set(claimedMissions)),
    dailyResetKey: typeof obj.dailyResetKey === 'string' ? obj.dailyResetKey : getTodayKey(),
    weeklyResetKey: typeof obj.weeklyResetKey === 'string' ? obj.weeklyResetKey : getWeekKey(),
    dailyRewardDay: safeNum(obj.dailyRewardDay, 0) % 7,
    lastDailyClaimDate: typeof obj.lastDailyClaimDate === 'string' ? obj.lastDailyClaimDate : '',
    settings,
  };

  data = refreshPeriodicMissions(data);
  return data;
}

export function refreshPeriodicMissions(data: SaveData): SaveData {
  const today = getTodayKey();
  const week = getWeekKey();
  let changed = false;

  const nextProgress = { ...data.missionProgress };
  let nextClaimed = [...data.claimedMissions];

  if (data.dailyResetKey !== today) {
    changed = true;
    for (const m of MISSIONS) {
      if (m.period === 'daily') {
        delete nextProgress[m.id];
        nextClaimed = nextClaimed.filter((id) => id !== m.id);
      }
    }
  }

  if (data.weeklyResetKey !== week) {
    changed = true;
    for (const m of MISSIONS) {
      if (m.period === 'weekly') {
        delete nextProgress[m.id];
        nextClaimed = nextClaimed.filter((id) => id !== m.id);
      }
    }
  }

  if (!changed) return data;
  return {
    ...data,
    missionProgress: nextProgress,
    claimedMissions: nextClaimed,
    dailyResetKey: today,
    weeklyResetKey: week,
  };
}

export function loadSaveData(): SaveData {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const fresh = createDefaultSaveData();
      persistSaveData(fresh);
      return fresh;
    }
    const parsed = JSON.parse(raw);
    const sanitized = sanitizeSaveData(parsed);
    persistSaveData(sanitized);
    return sanitized;
  } catch {
    const fresh = createDefaultSaveData();
    persistSaveData(fresh);
    return fresh;
  }
}

export function persistSaveData(data: SaveData): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors in restricted webviews
  }
}

export function addExperience(data: SaveData, gainedXp: number): SaveData {
  let xp = data.xp + Math.max(0, Math.floor(gainedXp));
  let level = data.level;
  while (xp >= getXpForNextLevel(level)) {
    xp -= getXpForNextLevel(level);
    level += 1;
  }
  return { ...data, xp, level };
}

export function applyRunToSaveData(current: SaveData, run: RunSummary): SaveData {
  const refreshed = refreshPeriodicMissions(current);
  const nextProgress = { ...refreshed.missionProgress };

  for (const m of MISSIONS) {
    const prev = nextProgress[m.id] ?? 0;
    let delta = 0;
    let singleRunBest = 0;

    switch (m.metric) {
      case 'distance':
        delta = run.distance;
        break;
      case 'coins_total':
        delta = run.coins;
        break;
      case 'coins_run':
        singleRunBest = run.coins;
        break;
      case 'jumps':
        delta = run.jumps;
        break;
      case 'slides':
        delta = run.slides;
        break;
      case 'survive_seconds':
        singleRunBest = Math.floor(run.durationSeconds);
        break;
      case 'turns':
        delta = run.turns;
        break;
      case 'powerups':
        delta = run.powerUpsCollected;
        break;
    }

    if (m.metric === 'coins_run' || m.metric === 'survive_seconds') {
      nextProgress[m.id] = Math.min(m.target, Math.max(prev, singleRunBest));
    } else {
      nextProgress[m.id] = Math.min(m.target, prev + delta);
    }
  }

  const xpEarned = Math.floor(run.distance * 0.25 + run.coins * 0.5);
  const withXp = addExperience(
    {
      ...refreshed,
      totalCoins: refreshed.totalCoins + run.coins,
      bestDistance: Math.max(refreshed.bestDistance, run.distance),
      bestScore: Math.max(refreshed.bestScore, run.score),
      totalDistance: refreshed.totalDistance + run.distance,
      runsCount: refreshed.runsCount + 1,
      missionProgress: nextProgress,
    },
    xpEarned
  );

  persistSaveData(withXp);
  return withXp;
}

export function canClaimDailyReward(data: SaveData): boolean {
  return data.lastDailyClaimDate !== getTodayKey();
}

export function claimDailyReward(data: SaveData): SaveData {
  if (!canClaimDailyReward(data)) return data;
  const reward = DAILY_REWARDS[data.dailyRewardDay % DAILY_REWARDS.length];
  const updated = addExperience(
    {
      ...data,
      totalCoins: data.totalCoins + reward.coins,
      dailyRewardDay: (data.dailyRewardDay + 1) % DAILY_REWARDS.length,
      lastDailyClaimDate: getTodayKey(),
    },
    50
  );
  persistSaveData(updated);
  return updated;
}

export function resetAllProgress(): SaveData {
  const fresh = createDefaultSaveData();
  persistSaveData(fresh);
  return fresh;
}
