import * as THREE from 'three';
import { mountSceneIntoContainer } from './shared-card-stage.js';

// Cobalt Sprite — Originkit (Ray-Traced GLSL Glass Capsule & Marble Sprite)

const SPRITE_PALETTES = [
  { name: 'COBALT / ORIGINKIT', spriteColor: '#1400F6', eyeColor: '#F3F2F8', background: '#000000' },
  { name: 'AZURE / STUDIO', spriteColor: '#2563EB', eyeColor: '#F8FAFC', background: '#020617' },
  { name: 'VIOLET / PLASMA', spriteColor: '#6D28D9', eyeColor: '#FAF5FF', background: '#070314' },
  { name: 'CYAN / FROST', spriteColor: '#0284C7', eyeColor: '#ECFEFF', background: '#020B12' }
];

const DEFAULTS = {
  face: 'eyes',
  scale: 90,
  frost: 5,
  reach: 10,
  lean: 4,
  blink: 10,
  float: 12
};

const ADV = {
  restX: 0,
  restY: 10,
  roll: 0,
  maxTurn: 40,
  seamAngle: 90,
  seamTilt: 72,
  seamOffset: -8,
  shell: 4.5,
  lip: 6,
  spriteSize: 59.3,
  eyeGap: 45,
  eyeLength: 34,
  eyeWidth: 10,
  lightAngle: 0,
  gloss: 100,
  glow: 100,
  grain: 100,
  followMs: 90,
  blinkMs: 150
};

const DEG = Math.PI / 180;
const FIT = 0.709;

function hexToLinRGB(hex) {
  const clean = hex.replace('#', '');
  const n = parseInt(clean, 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  return new THREE.Vector3(Math.pow(r, 2.2), Math.pow(g, 2.2), Math.pow(b, 2.2));
}

function rotX(v, a) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [v[0], c * v[1] - s * v[2], s * v[1] + c * v[2]];
}

function rotY(v, a) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [c * v[0] + s * v[2], v[1], -s * v[0] + c * v[2]];
}

const VERT = `
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const FRAG = `
precision highp float;

varying vec2 vUv;

uniform vec2  uViewSize; // surface dimensions matching uCenter & uRadius
uniform vec2  uCenter;   // capsule centre
uniform float uRadius;   // capsule radius
uniform vec3  uSeamN;    // seam plane normal, view space, toward the clear half
uniform float uSeamD;
uniform float uRi;       // inner radius of the shell
uniform float uLip;      // inner radius of the seam lip
uniform vec3  uBallC;
uniform float uBallR;
uniform mat3  uRot;      // sprite local -> view
uniform vec4  uEye;      // half gap, half segment length, half width (rad), openness
uniform float uFace;
uniform vec3  uBall;
uniform vec3  uEyeCol;
uniform vec3  uBg;
uniform float uFrost;    // 0 clear, 1 reference frost, 2 near opaque milk
uniform float uGloss;
uniform float uGlow;
uniform float uGrain;
uniform vec2  uLight;    // cos, sin of studio roll
uniform float uDpr;
uniform float uTime;

const float IOR = 1.5;

float hash13(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}

/* ------------------------------------------------------------ studio */

float stad(vec2 m, vec2 c, float a, float hl, float hw, float blur) {
  vec2 d = m - c;
  float ca = cos(a), sa = sin(a);
  vec2 q = vec2(ca * d.x + sa * d.y, -sa * d.x + ca * d.y);
  q.x = max(abs(q.x) - hl, 0.0);
  float w = hw + blur;
  float k = length(q) / w;
  float v = smoothstep(1.0, 0.6, k) * 0.8 + exp(-k * k * 0.9) * 0.2;
  return v * (hw / w) * ((hl + hw) / (hl + w));
}

vec2 polar(float r, float deg) {
  float a = radians(deg);
  return r * vec2(cos(a), sin(a));
}

