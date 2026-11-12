"use client"

import { useEffect, useRef } from "react"
import type { CSSProperties } from "react"

/* ------------------------------------------------------------------ *
 *  TerraDusk
 *
 *  The Earth as it looks from orbit: real satellite imagery wrapped on
 *  a sphere, lit by a low sun, with city lights coming on along the
 *  night side, clouds that drift against the ground and throw their
 *  own shadows, sun glint on open water, relief on the mountains, and
 *  a thin blue atmosphere that thickens at the limb -- set in a field
 *  of faintly twinkling stars.
 *
 *  A variation of BraillePlanet: the same per-pixel WebGL planet, but
 *  the surface is NASA imagery instead of noise, and it is all planet,
 *  no dot half.
 *
 *  Interaction
 *    Drag      spins the globe; let go and it coasts on its momentum,
 *              then eases back into its own slow turn.
 *    Hover     the globe turns to face the pointer. It is a camera orbit,
 *              not a spin: surface, sunlight, atmosphere and stars all
 *              turn together, so the terminator and the bright limb
 *              slide across the disc the way they would round a real
 *              ball, and the stars drift behind it. The turn rides a
 *              spring with a touch of overshoot, and the globe lifts a
 *              little toward you while the pointer is on it.
 *    Sun       set by hand -- Sun Angle turns it round the disc,
 *              Daylight swings it from behind the globe (a thin
 *              crescent) to behind the viewer (a full face) -- or put
 *              on the cursor, so sweeping the pointer drags daylight
 *              across the planet and the cities light up behind it.
 *
 *  Imagery (three-globe's example assets on unpkg, CORS-enabled):
 *    earth-blue-marble.jpg  NASA Blue Marble, day colour
 *    earth-night.jpg        NASA Black Marble, city lights
 *    earth-water.png        ocean mask, drives the sun glint
 *    earth-topology.png     elevation, drives the relief
 *    clouds.png             cloud cover (from turban/webgl-earth)
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 * ------------------------------------------------------------------ */

export interface TerraLook {
    /** Cloud cover, 0–10. 5 is the satellite image as taken. */
    clouds: number
    /** City lights on the night side, 0–10. */
    lights: number
    /** Colour of the haze, limb and glow. */
    atmosphere: string
}

export interface TerraDuskProps {
    /** Your own equirectangular (2:1) day map. Empty uses NASA Blue Marble. */
    map?: string | { src?: string }
    background?: string
    /** Star field density, 0–10. */
    stars?: number
    /** Globe diameter in px. */
    size?: number
    look?: Partial\u003cTerraLook\u003e
    /** Drag to spin, with momentum. */
    drag?: boolean
    /** How far the globe turns to face the pointer, 0–10; 0 = still. */
    hover?: number
    /** Where the sunlight comes from: Sun Angle and Daylight, or the cursor. */
    sun?: "fixed" | "cursor"
    /** Direction the sunlight comes from, round the disc, in degrees (180 = left, 90 = top). */
    sunAngle?: number
    /** Share of the visible disc in daylight, in %. 50 puts the sun side-on; 100 behind the viewer; 0 behind the globe. */
    daylight?: number
    /** How fast the globe turns, 0–10. 5 = one turn a minute. */
    speed?: number
    style?: CSSProperties
}

const DEFAULTS = {
    background: "#02040A",
    stars: 5,
    size: 520,
    drag: true,
    hover: 6.8,
    sun: "cursor",
    sunAngle: 181,
    daylight: 87,
    speed: 9.4,
}
const DEFAULT_LOOK: TerraLook = { clouds: 5, lights: 5, atmosphere: "#4F9BFF" }

// The look, fixed in code: each has one right answer.
const ASSETS = "https://unpkg.com/three-globe@2.31.0/example/"
const DAY_SRC = ASSETS + "img/earth-blue-marble.jpg"
const NIGHT_SRC = ASSETS + "img/earth-night.jpg"
const WATER_SRC = ASSETS + "img/earth-water.png"
const TOPO_SRC = ASSETS + "img/earth-topology.png"
const CLOUD_SRC = ASSETS + "clouds/clouds.png"
const TEX_W = 2048 // every map is resampled to this, so mipmaps work and memory stays bounded
const TEX_H = 1024
const NIGHT_W = 4096 // city lights are points: halving them smears towns into blobs, so the night map keeps its full size
const AXIAL_TILT = (23.44 * Math.PI) / 180 // the Earth's own
const PERIOD_S = 60 // seconds per turn at Speed 5
const CLOUD_DRIFT = 0.012 // clouds' slide against the ground, rad/s at Speed 5
const CURSOR_SUN_Z = 0.55 // with the sun on the cursor, how far in front of the globe it sits
const MAX_PITCH = 1.1 // rad; past this the poles take over the view
const INERTIA_S = 0.9 // time constant of the coast after a fling
const PITCH_RETURN_S = 1.6 // drag tilt eases back to level over this
const HOVER_TURN = 0.2 // rad the globe turns at Hover 5, pointer at the frame's edge (≈11°)
const HOVER_SOFT = 1.4 // tanh knee: the turn eases off toward the edges instead of stopping dead
const HOVER_LIFT = 0.025 // the globe grows by this share while the pointer is on it
const HOVER_K = 60 // spring stiffness, 1/s²
const HOVER_C = 11 // spring damping, 1/s: ζ ≈ 0.7, one small overshoot then still
const STAR_PARALLAX = 0.35 // star drift, in radii per radian of turn
const FADE_S = 0.6 // maps fade in as they arrive
const MAX_PIXELS = 5e6 // device-pixel budget for the canvas

const TAU = Math.PI * 2
const clamp = (v: number, a: number, b: number) =\u003e (v \u003c a ? a : v \u003e b ? b : v)

// ── image loading: resampled to TEX_W×TEX_H, cached per URL ──
type Pix = {
    state: "loading" | "ready" | "failed"
    canvas: HTMLCanvasElement | null
    /** One channel, kept for the packed aux texture. */
    chan: Uint8Array | null
}
const PIX_CACHE = new Map\u003cstring, Pix\u003e()

/** `channel` \u003c 0 keeps the canvas for upload; otherwise extracts that channel. */
function loadPix(src: string, channel: number, width = TEX_W): Pix {
    const key = src + "#" + channel + "@" + width
    const hit = PIX_CACHE.get(key)
    if (hit) return hit
    const e: Pix = { state: "loading", canvas: null, chan: null }
    PIX_CACHE.set(key, e)
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.decoding = "async"
    img.onload = () =\u003e {
        try {
            const cv = document.createElement("canvas")
            cv.width = width
            cv.height = width / 2
            const cx = cv.getContext("2d")
            if (!cx) throw new Error("no 2d")
            cx.imageSmoothingQuality = "high"
            cx.drawImage(img, 0, 0, width, width / 2)
            // Throws if the host sent no CORS header: WebGL could not read it either.
            const data = cx.getImageData(0, 0, channel \u003c 0 ? 1 : TEX_W, channel \u003c 0 ? 1 : TEX_H).data
            if (channel \u003c 0) e.canvas = cv
            else {
                const out = new Uint8Array(TEX_W * TEX_H)
                for (let i = 0; i \u003c out.length; i++) out[i] = data[i * 4 + channel]
                e.chan = out
            }
            e.state = "ready"
        } catch {
            e.state = "failed"
        }
    }
    img.onerror = () =\u003e {
        e.state = "failed"
    }
    img.src = src
    return e
}

const imageSrc = (v: TerraDuskProps["map\