import { Award, Coins, Compass, Play, Settings, ShoppingBag, Trophy } from 'lucide-react';
import { CHARACTERS, WORLD_MAP } from '../data/gameData';
import { canClaimDailyReward } from '../storage/saveSystem';
import type { SaveData } from '../types/game';

export type MenuModalType = 'shop' | 'worlds' | 'missions' | 'settings' | null;

interface MainMenuOverlayProps {
  save: SaveData;
  onPlay: () => void;
  onOpenModal: (modal: MenuModalType) => void;
}

export function MainMenuOverlay({ save, onPlay, onOpenModal }: MainMenuOverlayProps) {
  const world = WORLD_MAP[save.selectedWorld];
  const char = CHARACTERS.find((c) => c.id === save.selectedCharacter) ?? CHARACTERS[0];
  const rewardReady = canClaimDailyReward(save);

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-4 sm:p-6 pt-safe pb-safe">
      {/* Top Bar: Brand & Player Balances */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="pointer-events-auto bg-[#111318]/85 border border-white/12 rounded-2xl px-4 py-3 shadow-xl">
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-wide text-amber-400">
            NEPAL RUNNER 3D
          </h1>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-stone-300">
            <span className="font-semibold text-white">{world.name}</span>
            <span aria-hidden="true">·</span>
            <span>{char.name}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-num">Level {save.level}</span>
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-2.5">
          <div className="bg-[#111318]/85 border border-white/12 rounded-2xl px-3.5 py-2.5 flex items-center gap-4 shadow-xl">
            <div className="flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-amber-400" />
              <span className="font-mono-num text-sm sm:text-base font-bold text-amber-300">
                {save.totalCoins.toLocaleString()}
              </span>
            </div>
            <span className="text-white/20" aria-hidden="true">
              |
            </span>
            <div className="flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-emerald-400" />
              <span className="font-mono-num text-sm sm:text-base font-bold text-stone-100">
                {save.bestDistance.toLocaleString()}m
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpenModal('settings')}
            aria-label="Open settings"
            className="min-w-[46px] min-h-[46px] flex items-center justify-center rounded-2xl bg-[#111318]/90 hover:bg-[#1c202a] border border-white/12 text-stone-100 shadow-xl transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Bottom Ergonomic Dock (keeps center 3D character unobstructed) */}
      <div className="pointer-events-auto self-center w-full max-w-xl flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={onPlay}
          className="w-full sm:w-80 min-h-[54px] rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-[#111318] font-display font-extrabold text-xl tracking-wider flex items-center justify-center gap-3 shadow-2xl transition-all"
        >
          <Play className="w-6 h-6 fill-current" />
          RUN NOW
        </button>

        <nav
          aria-label="Game sections"
          className="w-full grid grid-cols-4 gap-2 bg-[#111318]/90 border border-white/12 rounded-2xl p-2 shadow-2xl"
        >
          <button
            type="button"
            onClick={() => onOpenModal('shop')}
            className="min-h-[48px] rounded-xl hover:bg-white/10 active:scale-95 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm font-semibold text-stone-100 transition-all"
          >
            <ShoppingBag className="w-4 h-4 text-amber-400" />
            <span>Shop</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenModal('worlds')}
            className="min-h-[48px] rounded-xl hover:bg-white/10 active:scale-95 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm font-semibold text-stone-100 transition-all"
          >
            <Compass className="w-4 h-4 text-sky-400" />
            <span>Worlds</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenModal('missions')}
            className="min-h-[48px] rounded-xl hover:bg-white/10 active:scale-95 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm font-semibold text-stone-100 transition-all"
          >
            <Award className={`w-4 h-4 ${rewardReady ? 'text-amber-300' : 'text-emerald-400'}`} />
            <span>{rewardReady ? 'Rewards*' : 'Missions'}</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenModal('settings')}
            className="min-h-[48px] rounded-xl hover:bg-white/10 active:scale-95 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm font-semibold text-stone-100 transition-all"
          >
            <Settings className="w-4 h-4 text-stone-300" />
            <span>Settings</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
