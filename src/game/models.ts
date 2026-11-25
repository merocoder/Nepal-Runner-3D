import * as THREE from 'three';
import { POWERUP_META } from '../data/gameData';
import type { CharacterConfig, OutfitConfig, PowerUpType, WorldId } from '../types/game';
import type { ProceduralTextureSet } from './textures';

export interface PlayerRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  torso: THREE.Mesh;
  headGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  scarfTail: THREE.Mesh;
  shieldAura: THREE.Mesh;
  contactShadow: THREE.Mesh;
}

export interface CreatureRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  headGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  jaw: THREE.Mesh;
}

export type ObstacleAction = 'jump' | 'slide' | 'block';

export interface ObstacleInstance {
  group: THREE.Group;
  action: ObstacleAction;
  lane: number; // -1, 0, 1
  width: number;
  height: number;
  isFallingRock?: boolean;
  fallBaseY?: number;
}

export function createPlayerRig(
  char: CharacterConfig,
  outfit: OutfitConfig,
  textures: ProceduralTextureSet
): PlayerRig {
  const root = new THREE.Group();

  // Ground contact shadow plane
  const shadowGeo = new THREE.PlaneGeometry(1.3, 1.3);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: textures.contactShadowTexture,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
  });
  const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.025;
  root.add(contactShadow);

  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  const metalness = outfit.metalness ?? 0.08;
  const roughness = outfit.roughness ?? 0.62;

  const skinMat = new THREE.MeshStandardMaterial({
    color: char.skinTone,
    roughness: 0.58,
    metalness: 0.02,
  });
  const torsoMat = new THREE.MeshStandardMaterial({
    color: outfit.torsoColor,
    roughness,
    metalness,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: outfit.accentColor,
    roughness: 0.45,
    metalness: 0.25,
  });
  const pantsMat = new THREE.MeshStandardMaterial({
    color: outfit.pantsColor,
    roughness: 0.78,
    metalness: 0.04,
  });
  const shoeMat = new THREE.MeshStandardMaterial({
    color: outfit.shoeColor,
    roughness: 0.5,
    metalness: 0.12,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: char.hairColor,
    roughness: 0.8,
    metalness: 0.05,
  });

  // Pelvis / Belt / Patuka sash
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.16, 0.28), accentMat);
  pelvis.position.y = 0.78;
  pelvis.castShadow = true;
  bodyPivot.add(pelvis);

  // Torso (tapered athletic chest)
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.56, 0.3), torsoMat);
  torso.position.y = 1.12;
  torso.castShadow = true;
  torso.receiveShadow = true;
  bodyPivot.add(torso);

  // Chest V-trim / collar detail
  const collar = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.32), accentMat);
  collar.position.set(0, 1.35, 0);
  bodyPivot.add(collar);

  // Trailing Scarf
  const scarfMat = new THREE.MeshStandardMaterial({
    color: outfit.scarfColor,
    roughness: 0.65,
    metalness: 0.05,
  });
  const scarfNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.1, 12), scarfMat);
  scarfNeck.position.set(0, 1.43, 0);
  bodyPivot.add(scarfNeck);

  const scarfTail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.45), scarfMat);
  scarfTail.position.set(0.08, 1.4, 0.22);
  scarfTail.castShadow = true;
  bodyPivot.add(scarfTail);

  // Backpack / Satchel / Cape
  if (char.backpackStyle !== 'none') {
    if (char.backpackStyle === 'royal_cape') {
      const cape = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.72, 0.06), accentMat);
      cape.position.set(0, 1.05, 0.19);
      cape.rotation.x = 0.14;
      cape.castShadow = true;
      bodyPivot.add(cape);
    } else {
      const packColor =
        char.backpackStyle === 'satchel'
          ? 0x7c4a27
          : char.backpackStyle === 'expedition'
            ? 0xd97706
            : 0x3b4d36;
      const packMat = new THREE.MeshStandardMaterial({
        color: packColor,
        roughness: 0.72,
        metalness: 0.1,
      });
      const pack = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.46, 0.22), packMat);
      pack.position.set(0, 1.15, 0.24);
      pack.castShadow = true;
      bodyPivot.add(pack);

      const roll = new THREE.Mesh(
        new THREE.CylinderGeometry(0.075, 0.075, 0.4, 10),
        new THREE.MeshStandardMaterial({ color: 0xe5e0d5, roughness: 0.75 })
      );
      roll.rotation.z = Math.PI / 2;
      roll.position.set(0, 1.41, 0.24);
      bodyPivot.add(roll);
    }
  }

  // Head Group
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.48, 0);
  bodyPivot.add(headGroup);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.34), skinMat);
  head.position.y = 0.17;
  head.castShadow = true;
  headGroup.add(head);

  // Eyes (facing -Z forward)
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x161616, roughness: 0.2 });
  const leftEye = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.055, 0.03), eyeMat);
  leftEye.position.set(-0.08, 0.19, -0.17);
  const rightEye = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.055, 0.03), eyeMat);
  rightEye.position.set(0.08, 0.19, -0.17);
  headGroup.add(leftEye, rightEye);

  // Hair base
  const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.22, 0.24), hairMat);
  hairBack.position.set(0, 0.22, 0.06);
  headGroup.add(hairBack);

  // Hat Styles (Nepali Dhaka Topi, Cap, Headband, Safari, Fur Hood, Crown)
  if (char.hatStyle === 'dhaka_topi') {
    const topiBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.19, 0.18, 8),
      new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.7 })
    );
    topiBody.position.set(0, 0.38, 0.01);
    topiBody.rotation.x = -0.1;
    topiBody.castShadow = true;
    headGroup.add(topiBody);

    const topiPattern = new THREE.Mesh(
      new THREE.CylinderGeometry(0.186, 0.192, 0.06, 8),
      new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.45, metalness: 0.2 })
    );
    topiPattern.position.set(0, 0.33, 0.01);
    topiPattern.rotation.x = -0.1;
    headGroup.add(topiPattern);
  } else if (char.hatStyle === 'cap') {
    const capDome = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.12, 0.36),
      new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.6 })
    );
    capDome.position.set(0, 0.34, 0);
    headGroup.add(capDome);

    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.035, 0.18),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5 })
    );
    visor.position.set(0, 0.3, -0.22);
    headGroup.add(visor);
  } else if (char.hatStyle === 'headband') {
    const band = new THREE.Mesh(
      new THREE.BoxGeometry(0.37, 0.07, 0.37),
      new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.65 })
    );
    band.position.set(0, 0.27, 0);
    headGroup.add(band);
  } else if (char.hatStyle === 'fur_hood') {
    const hood = new THREE.Mesh(
      new THREE.BoxGeometry(0.41, 0.39, 0.38),
      new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.75 })
    );
    hood.position.set(0, 0.2, 0.04);
    headGroup.add(hood);
    const furRim = new THREE.Mesh(
      new THREE.BoxGeometry(0.43, 0.1, 0.12),
      new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.9 })
    );
    furRim.position.set(0, 0.35, -0.14);
    headGroup.add(furRim);
  } else if (char.hatStyle === 'safari') {
    const brim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.34, 0.04, 14),
      new THREE.MeshStandardMaterial({ color: 0x927048, roughness: 0.75 })
    );
    brim.position.set(0, 0.33, 0);
    const crownHat = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.2, 0.13, 12),
      new THREE.MeshStandardMaterial({ color: 0x7c5c38, roughness: 0.75 })
    );
    crownHat.position.set(0, 0.4, 0);
    headGroup.add(brim, crownHat);
  } else if (char.hatStyle === 'crown') {
    const crownMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.22,
      metalness: 0.88,
    });
    const baseRing = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.1, 10), crownMat);
    baseRing.position.set(0, 0.36, 0);
    const spire = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.2, 6), crownMat);
    spire.position.set(0, 0.48, 0);
    headGroup.add(baseRing, spire);
  } else {
    const hairTop = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.1, 0.36), hairMat);
    hairTop.position.set(0, 0.35, 0);
    headGroup.add(hairTop);
  }

  // Arms
  const makeArm = (xOffset: number): THREE.Group => {
    const armPivot = new THREE.Group();
    armPivot.position.set(xOffset, 1.34, 0);
    const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.26, 0.15), torsoMat);
    sleeve.position.y = -0.11;
    sleeve.castShadow = true;
    const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.24, 0.12), skinMat);
    forearm.position.y = -0.34;
    forearm.castShadow = true;
    armPivot.add(sleeve, forearm);
    bodyPivot.add(armPivot);
    return armPivot;
  };
  const leftArm = makeArm(-0.33);
  const rightArm = makeArm(0.33);

  // Legs + Trekking Shoes
  const makeLeg = (xOffset: number): THREE.Group => {
    const legPivot = new THREE.Group();
    legPivot.position.set(xOffset, 0.74, 0);
    const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.42, 0.18), pantsMat);
    thigh.position.y = -0.21;
    thigh.castShadow = true;
    const shin = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.26, 0.16), pantsMat);
    shin.position.y = -0.5;
    shin.castShadow = true;
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.13, 0.26), shoeMat);
    boot.position.set(0, -0.66, -0.04);
    boot.castShadow = true;
    legPivot.add(thigh, shin, boot);
    bodyPivot.add(legPivot);
    return legPivot;
  };
  const leftLeg = makeLeg(-0.14);
  const rightLeg = makeLeg(0.14);

  // Shield Aura Bubble
  const shieldAura = new THREE.Mesh(
    new THREE.SphereGeometry(0.95, 20, 16),
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.7,
      transparent: true,
      opacity: 0.26,
      roughness: 0.1,
      metalness: 0.2,
      depthWrite: false,
    })
  );
  shieldAura.position.y = 0.95;
  shieldAura.visible = false;
  root.add(shieldAura);

  return {
    root,
    bodyPivot,
    torso,
    headGroup,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    scarfTail,
    shieldAura,
    contactShadow,
  };
}

