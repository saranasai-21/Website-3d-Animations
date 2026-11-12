import * as THREE from 'three';
import { mountSceneIntoContainer } from './shared-card-stage.js';

const STARDUST_PALETTES = [
  {
    name: 'MONO / STARDUST',
    core: new THREE.Color('#ffffff'),
    halo: new THREE.Color('#cbd5e1'),
    bgStars: new THREE.Color('#e2e8f0')
  },
  {
    name: 'ICE / SUPERNOVA',
    core: new THREE.Color('#e0f2fe'),
    halo: new THREE.Color('#38bdf8'),
    bgStars: new THREE.Color('#bae6fd')
  },
  {
    name: 'AMBER / QUASAR',
    core: new THREE.Color('#fef3c7'),
    halo: new THREE.Color('#fb923c'),
    bgStars: new THREE.Color('#fde68a')
  },
  {
    name: 'VIOLET / NEBULA',
    core: new THREE.Color('#fae8ff'),
    halo: new THREE.Color('#a855f7'),
    bgStars: new THREE.Color('#e9d5ff')
  }
];

/**
 * Builds the Cosmic Repulsion Sphere scene (shared by Grid Card & Full Modal).
 */
export function createStardustVoidScene(pixelRatio = 1, options = {}) {
  const scene = new THREE.Scene();
  const baseZ = options.isPreview ? 5.9 : 5.75;
  const camera = new THREE.PerspectiveCamera(45, 1.5, 0.1, 100);
  camera.position.set(0, 0, baseZ);

  const rig = new THREE.Group();
  scene.add(rig);

  let seed = 314159;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  // 1. Background Deep-Space Starfield
  const BG_COUNT = options.isPreview ? 360 : 900;
  const bgPos = new Float32Array(BG_COUNT * 3);
  const bgMeta = new Float32Array(BG_COUNT * 3); // size, phase, brightness

  for (let i = 0; i < BG_COUNT; i++) {
    bgPos[i * 3] = (rand() - 0.5) * 16.0;
    bgPos[i * 3 + 1] = (rand() - 0.5) * 10.0;
    bgPos[i * 3 + 2] = -4.0 + rand() * 5.2;

    bgMeta[i * 3] = 0.45 + Math.pow(rand(), 2.2) * 1.65;
    bgMeta[i * 3 + 1] = rand() * Math.PI * 2;
    bgMeta[i * 3 + 2] = 0.25 + rand() * 0.75;
  }

  const uniforms = {
    uTime: { value: 0 },
    uPixelRatio: { value: pixelRatio },
    uCore: { value: STARDUST_PALETTES[0].core.clone() },
    uHalo: { value: STARDUST_PALETTES[0].halo.clone() },
    uBgStars: { value: STARDUST_PALETTES[0].bgStars.clone() },
    uShock: { value: 0 }
  };

  const bgGeo = new THREE.BufferGeometry();
  bgGeo.setAttribute('position', new THREE.BufferAttribute(bgPos, 3));
  bgGeo.setAttribute('aMeta', new THREE.BufferAttribute(bgMeta, 3));

  const bgMat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute vec3 aMeta;
      uniform float uTime, uPixelRatio;
      varying float vAlpha;

      void main() {
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPos;
        gl_PointSize = clamp((10.5 * aMeta.x * uPixelRatio) / max(1.8, -mvPos.z), 1.0, 4.2);
        float twinkle = 0.6 + 0.4 * sin(uTime * 2.2 + aMeta.y);
        vAlpha = aMeta.z * twinkle;
      }
    `,
    fragmentShader: `
      uniform vec3 uBgStars;
      varying float vAlpha;

      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        gl_FragColor = vec4(uBgStars, smoothstep(0.5, 0.08, d) * vAlpha);
      }
    `
  });
  scene.add(new THREE.Points(bgGeo, bgMat));

  // 2. Dense Dappled Stardust Sphere Cloud with Repulsion Ring Physics
  const CLOUD_COUNT = options.isPreview ? 3600 : 8600;
  const homePos = new Float32Array(CLOUD_COUNT * 3);
  const currPos = new Float32Array(CLOUD_COUNT * 3);
  const vel = new Float32Array(CLOUD_COUNT * 3);
  const cloudMeta = new Float32Array(CLOUD_COUNT * 4); // radial, size, phase, coreFlag

  const SPHERE_R = 1.72;
  for (let i = 0; i < CLOUD_COUNT; i++) {
    // Organic patchy radial density mimicking mottled nebula clusters
    const u = rand() * 2 - 1;
    const phi = rand() * Math.PI * 2;
    const sinTheta = Math.sqrt(Math.max(0, 1 - u * u));

    let dx = sinTheta * Math.cos(phi);
    let dy = u;
    let dz = sinTheta * Math.sin(phi);

    // Subtle clumping wave along spherical coordinates
    const clump = Math.sin(dx * 5.2 + dy * 4.1) * Math.cos(dz * 5.8 - dy * 3.4);
    const shellBias = Math.pow(rand(), 0.42);
    const r = SPHERE_R * (0.35 + 0.65 * shellBias) * (0.9 + 0.14 * clump);

    const x = dx * r;
    const y = dy * r;
    const z = dz * r;

    homePos[i * 3] = x;
    homePos[i * 3 + 1] = y;
    homePos[i * 3 + 2] = z;

    currPos[i * 3] = x;
    currPos[i * 3 + 1] = y;
    currPos[i * 3 + 2] = z;

    cloudMeta[i * 4] = THREE.MathUtils.clamp(r / SPHERE_R, 0, 1);
    cloudMeta[i * 4 + 1] = 0.6 + Math.pow(rand(), 1.8) * 1.45;
    cloudMeta[i * 4 + 2] = rand() * Math.PI * 2;
    cloudMeta[i * 4 + 3] = rand() < 0.018 ? 1.0 : 0.0; // tiny persistent center sparks inside void
  }

  const cloudGeo = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(currPos, 3);
  cloudGeo.setAttribute('position', posAttr);
  cloudGeo.setAttribute('aMeta', new THREE.BufferAttribute(cloudMeta, 4));

  const cloudMat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute vec4 aMeta;
      uniform float uTime, uPixelRatio;
      varying float vRadial, vAlpha;

      void main() {
        vRadial = aMeta.x;
        float sizeScale = aMeta.y;
        float phase = aMeta.z;

        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPos;
        gl_PointSize = clamp((13.0 * sizeScale * uPixelRatio) / max(1.6, -mvPos.z), 1.3, 4.8);

        float twinkle = 0.72 + 0.28 * sin(uTime * 3.1 + phase);
        vAlpha = mix(0.88, 0.54, vRadial * 0.6) * twinkle;
      }
    `,
    fragmentShader: `
      uniform vec3 uCore, uHalo;
      varying float vRadial, vAlpha;

      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        vec3 col = mix(uCore, uHalo, vRadial * 0.75);
        gl_FragColor = vec4(col, smoothstep(0.5, 0.1, d) * vAlpha);
      }
    `
  });
  const cloudPoints = new THREE.Points(cloudGeo, cloudMat);
  rig.add(cloudPoints);

  const bgColor = new THREE.Color(0x000000);
  const state = {
    paletteIdx: 0,
    isDragging: false,
    lastX: 0,
    lastY: 0,
    rotY: 0,
    rotX: 0,
    targetRotY: 0,
    targetRotX: 0,
    zoom: baseZ,
    targetZoom: baseZ,
    hasPointer: false,
    cursorStrength: 0,
    cursorLocal: new THREE.Vector3(0, 0, 0),
    raycaster: new THREE.Raycaster(),
    ndc: new THREE.Vector2(),
    plane: new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),
    hitPt: new THREE.Vector3()
  };

  return {
    scene,
    camera,
    getClearColor: () => bgColor,
    setSize(w, h) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    },
    update(dt) {
      uniforms.uTime.value += dt;
      uniforms.uShock.value *= Math.pow(0.08, dt);

      const t = uniforms.uTime.value;
      const targetStrength = state.hasPointer ? 1.0 : 0.0;
      state.cursorStrength += (targetStrength - state.cursorStrength) * Math.min(1, dt * 8.5);

      const spinAngle = t * 0.14;
      const cosSpin = Math.cos(spinAngle);
      const sinSpin = Math.sin(spinAngle);

      const cx = state.cursorLocal.x;
      const cy = state.cursorLocal.y;
      const ringRadius = 1.08 + uniforms.uShock.value * 0.55;
      const strength = state.cursorStrength;

      const stiffness = 36.0;
      const damping = Math.pow(0.0025, dt);

      for (let i = 0; i < CLOUD_COUNT; i++) {
        const i3 = i * 3;
        const hx0 = homePos[i3];
        const hy0 = homePos[i3 + 1];
        const hz0 = homePos[i3 + 2];

        // Gentle organic orbital spin of sphere cloud around Y + subtle breathing
        const hx = hx0 * cosSpin - hz0 * sinSpin;
        const hz = hx0 * sinSpin + hz0 * cosSpin;
        const hy = hy0 + Math.sin(t * 1.1 + cloudMeta[i * 4 + 2]) * 0.035;

        let tx = hx;
        let ty = hy;
        let tz = hz;

        if (strength > 0.004 && cloudMeta[i * 4 + 3] < 0.5) {
          const dx = hx - cx;
          const dy = hy - cy;
          const dist = Math.hypot(dx, dy) + 0.0001;

          if (dist < ringRadius * 1.55) {
            const nx = dx / dist;
            const ny = dy / dist;

            if (dist < ringRadius) {
              // Pile particles crisply onto the circular forcefield ring perimeter
              const bandJitter = ((i % 13) - 6) * 0.011;
              const targetR = ringRadius + bandJitter;
              tx = THREE.MathUtils.lerp(hx, cx + nx * targetR, strength);
              ty = THREE.MathUtils.lerp(hy, cy + ny * targetR, strength);
              tz = THREE.MathUtils.lerp(hz, hz * 0.35, strength);
            } else {
              // Softly compress halo immediately outside the ring
              const falloff = Math.pow(1.0 - (dist - ringRadius) / (ringRadius * 0.55), 1.6);
              const push = falloff * 0.34 * strength;
              tx = hx + nx * push;
              ty = hy + ny * push;
            }
          }
        } else if (strength > 0.004 && cloudMeta[i * 4 + 3] >= 0.5) {
          // Few bright ambient pinprick stars linger faintly near cursor center
          tx = THREE.MathUtils.lerp(hx, cx + Math.sin(cloudMeta[i * 4 + 2] + t) * 0.14, strength * 0.65);
          ty = THREE.MathUtils.lerp(hy, cy + Math.cos(cloudMeta[i * 4 + 2] + t) * 0.14, strength * 0.65);
        }

        const ax = (tx - currPos[i3]) * stiffness;
        const ay = (ty - currPos[i3 + 1]) * stiffness;
        const az = (tz - currPos[i3 + 2]) * stiffness;

        vel[i3] = (vel[i3] + ax * dt) * damping;
        vel[i3 + 1] = (vel[i3 + 1] + ay * dt) * damping;
        vel[i3 + 2] = (vel[i3 + 2] + az * dt) * damping;

        currPos[i3] += vel[i3] * dt;
        currPos[i3 + 1] += vel[i3 + 1] * dt;
        currPos[i3 + 2] += vel[i3 + 2] * dt;
      }

      posAttr.needsUpdate = true;

      state.rotY += (state.targetRotY - state.rotY) * 0.08;
      state.rotX += (state.targetRotX - state.rotX) * 0.08;
      rig.rotation.y = state.rotY;
      rig.rotation.x = state.rotX;

      state.zoom += (state.targetZoom - state.zoom) * 0.1;
      camera.position.z = state.zoom;

      const pal = STARDUST_PALETTES[state.paletteIdx];
      const blend = Math.min(1, dt * 4.5);
      uniforms.uCore.value.lerp(pal.core, blend);
      uniforms.uHalo.value.lerp(pal.halo, blend);
      uniforms.uBgStars.value.lerp(pal.bgStars, blend);
    },
    onPointerDown(e, canvas) {
      state.isDragging = true;
      state.lastX = e.clientX;
      state.lastY = e.clientY;
      uniforms.uShock.value = 1.0;
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
            rig.worldToLocal(state.hitPt);
            state.cursorLocal.copy(state.hitPt);
            state.hasPointer = true;
          }
        } else if (!state.isDragging) {
          state.hasPointer = false;
        }
      }

      if (!state.isDragging) return;
      const dx = e.clientX - state.lastX;
      const dy = e.clientY - state.lastY;
      state.targetRotY = THREE.MathUtils.clamp(state.targetRotY + dx * 0.008, -1.2, 1.2);
      state.targetRotX = THREE.MathUtils.clamp(state.targetRotX + dy * 0.008, -0.8, 0.8);
      state.lastX = e.clientX;
      state.lastY = e.clientY;
    },
    onPointerUp(_, canvas) {
      state.isDragging = false;
      canvas.style.cursor = 'crosshair';
    },
    onPointerLeave() {
      state.hasPointer = false;
    },
    onWheel(e) {
      state.targetZoom = THREE.MathUtils.clamp(state.targetZoom + e.deltaY * 0.004, 3.2, 10.2);
    },
    cyclePalette() {
      state.paletteIdx = (state.paletteIdx + 1) % STARDUST_PALETTES.length;
      return STARDUST_PALETTES[state.paletteIdx].name;
    },
    getPaletteName() {
      return STARDUST_PALETTES[state.paletteIdx].name;
    },
    dispose() {
      bgGeo.dispose();
      bgMat.dispose();
      cloudGeo.dispose();
      cloudMat.dispose();
    }
  };
}

export function mountStardustVoid(container) {
  return mountSceneIntoContainer(container, createStardustVoidScene, {
    cursor: 'crosshair',
    canvasClass: 'anim-live-canvas'
  });
}

