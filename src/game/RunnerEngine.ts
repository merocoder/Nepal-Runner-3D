import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { soundEngine } from '../audio/soundEngine';
import { CHARACTERS, OUTFITS, POWERUP_META, WORLD_MAP } from '../data/gameData';
import type {
  ActivePowerUp,
  CharacterId,
  GamePhase,
  HudSnapshot,
  OutfitId,
  PowerUpType,
  RunSummary,
  WorldId,
} from '../types/game';
import {
  animateCreatureRig,
  animatePlayerRig,
  createBrassBellGate,
  createCoinMesh,
  createCreatureRig,
  createObstacleMesh,
  createPagodaTemple,
  createPlayerRig,
  createPowerUpMesh,
  createPrayerFlagArch,
  createSceneryTree,
  type CreatureRig,
  type ObstacleAction,
  type ObstacleInstance,
  type PlayerRig,
} from './models';
import { createTextureSet, type ProceduralTextureSet } from './textures';

const LANE_WIDTH = 1.85;
const SEG_LENGTH = 16;
const PATH_WIDTH = 6.2;
const BRIDGE_WIDTH = 2.6;

// Pre-allocated math helpers for zero-GC loop
const _vecA = new THREE.Vector3();
const _vecB = new THREE.Vector3();
const _vecC = new THREE.Vector3();
const _camTarget = new THREE.Vector3();
const _camDesired = new THREE.Vector3();

type SegmentKind =
  | 'courtyard'
  | 'straight'
  | 'bridge'
  | 'elevated'
  | 'turn_left'
  | 'turn_right'
  | 'turn_choice';

interface CoinItem {
  mesh: THREE.Group;
  localX: number;
  localY: number;
  localZ: number;
  collected: boolean;
}

interface PowerUpItem {
  mesh: THREE.Group;
  type: PowerUpType;
  localX: number;
  localY: number;
  localZ: number;
  collected: boolean;
}

interface TrackSegment {
  id: number;
  kind: SegmentKind;
  group: THREE.Group;
  dirIndex: number; // 0: -Z, 1: +X, 2: +Z, 3: -X
  length: number;
  startPos: THREE.Vector3;
  endPos: THREE.Vector3;
  junctionPos: THREE.Vector3;
  chosenTurn: 'left' | 'right' | null;
  altBranchGroup?: THREE.Group;
  obstacles: ObstacleInstance[];
  coins: CoinItem[];
  powerUps: PowerUpItem[];
  elevatedY: number;
}

export interface EngineCallbacks {
  onHudUpdate: (hud: HudSnapshot) => void;
  onGameOver: (summary: RunSummary) => void;
}

function dirForward(dirIndex: number, out: THREE.Vector3): THREE.Vector3 {
  switch (((dirIndex % 4) + 4) % 4) {
    case 0:
      return out.set(0, 0, -1);
    case 1:
      return out.set(1, 0, 0);
    case 2:
      return out.set(0, 0, 1);
    default:
      return out.set(-1, 0, 0);
  }
}

function dirRight(dirIndex: number, out: THREE.Vector3): THREE.Vector3 {
  switch (((dirIndex % 4) + 4) % 4) {
    case 0:
      return out.set(1, 0, 0);
    case 1:
      return out.set(0, 0, 1);
    case 2:
      return out.set(-1, 0, 0);
    default:
      return out.set(0, 0, -1);
  }
}

function dirYaw(dirIndex: number): number {
  return -(((dirIndex % 4) + 4) % 4) * (Math.PI / 2);
}

