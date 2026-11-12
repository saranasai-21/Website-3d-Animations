import * as THREE from 'three';
import { mountSceneIntoContainer } from './shared-card-stage.js';

const PALETTES = [
  { name: 'ICE / CYAN', primary: new THREE.Color('#e0f2fe'), secondary: new THREE.Color('#38bdf8'), accent: new THREE.Color('#a5f3fc') },
  { name: 'VIOLET / NEON', primary: new THREE.Color('#f5d0fe'), secondary: new THREE.Color('#a855f7'), accent: new THREE.Color('#6366f1') },
  { name: 'SOLAR / ROSE', primary: new THREE.Color('#fef3c7'), secondary: new THREE.Color('#f43f5e'), accent: new THREE.Color('#fb923c') },
  { name: 'AURORA / EMERALD', primary: new THREE.Color('#d1fae5'), secondary: new THREE.Color('#10b981'), accent: new THREE.Color('#22d3ee') }
];

function evaluatePalette(t, outPrimary, outSecondary, outAccent) {
  const scaled = ((t % PALETTES.length) + PALETTES.length) % PALETTES.length;
  const idxA = Math.floor(scaled);
  const idxB = (idxA + 1) % PALETTES.length;
  const frac = scaled - idxA;
  const smooth = frac * frac * (3 - 2 * frac);

  outPrimary.copy(PALETTES[idxA].primary).lerp(PALETTES[idxB].primary, smooth);
  outSecondary.copy(PALETTES[idxA].secondary).lerp(PALETTES[idxB].secondary, smooth);
  outAccent.copy(PALETTES[idxA].accent).lerp(PALETTES[idxB].accent, smooth);
}

/**
 * Builds the Chromatic Vortex Tornado scene (shared by Grid Card Preview & Full Modal Stage).
 */
