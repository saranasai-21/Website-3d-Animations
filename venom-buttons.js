/**
 * Venom Symbiote Tendril Physics & Glossy Obsidian Shader Canvas for Portfolio CTA Buttons
 * Attaches organic liquid tendrils, concave goo webbing, and boiling edge spikes around pill buttons.
 */

const CANVAS_PAD = 110;
const TENDRIL_COUNT = 8;
const SPIKE_COUNT = 16;
const MAX_PULL_DIST = 112;

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Computes nearest boundary point, outward normal, perimeter tangent,
 * and signed distance from a rounded rectangle (pill/button box).
 */
function closestPointOnRoundedRect(px, py, cx, cy, w, h, radius) {
  const hw = Math.max(1, w * 0.5);
  const hh = Math.max(1, h * 0.5);
  const r = clamp(radius, 0, Math.min(hw, hh));
  const ix = Math.max(0, hw - r);
  const iy = Math.max(0, hh - r);

  const rx = px - cx;
  const ry = py - cy;
  const qx = clamp(rx, -ix, ix);
  const qy = clamp(ry, -iy, iy);

  const dx = rx - qx;
  const dy = ry - qy;
  const distToCore = Math.hypot(dx, dy);

  let nx = 0;
  let ny = -1;
  let bx = cx;
  let by = cy;

  if (distToCore > 0.0001) {
    nx = dx / distToCore;
    ny = dy / distToCore;
    bx = cx + qx + nx * r;
    by = cy + qy + ny * r;
  } else {
    // Inside inner core box: pick nearest face
    const penX = hw - Math.abs(rx);
    const penY = hh - Math.abs(ry);
    if (penX < penY) {
      nx = rx >= 0 ? 1 : -1;
      ny = 0;
      bx = cx + nx * hw;
      by = cy + ry;
    } else {
      nx = 0;
      ny = ry >= 0 ? 1 : -1;
      bx = cx + rx;
      by = cy + ny * hh;
    }
  }

  // Signed distance outside rounded box (> 0 when pointer is outside)
  const ax = Math.abs(rx) - ix;
  const ay = Math.abs(ry) - iy;
  const outsideDist = Math.hypot(Math.max(ax, 0), Math.max(ay, 0)) + Math.min(Math.max(ax, ay), 0) - r;

  return {
    x: bx,
    y: by,
    nx,
    ny,
    tx: -ny,
    ty: nx,
    distOutside: outsideDist
  };
}

function createTendrilState(index, total) {
  const spread = total > 1 ? (index / (total - 1)) * 2 - 1 : 0;
  return {
    spread,
    phase: index * 1.37 + 0.4,
    anchorX: 0,
    anchorY: 0,
    normX: 0,
    normY: -1,
    tipX: 0,
    tipY: 0,
    velX: 0,
    velY: 0,
    ctrlX: 0,
    ctrlY: 0,
    curlSpin: (index % 2 === 0 ? 1 : -1) * (0.45 + (index % 3) * 0.25),
    widthBase: 4.5 + (1 - Math.abs(spread)) * 5.2,
    lengthBias: 0.72 + (1 - Math.abs(spread) * 0.55) * 0.36,
    attached: false,
    life: 0
  };
}

function createSpikeState(index, total) {
  const spread = total > 1 ? (index / (total - 1)) * 2 - 1 : 0;
  return {
    spread,
    phase: index * 2.1,
    height: 0,
    targetHeight: 0,
    vel: 0,
    width: 3.5 + ((index * 7) % 5) * 0.9,
    lean: ((index % 2 === 0 ? 1 : -1) * (0.25 + (index % 3) * 0.2))
  };
}

