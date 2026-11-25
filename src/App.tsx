import { useCallback, useEffect, useRef, useState } from 'react';
import { soundEngine } from './audio/soundEngine';
import { GameOverModal } from './components/GameOverModal';
import { GameplayHud } from './components/GameplayHud';
import { MainMenuOverlay, type MenuModalType } from './components/MainMenuOverlay';
import { MissionsModal } from './components/MissionsModal';
import { PauseModal } from './components/PauseModal';
import { SettingsModal } from './components/SettingsModal';
import { ShopModal } from './components/ShopModal';
import { WorldsModal } from './components/WorldsModal';
import { CHARACTERS, MISSIONS, OUTFITS, WORLDS } from './data/gameData';
import { RunnerEngine } from './game/RunnerEngine';
import {
  addExperience,
  applyRunToSaveData,
  claimDailyReward,
  loadSaveData,
  persistSaveData,
  resetAllProgress,
} from './storage/saveSystem';
import type {
  CharacterId,
  GamePhase,
  GameSettings,
  HudSnapshot,
  OutfitId,
  RunSummary,
  SaveData,
  WorldId,
} from './types/game';

const INITIAL_HUD: HudSnapshot = {
  distance: 0,
  coins: 0,
  score: 0,
  speed: 13,
  dangerLevel: 0,
  hasShield: false,
  activePowerUps: [],
  turnPrompt: null,
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<RunnerEngine | null>(null);

  const [save, setSave] = useState<SaveData>(() => loadSaveData());
  const saveRef = useRef<SaveData>(save);
  saveRef.current = save;

  const [phase, setPhase] = useState<GamePhase>('menu');
  const phaseRef = useRef<GamePhase>(phase);
  phaseRef.current = phase;

  const [activeModal, setActiveModal] = useState<MenuModalType>(null);
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [runSummary, setRunSummary] = useState<RunSummary | null>(null);
  const [showSwipeHint, setShowSwipeHint] = useState(false);

  // Sync audio settings
  useEffect(() => {
    soundEngine.setSettings(save.settings.soundEnabled, save.settings.musicEnabled);
  }, [save.settings.soundEnabled, save.settings.musicEnabled]);

  // Mount Three.js engine once in isolated container
  useEffect(() => {
    const mountEl = canvasMountRef.current;
    if (!mountEl) return;

    const initialSave = saveRef.current;
    const engine = new RunnerEngine(
      mountEl,
      initialSave.selectedWorld,
      initialSave.selectedCharacter,
      initialSave.selectedOutfit,
      initialSave.settings.quality,
      {
        onHudUpdate: (nextHud) => {
          setHud(nextHud);
        },
        onGameOver: (rawSummary) => {
          const prev = saveRef.current;
          const isNewBestDistance = rawSummary.distance > prev.bestDistance;
          const isNewBestScore = rawSummary.score > prev.bestScore;
          const enriched: RunSummary = {
            ...rawSummary,
            isNewBestDistance,
            isNewBestScore,
          };
          const updatedSave = applyRunToSaveData(prev, enriched);
          setSave(updatedSave);
          setRunSummary(enriched);
          setPhase('gameover');
          if (prev.settings.vibrationEnabled && navigator.vibrate) {
            navigator.vibrate([45, 30, 70]);
          }
        },
      }
    );

    engineRef.current = engine;
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Sync character, outfit, world, quality changes to engine
  useEffect(() => {
    engineRef.current?.setCustomization(
      save.selectedWorld,
      save.selectedCharacter,
      save.selectedOutfit
    );
    engineRef.current?.setQuality(save.settings.quality);
  }, [
    save.selectedWorld,
    save.selectedCharacter,
    save.selectedOutfit,
    save.settings.quality,
  ]);

  const triggerAction = useCallback((action: 'left' | 'right' | 'jump' | 'slide') => {
    if (phaseRef.current !== 'playing') return;
    engineRef.current?.handleInput(action);
    if (action === 'jump' && saveRef.current.settings.vibrationEnabled && navigator.vibrate) {
      navigator.vibrate(14);
    }
  }, []);

  // Touch & Mouse Swipe Gestures (prevent page scroll on Android)
  useEffect(() => {
    const el = canvasMountRef.current;
    if (!el) return;

    let startX = 0;
    let startY = 0;
    let pointerActive = false;
    let gestureHandled = false;
    const THRESHOLD = 24;

    const onTouchStart = (e: TouchEvent) => {
      if (phaseRef.current !== 'playing') return;
      if (e.touches.length === 0) return;
      e.preventDefault();
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      pointerActive = true;
      gestureHandled = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (phaseRef.current !== 'playing') return;
      e.preventDefault();
      if (!pointerActive || gestureHandled || e.touches.length === 0) return;

      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      if (Math.abs(dx) < THRESHOLD && Math.abs(dy) < THRESHOLD) return;

      gestureHandled = true;
      if (Math.abs(dx) > Math.abs(dy)) {
        triggerAction(dx > 0 ? 'right' : 'left');
      } else {
        triggerAction(dy < 0 ? 'jump' : 'slide');
      }
    };

    const onTouchEnd = () => {
      pointerActive = false;
      gestureHandled = false;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || phaseRef.current !== 'playing') return;
      startX = e.clientX;
      startY = e.clientY;
      pointerActive = true;
      gestureHandled = false;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || !pointerActive || gestureHandled) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return;
      gestureHandled = true;
      if (Math.abs(dx) > Math.abs(dy)) {
        triggerAction(dx > 0 ? 'right' : 'left');
      } else {
        triggerAction(dy < 0 ? 'jump' : 'slide');
      }
    };

    const onPointerUp = () => {
      pointerActive = false;
      gestureHandled = false;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('touchcancel', onTouchEnd);
    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
    };
  }, [triggerAction]);

  // Keyboard controls for desktop preview
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (phaseRef.current === 'playing') {
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
          e.preventDefault();
          triggerAction('left');
        } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
          e.preventDefault();
          triggerAction('right');
        } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') {
          e.preventDefault();
          triggerAction('jump');
        } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
          e.preventDefault();
          triggerAction('slide');
        } else if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
          e.preventDefault();
          engineRef.current?.pause();
          setPhase('paused');
        }
      } else if (phaseRef.current === 'paused' && (e.key === 'Escape' || e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        engineRef.current?.resume();
        setPhase('playing');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [triggerAction]);

  // Auto-hide swipe hint after 4.5s
  useEffect(() => {
    if (!showSwipeHint) return;
    const t = window.setTimeout(() => setShowSwipeHint(false), 4500);
    return () => window.clearTimeout(t);
  }, [showSwipeHint]);

  const handleStartRun = useCallback(() => {
    setActiveModal(null);
    setRunSummary(null);
    setPhase('playing');
    setShowSwipeHint(true);
    engineRef.current?.startRun();
  }, []);

  const handlePause = useCallback(() => {
    engineRef.current?.pause();
    setPhase('paused');
  }, []);

  const handleResume = useCallback(() => {
    engineRef.current?.resume();
    setPhase('playing');
  }, []);

  const handleMainMenu = useCallback(() => {
    setRunSummary(null);
    setPhase('menu');
    engineRef.current?.returnToMenu();
  }, []);

  const handleSelectOrBuyCharacter = useCallback((id: CharacterId) => {
    setSave((prev) => {
      const char = CHARACTERS.find((c) => c.id === id);
      if (!char) return prev;
      if (prev.unlockedCharacters.includes(id)) {
        const next: SaveData = { ...prev, selectedCharacter: id };
        persistSaveData(next);
        return next;
      }
      if (prev.totalCoins < char.cost) return prev;
      const next: SaveData = {
        ...prev,
        totalCoins: prev.totalCoins - char.cost,
        unlockedCharacters: [...prev.unlockedCharacters, id],
        selectedCharacter: id,
        selectedOutfit: prev.unlockedOutfits.includes(char.defaultOutfit)
          ? char.defaultOutfit
          : prev.selectedOutfit,
      };
      persistSaveData(next);
      return next;
    });
  }, []);

  const handleSelectOrBuyOutfit = useCallback((id: OutfitId) => {
    setSave((prev) => {
      const outfit = OUTFITS.find((o) => o.id === id);
      if (!outfit) return prev;
      if (prev.unlockedOutfits.includes(id)) {
        const next: SaveData = { ...prev, selectedOutfit: id };
        persistSaveData(next);
        return next;
      }
      if (prev.totalCoins < outfit.cost) return prev;
      const next: SaveData = {
        ...prev,
        totalCoins: prev.totalCoins - outfit.cost,
        unlockedOutfits: [...prev.unlockedOutfits, id],
        selectedOutfit: id,
      };
      persistSaveData(next);
      return next;
    });
  }, []);

  const handleSelectOrUnlockWorld = useCallback((id: WorldId) => {
    setSave((prev) => {
      const world = WORLDS.find((w) => w.id === id);
      if (!world) return prev;
      if (prev.unlockedWorlds.includes(id)) {
        const next: SaveData = { ...prev, selectedWorld: id };
        persistSaveData(next);
        return next;
      }
      if (prev.totalCoins < world.unlockCost) return prev;
      const next: SaveData = {
        ...prev,
        totalCoins: prev.totalCoins - world.unlockCost,
        unlockedWorlds: [...prev.unlockedWorlds, id],
        selectedWorld: id,
      };
      persistSaveData(next);
      return next;
    });
  }, []);

  const handleClaimMission = useCallback((missionId: string) => {
    setSave((prev) => {
      if (prev.claimedMissions.includes(missionId)) return prev;
      const mission = MISSIONS.find((m) => m.id === missionId);
      if (!mission) return prev;
      const prog = prev.missionProgress[missionId] ?? 0;
      if (prog < mission.target) return prev;
      const next = addExperience(
        {
          ...prev,
          totalCoins: prev.totalCoins + mission.rewardCoins,
          claimedMissions: [...prev.claimedMissions, missionId],
        },
        mission.rewardXp
      );
      persistSaveData(next);
      soundEngine.playPowerUp();
      return next;
    });
  }, []);

  const handleClaimDailyReward = useCallback(() => {
    setSave((prev) => {
      const next = claimDailyReward(prev);
      if (next !== prev) soundEngine.playPowerUp();
      return next;
    });
  }, []);

  const handleUpdateSettings = useCallback((nextSettings: GameSettings) => {
    setSave((prev) => {
      const next: SaveData = { ...prev, settings: nextSettings };
      persistSaveData(next);
      return next;
    });
  }, []);

  const handleResetProgress = useCallback(() => {
    const fresh = resetAllProgress();
    setSave(fresh);
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0e1015]">
      {/* Isolated WebGL 3D Viewport */}
      <div ref={canvasMountRef} className="w-full h-full touch-none" />

      {/* Main Menu */}
      {phase === 'menu' && (
        <MainMenuOverlay
          save={save}
          onPlay={handleStartRun}
          onOpenModal={(m) => setActiveModal(m)}
        />
      )}

      {/* Gameplay HUD */}
      {phase === 'playing' && (
        <GameplayHud hud={hud} runElapsedHint={showSwipeHint} onPause={handlePause} />
      )}

      {/* Pause Modal */}
      {phase === 'paused' && (
        <PauseModal
          settings={save.settings}
          onResume={handleResume}
          onRestart={handleStartRun}
          onMainMenu={handleMainMenu}
          onToggleSound={() =>
            handleUpdateSettings({
              ...save.settings,
              soundEnabled: !save.settings.soundEnabled,
            })
          }
          onToggleMusic={() =>
            handleUpdateSettings({
              ...save.settings,
              musicEnabled: !save.settings.musicEnabled,
            })
          }
        />
      )}

      {/* Game Over Screen */}
      {phase === 'gameover' && runSummary && !activeModal && (
        <GameOverModal
          summary={runSummary}
          bestDistance={save.bestDistance}
          bestScore={save.bestScore}
          onPlayAgain={handleStartRun}
          onMainMenu={handleMainMenu}
          onOpenShop={() => setActiveModal('shop')}
        />
      )}

      {/* Sub-Screens (Shop, Worlds, Missions, Settings) */}
      {activeModal === 'shop' && (
        <ShopModal
          save={save}
          onClose={() => setActiveModal(null)}
          onSelectOrBuyCharacter={handleSelectOrBuyCharacter}
          onSelectOrBuyOutfit={handleSelectOrBuyOutfit}
        />
      )}

      {activeModal === 'worlds' && (
        <WorldsModal
          save={save}
          onClose={() => setActiveModal(null)}
          onSelectOrUnlockWorld={handleSelectOrUnlockWorld}
        />
      )}

      {activeModal === 'missions' && (
        <MissionsModal
          save={save}
          onClose={() => setActiveModal(null)}
          onClaimMission={handleClaimMission}
          onClaimDailyReward={handleClaimDailyReward}
        />
      )}

      {activeModal === 'settings' && (
        <SettingsModal
          settings={save.settings}
          onClose={() => setActiveModal(null)}
          onUpdateSettings={handleUpdateSettings}
          onResetProgress={handleResetProgress}
        />
      )}
    </div>
  );
}