export function animatePlayerRig(
  rig: PlayerRig,
  mode: 'idle' | 'run' | 'jump' | 'slide' | 'fall' | 'celebrate',
  time: number,
  speed: number,
  jumpHeight: number,
  bankAngle: number,
  hasShield: boolean
): void {
  rig.shieldAura.visible = hasShield;
  if (hasShield) {
    rig.shieldAura.rotation.y = time * 1.8;
    const pulse = 1 + Math.sin(time * 5) * 0.04;
    rig.shieldAura.scale.setScalar(pulse);
  }

  // Contact shadow shrinks & fades with jump height
  const shadowScale = THREE.MathUtils.clamp(1 - jumpHeight * 0.24, 0.42, 1);
  rig.contactShadow.scale.set(shadowScale, shadowScale, 1);
  (rig.contactShadow.material as THREE.MeshBasicMaterial).opacity = THREE.MathUtils.clamp(
    0.65 - jumpHeight * 0.16,
    0.18,
    0.65
  );

  if (mode === 'idle') {
    const breath = Math.sin(time * 2.2) * 0.03;
    rig.bodyPivot.position.set(0, 0, 0);
    rig.bodyPivot.rotation.set(0, 0, 0);
    rig.torso.position.y = 1.12 + breath;
    rig.headGroup.position.y = 1.48 + breath;
    rig.headGroup.rotation.set(0, Math.sin(time * 0.9) * 0.12, 0);
    rig.leftLeg.rotation.set(0, 0, 0);
    rig.rightLeg.rotation.set(0, 0, 0);
    rig.leftArm.rotation.set(0.08, 0, 0.12);
    rig.rightArm.rotation.set(-0.08, 0, -0.12);
    rig.scarfTail.rotation.x = Math.sin(time * 3.5) * 0.15;
    return;
  }

  if (mode === 'slide') {
    rig.bodyPivot.position.set(0, -0.48, 0);
    rig.bodyPivot.rotation.set(-0.85, 0, bankAngle * 0.4);
    rig.leftLeg.rotation.set(-0.35, 0, 0);
    rig.rightLeg.rotation.set(0.25, 0, 0);
    rig.leftArm.rotation.set(0.7, 0, 0.35);
    rig.rightArm.rotation.set(0.7, 0, -0.35);
    rig.headGroup.rotation.set(0.55, 0, 0);
    rig.scarfTail.rotation.x = 0.4 + Math.sin(time * 18) * 0.15;
    return;
  }

  if (mode === 'jump') {
    rig.bodyPivot.position.set(0, 0, 0);
    rig.bodyPivot.rotation.set(0.12, 0, bankAngle);
    rig.leftLeg.rotation.set(0.55, 0, 0);
    rig.rightLeg.rotation.set(-0.4, 0, 0);
    rig.leftArm.rotation.set(-1.1, 0, 0.25);
    rig.rightArm.rotation.set(-0.7, 0, -0.25);
    rig.headGroup.rotation.set(-0.08, 0, 0);
    rig.scarfTail.rotation.x = -0.35 + Math.sin(time * 16) * 0.18;
    return;
  }

  if (mode === 'fall') {
    rig.bodyPivot.position.set(0, 0, 0);
    rig.bodyPivot.rotation.set(0.95, 0, 0.25);
    rig.leftLeg.rotation.set(-0.6, 0, -0.2);
    rig.rightLeg.rotation.set(0.5, 0, 0.2);
    rig.leftArm.rotation.set(-2.0, 0, 0.5);
    rig.rightArm.rotation.set(-1.6, 0, -0.5);
    rig.headGroup.rotation.set(0.2, 0, 0);
    return;
  }

  if (mode === 'celebrate') {
    const hop = Math.abs(Math.sin(time * 6)) * 0.18;
    rig.bodyPivot.position.set(0, hop, 0);
    rig.bodyPivot.rotation.set(0, Math.sin(time * 2) * 0.2, 0);
    rig.leftArm.rotation.set(-2.6, 0, 0.35);
    rig.rightArm.rotation.set(-2.6, 0, -0.35);
    rig.leftLeg.rotation.set(0, 0, 0);
    rig.rightLeg.rotation.set(0, 0, 0);
    return;
  }

  // Running cycle proportional to world speed
  const freq = 9 + speed * 0.35;
  const phase = time * freq;
  const swing = Math.sin(phase);
  const bob = Math.abs(Math.cos(phase)) * 0.09;

  rig.bodyPivot.position.set(0, bob, 0);
  rig.bodyPivot.rotation.set(0.16, 0, bankAngle);
  rig.headGroup.rotation.set(-0.1, Math.sin(phase * 0.5) * 0.04, 0);
  rig.leftLeg.rotation.set(swing * 0.95, 0, 0);
  rig.rightLeg.rotation.set(-swing * 0.95, 0, 0);
  rig.leftArm.rotation.set(-swing * 0.85, 0, 0.14);
  rig.rightArm.rotation.set(swing * 0.85, 0, -0.14);
  rig.scarfTail.rotation.x = 0.2 + Math.sin(time * 18) * 0.25;
}

