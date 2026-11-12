import * as THREE from "three";
import { mountTerraDusk } from "./terra-dusk-vanilla.js";
import { sharedCardStage } from "./shared-card-stage.js";
import { mountTornadoVortex, createTornadoScene } from "./tornado-vortex.js";
import { mountRibbonSphere, createRibbonSphereScene } from "./ribbon-sphere.js";
import { mountRadialPinsphere, createPinsphereScene } from "./radial-pinsphere.js";
import { mountGalaxyRings, createGalaxyRingsScene } from "./galaxy-rings.js";
import { mountStardustVoid, createStardustVoidScene } from "./stardust-void.js";
import { mountGlassBot, createGlassBotScene } from "./glass-bot.js";
import { mountParticleFlower, createParticleFlowerScene } from "./particle-flower.js";
import { mountCircularGallery } from "./circular-gallery.js";
import { mountAccordionStrip, createAccordionStripScene } from "./accordion-strip.js";
import { initVenomButtons } from "./venom-buttons.js";

const canvas = document.querySelector('#space');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.35));
renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor(0x020207, 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;

const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, .1, 100);
camera.position.z = 11;

const COUNT = innerWidth < 760 ? 28000 : 52000;
const orb = new Float32Array(COUNT * 3);
const base = new Float32Array(COUNT * 3);
const vessel = new Float32Array(COUNT * 3);
const wave = new Float32Array(COUNT * 3);
const tunnel = new Float32Array(COUNT * 3);
const bloom = new Float32Array(COUNT * 3);
const seed = new Float32Array(COUNT);
const hue = new Float32Array(COUNT);
const ringMask = new Float32Array(COUNT);

const fract = x => x - Math.floor(x);
const hash = n => fract(Math.sin(n * 127.1) * 43758.5453);
const clamp01 = x => Math.max(0, Math.min(1, x));
const lerpArr = (a, t) => {
  const i = Math.max(0, Math.min(a.length - 2, Math.floor(t)));
  const f = t - i;
  return a[i] + (a[i + 1] - a[i]) * f;
};

for (let i = 0; i < COUNT; i++) {
  const j = i * 3, u = hash(i * 1.13), v = hash(i * 2.71 + 5), q = hash(i * 7.19 + 2), a = u * Math.PI * 2;
  // Initial stellar circle
  const orbR = 3.72 + (v - .5) * .22;
  orb[j] = orbR * Math.cos(a); orb[j + 1] = orbR * Math.sin(a); orb[j + 2] = (q - .5) * .16;
  // Event horizon accretion disc
  let r = 1.1 + Math.pow(v, 1.65) * 5.6;
  let lift = (q - .5) * (.045 + r * .023) + Math.sin(a * 2.0) * .11 / (r * r);
  base[j] = Math.cos(a) * r; base[j + 1] = lift; base[j + 2] = Math.sin(a) * r * .42;
  // Quantum vessel hourglass
  const yy = (v - .5) * 8.2, n = (yy + 4.1) / 8.2, pinch = Math.abs(n - .5) * 2;
  const funnel = .34 + Math.pow(1. - n, 1.15) * 3.9 + Math.pow(pinch, 1.8) * .55;
  const aa = a + yy * .88 + q * .7;
  vessel[j] = Math.cos(aa) * funnel * (.78 + q * .25); vessel[j + 1] = yy - .35; vessel[j + 2] = Math.sin(aa) * funnel * (.78 + q * .25);
  // Process nebula
  const nr = 1.1 + Math.pow(v, .72) * 5.8, na = a + Math.sin(q * 6.283) * .55 + nr * .18, arm = Math.sin(na * 3.0 + q * 5.4) * .58;
  wave[j] = Math.cos(na) * nr; wave[j + 1] = (q - .5) * 2.9 + Math.sin(nr * 1.3 + a) * .38; wave[j + 2] = Math.sin(na) * nr * .72 + arm;
  // Education tunnel
  const tr = .42 + Math.pow(v, 1.55) * 4.2, ta = a + v * 10.8 + q * 1.8, tz = (q - .5) * 18.5 - 4.5 + Math.sin(v * 9.0) * .7;
  tunnel[j] = Math.cos(ta) * tr; tunnel[j + 1] = Math.sin(ta) * tr * .76; tunnel[j + 2] = tz;
  // Celestial bloom
  const br = Math.pow(v, .8) * 6.6, phi = Math.acos(2 * q - 1), th = a + v * 3.2;
  bloom[j] = br * Math.sin(phi) * Math.cos(th); bloom[j + 1] = br * Math.cos(phi) * .72; bloom[j + 2] = br * Math.sin(phi) * Math.sin(th) * .78;
  seed[i] = q; hue[i] = v; ringMask[i] = Math.pow(1. - Math.abs(v - .42) * 1.8, 3.2);
}

