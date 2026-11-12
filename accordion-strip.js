import * as THREE from 'three';
import { mountSceneIntoContainer } from './shared-card-stage.js';

const STRIP_PALETTES = [
  { name: 'EDITORIAL / STUDIO', tint: new THREE.Color('#ffffff'), frame: new THREE.Color('#ffffff') },
  { name: 'CYBER / DUOTONE', tint: new THREE.Color('#a5f3fc'), frame: new THREE.Color('#38bdf8') },
  { name: 'WARM / KODAK', tint: new THREE.Color('#fde68a'), frame: new THREE.Color('#fbbf24') },
  { name: 'VIOLET / FILM', tint: new THREE.Color('#f5d0fe'), frame: new THREE.Color('#e879f9') }
];

const SLICE_THEMES = [
  ['#475569', '#1e293b', '#e2e8f0', '😎'],
  ['#dc2626', '#7f1d1d', '#60a5fa', '🚀'],
  ['#0284c7', '#0c4a6e', '#f472b6', '🤖'],
  ['#d97706', '#78350f', '#fde047', '🔥'],
  ['#be123c', '#4c0519', '#fb923c', '🦊'],
  ['#6d28d9', '#2e1065', '#22d3ee', '👾'],
  ['#334155', '#0f172a', '#f8fafc', '✨'],
  ['#0d9488', '#134e4a', '#f43f5e', '🧠'],
  ['#2563eb', '#1e3a8a', '#c084fc', '⚡'],
  ['#4f46e5', '#1e1b4b', '#38bdf8', '🎨'],
  ['#b91c1c', '#450a0a', '#fbbf24', '🤩'],
  ['#f59e0b', '#9a3412', '#f1f5f9', '🛸']
];

