import * as THREE from 'three';
import { mountSceneIntoContainer } from './shared-card-stage.js';

const GALAXY_PALETTES = [
  { name: 'STARLIGHT / VOID', inner: new THREE.Color('#ffffff'), outer: new THREE.Color('#cbd5e1'), bg: 0x05060d },
  { name: 'SAPPHIRE / QUASAR', inner: new THREE.Color('#e0f2fe'), outer: new THREE.Color('#38bdf8'), bg: 0x030714 },
  { name: 'AMBER / ACCRETION', inner: new THREE.Color('#fef3c7'), outer: new THREE.Color('#fb923c'), bg: 0x090508 },
  { name: 'VIOLET / PULSAR', inner: new THREE.Color('#f5d0fe'), outer: new THREE.Color('#a855f7'), bg: 0x070412 }
];

/**
 * Builds the Spin Galaxy Rings scene (shared by Grid Card & Full Modal).
 */
export function createGalaxyRingsScene(pixelRatio = 1, options = {}) {
  const scene = new THREE.Scene();
  const baseZoom = options.isPreview ? 1.15 : 1.0;
  const camera = new THREE.PerspectiveCamera(45, 1.5, 0.1, 100);
  camera.position.set(0, 3.85 * baseZoom, 6.25 * baseZoom);
  camera.lookAt(0, -0.1, 0);

  const rig = new THREE.Group();
  rig.rotation.z = -0.12;
  scene.add(rig);

  let seed = 777123;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const uniforms = {
    uTime: { value: 0 },
    uInner: { value: GALAXY_PALETTES[0].inner.clone() },
    uOuter: { value: GALAXY_PALETTES[0].outer.clone() },
    uShock: { value: 0 },
    uPixelRatio: { value: pixelRatio }
  };

  const STAR_COUNT = 8500;
  const positions = new Float32Array(STAR_COUNT * 3);
  const meta = new Float32Array(STAR_COUNT * 4);
  const INNER_HOLE = 1.15;
  const OUTER_RIM = 5.45;

  for (let i = 0; i < STAR_COUNT; i++) {
    const t = Math.pow(rand(), 1.65);
    const bandRipple = Math.sin(t * Math.PI * 10.0) * 0.08;
    const r = INNER_HOLE + Math.max(0, t + bandRipple) * (OUTER_RIM - INNER_HOLE);
    const theta = rand() * Math.PI * 2;
    const thickness = (0.04 + t * 0.14) * (rand() + rand() - 1);

    positions[i * 3] = Math.cos(theta) * r;
    positions[i * 3 + 1] = thickness;
    positions[i * 3 + 2] = Math.sin(theta) * r;

    meta[i * 4] = THREE.MathUtils.clamp((r - INNER_HOLE) / (OUTER_RIM - INNER_HOLE), 0, 1);
    meta[i * 4 + 1] = 0.68 / Math.pow(r, 0.72);
    meta[i * 4 + 2] = rand();
    meta[i * 4 + 3] = 0.75 + rand() * 1.15;
  }

  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  starGeo.setAttribute('aMeta', new THREE.BufferAttribute(meta, 4));

  const starMat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute vec4 aMeta;
      uniform float uTime, uShock, uPixelRatio;
      varying float vRadial, vAlpha;

      void main() {
        vRadial = aMeta.x;
        float speed = aMeta.y;
        float phase = aMeta.z;
        float sizeScale = aMeta.w;

        vec3 pos = position;
        float angle = uTime * speed;
        pos.xz = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * pos.xz;
        pos.y += sin(vRadial * 14.0 - uTime * 2.1 + phase * 6.283) * 0.035;
        pos.xz *= 1.0 + uShock * 0.12 * (1.0 - vRadial);

        vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPos;
        gl_PointSize = clamp((13.0 * sizeScale * uPixelRatio) / max(1.8, -mvPos.z), 1.3, 5.2);

        float twinkle = 0.65 + 0.35 * sin(uTime * 3.4 + phase * 27.0);
        vAlpha = mix(0.95, 0.18, pow(vRadial, 0.85)) * twinkle;
      }
    `,
    fragmentShader: `
      uniform vec3 uInner, uOuter;
      varying float vRadial, vAlpha;

      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        gl_FragColor = vec4(mix(uInner, uOuter, vRadial), smoothstep(0.5, 0.12, d) * vAlpha);
      }
    `
  });
  rig.add(new THREE.Points(starGeo, starMat));

  const bgColor = new THREE.Color(GALAXY_PALETTES[0].bg);
  const targetBg = new THREE.Color();

  const state = {
    paletteIdx: 0,
    isDragging: false,
    lastX: 0,
    lastY: 0,
    tiltX: 0,
    tiltY: 0,
    targetTiltX: 0,
    targetTiltY: 0,
    zoom: baseZoom,
    targetZoom: baseZoom
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
      uniforms.uShock.value *= 0.91;

      const pal = GALAXY_PALETTES[state.paletteIdx];
      const blend = Math.min(1, dt * 4.5);
      uniforms.uInner.value.lerp(pal.inner, blend);
      uniforms.uOuter.value.lerp(pal.outer, blend);
      targetBg.setHex(pal.bg);
      bgColor.lerp(targetBg, blend);

      state.tiltX += (state.targetTiltX - state.tiltX) * 0.08;
      state.tiltY += (state.targetTiltY - state.tiltY) * 0.08;
      state.zoom += (state.targetZoom - state.zoom) * 0.08;

      rig.rotation.x = state.tiltX;
      rig.rotation.y = state.tiltY;
      camera.position.set(0, 3.85 * state.zoom, 6.25 * state.zoom);
      camera.lookAt(0, -0.1, 0);
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
      state.targetTiltY += dx * 0.006;
      state.targetTiltX = THREE.MathUtils.clamp(state.targetTiltX + dy * 0.005, -0.75, 0.65);
    },
    onPointerUp(_e, canvas) {
      state.isDragging = false;
      canvas.style.cursor = 'grab';
    },
    onClick() {
      uniforms.uShock.value = 1.0;
    },
    onWheel(e) {
      state.targetZoom = THREE.MathUtils.clamp(state.targetZoom + e.deltaY * 0.0008, 0.65, 1.55);
    },
    cyclePalette() {
      state.paletteIdx = (state.paletteIdx + 1) % GALAXY_PALETTES.length;
      return GALAXY_PALETTES[state.paletteIdx].name;
    },
    getPaletteName: () => GALAXY_PALETTES[state.paletteIdx].name,
    dispose() {
      starGeo.dispose();
      starMat.dispose();
    }
  };
}

export function mountGalaxyRings(container) {
  return mountSceneIntoContainer(container, createGalaxyRingsScene, {
    canvasClass: 'galaxy-rings-canvas',
    cursor: 'grab'
  });
}
