import * as THREE from 'three';
import { mountSceneIntoContainer } from './shared-card-stage.js';

const SPHERE_PALETTES = [
  { name: 'COBALT / ICE', deep: new THREE.Color('#091e6e'), mid: new THREE.Color('#2563eb'), rim: new THREE.Color('#bfdbfe'), glow: new THREE.Color('#e0f7ff'), dot: new THREE.Color('#dbeafe') },
  { name: 'VIOLET / PRISM', deep: new THREE.Color('#2e1065'), mid: new THREE.Color('#7c3aed'), rim: new THREE.Color('#e9d5ff'), glow: new THREE.Color('#fce7f3'), dot: new THREE.Color('#f3e8ff') },
  { name: 'TEAL / AURORA', deep: new THREE.Color('#064e3b'), mid: new THREE.Color('#0d9488'), rim: new THREE.Color('#99f6e4'), glow: new THREE.Color('#ecfeff'), dot: new THREE.Color('#ccfbf1') }
];

function buildSpiralRibbonGeometry({
  radius = 2.15,
  turns = 6.2,
  latMin = -1.14,
  latMax = 1.14,
  halfBand = 0.088,
  segU = 420,
  segV = 6
} = {}) {
  const cols = segV + 1;
  const rows = segU + 1;
  const positions = new Float32Array(rows * cols * 3);
  const normals = new Float32Array(rows * cols * 3);
  const uvs = new Float32Array(rows * cols * 2);
  const indices = [];
  const rimTopPositions = new Float32Array(rows * 3);
  const rimBottomPositions = new Float32Array(rows * 3);

  let pPtr = 0;
  let uvPtr = 0;
  let rTopPtr = 0;
  let rBotPtr = 0;

  for (let i = 0; i <= segU; i++) {
    const u = i / segU;
    const centerLat = latMin + (latMax - latMin) * u;
    const lon = u * turns * Math.PI * 2;
    const band = halfBand * Math.min(1, Math.sin(u * Math.PI) * 5.2 + 0.12);

    for (let j = 0; j <= segV; j++) {
      const v = j / segV;
      const lat = THREE.MathUtils.clamp(centerLat + (v - 0.5) * 2 * band, -1.48, 1.48);
      const cosLat = Math.cos(lat);
      const nx = cosLat * Math.cos(lon);
      const ny = Math.sin(lat);
      const nz = cosLat * Math.sin(lon);
      const x = nx * radius;
      const y = ny * radius;
      const z = nz * radius;

      positions[pPtr] = x;
      positions[pPtr + 1] = y;
      positions[pPtr + 2] = z;
      normals[pPtr] = nx;
      normals[pPtr + 1] = ny;
      normals[pPtr + 2] = nz;
      pPtr += 3;

      uvs[uvPtr++] = u;
      uvs[uvPtr++] = v;

      if (j === 0) {
        rimBottomPositions[rBotPtr++] = x * 1.002;
        rimBottomPositions[rBotPtr++] = y * 1.002;
        rimBottomPositions[rBotPtr++] = z * 1.002;
      } else if (j === segV) {
        rimTopPositions[rTopPtr++] = x * 1.002;
        rimTopPositions[rTopPtr++] = y * 1.002;
        rimTopPositions[rTopPtr++] = z * 1.002;
      }
    }
  }

  for (let i = 0; i < segU; i++) {
    for (let j = 0; j < segV; j++) {
      const a = i * cols + j;
      const b = (i + 1) * cols + j;
      const c = (i + 1) * cols + (j + 1);
      const d = i * cols + (j + 1);
      indices.push(a, b, d, b, c, d);
    }
  }

  const ribbonGeo = new THREE.BufferGeometry();
  ribbonGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  ribbonGeo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  ribbonGeo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  ribbonGeo.setIndex(indices);

  const topRimGeo = new THREE.BufferGeometry();
  topRimGeo.setAttribute('position', new THREE.BufferAttribute(rimTopPositions, 3));

  const botRimGeo = new THREE.BufferGeometry();
  botRimGeo.setAttribute('position', new THREE.BufferAttribute(rimBottomPositions, 3));

  const buildCollarRing = lat => {
    const segs = 128;
    const pts = new Float32Array((segs + 1) * 3);
    const r = Math.cos(lat) * radius * 1.003;
    const y = Math.sin(lat) * radius * 1.003;
    for (let k = 0; k <= segs; k++) {
      const a = (k / segs) * Math.PI * 2;
      pts[k * 3] = Math.cos(a) * r;
      pts[k * 3 + 1] = y;
      pts[k * 3 + 2] = Math.sin(a) * r;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    return g;
  };

  return {
    ribbonGeo,
    topRimGeo,
    botRimGeo,
    northCollarGeo: buildCollarRing(latMax + halfBand * 0.25),
    southCollarGeo: buildCollarRing(latMin - halfBand * 0.25)
  };
}

function buildDotMatrixGeometry(count = 2200, radius = 1.94) {
  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const rAtY = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = goldenAngle * i;
    const nx = Math.cos(theta) * rAtY;
    const nz = Math.sin(theta) * rAtY;

    positions[i * 3] = nx * radius;
    positions[i * 3 + 1] = y * radius;
    positions[i * 3 + 2] = nz * radius;

    normals[i * 3] = nx;
    normals[i * 3 + 1] = y;
    normals[i * 3 + 2] = nz;
    phases[i] = (i * 0.6180339887) % 1;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aNormal', new THREE.BufferAttribute(normals, 3));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  return geo;
}

/**
 * Builds the Helical Ribbon Sphere scene (shared by Grid Card Preview & Full Modal Stage).
 */
export function createRibbonSphereScene(pixelRatio = 1, options = {}) {
  const scene = new THREE.Scene();
  const baseZ = options.isPreview ? 6.95 : 6.8;
  const camera = new THREE.PerspectiveCamera(44, 1.5, 0.1, 100);
  camera.position.set(0, 0, baseZ);

  const tiltGroup = new THREE.Group();
  tiltGroup.rotation.z = -0.46;
  tiltGroup.rotation.x = 0.24;
  scene.add(tiltGroup);

  const spinGroup = new THREE.Group();
  tiltGroup.add(spinGroup);

  const uniforms = {
    uTime: { value: 0 },
    uDeep: { value: SPHERE_PALETTES[0].deep.clone() },
    uMid: { value: SPHERE_PALETTES[0].mid.clone() },
    uRim: { value: SPHERE_PALETTES[0].rim.clone() },
    uGlow: { value: SPHERE_PALETTES[0].glow.clone() },
    uDot: { value: SPHERE_PALETTES[0].dot.clone() },
    uPixelRatio: { value: pixelRatio }
  };

  const { ribbonGeo, topRimGeo, botRimGeo, northCollarGeo, southCollarGeo } = buildSpiralRibbonGeometry();

  const createRibbonMaterial = (side, opacityScale) =>
    new THREE.ShaderMaterial({
      uniforms: { ...uniforms, uOpacityScale: { value: opacityScale } },
      side,
      transparent: true,
      depthWrite: false,
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vViewNormal, vViewPos;
        void main() {
          vUv = uv;
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          vViewPos = -mvPos.xyz;
          vViewNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uDeep, uMid, uRim, uGlow;
        uniform float uOpacityScale, uTime;
        varying vec2 vUv;
        varying vec3 vViewNormal, vViewPos;

        void main() {
          vec3 N = normalize(vViewNormal);
          if (!gl_FrontFacing) N = -N;
          vec3 V = normalize(vViewPos);

          float fresnel = pow(1.0 - clamp(abs(dot(N, V)), 0.0, 1.0), 1.65);
          vec3 keyDir = normalize(vec3(-0.66, -0.76, 0.42));
          float keyLight = clamp(dot(N, keyDir) * 0.5 + 0.5, 0.0, 1.0);
          float bottomPool = smoothstep(0.35, -0.85, N.y) * smoothstep(0.4, -0.75, N.x);

          vec3 col = mix(uDeep, uMid, 0.35 + 0.65 * keyLight);
          col = mix(col, uRim, fresnel * 0.82);
          float sheen = clamp(bottomPool * 0.85 + pow(keyLight, 2.8) * 0.55, 0.0, 1.0);
          col = mix(col, uGlow, sheen * 0.72);

          float edgeMask = max(smoothstep(0.11, 0.0, vUv.y), smoothstep(0.89, 1.0, vUv.y));
          col = mix(col, vec3(0.94, 0.98, 1.0), edgeMask * 0.82);
          col *= 0.92 + 0.08 * sin(vUv.x * 24.0 - uTime * 2.2);

          float alpha = (0.34 + fresnel * 0.46 + sheen * 0.28 + edgeMask * 0.35) * uOpacityScale;
          gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.96));
        }
      `
    });

  const backMat = createRibbonMaterial(THREE.BackSide, 0.44);
  const frontMat = createRibbonMaterial(THREE.FrontSide, 0.92);
  const ribbonBack = new THREE.Mesh(ribbonGeo, backMat);
  const ribbonFront = new THREE.Mesh(ribbonGeo, frontMat);
  ribbonBack.renderOrder = 1;
  ribbonFront.renderOrder = 3;
  spinGroup.add(ribbonBack, ribbonFront);

  const rimLineMat = new THREE.LineBasicMaterial({
    color: 0xdbeafe,
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const topRim = new THREE.Line(topRimGeo, rimLineMat);
  const botRim = new THREE.Line(botRimGeo, rimLineMat);
  const northCollar = new THREE.Line(northCollarGeo, rimLineMat);
  const southCollar = new THREE.Line(southCollarGeo, rimLineMat);
  topRim.renderOrder = botRim.renderOrder = northCollar.renderOrder = southCollar.renderOrder = 4;
  spinGroup.add(topRim, botRim, northCollar, southCollar);

  const dotGeo = buildDotMatrixGeometry(2200, 1.94);
  const dotMat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute vec3 aNormal;
      attribute float aPhase;
      uniform float uTime, uPixelRatio;
      varying float vFacing, vTwinkle;

      void main() {
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vec3 viewN = normalize(normalMatrix * aNormal);
        vFacing = dot(viewN, normalize(-mvPos.xyz));
        vTwinkle = 0.78 + 0.22 * sin(uTime * 2.5 + aPhase * 31.4);
        gl_Position = projectionMatrix * mvPos;
        gl_PointSize = clamp((13.0 * uPixelRatio) / max(2.0, -mvPos.z), 1.6, 5.2);
      }
    `,
    fragmentShader: `
      uniform vec3 uDot;
      varying float vFacing, vTwinkle;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float dotAlpha = smoothstep(0.5, 0.16, d);
        float frontWeight = mix(0.18, 0.92, smoothstep(-0.35, 0.75, vFacing));
        gl_FragColor = vec4(uDot, dotAlpha * frontWeight * vTwinkle);
      }
    `
  });
  const dotSphere = new THREE.Points(dotGeo, dotMat);
  dotSphere.renderOrder = 2;
  spinGroup.add(dotSphere);

  const state = {
    paletteIdx: 0,
    isDragging: false,
    lastX: 0,
    lastY: 0,
    velX: 0,
    velY: 0.0045,
    zoom: baseZ,
    targetZoom: baseZ
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
      const targetPal = SPHERE_PALETTES[state.paletteIdx];
      const blend = Math.min(1, dt * 4.5);
      uniforms.uDeep.value.lerp(targetPal.deep, blend);
      uniforms.uMid.value.lerp(targetPal.mid, blend);
      uniforms.uRim.value.lerp(targetPal.rim, blend);
      uniforms.uGlow.value.lerp(targetPal.glow, blend);
      uniforms.uDot.value.lerp(targetPal.dot, blend);
      rimLineMat.color.lerp(targetPal.rim, blend);

      spinGroup.rotation.y += dt * 0.24;
      dotSphere.rotation.y -= dt * 0.09;

      if (!state.isDragging) {
        tiltGroup.rotation.y += state.velY;
        tiltGroup.rotation.x = THREE.MathUtils.clamp(tiltGroup.rotation.x + state.velX, -1.25, 1.25);
        state.velX *= 0.94;
        state.velY = state.velY * 0.96 + 0.00018;
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
    onPointerMove(e) {
      if (!state.isDragging) return;
      const dx = e.clientX - state.lastX;
      const dy = e.clientY - state.lastY;
      state.lastX = e.clientX;
      state.lastY = e.clientY;
      state.velY = dx * 0.008;
      state.velX = dy * 0.008;
      tiltGroup.rotation.y += state.velY;
      tiltGroup.rotation.x = THREE.MathUtils.clamp(tiltGroup.rotation.x + state.velX, -1.25, 1.25);
    },
    onPointerUp(_e, canvas) {
      state.isDragging = false;
      canvas.style.cursor = 'grab';
    },
    onWheel(e) {
      state.targetZoom = THREE.MathUtils.clamp(state.targetZoom + e.deltaY * 0.004, 4.4, 10.2);
    },
    cyclePalette() {
      state.paletteIdx = (state.paletteIdx + 1) % SPHERE_PALETTES.length;
      return SPHERE_PALETTES[state.paletteIdx].name;
    },
    getPaletteName: () => SPHERE_PALETTES[state.paletteIdx].name,
    dispose() {
      ribbonGeo.dispose();
      topRimGeo.dispose();
      botRimGeo.dispose();
      northCollarGeo.dispose();
      southCollarGeo.dispose();
      dotGeo.dispose();
      backMat.dispose();
      frontMat.dispose();
      rimLineMat.dispose();
      dotMat.dispose();
    }
  };
}

export function mountRibbonSphere(container) {
  return mountSceneIntoContainer(container, createRibbonSphereScene, {
    canvasClass: 'ribbon-sphere-canvas',
    cursor: 'grab'
  });
}
