import * as THREE from 'three';
import { mountSceneIntoContainer } from './shared-card-stage.js';

const FLOWER_PALETTES = [
  {
    name: 'BLUSH / DAISY',
    petalInner: new THREE.Color('#fff9f2'),
    petalOuter: new THREE.Color('#f7b8ab'),
    centerCore: new THREE.Color('#fffbeb'),
    centerEdge: new THREE.Color('#d98a4e'),
    stem: new THREE.Color('#34d399')
  },
  {
    name: 'LOTUS / VIOLET',
    petalInner: new THREE.Color('#fdf4ff'),
    petalOuter: new THREE.Color('#d8b4fe'),
    centerCore: new THREE.Color('#fef9c3'),
    centerEdge: new THREE.Color('#ec4899'),
    stem: new THREE.Color('#2dd4bf')
  },
  {
    name: 'SUNBURST / GOLD',
    petalInner: new THREE.Color('#fefce8'),
    petalOuter: new THREE.Color('#fdba74'),
    centerCore: new THREE.Color('#ffffff'),
    centerEdge: new THREE.Color('#ea580c'),
    stem: new THREE.Color('#4ade80')
  },
  {
    name: 'FROST / AURORA',
    petalInner: new THREE.Color('#f0f9ff'),
    petalOuter: new THREE.Color('#7dd3fc'),
    centerCore: new THREE.Color('#ecfeff'),
    centerEdge: new THREE.Color('#818cf8'),
    stem: new THREE.Color('#34d399')
  }
];

/**
 * Builds the 3D Interactive Particle Bloom Daisy scene (shared by Grid Card & Full Modal).
 * Modal view rests as a closed luminous 3D bud when the pointer is away, unfolds tier-by-tier
 * into a volumetric cupped 3D blossom when hovered, enables interactive cursor brushing, and
 * closes back into a bud when the pointer leaves.
 */