export function createTornadoScene(pixelRatio = 1, options = {}) {
  const scene = new THREE.Scene();
  const baseZ = options.isPreview ? 7.65 : 7.15;
  const camera = new THREE.PerspectiveCamera(50, 1.5, 0.1, 120);
  camera.position.set(0, 0.45, baseZ);
  camera.lookAt(0, -0.05, 0);

  const root = new THREE.Group();
  scene.add(root);

  let seed = 133742;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const uniforms = {
    uTime: { value: 0 },
    uPrimary: { value: new THREE.Color('#e0f2fe') },
    uSecondary: { value: new THREE.Color('#38bdf8') },
    uAccent: { value: new THREE.Color('#a855f7') },
    uShockTime: { value: -10 },
    uShockOrigin: { value: 0.35 },
    uPixelRatio: { value: pixelRatio }
  };

  const FUNNEL_STRANDS = 148;
  const FUNNEL_STEPS = 96;
  const DISC_STRANDS = 118;
  const DISC_STEPS = 72;

  const totalSegments = FUNNEL_STRANDS * FUNNEL_STEPS + DISC_STRANDS * DISC_STEPS;
  const linePositions = new Float32Array(totalSegments * 2 * 3);
  const lineMeta = new Float32Array(totalSegments * 2 * 4);

  let pIdx = 0;
  let mIdx = 0;
  const pushLineVertex = (x, y, z, prog, speed, phase, layerWeight) => {
    linePositions[pIdx++] = x;
    linePositions[pIdx++] = y;
    linePositions[pIdx++] = z;
    lineMeta[mIdx++] = prog;
    lineMeta[mIdx++] = speed;
    lineMeta[mIdx++] = phase;
    lineMeta[mIdx++] = layerWeight;
  };

  for (let s = 0; s < FUNNEL_STRANDS; s++) {
    const baseAngle = rand() * Math.PI * 2;
    const pitch = (2.1 + rand() * 2.5) * Math.PI * 2;
    const radialJitter = (rand() - 0.5) * 0.24;
    const speed = 0.55 + rand() * 0.75;
    const phase = rand();
    const wobbleAmp = 0.02 + rand() * 0.06;
    const wobbleFreq = 2 + Math.floor(rand() * 4);

    let prev = null;
    for (let i = 0; i <= FUNNEL_STEPS; i++) {
      const u = i / FUNNEL_STEPS;
      const y = -1.72 + u * 4.55;
      const flare = Math.pow(Math.max(0, u - 0.08) / 0.92, 2.05);
      const throat = 0.22 * Math.exp(-u * 13.0);
      const r =
        0.74 +
        throat +
        3.95 * flare +
        radialJitter * (0.35 + u * 0.85) +
        Math.sin(u * Math.PI * wobbleFreq + phase * 6.283) * wobbleAmp;

      const theta = baseAngle + pitch * Math.pow(u, 0.92);
      const x = Math.cos(theta) * r;
      const z = Math.sin(theta) * r;

      if (prev) {
        pushLineVertex(prev.x, prev.y, prev.z, prev.u, speed, phase, 1.0);
        pushLineVertex(x, y, z, u, speed, phase, 1.0);
      }
      prev = { x, y, z, u };
    }
  }

  for (let s = 0; s < DISC_STRANDS; s++) {
    const baseAngle = rand() * Math.PI * 2;
    const turns = (1.35 + rand() * 1.45) * Math.PI * 2;
    const speed = 0.4 + rand() * 0.65;
    const phase = rand();
    const yBias = (rand() - 0.5) * 0.09;

    let prev = null;
    for (let i = 0; i <= DISC_STEPS; i++) {
      const v = i / DISC_STEPS;
      const r = 0.78 + 9.8 * Math.pow(v, 1.52);
      const y = -1.66 - 0.34 * (1 - Math.exp(-(r - 0.78) * 0.42)) + yBias * (1 - v);
      const theta = baseAngle - turns * Math.pow(v, 0.68);
      const x = Math.cos(theta) * r;
      const z = Math.sin(theta) * r;

      if (prev) {
        pushLineVertex(prev.x, prev.y, prev.z, prev.v, speed, phase, 0.0);
        pushLineVertex(x, y, z, v, speed, phase, 0.0);
      }
      prev = { x, y, z, v };
    }
  }

  const strandGeo = new THREE.BufferGeometry();
  strandGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
  strandGeo.setAttribute('aMeta', new THREE.BufferAttribute(lineMeta, 4));

  const strandMat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute vec4 aMeta;
      uniform float uTime, uShockTime, uShockOrigin;
      varying vec4 vMeta;
      varying float vPulse;

      void main() {
        vMeta = aMeta;
        float u = aMeta.x;
        float speed = aMeta.y;
        float phase = aMeta.z;
        float isFunnel = aMeta.w;

        vec3 pos = position;
        float r = length(pos.xz);

        float angularVel = (isFunnel > 0.5)
          ? (1.55 / (0.45 + r * 0.55)) * speed
          : (1.25 / (0.55 + r * 0.48)) * speed;

        float angle = uTime * angularVel;
        pos.xz = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * pos.xz;

        float shockAge = uTime - uShockTime;
        float wave = 0.0;
        if (shockAge > 0.0 && shockAge < 2.2) {
          float dist = abs(u - fract(uShockOrigin + shockAge * 0.65));
          wave = exp(-dist * 18.0) * (1.0 - shockAge / 2.2);
          pos.xz *= 1.0 + wave * 0.14;
          pos.y += wave * 0.12 * isFunnel;
        }

        float cometPos = fract(phase * 3.17 + uTime * (0.28 + speed * 0.18));
        float dComet = abs(u - cometPos);
        vPulse = exp(-min(dComet, 1.0 - dComet) * 26.0) + wave * 1.4;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uPrimary, uSecondary, uAccent;
      uniform float uTime;
      varying vec4 vMeta;
      varying float vPulse;

      void main() {
        float u = vMeta.x;
        float phase = vMeta.z;
        float isFunnel = vMeta.w;

        float mixWave = 0.5 + 0.5 * sin(u * 4.5 - uTime * 1.15 + phase * 6.2831);
        vec3 baseCol = mix(uSecondary, uAccent, mixWave);
        float coreLift = (isFunnel > 0.5)
          ? smoothstep(0.65, 0.05, u) * 0.65
          : smoothstep(0.45, 0.0, u) * 0.55;
        vec3 col = mix(baseCol, uPrimary, clamp(coreLift + vPulse * 0.72, 0.0, 1.0));

        float edgeFade = (isFunnel > 0.5)
          ? smoothstep(1.0, 0.84, u) * (0.45 + 0.55 * smoothstep(0.0, 0.08, u))
          : smoothstep(1.0, 0.62, u) * smoothstep(0.0, 0.05, u);

        float alpha = edgeFade * (0.19 + 0.16 * fract(phase * 7.13) + vPulse * 0.45);
        gl_FragColor = vec4(col * (1.0 + vPulse * 0.85), alpha);
      }
    `
  });

  root.add(new THREE.LineSegments(strandGeo, strandMat));

  const PARTICLE_COUNT = 3600;
  const ptPositions = new Float32Array(PARTICLE_COUNT * 3);
  const ptMeta = new Float32Array(PARTICLE_COUNT * 4);

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const isFunnel = rand() > 0.44;
    const baseAngle = rand() * Math.PI * 2;
    const u = rand();
    const speed = 0.5 + rand() * 0.9;
    const phase = rand();
    const sizeScale = rand() > 0.94 ? 2.4 + rand() * 1.4 : 0.7 + rand() * 1.1;

    let x, y, z;
    if (isFunnel) {
      const flare = Math.pow(Math.max(0, u - 0.08) / 0.92, 2.05);
      const throat = 0.22 * Math.exp(-u * 13.0);
      const r = 0.74 + throat + 3.95 * flare + (rand() - 0.5) * 0.32;
      y = -1.72 + u * 4.55;
      x = Math.cos(baseAngle) * r;
      z = Math.sin(baseAngle) * r;
    } else {
      const r = 0.82 + 9.4 * Math.pow(u, 1.48);
      y = -1.66 - 0.34 * (1 - Math.exp(-(r - 0.78) * 0.42)) + (rand() - 0.5) * 0.14;
      x = Math.cos(baseAngle) * r;
      z = Math.sin(baseAngle) * r;
    }

    ptPositions[i * 3] = x;
    ptPositions[i * 3 + 1] = y;
    ptPositions[i * 3 + 2] = z;

    ptMeta[i * 4] = u;
    ptMeta[i * 4 + 1] = speed;
    ptMeta[i * 4 + 2] = phase;
    ptMeta[i * 4 + 3] = isFunnel ? sizeScale : -sizeScale;
  }

  const ptGeo = new THREE.BufferGeometry();
  ptGeo.setAttribute('position', new THREE.BufferAttribute(ptPositions, 3));
  ptGeo.setAttribute('aMeta', new THREE.BufferAttribute(ptMeta, 4));

  const ptMat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute vec4 aMeta;
      uniform float uTime, uShockTime, uShockOrigin, uPixelRatio;
      varying float vIsSpark, vPhase, vU;

      void main() {
        float u = aMeta.x;
        float speed = aMeta.y;
        float phase = aMeta.z;
        float rawSize = aMeta.w;
        float isFunnel = step(0.0, rawSize);
        float sizeScale = abs(rawSize);

        vec3 pos = position;
        float r = length(pos.xz);
        float angularVel = (isFunnel > 0.5)
          ? (1.72 / (0.42 + r * 0.52)) * speed
          : (1.35 / (0.55 + r * 0.46)) * speed;

        float angle = uTime * angularVel;
        pos.xz = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * pos.xz;
        pos.y += sin(uTime * 1.4 + phase * 18.0) * 0.04;

        float shockAge = uTime - uShockTime;
        if (shockAge > 0.0 && shockAge < 2.2) {
          float dist = abs(u - fract(uShockOrigin + shockAge * 0.65));
          pos.xz *= 1.0 + exp(-dist * 16.0) * (1.0 - shockAge / 2.2) * 0.18;
        }

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = clamp((13.0 * sizeScale * uPixelRatio) / max(1.5, -mvPosition.z), 1.4, 16.0);

        vIsSpark = step(2.0, sizeScale);
        vPhase = phase;
        vU = u;
      }
    `,
    fragmentShader: `
      uniform vec3 uPrimary, uSecondary, uAccent;
      uniform float uTime;
      varying float vIsSpark, vPhase, vU;

      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float glow = pow(1.0 - d * 2.0, 2.2);
        float twinkle = 0.55 + 0.45 * sin(uTime * 4.0 + vPhase * 31.4);

        vec3 col = mix(uSecondary, uAccent, fract(vPhase * 2.7 + uTime * 0.08));
        col = mix(col, uPrimary, 0.55 + 0.45 * vIsSpark);
        gl_FragColor = vec4(col, glow * twinkle * smoothstep(1.0, 0.78, vU) * (0.72 + 0.28 * vIsSpark));
      }
    `
  });

  root.add(new THREE.Points(ptGeo, ptMat));

  const state = {
    paletteMode: -1,
    colorPhase: 0,
    targetTiltX: 0.08,
    targetTiltY: 0,
    tiltX: 0.08,
    tiltY: 0,
    zoom: baseZ,
    targetZoom: baseZ
  };

  const getPaletteName = () => {
    if (state.paletteMode < 0) {
      const idx = Math.floor(((state.colorPhase % PALETTES.length) + PALETTES.length) % PALETTES.length);
      return `AUTO · ${PALETTES[idx].name}`;
    }
    return PALETTES[state.paletteMode % PALETTES.length].name;
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
      uniforms.uTime.value += dt;
      if (state.paletteMode < 0) {
        state.colorPhase += dt * 0.22;
      } else {
        state.colorPhase += (state.paletteMode - state.colorPhase) * Math.min(1, dt * 4.5);
      }
      evaluatePalette(state.colorPhase, uniforms.uPrimary.value, uniforms.uSecondary.value, uniforms.uAccent.value);

      state.tiltX += (state.targetTiltX - state.tiltX) * 0.07;
      state.tiltY += (state.targetTiltY - state.tiltY) * 0.07;
      state.zoom += (state.targetZoom - state.zoom) * 0.08;

      root.rotation.x = state.tiltX;
      root.rotation.y = state.tiltY;
      camera.position.z = state.zoom;
      camera.lookAt(0, -0.05, 0);
    },
    onPointerMove(e, canvas) {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      state.targetTiltY = nx * 0.34;
      state.targetTiltX = 0.08 + ny * 0.24;
    },
    onPointerLeave() {
      state.targetTiltX = 0.08;
      state.targetTiltY = 0;
    },
    onClick(e, canvas) {
      const rect = canvas.getBoundingClientRect();
      const ny = rect.height ? 1 - (e.clientY - rect.top) / rect.height : 0.4;
      uniforms.uShockTime.value = uniforms.uTime.value;
      uniforms.uShockOrigin.value = THREE.MathUtils.clamp(ny, 0.05, 0.95);
    },
    onWheel(e) {
      state.targetZoom = THREE.MathUtils.clamp(state.targetZoom + e.deltaY * 0.004, 4.6, 10.5);
    },
    cyclePalette() {
      if (state.paletteMode < 0) state.paletteMode = 0;
      else if (state.paletteMode >= PALETTES.length - 1) state.paletteMode = -1;
      else state.paletteMode += 1;
      return getPaletteName();
    },
    getPaletteName,
    dispose() {
      strandGeo.dispose();
      strandMat.dispose();
      ptGeo.dispose();
      ptMat.dispose();
    }
  };
}

export function mountTornadoVortex(container) {
  return mountSceneIntoContainer(container, createTornadoScene, {
    canvasClass: 'tornado-vortex-canvas',
    cursor: 'crosshair'
  });
}
