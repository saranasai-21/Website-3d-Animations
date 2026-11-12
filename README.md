# Interactive 3D WebGL Portfolio & Animations Lab

**Live Demo:** [https://3d-animations-portfolio.vercel.app/](https://3d-animations-portfolio.vercel.app/)

An interactive WebGL portfolio built with vanilla ES modules, custom GLSL shaders, and Three.js — combining a reactive particle cosmos, scrollytelling AI/ML project showcase, credentials strip, and a 9-box live 3D animation lab with side-by-side source code inspection.

## Interactive 3D Animations

1. **Chromatic Tornado** (`tornado-vortex.js`) — Volumetric color-shifting particle vortex with orbit & scroll zoom
2. **Ribbon Sphere** (`ribbon-sphere.js`) — Helical latitude ribbon gyroscope with back-face depth shading
3. **Radial Pinburst** (`radial-pinsphere.js`) — Interactive starburst pinsphere with cursor repulsion & pulse waves
4. **Spin Galaxy Rings** (`galaxy-rings.js`) — Keplerian orbital star disc across switchable cosmic palettes
5. **Cosmic Repulsion** (`stardust-void.js`) — Stardust forcefield sphere with cursor repulsion & click shockwaves
6. **Sentient Glass Bot** (`glass-bot.js`) — Ray-traced GLSL glass capsule & Cobalt Sprite with cursor tracking, squint, and blinking
7. **Particle Bloom Daisy** (`particle-flower.js`) — 3D closed bud that unfolds into a cupped particle daisy on hover
8. **Circular Gallery** (`circular-gallery.js`) — CSS 3D tangential image ring with wheel/touch fly-in and cursor flip parallax
9. **Accordion Strip** (`accordion-strip.js`) — Hover-expanding emoji slice deck with object-cover UV scaling

## Tech Stack

- **Rendering:** Three.js (`0.184.0`), custom GLSL vertex/fragment shaders, CSS 3D transforms
- **Frontend:** Vanilla HTML, CSS glassmorphism UI, ES Modules (no framework runtime overhead)
- **Tooling:** Node.js static dev server (`server.mjs`) and zero-dependency static bundler (`build.mjs`) for Vercel

## Run Locally

```bash
npm install
npm start
```

Open `http://localhost:4173`.

## Build for Deployment

```bash
npm run build
```

Generates the static bundle in `dist/` (configured via `vercel.json`).