vec3 env(vec3 R, float blur, float ring, float mz, float upper) {
  vec3 h = R + vec3(0.0, 0.0, 1.0);
  float lh = length(h);
  vec2 m = lh > 1e-4 ? h.xy / lh : normalize(R.xy + 1e-6);
  m *= mz;
  m = vec2(uLight.x * m.x + uLight.y * m.y, -uLight.y * m.x + uLight.x * m.y);
  float rm = length(m);

  vec3 c = vec3(0.0);
  float mg = 0.3 + blur * 3.0;
  if (m.x > -0.25 - mg && m.y > 0.25 - mg) {
    float s = 0.0;
    s += stad(m, polar(0.884, 92.7), radians(161.0), 0.040, 0.024, blur) * upper;
    s += stad(m, polar(0.839, 73.1), radians(149.0), 0.130, 0.040, blur) * upper;
    s += stad(m, polar(0.892, 61.1), radians(144.0), 0.145, 0.033, blur) * upper;
    s += stad(m, polar(0.884, 33.4), radians(120.0), 0.160, 0.036, blur) * 0.9;
    s += stad(m, polar(0.825, 34.2), radians(116.0), 0.105, 0.040, blur);
    c = vec3(1.0, 0.99, 0.98) * 30.0 * s;
  }

  c += vec3(0.93, 0.95, 1.0) * 3.2 * smoothstep(0.982, 0.999, rm) * ring;
  c += vec3(0.9, 0.93, 1.0) * 0.05 * smoothstep(-0.2, 0.9, m.y) * (1.0 - rm * rm * 0.5);
  return c;
}

float fres(float c) {
  c = clamp(c, 0.0, 1.0);
  return 0.04 + 0.96 * pow(1.0 - c, 5.0);
}

/* ------------------------------------------------------------ frost */

float frostLight(vec3 P, float ext) {
  vec3 n = normalize(P);
  float kl = max(dot(n, normalize(vec3(-0.95, -0.15, 0.30))), 0.0);
  float kb = max(dot(n, normalize(vec3(0.55, -0.60, -0.60))), 0.0);
  vec3 Lo = normalize(vec3(-0.10, 0.15, 0.98));
  vec3 oc = uBallC - P;
  float tc = max(dot(oc, Lo), 0.0);
  float dist = length(oc - Lo * tc);
  float shade = smoothstep(uBallR * 0.95, uBallR * 1.12, dist);
  return 0.02 + ext * 1.1 * kl * kl * kl + (0.85 * kb * kb + 0.05) * shade;
}

/* -------------------------------------------------------------- ball */

vec2 sphereHit(vec3 ro, vec3 rd, vec3 c, float r) {
  vec3 oc = ro - c;
  float b = dot(oc, rd);
  float h = b * b - (dot(oc, oc) - r * r);
  if (h < 0.0) return vec2(-1.0);
  h = sqrt(h);
  return vec2(-b - h, -b + h);
}

vec4 pill(vec2 q, float px) {
  float open = max(uEye.w, 0.12);
  float hl = uEye.y * open;
  float hw = uEye.z * mix(0.7, 1.0, open);
  vec2 a = vec2(q.x, max(abs(q.y) - hl, 0.0) * sign(q.y));
  a.y /= mix(0.45, 1.0, open);
  float dd = length(a);
  float cov = smoothstep(hw + px, hw - px, dd);
  float hgt = sqrt(max(hw * hw - dd * dd, 0.0));
  vec2 dir = dd > 1e-5 ? a / dd : vec2(0.0);
  return vec4(cov, dir * dd, hgt);
}

