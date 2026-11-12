// Circular Gallery — Originkit (Vanilla JS DOM + CSS 3D port)

const DEFAULT_IMAGES = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8dXNlciUyMHByb2ZpbGUlMjBpbWFnZXxlbnwwfHwwfHx8MA%3D%3D',
  'https://images.unsplash.com/photo-1654110455429-cf322b40a906?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8dXNlciUyMHByb2ZpbGUlMjBpbWFnZXxlbnwwfHwwfHx8MA%3D%3D',
  'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8N3x8dXNlciUyMHByb2ZpbGUlMjBpbWFnZXxlbnwwfHwwfHx8MA%3D%3D',
  'https://images.unsplash.com/photo-1584999734482-0361aecad844?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8dXNlciUyMHByb2ZpbGUlMjBpbWFnZXxlbnwwfHwwfHx8MA%3D%3D',
  'https://images.unsplash.com/photo-1586297135537-94bc9ba060aa?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTF8fHVzZXIlMjBwcm9maWxlJTIwaW1hZ2V8ZW58MHx8MHx8fDA%3D',
  'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8N3x8dXNlciUyMHByb2ZpbGUlMjBpbWFnZXxlbnwwfHwwfHx8Mg%3D%3D',
  'https://images.unsplash.com/photo-1586297135537-94bc9ba060aa?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTB8fHVzZXIlMjBwcm9maWxlJTIwaW1hZ2V8ZW58MHx8MHx8fDI%3D',
  'https://images.unsplash.com/photo-1534126416832-a88fdf2911c2?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTF8fHVzZXIlMjBwcm9maWxlJTIwaW1hZ2V8ZW58MHx8MHx8fDI%3D',
  'https://images.unsplash.com/photo-1695013079138-d39ea65ab0b6?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTR8fHVzZXIlMjBwcm9maWxlJTIwaW1hZ2V8ZW58MHx8MHx8fDI%3D',
  'https://images.unsplash.com/photo-1614321375197-c5083895b054?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTV8fHVzZXIlMjBwcm9maWxlJTIwaW1hZ2V8ZW58MHx8MHx8fDI%3D'
];

const GALLERY_PALETTES = [
  { name: 'ORIGINKIT / NOIR', background: '#000000' },
  { name: 'MIDNIGHT / INDIGO', background: '#030712' },
  { name: 'COSMIC / PLUM', background: '#0a0414' },
  { name: 'SLATE / STUDIO', background: '#0b1120' }
];

const DEFAULT_CARD = {
  width: 40,
  height: 45,
  radius: 4
};

const DEFAULT_SCROLL_SENSITIVITY = 5;
const DEFAULT_SMOOTHING = 10;
const DEFAULT_COUNT = 25;
const DEFAULT_RING_RADIUS = 224;
const DEFAULT_ZOOM = 5;
const DEFAULT_ZOOM_OFFSET = 0;

const TAU = Math.PI * 2;
const FOCUS_ANGLE = (Math.PI * 3) / 2;
const CARD_PERSPECTIVE = 1000;
const STAGE_PERSPECTIVE = 2000;
const HOVER_LERP = 0.15;

const HOVER_REACH = 5;
const HOVER_STRENGTH = 5;
const HOVER_PARALLAX = 5;

const ENTRY_CARDS = 2;
const TOUCH_GAIN = 2.2;
const WHEEL_CLAMP = 400;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

const smoothstep = t => t * t * (3 - 2 * t);

function placeholderFill(index) {
  const hue = (index * 47 + 210) % 360;
  return `linear-gradient(150deg, hsl(${hue} 38% 30%), hsl(${(hue + 45) % 360} 52% 8%))`;
}

function cardAngle(index, count) {
  return (index / Math.max(1, count)) * TAU + FOCUS_ANGLE;
}

/**
 * Mounts the Circular Gallery CSS 3D ring inside `container`.
 * Supports both preview thumbnails (`options.isPreview = true`) and full
 * wheel/touch scrubbed interactive fly-in + endless 360° rotation in modal mode.
 */
