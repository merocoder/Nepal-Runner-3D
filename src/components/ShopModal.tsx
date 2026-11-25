import { Check, Coins, Lock, X } from 'lucide-react';
import { useState } from 'react';
import { CHARACTERS, OUTFITS } from '../data/gameData';
import type { CharacterId, OutfitId, SaveData } from '../types/game';

interface ShopModalProps {
  save: SaveData;
  onClose: () => void;
  onSelectOrBuyCharacter: (id: CharacterId) => void;
  onSelectOrBuyOutfit: (id: OutfitId) => void;
}

export function ShopModal({
  save,
  onClose,
  onSelectOrBuyCharacter,
  onSelectOrBuyOutfit,
}: ShopModalProps) {
  const [tab, setTab] = useState<'characters' | 'outfits'>('characters');

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-6 bg-black/65">
      <div className="w-full max-w-3xl max-h-[88vh] flex flex-col bg-[#13161d] border border-white/15 rounded-3xl text-[#faf7f2] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-white/10">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-bold">Adventurer Shop</h2>
            <p className="text-xs text-stone-400">Unlock Nepali runners and traditional attire</p>
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
              aria-label="Close shop"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-[#1d212b] hover:bg-[#262b38] border border-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="px-5 pt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTab('characters')}
            className={`min-h-[42px] px-4 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
              tab === 'characters'
                ? 'bg-amber-500 text-[#111318]'
                : 'bg-[#1b1f29] text-stone-300 hover:text-white'
            }`}
          >
            Characters ({CHARACTERS.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('outfits')}
            className={`min-h-[42px] px-4 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
              tab === 'outfits'
                ? 'bg-amber-500 text-[#111318]'
                : 'bg-[#1b1f29] text-stone-300 hover:text-white'
            }`}
          >
            Outfits ({OUTFITS.length})
          </button>
        </div>

        {/* Grid Content */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {tab === 'characters'
            ? CHARACTERS.map((char) => {
                const unlocked = save.unlockedCharacters.includes(char.id);
                const selected = save.selectedCharacter === char.id;
                const affordable = save.totalCoins >= char.cost;

                return (
                  <div
                    key={char.id}
                    className={`flex flex-col justify-between p-4 rounded-2xl border transition-colors ${
                      selected
                        ? 'bg-[#1e2430] border-amber-400/70'
                        : 'bg-[#191d26] border-white/10'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-base font-bold text-white">{char.name}</div>
                          <div className="text-xs font-medium text-amber-400">{char.title}</div>
                        </div>
                        <span
                          className="w-7 h-7 rounded-lg border border-white/20 shrink-0"
                          style={{ backgroundColor: `#${char.skinTone.toString(16).padStart(6, '0')}` }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-stone-300 leading-relaxed">
                        {char.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={!unlocked && !affordable}
                      onClick={() => onSelectOrBuyCharacter(char.id)}
                      className={`mt-4 min-h-[44px] w-full rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
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
                          <Check className="w-4 h-4" /> Equipped
                        </>
                      ) : unlocked ? (
                        'Equip Runner'
                      ) : (
                        <>
                          <Lock className="w-4 h-4" /> Unlock · {char.cost.toLocaleString()} Coins
                        </>
                      )}
                    </button>
                  </div>
                );
              })
            : OUTFITS.map((outfit) => {
                const unlocked = save.unlockedOutfits.includes(outfit.id);
                const selected = save.selectedOutfit === outfit.id;
                const affordable = save.totalCoins >= outfit.cost;

                return (
                  <div
                    key={outfit.id}
                    className={`flex flex-col justify-between p-4 rounded-2xl border transition-colors ${
                      selected
                        ? 'bg-[#1e2430] border-amber-400/70'
                        : 'bg-[#191d26] border-white/10'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-base font-bold text-white">{outfit.name}</div>
                        <div className="flex items-center gap-1">
                          <span
                            className="w-5 h-5 rounded-md border border-white/20"
                            style={{
                              backgroundColor: `#${outfit.torsoColor.toString(16).padStart(6, '0')}`,
                            }}
                          />
                          <span
                            className="w-5 h-5 rounded-md border border-white/20"
                            style={{
                              backgroundColor: `#${outfit.accentColor.toString(16).padStart(6, '0')}`,
                            }}
                          />
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-stone-300 leading-relaxed">
                        {outfit.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={!unlocked && !affordable}
                      onClick={() => onSelectOrBuyOutfit(outfit.id)}
                      className={`mt-4 min-h-[44px] w-full rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
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
                          <Check className="w-4 h-4" /> Equipped
                        </>
                      ) : unlocked ? (
                        'Wear Outfit'
                      ) : (
                        <>
                          <Lock className="w-4 h-4" /> Unlock · {outfit.cost.toLocaleString()} Coins
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