vec3 shadeBall(vec3 P, vec3 rd, float px) {
  vec3 N = normalize(P - uBallC);
  vec3 nl = N * uRot;
  vec3 albedo = uBall;
  float eye = 0.0;
  vec3 Ns = N;

  if (uFace > 0.5 && nl.z > cos(min(uEye.x + uEye.y + uEye.z + 0.05, 3.0))) {
    float lon = atan(nl.x, nl.z);
    float lat = asin(clamp(nl.y, -1.0, 1.0));
    float cl = cos(lat);
    float pa = px / uBallR * 1.2;
    float side = lon < 0.0 ? -1.0 : 1.0;
    vec2 q = vec2((lon - side * uEye.x) * cl, lat);
    vec4 e = pill(q, pa);
    if (e.x > 0.0) {
      vec3 tu = vec3(cos(lon), 0.0, -sin(lon));
      vec3 tv = vec3(-sin(lat) * sin(lon), cl, -sin(lat) * cos(lon));
      vec3 bent = normalize(nl * max(e.w, 1e-4) + (tu * e.y + tv * e.z) * 0.85);
      Ns = normalize(uRot * bent);
      eye = e.x;
      albedo = mix(albedo, uEyeCol, e.x);
    }
  }

  vec3 n = normalize(mix(N, Ns, eye));
  vec3 Lk = normalize(vec3(0.62, 0.62, 0.48));
  float d = clamp((dot(n, Lk) + 0.6) / 1.6, 0.0, 1.0);
  vec3 c = albedo * (0.80 + 0.30 * d);
  float rimLift = pow(1.0 - clamp(n.z, 0.0, 1.0), 1.6) *
                  smoothstep(-0.5, 0.7, dot(n.xy, vec2(0.55, 0.83)));
  c += vec3(0.30, 0.31, 0.29) * rimLift * (1.0 - eye);
  float wash = pow(max(dot(n, normalize(vec3(0.62, 0.62, 0.35))), 0.0), 1.5);
  c += vec3(0.45, 0.46, 0.42) * wash * (1.0 - eye);
  c += vec3(0.30) * pow(max(dot(n, normalize(vec3(0.58, 0.50, 0.64))), 0.0), 2.2) * eye;
  vec3 R = reflect(rd, n);
  float F = 0.04 + 0.96 * pow(1.0 - max(dot(-rd, n), 0.0), 5.0);
  c += env(R, mix(0.06, 0.04, eye), 0.10, 1.15, 0.15) * mix(F * 1.2, F * 1.8 + 0.03, eye) * uGloss;
  c = mix(c, c * vec3(0.86, 0.87, 1.0), eye * (1.0 - d));
  return c;
}

/* --------------------------------------------------------- back wall */

vec3 backWall(vec3 Pw, vec3 rd, float px) {
  vec3 Nin = -Pw / uRi;
  float side = dot(uSeamN, Pw) - uSeamD;
  float fm = smoothstep(0.012, -0.012, side) * min(uFrost, 1.0);

  float F = fres(dot(-rd, Nin));
  vec3 clear = uBg * 0.85 + env(reflect(rd, Nin), 0.02, 0.4, 1.0, 1.0) * F * 0.55 * uGloss;
  float g = smoothstep(0.25, 0.8, 1.0 - abs(dot(rd, Nin)));
  clear += vec3(0.003, 0.0035, 0.005) + vec3(0.040, 0.042, 0.052) * g * g;

  if (fm <= 0.0) return clear;
  vec3 frosted = vec3(0.84, 0.88, 0.97) * 0.42 * frostLight(Pw, 0.25);
  return mix(clear, frosted, fm);
}

/* -------------------------------------------------------------- seam */

vec4 seamBand(vec2 p, float px) {
  if (abs(uSeamN.z) < 1e-3) return vec4(0.0, 0.0, -9.0, 0.0);
  float zp = (uSeamD - uSeamN.x * p.x - uSeamN.y * p.y) / uSeamN.z;
  vec3 P = vec3(p, zp);
  float rp = length(P);
  if (rp < uLip - 0.02 || rp > 1.0) return vec4(0.0, 0.0, zp, 0.0);
  vec2 g = (P.xy - P.z * uSeamN.xy / uSeamN.z) / max(rp, 1e-4);
  float sw = 1.0 - uLip;
  float s = (rp - uLip) / sw;
  float ds = length(g) * px / sw;
  float body = smoothstep(-ds, ds, s) * smoothstep(1.0 + ds, 1.0 - ds, s);
  float w = max(1.3 * ds, 0.07);
  float lines = 0.0;
  lines += 1.00 * smoothstep(max(1.8 * ds, 0.14), 0.0, abs(s - 0.90));
  lines += 0.70 * smoothstep(w, 0.0, abs(s - 0.50));
  lines += 0.85 * smoothstep(w, 0.0, abs(s - 0.08));
  float dark = 0.0;
  dark += smoothstep(w * 1.3, 0.0, abs(s - 0.70));
  dark += smoothstep(w * 1.1, 0.0, abs(s - 0.29));
  return vec4(body, clamp(lines, 0.0, 1.0), zp, clamp(dark, 0.0, 1.0));
}

