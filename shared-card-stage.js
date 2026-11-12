import * as THREE from 'three';

/**
 * Renders live Three.js scenes into multiple grid card canvases using one shared
 * offscreen WebGLRenderer so every box outside displays the exact same 3D animation
 * as the modal inside without exhausting browser WebGL contexts.
 */
class SharedCardStage {
  constructor() {
    this.entries = [];
    this.renderer = null;
    this.bufW = 360;
    this.bufH = 180;
    this.rafId = 0;
    this.lastNow = 0;
  }

  ensureRenderer() {
    if (this.renderer) return this.renderer;
    const r = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    r.setPixelRatio(1);
    r.setSize(this.bufW, this.bufH, false);
    r.setScissorTest(true);
    r.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer = r;
    return r;
  }

  register(container, createSceneFn, previewOptions = {}) {
    if (!container || typeof createSceneFn !== 'function') return null;

    const canvas = document.createElement('canvas');
    canvas.className = 'anim-card-live-canvas';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    container.prepend(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const entry = {
      container,
      canvas,
      ctx,
      dpr,
      w: Math.max(120, Math.round((container.clientWidth || 200) * dpr)),
      h: Math.max(80, Math.round((container.clientHeight || 96) * dpr)),
      visible: true,
      ctrl: createSceneFn(dpr, { isPreview: true, ...previewOptions })
    };

    const syncSize = () => {
      const cw = container.clientWidth || 200;
      const ch = container.clientHeight || 96;
      const pw = Math.max(120, Math.round(cw * dpr));
      const ph = Math.max(80, Math.round(ch * dpr));
      if (pw !== entry.w || ph !== entry.h || canvas.width !== pw || canvas.height !== ph) {
        entry.w = pw;
        entry.h = ph;
        canvas.width = pw;
        canvas.height = ph;
        entry.ctrl.setSize(pw, ph);
      }
    };
    syncSize();

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(syncSize) : null;
    if (ro) ro.observe(container);

    const io = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(items => {
          entry.visible = items[0]?.isIntersecting ?? true;
        })
      : null;
    if (io) io.observe(container);

    this.entries.push(entry);
    if (!this.rafId) {
      this.lastNow = performance.now();
      this.rafId = requestAnimationFrame(now => this.tick(now));
    }

    return {
      destroy: () => {
        if (ro) ro.disconnect();
        if (io) io.disconnect();
        entry.ctrl.dispose();
        canvas.remove();
        this.entries = this.entries.filter(item => item !== entry);
        if (this.entries.length === 0 && this.rafId) {
          cancelAnimationFrame(this.rafId);
          this.rafId = 0;
        }
      }
    };
  }

  tick(now) {
    this.rafId = requestAnimationFrame(t => this.tick(t));
    const dt = Math.min((now - this.lastNow) * 0.001, 0.05);
    this.lastNow = now;

    if (!this.entries.some(e => e.visible)) return;

    const r = this.ensureRenderer();
    const sharedCanvas = r.domElement;

    let maxW = this.bufW;
    let maxH = this.bufH;
    for (const e of this.entries) {
      if (e.w > maxW) maxW = e.w;
      if (e.h > maxH) maxH = e.h;
    }
    if (maxW !== this.bufW || maxH !== this.bufH) {
      this.bufW = maxW;
      this.bufH = maxH;
      r.setSize(maxW, maxH, false);
    }

    for (const entry of this.entries) {
      if (!entry.visible) continue;
      entry.ctrl.update(dt);

      const { w, h } = entry;
      const sy = this.bufH - h;
      r.setViewport(0, sy, w, h);
      r.setScissor(0, sy, w, h);
      r.setClearColor(entry.ctrl.getClearColor(), 1);
      r.clear(true, true, false);
      r.render(entry.ctrl.scene, entry.ctrl.camera);

      entry.ctx.drawImage(sharedCanvas, 0, 0, w, h, 0, 0, w, h);
    }
  }
}

export const sharedCardStage = new SharedCardStage();

/**
 * Shared full-stage WebGL mount helper used by all 3D animation modules.
 */
export function mountSceneIntoContainer(container, createSceneFn, options = {}) {
  if (!container || typeof createSceneFn !== 'function') return null;

  const width = container.clientWidth || 640;
  const height = container.clientHeight || 480;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(dpr);
  renderer.setSize(width, height);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const canvas = renderer.domElement;
  canvas.className = options.canvasClass || 'anim-live-canvas';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  canvas.style.cursor = options.cursor || 'grab';
  container.appendChild(canvas);

  const ctrl = createSceneFn(dpr, { isPreview: false, ...options });
  ctrl.setSize(width, height);
  renderer.setClearColor(ctrl.getClearColor(), 1);

  const onPointerDown = e => ctrl.onPointerDown?.(e, canvas);
  const onPointerMove = e => ctrl.onPointerMove?.(e, canvas);
  const onPointerUp = e => ctrl.onPointerUp?.(e, canvas);
  const onPointerLeave = e => ctrl.onPointerLeave?.(e, canvas);
  const onClick = e => ctrl.onClick?.(e, canvas);
  const onWheel = e => {
    if (ctrl.onWheel) {
      e.preventDefault();
      ctrl.onWheel(e, canvas);
    }
  };

  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointerleave', onPointerLeave);
  canvas.addEventListener('click', onClick);
  canvas.addEventListener('wheel', onWheel, { passive: false });

  let destroyed = false;
  let rafId = 0;

  const resize = () => {
    if (destroyed) return;
    const w = container.clientWidth || 640;
    const h = container.clientHeight || 480;
    renderer.setSize(w, h);
    ctrl.setSize(w, h);
  };

  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
  if (ro) ro.observe(container);
  window.addEventListener('resize', resize);

  let lastNow = performance.now();
  const loop = now => {
    if (destroyed) return;
    rafId = requestAnimationFrame(loop);
    const dt = Math.min((now - lastNow) * 0.001, 0.05);
    lastNow = now;
    ctrl.update(dt);
    renderer.setClearColor(ctrl.getClearColor(), 1);
    renderer.render(ctrl.scene, ctrl.camera);
  };
  rafId = requestAnimationFrame(loop);

  return {
    cyclePalette: () => ctrl.cyclePalette(),
    getPaletteName: () => ctrl.getPaletteName(),
    destroy() {
      destroyed = true;
      cancelAnimationFrame(rafId);
      if (ro) ro.disconnect();
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('click', onClick);
      canvas.removeEventListener('wheel', onWheel);
      ctrl.dispose();
      renderer.dispose();
      if (canvas.parentNode === container) container.removeChild(canvas);
    }
  };
}