export function createCreatureRig(): CreatureRig {
  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  const furMat = new THREE.MeshStandardMaterial({
    color: 0x2c3442,
    roughness: 0.88,
    metalness: 0.05,
  });
  const maneMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.92,
    metalness: 0.02,
  });
  const hornMat = new THREE.MeshStandardMaterial({
    color: 0xe7d3b0,
    roughness: 0.45,
    metalness: 0.15,
  });
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0xff6b00,
    emissive: 0xff4500,
    emissiveIntensity: 2.2,
    roughness: 0.2,
  });

  // Broad hunched torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.05, 0.82), furMat);
  torso.position.y = 1.45;
  torso.castShadow = true;
  bodyPivot.add(torso);

  // Shaggy frost mane around shoulders
  const mane = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.52, 0.96), maneMat);
  mane.position.set(0, 1.82, -0.05);
  mane.castShadow = true;
  bodyPivot.add(mane);

  // Head + Horns + Glowing Amber Eyes
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 2.02, -0.34);
  bodyPivot.add(headGroup);

  const skull = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.58, 0.62), furMat);
  skull.position.y = 0.2;
  skull.castShadow = true;
  headGroup.add(skull);

  const brow = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.16, 0.24), maneMat);
  brow.position.set(0, 0.36, -0.26);
  headGroup.add(brow);

  const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.06), eyeMat);
  eyeL.position.set(-0.18, 0.26, -0.32);
  const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.06), eyeMat);
  eyeR.position.set(0.18, 0.26, -0.32);
  headGroup.add(eyeL, eyeR);

  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.18, 0.52), furMat);
  jaw.position.set(0, -0.02, -0.1);
  headGroup.add(jaw);

  // Curved Himalayan ram-like horns
  const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.55, 8), hornMat);
  hornL.position.set(-0.34, 0.52, -0.04);
  hornL.rotation.set(0.3, 0, 0.55);
  const hornR = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.55, 8), hornMat);
  hornR.position.set(0.34, 0.52, -0.04);
  hornR.rotation.set(0.3, 0, -0.55);
  headGroup.add(hornL, hornR);

  // Heavy clawed arms
  const makeCreatureArm = (x: number): THREE.Group => {
    const g = new THREE.Group();
    g.position.set(x, 1.76, -0.1);
    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.72, 0.34), furMat);
    upper.position.y = -0.32;
    upper.castShadow = true;
    const fist = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.3, 0.38), maneMat);
    fist.position.y = -0.76;
    g.add(upper, fist);
    bodyPivot.add(g);
    return g;
  };
  const leftArm = makeCreatureArm(-0.74);
  const rightArm = makeCreatureArm(0.74);

  const makeCreatureLeg = (x: number): THREE.Group => {
    const g = new THREE.Group();
    g.position.set(x, 0.94, 0);
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.94, 0.4), furMat);
    leg.position.y = -0.47;
    leg.castShadow = true;
    g.add(leg);
    bodyPivot.add(g);
    return g;
  };
  const leftLeg = makeCreatureLeg(-0.34);
  const rightLeg = makeCreatureLeg(0.34);

  return { root, bodyPivot, headGroup, leftArm, rightArm, leftLeg, rightLeg, jaw };
}