function setupButtonSymbiote(el, scheduleTick) {
  el.classList.add('venom-cta');

  const canvas = document.createElement('canvas');
  canvas.className = 'venom-btn-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  el.prepend(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const state = {
    el,
    canvas,
    ctx,
    btnW: el.offsetWidth || 160,
    btnH: el.offsetHeight || 42,
    radius: 21,
    dpr: Math.min(window.devicePixelRatio || 1, 2),
    tendrils: Array.from({ length: TENDRIL_COUNT }, (_, i) => createTendrilState(i, TENDRIL_COUNT)),
    spikes: Array.from({ length: SPIKE_COUNT }, (_, i) => createSpikeState(i, SPIKE_COUNT)),
    pointerLocalX: 0,
    pointerLocalY: 0,
    pointerActive: false,
    engaged: false,
    snapCooldown: 0,
    burstTimer: 0,
    time: Math.random() * 10,
    energy: 0
  };

  const syncMetrics = () => {
    const w = el.offsetWidth || 160;
    const h = el.offsetHeight || 42;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const totalW = w + CANVAS_PAD * 2;
    const totalH = h + CANVAS_PAD * 2;
    const cssRadius = parseFloat(getComputedStyle(el).borderTopLeftRadius) || h * 0.5;

    state.btnW = w;
    state.btnH = h;
    state.dpr = dpr;
    state.radius = Math.min(cssRadius, w * 0.5, h * 0.5);

    const pw = Math.round(totalW * dpr);
    const ph = Math.round(totalH * dpr);
    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width = pw;
      canvas.height = ph;
    }
  };

  syncMetrics();
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(syncMetrics).observe(el);
  }

  const cx = () => CANVAS_PAD + state.btnW * 0.5;
  const cy = () => CANVAS_PAD + state.btnH * 0.5;

  const updatePointer = (clientX, clientY) => {
    const rect = el.getBoundingClientRect();
    const lx = CANVAS_PAD + (clientX - rect.left);
    const ly = CANVAS_PAD + (clientY - rect.top);
    state.pointerLocalX = lx;
    state.pointerLocalY = ly;

    const hit = closestPointOnRoundedRect(lx, ly, cx(), cy(), state.btnW, state.btnH, state.radius);
    const withinCapture = hit.distOutside <= MAX_PULL_DIST;
    const withinStart = hit.distOutside <= 54;

    state.pointerActive = withinCapture;
    if (state.snapCooldown <= 0) {
      if (!state.engaged && withinStart) {
        state.engaged = true;
      } else if (state.engaged && !withinCapture) {
        // Pulled past snap threshold: release with dramatic whip
        state.engaged = false;
        state.snapCooldown = 0.24;
        for (const sp of state.spikes) {
          sp.vel += 65 + Math.random() * 60;
        }
      }
    }

    if (withinCapture || state.engaged) {
      scheduleTick();
    }
  };

  const triggerBurst = (clientX, clientY) => {
    syncMetrics();
    const rect = el.getBoundingClientRect();
    state.pointerLocalX = CANVAS_PAD + (clientX - rect.left);
    state.pointerLocalY = CANVAS_PAD + (clientY - rect.top);
    state.engaged = true;
    state.burstTimer = 0.36;
    for (const t of state.tendrils) {
      t.velX += (Math.random() - 0.5) * 260;
      t.velY += (Math.random() - 0.5) * 260;
    }
    for (const sp of state.spikes) {
      sp.vel += 95 + Math.random() * 85;
    }
    scheduleTick();
  };

  el.addEventListener('pointerdown', e => {
    triggerBurst(e.clientX, e.clientY);
  });

  window.addEventListener('pointermove', e => {
    updatePointer(e.clientX, e.clientY);
  }, { passive: true });

  const step = dt => {
    state.time += dt;
    if (state.snapCooldown > 0) state.snapCooldown = Math.max(0, state.snapCooldown - dt);
    if (state.burstTimer > 0) {
      state.burstTimer = Math.max(0, state.burstTimer - dt);
      if (state.burstTimer === 0 && !state.pointerActive) {
        state.engaged = false;
      }
    }

    const centerX = cx();
    const centerY = cy();
    const nearest = closestPointOnRoundedRect(
      state.pointerLocalX,
      state.pointerLocalY,
      centerX,
      centerY,
      state.btnW,
      state.btnH,
      state.radius
    );

    const activePull = state.engaged && (state.pointerActive || state.burstTimer > 0);
    const stretchFactor = activePull ? clamp((nearest.distOutside + 22) / MAX_PULL_DIST, 0.25, 1.0) : 0;

    let maxActivity = activePull ? 1 : 0;

    for (let i = 0; i < state.tendrils.length; i++) {
      const t = state.tendrils[i];
      const anchorOffset = t.spread * Math.min(38, state.btnW * 0.28);
      const targetSampleX = nearest.x + nearest.tx * anchorOffset;
      const targetSampleY = nearest.y + nearest.ty * anchorOffset;
      const anchorProj = closestPointOnRoundedRect(
        targetSampleX,
        targetSampleY,
        centerX,
        centerY,
        state.btnW,
        state.btnH,
        state.radius
      );

      if (t.anchorX === 0 && t.anchorY === 0) {
        t.anchorX = anchorProj.x;
        t.anchorY = anchorProj.y;
        t.tipX = anchorProj.x;
        t.tipY = anchorProj.y;
        t.ctrlX = anchorProj.x;
        t.ctrlY = anchorProj.y;
      }

      t.anchorX = lerp(t.anchorX, anchorProj.x, Math.min(1, dt * 16));
      t.anchorY = lerp(t.anchorY, anchorProj.y, Math.min(1, dt * 16));
      t.normX = anchorProj.nx;
      t.normY = anchorProj.ny;

      let goalX = t.anchorX;
      let goalY = t.anchorY;
      let stiffness = 175;
      let damping = 0.78;

      if (activePull) {
        const fan = t.spread * (14 + stretchFactor * 16);
        const reach = t.lengthBias * (0.78 + 0.22 * Math.sin(state.time * 5.2 + t.phase));
        const px = state.burstTimer > 0 && !state.pointerActive
          ? t.anchorX + t.normX * 42
          : state.pointerLocalX;
        const py = state.burstTimer > 0 && !state.pointerActive
          ? t.anchorY + t.normY * 42
          : state.pointerLocalY;

        goalX = lerp(t.anchorX, px + nearest.tx * fan * 0.55, reach);
        goalY = lerp(t.anchorY, py + nearest.ty * fan * 0.55, reach);
        stiffness = 135;
        damping = 0.8;
        t.attached = true;
        t.life = Math.min(1, t.life + dt * 7);
      } else {
        t.attached = false;
        t.life = Math.max(0, t.life - dt * 2.8);
        // Whip/curl tip slightly toward normal while retracting
        goalX = t.anchorX;
        goalY = t.anchorY;
        stiffness = 210;
        damping = 0.76;
      }

      const ax = (goalX - t.tipX) * stiffness;
      const ay = (goalY - t.tipY) * stiffness;
      t.velX = (t.velX + ax * dt) * Math.pow(damping, dt * 60);
      t.velY = (t.velY + ay * dt) * Math.pow(damping, dt * 60);
      t.tipX += t.velX * dt;
      t.tipY += t.velY * dt;

      // Control point arcs outward along surface normal & pointer whip
      const len = Math.hypot(t.tipX - t.anchorX, t.tipY - t.anchorY);
      const arcNormalLift = Math.min(28, len * 0.28);
      const curlPush = activePull ? 0 : t.curlSpin * Math.min(26, len * 0.45);
      const desiredCtrlX = (t.anchorX + t.tipX) * 0.5 + t.normX * arcNormalLift + nearest.tx * curlPush;
      const desiredCtrlY = (t.anchorY + t.tipY) * 0.5 + t.normY * arcNormalLift + nearest.ty * curlPush;
      t.ctrlX = lerp(t.ctrlX, desiredCtrlX, Math.min(1, dt * 14));
      t.ctrlY = lerp(t.ctrlY, desiredCtrlY, Math.min(1, dt * 14));

      maxActivity = Math.max(maxActivity, len * 0.04, Math.hypot(t.velX, t.velY) * 0.004, t.life);
    }

    for (let i = 0; i < state.spikes.length; i++) {
      const sp = state.spikes[i];
      const wave = 0.5 + 0.5 * Math.sin(state.time * 7.5 + sp.phase);
      sp.targetHeight = activePull
        ? (5 + wave * 11) * (1 - Math.abs(sp.spread) * 0.45)
        : 0;
      const acc = (sp.targetHeight - sp.height) * 190;
      sp.vel = (sp.vel + acc * dt) * Math.pow(0.76, dt * 60);
      sp.height = Math.max(0, sp.height + sp.vel * dt);
      maxActivity = Math.max(maxActivity, sp.height * 0.15, Math.abs(sp.vel) * 0.01);
    }

    state.energy = maxActivity;
    renderSymbiote(state, centerX, centerY, nearest);
    return maxActivity > 0.015;
  };

  return { state, step, syncMetrics };
}