function createPortraitSliceTexture(index) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');
  const [bgA, bgB, glowCol, emoji] = SLICE_THEMES[index % SLICE_THEMES.length];

  const bg = ctx.createLinearGradient(0, 0, 256, 320);
  bg.addColorStop(0, bgA);
  bg.addColorStop(1, bgB);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 256, 320);

  // Soft radial studio spotlight behind emoji
  const sideGlow = ctx.createRadialGradient(
    128,
    148,
    14,
    128,
    156,
    165
  );
  sideGlow.addColorStop(0, glowCol);
  sideGlow.addColorStop(0.45, 'rgba(255,255,255,0.12)');
  sideGlow.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.globalAlpha = 0.62;
  ctx.fillStyle = sideGlow;
  ctx.fillRect(0, 0, 256, 320);
  ctx.globalAlpha = 1;

  // Crisp glowing backdrop ring behind emoji
  ctx.save();
  ctx.strokeStyle = glowCol;
  ctx.globalAlpha = 0.28;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(128, 152, 74, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Expressive centered Emoji
  ctx.save();
  ctx.font = '128px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;
  ctx.fillText(emoji, 128, 158);
  ctx.restore();

  // Minimal slice index pill near bottom
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.font = '700 13px "Cascadia Mono", Consolas, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(String(index + 1).padStart(2, '0'), 128, 286);
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Builds the Hover-Expanding Accordion Slice Strip scene (shared by Grid Card & Full Modal).
 */
export function createAccordionStripScene(pixelRatio = 1, options = {}) {
  const scene = new THREE.Scene();
  const baseZ = options.isPreview ? 5.65 : 5.25;
  const camera = new THREE.PerspectiveCamera(44, 1.5, 0.1, 100);
  camera.position.set(0, 0, baseZ);

  const rig = new THREE.Group();
  scene.add(rig);

  const SLICE_COUNT = 12;
  const SLICE_H = 2.55;
  const GAP = 0.04;
  const EXPANDED_W = 2.02;
  const COLLAPSED_W = 0.3;

  const baseGeo = new THREE.PlaneGeometry(1, SLICE_H);
  const sharedTint = new THREE.Color(0xffffff);
  const frameColor = new THREE.Color(0xffffff);

  const textures = [];
  const materials = [];
  const slices = [];

  for (let i = 0; i < SLICE_COUNT; i++) {
    const tex = createPortraitSliceTexture(i);
    textures.push(tex);

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: tex },
        uTint: { value: sharedTint },
        uAspectScale: { value: COLLAPSED_W / SLICE_H },
        uDim: { value: 0.85 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uMap;
        uniform vec3 uTint;
        uniform float uAspectScale, uDim;
        varying vec2 vUv;

        void main() {
          // Object-cover crop so compressed vertical slices never squash portraits
          float crop = clamp(uAspectScale * 1.15, 0.1, 1.0);
          vec2 uv = vec2(0.5 + (vUv.x - 0.5) * crop, vUv.y);
          vec3 col = texture2D(uMap, uv).rgb * uTint * uDim;
          gl_FragColor = vec4(col, 1.0);
        }
      `
    });
    materials.push(mat);

    const mesh = new THREE.Mesh(baseGeo, mat);
    mesh.userData.sliceIndex = i;
    rig.add(mesh);

    slices.push({
      index: i,
      mesh,
      mat,
      width: i === 2 ? EXPANDED_W : COLLAPSED_W,
      targetWidth: i === 2 ? EXPANDED_W : COLLAPSED_W,
      x: 0
    });
  }

  // Crisp White Highlight Border around active expanded slice + vertical hairline accent
  const borderGeo = new THREE.EdgesGeometry(new THREE.PlaneGeometry(1, SLICE_H));
  const borderMat = new THREE.LineBasicMaterial({ color: frameColor });
  const activeBorder = new THREE.LineSegments(borderGeo, borderMat);
  activeBorder.position.z = 0.025;
  rig.add(activeBorder);

  const guideGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, -SLICE_H * 0.62, -0.02),
    new THREE.Vector3(0, SLICE_H * 0.62, -0.02)
  ]);
  const guideMat = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.35
  });
  const centerGuide = new THREE.Line(guideGeo, guideMat);
  rig.add(centerGuide);

  const bgColor = new THREE.Color(0x000000);
  const state = {
    paletteIdx: 0,
    activeIndex: 2,
    autoPhase: 0,
    hasPointer: false,
    zoom: baseZ,
    targetZoom: baseZ,
    raycaster: new THREE.Raycaster(),
    ndc: new THREE.Vector2(),
    plane: new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),
    hitPt: new THREE.Vector3()
  };

  function layoutSlices(dt) {
    let totalW = 0;
    for (let i = 0; i < SLICE_COUNT; i++) {
      const s = slices[i];
      s.targetWidth = i === state.activeIndex ? EXPANDED_W : COLLAPSED_W;
      s.width += (s.targetWidth - s.width) * Math.min(1, dt * 10.5);
      totalW += s.width + (i < SLICE_COUNT - 1 ? GAP : 0);
    }

    let cursorX = -totalW * 0.5;
    for (let i = 0; i < SLICE_COUNT; i++) {
      const s = slices[i];
      const cx = cursorX + s.width * 0.5;
      s.x = cx;
      s.mesh.position.set(cx, 0, i === state.activeIndex ? 0.01 : 0);
      s.mesh.scale.set(s.width, 1, 1);
      s.mat.uniforms.uAspectScale.value = s.width / SLICE_H;
      const targetDim = i === state.activeIndex ? 1.0 : 0.78;
      s.mat.uniforms.uDim.value += (targetDim - s.mat.uniforms.uDim.value) * Math.min(1, dt * 10);

      if (i === state.activeIndex) {
        activeBorder.position.x = cx;
        activeBorder.scale.set(s.width + 0.015, 1.006, 1);
        centerGuide.position.x = cx;
      }

      cursorX += s.width + GAP;
    }
  }
  layoutSlices(0.5);

  return {
    scene,
    camera,
    getClearColor: () => bgColor,
    setSize(w, h) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    },
    update(dt) {
      if (options.isPreview) {
        // Gentle automatic showcase sweep on Box 09 card preview
        state.autoPhase += dt * 0.65;
        state.activeIndex = Math.floor(state.autoPhase) % SLICE_COUNT;
      }

      layoutSlices(dt);

      const pal = STRIP_PALETTES[state.paletteIdx];
      const blend = Math.min(1, dt * 4.5);
      sharedTint.lerp(pal.tint, blend);
      frameColor.lerp(pal.frame, blend);
      borderMat.color.copy(frameColor);

      state.zoom += (state.targetZoom - state.zoom) * 0.1;
      camera.position.z = state.zoom;
    },
    onPointerMove(e, canvas) {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const inside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
      if (!inside) return;

      state.hasPointer = true;
      state.ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      state.ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      state.raycaster.setFromCamera(state.ndc, camera);

      const hits = state.raycaster.intersectObjects(slices.map(s => s.mesh), false);
      if (hits.length) {
        state.activeIndex = hits[0].object.userData.sliceIndex;
      } else if (state.raycaster.ray.intersectPlane(state.plane, state.hitPt)) {
        // Fallback nearest slice horizontally
        let bestIdx = state.activeIndex;
        let bestDist = Infinity;
        for (const s of slices) {
          const d = Math.abs(s.x - state.hitPt.x);
          if (d < bestDist) {
            bestDist = d;
            bestIdx = s.index;
          }
        }
        state.activeIndex = bestIdx;
      }
    },
    onClick(e, canvas) {
      this.onPointerMove(e, canvas);
    },
    onWheel(e) {
      state.targetZoom = THREE.MathUtils.clamp(state.targetZoom + e.deltaY * 0.004, 3.2, 8.2);
    },
    cyclePalette() {
      state.paletteIdx = (state.paletteIdx + 1) % STRIP_PALETTES.length;
      return STRIP_PALETTES[state.paletteIdx].name;
    },
    getPaletteName() {
      return STRIP_PALETTES[state.paletteIdx].name;
    },
    dispose() {
      baseGeo.dispose();
      borderGeo.dispose();
      borderMat.dispose();
      guideGeo.dispose();
      guideMat.dispose();
      materials.forEach(m => m.dispose());
      textures.forEach(t => t.dispose());
    }
  };
}

export function mountAccordionStrip(container) {
  return mountSceneIntoContainer(container, createAccordionStripScene, {
    cursor: 'ew-resize',
    canvasClass: 'anim-live-canvas'
  });
}