const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.BufferAttribute(orb, 3));
geo.setAttribute('aHorizon', new THREE.BufferAttribute(base, 3));
geo.setAttribute('aVessel', new THREE.BufferAttribute(vessel, 3));
geo.setAttribute('aWave', new THREE.BufferAttribute(wave, 3));
geo.setAttribute('aTunnel', new THREE.BufferAttribute(tunnel, 3));
geo.setAttribute('aBloom', new THREE.BufferAttribute(bloom, 3));
geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
geo.setAttribute('aHue', new THREE.BufferAttribute(hue, 1));
geo.setAttribute('aRing', new THREE.BufferAttribute(ringMask, 1));

const uniforms = {
  uTime: { value: 0 },
  uMorph: { value: 0 },
  uSection: { value: 0 },
  uMouse: { value: new THREE.Vector2() },
  uForce: { value: 0 }
};

const vertex = `uniform float uTime,uMorph,uForce;uniform vec2 uMouse;attribute vec3 aHorizon,aVessel,aWave,aTunnel,aBloom;attribute float aSeed,aHue,aRing;varying float vSeed,vHue,vRing,vEnergy,vAlpha,vSide,vTunnel;
float ease(float x){return x*x*(3.0-2.0*x);}vec3 form(){float m=clamp(uMorph,0.0,5.0),f=ease(fract(m));if(m<1.0){float stagger=clamp((f-aSeed*.28)/.72,0.0,1.0);vec3 p=mix(position,aHorizon,ease(stagger));float infall=sin(3.14159*f)*step(aSeed,.16);p*=1.0-infall*.64;float spin=f*(1.2+aSeed*4.0);float c=cos(spin),s=sin(spin);p.xz=mat2(c,-s,s,c)*p.xz;return p;}if(m<2.0)return mix(aHorizon,aVessel,f);if(m<3.0)return mix(aVessel,aWave,f);if(m<4.0)return mix(aWave,aTunnel,f);return mix(aTunnel,aBloom,clamp(m-4.0,0.0,1.0));}void main(){vec3 p=form();float tunnelRush=smoothstep(3.05,4.35,uMorph);p.z=mix(p.z,mod(p.z+14.0+uTime*(2.4+aSeed*2.2),20.0)-14.0,tunnelRush);float pulse=sin(uTime*(.45+aSeed*.3)+aSeed*20.0)*mix(.018,.038,tunnelRush);p*=1.0+pulse;float rot=uTime*mix(.022,.13,tunnelRush)+p.y*.01;float c=cos(rot),s=sin(rot);p.xz=mat2(c,-s,s,c)*p.xz;vec2 d=p.xy-uMouse*3.;float rep=uForce/(.7+dot(d,d));p.xy+=normalize(d+vec2(.001))*rep*.46;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;float zDist=max(.1,-mv.z);float dotSize=(.42+aSeed*.38)*(24./zDist),fieldSize=(.68+aSeed*1.3)*(37./zDist),tunnelSize=(.42+aSeed*.95)*(28./zDist);gl_PointSize=min(mix(mix(dotSize,fieldSize,smoothstep(.12,.62,uMorph)),tunnelSize,tunnelRush),mix(6.8,4.6,tunnelRush));vSeed=aSeed;vHue=aHue;vRing=aRing;vSide=clamp(p.x/8.+.5,0.,1.);vEnergy=pow(1.-min(1.,length(p.xy)/7.),2.);vTunnel=tunnelRush;vAlpha=clamp(1.-(zDist-5.)/14.,.25,1.);}`;

const fragment = `uniform float uTime,uSection,uMorph;varying float vSeed,vHue,vRing,vEnergy,vAlpha,vSide,vTunnel;vec3 spectrum(float h){return .5+.5*cos(6.28318*(vec3(h)+vec3(0.,.667,.333)));}void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;float dot=smoothstep(.5,.485,d);vec3 warm=vec3(1.,.055,.018),pink=vec3(1.,.18,.62),cool=vec3(.015,.34,1.);vec3 energy=vSide<.5?mix(warm,pink,vSide*2.):mix(pink,cool,(vSide-.5)*2.);vec3 nebula=mix(vec3(.04,.72,1.),vec3(1.,.18,.82),sin(vHue*18.85+uTime*.18)*.5+.5);vec3 tunnelCol=mix(spectrum(vHue),vec3(1.,.8,.38),vEnergy*.72);vec3 col=mix(energy,nebula,smoothstep(2.05,3.18,uMorph));col=mix(col,tunnelCol,smoothstep(3.18,4.15,uMorph));col=mix(col,vec3(.86,.68,1.),smoothstep(4.25,5.0,uMorph)*.34);col=mix(col,vec3(1.),vEnergy*.16);float population=mix(vRing,1.,smoothstep(.08,.62,uMorph));float a=dot*(.62+vSeed*.38)*vAlpha*population*(1.0+vTunnel*.25);gl_FragColor=vec4(col,a);}`;

const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: vertex, fragmentShader: fragment, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
const particles = new THREE.Points(geo, mat);
particles.position.x = 0;
particles.rotation.x = -.14;
scene.add(particles);

