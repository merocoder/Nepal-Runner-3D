import { Check, Coins, Lock, MapPin, X } from 'lucide-react';
import { WORLDS } from '../data/gameData';
import type { SaveData, WorldId } from '../types/game';

interface WorldsModalProps {
  save: SaveData;
  onClose: () => void;
  onSelectOrUnlockWorld: (id: WorldId) => void;
}

export function WorldsModal({ save, onClose, onSelectOrUnlockWorld }: WorldsModalProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-6 bg-black/65">
      <div className="w-full max-w-3xl max-h-[88vh] flex flex-col bg-[#13161d] border border-white/15 rounded-3xl text-[#faf7f2] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-white/10">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-bold">Nepali Worlds</h2>
            <p className="text-xs text-stone-400">
              Choose your destination across temples, jungles, and Himalayan peaks
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-[#1d212b] border border-white/10 rounded-xl px-3 py-1.5">
              <Coins className="w-4 h-4 text-amber-400" />
              <span className="font-mono-num text-sm font-bold text-amber-300">
                {save.totalCoins.toLocaleString()}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close worlds"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-[#1d212b] hover:bg-[#262b38] border border-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 gap-3.5">
          {WORLDS.map((world, idx) => {
            const unlocked = save.unlockedWorlds.includes(world.id);
            const selected = save.selectedWorld === world.id;
            const affordable = save.totalCoins >= world.unlockCost;

            return (
              <div
                key={world.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border transition-colors ${
                  selected
                    ? 'bg-[#1d2330] border-amber-400/70'
                    : 'bg-[#191d26] border-white/10'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-xs text-stone-400">
                    <MapPin className="w-3.5 h-3.5" style={{ color: world.accentColor }} />
                    <span>World {idx + 1}</span>
                    <span aria-hidden="true">·</span>
                    <span>{world.subtitle}</span>
                  </div>
                  <h3 className="mt-1 text-lg font-bold text-white">{world.name}</h3>
                  <p className="mt-1 text-xs text-stone-300 leading-relaxed max-w-xl">
                    {world.description}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={!unlocked && !affordable}
                  onClick={() => onSelectOrUnlockWorld(world.id)}
                  className={`min-h-[46px] sm:min-w-[170px] px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all shrink-0 ${
                    selected
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                      : unlocked
                        ? 'bg-white/10 hover:bg-white/15 text-white'
                        : affordable
                          ? 'bg-amber-500 hover:bg-amber-400 text-[#111318]'
                          : 'bg-white/5 text-stone-500 cursor-not-allowed'
                  }`}
                >
                  {selected ? (
                    <>
                      <Check className="w-4 h-4" /> Active World
                    </>
                  ) : unlocked ? (
                    'Select World'
                  ) : (
                    <>
                      <Lock className="w-4 h-4" /> {world.unlockCost.toLocaleString()} Coins
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