export function animateCreatureRig(rig: CreatureRig, time: number, catching: boolean): void {
  const phase = time * (catching ? 16 : 12);
  const swing = Math.sin(phase);
  rig.bodyPivot.position.y = Math.abs(Math.cos(phase)) * 0.14;
  rig.bodyPivot.rotation.x = catching ? 0.38 : 0.24;
  rig.leftLeg.rotation.x = swing * 0.85;
  rig.rightLeg.rotation.x = -swing * 0.85;
  rig.leftArm.rotation.x = catching ? -1.4 + swing * 0.4 : -0.7 - swing * 0.9;
  rig.rightArm.rotation.x = catching ? -1.4 - swing * 0.4 : -0.7 + swing * 0.9;
  rig.jaw.rotation.x = 0.2 + Math.abs(Math.sin(time * 8)) * 0.32;
}

export function createPagodaTemple(
  textures: ProceduralTextureSet,
  worldId: WorldId,
  scale = 1
): THREE.Group {
  const group = new THREE.Group();

  const stoneColor = worldId === 'everest' || worldId === 'himalaya' ? 0x64748b : 0x786c5c;
  const roofColor =
    worldId === 'kathmandu'
      ? 0x992e22
      : worldId === 'himalaya' || worldId === 'everest'
        ? 0x1e3a8a
        : 0x8c2f23;

  const stoneMat = new THREE.MeshStandardMaterial({ color: stoneColor, roughness: 0.85 });
  const brickMat = new THREE.MeshStandardMaterial({
    map: textures.brickTexture,
    color: worldId === 'everest' ? 0xcbd5e1 : 0xffffff,
    roughness: 0.78,
  });
  const woodMat = new THREE.MeshStandardMaterial({
    map: textures.woodTexture,
    roughness: 0.68,
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: roofColor,
    roughness: 0.52,
    metalness: 0.12,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xf5b82e,
    roughness: 0.22,
    metalness: 0.88,
  });

  // Stepped stone plinth
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.7, 5.6), stoneMat);
  plinth.position.y = 0.35;
  plinth.receiveShadow = true;
  plinth.castShadow = true;
  group.add(plinth);

  // Lower shrine chamber
  const chamber1 = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.6, 4.2), brickMat);
  chamber1.position.y = 2.0;
  chamber1.castShadow = true;
  group.add(chamber1);

  // Carved wooden doorway
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.85, 0.18), woodMat);
  door.position.set(0, 1.62, 2.12);
  group.add(door);

  // Tier 1 Roof
  const roof1 = new THREE.Mesh(new THREE.ConeGeometry(4.1, 1.25, 4), roofMat);
  roof1.rotation.y = Math.PI / 4;
  roof1.position.y = 3.85;
  roof1.castShadow = true;
  group.add(roof1);

  // Upper chamber
  const chamber2 = new THREE.Mesh(new THREE.BoxGeometry(2.7, 1.8, 2.7), brickMat);
  chamber2.position.y = 5.0;
  chamber2.castShadow = true;
  group.add(chamber2);

  // Tier 2 Roof
  const roof2 = new THREE.Mesh(new THREE.ConeGeometry(2.9, 1.15, 4), roofMat);
  roof2.rotation.y = Math.PI / 4;
  roof2.position.y = 6.3;
  roof2.castShadow = true;
  group.add(roof2);

  // Golden Gajur Pinnacle
  const gajurBase = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.35, 0.38, 10), goldMat);
  gajurBase.position.y = 7.0;
  const gajurTip = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.72, 10), goldMat);
  gajurTip.position.y = 7.52;
  group.add(gajurBase, gajurTip);

  group.scale.setScalar(scale);
  return group;
}

