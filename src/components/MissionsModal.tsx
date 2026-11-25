import { Check, Coins, Gift, Star, X } from 'lucide-react';
import { useState } from 'react';
import { DAILY_REWARDS, MISSIONS } from '../data/gameData';
import { canClaimDailyReward, getXpForNextLevel } from '../storage/saveSystem';
import type { MissionPeriod, SaveData } from '../types/game';

interface MissionsModalProps {
  save: SaveData;
  onClose: () => void;
  onClaimMission: (missionId: string) => void;
  onClaimDailyReward: () => void;
}

export function MissionsModal({
  save,
  onClose,
  onClaimMission,
  onClaimDailyReward,
}: MissionsModalProps) {
  const [period, setPeriod] = useState<MissionPeriod | 'rewards'>('daily');
  const dailyAvailable = canClaimDailyReward(save);
  const xpNeeded = getXpForNextLevel(save.level);
  const xpPct = Math.min(100, (save.xp / xpNeeded) * 100);

  const visibleMissions = MISSIONS.filter((m) => m.period === period);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-6 bg-black/65">
      <div className="w-full max-w-3xl max-h-[88vh] flex flex-col bg-[#13161d] border border-white/15 rounded-3xl text-[#faf7f2] shadow-2xl overflow-hidden">
        {/* Header + Level Progress */}
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-white/10">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-bold">Missions & Rewards</h2>
            <div className="mt-1 flex items-center gap-3 text-xs text-stone-300">
              <span className="inline-flex items-center gap-1 font-semibold text-amber-400">
                <Star className="w-3.5 h-3.5" /> Level {save.level}
              </span>
              <span className="font-mono-num">
                {save.xp} / {xpNeeded} XP
              </span>
              <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full" style={{ width: `${xpPct}%` }} />
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close missions"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-[#1d212b] hover:bg-[#262b38] border border-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="px-5 pt-3 flex items-center gap-2 overflow-x-auto">
          {(
            [
              ['daily', 'Daily'],
              ['weekly', 'Weekly'],
              ['achievement', 'Achievements'],
              ['rewards', 'Daily Rewards'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setPeriod(key)}
              className={`min-h-[42px] px-4 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                period === key
                  ? 'bg-amber-500 text-[#111318]'
                  : 'bg-[#1b1f29] text-stone-300 hover:text-white'
              }`}
            >
              {label}
              {key === 'rewards' && dailyAvailable ? ' (Ready)' : ''}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {period === 'rewards' ? (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 p-4 rounded-2xl bg-[#191d26] border border-white/10">
                <div>
                  <div className="text-base font-bold text-white flex items-center gap-2">
                    <Gift className="w-5 h-5 text-amber-400" />
                    7-Day Trail Bonus
                  </div>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Return each day to collect escalating coin gifts.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!dailyAvailable}
                  onClick={onClaimDailyReward}
                  className={`min-h-[44px] px-5 rounded-xl font-bold text-sm transition-all shrink-0 ${
                    dailyAvailable
                      ? 'bg-amber-500 hover:bg-amber-400 text-[#111318]'
                      : 'bg-white/10 text-stone-400 cursor-not-allowed'
                  }`}
                >
                  {dailyAvailable ? 'Claim Today’s Gift' : 'Claimed Today'}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {DAILY_REWARDS.map((item, idx) => {
                  const isCurrent = idx === save.dailyRewardDay;
                  const isPast = idx < save.dailyRewardDay;
                  return (
                    <div
                      key={item.day}
                      className={`p-3.5 rounded-2xl border ${
                        isCurrent && dailyAvailable
                          ? 'bg-[#212531] border-amber-400/70'
                          : 'bg-[#191d26] border-white/10'
                      }`}
                    >
                      <div className="text-xs text-stone-400">{item.label}</div>
                      <div className="mt-1.5 font-mono-num text-lg font-bold text-amber-300 flex items-center gap-1.5">
                        <Coins className="w-4 h-4 text-amber-400" />
                        {item.coins}
                      </div>
                      <div className="mt-2 text-[11px] font-medium text-stone-400">
                        {isPast ? 'Collected' : isCurrent && dailyAvailable ? 'Ready' : 'Upcoming'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {visibleMissions.map((m) => {
                const prog = Math.min(m.target, save.missionProgress[m.id] ?? 0);
                const claimed = save.claimedMissions.includes(m.id);
                const complete = prog >= m.target;
                const pct = Math.min(100, (prog / m.target) * 100);

                return (
                  <div
                    key={m.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#191d26] border border-white/10"
                  >
                    <div className="flex-1">
                      <div className="text-sm sm:text-base font-bold text-white">{m.title}</div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-stone-400">
                        <span className="font-mono-num">
                          {prog.toLocaleString()} / {m.target.toLocaleString()}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="text-amber-300 font-medium">
                          +{m.rewardCoins} Coins · +{m.rewardXp} XP
                        </span>
                      </div>
                      <div className="mt-2 h-2 w-full max-w-md bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full transition-[width] duration-200"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!complete || claimed}
                      onClick={() => onClaimMission(m.id)}
                      className={`min-h-[44px] sm:min-w-[130px] px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-1.5 shrink-0 transition-all ${
                        claimed
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/30'
                          : complete
                            ? 'bg-amber-500 hover:bg-amber-400 text-[#111318]'
                            : 'bg-white/5 text-stone-500 cursor-not-allowed'
                      }`}
                    >
                      {claimed ? (
                        <>
                          <Check className="w-4 h-4" /> Claimed
                        </>
                      ) : complete ? (
                        'Claim Reward'
                      ) : (
                        'In Progress'
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