// Plasma ribbons
const RIBBONS = 42, RSEG = 180, ribbonPos = new Float32Array(RIBBONS * RSEG * 2 * 3), ribbonBand = new Float32Array(RIBBONS * RSEG * 2);
let rp = 0, rb = 0;
for (let s = 0; s < RIBBONS; s++) {
  const band = s / (RIBBONS - 1);
  for (let k = 0; k < RSEG; k++) {
    for (let end = 0; end < 2; end++) {
      const a = (k + end) / RSEG * Math.PI * 2, r = 3.52 + (band - .5) * .62;
      ribbonPos[rp++] = Math.cos(a) * r; ribbonPos[rp++] = Math.sin(a) * r; ribbonPos[rp++] = (band - .5) * .18;
      ribbonBand[rb++] = band;
    }
  }
}
const ribbonGeo = new THREE.BufferGeometry();
ribbonGeo.setAttribute('position', new THREE.BufferAttribute(ribbonPos, 3));
ribbonGeo.setAttribute('aBand', new THREE.BufferAttribute(ribbonBand, 1));
const ribbonMat = new THREE.ShaderMaterial({
  uniforms: { uTime: uniforms.uTime, uMorph: uniforms.uMorph },
  vertexShader: `uniform float uTime,uMorph;attribute float aBand;varying float vSide,vBand,vFade;void main(){vec3 p=position;float a=atan(p.y,p.x),w=sin(a*3.+uTime*.62+aBand*18.)*.072+sin(a*8.-uTime*.43+aBand*31.)*.028;p.xy*=1.+w/3.6;p.z+=sin(a*5.+uTime*.38+aBand*15.)*.055;vSide=clamp(p.x/7.4+.5,0.,1.);vBand=aBand;vFade=1.-smoothstep(.05,.72,uMorph);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
  fragmentShader: `varying float vSide,vBand,vFade;void main(){vec3 warm=vec3(1.,.045,.012),pink=vec3(1.,.18,.64),cool=vec3(.015,.38,1.);vec3 col=vSide<.5?mix(warm,pink,vSide*2.):mix(pink,cool,(vSide-.5)*2.);float pulse=.34+.66*pow(sin(vBand*34.)*.5+.5,2.);gl_FragColor=vec4(col,vFade*(.08+pulse*.18));}`,
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
});
const ribbons = new THREE.LineSegments(ribbonGeo, ribbonMat);
ribbons.position.x = 0;
scene.add(ribbons);

// Layered core with dual additive auras
const core = new THREE.Mesh(new THREE.SphereGeometry(.01, 8, 8), new THREE.MeshBasicMaterial({ visible: false }));
core.position.set(0, 0, 0);
scene.add(core);

function aura(size, color, opacity) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d'), g = x.createRadialGradient(128, 128, 30, 128, 128, 128);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(.42, color.replace('A', String(opacity)));
  g.addColorStop(.65, color.replace('A', String(opacity * .38)));
  g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 256, 256);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  sp.position.set(0, 0, .15);
  sp.scale.set(size, size, 1);
  scene.add(sp);
  return sp;
}
const auraBlue = aura(3.1, 'rgba(52,94,255,A)', .68);
const auraPink = aura(3.8, 'rgba(238,51,195,A)', .28);

// Deep background stars
const SC = innerWidth < 760 ? 2592 : 5184, starPos = new Float32Array(SC * 3), starSeed = new Float32Array(SC), starHue = new Float32Array(SC);
for (let i = 0; i < SC; i++) {
  const j = i * 3, r = 14 + hash(i + 9) * 30, a = hash(i * 3) * 6.283, p = Math.acos(2 * hash(i * 8) - 1);
  starPos[j] = r * Math.sin(p) * Math.cos(a); starPos[j + 1] = r * Math.cos(p); starPos[j + 2] = r * Math.sin(p) * Math.sin(a);
  starSeed[i] = hash(i * 13); starHue[i] = (i % 12) / 12;
}
const sg = new THREE.BufferGeometry();
sg.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
sg.setAttribute('aSeed', new THREE.BufferAttribute(starSeed, 1));
sg.setAttribute('aHue', new THREE.BufferAttribute(starHue, 1));
const sm = new THREE.ShaderMaterial({
  uniforms: { uTime: uniforms.uTime },
  vertexShader: `attribute float aSeed,aHue;varying float a,h;uniform float uTime;void main(){a=aSeed*(.72+.28*sin(uTime*.7+aSeed*30.));h=aHue;vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;gl_PointSize=(.42+aSeed*.85)*(23./max(.1,-mv.z));}`,
  fragmentShader: `varying float a,h;vec3 spectrum(float v){return .5+.5*cos(6.28318*(vec3(v)+vec3(0.,.667,.333)));}void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;float edge=smoothstep(.5,.485,d);gl_FragColor=vec4(spectrum(h),edge*(.3+a*.7));}`,
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
});
const stars = new THREE.Points(sg, sm);
scene.add(stars);

const labels = ['STELLAR BODY', 'INTELLIGENCE INTERFACE', 'PROJECT VORTEX', 'TECHNICAL ARSENAL', 'CREDENTIAL TUNNEL', 'CELESTIAL BLOOM'];
const formLabel = document.querySelector('#form'), density = document.querySelector('#density');
let sectionTarget = 0, sectionSmooth = 0, morphTarget = 0, morphSmooth = 0, mouse = { x: 0, y: 0 }, smooth = { x: 0, y: 0 }, force = 0, activeProject = -1;

const homeSection = document.querySelector('#home');
const aboutSection = document.querySelector('#about');
const projectSection = document.querySelector('#projects');
const skillsSection = document.querySelector('#skills');
const credentialsSection = document.querySelector('#credentials');
const contactSection = document.querySelector('#contact');
const steps = [...document.querySelectorAll('.project-step')];
const timelineProgress = document.querySelector('#timeline-progress');
const projectCurrent = document.querySelector('#project-current');
const navLinks = [...document.querySelectorAll('.orbit-nav .nav-icon')];

function updateScrollState() {
  const sY = window.scrollY;
  const homeTop = homeSection ? homeSection.offsetTop : 0;
  const aboutTop = aboutSection ? aboutSection.offsetTop : 900;
  const projTop = projectSection ? projectSection.offsetTop : 1800;
  const skillsTop = skillsSection ? skillsSection.offsetTop : 3000;
  const credTop = credentialsSection ? credentialsSection.offsetTop : 4200;
  const conTop = contactSection ? contactSection.offsetTop : 5400;

  const focus = sY + innerHeight * 0.45;

  if (focus >= conTop - 60) {
    sectionTarget = 4;
  } else if (focus >= credTop - 60) {
    sectionTarget = 3;
  } else if (focus >= skillsTop - 60) {
    sectionTarget = 2;
  } else if (focus >= projTop - 60) {
    sectionTarget = 1;
  } else {
    sectionTarget = 0;
  }

  // Smooth continuous morph progression
  if (sY < aboutTop) {
    morphTarget = clamp01(sY / Math.max(1, aboutTop));
  } else if (sY < projTop) {
    morphTarget = 1 + clamp01((sY - aboutTop) / Math.max(1, projTop - aboutTop));
  } else if (sY < skillsTop) {
    morphTarget = 2 + clamp01((sY - projTop) / Math.max(1, skillsTop - projTop));
  } else if (sY < credTop) {
    morphTarget = 3 + clamp01((sY - skillsTop) / Math.max(1, credTop - skillsTop));
  } else {
    morphTarget = 4 + clamp01((sY - credTop) / Math.max(1, conTop - credTop));
  }

  document.body.classList.toggle('hero-collapsing', morphTarget > 0.12);

  // Active project steps in projects section
  if (projectSection) {
    const start = projTop + innerHeight * 0.2;
    const end = skillsTop - innerHeight * 0.4;
    const p = clamp01((sY - start) / Math.max(1, end - start));
    const next = Math.max(0, Math.min(3, Math.floor(p * 4)));
    if (next !== activeProject) {
      activeProject = next;
      steps.forEach((el, i) => el.classList.toggle('active', i === next));
      if (projectCurrent) projectCurrent.textContent = String(next + 1).padStart(2, '0');
    }
    if (timelineProgress) timelineProgress.style.height = (p * 100) + '%';
    const oR = innerWidth < 760 ? 130 : 340;
    steps.forEach((el, i) => {
      const a = ((i / 4) - p) * Math.PI * 2;
      const x = Math.sin(a) * oR, z = Math.cos(a), nz = (z + 1) / 2, sc = 0.5 + nz * 0.5;
      el.style.transform = `translate(-50%,-50%) translate3d(${x.toFixed(1)}px,${(z * -25).toFixed(1)}px,0) scale(${sc.toFixed(3)})`;
      el.style.opacity = (0.06 + nz * 0.94).toFixed(2);
      el.style.zIndex = Math.round(nz * 10);
    });
  }

  // Nav link active highlight
  const ids = ['home', 'projects', 'skills', 'credentials', 'contact'];
  const curId = ids[sectionTarget] || 'home';
  navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + curId));
  document.body.dataset.section = curId;

  // Trigger skill bars animation when entering skills section
  if (sectionTarget === 2) {
    document.querySelectorAll('.skill-bar-fill').forEach(bar => {
      const width = bar.dataset.progress || '80%';
      bar.style.width = width;
    });
  }
}

addEventListener('scroll', updateScrollState, { passive: true });
updateScrollState();

addEventListener('pointermove', e => {
  mouse.x = e.clientX / innerWidth * 2 - 1;
  mouse.y = -(e.clientY / innerHeight * 2 - 1);
  force = Math.min(1, force + (sectionTarget === 0 ? .14 : .05));
  const cur = document.querySelector('.cursor');
  if (cur) cur.style.transform = `translate3d(${e.clientX}px,${e.clientY}px,0) translate(-50%,-50%)`;
}, { passive: true });

document.querySelectorAll('a, button').forEach(x => {
  x.addEventListener('pointerenter', () => { const c = document.querySelector('.cursor'); if (c) c.classList.add('over'); });
  x.addEventListener('pointerleave', () => { const c = document.querySelector('.cursor'); if (c) c.classList.remove('over'); });
});

function frame(ms) {
  const t = ms * .001;
  sectionSmooth += (sectionTarget - sectionSmooth) * .021;
  morphSmooth += (morphTarget - morphSmooth) * .027;
  smooth.x += (mouse.x - smooth.x) * .065;
  smooth.y += (mouse.y - smooth.y) * .065;
  force *= .93;

  uniforms.uTime.value = t;
  uniforms.uMorph.value = morphSmooth;
  uniforms.uSection.value = sectionSmooth;
  uniforms.uMouse.value.set(smooth.x, smooth.y);
  uniforms.uForce.value = force * (1 - sectionSmooth * .12);

  const formIndex = Math.max(0, Math.min(5, Math.round(morphSmooth))), s = Math.max(0, Math.min(4, sectionSmooth)), tunnelView = clamp01((morphSmooth - 3.08) / 1.05);
  if (formLabel) formLabel.textContent = labels[formIndex];
  if (density) density.textContent = (.79 + Math.sin(t * .4) * .14 + force * .09 + tunnelView * .08).toFixed(3);

  camera.position.x = smooth.x * .19;
  camera.position.y = smooth.y * .14 + lerpArr([0, 0, .62, .08, 0], s);
  camera.position.z = 11 - tunnelView * 2.2 + lerpArr([0, 0, .35, 0, 0], s);
  camera.lookAt(smooth.x * .12, lerpArr([0, 0, -.5, 0, 0], s), -tunnelView * 4.0);

  const targetX = clamp01(1 - sectionSmooth) * 2.25 * clamp01(morphSmooth);
  particles.position.x += (targetX - particles.position.x) * .028;
  particles.position.y += (lerpArr([0, -.1, -1.35, 0, 0], s) - particles.position.y) * .028;
  particles.rotation.y = t * lerpArr([.014, .26, .045, .18, .014], s) + tunnelView * .28;
  particles.rotation.z = lerpArr([0, -.06, 0, 0, 0], s) + tunnelView * .05;
  particles.rotation.x += ((-0.14 + lerpArr([0, .12, .2, 0, 0], s) + tunnelView * .24) - particles.rotation.x) * .028;

  ribbons.position.x = particles.position.x;
  ribbons.position.y = particles.position.y;
  ribbons.rotation.z = t * .018 + smooth.x * .018;
  ribbons.rotation.x = smooth.y * .025;

  const targetScale = lerpArr([1, 1.09, 1.28, 1.34, .98], s);
  const scaleNow = particles.scale.x + (targetScale - particles.scale.x) * .028;
  particles.scale.setScalar(scaleNow);

  stars.rotation.y = t * .0025 + tunnelView * .12;
  stars.rotation.x = tunnelView * .04;
  auraBlue.material.rotation = t * .035;
  auraPink.material.rotation = -t * .022;

  const horizon = Math.max(0, 1 - Math.abs(morphSmooth - 1) * 1.35);
  const tunnelCore = clamp01((morphSmooth - 3.28) / .7) * (1 - clamp01((morphSmooth - 4.72) / .32));
  const glow = Math.max(horizon, tunnelCore * .62);
  core.visible = false;
  auraBlue.visible = auraPink.visible = glow > .02;
  core.position.x = auraBlue.position.x = auraPink.position.x = particles.position.x;
  core.position.y = auraBlue.position.y = auraPink.position.y = particles.position.y;
  core.scale.x = core.scale.y = .35 + horizon * .65 + tunnelCore * .3;
  core.scale.z = .58 + tunnelCore * .45;
  auraBlue.material.opacity = glow;
  auraPink.material.opacity = glow * .82;

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.35));
  renderer.setSize(innerWidth, innerHeight);
});

// Magnetic button hover effect
document.querySelectorAll('.magnetic').forEach(el => {
  el.addEventListener('pointermove', e => {
    const r = el.getBoundingClientRect();
    el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .07}px,${(e.clientY - r.top - r.height / 2) * .09}px)`;
  });
  el.addEventListener('pointerleave', () => el.style.transform = '');
});