function drawTaperedTendril(ctx, ax, ay, cx, cy, tx, ty, nx, ny, baseW, tipW) {
  const dx = tx - ax;
  const dy = ty - ay;
  const len = Math.hypot(dx, dy) || 1;
  const px = -dy / len;
  const py = dx / len;

  const baseLx = ax + px * baseW;
  const baseLy = ay + py * baseW;
  const baseRx = ax - px * baseW;
  const baseRy = ay - py * baseW;

  const midW = lerp(baseW, tipW, 0.52);
  const ctrlLx = cx + px * midW;
  const ctrlLy = cy + py * midW;
  const ctrlRx = cx - px * midW;
  const ctrlRy = cy - py * midW;

  const tipLx = tx + px * tipW;
  const tipLy = ty + py * tipW;
  const tipRx = tx - px * tipW;
  const tipRy = ty - py * tipW;

  // Slightly sink anchor inside button edge for seamless goo merge
  const sinkX = -nx * 3.5;
  const sinkY = -ny * 3.5;

  ctx.beginPath();
  ctx.moveTo(baseLx + sinkX, baseLy + sinkY);
  ctx.quadraticCurveTo(ctrlLx, ctrlLy, tipLx, tipLy);
  ctx.lineTo(tx + (dx / len) * 2.5, ty + (dy / len) * 2.5);
  ctx.lineTo(tipRx, tipRy);
  ctx.quadraticCurveTo(ctrlRx, ctrlRy, baseRx + sinkX, baseRy + sinkY);
  ctx.closePath();
}

