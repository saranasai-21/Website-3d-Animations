// Pure Vanilla WebGL Interactive Earth Globe Engine
"use client";var v=new Proxy({},{get:(n,t)=>String(t).toLowerCase()});function Qe(n,t){if(typeof n=="function")try{n.propertyControls=t}catch{}}function Je(n){let t=Se(n);return{__rgba:t,toValue(){return t?pt(t):String(n)},toString(){return this.toValue()},toHexString(){return t?gt(t):String(n)},toRgbString(){return this.toValue()}}}Je.toHsl=n=>{let t=Se(n&&n.__rgba?n.__rgba:n)||{r:0,g:0,b:0,a:1};return _t(t)};Je.toRgb=n=>{let t=Se(n&&n.__rgba?n.__rgba:n)||{r:0,g:0,b:0,a:1};return{r:t.r,g:t.g,b:t.b,a:t.a}};function Se(n){if(n==null)return null;if(typeof n=="object")return"__rgba"in n?n.__rgba:"r"in n?{r:+n.r,g:+n.g,b:+n.b,a:n.a==null?1:+n.a}:"h"in n?Ze(n):null;let t=String(n).trim(),o;if(o=t.match(/^#([0-9a-fA-F]{3,8})$/)){let a=o[1];return(a.length===3||a.length===4)&&(a=a.split("").map(u=>u+u).join("")),{r:parseInt(a.slice(0,2),16),g:parseInt(a.slice(2,4),16),b:parseInt(a.slice(4,6),16),a:a.length===8?parseInt(a.slice(6,8),16)/255:1}}if(o=t.match(/^rgba?\(([^)]+)\)$/i)){let a=o[1].split(/[,\/\s]+/).filter(Boolean).map(parseFloat);return{r:a[0],g:a[1],b:a[2],a:a[3]==null?1:a[3]}}if(o=t.match(/^hsla?\(([^)]+)\)$/i)){let a=o[1].split(/[,\/\s]+/).filter(Boolean).map(parseFloat);return Ze({h:a[0],s:a[1],l:a[2],a:a[3]==null?1:a[3]})}return null}function y(n,t){return Math.max(0,Math.min(t,n))}function pt(n){let t=n.a==null?1:n.a,o=Math.round(y(n.r,255)),a=Math.round(y(n.g,255)),u=Math.round(y(n.b,255));return t>=1?"rgb("+o+", "+a+", "+u+")":"rgba("+o+", "+a+", "+u+", "+t+")"}function gt(n){let t=o=>y(Math.round(o),255).toString(16).padStart(2,"0");return"#"+t(n.r)+t(n.g)+t(n.b)+(n.a==null||n.a>=1?"":t(n.a*255))}function _t(n){let t=y(n.r,255)/255,o=y(n.g,255)/255,a=y(n.b,255)/255,u=Math.max(t,o,a),l=Math.min(t,o,a),s=0,r=0,c=(u+l)/2,d=u-l;return d!==0&&(r=c>.5?d/(2-u-l):d/(u+l),u===t?s=(o-a)/d+(o<a?6:0):u===o?s=(a-t)/d+2:s=(t-o)/d+4,s*=60),{h:s,s:r*100,l:c*100,a:n.a==null?1:n.a}}function Ze(n){let t=(n.h%360+360)%360/360,o=y(n.s,100)/100,a=y(n.l,100)/100,u=(c,d,i)=>(i<0&&(i+=1),i>1&&(i-=1),i<1/6?c+(d-c)*6*i:i<1/2?d:i<2/3?c+(d-c)*(2/3-i)*6:c),l,s,r;if(o===0)l=s=r=a;else{let c=a<.5?a*(1+o):a+o-a*o,d=2*a-c;l=u(d,c,t+1/3),s=u(d,c,t),r=u(d,c,t-1/3)}return{r:l*255,g:s*255,b:r*255,a:n.a==null?1:n.a}}var _={background:"#02040A",stars:5,size:520,drag:!0,hover:6.8,sun:"cursor",sunAngle:181,daylight:87,speed:9.4},Et={clouds:5,lights:5,atmosphere:"#4F9BFF"},j="https://unpkg.com/three-globe@2.31.0/example/",tt=j+"img/earth-blue-marble.jpg",nt=j+"img/earth-night.jpg",xt=j+"img/earth-water.png",vt=j+"img/earth-topology.png",Rt=j+"clouds/clouds.png",B=2048,z=1024,bt=4096,Tt=23.44*Math.PI/180,St=60,yt=.012,At=.55,se=1.1,Lt=.9,wt=1.6,at=.2,ot=1.4,Ct=.025,Ae=60,Le=11,rt=.35,Mt=.6,st=5e6,It=Math.PI*2,D=(n,t,o)=>n<t?t:n>o?o:n,it=new Map;function X(n,t,o=B){let a=n+"#"+t+"@"+o,u=it.get(a);if(u)return u;let l={state:"loading",canvas:null,chan:null};it.set(a,l);let s=new Image;return s.crossOrigin="anonymous",s.decoding="async",s.onload=()=>{try{let r=document.createElement("canvas");r.width=o,r.height=o/2;let c=r.getContext("2d");if(!c)throw new Error("no 2d");c.imageSmoothingQuality="high",c.drawImage(s,0,0,o,o/2);let d=c.getImageData(0,0,t<0?1:B,t<0?1:z).data;if(t<0)l.canvas=r;else{let i=new Uint8Array(B*z);for(let h=0;h<i.length;h++)i[h]=d[h*4+t];l.chan=i}l.state="ready"}catch{l.state="failed"}},s.onerror=()=>{l.state="failed"},s.src=n,l}var Dt=n=>typeof n=="string"?n:n&&typeof n.src=="string"?n.src:"",ut=new Map;function Ot(n){let t=ut.get(n);if(t)return t;let o=[0,0,0],a=(n||"").trim();if(a.startsWith("var(")&&(a=a.slice(a.indexOf(",")+1)),a[0]==="#"){let u=a.slice(1);(u.length===3||u.length===4)&&(u=u.split("").map(s=>s+s).join(""));let l=parseInt(u.slice(0,6),16);isNaN(l)||(o=[l>>16&255,l>>8&255,l&255])}else{let u=a.match(/[\d.]+/g);u&&u.length>=3&&(o=[+u[0],+u[1],+u[2]])}return ut.set(n,o),o}var ie=(n,t)=>n.map(o=>[0,1,2].map(a=>o[0]*t[0][a]+o[1]*t[1][a]+o[2]*t[2][a])),Me=n=>[[1,0,0],[0,Math.cos(n),-Math.sin(n)],[0,Math.sin(n),Math.cos(n)]],Ie=n=>[[Math.cos(n),0,Math.sin(n)],[0,1,0],[-Math.sin(n),0,Math.cos(n)]],Pt=n=>[[Math.cos(n),-Math.sin(n),0],[Math.sin(n),Math.cos(n),0],[0,0,1]],we=(n,t)=>[0,1,2].map(o=>n[o][0]*t[0]+n[o][1]*t[1]+n[o][2]*t[2]),Ut=(n,t)=>ie(Ie(n),Me(-t));function Nt(n,t,o,a){let u=o[0].map((s,r)=>o.map(c=>c[r])),l=ie(ie(ie(Ie(-n),Me(-t)),Pt(-Tt)),u);for(let s=0;s<3;s++)for(let r=0;r<3;r++)a[s*3+r]=l[r][s]}var Ft=`
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`,Ht=`
#ifdef GL_OES_standard_derivatives
#extension GL_OES_standard_derivatives : enable
#endif
precision highp float;
uniform vec2 uCenter;      // globe centre, device px (y up)
uniform float uRadius;     // globe radius, device px
uniform float uDpr;
uniform mat3 uRot;         // view -> globe
uniform float uCloudRot;   // clouds' drift against the ground, radians
uniform vec3 uLight;       // toward the sun, view space
uniform vec3 uAtmo;        // linear
uniform float uClouds;     // cover multiplier, 1 = as photographed
uniform float uLights;     // city-light multiplier
uniform float uStars;      // 0..1
uniform float uTime;
uniform vec2 uStarShift;   // device px
uniform vec4 uHave;        // fade-ins: day, night, ground (water+relief), clouds
uniform sampler2D uDay;
uniform sampler2D uNight;
uniform sampler2D uAux;    // r water, g elevation, b cloud

const float PI = 3.14159265;
const float TAU = 6.28318531;
const float GLOW = 0.07;         // halo outside the limb, in radii
const float BUMP = 2.2;          // relief strength
const float SHADOW_REACH = 0.012;// how far toward the sun a cloud's shadow falls
const float EXPOSURE = 1.7;
const vec3 MOON = vec3(0.008, 0.012, 0.024);  // moonlight on the night side, linear
const float STAR_CELL = 7.0;     // CSS px per star cell
const float STAR_SHARE = 0.16;   // share of cells holding a star at full Stars

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

// Equirectangular lookup without the date-line seam (Tarini 2012): of two
// parameterisations whose wraps sit half a turn apart, use whichever is
// continuous across this pixel quad, so the mip level never jumps.
vec2 equi(vec3 q, float shift) {
    float u1 = fract(atan(q.x, q.z) / TAU + 0.5 + shift);
    float u2 = fract(u1 + 0.5) - 0.5;
#ifdef GL_OES_standard_derivatives
    float u = fwidth(u1) < fwidth(u2) - 0.001 ? u1 : u2;
#else
    float u = u1;
#endif
    return vec2(u, acos(clamp(q.y, -1.0, 1.0)) / PI);
}

void main() {
    vec2 frag = gl_FragCoord.xy;
    vec2 p = (frag - uCenter) / uRadius;
    float r = length(p);
    vec2 s = r > 0.999 ? p / r * 0.999 : p;
    vec3 n = vec3(s, sqrt(max(0.0, 1.0 - dot(s, s))));   // view space
    vec3 q = uRot * n;                                     // globe space
    vec3 L = uRot * uLight;
    vec3 H = uRot * normalize(uLight + vec3(0.0, 0.0, 1.0));
    float cl = max(length(q.xz), 1e-4);
    vec3 east = vec3(q.z, 0.0, -q.x) / cl;
    vec3 north = cross(q, east);

    // Every lookup happens up here, in uniform control flow, so the
    // implicit derivatives that pick mip levels are well defined.
    vec2 uv = equi(q, 0.0);
    vec2 uvc = equi(q, -uCloudRot / TAU);
    vec3 day = texture2D(uDay, uv).rgb;
    vec3 night = texture2D(uNight, uv).rgb;
    float nightGlow = texture2D(uNight, uv, 3.0).r;   // a few mips down: the same lights, blurred
    vec4 aux = texture2D(uAux, uv);
    float hE = texture2D(uAux, uv + vec2(1.5 / 2048.0, 0.0)).g;
    float hN = texture2D(uAux, uv - vec2(0.0, 1.5 / 1024.0)).g;
    vec2 toSun = vec2(dot(L, east) / (TAU * cl), -dot(L, north) / PI) * SHADOW_REACH;
    float cloud = texture2D(uAux, uvc).b;
    float shadow = texture2D(uAux, uvc + toSun).b;

    float water = aux.r * uHave.z;
    float dry = 1.0 - water;
    vec3 nb = normalize(q - BUMP * uHave.z * dry * ((hE - aux.g) * east + (hN - aux.g) * north));
    float ndlS = dot(q, L);            // smooth sphere: the terminator
    float ndl = dot(nb, L);            // with relief: the land's own slopes
    float mu = n.z;
    // The sun reddens as it grazes the terminator.
    vec3 sun = mix(vec3(1.0, 0.45, 0.22), vec3(1.0), smoothstep(0.0, 0.3, ndlS));

    vec3 alb = mix(vec3(0.010, 0.016, 0.030), pow(day, vec3(2.2)), uHave.x);
    float diff = max(ndl, 0.0) * smoothstep(-0.08, 0.12, ndlS);
    vec3 col = alb * sun * diff;

    // Glint on open water: a tight core and a broad sheen.
    float nh = max(dot(q, H), 0.0);
    col += sun * water * (pow(nh, 240.0) * 0.22 + pow(nh, 24.0) * 0.025) * smoothstep(0.0, 0.25, ndlS);

    float cov = clamp(cloud * uClouds, 0.0, 1.0) * uHave.w;
    float shade = clamp(shadow * uClouds, 0.0, 1.0) * uHave.w;
    col *= 1.0 - 0.55 * shade;

    float dark = 1.0 - smoothstep(-0.16, 0.06, ndlS);
    // Moonlight: the night side is never quite black from orbit -- coasts,
    // deserts and cloud tops stay faintly readable in a cold blue.
    col += alb * MOON * dark;

    // City lights. The night map's land, ice and sea are blue-grey and its
    // cities are the only warm pixels, so red alone picks them out. It is
    // read as brightness, not cut at a threshold: suburbs fade into the dark
    // the way they do in orbital photographs, sparse towns burn sodium
    // orange, and only the dense cores run hot enough to whiten. A blurred
    // copy adds the haze city light makes in the air above it, and a long
    // path through the atmosphere near the limb dims the lot.
    float li = clamp((night.r - 0.035) / 0.40, 0.0, 1.0);
    float lg = clamp((nightGlow - 0.035) / 0.40, 0.0, 1.0);
    vec3 lamp = mix(vec3(1.0, 0.46, 0.13), vec3(1.0, 0.84, 0.62), smoothstep(0.35, 0.9, li));
    vec3 city = lamp * li * li * 2.4 + vec3(1.0, 0.42, 0.12) * lg * 0.45;
    col += city * uLights * dark * (1.0 - 0.85 * cov) * (0.35 + 0.65 * mu) * uHave.y;

    float cdiff = smoothstep(-0.12, 0.25, ndlS) * (0.2 + 0.8 * max(ndlS, 0.0));
    col = mix(col, vec3(0.92, 0.94, 0.97) * (sun * cdiff + MOON * dark), cov);

    // Atmosphere: haze thickens toward the limb, a bright limb line on the
    // lit side, and an orange band where the terminator meets the edge.
    float lit = smoothstep(-0.35, 0.5, ndlS);
    float rim = 1.0 - mu;
    col = mix(col, uAtmo * 0.35 * lit, pow(rim, 3.0) * 0.55);
    col += uAtmo * (pow(rim, 1.6) * 0.05 + pow(rim, 6.0) * 0.8) * lit;
    col += vec3(1.0, 0.38, 0.12) * pow(rim, 3.0) * exp(-ndlS * ndlS / 0.012) * 0.22;

    float ia = clamp((1.0 - r) * uRadius + 0.5, 0.0, 1.0);
    float t = max(r - 1.0, 0.0) / GLOW;
    float halo = exp(-t * 3.5) * (1.0 - smoothstep(0.0, 1.0, t));
    float hl = smoothstep(-0.5, 0.7, dot(vec3(p / max(r, 1e-4), 0.0), uLight));
    vec3 lin = col * ia + uAtmo * halo * hl * 0.9 * (1.0 - ia);

    // ACES filmic roll-off, then display gamma.
    vec3 x = lin * EXPOSURE;
    vec3 rgb = pow(clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0), vec3(1.0 / 2.2));

    if (uStars > 0.0) {
        vec2 sp = (frag + uStarShift) / (STAR_CELL * uDpr);
        vec2 id = floor(sp);
        float h0 = hash(id);
        if (h0 < uStars * STAR_SHARE) {
            vec2 pos = vec2(hash(id + 17.3), hash(id + 41.9)) * 0.7 + 0.15;
            float d = length(fract(sp) - pos) * STAR_CELL;
            float mag = pow(hash(id + 7.1), 5.0);
            float tw = 0.7 + 0.3 * sin(uTime * (0.6 + 2.0 * hash(id + 3.3)) + h0 * 80.0);
            float star = exp(-d * d / (0.25 + 0.6 * mag)) * (0.15 + 0.85 * mag) * tw;
            rgb += vec3(star) * (1.0 - ia) * (1.0 - clamp(halo * 1.5, 0.0, 1.0));
        }
    }
    // Premultiplied: glow and stars add over whatever Background is.
    gl_FragColor = vec4(rgb, max(ia, max(rgb.r, max(rgb.g, rgb.b))));
}`;function Vt(n){let t=n.getContext("webgl",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1});if(!t)return null;t.getExtension("OES_standard_derivatives");let o=t.getExtension("EXT_texture_filter_anisotropic"),a=(i,h)=>{let x=t.createShader(i);return x?(t.shaderSource(x,h),t.compileShader(x),t.getShaderParameter(x,t.COMPILE_STATUS)?x:(console.warn("TerraDusk:",t.getShaderInfoLog(x)),null)):null},u=a(t.VERTEX_SHADER,Ft),l=a(t.FRAGMENT_SHADER,Ht),s=t.createProgram();if(!u||!l||!s||(t.attachShader(s,u),t.attachShader(s,l),t.linkProgram(s),!t.getProgramParameter(s,t.LINK_STATUS)))return null;t.useProgram(s),t.bindBuffer(t.ARRAY_BUFFER,t.createBuffer()),t.bufferData(t.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),t.STATIC_DRAW);let r=t.getAttribLocation(s,"aPos");t.enableVertexAttribArray(r),t.vertexAttribPointer(r,2,t.FLOAT,!1,0,0);let c={};for(let i of["uCenter","uRadius","uDpr","uRot","uCloudRot","uLight","uAtmo","uClouds","uLights","uStars","uTime","uStarShift","uHave","uDay","uNight","uAux"])c[i]=t.getUniformLocation(s,i);let d=[];for(let i=0;i<3;i++){let h=t.createTexture();t.activeTexture(t.TEXTURE0+i),t.bindTexture(t.TEXTURE_2D,h),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,1,1,0,t.RGBA,t.UNSIGNED_BYTE,new Uint8Array([0,0,0,255])),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.REPEAT),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR_MIPMAP_LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),o&&t.texParameterf(t.TEXTURE_2D,o.TEXTURE_MAX_ANISOTROPY_EXT,8),d.push(h)}return t.uniform1i(c.uDay,0),t.uniform1i(c.uNight,1),t.uniform1i(c.uAux,2),{gl:t,u:c,tex:d,held:["","",""]}}function lt(n,t,o){let{gl:a}=n;a.activeTexture(a.TEXTURE0+t),a.bindTexture(a.TEXTURE_2D,n.tex[t]),o instanceof Uint8Array?a.texImage2D(a.TEXTURE_2D,0,a.RGBA,B,z,0,a.RGBA,a.UNSIGNED_BYTE,o):a.texImage2D(a.TEXTURE_2D,0,a.RGBA,a.RGBA,a.UNSIGNED_BYTE,o),a.generateMipmap(a.TEXTURE_2D)}var Ce=new Map;function kt(n,t,o,a){let u=Ce.get(a);if(u)return u;let l=new Uint8Array(B*z*4);for(let s=0,r=0;s<B*z;s++,r+=4)l[r]=n?n[s]:0,l[r+1]=t?t[s]:0,l[r+2]=o?o[s]:0,l[r+3]=255;return Ce.clear(),Ce.set(a,l),l}

export function mountTerraDusk(container, userOptions = {}) {
  if (!container) return () => {};
  
  const opts = { ..._, ...userOptions };
  const s = { current: opts };

  if (getComputedStyle(container).position === 'static') {
    container.style.position = 'relative';
  }
  container.style.overflow = 'hidden';
  if (userOptions.background) container.style.background = userOptions.background;
  container.style.cursor = (opts.drag !== false) ? 'grab' : 'default';
  container.style.touchAction = 'pan-y';

  let c = container.querySelector('canvas');
  if (!c) {
    c = document.createElement('canvas');
    c.style.position = 'absolute';
    c.style.inset = '0';
    c.style.width = '100%';
    c.style.height = '100%';
    c.style.display = 'block';
    c.style.pointerEvents = 'none';
    container.appendChild(c);
  }

  let r = container;
  let d=Vt(c);if(!d)return;let{gl:i,u:h}=d,x=0,A=0,b=1,De=()=>{x=r.offsetWidth,A=r.offsetHeight,b=Math.min(2,window.devicePixelRatio||1),x*A*b*b>st&&(b=Math.sqrt(st/Math.max(1,x*A))),c.width=Math.max(1,Math.round(x*b)),c.height=Math.max(1,Math.round(A*b))};De();let Oe=new ResizeObserver(De);Oe.observe(r);let O=typeof window.matchMedia=="function"?window.matchMedia("(prefers-reduced-motion: reduce)"):null,C=!!(O&&O.matches),Pe=()=>{C=!!(O&&O.matches)};O?.addEventListener?.("change",Pe);let L=0,w=0,P=!1,T=1,M=!1,ue=-1,le=0,ce=0,Y=0,de=0,U=0,N=0,F=0,Ue=E=>{let p=r.getBoundingClientRect();L=(E.clientX-p.left)*(p.width?x/p.width:1),w=(E.clientY-p.top)*(p.height?A/p.height:1)},K=E=>{if(Ue(E),P=!0,!M||E.pointerId!==ue)return;let p=performance.now(),R=Math.max(.001,(p-Y)/1e3),k=(L-le)/T,I=(w-ce)/T;de+=k,U=D(U+I,-se,se),N+=(k/R-N)*.4,F+=(I/R-F)*.4,le=L,ce=w,Y=p},Ne=()=>{M||(P=!1)},Fe=E=>{Ue(E),P=!0,!(!(s.current.drag??_.drag)||E.pointerType==="mouse"&&E.button!==0)&&(Math.hypot(L-x/2,w-A/2)>T*1.15||(M=!0,ue=E.pointerId,le=L,ce=w,Y=performance.now(),N=0,F=0,r.setPointerCapture?.(E.pointerId),r.style.cursor="grabbing"))},$=E=>{!M||E.pointerId!==ue||(M=!1,performance.now()-Y>80&&(N=0,F=0),r.style.cursor="",E.type==="pointercancel"&&(P=!1))};r.addEventListener("pointermove",K),r.addEventListener("pointerenter",K),r.addEventListener("pointerleave",Ne),r.addEventListener("pointerdown",Fe),r.addEventListener("pointerup",$),r.addEventListener("pointercancel",$);let He=new Float32Array(9),H=[0,0,0,0],fe=-1,Ve=0,ke=0,me=0,m={x:0,vx:0,y:0,vy:0,lift:0,vl:0},V=NaN,W=0,q=0,Ge="",Xe=E=>{me=requestAnimationFrame(Xe);let p=fe<0?0:Math.min(.05,(E-fe)/1e3);if(fe=E,x<2||A<2)return;let R=s.current,k={...Et,...R.look};Ve+=p;let I=Dt(R.map),Z=I?X(I,-1):null,Be=Z&&Z.state!=="failed"?I:tt;[[Be===I&&Z?Z:X(tt,-1),Be],[X(nt,-1,bt),nt]].forEach(([f,S],Te)=>{f.state==="ready"&&f.canvas&&d.held[Te]!==S&&(lt(d,Te,f.canvas),d.held[Te]=S)});let he=X(xt,0),We=X(vt,0),pe=X(Rt,3),Q=[he,We,pe].map(f=>f.state==="ready"?1:0).join("");Q!==Ge&&Q!=="000"&&(lt(d,2,kt(he.chan,We.chan,pe.chan,Q)),Ge=Q);let dt=[d.held[0]?1:0,d.held[1]?1:0,he.chan?1:0,pe.chan?1:0],ft=1-Math.exp(-p/Mt);for(let f=0;f<4;f++)H[f]+=(dt[f]-H[f])*ft;let qe=Math.max(0,R.speed??_.speed)/5,mt=C?0:It*qe/St;if(!M){let f=Math.exp(-p/Lt);de+=(mt+(C?0:N))*p,U=D(U+(C?0:F)*p,-se,se),N*=f,F*=f,U*=Math.exp(-p/wt)}ke+=p*qe*yt*(C?0:1);let J=x/2,ee=A/2;T=Math.max(20,R.size==="auto"?Math.min(312,Math.min(x,A)*.84)/2:Math.min((R.size??_.size)/2,Math.min(x,A)*.44));let te=C?0:Math.max(0,R.hover??_.hover)/5,ze=f=>Math.tanh(ot*D(f,-1.5,1.5))/Math.tanh(ot),ge=0,_e=0,Ee=0;M?(ge=m.x,_e=m.y,Ee=1):P&&te>0&&(ge=ze((L-J)/Math.max(1,J))*at*te,_e=-ze((w-ee)/Math.max(1,ee))*at*te,Ee=Math.hypot(L-J,w-ee)<T*1.1?1:0);let je=Math.ceil(p*120);for(let f=0;f<je;f++){let S=p/je;m.vx+=(Ae*(ge-m.x)-Le*m.vx)*S,m.x+=m.vx*S,m.vy+=(Ae*(_e-m.y)-Le*m.vy)*S,m.y+=m.vy*S,m.vl+=(Ae*(Ee-m.lift)-Le*m.vl)*S,m.lift+=m.vl*S}let Ye=Ut(m.x,m.y);Nt(de,U,Ye,He);let ht=T*(1+Ct*m.lift*Math.min(1,te)),Ke=(R.sunAngle??_.sunAngle)*Math.PI/180,xe=D((R.daylight??_.daylight)/50-1,-.98,1),$e=Math.sqrt(1-xe*xe),ne=Math.cos(Ke)*$e,ae=Math.sin(Ke)*$e,oe=xe;if((R.sun??_.sun)==="cursor"&&P){let f=we(Me(m.y),we(Ie(-m.x),[D((L-J)/T,-2.5,2.5),D(-(w-ee)/T,-2.5,2.5),At]));ne=f[0],ae=f[1],oe=f[2]}let G=Math.hypot(ne,ae,oe);if(isNaN(V))V=ne/G,W=ae/G,q=oe/G;else{let f=1-Math.exp(-p/.35);V+=(ne/G-V)*f,W+=(ae/G-W)*f,q+=(oe/G-q)*f}let ve=Math.hypot(V,W,q)||1,Re=we(Ye,[V/ve,W/ve,q/ve]),be=Ot(k.atmosphere);i.viewport(0,0,c.width,c.height),i.clearColor(0,0,0,0),i.clear(i.COLOR_BUFFER_BIT),i.uniform2f(h.uCenter,c.width/2,c.height/2),i.uniform1f(h.uRadius,ht*b),i.uniform1f(h.uDpr,b),i.uniformMatrix3fv(h.uRot,!1,He),i.uniform1f(h.uCloudRot,ke),i.uniform3f(h.uLight,Re[0],Re[1],Re[2]),i.uniform3f(h.uAtmo,(be[0]/255)**2.2,(be[1]/255)**2.2,(be[2]/255)**2.2),i.uniform1f(h.uClouds,Math.max(0,k.clouds)/5),i.uniform1f(h.uLights,Math.max(0,k.lights)/5),i.uniform1f(h.uStars,D((R.stars??_.stars)/10,0,1)),i.uniform1f(h.uTime,C?0:Ve),i.uniform2f(h.uStarShift,m.x*T*b*rt,m.y*T*b*rt),i.uniform4f(h.uHave,H[0],H[1],H[2],H[3]),i.drawArrays(i.TRIANGLE_STRIP,0,4)};

  me = requestAnimationFrame(Xe);

  return function cleanup() {
    cancelAnimationFrame(me);
    Oe.disconnect();
    i.getExtension("WEBGL_lose_context")?.loseContext();
    O?.removeEventListener?.("change", Pe);
    r.removeEventListener("pointermove", K);
    r.removeEventListener("pointerenter", K);
    r.removeEventListener("pointerleave", Ne);
    r.removeEventListener("pointerdown", Fe);
    r.removeEventListener("pointerup", $);
    r.removeEventListener("pointercancel", $);
  };
}