export function createPrayerFlagArch(textures: ProceduralTextureSet): THREE.Group {
  const group = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ map: textures.woodTexture, roughness: 0.72 });

  const leftPole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 4.4, 8), woodMat);
  leftPole.position.set(-3.3, 2.2, 0);
  leftPole.castShadow = true;
  const rightPole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 4.4, 8), woodMat);
  rightPole.position.set(3.3, 2.2, 0);
  rightPole.castShadow = true;
  const rope = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 6.8, 6),
    new THREE.MeshStandardMaterial({ color: 0xdfd3be, roughness: 0.8 })
  );
  rope.rotation.z = Math.PI / 2;
  rope.position.set(0, 4.05, 0);
  group.add(leftPole, rightPole, rope);

  const flagColors = [0x2563eb, 0xf8fafc, 0xdc2626, 0x16a34a, 0xfacc15];
  for (let i = 0; i < 10; i++) {
    const t = i / 9;
    const x = THREE.MathUtils.lerp(-2.7, 2.7, t);
    const sag = Math.sin(t * Math.PI) * 0.35;
    const flag = new THREE.Mesh(
      new THREE.PlaneGeometry(0.42, 0.52),
      new THREE.MeshStandardMaterial({
        color: flagColors[i % flagColors.length],
        roughness: 0.75,
        side: THREE.DoubleSide,
      })
    );
    flag.position.set(x, 3.76 - sag, 0);
    flag.rotation.x = 0.25;
    group.add(flag);
  }

  return group;
}