export function mountCircularGallery(container, options = {}) {
  if (!container) return null;

  const isPreview = Boolean(options.isPreview);
  const cardOpts = { ...DEFAULT_CARD, ...(options.card || {}) };
  const cardCount = Math.max(1, Math.round(options.count ?? DEFAULT_COUNT));
  const ringRadius = options.ringRadius ?? DEFAULT_RING_RADIUS;
  const zoom = options.zoom ?? DEFAULT_ZOOM;
  const zoomOffset = options.zoomOffset ?? DEFAULT_ZOOM_OFFSET;
  const scrollSensitivity = options.scrollSensitivity ?? DEFAULT_SCROLL_SENSITIVITY;
  const smoothing = options.smoothing ?? DEFAULT_SMOOTHING;
  const images = Array.isArray(options.images) && options.images.length ? options.images : DEFAULT_IMAGES;

  let paletteIdx = 0;

  const root = document.createElement('div');
  root.className = 'circular-gallery-root';
  root.style.cssText = [
    'position:relative',
    'width:100%',
    'height:100%',
    'overflow:hidden',
    `background:${options.background || GALLERY_PALETTES[paletteIdx].background}`,
    'touch-action:manipulation',
    'transition:background 0.35s ease'
  ].join(';');

  const stage = document.createElement('div');
  stage.style.cssText = [
    'position:absolute',
    'inset:0',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'transform-style:preserve-3d',
    `perspective:${STAGE_PERSPECTIVE}px`,
    'will-change:transform'
  ].join(';');

  const ringNode = document.createElement('div');
  ringNode.style.cssText = [
    'position:relative',
    'width:0',
    'height:0',
    'transform-origin:center',
    'will-change:transform'
  ].join(';');

  const cardNodes = [];
  const cards = [];

  for (let i = 0; i < cardCount; i += 1) {
    const src = images[i % images.length];
    const cardEl = document.createElement('div');
    cardEl.style.cssText = [
      'position:absolute',
      'left:0',
      'top:0',
      `margin-left:${-cardOpts.width / 2}px`,
      `margin-top:${-cardOpts.height / 2}px`,
      `width:${cardOpts.width}px`,
      `height:${cardOpts.height}px`,
      `border-radius:${cardOpts.radius}px`,
      'overflow:hidden',
      'transform-origin:center center',
      'transform-style:preserve-3d',
      'backface-visibility:visible',
      'will-change:transform'
    ].join(';');

    const fallbackEl = document.createElement('div');
    fallbackEl.style.cssText = [
      'width:100%',
      'height:100%',
      `background:${placeholderFill(i)}`,
      'backface-visibility:hidden'
    ].join(';');

    if (src) {
      const img = document.createElement('img');
      img.src = src;
      img.alt = '';
      img.draggable = false;
      img.loading = 'eager';
      img.style.cssText = [
        'width:100%',
        'height:100%',
        'object-fit:cover',
        'display:block',
        'user-select:none',
        'backface-visibility:hidden'
      ].join(';');
      img.addEventListener('error', () => {
        if (img.parentNode === cardEl) {
          cardEl.replaceChild(fallbackEl, img);
        }
      });
      cardEl.appendChild(img);
    } else {
      cardEl.appendChild(fallbackEl);
    }

    ringNode.appendChild(cardEl);
    cardNodes.push(cardEl);
    cards.push({
      angle: cardAngle(i, cardCount),
      currentRotation: 0,
      targetRotation: 0,
      currentX: 0,
      targetX: 0,
      currentY: 0,
      targetY: 0,
      currentScale: 1,
      targetScale: 1
    });
  }

  stage.appendChild(ringNode);
  root.appendChild(stage);
  container.prepend(root);

  const totalCards = Math.max(1, ENTRY_CARDS + (cardCount - 1));
  const entryFraction = ENTRY_CARDS / totalCards;
  const spanDeg = ((cardCount - 1) * 360) / cardCount;
  const lapProgress = (1 - entryFraction) * (cardCount / Math.max(1, cardCount - 1));

  const scrollLerp = clamp(0.16 - clamp(smoothing, 0, 10) * 0.012, 0.03, 0.16);
  const scrollPerCard = 400 - clamp(scrollSensitivity, 0, 10) * 32;
  const scrollTotalPx = Math.max(1, scrollPerCard * totalCards);

  const size = {
    width: root.clientWidth || container.clientWidth || 320,
    height: root.clientHeight || container.clientHeight || 240
  };

  let pointerFine = true;
  let hoverQuery = null;
  const syncPointerCap = () => {
    if (hoverQuery) pointerFine = hoverQuery.matches;
  };
  if (typeof window !== 'undefined' && window.matchMedia) {
    hoverQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
    syncPointerCap();
    hoverQuery.addEventListener('change', syncPointerCap);
  }

  const getDerived = () => {
    const span = 2 * ringRadius + Math.hypot(cardOpts.width, cardOpts.height);
    const baseScale =
      size.width > 0 && size.height > 0 && span > 0
        ? Math.max(0.01, Math.min(1, Math.min(size.width, size.height) / span))
        : 1;
    const hoverRadius = (100 + HOVER_REACH * 80) * baseScale;
    const zoomScale = clamp(zoom, 0.5, 20) * baseScale;
    const lift = ringRadius * zoomScale + zoomOffset;

    return {
      baseScale,
      hover: !isPreview ? pointerFine : false,
      hoverRadius,
      falloff: Math.max(1, hoverRadius / 2),
      push: HOVER_STRENGTH * 10,
      grow: HOVER_STRENGTH * 0.06,
      tilt: HOVER_PARALLAX * 3,
      twist: HOVER_PARALLAX,
      zoomScale,
      lift
    };
  };

  let config = getDerived();

  const ro =
    typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(entries => {
          const rect = entries[0]?.contentRect;
          if (!rect) return;
          size.width = rect.width;
          size.height = rect.height;
          config = getDerived();
        })
      : null;
  if (ro) ro.observe(root);

  const state = {
    cards,
    parallax: {
      currentX: 0,
      targetX: 0,
      currentY: 0,
      targetY: 0,
      currentZ: 0,
      targetZ: 0
    },
    ring: { x: 0, y: 0, rotation: 0, scale: config.baseScale },
    progressTarget: 0,
    progressCurrent: 0,
    entry: 0
  };

  const paint = () => {
    const weight = 1 - state.entry;
    const { currentX, currentY, currentZ } = state.parallax;
    stage.style.transform = `rotate(${currentZ * weight}deg) rotateX(${currentX * weight}deg) rotateY(${currentY * weight}deg)`;

    const { x, y, rotation, scale } = state.ring;
    ringNode.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${rotation}deg) scale(${scale})`;

    for (let i = 0; i < state.cards.length; i += 1) {
      const node = cardNodes[i];
      const item = state.cards[i];
      const cx = ringRadius * Math.cos(item.angle) + item.currentX * weight;
      const cy = ringRadius * Math.sin(item.angle) + item.currentY * weight;
      const spin = (item.angle * 180) / Math.PI + 90;
      const twistY = item.currentRotation * weight;
      const sc = 1 + (item.currentScale - 1) * weight;
      node.style.transform = `perspective(${CARD_PERSPECTIVE}px) translate3d(${cx}px, ${cy}px, 0) rotate(${spin}deg) rotateY(${twistY}deg) scale(${sc})`;
    }
  };

  let rafId = 0;
  let last = 0;
  let destroyed = false;

  const tick = now => {
    if (destroyed) return;
    rafId = requestAnimationFrame(tick);
    const dt = last ? Math.min(0.064, (now - last) / 1000) : 1 / 60;
    last = now;

    if (isPreview) {
      // Gentle subtle preview motion so the ring feels alive in Box 08 thumbnail
      const t = now * 0.001;
      state.ring.x = 0;
      state.ring.y = 0;
      state.ring.scale = config.baseScale;
      state.ring.rotation = Math.sin(t * 0.35) * 8;
      paint();
      return;
    }

    const sk = 1 - Math.pow(1 - scrollLerp, dt * 60);
    state.progressCurrent += (state.progressTarget - state.progressCurrent) * sk;

    const lapEnd = entryFraction + lapProgress;
    if (state.progressCurrent >= lapEnd) {
      state.progressCurrent -= lapProgress;
      state.progressTarget -= lapProgress;
    }

    const progress = state.progressCurrent;
    const entry = smoothstep(clamp(progress / entryFraction, 0, 1));
    const ride = entryFraction < 1 ? Math.max(0, (progress - entryFraction) / (1 - entryFraction)) : 0;
    state.entry = entry;

    const k = 1 - Math.pow(1 - HOVER_LERP, dt * 60);
    const p = state.parallax;
    p.currentX += (p.targetX - p.currentX) * k;
    p.currentY += (p.targetY - p.currentY) * k;
    p.currentZ += (p.targetZ - p.currentZ) * k;

    for (const item of state.cards) {
      item.currentRotation += (item.targetRotation - item.currentRotation) * k;
      item.currentScale += (item.targetScale - item.currentScale) * k;
      item.currentX += (item.targetX - item.currentX) * k;
      item.currentY += (item.targetY - item.currentY) * k;
    }

    state.ring.x = 0;
    state.ring.scale = config.baseScale + (config.zoomScale - config.baseScale) * entry;
    state.ring.y = config.lift * entry;
    state.ring.rotation = -ride * spanDeg;

    paint();
  };

  rafId = requestAnimationFrame(tick);

  // Interactive scroll / touch + pointer hover handlers (active in modal viewport)
  const advance = deltaPx => {
    state.progressTarget = Math.max(0, state.progressTarget + deltaPx / scrollTotalPx);
  };
  const spent = delta => delta < 0 && state.progressTarget <= 0;

  const onWheel = event => {
    let delta = event.deltaY;
    if (event.deltaMode === 1) delta *= 16;
    else if (event.deltaMode === 2) delta *= root.clientHeight || 800;
    delta = clamp(delta, -WHEEL_CLAMP, WHEEL_CLAMP);
    event.preventDefault();
    if (spent(delta)) return;
    advance(delta);
  };

  let touchY = null;
  const onTouchStart = event => {
    touchY = event.touches[0]?.clientY ?? null;
  };
  const onTouchMove = event => {
    const y = event.touches[0]?.clientY;
    if (y == null || touchY == null) return;
    const delta = clamp((touchY - y) * TOUCH_GAIN, -WHEEL_CLAMP, WHEEL_CLAMP);
    touchY = y;
    if (spent(delta)) return;
    if (event.cancelable) event.preventDefault();
    advance(delta);
  };
  const onTouchEnd = () => {
    touchY = null;
  };

  const onPointerMove = event => {
    if (!config.hover) return;
    const rect = root.getBoundingClientRect();
    const centreX = rect.width / 2;
    const centreY = rect.height / 2;
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;
    const percentX = centreX ? (pointerX - centreX) / centreX : 0;
    const percentY = centreY ? (pointerY - centreY) / centreY : 0;

    state.parallax.targetY = percentX * config.tilt;
    state.parallax.targetX = -percentY * config.tilt;
    state.parallax.targetZ = (percentX + percentY) * config.twist;

    for (const item of state.cards) {
      const cardX = centreX + config.baseScale * (ringRadius * Math.cos(item.angle) + item.currentX);
      const cardY = centreY + config.baseScale * (ringRadius * Math.sin(item.angle) + item.currentY);
      const distance = Math.hypot(pointerX - cardX, pointerY - cardY);

      if (distance < config.hoverRadius) {
        const force = Math.max(0, 1 - distance / config.falloff);
        const move = config.push * force;
        item.targetRotation = 180 * force;
        item.targetScale = 1 + config.grow * force;
        item.targetX = move * Math.cos(item.angle);
        item.targetY = move * Math.sin(item.angle);
      } else {
        item.targetRotation = 0;
        item.targetScale = 1;
        item.targetX = 0;
        item.targetY = 0;
      }
    }
  };

  const onPointerLeave = () => {
    for (const item of state.cards) {
      item.targetRotation = 0;
      item.targetScale = 1;
      item.targetX = 0;
      item.targetY = 0;
    }
    state.parallax.targetX = 0;
    state.parallax.targetY = 0;
    state.parallax.targetZ = 0;
  };

  if (!isPreview) {
    root.addEventListener('wheel', onWheel, { passive: false });
    root.addEventListener('touchstart', onTouchStart, { passive: true });
    root.addEventListener('touchmove', onTouchMove, { passive: false });
    root.addEventListener('touchend', onTouchEnd, { passive: true });
    root.addEventListener('touchcancel', onTouchEnd, { passive: true });
    root.addEventListener('pointermove', onPointerMove);
    root.addEventListener('pointerleave', onPointerLeave);
  }

  return {
    getPaletteName: () => GALLERY_PALETTES[paletteIdx].name,
    cyclePalette: () => {
      paletteIdx = (paletteIdx + 1) % GALLERY_PALETTES.length;
      root.style.background = GALLERY_PALETTES[paletteIdx].background;
      return GALLERY_PALETTES[paletteIdx].name;
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(rafId);
      if (ro) ro.disconnect();
      if (hoverQuery) hoverQuery.removeEventListener('change', syncPointerCap);
      if (!isPreview) {
        root.removeEventListener('wheel', onWheel);
        root.removeEventListener('touchstart', onTouchStart);
        root.removeEventListener('touchmove', onTouchMove);
        root.removeEventListener('touchend', onTouchEnd);
        root.removeEventListener('touchcancel', onTouchEnd);
        root.removeEventListener('pointermove', onPointerMove);
        root.removeEventListener('pointerleave', onPointerLeave);
      }
      if (root.parentNode === container) container.removeChild(root);
    }
  };
}