function renderSymbiote(state, centerX, centerY, nearest) {
  const { ctx, canvas, dpr, tendrils, spikes, btnW, btnH, radius } = state;
  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (state.energy <= 0.015) {
    ctx.restore();
    return;
  }

  ctx.scale(dpr, dpr);

  // 1. Concave symbiote webbing between neighboring stretched strands
  ctx.lineCap = 'round';
  for (let i = 0; i < tendrils.length - 1; i++) {
    const a = tendrils[i];
    const b = tendrils[i + 1];
    const lenA = Math.hypot(a.tipX - a.anchorX, a.tipY - a.anchorY);
    const lenB = Math.hypot(b.tipX - b.anchorX, b.tipY - b.anchorY);
    if (lenA < 10 || lenB < 10) continue;

    for (const ratio of [0.28, 0.56]) {
      const p1x = lerp(a.anchorX, a.tipX, ratio);
      const p1y = lerp(a.anchorY, a.tipY, ratio);
      const p2x = lerp(b.anchorX, b.tipX, ratio);
      const p2y = lerp(b.anchorY, b.tipY, ratio);
      const midX = (p1x + p2x) * 0.5 - ((a.normX + b.normX) * 0.5) * 6;
      const midY = (p1y + p2y) * 0.5 - ((a.normY + b.normY) * 0.5) * 6;

      ctx.beginPath();
      ctx.moveTo(p1x, p1y);
      ctx.quadraticCurveTo(midX, midY, p2x, p2y);
      ctx.lineWidth = ratio < 0.4 ? 2.4 : 1.3;
      ctx.strokeStyle = 'rgba(205, 224, 255, 0.28)';
      ctx.stroke();

      ctx.lineWidth = ratio < 0.4 ? 1.5 : 0.85;
      ctx.strokeStyle = '#04050a';
      ctx.stroke();
    }
  }

  // 2. Perimeter boiling spikes / symbiote rim teeth
  for (const sp of spikes) {
    if (sp.height < 0.8) continue;
    const sampleX = nearest.x + nearest.tx * (sp.spread * Math.min(btnW * 0.42, 68));
    const sampleY = nearest.y + nearest.ty * (sp.spread * Math.min(btnW * 0.42, 68));
    const b = closestPointOnRoundedRect(sampleX, sampleY, centerX, centerY, btnW, btnH, radius);

    const tipX = b.x + b.nx * sp.height + b.tx * sp.height * sp.lean;
    const tipY = b.y + b.ny * sp.height + b.ty * sp.height * sp.lean;
    const baseLx = b.x - b.nx * 2 + b.tx * sp.width;
    const baseLy = b.y - b.ny * 2 + b.ty * sp.width;
    const baseRx = b.x - b.nx * 2 - b.tx * sp.width;
    const baseRy = b.y - b.ny * 2 - b.ty * sp.width;

    ctx.beginPath();
    ctx.moveTo(baseLx, baseLy);
    ctx.quadraticCurveTo(b.x + b.nx * sp.height * 0.45, b.y + b.ny * sp.height * 0.45, tipX, tipY);
    ctx.quadraticCurveTo(b.x + b.nx * sp.height * 0.45, b.y + b.ny * sp.height * 0.45, baseRx, baseRy);
    ctx.closePath();

    ctx.fillStyle = '#04050a';
    ctx.fill();
    ctx.lineWidth = 1.05;
    ctx.strokeStyle = 'rgba(220, 236, 255, 0.5)';
    ctx.stroke();
  }

  // 3. Main glossy pitch-black tendrils with silver-white specular liquid highlight
  for (const t of tendrils) {
    const len = Math.hypot(t.tipX - t.anchorX, t.tipY - t.anchorY);
    if (len < 2.2) continue;

    drawTaperedTendril(
      ctx,
      t.anchorX,
      t.anchorY,
      t.ctrlX,
      t.ctrlY,
      t.tipX,
      t.tipY,
      t.normX,
      t.normY,
      t.widthBase,
      0.7
    );

    // Subtle cool silver rim separates pitch-black ink from dark space canvas
    ctx.lineWidth = 2.0;
    ctx.strokeStyle = 'rgba(205, 226, 255, 0.36)';
    ctx.stroke();

    ctx.fillStyle = '#04050a';
    ctx.fill();

    // Wet specular highlight streak along upper/lit edge of the tendril
    ctx.beginPath();
    ctx.moveTo(t.anchorX + t.normX * 1.2, t.anchorY + t.normY * 1.2);
    ctx.quadraticCurveTo(
      t.ctrlX - t.normY * 1.1,
      t.ctrlY + t.normX * 1.1,
      t.tipX,
      t.tipY
    );
    ctx.lineWidth = 1.25;
    ctx.strokeStyle = 'rgba(244, 249, 255, 0.62)';
    ctx.stroke();
  }

  ctx.restore();
}

export function initVenomButtons(selector = 'header .project, .hero-action-buttons .cta-pill, .submit-btn') {
  const buttons = Array.from(document.querySelectorAll(selector));
  if (!buttons.length) return;

  const prefersReduced = typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    buttons.forEach(el => el.classList.add('venom-cta'));
    return;
  }

  const controllers = [];
  let rafId = 0;
  let lastNow = performance.now();

  const scheduleTick = () => {
    if (rafId) return;
    lastNow = performance.now();
    rafId = requestAnimationFrame(tick);
  };

  const tick = now => {
    const dt = Math.min((now - lastNow) * 0.001, 0.045);
    lastNow = now;

    let anyActive = false;
    for (const c of controllers) {
      if (c.step(dt)) anyActive = true;
    }

    if (anyActive) {
      rafId = requestAnimationFrame(tick);
    } else {
      rafId = 0;
    }
  };

  for (const el of buttons) {
    const ctrl = setupButtonSymbiote(el, scheduleTick);
    if (ctrl) controllers.push(ctrl);
  }
}