export function createBrassBellGate(textures: ProceduralTextureSet): THREE.Group {
  const group = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ map: textures.woodTexture, roughness: 0.65 });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xd99b26,
    roughness: 0.26,
    metalness: 0.85,
  });

  const postL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 4.5, 0.32), woodMat);
  postL.position.set(-3.2, 2.25, 0);
  const postR = new THREE.Mesh(new THREE.BoxGeometry(0.32, 4.5, 0.32), woodMat);
  postR.position.set(3.2, 2.25, 0);
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.42, 0.45), woodMat);
  lintel.position.set(0, 4.35, 0);
  const bell = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.45, 12), goldMat);
  bell.position.set(0, 3.9, 0);

  group.add(postL, postR, lintel, bell);
  return group;
}

export function createSceneryTree(worldId: WorldId, variant = 0): THREE.Group {
  const group = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4b3222, roughness: 0.88 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 2.2, 7), trunkMat);
  trunk.position.y = 1.1;
  trunk.castShadow = true;
  group.add(trunk);

  if (worldId === 'himalaya' || worldId === 'everest') {
    const pineMat = new THREE.MeshStandardMaterial({
      color: variant % 2 === 0 ? 0x1e463a : 0x265445,
      roughness: 0.82,
    });
    const snowMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.72 });
    for (let i = 0; i < 3; i++) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(1.4 - i * 0.3, 1.5, 7), pineMat);
      cone.position.y = 2.3 + i * 0.95;
      cone.castShadow = true;
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.95 - i * 0.2, 0.55, 7), snowMat);
      cap.position.y = 2.75 + i * 0.95;
      group.add(cone, cap);
    }
  } else if (worldId === 'jungle') {
    const leafColor = variant % 2 === 0 ? 0x2d6a3e : 0x3b7a38;
    const leafMat = new THREE.MeshStandardMaterial({ color: leafColor, roughness: 0.8 });
    const c1 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.3, 0), leafMat);
    c1.position.set(0, 2.9, 0);
    const c2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.95, 0), leafMat);
    c2.position.set(0.8, 2.5, 0.3);
    const c3 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.9, 0), leafMat);
    c3.position.set(-0.75, 2.6, -0.2);
    c1.castShadow = true;
    group.add(c1, c2, c3);
  } else {
    // Nepali rhododendron / Himalayan cypress
    const foliageColor = variant % 3 === 0 ? 0x9f2d38 : 0x2c5e3b;
    const fMat = new THREE.MeshStandardMaterial({ color: foliageColor, roughness: 0.8 });
    const crown1 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.15, 0), fMat);
    crown1.position.y = 2.65;
    crown1.castShadow = true;
    const crown2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.82, 0), fMat);
    crown2.position.set(0.45, 3.25, 0);
    group.add(crown1, crown2);
  }

  return group;
}