export function createParticleFlowerScene(pixelRatio = 1, options = {}) {
  const scene = new THREE.Scene();
  const baseZ = options.isPreview ? 6.45 : 6.05;
  const camera = new THREE.PerspectiveCamera(44, 1.5, 0.1, 100);
  camera.position.set(0.0, 0.32, baseZ);
  camera.lookAt(0, -0.04, 0);

  const rig = new THREE.Group();
  scene.add(rig);

  let seed = 42069;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const isPreview = Boolean(options.isPreview);
  const PETAL_COUNT = 16;
  const PARTICLES_PER_PETAL = isPreview ? 220 : 1350;
  const CENTER_COUNT = isPreview ? 460 : 2300;
  const STEM_COUNT = isPreview ? 240 : 1100;
  const TOTAL = PETAL_COUNT * PARTICLES_PER_PETAL + CENTER_COUNT + STEM_COUNT;

  const basePositions = new Float32Array(TOTAL * 3);
  const metaA = new Float32Array(TOTAL * 4); // x: kind (0=stem,1=center,2=petal), y: angle, z: uAlong, w: stagger
  const seedA = new Float32Array(TOTAL * 3); // x: phase, y: twinkleSpeed, z: sizeScale
  const extraA = new Float32Array(TOTAL * 2); // x: tier (0=outer,1=inner), y: normAcross (-1..1)

  const HEAD_Y = 0.22;
  const DISC_R = 0.42;
  let idx = 0;

  // 1. Volumetric 3D Green Stalk Stem curving gently from beneath the stamen dome
  for (let i = 0; i < STEM_COUNT; i++) {
    const t = i / STEM_COUNT;
    const y = HEAD_Y - 0.08 - t * 2.15;
    const angle = rand() * Math.PI * 2;
    const rad = Math.pow(rand(), 0.5) * (0.046 + (1.0 - t) * 0.014);
    const swayX = Math.sin(t * 1.9) * 0.03;
    const archZ = -0.06 - t * t * 0.22;

    basePositions[idx * 3] = Math.cos(angle) * rad + swayX;
    basePositions[idx * 3 + 1] = y;
    basePositions[idx * 3 + 2] = Math.sin(angle) * rad + archZ;

    metaA[idx * 4] = 0.0;
    metaA[idx * 4 + 1] = angle;
    metaA[idx * 4 + 2] = t;
    metaA[idx * 4 + 3] = rand();

    seedA[idx * 3] = rand() * Math.PI * 2;
    seedA[idx * 3 + 1] = 1.5 + rand() * 2.2;
    seedA[idx * 3 + 2] = 0.85 + rand() * 0.65;

    extraA[idx * 2] = 0.0;
    extraA[idx * 2 + 1] = 0.0;
    idx++;
  }

  // 2. Volumetric 3D Hemispherical Golden-Cream Fibonacci Stamen Dome
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < CENTER_COUNT; i++) {
    const u = (i + 0.5) / CENTER_COUNT;
    const r = Math.sqrt(u) * DISC_R;
    const theta = i * goldenAngle + (rand() - 0.5) * 0.14;
    const domeZ = Math.sqrt(Math.max(0, 1 - u)) * 0.34 - u * 0.05;

    basePositions[idx * 3] = Math.cos(theta) * r;
    basePositions[idx * 3 + 1] = HEAD_Y + Math.sin(theta) * r;
    basePositions[idx * 3 + 2] = domeZ + (rand() - 0.5) * 0.025;

    metaA[idx * 4] = 1.0;
    metaA[idx * 4 + 1] = theta;
    metaA[idx * 4 + 2] = r / DISC_R;
    metaA[idx * 4 + 3] = rand();

    seedA[idx * 3] = rand() * Math.PI * 2;
    seedA[idx * 3 + 1] = 2.0 + rand() * 2.4;
    seedA[idx * 3 + 2] = 0.85 + rand() * 0.7;

    extraA[idx * 2] = 0.0;
    extraA[idx * 2 + 1] = 0.0;
    idx++;
  }

  // 3. 16 Cupped 3D Oval Stippled Petals across Alternating Inner/Outer Tiers
  for (let p = 0; p < PETAL_COUNT; p++) {
    const tier = p % 2; // 0 = outer wider tier (peels first), 1 = inner cupped tier
    const baseTheta = (p / PETAL_COUNT) * Math.PI * 2 + Math.PI * 0.5;
    const verticalBias = Math.sin(baseTheta);
    const petalLen = 1.56 + tier * 0.08 + verticalBias * 0.16 + ((p * 7) % 3) * 0.025;
    // Outer petals open slightly earlier than inner petals for lush 3D blooming
    const stagger = tier * 0.14 + (p / PETAL_COUNT) * 0.06 + rand() * 0.03;

    for (let j = 0; j < PARTICLES_PER_PETAL; j++) {
      const u = Math.pow(rand(), 0.9);
      const halfWidthProfile = Math.pow(Math.sin(Math.max(0.01, u) * Math.PI), 0.52) * 0.22;
      const rawV = (rand() + rand() - 1.0) * 1.12;
      const normV = THREE.MathUtils.clamp(rawV, -1, 1);
      const v = normV * halfWidthProfile;

      basePositions[idx * 3] = u * petalLen;
      basePositions[idx * 3 + 1] = v;
      basePositions[idx * 3 + 2] = (rand() - 0.5) * 0.04;

      metaA[idx * 4] = 2.0;
      metaA[idx * 4 + 1] = baseTheta;
      metaA[idx * 4 + 2] = u;
      metaA[idx * 4 + 3] = stagger;

      seedA[idx * 3] = rand() * Math.PI * 2;
      seedA[idx * 3 + 1] = 1.8 + rand() * 2.8;
      seedA[idx * 3 + 2] = 0.8 + rand() * 0.72;

      extraA[idx * 2] = tier;
      extraA[idx * 2 + 1] = normV;
      idx++;
    }
  }

  const startClosed = !isPreview;
  const uniforms = {
    uTime: { value: 0 },
    uBloom: { value: startClosed ? 0.0 : 1.0 },
    uIsPreview: { value: isPreview ? 1.0 : 0.0 },
    uHeadY: { value: HEAD_Y },
    uDiscR: { value: DISC_R * 0.84 },
    uCursor: { value: new THREE.Vector3(0, 0, 0) },
    uCursorActive: { value: 0.0 },
    uPixelRatio: { value: pixelRatio },
    uPetalInner: { value: FLOWER_PALETTES[0].petalInner.clone() },
    uPetalOuter: { value: FLOWER_PALETTES[0].petalOuter.clone() },
    uCenterCore: { value: FLOWER_PALETTES[0].centerCore.clone() },
    uCenterEdge: { value: FLOWER_PALETTES[0].centerEdge.clone() },
    uStem: { value: FLOWER_PALETTES[0].stem.clone() }
  };

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(basePositions, 3));
  geo.setAttribute('aMeta', new THREE.BufferAttribute(metaA, 4));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seedA, 3));
  geo.setAttribute('aExtra', new THREE.BufferAttribute(extraA, 2));

  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute vec4 aMeta;
      attribute vec3 aSeed;
      attribute vec2 aExtra;

      uniform float uTime, uBloom, uIsPreview, uHeadY, uDiscR, uCursorActive, uPixelRatio;
      uniform vec3 uCursor, uPetalInner, uPetalOuter, uCenterCore, uCenterEdge, uStem;

      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        float kind = aMeta.x;
        float angle = aMeta.y;
        float u = aMeta.z;
        float stagger = aMeta.w;
        float phase = aSeed.x;
        float speed = aSeed.y;
        float sizeScale = aSeed.z;
        float tier = aExtra.x;
        float normV = aExtra.y;

        vec3 pos = position;
        float flutter = sin(uTime * speed + phase) * 0.012;

        if (kind < 0.5) {
          // 3D Green Stem tilting slightly back into calyx depth
          pos.x += sin(uTime * 1.35 + u * 2.4) * 0.018 * (1.0 - u);
          pos.z += mix(-0.04, 0.0, u);
          vColor = uStem * mix(1.42, 0.72, u);
          vAlpha = mix(0.95, 0.42, pow(u, 1.35));
        } else if (kind < 1.5) {
          // 3D Hemispherical Golden/Orange Stamen Dome (tucked tiny inside closed bud, blooms wide on hover)
          float centerEase = smoothstep(0.08, 0.88, uBloom);
          float centerScale = mix(0.2, 1.0, centerEase);
          pos.x *= centerScale;
          float dy = (pos.y - uHeadY) * centerScale;
          float dz = (pos.z + flutter) * centerScale + uBloom * 0.08;
          // Subtle 3D tilt forward of dome along with open flower head
          float domeTilt = mix(0.0, 0.24, uBloom);
          pos.y = uHeadY + mix(0.18, 0.0, centerEase) + dy * cos(domeTilt) + dz * sin(domeTilt);
          pos.z = -dy * sin(domeTilt) + dz * cos(domeTilt);

          float rimShade = mix(1.42, 0.88, smoothstep(0.2, 0.98, u));
          vColor = mix(uCenterCore, uCenterEdge, smoothstep(0.18, 0.94, u)) * rimShade;
          vAlpha = mix(0.88, 0.72, u * u) * mix(0.08, 1.0, centerEase);
        } else {
          // 3D Blooming Petals: True spherical hinge unfurling from upright volumetric bud into cupped 3D blossom
          float petalLen = position.x;
          float across = position.y;
          float depthJit = position.z;

          float c = cos(angle);
          float s = sin(angle);

          float b = clamp((uBloom * 1.24) - stagger, 0.0, 1.0);
          float bEase = b * b * (3.0 - 2.0 * b);

          // 1. Closed 3D Upright Bud Cup perched cleanly atop the stem
          float budHeight = 0.72;
          float budCupR = 0.09 + sin(u * 2.65) * (0.18 + (1.0 - tier) * 0.03);
          vec3 dirBudOut = vec3(c, 0.0, s);
          vec3 dirBudTan = vec3(-s, 0.0, c);
          vec3 closedPos = vec3(0.0, uHeadY + 0.02 + u * budHeight, 0.0)
                         + dirBudOut * budCupR
                         + dirBudTan * (across * 0.48);

          // 2. Open 3D Cupped Corolla with alternating tiers, longitudinal bowl curve & lateral petal camber
          vec3 dirR = vec3(c, s, 0.0);
          vec3 dirT = vec3(-s, c, 0.0);

          // Each petal bows gently forward into a 3D chalice dish and flares softly near tips
          float radialProj = uDiscR * 0.88 + petalLen * mix(0.95, 0.86, tier);
          float bowlCurveZ = sin(u * 2.15) * (0.34 + tier * 0.16)
                           + pow(u, 1.65) * (0.16 + tier * 0.24)
                           - (1.0 - tier) * pow(max(0.0, u - 0.55), 2.0) * 0.45;
          // 3D concave trough across petal width (edges curl forward)
          float lateralCamber = (normV * normV) * 0.095 * sin(u * 3.14159);
          // Subtle organic roll twist per petal so every petal catches light differently in 3D
          float petalTwist = sin(angle * 2.0 + tier * 1.7) * 0.08 * u;

          vec3 openLocal = dirR * radialProj
                         + dirT * across
                         + vec3(0.0, 0.0, bowlCurveZ + lateralCamber + depthJit + petalTwist);

          // Tilt open corolla ~14 deg upward so stem, dome, and front/back petals exhibit true 3D depth
          float openTilt = 0.24;
          vec3 openPos = vec3(
            openLocal.x,
            uHeadY + openLocal.y * cos(openTilt) + openLocal.z * sin(openTilt),
            -openLocal.y * sin(openTilt) + openLocal.z * cos(openTilt)
          );

          // 3D Spherical Peeling Arc: hinges outward from bud axis into cupped corolla
          vec3 budVec = closedPos - vec3(0.0, uHeadY, 0.0);
          vec3 openVec = openPos - vec3(0.0, uHeadY, 0.0);
          vec3 mixedVec = mix(budVec, openVec, bEase);

          // Preserve radial length along the 3D arc so petals peel smoothly in 3D instead of sliding flat
          float targetLen = mix(length(budVec), length(openVec), bEase);
          float curLen = max(0.0001, length(mixedVec));
          pos = vec3(0.0, uHeadY, 0.0) + mixedVec * mix(1.0, targetLen / curLen, sin(bEase * 3.14159) * 0.72);
          pos.z += sin(bEase * 3.14159) * u * (0.34 + (1.0 - tier) * 0.18);

          pos.x += sin(uTime * 1.45 + phase) * 0.012 * u * bEase;
          pos.y += cos(uTime * 1.25 + phase) * 0.012 * u * bEase;

          // Rich 3D lighting gradient: brighter forward-facing cup & inner tier glow, softly stippled closed bud
          float lightBoost = (1.42 + tier * 0.16 + lateralCamber * 1.4 + sin(u * 3.14159) * 0.18) * mix(1.0, 0.72, uIsPreview);
          vec3 openCol = mix(uPetalInner, uPetalOuter, pow(u, 0.72)) * lightBoost;
          vec3 budCol = mix(vec3(0.96, 0.88, 0.84), uPetalOuter * 1.05, pow(u, 0.75)) * 0.68;
          vColor = mix(budCol, openCol, smoothstep(0.08, 0.68, bEase));
          vAlpha = mix(0.22, mix(0.92, 0.72, u * 0.42), bEase) * mix(1.0, 0.68, uIsPreview);
        }

        // Interactive cursor dust breeze & 3D petal flutter scatter
        if (uCursorActive > 0.005) {
          vec2 delta = pos.xy - uCursor.xy;
          float dist = length(delta) + 0.0001;
          float brushRadius = 1.08;
          if (dist < brushRadius) {
            float push = pow(1.0 - dist / brushRadius, 1.8) * uCursorActive;
            vec2 dir = delta / dist;
            vec2 swirl = vec2(-dir.y, dir.x);
            pos.xy += dir * push * (kind < 0.5 ? 0.16 : 0.48)
                    + swirl * push * sin(phase + uTime * 5.0) * 0.16;
            pos.z += push * (0.42 + cos(phase + uTime * 7.0) * 0.22);
            vColor += vec3(0.32, 0.26, 0.36) * push;
          }
        }

        vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPos;

        float twinkle = 0.82 + 0.18 * sin(uTime * speed * 1.5 + phase * 3.0);
        float budSizeMul = kind < 0.5 ? 1.0 : mix(0.62, 1.0, uBloom);
        float previewSizeMul = mix(1.0, 0.56, uIsPreview);
        gl_PointSize = clamp((13.0 * budSizeMul * previewSizeMul * sizeScale * uPixelRatio) / max(1.5, -mvPos.z), mix(1.15, 0.9, uIsPreview), mix(4.4, 2.0, uIsPreview));
        vAlpha *= twinkle;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float glow = pow(smoothstep(0.5, 0.02, d), 0.78);
        float core = smoothstep(0.24, 0.0, d) * 0.22;
        gl_FragColor = vec4(vColor + core, clamp(glow * vAlpha, 0.0, 1.0));
      }
    `
  });

  const points = new THREE.Points(geo, mat);
  rig.add(points);

  const bgColor = new THREE.Color(0x000000);
  const state = {
    paletteIdx: 0,
    isDragging: false,
    dragMoved: false,
    isHovered: false,
    touchOpen: false,
    lastX: 0,
    lastY: 0,
    rotX: startClosed ? 0.04 : -0.14,
    rotY: startClosed ? 0.16 : 0.18,
    targetRotX: startClosed ? 0.04 : -0.14,
    targetRotY: startClosed ? 0.16 : 0.18,
    zoom: baseZ,
    targetZoom: baseZ,
    bloomCurrent: startClosed ? 0.0 : 1.0,
    bloomTarget: startClosed ? 0.0 : 1.0,
    pulseStrength: 0,
    cursorActive: 0,
    targetCursorActive: 0,
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
      state.pulseStrength *= Math.pow(0.05, dt);

      if (startClosed) {
        state.bloomTarget = (state.isHovered || state.isDragging || state.touchOpen) ? 1.0 : 0.0;
      } else {
        state.bloomTarget = 1.0;
      }

      const rate = state.bloomTarget > state.bloomCurrent ? 2.4 : 3.0;
      state.bloomCurrent += (state.bloomTarget - state.bloomCurrent) * Math.min(1, dt * rate);
      uniforms.uBloom.value = state.bloomCurrent;

      const bloomInteractGate = THREE.MathUtils.smoothstep(state.bloomCurrent, 0.25, 0.85);
      const effectiveTargetCursor = state.targetCursorActive * bloomInteractGate + state.pulseStrength;
      state.cursorActive += (effectiveTargetCursor - state.cursorActive) * Math.min(1, dt * 9.0);
      uniforms.uCursorActive.value = state.cursorActive;

      // Subtle 3D perspective angle that breathes gently when not actively dragged/hovered
      const baseTiltX = THREE.MathUtils.lerp(0.05, -0.16, state.bloomCurrent);
      const baseTiltY = THREE.MathUtils.lerp(0.14, 0.2, state.bloomCurrent);
      const idleSwayY = !state.isDragging ? Math.sin(uniforms.uTime.value * 0.52) * 0.12 : 0;
      const idleSwayX = !state.isDragging ? Math.cos(uniforms.uTime.value * 0.41) * 0.05 : 0;

      const goalX = state.isHovered || state.isDragging ? state.targetRotX : baseTiltX + idleSwayX;
      const goalY = state.isHovered || state.isDragging ? state.targetRotY : baseTiltY + idleSwayY;
      state.rotX += (goalX - state.rotX) * Math.min(1, dt * 6.0);
      state.rotY += (goalY - state.rotY) * Math.min(1, dt * 6.0);
      rig.rotation.x = state.rotX;
      rig.rotation.y = state.rotY;

      state.zoom += (state.targetZoom - state.zoom) * 0.1;
      camera.position.z = state.zoom;

      const pal = FLOWER_PALETTES[state.paletteIdx];
      const blend = Math.min(1, dt * 4.5);
      uniforms.uPetalInner.value.lerp(pal.petalInner, blend);
      uniforms.uPetalOuter.value.lerp(pal.petalOuter, blend);
      uniforms.uCenterCore.value.lerp(pal.centerCore, blend);
      uniforms.uCenterEdge.value.lerp(pal.centerEdge, blend);
      uniforms.uStem.value.lerp(pal.stem, blend);
    },
    onPointerDown(e, canvas) {
      state.isDragging = true;
      state.dragMoved = false;
      state.lastX = e.clientX;
      state.lastY = e.clientY;
      if (e.pointerType === 'touch') {
        state.touchOpen = !state.touchOpen;
      }
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
          state.isHovered = true;
          state.ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
          state.ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
          state.raycaster.setFromCamera(state.ndc, camera);
          if (state.raycaster.ray.intersectPlane(state.plane, state.hitPt)) {
            rig.worldToLocal(state.hitPt);
            uniforms.uCursor.value.copy(state.hitPt);
            state.targetCursorActive = 1.0;
          }
          if (!state.isDragging) {
            state.targetRotY = state.ndc.x * 0.34;
            state.targetRotX = -0.1 - state.ndc.y * 0.22;
          }
        } else {
          state.isHovered = false;
          if (!state.isDragging) {
            state.targetCursorActive = 0.0;
          }
        }
      }

      if (!state.isDragging) return;
      const dx = e.clientX - state.lastX;
      const dy = e.clientY - state.lastY;
      if (Math.hypot(dx, dy) > 6) state.dragMoved = true;
      state.targetRotY = THREE.MathUtils.clamp(state.targetRotY + dx * 0.009, -1.25, 1.25);
      state.targetRotX = THREE.MathUtils.clamp(state.targetRotX + dy * 0.009, -0.85, 0.85);
      state.lastX = e.clientX;
      state.lastY = e.clientY;
    },
    onPointerUp(_, canvas) {
      state.isDragging = false;
      canvas.style.cursor = 'pointer';
    },
    onPointerLeave() {
      state.isHovered = false;
      state.targetCursorActive = 0.0;
    },
    onClick() {
      if (state.dragMoved) return;
      state.pulseStrength = 1.0;
    },
    onWheel(e) {
      e.preventDefault();
      state.targetZoom = THREE.MathUtils.clamp(state.targetZoom + e.deltaY * 0.0038, 3.0, 10.5);
    },
    getPaletteCount: () => FLOWER_PALETTES.length,
    getPaletteName: () => FLOWER_PALETTES[state.paletteIdx].name,
    cyclePalette() {
      state.paletteIdx = (state.paletteIdx + 1) % FLOWER_PALETTES.length;
      return FLOWER_PALETTES[state.paletteIdx].name;
    },
    nextPalette() {
      state.paletteIdx = (state.paletteIdx + 1) % FLOWER_PALETTES.length;
    },
    dispose() {
      geo.dispose();
      mat.dispose();
    }
  };
}

export function mountParticleFlower(container) {
  return mountSceneIntoContainer(container, createParticleFlowerScene);
}
