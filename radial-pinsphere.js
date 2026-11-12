import * as THREE from 'three';
import { mountSceneIntoContainer } from './shared-card-stage.js';

const PIN_PALETTES = [
  { name: 'SPECTRUM / PRISM', hueStart: 0.0, hueSpan: 1.0, sat: 0.96, light: 0.52 },
  { name: 'CYBER / NEON', hueStart: 0.5, hueSpan: 0.36, sat: 0.98, light: 0.54 },
  { name: 'SOLAR / FLARE', hueStart: 0.95, hueSpan: 0.2, sat: 0.96, light: 0.52 },
  { name: 'AURORA / ICE', hueStart: 0.38, hueSpan: 0.28, sat: 0.9, light: 0.56 }
];

/**
 * Builds the Chromatic Radial Pinburst Sphere scene (shared by Grid Card & Full Modal).
 */
export function createPinsphereScene(pixelRatio = 1, options = {}) {
  const scene = new THREE.Scene();
  const baseZ = options.isPreview ? 8.15 : 7.6;
  const camera = new THREE.PerspectiveCamera(46, 1.5, 0.1, 100);
  camera.position.set(0, 0, baseZ);

  const rig = new THREE.Group();
  scene.add(rig);

  let seed = 90210;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const SPOKE_COUNT = 196;
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const dirs = new Float32Array(SPOKE_COUNT * 3);
  const curTips = new Float32Array(SPOKE_COUNT * 3);
  const baseLens = new Float32Array(SPOKE_COUNT);
  const phases = new Float32Array(SPOKE_COUNT);
  const speeds = new Float32Array(SPOKE_COUNT);
  const colorSeeds = new Float32Array(SPOKE_COUNT);

  const linePositions = new Float32Array(SPOKE_COUNT * 2 * 3);
  const lineColors = new Float32Array(SPOKE_COUNT * 2 * 3);
  const tipPositions = new Float32Array(SPOKE_COUNT * 3);
  const tipSizes = new Float32Array(SPOKE_COUNT);
  const tempColor = new THREE.Color();

  for (let i = 0; i < SPOKE_COUNT; i++) {
    const y = 1 - (i / (SPOKE_COUNT - 1)) * 2;
    const rY = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = goldenAngle * i + (rand() - 0.5) * 0.28;

    const dx = Math.cos(theta) * rY;
    const dz = Math.sin(theta) * rY;
    const inv = 1 / (Math.hypot(dx, y, dz) || 1);

    dirs[i * 3] = dx * inv;
    dirs[i * 3 + 1] = y * inv;
    dirs[i * 3 + 2] = dz * inv;

    baseLens[i] = 1.15 + Math.pow(rand(), 0.78) * 2.35;
    curTips[i * 3] = dirs[i * 3] * baseLens[i];
    curTips[i * 3 + 1] = dirs[i * 3 + 1] * baseLens[i];
    curTips[i * 3 + 2] = dirs[i * 3 + 2] * baseLens[i];
    phases[i] = rand() * Math.PI * 2;
    speeds[i] = 1.0 + rand() * 1.4;
    colorSeeds[i] = rand();
    tipSizes[i] = 0.75 + rand() * 0.75;
  }

  const lineGeo = new THREE.BufferGeometry();
  const linePosAttr = new THREE.BufferAttribute(linePositions, 3);
  const lineColAttr = new THREE.BufferAttribute(lineColors, 3);
  lineGeo.setAttribute('position', linePosAttr);
  lineGeo.setAttribute('color', lineColAttr);

  const lineMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.94
  });
  rig.add(new THREE.LineSegments(lineGeo, lineMat));

  const tipGeo = new THREE.BufferGeometry();
  const tipPosAttr = new THREE.BufferAttribute(tipPositions, 3);
  tipGeo.setAttribute('position', tipPosAttr);
  tipGeo.setAttribute('aSize', new THREE.BufferAttribute(tipSizes, 1));

  const tipMat = new THREE.ShaderMaterial({
    uniforms: { uPixelRatio: { value: pixelRatio } },
    transparent: true,
    depthWrite: false,
    vertexShader: `
      attribute float aSize;
      uniform float uPixelRatio;
      void main() {
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPos;
        gl_PointSize = clamp((38.0 * aSize * uPixelRatio) / max(1.8, -mvPos.z), 3.0, 14.0);
      }
    `,
    fragmentShader: `
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        gl_FragColor = vec4(vec3(0.98, 0.99, 1.0), smoothstep(0.5, 0.24, d));
      }
    `
  });
  rig.add(new THREE.Points(tipGeo, tipMat));

  const hubGeo = new THREE.SphereGeometry(0.08, 16, 16);
  const hubMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  rig.add(new THREE.Mesh(hubGeo, hubMat));

  const applyColors = paletteIdx => {
    const pal = PIN_PALETTES[paletteIdx];
    for (let i = 0; i < SPOKE_COUNT; i++) {
      const h = (pal.hueStart + colorSeeds[i] * pal.hueSpan) % 1;
      tempColor.setHSL(h, pal.sat, pal.light);
      const idx = i * 6;
      lineColors[idx] = Math.min(1, tempColor.r * 0.92 + 0.08);
      lineColors[idx + 1] = Math.min(1, tempColor.g * 0.92 + 0.08);
      lineColors[idx + 2] = Math.min(1, tempColor.b * 0.92 + 0.08);
      lineColors[idx + 3] = tempColor.r;
      lineColors[idx + 4] = tempColor.g;
      lineColors[idx + 5] = tempColor.b;
    }
    lineColAttr.needsUpdate = true;
  };
  applyColors(0);

  const state = {
    paletteIdx: 0,
    isDragging: false,
    lastX: 0,
    lastY: 0,
    velX: 0,
    velY: 0.004,
    pulseBoost: 0,
    elapsed: 0,
    zoom: baseZ,
    targetZoom: baseZ,
    hasPointer: false,
    cursorStrength: 0,
    cursorWorld: new THREE.Vector3(),
    cursorLocal: new THREE.Vector3(),
    raycaster: new THREE.Raycaster(),
    ndc: new THREE.Vector2(),
    plane: new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),
    hitPt: new THREE.Vector3()
  };

  return {
    scene,
    camera,
    getClearColor: () => 0x000000,
    setSize(w, h) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    },
    update(dt) {
      state.elapsed += dt;
      state.pulseBoost *= 0.92;

      const targetStrength = state.hasPointer ? 1.0 : 0.0;
      state.cursorStrength += (targetStrength - state.cursorStrength) * Math.min(1, dt * 10.0);

      // Transform latest world cursor point into current rotating rig local space
      if (state.hasPointer) {
        state.cursorLocal.copy(state.cursorWorld);
        rig.worldToLocal(state.cursorLocal);
      }

      const cx = state.cursorLocal.x;
      const cy = state.cursorLocal.y;
      const cursorR = Math.hypot(cx, cy) || 0.001;
      const cDirX = cx / cursorR;
      const cDirY = cy / cursorR;
      const spring = Math.min(1, dt * 14.0);

      for (let i = 0; i < SPOKE_COUNT; i++) {
        const len =
          baseLens[i] *
          (0.84 + 0.24 * Math.sin(state.elapsed * speeds[i] + phases[i]) + state.pulseBoost * 0.45);
        let tx = dirs[i * 3] * len;
        let ty = dirs[i * 3 + 1] * len;
        let tz = dirs[i * 3 + 2] * len;

        // Cursor repulsion parting: open a clean pocket around the cursor along any nearby ray
        if (state.cursorStrength > 0.005) {
          const tipLenXY2 = tx * tx + ty * ty;
          if (tipLenXY2 > 0.0001) {
            const projT = THREE.MathUtils.clamp((cx * tx + cy * ty) / tipLenXY2, 0.18, 1.0);
            const nearX = tx * projT;
            const nearY = ty * projT;
            const dx = nearX - cx;
            const dy = nearY - cy;
            const distXY = Math.hypot(dx, dy) + 0.0001;
            const segRadius = 1.55;

            if (distXY < segRadius) {
              const k = Math.pow(1.0 - distXY / segRadius, 1.25) * state.cursorStrength;
              const nx = dx / distXY;
              const ny = dy / distXY;
              tx += nx * k * 1.35 - cDirX * k * 0.28;
              ty += ny * k * 1.35 - cDirY * k * 0.28;

              const curNorm = Math.hypot(tx, ty, tz) || 1;
              const targetLen = len * (1.0 - k * 0.34);
              tx = (tx / curNorm) * targetLen;
              ty = (ty / curNorm) * targetLen;
              tz = (tz / curNorm) * targetLen;
            }
          }
        }

        const cIdx = i * 3;
        curTips[cIdx] += (tx - curTips[cIdx]) * spring;
        curTips[cIdx + 1] += (ty - curTips[cIdx + 1]) * spring;
        curTips[cIdx + 2] += (tz - curTips[cIdx + 2]) * spring;

        const lIdx = i * 6;
        linePositions[lIdx] = 0;
        linePositions[lIdx + 1] = 0;
        linePositions[lIdx + 2] = 0;
        linePositions[lIdx + 3] = curTips[cIdx];
        linePositions[lIdx + 4] = curTips[cIdx + 1];
        linePositions[lIdx + 5] = curTips[cIdx + 2];

        tipPositions[cIdx] = curTips[cIdx];
        tipPositions[cIdx + 1] = curTips[cIdx + 1];
        tipPositions[cIdx + 2] = curTips[cIdx + 2];
      }
      linePosAttr.needsUpdate = true;
      tipPosAttr.needsUpdate = true;

      if (!state.isDragging) {
        rig.rotation.y += dt * 0.26 + state.velY;
        rig.rotation.x += dt * 0.09 + state.velX;
        state.velX *= 0.94;
        state.velY *= 0.94;
      }

      state.zoom += (state.targetZoom - state.zoom) * 0.08;
      camera.position.z = state.zoom;
    },
    onPointerDown(e, canvas) {
      state.isDragging = true;
      state.lastX = e.clientX;
      state.lastY = e.clientY;
      canvas.style.cursor = 'grabbing';
    },
    onPointerMove(e, canvas) {
      const rect = canvas.getBoundingClientRect();
      if (rect.width && rect.height) {
        const inside =
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom;

        if (inside) {
          state.ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
          state.ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
          state.raycaster.setFromCamera(state.ndc, camera);
          if (state.raycaster.ray.intersectPlane(state.plane, state.hitPt)) {
            state.cursorWorld.copy(state.hitPt);
            state.hasPointer = true;
          }
        } else if (!state.isDragging) {
          state.hasPointer = false;
        }
      }

      if (!state.isDragging) return;
      const dx = e.clientX - state.lastX;
      const dy = e.clientY - state.lastY;
      state.lastX = e.clientX;
      state.lastY = e.clientY;
      state.velY = dx * 0.008;
      state.velX = dy * 0.008;
      rig.rotation.y += state.velY;
      rig.rotation.x += state.velX;
    },
    onPointerUp(_e, canvas) {
      state.isDragging = false;
      canvas.style.cursor = 'grab';
    },
    onPointerLeave() {
      state.hasPointer = false;
    },
    onClick() {
      state.pulseBoost = 0.75;
    },
    onWheel(e) {
      state.targetZoom = THREE.MathUtils.clamp(state.targetZoom + e.deltaY * 0.004, 4.5, 11.5);
    },
    cyclePalette() {
      state.paletteIdx = (state.paletteIdx + 1) % PIN_PALETTES.length;
      applyColors(state.paletteIdx);
      return PIN_PALETTES[state.paletteIdx].name;
    },
    getPaletteName: () => PIN_PALETTES[state.paletteIdx].name,
    dispose() {
      lineGeo.dispose();
      lineMat.dispose();
      tipGeo.dispose();
      tipMat.dispose();
      hubGeo.dispose();
      hubMat.dispose();
    }
  };
}

export function mountRadialPinsphere(container) {
  return mountSceneIntoContainer(container, createPinsphereScene, {
    canvasClass: 'pinburst-canvas',
    cursor: 'grab'
  });
}