export function createObstacleMesh(
  worldId: WorldId,
  action: ObstacleAction,
  lane: number,
  textures: ProceduralTextureSet
): ObstacleInstance {
  const group = new THREE.Group();

  const woodMat = new THREE.MeshStandardMaterial({ map: textures.woodTexture, roughness: 0.72 });
  const stoneMat = new THREE.MeshStandardMaterial({
    color: worldId === 'everest' ? 0x93c5fd : worldId === 'himalaya' ? 0x64748b : 0x877b6c,
    roughness: 0.82,
  });
  const warnMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.4,
    metalness: 0.25,
  });

  if (action === 'jump') {
    // Low barrier (height ~0.95m) — jump over!
    if (worldId === 'himalaya' || worldId === 'everest') {
      const base = new THREE.Mesh(new THREE.DodecahedronGeometry(0.68, 0), stoneMat);
      base.scale.set(1.35, 0.75, 0.9);
      base.position.y = 0.45;
      base.castShadow = true;
      const cap = new THREE.Mesh(
        new THREE.BoxGeometry(1.3, 0.22, 0.75),
        new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.65 })
      );
      cap.position.y = 0.82;
      group.add(base, cap);
    } else if (worldId === 'jungle') {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 1.75, 10), woodMat);
      log.rotation.z = Math.PI / 2;
      log.position.y = 0.42;
      log.castShadow = true;
      const moss = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 0.14, 0.45),
        new THREE.MeshStandardMaterial({ color: 0x3f7d32, roughness: 0.85 })
      );
      moss.position.y = 0.82;
      group.add(log, moss);
    } else if (worldId === 'kathmandu') {
      // Traditional hay cart / wooden fence with brass trim
      const fence = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.82, 0.42), woodMat);
      fence.position.y = 0.45;
      fence.castShadow = true;
      const topBar = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.14, 0.48), warnMat);
      topBar.position.y = 0.88;
      group.add(fence, topBar);
    } else {
      // Carved temple stone block
      const block = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.86, 0.7), stoneMat);
      block.position.y = 0.43;
      block.castShadow = true;
      const frieze = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.15, 0.76), warnMat);
      frieze.position.y = 0.86;
      group.add(block, frieze);
    }
    return { group, action, lane, width: 1.5, height: 0.95 };
  }

  if (action === 'slide') {
    // High beam with clear gap underneath (y = 1.25m..2.5m) — slide under!
    const postL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 2.35, 0.24), woodMat);
    postL.position.set(-0.82, 1.18, 0);
    postL.castShadow = true;
    const postR = new THREE.Mesh(new THREE.BoxGeometry(0.24, 2.35, 0.24), woodMat);
    postR.position.set(0.82, 1.18, 0);
    postR.castShadow = true;

    const beamColor =
      worldId === 'jungle'
        ? 0x2f6b2f
        : worldId === 'everest'
          ? 0xbae6fd
          : worldId === 'kathmandu'
            ? 0x992e22
            : 0x6e4427;
    const beamMat = new THREE.MeshStandardMaterial({ color: beamColor, roughness: 0.65 });
    const beam = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.82, 0.48), beamMat);
    beam.position.y = 1.85;
    beam.castShadow = true;

    const trim = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.14, 0.52), warnMat);
    trim.position.y = 1.42;

    group.add(postL, postR, beam, trim);
    return { group, action, lane, width: 1.6, height: 2.3 };
  }

  // Full lane blocker ('block') — must switch lanes!
  const isFallingRock = worldId === 'himalaya' && Math.random() < 0.45;
  if (worldId === 'himalaya' || worldId === 'everest') {
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.92, 0),
      new THREE.MeshStandardMaterial({
        color: worldId === 'everest' ? 0x7dd3fc : 0x57606f,
        roughness: worldId === 'everest' ? 0.35 : 0.85,
      })
    );
    rock.scale.set(0.95, 1.45, 0.95);
    rock.position.y = 1.25;
    rock.castShadow = true;
    group.add(rock);
  } else if (worldId === 'jungle') {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.72, 2.7, 9), woodMat);
    trunk.position.y = 1.35;
    trunk.castShadow = true;
    const bush = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.9, 0),
      new THREE.MeshStandardMaterial({ color: 0x2d6a3e, roughness: 0.82 })
    );
    bush.position.y = 2.6;
    group.add(trunk, bush);
  } else {
    // Temple pillar / Stone guardian statue
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.45, 1.3), stoneMat);
    plinth.position.y = 0.22;
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.46, 0.54, 2.1, 8),
      worldId === 'kathmandu'
        ? new THREE.MeshStandardMaterial({ map: textures.brickTexture, roughness: 0.78 })
        : stoneMat
    );
    pillar.position.y = 1.45;
    pillar.castShadow = true;
    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.32, 1.2), warnMat);
    cap.position.y = 2.62;
    group.add(plinth, pillar, cap);
  }

  return {
    group,
    action,
    lane,
    width: 1.4,
    height: 2.7,
    isFallingRock,
    fallBaseY: 0,
  };
}