// Sound toggle
const sound = document.querySelector('.sound');
let audioCtx, gainNode;
if (sound) {
  sound.addEventListener('click', () => {
    const on = sound.classList.toggle('active');
    sound.setAttribute('aria-pressed', on);
    const label = sound.querySelector('b');
    if (label) label.textContent = on ? 'SOUND ON' : 'SOUND OFF';
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      gainNode = audioCtx.createGain();
      gainNode.gain.value = 0;
      gainNode.connect(audioCtx.destination);
      [43.65, 65.41, 87.31].forEach((f, i) => {
        const o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type = i === 1 ? 'triangle' : 'sine';
        o.frequency.value = f;
        g.gain.value = .012 / (i + 1);
        o.connect(g).connect(gainNode);
        o.start();
      });
    }
    audioCtx.resume();
    gainNode.gain.setTargetAtTime(on ? 1 : 0, audioCtx.currentTime, 1.5);
  });
}

// Preloader dismissal
setTimeout(() => {
  const loader = document.querySelector('.loader');
  if (loader) loader.classList.add('done');
}, 1350);

// Smooth scrolling anchors
function scrollToSection(id) {
  const target = document.getElementById(id);
  if (!target) return;
  const top = target.getBoundingClientRect().top + window.scrollY;
  window.scrollTo({ top, behavior: 'smooth' });
}