/* -------------------------------------------------------------- main */

float tone(float x) {
  return x < 0.8 ? x : 0.8 + 0.2 * (1.0 - exp(-(x - 0.8) / 0.2));
}

void main() {
  vec2 fragPx = vUv * uViewSize;
  float px = 1.0 / max(uRadius, 1.0);
  vec2 p = (fragPx - uCenter) * px;
  float r = length(p);
  vec3 rd = vec3(0.0, 0.0, -1.0);

  float x = max(r - 1.0, 0.0);
  vec3 halo = vec3(0.92, 0.95, 1.0) * (0.11 * exp(-x / 0.006) + 0.03 * exp(-x / 0.02)) * uGlow;

  vec3 col = uBg;
  float cov = 1.0 - smoothstep(1.0 - px, 1.0 + px, r);
  if (cov > 0.0) {
    float rr = min(r, 0.99999);
    vec3 P0 = vec3(p, sqrt(1.0 - rr * rr));
    vec3 N0 = P0;
    float Fo = fres(N0.z);
    vec3 refl = env(reflect(rd, N0), 0.0, 1.0, 1.0, 1.0) * Fo * uGloss;
    float frontSide = dot(uSeamN, P0) - uSeamD;
    float fm = smoothstep(0.012, -0.012, frontSide) * min(uFrost, 1.0);
    float thick = max(uFrost - 1.0, 0.0);

    vec3 r1 = refract(rd, N0, 1.0 / IOR);
    vec2 hi = sphereHit(P0, r1, vec3(0.0), uRi);
    vec3 Pi = P0 + r1 * hi.x;
    vec3 Ni = Pi / uRi;
    vec3 r2 = refract(r1, Ni, IOR);
    vec3 inner;
    float ballZ = -9.0;
    float tir = 1.0 - step(0.0, hi.x) * step(1e-4, dot(r2, r2));

    if (tir < 0.5) {
      vec2 hb = sphereHit(Pi, r2, uBallC, uBallR);
      if (hb.x > 0.0) {
        vec3 Pb = Pi + r2 * hb.x;
        ballZ = Pb.z;
        inner = shadeBall(Pb, r2, px);
      } else {
        vec2 hw = sphereHit(Pi, r2, vec3(0.0), uRi);
        inner = backWall(Pi + r2 * hw.y, r2, px);
      }
      inner *= vec3(0.96, 0.975, 0.985);

      if (fm > 0.0) {
        vec3 oc = uBallC - Pi;
        float tc = max(dot(oc, r2), 0.0);
        float dist = length(oc - r2 * tc);
        float bc = smoothstep(uBallR + 0.24, uBallR - 0.22, dist);
        vec3 behind = mix(inner * 0.35, uBall * 0.60, bc);
        float milk = pow(smoothstep(0.80 + 0.2 * thick, 0.22, N0.z), 1.8 - 1.0 * thick);
        float sharp = smoothstep(0.75, 0.95, N0.z) * (1.0 - thick);
        behind = mix(behind, inner, sharp * 0.3);
        float scatter = (0.55 + frostLight(P0, 0.85)) * (0.02 + 0.98 * milk);
        vec3 frosted = behind * (1.0 - milk * 0.8) + vec3(0.88, 0.90, 0.97) * scatter;
        inner = mix(inner, frosted, fm);
      }
    } else {
      vec3 rt = reflect(r1, normalize(Pi));
      if (hi.x <= 0.0) rt = r1;
      vec2 ho = sphereHit(P0 + r1 * max(hi.x, 0.0), rt, vec3(0.0), 1.0);
      vec3 P2 = P0 + r1 * max(hi.x, 0.0) + rt * ho.y;
      vec3 r3 = refract(rt, -normalize(P2), IOR);
      if (dot(r3, r3) < 1e-4) r3 = rt;
      float b = (r - uRi) / (1.0 - uRi);
      vec3 clearRim = uBg * 0.6 + env(r3, 0.03, 0.05, 1.0, 1.0) * 0.20 + vec3(0.040, 0.042, 0.052) * (0.8 + 0.6 * b);
      clearRim += vec3(0.9, 0.93, 1.0) * 0.6 * exp(-pow(b / 0.12, 2.0)) * smoothstep(-0.1, 0.8, p.y);
      inner = clearRim;
      if (fm > 0.0) {
        vec3 frostRim = vec3(0.88, 0.90, 0.97) * (0.55 + frostLight(P0, 0.85)) * 1.15;
        inner = mix(clearRim, frostRim, fm);
      }
    }

    col = inner * (1.0 - Fo) + refl;

    vec4 sb = seamBand(p, px);
    if (sb.x > 0.0 && sb.z > ballZ) {
      float hidden = sb.z < 0.0 ? fm * 0.85 : 0.0;
      float a = sb.x * (1.0 - hidden);
      vec3 edge = vec3(0.95, 0.97, 1.0) * 1.6;
      vec3 c2 = col * 0.62 + vec3(0.12, 0.125, 0.15) * (0.6 + 0.6 * min(uFrost, 1.0));
      c2 = mix(c2, c2 * 0.35, sb.w * 0.8);
      c2 = mix(c2, edge, sb.y);
      col = mix(col, c2, a);
    }
  }

  col = mix(uBg + halo, col, cov);
  col = vec3(tone(col.r), tone(col.g), tone(col.b));
  col = pow(clamp(col, 0.0, 1.0), vec3(1.0 / 2.2));
  vec2 gp = floor(fragPx / max(uDpr, 1.0));
  col += (hash13(vec3(gp, uTime)) - 0.5) * (4.0 / 255.0) * uGrain;
  gl_FragColor = vec4(col, 1.0);
}
`;

/**
 * Builds the Ray-Traced Cobalt Sprite Glass Capsule scene (shared by Grid Card 06 & Full Modal).
 */
export function createGlassBotScene(pixelRatio = 1, options = {}) {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const pal0 = SPRITE_PALETTES[0];
  const bgColor = new THREE.Color(pal0.background);

  const uniforms = {
    uViewSize: { value: new THREE.Vector2(640, 480) },
    uCenter: { value: new THREE.Vector2(320, 240) },
    uRadius: { value: 150 },
    uSeamN: { value: new THREE.Vector3(0.516, 0.736, 0.438) },
    uSeamD: { value: ADV.seamOffset / 100 },
    uRi: { value: 1 - ADV.shell / 100 },
    uLip: { value: 1 - ADV.shell / 100 - ADV.lip / 100 },
    uBallC: { value: new THREE.Vector3(0, 0, 0) },
    uBallR: { value: ADV.spriteSize / 100 },
    uRot: { value: new THREE.Matrix3() },
    uEye: {
      value: new THREE.Vector4(
        (ADV.eyeGap / 2) * DEG,
        ((ADV.eyeLength - ADV.eyeWidth) / 2) * DEG,
        (ADV.eyeWidth / 2) * DEG,
        1
      )
    },
    uFace: { value: 1.0 },
    uBall: { value: hexToLinRGB(pal0.spriteColor) },
    uEyeCol: { value: hexToLinRGB(pal0.eyeColor) },
    uBg: { value: hexToLinRGB(pal0.background) },
    uFrost: { value: DEFAULTS.frost / 5 },
    uGloss: { value: ADV.gloss / 100 },
    uGlow: { value: ADV.glow / 100 },
    uGrain: { value: ADV.grain / 100 },
    uLight: { value: new THREE.Vector2(Math.cos(ADV.lightAngle * DEG), Math.sin(ADV.lightAngle * DEG)) },
    uDpr: { value: Math.max(1, pixelRatio) },
    uTime: { value: 0 }
  };

  const geo = new THREE.PlaneGeometry(2, 2);
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERT,
    fragmentShader: FRAG,
    depthTest: false,
    depthWrite: false,
    toneMapping: false
  });
  const quad = new THREE.Mesh(geo, mat);
  scene.add(quad);

  const state = {
    paletteIdx: 0,
    viewW: 640,
    viewH: 480,
    scale: options.isPreview ? 96 : DEFAULTS.scale,
    targetScale: options.isPreview ? 96 : DEFAULTS.scale,
    pointerU: 0.5,
    pointerV: 0.5,
    pointerActive: false,
    pointerDown: false,
    yaw: ADV.restX * DEG,
    pitch: ADV.restY * DEG,
    leanX: 0,
    leanY: 0,
    open: 1,
    squint: 0,
    nextBlink: 1.6,
    blinkT: -1,
    doubleBlink: false,
    clock: 0,
    targetBall: hexToLinRGB(pal0.spriteColor),
    targetEye: hexToLinRGB(pal0.eyeColor),
    targetBg: hexToLinRGB(pal0.background)
  };

  return {
    scene,
    camera,
    getClearColor: () => bgColor,
    setSize(w, h) {
      state.viewW = Math.max(1, w);
      state.viewH = Math.max(1, h);
      uniforms.uViewSize.value.set(state.viewW, state.viewH);
    },
    update(dt) {
      state.clock += dt;
      state.scale += (state.targetScale - state.scale) * Math.min(1, dt * 8);

      const W = state.viewW;
      const H = state.viewH;
      const radius = FIT * (Math.max(15, state.scale) / 100) * Math.min(W, H) * 0.5;
      const fl = DEFAULTS.float / 10;
      const cx = W * 0.5 + Math.sin(state.clock * 0.53) * fl * 0.035 * radius;
      const cy = H * 0.5 + Math.sin(state.clock * 0.8) * fl * 0.07 * radius;

      let tx = ADV.restX * DEG;
      let ty = ADV.restY * DEG;
      let lx = 0;
      let ly = 0;

      if (state.pointerActive) {
        const dx = (state.pointerU * W - cx) / radius;
        const dy = -(state.pointerV * H - cy) / radius;
        const D = 16 / DEFAULTS.reach;
        const lim = ADV.maxTurn * DEG;
        tx = Math.max(-lim, Math.min(lim, Math.atan2(dx, D)));
        ty = Math.max(-lim, Math.min(lim, Math.atan2(dy, Math.hypot(dx, D))));
        const kLean = (DEFAULTS.lean / 10) * 22 * DEG;
        lx = Math.max(-1, Math.min(1, dx / 2.5)) * kLean;
        ly = Math.max(-1, Math.min(1, dy / 2.5)) * kLean;
      } else {
        tx += Math.sin(state.clock * 0.37) * 6 * DEG * fl + Math.sin(state.clock * 0.91) * 2 * DEG * fl;
        ty += Math.sin(state.clock * 0.29 + 1.3) * 4 * DEG * fl;
      }

      lx += Math.sin(state.clock * 0.53) * 3 * DEG * fl;
      ly += Math.sin(state.clock * 0.41 + 0.7) * 2 * DEG * fl;

      const kFollow = 1 - Math.exp(-dt / Math.max(0.005, ADV.followMs / 1000));
      state.yaw += (tx - state.yaw) * kFollow;
      state.pitch += (ty - state.pitch) * kFollow;
      const kGlass = 1 - Math.exp(-dt / 0.35);
      state.leanX += (lx - state.leanX) * kGlass;
      state.leanY += (ly - state.leanY) * kGlass;

      // Natural randomized + occasional double blink
      const bd = Math.max(0.04, ADV.blinkMs / 1000);
      state.nextBlink -= dt;
      if (state.nextBlink <= 0 && state.blinkT < 0) {
        state.blinkT = 0;
        const gap = (11 - DEFAULTS.blink) * (0.5 + Math.random());
        state.doubleBlink = state.doubleBlink ? false : Math.random() < 0.25;
        state.nextBlink = state.doubleBlink ? bd + 0.12 : gap;
      }

      let o = 1;
      if (state.blinkT >= 0) {
        state.blinkT += dt;
        const u = state.blinkT / bd;
        o = u < 0.4 ? 1 - u / 0.4 : Math.min(1, (u - 0.4) / 0.6);
        if (u >= 1) state.blinkT = -1;
      }

      const sqTarget = state.pointerDown ? 1 : 0;
      state.squint += (sqTarget - state.squint) * (1 - Math.exp(-dt / 0.06));
      state.open = Math.min(o, 1 - state.squint * 0.8);

      // Sprite local -> view matrix (column-major in THREE.Matrix3.elements)
      const cp = Math.cos(state.pitch);
      const fx = Math.sin(state.yaw) * cp;
      const fy = Math.sin(state.pitch);
      const fz = Math.cos(state.yaw) * cp;
      const rl = Math.hypot(fz, fx) || 1;
      const rx = fz / rl;
      const rz = -fx / rl;
      const ux = fy * rz;
      const uy = fz * rx - fx * rz;
      const uz = -fy * rx;
      const cr = Math.cos(ADV.roll * DEG);
      const sr = Math.sin(ADV.roll * DEG);

      const m = uniforms.uRot.value.elements;
      m[0] = rx * cr + ux * sr;
      m[1] = uy * sr;
      m[2] = rz * cr + uz * sr;
      m[3] = ux * cr - rx * sr;
      m[4] = uy * cr;
      m[5] = uz * cr - rz * sr;
      m[6] = fx;
      m[7] = fy;
      m[8] = fz;

      // Seam plane leaned toward cursor
      const sa = ADV.seamAngle * DEG;
      const st = ADV.seamTilt * DEG;
      let n = [Math.cos(sa) * Math.sin(st), Math.sin(sa) * Math.sin(st), Math.cos(st)];
      n = rotY(n, state.leanX);
      n = rotX(n, -state.leanY);

      uniforms.uCenter.value.set(cx, H - cy);
      uniforms.uRadius.value = radius;
      uniforms.uSeamN.value.set(n[0], n[1], n[2]);
      uniforms.uBallC.value.set(0, Math.sin(state.clock * 0.8 - 0.9) * fl * 0.045, 0);
      uniforms.uEye.value.w = state.open;
      uniforms.uTime.value = state.clock % 100;

      const cBlend = Math.min(1, dt * 6);
      uniforms.uBall.value.lerp(state.targetBall, cBlend);
      uniforms.uEyeCol.value.lerp(state.targetEye, cBlend);
      uniforms.uBg.value.lerp(state.targetBg, cBlend);
    },
    onPointerDown() {
      state.pointerDown = true;
    },
    onPointerMove(e, canvas) {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const inside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
      if (inside) {
        state.pointerActive = true;
        state.pointerU = (e.clientX - rect.left) / rect.width;
        state.pointerV = (e.clientY - rect.top) / rect.height;
      } else {
        state.pointerActive = false;
      }
    },
    onPointerUp() {
      state.pointerDown = false;
    },
    onPointerLeave() {
      state.pointerActive = false;
      state.pointerDown = false;
    },
    onClick() {
      if (state.blinkT < 0) state.blinkT = 0;
    },
    onWheel(e) {
      state.targetScale = THREE.MathUtils.clamp(state.targetScale - e.deltaY * 0.05, 35, 135);
    },
    cyclePalette() {
      state.paletteIdx = (state.paletteIdx + 1) % SPRITE_PALETTES.length;
      const pal = SPRITE_PALETTES[state.paletteIdx];
      state.targetBall = hexToLinRGB(pal.spriteColor);
      state.targetEye = hexToLinRGB(pal.eyeColor);
      state.targetBg = hexToLinRGB(pal.background);
      bgColor.set(pal.background);
      return pal.name;
    },
    getPaletteName() {
      return SPRITE_PALETTES[state.paletteIdx].name;
    },
    dispose() {
      geo.dispose();
      mat.dispose();
    }
  };
}

export function mountGlassBot(container) {
  return mountSceneIntoContainer(container, createGlassBotScene, {
    cursor: 'pointer',
    canvasClass: 'anim-live-canvas'
  });
}