export function createCoinMesh(textures: ProceduralTextureSet): THREE.Group {
  const group = new THREE.Group();
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.22,
    metalness: 0.88,
  });
  const faceMat = new THREE.MeshStandardMaterial({
    map: textures.coinTexture,
    roughness: 0.25,
    metalness: 0.82,
    emissive: 0x92400e,
    emissiveIntensity: 0.22,
  });
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.08, 16), [
    rimMat,
    faceMat,
    faceMat,
  ]);
  disc.rotation.x = Math.PI / 2;
  disc.castShadow = false;
  group.add(disc);
  return group;
}

export function createPowerUpMesh(type: PowerUpType): THREE.Group {
  const meta = POWERUP_META[type];
  const group = new THREE.Group();

  const coreMat = new THREE.MeshStandardMaterial({
    color: meta.hex,
    emissive: meta.hex,
    emissiveIntensity: 0.9,
    roughness: 0.2,
    metalness: 0.65,
  });

  const ringMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: meta.hex,
    emissiveIntensity: 0.5,
    roughness: 0.25,
    metalness: 0.7,
  });

  let core: THREE.Mesh;
  if (type === 'shield') {
    core = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), coreMat);
  } else if (type === 'magnet') {
    core = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.1, 10, 20, Math.PI * 1.35), coreMat);
  } else if (type === 'speed') {
    core = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.78, 6), coreMat);
    core.rotation.x = Math.PI / 2;
  } else if (type === 'double_coins') {
    core = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.14, 16), coreMat);
  } else {
    core = new THREE.Mesh(new THREE.TorusKnotGeometry(0.24, 0.08, 36, 8), coreMat);
  }

  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.045, 8, 24), ringMat);
  group.add(core, halo);
  return group;
}