export class RunnerEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private isSoftwareGl: boolean;
  private frameId = 0;
  private destroyed = false;

  private textures: ProceduralTextureSet;
  private worldId: WorldId;
  private characterId: CharacterId;
  private outfitId: OutfitId;
  private quality: 'high' | 'balanced' = 'high';

  // Lighting & Sky
  private hemiLight: THREE.HemisphereLight;
  private sunLight: THREE.DirectionalLight;
  private rimLight: THREE.DirectionalLight;
  private mountainBackdrop: THREE.Group;
  private snowPoints: THREE.Points | null = null;
  private snowPositions: Float32Array | null = null;

  // Shared materials rebuilt per world
  private pathMat: THREE.MeshStandardMaterial;
  private groundMat: THREE.MeshStandardMaterial;
  private trimMat: THREE.MeshStandardMaterial;
  private woodMat: THREE.MeshStandardMaterial;
  private waterMat: THREE.MeshStandardMaterial;

  // Actors
  private playerRig: PlayerRig;
  private creatureRig: CreatureRig;

  // Track segments
  private segments: TrackSegment[] = [];
  private nextSegmentId = 1;
  private tailDir = 0;
  private tailPos = new THREE.Vector3(0, 0, 0);

  // Gameplay state
  private phase: GamePhase = 'menu';
  private elapsed = 0;
  private lastTickTime = performance.now();
  private hudTimer = 0;

  // Player kinematics
  private currentSegIndex = 0;
  private segProgress = 6;
  private playerDir = 0;
  private smoothYaw = 0;
  private targetLane = 0; // -1, 0, 1
  private lateralOffset = 0;
  private verticalY = 0;
  private verticalVel = 0;
  private isGrounded = true;
  private slideTimer = 0;
  private queuedAction: 'left' | 'right' | 'jump' | 'slide' | null = null;
  private turnLockedForSegId = -1;
  private fallTimer = 0;
  private gameOverReason: 'obstacle' | 'fell' | 'caught' = 'obstacle';
  private crashSlowMoTimer = 0;
  private invulnTimer = 0;

  // Creature & Camera
  private creatureDist = 6.5;
  private cameraShake = 0;
  private camPos = new THREE.Vector3(0, 4.5, 8);
  private camLook = new THREE.Vector3(0, 1.4, -4);
  private menuOrbitAngle = 0;

  // Run Stats
  private distance = 0;
  private runCoins = 0;
  private score = 0;
  private baseSpeed = 12.8;
  private runDuration = 0;
  private jumpsCount = 0;
  private slidesCount = 0;
  private turnsCount = 0;
  private powerUpsCount = 0;
  private footstepTimer = 0;
  private activePowerUps: Map<PowerUpType, number> = new Map();

  constructor(
    container: HTMLElement,
    initialWorld: WorldId,
    initialCharacter: CharacterId,
    initialOutfit: OutfitId,
    quality: 'high' | 'balanced',
    callbacks: EngineCallbacks
  ) {
    this.container = container;
    this.worldId = initialWorld;
    this.characterId = initialCharacter;
    this.outfitId = initialOutfit;
    this.quality = quality;
    this.callbacks = callbacks;

    this.isSoftwareGl = (() => {
      try {
        const probe = document.createElement('canvas').getContext('webgl2');
        if (!probe) return true;
        const ext = probe.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
        const gpu = String(probe.getParameter(param));
        probe.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl && quality === 'high',
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, quality === 'high' ? 2 : 1.5)
    );
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();

    // Studio Environment Reflection (RoomEnvironment)
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(62, width / height, 0.2, 260);
    this.camera.position.copy(this.camPos);

    // 3-Point Outdoor Lighting Rig
    this.hemiLight = new THREE.HemisphereLight(0x9fc4e8, 0x6e4f35, 0.85);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xffd599, 2.3);
    this.sunLight.castShadow = !this.isSoftwareGl;
    this.sunLight.shadow.mapSize.set(1024, 1024);
    const d = 22;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.camera.near = 1;
    this.sunLight.shadow.camera.far = 90;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    this.rimLight = new THREE.DirectionalLight(0x93c5fd, 0.7);
    this.rimLight.position.set(-16, 14, 16);
    this.scene.add(this.rimLight);

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.textures = createTextureSet(this.worldId, maxAniso);

    this.pathMat = new THREE.MeshStandardMaterial({
      map: this.textures.pathTexture,
      roughness: 0.78,
      metalness: 0.05,
    });
    this.groundMat = new THREE.MeshStandardMaterial({
      color: 0x4f5b3a,
      roughness: 0.92,
      metalness: 0.02,
    });
    this.trimMat = new THREE.MeshStandardMaterial({
      color: 0x6b452d,
      roughness: 0.72,
      metalness: 0.08,
    });
    this.woodMat = new THREE.MeshStandardMaterial({
      map: this.textures.woodTexture,
      roughness: 0.75,
      metalness: 0.06,
    });
    this.waterMat = new THREE.MeshStandardMaterial({
      color: 0x1d6fa5,
      roughness: 0.2,
      metalness: 0.35,
    });

    // Distant Himalayan mountain horizon ring
    this.mountainBackdrop = this.buildMountainBackdrop();
    this.scene.add(this.mountainBackdrop);

    // Player & Creature
    this.playerRig = this.buildPlayerRig();
    this.scene.add(this.playerRig.root);

    this.creatureRig = createCreatureRig();
    this.creatureRig.root.visible = false;
    this.scene.add(this.creatureRig.root);

    this.applyWorldTheme(this.worldId);
    this.resetTrackForMenu();

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    window.addEventListener('resize', this.handleResize);
    this.renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost);

    this.lastTickTime = performance.now();
    this.tick();
  }

  private handleContextLost = (e: Event): void => {
    e.preventDefault();
  };

  private handleResize = (): void => {
    if (this.destroyed) return;
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private buildPlayerRig(): PlayerRig {
    const charCfg = CHARACTERS.find((c) => c.id === this.characterId) ?? CHARACTERS[0];
    const outfitCfg = OUTFITS.find((o) => o.id === this.outfitId) ?? OUTFITS[0];
    return createPlayerRig(charCfg, outfitCfg, this.textures);
  }

  public setCustomization(worldId: WorldId, characterId: CharacterId, outfitId: OutfitId): void {
    const worldChanged = this.worldId !== worldId;
    const charChanged = this.characterId !== characterId || this.outfitId !== outfitId;

    this.worldId = worldId;
    this.characterId = characterId;
    this.outfitId = outfitId;

    if (charChanged) {
      const pos = this.playerRig.root.position.clone();
      const rot = this.playerRig.root.rotation.clone();
      this.scene.remove(this.playerRig.root);
      this.playerRig = this.buildPlayerRig();
      this.playerRig.root.position.copy(pos);
      this.playerRig.root.rotation.copy(rot);
      this.scene.add(this.playerRig.root);
    }

    if (worldChanged) {
      this.applyWorldTheme(worldId);
      if (this.phase === 'menu') {
        this.resetTrackForMenu();
      }
    }
  }

  public setQuality(quality: 'high' | 'balanced'): void {
    this.quality = quality;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, quality === 'high' ? 2 : 1.5)
    );
  }

  private buildMountainBackdrop(): THREE.Group {
    const group = new THREE.Group();
    const peakMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.92,
      metalness: 0.04,
    });
    const snowMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.72,
      metalness: 0.05,
    });

    const count = 18;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const dist = 115 + (i % 3) * 18;
      const h = 38 + (i % 4) * 14;
      const r = 24 + (i % 3) * 7;

      const peak = new THREE.Mesh(new THREE.ConeGeometry(r, h, 5), peakMat);
      peak.position.set(Math.cos(angle) * dist, h * 0.42 - 6, Math.sin(angle) * dist);
      peak.rotation.y = i * 0.7;

      const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.44, h * 0.42, 5), snowMat);
      cap.position.set(peak.position.x, peak.position.y + h * 0.295, peak.position.z);
      cap.rotation.y = peak.rotation.y;

      group.add(peak, cap);
    }
    return group;
  }

  private applyWorldTheme(worldId: WorldId): void {
    const cfg = WORLD_MAP[worldId];
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();

    this.textures.dispose();
    this.textures = createTextureSet(worldId, maxAniso);

    this.pathMat.map = this.textures.pathTexture;
    this.pathMat.needsUpdate = true;
    this.woodMat.map = this.textures.woodTexture;
    this.woodMat.needsUpdate = true;
    this.groundMat.color.setHex(cfg.groundColor);
    this.trimMat.color.setHex(cfg.trimColor);
    this.waterMat.color.setHex(worldId === 'everest' ? 0x93c5fd : 0x1d6fa5);

    this.scene.background = new THREE.Color(cfg.skyHorizon);
    this.scene.fog = new THREE.FogExp2(cfg.fogColor, cfg.fogDensity);

    this.sunLight.color.setHex(cfg.sunColor);
    this.sunLight.intensity = cfg.sunIntensity;
    this.hemiLight.color.setHex(cfg.hemiSky);
    this.hemiLight.groundColor.setHex(cfg.hemiGround);
    this.hemiLight.intensity = cfg.hemiIntensity;

    // Snow particle layer for Himalayan & Everest worlds
    if (this.snowPoints) {
      this.scene.remove(this.snowPoints);
      this.snowPoints.geometry.dispose();
      (this.snowPoints.material as THREE.Material).dispose();
      this.snowPoints = null;
      this.snowPositions = null;
    }

    if (cfg.hasSnow) {
      const count = 150;
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 34;
        positions[i * 3 + 1] = Math.random() * 16;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 34;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.16,
        transparent: true,
        opacity: 0.82,
      });
      this.snowPoints = new THREE.Points(geo, mat);
      this.snowPositions = positions;
      this.scene.add(this.snowPoints);
    }
  }

  private clearAllSegments(): void {
    for (const seg of this.segments) {
      this.scene.remove(seg.group);
    }
    this.segments = [];
  }

  private resetTrackForMenu(): void {
    this.clearAllSegments();
    this.tailDir = 0;
    this.tailPos.set(0, 0, 12);
    this.nextSegmentId = 1;

    this.spawnSegment('courtyard');
    for (let i = 0; i < 8; i++) {
      this.spawnSegment('straight');
    }

    this.playerDir = 0;
    this.smoothYaw = 0;
    this.targetLane = 0;
    this.lateralOffset = 0;
    this.verticalY = 0;
    this.verticalVel = 0;
    this.isGrounded = true;
    this.slideTimer = 0;

    this.playerRig.root.position.set(0, 0, 0);
    this.playerRig.root.rotation.set(0, 0, 0);
    this.creatureRig.root.visible = false;
  }

  public startRun(): void {
    soundEngine.unlock();
    soundEngine.startRunAudio(this.worldId);

    this.clearAllSegments();
    this.tailDir = 0;
    this.tailPos.set(0, 0, 10);
    this.nextSegmentId = 1;

    this.spawnSegment('courtyard');
    this.spawnSegment('straight');
    this.spawnSegment('straight');
    for (let i = 0; i < 9; i++) {
      this.spawnNextProceduralSegment();
    }

    this.phase = 'playing';
    this.currentSegIndex = 0;
    this.segProgress = 10; // Center of courtyard at z=0
    this.playerDir = 0;
    this.smoothYaw = 0;
    this.targetLane = 0;
    this.lateralOffset = 0;
    this.verticalY = 0;
    this.verticalVel = 0;
    this.isGrounded = true;
    this.slideTimer = 0;
    this.queuedAction = null;
    this.turnLockedForSegId = -1;
    this.fallTimer = 0;
    this.crashSlowMoTimer = 0;
    this.invulnTimer = 0;

    this.distance = 0;
    this.runCoins = 0;
    this.score = 0;
    this.baseSpeed = 13.0;
    this.runDuration = 0;
    this.jumpsCount = 0;
    this.slidesCount = 0;
    this.turnsCount = 0;
    this.powerUpsCount = 0;
    this.creatureDist = 5.4;
    this.cameraShake = 0;
    this.activePowerUps.clear();

    this.playerRig.root.position.set(0, 0, 0);
    this.playerRig.root.rotation.set(0, 0, 0);

    this.creatureRig.root.visible = true;
    this.creatureRig.root.position.set(0, 0, 5.4);
    this.creatureRig.root.rotation.set(0, 0, 0);

    this.camPos.set(0, 4.4, 7.6);
    this.camLook.set(0, 1.5, -5);
    this.pushHud();
  }

  public pause(): void {
    if (this.phase === 'playing') {
      this.phase = 'paused';
      soundEngine.stopRunAudio();
    }
  }

  public resume(): void {
    if (this.phase === 'paused') {
      this.phase = 'playing';
      this.lastTickTime = performance.now();
      soundEngine.startRunAudio(this.worldId);
    }
  }

  public returnToMenu(): void {
    this.phase = 'menu';
    soundEngine.stopRunAudio();
    this.resetTrackForMenu();
  }

  public handleInput(action: 'left' | 'right' | 'jump' | 'slide'): void {
    if (this.phase !== 'playing' || this.crashSlowMoTimer > 0) return;

    const seg = this.segments[this.currentSegIndex];
    const inTurnWindow =
      seg &&
      (seg.kind === 'turn_left' || seg.kind === 'turn_right' || seg.kind === 'turn_choice') &&
      this.turnLockedForSegId !== seg.id &&
      this.segProgress >= 2.6 &&
      this.segProgress <= 11.4;

    if ((action === 'left' || action === 'right') && inTurnWindow) {
      this.executeTurn(seg, action);
      return;
    }

    if (action === 'left') {
      if (this.targetLane > -1) {
        this.targetLane -= 1;
      } else {
        // Queue turn if approaching junction
        this.queuedAction = 'left';
      }
      return;
    }

    if (action === 'right') {
      if (this.targetLane < 1) {
        this.targetLane += 1;
      } else {
        this.queuedAction = 'right';
      }
      return;
    }

    if (action === 'jump') {
      if (this.isGrounded) {
        const superJump = this.activePowerUps.has('super_jump');
        this.verticalVel = superJump ? 15.6 : 11.8;
        this.isGrounded = false;
        this.slideTimer = 0;
        this.jumpsCount += 1;
        soundEngine.playJump();
      } else {
        this.queuedAction = 'jump';
      }
      return;
    }

    if (action === 'slide') {
      if (!this.isGrounded) {
        // Fast slam down into slide
        this.verticalVel = Math.min(this.verticalVel, -18);
        this.queuedAction = 'slide';
      } else if (this.slideTimer <= 0.15) {
        this.slideTimer = 0.72;
        this.slidesCount += 1;
        soundEngine.playSlide();
      }
    }
  }

  private executeTurn(seg: TrackSegment, direction: 'left' | 'right'): void {
    this.turnLockedForSegId = seg.id;

    // Validate against turn type
    if (
      (seg.kind === 'turn_left' && direction === 'right') ||
      (seg.kind === 'turn_right' && direction === 'left')
    ) {
      this.triggerGameOver('fell');
      return;
    }

    // If T-choice and player chose the alternate branch, swap future track seamlessly
    if (seg.kind === 'turn_choice' && seg.chosenTurn !== direction) {
      this.rerouteFromChoiceSegment(seg, direction);
    }

    this.turnsCount += 1;
    soundEngine.playTurn();

    const newDir =
      direction === 'right' ? (seg.dirIndex + 1) % 4 : (seg.dirIndex + 3) % 4;
    this.playerDir = newDir;

    // Project current player position onto new corridor starting at junctionPos
    const newFwd = dirForward(newDir, _vecA);
    const newRight = dirRight(newDir, _vecB);
    const rel = _vecC.copy(this.playerRig.root.position).sub(seg.junctionPos);
    const alongFromJunction = rel.dot(newFwd);
    const latFromCenter = rel.dot(newRight);

    this.segProgress = 8 + alongFromJunction;
    this.lateralOffset = THREE.MathUtils.clamp(latFromCenter, -LANE_WIDTH, LANE_WIDTH);
    this.targetLane = Math.round(this.lateralOffset / LANE_WIDTH);
  }

  private rerouteFromChoiceSegment(seg: TrackSegment, newChoice: 'left' | 'right'): void {
    const segIdx = this.segments.indexOf(seg);
    if (segIdx === -1) return;

    // Remove all segments after this choice segment
    for (let i = segIdx + 1; i < this.segments.length; i++) {
      this.scene.remove(this.segments[i].group);
    }
    this.segments.splice(segIdx + 1);

    seg.chosenTurn = newChoice;
    const newDir =
      newChoice === 'right' ? (seg.dirIndex + 1) % 4 : (seg.dirIndex + 3) % 4;
    const newFwd = dirForward(newDir, _vecA);
    seg.endPos.copy(seg.junctionPos).addScaledVector(newFwd, 8);

    this.tailDir = newDir;
    this.tailPos.copy(seg.endPos);

    while (this.segments.length - segIdx < 11) {
      this.spawnNextProceduralSegment();
    }
  }

  private spawnNextProceduralSegment(): void {
    const dist = this.distance + this.segments.length * SEG_LENGTH;
    const roll = Math.random();

    // Prevent consecutive turns back-to-back
    const lastKind = this.segments[this.segments.length - 1]?.kind ?? 'straight';
    const lastWasTurn =
      lastKind === 'turn_left' || lastKind === 'turn_right' || lastKind === 'turn_choice';

    if (!lastWasTurn && roll < 0.25 && this.segments.length > 3) {
      const turnPick = Math.random();
      if (turnPick < 0.38) this.spawnSegment('turn_left');
      else if (turnPick < 0.76) this.spawnSegment('turn_right');
      else this.spawnSegment('turn_choice');
      return;
    }

    if (dist > 90 && roll < 0.48) {
      this.spawnSegment('bridge');
    } else if (dist > 140 && roll < 0.65) {
      this.spawnSegment('elevated');
    } else {
      this.spawnSegment('straight');
    }
  }

  private spawnSegment(kind: SegmentKind): void {
    const segGroup = new THREE.Group();
    const length = kind === 'courtyard' ? 24 : SEG_LENGTH;
    const dir = this.tailDir;
    const fwd = dirForward(dir, new THREE.Vector3());

    const startPos = this.tailPos.clone();
    const centerPos = startPos.clone().addScaledVector(fwd, length * 0.5);
    const junctionPos = startPos.clone().addScaledVector(fwd, 8);

    let nextDir = dir;
    let chosenTurn: 'left' | 'right' | null = null;
    if (kind === 'turn_left') {
      chosenTurn = 'left';
      nextDir = (dir + 3) % 4;
    } else if (kind === 'turn_right') {
      chosenTurn = 'right';
      nextDir = (dir + 1) % 4;
    } else if (kind === 'turn_choice') {
      chosenTurn = Math.random() < 0.5 ? 'left' : 'right';
      nextDir = chosenTurn === 'right' ? (dir + 1) % 4 : (dir + 3) % 4;
    }

    const endPos =
      chosenTurn !== null
        ? junctionPos.clone().addScaledVector(dirForward(nextDir, new THREE.Vector3()), 8)
        : startPos.clone().addScaledVector(fwd, length);

    segGroup.position.copy(centerPos);
    segGroup.rotation.y = dirYaw(dir);

    const obstacles: ObstacleInstance[] = [];
    const coins: CoinItem[] = [];
    const powerUps: PowerUpItem[] = [];
    const elevatedY = kind === 'elevated' ? 0.55 : 0;

    // Build segment geometry in local space (-Z is forward, +X is right)
    if (kind === 'courtyard') {
      const floor = new THREE.Mesh(
        new THREE.BoxGeometry(16, 0.8, length),
        this.pathMat
      );
      floor.position.y = -0.4;
      floor.receiveShadow = true;
      segGroup.add(floor);

      // Left & Right Pagoda Temples framing the courtyard
      const pagodaL = createPagodaTemple(this.textures, this.worldId, 0.92);
      pagodaL.position.set(-7.6, 0, -2);
      pagodaL.rotation.y = Math.PI / 2;
      const pagodaR = createPagodaTemple(this.textures, this.worldId, 0.92);
      pagodaR.position.set(7.6, 0, -2);
      pagodaR.rotation.y = -Math.PI / 2;
      segGroup.add(pagodaL, pagodaR);

      const exitGate = createBrassBellGate(this.textures);
      exitGate.position.set(0, 0, -length * 0.46);
      segGroup.add(exitGate);

      const flags = createPrayerFlagArch(this.textures);
      flags.position.set(0, 0, 3);
      segGroup.add(flags);
    } else if (kind === 'straight' || kind === 'elevated') {
      const road = new THREE.Mesh(
        new THREE.BoxGeometry(PATH_WIDTH, 0.8 + elevatedY, length),
        this.pathMat
      );
      road.position.y = -0.4 + elevatedY * 0.5;
      road.receiveShadow = true;
      segGroup.add(road);

      // Side stone curbs
      const curbL = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 0.45, length),
        this.trimMat
      );
      curbL.position.set(-PATH_WIDTH * 0.5 - 0.1, elevatedY + 0.1, 0);
      const curbR = curbL.clone();
      curbR.position.x = PATH_WIDTH * 0.5 + 0.1;
      segGroup.add(curbL, curbR);

      // Side terrain slopes
      const terrainL = new THREE.Mesh(
        new THREE.BoxGeometry(14, 1.2, length),
        this.groundMat
      );
      terrainL.position.set(-10.5, -0.9, 0);
      terrainL.receiveShadow = true;
      const terrainR = terrainL.clone();
      terrainR.position.x = 10.5;
      segGroup.add(terrainL, terrainR);

      // Scenery decorations
      if (this.nextSegmentId % 2 === 0) {
        const treeL = createSceneryTree(this.worldId, this.nextSegmentId);
        treeL.position.set(-5.8 - Math.random() * 2, -0.3, (Math.random() - 0.5) * 8);
        const treeR = createSceneryTree(this.worldId, this.nextSegmentId + 1);
        treeR.position.set(5.8 + Math.random() * 2, -0.3, (Math.random() - 0.5) * 8);
        segGroup.add(treeL, treeR);
      }
      if (this.nextSegmentId % 3 === 0) {
        const arch = createPrayerFlagArch(this.textures);
        arch.position.set(0, elevatedY, 0);
        segGroup.add(arch);
      } else if (this.nextSegmentId % 5 === 0) {
        const pagoda = createPagodaTemple(this.textures, this.worldId, 0.72);
        const side = this.nextSegmentId % 2 === 0 ? -7.5 : 7.5;
        pagoda.position.set(side, -0.3, 0);
        pagoda.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
        segGroup.add(pagoda);
      }
    } else if (kind === 'bridge') {
      // Narrow wooden suspension bridge over canyon/river
      const deck = new THREE.Mesh(
        new THREE.BoxGeometry(BRIDGE_WIDTH, 0.45, length),
        this.woodMat
      );
      deck.position.y = -0.22;
      deck.receiveShadow = true;
      segGroup.add(deck);

      // Rope railing posts
      for (let z = -6; z <= 6; z += 4) {
        const pL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.05, 0.16), this.woodMat);
        pL.position.set(-BRIDGE_WIDTH * 0.48, 0.45, z);
        const pR = pL.clone();
        pR.position.x = BRIDGE_WIDTH * 0.48;
        segGroup.add(pL, pR);
      }

      // Canyon river / glacier below
      const chasm = new THREE.Mesh(
        new THREE.PlaneGeometry(34, length),
        this.waterMat
      );
      chasm.rotation.x = -Math.PI / 2;
      chasm.position.y = -4.5;
      segGroup.add(chasm);
    } else {
      // Turn Segment ('turn_left', 'turn_right', 'turn_choice')
      // Incoming leg from +8 to 0
      const inRoad = new THREE.Mesh(
        new THREE.BoxGeometry(PATH_WIDTH, 0.8, 11.1),
        this.pathMat
      );
      inRoad.position.set(0, -0.4, 2.45);
      inRoad.receiveShadow = true;
      segGroup.add(inRoad);

      const hasLeft = kind === 'turn_left' || kind === 'turn_choice';
      const hasRight = kind === 'turn_right' || kind === 'turn_choice';

      if (hasLeft) {
        const leftArm = new THREE.Mesh(
          new THREE.BoxGeometry(8, 0.8, PATH_WIDTH),
          this.pathMat
        );
        leftArm.position.set(-4, -0.4, 0);
        leftArm.receiveShadow = true;
        segGroup.add(leftArm);
      }

      if (hasRight) {
        const rightArm = new THREE.Mesh(
          new THREE.BoxGeometry(8, 0.8, PATH_WIDTH),
          this.pathMat
        );
        rightArm.position.set(4, -0.4, 0);
        rightArm.receiveShadow = true;
        segGroup.add(rightArm);
      }

      // Forward dead-end stone wall with carved temple relief so turn is unmistakable
      const endWall = new THREE.Mesh(
        new THREE.BoxGeometry(PATH_WIDTH + 1.2, 2.8, 0.8),
        this.trimMat
      );
      endWall.position.set(0, 1.2, -3.5);
      endWall.castShadow = true;
      segGroup.add(endWall);

      // Glowing directional arrow markers on wall
      const arrowMat = new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        emissive: 0xf59e0b,
        emissiveIntensity: 1.2,
      });
      if (hasLeft) {
        const arrowL = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.9, 4), arrowMat);
        arrowL.rotation.z = Math.PI / 2;
        arrowL.position.set(-1.3, 1.75, -3.0);
        segGroup.add(arrowL);
      }
      if (hasRight) {
        const arrowR = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.9, 4), arrowMat);
        arrowR.rotation.z = -Math.PI / 2;
        arrowR.position.set(1.3, 1.75, -3.0);
        segGroup.add(arrowR);
      }

      const flags = createPrayerFlagArch(this.textures);
      flags.position.set(0, 0, 5.2);
      segGroup.add(flags);
    }

    // Populate fair obstacles, coins, and power-ups on non-courtyard, non-turn segments
    const allowItems =
      this.nextSegmentId > 2 &&
      (kind === 'straight' || kind === 'elevated' || kind === 'bridge');

    if (allowItems) {
      this.populateSegmentItems(
        segGroup,
        kind,
        elevatedY,
        obstacles,
        coins,
        powerUps
      );
    }

    this.scene.add(segGroup);
    this.segments.push({
      id: this.nextSegmentId++,
      kind,
      group: segGroup,
      dirIndex: dir,
      length,
      startPos,
      endPos,
      junctionPos,
      chosenTurn,
      obstacles,
      coins,
      powerUps,
      elevatedY,
    });

    this.tailDir = nextDir;
    this.tailPos.copy(endPos);
  }

  private populateSegmentItems(
    segGroup: THREE.Group,
    kind: SegmentKind,
    elevatedY: number,
    obstacles: ObstacleInstance[],
    coins: CoinItem[],
    powerUps: PowerUpItem[]
  ): void {
    const difficulty = THREE.MathUtils.clamp(this.distance / 1200, 0, 1);

    if (kind === 'bridge') {
      // Center-lane coin trail & occasional single jump/slide obstacle
      for (let z = 5; z >= -5; z -= 2) {
        const coin = createCoinMesh(this.textures);
        coin.position.set(0, 0.85, z);
        segGroup.add(coin);
        coins.push({ mesh: coin, localX: 0, localY: 0.85, localZ: z, collected: false });
      }
      if (Math.random() < 0.55) {
        const action: ObstacleAction = Math.random() < 0.55 ? 'jump' : 'slide';
        const obs = createObstacleMesh(this.worldId, action, 0, this.textures);
        obs.group.position.set(0, 0, 0);
        segGroup.add(obs.group);
        obstacles.push(obs);
        // Elevate center coin over jump obstacle
        if (action === 'jump') {
          coins.forEach((c) => {
            if (Math.abs(c.localZ) < 1.5) {
              c.localY = 1.9;
              c.mesh.position.y = 1.9;
            }
          });
        }
      }
      return;
    }

    // Straight / Elevated: up to 2 obstacle rows with guaranteed safe path
    const zSlots = [3.8, -3.8];
    const spawnChance = 0.62 + difficulty * 0.25;

    for (const zPos of zSlots) {
      if (Math.random() > spawnChance) continue;

      const patternRoll = Math.random();
      if (patternRoll < 0.35) {
        // Single full-lane blocker or 2-lane blockers (always leaves >= 1 lane open!)
        const lanes = [-1, 0, 1];
        const openLane = lanes[Math.floor(Math.random() * lanes.length)];
        const numBlockers = Math.random() < 0.35 + difficulty * 0.4 ? 2 : 1;
        const blockedLanes = lanes.filter((l) => l !== openLane).slice(0, numBlockers);

        for (const lane of blockedLanes) {
          const obs = createObstacleMesh(this.worldId, 'block', lane, this.textures);
          obs.group.position.set(lane * LANE_WIDTH, elevatedY, zPos);
          segGroup.add(obs.group);
          obstacles.push(obs);
        }
      } else if (patternRoll < 0.72) {
        // Jump or Slide across 1-2 lanes
        const action: ObstacleAction = Math.random() < 0.52 ? 'jump' : 'slide';
        const lane = [-1, 0, 1][Math.floor(Math.random() * 3)];
        const obs = createObstacleMesh(this.worldId, action, lane, this.textures);
        obs.group.position.set(lane * LANE_WIDTH, elevatedY, zPos);
        segGroup.add(obs.group);
        obstacles.push(obs);
      } else {
        // Wide jump or slide bar across 2 lanes
        const action: ObstacleAction = Math.random() < 0.5 ? 'jump' : 'slide';
        const openLane = [-1, 0, 1][Math.floor(Math.random() * 3)];
        for (const lane of [-1, 0, 1]) {
          if (lane === openLane) continue;
          const obs = createObstacleMesh(this.worldId, action, lane, this.textures);
          obs.group.position.set(lane * LANE_WIDTH, elevatedY, zPos);
          segGroup.add(obs.group);
          obstacles.push(obs);
        }
      }
    }

    // Coin Trail (arc over obstacles or curved lane line)
    const coinLane = [-1, 0, 1][Math.floor(Math.random() * 3)];
    const hasBlockerInCoinLane = obstacles.some(
      (o) => o.lane === coinLane && o.action === 'block'
    );
    const chosenCoinLane = hasBlockerInCoinLane ? (coinLane === 0 ? 1 : 0) : coinLane;

    for (let i = 0; i < 5; i++) {
      const cz = 5.5 - i * 2.5;
      const nearbyJump = obstacles.find(
        (o) =>
          o.lane === chosenCoinLane &&
          o.action === 'jump' &&
          Math.abs(o.group.position.z - cz) < 2.1
      );
      const cy = elevatedY + (nearbyJump ? 1.85 : 0.85);
      const coin = createCoinMesh(this.textures);
      coin.position.set(chosenCoinLane * LANE_WIDTH, cy, cz);
      segGroup.add(coin);
      coins.push({
        mesh: coin,
        localX: chosenCoinLane * LANE_WIDTH,
        localY: cy,
        localZ: cz,
        collected: false,
      });
    }

    // Occasional glowing Power-Up (~14% chance per straight segment)
    if (Math.random() < 0.14) {
      const types: PowerUpType[] = ['magnet', 'shield', 'speed', 'double_coins', 'super_jump'];
      const pType = types[Math.floor(Math.random() * types.length)];
      const pLane = chosenCoinLane === 0 ? 1 : -chosenCoinLane;
      const pMesh = createPowerUpMesh(pType);
      const py = elevatedY + 1.05;
      pMesh.position.set(pLane * LANE_WIDTH, py, 0);
      segGroup.add(pMesh);
      powerUps.push({
        mesh: pMesh,
        type: pType,
        localX: pLane * LANE_WIDTH,
        localY: py,
        localZ: 0,
        collected: false,
      });
    }
  }

  private triggerGameOver(reason: 'obstacle' | 'fell' | 'caught'): void {
    if (this.phase !== 'playing') return;
    this.gameOverReason = reason;
    this.cameraShake = 0.65;
    soundEngine.stopRunAudio();
    soundEngine.playCollision(true);
    if (reason === 'caught') {
      soundEngine.playCreatureRoar();
    }

    this.phase = 'gameover';
    this.fallTimer = 0.01;

    this.callbacks.onGameOver({
      distance: Math.floor(this.distance),
      coins: this.runCoins,
      score: Math.floor(this.score),
      durationSeconds: this.runDuration,
      jumps: this.jumpsCount,
      slides: this.slidesCount,
      turns: this.turnsCount,
      powerUpsCollected: this.powerUpsCount,
      isNewBestDistance: false,
      isNewBestScore: false,
      reason,
      worldId: this.worldId,
    });
  }

  private handleObstacleHit(obs: ObstacleInstance): void {
    // Invulnerable during speed boost or brief grace window
    if (this.activePowerUps.has('speed') || this.invulnTimer > 0) {
      obs.group.visible = false;
      this.cameraShake = 0.25;
      return;
    }

    // Shield absorbs 1 hit
    if (this.activePowerUps.has('shield')) {
      this.activePowerUps.delete('shield');
      this.invulnTimer = 1.1;
      this.cameraShake = 0.35;
      obs.group.visible = false;
      soundEngine.playCollision(false);
      return;
    }

    // Full block or second hit while creature is close -> caught / fatal crash
    if (obs.action === 'block' || this.creatureDist < 4.5) {
      this.creatureDist = 0.9;
      this.triggerGameOver(this.creatureDist < 4.5 ? 'caught' : 'obstacle');
      return;
    }

    // Minor stumble on jump/slide obstacle: creature surges closer!
    obs.group.visible = false;
    this.invulnTimer = 0.9;
    this.creatureDist = Math.max(2.4, this.creatureDist - 4.4);
    this.cameraShake = 0.4;
    soundEngine.playCollision(false);
    soundEngine.playCreatureRoar();
  }

  private tick = (): void => {
    if (this.destroyed) return;
    const now = performance.now();
    const rawDt = (now - this.lastTickTime) / 1000;
    this.lastTickTime = now;
    const dt = Math.min(rawDt, 0.05);
    this.elapsed += dt;

    if (this.phase === 'menu') {
      this.updateMenuScene(dt);
    } else if (this.phase === 'playing') {
      this.updateGameplay(dt);
    } else if (this.phase === 'gameover') {
      this.updateGameOverScene(dt);
    }

    this.updateSnow(dt);
    this.renderer.render(this.scene, this.camera);

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
    gl.flush();
    const poll = () => {
      if (this.destroyed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (sync && state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private updateSnow(dt: number): void {
    if (!this.snowPoints || !this.snowPositions) return;
    const px = this.playerRig.root.position.x;
    const pz = this.playerRig.root.position.z;
    this.snowPoints.position.set(px, 0, pz);

    const pos = this.snowPositions;
    for (let i = 0; i < pos.length; i += 3) {
      pos[i + 1] -= dt * 3.8;
      pos[i] += Math.sin(this.elapsed + i) * dt * 0.6;
      if (pos[i + 1] < 0) {
        pos[i + 1] = 15 + Math.random() * 2;
      }
    }
    this.snowPoints.geometry.attributes.position.needsUpdate = true;
  }

  private updateMenuScene(dt: number): void {
    this.menuOrbitAngle += dt * 0.28;
    animatePlayerRig(this.playerRig, 'idle', this.elapsed, 0, 0, 0, false);

    const radius = 5.4;
    const camX = Math.sin(this.menuOrbitAngle) * radius * 0.65;
    const camZ = Math.cos(this.menuOrbitAngle) * radius * 0.35 - 3.6;
    _camDesired.set(camX, 2.35, camZ);
    this.camPos.lerp(_camDesired, 1 - Math.exp(-4 * dt));
    this.camera.position.copy(this.camPos);

    _camTarget.set(0, 1.35, 0);
    this.camLook.lerp(_camTarget, 1 - Math.exp(-5 * dt));
    this.camera.lookAt(this.camLook);

    this.sunLight.position.set(16, 26, 12);
    this.sunLight.target.position.set(0, 0, 0);
    this.mountainBackdrop.position.set(0, 0, 0);
  }

  private updateGameOverScene(dt: number): void {
    this.fallTimer += dt;
    if (this.gameOverReason === 'fell') {
      this.playerRig.root.position.y -= dt * 11;
      animatePlayerRig(this.playerRig, 'fall', this.elapsed, 0, 0, 0, false);
    } else {
      animatePlayerRig(this.playerRig, 'fall', this.elapsed, 0, 0, 0, false);
    }
    animateCreatureRig(this.creatureRig, this.elapsed, true);

    const orbit = this.fallTimer * 0.65;
    const target = this.playerRig.root.position;
    _camDesired.set(
      target.x + Math.sin(orbit) * 5.2,
      Math.max(1.5, target.y + 3.2),
      target.z + Math.cos(orbit) * 5.2
    );
    this.camPos.lerp(_camDesired, 1 - Math.exp(-4 * dt));
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(target.x, Math.max(0.5, target.y + 1.0), target.z);
  }

  private updateGameplay(dt: number): void {
    this.runDuration += dt;
    if (this.invulnTimer > 0) this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    if (this.cameraShake > 0) this.cameraShake = Math.max(0, this.cameraShake - dt * 1.8);

    // Tick active power-ups
    for (const [type, rem] of this.activePowerUps.entries()) {
      const next = rem - dt;
      if (next <= 0) this.activePowerUps.delete(type);
      else this.activePowerUps.set(type, next);
    }

    // Smooth speed progression (cap at 26.5 m/s)
    this.baseSpeed = Math.min(26.5, 13.0 + this.distance * 0.0082);
    const speedMult = this.activePowerUps.has('speed') ? 1.42 : 1.0;
    const activeSpeed = this.baseSpeed * speedMult;

    const stepDist = activeSpeed * dt;
    this.distance += stepDist;
    this.score += stepDist * (this.activePowerUps.has('double_coins') ? 2.4 : 1.5);

    // Creature smoothly drops back while running cleanly
    this.creatureDist = THREE.MathUtils.damp(this.creatureDist, 9.6, 0.24, dt);

    let seg = this.segments[this.currentSegIndex];
    if (!seg) return;

    this.segProgress += stepDist;

    // Check missed turn on turn segments
    const isTurnSeg =
      seg.kind === 'turn_left' || seg.kind === 'turn_right' || seg.kind === 'turn_choice';
    if (isTurnSeg && this.turnLockedForSegId !== seg.id) {
      if (this.queuedAction === 'left' || this.queuedAction === 'right') {
        if (this.segProgress >= 2.6 && this.segProgress <= 11.4) {
          const act = this.queuedAction;
          this.queuedAction = null;
          this.executeTurn(seg, act);
        }
      } else if (this.segProgress > 11.4) {
        this.triggerGameOver('fell');
        return;
      }
    }

    // Advance to next segment when passing length
    while (seg && this.segProgress >= seg.length) {
      this.segProgress -= seg.length;
      this.currentSegIndex += 1;
      seg = this.segments[this.currentSegIndex];
      if (!seg) break;
    }
    if (!seg) return;

    // Recycle old segments behind and spawn new segments ahead
    while (this.currentSegIndex > 3) {
      const old = this.segments.shift();
      if (old) this.scene.remove(old.group);
      this.currentSegIndex -= 1;
    }
    while (this.segments.length - this.currentSegIndex < 11) {
      this.spawnNextProceduralSegment();
    }

    // Smooth lane switching (bridge clamps to center lane unless falling)
    const desiredOffset = this.targetLane * LANE_WIDTH;
    const prevLat = this.lateralOffset;
    this.lateralOffset = THREE.MathUtils.damp(this.lateralOffset, desiredOffset, 15, dt);
    const bankAngle = THREE.MathUtils.clamp((prevLat - this.lateralOffset) * 1.4, -0.28, 0.28);

    // Narrow bridge edge check
    if (seg.kind === 'bridge' && Math.abs(this.lateralOffset) > BRIDGE_WIDTH * 0.56 && this.isGrounded) {
      this.triggerGameOver('fell');
      return;
    }

    // Vertical Jump & Gravity physics
    const groundY = seg.elevatedY;
    if (!this.isGrounded) {
      this.verticalVel -= 32.0 * dt;
      this.verticalY += this.verticalVel * dt;
      if (this.verticalY <= groundY) {
        this.verticalY = groundY;
        this.verticalVel = 0;
        this.isGrounded = true;
        if (this.queuedAction === 'slide') {
          this.queuedAction = null;
          this.slideTimer = 0.72;
          this.slidesCount += 1;
          soundEngine.playSlide();
        } else if (this.queuedAction === 'jump') {
          this.queuedAction = null;
          this.handleInput('jump');
        }
      }
    } else {
      this.verticalY = THREE.MathUtils.damp(this.verticalY, groundY, 18, dt);
    }

    if (this.slideTimer > 0) {
      this.slideTimer = Math.max(0, this.slideTimer - dt);
    }

    // Compute world position on current segment
    const fwd = dirForward(this.playerDir, _vecA);
    const right = dirRight(this.playerDir, _vecB);

    // Position relative to segment centerline
    if (isTurnSeg && this.turnLockedForSegId === seg.id) {
      // Already turned onto outgoing arm: seg.junctionPos + fwd * (segProgress - 8)
      this.playerRig.root.position
        .copy(seg.junctionPos)
        .addScaledVector(fwd, this.segProgress - 8)
        .addScaledVector(right, this.lateralOffset);
    } else {
      this.playerRig.root.position
        .copy(seg.startPos)
        .addScaledVector(fwd, this.segProgress)
        .addScaledVector(right, this.lateralOffset);
    }
    this.playerRig.root.position.y = this.verticalY;

    // Smooth yaw interpolation on turns
    const targetYaw = dirYaw(this.playerDir);
    let diff = targetYaw - this.smoothYaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.smoothYaw += diff * (1 - Math.exp(-13 * dt));
    this.playerRig.root.rotation.y = this.smoothYaw;

    // Player animation state
    const animMode = !this.isGrounded ? 'jump' : this.slideTimer > 0 ? 'slide' : 'run';
    animatePlayerRig(
      this.playerRig,
      animMode,
      this.elapsed,
      activeSpeed,
      Math.max(0, this.verticalY - groundY),
      bankAngle,
      this.activePowerUps.has('shield')
    );

    // Footstep cadence
    if (this.isGrounded && this.slideTimer <= 0) {
      this.footstepTimer -= dt * (activeSpeed * 0.23);
      if (this.footstepTimer <= 0) {
        this.footstepTimer = 1;
        const surface =
          seg.kind === 'bridge'
            ? 'wood'
            : this.worldId === 'himalaya' || this.worldId === 'everest'
              ? 'snow'
              : 'stone';
        soundEngine.playFootstep(surface);
      }
    }

    // Update Chasing Creature behind player
    this.creatureRig.root.visible = true;
    this.creatureRig.root.position
      .copy(this.playerRig.root.position)
      .addScaledVector(fwd, -this.creatureDist);
    this.creatureRig.root.position.y = groundY;
    this.creatureRig.root.rotation.y = this.smoothYaw;
    animateCreatureRig(this.creatureRig, this.elapsed, this.creatureDist < 3.5);

    // Check collisions & collectibles on current & next segment
    const playerWorldPos = this.playerRig.root.position;
    const isSliding = this.slideTimer > 0;
    const magnetOn = this.activePowerUps.has('magnet');
    const doubleCoins = this.activePowerUps.has('double_coins');

    for (let sOffset = 0; sOffset <= 1; sOffset++) {
      const checkSeg = this.segments[this.currentSegIndex + sOffset];
      if (!checkSeg) continue;

      // Animate & collect coins
      for (const coin of checkSeg.coins) {
        if (coin.collected) continue;
        coin.mesh.rotation.y = this.elapsed * 3.5;

        coin.mesh.getWorldPosition(_vecC);
        const distToPlayer = _vecC.distanceTo(playerWorldPos);

        if (magnetOn && distToPlayer < 8.5) {
          _vecC.lerp(playerWorldPos, 1 - Math.exp(-12 * dt));
          checkSeg.group.worldToLocal(_vecC);
          coin.mesh.position.copy(_vecC);
          coin.mesh.position.y += 0.9 * dt;
        }

        if (distToPlayer < 1.35) {
          coin.collected = true;
          coin.mesh.visible = false;
          const amount = doubleCoins ? 2 : 1;
          this.runCoins += amount;
          this.score += amount * 15;
          soundEngine.playCoin();
        }
      }

      // Animate & collect Power-Ups
      for (const pu of checkSeg.powerUps) {
        if (pu.collected) continue;
        pu.mesh.rotation.y = this.elapsed * 2.4;
        pu.mesh.position.y = pu.localY + Math.sin(this.elapsed * 4) * 0.16;

        pu.mesh.getWorldPosition(_vecC);
        if (_vecC.distanceTo(playerWorldPos) < 1.55) {
          pu.collected = true;
          pu.mesh.visible = false;
          const dur = POWERUP_META[pu.type].duration;
          this.activePowerUps.set(pu.type, dur);
          this.powerUpsCount += 1;
          soundEngine.playPowerUp();
        }
      }

      // Check Obstacles
      for (const obs of checkSeg.obstacles) {
        if (!obs.group.visible) continue;

        obs.group.getWorldPosition(_vecC);
        const dx = Math.abs(playerWorldPos.x - _vecC.x);
        const dz = Math.abs(playerWorldPos.z - _vecC.z);
        const horizDist = Math.hypot(dx, dz);

        if (horizDist < 0.92) {
          const feetY = playerWorldPos.y - checkSeg.elevatedY;
          if (obs.action === 'jump') {
            if (feetY < 0.78) {
              this.handleObstacleHit(obs);
              if (this.phase !== 'playing') return;
            }
          } else if (obs.action === 'slide') {
            if (!isSliding && feetY < 1.55) {
              this.handleObstacleHit(obs);
              if (this.phase !== 'playing') return;
            }
          } else {
            // Full blocker
            if (feetY < 2.2) {
              this.handleObstacleHit(obs);
              if (this.phase !== 'playing') return;
            }
          }
        }
      }
    }

    // Third-person smooth camera with speed FOV boost & subtle jump / shake offset
    const targetFov = this.activePowerUps.has('speed') ? 72 : 62 + (activeSpeed - 13) * 0.45;
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 5, dt);
    this.camera.updateProjectionMatrix();

    const shakeX = this.cameraShake > 0 ? (Math.random() - 0.5) * this.cameraShake * 0.45 : 0;
    const shakeY = this.cameraShake > 0 ? (Math.random() - 0.5) * this.cameraShake * 0.45 : 0;

    _camDesired
      .copy(playerWorldPos)
      .addScaledVector(fwd, -6.4)
      .addScaledVector(right, this.lateralOffset * -0.15);
    _camDesired.y = 3.75 + Math.max(0, playerWorldPos.y - groundY) * 0.45 + groundY;

    this.camPos.x = THREE.MathUtils.damp(this.camPos.x, _camDesired.x, 9, dt) + shakeX;
    this.camPos.y = THREE.MathUtils.damp(this.camPos.y, _camDesired.y, 7, dt) + shakeY;
    this.camPos.z = THREE.MathUtils.damp(this.camPos.z, _camDesired.z, 9, dt);
    this.camera.position.copy(this.camPos);

    _camTarget
      .copy(playerWorldPos)
      .addScaledVector(fwd, 9.5);
    _camTarget.y = playerWorldPos.y * 0.5 + 1.45;
    this.camLook.lerp(_camTarget, 1 - Math.exp(-11 * dt));
    this.camera.lookAt(this.camLook);

    // Move shadow sun rig & mountain horizon with player
    this.sunLight.position.set(
      playerWorldPos.x + 18,
      playerWorldPos.y + 28,
      playerWorldPos.z + 14
    );
    this.sunLight.target.position.copy(playerWorldPos);
    this.mountainBackdrop.position.set(playerWorldPos.x, 0, playerWorldPos.z);

    // Throttled HUD sync (~15Hz)
    this.hudTimer += dt;
    if (this.hudTimer >= 0.065) {
      this.hudTimer = 0;
      this.pushHud();
    }
  }

  private pushHud(): void {
    const seg = this.segments[this.currentSegIndex];
    let turnPrompt: 'left' | 'right' | 'choice' | null = null;
    if (seg && this.turnLockedForSegId !== seg.id && this.segProgress < 11.4) {
      if (seg.kind === 'turn_left') turnPrompt = 'left';
      else if (seg.kind === 'turn_right') turnPrompt = 'right';
      else if (seg.kind === 'turn_choice') turnPrompt = 'choice';
    }

    const activePowerUps: ActivePowerUp[] = [];
    for (const [type, remaining] of this.activePowerUps.entries()) {
      activePowerUps.push({
        type,
        remaining,
        duration: POWERUP_META[type].duration,
      });
    }

    this.callbacks.onHudUpdate({
      distance: Math.floor(this.distance),
      coins: this.runCoins,
      score: Math.floor(this.score),
      speed: Math.round(this.baseSpeed * 10) / 10,
      dangerLevel: THREE.MathUtils.clamp((6.0 - this.creatureDist) / 4.2, 0, 1),
      hasShield: this.activePowerUps.has('shield'),
      activePowerUps,
      turnPrompt,
    });
  }

  public dispose(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    soundEngine.stopRunAudio();
    window.removeEventListener('resize', this.handleResize);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost);
    this.textures.dispose();
    this.pathMat.dispose();
    this.groundMat.dispose();
    this.trimMat.dispose();
    this.woodMat.dispose();
    this.waterMat.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
