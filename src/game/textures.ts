import * as THREE from 'three';
import type { WorldId } from '../types/game';

export interface ProceduralTextureSet {
  pathTexture: THREE.CanvasTexture;
  woodTexture: THREE.CanvasTexture;
  brickTexture: THREE.CanvasTexture;
  coinTexture: THREE.CanvasTexture;
  contactShadowTexture: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function configureColorTexture(
  canvas: HTMLCanvasElement,
  maxAnisotropy: number,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = Math.min(8, maxAnisotropy);
  tex.needsUpdate = true;
  return tex;
}

export function createPathTextureForWorld(
  worldId: WorldId,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256, 256);

  if (worldId === 'kathmandu') {
    // Traditional Kathmandu terracotta herringbone brick
    ctx.fillStyle = '#8b3e2f';
    ctx.fillRect(0, 0, 256, 256);
    const brickW = 32;
    const brickH = 16;
    for (let y = 0; y < 256; y += brickH) {
      const offset = (y / brickH) % 2 === 0 ? 0 : brickW / 2;
      for (let x = -brickW; x < 256 + brickW; x += brickW) {
        const shade = ((x * 13 + y * 7) % 24) - 12;
        ctx.fillStyle = `rgb(${156 + shade}, ${72 + Math.floor(shade * 0.5)}, ${54 + Math.floor(shade * 0.4)})`;
        ctx.fillRect(x + offset + 1, y + 1, brickW - 2, brickH - 2);
      }
    }
  } else if (worldId === 'everest' || worldId === 'himalaya') {
    // High-altitude slate & snow-dusted stone
    const base = worldId === 'everest' ? '#95b9d9' : '#737c86';
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 64; i++) {
      const x = (i % 8) * 32;
      const y = Math.floor(i / 8) * 32;
      const v = ((i * 29) % 26) - 13;
      if (worldId === 'everest') {
        ctx.fillStyle = `rgb(${152 + v}, ${190 + v}, ${225 + Math.floor(v * 0.6)})`;
      } else {
        ctx.fillStyle = `rgb(${112 + v}, ${120 + v}, ${130 + v})`;
      }
      ctx.fillRect(x + 2, y + 2, 28, 28);
    }
    // Snow frost flecks
    ctx.fillStyle = 'rgba(245, 250, 255, 0.35)';
    for (let i = 0; i < 90; i++) {
      ctx.fillRect((i * 47) % 250, (i * 83) % 250, 6, 4);
    }
  } else if (worldId === 'jungle') {
    // Earthy stone trail with mossy joints
    ctx.fillStyle = '#4c5733';
    ctx.fillRect(0, 0, 256, 256);
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 4; col++) {
        const x = col * 64 + (row % 2) * 18 - 10;
        const y = row * 32;
        const v = ((row * 17 + col * 31) % 20) - 10;
        ctx.fillStyle = `rgb(${124 + v}, ${102 + v}, ${76 + v})`;
        ctx.fillRect(x + 3, y + 3, 58, 26);
      }
    }
  } else {
    // Ancient Nepali carved sandstone blocks
    ctx.fillStyle = '#6c5c4a';
    ctx.fillRect(0, 0, 256, 256);
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 4; col++) {
        const x = col * 64 + (row % 2 === 0 ? 0 : 32);
        const y = row * 32;
        const v = ((row * 23 + col * 19) % 22) - 11;
        ctx.fillStyle = `rgb(${154 + v}, ${138 + v}, ${118 + v})`;
        ctx.fillRect((x % 256) + 2, y + 2, 60, 28);
        if (x + 64 > 256) {
          ctx.fillRect(0, y + 2, (x + 64) % 256, 28);
        }
      }
    }
    // Decorative center stone runner strip
    ctx.fillStyle = 'rgba(180, 120, 60, 0.22)';
    ctx.fillRect(96, 0, 64, 256);
  }

  // Subtle lane guide seams
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.fillRect(83, 0, 3, 256);
  ctx.fillRect(170, 0, 3, 256);

  return configureColorTexture(canvas, maxAnisotropy, 1, 3);
}

export function createTextureSet(worldId: WorldId, maxAnisotropy: number): ProceduralTextureSet {
  const pathTexture = createPathTextureForWorld(worldId, maxAnisotropy);

  // Carved Nepali wood texture
  const [woodCanvas, wCtx] = makeCanvas(128, 128);
  wCtx.fillStyle = '#5c361e';
  wCtx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 32; i++) {
    wCtx.fillStyle = i % 2 === 0 ? 'rgba(35, 18, 8, 0.28)' : 'rgba(130, 82, 42, 0.2)';
    wCtx.fillRect(0, i * 4, 128, 2);
  }
  wCtx.strokeStyle = 'rgba(28, 14, 6, 0.5)';
  wCtx.lineWidth = 2;
  wCtx.strokeRect(4, 4, 120, 120);
  const woodTexture = configureColorTexture(woodCanvas, maxAnisotropy, 1, 1);

  // Temple wall / Kathmandu brick texture
  const [brickCanvas, bCtx] = makeCanvas(128, 128);
  bCtx.fillStyle = '#733126';
  bCtx.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 16) {
    const off = (y / 16) % 2 === 0 ? 0 : 16;
    for (let x = -16; x < 128; x += 32) {
      bCtx.fillStyle = (x + y) % 3 === 0 ? '#a14332' : '#943c2c';
      bCtx.fillRect(x + off + 1, y + 1, 30, 14);
    }
  }
  const brickTexture = configureColorTexture(brickCanvas, maxAnisotropy, 2, 2);

  // Nepali Mandala Coin emblem texture
  const [coinCanvas, cCtx] = makeCanvas(128, 128);
  cCtx.fillStyle = '#f5b82e';
  cCtx.fillRect(0, 0, 128, 128);
  cCtx.strokeStyle = '#b45309';
  cCtx.lineWidth = 6;
  cCtx.beginPath();
  cCtx.arc(64, 64, 52, 0, Math.PI * 2);
  cCtx.stroke();
  cCtx.strokeStyle = '#fde68a';
  cCtx.lineWidth = 3;
  cCtx.beginPath();
  cCtx.arc(64, 64, 34, 0, Math.PI * 2);
  cCtx.stroke();
  // Square temple seal inside coin
  cCtx.strokeStyle = '#92400e';
  cCtx.lineWidth = 4;
  cCtx.strokeRect(44, 44, 40, 40);
  const coinTexture = configureColorTexture(coinCanvas, maxAnisotropy, 1, 1);

  // Soft radial contact shadow texture
  const [shadowCanvas, sCtx] = makeCanvas(128, 128);
  const grad = sCtx.createRadialGradient(64, 64, 8, 64, 64, 60);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.25)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  sCtx.fillStyle = grad;
  sCtx.fillRect(0, 0, 128, 128);
  const contactShadowTexture = new THREE.CanvasTexture(shadowCanvas);
  contactShadowTexture.colorSpace = THREE.SRGBColorSpace;
  contactShadowTexture.needsUpdate = true;

  return {
    pathTexture,
    woodTexture,
    brickTexture,
    coinTexture,
    contactShadowTexture,
    dispose: () => {
      pathTexture.dispose();
      woodTexture.dispose();
      brickTexture.dispose();
      coinTexture.dispose();
      contactShadowTexture.dispose();
    },
  };
}