function honorAnchor() {
  if (!location.hash) return;
  const id = decodeURIComponent(location.hash.slice(1));
  scrollToSection(id);
}
addEventListener('hashchange', honorAnchor);
if (location.hash) setTimeout(honorAnchor, 1000);

document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
  const href = a.getAttribute('href');
  if (!href || href === '#') return;
  const id = href.slice(1);
  const target = document.getElementById(id);
  if (target) {
    e.preventDefault();
    history.pushState(null, '', '#' + id);
    scrollToSection(id);
  }
}));

// Half-oval arc bottom navigation
const navOrb = document.querySelector('.nav-orb'), navEl = document.querySelector('.orbit-nav');
!function updateArcNav() {
  if (navEl) {
    const w = navEl.offsetWidth, h = navEl.offsetHeight, cx = w / 2, cy = h, rx = w * .39, ry = h * .58, s = sectionSmooth;
    navLinks.forEach((icon, i) => {
      const ad = 152 - i * 31, ar = ad * Math.PI / 180, x = cx + rx * Math.cos(ar), y = cy - ry * Math.sin(ar);
      icon.style.transform = `translate(-50%,-50%) translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
      icon.style.opacity = '1';
      icon.style.pointerEvents = 'auto';
      const diff = Math.abs(i - s), svg = icon.querySelector('svg');
      if (svg) svg.style.transform = diff < .6 ? `scale(${(1 + (.6 - diff) * .22).toFixed(2)})` : 'scale(1)';
    });
    if (navOrb) {
      const orbAd = 152 - s * 31, orbAr = orbAd * Math.PI / 180, ox = cx + rx * Math.cos(orbAr), oy = cy - ry * Math.sin(orbAr);
      navOrb.style.transform = `translate(-50%,-50%) translate(${ox.toFixed(1)}px,${oy.toFixed(1)}px)`;
    }
  }
  requestAnimationFrame(updateArcNav);
}();

// Animated Typewriter effect for Hero
const roles = ['AI Developer', 'Software Engineer', 'Full Stack AI Builder', 'RAG Specialist'];
let roleIdx = 0, charIdx = 0, isDeleting = false;
const typeEl = document.querySelector('.typewriter-prefix');
function typeStep() {
  if (!typeEl) return;
  const curRole = roles[roleIdx];
  if (isDeleting) {
    charIdx--;
    typeEl.textContent = curRole.substring(0, charIdx);
    if (charIdx <= 0) {
      isDeleting = false;
      roleIdx = (roleIdx + 1) % roles.length;
      setTimeout(typeStep, 450);
      return;
    }
    setTimeout(typeStep, 45);
  } else {
    charIdx++;
    typeEl.textContent = curRole.substring(0, charIdx);
    if (charIdx === curRole.length) {
      isDeleting = true;
      setTimeout(typeStep, 2200);
      return;
    }
    setTimeout(typeStep, 80);
  }
}
setTimeout(typeStep, 1500);

// Interactive Contact Form handler
const contactForm = document.querySelector('#contact-form');
if (contactForm) {
  contactForm.addEventListener('submit', e => {
    e.preventDefault();
    const btn = contactForm.querySelector('button[type="submit"]');
    const orig = btn.innerHTML;
    btn.innerHTML = '<span>Message Sent! ✓</span>';
    btn.style.background = '#22c55e';
    setTimeout(() => {
      contactForm.reset();
      btn.innerHTML = orig;
      btn.style.background = '';
    }, 3000);
  });
}

// ==========================================
// 3D Animations 18-Box Modal Viewer Framework
// ==========================================
const animModal = document.querySelector('#anim-modal');
const animModalBackdrop = document.querySelector('#anim-modal-backdrop');
const animModalClose = document.querySelector('#anim-modal-close');
const modalAnimTitle = document.querySelector('#modal-anim-title');
const modalAnimBadge = document.querySelector('#modal-anim-badge');
const modalCodeFilename = document.querySelector('#modal-code-filename');
const modalCodeBlock = document.querySelector('#modal-code-block');
const modalCodeCopy = document.querySelector('#modal-code-copy');
const copyBtnText = document.querySelector('#copy-btn-text');
const animStageMount = document.querySelector('#anim-stage-mount');

let activeModalCleanup = null;

function clearActiveModalStage() {
  if (activeModalCleanup) {
    activeModalCleanup();
    activeModalCleanup = null;
  }
  if (animStageMount) {
    animStageMount.classList.remove('is-live');
  }
}

const EARTH_ATMOS_PALETTES = [
  { name: 'ORBITAL / BLUE', atmosphere: '#4F9BFF', clouds: 5, lights: 5 },
  { name: 'SOLAR / DUSK', atmosphere: '#FF7B47', clouds: 5.5, lights: 7.2 },
  { name: 'AURORA / EMERALD', atmosphere: '#34D399', clouds: 4.5, lights: 6.5 },
  { name: 'NEBULA / VIOLET', atmosphere: '#A855F7', clouds: 5, lights: 7.5 }
];

function mountEarthStage(container) {
  let idx = 0;
  const look = { ...EARTH_ATMOS_PALETTES[0] };
  const cleanup = mountTerraDusk(container, {
    background: '#02040A',
    stars: 5,
    size: 520,
    drag: true,
    hover: 6.8,
    sun: 'cursor',
    daylight: 87,
    speed: 9.4,
    look
  });
  return {
    getPaletteName: () => EARTH_ATMOS_PALETTES[idx].name,
    cyclePalette: () => {
      idx = (idx + 1) % EARTH_ATMOS_PALETTES.length;
      const p = EARTH_ATMOS_PALETTES[idx];
      look.atmosphere = p.atmosphere;
      look.clouds = p.clouds;
      look.lights = p.lights;
      return p.name;
    },
    destroy: () => {
      cleanup?.();
      container.style.cursor = '';
      container.style.background = '';
    }
  };
}

const LIVE_ANIMATIONS = {
  '1': {
    badge: 'THREE.JS / 01',
    filename: 'tornado-vortex.js',
    hint: 'MOVE TO TILT · CLICK FOR SHOCKWAVE · SCROLL TO ZOOM',
    mount: mountTornadoVortex,
    createScene: createTornadoScene
  },
  '2': {
    badge: 'THREE.JS / 02',
    filename: 'ribbon-sphere.js',
    hint: 'DRAG TO ORBIT · SCROLL TO ZOOM',
    mount: mountRibbonSphere,
    createScene: createRibbonSphereScene
  },
  '3': {
    badge: 'THREE.JS / 03',
    filename: 'radial-pinsphere.js',
    hint: 'MOVE TO PART RAYS · DRAG TO ORBIT · CLICK TO PULSE · SCROLL TO ZOOM',
    mount: mountRadialPinsphere,
    createScene: createPinsphereScene
  },
  '4': {
    badge: 'THREE.JS / 04',
    filename: 'galaxy-rings.js',
    hint: 'DRAG TO TILT · CLICK FOR RIPPLE · SCROLL TO ZOOM',
    mount: mountGalaxyRings,
    createScene: createGalaxyRingsScene
  },
  '5': {
    badge: 'THREE.JS / 05',
    filename: 'stardust-void.js',
    hint: 'MOVE TO REPEL · CLICK FOR SHOCKWAVE · DRAG TO ORBIT · SCROLL TO ZOOM',
    mount: mountStardustVoid,
    createScene: createStardustVoidScene
  },
  '6': {
    badge: 'THREE.JS / 06',
    filename: 'glass-bot.js',
    hint: 'MOVE TO LOOK · CLICK TO BLINK · SCROLL TO ZOOM',
    mount: mountGlassBot,
    createScene: createGlassBotScene
  },
  '7': {
    badge: 'THREE.JS / 07',
    filename: 'particle-flower.js',
    hint: 'HOVER TO BLOOM & BRUSH PETALS · LEAVE TO FOLD BUD · SCROLL TO ZOOM',
    mount: mountParticleFlower,
    createScene: createParticleFlowerScene
  },
  '8': {
    badge: 'CSS 3D / 08',
    filename: 'circular-gallery.js',
    hint: 'SCROLL TO FLY IN & SPIN · HOVER TO FLIP & TILT · TOUCH SWIPE',
    mount: el => mountCircularGallery(el, { isPreview: false }),
    mountPreview: el => mountCircularGallery(el, { isPreview: true })
  },
  '9': {
    badge: 'THREE.JS / 09',
    filename: 'accordion-strip.js',
    hint: 'HOVER OR CLICK SLICE TO EXPAND · SCROLL TO ZOOM',
    mount: mountAccordionStrip,
    createScene: createAccordionStripScene
  },
  '10': {
    badge: 'WEBGL / 10',
    filename: 'terra-dusk-vanilla.js',
    hint: 'DRAG TO SPIN GLOBE · HOVER TO SWEEP SUNLIGHT',
    mount: mountEarthStage,
    mountPreview: el => mountTerraDusk(el, {
      background: '#000000',
      stars: 3,
      size: 'auto',
      drag: false,
      hover: 6.8,
      sun: 'cursor',
      daylight: 87,
      speed: 9.4
    })
  }
};

// Mount live card previews across all implemented boxes
Object.entries(LIVE_ANIMATIONS).forEach(([id, spec]) => {
  const el = document.querySelector(`#anim-card-preview-${id}`);
  if (!el) return;
  if (spec.mountPreview) {
    spec.mountPreview(el);
  } else if (spec.createScene) {
    sharedCardStage.register(el, spec.createScene);
  }
});

const sourceCodeCache = new Map();
let openModalSeq = 0;

function openAnimModal(box) {
  if (!animModal) return;
  clearActiveModalStage();
  const seq = ++openModalSeq;

  const id = box.dataset.animId || '1';
  const num = String(id).padStart(2, '0');
  const title = box.dataset.title || `Animation ${num}`;
  const spec = LIVE_ANIMATIONS[id];

  if (modalAnimTitle) modalAnimTitle.textContent = title;
  if (modalAnimBadge) modalAnimBadge.textContent = spec ? spec.badge : `EXP / ${num}`;
  if (modalCodeFilename) modalCodeFilename.textContent = spec ? spec.filename : `animation_${num}.js`;

  if (spec && animStageMount) {
    animStageMount.classList.add('is-live');

    const hud = document.createElement('div');
    hud.className = 'tornado-stage-hud';
    const hint = document.createElement('span');
    hint.className = 'tornado-hud-hint';
    hint.textContent = spec.hint;
    const paletteBtn = document.createElement('button');
    paletteBtn.type = 'button';
    paletteBtn.className = 'tornado-palette-btn';
    hud.append(hint, paletteBtn);
    animStageMount.appendChild(hud);

    const instance = spec.mount(animStageMount);
    if (instance) {
      paletteBtn.textContent = `COLORS: ${instance.getPaletteName()}`;
      paletteBtn.addEventListener('click', e => {
        e.stopPropagation();
        const modeName = instance.cyclePalette();
        paletteBtn.textContent = `COLORS: ${modeName}`;
      });
    }

    activeModalCleanup = () => {
      if (instance) instance.destroy();
      hud.remove();
    };
  }

  if (modalCodeBlock) {
    if (spec) {
      const cached = sourceCodeCache.get(spec.filename);
      if (cached) {
        modalCodeBlock.textContent = cached;
      } else {
        modalCodeBlock.textContent = `// Loading ${spec.filename}...`;
        fetch(`./${spec.filename}`)
          .then(res => (res.ok ? res.text() : Promise.reject(new Error(`HTTP ${res.status}`))))
          .then(src => {
            sourceCodeCache.set(spec.filename, src);
            if (seq === openModalSeq) {
              modalCodeBlock.textContent = src;
            }
          })
          .catch(() => {
            if (seq === openModalSeq) {
              modalCodeBlock.textContent = `// Unable to load ${spec.filename}`;
            }
          });
      }
    } else {
      modalCodeBlock.textContent = `// ==========================================
// 3D Animation: ${title}
// File: animation_${num}.js
// ==========================================
// Placeholder framework ready for your 3D animation code.

import * as THREE from 'three';

// 1. Scene & Camera Setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 7);

// 2. WebGL Renderer
const stage = document.getElementById('anim-stage-mount');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(stage ? stage.clientWidth : 600, stage ? stage.clientHeight : 400);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// 3. Geometry & Material Pipeline
const geometry = new THREE.IcosahedronGeometry(2.4, 2);
const material = new THREE.MeshStandardMaterial({
  color: 0x38bdf8,
  wireframe: true,
  roughness: 0.25,
  metalness: 0.85
});
const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

// 4. Lighting Rig
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
const pointLight = new THREE.PointLight(0xa855f7, 2.5, 40);
pointLight.position.set(8, 8, 8);
scene.add(ambientLight, pointLight);

// 5. Animation Loop
function animate(time) {
  requestAnimationFrame(animate);
  mesh.rotation.x = time * 0.0006;
  mesh.rotation.y = time * 0.001;
  renderer.render(scene, camera);
}
requestAnimationFrame(animate);`;
    }
  }

  animModal.classList.add('active');
  animModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeAnimModal() {
  if (!animModal) return;
  clearActiveModalStage();
  animModal.classList.remove('active');
  animModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

document.querySelectorAll('.anim-box').forEach(box => {
  box.addEventListener('click', () => openAnimModal(box));
  box.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openAnimModal(box);
    }
  });
});

if (animModalClose) animModalClose.addEventListener('click', closeAnimModal);
if (animModalBackdrop) animModalBackdrop.addEventListener('click', closeAnimModal);

window.addEventListener('keydown', e => {
  if (e.key === 'Escape' && animModal && animModal.classList.contains('active')) {
    closeAnimModal();
  }
});

if (modalCodeCopy && modalCodeBlock) {
  modalCodeCopy.addEventListener('click', () => {
    navigator.clipboard.writeText(modalCodeBlock.textContent).then(() => {
      if (copyBtnText) copyBtnText.textContent = 'Copied! ✓';
      setTimeout(() => {
        if (copyBtnText) copyBtnText.textContent = 'Copy Code';
      }, 2000);
    });
  });
}

// ==========================================
// Mount Authentic Terra Dusk WebGL Globe in Hero Center
// ==========================================
const heroTerraEl = document.querySelector('#hero-terra-wrap');
if (heroTerraEl) {
  mountTerraDusk(heroTerraEl, {
    background: 'transparent',
    stars: 0,
    size: 'auto',
    drag: true,
    hover: 6.8,
    sun: 'cursor',
    daylight: 87,
    speed: 9.4
  });
}

// ==========================================
// Initialize Venom Symbiote CTA Buttons
// ==========================================
initVenomButtons();

// ==========================================
// Certifications Hover-Expanding Accordion Strip
// ==========================================
const certCards = Array.from(document.querySelectorAll('.certifications-grid .cert-card'));
if (certCards.length) {
  const activateCert = target => {
    certCards.forEach(c => c.classList.toggle('is-active', c === target));
  };
  certCards.forEach(card => {
    card.addEventListener('pointerenter', () => activateCert(card));
    card.addEventListener('focus', () => activateCert(card));
    card.addEventListener('click', e => {
      if (e.target.closest('a')) return;
      activateCert(card);
    });
  });
}


