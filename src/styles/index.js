// Built-in visual styles.
//
// Each style is a fragment shader over one full-screen quad that implements
// `vec3 render(vec2 p, vec2 uv)` — p is centred and aspect-corrected, uv is
// 0..1. The common prelude below supplies the uniforms, the seed-derived
// cosine palette and the usual noise helpers.

const COMMON = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform vec2  uRes;
uniform float uTime;
uniform vec4  uSeed;
uniform vec3  uPalA, uPalB, uPalC, uPalD;
uniform float uKick, uSnare, uHat, uBass, uPad, uArp, uLead, uStab;
uniform float uEnergy, uBeat, uBar, uBarIndex;
uniform float uSpb;        // seconds per beat, for effects that land on the beat
uniform float uPixAspect;  // 2.0 for fat-pixel eras, so shapes stay round

const float PI = 3.14159265;

vec3 pal(float t) { return uPalA + uPalB * cos(6.28318 * (uPalC * t + uPalD)); }
// the palette can dip below zero: a colour about to be brought to full brightness is clipped there, and lifted
// only where it would otherwise be black, so every other colour keeps the seed's own hue and strength
vec3 unblack(vec3 c) { c = max(c, vec3(0.0)); return c + max(0.0, 0.15 - max(max(c.r, c.g), c.b)); }

mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x),
             mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * vnoise(p); p *= 2.02; a *= 0.5; }
  return v;
}

// distance to a line segment: the vector-display primitive
float sdSeg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  return length(pa - ba * h);
}

// a seven-segment digit in a 1 x 2 box (q in 0..1, 0..2), for scoreboards
float digit7(vec2 q, int d) {
  const int M[10] = int[10](63, 6, 91, 79, 102, 109, 125, 7, 127, 111);
  int m = M[d];
  float v = 0.0;
  vec2 A[7] = vec2[7](vec2(0.15, 1.85), vec2(0.9, 1.8), vec2(0.9, 0.95), vec2(0.15, 0.15),
                      vec2(0.1, 0.95), vec2(0.1, 1.8), vec2(0.15, 1.0));
  vec2 B[7] = vec2[7](vec2(0.85, 1.85), vec2(0.9, 1.05), vec2(0.9, 0.2), vec2(0.85, 0.15),
                      vec2(0.1, 0.2), vec2(0.1, 1.05), vec2(0.85, 1.0));
  for (int i = 0; i < 7; i++) {
    if ((m & (1 << i)) != 0) v = max(v, 1.0 - smoothstep(0.08, 0.14, sdSeg(q, A[i], B[i])));
  }
  return v;
}

vec3 render(vec2 p, vec2 uv);

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  p.x *= uPixAspect;
  fragColor = vec4(max(render(p, vUv), 0.0), 1.0);
}
`;

const plasma = `
// Classic multi-sine plasma with a cycling palette and raster bars over it.
vec3 render(vec2 p, vec2 uv) {
  float t = uTime * 0.35 + uSeed.x * 10.0;
  vec2 q = p * (1.55 + 0.25 * sin(t * 0.3));
  q *= 1.0 - 0.13 * uKick;
  q *= rot(sin(t * 0.17) * 0.6 + uTime * 0.05);

  float v = 0.0;
  v += sin(q.x * 6.0 + t * 1.3);
  v += sin(q.y * 5.3 - t * 1.1);
  v += sin((q.x + q.y) * 4.1 + t * 0.7);
  v += sin(length(q * vec2(1.0, 1.3) + vec2(sin(t * 0.4), cos(t * 0.33))) * 7.0 - t * 2.0);
  v += 1.6 * sin(length(q - vec2(sin(t * 0.6) * 0.5, cos(t * 0.5) * 0.4)) * 9.0 + t * 1.7);
  v *= 0.2;

  float band = v + uBass * 0.22 + uTime * 0.06 + uSeed.y;
  vec3 col = pal(band);

  // contour banding, the way an 8-bit palette used to quantise
  float lines = smoothstep(0.42, 0.52, fract(v * 4.0 + uTime * 0.3));
  col = mix(col, col * 1.45 + 0.06, lines * 0.3);

  float bars = sin(uv.y * 150.0 + uTime * 3.0) * 0.5 + 0.5;
  col += pal(band + 0.35) * pow(bars, 8.0) * 0.22 * (0.3 + uSnare);
  col += uKick * 0.22 * pal(band + 0.5);
  return col * (0.72 + 0.5 * uEnergy);
}
`;

const tunnel = `
// Texture-mapped tunnel: polar unwrap, twist, fog, beat-driven zoom.
vec3 render(vec2 p, vec2 uv) {
  float t = uTime;
  p *= rot(t * 0.15 + sin(t * 0.27) * 0.4);
  p += 0.1 * vec2(sin(t * 0.5), cos(t * 0.43));
  p *= 1.0 - 0.16 * uKick;

  float r = length(p);
  float a = atan(p.y, p.x);
  float depth = 0.34 / (r + 0.02);
  float z = depth + t * 0.9 + uBass * 0.3;
  float ang = a / PI + sin(z * 0.35 + t * 0.2) * 0.3;

  vec2 tc = vec2(ang * 4.0, z);
  float chk = mod(floor(tc.x * 2.0) + floor(tc.y * 2.0), 2.0);
  vec2 cell = abs(fract(tc * 2.0) - 0.5);
  float grid = smoothstep(0.03, 0.12, min(cell.x, cell.y));
  float n = fbm(tc * 1.6 + uSeed.z * 20.0);

  vec3 col = pal(fract(z * 0.1 + uSeed.z + chk * 0.14));
  col *= 0.4 + 0.8 * grid;
  col *= 0.65 + 0.7 * n;
  col *= exp(-depth * 0.2);

  // the light at the end of it
  col += pal(uTime * 0.1 + 0.3) * smoothstep(0.38, 0.0, r) * (0.3 + uKick * 1.0);
  col += pal(0.6) * pow(max(0.0, 1.0 - r * 1.6), 6.0) * uSnare * 0.4;
  return col;
}
`;

const metaballs = `
// Metaball field with iso-banding — blobby 2D goo, the 90s intro staple.
// The blobs are deliberately fat and close in: the point is watching them
// merge and split, not watching six dots orbit.
vec3 render(vec2 p, vec2 uv) {
  float t = uTime;
  p *= 1.12;
  float f = 0.0;
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    float s = hash11(fi * 1.7 + uSeed.x * 31.0);
    float s2 = hash11(fi * 3.1 + uSeed.y * 17.0);
    vec2 c = vec2(sin(t * (0.30 + s * 0.42) + fi * 2.1 + uSeed.z * 6.28),
                  cos(t * (0.24 + s2 * 0.38) + fi * 1.7)) * vec2(0.54, 0.33);
    float rad = 0.165 + 0.085 * s + 0.05 * uKick + 0.02 * sin(t * 1.6 + fi);
    vec2 d = p - c;
    f += rad * rad / (dot(d, d) + 2e-4);
  }

  // background: the field well below the surface, as faint contour rings
  vec3 col = pal(fract(f * 0.22 + uTime * 0.04 + uSeed.y)) * 0.22;
  col += pal(fract(uSeed.y + 0.5)) * 0.04;

  // inside the surface: banded, like a palette-cycled fill
  float surf = smoothstep(0.88, 1.06, f);
  float iso = fract(f * 1.7 - uTime * 0.55);
  vec3 body = pal(fract(f * 0.26 + uTime * 0.05 + uSeed.y + 0.15));
  body *= 0.55 + 0.75 * smoothstep(0.0, 0.4, iso);
  col = mix(col, body * 1.25, surf);

  // the rim is what sells it
  col += pal(uTime * 0.07 + 0.5) * exp(-abs(f - 1.0) * 9.0) * (0.55 + uLead * 1.2);
  col += pal(0.15) * exp(-abs(f - 0.55) * 14.0) * (0.12 + uArp * 0.8);
  col += pal(0.75) * exp(-abs(f - 1.9) * 7.0) * (0.1 + uBass * 0.5);
  return col * (0.8 + 0.45 * uEnergy);
}
`;

const starfield = `
// Flying through stars with a drilled glenz solid turning in the middle.
float sdBox(vec3 p, vec3 b) {
  vec3 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}
float map(vec3 p) {
  p.xz *= rot(uTime * 0.5);
  p.xy *= rot(uTime * 0.31 + uSeed.x * 6.28);
  p.yz *= rot(uTime * 0.17);
  float d = max(sdBox(p, vec3(0.6)), length(p) - 0.79 - 0.03 * uKick);
  float r = 0.3 + 0.04 * uKick;
  float holes = min(min(length(p.xy) - r, length(p.yz) - r), length(p.xz) - r);
  return max(d, -holes);
}
vec3 nrm(vec3 p) {
  vec2 e = vec2(0.002, 0.0);
  return normalize(vec3(map(p + e.xyy) - map(p - e.xyy),
                        map(p + e.yxy) - map(p - e.yxy),
                        map(p + e.yyx) - map(p - e.yyx)));
}
float starLayer(vec2 g) {
  vec2 id = floor(g), f = fract(g) - 0.5;
  float h = hash12(id);
  if (h < 0.80) return 0.0;
  vec2 off = (hash22(id + 1.7) - 0.5) * 0.7;
  float d = length(f - off);
  return smoothstep(0.16, 0.0, d) * (0.35 + 0.65 * hash12(id + 3.1));
}
vec3 render(vec2 p, vec2 uv) {
  vec3 col = vec3(0.0);
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float z = fract(uTime * (0.055 + fi * 0.04) + fi * 0.37 + uSeed.w);
    float sc = mix(14.0, 1.1, z);
    float fade = smoothstep(0.0, 0.2, z) * smoothstep(1.0, 0.7, z);
    float s = starLayer(p * sc + fi * 23.0);
    col += pal(fract(0.15 * fi + uSeed.y + z * 0.3)) * s * fade * (0.4 + 1.0 * z);
  }
  col *= 0.9 + 0.5 * uHat;

  // the solid, raymarched and shaded additively like a glenz vector
  vec3 ro = vec3(0.0, 0.0, -2.4);
  vec3 rd = normalize(vec3(p * 1.25, 1.4));
  float tt = 0.0;
  float hit = 0.0;
  for (int i = 0; i < 72; i++) {
    vec3 pos = ro + rd * tt;
    float d = map(pos);
    if (d < 0.0015) { hit = 1.0; break; }
    tt += d * 0.85;
    if (tt > 5.0) break;
  }
  if (hit > 0.5) {
    vec3 pos = ro + rd * tt;
    vec3 n = nrm(pos);
    float fres = pow(1.0 - abs(dot(n, rd)), 2.5);
    float lam = 0.35 + 0.65 * max(0.0, dot(n, normalize(vec3(0.6, 0.8, -0.5))));
    vec3 c = pal(fract(0.5 + n.x * 0.25 + n.y * 0.2 + uTime * 0.07 + uSeed.z));
    col = mix(col, c * lam, 0.72);
    col += c * fres * (0.6 + 1.3 * uLead);
    col += pal(0.8) * pow(max(0.0, dot(reflect(rd, n), normalize(vec3(0.6, 0.8, -0.5)))), 24.0) * 0.6;
  }
  col += pal(0.4) * smoothstep(0.9, 0.0, length(p)) * uBass * 0.18;
  return col;
}
`;

const copper = `
// Copper bars over an endless perspective checkerboard — pure Amiga nostalgia.
// The bars are the hero: the floor and the sky stay dark so they can glow.
vec3 render(vec2 p, vec2 uv) {
  float t = uTime;
  float horizon = -0.05 + 0.035 * sin(t * 0.3);

  vec3 col;
  if (p.y < horizon) {
    // floor: classic 1/y projection scrolling towards the camera
    float z = 0.23 / (horizon - p.y + 0.004);
    vec2 fl = vec2(p.x * z * 1.4, z + t * 1.6);
    float chk = mod(floor(fl.x * 1.5) + floor(fl.y * 0.85), 2.0);
    col = mix(pal(uSeed.x), pal(uSeed.x + 0.3), chk);
    col *= exp(-z * 0.045) * (0.62 + 0.4 * uPad);
  } else {
    float sky = p.y - horizon;
    col = pal(fract(uSeed.y + 0.1 + sky * 0.5 + t * 0.02)) * (0.07 + 0.16 * exp(-sky * 3.2));
    vec2 g = (p + vec2(t * 0.015, 0.0)) * 26.0;
    vec2 id = floor(g);
    if (hash12(id) > 0.93) {
      col += vec3(0.75, 0.85, 1.0) * smoothstep(0.34, 0.0, length(fract(g) - 0.5))
           * (0.35 + 0.65 * hash12(id + 5.0));
    }
  }
  col += pal(0.6) * exp(-abs(p.y - horizon) * 30.0) * (0.22 + 0.6 * uBass);

  // eight copper bars, each with the metallic top-lit gradient
  for (int i = 0; i < 8; i++) {
    float fi = float(i);
    float y = sin(t * (0.6 + fi * 0.09) + fi * 0.9 + uSeed.z * 6.28) * 0.42;
    float h = 0.038 + 0.016 * sin(t * 1.7 + fi) + 0.012 * uKick;
    float d = p.y - y;
    if (abs(d) > h) continue;
    float g = 1.0 - abs(d) / h;
    float spec = pow(max(0.0, 1.0 - abs(d + h * 0.35) / h), 3.0);
    vec3 c = pal(fract(fi * 0.13 + uSeed.y + t * 0.035));
    col = mix(col, c * (0.25 + 0.95 * g * g), 0.92);
    col += c * spec * (0.5 + 0.9 * uBass);
    col += vec3(1.0) * spec * spec * 0.28;
  }

  col += pal(0.2) * pow(abs(sin(uv.y * 220.0 + t * 5.0)), 12.0) * uSnare * 0.4;
  col += pal(0.7) * smoothstep(0.45, 0.0, abs(p.y - horizon)) * uStab * 0.3;
  return col;
}
`;

const fractal = `
// Julia set on a slowly orbiting constant, coloured by orbit trap.
vec3 render(vec2 p, vec2 uv) {
  float zoom = 1.45 * pow(1.55, sin(uTime * 0.11) * 1.6) * (1.0 - 0.12 * uKick);
  vec2 z = p * zoom;
  z *= rot(uTime * 0.06);
  z += vec2(sin(uTime * 0.07) * 0.1, cos(uTime * 0.05) * 0.1);

  float ang = uTime * 0.07 + uSeed.x * 6.28318;
  vec2 c = vec2(cos(ang), sin(ang)) * (0.745 + 0.05 * sin(uTime * 0.23) + 0.025 * uBass);

  float trap = 1e9;
  float trap2 = 1e9;
  float escaped = 0.0;
  float it = 0.0;
  for (int k = 0; k < 110; k++) {
    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
    trap = min(trap, abs(length(z) - 0.62));
    trap2 = min(trap2, abs(z.x) * 0.8 + abs(z.y) * 0.35);
    if (dot(z, z) > 64.0) { escaped = 1.0; break; }
    it += 1.0;
  }

  // Outside: smooth escape time, so the contour rings read as bands rather
  // than as one flat wash.
  float l = max(dot(z, z), 1.0001);
  float smoothIt = it + 1.0 - log(0.5 * log(l)) / log(2.0);
  // log-scaled: most of the plane escapes in a handful of steps, so a linear
  // ramp would put almost every exterior pixel on the same colour
  float sm = log(1.0 + smoothIt) * 0.52 + exp(-trap * 7.0) * 0.3;
  vec3 outside = pal(fract(sm + uTime * 0.06 + uSeed.y));
  outside *= 0.45 + 0.85 * exp(-trap * 4.0) + 0.3 * fract(smoothIt * 0.5);
  outside += pal(fract(0.5 + uSeed.z)) * exp(-trap * 18.0) * (0.5 + uLead * 1.3);

  // Inside: orbit-trap filigree rather than a flat black hole.
  vec3 inside = pal(fract(0.45 + trap2 * 1.6 + uTime * 0.05 + uSeed.y));
  inside *= 0.09 + 0.6 * exp(-trap2 * 4.5);
  inside += pal(fract(uSeed.z + 0.2)) * exp(-trap2 * 11.0) * (0.25 + uArp * 0.9);

  vec3 col = mix(inside, outside, escaped);
  // rim where the set meets the escape region
  col += pal(0.5) * exp(-trap * 26.0) * (0.3 + uStab * 0.8);
  return col * (0.85 + 0.4 * uEnergy);
}
`;

/**
 * Post pass: the era's screen. The scene arrives at the era's own resolution;
 * this pass keeps its pixels square-edged, squeezes its colours into the era's
 * palette (with the era's dither), lays the text over it, then finishes it
 * like the display it would have been seen on: a CRT, a TV, an LCD, or glass.
 */
export const POST = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uScene;      // the scene, sampled as hard pixels
uniform sampler2D uSceneSoft;  // the same scene, filtered, for the glow
uniform sampler2D uText;
uniform vec2 uRes;             // canvas
uniform vec2 uVRes;            // the picture's resolution (always the canvas's)
uniform vec2 uLineRes;         // the screen's own lines: its scan lines, an LCD's grid, the tape's jitter
uniform float uTime, uKick, uSnare, uEnergy;
uniform int uPalMode;          // 0 none, 1 C64, 2 levels per channel, 3 handheld greens, 4 EGA, 5 green mono, 6 grey, 7 phone LCD,
                               // 8 a black-and-white vector beam, 9 a colour vector beam
uniform float uLevels, uDither;
uniform int uDisplay;          // 0 CRT, 1 LCD, 2 TV, 3 clean, 4 modern, 5 videotape, 6 vector
uniform float uBloom, uScan, uBarrel, uAberr, uGrain, uVignette;
uniform float uFade;           // 0..1, a fade to black between parts
uniform float uImpact;         // 0 for most scenes; 1 gives a zoom blur on the kick
uniform float uTear;           // 1 for most scenes: the videotape's head switching along the bottom; 0 a scene without it

const vec3 C64[16] = vec3[16](
  vec3(0.000), vec3(1.000), vec3(0.408, 0.216, 0.169), vec3(0.439, 0.643, 0.698),
  vec3(0.435, 0.239, 0.525), vec3(0.345, 0.553, 0.263), vec3(0.208, 0.157, 0.475), vec3(0.722, 0.780, 0.435),
  vec3(0.435, 0.310, 0.145), vec3(0.263, 0.224, 0.000), vec3(0.604, 0.404, 0.349), vec3(0.267),
  vec3(0.424), vec3(0.604, 0.824, 0.518), vec3(0.424, 0.369, 0.710), vec3(0.584));
// the sixteen colours of the EGA's default palette (and the CGA's before it)
const vec3 EGA[16] = vec3[16](
  vec3(0.000), vec3(0.000, 0.000, 0.667), vec3(0.000, 0.667, 0.000), vec3(0.000, 0.667, 0.667),
  vec3(0.667, 0.000, 0.000), vec3(0.667, 0.000, 0.667), vec3(0.667, 0.333, 0.000), vec3(0.667),
  vec3(0.333), vec3(0.333, 0.333, 1.000), vec3(0.333, 1.000, 0.333), vec3(0.333, 1.000, 1.000),
  vec3(1.000, 0.333, 0.333), vec3(1.000, 0.333, 1.000), vec3(1.000, 1.000, 0.333), vec3(1.000));
const vec3 DMG[4] = vec3[4](
  vec3(0.059, 0.220, 0.059), vec3(0.188, 0.384, 0.188), vec3(0.545, 0.675, 0.059), vec3(0.608, 0.737, 0.059));

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float bayer4(vec2 p) {
  const float m[16] = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0,
                                3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);
  ivec2 i = ivec2(mod(p, 4.0));
  return m[i.x + i.y * 4] / 16.0 - 0.47;
}

vec3 quantize(vec3 c, vec2 cell, float dither) {
  float d = bayer4(cell) * dither;
  c = clamp(c, 0.0, 1.0);
  if (uPalMode == 1) {
    vec3 cc = clamp(c + d * 0.2, 0.0, 1.0);
    float best = 1e9;
    vec3 pick = C64[0];
    for (int i = 0; i < 16; i++) {
      vec3 e = (cc - C64[i]) * vec3(0.9, 1.2, 0.7);
      float dd = dot(e, e);
      if (dd < best) { best = dd; pick = C64[i]; }
    }
    return pick;
  }
  if (uPalMode == 4) {
    vec3 cc = clamp(c + d * 0.25, 0.0, 1.0);
    float best = 1e9;
    vec3 pick = EGA[0];
    for (int i = 0; i < 16; i++) {
      vec3 e = (cc - EGA[i]) * vec3(0.9, 1.2, 0.7);
      float dd = dot(e, e);
      if (dd < best) { best = dd; pick = EGA[i]; }
    }
    return pick;
  }
  if (uPalMode == 5) {
    // green phosphor: the brightness only, in a few steps, glowing green
    float l = clamp(dot(c, vec3(0.299, 0.587, 0.114)) * 1.15, 0.0, 1.0);
    l = floor(l * (uLevels - 1.0) + 0.5 + d * 0.6) / (uLevels - 1.0);
    return vec3(0.18, 1.0, 0.32) * l;
  }
  if (uPalMode == 6) {
    // a black-and-white set: the brightness only, a touch warm
    float l = clamp(dot(c, vec3(0.299, 0.587, 0.114)), 0.0, 1.0);
    return vec3(l) * vec3(1.0, 0.985, 0.95);
  }
  if (uPalMode == 7) {
    // the phone's LCD: a pixel is on or off, and an on pixel is dark on the green backlight - so what the
    // scene draws bright, the phone draws dark
    float l = dot(c, vec3(0.299, 0.587, 0.114)) + d * 0.45;
    return l > 0.3 ? vec3(0.13, 0.19, 0.10) : vec3(0.60, 0.72, 0.38);
  }
  if (uPalMode == 2) return floor(c * (uLevels - 1.0) + 0.5 + d) / (uLevels - 1.0);
  if (uPalMode == 3) {
    float l = clamp(dot(c, vec3(0.299, 0.587, 0.114)) * 1.2 + d * 0.3, 0.0, 0.999);
    return DMG[int(l * 4.0)];
  }
  return c;
}

// The vector monitor's beam through a picture: a beam only draws lines, so it traces the picture's lines and
// the outlines of what it fills, and leaves the inside of every shape unlit. An edge of colour counts as much
// as one of brightness (a Sobel filter on each channel); a line already drawn thin is found as brighter than
// what is round it. Its colour is that of the lit side. r: how far apart, in the picture's pixels, it looks.
vec4 vectorBeam(vec2 p, float r) {
  vec2 o = r / uVRes;
  vec3 c = texture(uSceneSoft, p).rgb;
  vec3 n = texture(uSceneSoft, p + vec2(0.0, o.y)).rgb, s = texture(uSceneSoft, p - vec2(0.0, o.y)).rgb;
  vec3 e = texture(uSceneSoft, p + vec2(o.x, 0.0)).rgb, w = texture(uSceneSoft, p - vec2(o.x, 0.0)).rgb;
  vec3 ne = texture(uSceneSoft, p + o).rgb, sw = texture(uSceneSoft, p - o).rgb;
  vec3 nw = texture(uSceneSoft, p + vec2(-o.x, o.y)).rgb, se = texture(uSceneSoft, p + vec2(o.x, -o.y)).rgb;
  vec3 gx = (ne + 2.0 * e + se) - (nw + 2.0 * w + sw);
  vec3 gy = (nw + 2.0 * n + ne) - (sw + 2.0 * s + se);
  float edge = length(vec3(length(vec2(gx.r, gy.r)), length(vec2(gx.g, gy.g)), length(vec2(gx.b, gy.b)))) * 0.25;
  vec3 ridge = c - (n + s + e + w + ne + nw + se + sw) / 8.0;
  float line = max(ridge.r, max(ridge.g, ridge.b));
  vec3 lit = max(max(max(c, n), max(s, e)), max(max(w, ne), max(max(nw, se), sw)));
  return vec4(lit, smoothstep(0.1, 0.32, max(edge, line * 1.6)));
}

void main() {
  vec2 c = vUv - 0.5;
  vec2 uv = vUv + c * dot(c, c) * uBarrel;          // tube curvature
  if (uDisplay == 6) {
    // a vector monitor's beam is steered, not scanned: a very slight wobble across, and the picture pumping a
    // little with the bright things on it, as a real tube does
    uv.x += 0.0004 * sin(uv.y * 9.0 + uTime * 2.3);
    uv = 0.5 + (uv - 0.5) * (1.0 + 0.003 * uEnergy);
  }

  vec2 cell = floor(uv * uVRes);
  vec2 suv = (cell + 0.5) / uVRes;                  // centre of the era's pixel

  float ab = uAberr * (1.0 + 2.5 * uKick);
  vec3 col;
  if (ab > 0.0) {
    col.r = texture(uScene, suv + vec2(ab, 0.0)).r;
    col.g = texture(uScene, suv).g;
    col.b = texture(uScene, suv - vec2(ab, 0.0)).b;
  } else {
    col = texture(uScene, suv).rgb;
  }

  if (uDisplay == 5) {
    // videotape, as a tape played back well (no tracking fault): the figures are ntsc-rs's for VHS at
    // standard play - brightness recorded up to 2.4 MHz, colour "under" it at only 320 kHz and four
    // pixels late - so the picture keeps its shapes, softened a little, while its colour smears wide and
    // lags to the right; the deck sharpens the brightness back, leaving a light halo on its edges; the
    // tape's timing makes each line wave sideways, slowly; the colour carries blotchy noise, the picture
    // a fine grain (no snow: the owner found its specks distracting); and along the bottom the heads switch, a few lines
    // torn sideways.
    float line = floor(uv.y * uLineRes.y);
    // edge wave: each line shifted a little, slowly, by a smooth noise down the picture
    float wave = (sin(uv.y * 37.0 + uTime * 1.3) * 0.6 + sin(uv.y * 91.0 - uTime * 2.1) * 0.4) * 0.0009;
    // head switching: the bottom lines torn sideways, more the lower they are
    float hs = smoothstep(0.03, 0.0, uv.y) * uTear;
    vec2 p = suv + vec2(wave + hs * (0.09 + 0.03 * hash12(vec2(line, floor(uTime * 25.0)))), 0.0);
    const vec3 LW = vec3(0.299, 0.587, 0.114);
    // brightness: about 250 lines across the picture (a short blur), then the deck's sharpening
    float y0 = 0.0, yw = 0.0;
    for (int i = -2; i <= 2; i++) y0 += dot(texture(uSceneSoft, p + vec2(float(i) * 0.0009, 0.0)).rgb, LW);
    y0 /= 5.0;
    for (int i = -3; i <= 3; i++) yw += dot(texture(uSceneSoft, p + vec2(float(i) * 0.0028, 0.0)).rgb, LW);
    yw /= 7.0;
    float yl = y0 + (y0 - yw) * 0.6;
    // colour: about 30 lines across the picture, delayed to the right, a little washed out
    vec3 cs = vec3(0.0);
    for (int i = -4; i <= 4; i++) cs += texture(uSceneSoft, p + vec2(float(i) * 0.0042 - 0.006, 0.0)).rgb;
    cs /= 9.0;
    vec3 chroma = (cs - vec3(dot(cs, LW))) * 0.85;
    // every noise here is drawn afresh each frame - hashing the cell, then that with the frame - so no
    // pattern carries over to the next frame a few lines off, which reads as dust falling down the picture
    float fr = floor(uTime * 30.0);
    // the colour's blotchy noise: wide patches, a new set every few frames
    float cb = hash12(vec2(floor(uv.x * 24.0), floor(uv.y * uLineRes.y * 0.5))) * 517.0;
    float cf = floor(uTime * 12.0);
    chroma += (vec3(hash12(vec2(cb, cf)), hash12(vec2(cb + 17.0, cf)), hash12(vec2(cb + 41.0, cf))) - 0.5) * 0.035;
    col = vec3(yl) + chroma;
    // the picture's fine grain
    col += (hash12(vec2(hash12(vec2(floor(uv.x * uRes.x * 0.5), line)) * 517.0, fr)) - 0.5) * 0.03;
    // the head-switch lines are noisy too
    col += (hash12(vec2(hash12(vec2(floor(uv.x * uRes.x), line)) * 517.0, fr)) - 0.5) * 0.25 * hs;
  }

  // impact: a zoom blur out from the centre, and a flash, when the kick lands
  float zb = uImpact * uKick;
  if (zb > 0.02) {
    vec3 acc = vec3(0.0);
    for (int i = 1; i <= 8; i++) acc += texture(uSceneSoft, 0.5 + (suv - 0.5) * (1.0 - float(i) * 0.014 * zb)).rgb;
    acc /= 8.0;
    col = mix(col, acc, clamp(zb * 0.85, 0.0, 0.7)) + acc * zb * 0.12;
  }

  if (uDisplay == 6) {
    // the vector monitor: the beam draws the picture's lines and outlines, everything else is unlit phosphor,
    // black; a glow spreads round every line (the same lines found wider apart) and the brightest run to white.
    // The black-and-white tube of the vector arcades of 1979: one blue-white, sixteen intensities a line. The
    // colour tube of the years after: three guns each on or off - seven colours - at any intensity. (Its
    // persistence is a few milliseconds, under a frame: nothing trails.)
    vec4 b = vectorBeam(uv, 1.0), g = vectorBeam(uv, 3.0);
    float lit = max(b.r, max(b.g, b.b)), litG = max(g.r, max(g.g, g.b));
    float I = b.a * lit, IG = g.a * litG * 0.22 * uBloom;
    vec3 hue = vec3(0.82, 0.9, 1.0), hueG = hue;
    if (uPalMode == 9) {
      hue = step(vec3(0.5 * lit), b.rgb);
      hueG = step(vec3(0.5 * litG), g.rgb);
    } else I = floor(I * 15.0 + 0.5) / 15.0;
    col = hue * I + hueG * IG;
    col = mix(col, vec3(max(col.r, max(col.g, col.b))), smoothstep(0.85, 1.3, I) * 0.35);
  } else if (uBloom > 0.0) {
    vec3 bloom = vec3(0.0);
    float rad = 0.005 + 0.012 * uEnergy;
    // (the ring's twelve directions, every thirty degrees, written out: worked out with a cosine and a sine for
    // every pixel of the screen, they cost a scene as much as some scenes do themselves)
    const vec2 RING[12] = vec2[12](vec2(1.0, 0.0), vec2(0.866025, 0.5), vec2(0.5, 0.866025), vec2(0.0, 1.0),
      vec2(-0.5, 0.866025), vec2(-0.866025, 0.5), vec2(-1.0, 0.0), vec2(-0.866025, -0.5), vec2(-0.5, -0.866025),
      vec2(0.0, -1.0), vec2(0.5, -0.866025), vec2(0.866025, -0.5));
    for (int i = 0; i < 12; i++) {
      bloom += texture(uSceneSoft, uv + RING[i] * rad).rgb;
      bloom += texture(uSceneSoft, uv + RING[i] * (rad * 0.45)).rgb;
    }
    bloom /= 24.0;
    col += max(bloom - 0.33, 0.0) * uBloom;
  }

  col = quantize(col, cell, uDither);

  // the lettering: in the era's colours where the era had so few of them
  vec4 tx = texture(uText, vUv);
  vec3 tcol = (uPalMode == 1 || uPalMode >= 3) ? quantize(tx.rgb, vec2(0.0), 0.0) : tx.rgb;
  col = mix(col, tcol, tx.a);
  if (uPalMode != 3) col += tcol * tx.a * 0.3;

  if (uDisplay == 0 || uDisplay == 2 || uDisplay == 5) {
    // one dark gap per line of the era's raster
    col *= 1.0 - uScan * (0.5 - 0.5 * cos(uv.y * uLineRes.y * 6.28318));
  } else if (uDisplay == 1) {
    // LCD: a hairline grid between pixels, a matte green-grey glass
    vec2 f = fract(uv * uLineRes);
    float grid = smoothstep(0.0, 0.1, f.x) * smoothstep(0.0, 0.1, f.y);
    col *= 0.8 + 0.2 * grid;
    col = mix(col, vec3(0.62, 0.70, 0.45) * dot(col, vec3(0.33)), 0.08);
  }

  col *= 1.0 - smoothstep(0.38, 0.98, length(c) * 1.25) * uVignette;
  col += (hash12(gl_FragCoord.xy + fract(uTime) * 53.0) - 0.5) * uGrain;
  if (uDisplay == 3 || uDisplay == 4) col = pow(max(col, 0.0), vec3(0.95));
  else col = pow(max(col, 0.0), vec3(0.92));
  col *= 1.0 - uFade;
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) col = vec3(0.0);
  fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

// ---------------------------------------------------------------------------
// Scenes added with the eras. Each one is an homage to a classic effect,
// written from scratch: computed from time alone, so any frame can be drawn
// on its own, live or offline.
// ---------------------------------------------------------------------------

const shadebobs = `
// Shadebobs: soft bobs that brighten every pixel they cross. The trail is
// summed from each bob's recent path, so it needs no feedback buffer, and the
// brightness wraps round the palette instead of clipping — the old trick.
vec3 render(vec2 p, vec2 uv) {
  float t = uTime;
  float acc = 0.0;
  for (int b = 0; b < 5; b++) {
    float fb = float(b);
    float s = hash11(fb * 7.3 + uSeed.x * 13.0);
    for (int k = 0; k < 40; k++) {
      float tk = t - float(k) * 0.045;
      vec2 c = vec2(sin(tk * (0.9 + s * 0.6) + fb * 1.7 + sin(tk * 0.37 + fb)),
                    cos(tk * (0.7 + s * 0.5) + fb * 2.3)) * vec2(0.62, 0.36);
      vec2 d = p - c;
      acc += exp(-dot(d, d) * 140.0) * (1.0 - float(k) / 40.0);
    }
  }
  float v = acc * 0.22 + uBass * 0.12;
  vec3 col = pal(fract(v + uTime * 0.03 + uSeed.y)) * smoothstep(0.0, 0.1, acc * 0.22);
  col += pal(fract(uSeed.y + 0.5)) * 0.03;
  return col * (0.75 + 0.45 * uEnergy);
}
`;

const vectorballs = `
// Vector balls: a formation of shaded spheres turning in 3D, morphing from
// one shape to the next every two bars.
vec3 formation(int s, float fi) {
  if (s == 0) {                                   // sphere
    float y = 1.0 - 2.0 * (fi + 0.5) / 48.0;
    float r = sqrt(max(0.0, 1.0 - y * y));
    float a = fi * 2.39996;
    return vec3(cos(a) * r, y, sin(a) * r);
  }
  if (s == 1) {                                   // cube lattice
    float x = mod(fi, 4.0), y = mod(floor(fi / 4.0), 4.0), z = floor(fi / 16.0);
    return (vec3(x, y, z * 1.5) - vec3(1.5)) * 0.46;
  }
  if (s == 2) {                                   // torus
    float a = mod(fi, 16.0) / 16.0 * 6.28318;
    float b = floor(fi / 16.0) / 3.0 * 6.28318;
    float rr = 0.72 + 0.28 * cos(b);
    return vec3(rr * cos(a), 0.28 * sin(b), rr * sin(a));
  }
  float k = floor(fi / 2.0);                      // double helix
  float a = k * 0.52 + mod(fi, 2.0) * PI;
  return vec3(cos(a) * 0.55, (k / 23.0 - 0.5) * 2.0, sin(a) * 0.55);
}
vec3 render(vec2 p, vec2 uv) {
  float t = uTime * 0.9;
  float ph = uBarIndex * 0.5 + uBar * 0.5;
  float sa = mod(floor(ph) + floor(uSeed.x * 4.0), 4.0);
  float sb = mod(sa + 1.0, 4.0);
  float m = smoothstep(0.55, 1.0, fract(ph));

  vec3 col = mix(vec3(0.02, 0.02, 0.05), pal(0.6) * 0.22, uv.y);
  col += pal(0.3) * 0.06 * step(0.5, fract(uv.y * 40.0 + uTime));

  float best = 1e9;
  vec3 hitN = vec3(0.0);
  float hitI = -1.0;
  for (int i = 0; i < 48; i++) {
    float fi = float(i);
    vec3 P = mix(formation(int(sa), fi), formation(int(sb), fi), m);
    P *= 1.0 + 0.12 * uKick;
    P.xz *= rot(t * 0.7);
    P.yz *= rot(t * 0.43);
    P.z += 4.2;
    vec2 sp = P.xy / P.z * 2.1;
    float r = 0.095 / P.z * 2.1;
    vec2 d = p - sp;
    float d2 = dot(d, d);
    if (d2 < r * r && P.z < best) {
      best = P.z;
      hitN = normalize(vec3(d, -sqrt(r * r - d2)));
      hitI = fi;
    }
  }
  if (hitI >= 0.0) {
    vec3 L = normalize(vec3(-0.5, 0.6, -0.7));
    float dif = max(0.0, dot(hitN, L));
    float spec = pow(max(0.0, dot(reflect(-L, hitN), vec3(0.0, 0.0, -1.0))), 24.0);
    vec3 base = pal(fract(hitI / 48.0 * 0.5 + uTime * 0.05 + uSeed.y));
    col = base * (0.18 + 0.9 * dif) + vec3(spec) * 0.9;
  }
  return col;
}
`;

const dottunnel = `
// Dot tunnel: rings of dots rushing past, the tunnel snaking along a path.
vec2 tpath(float z) { return vec2(sin(z * 0.45) * 0.7 + sin(z * 0.17) * 0.4, cos(z * 0.33) * 0.45); }
vec3 render(vec2 p, vec2 uv) {
  float cam = uTime * (2.2 + uBass * 0.6);
  vec3 col = vec3(0.0);
  for (int k = 0; k < 22; k++) {
    float fk = float(k);
    float zr = mod(fk * 0.32 - cam, 22.0 * 0.32) + 0.25;
    float zw = cam + zr;
    vec2 c = (tpath(zw) - tpath(cam + 0.25)) / zr * 0.85;
    float R = 0.95 / zr;
    vec2 d = p - c;
    float spin = zw * 0.6 + uTime * 0.3;
    float cell = floor((atan(d.y, d.x) + spin) / (6.28318 / 16.0) + 0.5);
    float aa = cell * (6.28318 / 16.0) - spin;
    vec2 dotp = c + R * vec2(cos(aa), sin(aa));
    float s = (0.05 + 0.02 * uKick) / zr;
    float fade = exp(-zr * 0.2) * smoothstep(0.25, 0.6, zr);
    col += pal(fract(zw * 0.06 + uSeed.y)) * (1.0 - smoothstep(s * 0.45, s, length(p - dotp))) * fade * 2.4;
  }
  // a faint glow down the throat of the tunnel, so it reads as depth
  col += pal(fract(uSeed.y + 0.5)) * exp(-length(p) * 3.5) * 0.18;
  return col;
}
`;

const fire = `
// The classic 256-colour fire of the DOS demos: chunky flames rising off the
// floor through the fire palette - black, red, yellow, white. The flames leap
// on the kick, sparks fly up on the snare and the hats, and when the music
// peaks a seed-made emblem catches fire.
vec3 firePal(float h) {
  h = clamp(h, 0.0, 1.0);
  vec3 c = clamp(vec3(h * 3.0, h * 3.0 - 1.0, h * 3.0 - 2.0), 0.0, 1.0);
  // some seeds burn blue, like a gas flame
  return uSeed.z > 0.7 ? c.bgr : c;
}

// the emblem: a ring around a diamond, a star or a triangle, by the seed
float fireEmblem(vec2 p) {
  float r = length(p);
  float ring = abs(r - 0.2) - 0.022;
  float k = floor(uSeed.w * 3.0);
  float inner;
  if (k < 1.0) inner = (abs(p.x) + abs(p.y)) * 0.7071 - 0.08;
  else if (k < 2.0) inner = r - 0.075 - 0.04 * cos(atan(p.y, p.x) * 5.0 + 1.5708);
  else inner = max(abs(p.x) * 0.866 + p.y * 0.5, -p.y) - 0.055;
  return 1.0 - smoothstep(0.0, 0.012, min(ring, inner));
}

vec3 render(vec2 p, vec2 uv) {
  // the fire buffer: chunky cells, a hundred rows, as the demos ran it at half resolution
  float rows = 100.0;
  float aspect = uRes.x / uRes.y;
  vec2 cells = vec2(floor(rows * aspect), rows);
  vec2 c = (floor(uv * cells) + 0.5) / cells;
  float x = c.x * aspect;
  float t = uTime;

  // every column of the fire burns to its own height, and the heights drift up
  // and sideways: separate tongues of flame with dark gaps between them
  float tongue = fbm(vec2(x * 7.0 + sin(c.y * 6.0 + t) * 0.15, c.y * 1.6 - t * 2.1) + uSeed.xy * 20.0);
  float flick = vnoise(vec2(x * 16.0, c.y * 9.0 - t * 5.5) + uSeed.yx * 9.0);

  // the flames' reach: taller on the kick, and as the music builds
  float reach = 0.37 + 0.2 * uKick + 0.14 * uEnergy + 0.06 * uBass;
  float height = reach * (0.35 + 1.3 * tongue * tongue);
  float h = 1.0 - c.y / height;
  // the flicker only frays the flames' upper parts: the base burns solid
  h += (flick - 0.5) * 0.45 * smoothstep(0.02, 0.2, c.y);
  h = h * (0.95 + 0.2 * uKick);

  // the emblem catches fire when the music peaks: tongues of flame rise off it
  float burn = clamp(smoothstep(0.5, 0.85, uEnergy) + uStab * 0.6, 0.0, 1.0);
  vec2 ep = vec2(x - 0.5 * aspect, c.y - 0.58);
  float core = fireEmblem(ep);
  float wob = (tongue - 0.5) * 0.05;
  float lick = fireEmblem(ep - vec2(wob, 0.03)) * 0.85
             + fireEmblem(ep - vec2(wob * 2.0, 0.065)) * 0.6 * tongue
             + fireEmblem(ep - vec2(wob * 3.0, 0.1)) * 0.4 * tongue * tongue;
  h = max(h, lick * burn * (0.55 + 0.6 * flick));

  vec3 col = firePal(h);

  // sparks: embers flying up from the flames, more of them on the snare and the hats
  float lane = floor(x * 36.0);
  float speed = 0.22 + 0.45 * hash11(lane * 3.1 + 5.0);
  float run = t * speed + hash11(lane + uSeed.x * 91.0);
  float ey = fract(run);
  float alive = step(0.82 - 0.45 * uSnare - 0.2 * uHat, hash11(lane * 1.7 + floor(run) * 13.0));
  float ex = (lane + 0.5 + 0.3 * sin(t * 2.0 + lane)) / 36.0;
  float d = length(vec2((x - ex) * rows, (c.y - ey) * rows));
  col += firePal(0.9) * alive * step(d, 0.75) * (1.0 - ey);

  // the emblem sits dark in front of the flames, then burns: hot, and flickering
  col = mix(col, firePal(0.62 + 0.35 * flick) * burn, core * 0.9);
  return col;
}
`;

const scanner = `
// The talking car of 80s television, as an idea: a low black wedge on a desert
// highway at dusk, a red light sweeping in its nose. Nothing here is drawn on a
// path: the car is a simulation (src/core/sims.js) - a driver, tyres, four springs
// - on a road laid out ahead of it, and this draws what its cameras see, from the
// numbers it hands over, everything relative to the eye. The car is ray-marched
// from one height field and its paint is nearly all reflection: the dusk, the
// mesas, the poles going by. The music directs it: the red light passes on every
// beat and quickens toward a stunt; the boost fires a flight's time before a big
// moment, so the car lands on it, over the barrier; and from the driver's seat the
// bars of the car's voice talk with the melody.

uniform vec4 uScCam[4];   // the eye: [0].w its lens; [1] right, w how fast it moves; [2] up, w 1 in the driver's seat; [3] forward
uniform vec4 uScCar[4];   // the car: [0] where, w speed; [1] right, w steering; [2] up, w the wheels' turn; [3] nose, w the brake
uniform vec4 uScWheel;    // how high each wheel sits in the body: front left, front right, rear left, rear right
uniform vec4 uScZ;        // the eye past its road sample; the sweep, 0 to 2; passes a beat; the eye along a repeating stretch
uniform vec4 uScFx;       // a landing's flash, the boost, in the air, speed
uniform vec4 uScBar;      // the barrier: where, and which way the road runs there
uniform vec2 uScRoad[64]; // the road's centre: across and height, every 30 m round the eye
uniform vec4 uScProp[22]; // what stands by the road: across, along, height, kind.variation
uniform vec4 uScPart[24]; // sparks (w > 0) and dust (w < 0)

vec3 SC_H, SC_M, SC_T;    // the sky: horizon, middle, top
vec3 scC, scR, scU, scF;  // the car
vec2 scSun;
float scPix;              // how large a pixel is at a metre

// ---- the road ----
vec2 scRoad(float z) {
  float u = clamp((z + uScZ.x) / 30.0 + 31.0, 1.0, 60.99);
  int i = int(u);
  float f = u - float(i);
  vec2 a = uScRoad[i - 1], b = uScRoad[i], c = uScRoad[i + 1], d = uScRoad[i + 2];
  return b + 0.5 * f * (c - a + f * (2.0 * a - 5.0 * b + 4.0 * c - d + f * (3.0 * (b - c) + d - a)));
}

float scRoadY(float z) {
  float u = clamp((z + uScZ.x) / 30.0 + 31.0, 1.0, 61.0);
  int i = int(u);
  return mix(uScRoad[i].y, uScRoad[i + 1].y, u - float(i));
}

float scGroundHit(vec3 rd) {
  float s = -rd.y;
  if (s < -0.045) return -1.0;
  float t = 0.0;
  for (int i = 0; i < 12; i++) {
    vec3 q = rd * t;
    float h = q.y - scRoadY(q.z);
    if (h < 0.01 + t * 0.002) break;
    t += h / max(s + 0.045, 0.012);
    if (t > 1200.0) return -1.0;
  }
  if (s > 0.012) { vec3 q = rd * t; t += clamp((q.y - scRoad(q.z).y) / s, -2.0, 2.0); }
  return t;
}

// ---- the dusk ----
vec3 scSky(vec3 rd, float detail) {
  float y = rd.y;
  vec2 az = normalize(rd.xz + vec2(1e-4, 0.0));
  float sun = max(dot(az, scSun), 0.0);
  vec3 c = mix(SC_H, SC_M, smoothstep(0.0, 0.14 + 0.1 * sun, y));
  c = mix(c, SC_T, smoothstep(0.07, 0.5, y));
  c += SC_H * pow(sun, 6.0) * exp(-max(y, 0.0) * 11.0) * 0.6;
  if (detail > 0.5 && y > 0.0) {
    // thin bands of cloud, lit from under
    vec2 s = rd.xz / (y + 0.16);
    float n = vnoise(s * vec2(0.55, 1.6) + uSeed.xy * 9.0) * 0.6 + vnoise(s * vec2(1.3, 3.7) + 3.0) * 0.4;
    float cl = smoothstep(0.52, 0.78, n) * smoothstep(0.015, 0.08, y) * smoothstep(0.6, 0.12, y);
    c = mix(c, mix(SC_H * 1.1 + 0.04, SC_M * 0.55, smoothstep(0.03, 0.28, y)), cl * 0.75);
    // the first stars
    vec2 g = rd.xz / (y + 0.35) * 70.0;
    if (hash12(floor(g)) > 0.986) c += vec3(0.8, 0.84, 1.0) * smoothstep(0.26, 0.03, length(fract(g) - 0.5)) * smoothstep(0.12, 0.42, y) * (0.7 + 0.5 * uHat);
  }
  // the mesas: far and pale, near and dark, flat on top
  float w1 = sin(az.x * 3.1 + az.y * 1.3 + uSeed.y * 40.0) + 0.7 * sin(az.y * 7.3 - az.x * 2.1 + uSeed.z * 40.0) + 0.5 * sin(az.x * 13.0 + az.y * 5.0);
  float w2 = sin(az.y * 5.3 + az.x * 2.7 + uSeed.z * 60.0) + 0.6 * sin(az.x * 11.0 - az.y * 4.0 + uSeed.w * 60.0);
  float m1 = 0.012 + 0.058 * smoothstep(0.35, 0.75, w1) + 0.003 * sin(az.x * 37.0 + az.y * 23.0);
  float m2 = 0.005 + 0.03 * smoothstep(0.45, 0.8, w2) + 0.002 * sin(az.y * 41.0 - az.x * 29.0);
  float soft = detail > 0.5 ? 0.0015 : 0.012;
  c = mix(c, mix(SC_M, SC_T, 0.45) * 0.8 + SC_H * 0.08, smoothstep(m1 + soft, m1 - soft, y));
  c = mix(c, SC_T * 0.55 + SC_H * 0.03, smoothstep(m2 + soft, m2 - soft, y));
  return c;
}

// what a polished surface sees: the sky above, the dark desert below, a horizon between
vec3 scEnv(vec3 r) {
  if (r.y < 0.0) return mix(vec3(0.016, 0.015, 0.02), SC_H * 0.42, exp(r.y * 9.0));
  return scSky(r, 0.0);
}

// ---- the lights the car throws ----
float scBeam(vec3 P) {
  vec3 v = P - (scC + scF * 2.2 + scU * 0.32);
  float f = dot(v, scF);
  if (f < 0.0) return 0.0;
  float l = dot(v, scR), u = dot(v, scU);
  float w = 1.1 + 0.2 * f;
  return exp(-l * l / (w * w)) * exp(-u * u / ((0.5 + 0.13 * f) * (0.5 + 0.13 * f))) / (1.0 + f * f / 1100.0) * smoothstep(1.0, 11.0, f);
}

// where along the slot the light is, -1 to 1
float scSweep() { float ph = uScZ.y; return (ph < 1.0 ? ph : 2.0 - ph) * 2.0 - 1.0; }

// the eight lamps: lit where the sweep is, fading where it has been
float scLamp(float x) {
  float seg = (floor(clamp(x, 0.0, 0.9999) * 8.0) + 0.5) / 8.0;
  float ph = uScZ.y;
  float a1 = mod(ph - seg, 2.0), a2 = mod(ph - (2.0 - seg), 2.0);
  return exp(-min(a1, a2) * 5.5);
}

// ---- the ground ----
vec3 scGround(vec3 P, vec3 rd, float t) {
  vec2 rc = scRoad(P.z);
  float d = P.x - rc.x, ad = abs(d);
  float zw = P.z + uScZ.w;
  float fw = t * scPix, fz = fw / max(-rd.y, 0.012) + uScCam[1].w * 0.006;
  vec3 amb = mix(SC_H, SC_M, 0.45) * 0.72 + SC_T * 0.3;
  float beam = scBeam(P);
  // the desert: sand and scrub, its grain only where it can be seen
  float grain = t < 90.0 ? vnoise(vec2(d, zw) * 2.3) * 0.5 + vnoise(vec2(d, zw) * 0.47) * 0.5 : 0.5;
  vec3 sand = mix(vec3(0.3, 0.2, 0.13), vec3(0.46, 0.33, 0.21), grain);
  vec3 alb = sand;
  float lines = 0.0;
  float isRoad = 1.0 - smoothstep(4.0, 4.3 + fw, ad);
  if (isRoad > 0.0) {
    float wear = t < 120.0 ? vnoise(vec2(d * 3.2, zw * 1.1)) * 0.5 + vnoise(vec2(d * 17.0, zw * 9.0)) * 0.5 : 0.5;
    vec3 tar = vec3(0.1, 0.1, 0.112) * (1.0 + (wear - 0.5) * 0.34 / (1.0 + fz * 2.0));
    // two darker tracks worn by the tyres
    tar *= 1.0 - 0.14 * exp(-pow((ad - 1.85) * 0.8, 2.0));
    alb = mix(alb, tar, isRoad);
    // the edge lines, and the dashes down the middle, smearing as the eye goes by
    float wl = max(0.07, fw * 1.2);
    float edge = (1.0 - smoothstep(0.0, wl, abs(ad - 3.55) - 0.055)) * 0.075 / (0.075 + fw * 0.8 + 0.001);
    alb = mix(alb, vec3(0.75, 0.74, 0.7), edge * isRoad);
    float dw = fz / 10.0;
    float f = fract(zw / 10.0);
    float dash = dw > 0.6 ? 0.4 : clamp((0.2 - abs(f - 0.2) + dw * 0.5) / max(dw, 0.001), 0.0, 1.0);
    float mid = (1.0 - smoothstep(0.0, wl, ad - 0.06)) * dash * 0.08 / (0.08 + fw * 0.8);
    alb = mix(alb, vec3(0.86, 0.66, 0.2), mid);
    lines = max(edge, mid);
  }
  vec3 col = alb * (amb * 1.05 + vec3(1.0, 0.95, 0.82) * beam * (2.4 + 1.5 * isRoad + 5.0 * lines));
  // the red light lies on the road ahead, swinging with the sweep
  vec3 pool = scC + scF * 5.5 + scR * scSweep() * 1.7;
  vec3 pr = P - pool;
  float near = exp(-dot(pr, pr) * 0.16);
  col += vec3(1.0, 0.06, 0.03) * alb * near * (1.3 + 1.7 * uKick) * step(0.0, dot(P - scC, scF) - 1.0);
  // brake and tail lamps warm the road behind
  vec3 tl = P - (scC - scF * 3.5);
  col += vec3(1.0, 0.05, 0.03) * alb * exp(-dot(tl, tl) * 0.14) * (0.6 + 2.6 * uScCar[3].w);
  // the road holds the sky at a low angle, like the heat over it
  if (isRoad > 0.0) {
    float fr = pow(1.0 + rd.y, 22.0) * 0.62 * smoothstep(35.0, 130.0, t);
    vec3 rr = vec3(rd.x, -rd.y, rd.z);
    col = mix(col, scSky(rr, 0.0) * 0.8, fr * isRoad);
  }
  // the cat's eyes down the middle catch the headlamps
  if (t < 180.0 && ad < 0.5) {
    float ce = length(vec2(d / max(fw * 1.4, 0.05), (fract(zw / 10.0 + 0.5) - 0.5) * 10.0 / max(fz * 0.4, 0.08)));
    col += vec3(1.0, 0.85, 0.5) * smoothstep(1.0, 0.2, ce) * beam * 3.0;
  }
  // the car's shadow: under it, and let go of it when it flies
  vec3 v = P - scC;
  vec2 hq = vec2(dot(v.xz, normalize(scR.xz)), dot(v.xz, normalize(scF.xz)));
  float lift = max(scC.y - rc.y, 0.0);
  vec2 bd = abs(hq) - vec2(0.88, 2.35);
  float sd = length(max(bd, 0.0)) + min(max(bd.x, bd.y), 0.0);
  float pen = 0.12 + lift * 0.42;
  col *= 1.0 - smoothstep(pen, -pen, sd) * 0.9 / (1.0 + lift * 0.45);
  // the boost's fire lights the ground under it
  col += vec3(1.0, 0.42, 0.1) * alb * uScFx.y * 14.0 * exp(-dot(hq, hq) * 0.3) / (1.0 + lift * lift * 0.5);
  // haze at distance
  col = mix(col, SC_H * 0.62 + SC_M * 0.2, 1.0 - exp(-t * 0.0021));
  return col;
}

// ---- what stands by the road: each a cut-out turned to face the eye ----
float scPropD(float kind, float v, vec2 q, out vec3 alb) {
  float d = 1e3;
  if (kind < 1.0) {
    // a telegraph pole and its crossarm
    d = max(abs(q.x) - 0.11, q.y - 8.6);
    d = min(d, length(max(abs(q - vec2(0.0, 8.0)) - vec2(1.15, 0.05), 0.0)));
    d = min(d, length(max(abs(q - vec2(0.0, 7.3)) - vec2(0.85, 0.04), 0.0)));
    alb = vec3(0.17, 0.12, 0.09);
  } else if (kind < 2.0) {
    // a tall cactus, its arms by the seed
    float s = 0.75 + 0.75 * v;
    vec2 u = q / s;
    d = sdSeg(u, vec2(0.0, 0.0), vec2(0.0, 4.3)) - 0.26;
    float side = v > 0.5 ? 1.0 : -1.0;
    d = min(d, min(sdSeg(u, vec2(0.0, 1.9), vec2(side * 0.85, 1.9)), sdSeg(u, vec2(side * 0.85, 1.9), vec2(side * 0.85, 3.3))) - 0.17);
    if (fract(v * 7.0) > 0.3) d = min(d, min(sdSeg(u, vec2(0.0, 2.5), vec2(-side * 0.7, 2.5)), sdSeg(u, vec2(-side * 0.7, 2.5), vec2(-side * 0.7, 3.6))) - 0.14);
    d *= s;
    alb = vec3(0.13, 0.22, 0.13);
  } else if (kind < 3.0) {
    // a rock, or a bush of dry scrub
    float a = atan(q.y, q.x * 0.8);
    float s = 0.6 + 1.6 * fract(v * 5.0);
    if (fract(v * 3.0) < 0.45) {
      d = length(q * vec2(0.62, 1.0)) - s * (0.82 + 0.16 * sin(a * 5.0 + v * 30.0) + 0.09 * sin(a * 11.0 + v * 9.0));
      alb = vec3(0.3, 0.2, 0.15);
    } else {
      d = length(q * vec2(0.8, 1.15)) - s * 0.62 * (0.8 + 0.2 * sin(a * 19.0 + v * 40.0) + 0.14 * sin(a * 41.0));
      alb = vec3(0.24, 0.23, 0.13);
    }
  } else {
    // a road sign on its post, nothing written on it
    d = max(abs(q.x) - 0.05, q.y - 2.4);
    vec2 u = q - vec2(0.0, 2.45);
    float plate = max(abs(u.x) + abs(u.y) - 0.62, -1.0);
    alb = vec3(0.3);
    if (plate < d) { d = plate; alb = vec3(0.85, 0.6, 0.12); }
  }
  return d;
}

vec4 scProps(vec3 rd, inout float tBest) {
  vec3 col = vec3(0.0);
  float hit = 0.0;
  float rl = length(rd.xz);
  if (rl < 0.02) return vec4(0.0);
  vec2 a = rd.xz / rl;
  vec3 amb = mix(SC_H, SC_M, 0.5) * 0.55 + SC_T * 0.2;
  for (int i = 0; i < 22; i++) {
    vec4 pr = uScProp[i];
    if (pr.w < 0.0) break;
    float u = a.x * pr.y - a.y * pr.x;
    if (abs(u) > 3.0) continue;
    float along = dot(pr.xy, a);
    if (along < 0.3) continue;
    float t = along / rl;
    if (t > tBest) continue;
    float h = rd.y * t - pr.z;
    if (h < -0.5 || h > 10.0) continue;
    float kind = floor(pr.w), v = pr.w - kind;
    vec3 alb;
    float d = scPropD(kind, v, vec2(u, h), alb);
    float aa = t * scPix * 1.1;
    if (d < aa && h > -0.02) {
      float cov = smoothstep(aa, -aa, d);
      vec3 P = rd * t;
      // the dusk from one side, the headlamps where they reach, haze with distance
      float rim = 0.75 + 0.5 * u / max(0.3 + abs(u), 0.5);
      vec3 c = alb * (amb * rim + vec3(1.0, 0.95, 0.85) * scBeam(P) * (kind > 2.9 ? 9.0 : 2.5));
      c = mix(c, SC_H * 0.62 + SC_M * 0.2, 1.0 - exp(-t * 0.0021));
      col = c;
      hit = cov;
      tBest = t;
    }
  }
  return vec4(col, hit);
}

// the wires between the poles: where the ray crosses their line
vec4 scWires(vec3 rd, float tMax) {
  if (abs(rd.x) < 0.015 || rd.y < 0.0) return vec4(0.0);
  float t = (scRoad(0.0).x + 11.5) / rd.x;
  if (t < 0.5 || t > 320.0) return vec4(0.0);
  t = (scRoad(rd.z * t).x + 11.5) / rd.x;
  if (t < 1.0 || t > min(tMax, 300.0)) return vec4(0.0);
  vec3 P = rd * t;
  float f = fract((P.z + uScZ.x) / 30.0);
  float sag = (2.0 * f - 1.0);
  float y = P.y - scRoad(P.z).y - (7.05 + 0.7 * sag * sag);
  float w = max(t * scPix * 0.9, 0.012);
  float m = 1.0 - smoothstep(0.0, w, min(abs(y), abs(y - 0.7)));
  return vec4(SC_T * 0.4, m * min(1.0, 0.02 / w + 0.25));
}

// ---- the barrier: a board across the road, on legs, its lamps flashing ----
vec4 scBarrier(vec3 rd, inout float tBest) {
  if (abs(uScBar.z) > 700.0) return vec4(0.0);
  float c = cos(uScBar.w), s = sin(uScBar.w);
  vec3 o = -uScBar.xyz;
  vec3 ro2 = vec3(c * o.x - s * o.z, o.y, s * o.x + c * o.z);
  vec3 rd2 = vec3(c * rd.x - s * rd.z, rd.y, s * rd.x + c * rd.z);
  vec3 inv = 1.0 / (rd2 + vec3(1e-5));
  vec3 lo = vec3(-4.3, 0.0, -0.1), hi = vec3(4.3, 1.12, 0.1);
  vec3 t0 = (lo - ro2) * inv, t1 = (hi - ro2) * inv;
  vec3 tn = min(t0, t1), tf = max(t0, t1);
  float ta = max(max(tn.x, tn.y), tn.z), tb = min(min(tf.x, tf.y), tf.z);
  if (tb < ta || ta < 0.0 || ta > tBest) return vec4(0.0);
  vec3 q = ro2 + rd2 * ta;
  // the legs stand clear below the board
  if (q.y < 0.6) {
    float leg = abs(fract((q.x + 4.3) / 2.15 + 0.5) - 0.5) * 2.15;
    if (leg > 0.08) return vec4(0.0);
  }
  float beam = scBeam(rd * ta);
  vec3 alb = fract((q.x + q.y) * 0.8) < 0.5 ? vec3(0.9, 0.62, 0.08) : vec3(0.03);
  if (q.y < 0.6) alb = vec3(0.1);
  vec3 c2 = alb * (mix(SC_H, SC_M, 0.5) * 0.5 + vec3(1.0, 0.95, 0.85) * beam * 5.0);
  tBest = ta;
  return vec4(c2, 1.0);
}

// ---- the car, in its own frame: +z the nose, +y up, y = 0 the road at rest ----
float scSmin(float a, float b, float k) { float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
float scSmax(float a, float b, float k) { return -scSmin(-a, -b, k); }

// the lower body's top: the wedge from nose to tail, with its bulges
float scTopLow(float ax, float z) {
  float t = 0.6 + 0.305 * clamp((2.45 - z) / 1.85, 0.0, 1.0) + 0.04 * smoothstep(0.6, -2.4, z);
  t -= 0.085 * ax * ax;                                        // the crown across it
  float bw = 0.34 + 0.13 * smoothstep(0.8, 2.2, z);            // the raised middle of the bonnet
  t += 0.034 * smoothstep(bw + 0.035, bw - 0.035, ax) * smoothstep(2.32, 1.9, z) * smoothstep(0.55, 0.85, z);
  float zf = clamp(1.0 - abs(z - 1.33) / 0.85, 0.0, 1.0), zr = clamp(1.0 - abs(z + 1.23) / 0.95, 0.0, 1.0);
  t += 0.05 * zf * zf * (3.0 - 2.0 * zf) * smoothstep(0.5, 0.78, ax);    // over the front wheels
  t += 0.048 * zr * zr * (3.0 - 2.0 * zr) * smoothstep(0.55, 0.82, ax);  // the hips over the rear ones
  t += 0.028 * smoothstep(-2.2, -2.36, z);                     // the lip at the tail
  return t;
}

// the glasshouse's top: a raked screen bowed in plan, a short roof, a long bubble of glass behind
float scTopCab(float ax, float z) {
  float zz = z + 0.4 * ax * ax;
  float screen = 0.89 + (0.62 - zz) * 0.49;
  float back = 0.975 + (zz + 2.08) * 0.2;
  float t = scSmin(scSmin(screen, 1.252, 0.05), back, 0.07);
  float wc = 0.77 - 0.1 * smoothstep(-1.0, -2.1, z);
  return scSmin(t, 0.87 + (wc - ax) * 2.7, 0.05);
}

float scBody(vec3 q) {
  float ax = abs(q.x), z = q.z, y = q.y;
  float top = scSmax(scTopLow(ax, z), scTopCab(ax, z), 0.012);
  // the plan: a shallow V at the nose; the upper face leaning back; a band set in for the lamps
  float zf = 2.45 - 0.3 * ax * sqrt(ax);
  zf -= 0.55 * max(y - 0.47, 0.0);
  zf -= 0.055 * smoothstep(0.235, 0.25, y) * smoothstep(0.37, 0.355, y);
  float zb = -2.42 + 0.08 * ax * ax;
  float w = 0.925 - 0.03 * max(1.0 - z * z, 0.0) - 0.12 * smoothstep(1.9, 2.45, z) - 0.05 * smoothstep(0.42, 0.2, y) - 0.03 * smoothstep(-1.9, -2.42, z) - 0.035 * smoothstep(0.58, 0.86, y);
  float d = scSmax(y - top, ax - w, 0.045);
  d = max(d, z - zf);
  d = max(d, zb - z);
  d = max(d, (z > 1.9 ? 0.15 : 0.19) - y);
  // the wheel arches
  float wa = min(length(vec2(z - 1.33, y - 0.33)), length(vec2(z + 1.23, y - 0.33)));
  d = max(d, min(0.395 - wa, ax - 0.56));
  // the mirrors
  vec3 m = vec3(ax - 0.885, y - 0.925, z - 0.5);
  d = min(d, (length(m / vec3(0.07, 0.04, 0.038)) - 1.0) * 0.035);
  return d;
}

float scWheel(vec3 q, out vec3 w) {
  bool lf = q.x < 0.0, fr = q.z > 0.05;
  float wy = fr ? (lf ? uScWheel.x : uScWheel.y) : (lf ? uScWheel.z : uScWheel.w);
  w = q - vec3(lf ? -0.79 : 0.79, wy, fr ? 1.33 : -1.23);
  if (fr) {
    float c = cos(uScCar[1].w), s = sin(uScCar[1].w);
    w = vec3(c * w.x - s * w.z, w.y, s * w.x + c * w.z);
  }
  vec2 e = vec2(length(w.yz) - 0.3, abs(w.x) - 0.1);
  return min(max(e.x, e.y), 0.0) + length(max(e, 0.0)) - 0.028;
}

float scMap(vec3 q) {
  vec3 w;
  return min(scBody(q) * 0.62, scWheel(q, w));
}

// march the ray through the car's box; the distance along it, or -1
float scCarHit(vec3 ro, vec3 rd) {
  vec3 inv = 1.0 / (rd + vec3(1e-5));
  vec3 lo = vec3(-1.08, 0.0, -2.52), hi = vec3(1.08, 1.32, 2.52);
  vec3 t0 = (lo - ro) * inv, t1 = (hi - ro) * inv;
  vec3 tn = min(t0, t1), tf = max(t0, t1);
  float ta = max(max(max(tn.x, tn.y), tn.z), 0.0), tb = min(min(tf.x, tf.y), tf.z);
  if (tb < ta) return -1.0;
  float t = ta;
  for (int i = 0; i < 30; i++) {
    vec3 q = ro + rd * t;
    float hull = max(q.y - mix(1.29, 0.68, clamp((q.z - 0.2) / 2.3, 0.0, 1.0)), abs(q.x) - 1.0) * 0.9;
    float d = hull > 0.14 ? hull : scMap(q);
    if (d < 0.0012 + t * 0.00035) return t;
    t += max(d, 0.004 + t * 0.0012);
    if (t > tb) return -1.0;
  }
  return t;
}

// the paint and the glass, the lamps and the light in the nose
vec3 scCarColour(vec3 q, vec3 rdW, vec3 Pw, float t) {
  const vec2 e = vec2(0.0035, -0.0035);
  vec3 n = normalize(e.xyy * scMap(q + e.xyy) + e.yyx * scMap(q + e.yyx) + e.yxy * scMap(q + e.yxy) + e.xxx * scMap(q + e.xxx));
  vec3 nw = normalize(scR * n.x + scU * n.y + scF * n.z);
  float ax = abs(q.x), z = q.z, y = q.y;
  float cosV = max(dot(nw, -rdW), 0.0);
  vec3 r = reflect(rdW, nw);
  vec3 env = scEnv(r);
  // the poles going by, sliding across the shine
  if (r.y > 0.02 && r.x > 0.06) {
    float zh = Pw.z + uScZ.w + r.z / r.x * 10.5;
    float fh = abs(fract(zh / 30.0) - 0.5) * 30.0;
    env *= 1.0 - 0.8 * smoothstep(0.0, 0.5, 0.22 - (15.0 - fh) * 0.05);
  }
  float fres = pow(1.0 - cosV, 5.0);
  vec3 w;
  float wd = scWheel(q, w);
  vec3 col;
  // ---- a wheel
  if (wd < scBody(q) * 0.62 + 0.002) {
    float rr = length(w.yz);
    float rim = 0.0;
    vec3 tyre = vec3(0.012) + 0.05 * nw.y * max(nw.y, 0.0) * mix(SC_H, SC_M, 0.5);
    if (ax > 0.82 && rr < 0.215) {
      // a dark dish with a bright ring, its spokes a blur at speed
      float a = atan(w.y, w.z) + uScCar[2].w;
      float blur = smoothstep(4.0, 22.0, uScCar[0].w);
      float spokes = mix(step(0.5, fract(a * 6.0 / 6.28318)), 0.5, blur);
      rim = smoothstep(0.215, 0.2, rr) * smoothstep(0.175, 0.19, rr);
      col = vec3(0.02 + 0.04 * spokes) * (0.6 + env) + rim * (env * 0.22 + vec3(0.06));
    } else {
      col = tyre;
    }
    return col;
  }
  // ---- what the body is made of here: 0 paint, 1 glass, 2 dull black
  float mat = 0.0;
  float low = scTopLow(ax, z), cab = scTopCab(ax, z);
  float zz = z + 0.4 * ax * ax;
  bool onCab = cab > low + 0.004 && y > low - 0.01;
  if (onCab) {
    if (zz < 0.62 && zz > -0.13) mat = ax < 0.645 - 0.13 * (0.62 - zz) ? 1.0 : 0.0;   // the screen, its pillars in paint
    if (zz <= -0.13 && zz > -0.72) mat = abs(q.x) < 0.045 ? 0.0 : 1.0;      // the roof's two dark glass panels
    if (zz <= -0.72 && zz > -2.03) mat = ax < 0.63 - 0.12 * smoothstep(-1.0, -2.1, z) ? 1.0 : 0.0;   // the bubble of glass behind
    if (n.x * n.x > 0.42 && y > 0.915 && z < 0.34 && z > -1.25) mat = 1.0;  // the side windows
  }
  if ((y < 0.3 && z < 1.85) || n.y < -0.6) mat = 2.0;
  if (ax > 0.81 && y > 0.87 && z > 0.42 && z < 0.58) mat = 2.0;     // the mirrors                            // the sills
  if (z > 0.6 && z < 0.74 && !onCab && ax < 0.74) mat = 2.0;     // the cowl's dark strip
  float gloss = mat < 0.5 ? 0.13 : (mat < 1.5 ? 0.075 : 0.02);
  float graze = mat > 1.5 ? 0.35 : (mat > 0.5 ? 0.42 : 0.62);
  // (from above, the paint holds the sky's glow; what faces us holds less of the horizon)
  if (mat < 0.5) { env += SC_M * 0.3 * max(r.y, 0.0); if (n.z > 0.55) gloss *= 0.62; }
  col = env * (gloss + (1.0 - gloss) * fres * graze);
  col += vec3(0.008, 0.008, 0.011) + mix(SC_H, SC_M, 0.6) * 0.05 * max(nw.y, 0.0) * (mat > 1.5 ? 0.3 : 1.0);
  // a highlight along the sun's line of the sky
  vec3 sunD = normalize(vec3(scSun.x, 0.12, scSun.y));
  col += SC_H * pow(max(dot(r, sunD), 0.0), 60.0) * (mat > 1.5 ? 0.1 : 1.1);
  // the headlamps' spill and the boost's fire from below
  col += vec3(1.0, 0.42, 0.1) * uScFx.y * max(-nw.y - 0.3, 0.0) * 0.22;
  if (mat > 0.5 && mat < 1.5) {
    // behind the screen: the dash's small lights, low down
    if (zz < 0.62 && zz > -0.13) {
      float dl = smoothstep(0.32, 0.56, zz);
      vec2 g = vec2(q.x * 26.0, zz * 16.0);
      float on = step(0.72, hash12(floor(g))) * (0.5 + 0.5 * sin(uTime * 7.0 + hash12(floor(g) + 3.0) * 40.0));
      vec3 lamp = hash12(floor(g) + 1.0) > 0.45 ? vec3(1.0, 0.12, 0.05) : vec3(1.0, 0.55, 0.1);
      col += lamp * on * dl * 0.35 * smoothstep(0.5, 0.1, length(fract(g) - 0.5));
    }
  }
  // ---- the seams and lamps that make the car read
  if (n.y > 0.5 && z > 1.0 && !onCab) {
    // the headlamp lids lying shut at the corners of the bonnet
    vec2 l = abs(vec2(ax - 0.595, z - 1.87)) - vec2(0.2, 0.27);
    float lid = length(max(l, 0.0)) + min(max(l.x, l.y), 0.0);
    col *= 1.0 - 0.8 * smoothstep(0.013, 0.004, abs(lid));
  }
  if (n.x * n.x > 0.3 && !onCab) {
    // the door's cuts, the strip along the flank, the amber lamp ahead of the wheel
    float seam = min(abs(z - 0.42), abs(z + 0.95));
    col *= 1.0 - 0.8 * smoothstep(0.012, 0.004, seam) * step(0.28, y) * step(y, 0.88);
    col = mix(col, vec3(0.012), smoothstep(0.018, 0.006, abs(y - 0.47)) * 0.9);
    if (z > 1.74 && z < 1.98 && y > 0.5 && y < 0.56) col = vec3(0.75, 0.32, 0.03) * (0.35 + 0.3 * uHat);
  }
  // the nose
  if (z > 1.95 && n.z > 0.15) {
    float halfW = 0.26 + (y - 0.515) * 0.45;
    if (y > 0.515 && y < 0.598 && ax < halfW) {
      // the slot: dark glass, eight lamps, the one lit burning hot
      float sx = (q.x + halfW) / (2.0 * halfW);
      float cell = fract(sx * 8.0);
      float lit = scLamp(sx) * (0.9 + 0.8 * uKick);
      float shape = smoothstep(0.0, 0.09, cell) * smoothstep(1.0, 0.91, cell) * smoothstep(0.515, 0.525, y) * smoothstep(0.598, 0.588, y);
      col = vec3(0.09, 0.004, 0.004) + env * 0.1;
      col += vec3(1.0, 0.07, 0.03) * lit * shape * 2.6 + vec3(1.0, 0.55, 0.35) * pow(lit, 4.0) * shape * 1.8;
    } else if (y < 0.365 && y > 0.235) {
      // the dark band across the nose and its lamps, the beak of the body coming down between them
      if (!(ax < 0.27 && y > 0.3)) {
        col = env * 0.05 + vec3(0.006);
        float g = mod(ax - 0.31, 0.165);
        float cellN = floor((ax - 0.31) / 0.165);
        if (ax > 0.31 && cellN < 3.0 && g < 0.125 && y > 0.272 && y < 0.326) {
          vec2 lens = vec2((g - 0.0625) / 0.0625, (y - 0.299) / 0.027);
          float ribs = 0.72 + 0.28 * sin(g * 240.0);
          col = vec3(1.0, 0.95, 0.8) * (0.8 + 0.6 * uKick) * ribs * (0.55 + 0.45 * (1.0 - dot(lens, lens) * 0.5));
        }
      }
    } else if (y < 0.235 && y > 0.19 && ax < 0.56) {
      col = env * 0.04 + vec3(0.005);                            // the chin's air slot
    }
  }
  // the tail: a black panel the width of the car, a red line along its foot
  if (z < -2.2 && n.z < -0.3) {
    if (y > 0.6 && y < 0.83) {
      col = env * 0.05 + vec3(0.006);
      float slat = smoothstep(0.3, 0.5, abs(fract(y * 40.0) - 0.5));
      col += vec3(0.5, 0.02, 0.01) * (0.14 + 0.9 * uScCar[3].w) * slat * step(0.05, ax);
      if (y < 0.635) col = vec3(1.0, 0.06, 0.03) * (0.7 + 1.5 * uScCar[3].w);
    }
    if (y < 0.33) col = vec3(0.008);
  }
  return col;
}

// ---- light in the air ----
vec2 scScreen(vec3 v) {
  float z = dot(v, uScCam[3].xyz);
  if (z < 0.2) return vec2(1e3);
  return vec2(dot(v, uScCam[1].xyz), dot(v, uScCam[2].xyz)) * uScCam[0].w / z;
}

vec3 scFlares(vec2 p, float tScene) {
  vec3 c = vec3(0.0);
  vec3 toEye = -scC;
  float facing = dot(normalize(toEye), scF);
  if (facing > 0.0) {
    float s = smoothstep(0.0, 0.3, facing);
    // the light in the nose: a hot point, a wide soft glow and a streak across the lens
    vec3 lp = scC + scF * 2.4 + scU * 0.56 + scR * scSweep() * 0.27;
    vec2 d = p - scScreen(lp);
    float dist = length(lp);
    float size = clamp(uScCam[0].w * 3.0 / dist, 0.02, 1.2);
    float q = dot(d, d) / (size * size);
    c += vec3(1.0, 0.07, 0.03) * s * (0.55 + 0.5 * uKick) * (0.7 * exp(-q * 900.0) + 0.1 * exp(-q * 110.0) + 0.016 * exp(-q * 9.0));
    c += vec3(1.0, 0.12, 0.05) * s * 0.11 * exp(-abs(d.y) / (0.012 * size + 0.002)) * exp(-abs(d.x) / (size * 0.9 + 0.05));
    // the headlamps
    for (int k = 0; k < 2; k++) {
      float sd = k == 0 ? -1.0 : 1.0;
      vec3 hl = scC + scF * 2.32 + scU * 0.3 + scR * sd * 0.56;
      vec2 hd = p - scScreen(hl);
      float hq = dot(hd, hd) / (size * size);
      c += vec3(1.0, 0.93, 0.78) * s * s * (0.7 + 0.4 * uKick) * (0.55 * exp(-hq * 900.0) + 0.1 * exp(-hq * 60.0) + 0.012 * exp(-hq * 5.0));
      c += vec3(0.75, 0.82, 1.0) * s * s * 0.07 * exp(-abs(hd.y) / (0.008 * size + 0.002)) * exp(-abs(hd.x) / (size * 1.3 + 0.08));
    }
  } else {
    // the tail lamps from behind
    float s = smoothstep(0.0, -0.4, facing);
    for (int k = 0; k < 2; k++) {
      float sd = k == 0 ? -1.0 : 1.0;
      vec3 hl = scC - scF * 2.44 + scU * 0.66 + scR * sd * 0.55;
      vec2 hd = p - scScreen(hl);
      float dist = length(hl);
      float size = clamp(uScCam[0].w * 3.0 / dist, 0.02, 1.2);
      float hq = dot(hd, hd) / (size * size);
      c += vec3(1.0, 0.06, 0.03) * s * (0.22 + 0.9 * uScCar[3].w) * (exp(-hq * 110.0) + 0.07 * exp(-hq * 10.0));
    }
  }
  // the boost: two jets of fire under the car, and at the tail
  if (uScFx.y > 0.01) {
    for (int k = 0; k < 2; k++) {
      float sd = k == 0 ? -1.0 : 1.0;
      vec3 j = scC - scF * 2.0 + scU * 0.2 + scR * sd * 0.5;
      vec2 hd = p - scScreen(j);
      float dist = length(j);
      float size = clamp(uScCam[0].w * 3.0 / dist, 0.02, 1.2);
      float hq = dot(hd, hd) / (size * size);
      float fl = 0.75 + 0.35 * sin(uTime * 83.0 + sd * 2.0);
      c += mix(vec3(1.0, 0.3, 0.05), vec3(1.0, 0.85, 0.5), fl * 0.5) * uScFx.y * fl * (0.8 * exp(-hq * 170.0) + 0.06 * exp(-hq * 12.0));
    }
  }
  return c;
}

// the headlamps' beams in the dusty air, seen from outside them
vec3 scHaze(vec3 rd, float tScene) {
  vec3 mid = scC + scF * 22.0;
  float al = dot(mid, rd);
  vec3 off = mid - rd * al;
  if (dot(off, off) > 420.0) return vec3(0.0);
  float a = max(al - 28.0, 0.5), b = min(al + 28.0, tScene);
  if (b <= a) return vec3(0.0);
  float dt = (b - a) / 4.0, t = a + dt * hash12(gl_FragCoord.xy + fract(uTime));
  float s = 0.0;
  for (int i = 0; i < 4; i++) { s += scBeam(rd * t); t += dt; }
  return vec3(1.0, 0.94, 0.82) * s * dt * 0.0085;
}

vec3 scParticles(vec3 col, vec3 rd, float tScene) {
  for (int i = 0; i < 24; i++) {
    vec4 e = uScPart[i];
    if (e.w == 0.0) break;
    float along = dot(e.xyz, rd);
    if (along < 0.2 || along > tScene + 1.0) continue;
    vec3 off = e.xyz - rd * along;
    float pp = dot(off, off);
    if (e.w > 0.0) {
      float r = max(along * scPix * 1.6, 0.03);
      col += vec3(1.0, 0.62, 0.2) * e.w * (exp(-pp / (r * r)) * 2.4 + 0.25 * exp(-pp / (r * r * 16.0)));
    } else {
      float life = -e.w;
      float r = 0.7 + 2.0 * (1.0 - life);
      float a = exp(-pp / (r * r)) * life * 0.55;
      col = mix(col, mix(SC_H, vec3(0.5, 0.4, 0.3), 0.55) * 0.8, a);
    }
  }
  return col;
}

// ---- from the driver's seat: the screen, the bonnet ahead, the dash and the car's voice ----
vec3 scDash(vec2 p, vec3 world) {
  vec3 col = world;
  float x = p.x, y = p.y;
  float ax = abs(x);
  // the bonnet going away from the screen, the sky along it, the red light's glow at its far edge
  float hb = -0.09 - 0.07 * ax * ax;
  if (y < hb) {
    float u = (hb - y) / 0.2;
    vec3 sh = mix(SC_H * 0.34 + SC_M * 0.06, SC_M * 0.06, smoothstep(0.0, 0.7, u));
    sh *= 1.0 - 0.45 * smoothstep(0.012, 0.0, abs(ax - 0.17 - u * 0.14));
    sh += vec3(0.012);
    col = sh;
    float sw = scSweep();
    col += vec3(1.0, 0.07, 0.03) * exp(-pow((x - sw * 0.09) * 9.0, 2.0)) * exp(-u * 9.0) * (0.7 + 0.5 * uKick);
  }
  // the screen's frame: the pillars, the roof, the mirror
  float pil = ax - (0.78 - y * 0.42);
  if (pil > 0.0) col = vec3(0.012) + SC_M * 0.015;
  if (y > 0.43 - 0.03 * ax * ax) col = vec3(0.01);
  vec2 mq = abs(p - vec2(0.0, 0.405)) - vec2(0.17, 0.038);
  if (max(mq.x, mq.y) < 0.0) col = mix(SC_T * 0.3, SC_H * 0.3, smoothstep(0.37, 0.42, y));
  // the dash
  float top = -0.2 - 0.05 * ax * ax;
  if (y < top) {
    col = vec3(0.016, 0.016, 0.02) + vec3(0.012) * smoothstep(top - 0.05, top, y);
    // the small lights: rows in amber, red and green, flickering with the music
    vec2 g = vec2(x * 34.0, y * 34.0);
    vec2 cell = floor(g);
    bool panel = (ax > 0.3 && ax < 0.72 && y > -0.44 && y < -0.26);
    if (panel && mod(cell.y, 3.0) < 1.5) {
      float h = hash12(cell);
      float rowOn = step(fract(x * 1.5 + cell.y * 0.37), 0.25 + 0.75 * (0.5 + 0.5 * sin(uTime * 2.0 + cell.y)) * (0.35 + uArp + uHat));
      vec3 lamp = h > 0.66 ? vec3(1.0, 0.1, 0.04) : (h > 0.33 ? vec3(1.0, 0.56, 0.08) : vec3(0.25, 1.0, 0.25));
      vec2 fr = abs(fract(g) - 0.5);
      col += lamp * rowOn * (0.25 + 1.2 * h) * step(fr.x, 0.42) * step(fr.y, 0.34);
    }
    // the speed, in red segments on the left
    vec2 sq = (p - vec2(-0.66, -0.29)) / 0.03;
    float mph = floor(uScFx.w * 2.237 + 0.5);
    for (int k = 0; k < 3; k++) {
      float pw = k == 0 ? 100.0 : (k == 1 ? 10.0 : 1.0);
      int dg = int(mod(floor(mph / pw), 10.0));
      vec2 dq = sq - vec2(float(k) * 1.5, 0.0);
      if (dq.x > 0.0 && dq.x < 1.0 && dq.y > 0.0 && dq.y < 2.0) col = mix(col, vec3(1.0, 0.1, 0.04), digit7(dq, dg));
    }
    // the car's voice: three columns of bars opening from the middle, talking with the melody
    vec2 c = p - vec2(0.0, -0.355);
    float box = max(abs(c.x) - 0.215, abs(c.y) - 0.125);
    if (box < 0.0) {
      col = vec3(0.018, 0.003, 0.003);
      float amt[3];
      amt[0] = clamp(uBass * 0.8 + uPad * 0.25, 0.0, 1.0);
      amt[1] = clamp(uLead * 0.9 + uArp * 0.5 + uKick * 0.15, 0.0, 1.0);
      amt[2] = clamp(uStab * 0.5 + uSnare * 0.55 + uArp * 0.4, 0.0, 1.0);
      for (int k = 0; k < 3; k++) {
        float cx = (float(k) - 1.0) * 0.14;
        float dx = abs(c.x - cx);
        if (dx < (k == 1 ? 0.06 : 0.05)) {
          float rows = 5.0;
          float row = floor(abs(c.y) / 0.115 * rows);
          float rf = fract(abs(c.y) / 0.115 * rows);
          float lit = step((row + 0.5) / rows, amt[k] * (k == 1 ? 1.0 : 0.82) + 0.06);
          float seg = step(rf, 0.68) * step(abs(c.y), 0.115);
          float hot = 1.0 - row / rows * 0.4;
          col += vec3(1.0, 0.07, 0.03) * seg * (0.1 + lit * 1.9 * hot);
        }
      }
    }
    // its glow on the glass above and the dark round it
    col += vec3(1.0, 0.07, 0.03) * 0.09 * (uLead + uBass * 0.6) * exp(-dot(c, c) * 9.0);
    // the wheel, in shadow against the lights
    vec2 wq = (p - vec2(-0.43, -0.56)) * vec2(1.0, 1.15);
    float wd = abs(length(wq) - 0.3) - 0.024;
    if (wd < 0.0) col = vec3(0.006);
  }
  return col;
}

vec3 render(vec2 p, vec2 uv) {
  // the seed's dusk
  float k = uSeed.z;
  if (k < 0.34) { SC_H = vec3(1.0, 0.5, 0.2); SC_M = vec3(0.62, 0.2, 0.34); SC_T = vec3(0.05, 0.05, 0.17); }
  else if (k < 0.67) { SC_H = vec3(0.98, 0.34, 0.46); SC_M = vec3(0.42, 0.13, 0.5); SC_T = vec3(0.04, 0.03, 0.16); }
  else { SC_H = vec3(0.62, 0.62, 0.66); SC_M = vec3(0.18, 0.28, 0.5); SC_T = vec3(0.02, 0.04, 0.13); }
  float sa = uSeed.x * 6.28318;
  scSun = vec2(cos(sa), sin(sa));

  scC = uScCar[0].xyz; scR = uScCar[1].xyz; scU = uScCar[2].xyz; scF = uScCar[3].xyz;
  float lens = uScCam[0].w;
  bool dash = uScCam[2].w > 0.5;
  // a blow from the kick, and from the landing
  vec2 pv = p * (1.0 - 0.02 * uKick - 0.05 * uScFx.x);
  if (dash) pv.y += 0.1;
  scPix = 1.0 / (lens * uRes.y);
  vec3 rd = normalize(pv.x * uScCam[1].xyz + pv.y * uScCam[2].xyz + lens * uScCam[3].xyz);

  float tBest = 1e4;
  vec3 col = scSky(rd, 1.0);
  float tg = scGroundHit(rd);
  if (tg > 0.0) { col = scGround(rd * tg, rd, tg); tBest = tg; }

  vec4 ba = scBarrier(rd, tBest);
  if (ba.w > 0.0) col = ba.xyz;
  vec4 pr = scProps(rd, tBest);
  if (pr.w > 0.0) col = mix(col, pr.xyz, pr.w);
  vec4 wi = scWires(rd, tBest);
  if (wi.w > 0.0) col = mix(col, wi.xyz, wi.w);

  // the barrier's lamps, flashing in turn on the beat
  if (abs(uScBar.z) < 700.0) {
    float c = cos(uScBar.w), s = sin(uScBar.w);
    for (int i = 0; i < 4; i++) {
      float lx = (float(i) - 1.5) * 2.6;
      vec3 L = uScBar.xyz + vec3(c * lx, 1.24, -s * lx);
      float on = mod(float(i) + floor(uTime / uSpb * 2.0), 2.0) < 0.5 ? 1.0 : 0.08;
      vec2 d = pv - scScreen(L);
      float size = clamp(lens * 2.5 / length(L), 0.012, 0.6);
      col += vec3(1.0, 0.6, 0.1) * on * (1.2 * exp(-dot(d, d) / (size * size) * 60.0) + 0.2 * exp(-dot(d, d) / (size * size) * 6.0));
    }
  }

  // the car, from its own point of view
  if (!dash) {
    vec3 ro2 = vec3(dot(-scC, scR), dot(-scC, scU), dot(-scC, scF));
    vec3 rd2 = vec3(dot(rd, scR), dot(rd, scU), dot(rd, scF));
    float tc = scCarHit(ro2, rd2);
    if (tc > 0.0 && tc < tBest) {
      tBest = tc;
      col = scCarColour(ro2 + rd2 * tc, rd, rd * tc, tc);
      col = mix(col, SC_H * 0.62 + SC_M * 0.2, 1.0 - exp(-tc * 0.0021));
    }
  }

  if (!dash) col += scHaze(rd, tBest);
  col = scParticles(col, rd, tBest);
  if (dash) {
    col = scDash(p, col);
    col += vec3(1.0, 0.9, 0.7) * uScFx.x * 0.3;
    return col;
  }
  col += scFlares(pv, tBest);
  // the landing's flash
  col += (SC_H * 0.6 + vec3(0.4)) * uScFx.x * uScFx.x * 0.16;
  // and the eye goes dark at the edges, keeping the car
  col *= 1.0 - 0.28 * dot(p, p);
  return col / (1.0 + max(max(col.r, max(col.g, col.b)) - 0.85, 0.0) * 0.5);
}
`;

const pipes = `
// The 3D pipes screensaver of the mid-90s office PC: on black, shiny pipes of
// solid colours growing cell by cell through a deep grid, turning at right
// angles - mostly a smooth elbow, now and then a ball joint - never through a
// cell another pipe holds. The growing is a simulation (src/core/sims.js) that
// also places the camera, above the tangle at an angle, new for each one; this
// draws the runs it projected, the nearest at each pixel, lit with a highlight
// as the screensavers of the time drew them. The tangle fills from the distance forwards for sixteen
// bars until the screen is full of pipes, then dissolves in blocks through the
// last bar (never a flash). The camera punches in on the kick and leans on the
// snare; the ball joints swell on the kick.
uniform vec4 uPipeA[192];  // a run's start on the screen: x, y, depth, colour
uniform vec4 uPipeB[192];  // its end: x, y, depth, joint at the start (0 none, 1 elbow, 2 ball)
uniform vec4 uPipeInfo;    // runs in use, how far into the sixteen bars, the tangle's number

const float PIPE_R = 0.27;
const float PIPE_FL = 1.9;
vec3 pipeCol(float k) {
  float i = mod(k + floor(uSeed.z * 6.0), 6.0);
  if (i < 0.5) return vec3(0.2, 0.75, 0.35);      // green
  if (i < 1.5) return vec3(0.15, 0.65, 0.7);      // teal
  if (i < 2.5) return vec3(0.9, 0.45, 0.15);      // orange
  if (i < 3.5) return vec3(0.8, 0.8, 0.84);       // white
  if (i < 4.5) return vec3(0.85, 0.2, 0.15);      // red
  return vec3(0.9, 0.8, 0.25);                     // yellow
}

// one light from the upper left, a white highlight; the far pipes a little dimmer
vec3 pipeLit(vec3 base, vec3 n, float z) {
  vec3 L = normalize(vec3(-0.45, 0.6, -0.66));
  vec3 H = normalize(L + vec3(0.0, 0.0, -1.0));
  vec3 c = base * (0.28 + 0.8 * max(dot(n, L), 0.0)) + vec3(0.9) * pow(max(dot(n, H), 0.0), 40.0);
  return c * exp(-(z - 15.0) * 0.035);
}

vec3 render(vec2 p, vec2 uv) {
  // a punch in on the kick, a lean on the snare
  p = rot(0.04 * uSnare * (mod(uBarIndex, 2.0) * 2.0 - 1.0)) * p;
  p *= 1.0 - 0.08 * uKick;

  vec3 col = vec3(0.0);
  float zb = 1e9;
  for (int i = 0; i < 192; i++) {
    if (float(i) >= uPipeInfo.x) break;
    vec4 A4 = uPipeA[i], B4 = uPipeB[i];
    vec2 A = A4.xy, ab = B4.xy - A4.xy;
    vec3 base = pipeCol(A4.w) * (0.85 + 0.25 * uPad);
    // the run: a polished cylinder from cell centre to cell centre
    float len2 = dot(ab, ab);
    if (len2 > 1e-8) {
      float h = dot(p - A, ab) / len2;
      if (h >= 0.0 && h <= 1.0) {
        float z = mix(A4.z, B4.z, h);
        vec2 q = p - A - ab * h;
        float d = length(q);
        float r = PIPE_R * PIPE_FL / z;
        if (d < r) {
          float u = d / r, s = sqrt(1.0 - u * u);
          float zs = z - PIPE_R * s;
          if (zs < zb) {
            zb = zs;
            col = pipeLit(base, vec3(q / max(d, 1e-6) * u, -s), z);
          }
        }
      }
    }
    // the joint where the run starts: an elbow as wide as the pipe, or a ball that swells on the kick
    if (B4.w > 0.5) {
      float rj = PIPE_R;
      if (B4.w > 1.5) rj = PIPE_R * (1.5 + 0.25 * uKick);
      vec2 n2 = (p - A) / (rj * PIPE_FL / A4.z);
      float r2 = dot(n2, n2);
      if (r2 < 1.0) {
        float nz = sqrt(1.0 - r2);
        float zs = A4.z - rj * nz;
        if (zs < zb) {
          zb = zs;
          col = pipeLit(base, vec3(n2, -nz), A4.z);
        }
      }
    }
  }
  // the last bar: the full screen dissolves away in blocks before the next tangle grows
  float gone = smoothstep(0.935, 0.995, uPipeInfo.y);
  float cell = hash12(floor(p * 40.0) + uPipeInfo.z * 7.31);
  if (cell < gone) col = vec3(0.0);
  return col;
}
`;

const pyramid = `
// The cube-pyramid hopper of the 1982 arcades, played: twenty-eight cubes in
// seven rows on black, each with a top that turns colour when it is landed on,
// a light left face and a dark right one. The hopper (round, green, big-eyed -
// no character of the arcades) hops a cube a beat to turn them all, landing
// on the beat; the arcade's enemies come down between the beats: red balls
// dropping onto the second row and bouncing down at random until they fall off
// the bottom, and a purple egg that bounces to the bottom row and hatches into
// the coiled snake, which chases. A ball or the snake on its cube is a hit: it
// stops and swears in a balloon, the board is cleared, and it goes on. A disc
// beside the third row on each side, turning with the hats: with the snake
// close behind, the hopper rides one to the top and the snake, following,
// falls. The game is a simulation (src/core/sims.js); this draws it, with the
// music on top: the pyramid builds itself a row an eighth note, every landing
// sends a ripple through the cubes, the hopper crouches, stretches and
// squashes, and a won round is a wave of jumping cubes before the pyramid
// falls away.
uniform vec4 uPyrHop;      // the hopper: the cube it is on (row, column), the one it lands on next
uniform vec4 uPyrHop2;     // how far through the hop (or the ride), what it is doing (0 hop, 1 hit, 2 ride), the disc's side
uniform vec4 uPyrTops;     // the tops turned (two bit masks), the round's phase (0 build, 1 play, 2 won, 3 fall), beats into it
uniform vec4 uPyrE[3];     // the enemies: the cube each is on, the one it lands on next
uniform vec4 uPyrK[3];     // what each is (0 none, 1 red ball, 2 egg, 3 snake), how far through its hop, falling, hatching
uniform vec4 uPyrInfo;     // the score, the left disc there, the right disc there, the round

const float PW = 0.13;                 // a cube's width
// the top centre of cube (row r, column c); between cubes too, and off the pyramid
vec2 pyrTop(float r, float c) { return vec2((c - r * 0.5) * PW, 0.27 - r * PW * 0.75); }

// is the top of cube (r, c) turned?
float pyrTurned(float r, float c) {
  float k = r * (r + 1.0) * 0.5 + c;
  if (k < 9.5) return mod(floor(uPyrTops.x / exp2(k) + 0.001), 2.0);
  return mod(floor(uPyrTops.y / exp2(k - 10.0) + 0.001), 2.0);
}

// how far cube (r, c) sits above its place now (9 when it is not there yet)
float pyrLift(float r, float c, vec2 now, float f) {
  float ph = uPyrTops.z, pt = uPyrTops.w;
  float y = 0.0;
  if (ph < 0.5) {
    // built from the bottom row up, a row on each eighth note: it drops in and settles with a bounce
    float tA = 0.5 + (6.0 - r) * 0.5;
    float u = (pt - tA + 0.5) / 0.5;
    if (u <= 0.0) return 9.0;
    if (u < 1.0) y += 0.7 * (1.0 - u) * (1.0 - u);
    else y += 0.02 * exp(-(pt - tA) * 10.0) * abs(sin((pt - tA) * 18.0));
  } else if (ph < 1.5) {
    // each landing sends a ripple out through the cubes round it; the cube landed on gives under it
    if (uPyrHop2.y < 0.5) {
      float d = length(pyrTop(r, c) - pyrTop(now.x, now.y)) / PW;
      if (d < 0.5) y -= 0.012 * exp(-f * 8.0);
      else { float w = d - f * 5.0; y += 0.016 * exp(-w * w * 2.0) * (1.0 - f); }
    }
  } else if (ph < 2.5) {
    // the round won: the cubes jump in a wave down the pyramid, once a beat
    y += 0.03 * max(0.0, sin(6.28318 * (pt - r * 0.12)));
  } else {
    // and then it falls away, the bottom row first
    float v = clamp((pt - (6.0 - r) * 0.08) / 0.35, 0.0, 1.0);
    y -= 1.5 * v * v;
  }
  return y;
}

// the swearing: a few cartoon symbols in a row, q in glyph cells of width 1
float pyrCurse(vec2 q) {
  float k = floor(q.x);
  if (k < 0.0 || k > 5.0 || q.y < 0.0 || q.y > 1.0) return 1.0;
  vec2 g = vec2(fract(q.x) - 0.5, q.y - 0.5);
  float d = 1.0;
  float s = mod(k, 4.0);
  if (s < 0.5) {                                                   // @
    d = min(abs(length(g) - 0.3), length(g - vec2(0.02, 0.0)) - 0.09);
  } else if (s < 1.5) {                                            // !
    d = min(sdSeg(g, vec2(0.0, 0.38), vec2(0.0, -0.1)), length(g - vec2(0.0, -0.32)) - 0.07);
  } else if (s < 2.5) {                                            // #
    d = min(min(sdSeg(g, vec2(-0.12, 0.35), vec2(-0.18, -0.35)), sdSeg(g, vec2(0.15, 0.35), vec2(0.09, -0.35))),
            min(sdSeg(g, vec2(-0.32, 0.12), vec2(0.3, 0.12)), sdSeg(g, vec2(-0.34, -0.12), vec2(0.28, -0.12))));
  } else {                                                         // ?
    d = min(abs(length(g - vec2(0.0, 0.17)) - 0.17) + max(0.0, -(g.y - 0.12)) * 2.0, sdSeg(g, vec2(0.0, 0.0), vec2(0.0, -0.12)));
    d = min(d, length(g - vec2(0.0, -0.33)) - 0.07);
  }
  return d - 0.1;
}

vec3 render(vec2 p, vec2 uv) {
  float ph = uPyrTops.z, pt = uPyrTops.w, lv = uPyrInfo.w;
  vec2 now = uPyrHop.xy, nxt = uPyrHop.zw;
  float f = uPyrHop2.x, mode = uPyrHop2.y;
  // each round its colours: the arcade's blue to yellow first, then others
  vec3 before = lv < 0.5 ? vec3(0.33, 0.3, 0.95) : pal(fract(uSeed.y + lv * 0.37));
  vec3 after = lv < 0.5 ? vec3(0.95, 0.9, 0.2) : pal(fract(uSeed.y + lv * 0.37 + 0.5));
  vec3 leftFace = vec3(0.25, 0.65, 0.62), rightFace = vec3(0.17, 0.24, 0.25);
  vec3 col = vec3(0.0);

  // the pyramid, back rows first so the front ones cover them
  for (int ri = 0; ri < 7; ri++) {
    float r = float(ri);
    for (int ci = 0; ci < 7; ci++) {
      float c = float(ci);
      if (c > r) break;
      vec2 q = p - pyrTop(r, c) - vec2(0.0, pyrLift(r, c, now, f));
      float hw = PW * 0.5, hh = PW * 0.25, side = PW * 0.5;
      if (abs(q.x) > hw || q.y > hh || q.y < -hh - side) continue;
      // which face: the top rhombus, or the left or right side below it
      if (abs(q.x) / hw + abs(q.y) / hh <= 1.0) {
        col = mix(before, after, pyrTurned(r, c));
        // the cube just landed on lights with the kick
        if (ph > 0.5 && ph < 1.5 && abs(now.x - r) < 0.5 && abs(now.y - c) < 0.5) col += vec3(0.3) * uKick;
        // the round won: the tops run through the colours, a wave down the rows
        if (ph > 1.5 && ph < 2.5) col = mix(after, pal(fract(r * 0.13 + c * 0.05 - pt * 0.5 + uSeed.y)), 0.75);
      } else {
        float edge = -(hw - abs(q.x)) * 0.5;            // the rhombus' lower edge above this x
        if (q.y <= edge && q.y >= edge - side) col = q.x < 0.0 ? leftFace : rightFace;
      }
    }
  }

  // the hopper: it drops onto the top as the pyramid finishes, then hops a cube a beat -
  // a crouch before it leaves, a stretch in the air, a squash as it lands on the beat
  vec2 cur = pyrTop(now.x, now.y) + vec2(0.0, pyrLift(now.x, now.y, now, f));
  vec2 hp = cur + vec2(0.0, 0.07);
  float sx = 1.0, sy = 1.0, lookX = 0.0, shown = 1.0;
  float ride = -1.0;
  if (ph < 0.5) {
    float u = (pt - 3.25) / 0.75;
    if (u <= 0.0) shown = 0.0;
    u = clamp(u, 0.0, 1.0);
    hp = pyrTop(0.0, 0.0) + vec2(0.0, 0.07 + 0.7 * (1.0 - u) * (1.0 - u));
    sy = 1.0 + 0.2 * (1.0 - u);
    sx = 1.0 / sy;
  } else if (ph < 1.5 && mode > 1.5) {
    // riding a disc up to the top, then dropping onto it
    ride = clamp(f, 0.0, 1.0);
    float u = smoothstep(0.0, 0.8, ride);
    hp = mix(pyrTop(now.x, now.y), pyrTop(0.0, 0.0) + vec2(0.0, 0.09), u) + vec2(0.0, 0.07 + 0.05 * sin(3.14159 * u));
    hp.y -= 0.09 * smoothstep(0.8, 1.0, ride) * smoothstep(0.8, 1.0, ride);
  } else if (ph < 1.5 && mode > 0.5) {
    // hit: it stands still and swears; a shiver on the snare
    hp.x += 0.004 * sin(uTime * 60.0) * uSnare;
  } else if (ph < 1.5) {
    vec2 b = pyrTop(nxt.x, nxt.y);
    if (nxt.x >= 0.0 && nxt.y >= 0.0 && nxt.y <= nxt.x) b.y += pyrLift(nxt.x, nxt.y, now, f);
    float lift = smoothstep(0.55, 1.0, f);            // it waits on the cube, then hops to land on the next beat
    float air = sin(3.14159 * lift);
    hp = mix(cur, b, lift) + vec2(0.0, 0.07 + (0.09 + 0.05 * uEnergy) * air);
    float crouch = smoothstep(0.38, 0.55, f) * (1.0 - smoothstep(0.55, 0.62, f));
    float land = exp(-f * 10.0);
    sy = 1.0 - 0.28 * crouch - 0.3 * land + 0.18 * air;
    sx = 1.0 + 0.22 * crouch + 0.25 * land - 0.1 * air;
    lookX = sign(b.x - cur.x + 1e-4) * 0.006;
  } else if (ph < 2.5) {
    // the round won: it bounces on the spot, a jump a beat
    float j = sin(3.14159 * fract(pt));
    float land = exp(-fract(pt) * 10.0);
    hp = cur + vec2(0.0, 0.07 + 0.07 * j);
    sy = 1.0 - 0.3 * land + 0.15 * j;
    sx = 1.0 + 0.25 * land - 0.08 * j;
  }
  hp.y -= 0.036 * (1.0 - sy);                         // the feet stay down as it squashes

  // the discs beside the third row, turning with the hats; the one ridden carries the hopper
  for (int sd = 0; sd < 2; sd++) {
    float there = sd == 0 ? uPyrInfo.y : uPyrInfo.z;
    vec2 dc = sd == 0 ? pyrTop(3.0, -1.0) : pyrTop(3.0, 4.0);
    dc.y += 0.01 * uBass * (sd == 0 ? 1.0 : -1.0);
    if (ride >= 0.0 && abs(uPyrHop2.z - float(sd)) < 0.5) { dc = hp - vec2(0.0, 0.05); there = ride < 0.8 ? 1.0 : 0.0; }
    if (there < 0.5) continue;
    vec2 dq = (p - dc) / vec2(0.045, 0.016);
    if (length(dq) < 1.0) col = pal(fract(atan(dq.y, dq.x) / 6.28318 + uTime * (0.3 + uHat) + float(sd) * 0.5));
  }

  // the enemies, landing between the beats
  for (int i = 0; i < 3; i++) {
    vec4 E = uPyrE[i], K = uPyrK[i];
    if (K.x < 0.5) continue;
    float ef = K.y;
    vec2 a = pyrTop(E.x, E.y), b = pyrTop(E.z, E.w);
    vec2 ep;
    if (K.z > 0.5) {
      // off the edge: it falls
      ep = mix(a, b, ef) + vec2(0.0, 0.03 + 0.05 * sin(3.14159 * min(ef * 2.0, 1.0)) - 0.6 * ef * ef);
    } else {
      float lift = smoothstep(0.5, 1.0, ef);
      float hgt = E.x < -0.5 ? 0.0 : 0.06;           // dropping in from above, no arc
      ep = mix(a, b, lift) + vec2(0.0, 0.03 + hgt * sin(3.14159 * lift));
    }
    if (K.x < 2.5) {
      // a ball: red, or the purple egg
      vec3 bc = K.x < 1.5 ? vec3(0.9, 0.1, 0.1) : vec3(0.55, 0.15, 0.7);
      float sq = 1.0 - 0.25 * exp(-ef * 12.0) * step(0.5, 1.0 - K.z);   // a squash as it lands
      vec2 bq = (p - ep - vec2(0.0, -0.024 * (1.0 - sq))) / vec2(1.0 / sq, sq);
      if (length(bq) < 0.024) col = bc + vec3(0.6) * smoothstep(0.012, 0.0, length(bq - vec2(-0.007, 0.008)));
    } else {
      // the snake: a purple coil standing up, its head on top, eyes on the hopper
      vec3 sc = vec3(0.6, 0.2, 0.75);
      float rise = K.w > 0.5 ? 0.5 + 0.25 * (2.0 - K.w) : 1.0;     // uncoiling as it hatches
      for (int k = 0; k < 3; k++) {
        vec2 cq = p - ep - vec2(0.004 * float(k - 1), (0.012 + 0.022 * float(k)) * rise - 0.02);
        float ring = abs(length(cq / vec2(1.0, 0.55)) - 0.016) - 0.006;
        if (ring < 0.0) col = sc * (0.75 + 0.35 * float(k) / 2.0);
      }
      vec2 hq = p - ep - vec2(0.0, 0.065 * rise);
      if (length(hq / vec2(1.0, 0.85)) < 0.019) {
        col = sc * 1.15;
        vec2 look = normalize(hp - ep + 1e-4) * 0.004;
        for (int e = 0; e < 2; e++) {
          vec2 ec = vec2(e == 0 ? -0.007 : 0.007, 0.004);
          if (length(hq - ec) < 0.006) col = vec3(1.0);
          if (length(hq - ec - look) < 0.003) col = vec3(0.0);
        }
      }
    }
  }

  // the hopper itself
  if (shown > 0.5) {
    vec2 lp = (p - hp) / vec2(sx, sy);
    float body = length(lp / vec2(1.0, 1.05)) - 0.034;
    // a dark outline, as the arcade sprites had, so it reads on any colour of top
    if (body < 0.006) col = vec3(0.02, 0.06, 0.02);
    if (body < 0.0) {
      col = vec3(0.35, 0.85, 0.3) * (0.8 + 0.4 * smoothstep(-0.034, 0.0, -(lp.y - 0.015)));
      // big eyes, looking where it goes
      for (int e = 0; e < 2; e++) {
        vec2 ec = vec2(e == 0 ? -0.012 : 0.012, 0.01);
        if (length(lp - ec) < 0.011) col = vec3(1.0);
        if (length(lp - ec - vec2(lookX, 0.0)) < 0.005) col = vec3(0.0);
      }
    }
    // its feet
    if (min(length(lp - vec2(-0.015, -0.036)), length(lp - vec2(0.015, -0.036))) < 0.01) col = vec3(0.2, 0.55, 0.2);
  }

  // hit: the swearing balloon above it, popping up on the hit
  if (ph > 0.5 && ph < 1.5 && mode > 0.5 && mode < 1.5) {
    float pop = smoothstep(0.0, 0.15, f);
    vec2 bc = hp + vec2(0.0, 0.135);
    vec2 bq = (p - bc) / max(pop, 0.01);
    float box = length(max(abs(bq) - vec2(0.125, 0.032), 0.0)) - 0.016;
    float tail = sdSeg(bq, vec2(-0.01, -0.045), vec2(-0.03, -0.085)) - 0.007;
    if (min(box, tail) < 0.003) col = vec3(0.05);
    if (min(box, tail) < 0.0) {
      col = vec3(0.97);
      if (pyrCurse((bq + vec2(0.12, 0.033)) / vec2(0.04, 0.066)) < 0.0) col = vec3(0.05);
    }
  }

  // the top-right corner (the title plate has the left): the score, and the colour to change to
  vec2 sq = (p - vec2(0.48, 0.36)) / 0.05;
  if (sq.x > 0.0 && sq.x < 6.9 && sq.y > 0.0 && sq.y < 2.0) {
    float slot = floor(sq.x / 1.4);
    int d = int(mod(floor(uPyrInfo.x / pow(10.0, 4.0 - slot)), 10.0));
    vec2 cq = vec2(fract(sq.x / 1.4) * 1.4, sq.y);
    if (cq.x < 1.0) col = mix(col, vec3(0.95, 0.4, 0.2), digit7(cq, d));
  }
  vec2 tq = p - vec2(0.72, 0.22);
  if (abs(tq.x) / 0.035 + abs(tq.y) / 0.0175 <= 1.0) col = after;
  else if (abs(tq.x) < 0.035 && tq.y < 0.0 && tq.y > -0.0175 - 0.035 + abs(tq.x) * 0.5 - 0.0) {
    float e2 = -(0.035 - abs(tq.x)) * 0.5;
    if (tq.y <= e2) col = tq.x < 0.0 ? leftFace : rightFace;
  }
  return col;
}
`;

const bobs = `
// Unlimited bobs, the Amiga and Atari ST demo trick. The machine keeps a few
// screens and shows them in turn, never clearing them, and each frame draws
// one shaded ball, on the screen it is about to show, where the moving point
// is now. So the screen shown holds the balls drawn on it before - one from
// every round of the screens - and the next one holds the same chain a step
// further on: the whole chain seems to slide along behind its head, tracing
// its path. That is what this draws: a chain of balls behind the head, on
// the path the head took, sliding along as the head moves. The point runs on
// the music's clock (src/core/sims.js): it surges ahead on the kick and on the
// pitched hits and glides between them, so the chain slides on in bursts,
// keeping time with the track. The balls sit at even steps along the path, so
// a surge never opens gaps in the chain, and each ball is as old as the time
// since the head passed it.
// Our turn on it: as a ball gets older it recedes into the distance and fades
// out, so the chain flows away from the head into the depth and never ends; on
// the kick the chain swells - most at the head - and settles back at once, on
// the snare it lightens for a moment; each bar draws its own colour. The
// screen punches in on the kick and shakes with the bass. And a twin: a second
// chain running the same figure the other way round, in the other colours, so
// the two cross and weave through each other, knotting as they pass.
const float BOB_KEEP = 32.0;           // beats a ball lasts, receding and fading: eight bars
uniform float uBobU[128];              // where on its figure each ball sits, at even steps back from the head
uniform float uBobAge[128];            // how long ago, in beats, the point passed each ball

// where the moving point was at u (in figure beats): a Lissajous figure whose phase drifts, so it never repeats
vec2 bobAt(float s) {
  float fa = 1.0 + floor(uSeed.x * 3.0);
  float fb = 2.0 + floor(uSeed.y * 3.0);
  if (abs(fa - fb) < 0.5) fb += 1.0;
  float th = s * 6.28318 / 32.0;
  float drift = uSeed.z * 6.28318 + s * 0.03;
  return vec2(0.74 * sin(fa * th + drift), 0.38 * sin(fb * th + 0.6 * drift));
}

// one ball at this pixel, d from its centre, r its size: its colour and how much it covers
vec4 bobBall(vec2 d, float r, vec3 base, float age, float head) {
  float q2 = dot(d, d) / (r * r);
  if (q2 >= 1.0) return vec4(0.0);
  float q = sqrt(q2);
  vec3 L = normalize(vec3(-0.45, 0.6, 0.66));
  vec3 nrm = vec3(d / r, sqrt(1.0 - q2));
  vec3 c = base * (0.25 + 0.8 * max(dot(nrm, L), 0.0))
         + vec3(1.0) * pow(max(dot(nrm, normalize(L + vec3(0.0, 0.0, 1.0))), 0.0), 24.0) * 0.7;
  c *= 1.0 - 0.55 * smoothstep(0.82, 1.0, q);      // a dark rim, as the bob graphics had
  c += head * (base * 0.4 * uEnergy + vec3(0.25) * uHat);
  float alpha = exp(-age * 0.05) * smoothstep(BOB_KEEP, BOB_KEEP - 6.0, age) * smoothstep(1.0, 0.9, q);
  return vec4(c, alpha);
}

vec3 render(vec2 p, vec2 uv) {
  float spb = max(uSpb, 0.2);
  float beats = uTime / spb;
  float twinAt = 13.0 + floor(uSeed.w * 8.0);     // where on the figure the twin sets off, the other way
  // the punch on the kick and the shake of the bass, as the game screens have
  p *= 1.0 - 0.06 * uKick;
  p += (hash22(vec2(floor(uTime * 30.0), 3.0)) - 0.5) * 0.025 * uBass;

  // the Amiga's dark blue, a copper band drifting through it
  vec3 bg = mix(vec3(0.015, 0.02, 0.07), vec3(0.06, 0.02, 0.1), uv.y);
  bg += pal(0.6 + 0.1 * sin(uTime * 0.2)) * 0.12 * exp(-pow((p.y - 0.42 * sin(uTime * 0.37)) * 9.0, 2.0));

  // front to back from the heads: the newest balls are nearest; each older one is
  // further off and fainter, and shows through where the ones before it fade
  vec3 acc = vec3(0.0);
  float cover = 0.0;
  for (int j = 0; j < 128; j++) {
    float age = uBobAge[j];
    if (age > BOB_KEEP) break;                     // older than eight bars, or not drawn yet
    float s = beats - age;                         // when the point passed it
    float z = 1.0 + age * 0.06;                    // how far it has receded
    // the kick swells the chains now, most at the heads, and they settle back; the snare lightens them
    float near = exp(-age * 0.25);
    float r = 0.05 * (1.0 + 0.5 * uKick * near) / z;
    float head = j == 0 ? 1.0 : 0.0;
    float hue = floor(s / 4.0) * 0.17 + uSeed.z;
    // the chain, then its twin running the other way in the other colours
    vec4 a = bobBall(p - bobAt(uBobU[j]) / z, r, mix(pal(fract(hue)), vec3(1.0), 0.4 * uSnare * near), age, head);
    acc += (1.0 - cover) * a.a * a.rgb;
    cover += (1.0 - cover) * a.a;
    vec4 b = bobBall(p - bobAt(twinAt - uBobU[j]) / z, r, mix(pal(fract(hue + 0.5)), vec3(1.0), 0.4 * uSnare * near), age, head);
    acc += (1.0 - cover) * b.a * b.rgb;
    cover += (1.0 - cover) * b.a;
    if (cover > 0.98) break;
  }
  return acc + (1.0 - cover) * bg;
}
`;

const dualchess = `
// The dual chessboard of the Amiga intros of the early 90s: a
// chessboard on each bitplane, every board zooming and sliding on its own, and
// the palette giving each overlap of squares its own shade - so the boards
// weave a lattice that never stops shifting, unhurried - the zoom slow, by
// ratio, so no squares ever stream past. Two modes, a phrase each: the
// layers sliding sideways past each other, each at its own speed; then the
// boards turning on their own axes against each other, a quarter turn in the
// phrase, so the squares break into moire and come back square for the next. The zoom swings smoothly
// from huge squares to tiny ones and back, as the chessboard intros of the
// time did. The music: the first board's squares nudge in on the kick and
// ease back out, and in a turning phrase it turns a notch on each beat; the
// second turns the other way, breathes on the snare and slides with the bass; in the second half of
// every phrase a third board fades in, for eight shades; each phrase brings
// its own hue, and the screen shakes with the bass.

// which colour of a board this point is on: 0 or 1; the board centred on c, turned by a
float chessPlane(vec2 p, vec2 c, float size, float a) {
  vec2 g = floor((rot(a) * (p - c)) / size);
  return mod(g.x + g.y, 2.0);
}

vec3 render(vec2 p, vec2 uv) {
  float beats = uTime / max(uSpb, 0.2);
  // (kept calm on purpose: a high-contrast pattern moving fast makes the eye swim)
  p += (hash22(vec2(floor(uTime * 30.0), 5.0)) - 0.5) * 0.008 * uBass;
  float b = floor(beats), f = fract(beats);
  float lurch = b + smoothstep(0.0, 0.8, f);        // a notch on each beat, eased
  // the mode: odd phrases turn the boards a quarter turn, notch by notch; even ones hold them square and slide
  float ph = floor(beats / 32.0);
  float done = floor((ph + 1.0) / 2.0);             // turning phrases already finished
  float turning = mod(ph, 2.0);
  float spin = (done + turning * clamp((lurch - ph * 32.0) / 32.0, 0.0, 1.0)) * 1.5708;
  // the first board: a slow zoom between big squares and small ones over two phrases, a nudge on the kick.
  // The zoom goes by ratio (exp), so the squares at the edges never stream past faster than the middle ones.
  float s1 = 0.15 * exp(0.5 * sin(beats * 3.14159 / 32.0 + uSeed.x * 6.0)) * (1.0 + 0.05 * uKick);
  // the layers slide sideways, each at its own unhurried speed
  vec2 c1 = vec2(beats * 0.035 + 0.12 * sin(beats * 0.11 + uSeed.y * 6.0), 0.12 * cos(beats * 0.09));
  float a1 = spin;
  // the second: turning the other way, zooming against it, breathing on the snare, sliding with the bass
  float s2 = 0.12 * exp(0.45 * cos(beats * 3.14159 / 48.0 + uSeed.z * 6.0)) * (1.0 + 0.05 * uSnare);
  vec2 c2 = vec2(-beats * 0.025 + 0.15 * cos(beats * 0.07 + 1.0) + 0.015 * uBass, 0.15 * sin(beats * 0.1 + 2.0));
  float a2 = -spin;
  // the third, in the second half of each phrase, fading in over a bar, turning slowly
  float phrase = floor(beats / 32.0), into = beats - phrase * 32.0;
  float w3 = smoothstep(16.0, 20.0, into) * (1.0 - smoothstep(30.0, 32.0, into));
  float s3 = 0.2 * exp(0.3 * sin(beats * 3.14159 / 64.0));
  vec2 c3 = vec2(beats * 0.015 + 0.15 * sin(beats * 0.06 + 3.0), 0.15 * cos(beats * 0.08));
  float b1 = chessPlane(p, c1, s1, a1), b2 = chessPlane(p, c2, s2, a2), b3 = chessPlane(p, c3, s3, 0.0);
  // the palette: shades of this phrase's colour, from near black to bright
  float shade = (b1 + 2.0 * b2 + 1.6 * w3 * b3) / (3.0 + 1.6 * w3);
  // (a new phrase's colour comes in over a beat, never as a cut of the whole screen)
  vec3 hue = mix(pal(fract(uSeed.x * 0.7 + (phrase - 1.0) * 0.23)), pal(fract(uSeed.x * 0.7 + phrase * 0.23)), smoothstep(0.0, 1.0, into));
  hue = max(hue, vec3(0.0)) + 0.12;                  // the palette can dip below zero: never let a phrase go black
  hue /= max(max(hue.r, hue.g), hue.b);
  return mix(vec3(0.03, 0.02, 0.08), hue * 0.95, 0.12 + 0.88 * shade);
}
`;

const chessfloor = `
// The chessboard floor of the Amiga intros, with its cube (as the early 90s
// remember it): a chessboard seen from above at an angle, in
// perspective, turning beneath you like a turntable, its corners swinging out
// over the black, the sky above in copper bands - and over it a red cube,
// turning, bouncing on the board. Ours: the board is a surface that waves in
// 3D - a slow swell all over it that grows with the bass, and every time the
// cube lands, its corner on the surface, the board gives under it and a ring
// of waves runs out from under it and dies away; the board turns in lurches on
// the beat. The cube moves smoothly: its spin speeds up as the rhythm gets busy
// and slows as it thins, and each hop's height is set as it leaves the board,
// higher as the music builds (src/core/sims.js). And the touches the demos of
// the time used: the cube mirrored in the board, faint and broken by the
// waves; glints of light on the wave crests; the board catching the sky
// towards the horizon; a glow round the cube; a bright copper line at the
// horizon. Each phrase brings its own colour; the screen shakes with the bass.
uniform vec4 uCube;                    // the cube's spin (two angles), this hop's energy, the smoothed bass
const float CF_FL = 1.3;               // the lens
const float CF_N = 6.0;                // squares from the middle to an edge
const float CF_H = 2.1;                // the camera's height
const float CF_HY = 0.2;               // the horizon on the screen
const float CF_TOP = 0.7;              // no wave rises above this, nor falls below its negative
const float CF_HALF = 0.6;             // half the cube's size
const vec3 CF_MID = vec3(0.0, 0.0, 8.0);   // the board's middle

// the board's height at xz: a slow swell, and the rings from the cube's last three landings
float cfHeight(vec2 xz, float beats) {
  float h = (0.07 + 0.12 * uCube.w) * sin(xz.x * 0.55 + beats * 0.9) * cos(xz.y * 0.5 - beats * 0.7);
  float r = length(xz - CF_MID.xz);
  for (int k = 0; k < 3; k++) {
    float dt = beats - (floor(beats) - float(k));     // beats since that landing
    float front = 2.8 * dt;                           // how far its ring has run
    float x = r - front;
    // the board gives under the cube as it lands, then the ring runs out and dies away
    h -= 0.48 * exp(-dt * 1.2) * exp(-x * x * 0.3) * cos(3.2 * x);
  }
  return h;
}

// the cube: its centre and how it is turned (shared by the march, the mirror and the shadow)
vec3 cfCube(float beats, out mat3 R) {
  float f = fract(beats);
  float hop = (0.9 + 1.4 * uCube.z) * 4.0 * f * (1.0 - f);     // a parabola, landing on the beat
  float a = uCube.x, c = uCube.y;
  mat3 Ry = mat3(cos(a), 0.0, -sin(a), 0.0, 1.0, 0.0, sin(a), 0.0, cos(a));
  mat3 Rx = mat3(1.0, 0.0, 0.0, 0.0, cos(c), sin(c), 0.0, -sin(c), cos(c));
  R = Ry * Rx;
  // it rests on the board where it is now - its lowest corner on the surface, as it is turned -
  // so on landing it presses into the dent its own landing makes, and the ring starts under it
  float reach = CF_HALF * (abs(R[0].y) + abs(R[1].y) + abs(R[2].y));
  return CF_MID + vec3(0.0, cfHeight(CF_MID.xz, beats) + reach + hop, 0.0);
}
float cfBox(vec3 q) { vec3 d = abs(q) - CF_HALF; return length(max(d, 0.0)) + min(max(d.x, max(d.y, d.z)), 0.0) - 0.04; }

// march a ray at the cube: how far along it hits (or -1), and how near it came (for the glow)
float cfMarch(vec3 ro, vec3 dir, vec3 cc, mat3 R, int steps, out float nearest) {
  float t = 0.0;
  nearest = 1e9;
  for (int i = 0; i < 48; i++) {
    if (i >= steps) break;
    float d = cfBox((ro + dir * t - cc) * R);
    nearest = min(nearest, d);
    if (d < 0.002) return t;
    t += d;
    if (t > 40.0) break;
  }
  return -1.0;
}
vec3 cfCubeColour(vec3 pos, vec3 dir, vec3 cc, mat3 R) {
  vec3 e = vec3(0.002, 0.0, 0.0);
  vec3 pq = pos - cc;
  vec3 n = normalize(vec3(cfBox((pq + e.xyy) * R) - cfBox((pq - e.xyy) * R),
                          cfBox((pq + e.yxy) * R) - cfBox((pq - e.yxy) * R),
                          cfBox((pq + e.yyx) * R) - cfBox((pq - e.yyx) * R)));
  vec3 L = normalize(vec3(-0.5, 0.8, -0.4));
  vec3 red = vec3(0.85, 0.08, 0.06);
  return red * (0.22 + 0.9 * max(dot(n, L), 0.0)) + vec3(1.0, 0.9, 0.8) * pow(max(dot(reflect(dir, n), L), 0.0), 24.0) * 0.6;
}

vec3 render(vec2 p, vec2 uv) {
  float beats = uTime / max(uSpb, 0.2);
  p += (hash22(vec2(floor(uTime * 30.0), 5.0)) - 0.5) * 0.012 * uBass;
  float phrase = floor(beats / 32.0), into = beats - phrase * 32.0;
  vec3 hue = mix(pal(fract(uSeed.x * 0.7 + (phrase - 1.0) * 0.23)), pal(fract(uSeed.x * 0.7 + phrase * 0.23)), smoothstep(0.0, 1.0, into));
  hue = max(hue, vec3(0.0)) + 0.12;                  // the palette can dip below zero: never let a phrase go black
  hue /= max(max(hue.r, hue.g), hue.b);

  // the sky: copper bands, darkest overhead, a bright copper line at the horizon
  vec3 sky = mix(vec3(0.02, 0.01, 0.06), hue * 0.35, smoothstep(0.5, CF_HY, p.y));
  sky *= 0.85 + 0.15 * step(0.5, fract(p.y * 18.0 - uTime * 0.3));
  vec3 col = sky + hue * 0.5 * exp(-abs(p.y - CF_HY) * 60.0);

  // the camera: at the board's height, looking ahead; each pixel's ray
  vec3 ro = vec3(0.0, CF_H, 0.0);
  vec3 rd = vec3(p.x, p.y - CF_HY, CF_FL);
  vec3 dir = normalize(rd);
  mat3 R;
  vec3 cc = cfCube(beats, R);

  // the board: march the ray down through the band the waves can reach, then pin the crossing down
  float tFloor = 1e9;
  if (rd.y < -0.001) {
    float t0 = (ro.y - CF_TOP) / -rd.y, t1 = (ro.y + CF_TOP) / -rd.y;
    float dtm = (t1 - t0) / 56.0;
    float t = t0, prev = t0;
    for (int i = 0; i < 56; i++) {
      vec3 q = ro + rd * t;
      if (q.y < cfHeight(q.xz, beats)) {
        float lo = prev, hi = t;
        for (int j = 0; j < 5; j++) {
          float m = 0.5 * (lo + hi);
          vec3 qm = ro + rd * m;
          if (qm.y < cfHeight(qm.xz, beats)) hi = m; else lo = m;
        }
        tFloor = hi;
        break;
      }
      prev = t;
      t += dtm;
    }
  }
  if (tFloor < 1e8) {
    vec3 hit = ro + rd * tFloor;
    vec2 w = hit.xz - CF_MID.xz;
    // turning in lurches: a notch on each beat, eased, and a glide between
    float b = floor(beats), f = fract(beats);
    w = rot((b + smoothstep(0.0, 0.35, f)) * 0.16 + beats * 0.04 + uSeed.y * 6.28) * w;
    float size = 0.85 + 0.15 * sin(beats * 3.14159 / 8.0);
    col = vec3(0.0);                                 // beyond the board: black
    if (abs(w.x) < CF_N * size && abs(w.y) < CF_N * size) {
      vec2 g = floor(w / size);
      float sq = mod(g.x + g.y, 2.0);
      vec3 tile = sq > 0.5 ? hue : vec3(0.92, 0.94, 1.0);
      // lit by its slope, so the waves read in 3D
      float e = 0.08;
      vec3 n = normalize(vec3(cfHeight(hit.xz - vec2(e, 0.0), beats) - cfHeight(hit.xz + vec2(e, 0.0), beats), 2.0 * e,
                              cfHeight(hit.xz - vec2(0.0, e), beats) - cfHeight(hit.xz + vec2(0.0, e), beats)));
      vec3 L = normalize(vec3(-0.45, 0.85, -0.3));
      tile *= 0.35 + 0.75 * max(dot(n, L), 0.0);
      // the cube's shadow, under it, softer and wider the higher it is
      float lift = cc.y - CF_HALF - cfHeight(CF_MID.xz, beats);
      float sh = length(hit.xz - cc.xz) / (CF_HALF * (1.1 + 0.25 * lift));
      tile *= 0.5 + 0.5 * smoothstep(0.6, 1.3 + 0.2 * lift, sh);
      // the board catches the sky towards the horizon, and glints on the wave crests
      vec3 rv = reflect(dir, n);
      float fres = pow(1.0 - max(dot(-dir, n), 0.0), 3.0);
      tile = mix(tile, hue * 0.45 + vec3(0.1), fres * 0.6);
      tile += vec3(1.0, 0.97, 0.9) * pow(max(dot(rv, L), 0.0), 40.0) * 0.55;
      // the cube mirrored in the board, faint and broken by the waves
      float nr;
      float tm = cfMarch(hit + n * 0.02, rv, cc, R, 32, nr);
      if (tm > 0.0) tile = mix(tile, cfCubeColour(hit + rv * tm, rv, cc, R), 0.38);
      col = mix(col, tile, smoothstep(40.0, 18.0, hit.z));
    }
  } else if (rd.y < -0.001) {
    col = vec3(0.0);
  }

  // the cube itself, over the board where it is nearer, and the glow round it
  float near;
  float tc = cfMarch(ro, dir, cc, R, 48, near);
  if (tc > 0.0 && tc < tFloor * length(rd)) col = cfCubeColour(ro + dir * tc, dir, cc, R);
  else col += vec3(1.0, 0.25, 0.1) * exp(-max(near, 0.0) * 9.0) * 0.35;
  return col;
}
`;

const rubber = `
// The rubber vector of the Amiga demos: a flat-shaded cube turning, its lower
// part lagging behind its top, so it bends and wobbles like a block of jelly.
// The machines kept several copies of the cube as it turned and showed each
// line of the screen from an older copy, the lower the line the older; this
// does the same, each line drawing the cube as it was a moment before. The
// music: each kick gives the spin a shove that dies away, so the jolt runs
// down the cube like a wave through jelly; the snare tips it on a spring and
// flashes the light on it; each phrase brings its own colours. And the punch
// all our scenes have: the screen jumps in on the kick, with the zoom blur,
// and shakes with the bass; the copper bars flare on the kick and widen with
// the bass, and a third joins them when the music peaks.
uniform vec4 uRub[64];                 // the cube's turn over the last 0.6 s, newest first: spin, tilt

vec3 render(vec2 p, vec2 uv) {
  float beats = uTime / max(uSpb, 0.2);
  // the punch in on the kick and the shake of the bass
  p *= 1.0 - 0.06 * uKick;
  p += (hash22(vec2(floor(uTime * 30.0), 7.0)) - 0.5) * 0.02 * uBass;
  float phrase = floor(beats / 32.0), into = beats - phrase * 32.0;
  vec3 hue = mix(pal(fract(uSeed.x * 0.7 + (phrase - 1.0) * 0.23)), pal(fract(uSeed.x * 0.7 + phrase * 0.23)), smoothstep(0.0, 1.0, into));
  hue = max(hue, vec3(0.0)) + 0.12;                  // the palette can dip below zero: never let a phrase go black
  hue /= max(max(hue.r, hue.g), hue.b);

  // behind: the dark blue, and copper bars riding up and down - wider with the bass,
  // flaring on the kick, a third joining them when the music peaks
  vec3 col = mix(vec3(0.01, 0.01, 0.05), vec3(0.04, 0.02, 0.09), uv.y) * (1.0 + 0.6 * uPad);
  for (int k = 0; k < 3; k++) {
    float fk = float(k);
    float show = k < 2 ? 1.0 : smoothstep(0.55, 0.8, uEnergy);
    float y = 0.38 * sin(uTime * (0.6 + 0.25 * fk) + fk * 2.1);
    float w = (0.035 + 0.025 * uBass) * show;
    float bar = max(0.0, 1.0 - abs(p.y - y) / max(w, 1e-4));
    vec3 bc = k == 0 ? hue : (k == 1 ? vec3(1.0) - hue * 0.6 : mix(hue, vec3(1.0), 0.5));
    col = mix(col, bc * (0.35 + 0.65 * bar) * (1.0 + 0.6 * uKick), step(0.0, bar - 0.001) * 0.85 * show);
  }

  // which moment of the turn this line shows: the lower, the longer ago
  float lag = clamp((0.4 - p.y) / 0.8, 0.0, 1.0) * 63.0;
  int i0 = int(floor(lag));
  int i1 = min(i0 + 1, 63);
  vec4 a = mix(uRub[i0], uRub[i1], lag - floor(lag));
  float cy = cos(a.x), sy = sin(a.x), cx = cos(a.y), sx = sin(a.y);
  mat3 Ry = mat3(cy, 0.0, -sy, 0.0, 1.0, 0.0, sy, 0.0, cy);
  mat3 Rx = mat3(1.0, 0.0, 0.0, 0.0, cx, sx, 0.0, -sx, cx);
  mat3 Rm = Rx * Ry;                                 // the cube's turn, from its own frame to the world

  // the ray, into the cube's own frame, and through its faces
  // (far enough back that a corner turned straight at us still stays clear of the title)
  vec3 ro = vec3(0.0, 0.0, -4.4), rd = normalize(vec3(p, 1.6));
  vec3 o = ro * Rm, d = rd * Rm;                     // world to the cube's frame (the transpose)
  vec3 inv = 1.0 / d;
  vec3 t1 = (-0.55 - o) * inv, t2 = (0.55 - o) * inv;
  vec3 tmin = min(t1, t2), tmax = max(t1, t2);
  float tn = max(max(tmin.x, tmin.y), tmin.z), tf = min(min(tmax.x, tmax.y), tmax.z);
  if (tn < tf && tf > 0.0) {
    // which face: its normal in the cube's frame, then in the world
    vec3 n = vec3(0.0);
    if (tn == tmin.x) n = vec3(-sign(d.x), 0.0, 0.0);
    else if (tn == tmin.y) n = vec3(0.0, -sign(d.y), 0.0);
    else n = vec3(0.0, 0.0, -sign(d.z));
    vec3 nw = Rm * n;
    vec3 L = normalize(vec3(-0.5, 0.7, -0.6));
    // flat shading, as the filled vectors were: one shade a face, a lighter rim at its edges
    float lit = (0.18 + 0.82 * max(dot(nw, L), 0.0)) * (1.0 + 0.35 * uSnare);
    // grey, as the demos' cubes were, a breath of the phrase's colour: the colour is the bars'
    vec3 face = mix(vec3(0.78, 0.8, 0.86), hue, 0.12) * lit;
    vec3 q = o + d * tn;
    vec3 aq = abs(q);
    float edge = (aq.x + aq.y + aq.z) - max(max(aq.x, aq.y), aq.z) - min(min(aq.x, aq.y), aq.z);
    face *= 1.0 + 0.25 * smoothstep(0.47, 0.55, edge);
    col = face;
  }
  return col;
}
`;

const bumplogo = `
// The bump-mapped logo of the mid-90s PC demos: an emblem raised out of rough
// stone, lit by moving lights, so it reads as embossed metal. Done as the
// demos did it in 2D (Sol's Graphics Tutorial, "Bumping Along"): at every
// pixel the slope of the height map shifts where the light is looked up, and
// that light is added to the picture - so the slopes facing a light catch it
// and the far sides fall dark. The plate is seen at an angle, the camera
// leaning slowly round it. The music: coloured lights circle the emblem,
// flaring wider on the snare; the relief deepens on the kick, the screen
// punching in with it and shaking with the bass; in the second half of each
// phrase a third light joins them; each phrase brings its own colours.

// the emblem's outline: a ring around a diamond, a star or a triangle, by the seed (negative inside)
float bumpEmblem(vec2 p) {
  float r = length(p);
  float ring = abs(r - 0.3) - 0.035;
  float k = floor(uSeed.w * 3.0);
  float inner;
  if (k < 1.0) inner = (abs(p.x) + abs(p.y)) * 0.7071 - 0.12;
  else if (k < 2.0) inner = r - 0.11 - 0.06 * cos(atan(p.y, p.x) * 5.0 + 1.5708);
  else inner = max(abs(p.x) * 0.866 + p.y * 0.5, -p.y) - 0.08;
  return min(ring, inner);
}

// the height map: rough stone, and the emblem raised out of it with rounded edges
float bumpHeight(vec2 q, float depth) {
  float stone = 0.22 * fbm(q * 7.0 + uSeed.xy * 13.0);
  float raised = smoothstep(0.03, -0.015, bumpEmblem(q));
  return stone * (1.0 - 0.7 * raised) + depth * raised;
}

vec3 render(vec2 p, vec2 uv) {
  float beats = uTime / max(uSpb, 0.2);
  p *= 1.0 - 0.05 * uKick;
  p += (hash22(vec2(floor(uTime * 30.0), 9.0)) - 0.5) * 0.015 * uBass;
  float phrase = floor(beats / 32.0), into = beats - phrase * 32.0;

  // the relief is a plate seen at an angle: the camera leans slowly round it over the phrase,
  // and tips on the snare
  float yaw = 0.42 * sin(beats * 3.14159 / 32.0 + uSeed.x * 6.0);
  float tilt = 0.5 + 0.12 * sin(beats * 3.14159 / 16.0 + 1.0);
  vec3 ro = 1.8 * vec3(sin(yaw) * cos(tilt), -sin(tilt), -cos(yaw) * cos(tilt));
  vec3 fw = normalize(-ro);
  vec3 rt = normalize(cross(vec3(0.0, 1.0, 0.0), fw));
  vec3 up = cross(fw, rt);
  vec2 sq = rot(0.04 * uSnare * (mod(uBarIndex, 2.0) * 2.0 - 1.0)) * p;
  vec3 rd = normalize(fw * 1.55 + rt * sq.x + up * sq.y);
  float tp = -ro.z / rd.z;                          // where the ray meets the plate
  vec2 q = (ro + rd * tp).xy;

  // the slopes of the height map at this point, as the demos read them from neighbours
  float depth = 0.55 + 0.35 * uKick;               // the relief deepens on the kick
  float e = 1.5 / uRes.y * tp / 1.55;
  vec2 slope = vec2(bumpHeight(q - vec2(e, 0.0), depth) - bumpHeight(q + vec2(e, 0.0), depth),
                    bumpHeight(q - vec2(0.0, e), depth) - bumpHeight(q + vec2(0.0, e), depth)) / (2.0 * e);

  // the dark: a deep blue that sits exactly on the VGA screen's levels (no red, no green,
  // the first step of blue), so the dither leaves it flat - no dots, never pure black;
  // the stone and the emblem show only where the lights fall on them
  vec3 col = vec3(0.0, 0.0, 0.2);
  float raised = smoothstep(0.03, -0.015, bumpEmblem(q));

  // the lights: each looked up where the slope shifts this point, and added
  for (int k = 0; k < 3; k++) {
    float fk = float(k);
    float show = k < 2 ? 1.0 : smoothstep(16.0, 18.0, into) * (1.0 - smoothstep(30.0, 32.0, into));
    if (show <= 0.0) continue;
    float a = beats * (0.22 + 0.07 * fk) * (k == 1 ? -1.0 : 1.0) + fk * 2.1 + uSeed.x * 6.0;
    vec2 lp = vec2(cos(a) * (0.42 - 0.1 * fk), sin(a) * (0.26 + 0.04 * fk));
    float rad = 0.42 * (1.0 + 0.45 * uSnare);
    vec2 dd = q + slope * 0.06 - lp;
    float lit = max(0.0, 1.0 - length(dd) / rad);
    vec3 lc = pal(fract(uSeed.y + fk * 0.33 + phrase * 0.17));
    lc = max(lc, vec3(0.0)) + 0.1;
    lc /= max(max(lc.r, lc.g), lc.b);
    col += lc * lit * lit * (1.1 + 0.25 * raised) * show;
  }
  // the far side of the plate dims into the dark
  return mix(vec3(0.0, 0.0, 0.2), col, mix(1.0, 0.55, smoothstep(1.6, 3.2, tp)));
}
`;

const cracktro = `
// The crack intro of the Amiga years, and its starfield, as the crack groups' intros had it: a field
// of stars in depth that the viewer flies through - drifting sideways, the
// near stars sliding past faster than the far ones, then diving forward or
// pulling back, as if steering through space. At the start, the intro: a
// chrome SEEDSCENE logo over rainbow copper lines, and pages of text typing
// in, in a 5x7 bitmap font of the time - what this is, and the thanks - which
// then fade away and leave the stars. The music steers the flight
// (src/core/sims.js): a new heading every two bars, faster as the music
// builds, a surge on each kick; the stars twinkle with the hats; the logo
// bounces, landing on every beat, a shine sweeping it on the snare; the copper
// lines flare on the kick. And in the last two bars of each phrase, a warp
// into the next: forward, the stars stretching into lines out of the middle as
// the jump to hyperspace did, or sideways into long streaks - white at the
// head, blue down the tail, each star with a glow.
uniform vec4 uFont[24];                // the 5x7 font as bits, two glyphs a vec4
uniform vec4 uLogoText[3];             // the logo, a glyph each
uniform vec4 uPageText[24];            // the page: four lines of 24 glyphs
uniform vec4 uCrack;                   // how much of the intro is left (1 to 0), the logo's length
uniform vec4 uCam;                     // where the flight has got to: x, y, z
uniform vec4 uCamV;                    // how fast it is going: x, y, z a second; how deep into a warp

// the intros' own rainbow, whatever the scene's palette
vec3 crackRainbow(float h) { return 0.55 + 0.45 * cos(6.28318 * (h + vec3(0.0, 0.33, 0.67))); }

float crackAt4(vec4 v, int k) {
  if (k == 0) return v.x;
  if (k == 1) return v.y;
  if (k == 2) return v.z;
  return v.w;
}
// is pixel (x, y) of glyph g lit? x 0..4 from the left, y 0..6 from the top
float crackGlyph(float g, int x, int y) {
  if (x < 0 || x > 4 || y < 0 || y > 6) return 0.0;
  int gi = int(g + 0.5);
  vec4 v = uFont[gi / 2];
  vec2 b = (gi - (gi / 2) * 2) == 0 ? v.xy : v.zw;
  int bits = y < 4 ? int(b.x + 0.5) : int(b.y + 0.5);
  int bit = (y < 4 ? y : y - 4) * 5 + x;
  return float((bits >> bit) & 1);
}

vec3 render(vec2 p, vec2 uv) {
  float beats = uTime / max(uSpb, 0.2);
  float t = uTime;
  vec3 col = vec3(0.0);
  float warp = uCamV.w;

  // the stars: layers of them in depth, the flight moving through them - sideways the near
  // layers slide faster than the far ones; forward and back they swell and shrink by
  const float FL = 1.5, SPACING = 0.9;
  const int LAYERS = 16;
  float zc = uCam.z / SPACING;
  float zf = fract(zc), zi = floor(zc);
  for (int i = 0; i < LAYERS; i++) {
    float fi = float(i);
    float depth = SPACING * (fi + 1.0 - zf);       // this layer's distance ahead
    float id = fi + zi;                             // which layer it is, so its stars persist
    vec2 w = p * depth / FL + uCam.xy;              // where this pixel looks in that layer
    // the stars of a layer: one in some cells, at a hashed spot (the cells next door are
    // checked too, so a star's streak can cross into them)
    vec2 cell0 = floor(w / 0.5);
    for (int cy = -1; cy <= 1; cy++) for (int cx = -1; cx <= 1; cx++) {
      vec2 cell = cell0 + vec2(float(cx), float(cy));
      float h = hash12(cell + id * 17.31);
      if (h < 0.66) continue;
      vec2 star = (cell + 0.15 + 0.7 * hash22(cell + id * 5.7)) * 0.5;
      vec2 s = (star - uCam.xy) * FL / depth;       // where it is on the screen
      // where it is heading on the screen: sideways the near ones faster; forward, out from the middle
      vec2 sv = (-uCamV.xy * FL + s * uCamV.z) / depth;
      // a short trail, never longer than a few pixels: a star too near would draw a line across the screen
      // in a warp the trails stretch into long lines, still capped so none crosses the screen
      vec2 tr = sv * mix(0.035, 0.09, warp);
      float tl = length(tr);
      float cap = mix(0.025, 0.42, warp);
      if (tl > cap) tr *= cap / tl;
      vec2 tail = s - tr;
      vec2 ab = s - tail;
      float hh = clamp(dot(p - tail, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
      float d = length(p - tail - ab * hh);
      float size = clamp(0.006 * 3.0 / depth, 0.0022, 0.009);
      float fade = smoothstep(0.6, 2.0, depth) * smoothstep(SPACING * float(LAYERS), SPACING * float(LAYERS) * 0.5, depth);
      float tw = 0.85 + 0.4 * uHat * hash11(id + h * 13.0);
      float b = (1.0 - smoothstep(size * 0.35, size, d)) * fade * tw * (0.45 + 0.55 * hh);
      // white at the head, blue down the tail; a glow round each, wider in a warp
      vec3 sc = mix(vec3(0.35, 0.55, 1.0), vec3(0.85 + 0.15 * h, 0.9 + 0.1 * h, 1.0), mix(1.0, hh, warp));
      col = max(col, sc * b * 1.2);
      col += sc * exp(-d / (size * (1.6 + 1.5 * warp))) * 0.12 * fade * (0.5 + warp);
    }
  }

  // in a forward warp the middle glows, where the lines come from (a soft light, never a flash)
  col += vec3(0.3, 0.45, 1.0) * warp * max(uCamV.z, 0.0) / 40.0 * exp(-length(p) * 5.0) * 0.6;

  // the intro, fading away after its pages
  float intro = uCrack.x;
  if (intro <= 0.0) return col;

  // the copper lines, a rainbow above and below, flaring on the kick
  for (int k = 0; k < 2; k++) {
    float y = k == 0 ? 0.262 : -0.2;
    float d = abs(p.y - y);
    if (d < 0.005) col = mix(col, crackRainbow(p.x * 0.35 + t * 0.3 + float(k) * 0.5) * (0.75 + 0.6 * uKick) * (1.0 - d / 0.007), intro);
  }

  // the logo: chrome, bouncing on the beat, squashing as it lands, a shine on the snare
  float n = uCrack.y;
  float f = fract(beats);
  float hop = 4.0 * f * (1.0 - f);
  float squash = 1.0 - 0.18 * exp(-f * 14.0);
  float L = 0.02;                                    // a logo pixel
  vec2 lc = vec2(0.0, 0.14 + 0.03 * hop);
  vec2 lq = vec2((p.x - lc.x) / L + n * 3.0 - 0.5, (lc.y + 3.5 * L * squash - p.y) / (L * squash));
  for (int s = 0; s < 2; s++) {
    vec2 q = s == 0 ? lq - vec2(0.45, -0.45) : lq;
    float ci = floor(q.x / 6.0);
    if (ci < 0.0 || ci >= n) continue;
    int x = int(q.x - ci * 6.0), y = int(floor(q.y));
    float g = crackAt4(uLogoText[int(ci) / 4], int(ci) - (int(ci) / 4) * 4);
    if (crackGlyph(g, x, y) < 0.5) continue;
    if (s == 0) { col = mix(col, vec3(0.04, 0.02, 0.08), intro); continue; }
    // the chrome: sky at the top, a bright horizon, dark below it, gold to the foot
    float v = clamp(q.y / 7.0, 0.0, 1.0);
    vec3 chrome = v < 0.45 ? mix(vec3(0.45, 0.65, 1.0), vec3(1.0), v / 0.45)
                           : mix(vec3(0.35, 0.22, 0.08), vec3(1.0, 0.78, 0.35), (v - 0.45) / 0.55);
    // a bevel: lit where the pixel above is empty, shaded where the one below is
    if (crackGlyph(g, x, y - 1) < 0.5) chrome = mix(chrome, vec3(1.0), 0.45);
    if (crackGlyph(g, x, y + 1) < 0.5) chrome *= 0.55;
    // the shine, a slanted bar sweeping across on the snare
    float sweep = (1.0 - uSnare) * (n * 6.0 + 14.0) - 7.0;
    chrome += vec3(0.8) * smoothstep(1.4, 0.0, abs(q.x + q.y * 0.6 - sweep)) * uSnare;
    col = mix(col, chrome, intro);
  }

  // the page: four lines typing in, a gradient down each line
  float P = 0.0055;
  vec2 pq = vec2((p.x + 12.0 * 6.0 * P) / P, (0.045 - p.y) / P);
  float line = floor(pq.y / 9.0);
  if (line >= 0.0 && line < 4.0 && pq.x >= 0.0 && pq.x < 24.0 * 6.0) {
    float ci = floor(pq.x / 6.0);
    int idx = int(line) * 24 + int(ci);
    float g = crackAt4(uPageText[idx / 4], idx - (idx / 4) * 4);
    int x = int(pq.x - ci * 6.0), y = int(pq.y - line * 9.0);
    if (crackGlyph(g, x, y) > 0.5) col = mix(col, mix(vec3(1.0), crackRainbow(line * 0.21 + 0.55), float(y) / 7.0) * 0.95, intro);
  }
  return col;
}
`;

const twister = `
// The twister of the Amiga and Atari ST demos: a square bar standing up the
// screen, turning a little more on every line, so it twists along its height;
// each face carries a texture and is lit by the angle it faces. The twist
// winds up through the build and unwinds after it, the bar snaps a quarter
// turn on the kick, the faces' pattern pulses with the hats, and when the
// music peaks two more twisters join it.

// one twister at x0: the colour of its front face at this pixel, and whether it is there
vec4 twistAt(vec2 p, float x0, float width, float turn, float twist, float id) {
  float a = turn + twist * p.y + 0.35 * sin(p.y * 2.0 + uTime * 0.7 + id);
  float x = p.x - x0 - 0.05 * sin(p.y * 3.0 + uTime + id);
  vec4 hit = vec4(0.0);
  for (int k = 0; k < 4; k++) {
    float a0 = a + float(k) * 1.5708;
    float e0 = width * 1.4142 * cos(a0 + 0.7854);
    float e1 = width * 1.4142 * cos(a0 + 2.3562);
    if (e1 > e0 && x >= e0 && x < e1) {
      float u = (x - e0) / (e1 - e0);
      // lit by how squarely the face turns to us
      float light = 0.25 + 0.75 * clamp((e1 - e0) / (width * 2.0), 0.0, 1.0);
      // the face's texture: blocks, as the stone-faced twisters had, edged
      float bv = p.y * 6.0 + float(k) * 0.37;
      float row = floor(bv);
      float bu = u * 2.0 + 0.5 * mod(row, 2.0);
      float mortar = min(min(fract(bu), 1.0 - fract(bu)) * 3.0, min(fract(bv), 1.0 - fract(bv)) * 6.0);
      vec3 c = pal(fract(float(k) * 0.25 + uSeed.y + id * 0.13 + floor(uBarIndex) * 0.05));
      c *= 0.75 + 0.25 * smoothstep(0.0, 0.25, mortar);
      c += vec3(0.25) * uHat * step(0.5, fract(row * 0.5 + u * 2.0 + uBeat));
      // the edges of the face catch the light
      c += vec3(0.35) * smoothstep(0.06, 0.0, min(u, 1.0 - u));
      hit = vec4(c * light, 1.0);
    }
  }
  return hit;
}

vec3 render(vec2 p, vec2 uv) {
  // a copper gradient behind, rolling slowly
  vec3 col = pal(fract(uSeed.w + p.y * 0.4 + uTime * 0.02)) * (0.08 + 0.05 * sin(p.y * 40.0 + uTime));
  // the twist winds up as the music builds; the bar snaps a quarter turn on each beat's kick
  float twist = 1.2 + 3.5 * uEnergy;
  float turn = uTime * 0.6 + (floor(uTime / uSpb) + smoothstep(0.0, 0.25, fract(uBeat))) * 1.5708 * 0.25 + uSeed.x * 6.28;
  float width = 0.11 + 0.025 * uBass;
  vec4 c = twistAt(p, 0.0, width, turn, twist, 0.0);
  // at the peak, two more join, either side
  if (uEnergy > 0.75) {
    for (int s = 0; s < 2; s++) {
      float x0 = s == 0 ? -0.55 : 0.55;
      vec4 side = twistAt(p, x0, width * 0.8, -turn * 1.3, -twist, 1.0 + float(s));
      if (side.a > 0.5 && c.a < 0.5) c = side;
    }
  }
  if (c.a > 0.5) col = c.rgb;
  return col;
}
`;

const footsteps = `
// The footsteps, as an idea from the dinosaur films: two short plastic cups
// of water side by side on a car's dashboard, at night in the rain, the whole
// scene in a cold blue - and the water trembling into rings with every
// footstep. The left cup shakes on the kick, the right one on the snare, as
// if the steps came from two sides; the rings run deeper with the bass. When
// the music peaks the light drops, as something huge passes the windscreen.
// Nothing of the animal is shown.

// one cup: a short, wide tumbler flaring towards the rim, water two-thirds up,
// its surface trembling in rings
vec3 fsCup(vec3 col, vec2 g, float shake, float since) {
  float top = 0.15, bottom = -0.13;
  float wTop = 0.15, wBot = 0.11;
  float h = clamp((g.y - bottom) / (top - bottom), 0.0, 1.0);
  float w = mix(wBot, wTop, h);
  float waterLine = 0.06;
  if (g.y > bottom && g.y < top && abs(g.x) < w) {
    col = col * 0.82 + vec3(0.03, 0.05, 0.07);                                 // through the plastic
    if (g.y < waterLine) col = col * 0.88 + vec3(0.05, 0.08, 0.1);             // the water
    col += vec3(0.55, 0.65, 0.72) * smoothstep(0.006, 0.0, abs(abs(g.x) - w)) * 0.6;   // the walls
    col += vec3(0.5) * smoothstep(0.01, 0.0, abs(g.x - w * 0.6)) * 0.2 * h;            // a highlight
  }
  // the rim and the base: ellipses, seen from a little above
  vec2 rq = (g - vec2(0.0, top)) / vec2(wTop, 0.035);
  col += vec3(0.65, 0.75, 0.82) * smoothstep(0.1, 0.0, abs(length(rq) - 1.0)) * 0.7;
  vec2 bq = (g - vec2(0.0, bottom)) / vec2(wBot, 0.025);
  col += vec3(0.5, 0.6, 0.66) * smoothstep(0.1, 0.0, abs(length(bq) - 1.0)) * step(bq.y, 0.0) * 0.5;
  // the water's surface: rings running out from the middle after each step
  float wW = mix(wBot, wTop, (waterLine - bottom) / (top - bottom)) - 0.005;
  vec2 sq = (g - vec2(0.0, waterLine)) / vec2(wW, wW * 0.24);
  float r = length(sq);
  if (r < 1.0) {
    float amp = (0.15 + 0.85 * shake) * exp(-since * 2.2);
    float waves = sin((r - since * 1.5) * (22.0 - 7.0 * uBass)) * amp * smoothstep(1.0, 0.75, r);
    vec3 water = vec3(0.2, 0.28, 0.33) + vec3(0.45, 0.55, 0.62) * max(waves, 0.0) - vec3(0.06) * max(-waves, 0.0);
    water += vec3(0.12, 0.14, 0.16) * smoothstep(0.85, 1.0, r);                 // the meniscus
    col = mix(col, water, smoothstep(1.0, 0.95, r));
  }
  return col;
}

vec3 render(vec2 p, vec2 uv) {
  float t = uTime;
  vec3 col;
  // the light drops when the music peaks: something huge is passing
  float dim = 1.0 - 0.45 * smoothstep(0.7, 0.95, uEnergy);

  // the windscreen along the top, rain running down it
  float glassY = 0.24;
  if (p.y > glassY) {
    col = mix(vec3(0.2, 0.27, 0.32), vec3(0.08, 0.11, 0.14), clamp((p.y - glassY) * 3.0, 0.0, 1.0));
    vec2 rq = vec2(p.x * 70.0, p.y * 2.0 + t * 1.4);
    float lane = floor(rq.x);
    float drop = fract(rq.y + hash11(lane) * 7.0);
    float streak = step(0.8, hash11(lane * 3.7)) * smoothstep(0.5, 0.95, drop) * smoothstep(1.0, 0.96, drop)
                 * smoothstep(0.5, 0.15, abs(fract(rq.x) - 0.5));
    col += vec3(0.35, 0.42, 0.5) * streak * 0.6;
    // and the shape passing behind it at the peak
    float sx = fract(t * 0.06 + uSeed.y) * 3.0 - 1.5;
    col *= 1.0 - 0.7 * smoothstep(0.7, 0.95, uEnergy) * smoothstep(0.5, 0.25, length((p - vec2(sx, 0.42)) * vec2(0.5, 1.4)));
  } else {
    // the dashboard: grey-blue, a ledge the cups stand on, the shelf's back wall behind them
    col = vec3(0.24, 0.29, 0.33) - 0.1 * smoothstep(glassY, -0.5, p.y) * 0.0;
    if (p.y < -0.12) col = vec3(0.3, 0.35, 0.39) - 0.12 * smoothstep(-0.12, -0.5, p.y);   // the ledge, catching light
    else col = vec3(0.2, 0.24, 0.28) + 0.05 * smoothstep(-0.12, glassY, p.y);             // the back wall
    col += vec3(0.08) * smoothstep(0.008, 0.0, abs(p.y + 0.12));                            // the ledge's edge
    col *= 0.85 + 0.15 * vnoise(p * vec2(3.0, 40.0));                                      // grain of the vinyl
  }
  col += vec3(0.1, 0.12, 0.14) * smoothstep(0.006, 0.0, abs(p.y - glassY));

  // two cups: the left shakes on the kick, the right on the snare
  float since = fract(uBeat);
  col = fsCup(col, p - vec2(-0.26, -0.14) - vec2(0.004 * sin(t * 90.0) * uKick, 0.0), uKick, since);
  col = fsCup(col, p - vec2(0.24, -0.15) - vec2(0.004 * sin(t * 83.0) * uSnare, 0.0), uSnare, fract(uBeat + 0.5));
  return col * dim;
}
`;

const lcd = `
// The single-game LCD handhelds of 1980, the juggling one: the whole device -
// a brushed-silver face in a maroon frame, the grey LCD sunk in a red border,
// two big round red buttons at the sides and three small ones under the
// screen - and on the screen a juggler in black segments, arms straight out,
// open hands, balls hopping cell by cell along their arcs. Each ball lands in
// a hand on the beat (the inner every beat, the middle every two, the outer
// every three once the music picks up); the side button is down while that
// hand catches; the score counts every catch.

// a ball cell on arc i at s (0 at the left hand, 1 at the right), in screen units
vec2 lcdArc(float i, float s) {
  float half_ = 0.5 + 0.27 * i;
  return vec2(mix(-half_, half_, s), -0.28 + (0.62 + 0.22 * i) * sin(3.14159 * s));
}
vec2 lcdHand(float i, float side) { return vec2(side * (0.5 + 0.27 * i), -0.38); }

float lcdBox(vec2 q, vec2 h, float r) { vec2 d = abs(q) - h + r; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r; }

vec3 render(vec2 p, vec2 uv) {
  float beats = uTime / uSpb;
  float balls = uEnergy > 0.35 ? 3.0 : 2.0;
  float aa = 1.5 / uRes.y;

  // --- the device ------------------------------------------------------------
  vec3 col = vec3(0.05, 0.04, 0.05);                                   // the table
  float frame = lcdBox(p, vec2(0.84, 0.47), 0.05);
  if (frame < 0.0) col = vec3(0.5, 0.04, 0.07);                       // the maroon case
  stageMask = smoothstep(aa, -aa, frame);                             // on the stage the device floats alone
  float face = lcdBox(p, vec2(0.8, 0.43), 0.03);
  if (face < 0.0) {
    // brushed silver: fine horizontal streaks, lighter at the top
    float brush = vnoise(vec2(p.x * 3.0, p.y * 420.0)) * 0.06;
    col = vec3(0.6, 0.61, 0.64) * (0.92 + 0.14 * (p.y + 0.43)) + brush;
  }
  vec2 sc = vec2(0.0, 0.05);
  float bezel = lcdBox(p - sc, vec2(0.46, 0.33), 0.04);
  if (bezel < 0.0) col = vec3(0.72, 0.73, 0.76) + vnoise(vec2(p.x * 3.0, p.y * 420.0)) * 0.05;
  col -= vec3(0.25) * smoothstep(0.02, 0.0, abs(bezel)) * step(0.0, -p.y + sc.y);   // its lower edge in shadow
  float border = lcdBox(p - sc, vec2(0.39, 0.27), 0.03);
  if (border < 0.0) col = vec3(0.62, 0.05, 0.08);                     // the red border round the glass

  // the big side buttons, pressed while their hand makes a catch
  float nextL = 99.0, nextR = 99.0, handL = 0.0, handR = 0.0;
  for (int k = 0; k < 3; k++) {
    float i = float(k);
    float period = i + 1.0;
    float u = fract(beats / period);
    bool toRight = mod(floor(beats / period) + i, 2.0) < 1.0;
    if (i < balls) {
      float left = (1.0 - u) * period;
      if (toRight) { if (left < nextR) { nextR = left; handR = i; } }
      else { if (left < nextL) { nextL = left; handL = i; } }
    }
  }
  for (int k = 0; k < 2; k++) {
    float side = k == 0 ? -1.0 : 1.0;
    vec2 bc = p - vec2(side * 0.64, -0.1);
    float soon = k == 0 ? nextL : nextR;
    float pressed = smoothstep(0.25, 0.0, soon);
    float r = length(bc);
    col = mix(col, vec3(0.35, 0.03, 0.05), smoothstep(0.093 + aa, 0.093, r));      // the well
    vec3 red = vec3(0.86, 0.1, 0.12) * (1.0 - 0.3 * pressed);
    red += vec3(0.35) * smoothstep(0.05, 0.0, length(bc - vec2(-0.025, 0.03))) * (1.0 - pressed);
    col = mix(col, red, smoothstep(0.08 + aa, 0.08, r));
    // the arrow above it, pointing out
    vec2 aq = p - vec2(side * 0.64, 0.07);
    float tri = max(abs(aq.y) - (0.02 - side * aq.x * 0.6), -side * aq.x - 0.03);
    tri = max(tri, side * aq.x - 0.03);
    col = mix(col, vec3(0.1), smoothstep(aa, 0.0, tri));
  }
  // the three small buttons under the screen
  for (int k = 0; k < 3; k++) {
    vec2 bq = p - vec2(0.05 + 0.15 * float(k), -0.36);
    float pill = lcdBox(bq, vec2(0.05, 0.022), 0.022);
    col = mix(col, vec3(0.6, 0.05, 0.08), smoothstep(aa, 0.0, pill - 0.006));
    col = mix(col, vec3(0.82), smoothstep(aa, 0.0, pill));
  }

  // --- the screen ------------------------------------------------------------
  vec2 lh = vec2(0.36, 0.245);
  float glass = lcdBox(p - sc, lh, 0.01);
  if (glass < 0.0) {
    vec2 q = (p - sc) / lh.y;                                         // screen units: y from -1 to 1
    float ink = 0.0, ghost = 0.0;
    // the juggler: a round head with a tuft, eyes, a round body, short legs
    float head = length(q - vec2(0.0, -0.18)) - 0.17;
    float tuft = length(q - vec2(0.0, 0.03)) - 0.055;
    float body = length(q - vec2(0.0, -0.56)) - 0.18;
    float legs = min(sdSeg(q, vec2(-0.08, -0.7), vec2(-0.16, -0.88)), sdSeg(q, vec2(0.08, -0.7), vec2(0.16, -0.88))) - 0.035;
    float feet = min(sdSeg(q, vec2(-0.16, -0.88), vec2(-0.3, -0.88)), sdSeg(q, vec2(0.16, -0.88), vec2(0.3, -0.88))) - 0.035;
    float figure = min(min(head, tuft), min(body, min(legs, feet)));
    float eyes = min(length(q - vec2(-0.06, -0.15)), length(q - vec2(0.06, -0.15))) - 0.035;
    float on = smoothstep(0.01, 0.0, figure) * (1.0 - smoothstep(0.01, 0.0, eyes));
    ink = max(ink, on);
    // the arms: straight out from the shoulders to one of three places each side, open hands
    for (int k = 0; k < 3; k++) {
      float i = float(k);
      for (int sd = 0; sd < 2; sd++) {
        float side = sd == 0 ? -1.0 : 1.0;
        vec2 hand = lcdHand(i, side);
        float arm = sdSeg(q, vec2(side * 0.14, -0.45), hand) - 0.03;
        float y1 = sdSeg(q, hand, hand + vec2(-side * 0.06, 0.13)) - 0.025;
        float y2 = sdSeg(q, hand, hand + vec2(side * 0.07, 0.12)) - 0.025;
        float seg = smoothstep(0.01, 0.0, min(arm, min(y1, y2)));
        ghost = max(ghost, seg);
        float here = sd == 0 ? handL : handR;
        if (abs(here - i) < 0.5) ink = max(ink, seg);
      }
    }
    // the balls, cell by cell along their arcs, one traversal per (i + 1) beats
    for (int k = 0; k < 3; k++) {
      float i = float(k);
      float cells = 5.0 + 2.0 * i;
      float period = i + 1.0;
      float u = fract(beats / period);
      bool toRight = mod(floor(beats / period) + i, 2.0) < 1.0;
      float cell = floor(u * cells);
      float at = toRight ? cell : cells - 1.0 - cell;
      for (int c = 0; c < 9; c++) {
        float fc = float(c);
        if (fc >= cells) break;
        float d = length(q - lcdArc(i, (fc + 0.5) / cells)) - 0.06;
        float seg = smoothstep(0.01, 0.0, d);
        ghost = max(ghost, seg);
        if (i < balls && abs(fc - at) < 0.5) ink = max(ink, seg);
      }
    }
    // the score, top right: every catch so far
    float score = 0.0;
    for (int k = 0; k < 3; k++) score += floor(beats / float(k + 1));
    vec2 dq = (q - vec2(0.62, 0.55)) / 0.15;
    if (dq.x > 0.0 && dq.x < 4.1 && dq.y > 0.0 && dq.y < 2.0) {
      float slot = floor(dq.x / 1.4);
      int dgt = int(mod(floor(score / pow(10.0, 2.0 - slot)), 10.0));
      vec2 cq = vec2(fract(dq.x / 1.4) * 1.4, dq.y);
      if (cq.x < 1.0) ink = max(ink, digit7(cq, dgt));
    }
    // the grey glass, the segments' faint ghosts, and the black ink with its shadow on the backing
    // a greenish grey, darker than the metal round it
    vec3 lcdc = vec3(0.47, 0.5, 0.44) - 0.04 * (q.y + 1.0) * 0.5;
    lcdc = mix(lcdc, lcdc * 0.9, ghost * 0.5);
    col = mix(lcdc, vec3(0.07, 0.07, 0.08), ink);
  }
  return col;
}
`;

const rings = `
// Interference rings: two sets of concentric rings drifting through each
// other, every crossing flipping the colour - the moire that seems to move on
// its own. The rings spread outward on the kick, tighten on the bass, and a
// third set joins in when the music peaks. Nothing flashes the whole screen.
vec3 render(vec2 p, vec2 uv) {
  float t = uTime * 0.6 + uSeed.x * 20.0;
  vec2 c1 = vec2(sin(t * 0.71) * 0.45, cos(t * 0.53) * 0.3);
  vec2 c2 = vec2(sin(t * 0.47 + 2.0) * 0.5, sin(t * 0.83 + 1.0) * 0.32);
  vec2 c3 = vec2(cos(t * 0.37 + 4.0) * 0.4, sin(t * 0.61 + 3.0) * 0.28);

  // ring spacing: tighter on the bass; the rings run outward, a step further on the kick
  float k = 26.0 + 6.0 * uBass;
  float run = uTime * 1.4 + uKick * 0.6;
  float r1 = floor(length(p - c1) * k - run);
  float r2 = floor(length(p - c2) * k - run * 0.8);
  float x = mod(r1 + r2, 2.0);
  // the third set joins in, all at once, when the music peaks
  if (uEnergy > 0.7) {
    float r3 = floor(length(p - c3) * k * 0.8 - run * 1.2);
    x = mod(r1 + r2 + r3, 2.0);
  }

  // two colours of the seed's palette, turning with the bars of the music
  float hue = uSeed.y + floor(uBarIndex) * 0.07;
  // each colour set to a brightness of its own, whatever the palette gives: the light
  // one always light, the dark one never black - a little less contrast, kinder to the eyes
  vec3 a = pal(fract(hue)), b = pal(fract(hue + 0.45));
  a = unblack(a); b = unblack(b);                     // (the palette can dip below zero: never black)
  const vec3 LUMA = vec3(0.3, 0.59, 0.11);
  a *= (0.2 + 0.06 * uPad) / max(dot(a, LUMA), 0.05);
  b *= (0.72 + 0.15 * uPad) / max(dot(b, LUMA), 0.05);
  vec3 col = mix(a, b, x);
  // a soft glow round the centres, brighter on the snare
  col += pal(fract(hue + 0.2)) * 0.12 * (0.5 + uSnare)
       * (exp(-length(p - c1) * 6.0) + exp(-length(p - c2) * 6.0));
  return col;
}
`;

const ball = `
// The bouncing checkered ball of the Amiga's first demos: a red
// and white ball spinning on a tilted axis, bouncing between the walls of a
// grid room, its shadow on the back wall. Here it lands on every beat, spins
// faster as the music builds, and the room lights up on the kick.
vec3 render(vec2 p, vec2 uv) {
  float t = uTime;
  float aspect = uRes.x / uRes.y;
  float halfW = 0.5 * aspect;
  vec3 grey = vec3(0.66);
  vec3 purple = vec3(0.62, 0.0, 0.62);

  // the room: a back wall with a square grid, a floor in perspective below it
  float floorY = -0.3;
  float g = 0.075;
  vec3 col = grey;
  if (p.y > floorY) {
    vec2 w = p / g;
    vec2 l = abs(fract(w + 0.5) - 0.5) * g;
    col = mix(purple, grey, smoothstep(0.0, 0.004, min(l.x, l.y)));
  } else {
    // below the wall the floor comes towards us: its squares grow wider and
    // deeper the nearer they are, packed tight only where they meet the wall
    float s = floorY - p.y;
    float s0 = 0.12;
    float spread = (s + s0) / s0;                 // 1 at the wall, larger towards us
    float fx = p.x / (g * spread);
    float fz = 0.9 / (s + s0);                    // world depth: uniform steps on the floor
    vec2 l = vec2(abs(fract(fx + 0.5) - 0.5) * g * spread,
                  abs(fract(fz + 0.5) - 0.5) / (0.9 / ((s + s0) * (s + s0))));
    col = mix(purple, grey, smoothstep(0.0, 0.004, min(l.x, l.y)));
  }
  // the room catches the light on the kick
  col *= 0.86 + 0.22 * uKick;

  // the ball: across the room and back, landing on every beat
  float r = 0.17 + 0.015 * uBass;
  float travel = halfW - r - 0.05;
  float across = abs(fract(t * 0.09 + uSeed.x) * 2.0 - 1.0) * 2.0 - 1.0;   // a triangle wave, wall to wall
  vec2 c = vec2(across * travel, floorY + r + 0.36 * (1.0 - pow(2.0 * fract(uBeat) - 1.0, 2.0)));

  // its shadow on the back wall, down and to the right, as the ball demos had it
  float sh = length(p - c - vec2(0.09, -0.05)) - r;
  col *= 1.0 - 0.45 * (1.0 - smoothstep(0.0, 0.006, sh));

  vec2 d = (p - c) / r;
  float rr = dot(d, d);
  if (rr < 1.0) {
    vec3 n = vec3(d, sqrt(1.0 - rr));
    // the tilted axis, and the spin: quicker as the music builds
    n.xy = rot(0.38) * n.xy;
    float spin = t * (1.6 + 1.2 * uEnergy) * (across > 0.0 ? 1.0 : 1.0) + uSeed.y * 6.28;
    float lon = atan(n.x, n.z) + spin;
    float lat = asin(clamp(n.y, -1.0, 1.0));
    float cell = mod(floor(lon / 6.28318 * 16.0) + floor((lat / 3.14159 + 0.5) * 8.0), 2.0);
    vec3 red = vec3(0.85, 0.05, 0.05);
    vec3 b = mix(red, vec3(0.95), cell);
    // flat, as the ball demos drew it, with only a hint of the edge
    b *= 0.9 + 0.1 * n.z;
    col = mix(col, b, 1.0 - smoothstep(0.96, 1.0, rr));
  }
  return col;
}
`;

const kefrens = `
// Kefrens bars, the Amiga classic: on every raster line a short shaded bar is
// drawn at a position that swings on sines, into a line buffer that is never
// cleared - so each line shows every bar drawn above it, and the bars pile up
// into a weaving ribbon. The swing widens on the bass, the bars fatten on the
// kick, the colours turn with the bars of the music.
vec3 render(vec2 p, vec2 uv) {
  float rows = 128.0;
  float aspect = uRes.x / uRes.y;
  // raster lines from the top, as the copper walked them
  float k = floor((1.0 - uv.y) * rows);
  float x = uv.x * aspect;
  float t = uTime;
  float swing = 0.36 + 0.3 * uBass + 0.18 * uEnergy;
  float w = 0.026 + 0.03 * uKick;               // half the width of a bar: fat on the kick
  float cx = 0.5 * aspect;

  // the latest bar drawn at or above this line that covers x is what shows
  vec3 col = vec3(0.0);
  float hit = 0.0;
  for (int i = 0; i < 128; i++) {
    float j = k - float(i);
    if (j < 0.0) break;
    float bx = cx + swing * (sin(j * 0.071 + t * 1.3 + uSeed.x * 6.28) * 0.7
                           + sin(j * 0.023 - t * 0.9 + uSeed.y * 6.28) * 0.5) * aspect * 0.5;
    float d = (x - bx) / w;
    if (abs(d) < 1.0) {
      // a bar is a little cylinder: shaded across its width, with a highlight
      float shade = sqrt(1.0 - d * d);
      vec3 c = pal(fract(j * 0.012 + floor(uBarIndex) * 0.11 + uSeed.z));
      col = c * (0.2 + 0.85 * shade) + vec3(1.0) * pow(shade, 12.0) * 0.45;
      col *= 0.7 + 0.3 * uPad + 0.35 * uKick;
      hit = 1.0;
      break;
    }
  }
  // behind the ribbon: black, and a copper bar rolling down on every beat
  if (hit < 0.5) {
    col = vec3(0.0);
    float d = abs((1.0 - uv.y) - fract(uBeat)) * rows;
    col += pal(fract(uSeed.y + 0.5)) * max(0.0, 1.0 - d / 2.5) * (0.35 + 0.5 * uHat);
  }
  return col;
}
`;

const fireworks = `
// Fireworks: a burst on every backbeat, particles streaking out and falling.
float segDist(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  return length(pa - ba * h);
}
vec3 render(vec2 p, vec2 uv) {
  vec3 col = vec3(0.01, 0.01, 0.03) + vec3(0.02, 0.02, 0.07) * uv.y;
  vec2 g = floor((p + vec2(uTime * 0.01, 0.0)) * 40.0);
  if (hash12(g) > 0.985) col += vec3(0.4) * hash12(g + 3.0);
  float spb = max(uSpb, 0.2);
  float beatNow = floor(uTime / spb);
  for (int j = 0; j < 4; j++) {
    float bi = floor((beatNow - 1.0) / 2.0) * 2.0 + 1.0 - float(j) * 2.0;   // beats 2 and 4
    float age = uTime - bi * spb;
    if (age < 0.0 || age > 2.4) continue;
    float h = hash11(bi * 1.37 + uSeed.x * 9.1);
    vec2 o = vec2((h - 0.5) * 1.3, 0.05 + 0.25 * hash11(bi * 2.11));
    // fireworks are light: keep the palette's hue, push it to full brightness
    vec3 c = pal(fract(h * 3.7 + uSeed.y));
    c = unblack(c);                                   // (the palette can dip below zero: never black)
    c /= max(max(c.r, c.g), max(c.b, 0.2));
    float life = 1.0 - age / 2.4;
    for (int i = 0; i < 36; i++) {
      float fi = float(i);
      float a = fi / 36.0 * 6.28318 + h * 6.0;
      vec2 v = vec2(cos(a), sin(a)) * (0.45 + 0.25 * hash11(fi * 3.3 + bi));
      vec2 gr = vec2(0.0, -0.35);
      vec2 p1 = o + v * age + gr * age * age * 0.5;
      float a0 = max(age - 0.09, 0.0);
      vec2 p0 = o + v * a0 + gr * a0 * a0 * 0.5;
      float d = segDist(p, p0, p1);
      col += c * (1.0 - smoothstep(0.0, 0.022, d)) * life * 2.2;
      col += c * exp(-d * 55.0) * life * 0.3;
    }
    col += c * exp(-length(p - o) * 6.0) * exp(-age * 7.0) * 0.8;
  }
  return col;
}
`;

const ripple = `
// Water: drops land on the beat and ripple across a tiled pool floor.
float height(vec2 p) {
  float spb = max(uSpb, 0.2);
  float bn = floor(uTime / spb);
  float h = 0.0;
  for (int j = 0; j < 6; j++) {
    float b = bn - float(j);
    float age = uTime - b * spb;
    vec2 o = (hash22(vec2(b, uSeed.x * 7.0)) - 0.5) * vec2(1.4, 0.8);
    float r = length(p - o);
    float front = 1.0 - smoothstep(age * 1.4 - 0.15, age * 1.4 + 0.02, r);
    h += sin(r * 38.0 - age * 9.0) * exp(-age * 1.1) * exp(-r * 2.2) * front;
  }
  return h;
}
vec3 render(vec2 p, vec2 uv) {
  float e = 0.004;
  float h = height(p);
  vec2 g = vec2(height(p + vec2(e, 0.0)) - h, height(p + vec2(0.0, e)) - h) / e;
  vec2 q = p + g * 0.012;
  vec2 tq = q * rot(0.3) * 5.0 + vec2(uTime * 0.15, 0.0);
  float chk = mod(floor(tq.x) + floor(tq.y), 2.0);
  vec3 col = mix(pal(uSeed.z), pal(uSeed.z + 0.18), chk) * 0.6;
  vec2 cell = abs(fract(tq) - 0.5);
  col *= 0.75 + 0.25 * smoothstep(0.42, 0.48, max(cell.x, cell.y));
  vec3 n = normalize(vec3(-g * 0.02, 1.0));
  col = mix(col, col * vec3(0.55, 0.85, 1.1), 0.4);
  col += vec3(1.0) * pow(max(0.0, dot(n, normalize(vec3(0.4, 0.5, 1.0)))), 60.0) * 0.6;
  return col * (0.85 + 0.3 * uEnergy);
}
`;

const outrun = `
// Outrun: the synthwave sunset — a striped sun, a neon grid racing to the
// horizon, mountains in silhouette. Fixed colours: this one has an identity.
float ridge(float x) {
  return 0.06 + 0.07 * abs(sin(x * 2.1 + uSeed.x * 9.0)) + 0.04 * abs(sin(x * 5.3 + uSeed.y * 5.0));
}
vec3 render(vec2 p, vec2 uv) {
  float t = uTime;
  float hz = -0.04;
  vec3 hot = mix(vec3(1.0, 0.25, 0.6), vec3(0.2, 0.85, 1.0), step(0.5, uSeed.y));
  vec3 col;
  if (p.y > hz) {
    float sky = p.y - hz;
    col = mix(vec3(0.95, 0.3, 0.55), vec3(0.05, 0.02, 0.16), smoothstep(0.0, 0.5, sky));
    vec2 g = floor(p * 60.0);
    if (hash12(g) > 0.988) col += vec3(0.7) * smoothstep(0.15, 0.4, sky);

    vec2 sc = vec2(0.0, hz + 0.19);
    float r = length(p - sc);
    float sunR = 0.24 + 0.012 * uKick;
    float y = (p.y - sc.y) / sunR;
    float gap = clamp((0.15 - y) * 0.45, 0.0, 0.5);
    float band = fract(y * 7.0 - t * 0.5);
    if (r < sunR && !(y < 0.15 && band < gap)) {
      col = mix(vec3(1.0, 0.2, 0.55), vec3(1.0, 0.86, 0.3), smoothstep(-1.0, 1.0, y));
    }
    col += vec3(1.0, 0.35, 0.5) * exp(-max(0.0, r - sunR) * 9.0) * 0.35;

    float m = hz + ridge(p.x);
    if (p.y < m) {
      col = vec3(0.07, 0.02, 0.13);
      col += hot * exp(-(m - p.y) * 90.0) * 0.8;
    }
  } else {
    float z = 0.32 / (hz - p.y + 0.002);
    vec2 gp = vec2(p.x * z, z + t * (3.0 + uBass * 2.0));
    vec2 w = fwidth(gp);
    vec2 edge = 0.5 - abs(fract(gp) - 0.5);                 // distance to the cell edge
    vec2 l = 1.0 - smoothstep(w * 0.5, w * 1.5 + 0.02, edge);
    float line = max(l.x, l.y) * smoothstep(60.0, 8.0, z);
    col = vec3(0.04, 0.0, 0.08) + hot * line * (0.8 + 0.6 * uBass) * exp(-z * 0.06);
    col += hot * exp(-(hz - p.y) * 30.0) * 0.4;
  }
  return col;
}
`;

const morph = `
// Morph: a raymarched solid melting from sphere to box to torus to diamond on
// the bar, its skin rippling with the bass, lit like oil on water.
float sdBoxM(vec3 p, vec3 b) {
  vec3 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}
float shapeM(int i, vec3 p) {
  if (i == 0) return length(p) - 0.8;
  if (i == 1) return sdBoxM(p, vec3(0.58)) - 0.06;
  if (i == 2) { vec2 q = vec2(length(p.xz) - 0.65, p.y); return length(q) - 0.24; }
  vec3 a = abs(p);
  return (a.x + a.y + a.z - 1.0) * 0.57735;
}
float mapM(vec3 p) {
  p.xz *= rot(uTime * 0.5);
  p.xy *= rot(uTime * 0.3);
  float ph = uBarIndex * 0.5 + uBar * 0.5;
  int a = int(mod(floor(ph), 4.0));
  int b = int(mod(floor(ph) + 1.0, 4.0));
  float m = smoothstep(0.6, 1.0, fract(ph));
  float d = mix(shapeM(a, p), shapeM(b, p), m);
  return d + 0.03 * sin(p.x * 8.0 + uTime * 3.0) * sin(p.y * 8.0) * sin(p.z * 8.0) * (0.4 + uBass);
}
vec3 render(vec2 p, vec2 uv) {
  vec3 col = mix(vec3(0.01, 0.0, 0.03), pal(0.7) * 0.18, 1.0 - length(p));
  vec2 gg = abs(fract(p * 6.0) - 0.5);
  col += pal(0.4) * 0.05 * (1.0 - smoothstep(0.0, 0.03, min(gg.x, gg.y)));
  vec3 ro = vec3(0.0, 0.0, -2.6);
  vec3 rd = normalize(vec3(p, 1.5));
  float t = 0.0;
  float glow = 0.0;
  bool hit = false;
  for (int i = 0; i < 64; i++) {
    float d = mapM(ro + rd * t);
    glow += exp(-max(d, 0.0) * 12.0) * 0.02;
    if (d < 0.002) { hit = true; break; }
    t += d * 0.7;
    if (t > 6.0) break;
  }
  col += pal(uTime * 0.05 + 0.2) * glow * (0.6 + uLead);
  if (hit) {
    vec3 pos = ro + rd * t;
    vec2 e = vec2(0.002, 0.0);
    vec3 n = normalize(vec3(mapM(pos + e.xyy) - mapM(pos - e.xyy),
                            mapM(pos + e.yxy) - mapM(pos - e.yxy),
                            mapM(pos + e.yyx) - mapM(pos - e.yyx)));
    float fres = pow(1.0 - abs(dot(n, rd)), 3.0);
    vec3 irid = pal(fract(dot(n, rd) * 0.8 + uTime * 0.05 + uSeed.y));
    float dif = max(0.0, dot(n, normalize(vec3(0.5, 0.8, -0.6))));
    col = irid * (0.15 + 0.75 * dif) + pal(0.9) * fres * (0.7 + uSnare);
    col += vec3(1.0) * pow(max(0.0, dot(reflect(rd, n), normalize(vec3(0.5, 0.8, -0.6)))), 40.0) * 0.7;
  }
  return col;
}
`;

// ---------------------------------------------------------------------------
// Shader art (2010 on): the art made of nothing but a fragment shader, as the
// decade shared it, each scene from a real piece of it - written from scratch,
// never its code.
// ---------------------------------------------------------------------------

const prism = `
// Prism: a lattice of points of light pushed out along the radius by a wave that travels from the middle,
// each colour a moment behind the one before, so every point splits into red, green and blue and a white star
// burns where they meet - in the spirit of the tiny chromatic light pieces of the 2010s' shader art. The wave
// runs at a steady pace and swells as the music builds (a pace tied to how busy the music is jumped with every
// kick), the kick throws it outward, the snare widens the split between the colours, and the lattice turns a sixteenth of a turn on each bar; each phrase opens with
// the colours thrown wide apart and a ring of white light sweeping out from the star.
float prismLight(vec2 q, float z) {
  float r = max(length(q), 1e-3);
  // the wave: rings running out from the middle, strongest at the crest of a slow swell
  float swell = 0.5 + 0.5 * sin(z * 0.9);
  float ring = 0.5 + 0.5 * cos(r * 8.5 - z * 2.2);
  vec2 w = q + q / r * ring * (0.18 + 0.32 * swell) * (0.8 + 0.4 * uEnergy + 0.7 * uKick);
  // the lattice: a point of light in every cell, its glow falling off with the square of the distance
  vec2 cell = fract(w * 4.2 + 0.5) - 0.5;
  float d = dot(cell, cell);
  // and the rings themselves, faint, where the wave crests
  return 0.0011 / (d + 0.0003) / (0.3 + 1.4 * r) + 0.035 * pow(ring, 24.0) / (0.4 + 2.0 * r);
}
vec3 render(vec2 p, vec2 uv) {
  float t = uTime * 0.8 + uSeed.x * 30.0;
  float turn = (uBarIndex + smoothstep(0.0, 0.2, uBar)) * 0.3927 * (uSeed.y > 0.5 ? 1.0 : -1.0);
  vec2 q = rot(turn) * p;
  float phrase = mod(uBarIndex, 8.0) + uBar;            // 0 where a phrase opens
  float open = exp(-phrase * 3.0);
  float split = 0.07 + 0.08 * uSnare + 0.25 * open;
  vec3 col = vec3(prismLight(q, t), prismLight(q * 1.03, t + split), prismLight(q * 1.06, t + 2.0 * split));
  // the star where the colours meet
  float r = length(q);
  vec2 a = abs(rot(0.7854) * q);
  col += vec3(1.0) * (0.004 / (r * r + 0.002) + 0.0012 / (min(abs(q.x), abs(q.y)) + 0.004) * exp(-r * 16.0)
    + 0.0007 / (min(a.x, a.y) + 0.004) * exp(-r * 22.0)) * (0.6 + 0.6 * uKick);
  col += vec3(1.0) * 0.012 / (abs(length(p) - phrase * 0.9) + 0.01) * open;
  // a tint from the seed's palette, kept faint: the light stays white where the channels agree
  col *= mix(vec3(1.0), unblack(pal(0.15 + r * 0.3)) * 1.4, 0.18);
  return col * (0.75 + 0.45 * uEnergy);
}
`;

const sculpture = `
// Sculpture: the raymarched still life of the 2010s - smooth shapes made of distance functions standing on a
// floor, lit by a low sun and the sky, with the soft shadows and penumbrae and the darkening where surfaces
// meet that became the signature of the decade's raymarched distance fields.
// An arch - a rounded block with a hole through it - and a standing ring hold still; a ball of the same stuff
// travels a figure of eight through the arch's hole and the ring's, and wherever it comes near them it melts
// into them - the surfaces bulging out to meet it, flowing round it as it passes through, letting go behind it -
// the trick of smooth-blended distance fields that surprised everyone then. The ball goes round once every four
// bars, swells on the kick, the melt widens with the bass, the sun swings a little each bar, the camera drifts
// slowly round and punches in on the kick; each phrase opens with everything melted into one shape, coming
// apart again over its first bar.
float scBox(vec3 p, vec3 b, float r) { vec3 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r; }
float scSmin(float a, float b, float k) { float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
// the ball's way: a figure of eight through the two holes, along their axes where it passes through
vec3 scBallAt() {
  float th = (uBarIndex + uBar) / 4.0 * 6.28318 + uSeed.x * 6.28;
  return vec3(0.95 * sin(th), 0.55 + 0.06 * sin(th * 2.0 + 1.0), 0.8 * sin(2.0 * th));
}
// the scene: x is the distance, y the material (0 the floor; from 1 the sculpture to 2 the ball, blended where they melt)
vec2 scMap(vec3 p) {
  float open = exp(-(mod(uBarIndex, 8.0) + uBar) * 2.5);
  float arch = max(scBox(p - vec3(-0.95, 0.6, 0.0), vec3(0.6, 0.6, 0.26), 0.14), -(length(p.xy - vec2(-0.95, 0.55)) - 0.36));
  vec3 rq = p - vec3(0.95, 0.55, 0.0);
  rq.xz = rot(0.25 * sin(uTime * 0.3)) * rq.xz;
  float ring = length(vec2(length(rq.xy) - 0.5, rq.z)) - 0.12;
  ring = min(ring, scBox(p - vec3(0.95, 0.0, 0.0), vec3(0.08, 0.06, 0.08), 0.02));   // (its foot)
  float ball = length(p - scBallAt()) - 0.27 * (1.0 + 0.12 * uKick);
  float sc = scSmin(arch, ring, 0.05 + 1.2 * open);
  float k = 0.45 + 0.25 * uBass + 0.6 * open;
  float hb = clamp(0.5 + 0.5 * (sc - ball) / k, 0.0, 1.0);
  vec2 m = vec2(scSmin(sc, ball, k), 1.0 + hb);
  return p.y < m.x ? vec2(p.y, 0.0) : m;
}
vec3 scNormal(vec3 p) {
  vec2 e = vec2(0.0015, 0.0);
  return normalize(vec3(scMap(p + e.xyy).x - scMap(p - e.xyy).x, scMap(p + e.yxy).x - scMap(p - e.yxy).x, scMap(p + e.yyx).x - scMap(p - e.yyx).x));
}
// the soft shadow: how close the ray to the sun passes to anything, as a penumbra
float scShadow(vec3 ro, vec3 rd) {
  float res = 1.0, t = 0.02;
  for (int i = 0; i < 22; i++) {
    float h = scMap(ro + rd * t).x;
    res = min(res, 9.0 * h / t);
    t += clamp(h, 0.04, 0.35);
    if (res < 0.002 || t > 5.0 || (ro + rd * t).y > 2.6) break;
  }
  return clamp(res, 0.0, 1.0);
}
// ambient occlusion: how much of the space just off the surface is taken
float scAO(vec3 p, vec3 n) {
  float occ = 0.0, w = 1.0;
  for (int i = 1; i <= 3; i++) {
    float h = 0.04 + 0.18 * float(i);
    occ += (h - scMap(p + n * h).x) * w;
    w *= 0.7;
  }
  return clamp(1.0 - 2.2 * occ, 0.0, 1.0);
}
vec3 render(vec2 p, vec2 uv) {
  // the camera drifts: round slowly, rising and falling, nearer and farther, its aim wandering a little
  float ang = uTime * 0.1 + 0.35 * sin(uTime * 0.13) + uSeed.x * 6.28;
  float dist = 5.4 + 0.6 * sin(uTime * 0.17);
  vec3 ro = vec3(dist * sin(ang), 1.7 + 0.4 * sin(uTime * 0.21), dist * cos(ang));
  vec3 ta = vec3(0.15 * sin(uTime * 0.23), 0.45 + 0.08 * sin(uTime * 0.19), 0.0);
  vec3 fw = normalize(ta - ro), rt = normalize(cross(fw, vec3(0.0, 1.0, 0.0))), up = cross(rt, fw);
  vec3 rd = normalize(p.x * rt + p.y * up + (1.9 + 0.25 * uKick) * fw);
  // the sky: pale at the horizon, deeper above, warm towards the sun
  float sa = 0.6 + 0.35 * sin((uBarIndex + smoothstep(0.0, 0.5, uBar)) * 0.5);
  vec3 sun = normalize(vec3(cos(sa) * 0.8, 0.55, sin(sa) * 0.8));
  vec3 sky = mix(vec3(0.62, 0.68, 0.76), vec3(0.32, 0.42, 0.6), clamp(rd.y * 1.6, 0.0, 1.0));
  sky += vec3(1.0, 0.75, 0.45) * pow(max(dot(rd, sun), 0.0), 8.0) * 0.25;
  vec3 col = sky;
  float t = 0.0;
  vec2 h = vec2(0.0);
  // (a ray already above the shapes and climbing only meets the sky)
  for (int i = 0; i < 60; i++) {
    vec3 q = ro + rd * t;
    if (q.y > 2.6 && rd.y > 0.0) { t = 20.0; break; }
    h = scMap(q);
    if (h.x < 0.0015 * t || t > 18.0) break;
    t += h.x;   // (never longer than the distance: a ray meeting a face head-on would land inside it, and read as shadowed)
  }
  if (t < 18.0) {
    vec3 pos = ro + rd * t, n = scNormal(pos);
    vec3 base = h.y < 0.5 ? vec3(0.72, 0.7, 0.66) * (0.85 + 0.15 * smoothstep(-0.1, 0.1, sin(pos.x * 1.2) * sin(pos.z * 1.2)))
      : mix(mix(vec3(0.82, 0.62, 0.38), unblack(pal(0.2)), 0.35), mix(vec3(0.5, 0.25, 0.12), unblack(pal(0.65)), 0.5), smoothstep(1.15, 1.85, h.y));
    float dif = max(dot(n, sun), 0.0) * scShadow(pos + n * 0.01, sun);
    float occ = scAO(pos, n);
    float amb = 0.5 + 0.5 * n.y;
    float spe = pow(max(dot(reflect(rd, n), sun), 0.0), 24.0) * dif;
    col = base * (vec3(1.3, 1.05, 0.8) * dif * (0.9 + 0.3 * uSnare) + vec3(0.32, 0.4, 0.55) * amb * occ) + vec3(1.0, 0.9, 0.75) * spe * 0.35;
    col = mix(col, sky, 1.0 - exp(-0.004 * t * t));
  }
  col = pow(col, vec3(0.4545));
  return col * (0.92 + 0.12 * uEnergy);
}
`;

const fractalflight = `
// Fractal flight: flying over the mandelbox, the fractal Tom Lowe found in 2010 and the shader art of the
// decade flew through again and again - every point folded inside a box, then inside a sphere, scaled and
// moved back, over and over, until the surface is a palace of arches, balconies and holes that repeat at every
// size. Written from its definition. The flight, its banking and the box's scale (the architecture itself
// shifting) all move slowly at the same pace whatever the tempo, so the fractal can be seen - a speed tied to the
// bars rushed it in a fast song, one tied to how busy the music is jumped with every kick. The music lights it:
// the kick punches the view a little and lights the glow, the snare the edges, and each phrase opens with the
// glow flaring and dying away over its first bar.
float ffScale() { return -1.66 - 0.08 * sin(uTime * 0.035 + uSeed.z * 6.28); }
// the distance to the mandelbox from p, and the closest its orbit came to the middle (for the colour)
vec2 ffMap(vec3 p) {
  float s = ffScale();
  vec3 z = p;
  float dr = 1.0, trap = 1e9;
  for (int i = 0; i < 7; i++) {
    z = clamp(z, -1.0, 1.0) * 2.0 - z;                 // the box fold: past 1, 2 - c; past -1, -2 - c
    float r2 = dot(z, z);
    if (r2 < 0.25) { z *= 4.0; dr *= 4.0; }            // the sphere fold: inside half, times four
    else if (r2 < 1.0) { z /= r2; dr /= r2; }          // inside one, turned inside out
    z = s * z + p;
    dr = dr * abs(s) + 1.0;
    trap = min(trap, r2);
  }
  return vec2(length(z) / abs(dr), trap);
}
vec3 render(vec2 p, vec2 uv) {
  float fly = uTime * 0.045 + uSeed.x * 6.28;
  float tilt = 0.3 * sin(uTime * 0.03 + uSeed.y * 6.28);
  float open = exp(-(mod(uBarIndex, 8.0) + uBar) * 2.5);              // a phrase opening, fading over its first bar
  // the path: round the box, swooping in close over its face and out again, rising and dipping
  float near = 0.5 + 0.5 * sin(fly * 1.9 + uSeed.w * 6.28);
  float rad = 6.0 - 1.4 * near;
  vec3 ro = vec3(rad * cos(fly), 1.6 * sin(fly * 0.7 + tilt), rad * sin(fly));
  vec3 ta = vec3(0.8 * cos(fly + 1.2), 0.4 * sin(fly * 1.3), 0.8 * sin(fly + 1.2));
  vec3 fw = normalize(ta - ro), rt = normalize(cross(fw, vec3(sin(tilt), 1.0, 0.0))), up = cross(rt, fw);
  vec3 rd = normalize(p.x * rt + p.y * up + (1.5 - 0.08 * uKick) * fw);
  vec3 bg = mix(vec3(0.01, 0.01, 0.025), unblack(pal(0.85)) * 0.08, 0.5 + 0.5 * rd.y);
  vec3 col = bg;
  float t = 0.0, glow = 0.0;
  vec2 h = vec2(1.0);
  int steps = 0;
  // (the box lies inside a sphere of radius 3.5: a ray that misses it meets nothing, one that hits starts there)
  float bb = dot(ro, rd), bc = dot(ro, ro) - 12.25, bd = bb * bb - bc;
  if (bd < 0.0) t = 13.0; else t = max(0.0, -bb - sqrt(bd));
  for (int i = 0; i < 64; i++) {
    if (t > 12.0) break;
    h = ffMap(ro + rd * t);
    glow += exp(-h.x * 40.0) * 0.012;
    if (h.x < 0.003 * t || t > 12.0) break;
    t += h.x * 0.9;
    steps = i;
  }
  if (t < 12.0) {
    vec3 pos = ro + rd * t;
    vec2 e = vec2(0.003 * t, 0.0);
    vec3 n = normalize(vec3(ffMap(pos + e.xyy).x - ffMap(pos - e.xyy).x, ffMap(pos + e.yxy).x - ffMap(pos - e.yxy).x, ffMap(pos + e.yyx).x - ffMap(pos - e.yyx).x));
    vec3 lig = normalize(vec3(0.6, 0.7, -0.4));
    float occ = 1.0 - float(steps) / 64.0;
    vec3 base = unblack(pal(0.1 + 0.35 * sqrt(h.y)));
    float dif = max(dot(n, lig), 0.0);
    float rim = pow(1.0 - abs(dot(n, rd)), 3.0);
    col = base * (0.3 + 1.0 * dif) * (0.35 + 0.65 * occ) + unblack(pal(0.6)) * rim * (0.25 + 0.6 * uSnare);
    col = mix(col, bg, 1.0 - exp(-0.012 * t * t));
  }
  col += unblack(pal(0.45)) * glow * (0.35 + 0.9 * uKick + 1.2 * open);
  return col * (0.85 + 0.25 * uEnergy);
}
`;

// ---------------------------------------------------------------------------
// The thin eras filled: a film's code rain (1999), a 64k intro's gimbal and the DJ decks (2000s).
// ---------------------------------------------------------------------------

const coderain = `
// Code rain: falling green code, as the cyberpunk screens of the turn of the millennium imagined a computer's
// inner world - an idea of the time, nothing of any one film - made by hand rather than flat. The camera moves
// slowly and steadily forward into the rain: sheets of it stand one behind another, coming nearer, growing,
// passing by and fading as new ones appear far off - the far ones small, dim and out of focus, the nearest large
// and soft, the ones between sharp; every glyph glowing, the sheets adding up like light. The glyphs are the
// seed's own, a few strokes on a three-by-five grid, mirrored. A fall is a white glyph typing its way down -
// changing every few frames as if keyed in - and leaving a green ghost of what it typed, fading; each runs on
// until it has left the bottom. No punch shakes it: the music moves the flow instead - the camera and the falls
// gather speed through each phrase and ease back as it ends (worked out as a sum, so nothing ever jumps), falls
// start on the beats, the kick lights the heads, the snare flickers the trails. And as each phrase opens
// something rises out of the rain, woven of code, and sinks back over the next bars - in turn a face in dark
// glasses, the seed, and SEEDSCENE.
float crGlyph(vec2 f, float id) {
  // the strokes: three or four lines between the points of a three-by-five lattice, picked by the glyph's number -
  // a bar across the top, then strokes down, across and slanting, as a kana or a letter is built; the distance
  if (f.x < -0.3 || f.y < -0.3 || f.x > 1.3 || f.y > 1.3) return 1e3;
  vec2 q = f * vec2(2.0, 4.0);
  float d = hash11(id * 1.3) < 0.3 ? 1e3 : sdSeg(q, vec2(0.0, 4.0), vec2(2.0, 4.0));
  for (int k = 0; k < 3; k++) {
    float fk = float(k);
    vec2 a = floor(vec2(hash11(id * 2.1 + fk * 5.3) * 3.0, hash11(id * 3.7 + fk * 1.9) * 5.0));
    vec2 b = floor(vec2(hash11(id * 4.3 + fk * 7.1) * 3.0, hash11(id * 5.9 + fk * 3.3) * 5.0));
    if (length(a - b) < 0.5) b = vec2(a.x, 0.0);
    d = min(d, sdSeg(q, a, b));
  }
  return d;
}
// the flow: the time, with something added that swells through each phrase of eight bars and dies away at its
// end - the sum of sin squared over the bars, so its pace rises and falls but it never jumps
float crExtra(float s) {
  float x = mod(s, 8.0);
  return floor(s / 8.0) * 4.0 + x * 0.5 - 0.63662 * sin(x * 0.785398);
}
float crFlowAt(float t, float s) { return t + 0.5 * 4.0 * max(uSpb, 0.2) * crExtra(s); }
// one sheet of rain, cols across the screen at its distance; speed in cells a second of flow; blur its focus
vec3 crSheet(vec2 p, float cols, float speed, float bright, float blur, float sheet, float flow, float s) {
  float spb = max(uSpb, 0.2);
  float beats = uTime / spb;
  vec2 q = vec2(p.x * cols + hash11(sheet * 3.1) * 7.0, p.y * cols * 0.72);
  float col = floor(q.x);
  vec2 cell = fract(q);
  float row = floor(q.y);
  float top = cols * 0.36 + 1.0;
  // the falls in this column, each from the beat it started on, for as long as it takes to leave the screen
  float lit = 0.0, head = 0.0, fallId = 0.0;
  for (int k = 0; k < 12; k++) {
    float b = floor(beats) - float(k);
    if (hash12(vec2(col * 1.31 + sheet * 17.0, b)) > 0.17) continue;
    float since = flow - crFlowAt(b * spb, s - (beats - b) / 4.0);          // the flow since it started
    float y = top - since * speed * (0.8 + 0.5 * hash11(col + b * 0.7));   // the head's row
    float d = row - y;                                                      // rows behind the head
    if (d < -0.5) continue;
    float len = 10.0 + 18.0 * hash11(col * 3.1 + b);
    float w = (1.0 - clamp(d / len, 0.0, 1.0)) * step(d, len);
    if (w > lit) { lit = w; fallId = b; }
    head = max(head, 1.0 - smoothstep(0.0, 1.2, abs(d)));
  }
  if (lit <= 0.0) return vec3(0.0);
  // the glyph: the head typing (a new one every few frames), the trail its ghosts, flickering now and then
  float typing = floor(uTime * 18.0);
  float flick = floor(uTime * (1.0 + 5.0 * uSnare) + hash12(vec2(col, row)) * 9.0);
  float id = head > 0.5 ? floor(hash12(vec2(col, typing + sheet * 11.0)) * 997.0)
                        : floor(hash12(vec2(col * 1.7 + sheet, row * 0.9 + fallId * 0.31 + floor(flick * 0.2) * 0.13)) * 997.0);
  float d = crGlyph((vec2(1.0 - cell.x, cell.y) - vec2(0.22, 0.12)) / vec2(0.56, 0.76), id);
  // the stroke, sharp or soft as the sheet's focus, and its glow
  float stroke = 1.0 - smoothstep(0.14 - blur, 0.3 + blur * 2.0, d);
  float glow = exp(-d * (3.6 - blur * 4.0)) * (0.1 + 0.14 * uEnergy);
  vec3 green = vec3(0.1, 0.95, 0.35);
  vec3 ghost = mix(green, vec3(0.75, 1.0, 0.8), smoothstep(0.85, 1.0, lit));          // just behind the head, pale
  vec3 c = ghost * (stroke + glow) * lit * lit;
  c += vec3(0.85, 1.0, 0.92) * (stroke * 1.1 + glow * 1.5) * head * (0.75 + 0.6 * uKick);
  return c * bright;
}
// the words the rain reveals: the seed, and the project's name, in the crack intros' 5x7 font
uniform vec4 uFont[24];     // the font, two letters a vec4: rows 0-3, rows 4-6
uniform vec4 uWords[6];     // the seed's letters (0-11), then SEEDSCENE's (12-23)
uniform vec4 uWordLen;      // how many letters in each
float crFontBit(float g, float fx, float fy) {
  if (fx < 0.0 || fy < 0.0 || fx >= 5.0 || fy >= 7.0) return 0.0;
  int gi = int(g + 0.5);
  vec4 v = uFont[gi / 2];
  float lo = v.x, hi = v.y;
  if (gi % 2 == 1) { lo = v.z; hi = v.w; }
  float x = floor(fx), y = floor(fy);
  float bits = lo, bit = y * 5.0 + x;
  if (y >= 4.0) { bits = hi; bit = (y - 4.0) * 5.0 + x; }
  return mod(floor(bits / exp2(bit)), 2.0);
}
// how lit a word is at p: its letters' pixels as soft blocks, across the middle of the screen
float crWord(vec2 p, int j) {
  float n = j == 0 ? uWordLen.x : uWordLen.y;
  if (n < 1.0) return 0.0;
  float cols = n * 6.0 - 1.0;
  float cell = min(1.6 / cols, 0.06);                                       // as wide as fits, never too tall
  vec2 q = vec2(p.x / cell + cols * 0.5, 3.5 - p.y / cell);
  float i = floor(q.x / 6.0);
  if (i < 0.0 || i >= n) return 0.0;
  int k = j * 12 + int(i);
  float g = uWords[k / 4][k % 4];
  vec2 f = vec2(q.x - i * 6.0, q.y);
  float on = crFontBit(g, f.x, f.y);
  vec2 c = fract(f) - 0.5;
  return on * (1.0 - smoothstep(0.3, 0.55, max(abs(c.x), abs(c.y)))) * (0.75 + 0.25 * (1.0 - f.y / 7.0));
}
// the face in the rain: x how lit, y the glasses - soft-edged, a light falling on the rain rather than a shape
// laid on it. Drawn in the units of a front view of the look being evoked: x across from the middle of the face,
// y down from the top of the hair (0) to the chin (425); the hairline at 133, the eyes and the top of the lenses
// at 253, the lenses' bottom at 305, the base of the nose at 355, the mouth at 395.
float crHalfWidth(float y) {
  // the face's half-width down from the hairline, eased between its stations: a straight forehead, cheeks almost
  // parallel, a jaw that turns firmly but smoothly to a broad chin
  return 112.0 + 8.0 * smoothstep(133.0, 253.0, y) - 2.0 * smoothstep(253.0, 330.0, y)
       - 16.0 * smoothstep(330.0, 408.0, y) - 33.0 * smoothstep(398.0, 452.0, y) - 22.0 * smoothstep(444.0, 474.0, y);
}
// a stroke along a curve (a quadratic from a through b to c), as a pen draws it: w0 wide at a, w1 at c; < 0 inside
float crStroke(vec2 q, vec2 a, vec2 b, vec2 c, float w0, float w1) {
  float d = 1e9;
  vec2 prev = a;
  for (int i = 1; i <= 8; i++) {
    float t = float(i) / 8.0;
    vec2 pt = mix(mix(a, b, t), mix(b, c, t), t);
    d = min(d, sdSeg(q, prev, pt) - mix(w0, w1, t - 0.0625));
    prev = pt;
  }
  return d;
}
float crInk(float d) { return 1.0 - smoothstep(-1.5, 2.0, d); }
vec2 crFace(vec2 p) {
  vec2 r = vec2(p.x, 0.02 - p.y) * 512.0 + vec2(0.0, 252.0);
  float x = abs(r.x), y = r.y;
  vec2 m = vec2(x, y);                                                       // (mirrored: both sides at once)
  // the hairline: an arch, highest over the middle of the forehead, coming down over the temples to the tops
  // of the ears
  float hairline = 138.0 + 28.0 * smoothstep(30.0, 92.0, x) + 95.0 * smoothstep(92.0, 120.0, x);
  // the hair: wider than the face, full over the top, its upper edge broken into tufts
  float tufts = 46.0 + 14.0 * abs(sin(r.x * 0.045 + 0.6)) + 0.0028 * r.x * r.x;
  float hw = 132.0 - 0.0045 * max(0.0, 150.0 - y) * max(0.0, 150.0 - y);
  float hair = (1.0 - smoothstep(-6.0, 6.0, x - hw)) * smoothstep(tufts - 6.0, tufts + 6.0, y) * (1.0 - smoothstep(hairline - 6.0, hairline + 6.0, y));
  float face = (1.0 - smoothstep(-10.0, 8.0, x - crHalfWidth(y))) * smoothstep(hairline - 4.0, hairline + 8.0, y) * (1.0 - smoothstep(462.0, 482.0, y));
  // the ears: from the eyes down to the base of the nose
  float ears = 1.0 - smoothstep(0.75, 1.1, length(vec2((x - 128.0) / 14.0, (y - 302.0) / 46.0)));
  // the light, from the upper left, and the shade under the cheekbones
  float shade = clamp(0.82 - r.x / 520.0 - (y - 250.0) / 1400.0, 0.45, 1.0);
  shade *= 1.0 - 0.25 * smoothstep(60.0, 112.0, x) * smoothstep(300.0, 360.0, y);
  // the features, drawn as curves with a pen's swell: the brows thick by the nose, arching and thinning out
  // over the lenses; the nose's shaded side and the round of its tip; the folds from the nose to the mouth; the
  // mouth's line with its slight bow and the shadow under the lower lip; the crease above the chin
  float ink = 0.0;
  ink = max(ink, 0.7 * crInk(crStroke(m, vec2(16.0, 251.0), vec2(58.0, 233.0), vec2(112.0, 244.0), 6.5, 2.0)));
  ink = max(ink, 0.45 * crInk(crStroke(r * vec2(1.0, 1.0) + vec2(0.0, 0.0), vec2(9.0, 286.0), vec2(17.0, 318.0), vec2(21.0, 343.0), 1.5, 3.0)));
  ink = max(ink, 0.5 * crInk(crStroke(vec2(r.x, y), vec2(-21.0, 347.0), vec2(0.0, 364.0), vec2(21.0, 347.0), 2.0, 2.0)));
  ink = max(ink, 0.25 * crInk(crStroke(m, vec2(24.0, 354.0), vec2(37.0, 371.0), vec2(39.0, 393.0), 1.4, 0.8)));
  ink = max(ink, 0.6 * crInk(crStroke(m, vec2(0.0, 395.0), vec2(16.0, 390.0), vec2(35.0, 398.0), 2.4, 1.2)));
  ink = max(ink, 0.3 * crInk(crStroke(vec2(r.x, y), vec2(-21.0, 409.0), vec2(0.0, 418.0), vec2(21.0, 409.0), 3.0, 3.0)));
  ink = max(ink, 0.2 * crInk(crStroke(vec2(r.x, y), vec2(-14.0, 440.0), vec2(0.0, 445.0), vec2(14.0, 440.0), 1.5, 1.5)));
  shade *= 1.0 - ink;
  float lit = max(face * shade, max(hair * 0.22, ears * 0.5));
  // the glasses, as the look had them: two lenses from the eyes down, nearly as wide together as the face - wider
  // than tall, their corners rounded but square enough to read as lenses, the top edge flatter than the bottom -
  // a thin wire bridge high between them
  vec2 g = vec2(x - 63.0, y - 279.0);
  float lens = pow(pow(abs(g.x) / 56.0, 3.4) + pow(abs(g.y) / (g.y < 0.0 ? 24.0 : 28.0), 2.8), 1.0 / 3.1);
  float glasses = 1.0 - smoothstep(0.88, 1.06, lens);
  glasses = max(glasses, 0.4 * (1.0 - smoothstep(0.0, 3.0, sdSeg(vec2(r.x, y), vec2(-9.0, 265.0), vec2(9.0, 265.0)))));
  return vec2(lit, glasses * face);
}
vec3 render(vec2 p, vec2 uv) {
  float s = uBarIndex + uBar;
  float flow = crFlowAt(uTime, s);
  // the camera moving forward: six sheets one unit apart, each coming nearer until it passes
  float cam = flow * 0.55;
  vec3 col = vec3(0.0);
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    float d = fi + 1.0 - fract(cam);                                          // its distance, 6 far to 0 passing
    float sheet = fi + floor(cam);
    float fade = smoothstep(0.25, 0.9, d) * (1.0 - smoothstep(4.6, 6.0, d));
    if (fade <= 0.0) continue;
    float blur = clamp(abs(d - 2.4) * 0.08, 0.0, 0.24);
    col += crSheet(p, 15.0 * d, 9.0 + 0.6 * d, fade * 0.9 / (0.5 + 0.22 * d), blur, sheet, flow, s);
  }
  // a phrase opening: something revealed in the rain - in turn a face in dark glasses, the seed, and SEEDSCENE -
  // far off at first, small and soft, coming towards the camera with the rain, glyph by glyph out of the code,
  // and fading and blurring away as it comes too near
  float x = mod(s, 8.0);
  float near = smoothstep(0.0, 5.2, x);                                      // 0 far off, 1 too near
  float size = 0.38 * exp(near * 1.75);                                      // (a steady approach: the size grows by the same ratio a bar)
  float reveal = smoothstep(0.0, 1.2, x) * (1.0 - smoothstep(3.2, 5.2, x));
  if (reveal > 0.0) {
    float which = mod(floor(s / 8.0), 3.0);
    vec2 ps = p / size;
    vec2 face = which < 0.5 ? crFace(ps) : vec2(crWord(ps, which < 1.5 ? 0 : 1), 0.0);
    // soft while far off and again when too near: the shape's light spread out, its contrast lowered
    float soft = 1.0 - smoothstep(0.0, 0.25, near) * (1.0 - smoothstep(0.7, 1.0, near));
    face.x = mix(face.x, face.x * 0.6 + 0.12 * step(0.02, face.x), soft * 0.6);
    // the glasses dark as the hair is, a little darker: the code behind them still seen, never put out
    face.x = mix(face.x, 0.16, face.y);
    // the shape is made of code: a close weave of glyphs that comes nearer with it, changing slowly, lit as the
    // shape is lit
    vec2 fq = vec2(ps.x * 64.0, ps.y * 64.0 * 0.72);
    vec2 fc = fract(fq);
    float fid = floor(hash12(floor(fq) + floor(uTime * 2.5 + hash12(floor(fq)) * 4.0) * 0.37) * 997.0);
    float fd = crGlyph((vec2(1.0 - fc.x, fc.y) - vec2(0.22, 0.12)) / vec2(0.56, 0.76), fid);
    float weave = (1.0 - smoothstep(0.12 - 0.1 * soft, 0.3 + 0.4 * soft, fd)) + exp(-fd * (3.5 - 1.5 * soft)) * 0.25;
    // each glyph appears at its own moment, the brightest parts first, so the shape rises out of the rain
    float own = hash12(floor(fq) * 1.37 + 5.1);
    float there = smoothstep(own * 0.8, own * 0.8 + 0.25, reveal * (0.35 + 1.1 * face.x));
    vec3 faceCol = mix(vec3(0.1, 0.95, 0.35), vec3(0.8, 1.0, 0.85), smoothstep(0.7, 1.0, face.x));
    col *= mix(1.0, 0.35 + 1.1 * face.x, reveal);                              // the rain dims round it, lights on it
    col += faceCol * weave * face.x * face.x * there * 1.5;
    col *= 1.0 - reveal * face.y * 0.2;                                         // the glasses: the code there dimmed, not gone
  }
  col += vec3(0.0, 0.025, 0.012);                                               // the dark green of the screen
  return col;
}
`;

const gimbal = `
// The 64k gimbal: the 64k intros of the turn of the century, whole worlds of glowing generated 3D packed into
// one small file, as the memory of them goes: nested metal rings turning on their own axes round a core, in a
// hall of great curved bands with tiled patterns, a haze, the picture letterboxed - every colour the seed's own.
// A light stands behind the rings: its rays cross the haze towards you, cut into shafts wherever a ring or the
// core stands in their way, and it flares in the lens - a glare, a streak and coloured ghosts - as the
// renderers of the time loved to; the flare dims when a ring crosses the light. Each ring turns a quarter on its own beat in turn, eased; the core pulses with
// the kick; the shafts brighten with the pads; the camera circles slowly, and each phrase opens on a new angle
// eased in over its first bar.
mat3 gbRot(vec3 a) {
  float cx = cos(a.x), sx = sin(a.x), cy = cos(a.y), sy = sin(a.y), cz = cos(a.z), sz = sin(a.z);
  return mat3(cy * cz, cy * sz, -sy, sx * sy * cz - cx * sz, sx * sy * sz + cx * cz, sx * cy, cx * sy * cz + sx * sz, cx * sy * sz - sx * cz, cx * cy);
}
float gbTurn(float i) {
  // the quarter turns of ring i: one on every third beat, eased over the first half of the beat
  float b = uTime / max(uSpb, 0.2) - i;
  float n = floor(b / 3.0);
  return (n + smoothstep(0.0, 0.5, fract(b / 3.0) * 3.0)) * 1.5708;
}
float gbRing(vec3 p, float r, float t) { return length(vec2(length(p.xz) - r, p.y)) - t; }
mat3 gbR0, gbR1, gbR2;   // the rings' turns, worked out once a pixel
// how much of the light reaches x: each ring's plane is crossed at one point on the way to the light, and the
// light is cut if that point lies on the ring; the core cuts it if the way passes within its radius
float gbRingLit(vec3 x, vec3 L, mat3 R, float rad) {
  vec3 n = vec3(0.0, 1.0, 0.0) * R;                  // the ring's axis in the world
  float dn = dot(L, n);
  if (abs(dn) < 1e-3) return 1.0;
  float s = -dot(x, n) / dn;
  if (s < 0.0) return 1.0;
  return smoothstep(0.03, 0.07, abs(length(x + L * s) - rad));
}
float gbLit(vec3 x, vec3 L) {
  float b = -dot(x, L);
  float core = b > 0.0 ? smoothstep(0.26, 0.34, length(x + L * b)) : 1.0;
  return core * gbRingLit(x, L, gbR0, 0.62) * gbRingLit(x, L, gbR1, 0.86) * gbRingLit(x, L, gbR2, 1.1);
}
// the scene: x the distance, y what (0 hall, 1 ring, 2 core)
vec2 gbMap(vec3 p) {
  float core = length(p) - (0.3 + 0.03 * uKick);
  vec2 m = vec2(core, 2.0);
  float d = min(min(gbRing(gbR0 * p, 0.62, 0.035), gbRing(gbR1 * p, 0.86, 0.035)), gbRing(gbR2 * p, 1.1, 0.035));
  if (d < m.x) m = vec2(d, 1.0);
  // the hall: two great bands sweeping round, tilted
  vec3 h1 = p; h1.xy = rot(0.5) * h1.xy;
  vec3 h2 = p; h2.yz = rot(-0.7) * h2.yz;
  float hall = min(length(vec2(length(h1.xz) - 3.4, h1.y)) - 0.45, length(vec2(length(h2.xz) - 3.9, h2.y)) - 0.5);
  if (hall < m.x) m = vec2(hall, 0.0);
  return m;
}
vec3 render(vec2 p, vec2 uv) {
  float a0 = gbTurn(0.0), a1 = gbTurn(1.0), a2 = gbTurn(2.0);
  gbR0 = gbRot(vec3(a0, a0 * 0.2, a0 * 0.25));
  gbR1 = gbRot(vec3(a1 * 0.3, a1, a1 * 0.25));
  gbR2 = gbRot(vec3(a2 * 0.3, a2 * 0.2, a2));
  float phrase = floor(uBarIndex / 8.0);
  float into = smoothstep(0.0, 1.0, mod(uBarIndex, 8.0) + uBar);
  float view = mix(hash11(phrase - 1.0 + uSeed.x * 9.0), hash11(phrase + uSeed.x * 9.0), into) * 6.28;
  // the camera drifts round, nearer and farther, rising and falling, all slowly
  float ang = uTime * 0.12 + 0.3 * sin(uTime * 0.11) + view;
  float dist = 2.6 + 0.35 * sin(uTime * 0.15 + view);
  vec3 ro = vec3(dist * sin(ang), 0.9 * sin(uTime * 0.07 + view), dist * cos(ang));
  vec3 fw = normalize(-ro), rt = normalize(cross(fw, vec3(0.0, 1.0, 0.0))), up = cross(rt, fw);
  vec3 rd = normalize(p.x * rt + p.y * up + 1.4 * fw);
  // the seed's colours: one for the haze and the hall, one for the light; every seed its own hall
  vec3 tint = unblack(pal(0.85)); tint /= max(max(tint.r, tint.g), max(tint.b, 0.3));
  vec3 glowC = unblack(pal(0.15)); glowC /= max(max(glowC.r, glowC.g), max(glowC.b, 0.3));
  // the light: behind the rings as the camera sees them, a little above and to one side
  vec3 L = normalize(-normalize(ro) + 0.45 * up + 0.3 * rt);
  float sh = max(dot(rd, L), 0.0);
  vec2 ra = vec2(atan(dot(rd, cross(L, vec3(0.0, 1.0, 0.0))), dot(rd, vec3(0.0, 1.0, 0.0))), 0.0);
  float shafts = pow(sh, 6.0) * (0.5 + 0.5 * sin(ra.x * 23.0 + uTime * 0.2)) * (0.6 + 0.8 * uPad);
  vec3 haze = mix(tint * 0.14, tint * 0.4, 0.5 + 0.5 * rd.y) + glowC * (pow(sh, 12.0) * 0.6 + shafts * 0.35);
  vec3 col = haze;
  float t = 0.0;
  vec2 h = vec2(1.0);
  for (int i = 0; i < 90; i++) {
    h = gbMap(ro + rd * t);
    if (h.x < 0.001 * t || t > 12.0) break;
    t += h.x;
  }
  if (t < 12.0) {
    vec3 pos = ro + rd * t;
    vec2 e = vec2(0.002, 0.0);
    vec3 n = normalize(vec3(gbMap(pos + e.xyy).x - gbMap(pos - e.xyy).x, gbMap(pos + e.yxy).x - gbMap(pos - e.yxy).x, gbMap(pos + e.yyx).x - gbMap(pos - e.yyx).x));
    float dif = max(dot(n, L), 0.0);
    vec3 r = reflect(rd, n);
    vec3 env = mix(tint * 0.2, mix(tint, glowC, 0.5) * 0.95, 0.5 + 0.5 * r.y);
    if (h.y > 1.5) {
      // the core: a sphere of patterned metal, its pattern in the seed's colours lit by the kick
      vec3 steel = vec3(dot(env, vec3(0.33))) * 0.8;
      float pat = step(0.5, fract(atan(n.z, n.x) * 3.18 + uTime * 0.2)) * step(0.5, fract(n.y * 6.0));
      col = steel * (0.4 + 0.6 * dif) + unblack(pal(0.1)) * pat * (0.15 + 0.9 * uKick);
    } else if (h.y > 0.5) {
      // the rings: polished steel, the hall caught in them
      col = mix(vec3(dot(env, vec3(0.33))), env, 0.35) * (0.5 + 0.5 * dif) + mix(vec3(1.0), glowC, 0.3) * pow(max(dot(r, L), 0.0), 30.0);
    } else {
      // the hall's bands: dark stone with a strip of tiles in two of the seed's colours along them
      vec2 tq = vec2(atan(pos.z, pos.x) * 40.0, pos.y * 30.0);
      float tile = step(0.5, fract(tq.x)) * step(0.5, fract(tq.y)) + step(fract(tq.x), 0.5) * step(fract(tq.y), 0.5);
      // (a narrow strip of small tiles along each band, the rest dark)
      float strip = smoothstep(0.12, 0.09, abs(fract(atan(pos.y, length(pos.xz)) * 2.2) - 0.5));
      vec3 base = mix(tint * 0.09, mix(unblack(pal(0.35)) * 0.6, unblack(pal(0.6)) * 0.8, tile), strip);
      col = base * (0.25 + 0.9 * dif) + env * 0.08;
    }
    col = mix(col, haze, 1.0 - exp(-0.02 * t * t));
  }
  // the shafts: the haze lit along the view ray wherever the light gets through, brighter looking into it
  float vol = 0.0, tv = min(t, 7.0);
  float jit = hash12(gl_FragCoord.xy + fract(uTime) * 61.0);
  for (int i = 0; i < 14; i++) vol += gbLit(ro + rd * (float(i) + jit) / 14.0 * tv, L);
  vol /= 14.0;
  float fwd = pow(max(dot(rd, L), 0.0), 5.0);
  col += glowC * vol * (0.06 + 0.55 * fwd) * (0.7 + 0.6 * uPad + 0.3 * uKick);
  // the lens flare: where the light falls on the screen, dimmed when a ring or the core covers it
  float lf = dot(L, fw);
  if (lf > 0.0) {
    vec2 sp = vec2(dot(L, rt), dot(L, up)) / lf * 1.4;
    float seen = gbLit(ro, L) * smoothstep(0.0, 0.3, lf);
    float k = seen * (0.8 + 0.8 * uKick);
    vec2 d = p - sp;
    col += glowC * k * (0.035 / (dot(d, d) + 0.003) * 0.05 + exp(-abs(d.y) * 90.0) * exp(-abs(d.x) * 1.6) * 0.5);
    // the ghosts, strung along the line through the middle of the picture
    for (int g = 0; g < 4; g++) {
      float fg = float(g);
      vec2 gp = sp * (0.45 - 0.6 * fg);
      float gr = 0.03 + 0.035 * hash11(fg * 3.3 + uSeed.y);
      vec3 gc = unblack(pal(0.2 + 0.23 * fg)); gc /= max(max(gc.r, gc.g), max(gc.b, 0.3));
      col += gc * k * 0.12 * (1.0 - smoothstep(gr * 0.6, gr, length(p - gp)));
    }
    col += glowC * k * 0.06 * (1.0 - smoothstep(0.0, 0.015, abs(length(p + sp * 0.3) - 0.38)));   // the halo ring
  }
  // the letterbox
  col *= step(abs(uv.y - 0.5), 0.41);
  return col;
}
`;

const djdecks = `
// The DJ party: two silver turntables and the mixer between them, seen from above as the clubs and the rhythm
// games of the 2000s showed them, no make, name or logo - and round them now the night they play to, lit as the
// demos of the time lit theirs. The decks as they always were: black records on platters edged with strobe dots, a
// label with a mark you can follow round, the tonearm from its pivot with the needle in the groove, a pitch fader,
// the start button; on the mixer the knobs, two channel faders and the crossfader. The records turn at 33 1/3; one
// deck is live each phrase: its channel fader up, its meter lit by the kick and the bass, the needle working in
// towards the label over the phrase; the crossfader slides across over the first bar as the other deck takes over;
// in the last bar of a phrase the live record is scratched, rocked back and forth on the sixteenths; the target
// lamp flashes on the kick. Round them the club: the booth's dark top with a strip of light along its edge, the
// dancers below seen from above with their hands up, bouncing on the beat, the floor's tiles chasing round under
// them; moving heads throwing coloured beams through drifting smoke, motes of dust in them; a fan of lasers over
// the hands in the second half of each phrase; the mirror ball's spots wandering over everything, more with the
// pads; the strobe on every other beat of the last two bars; each phrase opening with every head turned on the
// camera, flaring in the lens, before the beams fan out. The colours are the seed's, a new set each phrase; the
// camera moves round the decks as it always did.
float djBox(vec2 q, vec2 h, float r) { vec2 d = abs(q) - h + r; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r; }
vec3 djDeck(vec2 q, float side, float live, vec3 col, float aa) {
  float beats = uTime / max(uSpb, 0.2);
  float inBar = mod(uBarIndex, 8.0) + uBar;                   // where in the phrase
  // the plinth: brushed silver
  float plinth = djBox(q, vec2(0.36, 0.37), 0.025);
  if (plinth < 0.0) col = vec3(0.62, 0.62, 0.6) * (0.95 + 0.05 * hash12(floor(q * vec2(40.0, 900.0))));
  col *= 1.0 - 0.5 * (1.0 - smoothstep(0.0, 0.006, abs(plinth)));
  vec2 c = q - vec2(-0.04, -0.02);
  float r = length(c);
  // the record turns at 33 1/3 a minute; scratched in the last bar of the phrase when this deck is live
  float spin = uTime * 3.4907;
  if (live > 0.5 && inBar > 7.0) spin += 0.9 * sin(fract(beats * 4.0) * 3.14159) * (mod(floor(beats * 4.0), 2.0) * 2.0 - 1.0);
  float a = atan(c.y, c.x) + spin;
  // the platter and its strobe dots
  if (r < 0.31) {
    // the platter's rim: four rows of strobe dots, standing almost still at the right speed
    float row = floor((r - 0.29) / 0.005);
    vec2 dq = vec2(fract(a * (180.0 + row * 2.0) / 6.28318) - 0.5, fract((r - 0.29) / 0.005) - 0.5);
    float dot_ = 1.0 - smoothstep(0.22, 0.38, length(dq));
    col = mix(vec3(0.42), vec3(0.85), dot_);
  }
  // the record, its grooves catching the light, and the label with its mark
  if (r < 0.29) {
    col = vec3(0.03) + vec3(0.08) * pow(abs(sin(r * 900.0)), 8.0) * (0.4 + 0.6 * abs(sin(a * 2.0 - 0.6)));
    if (r < 0.09) {
      col = unblack(pal(0.2 + side * 0.3)) * 0.9;
      col = mix(col, vec3(0.95), step(abs(sin(a)), 0.2) * step(0.0, cos(a)) * step(0.03, r));
    }
    if (r < 0.008) col = vec3(0.75);
  }
  // the tonearm: from its pivot at the top right to the needle in the groove, working in over the phrase
  vec2 pivot = vec2(0.27, 0.26);
  float gr = mix(0.27, 0.12, live > 0.5 ? inBar / 8.0 : 0.0);
  vec2 needle = vec2(-0.04, -0.02) + gr * normalize(vec2(0.55, -0.25));
  float arm = sdSeg(q, pivot, needle);
  col = mix(col, vec3(0.8), 1.0 - smoothstep(0.004, 0.009, arm));
  col = mix(col, vec3(0.2), 1.0 - smoothstep(0.012, 0.02, length(q - needle)));
  col = mix(col, vec3(0.7), 1.0 - smoothstep(0.035, 0.042, length(q - pivot)));
  // the pitch fader and the start button
  col = mix(col, vec3(0.25), 1.0 - smoothstep(0.0, 0.004, djBox(q - vec2(0.31, -0.08), vec2(0.008, 0.16), 0.004)));
  col = mix(col, vec3(0.85), 1.0 - smoothstep(0.0, 0.004, djBox(q - vec2(0.31, -0.08 + 0.02 * sin(uTime * 0.1 + side)), vec2(0.022, 0.012), 0.004)));
  col = mix(col, vec3(0.75), 1.0 - smoothstep(0.035, 0.04, length(q - vec2(-0.29, -0.3))));
  // the target lamp, flashing on the kick when the deck is live
  col += vec3(1.0, 0.85, 0.5) * (0.2 + live * uKick * 2.0) * exp(-length(q - vec2(-0.3, 0.3)) * 60.0);
  return col;
}
vec3 djBoard(vec2 p) {
  float aa = 1.5 / uRes.y;
  float phrase = floor(uBarIndex / 8.0);
  float leftLive = mod(phrase + floor(uSeed.x * 2.0), 2.0);   // which deck plays this phrase
  float into = smoothstep(0.0, 1.0, mod(uBarIndex, 8.0) + uBar);
  vec3 col = vec3(0.04, 0.04, 0.05);
  col = djDeck(p - vec2(-0.47, 0.0), 0.0, leftLive, col, aa);
  col = djDeck(p - vec2(0.47, 0.0), 1.0, 1.0 - leftLive, col, aa);
  // the mixer
  vec2 m = p;
  float body = djBox(m, vec2(0.1, 0.34), 0.012);
  if (body < 0.0) {
    col = vec3(0.7, 0.68, 0.64) * (0.95 + 0.05 * hash12(floor(m * vec2(600.0, 30.0))));
    for (int ch = 0; ch < 2; ch++) {
      float x = ch == 0 ? -0.045 : 0.045;
      float live = ch == 0 ? leftLive : 1.0 - leftLive;
      float level = mix(1.0 - live, live, into);
      // three knobs, their marks turned a little with the music
      for (int k = 0; k < 3; k++) {
        vec2 kc = vec2(x, 0.27 - float(k) * 0.055);
        float kr = length(m - kc);
        if (kr < 0.02) col = vec3(0.22);
        float ka = 0.8 * sin(float(k) * 2.1 + float(ch)) + (k == 2 ? 0.5 * uBass * live : 0.0);
        col = mix(col, vec3(0.95), (1.0 - smoothstep(0.002, 0.004, sdSeg(m, kc, kc + 0.017 * vec2(sin(ka), cos(ka))))) * step(kr, 0.02));
      }
      // the meter: a column of lights, lit by the kick and the bass on the live channel
      float meter = live * level * clamp(0.35 + 0.5 * uKick + 0.4 * uBass, 0.0, 1.0);
      for (int s = 0; s < 8; s++) {
        float fs = float(s);
        vec2 sc = vec2(x + (ch == 0 ? 0.03 : -0.03), 0.02 + fs * 0.018);
        float on = step(fs / 8.0, meter - 0.02);
        vec3 led = fs > 6.0 ? vec3(1.0, 0.2, 0.15) : fs > 4.0 ? vec3(1.0, 0.8, 0.2) : vec3(0.3, 1.0, 0.35);
        col = mix(col, led * (0.15 + 0.85 * on), 1.0 - smoothstep(0.0, 0.003, djBox(m - sc, vec2(0.006, 0.005), 0.002)));
      }
      // the channel fader: up on the live deck, coming up over the phrase's first bar
      col = mix(col, vec3(0.2), 1.0 - smoothstep(0.0, 0.003, djBox(m - vec2(x, -0.1), vec2(0.004, 0.09), 0.002)));
      col = mix(col, vec3(0.9), 1.0 - smoothstep(0.0, 0.003, djBox(m - vec2(x, -0.19 + 0.18 * level), vec2(0.018, 0.012), 0.003)));
    }
    // the crossfader, sliding over to the live deck through the first bar
    float cf = mix(1.0, -1.0, leftLive);
    cf = mix(-cf, cf, into) * 0.06;
    col = mix(col, vec3(0.2), 1.0 - smoothstep(0.0, 0.003, djBox(m - vec2(0.0, -0.29), vec2(0.075, 0.004), 0.002)));
    col = mix(col, vec3(0.9), 1.0 - smoothstep(0.0, 0.003, djBox(m - vec2(cf, -0.29), vec2(0.012, 0.018), 0.003)));
  }
  col *= 1.0 - 0.5 * (1.0 - smoothstep(0.0, 0.005, abs(body)));
  return col;
}
// ---- the club round the decks ----------------------------------------------------------------------------------
// In the decks' own space: the booth's top is the plane z = 0 (the decks and the mixer on it, seen from above as
// they always were), the dancers' hands reach up to z = -0.22, their heads and shoulders are at z = -0.5, the
// floor's lit tiles at z = -1.7; the mirror ball hangs high above the camera.
vec3 djHs[6], djHd[6], djHc[6];          // the moving heads: where each stands, where it points, its colour
float djHash(float n) { return hash11(n * 7.31 + uSeed.w * 13.0); }   // (the stage's own: the camera moves as it did)
// the heads for this moment: four on the floor round the booth throwing their beams up through the smoke, two on
// a truss above throwing theirs down across the decks; each phrase opens with every one of them turned on the
// camera, flaring, before they fan out and sweep again; the colours are the seed's, a new set each phrase
void djRig(float s, vec3 ro) {
  float x = mod(s, 8.0), ph = floor(s / 8.0);
  float e = smoothstep(0.0, 1.0, x);
  float open = smoothstep(7.5, 8.0, x) + 1.0 - smoothstep(0.0, 1.5, x);
  float t = uTime * 0.5;
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    vec3 src, dir;
    if (i < 4) {
      float a = 0.785 + 1.5708 * fi;
      src = vec3(1.45 * cos(a), 0.95 * sin(a), -1.7);
      float az = a + 3.14159 + 0.9 * sin(t + fi * 1.7);
      float tl = 0.75 + 0.3 * sin(t * 0.8 + fi * 2.3);                             // (leaning well over: shafts across the room)
      dir = vec3(sin(tl) * cos(az), sin(tl) * sin(az), cos(tl));
    } else {
      float sd = fi < 4.5 ? -1.0 : 1.0;
      src = vec3(1.5 * sd, 0.0, 1.1);
      dir = normalize(vec3(-sd * (0.75 + 0.35 * sin(t * 0.9 + fi)), 0.55 * sin(t * 0.6 + fi * 2.0), -1.0));
    }
    djHs[i] = src;
    float ra = fi * 1.047 + uSeed.y * 6.0;                                        // (each past the camera, close by)
    djHd[i] = normalize(mix(dir, normalize(ro + 0.45 * vec3(cos(ra), sin(ra), 0.0) - src), open));
    vec3 c = mix(unblack(pal(0.17 * fi + 0.31 * (ph - 1.0))), unblack(pal(0.17 * fi + 0.31 * ph)), e);
    djHc[i] = c / max(max(c.r, c.g), max(c.b, 0.2));
  }
}
// a cone of light in the smoke: what the view ray gathers crossing it before tMax - from the nearest the ray comes
// to the cone's axis, the cone's width there and how long the ray stays in it (never thinner than a pixel there)
float djCone(vec3 ro, vec3 rd, float tMax, vec3 src, vec3 dir, float w0, float spread) {
  vec3 w = ro - src;
  float b = dot(rd, dir);
  float den = max(1.0 - b * b, 1e-4);
  float t = clamp((b * dot(dir, w) - dot(rd, w)) / den, 0.0, tMax);
  vec3 pt = w + rd * t;
  float u = dot(pt, dir);
  if (u <= 0.0) return 0.0;
  float r = length(pt - dir * u);
  float wd = max(w0 + spread * u, t * 0.0025);
  return exp(-r * r / (wd * wd)) / (wd * max(sqrt(den), 0.3)) * exp(-u * 0.12);
}
// the beams' light where they fall on a surface facing up
vec3 djWash(vec3 P) {
  vec3 c = vec3(0.0);
  for (int i = 0; i < 6; i++) {
    vec3 v = P - djHs[i];
    float u = dot(v, djHd[i]);
    if (u <= 0.0) continue;
    float r = length(v - djHd[i] * u);
    float wd = 0.03 + 0.09 * u;
    c += djHc[i] * exp(-r * r / (wd * wd)) * max(-djHd[i].z, 0.0) / (1.0 + 0.3 * u * u);
  }
  return c;
}
// the mirror ball's spots where they fall at P: a facet's light here and there, the ball turning slowly
float djSpots(vec3 P) {
  vec3 v = normalize(P - vec3(0.0, 0.0, 3.2));
  vec2 g = vec2((atan(v.y, v.x) + uTime * 0.25) * 4.7746, acos(clamp(-v.z, -1.0, 1.0)) * 9.0);
  vec2 id = floor(g), f = fract(g) - 0.5;
  return step(0.62, hash12(id + 3.7)) * (1.0 - smoothstep(0.1, 0.3, length(f)));
}
// the dancers round the booth, seen from above, on a loose grid: the head or the shoulders (layer 0, z = -0.5), or
// the raised hands (layer 1, z = -0.22) - how far outside them q is; each facing the booth, none under it
float djCrowd(vec2 q, float layer, float beats) {
  vec2 g = q / 0.44;
  vec2 c0 = floor(g);
  float d = 1e3;
  for (int k = 0; k < 4; k++) {
    vec2 id = c0 + vec2(float(k % 2), float(k / 2));
    vec2 h = hash22(id + 17.0);
    vec2 at = (id + 0.25 + 0.5 * h) * 0.44;
    if (abs(at.x) < 1.15 && abs(at.y) < 0.68) continue;
    if (h.x > 0.88) continue;                                                   // (a gap in the crowd)
    float off = h.y * 2.0;
    vec2 sw = 0.025 * vec2(sin(3.14159 * (beats * 0.5 + off)), cos(3.14159 * (beats * 0.5 + off * 1.3)));
    vec2 n = normalize(at), v = rot(0.5 * (h.x - 0.5)) * (q - at - sw);
    vec2 l = vec2(dot(v, vec2(-n.y, n.x)), -dot(v, n));                       // (facing the booth)
    if (layer < 0.5) {
      float bob = 0.006 * abs(sin(3.14159 * (beats + off * 0.2)));            // (nearer the camera on the upbeat)
      d = min(d, length(l) - 0.075 - bob);                                      // the head
      d = min(d, length(l / vec2(1.0, 0.55) + vec2(0.0, 0.05)) * 0.55 - 0.115); // the shoulders
    } else if (h.y > 0.45) {
      float pump = sin(3.14159 * (beats + off));
      vec2 m = vec2(abs(l.x), l.y);
      vec2 hand = vec2(0.2 + 0.03 * pump, 0.05 + 0.05 * pump);
      d = min(d, min(length(m - hand) - 0.035, sdSeg(m, vec2(0.14, 0.0), hand) - 0.022));
    }
  }
  return d;
}
vec3 render(vec2 p, vec2 uv) {
  // the camera, as on the stage - a little farther back, to take in the club: a new angle each phrase, a punch in
  // on the kick, a lean on the snare
  float sec = (uBarIndex + uBar) / 8.0;
  float s0 = floor(sec);
  float e = smoothstep(0.0, 0.125, fract(sec));
  float yaw = mix((djHash(s0 - 1.0) - 0.5) * 2.0, (djHash(s0) - 0.5) * 2.0, e) * 0.4 + 0.07 * sin(uTime * 0.37);
  float tilt = mix(mix(-0.35, 1.0, djHash(s0 + 30.0)), mix(-0.35, 1.0, djHash(s0 + 31.0)), e) * 0.5
             + 0.04 * sin(uTime * 0.23);
  float dist = 2.0 - 0.16 * uKick - 0.05 * uBass + 0.07 * sin(uTime * 0.19);
  float roll = 0.05 * sin(uTime * 0.29) + 0.035 * uSnare * (mod(uBarIndex, 2.0) * 2.0 - 1.0);
  vec3 ro = dist * vec3(sin(yaw) * cos(tilt), -sin(tilt), cos(yaw) * cos(tilt));
  vec3 fw = normalize(-ro);
  vec3 rt = normalize(cross(fw, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(rt, fw);
  vec2 q = rot(roll) * p;
  vec3 rd = normalize(fw * 1.55 + rt * q.x + up * q.y);
  float px = 1.5 / (1.55 * uRes.y);                                              // a pixel's width a unit away

  float s = uBarIndex + uBar;
  float x = mod(s, 8.0);
  float beats = uTime / max(uSpb, 0.2);
  djRig(s, ro);
  float pump = 0.6 + 0.7 * uKick;
  float ball = 0.25 + 0.9 * uPad;                                                // the mirror ball, up with the pads
  // the strobe: the last two bars of a phrase, on every other beat, when the music is busy (never faster)
  float strobe = step(6.0, x) * step(mod(floor(beats), 2.0), 0.5) * exp(-fract(beats) * 9.0) * smoothstep(0.3, 0.6, uEnergy);

  // the booth: a dark top round the decks, a strip of light along its edge; the decks and the mixer on it
  float tB = -ro.z / rd.z;
  vec3 P = ro + rd * tB;
  float booth = djBox(P.xy, vec2(1.0, 0.48), 0.06);
  float a = smoothstep(px * tB, -px * tB, booth);
  vec3 bc = vec3(0.0);
  if (a > 0.0) {
    vec3 edgeC = unblack(pal(0.5 + 0.1 * sin(uTime * 0.2)));
    edgeC /= max(max(edgeC.r, edgeC.g), max(edgeC.b, 0.3));
    bc = vec3(0.03, 0.03, 0.035) + edgeC * (1.0 - smoothstep(0.0, 0.007, abs(booth + 0.014))) * (0.6 + 0.9 * uKick);
    float device = min(min(djBox(P.xy - vec2(-0.47, 0.0), vec2(0.36, 0.37), 0.025), djBox(P.xy - vec2(0.47, 0.0), vec2(0.36, 0.37), 0.025)),
                       djBox(P.xy, vec2(0.1, 0.34), 0.012));
    float dm = smoothstep(px * tB, -px * tB, device);
    if (dm > 0.0) {
      vec3 g = djBoard(P.xy);
      // a sheen sweeps the decks once a bar, as it always did
      float sweep = fract(uBar) * 3.0 - 1.5;
      g += vec3(0.6, 0.7, 1.0) * exp(-abs(P.x * 0.6 + P.y - sweep) * 16.0) * 0.05 * (0.4 + uPad);
      bc = mix(bc, g, dm);
    }
    // the club's light on it: the beams from above, the mirror ball's spots, the strobe
    bc *= 0.8 + djWash(P) * 1.4 + vec3(0.7, 0.7, 0.8) * djSpots(P) * ball * 0.5 + strobe * 0.5;
  }
  vec3 col = vec3(0.0);
  float tMax = tB;
  if (a < 1.0) {
    // the floor: tiles lit in the seed's colours, a chase stepping round on the beat
    float t = (-1.7 - ro.z) / rd.z;
    P = ro + rd * t;
    vec2 tile = floor(P.xy / 0.36);
    vec2 tf = abs(fract(P.xy / 0.36) - 0.5);
    float chase = step(0.5, fract(hash12(tile) * 0.5 + (tile.x + tile.y) * 0.125 - floor(beats) * 0.25));
    col = unblack(pal(0.6 + 0.25 * hash12(tile + 5.0))) * (0.03 + 0.1 * chase) * (1.0 - smoothstep(0.38, 0.46, max(tf.x, tf.y)));
    col += djWash(P) * 0.5 + vec3(0.6, 0.6, 0.7) * djSpots(P) * ball * 0.25;
    tMax = t;
    // the dancers over it: heads and shoulders, then the hands raised nearer - dark against the floor, lit from above
    for (int l = 0; l < 2; l++) {
      float tl = ((l == 0 ? -0.5 : -0.22) - ro.z) / rd.z;
      vec3 Q = ro + rd * tl;
      float d = djCrowd(Q.xy, float(l), beats);
      float al = smoothstep(px * tl, -px * tl, d);
      if (al > 0.0) {
        vec3 dc = vec3(0.02, 0.018, 0.024) + vec3(0.035) * smoothstep(0.0, -0.06, d) + djWash(Q) * 0.3 + vec3(0.5, 0.5, 0.6) * djSpots(Q) * ball * 0.15;
        dc += vec3(0.8, 0.85, 1.0) * strobe * 0.15;
        col = mix(col, dc, al);
        tMax = mix(tMax, tl, al);
      }
    }
  }
  col = mix(col, bc, a);
  tMax = mix(tMax, tB, a);

  // the smoke: a drifting layer over the dancers and a thin one over the decks, the beams showing in it
  vec2 s1 = (ro + rd * ((-0.8 - ro.z) / rd.z)).xy, s2 = (ro + rd * ((0.35 - ro.z) / rd.z)).xy;
  float wisp = fbm(s2 * 1.6 - vec2(uTime * 0.05, uTime * 0.03));
  float smoke = 0.25 + 1.1 * smoothstep(0.3, 0.75, fbm(s1 * 1.1 + vec2(uTime * 0.06, -uTime * 0.04)))
                     * (tMax > (-0.8 - ro.z) / rd.z ? 1.0 : 0.3)
              + 0.35 * smoothstep(0.45, 0.8, wisp);
  wisp = smoothstep(0.5, 0.85, wisp);
  vec3 air = vec3(0.0), avgC = vec3(0.0);
  for (int i = 0; i < 6; i++) {
    air += djHc[i] * djCone(ro, rd, tMax, djHs[i], djHd[i], 0.025, 0.05);
    avgC += djHc[i] / 6.0;
  }
  air *= 0.06 * pump * smoke;
  // the lasers: a fan swept across the room just over the dancers' hands, in for the second half of the phrase
  float lz = smoothstep(3.75, 4.25, x) * (1.0 - smoothstep(7.6, 8.0, x));
  if (lz > 0.0) {
    vec3 lc = unblack(pal(0.55 + 0.4 * uSeed.z));
    lc = pow(lc / max(max(lc.r, lc.g), max(lc.b, 0.2)), vec3(2.0));
    vec3 ls = vec3(-1.9, -0.6, -0.12);
    float lsw = 0.35 * sin(uTime * 0.45);
    for (int k = 0; k < 7; k++) {
      float ak = (float(k) - 3.0) * 0.1 * (1.0 + 0.6 * sin(uTime * 0.7)) + lsw + 0.25;
      vec3 ld = normalize(vec3(cos(ak), sin(ak), 0.02 * sin(uTime * 1.3 + float(k))));
      air += lc * djCone(ro, rd, tMax, ls, ld, 0.003, 0.0006) * 0.006 * lz * (0.6 + 0.4 * smoke);
    }
  }
  col += air;
  col += avgC * smoke * 0.025 + (avgC * 0.06 + 0.015) * wisp + vec3(0.85, 0.9, 1.0) * strobe * (0.06 + 0.1 * smoke);   // the smoke lit by the room
  // motes of dust drifting in the beams
  vec2 mg = p * 140.0 + vec2(uTime * 2.0, uTime * 1.3);
  float mote = step(0.985, hash12(floor(mg))) * (1.0 - smoothstep(0.1, 0.4, length(fract(mg) - 0.5)));
  col += air * mote * 3.0 * smoothstep(0.1, 0.35, dot(air, vec3(0.333)));

  // the heads' lenses glowing where they are seen, and flaring when one turns on the camera: a glare, a streak
  // across and the coloured ghosts along the line through the middle, as the renderers of the time drew them
  for (int i = 0; i < 6; i++) {
    vec3 v = djHs[i] - ro;
    float zc = dot(v, fw);
    if (zc <= 0.0) continue;
    vec2 sp = rot(-roll) * (1.55 * vec2(dot(v, rt), dot(v, up)) / zc);
    vec3 cross0 = ro + v * (-ro.z / v.z);                                       // (hidden under the booth?)
    if (v.z < 0.0 && ro.z > 0.0 && djHs[i].z < 0.0 && djBox(cross0.xy, vec2(1.0, 0.48), 0.06) < 0.0) continue;
    float face = pow(max(dot(djHd[i], -normalize(v)), 0.0), 30.0) * pump * (1.0 - smoothstep(0.8, 1.3, length(sp)));
    vec2 dp = p - sp;
    vec3 fc = mix(djHc[i], vec3(1.0), 0.5);
    col += djHc[i] * 0.4 * (0.05 + face) * exp(-length(dp) * 45.0);
    col += fc * face * (0.22 * exp(-length(dp) * 7.0) + 0.2 * exp(-abs(dp.y) * 140.0) * exp(-abs(dp.x) * 2.5));
    for (int g = 0; g < 3; g++) {
      float fg = float(g);
      vec2 gp = sp * (0.4 - 0.65 * fg);
      float gr = 0.025 + 0.03 * hash11(fg * 3.3 + uSeed.y);
      col += djHc[i] * face * 0.045 * (1.0 - smoothstep(gr * 0.3, gr, length(p - gp)));
    }
  }
  return col;
}
`;

// ---------------------------------------------------------------------------
// Arcade scenes: homages to the cabinets — none of them a copy. Shapes are
// generated from the seed, everything moves on the beat, and every frame is
// computed from time alone.
// ---------------------------------------------------------------------------

const paddles = `
// Paddles: the first video game, remembered in neon, played as a simulation
// (src/core/sims.js). The ball crosses the court once a beat, so every return
// lands on the music and throws sparks. On an accent - the crash that opens a
// phrase, the drop - the paddle it is heading for gets there too late and is
// blown apart on that very note; the other side scores, and the winner serves
// on the next bar.
uniform vec4 uBall;      // x, y, which way it flies, in play
uniform vec4 uPaddles;   // left y, right y, left there, right there (0: blown apart)
uniform vec4 uHit;       // the last return: x, y, seconds since, side
uniform vec4 uMiss;      // the last point lost: paddle x, y, seconds since, side
uniform vec4 uScore;     // left, right
float paddleBox(vec2 p, vec2 c) {
  vec2 d = abs(p - c) - vec2(0.012, 0.075);
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}
float twoDigits(vec2 q, float n) {
  float v = digit7(q - vec2(1.25, 0.0), int(mod(n, 10.0)));
  if (n >= 10.0) v = max(v, digit7(q, int(mod(floor(n / 10.0), 10.0))));
  return v;
}
vec3 render(vec2 p, vec2 uv) {
  vec3 cyan = vec3(0.2, 0.9, 1.0), pink = vec3(1.0, 0.25, 0.8);
  vec3 col = vec3(0.01, 0.01, 0.035);
  vec2 g = abs(fract(p * 8.0) - 0.5);
  col += vec3(0.05, 0.08, 0.2) * (1.0 - smoothstep(0.0, 0.04, min(g.x, g.y))) * 0.6;
  if (abs(p.x) < 0.006 && fract(p.y * 14.0) < 0.5) col += vec3(0.5, 0.6, 0.9) * 0.55;
  if (abs(abs(p.y) - 0.42) < 0.004) col += vec3(0.5, 0.6, 0.9) * 0.5;

  // the paddles; a blown-apart one fades back in for the serve
  for (int s = 0; s < 2; s++) {
    float side = float(s) * 2.0 - 1.0;
    float there = s == 0 ? uPaddles.z : uPaddles.w;
    if (there < 0.01) continue;
    float box = paddleBox(p, vec2(side * 0.84, s == 0 ? uPaddles.x : uPaddles.y));
    vec3 c = s == 0 ? cyan : pink;
    col += c * (1.0 - smoothstep(0.0, 0.004, box)) * 1.3 * there;
    col += c * exp(-max(box, 0.0) * 35.0) * 0.5 * there;
  }

  // the ball, streaking the way it flies
  if (uBall.w > 0.5) {
    for (int k = 0; k < 10; k++) {
      float fk = float(k);
      vec2 pk = uBall.xy - vec2(uBall.z * fk * 0.012, 0.0);
      float r = 0.022 * (1.0 - fk / 10.0);
      col += vec3(1.0, 0.9, 0.6) * (1.0 - smoothstep(r * 0.5, r, length(p - pk))) * (1.0 - fk / 10.0) * (k == 0 ? 1.6 : 0.35);
    }
    col += vec3(1.0, 0.85, 0.5) * exp(-length(p - uBall.xy) * 25.0) * 0.6;
  }

  // sparks off the last return
  float age = uHit.z;
  vec3 sc = uHit.w < 0.0 ? cyan : pink;
  for (int i = 0; i < 16; i++) {
    float fi = float(i);
    float a = (fi / 16.0 - 0.5) * 2.4 + (uHit.w < 0.0 ? 0.0 : PI);
    vec2 sp = uHit.xy + vec2(cos(a), sin(a)) * age * (0.6 + 0.4 * hash11(fi + uHit.y * 31.0));
    col += sc * (1.0 - smoothstep(0.0, 0.008, length(p - sp))) * exp(-age * 5.0) * 1.5;
  }

  // a point lost: the paddle bursts on the accent - a flash, a ring, shards, the court lit up
  float t = uMiss.z;
  if (t < 2.0) {
    vec3 mc = uMiss.w < 0.0 ? cyan : pink;
    vec2 c = uMiss.xy;
    float r = length(p - c);
    col += vec3(1.0, 0.95, 0.85) * exp(-r * 18.0) * exp(-t * 6.0) * 3.0;
    col += mc * exp(-abs(r - t * 0.9) * 60.0) * exp(-t * 2.5) * 1.6;
    col += mc * exp(-abs(r - t * 0.5) * 90.0) * exp(-t * 3.0);
    for (int i = 0; i < 12; i++) {
      float fi = float(i);
      float a = fi * 0.5236 + hash11(fi + c.y * 17.0) * 0.4;
      vec2 v = vec2(cos(a) * (0.4 + 0.6 * step(0.0, -uMiss.w * cos(a))), sin(a)) * (0.5 + 0.7 * hash11(fi * 3.7));
      vec2 sp = c + v * t - vec2(0.0, 0.25 * t * t);
      vec2 d = abs(rot(t * 8.0 * (hash11(fi) - 0.5)) * (p - sp)) - vec2(0.008, 0.02);
      float shard = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
      col += mc * (1.0 - smoothstep(0.0, 0.004, shard)) * max(0.0, 1.0 - t * 0.6) * 1.5;
    }
    col += mc * 0.12 * exp(-t * 4.0);
  }

  col += cyan * twoDigits((p - vec2(-0.26, 0.12)) / 0.05, uScore.x) * 0.7;
  col += pink * twoDigits((p - vec2(0.13, 0.12)) / 0.05, uScore.y) * 0.7;
  return col + uKick * 0.03;
}
`;

const invaders = `
// Invaders: played as a simulation (src/core/sims.js). The formation steps
// on every beat and drops a row at the edges; the cannon slides under an
// alien and fires so its shot arrives on a beat, and the alien bursts on the
// kick. Before an accent a saucer crosses the top, and the cannon brings it
// down on the crash itself. The creatures are drawn new from every seed.
uniform float uAliens[5];   // a row each, one bit per alien still standing
uniform vec4 uForm;         // formation x, y (top left), frame, since its last step
uniform vec4 uCannon;       // x, since it fired, score
uniform vec4 uShot;         // x, y, in flight
uniform vec4 uSaucer;       // x, crossing
uniform vec4 uBombs[3];     // x, y, falling
uniform vec4 uBooms[6];     // x, y, since, kind (0 an alien, +row/10; 1 the saucer; 2 the cannon)
float creature(vec2 c, float row, float frame) {
  vec2 ip = floor(c);
  if (ip.x < 0.0 || ip.x > 7.0 || ip.y < 0.0 || ip.y > 5.0) return 0.0;
  float mx = ip.x < 4.0 ? ip.x : 7.0 - ip.x;          // mirrored
  float h = hash12(vec2(mx, ip.y) + row * 17.31 + uSeed.x * 91.7);
  float on = step(0.48, h);
  if (ip.y == 3.0 && mx == 2.0) on = 0.0;               // eyes
  if (mx == 3.0 && ip.y > 0.5 && ip.y < 4.5) on = 1.0;  // a solid body
  if (ip.y < 1.0) on = step(0.5, fract(h * 7.0 + frame * 0.5));   // legs swap each step
  return on;
}
float standing(int row, float col) { return mod(floor(uAliens[row] / exp2(col)), 2.0); }
vec3 rowColour(float row) { return row < 1.0 ? vec3(1.0, 0.3, 0.45) : row < 3.0 ? vec3(0.9, 0.95, 1.0) : vec3(0.3, 1.0, 0.5); }
vec3 render(vec2 p, vec2 uv) {
  vec3 col = vec3(0.0, 0.0, 0.025);
  vec2 sg = floor(p * 50.0);
  if (hash12(sg) > 0.99) col += vec3(0.35) * hash12(sg + 1.0);

  // the formation; it jolts a little on each step
  vec2 cell = vec2(0.105, 0.075);
  vec2 q = (p - uForm.xy - vec2(0.0, 0.006 * exp(-uForm.w * 18.0))) / cell;
  vec2 id = vec2(floor(q.x), floor(-q.y));
  if (id.x >= 0.0 && id.x < 9.0 && id.y >= 0.0 && id.y < 5.0 && standing(int(id.y), id.x) > 0.5) {
    vec2 f = vec2(fract(q.x), fract(-q.y));
    vec2 sp = vec2(f.x * 10.0 - 1.0, (1.0 - f.y) * 8.0 - 1.0);
    col += rowColour(id.y) * creature(sp, id.y, uForm.z) * (1.0 + 0.6 * uKick);
  }

  // the saucer
  if (uSaucer.y > 0.5) {
    vec2 ud = (p - vec2(uSaucer.x, 0.43)) / vec2(0.05, 0.016);
    if (abs(ud.x) < 1.0 && abs(ud.y) < 1.0)
      col += vec3(1.0, 0.2, 0.3) * step(abs(ud.y) * 1.6, 1.0 - abs(ud.x) * 0.6) * (0.7 + 0.3 * sin(uTime * 30.0));
  }

  // bursts: an alien flies apart in its own pixels; the saucer goes up in a ring of fire
  for (int i = 0; i < 6; i++) {
    vec4 b = uBooms[i];
    float t = b.z;
    if (t > 0.9) continue;
    float kind = floor(b.w + 0.01);
    vec2 d = p - b.xy;
    if (kind < 0.5) {
      vec3 c = rowColour(fract(b.w) * 10.0);
      col += vec3(1.0, 0.95, 0.8) * exp(-length(d) * 40.0) * exp(-t * 10.0) * 2.5;
      for (int k = 0; k < 10; k++) {
        float fk = float(k);
        vec2 v = (hash22(vec2(fk, b.x * 13.0 + b.y * 7.0)) - 0.5) * vec2(0.5, 0.4);
        vec2 pk = b.xy + v * t * 1.6 - vec2(0.0, 0.3 * t * t);
        vec2 e = abs(p - pk) - vec2(0.006);
        col += c * step(max(e.x, e.y), 0.0) * max(0.0, 1.0 - t * 1.4) * 1.6;
      }
    } else {
      float r = length(d * vec2(1.0, 1.4));
      vec3 c = kind < 1.5 ? vec3(1.0, 0.35, 0.3) : vec3(0.3, 1.0, 0.5);
      col += vec3(1.0, 0.95, 0.85) * exp(-r * 14.0) * exp(-t * 5.0) * 3.0;
      col += c * exp(-abs(r - t * 0.45) * 50.0) * max(0.0, 1.0 - t * 1.2) * 2.0;
      col += c * 0.1 * exp(-t * 5.0);
    }
  }

  // bombs zig-zagging down
  for (int i = 0; i < 3; i++) {
    vec4 bb = uBombs[i];
    if (bb.z < 0.5) continue;
    vec2 d = p - bb.xy;
    float zig = abs(d.x - 0.006 * sin(d.y * 300.0 + uTime * 20.0));
    col += vec3(1.0, 0.9, 0.5) * step(zig, 0.003) * step(abs(d.y), 0.018) * 1.3;
  }

  // the cannon, a flash at its muzzle as it fires, and the shot on its way
  vec2 cd = p - vec2(uCannon.x, -0.33);
  float cannon = step(abs(cd.x), 0.04) * step(abs(cd.y), 0.012) + step(abs(cd.x), 0.008) * step(abs(cd.y - 0.02), 0.012);
  col += vec3(0.3, 1.0, 0.5) * min(cannon, 1.0);
  col += vec3(0.8, 1.0, 0.8) * exp(-length(cd - vec2(0.0, 0.035)) * 50.0) * exp(-uCannon.y * 25.0) * 1.5;
  if (uShot.z > 0.5) {
    col += vec3(1.0) * step(abs(p.x - uShot.x), 0.004) * step(abs(p.y - uShot.y), 0.022) * 1.5;
    col += vec3(0.6, 1.0, 0.7) * exp(-length((p - uShot.xy) * vec2(1.0, 0.3)) * 60.0) * 0.4;
  }
  if (abs(p.y + 0.355) < 0.003) col += vec3(0.3, 1.0, 0.5) * 0.7;

  // the score, top left
  for (int k = 0; k < 5; k++) {
    int dg = int(mod(floor(uCannon.z / pow(10.0, float(4 - k))), 10.0));
    col += vec3(0.9, 0.95, 1.0) * digit7((p - vec2(-0.84 + float(k) * 0.045, 0.37)) / 0.04, dg) * 0.6;
  }
  return col;
}
`;

const rocks = `
// Rocks: vector boulders and a ship, in glowing lines as a vector monitor drew
// them. The game runs as a simulation (src/core/sims.js): the ship flies
// round the field, dodges, leads its target and fires on the eighths; a big
// rock hit breaks in two, a small one bursts; a cleared field brings a bigger
// wave, and a rock that gets through takes the ship apart.
uniform vec4 uRocks[24];   // x, y, radius (0: none), shape
uniform vec4 uShots[8];    // x, y, direction (x = 9: none)
uniform vec4 uBooms[8];    // x, y, seconds since, size (4: the ship)
uniform vec4 uShip;        // x, y, heading, alive
uniform vec4 uRockFx;      // thrusting, since the ship blew up, score, shielded
float rockDist(vec2 p, vec2 c, float rad, float spin, float id) {
  float d = 1e9;
  vec2 prev = vec2(0.0);
  for (int k = 0; k <= 9; k++) {
    float fk = float(k);
    float a = fk / 9.0 * 6.28318 + spin;
    float r = rad * (0.72 + 0.4 * hash11(id * 13.7 + mod(fk, 9.0)));
    vec2 v = c + vec2(cos(a), sin(a)) * r;
    if (k > 0) d = min(d, sdSeg(p, prev, v));
    prev = v;
  }
  return d;
}
// the ship's outline: nose, two wings, the notch at the back
float shipDist(vec2 p, vec2 at, float a) {
  vec2 n = vec2(cos(a), sin(a)), sd = vec2(-n.y, n.x);
  vec2 nose = at + n * 0.052, l = at - n * 0.032 + sd * 0.031, r = at - n * 0.032 - sd * 0.031, notch = at - n * 0.018;
  return min(min(sdSeg(p, nose, l), sdSeg(p, nose, r)), min(sdSeg(p, l, notch), sdSeg(p, r, notch)));
}
vec3 render(vec2 p, vec2 uv) {
  vec3 ink = vec3(0.75, 0.9, 1.0);
  vec3 col = vec3(0.0, 0.0, 0.02);
  float d = 1e9;
  for (int i = 0; i < 24; i++) {
    vec4 r = uRocks[i];
    if (r.z <= 0.0 || length(p - r.xy) > r.z * 1.25 + 0.05) continue;
    float spin = uTime * (hash11(r.w * 3.7) - 0.5) * 1.6 + r.w;
    d = min(d, rockDist(p, r.xy, r.z, spin, r.w));
  }
  // the ship, blinking while it is shielded after coming back
  vec2 at = uShip.xy;
  float a = uShip.z;
  vec2 n = vec2(cos(a), sin(a));
  if (uShip.w > 0.5 && (uRockFx.w < 0.5 || fract(uTime * 6.0) < 0.6)) {
    d = min(d, shipDist(p, at, a));
    // the flame, flickering with the bass
    if (uRockFx.x > 0.5 && fract(uTime * 20.0) < 0.7) d = min(d, sdSeg(p, at - n * 0.022, at - n * (0.058 + 0.025 * uBass)));
  } else if (uShip.w < 0.5) {
    // blown apart: four lines tumbling away from where it was
    float t = uRockFx.y;
    if (t < 1.6) {
      vec2 sd = vec2(-n.y, n.x);
      vec2 P[4] = vec2[4](n * 0.052, -n * 0.032 + sd * 0.031, -n * 0.032 - sd * 0.031, -n * 0.018);
      for (int k = 0; k < 4; k++) {
        vec2 A = P[k], B = P[(k + 1) - 4 * ((k + 1) / 4)];
        vec2 mid = (A + B) * 0.5;
        vec2 fly = normalize(mid + 1e-4) * t * 0.09 + (hash22(vec2(float(k), 2.0)) - 0.5) * t * 0.05;
        mat2 tw = rot(t * (hash11(float(k) * 5.3) - 0.5) * 6.0);
        float seg = sdSeg(p, at + fly + mid + tw * (A - mid), at + fly + mid + tw * (B - mid));
        col += ink * (1.0 - smoothstep(0.0015, 0.0045, seg)) * (1.0 - t / 1.6);
      }
    }
  }
  // shots: a bright point with a short trail
  for (int j = 0; j < 8; j++) {
    vec4 s = uShots[j];
    if (s.x > 5.0) continue;
    float sdist = sdSeg(p, s.xy, s.xy - s.zw * 0.03);
    col += ink * (1.0 - smoothstep(0.0, 0.006, sdist)) * 1.6 + ink * exp(-sdist * 160.0) * 0.3;
  }
  // bursts: a flash, then sparks flying out
  for (int j = 0; j < 8; j++) {
    vec4 bm = uBooms[j];
    if (bm.z > 1.0) continue;
    float sz = bm.w;
    float fade = 1.0 - bm.z;
    for (int k = 0; k < 10; k++) {
      float fk = float(k);
      float ang = fk * 0.628 + hash11(fk + bm.x * 31.0) * 0.6;
      vec2 sp = bm.xy + vec2(cos(ang), sin(ang)) * bm.z * (0.08 + 0.05 * sz) * (0.6 + 0.6 * hash11(fk * 3.1 + bm.y * 17.0));
      col += ink * (1.0 - smoothstep(0.0, 0.005, length(p - sp))) * fade * 1.4;
    }
    col += ink * exp(-length(p - bm.xy) * (60.0 - 8.0 * sz)) * max(0.0, 1.0 - bm.z * 6.0) * 1.5;
  }
  col += ink * (1.0 - smoothstep(0.0015, 0.0045, d)) * (0.9 + 0.3 * uKick);
  col += ink * exp(-d * 110.0) * 0.28;
  col += ink * uSnare * 0.04;
  // the score, top left
  float sc = uRockFx.z;
  for (int k = 0; k < 5; k++) {
    int dg = int(mod(floor(sc / pow(10.0, float(4 - k))), 10.0));
    col += ink * digit7((p - vec2(-0.84 + float(k) * 0.045, 0.37)) / 0.04, dg) * 0.6;
  }
  return col * (0.94 + 0.06 * hash11(floor(uTime * 60.0)));
}
`;

const maze = `
// Maze: a chomper hunting dots round a mirrored neon maze, three wisps on its
// trail - one chases it, one cuts it off, one keeps its distance - until it
// swallows a power dot and they run. The game runs as a simulation
// (src/core/sims.js); this draws the moment it hands over.
uniform float uWalls[13];
uniform float uDots[13];
uniform vec4 uChomp;      // where it is, which way it faces
uniform vec4 uWisps[3];   // where each is, its state (0 hunting, 1 frightened, 2 home), its heading
uniform vec4 uMazeFx;     // fright left, then seconds since a death, a cleared level, a wisp eaten
const vec2 MG = vec2(21.0, 13.0);
float bitAt(float row, float x) { return mod(floor(row / exp2(x)), 2.0); }
bool wallAt(vec2 c) {
  if (c.x < 0.0 || c.y < 0.0 || c.x > MG.x - 1.0 || c.y > MG.y - 1.0) return true;
  return bitAt(uWalls[int(c.y)], c.x) > 0.5;
}
bool dotAt(vec2 c) {
  if (c.x < 0.0 || c.y < 0.0 || c.x > MG.x - 1.0 || c.y > MG.y - 1.0) return false;
  return bitAt(uDots[int(c.y)], c.x) > 0.5;
}
bool isPower(vec2 c) { return (c.x == 1.0 || c.x == MG.x - 2.0) && (c.y == 1.0 || c.y == MG.y - 2.0); }
vec2 headingOf(float w) { return abs(w) > 1.5 ? vec2(sign(w), 0.0) : vec2(0.0, w); }

vec3 render(vec2 p, vec2 uv) {
  float spb = max(uSpb, 0.2);
  float b = uTime / spb;
  float cs = 0.98 / MG.y;
  vec2 q = p / cs + MG * 0.5;
  vec2 c = floor(q), f = fract(q);
  float fright = uMazeFx.x;

  vec3 col = vec3(0.0, 0.0, 0.02);
  vec3 neon = mix(vec3(0.2, 0.35, 1.0), pal(0.6), 0.25) * (1.0 + 0.6 * uBass);
  // a cleared level: the walls flash white
  if (uMazeFx.z < 1.6) neon = mix(neon, vec3(1.2), step(0.5, fract(uMazeFx.z * 4.0)));
  if (wallAt(c)) {
    float d = 1.0;
    if (!wallAt(c + vec2(-1.0, 0.0))) d = min(d, f.x);
    if (!wallAt(c + vec2(1.0, 0.0))) d = min(d, 1.0 - f.x);
    if (!wallAt(c + vec2(0.0, -1.0))) d = min(d, f.y);
    if (!wallAt(c + vec2(0.0, 1.0))) d = min(d, 1.0 - f.y);
    col += neon * (1.0 - smoothstep(0.05, 0.12, abs(d - 0.2))) * 1.2;
    col += neon * exp(-abs(d - 0.2) * 12.0) * 0.25;
  } else if (dotAt(c)) {
    float r = length(f - 0.5);
    if (isPower(c)) {
      col += vec3(1.0, 0.85, 0.7) * (1.0 - smoothstep(0.2, 0.28, r)) * (0.6 + 0.4 * sin(uTime * 10.0));
      col += vec3(1.0, 0.7, 0.5) * exp(-r * 6.0) * 0.4 * (1.0 + uKick);
    } else {
      col += vec3(1.0, 0.8, 0.7) * (1.0 - smoothstep(0.06, 0.11, r)) * (0.8 + 0.6 * uHat);
    }
  }

  // the wisps: glowing orbs with a flame for a tail, eyes looking where they go
  for (int i = 0; i < 3; i++) {
    vec4 w = uWisps[i];
    vec2 wp = (w.xy + 0.5 - MG * 0.5) * cs;
    vec2 d = p - wp;
    vec2 hd = headingOf(w.w);
    vec3 wc = pal(fract(0.2 + float(i) * 0.27 + uSeed.z));
    wc = unblack(wc);                                 // (the palette can dip below zero: never black)
    wc /= max(max(wc.r, wc.g), max(wc.b, 0.3));
    if (w.z > 0.5 && w.z < 1.5) {
      wc = vec3(0.25, 0.35, 1.0);
      if (fright < 1.2) wc = mix(wc, vec3(1.0), step(0.5, fract(uTime * 5.0)));   // about to turn back
    }
    if (w.z < 1.5) {
      float body = 1.0 - smoothstep(cs * 0.36, cs * 0.44, length(d));
      // the tail streams out behind
      vec2 tl = d + hd * cs * 0.5;
      float tail = exp(-length(tl * vec2(1.0 + abs(hd.y) * 2.0, 1.0 + abs(hd.x) * 2.0)) / cs * 3.0);
      col += wc * (body * 1.1 + tail * 0.35 + exp(-length(d) / cs * 2.0) * 0.3);
    }
    for (int e = 0; e < 2; e++) {
      vec2 eo = vec2((float(e) - 0.5) * 0.34, 0.1) * cs + hd * cs * 0.12;
      col = mix(col, vec3(1.0), 1.0 - smoothstep(cs * 0.08, cs * 0.11, length(d - eo)));
      col = mix(col, vec3(0.05, 0.1, 0.4), 1.0 - smoothstep(cs * 0.03, cs * 0.05, length(d - eo - hd * cs * 0.04)));
    }
  }

  // the chomper, and the pop when it is caught
  vec2 cp = (uChomp.xy + 0.5 - MG * 0.5) * cs;
  vec2 dir = uChomp.zw;
  vec2 d = p - cp;
  float caught = uMazeFx.y;
  float size = caught < 0.8 ? 1.0 - caught / 0.8 : 1.0;
  float mouth = caught < 0.8 ? 3.1 * caught / 0.8 : 0.65 * abs(sin(b * PI * 2.0));
  float ang = acos(clamp(dot(normalize(d + 1e-5), dir), -1.0, 1.0));
  float body = (1.0 - smoothstep(cs * 0.4 * size, cs * 0.46 * size, length(d))) * step(mouth, ang);
  col = mix(col, vec3(1.0, 0.9, 0.2) * (1.0 + 0.4 * uKick), body);
  col += vec3(1.0, 0.85, 0.2) * exp(-length(d) / cs * 1.6) * 0.35 * size;
  // a wisp swallowed: a ring of light where it happened
  if (uMazeFx.w < 0.5) col += vec3(0.4, 0.6, 1.0) * exp(-abs(length(d) - uMazeFx.w * 0.6) * 60.0) * (1.0 - uMazeFx.w * 2.0);
  if (caught < 0.6) col += vec3(1.0, 0.3, 0.2) * exp(-abs(length(d) - caught * 0.5) * 50.0) * (1.0 - caught / 0.6);
  return col;
}
`;

const bricks = `
// Bricks: played as a simulation (src/core/sims.js). Every flight of the
// ball - to a wall, a brick, the paddle - is timed to land on the grid of the
// music, so the bricks break on the rhythm. The paddle picks a brick to aim
// at, or just an angle, and meets the ball off-centre to send it there, so
// the ball goes somewhere new every time. A cleared wall goes back up on the
// next return; the top row of later walls is silver and takes two hits.
uniform float uBricks[6];   // a row each, one bit per brick standing
uniform float uHard[6];     // the silver ones not yet cracked
uniform vec4 uBall;         // x, y, the way it flies
uniform vec4 uPaddle;       // x, since the last return, since the wall went up
uniform vec4 uBooms[6];     // x, y, since it broke, row
vec3 rowColour(float row) {
  vec3 c = pal(fract(row / 6.0 * 0.8 + uSeed.y));
  c = unblack(c);                                     // (the palette can dip below zero: never black)
  return c / max(max(c.r, c.g), max(c.b, 0.25));
}
vec3 render(vec2 p, vec2 uv) {
  float wx = 0.8;
  vec3 col = vec3(0.01, 0.01, 0.03) + vec3(0.03, 0.02, 0.07) * uv.y;
  vec2 bg = abs(fract(p * vec2(10.0, 10.0) + vec2(0.0, uTime * 0.05)) - 0.5);
  col += pal(0.7) * 0.03 * step(0.46, max(bg.x, bg.y));
  if (abs(p.x) > wx) col = vec3(0.13, 0.15, 0.24) * (0.6 + 0.4 * sin(p.y * 80.0));
  col += pal(0.6) * exp(-abs(abs(p.x) - wx) * 120.0) * 0.7;
  if (p.y > 0.45 && abs(p.x) < wx) col = vec3(0.13, 0.15, 0.24) * (0.6 + 0.4 * sin(p.x * 80.0));

  vec2 bw = vec2(wx * 2.0 / 12.0, 0.042);
  vec2 q = (p - vec2(-wx, 0.0)) / bw;
  vec2 id = floor(q), f = fract(q);
  if (id.x >= 0.0 && id.x < 12.0 && id.y >= 0.0 && id.y < 6.0) {
    int r = int(id.y);
    if (mod(floor(uBricks[r] / exp2(id.x)), 2.0) > 0.5) {
      bool silver = mod(floor(uHard[r] / exp2(id.x)), 2.0) > 0.5;
      vec3 bc = silver ? vec3(0.75, 0.78, 0.85) : rowColour(id.y);
      float edge = min(min(f.x, 1.0 - f.x) * 2.5, min(f.y, 1.0 - f.y));
      col = bc * (0.35 + 0.65 * smoothstep(0.0, 0.14, edge));
      col += vec3(1.0) * smoothstep(0.75, 0.95, f.y) * (silver ? 0.6 + 0.4 * sin(uTime * 4.0 + id.x) : 0.35);
      col *= step(0.03, edge);
    }
  }
  // a wall going back up: a white flash
  col += vec3(1.0) * exp(-uPaddle.z * 6.0) * 0.4;

  // a brick breaking: a flash, its pieces flung out and falling, a ring
  for (int i = 0; i < 6; i++) {
    vec4 b = uBooms[i];
    float t = b.z;
    if (t > 0.8) continue;
    vec3 bc = rowColour(b.w);
    vec2 d = p - b.xy;
    col += bc * exp(-length(d * vec2(0.6, 1.0)) * 30.0) * exp(-t * 8.0) * 2.5;
    col += bc * exp(-abs(length(d) - t * 0.5) * 70.0) * max(0.0, 1.0 - t * 1.6);
    for (int k = 0; k < 6; k++) {
      float fk = float(k);
      vec2 v = (hash22(vec2(fk, b.x * 9.0 + b.y * 5.0)) - vec2(0.5, 0.2)) * vec2(0.6, 0.5);
      vec2 pk = b.xy + v * t - vec2(0.0, 0.6 * t * t);
      vec2 e = abs(rot(t * 10.0 * (hash11(fk) - 0.5)) * (p - pk)) - vec2(0.014, 0.006);
      col += bc * step(max(e.x, e.y), 0.0) * max(0.0, 1.0 - t * 1.3) * 1.4;
    }
  }

  // the ball and its trail
  for (int k = 0; k < 10; k++) {
    float fk = float(k);
    vec2 pk = uBall.xy - uBall.zw * fk * 0.011;
    col += vec3(1.0, 0.95, 0.8) * (1.0 - smoothstep(0.008, 0.016, length(p - pk))) * (1.0 - fk / 10.0) * (k == 0 ? 1.4 : 0.3);
  }
  col += vec3(1.0, 0.9, 0.6) * exp(-length(p - uBall.xy) * 30.0) * 0.5;

  // the paddle, lighting up as it returns the ball
  vec2 pd = p - vec2(uPaddle.x, -0.335);
  float cap = length(vec2(max(abs(pd.x) - 0.06, 0.0), pd.y)) - 0.014;
  vec3 vaus = mix(vec3(0.7, 0.75, 0.85), pal(0.1), step(0.045, abs(pd.x)));
  col = mix(col, vaus * (0.7 + 0.5 * smoothstep(0.0, 0.01, -pd.y + 0.006)) + vec3(1.0) * exp(-uPaddle.y * 12.0) * 0.5, 1.0 - smoothstep(0.0, 0.003, cap));
  col += pal(0.1) * exp(-max(cap, 0.0) * 60.0) * 0.4 * (0.5 + uKick + 2.0 * exp(-uPaddle.y * 10.0));
  return col;
}
`;

const lightcycles = `
// Light cycles: played as a simulation (src/core/sims.js). Four riders fly
// across the grid, two cells a sixteenth, each trailing a wall of light that
// thins towards its tail; they turn on the beat and dodge between beats. A
// rider goes down only where the music turns: on the downbeat that opens a
// phrase, or on an accent, the game sends one of them into another's wall,
// and it blows up and its wall derezzes. The last one riding wins the round.
uniform vec4 uSegs[80];     // walls of light, newest first: from (x + 4 * rider, y + 2 * age) to (z, w)
uniform vec4 uRiders[4];    // head x, y, riding, seconds since it crashed
uniform vec4 uCrash[4];     // where it crashed, seconds since, rider
uniform vec4 uRound;        // since the round began, the winner, since it was won
vec3 riderColour(int id) {
  return id == 0 ? vec3(0.2, 0.9, 1.0) : id == 1 ? vec3(1.0, 0.55, 0.1) : id == 2 ? vec3(1.0, 0.2, 0.75) : vec3(0.6, 1.0, 0.25);
}
// one rider: its wall (d: the distance to it), its bike, its crash
vec3 drawRider(vec3 col, vec2 p, int r, float d, vec2 dir) {
  vec3 c = riderColour(r);
  vec4 rd = uRiders[r];
  float fade = 1.0;
  if (rd.z < 0.5) {
    // derezzing: the wall flickers and breaks up as it comes down
    fade = max(0.0, 1.0 - rd.w / 1.1);
    float bits = step(1.0 - fade, hash12(floor(p / 0.012) + floor(uTime * 24.0)));
    fade *= bits * (0.6 + 0.4 * step(0.5, hash11(floor(uTime * 30.0) + float(r))));
  }
  col += c * (1.0 - smoothstep(0.002, 0.006, d)) * 1.3 * fade;
  col += c * exp(-d * 70.0) * 0.45 * fade;
  // the rider: a white-hot point, its glow, and a flare across it that kicks with the drum
  if (rd.z > 0.5) {
    vec2 hp = p - rd.xy;
    float hd = length(hp);
    col += vec3(1.0) * (1.0 - smoothstep(0.006, 0.012, hd)) * 1.5;
    col += c * exp(-hd * 30.0) * 0.8;
    col += c * exp(-abs(hp.y) * 260.0) * exp(-abs(hp.x) * 9.0) * 0.6 * (0.6 + uKick);
  }
  // the crash: a flash, a ring, shards of light
  vec4 cr = uCrash[r];
  if (cr.z < 1.4) {
    float t = cr.z;
    float dist = length(p - cr.xy);
    col += vec3(1.0, 0.97, 0.9) * exp(-dist * 22.0) * exp(-t * 7.0) * 3.0;
    col += c * exp(-abs(dist - t * 0.55) * 45.0) * max(0.0, 1.0 - t * 0.9) * 1.6;
    col += c * exp(-dist * 4.0) * exp(-t * 3.0) * 0.35;
    if (dist < t * 0.6 + 0.05) {
      for (int k = 0; k < 14; k++) {
        float fk = float(k);
        float an = fk * 0.4488 + hash11(fk + float(r) * 7.0) * 0.4;
        vec2 sp = cr.xy + vec2(cos(an), sin(an)) * t * (0.25 + 0.3 * hash11(fk * 3.3 + float(r)));
        float shard = sdSeg(p, sp, sp + rot(t * 6.0 + fk) * vec2(0.018, 0.0));
        col += c * (1.0 - smoothstep(0.0, 0.004, shard)) * max(0.0, 1.0 - t * 0.8) * 1.6;
      }
    }
  }
  return col;
}
vec3 render(vec2 p, vec2 uv) {
  vec3 col = vec3(0.0, 0.01, 0.03);
  // the grid, lit by the winner when the round is won
  vec3 gridC = vec3(0.1, 0.45, 0.8);
  if (uRound.z >= 0.0 && uRound.y >= 0.0) gridC = mix(gridC, riderColour(int(uRound.y)), 0.7 * exp(-uRound.z * 1.5));
  vec2 g = abs(fract(p * 12.5) - 0.5);
  col += gridC * (1.0 - smoothstep(0.0, 0.05, min(g.x, g.y))) * 0.35 * (0.8 + 0.4 * uBass);
  vec2 G = abs(fract(p * 2.5) - 0.5);
  col += vec3(0.2, 0.6, 1.0) * (1.0 - smoothstep(0.0, 0.02, min(G.x, G.y))) * 0.35;
  // the arena's edge
  vec2 e = abs(p) - vec2(0.864, 0.468);
  float edge = abs(max(e.x, e.y));
  col += vec3(0.3, 0.7, 1.0) * (1.0 - smoothstep(0.002, 0.006, edge)) * 0.9 + vec3(0.2, 0.5, 1.0) * exp(-edge * 50.0) * 0.25;
  // a new round: the arena sweeps in
  col += vec3(0.4, 0.8, 1.0) * exp(-abs(p.x + 1.0 - uRound.x * 4.0) * 20.0) * step(uRound.x, 0.6);

  // the walls: the nearest point of each rider's wall, and the way each head points
  float d0 = 1e9, d1 = 1e9, d2 = 1e9, d3 = 1e9;
  vec2 v0 = vec2(1.0, 0.0), v1 = v0, v2 = v0, v3 = v0;
  vec2 h0 = uRiders[0].xy, h1 = uRiders[1].xy, h2 = uRiders[2].xy, h3 = uRiders[3].xy;
  for (int i = 0; i < 80; i++) {
    vec4 sg = uSegs[i];
    float id = floor((sg.x + 2.0) / 4.0);
    if (id < 0.0) break;
    float age = floor((sg.y + 1.0) / 2.0);
    vec2 a = vec2(sg.x - 4.0 * id, sg.y - 2.0 * age), b = sg.zw;
    float d = sdSeg(p, a, b) + age * 0.0012;
    vec2 v = length(b - a) > 1e-4 ? normalize(b - a) : vec2(1.0, 0.0);
    if (id < 0.5) { d0 = min(d0, d); if (length(b - h0) < 1e-4) v0 = v; }
    else if (id < 1.5) { d1 = min(d1, d); if (length(b - h1) < 1e-4) v1 = v; }
    else if (id < 2.5) { d2 = min(d2, d); if (length(b - h2) < 1e-4) v2 = v; }
    else { d3 = min(d3, d); if (length(b - h3) < 1e-4) v3 = v; }
  }
  col = drawRider(col, p, 0, d0, v0);
  col = drawRider(col, p, 1, d1, v1);
  col = drawRider(col, p, 2, d2, v2);
  col = drawRider(col, p, 3, d3, v3);
  return col;
}
`;

const snake = `
// Snake: the phone-screen classic as a neon tube. It steers for the food and
// keeps itself room to escape, grows three cells each time it eats, and when
// it finally boxes itself in it bursts and starts again. A pulse runs down its
// body on every beat. The game runs as a simulation (src/core/sims.js).
uniform vec2 uSnake[64];
uniform float uSnakeLen;
uniform vec4 uFood;       // the food now, and where the last one was eaten
uniform vec4 uSnakeFx;    // since it ate, since the round ended, the round, waiting to restart
const vec2 SG = vec2(24.0, 14.0);
vec3 render(vec2 p, vec2 uv) {
  float cs = 1.0 / SG.y;
  vec2 q = p / cs + SG * 0.5;
  vec3 col = vec3(0.0, 0.012, 0.02);
  vec2 gf = abs(fract(q) - 0.5);
  col += pal(0.62) * 0.06 * smoothstep(0.42, 0.5, max(gf.x, gf.y)) * (0.7 + 0.6 * uBass);
  if (q.x < 0.0 || q.y < 0.0 || q.x > SG.x || q.y > SG.y) col *= 0.3;

  float n = uSnakeLen;
  float dead = uSnakeFx.w;
  float since = uSnakeFx.y;
  float best = 1e9, bi = 0.0;
  for (int i = 0; i < 64; i++) {
    if (float(i) >= n) break;
    vec2 a = uSnake[i] + 0.5;
    // a crash throws the body apart
    if (dead > 0.5) a += (hash22(vec2(float(i), uSnakeFx.z)) - 0.5) * since * 9.0;
    float d = length(q - a);
    if (dead < 0.5 && i + 1 < int(n)) d = min(d, sdSeg(q, a, uSnake[i + 1] + 0.5));
    if (d < best) { best = d; bi = float(i); }
  }
  float rad = 0.42 - 0.17 * bi / max(n, 1.0);
  if (best < rad) {
    float nz = sqrt(max(0.0, 1.0 - (best / rad) * (best / rad)));      // a round tube, lit from above
    vec3 hue = pal(fract(bi / max(n, 1.0) * 0.6 + uTime * 0.05 + uSeed.x));
    hue = unblack(hue);                               // (the palette can dip below zero: never black)
    hue /= max(max(hue.r, hue.g), max(hue.b, 0.3));
    float pulse = exp(-abs(bi - uBeat * n) * 0.5) * (0.4 + uKick);
    col = hue * (0.35 + 0.75 * nz) + vec3(1.0) * pow(nz, 8.0) * 0.4 + hue * pulse;
    if (dead > 0.5) col = mix(col, vec3(1.0, 0.4, 0.3), exp(-since * 3.0));
  }
  col += pal(0.3) * exp(-best * 2.2) * 0.12;

  // the head: eyes looking where it goes
  if (dead < 0.5 && n > 1.0) {
    vec2 h = uSnake[0] + 0.5;
    vec2 dir = normalize(uSnake[0] - uSnake[1] + 1e-4);
    vec2 side = vec2(-dir.y, dir.x);
    for (int e = 0; e < 2; e++) {
      vec2 eo = h + dir * 0.15 + side * (float(e) - 0.5) * 0.36;
      col = mix(col, vec3(1.0), 1.0 - smoothstep(0.07, 0.1, length(q - eo)));
      col = mix(col, vec3(0.0), 1.0 - smoothstep(0.03, 0.05, length(q - eo - dir * 0.04)));
    }
  }

  // the food: a spinning gem that throbs on the kick
  vec2 fq = q - uFood.xy - 0.5;
  fq = rot(uTime * 2.0) * fq;
  float gem = abs(fq.x) + abs(fq.y) - 0.32 * (1.0 + 0.25 * uKick);
  vec3 gc = vec3(1.0, 0.35, 0.6);
  col = mix(col, gc * (1.2 - 2.0 * (abs(fq.x) + abs(fq.y))), 1.0 - smoothstep(0.0, 0.04, gem));
  col += gc * exp(-max(gem, 0.0) * 6.0) * 0.4;
  // eaten: a shockwave from where it was
  float te = uSnakeFx.x;
  if (te < 0.6) {
    float r = length(q - uFood.zw - 0.5);
    col += gc * exp(-abs(r - te * 9.0) * 4.0) * (1.0 - te / 0.6) * 1.5;
  }
  return col;
}
`;

const boxer = `
// Boxer: a title fight between two boxing robots under the lights, staged the
// way the great console boxing games staged theirs - a challenger the seed
// builds, and yours, seen over its shoulder. Everything lands on the music.
// Each two-bar phrase the challenger picks a move: a hook or an uppercut with
// a tell in his visor, a flurry of jabs, a showboat (pounding his gloves,
// waving you in), or weaving side to side so your jabs find air. You block
// the jabs, slip the big ones and punish them with a flurry on the eighths.
// Once every sixteen bars, on the downbeat where a phrase opens on a crash,
// your star punch lands: his visor goes dark, his knees give, his arms hang,
// and he folds to the canvas while the count goes up on the beats - then he
// reboots and gets back up. Yours is drawn see-through, in green glass and
// light, as the arcade boxing games drew theirs: the whole show stays in
// view, and your boxer still reads as yours. Raymarched in 3D and lit by the
// spots.
float sdStar(vec2 p, float r, float spikes) {
  float a = atan(p.y, p.x);
  return length(p) - r * (0.55 + 0.45 * pow(abs(cos(a * spikes * 0.5)), 6.0));
}
float sdBox3(vec3 p, vec3 b, float r) {
  vec3 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r;
}
float sdCap3(vec3 p, vec3 a, vec3 b, float r) {
  vec3 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - r;
}
float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}
vec2 opU(vec2 a, vec2 b) { return a.x < b.x ? a : b; }
// in at a, held, out again: the shape of every move
float env(float x, float a, float rise, float hold, float fall) {
  return smoothstep(a, a + rise, x) * (1.0 - smoothstep(a + rise + hold, a + rise + hold + fall, x));
}

// a robot's pose for this frame; both are built facing -z
struct Bot {
  vec3 root;     // between the feet, on the canvas
  float face;    // 1: faces -z (the challenger), -1: faces +z (yours)
  float lean, twist, roll;   // the body from the hips: forward, round, to the side
  float crouch;  // 0 standing, 1 down on its knees
  vec2 topple;   // the whole body tipped over from the knees: sideways, forwards
  vec3 gl, gr;   // the gloves, in the body's own frame (from the hips)
  vec3 head;     // the head knocked off its rest
  float nod;     // the head dropped forward
  float kind;    // 0 the challenger, 1 yours
};
Bot gA, gB;
const float RING = 2.6;

// materials: kind * 10 + 1 shell, 2 joints, 3 gloves, 4 visor, 5 chest light; 21-23 ropes, 24 posts, 25 pads
vec2 bot(vec3 p, Bot B) {
  vec3 q = p - B.root;
  q.xz *= B.face;
  float bound = length(q - vec3(0.0, 0.8, -0.2)) - 2.1;
  if (bound > 0.1) return vec2(bound, 0.0);
  // toppling: the whole body tips over from where its knees are
  float k = B.crouch;
  vec3 piv = vec3(0.0, 0.1, -0.3 * k);
  q -= piv;
  q.xy = rot(B.topple.x) * q.xy;
  q.yz = rot(-B.topple.y) * q.yz;
  q += piv;
  float m0 = B.kind * 10.0;
  // legs, both alike: hips sink and the knees go down as it crouches
  float hipY = 0.95 - 0.47 * k;
  vec3 knee = mix(vec3(0.17, 0.52, -0.06), vec3(0.19, 0.1, -0.3), k);
  vec3 foot = mix(vec3(0.19, 0.12, 0.02), vec3(0.2, 0.08, 0.14), k);
  vec3 m = vec3(abs(q.x), q.y, q.z);
  float shell = min(sdCap3(m, vec3(0.14, hipY, 0.0), knee, 0.095), sdCap3(m, knee, foot, 0.08));
  shell = min(shell, sdBox3(m - foot - vec3(0.0, -0.06, -0.07), vec3(0.09, 0.06, 0.17), 0.04));
  float joint = length(m - knee - vec3(0.0, 0.0, -0.02)) - 0.1;
  // the body: from the hips, it rolls, leans and twists
  vec3 t = q - vec3(0.0, hipY + 0.03, 0.0);
  t.xy = rot(B.roll) * t.xy;
  t.yz = rot(-B.lean) * t.yz;
  t.xz = rot(B.twist) * t.xz;
  shell = min(shell, sdBox3(t, vec3(0.21, 0.09, 0.13), 0.05));
  joint = min(joint, sdCap3(t, vec3(0.0, 0.05, 0.0), vec3(0.0, 0.3, 0.0), 0.12));
  float chest = smin(sdBox3(t - vec3(0.0, 0.48, 0.0), vec3(0.28, 0.21, 0.17), 0.08),
                     sdBox3(t - vec3(0.0, 0.52, -0.05), vec3(0.22, 0.14, 0.15), 0.08), 0.06);
  shell = min(shell, chest);
  vec3 tm = vec3(abs(t.x), t.y, t.z);
  shell = min(shell, length(tm - vec3(0.38, 0.63, 0.0)) - (B.kind > 0.5 ? 0.13 : 0.12 + 0.05 * uSeed.y));
  joint = min(joint, sdCap3(t, vec3(0.0, 0.68, 0.0), vec3(0.0, 0.82, 0.0), 0.06));
  // the head: a helmet, rounder or squarer by the seed, with a visor slit; it can hang
  vec3 h = t - vec3(0.0, 0.82, 0.0);
  h.yz = rot(-B.nod) * h.yz;
  h -= vec3(0.0, 0.12, 0.0) + B.head;
  float rnd = B.kind > 0.5 ? 0.04 : 0.03 + 0.07 * uSeed.z;
  shell = min(shell, sdBox3(h, vec3(0.13, 0.12, 0.13), rnd));
  float visor = sdBox3(h - vec3(0.0, 0.01, -0.125), vec3(0.1, 0.024, 0.02), 0.012);
  if (B.kind < 0.5 && uSeed.w > 0.4) joint = min(joint, sdCap3(h, vec3(0.08, 0.1, 0.0), vec3(0.11, 0.24, 0.03), 0.012));   // an antenna
  float light = length(t - vec3(0.0, 0.5, -0.2)) - 0.05;
  // arms: shoulder, elbow, glove
  float gloves = 1e9;
  for (int s = 0; s < 2; s++) {
    float sd = float(s) * 2.0 - 1.0;
    vec3 sh = vec3(0.38 * sd, 0.62, 0.0);
    vec3 g = s == 0 ? B.gl : B.gr;
    float reach = length(g - sh);
    vec3 el = mix(sh, g, 0.5) + vec3(0.15 * sd, -0.17, 0.06) * clamp(1.0 - reach / 0.8, 0.0, 1.0);
    joint = min(joint, sdCap3(t, sh, el, 0.065));
    shell = min(shell, sdCap3(t, el, g, 0.078));
    gloves = min(gloves, length((t - g) * vec3(1.0, 1.0, 0.85)) - 0.14);
  }
  vec2 r = vec2(shell, m0 + 1.0);
  r = opU(r, vec2(joint, m0 + 2.0));
  r = opU(r, vec2(gloves, m0 + 3.0));
  r = opU(r, vec2(visor, m0 + 4.0));
  r = opU(r, vec2(light, m0 + 5.0));
  return r;
}

// a point on a robot's body, given in the frame of its hips, out in the world:
// the transform bot() applies, run backwards
vec3 botPoint(Bot B, vec3 t) {
  t.xz = rot(-B.twist) * t.xz;
  t.yz = rot(B.lean) * t.yz;
  t.xy = rot(-B.roll) * t.xy;
  float k = B.crouch;
  vec3 q = t + vec3(0.0, 0.98 - 0.47 * k, 0.0);
  vec3 piv = vec3(0.0, 0.1, -0.3 * k);
  q -= piv;
  q.yz = rot(B.topple.y) * q.yz;
  q.xy = rot(-B.topple.x) * q.xy;
  q += piv;
  q.xz *= B.face;
  return q + B.root;
}

vec2 ring(vec3 p) {
  vec2 a = abs(p.xz) - RING;
  float perim = abs(length(max(a, 0.0)) + min(max(a.x, a.y), 0.0));
  float hy = clamp(floor((p.y - 0.55) / 0.35 + 0.5), 0.0, 2.0);
  vec2 r = vec2(length(vec2(perim, p.y - 0.55 - hy * 0.35)) - 0.028, 21.0 + hy);
  float post = max(length(a) - 0.09, abs(p.y - 0.75) - 0.75);
  float pad = max(length(a) - 0.13, abs(p.y - 0.9) - 0.42);
  r = opU(r, vec2(post, 24.0));
  r = opU(r, vec2(pad, 25.0));
  return r;
}

// the scene behind your boxer; yours is drawn over it afterwards, see-through
vec2 map(vec3 p) { return opU(bot(p, gA), ring(p)); }

// the four directions a normal is sampled along (the same tetrahedron as before)
vec3 tapDir(int i) {
  if (i == 0) return vec3(1.0, -1.0, -1.0);
  if (i == 1) return vec3(-1.0, -1.0, 1.0);
  if (i == 2) return vec3(-1.0, 1.0, -1.0);
  return vec3(1.0);
}



// the crowd, out of focus, and the photographers' flashes
vec3 crowd(vec2 c2, float frenzy) {
  vec3 col = mix(vec3(0.015, 0.01, 0.035), vec3(0.09, 0.03, 0.09), smoothstep(-0.2, 0.6, c2.y));
  for (int i = 0; i < 40; i++) {
    float fi = float(i);
    vec2 h = hash22(vec2(fi, 7.0) + uSeed.xy * 5.0);
    vec2 c = vec2(h.x * 3.0 - 1.5, -0.1 + h.y * 0.55);
    float r = 0.03 + 0.05 * hash11(fi * 3.1);
    vec3 lc = mix(pal(hash11(fi * 1.7)), vec3(1.0, 0.8, 0.55), 0.5);
    float flash = step(0.988 - 0.05 * frenzy, hash11(fi + floor(uTime * 8.0))) * 2.5;
    col += lc * (1.0 - smoothstep(r * 0.75, r, length(c2 - c))) * (0.09 + 0.08 * uHat + flash);
  }
  return col;
}

// glow along a spotlight's beam, from the lamp down to the canvas
float beam(vec3 ro, vec3 rd, float tmax, vec3 a, vec3 u) {
  vec3 w = ro - a;
  float b = dot(rd, u), d = dot(rd, w), e = dot(u, w);
  float den = max(1.0 - b * b, 1e-4);
  float t = clamp((b * e - d) / den, 0.0, tmax);
  vec3 x = ro + rd * t;
  float s = max(dot(x - a, u), 0.0);
  return exp(-length(x - a - u * s) / (0.12 + 0.13 * s) * 2.0) * smoothstep(0.0, 1.0, s);
}

vec2 toScreen(vec3 w, vec3 ro, vec3 fw, vec3 rt, vec3 up) {
  vec3 v = w - ro;
  return vec2(dot(v, rt), dot(v, up)) / max(dot(v, fw), 0.05) * 1.6;
}

vec3 render(vec2 p, vec2 uv) {
  // --- the fight, on the music --------------------------------------------
  // Sixteen bars from one knockdown to the next; the star punch lands on the
  // downbeat that opens bar 8 of every sixteen. K counts beats since it.
  float R = mod(uBarIndex + uBar - 8.0, 16.0);
  float K = R * 4.0;
  float fighting = step(12.0, K);
  float s = mod(K - 12.0, 8.0);                            // the beat in this two-bar phrase
  float ph = floor((K - 12.0) / 8.0) + floor((uBarIndex + 8.0) / 16.0) * 7.0;
  float last = step(56.0, K);                              // the phrase before the knockdown
  float move = floor(hash11(ph * 1.37 + uSeed.x * 17.0) * 5.0);   // 0 hook, 1 jabs, 2 uppercut, 3 showboat, 4 weave
  float isHook = fighting * (1.0 - last) * step(move, 0.5);
  float isJabs = fighting * (1.0 - last) * step(0.5, move) * step(move, 1.5);
  float isUpper = fighting * (1.0 - last) * step(1.5, move) * step(move, 2.5);
  float isShow = fighting * (1.0 - last) * step(2.5, move) * step(move, 3.5);
  float isWeave = fighting * (1.0 - last) * step(3.5, move);
  float lands = step(0.8, hash11(ph * 2.13 + uSeed.y * 9.0));    // now and then his big one gets through

  // his moves
  float tell = (isHook + isUpper) * env(s, 5.0, 0.8, 0.2, 0.1) + isJabs * env(s, 3.5, 0.35, 0.05, 0.1);
  float hook = isHook * env(s, 6.0, 0.12, 0.25, 0.8);
  float upper = isUpper * env(s, 6.0, 0.15, 0.25, 0.8);
  float dip = isUpper * env(s, 5.0, 0.8, 0.2, 0.15);
  float jab = isJabs * max(env(s, 4.0, 0.08, 0.05, 0.3), max(env(s, 4.5, 0.08, 0.05, 0.3), env(s, 5.0, 0.08, 0.05, 0.3)));
  float pound = isShow * max(env(s, 4.0, 0.1, 0.05, 0.35), env(s, 5.0, 0.1, 0.05, 0.35));
  float beckon = isShow * env(s, 5.6, 0.2, 1.0, 0.3);
  float weave = isWeave * sin(s * PI) * env(s, 0.0, 0.3, 6.0, 0.6);
  float dizzy = last * (1.0 - smoothstep(7.6, 8.0, s));

  // yours: block the jabs, slip the big ones, then punish
  float dodged = (isHook + isUpper) * (1.0 - lands);
  float took = (isHook + isUpper) * lands * env(s, 6.08, 0.06, 0.2, 0.6);
  float block = isJabs * env(s, 3.7, 0.15, 1.4, 0.3);
  float slip = dodged * env(s, 5.85, 0.12, 0.45, 0.45) * (isHook > 0.5 ? -1.0 : 1.0);
  float jabs = env(s, 0.0, 0.06, 0.08, 0.45) + env(s, 2.0, 0.06, 0.08, 0.45);      // on the kick
  float flurry = 0.0, fside = 1.0;
  for (int i = 0; i < 3; i++) {
    float a = 6.5 + 0.5 * float(i);
    float e = dodged * env(s, a, 0.05, 0.05, 0.3) + isJabs * env(s, a - 0.5, 0.05, 0.05, 0.3);
    if (e > flurry) { flurry = e; fside = mod(float(i), 2.0) * 2.0 - 1.0; }
  }
  float showHit = isShow * env(s, 7.0, 0.06, 0.08, 0.5);
  // the last phrase: he is dazed, you hit him on every beat, then load the star punch
  float pummel = last * env(fract(s), 0.0, 0.06, 0.08, 0.45) * step(s, 4.0);
  float load = last * smoothstep(5.5, 7.6, s) * (1.0 - smoothstep(7.85, 8.0, s));
  float star = last * smoothstep(7.85, 8.0, s) + (1.0 - fighting) * (1.0 - smoothstep(0.12, 0.8, K));
  float counter = (1.0 - isWeave) * (1.0 - isShow) * (1.0 - last) * jabs * fighting + pummel;
  float whiff = isWeave * jabs;
  float punch = max(max(counter, flurry), max(showHit, whiff));
  float side = jabs > 0.01 ? (mod(floor(s / 2.0), 2.0) * 2.0 - 1.0) : (flurry > 0.01 ? fside : 1.0);
  float hitA = max(max(counter, flurry), showHit);            // what lands on him

  // --- the knockdown: switched off ----------------------------------------
  float KO = (1.0 - fighting) * K;                          // beats since the star punch, while down
  float down = 1.0 - fighting;
  float rise = smoothstep(9.0, 10.8, KO) * down;            // he reboots and gets up
  float gone = down * (1.0 - rise);
  float limp = gone * smoothstep(0.3, 1.0, KO);
  float sag = gone * pow(smoothstep(0.4, 1.4, KO), 1.5);     // knees giving
  float tip = gone * pow(smoothstep(1.3, 2.3, KO), 2.0);    // over he goes
  float land = KO > 2.3 ? exp(-(KO - 2.3) * 7.0) * sin((KO - 2.3) * 24.0) : 0.0;
  float twitch = gone * step(3.0, KO) * step(KO, 9.0) * env(fract(KO), 0.0, 0.05, 0.02, 0.2);
  float power = fighting + down * (KO < 0.05 ? 1.0 : 0.0) + rise * step(0.5, hash11(floor(uTime * 18.0))) * (1.0 - smoothstep(10.0, 10.8, KO)) + rise * smoothstep(10.0, 10.8, KO);
  float count = down * step(2.0, KO) * step(KO, 10.0);
  float countN = floor(KO) - 1.0;

  // --- the challenger -----------------------------------------------------
  gA.face = 1.0; gA.kind = 0.0;
  gA.root = vec3(0.05 + 0.13 * sin(uTime / max(uSpb, 0.2) * PI * 0.5) * fighting + weave * 0.28, 0.0, 0.35 + 0.18 * gone * smoothstep(0.0, 0.5, KO));
  gA.crouch = sag + 0.25 * dip * (1.0 - upper);
  gA.topple = vec2(1.35 * tip + 0.05 * land, 0.3 * tip);
  gA.lean = fighting * (0.1 + 0.05 * sin(K * PI) + 0.15 * (hook + upper) + 0.12 * jab - 0.2 * hitA + 0.1 * dizzy * sin(K * 2.0))
          + down * (-0.35 * env(KO, 0.0, 0.06, 0.1, 0.6) + 0.5 * sag + 0.25 * limp);
  gA.twist = fighting * (0.35 * tell * isHook - 0.45 * hook + side * 0.25 * hitA - 0.3 * jab + 0.25 * sin(s * PI * 4.0) * beckon)
           + down * 0.12 * sin(KO * 20.0) * env(KO, 9.5, 0.2, 0.6, 0.3);
  gA.roll = fighting * (0.2 * weave + 0.15 * dizzy * sin(K * 3.0)) + down * 0.25 * limp;
  gA.nod = down * (0.55 * limp) + fighting * 0.25 * dizzy;
  gA.head = fighting * vec3(-side * 0.07, 0.03, 0.12) * hitA + down * vec3(0.0, 0.05, 0.16) * env(KO, 0.0, 0.05, 0.1, 0.5);
  vec3 guardL = vec3(-0.2, 0.64, -0.33), guardR = vec3(0.2, 0.64, -0.33);
  gA.gl = guardL + vec3(0.2, 0.0, 0.02) * pound + vec3(0.12, 0.1, -0.5) * jab + vec3(-0.15, 0.25 + 0.1 * sin(s * PI * 4.0), 0.0) * beckon;
  gA.gr = mix(guardR, vec3(0.42, 0.6, 0.12), tell * isHook) + vec3(-0.2, 0.0, 0.02) * pound + vec3(0.0, -0.25, 0.05) * dip;
  // switched off: arms hang, then sprawl as he goes over
  gA.gl = mix(gA.gl, vec3(-0.36, -0.12, 0.05), limp);
  gA.gr = mix(gA.gr, vec3(0.36, -0.12, 0.05), limp);
  gA.gl = mix(gA.gl, vec3(-0.6, 0.35, -0.25), tip) + vec3(0.0, 0.08, 0.0) * twitch;
  gA.gr = mix(gA.gr, vec3(0.5, -0.05, 0.35), tip);
  // the star punch throws his gloves up
  gA.gl += vec3(-0.1, 0.3, 0.2) * env(KO, 0.0, 0.06, 0.1, 0.5) * down;
  gA.gr += vec3(0.1, 0.3, 0.2) * env(KO, 0.0, 0.06, 0.1, 0.5) * down;

  // --- yours --------------------------------------------------------------
  gB.face = -1.0; gB.kind = 1.0;
  // (and while he is down and counted, yours walks off to a neutral corner)
  float corner = gone * smoothstep(0.8, 2.6, KO) + rise * (1.0 - smoothstep(9.0, 10.8, KO));
  gB.root = vec3(-0.18 + slip * 0.32 + 0.04 * sin(K * PI * 0.5 + 1.0) * fighting, 0.04 * abs(sin(KO * PI)) * corner, -1.0 - 0.15 * took) + vec3(-0.75, 0.0, 0.25) * corner;
  gB.crouch = 0.3 * load + 0.12 * env(s, 5.85, 0.12, 0.45, 0.45) * isUpper * (1.0 - lands);
  gB.topple = vec2(0.0);
  gB.lean = 0.12 + 0.03 * sin(K * PI + 1.0) + 0.14 * punch - 0.12 * took + 0.1 * block - 0.15 * star;
  gB.twist = 0.3 * slip - side * 0.3 * punch + 0.4 * load;
  gB.roll = -0.25 * slip;
  gB.nod = 0.0;
  gB.head = vec3(0.06, 0.02, 0.1) * took;
  vec3 hipsA = gA.root + vec3(0.0, 0.98, 0.0), hipsB = gB.root + vec3(0.0, 0.98, 0.0);
  vec3 headA = gA.root + vec3(weave * 0.1, 1.92 - 0.5 * sag, 0.0);
  vec3 headB = gB.root + vec3(0.0, 1.92, 0.0);
  // his big ones go for your head
  vec3 atYou = headB - hipsA + vec3(0.08, -0.02, 0.18);
  gA.gr = mix(gA.gr, atYou, hook);
  gA.gr = mix(gA.gr, atYou + vec3(-0.15, -0.2, 0.0), upper);
  // your punches go for his
  vec3 tl = headA + gA.head - hipsB;
  tl = vec3(-tl.x, tl.y + 0.22, -tl.z + 0.15);             // aimed high: the lean carries it down
  vec3 whiffTo = tl + vec3(weave * 0.6, 0.0, 0.0);
  vec3 bL = vec3(-0.2, 0.62, -0.32), bR = vec3(0.2, 0.62, -0.32);
  bL = mix(bL, vec3(-0.08, 0.75, -0.4), block); bR = mix(bR, vec3(0.08, 0.75, -0.4), block);
  // loading the star punch: the right glove drops low and back
  bR = mix(bR, vec3(0.3, 0.2, 0.15), load);
  vec3 aim = isWeave > 0.5 ? whiffTo : tl;
  if (side < 0.0) bL = mix(bL, aim, punch); else bR = mix(bR, aim, punch);
  bR = mix(bR, tl + vec3(0.0, -0.1, 0.0), star);           // the uppercut
  // and while he is down: a fist in the air on the beat
  bR = mix(bR, vec3(0.15, 1.05 + 0.05 * env(fract(KO), 0.0, 0.05, 0.05, 0.4), -0.1), gone * smoothstep(1.0, 2.0, KO));
  gB.gl = bL; gB.gr = bR;

  // --- the camera: over your shoulder, in on the kick, down to the canvas when he falls ---
  vec3 shake = vec3(hash22(vec2(floor(uTime * 40.0), 3.0)) - 0.5, 0.0) * (0.03 * uSnare + 0.04 * uKick * hitA + 0.12 * took + 0.2 * env(KO, 0.0, 0.03, 0.05, 0.4) * down);
  // the two of them centred in the frame; when he goes down, the camera follows his body down
  vec3 bodyA = botPoint(gA, vec3(0.0, 0.45, 0.0));
  vec3 ro = vec3(0.5 + 0.08 * sin(uTime * 0.3), 2.3 - 0.25 * tip, -3.15 + 0.3 * tip) + shake;
  vec3 ta = mix(vec3(-0.3, 1.5 - 0.25 * sag, 0.35), vec3(bodyA.x - 0.2, bodyA.y + 0.35, bodyA.z), tip);
  ro += normalize(ta - ro) * 0.18 * uKick;
  vec3 fw = normalize(ta - ro);
  vec3 rt = normalize(cross(vec3(0.0, 1.0, 0.0), fw));
  vec3 up = cross(fw, rt);
  vec3 rd = normalize(fw * 1.6 + rt * p.x + up * p.y);

  float tFloor = rd.y < 0.0 ? -ro.y / rd.y : 1e9;
  float tmax = min(tFloor, 16.0);
  float t = 0.05;
  vec2 hit = vec2(1e9, 0.0);
  bool found = false;
  // one loop, one copy of each robot: march to him (and the ring), take his normal's four
  // samples and his shade's, then march to yours and take its four - the robot's shape was
  // twelve copies when each was its own call, and the shader took many seconds to compile
  vec3 posA = vec3(0.0), nA = vec3(0.0), pb = vec3(0.0), nBv = vec3(0.0);
  float aoD = 0.0, tb = 0.05, partB = 0.0, tLimit = 0.0;
  bool onB = false;
  int phase = 0;            // 0 his march, 1-4 his normal, 5 his shade, 6 yours, 7-10 yours' normal
  int ia = 0, ib = 0;
  for (int i = 0; i < 190; i++) {
    bool his = phase <= 5;
    vec3 e = vec3(0.0);
    vec3 q = ro + rd * t;
    if (phase >= 1 && phase <= 4) { e = tapDir(phase - 1); q = posA + e * 0.002; }
    if (phase == 5) q = posA + nA * 0.08;
    if (phase == 6) q = ro + rd * tb;
    if (phase >= 7) { e = tapDir(phase - 7); q = pb + e * 0.002; }
    Bot B = gA;
    if (!his) B = gB;
    vec2 h = bot(q, B);
    if (his) h = opU(h, ring(q));
    if (phase == 0) {
      hit = h;
      ia++;
      if (h.x < 0.0012 * t) { found = true; posA = q; phase = 1; continue; }
      t += h.x;
      if (t > tmax || ia >= 96) { phase = 6; tLimit = tFloor < 16.0 ? tFloor : t; }
    } else if (phase <= 4) {
      nA += e * h.x;
      phase++;
      if (phase == 5) nA = normalize(nA);
    } else if (phase == 5) {
      aoD = h.x;
      phase = 6;
      tLimit = t;
    } else if (phase == 6) {
      ib++;
      if (h.x < 0.0012 * tb) { onB = true; pb = q; partB = h.y - 10.0; phase = 7; continue; }
      tb += h.x;
      if (tb > tLimit || ib >= 72) break;
    } else {
      nBv += e * h.x;
      phase++;
      if (phase == 11) break;
    }
  }

  vec3 key = vec3(1.0, 0.95, 0.88);
  vec3 lampK = vec3(0.4, 6.0, -1.2);
  // (the palette can dip below zero: never black)
  vec3 rimC = unblack(pal(0.7)); rimC /= max(max(rimC.r, rimC.g), max(rimC.b, 0.3));
  vec3 hue = unblack(pal(0.08)); hue /= max(max(hue.r, hue.g), max(hue.b, 0.3));
  vec3 col;
  if (found) {
    vec3 pos = posA;
    vec3 n = nA;
    float m = hit.y;
    float kind = floor(m / 10.0), part = m - kind * 10.0;
    vec3 base = vec3(0.6);
    float metal = 0.0, emit = 0.0, shin = 40.0;
    if (m > 20.5) {
      base = m < 21.5 ? vec3(0.9, 0.15, 0.2) : (m < 22.5 ? vec3(0.9) : (m < 23.5 ? vec3(0.2, 0.35, 1.0) : (m < 24.5 ? vec3(0.75) : hue * 0.8)));
      shin = 20.0;
    } else if (part < 1.5) {
      base = kind < 0.5 ? mix(vec3(0.55), hue, 0.7) : vec3(0.1, 0.3, 0.26);
      metal = 0.8; shin = 60.0;
    } else if (part < 2.5) {
      base = vec3(0.07, 0.07, 0.09); metal = 0.5;
    } else if (part < 3.5) {
      base = kind < 0.5 ? vec3(0.85, 0.1, 0.12) : vec3(0.15, 0.75, 0.35);
      shin = 30.0;
    } else {
      // the visor and the chest light: his flare white before a big one, and go dark when he is switched off
      float on = kind < 0.5 ? power : 1.0;
      vec3 vc = kind < 0.5 ? mix(vec3(1.0, 0.3, 0.2), vec3(1.0, 1.0, 0.7), tell) : vec3(0.3, 1.0, 0.5);
      if (part > 4.5) vc = kind < 0.5 ? rimC : vec3(0.3, 1.0, 0.5);
      base = mix(vec3(0.05), vc, on);
      emit = on * (part < 4.5 ? 1.5 + 4.0 * tell * (1.0 - kind) : 0.8 + 2.0 * uBass);
      metal = 0.4;
    }
    vec3 l = normalize(lampK - pos);
    float dif = max(dot(n, l), 0.0);
    float spe = pow(max(dot(n, normalize(l - rd)), 0.0), shin);
    float fre = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
    float ao = clamp(aoD / 0.08, 0.0, 1.0) * 0.6 + 0.4;
    vec3 rf = reflect(rd, n);
    vec3 env3 = vec3(0.55, 0.6, 0.8) * smoothstep(0.3, 1.0, rf.y) + vec3(0.25, 0.1, 0.2) * smoothstep(0.2, -0.4, rf.y);
    col = base * (0.12 + 0.08 * n.y + dif * 1.1 * key) * ao;
    col += key * spe * (0.4 + 0.8 * metal);
    col += env3 * base * metal * 0.7 * ao;
    col += rimC * fre * (0.35 + 0.5 * uPad) * ao;
    if (emit > 0.0) col = base * emit;
  } else if (tFloor < 16.0) {
    // the canvas, the apron, and beyond them the dark of the hall
    vec3 g = ro + rd * tFloor;
    vec2 a = abs(g.xz);
    if (max(a.x, a.y) < RING + 0.35) {
      col = vec3(0.1, 0.13, 0.3);
      float r = length(g.xz - vec2(0.0, 0.2));
      col = mix(col, hue * 0.5, (1.0 - smoothstep(0.02, 0.035, abs(r - 0.9))) * 0.8);
      col *= 0.55 + 0.9 * exp(-length(g.xz - vec2(0.2, -0.3)) * 0.45);
      if (max(a.x, a.y) > RING) col = vec3(0.05, 0.05, 0.08) + vec3(0.6) * (1.0 - smoothstep(0.0, 0.02, abs(max(a.x, a.y) - RING - 0.33)));
      // soft shadows under the two of them; his lies along his body as he goes down
      vec2 sa = g.xz - mix(gA.root.xz, botPoint(gA, vec3(0.0, 0.1, 0.0)).xz, tip);
      vec2 sc = g.xz - botPoint(gA, vec3(0.0, 0.8, 0.0)).xz;
      vec2 sb = g.xz - gB.root.xz;
      col *= 1.0 - 0.6 * exp(-dot(sa, sa) * 5.0);
      col *= 1.0 - 0.45 * exp(-dot(sc, sc) * 6.0) * tip;
      col *= 1.0 - 0.6 * exp(-dot(sb, sb) * 5.0);
    } else {
      col = crowd(vec2(atan(rd.x, rd.z) * 1.1, rd.y * 1.6 + 0.1), down) * 0.5;
    }
    t = tFloor;
  } else {
    col = crowd(vec2(atan(rd.x, rd.z) * 1.1, rd.y * 1.6 + 0.1), down);
  }
  // the spotlights' beams in the haze
  for (int k = 0; k < 3; k++) {
    vec3 la = vec3((float(k) - 1.0) * 2.2, 6.5, 1.5 + 0.5 * float(k));
    vec3 u = normalize(vec3(0.25 * sin(uTime * 0.5 + float(k) * 2.0), 0.0, 0.3) - la);
    col += vec3(0.9, 0.85, 1.0) * beam(ro, rd, t, la, u) * 0.09 * (0.6 + uPad);
  }

  // yours, in glass: lit at its edges and along scan lines, the gloves a little more solid
  // (marched with him above, in the same loop)
  if (onB && tb < t) {
    vec3 nb = normalize(nBv);
    float part = partB;
    float edge = pow(1.0 - abs(dot(nb, -rd)), 2.0);
    float lines = smoothstep(0.8, 1.0, abs(sin(pb.y * 55.0 - uTime * 2.0)));
    float lit = max(dot(nb, normalize(lampK - pb)), 0.0);
    vec3 green = vec3(0.3, 1.0, 0.5);
    float solid = part > 2.5 && part < 3.5 ? 0.45 : 0.18;
    col = col * (1.0 - solid) + green * (0.05 + 0.9 * edge + 0.22 * lines + 0.25 * lit) * (0.8 + 0.4 * uKick * hitA);
  }

  // what lands: a star where your punches hit, red when his gets through
  vec2 hs = toScreen(headA + gA.head, ro, fw, rt, up);
  float st = sdStar(rot(uTime * 3.0) * (p - hs), 0.12 * hitA, 8.0);
  col = mix(col, vec3(1.0, 0.95, 0.6), (1.0 - smoothstep(0.0, 0.01, st)) * step(0.2, hitA) * 1.2);
  col = mix(col, vec3(1.0, 0.1, 0.05), took * 0.35 * smoothstep(0.3, 1.0, length(p)));
  // his gloves pounding together: sparks between them
  vec2 gs = toScreen(hipsA + vec3(0.0, 0.64, -0.36), ro, fw, rt, up);
  col += vec3(1.0, 0.8, 0.4) * exp(-length(p - gs) * 30.0) * pound * 2.0;
  // the star punch: a burst of light and a flash over everything
  float sp = down * env(KO, 0.0, 0.02, 0.05, 0.6);
  float big = sdStar(rot(uTime * 2.0) * (p - toScreen(botPoint(gA, vec3(0.0, 0.94, 0.0) + gA.head), ro, fw, rt, up)), 0.3 * sp, 10.0);
  col = mix(col, vec3(1.0, 1.0, 0.8), (1.0 - smoothstep(0.0, 0.015, big)) * sp);
  col += vec3(1.0, 0.95, 0.85) * 0.5 * exp(-KO * 10.0) * down;
  // switched off: sparks spitting from his neck, a wisp of smoke
  vec3 neck = botPoint(gA, vec3(0.0, 0.76, -0.05));
  vec2 ns = toScreen(neck, ro, fw, rt, up);
  for (int k = 0; k < 5; k++) {
    float fk = float(k);
    float ph2 = fract(uTime * 1.7 + fk * 0.2);
    vec2 dir = vec2(cos(fk * 1.9 + floor(uTime * 1.7) * 3.0), 0.6 + sin(fk * 2.7)) * 0.25;
    vec2 pk = ns + dir * ph2 - vec2(0.0, 0.3 * ph2 * ph2);
    col += vec3(0.6, 0.85, 1.0) * exp(-length(p - pk) * 120.0) * (1.0 - ph2) * 2.0 * gone * step(1.0, KO);
  }
  vec2 hsm = toScreen(botPoint(gA, vec3(0.0, 0.94, 0.0)), ro, fw, rt, up);
  col += vec3(0.5) * 0.12 * fbm((p - hsm) * 6.0 - vec2(0.0, uTime * 0.6)) * exp(-length((p - hsm - vec2(0.0, 0.12)) * vec2(3.0, 1.5)) * 2.0) * gone * step(1.5, KO);

  // the count, up on the beats
  if (count > 0.5 && countN >= 1.0 && countN <= 8.0) {
    float pop = 1.0 + 0.5 * exp(-fract(KO) * 9.0);
    vec2 cq = (p - vec2(0.3, 0.16)) / (0.09 * pop);
    float dg = digit7(cq, int(countN));
    col = mix(col, vec3(1.0, 0.95, 0.4), dg * (1.0 - smoothstep(0.75, 1.0, fract(KO))));
  }

  // health, top right: his drains as the fight goes on and refills when he is up
  float hp1 = fighting * (1.0 - (K - 12.0) / 52.0) + rise;
  vec2 bp = p - vec2(0.55, 0.42);
  if (abs(bp.y) < 0.012 && abs(bp.x) < 0.3) col = (bp.x + 0.3) / 0.6 < hp1 ? vec3(1.0, 0.3, 0.25) : vec3(0.15, 0.05, 0.05);
  bp.y += 0.04;
  if (abs(bp.y) < 0.012 && abs(bp.x) < 0.3) col = (bp.x + 0.3) / 0.6 < 0.75 + 0.2 * sin(K * 0.3) ? vec3(0.3, 1.0, 0.45) : vec3(0.05, 0.15, 0.05);
  return col;
}
`;

const starfighter = `
// Starfighter: an on-rails run through space and low over a planet, in
// flat-shaded polygons as the first 3D console chips drew them. The game runs
// as a simulation (src/core/sims.js): flights of drones weave in, the ship
// slides over and turns its nose onto one - the two sights ahead of it show
// where it points - and fires its twin lasers along the nose on the eighths
// once the sights are on; two hits and the drone bursts. The drones come in
// from the far distance - over the planet, from just above the horizon - and
// shoot back on the backbeat; the ship slides out of the way of the shots it
// sees, and one that lands shakes the ship and flashes the screen once. The
// rings rush past on the bar.
uniform vec4 uShip;        // x, y, bank, yaw
uniform vec4 uAim;         // pitch, on target, how far the ship is drawn tipped towards us
uniform vec4 uDrones[8];   // x, y, z (0: none), id (+0.5 just hit)
uniform vec4 uBolts[16];   // x, y, z, kind (0 none, 1 ours, 2 theirs)
uniform vec4 uBoltDir[16];
uniform vec4 uSBooms[6];   // x, y, z, seconds since
uniform vec4 uTarget;      // the locked drone, and whether there is one
uniform vec4 uStarFx;      // since we were hit, kills, (unused), since a kill
const float FL = 1.4;
const float CAM_PITCH = 0.22;    // the camera rides above and behind the ship, looking down a little
vec2 proj(vec3 v) { v.yz = rot(CAM_PITCH) * v.yz; return v.xy / v.z * FL; }
float edgeFn(vec2 a, vec2 b, vec2 p) { return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x); }
// one flat-shaded face, if it is nearer than what is already there
void face(vec2 p, vec3 a, vec3 b, vec3 c, vec3 base, inout vec3 col, inout float zb) {
  if (min(a.z, min(b.z, c.z)) < 0.2) return;
  vec2 A = proj(a), B = proj(b), C = proj(c);
  float e0 = edgeFn(A, B, p), e1 = edgeFn(B, C, p), e2 = edgeFn(C, A, p);
  if (!((e0 >= 0.0 && e1 >= 0.0 && e2 >= 0.0) || (e0 <= 0.0 && e1 <= 0.0 && e2 <= 0.0))) return;
  float z = (a.z + b.z + c.z) / 3.0;
  if (z > zb) return;
  zb = z;
  vec3 n = normalize(cross(b - a, c - a));
  if (n.z > 0.0) n = -n;
  col = base * (0.25 + 0.85 * max(dot(n, normalize(vec3(-0.4, 0.7, -0.6))), 0.0));
}
// the drone's five faces, by its corners: the red top, the grey underside, the fin
const ivec3 DRONE_F[5] = ivec3[5](ivec3(0, 1, 3), ivec3(0, 3, 2), ivec3(0, 4, 1), ivec3(0, 2, 4), ivec3(3, 5, 4));
// the ship's corners: the nose, the canopy's peak, the back left and right, the belly and the
// spine at the back, the wings' roots and tips, the fins' tops and bottoms, the engine
const vec3 SHIP_V[15] = vec3[15](vec3(0.0, -0.02, 0.75), vec3(0.0, 0.17, -0.05), vec3(-0.17, 0.0, -0.4),
  vec3(0.17, 0.0, -0.4), vec3(0.0, -0.11, -0.4), vec3(0.0, 0.1, -0.45), vec3(-0.12, -0.02, 0.15),
  vec3(0.12, -0.02, 0.15), vec3(-0.82, -0.08, -0.38), vec3(0.82, -0.08, -0.38), vec3(-0.5, 0.62, -0.62),
  vec3(0.5, 0.62, -0.62), vec3(-0.74, -0.07, -0.26), vec3(0.74, -0.07, -0.26), vec3(0.0, 0.0, -0.46));
// its twelve faces, and their colours: the white body shaded round, the wings, the blue fins
const ivec3 SHIP_F[12] = ivec3[12](ivec3(0, 1, 2), ivec3(0, 3, 1), ivec3(1, 5, 2), ivec3(1, 3, 5), ivec3(0, 2, 4),
  ivec3(0, 4, 3), ivec3(2, 5, 4), ivec3(3, 4, 5), ivec3(6, 8, 2), ivec3(7, 3, 9), ivec3(12, 10, 8), ivec3(13, 9, 11));
const vec3 SHIP_C[12] = vec3[12](vec3(0.88, 0.9, 0.95), vec3(0.88, 0.9, 0.95), vec3(0.88, 0.9, 0.95) * 0.85,
  vec3(0.88, 0.9, 0.95) * 0.85, vec3(0.88, 0.9, 0.95) * 0.6, vec3(0.88, 0.9, 0.95) * 0.6, vec3(0.88, 0.9, 0.95) * 0.45,
  vec3(0.88, 0.9, 0.95) * 0.45, vec3(0.78, 0.8, 0.86), vec3(0.78, 0.8, 0.86), vec3(0.25, 0.42, 1.0), vec3(0.25, 0.42, 1.0));
// a point on the ship, as the simulation places its guns: roll, pitch, yaw, then scale and place
vec3 shipPt(vec3 v, vec3 at) {
  v.xy = rot(uShip.z) * v.xy;
  v.yz = rot(uAim.z + uAim.x) * v.yz;
  v.xz = rot(uShip.w) * v.xz;
  return v * 0.36 + at;
}

vec3 render(vec2 p, vec2 uv) {
  float spb = max(uSpb, 0.2);
  float b = uTime / spb;
  float section = mod(floor(uBarIndex / 8.0), 2.0);
  // the ship flies where the game says; the camera follows, a little behind
  vec2 sxy = uShip.xy;
  float hurt = exp(-uStarFx.x * 5.0);
  vec2 cam = vec2(sxy.x * 0.45, 0.165 + (sxy.y + 0.4) * 0.45);
  vec2 sp = p + cam + (hash22(vec2(floor(uTime * 30.0), 1.0)) - 0.5) * (0.015 * uKick + 0.06 * hurt);
  sp *= 1.0 - 0.05 * uKick;

  vec3 col;
  float horizon = tan(CAM_PITCH) * FL;          // where level flight meets the sky, for a camera looking down
  if (section < 0.5) {
    // deep space: a nebula and stars streaking past
    col = vec3(0.01, 0.005, 0.03) + pal(0.75) * 0.12 * fbm(sp * 1.8 + vec2(uTime * 0.03, 0.0));
    // Each star is a short streak. It is born far off and fades out before it gets near the
    // camera: closer than that its streak would project across the whole screen.
    float warp = 1.0 + 5.0 * max(0.0, 1.0 - (uBar + mod(uBarIndex, 8.0)) * 2.0) * step(0.5, 1.0 - mod(uBarIndex, 8.0));
    for (int i = 0; i < 48; i++) {
      float fi = float(i);
      vec2 h = hash22(vec2(fi, 11.0)) - 0.5;
      float z = 1.6 + 8.4 * fract(hash11(fi * 1.3) - uTime * 0.35);
      vec3 a = vec3(h * 6.0, z), c = vec3(h * 6.0, z + (0.12 + 0.45 * uEnergy) * warp * warp);
      float fade = smoothstep(1.6, 2.6, z) * smoothstep(10.0, 8.5, z);
      col += vec3(0.8, 0.85, 1.0) * (1.0 - smoothstep(0.0, 0.004 + 0.006 / z, sdSeg(sp, proj(a), proj(c)))) * fade;
    }
  } else {
    // low over a planet: sky, a horizon, fields rushing under you
    // a blue day with white clouds, as the green planet's; some seeds fly the orange desert's dusk
    bool dusk = uSeed.z > 0.7;
    col = dusk ? mix(vec3(0.95, 0.5, 0.3), vec3(0.55, 0.2, 0.25), smoothstep(horizon, horizon + 0.5, sp.y))
               : mix(vec3(0.62, 0.78, 0.95), vec3(0.25, 0.45, 0.85), smoothstep(horizon, horizon + 0.5, sp.y));
    float cloud = fbm(vec2(sp.x * 2.5 + uTime * 0.05 + sxy.x * 0.3, sp.y * 7.0));
    col = mix(col, vec3(1.0), smoothstep(0.55, 0.7, cloud) * smoothstep(horizon + 0.05, horizon + 0.2, sp.y) * 0.85);
    if (sp.y < horizon) {
      // the ground: a plain of green (or sand) with small dots rushing under you
      float depth = 0.25 / (horizon - sp.y);
      vec2 g = vec2(sp.x * depth * 2.0, depth + uTime * 6.0);
      vec3 ground = dusk ? vec3(0.62, 0.4, 0.2) : vec3(0.2, 0.5, 0.32);
      ground *= 0.9 + 0.1 * smoothstep(0.0, 1.0, horizon - sp.y);
      vec2 dq = fract(g) - 0.5;
      float dotm = step(length(dq * vec2(1.0, 2.0)), 0.06) * step(0.6, hash12(floor(g) + 7.0));
      ground = mix(ground, ground * 1.6 + 0.1, dotm);
      col = mix(col, ground, exp(-depth * 0.04));
    }
    // a range of snowy mountains along the horizon, drifting as the ship slides
    float mx = sp.x * 3.0 + sxy.x * 0.6;
    float ridge = horizon + 0.07 + 0.05 * abs(sin(mx * 1.3 + 1.0)) + 0.03 * abs(sin(mx * 3.1 + 2.0));
    if (sp.y > horizon && sp.y < ridge) {
      col = mix(vec3(0.45, 0.5, 0.6), vec3(0.95, 0.96, 1.0), smoothstep(ridge - 0.035, ridge - 0.005, sp.y));
      col *= 0.85 + 0.15 * step(0.0, sin(mx * 6.0 + sp.y * 40.0));   // the sunny and the shaded side
    }
  }
  // (a new sector stretches the stars into a warp: no flash of the whole screen)

  // a ring to fly through on every second bar
  float rz = 26.0 - 25.0 * fract(b / 8.0);
  if (section < 0.5) {
    float rr = length(sp - proj(vec3(0.0, -0.1, rz)));
    float ringR = 1.1 * FL / rz;
    col += vec3(1.0, 0.8, 0.3) * exp(-abs(rr - ringR) * (40.0 + 200.0 / rz)) * (0.6 + uStab) * min(1.0, 4.0 / rz) * smoothstep(1.2, 2.5, rz);
  } else if (rz > 1.2) {
    // an arch: two pillars standing on the ground and a lintel across, in flat grey stone
    vec2 c = proj(vec3(0.0, -0.1, rz));
    float u = FL / rz;
    vec2 q = sp - c;
    float pillars = max(abs(abs(q.x) - 1.0 * u) - 0.12 * u, q.y - 0.75 * u);
    float lintel = max(abs(q.x) - 1.12 * u, abs(q.y - 0.75 * u) - 0.12 * u);
    float arch = min(pillars, lintel);
    if (arch < 0.0 && sp.y > horizon - 0.25 / max(rz, 0.5) - 0.002) {
      col = mix(vec3(0.55, 0.57, 0.62), vec3(0.8, 0.82, 0.88), step(0.0, q.x)) * (0.85 + 0.25 * uStab);
      col = mix(col, vec3(0.9, 0.3, 0.3), step(abs(q.y - 0.75 * u), 0.04 * u) * step(abs(q.x), 1.12 * u));   // a red band
    }
  }

  // over the planet the ship's shadow runs on the ground beneath it
  if (section > 0.5) {
    vec2 sc = proj(vec3(sxy, 1.6)) + vec2(0.0, -0.17);
    col *= 1.0 - 0.4 * smoothstep(1.0, 0.5, length((sp - sc) / vec2(0.16, 0.03)));
  }
  // the drones: red delta-wing fighters; a hit makes them flash
  vec3 obj = col;
  float zb = 1e9;
  for (int i = 0; i < 8; i++) {
    vec4 dr = uDrones[i];
    if (dr.z < 0.5) continue;
    vec2 c = proj(dr.xyz);
    if (length(sp - c) > 0.9 * FL / dr.z + 0.01) continue;
    float id = floor(dr.w);
    // a delta-wing fighter coming at us, nose first, banking as it weaves
    float sz = 0.6;
    mat2 R2 = rot(0.5 * sin(uTime * 1.7 + id));
    vec3 P[6];
    P[0] = vec3(0.0, 0.0, -sz);                 // the nose, towards us
    P[1] = vec3(-sz, -0.05, sz * 0.55);         // the wing tips
    P[2] = vec3(sz, -0.05, sz * 0.55);
    P[3] = vec3(0.0, sz * 0.32, sz * 0.5);      // the spine, rising to the tail
    P[4] = vec3(0.0, -sz * 0.12, sz * 0.45);    // the belly
    P[5] = vec3(0.0, sz * 0.5, sz * 0.75);      // the fin
    for (int j = 0; j < 6; j++) { P[j].xy = R2 * P[j].xy; P[j] += dr.xyz; }
    vec3 red = mix(vec3(0.85, 0.15, 0.2), pal(id * 0.13), 0.15);
    vec3 grey = vec3(0.6, 0.62, 0.68);
    // far off they come out of the haze: the sky at the horizon over the planet, the dark in space
    vec3 haze = section > 0.5 ? (uSeed.z > 0.7 ? vec3(0.95, 0.5, 0.3) : vec3(0.62, 0.78, 0.95)) : vec3(0.02, 0.01, 0.05);
    float far = smoothstep(20.0, 33.0, dr.z);
    red = mix(red, haze, far); grey = mix(grey, haze, far);
    if (fract(dr.w) > 0.25) { red = vec3(1.0, 0.95, 0.8) * 1.5; grey = red; }
    for (int f = 0; f < 5; f++) {
      ivec3 tri = DRONE_F[f];
      vec3 base = red;
      if (f >= 2) base = grey * 0.7;
      if (f == 4) base = grey;
      face(sp, P[tri.x], P[tri.y], P[tri.z], base, obj, zb);
    }
    obj += vec3(1.0, 0.4, 0.3) * exp(-length(sp - c) * dr.z * 18.0) * (0.35 + uLead);
  }
  // bursts: a flash, a ring of fire, shards flying out
  for (int i = 0; i < 6; i++) {
    vec4 bm = uSBooms[i];
    if (bm.w > 1.2 || bm.z < 0.5) continue;
    float z = bm.z - 9.0 * bm.w;               // still rushing at us as it comes apart
    if (z < 0.6) continue;
    vec2 c = proj(vec3(bm.xy, z));
    float r = length(sp - c);
    float age = bm.w;
    obj += vec3(1.0, 0.7, 0.3) * exp(-abs(r - age * 3.0 / z * FL) * 50.0) * max(0.0, 1.0 - age * 2.0) * 2.0;
    obj += vec3(1.0, 0.95, 0.8) * exp(-r * z * 1.6) * max(0.0, 1.0 - age * 4.0) * 3.0;
    for (int k = 0; k < 7; k++) {
      float fk = float(k);
      float an = fk * 0.9 + hash11(fk + bm.x * 7.0) * 0.8;
      vec2 dir = vec2(cos(an), sin(an));
      vec2 s0 = c + dir * age * (1.2 + hash11(fk * 3.0)) * FL / z;
      float shard = sdSeg(sp, s0, s0 + rot(age * 9.0 + fk) * vec2(0.18 / z, 0.0));
      obj += vec3(1.0, 0.6, 0.25) * (1.0 - smoothstep(0.0, 0.004, shard)) * max(0.0, 1.0 - age * 1.2) * 1.5;
    }
  }

  // the lasers: ours fly along the nose from the wing guns; theirs come at us.
  // A trail never reaches back past where its bolt was fired.
  for (int j = 0; j < 16; j++) {
    vec4 bt = uBolts[j];
    if (bt.w < 0.5 || bt.z < 0.35) continue;
    if (bt.w > 1.5 && bt.w < 2.5 && bt.z < 1.4) continue;      // theirs, once past the ship
    vec3 tail = bt.xyz - uBoltDir[j].xyz * min(bt.w > 1.5 ? 0.6 : 1.6, uBoltDir[j].w);
    if (tail.z < 0.35) continue;
    float d = sdSeg(sp, proj(bt.xyz), proj(tail));
    float near = min(1.0, 6.0 / bt.z);
    vec3 lc = bt.w < 1.5 ? vec3(0.3, 1.0, 0.4) : (bt.w < 2.5 ? vec3(1.0, 0.35, 0.2) : vec3(1.0, 0.9, 0.4));
    float w = 0.004 + 0.03 / bt.z;
    obj += lc * (1.0 - smoothstep(0.0, w, d)) * 1.5 * near;
    obj += lc * exp(-d * 70.0) * 0.6 * near * (0.6 + uArp);
  }

  // the target: thin brackets while the nose comes round, bright once it is on
  float onT = uAim.y;
  vec3 lockC = mix(vec3(0.4, 1.0, 0.5), vec3(1.0, 0.85, 0.2), onT);
  if (uTarget.w > 0.5 && uTarget.z > 0.8) {
    vec2 c = proj(uTarget.xyz);
    float r = 0.75 * FL / uTarget.z + 0.02 + 0.01 * uHat * onT;
    vec2 q = abs(sp - c);
    float br = max(abs(max(q.x, q.y) - r), 0.0);
    float corner = step(r * 0.55, min(q.x, q.y));
    obj += lockC * (1.0 - smoothstep(0.001, 0.003 + 0.002 * onT, br)) * corner * (0.45 + 0.6 * onT);
  }
  // the sights: two squares ahead of the nose, along the line the lasers will fly
  vec3 at = vec3(sxy, 1.6);
  vec3 aim = vec3(sin(uShip.w) * cos(uAim.x), sin(uAim.x), cos(uShip.w) * cos(uAim.x));
  for (int k = 0; k < 2; k++) {
    vec3 c3 = at + aim * (k == 0 ? 5.0 : 10.0);
    vec2 c = proj(c3);
    float r = (k == 0 ? 0.32 : 0.26) * FL / c3.z;
    vec2 q = abs(sp - c);
    float sq = abs(max(q.x, q.y) - r);
    float gap = 1.0 - step(min(q.x, q.y), r * 0.25);      // a gap in the middle of each side
    obj += lockC * (1.0 - smoothstep(0.0015, 0.004, sq)) * gap * 0.85;
  }

  // the ship: a handful of flat-shaded faces
  // the body: long and white, a canopy on top, wider at the back where the engine is
  // (its corners and faces come from the tables above: one transform, one face routine)
  vec3 V[15];
  for (int i = 0; i < 15; i++) V[i] = shipPt(SHIP_V[i], at);
  for (int f = 0; f < 12; f++) {
    ivec3 tri = SHIP_F[f];
    face(sp, V[tri.x], V[tri.y], V[tri.z], SHIP_C[f], obj, zb);
  }
  vec3 TL = V[14];
  // the engine
  vec2 ep = proj(TL);
  obj += vec3(0.3, 0.6, 1.0) * exp(-length(sp - ep) * (60.0 - 25.0 * uBass)) * (1.2 + uBass);
  // a shot that lands: one quick flash of the screen (a single one, never a strobe), the edges
  // flaring red as it fades, while the ship shudders and the camera jolts
  obj = mix(obj, vec3(1.0, 0.95, 0.9), 0.5 * exp(-uStarFx.x * 18.0));
  obj = mix(obj, vec3(1.0, 0.15, 0.1), hurt * 0.45 * smoothstep(0.35, 0.9, length(p)));

  // the shield, bottom left: it drops when a shot lands and charges back; the kills, top right
  vec2 sb = p - vec2(-0.78, -0.31);    // above the scroller
  float shield = 1.0 - 0.45 * exp(-uStarFx.x * 0.5);
  if (sb.x > 0.0 && sb.x < 0.3 && abs(sb.y) < 0.018) {
    obj = mix(obj, vec3(0.05), 0.6);
    if (sb.x < 0.3 * shield && abs(sb.y) < 0.011) obj = vec3(0.95, 0.18, 0.12) * (0.75 + 0.25 * shield);
  }
  obj += vec3(0.8) * smoothstep(0.003, 0.0, abs(max(abs(sb.x - 0.15) - 0.15, abs(sb.y) - 0.018)));
  vec2 kq = (p - vec2(0.62, 0.36)) / 0.04;
  if (kq.x > 0.0 && kq.x < 4.1 && kq.y > 0.0 && kq.y < 2.0) {
    float slot = floor(kq.x / 1.4);
    int d = int(mod(floor(uStarFx.y / pow(10.0, 2.0 - slot)), 10.0));
    vec2 cq = vec2(fract(kq.x / 1.4) * 1.4, kq.y);
    if (cq.x < 1.0) obj = mix(obj, vec3(1.0, 0.85, 0.3), digit7(cq, d));
  }
  return obj;
}
`;

/**
 * Put a game scene on the stage. A game's screen floats as a board; a game that
 * is a device of its own (object) floats as that device, and the game sets
 * stageMask to its outline so space shows round it.
 */
function staged(src, tilt, yaw, object = false) {
  if (!src.includes('vec3 render(vec2 p, vec2 uv) {')) throw new Error('staged: no render()');
  return 'float stageMask = 1.0;\n'
    + src.replace('vec3 render(vec2 p, vec2 uv) {', 'vec3 game(vec2 p, vec2 uv) {')
    + `\n#define STAGE_TILT ${tilt.toFixed(3)}\n#define STAGE_YAW ${yaw.toFixed(3)}\n`
    + (object ? '#define STAGE_OBJECT\n' : '') + STAGE;
}

const STAGE = `
// ---- the stage ------------------------------------------------------------
// The game above is drawn on a board floating in space (a game that is a device
// of its own floats as that device), and the camera rides the music round it: a new angle every eight bars, eased in over the first,
// a punch in on the kick, a lean on the snare, the board's frame breathing
// with the bass.
vec3 game(vec2 p, vec2 uv);

float stageHash(float n) { return hash11(n * 7.31 + uSeed.w * 13.0); }

vec3 stageBackdrop(vec3 rd) {
  vec3 c = mix(vec3(0.004, 0.004, 0.02), vec3(0.025, 0.01, 0.05), rd.y * 0.5 + 0.5);
  vec2 sp = vec2(atan(rd.x, -rd.z), asin(clamp(rd.y, -1.0, 1.0)));
  vec2 g = sp * 55.0;
  vec2 id = floor(g), f = fract(g) - 0.5;
  float h = hash12(id + uSeed.xy * 17.0);
  if (h > 0.92) c += vec3(0.6, 0.7, 1.0) * (1.0 - smoothstep(0.0, 0.09 + 0.06 * uHat, length(f))) * (h - 0.92) * 12.0;
  c += pal(0.8) * 0.07 * fbm(sp * 2.5 + vec2(uTime * 0.02, 0.0));
  return c;
}

vec3 render(vec2 p, vec2 uv) {
  float sec = (uBarIndex + uBar) / 8.0;
  float s0 = floor(sec);
  float e = smoothstep(0.0, 0.125, fract(sec));
  float yaw = mix((stageHash(s0 - 1.0) - 0.5) * 2.0, (stageHash(s0) - 0.5) * 2.0, e) * STAGE_YAW
            + 0.07 * sin(uTime * 0.37);
  float tilt = mix(mix(-0.35, 1.0, stageHash(s0 + 30.0)), mix(-0.35, 1.0, stageHash(s0 + 31.0)), e) * STAGE_TILT
             + 0.04 * sin(uTime * 0.23);
  float dist = 1.78 - 0.16 * uKick - 0.05 * uBass + 0.07 * sin(uTime * 0.19);
  float roll = 0.05 * sin(uTime * 0.29) + 0.035 * uSnare * (mod(uBarIndex, 2.0) * 2.0 - 1.0);

  vec3 ro = dist * vec3(sin(yaw) * cos(tilt), -sin(tilt), cos(yaw) * cos(tilt));
  vec3 fw = normalize(-ro);
  vec3 rt = normalize(cross(fw, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(rt, fw);
  vec2 q = rot(roll) * p;
  vec3 rd = normalize(fw * 1.55 + rt * q.x + up * q.y);

#ifdef STAGE_OPAQUE
  // (a game that declares itself opaque: what the board covers needs no sky behind it)
  vec2 cover = abs((ro - rd * ro.z / rd.z).xy) - vec2(0.9, 0.5);
  vec3 col = rd.z >= 0.0 || max(cover.x, cover.y) >= 0.0 ? stageBackdrop(rd) : vec3(0.0);
#else
  vec3 col = stageBackdrop(rd);
#endif
  if (rd.z >= 0.0) return col;
  float tp = -ro.z / rd.z;
  vec2 bq = (ro + rd * tp).xy;
  vec2 edge = abs(bq) - vec2(0.9, 0.5);
  float de = max(edge.x, edge.y);
  if (de < 0.0) {
    vec3 g = game(bq, bq / vec2(1.8, 1.0) + 0.5);
    // a sheen sweeps the glass once a bar
    float sweep = fract(uBar) * 3.0 - 1.5;
    g += vec3(0.6, 0.7, 1.0) * exp(-abs(bq.x * 0.6 + bq.y - sweep) * 16.0) * 0.05 * (0.4 + uPad);
    col = mix(col, g * exp(-max(tp - dist, 0.0) * 0.3), stageMask);
  }
#ifndef STAGE_OBJECT
  vec3 rim = pal(0.55 + 0.1 * sin(uTime * 0.2));
  rim = unblack(rim);                                 // (the palette can dip below zero: never black)
  rim /= max(max(rim.r, rim.g), max(rim.b, 0.3));
  col += rim * (1.0 - smoothstep(0.0, 0.007, abs(de - 0.004))) * (0.8 + uBass);
  if (de > 0.0) col += rim * exp(-de * 8.0) * 0.22 * (0.5 + uBass);    // light spilling past the frame
#endif
  return col;
}
`;

const about = `
// The About part: everything at once, on purpose. A checkerboard tunnel
// spinning behind sweeping raster bars, radial bursts on every kick.
vec3 render(vec2 p, vec2 uv) {
  float t = uTime;
  float r = length(p);
  float a = atan(p.y, p.x);

  vec2 tc = vec2(a / PI * 3.0 + t * 0.45, 0.42 / (r + 0.05) + t * 2.6);
  float chk = mod(floor(tc.x * 2.0) + floor(tc.y * 2.0), 2.0);
  vec3 col = mix(pal(t * 0.15), pal(t * 0.15 + 0.5), chk) * smoothstep(0.0, 0.65, r) * 0.5;

  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float y = sin(t * 1.7 + fi * 1.25) * 0.42;
    float h = 0.03 + 0.012 * sin(t * 3.0 + fi);
    float d = abs(p.y - y);
    if (d < h) {
      float g = 1.0 - d / h;
      col = mix(col, pal(fi * 0.2 + t * 0.3) * (0.3 + g * g * 1.1), 0.9);
    }
  }

  col += pal(t * 0.4 + 0.3) * pow(abs(sin(a * 12.0 + t * 6.0)), 20.0)
       * uKick * smoothstep(0.1, 0.9, r) * 0.8;
  col += vec3(1.0) * uKick * 0.1 + pal(t) * uSnare * 0.1;
  return col;
}
`;

const cascade = `
uniform vec4 uCA[52];     // each card thrown: when, its pile, its speed across, which card
uniform vec4 uCB[52];     // and how: thrown up or down, its bounce, its first landing (beats)
uniform vec4 uPiles;      // the card on top of each pile, -1 for none
uniform vec4 uCasc;       // cards thrown so far, gravity, the drop from a pile, the beat the phrase began on
uniform vec4 uBeats[32];  // each beat of the phrase: how hard the kick and the snare hit, how busy the music

// The card game's own pixels: a card is 71 x 96, the table 436 high and as wide
// as the screen; copies are drawn 24 steps a beat.
const float CW = 71.0, CH = 96.0, TH = 436.0, STEPS = 24.0;

// card indices in a 5x7 font: A 2 3 4 5 6 7 8 9 1 0 J Q K
const ivec2 RANKS[14] = ivec2[14](ivec2(1033774, 17969), ivec2(279086, 31812), ivec2(475663, 15888),
  ivec2(305544, 8479), ivec2(539711, 14896), ivec2(492620, 14897), ivec2(139807, 2114), ivec2(476718, 14897),
  ivec2(1001006, 6416), ivec2(135364, 14468), ivec2(714286, 14899), ivec2(270620, 6440), ivec2(575022, 22837),
  ivec2(103729, 17701));

float glyph(vec2 g, int i) {
  if (g.x < 0.0 || g.y < 0.0 || g.x >= 5.0 || g.y >= 7.0) return 0.0;
  int x = int(g.x), y = int(g.y);
  int m = 0, b = 0;
  if (y < 4) { m = RANKS[i].x; b = y * 5 + x; } else { m = RANKS[i].y; b = (y - 4) * 5 + x; }
  return float((m >> b) & 1);
}

// the suits, about 2 tall, y up; inside below 0
float sdHeart(vec2 s) {           // point down at y = -1
  vec2 a = vec2(abs(s.x), s.y);
  float lobe = length(a - vec2(0.45, 0.38)) - 0.52;
  float tri = max(a.x * 0.95 - 0.95 * (s.y + 1.0) / 1.3, max(s.y - 0.4, -1.0 - s.y)) * 0.8;
  return min(lobe, tri);
}
float sdStem(vec2 s) {
  float w = 0.08 + 0.32 * pow(clamp((-0.25 - s.y) / 0.75, 0.0, 1.0), 2.0);
  return max(abs(s.x) - w, max(-1.0 - s.y, s.y + 0.2));
}
// 0 spades, 1 hearts, 2 clubs, 3 diamonds
float sdSuit(vec2 s, int suit) {
  if (suit == 3) return (abs(s.x) * 1.35 + abs(s.y) - 1.0) * 0.6;
  if (suit == 1) return sdHeart(s);
  if (suit == 0) {
    float body = sdHeart(vec2(s.x * 1.12, -(s.y - 0.3) * 1.3)) / 1.3;
    return min(body, sdStem(s));
  }
  float c = min(length(s - vec2(0.0, 0.48)), min(length(s - vec2(-0.47, -0.08)), length(s - vec2(0.47, -0.08)))) - 0.4;
  return min(c, sdStem(s));
}

// a pip centred at c (card pixels), half as tall as hs; those below the middle upside down
float pipAt(vec2 l, vec2 c, float hs, int suit) {
  vec2 s = (l - c) / hs;
  s.y = -s.y;
  if (c.y > 48.5) s = -s;
  return sdSuit(s, suit) * hs;
}

// where pip i of a card of n pips sits (z: whether it is there), in the cards' own layout
vec3 pipCentre(int n, int i) {
  float L = 19.0, C = 35.5, R = 52.0;
  float side = (i - (i / 2) * 2) == 0 ? L : R;
  if (n >= 9) {
    if (i < 8) return vec3(side, 20.0 + float(i / 2) * 18.67, 1.0);
    if (i == 8 && n == 9) return vec3(C, 48.0, 1.0);
    if (i == 8) return vec3(C, 29.3, 1.0);
    if (i == 9 && n == 10) return vec3(C, 66.7, 1.0);
    return vec3(0.0);
  }
  if (n >= 4) {
    if (i < 2) return vec3(side, 20.0, 1.0);
    if (i < 4) return vec3(side, 76.0, 1.0);
    if (i < 6) return vec3(side, 48.0, n >= 6 ? 1.0 : 0.0);
    if (i == 6 && n == 5) return vec3(C, 48.0, 1.0);
    if (i == 6 && n >= 7) return vec3(C, 34.0, 1.0);
    if (i == 7 && n == 8) return vec3(C, 62.0, 1.0);
    return vec3(0.0);
  }
  if (i == 0) return vec3(C, 20.0, 1.0);
  if (i == 1) return vec3(C, 76.0, 1.0);
  if (i == 2 && n == 3) return vec3(C, 48.0, 1.0);
  return vec3(0.0);
}



// a court card's picture, in pixels from the frame's middle, the lower half the upper turned round
vec3 court(vec2 f, int rank, int suit, vec3 ink, float aa, float sp) {
  if (f.y > 0.0) f = -f;
  vec3 col = vec3(1.0);
  float line = 1e3;
  // the robe: bands across the shoulders
  if (f.y > -19.0) {
    float band = floor((f.x * 0.55 - f.y) / 5.0);
    float m = mod(band + float(rank), 4.0);
    if (m < 1.0) col = vec3(0.86, 0.1, 0.1);
    else if (m < 2.0) col = vec3(1.0, 0.85, 0.15);
    else if (m < 3.0) col = vec3(0.1, 0.25, 0.75);
    else col = vec3(1.0, 0.85, 0.15);
    line = min(line, (0.5 - abs(fract((f.x * 0.55 - f.y) / 5.0) - 0.5)) * 5.0);
  }
  // the head and its hair
  vec2 hc = f - vec2(1.5, -25.5);
  float head = length(hc * vec2(1.0, 0.85)) - 6.0;
  if (abs(hc.x) < 8.5 && hc.y > -5.0 && hc.y < 4.0 && head > 0.0) { col = vec3(1.0, 0.85, 0.15); line = min(line, abs(abs(hc.x) - 8.5)); }
  if (head < 0.0) {
    col = vec3(1.0, 0.88, 0.62);
    if (length(vec2(abs(hc.x) - 2.3, hc.y + 1.0)) < 0.9) col = vec3(0.0);
    if (abs(hc.y - 2.6) < 0.5 && abs(hc.x) < 1.8) col = vec3(0.8, 0.1, 0.1);
  }
  line = min(line, abs(head));
  // the king's crown, the queen's coronet, the jack's cap
  vec2 cc = f - vec2(1.5, -33.5);
  if (rank == 12) {
    float spikes = abs(fract(cc.x / 4.0) - 0.5) * 4.0;
    if (abs(cc.x) < 7.0 && cc.y < 2.5 && cc.y > -1.5 - (2.0 - spikes) * 1.2) col = vec3(1.0, 0.85, 0.15);
  } else if (rank == 11) {
    if (length(cc * vec2(1.0, 1.6)) < 6.5 && cc.y < 2.5) col = vec3(1.0, 0.85, 0.15);
    if (length(cc - vec2(0.0, -1.0)) < 1.4) col = vec3(0.8, 0.1, 0.1);
  } else {
    if (abs(cc.x) < 8.0 && cc.y > -2.5 && cc.y < 2.5) col = vec3(0.8, 0.1, 0.1);
    if (abs(cc.x) < 8.0 && abs(cc.y - 1.8) < 0.8) col = vec3(1.0, 0.85, 0.15);
  }
  // the suit, beside the head (its distance worked out by the card face)
  if (sp < 0.0) col = ink;
  // the sceptre or the sword
  if (rank != 11) {
    float st = sdSeg(f, vec2(13.5, -36.0), vec2(16.5, -4.0));
    if (st < 1.0) col = vec3(1.0, 0.85, 0.15);
    line = min(line, abs(st - 1.0));
  }
  // where the two halves meet
  line = min(line, abs(f.y + 0.3));
  col = mix(col, vec3(0.0), (1.0 - smoothstep(0.35 - aa, 0.35 + aa, line)) * 0.9);
  return col;
}

// a card, in its own pixels from its top left corner
vec3 cardFace(vec2 l, float fid, float aa) {
  int id = int(fid + 0.5);
  int suit = id / 13, rank = id - suit * 13;
  vec3 ink = vec3(0.0);
  if (suit == 1 || suit == 3) ink = vec3(1.0, 0.0, 0.0);
  if (l.x < 1.0 || l.y < 1.0 || l.x > CW - 1.0 || l.y > CH - 1.0) return vec3(0.0);
  // the index in two corners, the second upside down
  vec2 c = l;
  if (l.y > 48.0) c = vec2(CW, CH) - l;
  float idx = 0.0;
  if (rank == 9) {
    idx = max(glyph(vec2((c.x - 1.5) / 1.1, (c.y - 4.0) / 1.3), 9), glyph(vec2((c.x - 6.2) / 1.1, (c.y - 4.0) / 1.3), 10));
  } else {
    int g = rank;
    if (rank > 9) g = rank + 1;
    idx = glyph((c - vec2(3.0, 4.0)) / 1.3, g);
  }
  // the one suit shape this point can be on: the corner's small one, the ace's, the
  // nearest pip, or the court card's beside the head
  bool corner = c.x < 11.5 && c.y < 24.0;
  vec2 f = l - vec2(35.5, 48.0);
  vec2 sq;
  float sc;
  if (corner) {
    sq = vec2(c.x - 6.3, -(c.y - 18.5)) / 3.4; sc = 3.4;
  } else if (rank == 0) {
    sc = suit == 0 ? 14.0 : 10.0;
    sq = vec2(f.x, -f.y) / sc;
  } else if (rank < 10) {
    vec2 best = vec2(-1e3);
    float bd = 1e9;
    for (int i = 0; i < 10; i++) {
      vec3 pc = pipCentre(rank + 1, i);
      if (pc.z < 0.5) continue;
      float dd = dot(l - pc.xy, l - pc.xy);
      if (dd < bd) { bd = dd; best = pc.xy; }
    }
    sc = 6.5;
    sq = (l - best) / sc;
    sq.y = -sq.y;
    if (best.y > 48.5) sq = -sq;
  } else {
    vec2 ff = f;
    if (ff.y > 0.0) ff = -ff;
    sc = 4.0;
    sq = vec2(ff.x + 15.0, -(ff.y + 30.0)) / sc;
  }
  float sd = sdSuit(sq, suit) * sc;
  if (idx > 0.5 || (corner && sd < 0.0)) return ink;
  // the face
  if (rank < 10) {
    if (!corner && sd < 0.0) return ink;
  } else {
    if (abs(f.x) < 22.5 && abs(f.y) < 37.0) return court(f, rank, suit, ink, aa, sd);
    if (abs(f.x) < 23.5 && abs(f.y) < 38.0) return vec3(0.0);
  }
  return vec3(1.0);
}

// whether a point of a card's rectangle is on the card: its corners are cut off
bool onCard(vec2 l) {
  vec2 e = min(l, vec2(CW, CH) - l);
  if (e.x < 0.0 || e.y < 0.0) return false;
  if (e.x < 2.0 && e.y < 2.0) return e.x + e.y >= 2.0;
  return true;
}

// A card's flight, tau beats after it was thrown: a parabola to its first landing,
// then bounces, each r times the last; bounces shorter than a step are drawn as
// the card resting on the floor, from tRest on.
float restsAt(vec4 b, float D1) {
  float r = b.y;
  float nRest = max(0.0, ceil(log(1.0 / (STEPS * D1)) / log(r)));
  return b.z + D1 * (1.0 - pow(r, nRest)) / (1.0 - r);
}

// how high its bottom is above the floor
float heightAt(float tau, vec4 b, float U1, float D1, float tRest) {
  float G = uCasc.y, r = b.y;
  if (tau < b.z) return uCasc.z + b.x * tau - 0.5 * G * tau * tau;
  if (tau >= tRest) return 0.0;
  float n = floor(log(max(1.0 - (tau - b.z) * (1.0 - r) / D1, 1e-6)) / log(r));
  float rn = pow(r, n);
  float ti = tau - b.z - D1 * (1.0 - rn) / (1.0 - r);
  return max(0.0, U1 * rn * ti - 0.5 * G * ti * ti);
}

// The newest copy among steps ka..kb whose rectangle covers height hp, or -1.
// Within a bounce the height is a parabola, so the copies that cover hp are at
// most two runs of steps either side of its top: solved, not searched.
float newestCopy(vec4 b, float U1, float D1, float tRest, float ka, float kb, float hp) {
  float G = uCasc.y, r = b.y;
  float lo = hp - CH, hi = hp;
  if (kb / STEPS >= tRest) {
    if (lo <= 0.0) return kb;                          // resting: every copy is on the floor
    kb = min(kb, ceil(tRest * STEPS) - 1.0);
    if (kb < ka) return -1.0;
  }
  float n = -1.0;
  if (kb / STEPS >= b.z) n = floor(log(max(1.0 - (kb / STEPS - b.z) * (1.0 - r) / D1, 1e-6)) / log(r));
  float rn = pow(r, max(n, 0.0));
  for (int i = 0; i < 32; i++) {
    float s = 0.0, e = b.z, hs = uCasc.z, u = b.x;
    if (n >= 0.0) { s = b.z + D1 * (1.0 - rn) / (1.0 - r); e = s + D1 * rn; hs = 0.0; u = U1 * rn; }
    if (e * STEPS < ka) break;
    float top = s + u / G, peak = hs + u * u / (2.0 * G);
    if (peak >= lo) {
      float dl = sqrt(2.0 * (peak - lo) / G);
      float kt = min(kb, floor(min(e, top + dl) * STEPS));
      float kl = max(ka, ceil(max(s, top - dl) * STEPS));
      if (peak <= hi) {
        if (kt >= kl) return kt;
      } else {
        float dh = sqrt(2.0 * (peak - hi) / G);
        float k2 = max(kl, ceil((top + dh) * STEPS));      // falling: the later run
        if (kt >= k2) return kt;
        float k3 = min(kt, floor((top - dh) * STEPS));     // rising
        if (k3 >= kl) return k3;
      }
    }
    if (n < 0.0) break;
    n -= 1.0;
    rn /= r;
  }
  return -1.0;
}

// a pure hue, for the beats' colours and the sparks
vec3 hue(float h) { return clamp(abs(fract(h + vec3(0.0, 2.0, 1.0) / 3.0) * 6.0 - 3.0) - 1.0, 0.0, 1.0); }

float colX(float i, float tw) { return 11.0 + i * (tw - 22.0 - CW) / 6.0; }

// an empty place on the table: a thin dark outline
bool slotLine(vec2 l) {
  vec2 e = min(l, vec2(CW, CH) - l);
  if (e.x < 0.0 || e.y < 0.0) return false;
  return e.x < 1.0 || e.y < 1.0;
}

vec3 render(vec2 p, vec2 uv) {
  // the table fills the stage's board, 1.8 wide and 1 high
  float ax = 1.8;
  float tw = TH * ax;
  vec2 q = vec2((p.x + 0.5 * ax) * TH, (0.5 - p.y) * TH);
  float aa = TH / uRes.y * 1.7;
  float beats = uTime / uSpb;
  float local = beats - uCasc.w;                 // beats into the phrase

  // the felt: woven cloth, a pool of light in the middle, breathing with the bass;
  // dark enough that the era's glow brings it up to the game's own green
  float weave = 0.9 + 0.1 * vnoise(q * 0.7) + 0.05 * (hash12(floor(q * 1.3)) - 0.5);
  vec2 lp = (q - vec2(tw * 0.5, TH * 0.55)) / vec2(tw * 0.55, TH * 0.75);
  vec3 felt = vec3(0.0, 0.45, 0.0) * weave * (0.8 + 0.25 * exp(-dot(lp, lp))) * (0.92 + 0.12 * uBass);
  vec3 shade = vec3(0.0, 0.22, 0.0);
  vec3 col = felt;

  // which card shows here, if any: its face is drawn once, at the end
  float bid = -1.0;
  vec2 bl = vec2(0.0);

  // the table: the stock, spent, with its ring; the four foundations
  vec2 ls = q - vec2(colX(0.0, tw), 8.0);
  if (slotLine(ls)) col = shade;
  float ring = abs(length(ls - vec2(CW, CH) * 0.5) - 19.0);
  if (ls.x > 0.0 && ls.x < CW && ring < 3.2) col = vec3(0.0, 1.0, 0.0) * (0.8 + 0.4 * uPad);
  for (int f = 0; f < 4; f++) {
    vec2 l = q - vec2(colX(3.0 + float(f), tw), 8.0);
    float id = uPiles[f];
    if (id >= 0.0) {
      if (onCard(l)) { bid = id; bl = l; }
    } else if (slotLine(l)) {
      col = shade;
    }
  }

  // the thrown cards: at each point, the copy drawn last; the shadow of each card
  // in flight; the sparks where each first lands
  float hp = TH - q.y;
  float best = -1.0, bt = -1.0, shadowT = -1.0;
  vec3 sparks = vec3(0.0);
  int n = int(uCasc.x + 0.5);
  for (int i = 0; i < 52; i++) {
    if (i >= n) break;
    int c = n - 1 - i;
    vec4 a = uCA[c], b = uCB[c];
    float kNow = floor((uTime - a.x) / uSpb * STEPS);
    if (kNow < 0.0) continue;
    float x0 = colX(3.0 + a.y, tw);
    float vs = a.z / STEPS;
    float order = float(c) * 1e-4;
    float U1 = b.y * (uCasc.y * b.z - b.x), D1 = 2.0 * U1 / uCasc.y;
    float tRest = restsAt(b, D1);

    // its shadow, cast down and to the right of where it is now
    float xn = x0 + vs * kNow;
    if (q.x > xn + 6.0 && q.x < xn + 6.0 + CW && xn < tw && xn + CW > 0.0) {
      float hn = heightAt(kNow / STEPS, b, U1, D1, tRest);
      if (onCard(q - vec2(xn + 6.0, TH - hn - CH + 8.0))) shadowT = max(shadowT, a.x + kNow / STEPS * uSpb + order);
    }

    // its first landing, on the beat: sparks thrown up, a flash along the floor
    float al = (uTime - a.x) / uSpb - b.z;
    if (al >= 0.0 && al < 0.8) {
      vec2 cp = vec2(x0 + a.z * b.z + CW * 0.5, TH);
      if (abs(q.x - cp.x) < 190.0 && q.y > TH - 170.0) {
        float fade = 1.0 - al / 0.8;
        float hit = 0.6 + 0.8 * uBeats[clamp(int(floor(a.x / uSpb + b.z + 0.5) - uCasc.w), 0, 31)].x;
        sparks += hue(0.1 + 0.05 * uSeed.x) * 1.4 * exp(-abs(q.x - cp.x) / (25.0 + 140.0 * al)) * exp(-(TH - q.y) / 6.0) * fade * hit;
        for (int s = 0; s < 18; s++) {
          float hs = hash11(float(s) * 3.7 + a.w * 1.3);
          float th = mix(0.12, 0.88, hs) * PI;
          float sp = 110.0 + 190.0 * hash11(float(s) * 7.1 + a.w);
          vec2 sq = cp + vec2(cos(th) * sp * al, -(sin(th) * sp * al - 0.3 * uCasc.y * al * al));
          float d = length(q - sq);
          vec3 sc = mix(vec3(1.0), hue(0.02 + 0.1 * hash11(float(s) + a.w) + 0.04 * uSeed.x), 0.75);
          float sz = 5.0 * (1.0 - 0.5 * al);
          sparks += sc * (exp(-d * d / (sz * sz)) * 2.4 + exp(-d / 14.0) * 0.35) * fade * hit;
        }
      }
    }

    // its copies
    float lo = (q.x - CW - x0) / vs, hi = (q.x - x0) / vs;
    if (vs < 0.0) { float tmp = lo; lo = hi; hi = tmp; }
    float ka = max(ceil(lo), 0.0), kb = min(floor(hi), kNow);
    if (ka > kb) continue;
    if (a.x + kb / STEPS * uSpb + order <= best) continue;
    // the newest copy over this point; if it is only a cut corner, the one before
    for (int t = 0; t < 3; t++) {
      float k = newestCopy(b, U1, D1, tRest, ka, kb, hp);
      if (k < 0.0) break;
      float h = heightAt(k / STEPS, b, U1, D1, tRest);
      vec2 l = vec2(q.x - (x0 + vs * k), q.y - (TH - h - CH));
      if (onCard(l)) {
        bt = a.x + k / STEPS * uSpb;
        best = bt + order;
        bid = a.w;
        bl = l;
        break;
      }
      kb = k - 1.0;
    }
  }

  if (bid >= 0.0) {
    vec3 face = cardFace(bl, bid, aa);
    if (bt >= 0.0) {
      // a copy keeps the beat it was drawn in: the copies just after a kick warm,
      // after a snare cool, fading through the beat - each hit a band down the trail
      float cb = bt / uSpb;
      float age = beats - cb;
      int bi = int(floor(cb + 0.5 / STEPS) - uCasc.w);
      float after = fract(cb + 0.5 / STEPS);
      if (bi >= 0 && bi < 32) {
        vec4 hb = uBeats[bi] * exp(-after * 7.0);
        vec3 tint = hue(0.07 + 0.06 * uSeed.x);
        if (hb.y > hb.x) tint = hue(0.55 + 0.1 * uSeed.y);
        face = mix(face, face * mix(vec3(1.0), tint, 0.85), clamp(max(hb.x, hb.y), 0.0, 1.0) * 0.9);
      }
      // older copies sink into the table, so the newest arcs stand out
      face *= mix(0.6, 1.0, exp(-age / 6.0));
      // the last bar of the phrase: colour runs through every trail, before the new deal
      float fin = smoothstep(27.5, 28.5, local);
      if (fin > 0.0) {
        vec3 wave = hue(cb * 0.12 - beats * 0.35);
        face = mix(face, face * (0.2 + 0.95 * wave), 0.7 * fin);
      }
    }
    col = face;
  }
  if (best < shadowT) col *= 0.55;
  return col + sparks;
}
`;

const ansi = `
uniform vec4 uFont[24];     // the 5x7 font, two letters a vec4: rows 0-3, rows 4-6
uniform vec4 uWords[6];     // the logos: the part above (0-11), the part arriving (12-23)
uniform vec4 uLines[40];    // the header and the info line of the part above, then of the part arriving
uniform vec4 uAnsi;         // the part arriving; the part above's logo length, its header + 100 x info length; the arriving logo's length
uniform vec4 uAnsiLen;      // the arriving part's header + 100 x info length

// The board's screen: VGA text mode, 80 x 25 cells of 9 x 16 pixels. A line of
// the file arrives each beat; a part of the file (32 lines) each phrase.
const float COLS = 80.0, ROWS = 25.0, CWD = 9.0, CHT = 16.0, PART = 32.0;

const vec3 VGA[16] = vec3[16](vec3(0.0), vec3(0.0, 0.0, 0.667), vec3(0.0, 0.667, 0.0), vec3(0.0, 0.667, 0.667),
  vec3(0.667, 0.0, 0.0), vec3(0.667, 0.0, 0.667), vec3(0.667, 0.333, 0.0), vec3(0.667),
  vec3(0.333), vec3(0.333, 0.333, 1.0), vec3(0.333, 1.0, 0.333), vec3(0.333, 1.0, 1.0),
  vec3(1.0, 0.333, 0.333), vec3(1.0, 0.333, 1.0), vec3(1.0, 1.0, 0.333), vec3(1.0));

// the artists' ramps, bright to dark: yellow-brown, cyan-blue, magenta, grey, red, green
const ivec4 RAMPS[6] = ivec4[6](ivec4(15, 14, 6, 4), ivec4(15, 11, 3, 1), ivec4(15, 13, 5, 1),
  ivec4(15, 7, 8, 0), ivec4(15, 12, 4, 5), ivec4(15, 10, 2, 8));

// a pixel of a letter of the 5x7 font: fx 0-5 across, fy 0-7 down
float fontBit(float g, float fx, float fy) {
  if (fx < 0.0 || fy < 0.0 || fx >= 5.0 || fy >= 7.0) return 0.0;
  int gi = int(g + 0.5);
  vec4 v = uFont[gi / 2];
  float lo = v.x, hi = v.y;
  if (gi % 2 == 1) { lo = v.z; hi = v.w; }
  float x = floor(fx), y = floor(fy);
  float bits = lo, bit = y * 5.0 + x;
  if (y >= 4.0) { bits = hi; bit = (y - 4.0) * 5.0 + x; }
  return mod(floor(bits / exp2(bit)), 2.0);
}

float wordChar(int j, int i) { int k = j * 12 + i; return uWords[k / 4][k % 4]; }
float lineChar(int j, int i) { int k = j * 40 + i; return uLines[k / 4][k % 4]; }

// a value between the stops of a ramp, drawn as the artists drew it: full
// blocks at the stops, the shades between them
void shadeCell(float v, ivec4 ramp, out float ch, out int fg, out int bg) {
  v = clamp(v, 0.0, 2.999);
  int i = int(floor(v));
  float f = fract(v);
  ch = 1.0; fg = ramp[i]; bg = 0;
  if (f > 0.2) {
    bg = ramp[i + 1];
    if (f < 0.4) ch = 8.0;
    else if (f < 0.6) ch = 7.0;
    else if (f < 0.8) ch = 6.0;
    else fg = ramp[i + 1];
  }
}

// whether a half-cell of the logo is inside a letter: c the column, sub the half-row (0-25)
float logoIn(float c, float sub, float n, int j) {
  if (sub < 0.0 || sub > 25.0) return 0.0;
  float L = min(8.5, 76.0 / max(n, 1.0)), x0 = 40.0 - n * L * 0.5;
  float li = floor((c + 0.5 - x0) / L);
  if (li < 0.0 || li >= n) return 0.0;
  float fx = (c + 0.5 - x0 - li * L) / (L - 1.0) * 5.0;
  float fy = (sub + 0.5 - 1.0) / 24.0 * 7.0;
  return fontBit(wordChar(j, int(li)), fx, fy);
}

// What is in a cell of the file: its character, its colours. Characters:
// 0 blank, 1 full block, 2 upper half, 3 lower half, 6-8 the light, medium and
// dark shades, 9 a dot, 10 a sparkle, 11 a line, 100 and up a letter of the font.
void cell(float r, float c, float beats, out float ch, out int fg, out int bg) {
  ch = 0.0; fg = 7; bg = 0;
  float s = floor(r / PART), lr = r - s * PART;
  int j = int(s - uAnsi.x + 1.0);
  if (j < 0 || j > 1) return;
  float h = hash11(s * 7.31 + uSeed.x * 17.0);
  // a colour ramp for each part: never the grey one, which the artists kept for skies
  int ri = int(h * 5.0) % 5;
  if (ri >= 3) ri += 1;
  ivec4 ramp = RAMPS[ri];
  float logoLen = uAnsi.y, lens = uAnsi.z;
  if (j == 1) { logoLen = uAnsi.w; lens = uAnsiLen.x; }
  float infoLen = floor(lens / 100.0), headLen = lens - infoLen * 100.0;

  if (lr < 0.5) {
    // the header: spaced-out letters between two rules
    float x0 = floor(40.0 - headLen);
    float i = c - x0;
    if (i >= 0.0 && i < headLen * 2.0 - 1.0) {
      if (mod(i, 2.0) < 0.5) { ch = 100.0 + lineChar(j * 2, int(i * 0.5)); fg = ramp[1]; }
    } else if (c > 3.0 && c < 76.0 && abs(i - headLen + 0.5) > headLen + 1.5) {
      ch = 11.0; fg = 8;
    }
  } else if (lr < 1.5) {
    // a rule in the part's colours, bright in the middle
    ch = 2.0;
    fg = ramp[int(clamp(abs(c - 39.5) / 40.0 * 3.6, 0.0, 3.0))];
  } else if (lr < 17.5) {
    // the picture: a land against the sky
    float rr = lr - 2.0, b = 15.0 - rr;
    float hgt = 1.5 + 8.0 * fbm(vec2(c * 0.07 + s * 9.1, s * 3.7 + 1.3));
    float up = step(b + 0.75, hgt), lo = step(b + 0.25, hgt);
    bool bright = hash11(s * 3.3 + 0.7) > 0.5;
    if (bright) {
      // a sunset: the sky dark above, glowing down to the horizon, the land black against it
      float sky = 2.95 - pow(rr / 15.0, 0.8) * 2.6;
      if (up > 0.5 && lo > 0.5) {
        ch = 0.0;
        if (hash12(vec2(c, r)) > 0.8) { ch = 6.0; fg = 8; }
      } else if (lo > 0.5) {
        ch = 3.0; fg = 0; bg = ramp[int(clamp(sky, 0.0, 3.0))];
      } else {
        shadeCell(sky, ramp, ch, fg, bg);
        float st = hash12(vec2(c * 1.7, r * 2.3) + uSeed.yz * 31.0);
        if (sky > 2.4 && st > 0.95) { ch = st > 0.985 ? 10.0 : 9.0; fg = 7; bg = ramp[3]; if (uSnare > 0.35 && hash11(st * 91.0 + floor(beats)) > 0.5) fg = 15; }
      }
    } else {
      // a night sky with stars, the land in the part's colours, bright at its edge
      if (up > 0.5 && lo > 0.5) {
        shadeCell((hgt - b - 0.5) * 0.55, ramp, ch, fg, bg);
      } else if (lo > 0.5) {
        ch = 3.0; fg = ramp[0];
      } else {
        // a moon, shaded down the ramp from its lit side
        vec2 mc = vec2(12.0 + 56.0 * hash11(s * 5.9 + 2.1), 4.5);
        vec2 md = vec2((c + 0.5 - mc.x) * 9.0 / 16.0, rr + 0.5 - mc.y) / 3.6;
        float st = hash12(vec2(c * 1.7, r * 2.3) + uSeed.yz * 31.0);
        if (dot(md, md) < 1.0) {
          shadeCell(0.2 + 2.7 * clamp(0.5 + 0.5 * dot(md, normalize(vec2(0.8, 0.5))), 0.0, 1.0), ramp, ch, fg, bg);
        } else if (st > 0.94) {
          ch = st > 0.98 ? 10.0 : 9.0;
          fg = 7;
          // the stars twinkle on the snare
          if (hash11(st * 91.0 + floor(beats)) > 0.5 && uSnare > 0.35) fg = 15;
        }
      }
    }
  } else if (lr < 18.5) {
    // a line about it, in the middle
    float x0 = floor(40.0 - infoLen * 0.5);
    float i = c - x0;
    if (i >= 0.0 && i < infoLen) { ch = 100.0 + lineChar(j * 2 + 1, int(i)); fg = 15; }
  } else {
    // the logo, in half-cells: letters shaded down the ramp, a grey outline, a shadow
    float sub = (lr - 19.0) * 2.0;
    float u = logoIn(c, sub, logoLen, j), l = logoIn(c, sub + 1.0, logoLen, j);
    float v = (lr - 19.0) / 12.0 * 2.7 + 0.15 * sin(c * 0.45 + s);
    float lb = beats - uAnsi.x * PART;
    if (j == 1) v -= 0.9 * uKick;                       // the kick lights the letters as they arrive
    if (j == 0 && lb < 4.0) v = mod(v + lb * 2.2, 3.0);   // on the drop the finished logo cycles its colours
    if (u > 0.5 && l > 0.5) {
      shadeCell(v, ramp, ch, fg, bg);
    } else if (u > 0.5 || l > 0.5) {
      ch = u > 0.5 ? 2.0 : 3.0;
      fg = ramp[int(clamp(v + 0.5, 0.0, 3.0))];
    } else {
      float edge = max(max(logoIn(c - 1.0, sub, logoLen, j), logoIn(c + 1.0, sub, logoLen, j)),
                       max(logoIn(c, sub - 1.0, logoLen, j), logoIn(c, sub + 2.0, logoLen, j)));
      if (edge > 0.5) { ch = 6.0; fg = 7; }
      else if (max(logoIn(c - 1.0, sub - 2.0, logoLen, j), logoIn(c - 2.0, sub - 1.0, logoLen, j)) > 0.5) { ch = 7.0; fg = 8; }
    }
  }
}

// how much of a cell's pixel is the foreground colour; tpp: the screen's pixels in cell pixels
float glyphOn(float ch, vec2 u, float tpp) {
  if (ch < 0.5) return 0.0;
  if (ch < 1.5) return 1.0;
  if (ch < 2.5) return 1.0 - step(8.0, u.y);
  if (ch < 3.5) return step(8.0, u.y);
  vec2 g = floor(u);
  if (ch < 8.5) {
    float light = step(mod(g.x + 2.0 * mod(g.y, 2.0) + 2.0, 4.0), 0.5);
    float pat = light;
    if (ch > 6.5) pat = 1.0 - step(0.5, mod(g.x + g.y, 2.0));
    if (ch > 7.5) pat = 1.0 - step(mod(g.x + 2.0 * mod(g.y, 2.0), 4.0), 0.5);
    return mix(pat, (ch - 5.0) * 0.25, smoothstep(0.7, 1.4, tpp));
  }
  if (ch < 9.5) return step(abs(u.x - 4.5), 1.0) * step(abs(u.y - 8.5), 1.0);
  if (ch < 10.5) return max(step(abs(u.x - 4.5), 0.6) * step(abs(u.y - 8.5), 3.5), step(abs(u.y - 8.5), 0.6) * step(abs(u.x - 4.5), 3.5));
  if (ch < 11.5) return step(abs(u.y - 8.5), 0.8);
  return fontBit(ch - 100.0, (u.x - 1.0) / 1.4, (u.y - 3.0) / 1.5);
}

vec3 render(vec2 p, vec2 uv) {
  float beats = uTime / uSpb;
  float line = floor(beats), at = floor(fract(beats) * COLS);
  // once the screen is full it scrolls smoothly, the line being written rising as it fills
  float top = max(0.0, beats - (ROWS - 1.0));

  // the camera: the whole screen on the drop; then it draws slowly nearer as the
  // picture arrives, the lines already drawn kept in view above the cursor, and
  // eases back out over the logo so the next drop shows it whole
  float lb = beats - uAnsi.x * PART;
  float zin = smoothstep(2.0, 12.0, lb) * (1.0 - smoothstep(17.0, 30.0, lb));
  // and a punch in on every kick, as the stage gives the game scenes
  float zoom = (1.0 + 0.2 * zin) * (1.0 + 0.07 * uKick);
  float ax = uRes.x / uRes.y * uPixAspect;
  vec2 hv = vec2(200.0 * ax, 200.0) / zoom;
  float follow = (min(beats, top + ROWS) - top - 3.0) * CHT;      // a few lines above the cursor, gliding
  vec2 C = vec2(360.0 + 50.0 * sin(beats * PI / 16.0) * zin, follow);
  C.x = hv.x >= 360.0 ? 360.0 : clamp(C.x, hv.x, 720.0 - hv.x);
  C.y = clamp(C.y, hv.y, 400.0 - hv.y);
  vec2 tp = C + vec2(p.x, -p.y) * 400.0 / zoom;
  if (tp.x < 0.0 || tp.y < 0.0 || tp.x >= 720.0 || tp.y >= 400.0) return vec3(0.0);

  float fy = tp.y + top * CHT;
  float cc = floor(tp.x / CWD);
  vec2 u = vec2(tp.x - cc * CWD, mod(fy, CHT));
  float tpp = 400.0 / zoom / uRes.y;
  float r = floor(fy / CHT);
  vec3 col = vec3(0.0);
  if (r < line || (r == line && cc < at)) {
    float ch; int fg, bg;
    cell(r, cc, beats, ch, fg, bg);
    col = mix(VGA[bg], VGA[fg], glyphOn(ch, u, tpp));
  }
  // the cursor, blinking on the eighths
  if (r == line && cc == at && fract(beats * 2.0) < 0.5 && u.y > 13.0 && u.y < 15.0) col = VGA[7];
  return col;
}
`;

const echolines = `
uniform vec4 uEchoU[4];   // how far along their paths the figures are: now, then at each echo behind
uniform vec4 uEcho;       // echoes shown (fractional), the two figures' hues, their brightness

// The bouncing lines: corners flying straight and bouncing off the screen's
// edges - a triangle wave along each axis - two figures of four corners, each
// drawn at the moments behind it in thin lines of one colour.
vec2 corner(float u, float i, float ax) {
  vec2 h = hash22(vec2(i * 3.17 + 0.3, uSeed.x * 41.0 + 0.7));
  vec2 g = hash22(vec2(i * 5.31 + 2.0, uSeed.y * 37.0 + 1.1)) - 0.5;
  vec2 v = g / max(length(g), 0.05) * (0.22 + 0.22 * hash11(i * 7.7 + uSeed.z * 13.0));
  v.x /= ax;                                   // across the screen at the same pace as up it
  vec2 b = 1.0 - abs(mod(h * 2.0 + v * u, 2.0) - 1.0);
  return (b - 0.5) * vec2(ax - 0.05, 0.95);
}

vec3 echoHue(float h) {
  vec3 c = clamp(abs(fract(h + vec3(0.0, 2.0, 1.0) / 3.0) * 6.0 - 3.0) - 1.0, 0.0, 1.0);
  return mix(vec3(1.0), c, 0.92);
}

vec3 render(vec2 p, vec2 uv) {
  float ax = uRes.x / uRes.y * uPixAspect;
  float px = 1.0 / uRes.y;
  float n = uEcho.x;
  vec3 col = vec3(0.0);
  for (int f = 0; f < 2; f++) {
    float fo = float(f) * 4.0, lit = 0.0;
    for (int k = 0; k < 16; k++) {
      float fk = float(k);
      if (fk >= ceil(n)) break;
      float u = uEchoU[k / 4][k % 4];
      vec2 c0 = corner(u, fo, ax), c1 = corner(u, fo + 1.0, ax), c2 = corner(u, fo + 2.0, ax), c3 = corner(u, fo + 3.0, ax);
      float d = min(min(sdSeg(p, c0, c1), sdSeg(p, c1, c2)), min(sdSeg(p, c2, c3), sdSeg(p, c3, c0)));
      float w = 1.0 - smoothstep(0.55 * px, 1.35 * px, d);
      float last = 1.0;
      if (fk > n - 1.0) last = n - fk;        // the furthest echo fades in and out as the count changes
      lit = max(lit, w * last * (1.0 - 0.03 * fk));
    }
    float h = uEcho.y;
    if (f == 1) h = uEcho.z;
    col = max(col, echoHue(h) * lit);
  }
  return col * uEcho.w;
}
`;

const maze3d = `
uniform vec4 uMaze[6];    // the maze's blocks, a row a float, a bit a block (1 a wall)
uniform vec4 uWalk;       // where the walker is (blocks), which way it faces, how far the world has turned over
uniform vec4 uStone;      // the stone on the path ahead: where (blocks), and whether it is there

// The 3D maze screensaver: walls a block high, the eye halfway up; dark red
// bricks with pale mortar, a tan floor, white ceiling tiles.
float wallAt(vec2 c) {
  if (c.x < 0.0 || c.y < 0.0 || c.x > 22.5 || c.y > 22.5) return 1.0;
  int row = int(c.y);
  float bits = uMaze[row / 4][row % 4];
  return mod(floor(bits / exp2(floor(c.x))), 2.0);
}

vec3 bricks(vec2 w, float aa) {           // w: along the wall and up it, in blocks
  vec2 b = vec2(w.x * 3.0, w.y * 6.0);    // a brick a third of a block long, a sixth high
  float row = floor(b.y);
  b.x += mod(row, 2.0) * 0.5;
  vec2 f = fract(b), id = floor(b);
  float d = min(min(f.x, 1.0 - f.x) / 3.0, min(f.y, 1.0 - f.y) / 6.0);
  float mortar = 1.0 - smoothstep(0.011 - aa, 0.011 + aa, d);
  float blot = vnoise(w * 38.0 + id * 7.0) * 0.6 + vnoise(w * 95.0 + id) * 0.4;
  vec3 brick = vec3(0.44, 0.05, 0.06) * (0.55 + 0.25 * hash12(id + 3.1) + 0.55 * blot);
  brick *= 1.0 + 0.35 * smoothstep(0.55, 0.95, f.y);       // lit along its top edge
  vec3 mor = vec3(0.84, 0.82, 0.76) * (0.85 + 0.15 * vnoise(w * 70.0));
  return mix(brick, mor, mortar);
}

vec3 floorTex(vec2 q) {
  float s = vnoise(q * 26.0) * 0.6 + hash12(floor(q * 90.0)) * 0.4;
  return vec3(0.72, 0.48, 0.22) * (0.75 + 0.35 * s);
}

vec3 ceilingTex(vec2 q, float aa) {
  vec2 g = fract(q * 3.0);
  float groove = 1.0 - smoothstep(0.035 - aa * 2.0, 0.035 + aa * 2.0, min(min(g.x, 1.0 - g.x), min(g.y, 1.0 - g.y)));
  vec3 tile = vec3(0.86, 0.86, 0.83) * (0.78 + 0.3 * hash12(floor(q * 70.0)));
  tile *= 1.0 + 0.18 * uSnare;                               // the ceiling brightens on the snare
  return mix(tile, vec3(0.5, 0.5, 0.48), groove);
}

// the stone: a spinning octahedron
float sdStone(vec3 p) {
  float a = uTime * 1.3, b = uTime * 0.9;
  p.xy = rot(a) * p.xy;
  p.yz = rot(b) * p.yz;
  p = abs(p);
  return (p.x + p.y + p.z - 0.22) * 0.577;
}

vec3 render(vec2 p, vec2 uv) {
  vec3 ro = vec3(uWalk.xy + 0.5, -0.03 * uKick);            // a footfall on the kick
  float a = uWalk.z;
  vec3 fw = vec3(cos(a), sin(a), 0.0), rt = vec3(sin(a), -cos(a), 0.0), up = vec3(0.0, 0.0, 1.0);
  vec2 q = rot(uWalk.w) * p;                                  // the world turned over after each drop
  vec3 rd = normalize(fw * 0.75 + rt * q.x + up * q.y);
  float aa = 1.5 / uRes.y;

  // the walls: a step through the grid a block at a time
  vec2 d2 = rd.xy;
  if (abs(d2.x) < 1e-5) d2.x = 1e-5;
  if (abs(d2.y) < 1e-5) d2.y = 1e-5;
  vec2 cell = floor(ro.xy), st = sign(d2), td = abs(1.0 / d2);
  vec2 tm = (st * (cell - ro.xy) + st * 0.5 + 0.5) * td;
  float tw = 1e4, side = 0.0;
  for (int i = 0; i < 64; i++) {
    if (tm.x < tm.y) { tw = tm.x; cell.x += st.x; tm.x += td.x; side = 0.0; }
    else { tw = tm.y; cell.y += st.y; tm.y += td.y; side = 1.0; }
    if (wallAt(cell) > 0.5) break;
  }
  // the floor or the ceiling, if the ray meets one first
  float tp = 1e4;
  if (rd.z > 1e-4) tp = (0.5 - ro.z) / rd.z;
  else if (rd.z < -1e-4) tp = (-0.5 - ro.z) / rd.z;

  vec3 col;
  float t = min(tw, tp);
  vec3 h = ro + rd * t;
  if (tw < tp) {
    float along = side < 0.5 ? h.y : h.x;
    col = bricks(vec2(along, h.z + 0.5), aa * t);
    if (side > 0.5) col *= 0.82;
  } else if (rd.z > 0.0) {
    col = ceilingTex(h.xy, aa * t);
  } else {
    col = floorTex(h.xy);
  }
  col *= 1.0 / (1.0 + 0.035 * t);

  // the stone, before the drop
  if (uStone.z > 0.5) {
    vec3 sc = vec3(uStone.xy + 0.5, 0.0);
    vec3 oc = ro - sc;
    float bb = dot(oc, rd), cc = dot(oc, oc) - 0.16;
    float disc = bb * bb - cc;
    if (disc > 0.0) {
      float s = max(-bb - sqrt(disc), 0.0);
      for (int i = 0; i < 28; i++) {
        float dd = sdStone(ro + rd * s - sc);
        if (dd < 0.001 || s > t) break;
        s += dd;
      }
      if (s < t && sdStone(ro + rd * s - sc) < 0.003) {
        vec3 hp = ro + rd * s - sc;
        vec2 e = vec2(0.002, 0.0);
        vec3 nrm = normalize(vec3(sdStone(hp + e.xyy) - sdStone(hp - e.xyy), sdStone(hp + e.yxy) - sdStone(hp - e.yxy), sdStone(hp + e.yyx) - sdStone(hp - e.yyx)));
        float lit = 0.35 + 0.65 * max(dot(nrm, normalize(vec3(0.4, 0.3, 0.8))), 0.0);
        col = vec3(0.62, 0.64, 0.68) * lit + vec3(0.15) * pow(max(dot(reflect(rd, nrm), vec3(0.0, 0.0, 1.0)), 0.0), 8.0);
      }
    }
  }
  return col;
}
`;

const moonbike = `
uniform vec4 uMoonT;      // beats since the scene came on

// The moon bike: a deep blue night, a huge moon, pines at the corners, and a
// bicycle crossing the moon in silhouette - the boy hunched over the bars, his
// cape flying, a bundle in a blanket in the basket. It comes in over the last
// two bars of each phrase and is right in front of the moon on the drop,
// almost still, as the halo opens; the wheels turn a turn a beat, the cape
// flaps on the eighths, the kick lights the moon, the hats the stars, and the
// snare sends a shooting star every other bar.

float mbCap(vec2 p, vec2 a, vec2 b, float r) { return sdSeg(p, a, b) - r; }

float mbWheel(vec2 q, float spin) {
  float R = 0.1;
  float r = length(q);
  float d = abs(r - R) - 0.011;                              // the tyre
  float sector = PI / 8.0;
  float a = atan(q.y, q.x) + spin;
  float ang = mod(a + sector * 0.5, sector) - sector * 0.5;
  if (r < R) d = min(d, abs(sin(ang)) * r - 0.0022);          // sixteen spokes
  return min(d, r - 0.013);                                  // the hub
}

// the cape: cloth streaming back from the shoulders, widening, a wave running
// down it on the eighths and its hem rippling (ph counts the waves)
float mbCape(vec2 p, vec2 neck, float ph) {
  vec2 back = normalize(vec2(-1.0, -0.22)), side = vec2(-back.y, back.x);
  vec2 q = p - neck;
  float L = 0.25;
  float s = dot(q, back) / L, o = dot(q, side);
  float sc = clamp(s, 0.0, 1.0);
  float wave = 0.032 * sc * sin(6.28318 * (1.3 * sc - ph)) + 0.025 * sc * sc;
  float w = 0.015 + 0.048 * pow(sc, 0.8) + 0.007 * sc * sin(6.28318 * (3.0 * sc - 1.5 * ph));
  float d = abs(o - wave) - w;
  d = max(d, -s * L);
  return max(d, (s - 1.0) * L + 0.008 * sin(o * 70.0 + ph * 6.28318));
}

// the bicycle and its riders, wheels 0.2 across
float mbBike(vec2 p, float spin, float flap) {
  vec2 rw = vec2(-0.17, 0.0), fw = vec2(0.17, 0.0);
  float d = min(mbWheel(p - rw, spin), mbWheel(p - fw, spin));
  vec2 bb = vec2(-0.03, 0.0), seat = vec2(-0.075, 0.12), head = vec2(0.115, 0.11);
  d = min(d, mbCap(p, rw, bb, 0.008));
  d = min(d, mbCap(p, rw, seat, 0.008));
  d = min(d, mbCap(p, bb, seat, 0.009));
  d = min(d, mbCap(p, bb, head, 0.01));
  d = min(d, mbCap(p, seat, head, 0.008));
  d = min(d, mbCap(p, head, fw, 0.009));
  vec2 bars = head + vec2(-0.025, 0.055);
  d = min(d, mbCap(p, head, bars, 0.008));
  d = min(d, mbCap(p, bars + vec2(-0.025, 0.0), bars + vec2(0.02, 0.005), 0.007));
  // the crank turning with the wheels, a foot on each pedal
  vec2 cr = vec2(cos(-spin * 0.6), sin(-spin * 0.6)) * 0.036;
  vec2 hip = seat + vec2(0.005, 0.035);
  for (int k = 0; k < 2; k++) {
    vec2 ped = bb + cr;
    if (k == 1) ped = bb - cr;
    vec2 mid = (hip + ped) * 0.5;
    vec2 dir = normalize(ped - hip);
    float reach = length(ped - hip);
    vec2 knee = mid + vec2(dir.y, -dir.x) * -sqrt(max(0.0, 0.0144 - reach * reach * 0.25));
    float th = k == 0 ? 0.021 : 0.018;
    d = min(d, mbCap(p, hip, knee, th));
    d = min(d, mbCap(p, knee, ped, th * 0.8));
    d = min(d, mbCap(p, ped + vec2(-0.012, -0.004), ped + vec2(0.022, -0.004), 0.009));
  }
  // hunched over the bars, hood up, arms to the bars
  vec2 sh = hip + vec2(0.075, 0.125);
  d = min(d, mbCap(p, hip, sh, 0.042));
  vec2 hd = sh + vec2(0.04, 0.05);
  d = min(d, length(p - hd) - 0.036);
  d = min(d, mbCap(p, hd + vec2(-0.03, 0.0), sh + vec2(-0.02, 0.02), 0.03));     // the hood
  d = min(d, mbCap(p, sh + vec2(0.01, -0.01), bars, 0.017));
  // the cape, streaming back from the shoulders
  d = min(d, mbCape(p, sh + vec2(-0.01, 0.035), flap));
  // the basket on the bars, a bundle in a blanket sitting up in it
  vec2 bk = bars + vec2(0.055, -0.01);
  vec2 bq = p - bk;
  d = min(d, length(max(abs(bq) - vec2(0.045, 0.04), 0.0)) - 0.006);
  vec2 bu = bk + vec2(0.0, 0.075);
  d = min(d, length((p - bu) / vec2(0.042, 0.062)) * 0.042 - 0.042);
  d = min(d, length(p - bu - vec2(0.004, 0.06)) - 0.03);
  return d;
}

// a pine at the foot of the frame: tiers of branches, ragged, swaying
float mbPine(vec2 p, float x0, float h, float sway) {
  vec2 q = p - vec2(x0, -0.5);
  q.x -= sway * q.y * q.y;
  if (q.y < 0.0 || q.y > h) return 0.0;
  float y = q.y / h;
  float tier = fract(y * 7.0);
  float w = (1.0 - y) * h * 0.33 * (0.55 + 0.45 * tier) * (0.85 + 0.3 * vnoise(vec2(q.y * 60.0, x0 * 9.0)));
  return step(abs(q.x) + 0.004 * vnoise(q * 140.0), w + 0.006);
}

// where the bicycle is on a crossing (c 0 to 1), and how big: the crossings go
// in turn - near, left to right through the moon; far and high, back again
vec3 mbPath(float k, float c, float ax) {
  float u = c * 2.0 - 1.0;
  float x = (u * 0.35 + u * u * u * 0.65) * (ax * 0.5 + 0.4);
  if (mod(k, 2.0) < 0.5) return vec3(x, -0.08 + 0.3 * u, 1.0);
  return vec3(-x * 0.9, 0.26 + 0.1 * u, 0.55);
}

vec3 render(vec2 p, vec2 uv) {
  float ax = uRes.x / uRes.y * uPixAspect;
  float beats = uTime / uSpb;
  float lb = uMoonT.x;                                       // beats since the scene came on
  float aa = 1.5 / uRes.y;

  // a crossing every six bars from when the scene came on, so it always opens
  // with the bicycle riding in: four bars across, then two out of the frame -
  // turning round somewhere past its edge - before it comes back the way it went
  float k = floor(lb / 24.0), w = lb - k * 24.0;
  float c = -1.0;
  vec3 bk;
  vec2 cam;
  float near = 1.0 - mod(k, 2.0);
  if (w < 16.0) {
    c = w / 16.0;
    bk = mbPath(k, c, ax);
    cam = vec2(bk.x * 0.32, bk.y * 0.18);
  } else {
    // out of the frame: the camera settles toward the middle, and is waiting on that side when it comes back
    float o = smoothstep(0.0, 1.0, (w - 16.0) / 8.0);
    vec3 out0 = mbPath(k, 1.0, ax), in1 = mbPath(k + 1.0, 0.0, ax);
    bk = mix(out0, in1, o);
    cam = vec2(bk.x * 0.32, bk.y * 0.18) * (1.0 - 0.7 * sin(PI * o));
  }
  float centre = c > 0.0 ? pow(1.0 - abs(c * 2.0 - 1.0), 2.0) : 0.0;   // 1 as it crosses the moon
  float drop = centre * near;

  // the camera: panning after the bicycle, drawing in as it crosses the moon and
  // back out as it leaves; each layer moves less the farther it is
  float zoom = 1.0 + 0.2 * centre * (0.5 + 0.5 * near);
  #define LAYER(f) (p / mix(1.0, zoom, f) + cam * f)

  // the sky: deep blue, violet toward the edges, stars twinkling with the hats
  vec2 ps = LAYER(0.05);
  vec3 col = mix(vec3(0.05, 0.13, 0.48), vec3(0.14, 0.07, 0.32), smoothstep(0.2, 1.1, length(p * vec2(0.8, 1.2))));
  vec2 sg = floor(ps * 120.0);
  float sh = hash12(sg + uSeed.xy * 50.0);
  if (sh > 0.985) {
    float tw = 0.5 + 0.5 * sin(uTime * 3.0 + sh * 60.0) + uHat * step(0.993, sh);
    col += vec3(0.7, 0.8, 1.0) * (1.0 - smoothstep(0.0, 0.35, length(fract(ps * 120.0) - 0.5))) * tw;
  }
  // a shooting star on the snare, every other bar
  float bar = floor(beats / 4.0), inb = beats - bar * 4.0;
  if (mod(bar, 2.0) > 0.5 && inb > 1.0 && inb < 1.7) {
    float kk = (inb - 1.0) / 0.7;
    vec2 s0 = vec2((hash11(bar + uSeed.z) - 0.2) * ax * 0.8, 0.42), sd = normalize(vec2(-0.8, -0.35));
    vec2 head = s0 + sd * kk * 0.6;
    float along = dot(ps - head, -sd), across = abs(dot(ps - head, vec2(-sd.y, sd.x)));
    if (along > 0.0 && along < 0.12) col += vec3(0.8, 0.9, 1.0) * (1.0 - along / 0.12) * exp(-across * 900.0) * (1.0 - kk) * 1.5;
  }

  // the moon: huge, pale, its seas darker, cloud wisps across it, a halo that opens as the bicycle crosses it
  vec2 pm = LAYER(0.25);
  vec2 mc = vec2(0.06, 0.06 + 0.01 * sin(uTime * 0.1));
  float mr = 0.43;
  float md = length(pm - mc);
  float halo = exp(-max(md - mr, 0.0) * (9.0 - 4.0 * drop)) * (0.35 + 0.5 * drop);
  col += vec3(0.35, 0.55, 1.0) * halo;
  if (md < mr + aa) {
    vec2 mp = (pm - mc) / mr;
    float seas = fbm(mp * 3.0 + uSeed.xy * 7.0);
    // kept below white, so the era's glow brightens it without washing out its seas
    vec3 moon = mix(vec3(0.3, 0.5, 0.82), vec3(0.62, 0.76, 0.92), smoothstep(0.3, 0.7, seas));
    float wisp = fbm(vec2(mp.x * 2.5 + uTime * 0.02, mp.y * 7.0));
    moon = mix(moon, vec3(0.82, 0.88, 0.95), smoothstep(0.5, 0.85, wisp) * 0.6);
    moon *= 0.9 + 0.12 * uKick + 0.08 * uPad;
    col = mix(col, moon, 1.0 - smoothstep(mr - aa, mr + aa, md));
  }

  // a far forest along the foot of the frame
  // (each tree a tip of its own height and breadth, the tallest of its neighbours showing)
  vec2 pf = LAYER(0.55);
  if (pf.y < -0.22) {
    float ridge = -0.47 + 0.03 * vnoise(vec2(pf.x * 2.5, 1.7));
    float cell = floor(pf.x * 22.0);
    for (int i = -2; i <= 2; i++) {
      float id = cell + float(i);
      float h = 0.02 + 0.09 * pow(hash11(id * 1.37 + uSeed.y * 9.0), 1.6);
      float cx = (id + 0.5 + 0.4 * (hash11(id * 2.9) - 0.5)) / 22.0;
      float wd = 0.022 + 0.02 * hash11(id * 4.3);
      float tip = ridge + h - abs(pf.x - cx) * (h / wd) * (1.0 + 0.25 * vnoise(vec2(pf.y * 90.0, id)));
      ridge = max(ridge, tip);
    }
    col = mix(col, vec3(0.02, 0.04, 0.13), 1.0 - smoothstep(ridge - aa, ridge + aa, pf.y));
  }

  // the bicycle: the far crossing passes behind the near pines, the near one in front of them
  float spin = beats * 2.0 * PI;
  float flap = beats * 2.0;
  vec2 pb = LAYER(0.8);
  float bike = 0.0;
  if (c > 0.0 && c < 1.0) {
    float sc = 0.5 * bk.z;
    vec2 bp = (pb - vec2(bk.x, bk.y + 0.07 * bk.z)) / sc;
    if (near < 0.5) bp.x = -bp.x;                            // the way back, facing left
    if (abs(bp.x + 0.05) < 0.45 && abs(bp.y - 0.08) < 0.32) {
      float d = mbBike(bp, spin, flap) * sc;
      bike = 1.0 - smoothstep(-aa, aa, d);
    }
  }
  vec3 shade = vec3(0.004, 0.006, 0.02);
  if (near < 0.5) col = mix(col, shade, bike);

  // the near pines, passing as the camera pans
  vec2 pn = LAYER(1.0);
  if (pn.y < 0.1) {
    float sway = 0.08 * sin(uTime * 0.6) + 0.03 * uBass;
    // a clump of pines in each corner, as in the shot; the middle stays open for the moon
    float trees = 0.0;
    for (int i = 0; i < 4; i++) {
      float fi = float(i);
      float h = 0.5 - 0.09 * fi + 0.06 * hash11(fi * 3.1 + uSeed.x);
      float off = 0.62 + 0.19 * fi + 0.05 * hash11(fi * 7.3 + uSeed.y);
      trees = max(trees, mbPine(pn, ax * 0.5 + 0.22 - off * 0.3 - 0.13 * fi, h, sway * (0.9 + 0.2 * fi)));
      trees = max(trees, mbPine(pn, -ax * 0.5 - 0.22 + off * 0.3 + 0.12 * fi, h * 0.8, sway * (1.1 - 0.1 * fi)));
    }
    col = mix(col, vec3(0.005, 0.01, 0.03), trees);
  }
  if (near > 0.5) col = mix(col, shade, bike);
  return col;
}
`;

const timecar = `
uniform vec4 uTimecar;    // beats since a jump seen in this scene (1e3 if none), the readout (mph), the car there or not, how far into its charge
uniform vec4 uTcCar;      // where the car is on the lot, and which way it faces

// The time car, as an idea - the night of its first run: a parking lot, wet
// and lit orange by its lamps, the long low building beyond, two onlookers
// with their backs to us. The steel wedge comes in at the far end, swings
// round to face them and charges, between them, the readout climbing toward
// the next big moment of the music; past 70 the light gathers blue at its nose
// and lightning crawls round it; on the moment it reads 88, the light bursts
// and it is gone. Then the reverse: the onlookers from the front, two trails
// of fire racing down its tracks and between their legs as they hop, and its
// plate tumbling down where it was and spinning to a stop.

const vec2 TC_S = vec2(-7.0, 32.0);          // where each charge starts, across the lot (the sim has the same)
const vec2 TC_V = vec2(-0.4, 6.5);           // where the car vanishes

float tcBox(vec3 p, vec3 b) { vec3 d = abs(p) - b; return length(max(d, 0.0)) + min(max(d.x, max(d.y, d.z)), 0.0); }

// the car, in its own frame: +z its nose, +y up; 4.2 long, 1.86 wide, 1.14 high.
// Its side, in (z, y): the wedge of the stainless coupe of the 80s - the body and
// bonnet, and the glasshouse with its fastback on top, each a convex piece given by
// its edges' lines (no loop: it compiles in a fraction of the time).
float tcProfile(vec2 p) {
  float body = max(max(max(max(max(dot(p, vec2(0.99779, -0.06652)) - 2.09801, dot(p, vec2(0.14925, 0.98880)) - 0.87313),
    dot(p, vec2(0.03160, 0.99950)) - 0.81698), dot(p, vec2(-0.98546, 0.16991)) - 2.10073),
    dot(p, vec2(-0.27472, -0.96152)) - 0.28296), dot(p, vec2(0.01020, -0.99995)) + 0.23835);
  float cabin = max(max(max(dot(p, vec2(0.42221, 0.90650)) - 0.95741, p.y - 1.14),
    dot(p, vec2(-0.18778, 0.98221)) - 1.23614), dot(p, vec2(-0.03160, -0.99950)) + 0.81698);
  return min(body, cabin);
}

float tcCar(vec3 q, out float part) {
  // narrower above the waist: the glasshouse sits in from the flanks
  float hw = mix(0.93, 0.66, smoothstep(0.78, 1.14, q.y)) - 0.05 * smoothstep(1.4, 2.15, q.z);
  float body = max(tcProfile(q.zy), abs(q.x) - hw);
  // the wheel arches cut out of the flanks
  vec2 wq = vec2(q.y - 0.33, abs(q.z + 0.1) - 1.32);
  body = max(body, -(length(wq) - 0.4));
  float wheel = max(length(wq) - 0.33, abs(abs(q.x) - 0.78) - 0.12);
  // the two vent boxes on the deck behind the glass
  float vents = tcBox(vec3(abs(q.x) - 0.42, q.y - 1.0, q.z + 1.45), vec3(0.2, 0.13, 0.24));
  float d = min(body, vents);
  part = 2.0;
  if (d < wheel) { part = 0.0; if (vents < body) part = 3.0; }
  return min(d, wheel);
}

// the night beyond: a warm dark haze, the long low building with its lit windows
vec3 tcSky(vec3 rd) {
  vec3 c = mix(vec3(0.11, 0.06, 0.03), vec3(0.02, 0.015, 0.02), smoothstep(0.0, 0.35, rd.y));
  float az = atan(rd.x, rd.z);
  if (rd.y < 0.02 && rd.y > -0.002 && abs(az) > 2.3) {
    c = vec3(0.02, 0.018, 0.018);
    if (rd.y > 0.006 && rd.y < 0.012 && fract(az * 30.0) < 0.5 && hash11(floor(az * 30.0) + 7.0) > 0.5) c = vec3(0.5, 0.42, 0.3);
  }
  if (rd.y < 0.032 && rd.y > -0.002 && abs(az) < 0.7) {
    c = vec3(0.03, 0.025, 0.025);
    float wx = fract(az * 38.0);
    if (rd.y > 0.008 && rd.y < 0.02 && wx > 0.2 && wx < 0.8 && hash11(floor(az * 38.0)) > 0.25) c = vec3(0.55, 0.62, 0.5);
    if (abs(az - 0.12) < 0.07 && rd.y > 0.022 && rd.y < 0.03) c = vec3(0.2, 0.75, 0.6);
  }
  return c;
}

// the lamps over the lot: an orange glow and a pale pole each
vec3 tcLamps(vec3 ro, vec3 rd) {
  vec3 c = vec3(0.0);
  for (int i = 0; i < 9; i++) {
    float fi = float(i);
    vec3 L = vec3(-16.0 + 7.0 * fi + 3.0 * sin(fi * 2.3), 6.5, 18.0 + 11.0 * fi);
    if (i >= 6) L = vec3(-12.0 + 11.0 * (fi - 6.0), 6.5, 32.0 + 9.0 * fi);
    if (i >= 6) L.z = 26.0 + 8.0 * (fi - 6.0);
    if (i >= 6) L = vec3(L.x, 6.5, -L.z + 30.0);
    vec3 v = L - ro;
    float along = dot(v, rd);
    float d = length(v - rd * along) / max(along, 1.0);
    c += vec3(1.0, 0.55, 0.2) * (exp(-d * 900.0) * 2.0 + exp(-d * 120.0) * 0.12);
  }
  return c;
}

// fire's colour by its heat: deep red, orange, yellow, a white core
vec3 tcFlame(float t) {
  vec3 c = mix(vec3(0.35, 0.02, 0.0), vec3(1.0, 0.28, 0.02), smoothstep(0.0, 0.35, t));
  c = mix(c, vec3(1.0, 0.72, 0.18), smoothstep(0.35, 0.7, t));
  return mix(c, vec3(1.0, 0.96, 0.82), smoothstep(0.75, 1.0, t));
}

// the fire down both tracks: one volume marched front to back, folded across the
// car's line so it covers the two trails at once - tongues of turbulence rising,
// hotter at the root - and the glow they cast round themselves
vec4 tcFire(vec3 ro, vec3 rd, vec2 a, vec2 h, float tMax, float beats, float burn) {
  vec2 sd = vec2(-h.y, h.x);
  vec3 o = vec3(dot(ro.xz - a, h), ro.y, dot(ro.xz - a, sd));
  vec3 d = vec3(dot(rd.xz, h), rd.y, dot(rd.xz, sd));
  float L = (2.6 - a.y) / h.y;                                  // on past the onlookers
  vec3 lo = vec3(0.0, 0.0, -1.1), hi = vec3(L, 0.95, 1.1);
  vec3 inv = 1.0 / (d + vec3(1e-6));
  vec3 t0 = (lo - o) * inv, t1 = (hi - o) * inv;
  vec3 tn = min(t0, t1), tf = max(t0, t1);
  float ta = max(max(tn.x, tn.y), max(tn.z, 0.0)), tb = min(min(tf.x, tf.y), min(tf.z, tMax));
  // the glow: how near the ray passes each trail, low over the ground
  vec3 glow = vec3(0.0);
  for (int k = 0; k < 2; k++) {
    vec2 c = vec2(0.25, k == 0 ? -0.78 : 0.78);
    float tg = clamp(-dot(o.yz - c, d.yz) / max(dot(d.yz, d.yz), 1e-5), 0.0, tMax);
    vec3 pg = o + d * tg;
    float near = length(pg.yz - c);
    glow += vec3(1.0, 0.38, 0.06) * (exp(-near * 4.0) * 0.3 + exp(-near * 14.0) * 0.25) * step(0.0, pg.x) * step(pg.x, L);
  }
  glow *= burn;
  vec3 acc = vec3(0.0);
  float alpha = 0.0;
  if (tb <= ta) return vec4(glow, 0.0);
  float dt = (tb - ta) / 12.0;
  float t = ta + dt * hash12(gl_FragCoord.xy + fract(beats));
  for (int i = 0; i < 12; i++) {
    vec3 x = o + d * t;
    float side = sign(x.z);
    x.z = abs(x.z) - 0.78;                                      // across the nearer trail
    float n1 = vnoise(vec2(x.x * 2.6 + x.z * 1.7 + side * 5.0, x.y * 3.2 - beats * 4.5));
    float n2 = vnoise(vec2(x.x * 6.1 - x.z * 3.3 + side * 9.0, x.y * 7.5 - beats * 8.0));
    float n = n1 * 0.65 + n2 * 0.35;
    float H = (0.25 + 0.65 * n1) * (0.45 + 0.55 * burn);
    float y = x.y / H;
    float w = 0.17 * pow(max(1.0 - y, 0.0), 0.8);
    float dens = smoothstep(0.0, 0.08, w - abs(x.z) + (n - 0.5) * 0.14) * smoothstep(1.0, 0.45, y + (0.5 - n) * 0.6);
    if (dens > 0.001) {
      float heat = clamp((1.0 - y) * (0.55 + 0.7 * n) - abs(x.z) * 1.2, 0.0, 1.0);
      float a1 = 1.0 - exp(-dens * dt * 5.0 * burn);
      acc += (1.0 - alpha) * a1 * tcFlame(heat) * (0.9 + 1.6 * heat);
      alpha += (1.0 - alpha) * a1;
    }
    t += dt;
    if (t > tb) break;
  }
  return vec4(acc + glow * (1.0 - alpha), alpha);
}

// The onlookers, as cut-outs that move: who 0 the tall one with the remote and
// its aerial, in a pale coat; who 1 the shorter one filming, in a red vest and
// jeans. pose: x sway, y crouch, z hop, w which foot is lifted (+1 right, -1 left)
// times how far; act: 0 watching, 1 shielding from the burst. m returns what
// was hit: 0 skin, 1 coat or vest, 2 trousers, 3 hair, 4 a device, 5 sleeves.
float tcPerson(vec2 q, int who, vec4 pose, float act, float look, out float m) {
  float sc = who == 0 ? 1.07 : 1.0;
  q /= sc;
  q.y -= pose.z;
  float leg = 0.86 - pose.y;
  vec2 hipC = vec2(pose.x * 0.3, leg);
  vec2 hipL = hipC + vec2(-0.09, 0.0), hipR = hipC + vec2(0.09, 0.0);
  vec2 ftL = vec2(-0.24, 0.04 + max(-pose.w, 0.0)), ftR = vec2(0.24, 0.04 + max(pose.w, 0.0));
  vec2 knL = (hipL + ftL) * 0.5 + vec2(-0.05 - pose.y * 0.5, 0.0), knR = (hipR + ftR) * 0.5 + vec2(0.05 + pose.y * 0.5, 0.0);
  float dLeg = min(min(sdSeg(q, hipL, knL), sdSeg(q, knL, ftL)), min(sdSeg(q, hipR, knR), sdSeg(q, knR, ftR))) - 0.072;
  float dFoot = min(sdSeg(q, ftL + vec2(-0.07, -0.02), ftL + vec2(0.03, -0.02)), sdSeg(q, ftR + vec2(-0.03, -0.02), ftR + vec2(0.07, -0.02))) - 0.04;
  // the body, swaying over the hips
  vec2 sh = hipC + vec2(pose.x, 0.56);
  vec2 bq = q - (hipC + sh) * 0.5;
  bq = rot(-pose.x * 0.8) * bq;
  float coatLen = who == 0 ? 0.36 : 0.28;
  float dBody = length(max(abs(bq + vec2(0.0, who == 0 ? 0.05 : 0.0)) - vec2(0.13, coatLen), 0.0)) - 0.07;
  vec2 hd = sh + vec2(look * 0.03, 0.2);
  float dHead = length((q - hd) / vec2(0.9, 1.1)) * 0.9 - 0.1;
  float dHair = 1e3;
  if (who == 0) dHair = length((q - hd - vec2(0.0, 0.05)) / vec2(1.6, 1.1)) * 1.1 - 0.12 + 0.025 * sin(atan(q.y - hd.y, q.x - hd.x) * 9.0);
  else dHair = length((q - hd - vec2(0.0, 0.06)) / vec2(1.05, 0.7)) * 0.7 - 0.07;
  // the arms
  vec2 shL = sh + vec2(-0.19, -0.04), shR = sh + vec2(0.19, -0.04);
  vec2 elL, hnL, elR, hnR;
  float dDev = 1e3;
  if (act > 0.5) {
    // shielding the face from the light
    elL = shL + vec2(-0.12, 0.12); hnL = hd + vec2(0.04, 0.1);
    elR = shR + vec2(0.12, 0.12); hnR = hd + vec2(-0.04, 0.12);
  } else if (who == 0) {
    // the remote held out at the chest, its aerial up; the other hand flung out with the music
    elR = shR + vec2(0.12, -0.25); hnR = shR + vec2(-0.02, -0.18);
    dDev = min(length(max(abs(q - hnR - vec2(0.0, 0.03)) - vec2(0.07, 0.045), 0.0)) - 0.01,
               sdSeg(q, hnR + vec2(0.04, 0.07), hnR + vec2(0.13, 0.42)) - 0.006);
    float fling = 0.5 + 0.5 * sin(pose.x * 30.0);
    elL = shL + vec2(-0.16, -0.18 + 0.1 * fling); hnL = elL + vec2(-0.06, -0.2 + 0.25 * fling);
  } else {
    // filming: the camera up at the eye, both hands on it
    elL = shL + vec2(-0.1, -0.2); hnL = hd + vec2(-0.08, -0.05);
    elR = shR + vec2(0.1, -0.2); hnR = hd + vec2(0.08, -0.05);
    dDev = length(max(abs(q - hd - vec2(0.02, -0.01)) - vec2(0.11, 0.07), 0.0)) - 0.015;
  }
  float dArm = min(min(sdSeg(q, shL, elL), sdSeg(q, elL, hnL)), min(sdSeg(q, shR, elR), sdSeg(q, elR, hnR))) - 0.05;
  float dHand = min(length(q - hnL), length(q - hnR)) - 0.045;
  float d = min(min(min(dLeg, dFoot), min(dBody, dHead)), min(min(dHair, dArm), min(dHand, dDev)));
  m = 0.0;
  if (d == dLeg || d == dFoot) m = 2.0;
  if (d == dBody) m = 1.0;
  if (d == dArm) m = 5.0;
  if (d == dHair) m = 3.0;
  if (d == dDev) m = 4.0;
  return d * sc;
}

vec3 tcPersonColour(int who, float m) {
  if (m < 0.5) return vec3(0.75, 0.55, 0.42);
  if (m > 3.5 && m < 4.5) return vec3(0.12);
  if (who == 0) {
    if (m < 1.5) return vec3(0.8, 0.8, 0.76);
    if (m < 2.5) return vec3(0.32, 0.3, 0.3);
    if (m < 3.5) return vec3(0.9, 0.9, 0.88);
    return vec3(0.78, 0.78, 0.74);
  }
  if (m < 1.5) return vec3(0.65, 0.12, 0.08);
  if (m < 2.5) return vec3(0.22, 0.3, 0.5);
  if (m < 3.5) return vec3(0.25, 0.15, 0.08);
  return vec3(0.3, 0.38, 0.6);
}

// the plate: cream, a coloured band along its top, SEEDSCENE in dark letters, a dark rim
const ivec2 TC_PLATE[9] = ivec2[9](ivec2(459838, 15888), ivec2(492607, 31777), ivec2(492607, 31777),
  ivec2(575023, 15921), ivec2(459838, 15888), ivec2(34350, 14881), ivec2(492607, 31777), ivec2(708145, 17977),
  ivec2(492607, 31777));

vec3 tcPlateFace(vec2 l) {
  l = -l;                                               // the face as it lies, read the right way up
  vec3 c = vec3(0.92, 0.9, 0.82);
  if (l.y > 0.085) c = vec3(0.8, 0.12, 0.1);
  // nine letters of 5 x 7, a column's gap between them, across the middle
  vec2 g = vec2((0.255 - l.x) / 0.51 * 53.0, (0.065 - l.y) / 0.15 * 7.0);
  if (g.x >= 0.0 && g.x < 53.0 && g.y >= 0.0 && g.y < 7.0) {
    int ci = int(g.x) / 6, cx = int(g.x) - ci * 6, cy = int(g.y);
    if (cx < 5 && ci < 9) {
      ivec2 m = TC_PLATE[ci];
      int bits = m.x, b = cy * 5 + cx;
      if (cy >= 4) { bits = m.y; b = (cy - 4) * 5 + cx; }
      if (((bits >> b) & 1) == 1) c = vec3(0.1, 0.12, 0.25);
    }
  }
  if (abs(l.x) > 0.285 || abs(l.y) > 0.135) c = vec3(0.15);
  return c;
}

vec3 render(vec2 p, vec2 uv) {
  float beats = uTime / uSpb;
  float since = uTimecar.x, mph = uTimecar.y, present = uTimecar.z;
  float charge = smoothstep(55.0, 86.0, mph) * present * step(0.001, uTimecar.w);
  vec2 h = normalize(TC_V - TC_S), side = vec2(-h.y, h.x);
  vec2 lineAt;

  // three shots, cut on the music: behind the onlookers as the car comes at them
  // between them; just after the burst, the reverse - low on the car's side,
  // looking back at them over the fire; then the plate, close, spinning on the ground
  bool reverse = since > 0.75 && since < 8.0;
  bool insert = since >= 2.75 && since < 8.0;
  vec3 ro, at;
  float lens;
  if (insert) {
    vec2 pc = TC_V + h * 0.6;
    ro = vec3(pc.x - h.x * 0.85, 0.95, pc.y - h.y * 0.85);
    at = vec3(pc.x + h.x * 0.12, 0.0, pc.y + h.y * 0.12);
    lens = 1.5;
  } else if (!reverse) {
    lineAt = TC_V + h * ((0.6 - TC_V.y) / h.y);
    ro = vec3(lineAt.x, 1.05, 0.6);
    at = vec3(TC_S.x * 0.55 + lineAt.x * 0.45, 0.55, 18.0);
    lens = 1.45;
  } else {
    // back along the line and a little up, so the fire runs at their feet, not over the lens
    lineAt = TC_V + h * ((11.5 - TC_V.y) / h.y);
    ro = vec3(lineAt.x, 0.95, 11.5);
    at = vec3(TC_V.x + h.x * 4.0, 0.75, 2.0);
    lens = 1.5;
  }
  ro.y -= 0.012 * uKick;
  vec3 fw = normalize(at - ro), rtv = normalize(cross(vec3(0.0, 1.0, 0.0), fw)), upv = cross(fw, rtv);
  vec3 rd = normalize(fw * lens + rtv * p.x + upv * p.y);

  vec3 col;
  float tHit = 1e4;
  // the lot's lamps are looked up once a pixel, along the ray the surface found last asks for
  vec3 lampO = ro, lampD = rd;
  float lampW = step(0.0, rd.y);
  float burn = since < 10.0 ? exp(-since * 0.2) * smoothstep(0.0, 0.3, since) * (1.0 - smoothstep(7.5, 10.0, since)) : 0.0;
  float flash = since < 2.0 ? exp(-since * 3.0) : 0.0;

  // the ground: wet asphalt, pools of lamplight, the lights and the fire mirrored in it
  if (rd.y < 0.0) {
    float tg = -ro.y / rd.y;
    tHit = tg;
    vec3 g = ro + rd * tg;
    col = vec3(0.035, 0.03, 0.027) * (0.75 + 0.5 * vnoise(g.xz * 3.0));
    for (int i = 0; i < 6; i++) {
      float fi = float(i);
      vec2 L = vec2(-16.0 + 7.0 * fi + 3.0 * sin(fi * 2.3), 18.0 + 11.0 * fi);
      if (i >= 4) L = vec2(-12.0 + 11.0 * (fi - 4.0), 4.0 - 8.0 * (fi - 4.0));
      col += vec3(0.45, 0.24, 0.08) * exp(-dot(g.xz - L, g.xz - L) * 0.012) * 0.5;
    }
    // the fire's light on the ground near the trails
    float dl = abs(abs(dot(g.xz - TC_V, side)) - 0.78);
    col += vec3(1.0, 0.45, 0.1) * (exp(-dl * 3.5) * 0.2 + exp(-dl * 12.0) * 0.45) * burn * (0.85 + 0.3 * vnoise(vec2(g.z * 2.0, beats * 6.0))) * step(2.6, g.z);
    vec3 rr = vec3(rd.x, -rd.y, rd.z);
    float wet = 0.35 * (0.6 + 0.4 * vnoise(g.xz * 9.0));
    col += tcSky(rr) * wet;
    lampO = g; lampD = normalize(rr * vec3(1.0, 0.35, 1.0)); lampW = wet;
  } else {
    col = tcSky(rd);
  }


  // the car: swinging round at the far end, then charging along the line
  vec2 cdir = uTcCar.zw, cside = vec2(-cdir.y, cdir.x);
  vec2 cp = uTcCar.xy;
  if (present > 0.5 && !reverse) {
    vec3 cpos = vec3(cp.x, 0.0, cp.y);
    vec3 oc = ro - (cpos + vec3(0.0, 0.6, 0.0));
    float bb = dot(oc, rd), cc = dot(oc, oc) - 5.6;
    float disc = bb * bb - cc;
    if (disc > 0.0) {
      float t = max(-bb - sqrt(disc), 0.0), part = 0.0, tEnd = -bb + sqrt(disc);
      bool hit = false;
      // one loop, one copy of the car: march to it, then take the normal's four samples
      vec3 qh = vec3(0.0), nq = vec3(0.0);
      int tap = -1;
      for (int i = 0; i < 70; i++) {
        vec3 w = ro + rd * t - cpos;
        vec3 q = vec3(dot(w.xz, cside), w.y, dot(w.xz, cdir));
        vec3 e = vec3(0.0);
        if (tap >= 0) {
          e = 0.5773 * (2.0 * vec3(float(((tap + 3) >> 1) & 1), float((tap >> 1) & 1), float(tap & 1)) - 1.0);
          q = qh + e * 0.003;
        }
        float pt;
        float d = tcCar(q, pt);
        if (tap < 0) {
          if (d < 0.002) { hit = true; qh = q; part = pt; tap = 0; continue; }
          t += d;
          if (t > tEnd) break;
        } else {
          nq += e * d;
          tap++;
          if (tap == 4) break;
        }
      }
      nq = normalize(nq);
      if (hit && t < tHit) {
        tHit = t;
        vec3 w = ro + rd * t - cpos;
        vec3 q = qh;
        vec3 n = vec3(nq.x * cside.x + nq.z * cdir.x, nq.y, nq.x * cside.y + nq.z * cdir.y);
        vec3 refl = reflect(rd, n);
        lampW = 0.0;
        if (part > 1.5) {
          col = vec3(0.025);
        } else {
          float grain = 0.85 + 0.15 * vnoise(vec2(q.z * 60.0, q.y * 400.0));
          float key = max(dot(n, normalize(vec3(-0.4, 0.75, 0.5))), 0.0);
          float rim = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
          col = vec3(0.55, 0.53, 0.5) * grain * (0.3 + 0.7 * key) + vec3(0.4, 0.5, 0.65) * rim * 0.6;
          col += tcSky(refl) * 1.6 * 0.7;
          lampO = ro + rd * t; lampD = refl; lampW = 0.6 * 0.7;
          // the glasshouse: the windscreen and the side windows
          if (q.y > 0.84 && q.z > -0.7 && q.z < 0.62 && (nq.z > 0.3 || abs(nq.x) > 0.5)) { col = vec3(0.02, 0.02, 0.03) + tcSky(refl) * 0.9; lampW = 0.0; }
          // the louvres over the fastback
          if (q.z < -0.66 && q.y > 0.9 && nq.y > 0.3 && abs(q.x) < 0.6) { float lv = step(0.5, fract(q.z * 9.0)) * 0.8 + 0.2; col *= lv; lampW *= lv; }
          // the vent boxes, dark grilles
          if (part > 2.5) { col = mix(vec3(0.05), vec3(0.3), step(0.5, fract(q.y * 30.0))); lampW = 0.0; }
          // the black band round its foot, the black nose panel with its four lamps
          if (q.y < 0.42) { col = vec3(0.03); lampW = 0.0; }
          if (q.z > 2.0 && q.y > 0.38 && q.y < 0.6) { col = vec3(0.025); lampW = 0.0; }
          if (q.z > 2.05 && q.y > 0.44 && q.y < 0.56 && abs(q.x) > 0.38 && abs(q.x) < 0.84 && fract((abs(q.x) - 0.38) / 0.23) < 0.85) { col = vec3(1.0, 0.97, 0.88) * 1.6; lampW = 0.0; }
          if (q.z < -2.0 && q.y > 0.48 && q.y < 0.64 && abs(q.x) > 0.3) { col = vec3(0.9, 0.08, 0.05) * step(0.4, fract(q.y * 12.0)); lampW = 0.0; }
          col += vec3(0.3, 0.5, 1.0) * charge * max(dot(n, normalize(vec3(cdir.x, 0.2, cdir.y))), 0.0) * 0.8;
        }
      }
    }
    // the headlamps' glare, and the light gathering at the nose as it charges
    vec3 nose = vec3(cp.x, 0.55, cp.y) + vec3(cdir.x, 0.0, cdir.y) * 2.2;
    vec3 v = nose - ro;
    float along = dot(v, rd);
    if (along > 0.0) {
      float dn = length(v - rd * along) / along;
      float facing = max(dot(normalize(-v.xz), cdir), 0.0);
      col += vec3(1.0, 0.95, 0.85) * exp(-dn * 120.0) * 0.7 * facing;
      col += vec3(0.55, 0.7, 1.0) * (exp(-dn * 70.0) * 1.8 + exp(-dn * 16.0) * 0.18) * charge;
      if (charge > 0.0) {
        vec2 sc = vec2(dot(v, rtv), dot(v, upv)) / dot(v, fw) * lens;
        float step16 = floor(beats * 4.0);
        float sz = 2.4 * lens / max(along, 1.0);
        for (int k = 0; k < 6; k++) {
          float sd = step16 * 13.1 + float(k) * 7.3;
          if (hash11(sd) > 0.45 + 0.5 * charge) continue;
          vec2 a = sc + (vec2(hash11(sd + 1.0), hash11(sd + 2.0)) - 0.5) * sz * vec2(1.4, 0.5);
          vec2 b = a + (vec2(hash11(sd + 3.0), hash11(sd + 4.0)) - vec2(0.5, 0.2)) * sz * 1.6;
          float bd = 1e3;
          vec2 prev = a, nn = normalize(vec2(-(b - a).y, (b - a).x));
          for (int j = 1; j <= 6; j++) {
            float f = float(j) / 6.0;
            vec2 pt = mix(a, b, f) + nn * (hash11(sd + float(j) * 1.7) - 0.5) * length(b - a) * 0.3 * (1.0 - abs(f - 0.5));
            if (j == 6) pt = b;
            bd = min(bd, sdSeg(p, prev, pt));
            prev = pt;
          }
          col += vec3(0.6, 0.75, 1.0) * (exp(-bd * 700.0) * 1.5 + exp(-bd * 90.0) * 0.25) * charge;
        }
      }
    }
  }

  col += tcLamps(lampO, lampD) * lampW;

  // the fire down both tracks, only after a jump, burning out
  if (burn > 0.01) {
    vec4 f = tcFire(ro, rd, TC_S, h, tHit, beats, burn);
    col = col * (1.0 - f.a) + f.rgb;
  }

  // the plate, left behind: it tumbles down where the car was, lands on its edge
  // and spins like a coin - tilting further and wobbling faster as it slows -
  // until it falls flat with a rattle
  if (since < 10.0) {
    vec3 s3 = vec3(side.x, 0.0, side.y), h3 = vec3(h.x, 0.0, h.y), up3 = vec3(0.0, 1.0, 0.0);
    vec3 pc3 = vec3(TC_V.x + h.x * 0.6, 0.0, TC_V.y + h.y * 0.6);
    float fallT = 0.8;
    vec3 c, U, V;
    if (since < fallT) {
      float f = since / fallT;
      float a = PI * 2.0 * f;
      U = s3; V = up3 * cos(a) + h3 * sin(a);
      c = pc3 - h3 * 0.6 * (1.0 - f) + up3 * mix(0.75, 0.15, f * f);
    } else {
      float sp = since - fallT, Tw = 5.7;
      float k = clamp(sp / Tw, 0.0, 1.0);
      float alpha = 0.08 + (PI * 0.5 - 0.08) * pow(k, 2.6);                // its tilt from upright
      float phi0 = atan(-h.y, -h.x);
      float phi = phi0 + 4.0 * sp + 14.0 * Tw * pow(k, 4.0);               // the wobble, faster as it tilts
      float rattle = 0.0;
      if (sp > Tw) {
        float u = sp - Tw;
        alpha = PI * 0.5;
        rattle = 0.1 * exp(-u * 4.0) * abs(sin(u * 22.0));
        phi = phi0 + 4.0 * Tw + 14.0 * Tw + 1.5 * (1.0 - exp(-u * 3.0));
      }
      alpha -= rattle;
      vec3 hz = vec3(cos(phi), 0.0, sin(phi));
      vec3 Nn = cos(alpha) * hz + sin(alpha) * up3;
      vec3 E1 = vec3(-sin(phi), 0.0, cos(phi));
      if (cross(Nn, E1).y < 0.0) E1 = -E1;                                // keep its face the same side up
      vec3 E2 = cross(Nn, E1);
      float psi = 0.3 * (phi - phi0);
      U = E1 * cos(psi) + E2 * sin(psi);
      V = -E1 * sin(psi) + E2 * cos(psi);
      float ext = 0.3 * abs(dot(U, E2)) + 0.15 * abs(dot(V, E2));
      c = pc3 + E2 * ext + up3 * 0.012;
    }
    vec3 N = cross(U, V);
    float den = dot(rd, N);
    if (abs(den) > 1e-4) {
      float tp = dot(c - ro, N) / den;
      if (tp > 0.0 && tp < tHit + 0.02) {
        vec3 x = ro + rd * tp - c;
        vec2 l = vec2(dot(x, U), dot(x, V));
        if (abs(l.x) < 0.3 && abs(l.y) < 0.15) {
          vec3 pc = tcPlateFace(l);
          if (den > 0.0) pc = vec3(0.35, 0.33, 0.3);              // its back
          col = pc * (0.4 + 0.9 * burn + 1.5 * flash);
          tHit = tp;
        }
      }
    }
  }

  // the onlookers, each straddling a track, moving with the music and the moment
  float charging = uTimecar.w * present;
  {
    // they never overlap: only the one nearer this pixel is drawn (one copy of the figure)
    float fz = 4.8;
    float tz = (fz - ro.z) / rd.z;
    vec3 x = ro + rd * tz;
    vec2 tr0 = TC_V + h * ((fz - TC_V.y) / h.y);
    int k = abs(x.x - (tr0.x - side.x * 0.78)) < abs(x.x - (tr0.x + side.x * 0.78)) ? 0 : 1;
    vec2 tr = tr0 + side * (k == 0 ? -0.78 : 0.78);
    if (tz > 0.0 && tz <= tHit + 0.5) {
    float qx = x.x - tr.x;
    if (ro.z < fz) qx = -qx;                                    // seen from behind: their left is on our left
    float ph = float(k) * 0.37;
    vec4 pose = vec4(0.03 * sin((beats + ph) * PI), 0.0, 0.0, 0.0);
    float act = 0.0, look = 0.0;
    // as it comes at them they lean back and brace
    pose.y += 0.1 * charging * charging;
    pose.x += -0.05 * charging * (k == 0 ? 1.0 : -1.0);
    // the burst: they flinch, shielding their faces
    if (since < 2.0) { act = 1.0; pose.y += 0.12 * exp(-since * 1.5); }
    // the fire between their legs: hopping from foot to foot on the beat, looking down, then at each other
    else if (since < 7.0) {
      float b = fract(beats), w = sin(PI * b);
      float foot = mod(floor(beats + float(k)), 2.0) * 2.0 - 1.0;
      pose.z = 0.05 * w;
      pose.w = foot * 0.2 * w;
      look = k == 0 ? 1.0 : -1.0;
    }
    float m;
    float d = tcPerson(vec2(qx, x.y), k, pose, act, look, m);
    float aa = 1.5 * tz / (uRes.y * lens);
    if (d < aa) {
      vec3 alb = tcPersonColour(k, m);
      vec3 lit;
      if (ro.z < fz) {
        // from behind: dark against the headlamps and the fire, a rim of light round them
        lit = alb * 0.05 + vec3(1.0, 0.9, 0.75) * smoothstep(-0.03, 0.0, d) * (0.15 + 0.6 * charge + 0.8 * burn);
      } else {
        // from the front: lit from below by the fire, and by the lot's lamps
        lit = alb * (0.08 + vec3(1.0, 0.55, 0.25) * (0.9 * burn) * (1.2 - x.y * 0.45) + vec3(0.7, 0.8, 1.0) * flash);
      }
      col = mix(col, lit, 1.0 - smoothstep(-aa, aa, d));
    }
    }
  }

  // the burst of light where the car vanished
  vec3 vv = vec3(TC_V.x, 0.6, TC_V.y) - ro;
  float av = dot(vv, rd);
  if (av > 0.0) {
    float dv = length(vv - rd * av) / av;
    col += vec3(0.75, 0.85, 1.0) * exp(-dv * 4.0) * 2.5 * exp(-since * 2.5) * step(0.0, since);
  }

  // the readout, small in the corner: red digits
  vec2 r = (p - vec2(-0.86, -0.46)) / 0.032;
  int v = int(floor(mph + 0.5));
  if (present < 0.5) v = since < 1.0 ? 88 : 0;
  float litd = 0.0, ghost = 0.0;
  for (int k = 0; k < 2; k++) {
    vec2 q = r - vec2(float(k) * 1.35, 0.0);
    if (q.x > -0.1 && q.x < 1.1 && q.y > -0.1 && q.y < 2.1) {
      int dgt = k == 0 ? v / 10 : v - (v / 10) * 10;
      litd = max(litd, digit7(q, dgt));
      ghost = max(ghost, digit7(q, 8));
    }
  }
  if (abs(r.x - 1.2) < 1.5 && abs(r.y - 1.0) < 1.35) col = mix(col, vec3(0.04, 0.0, 0.0), 0.85);
  col += vec3(0.25, 0.0, 0.0) * ghost * 0.4 + vec3(1.0, 0.08, 0.03) * litd * (1.0 + 0.8 * step(87.5, mph));
  return col;
}
`;

const animeop = `
uniform vec4 uFont[24];     // the 5x7 font, two letters a vec4: rows 0-3, rows 4-6
uniform vec4 uTitle[3];     // the title's letters
uniform vec4 uAo;           // how many letters

// The anime opening of the 90s, as an idea: a cut on every bar - the team in a
// row against a flat red sunburst, the hero in an aura against the cosmos, a
// flight across the sky, a charge through speed lines - poses struck on the
// snare, the kick punching and bursting the lines, the last bar cutting on every
// beat into a white flash, and the title card slamming in on the drop.

// SEEDSCENE, as the font's codes
const int AO_SEED[9] = int[9](19, 5, 5, 4, 19, 3, 5, 14, 5);

float aoBit(float g, vec2 c) {
  if (c.x < 0.0 || c.y < 0.0 || c.x >= 5.0 || c.y >= 7.0) return 0.0;
  int gi = int(g + 0.5);
  vec4 v = uFont[gi / 2];
  float lo = v.x, hi = v.y;
  if (gi % 2 == 1) { lo = v.z; hi = v.w; }
  float x = floor(c.x), y = floor(c.y);
  float bits = lo, bit = y * 5.0 + x;
  if (y >= 4.0) { bits = hi; bit = (y - 4.0) * 5.0 + x; }
  return mod(floor(bits / exp2(bit)), 2.0);
}

// is cell (cx, cy) of the title lit: cx across all the letters, cy down
float aoTitleCell(vec2 cell, float n) {
  float li = floor(cell.x / 6.0);
  if (li < 0.0 || li >= n) return 0.0;
  int k = int(li);
  float g = uTitle[k / 4][k % 4];
  return aoBit(g, vec2(cell.x - li * 6.0, cell.y));
}

// a hero, feet at 0, about 1.8 tall: pose 0 arms crossed, 1 a fist raised, 2 pointing,
// 3 a guard, 4 powering up (arms thrown down and out), 5 charging (arms crossed before the face); kind 0 spiky hair, 1 long hair and a cape, 2 short hair and broad
float aoFlare = 0.0;                 // how far the hair stands up, powered up
float aoBulk = 0.0;                  // how far the muscles swell, powered up

float aoSmin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

// a hero drawn as the cels draw them, proportions from a full-body reference: the
// waist narrow, the lats flaring under the arms, the chest broad, the traps sloping
// up into a thick neck; deltoids capping the shoulders; every limb tapering, with
// its muscle swelling along it - the quads, the calves, the biceps, the forearms
float aoFig(vec2 q, int pose, int kind) {
  float broad = kind == 2 ? 1.12 : 1.0;
  float bulk = aoBulk;
  float st = pose == 3 || pose >= 4 ? 0.36 : 0.26;
  float kn = pose == 3 || pose == 5 ? 0.12 : (pose == 4 ? 0.05 : 0.0);
  vec2 hipL = vec2(-0.1, 0.9 - kn), hipR = vec2(0.1, 0.9 - kn);
  vec2 ftL = vec2(-st, 0.05), ftR = vec2(st, 0.05);
  vec2 knL = (hipL + ftL) * 0.5 + vec2(-kn, 0.0), knR = (hipR + ftR) * 0.5 + vec2(kn, 0.0);
  // the torso: its half-width up the body, measured as if standing
  float y = q.y + kn;
  float w = mix(0.165, 0.145, smoothstep(0.9, 1.06, y));
  w = mix(w, (0.215 + 0.04 * bulk) * broad, smoothstep(1.06, 1.34, y));
  w = mix(w, 0.075 + 0.015 * bulk, smoothstep(1.41, 1.56, y));
  float d = max(abs(q.x) - w, abs(y - 1.22) - 0.36);
  vec2 sh = vec2(0.0, 1.46 - kn);
  vec2 hd = sh + vec2(0.0, 0.2);
  d = min(d, length(q - hd) - 0.115);
  // the hair
  if (kind == 0) {
    vec2 hq = q - hd - vec2(0.0, 0.04);
    float a = atan(hq.x, hq.y);
    float spikes = 0.17 + 0.07 * abs(sin(a * 3.5)) + aoFlare * (0.05 + 0.2 * pow(abs(sin(a * 5.0)), 5.0)) * smoothstep(-1.9, -0.3, -abs(a));
    if (hq.y > -0.06) d = min(d, length(hq) - spikes);
  } else if (kind == 1) {
    d = min(d, sdSeg(q, hd + vec2(0.0, 0.05), hd + vec2(-0.06, -0.3)) - 0.09);
    // the cape, from the shoulders down the back
    vec2 cq = q - sh;
    float cw = 0.2 + 0.18 * clamp(-cq.y / 1.1, 0.0, 1.0);
    if (cq.y < 0.02 && cq.y > -1.15) d = min(d, abs(cq.x + 0.03) - cw);
  } else {
    d = min(d, length((q - hd - vec2(0.0, 0.05)) / vec2(1.1, 0.8)) * 0.8 - 0.1);
  }
  // the arms, from the deltoids
  vec2 sL = sh + vec2(-(0.235 + 0.03 * bulk) * broad, -0.05), sR = vec2(-sL.x, sL.y);
  vec2 eL, hL, eR, hR;
  if (pose == 0) {
    eL = sL + vec2(0.0, -0.24); hL = sh + vec2(0.16, -0.24);
    eR = sR + vec2(0.0, -0.24); hR = sh + vec2(-0.16, -0.2);
  } else if (pose == 1) {
    eL = sL + vec2(-0.1, -0.24); hL = vec2(-0.14, 0.95 - kn);
    eR = sR + vec2(0.08, 0.28); hR = sR + vec2(0.04, 0.6);
  } else if (pose == 2) {
    eL = sL + vec2(-0.1, -0.24); hL = vec2(-0.14, 0.95 - kn);
    eR = sR + vec2(0.3, 0.02); hR = sR + vec2(0.62, 0.06);
  } else if (pose == 3) {
    eL = sL + vec2(-0.12, -0.2); hL = hd + vec2(-0.12, -0.12);
    eR = sR + vec2(0.12, -0.2); hR = hd + vec2(0.12, -0.12);
  } else if (pose == 4) {
    eL = sL + vec2(-0.12, -0.24); hL = sL + vec2(-0.26, -0.52);
    eR = sR + vec2(0.12, -0.24); hR = sR + vec2(0.26, -0.52);
  } else {
    eL = sL + vec2(0.02, -0.22); hL = hd + vec2(0.13, -0.02);
    eR = sR + vec2(-0.02, -0.22); hR = hd + vec2(-0.13, 0.0);
  }
  // the limbs, in one loop (one copy of the code): thigh, calf, thigh, calf, upper arm, forearm, upper arm, forearm;
  // each tapers from ra to rb, its muscle bulging by mb at 'at' along it - more as he bulks up
  vec2 LA[8] = vec2[8](hipL, knL, hipR, knR, sL, eL, sR, eR);
  vec2 LB[8] = vec2[8](knL, ftL, knR, ftR, eL, hL, eR, hR);
  vec4 LR[4] = vec4[4](vec4(0.11, 0.062, 0.022 + 0.014 * bulk, 0.35), vec4(0.06, 0.042, 0.022 + 0.012 * bulk, 0.28),
                       vec4(0.066, 0.046, 0.018 + 0.03 * bulk, 0.5), vec4(0.056, 0.04, 0.016 + 0.012 * bulk, 0.25));
  float limbs = 1e3;
  for (int i = 0; i < 8; i++) {
    vec4 r = LR[(i - (i / 2) * 2) + 2 * (i / 4)];
    vec2 a = LA[i], ba = LB[i] - a;
    float h = clamp(dot(q - a, ba) / dot(ba, ba), 0.0, 1.0);
    limbs = aoSmin(limbs, length(q - a - ba * h) - mix(r.x, r.y, h) - r.z * exp(-(h - r.w) * (h - r.w) * 14.0), 0.02);
  }
  // the deltoids capping the shoulders, the fists, the boots turned out
  limbs = min(limbs, min(length(q - sL), length(q - sR)) - 0.075 - 0.03 * bulk);
  limbs = min(limbs, min(length(q - hL), length(q - hR)) - 0.062 - 0.012 * bulk);
  limbs = min(limbs, min(sdSeg(q, ftL, ftL + vec2(-0.07, -0.01)), sdSeg(q, ftR, ftR + vec2(0.07, -0.01))) - 0.042);
  d = aoSmin(d, limbs, 0.03);
  return d;
}

vec3 aoHue(float h) { return clamp(abs(fract(h + vec3(0.0, 2.0, 1.0) / 3.0) * 6.0 - 3.0) - 1.0, 0.0, 1.0); }

vec3 render(vec2 p, vec2 uv) {
  float ax = uRes.x / uRes.y * uPixAspect;
  float beats = uTime / uSpb;
  float phr = mod(beats, 32.0);
  float bar = floor(phr / 4.0), inBar = phr - bar * 4.0;
  float beatIn = fract(beats);
  // which shot: a cut on every bar, the title on the drop, every beat in the last bar
  int shot = 1;
  float v = floor(beats / 32.0);                         // a new version of each shot every phrase
  float shot2At = -1.0;                                  // where in the power-up a quick cut lands
  if (bar < 1.5) shot = 0;
  else if (bar < 2.5) shot = 1;
  else if (bar < 4.5) shot = 2;                          // the power-up: two bars, the burst on the second's downbeat
  else if (bar < 5.5) shot = 3;
  else if (bar < 6.5) shot = 4;
  else { shot = 1 + int(mod(floor(inBar) + v, 4.0)); shot2At = 6.0 + beatIn; }
  float sinceCut = bar < 6.5 ? inBar : beatIn;
  if (shot == 2 && shot2At < 0.0) sinceCut = bar < 3.5 ? inBar : 9.0;   // the burst has its own flash
  float poseN = floor(beats);                            // the poses change on each beat's snare
  float punch = 1.0 + 0.06 * uKick;
  vec2 q = p / punch;
  vec3 col = vec3(0.0);

  // the figure in this shot, drawn once (one copy of it in the shader): each shot says
  // where it stands, its pose, its kind and its size; the title has none
  vec2 fq = vec2(0.0, -9.0);
  int fPose = 0, fKind = 0, fk = 0;
  float fS = 1.0;
  if (shot == 1) {
    // the nearest one is drawn: they never overlap
    bool alt = mod(v, 2.0) > 0.5 || bar > 6.5;
    float dx = alt ? 0.45 : 0.3;
    float i = clamp(floor(q.x / dx + 0.5), alt ? -1.0 : -2.0, alt ? 1.0 : 2.0);
    float hgt = alt ? 0.95 - 0.08 * abs(i) : 0.62 - 0.05 * abs(i);
    float feet = alt ? -0.72 : -0.46;
    fq = (q - vec2(i * dx, feet + 0.012 * sin(beats * PI + i))) / hgt * 1.8;
    fk = int(i + 2.0);
    fPose = int(mod(poseN + float(fk) * 3.0, 4.0));
    fKind = fk - (fk / 3) * 3;
    fS = hgt / 1.8;
  } else if (shot == 2) {
    float pb = mod(phr - 12.0, 32.0);
    if (shot2At >= 0.0) pb = shot2At;
    float burst = pb - 4.0;
    bool on = burst >= 0.0;
    float shake = (on ? 0.01 * exp(-burst * 1.5) : 0.004 * clamp(pb / 4.0, 0.0, 1.0)) * sin(uTime * 90.0);
    fq = (q + vec2(shake, 0.0) - vec2(0.0, -0.46)) / 0.82 * 1.8;
    fPose = on ? 4 : 5;
    fS = 0.82 / 1.8;
    aoFlare = on ? 1.0 - exp(-burst * 5.0) : 0.0;
    // the muscles swell a little through the charge and burst out on the downbeat, pumping on the kick
    aoBulk = on ? (1.0 - exp(-burst * 4.0)) * (1.0 + 0.15 * uKick) : 0.25 * clamp(pb / 4.0, 0.0, 1.0) * clamp(pb / 4.0, 0.0, 1.0);
  } else if (shot == 3) {
    float lane = clamp(floor((q.y + 0.25) / 0.25 + 0.5), 0.0, 2.0);
    vec2 c = vec2(-0.15 + 0.25 * (lane - 1.0) * (lane - 1.0) + 0.05 * sin(beats * PI * 0.5 + lane), -0.25 + lane * 0.25 + 0.03 * sin(beats * PI + lane * 2.0));
    // laid flat along the flight, a fist out in front (the figure's up is the way they fly)
    vec2 lq = rot(0.18) * (q - c) / 0.28 * 1.8;
    fq = vec2(-lq.y, lq.x) + vec2(0.0, 0.95);
    fPose = 1;
    fKind = int(lane);
    fS = 0.28 / 1.8;
  } else if (shot == 4) {
    float grow = 0.85 + 0.35 * sinceCut / 4.0 + 0.1 * uKick;     // coming at us through the bar
    fq = (q - vec2(0.0, -0.62)) / grow * 1.8;
    fPose = 3;
    fKind = int(mod(v, 3.0));
    fS = grow / 1.8;
  }
  float d = aoFig(fq, fPose, fKind) * fS;
  aoFlare = 0.0;
  aoBulk = 0.0;

  if (shot == 0) {
    // the title card: streaks of blue rushing across, the title slamming in on the drop
    float tb = phr;
    float band = floor((q.y + 0.5) * 18.0);
    float streak = vnoise(vec2(q.x * 3.0 - beats * (3.0 + hash11(band) * 4.0) * 2.0, band));
    col = mix(vec3(0.05, 0.2, 0.75), vec3(0.4, 0.75, 1.0), smoothstep(0.35, 0.8, streak));
    col = mix(col, vec3(1.0), smoothstep(0.82, 0.95, streak) * 0.8);
    float n = max(uAo.x, 1.0);
    float cols = 6.0 * n - 1.0;
    float cs = min(1.45 / cols, 0.11);
    float slam = 1.0 + 2.4 * exp(-tb * 7.0) - 0.08 * exp(-tb * 3.0) * sin(tb * 18.0);
    vec2 tq = q / slam;
    vec2 cell = vec2(tq.x / cs + cols * 0.5, 3.5 - tq.y / cs);
    // the shadow, the outline, the letter: one lookup a neighbour
    float on = 0.0, near = 0.0, shadow = 0.0;
    for (int i = 0; i < 9; i++) {
      vec2 o = vec2(float(i - (i / 3) * 3) - 1.0, float(i / 3) - 1.0) * 0.55;
      float b = aoTitleCell(floor(cell + o), n);
      near = max(near, b);
      if (i == 4) on = b;
    }
    shadow = aoTitleCell(floor(cell - vec2(0.9, -0.9)), n);
    vec3 fill = mix(vec3(1.0, 0.95, 0.35), vec3(1.0, 0.45, 0.05), clamp((cell.y) / 7.0, 0.0, 1.0));
    fill += vec3(1.0) * smoothstep(0.25, 0.0, abs(fract(cell.y) - 0.15)) * 0.25 * step(cell.y, 2.0);
    col = mix(col, vec3(0.05, 0.08, 0.35), shadow * step(near, 0.5));
    col = mix(col, vec3(0.02), near);
    col = mix(col, fill, on);
    // SEEDSCENE, small, above the title
    vec2 sc = vec2(tq.x / (cs * 0.4) + 26.5, 3.5 - (tq.y - cs * 6.5) / (cs * 0.4));
    float li = floor(sc.x / 6.0);
    if (li >= 0.0 && li < 9.0 && sc.y >= 0.0 && sc.y < 7.0) {
      col = mix(col, vec3(1.0), aoBit(float(AO_SEED[int(li)]), vec2(sc.x - li * 6.0, sc.y)));
    }
    // a star glinting at the title's corner on the beat
    vec2 sp = q - vec2(cols * 0.5 * cs * slam * 0.95, cs * 4.5 * slam);
    float star = max(1.0 - abs(sp.x) * 60.0 - abs(sp.y) * 8.0, 1.0 - abs(sp.y) * 60.0 - abs(sp.x) * 8.0);
    col += vec3(1.0, 0.95, 0.8) * max(star, 0.0) * (0.5 + 1.5 * exp(-beatIn * 4.0));
    col += vec3(1.0) * exp(-tb * 5.0) * 0.8;                     // the flash of the drop
  } else if (shot == 1) {
    // the team in a row against a flat sunburst, striking a pose on each beat
    // (the second time round in a phrase: closer, three of them, against a sunset)
    bool alt = mod(v, 2.0) > 0.5 || bar > 6.5;
    float hue0 = v * 0.17;
    if (alt) {
      col = mix(vec3(1.0, 0.75, 0.25), vec3(0.55, 0.12, 0.35), smoothstep(-0.3, 0.5, q.y));
      col = mix(col, vec3(1.0, 0.95, 0.6), 1.0 - smoothstep(0.24, 0.26, length(q - vec2(0.0, 0.05))));
      col = mix(col, vec3(0.35, 0.08, 0.2), step(q.y, -0.3 + 0.03 * sin(q.x * 9.0)));
    } else {
      vec3 c1 = mix(vec3(0.85, 0.1, 0.12), aoHue(0.98 + hue0) * 0.9, 0.3), c2 = c1 * 0.7;
      float a = atan(q.y + 0.2, q.x) + beats * 0.15;
      col = mix(c1, c2, step(0.5, fract(a * 16.0 / 6.28318)));
      col *= 1.0 - 0.5 * smoothstep(0.3, 1.0, length(q));
    }
    float aa = 1.5 / uRes.y;
    vec3 rim = aoHue(0.12 + float(fk) * 0.17 + hue0);
    col = mix(col, rim * (1.2 + 0.8 * uKick), 1.0 - smoothstep(-aa, aa, d - 0.006));
    col = mix(col, vec3(0.02, 0.02, 0.04), 1.0 - smoothstep(-aa, aa, d));
  } else if (shot == 2) {
    // the power-up, over two bars: crouched with the arms crossed before the face,
    // the charge building - a small aura flickering close, pebbles rising, sparks -
    // then on the next bar's downbeat a white flash, the arms thrown down and out,
    // a column of fire bursting up from the ground, a shockwave of dust at the feet,
    // and the aura that stays: tall, pale, its tongues rising, flickering a frame at a time
    float pb = mod(phr - 12.0, 32.0);                        // beats into the power-up
    if (shot2At >= 0.0) pb = shot2At;                         // (a moment of it, in the last bar's cuts)
    float charge = clamp(pb / 4.0, 0.0, 1.0);
    float burst = pb - 4.0;                                   // beats since the burst
    bool on = burst >= 0.0;
    float anim = floor(uTime * 12.0) / 12.0;                  // drawn a frame at a time, as animation is
    // the place: a rocky plain under a dark sky, the light of the aura on it
    float horizon = -0.22;
    col = mix(vec3(0.12, 0.08, 0.25), vec3(0.02, 0.02, 0.08), smoothstep(horizon, 0.5, q.y));
    col += vec3(0.25, 0.12, 0.35) * fbm(vec2(q.x * 2.0 + atan(q.y, q.x) * 0.3, q.y * 3.0 - beats * 0.2)) * 0.35;
    if (q.y < horizon) {
      float gz = 0.12 / max(horizon - q.y, 0.01);
      vec2 gp = vec2(q.x * gz, gz);
      col = vec3(0.16, 0.12, 0.1) * (0.6 + 0.5 * vnoise(gp * 3.0));
      // cracks glowing as it charges
      float crack = abs(vnoise(gp * 2.5 + 3.0) - 0.5);
      col += vec3(1.0, 0.7, 0.2) * smoothstep(0.03, 0.0, crack) * charge * charge * exp(-abs(q.x) * 2.0) * (on ? 0.5 : 1.0);
    }
    float shake = (on ? 0.01 * exp(-burst * 1.5) : 0.004 * charge) * sin(uTime * 90.0);
    vec2 sq = q + vec2(shake, 0.0);
    float hgt = 0.82;
    vec3 gold = vec3(1.0, 0.85, 0.3), pale = vec3(1.0, 0.96, 0.7);
    float aa = 1.5 / uRes.y;
    // pebbles rising off the ground as the charge builds, thrown up and out by the burst
    vec2 pg = vec2(sq.x * 14.0, sq.y * 14.0 - (on ? burst * 10.0 : pb * 1.5));
    vec2 pc = floor(pg), pf = fract(pg) - 0.5;
    float ph = hash12(pc + 11.0);
    if (ph > 0.9 && abs(sq.x) < 0.7) col = mix(col, vec3(0.3, 0.25, 0.2), (1.0 - step(0.18, max(abs(pf.x), abs(pf.y)))) * smoothstep(0.0, 0.3, charge));
    if (!on) {
      // the small aura flickering close, brighter as the charge grows; sparks crackling
      float fl = vnoise(vec2(sq.x * 18.0, sq.y * 6.0 - anim * 9.0));
      float r = 0.012 + 0.05 * charge * fl;
      col = mix(col, gold * (0.8 + charge), (1.0 - smoothstep(r - aa, r + aa, d)) * 0.7 * charge);
      col += gold * exp(-max(d, 0.0) * 40.0) * charge * 0.5;
    } else {
      // the aura that stays: tongues rising, sharper at their tips, wider above the head
      float grow = (1.0 - exp(-burst * 6.0)) * (1.0 + 0.12 * uKick);
      float Y = (sq.y + 0.46) / hgt;                          // up his body, 0 at the feet, 1 at the head's top
      float side = sign(sq.x);
      // its width up his body: round him at the feet, widest at the chest, closing to points above the head
      float W = (0.2 + 0.16 * smoothstep(0.0, 0.55, Y) - 0.3 * smoothstep(0.85, 1.45, Y)) * grow;
      // the serrated edges: teeth whose points rise up the sides, a frame at a time
      float saw = fract(Y * 7.0 - anim * 5.0 + side * 0.37 + hash11(floor(Y * 7.0 - anim * 5.0) + side) * 0.3);
      W += 0.07 * saw * grow;
      // the tips above the head: spikes of different heights flickering
      float tx = sq.x * 7.0 + anim * 3.0;
      float tip = pow(1.0 - abs(fract(tx) * 2.0 - 1.0), 3.0) * (0.4 + 0.6 * hash11(floor(tx) + floor(anim * 4.0)));
      float top = (1.25 + 0.35 * tip) * grow;
      float body = 1.0 - smoothstep(0.06 - aa, 0.06 + aa, d);
      float outer = max((1.0 - smoothstep(W - aa, W + aa, abs(sq.x))) * step(Y, top) * step(-0.05, Y), body);
      float inner = max((1.0 - smoothstep(W * 0.55 - aa, W * 0.55 + aa, abs(sq.x))) * step(Y, top * 0.85) * step(0.0, Y), 1.0 - smoothstep(0.025 - aa, 0.025 + aa, d));
      // streaks running up inside it
      float streak = smoothstep(0.75, 1.0, vnoise(vec2(sq.x * 40.0, sq.y * 3.0 - anim * 14.0)));
      col = mix(col, gold, outer * 0.55);
      col = mix(col, pale, inner * 0.8);
      col += pale * streak * outer * 0.4;
      col += gold * exp(-max(abs(sq.x) - W, 0.0) * 14.0) * step(Y, top + 0.2) * 0.25 * grow;
      // the column of fire bursting up from the ground, falling back into the aura
      float colW = (0.08 + 0.25 * exp(-burst * 1.2)) * (0.8 + 0.4 * vnoise(vec2(sq.y * 6.0 - anim * 12.0, 2.0)));
      float colH = horizon + 2.0 * (1.0 - exp(-burst * 8.0));
      float column = (1.0 - smoothstep(colW - 0.02, colW, abs(sq.x))) * step(sq.y, colH) * exp(-burst * 0.9);
      col = mix(col, pale, column * 0.85);
      // the shockwave of dust across the ground
      float rw = burst * 1.4;
      vec2 gq = vec2(sq.x, (sq.y - horizon + 0.02) * 4.0);
      float ring = exp(-abs(length(gq) - rw) * 10.0) * exp(-burst * 1.2) * step(sq.y, horizon + 0.12);
      col = mix(col, vec3(0.85, 0.8, 0.7), clamp(ring * (0.6 + 0.4 * vnoise(gq * 12.0)), 0.0, 1.0));
    }
    // him: dark against the light, a rim of it round him; gold in the hair once he is lit
    vec3 body = vec3(0.02, 0.02, 0.04), rimL = gold * charge;
    if (on) { body = vec3(0.12, 0.07, 0.02); rimL = pale; }
    col = mix(col, body, 1.0 - smoothstep(-aa, aa, d));
    col += rimL * exp(-abs(d) * 260.0) * 0.9;
    if (on) {
      // the muscles drawn in light on him, as the cels draw them: the chest's lower edge,
      // the line down the middle, the stomach's rows
      float my = fq.y + 0.05, mx = abs(fq.x);
      float ml = mx < 0.2 && my > 1.2 && my < 1.35 ? abs(my - 1.25 - 2.2 * (mx - 0.09) * (mx - 0.09)) : 1.0;
      if (my > 1.02 && my < 1.25) ml = min(ml, mx);
      if (mx < 0.08 && my > 1.0 && my < 1.2) ml = min(ml, abs(fract((my - 1.005) / 0.072) - 0.5) * 0.072);
      float inside = 1.0 - smoothstep(-0.012, -0.004, d);
      col = mix(col, gold * 0.85, (1.0 - smoothstep(0.004, 0.009, ml)) * inside * 0.55 * min(burst * 4.0, 1.0));
    }
    // gold where the hair stands up round his face (the face itself stays dark)
    if (on && fq.y > 1.58 && length(fq - vec2(0.0, 1.61)) > 0.12) {
      vec3 hairC = mix(vec3(1.0, 0.55, 0.05), vec3(1.0, 0.85, 0.3), smoothstep(1.6, 2.0, fq.y));   // deeper than the aura, lighter at the tips
      col = mix(col, hairC, (1.0 - smoothstep(-aa, aa, d + 0.004)));
      col = mix(col, vec3(0.25, 0.1, 0.0), (1.0 - smoothstep(-aa, aa, d)) * smoothstep(-0.006, -0.002, d));   // its dark outline
    }
    // lightning, as in the references of the form: long jagged arcs crawling up beside his body
    // and round the aura's edge, white at the core and blue at the rim, each living two frames;
    // a few through the charge (more on the snare), always some once he is lit, and on the last
    // beat of the charge and the burst, bolts down out of the sky onto him
    float zap = on ? 1.0 + uSnare : charge * charge * (0.5 + uSnare);
    float sky = step(3.0, pb) * step(pb, 4.75);
    if (zap > 0.1) {
      float fr = floor(uTime * 12.0);
      float bd = 1e3;
      for (int k = 0; k < 10; k++) {
        float sd = floor(fr * 0.5 + float(k) * 0.37) * 7.3 + float(k) * 13.1;     // two frames each, staggered
        float sx = hash11(sd + 1.0) < 0.5 ? -1.0 : 1.0;
        vec2 a = vec2(sx * (0.05 + 0.32 * hash11(sd + 2.0)) * (on ? 1.0 : 0.7), -0.5 + 0.65 * hash11(sd + 3.0));
        vec2 b = a + vec2(sx * (hash11(sd + 4.0) - 0.4) * 0.2, 0.3 + 0.35 * hash11(sd + 5.0));
        float jag = 0.09;
        if (k >= 8) {
          // a bolt out of the sky
          if (sky < 0.5) continue;
          a = vec2(sx * (0.2 + 0.4 * hash11(sd + 2.0)), 0.6);
          b = vec2(sx * 0.06, -0.05 + 0.2 * hash11(sd + 3.0));
          jag = 0.16;
        } else if (hash11(sd) > zap * 0.85) continue;
        vec2 prev = a;
        for (int j = 1; j <= 7; j++) {
          vec2 pt = mix(a, b, float(j) / 7.0);
          if (j < 7) pt += (vec2(hash11(sd + float(j) * 1.7), hash11(sd + float(j) * 2.3)) - 0.5) * vec2(jag, jag * 0.45);
          bd = min(bd, sdSeg(sq, prev, pt));
          prev = pt;
        }
      }
      col += vec3(0.3, 0.55, 1.0) * (exp(-bd * 110.0) * 0.45 + exp(-bd * 450.0) * 0.6);
      col = mix(col, vec3(1.0), 1.0 - smoothstep(0.0018, 0.0045, bd));
      col += vec3(0.5, 0.6, 1.0) * sky * 0.12 * step(0.5, hash11(fr));            // the sky flickering with them
    }
    // the white flash of the burst
    col = mix(col, vec3(1.0), exp(-max(burst, 0.0) * 9.0) * step(0.0, burst));
  } else if (shot == 3) {
    // a flight across the sky: clouds rushing past, three of them flying in formation
    col = mix(vec3(0.35, 0.65, 1.0), vec3(0.1, 0.35, 0.9), q.y + 0.5);
    // they fly to the right: the sky rushes past to the left
    float cl = fbm(vec2(q.x * 1.5 + beats * 1.4, q.y * 4.0 + v));
    col = mix(col, vec3(1.0), smoothstep(0.55, 0.7, cl) * 0.9);
    float band = floor((q.y + 0.5) * 30.0);
    float sl = step(0.93, hash11(band + floor(q.x * 2.0 + beats * 5.0) * 13.0));
    col = mix(col, vec3(1.0), sl * 0.5);
    col = mix(col, vec3(0.03, 0.03, 0.08), 1.0 - smoothstep(-1.5 / uRes.y, 1.5 / uRes.y, d));
  } else {
    // a charge through speed lines: black lines rushing out of the middle, him coming at us
    float a = atan(q.y, q.x), r = length(q);
    float id = floor(a * 70.0 / 6.28318);
    float len = 0.12 + 0.5 * hash11(id + floor(beats * 4.0) * 7.0);
    float line = step(0.6, hash11(id * 3.1 + floor(beats * 2.0))) * smoothstep(len, len + 0.1, r);
    col = mix(vec3(1.0), vec3(0.02), line * (0.7 + 0.3 * uKick));
    col = mix(col, vec3(0.02), 1.0 - smoothstep(-1.5 / uRes.y, 1.5 / uRes.y, d));
  }
  // the cut: a white flash at the end of the phrase into the title
  col = mix(col, vec3(1.0), smoothstep(31.4, 32.0, phr));
  // a frame of white on each cut, just for a moment
  col += vec3(1.0) * exp(-sinceCut * 30.0) * 0.4;
  return col;
}
`;

const skyrush = `
// The behind-view shooter: a flyer with a jetpack, free over the whole screen above a plain rushing toward it, as the
// behind-view arcade shooters of the 80s showed it, drawn at about their resolution. The game runs as a simulation
// (src/core/sims.js). The camera answers him: the horizon rises as he climbs, and the eye with it, so the ground under
// him is always at the foot of the screen, where his shadow stays; the plain slides as he nears a side. He is a skeleton
// turned to the angle he is seen from, handed over as limbs sorted far to near, so his view changes with his place.
uniform vec4 uSkyCam;        // the horizon on the screen, the eye's height, lives, since the last drop
uniform vec4 uSkyFx;         // score, the way travelled, how far the plain has slid, the stage
uniform vec4 uSkyHero;       // the point under his feet on the screen: x, y; the scale there; shown
uniform vec4 uSkyShade;      // his shadow: x, y
uniform vec4 uSkyCount;      // how many sprites, where he comes among them, seconds per beat
uniform vec4 uSkySpr[48];    // sprites far to near: x, y, depth, kind
uniform vec4 uSkySprB[48];   // what each needs to know; the last, how far it reaches
uniform vec4 uSkyLimbA[27];  // his limbs far to near: one end, the other (the head: where it looks)
uniform vec4 uSkyLimbB[27];  // the radius at each end, what it is
const float F = 0.9;
const float ROWS = 240.0;
vec3 sky2(float t) { vec3 c = unblack(pal(t)); return c / max(max(c.r, c.g), max(c.b, 0.3)); }
float skTone(float lit) { return lit > 0.4 ? 1.22 : (lit > -0.35 ? 1.0 : 0.66); }

// one limb's colour
vec3 limbBase(float id) {
  if (id < 0.5) return sky2(uSeed.w);
  if (id < 1.5) return mix(sky2(uSeed.w + 0.45) * 0.55, vec3(0.2, 0.22, 0.34), 0.45);
  if (id < 2.5) return vec3(0.36, 0.2, 0.13);
  if (id < 3.5) return vec3(0.93, 0.7, 0.55);
  if (id < 5.5) return vec3(0.62, 0.66, 0.72);
  if (id < 6.5) return vec3(0.34, 0.35, 0.4);
  if (id < 7.5) return vec3(1.0, 0.72, 0.25);
  if (id < 8.5) return sky2(uSeed.w + 0.5);
  return vec3(1.0, 0.95, 0.7);
}

// the flyer: returns his colour, and in the alpha whether this pixel is his
vec4 skyFlyer(vec2 p) {
  vec4 res = vec4(0.0);
  if (uSkyHero.w < 0.5) return res;
  vec2 q = (p - uSkyHero.xy) / uSkyHero.z;
  if (abs(q.x) > 1.5 || q.y < -0.5 || q.y > 1.9) return res;
  float px = 1.0 / (ROWS * uSkyHero.z);
  vec3 hair = mix(sky2(uSeed.x + 0.15), vec3(0.95, 0.66, 0.3), 0.72);
  for (int i = 0; i < 27; i++) {
    vec4 A = uSkyLimbA[i], B = uSkyLimbB[i];
    float id = B.z;
    if (B.x <= 0.0) continue;
    if (id > 3.5 && id < 4.5) {
      // the head: hair from behind, the face coming round as it turns to the screen
      vec2 n = (q - A.xy) / B.x;
      float l2 = dot(n, n);
      if (l2 >= 1.0) continue;
      float zn = sqrt(1.0 - l2);
      float fz = sqrt(max(0.0, 1.0 - dot(A.zw, A.zw)));
      float look = n.x * A.z + n.y * A.w - zn * fz;
      float lit = dot(n, vec2(-0.55, 0.83));
      vec3 c = look > 0.2 ? vec3(0.93, 0.7, 0.55) : hair;
      c *= skTone(lit);
      if (l2 > 0.8) c *= 0.5;
      res = vec4(c, 1.0);
      continue;
    }
    vec2 pa = q - A.xy, ba = A.zw - A.xy;
    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-5), 0.0, 1.0);
    float r = mix(B.x, B.y, h);
    vec2 off = pa - ba * h;
    float d = length(off) - r;
    if (d >= 0.0) continue;
    float lit = dot(off / max(r, 1e-4), vec2(-0.55, 0.83));
    vec3 c = limbBase(id);
    if (id > 6.5 && id < 7.5) {
      // his flames: white at the heart
      c = mix(c, vec3(1.0, 0.97, 0.8), step(d, -r * 0.5));
    } else if (id > 8.5) {
      c = vec3(1.0, 0.97, 0.8);
    } else {
      c *= skTone(lit);
      // a seam down each trouser leg, a shine on the metal
      if (id > 0.5 && id < 1.5 && abs(dot(off, normalize(vec2(-ba.y, ba.x) + 1e-5)) / r - 0.35) < 0.14) c = mix(c, vec3(0.9), 0.5);
      if (id > 4.5 && id < 6.5 && lit > 0.6) c = mix(c, vec3(1.0), 0.45);
      if (d > -px * 1.1) c *= 0.42;
    }
    res = vec4(c, 1.0);
  }
  return res;
}

// a sprite on the screen, in its own world-sized space: on the ground its base is at q = 0
vec3 skySprite(vec3 col, vec2 p, int i, vec3 haze) {
  vec4 s = uSkySpr[i], b = uSkySprB[i];
  float sc = F / s.z;
  vec2 q = (p - s.xy) / sc;
  float kind = s.w;
  float fog = exp(-s.z * 0.022);
  float stage = uSkyFx.w;
  vec3 c = col;
  bool hit = false;
  if (kind < 0.5) {
    // a column: a base, a shaded round shaft in drums, a capital
    float a = b.x;
    vec3 stone = mix(vec3(0.82, 0.78, 0.7), sky2(0.1 + uSeed.y + stage * 0.2), 0.3);
    if (q.y >= 0.0 && q.y < 0.17 && abs(q.x) < 0.48) { hit = true; c = stone * (q.x < 0.0 ? 1.1 : 0.72); }
    else if (q.y >= 0.0 && q.y < a && abs(q.x) < 0.33) {
      float u = q.x / 0.33;
      hit = true;
      c = stone * skTone(-u * 1.2 + 0.1) * (1.0 + 0.09 * sin(u * 16.0));
      if (fract(q.y / 0.8) < 0.04) c *= 0.75;
    }
    else if (q.y >= a && q.y < a + 0.2 && abs(q.x) < 0.46 - (q.y - a) * -0.5) { hit = true; c = stone * (q.x < 0.0 ? 1.15 : 0.78); }
  } else if (kind < 1.5) {
    // a thicket: leaves in clumps, dark inside and lit on top
    float a = b.x, best = 1e9;
    vec2 cen = vec2(0.0);
    for (int j = 0; j < 6; j++) {
      float fj = float(j);
      vec2 o = vec2((fj - 2.5) * 0.25, 0.26 + 0.34 * hash11(fj * 3.1 + b.y * 40.0) * (1.0 - abs(fj - 2.5) * 0.25)) * vec2(1.0, a / 0.7);
      float dj = length(q - o) - 0.3;
      if (dj < best) { best = dj; cen = o; }
    }
    if (best < 0.0 && q.y >= 0.0) {
      hit = true;
      vec3 leaf = mix(vec3(0.2, 0.72, 0.22), sky2(0.3 + uSeed.z + stage * 0.2), 0.2);
      float touch = sin(q.x * 62.0 + sin(q.y * 31.0) * 2.0) * sin(q.y * 62.0 + sin(q.x * 27.0) * 2.0);
      c = leaf * (0.72 + 0.5 * smoothstep(-0.25, 0.25, q.y - cen.y));
      if (touch > 0.72) c = mix(c, vec3(0.78, 1.0, 0.45), 0.55);
    }
  } else if (kind < 2.5) {
    // a boulder: facets, lit from above
    float a = b.x;
    vec2 g = q - vec2(0.0, a * 0.46);
    float th = atan(g.y, g.x);
    float rr = a * 0.62 * (1.0 + 0.14 * sin(th * 3.0 + b.y * 6.0) + 0.08 * sin(th * 7.0 + b.y * 11.0));
    if (length(g) < rr && q.y >= 0.0) {
      hit = true;
      float facet = floor((th + 3.2) * 1.6 + b.y * 3.0);
      vec3 stone = vec3(0.6, 0.58, 0.68);
      c = stone * (0.62 + 0.55 * smoothstep(-0.5, 0.6, g.y / a) + 0.24 * (hash11(facet + b.y * 9.0) - 0.5));
    }
  } else if (kind < 3.5) {
    // a tree: a trunk and a tall crown of clumps
    float a = b.x;
    if (abs(q.x) < 0.1 + 0.05 * step(q.y, 0.1) && q.y >= 0.0 && q.y < a * 0.35) { hit = true; c = vec3(0.45, 0.28, 0.16) * (q.x < 0.0 ? 1.15 : 0.65); }
    float best = 1e9, cy = 0.0;
    for (int j = 0; j < 7; j++) {
      float fj = float(j);
      vec2 o = vec2((hash11(fj + b.y * 31.0) - 0.5) * 0.55, a * (0.3 + 0.1 * fj));
      float dj = length(q - o) - (0.46 - 0.035 * fj) * (0.7 + a * 0.1);
      if (dj < best) { best = dj; cy = o.y; }
    }
    if (best < 0.0) {
      hit = true;
      vec3 leaf = mix(vec3(0.18, 0.7, 0.2), sky2(0.25 + uSeed.z + stage * 0.2), 0.2);
      float touch = sin(q.x * 44.0 + sin(q.y * 23.0) * 2.0) * sin(q.y * 44.0 + sin(q.x * 19.0) * 2.0);
      c = leaf * (0.7 + 0.52 * smoothstep(-0.3, 0.3, q.y - cy - q.x * 0.4));
      if (touch > 0.72) c = mix(c, vec3(0.78, 1.0, 0.45), 0.5);
    }
  } else if (kind < 4.5) {
    // a saucer, banking the way it goes: a dome on a disc, a ring of lights running round it
    vec2 k = rot(b.x * 0.4) * q;
    float disc = length(k * vec2(1.0, 3.2)) - 0.52;
    float dome = max(length(k - vec2(0.0, 0.05)) - 0.24, -k.y + 0.02);
    vec3 fc = sky2(0.9 + uSeed.x);
    if (disc < 0.0) {
      hit = true;
      c = mix(vec3(0.85), fc, 0.6) * skTone(k.y * 8.0);
      float lights = fract(k.x * 3.0 + b.y * 1.0);
      if (abs(k.y + 0.03) < 0.045 && lights < 0.4) c = vec3(1.0, 0.95, 0.5);
    }
    if (dome < 0.0) { hit = true; c = vec3(0.55, 0.85, 1.0) * skTone(0.5 - k.x * 6.0); }
  } else if (kind < 5.5) {
    // a pod: a shell that parts to show a burning core
    float open = b.x;
    float l = length(q);
    if (l < 0.72) {
      float gap = 0.03 + 0.32 * open;
      vec3 shell = sky2(0.72 + uSeed.x) * skTone(q.y * 2.0 - q.x);
      if (abs(q.y) > gap) {
        hit = true;
        c = shell;
        if (abs(abs(q.y) - gap - 0.06) < 0.02) c *= 0.5;
      } else if (l < 0.5) {
        hit = true;
        c = mix(vec3(1.0, 0.25, 0.1), vec3(1.0, 1.0, 0.6), smoothstep(0.42, 0.1, l));
      } else if (open < 0.1) {
        hit = true;
        c = vec3(0.08);
      }
    }
  } else if (kind < 6.5) {
    // a hopper: a striped ball, flattened as it lands
    vec2 k = q * vec2(1.0 - 0.28 * b.x, 1.0 + 0.45 * b.x);
    float l = length(k);
    if (l < 0.55) {
      hit = true;
      vec3 ball = sky2(0.15 + uSeed.y);
      float st = step(0.5, fract(k.y * 2.6 + b.y * 2.0));
      c = mix(ball, vec3(0.95), st * 0.8) * skTone(dot(k, vec2(-0.7, 1.0)) * 2.2);
      if (l > 0.5) c *= 0.45;
    }
  } else if (kind < 7.5) {
    // an orb of the serpent: banded, its colour turning as it is hurt; the head has eyes
    vec3 oc = mix(sky2(0.35 + b.y * 0.11 + uSeed.w), vec3(1.0), 0.18);
    float l = length(q);
    if (l < b.x) {
      hit = true;
      float u = l / b.x;
      c = oc * skTone(dot(q / b.x, vec2(-0.55, 0.83)) * 1.6);
      if (abs(u - 0.72) < 0.05) c *= 0.55;
      if (u > 0.93) c *= 0.4;
      if (b.z > 0.5) {
        vec2 e = vec2(abs(q.x) - 0.38 * b.x, q.y - 0.22 * b.x) / b.x;
        float el = length(e);
        if (el < 0.2) c = vec3(1.0);
        if (length(e - vec2(0.0, -0.03)) < 0.09) c = vec3(0.05);
        if (abs(q.x) < 0.5 * b.x && abs(q.y + 0.42 * b.x) < 0.07 * b.x) c = vec3(0.1, 0.02, 0.02);
      }
    }
    if (hit) return mix(haze, c, fog);
    return col;
  } else if (kind < 8.5) {
    // his shot: a ringed ball, its colours flickering, nothing lost to haze
    vec2 k = q * vec2(0.8, 1.05);
    float l = length(k);
    if (l < 0.34) {
      vec3 ring = sky2(0.08 + b.y * 0.25 + uSeed.x);
      c = l < 0.17 ? vec3(1.0, 1.0, 0.95) : (l < 0.25 ? mix(ring, vec3(1.0), 0.55) : ring);
      return c;
    }
    return col;
  } else if (kind < 9.5) {
    // what is fired at him: a spiked ball, pulsing
    float a = atan(q.y, q.x);
    float l = length(q);
    float rr = 0.26 + 0.09 * step(0.5, fract(a * 1.27 + b.x * 3.0)) + 0.03 * sin(b.x * 40.0);
    if (l < rr) return l < 0.14 ? vec3(1.0, 1.0, 0.8) : vec3(1.0, 0.2, 0.15);
    return col;
  } else if (kind < 10.5) {
    // a burst: a ball of fire going up in smoke
    float since = b.x, size = b.y;
    float u = since / 0.6;
    float l = length(q) / size;
    float n = vnoise(q * 5.0 / size + vec2(0.0, -since * 5.0) + float(i));
    float rr = (0.25 + 0.75 * sqrt(u)) * (0.72 + 0.5 * n);
    if (l < rr) {
      float heat = (1.0 - l / rr) * 1.4 + (1.0 - u) * 0.9 - u * 0.6;
      if (heat > 1.25) c = vec3(1.0, 1.0, 0.82);
      else if (heat > 0.75) c = vec3(1.0, 0.78, 0.25);
      else if (heat > 0.3) c = vec3(0.95, 0.36, 0.1);
      else c = vec3(0.32, 0.26, 0.26);
      if (u > 0.82 && hash12(floor(q * 30.0) + since) > 1.0 - (u - 0.82) * 5.5) return col;
      return c;
    }
    return col;
  } else {
    // a spark, where a shot has glanced off
    float l = abs(q.x) + abs(q.y);
    float m = 0.5 * (1.0 - b.x / 0.25);
    if (l < m && abs(q.x) * abs(q.y) < 0.012) return vec3(1.0, 1.0, 0.8);
    return col;
  }
  if (hit) return mix(haze, c, fog);
  return col;
}

vec3 render(vec2 p, vec2 uv) {
  p = (floor(p * ROWS) + 0.5) / ROWS;           // about the arcade's own lines
  float H = uSkyCam.x, E = uSkyCam.y, travel = uSkyFx.y, camX = uSkyFx.z, stage = uSkyFx.w;
  float tint = stage * 0.17;
  // the sky, pale toward the horizon
  vec3 top = sky2(0.68 + uSeed.y + tint), low = sky2(0.55 + uSeed.y + tint) * 0.82 + 0.18;
  vec3 col = mix(low, top, smoothstep(0.0, 0.55, p.y - H));
  vec3 haze = low;
  // two ranges on the horizon, the nearer sliding faster with the plain
  float up = p.y - H;
  if (up > 0.0 && up < 0.2) {
    float x1 = p.x * 3.0 + camX * 0.04 + uSeed.x * 20.0;
    float h1 = 0.035 + 0.05 * vnoise(vec2(x1, 1.7)) + 0.018 * vnoise(vec2(x1 * 3.5, 4.2));
    if (up < h1) col = mix(low, sky2(0.6 + uSeed.y + tint) * 0.55, 0.65);
    float x2 = p.x * 7.0 + camX * 0.12 + uSeed.y * 30.0;
    float h2 = 0.012 + 0.03 * vnoise(vec2(x2, 7.1)) * (0.6 + 0.4 * step(0.5, fract(x2 * 2.0)));
    if (up < h2) col = mix(sky2(0.3 + uSeed.z + tint) * 0.45, low * 0.5, 0.3);
  }
  int n = int(uSkyCount.x + 0.5), split = int(uSkyCount.y + 0.5);
  // the plain: long stripes running to the horizon, crossed by dark bands rushing at the screen, and on it every shadow
  if (p.y < H) {
    float z = E * F / max(H - p.y, 0.0008);
    float wx = p.x * z / F + camX;
    float wz = z + travel;
    float stripe = mod(floor(wx / 1.2), 2.0);
    float band = mod(floor(wz / 1.0), 2.0);
    vec3 g = mix(sky2(0.2 + uSeed.z + tint) * 0.72, sky2(0.26 + uSeed.z + tint), stripe);
    g *= band > 0.5 ? 1.0 : 0.8;
    g *= 1.0 + 0.05 * uKick;
    float sh = 1.0;
    for (int i = 0; i < 48; i++) {
      if (i >= n) break;
      vec4 s = uSkySpr[i];
      if (s.w > 7.5 && s.w < 8.5) continue;
      if (s.w > 9.5) continue;
      float sc = F / s.z;
      if (abs(p.x - s.x) > 1.3 * sc || abs(p.y - H + E * sc) > 0.5 * sc) continue;
      vec2 q = (p - vec2(s.x, H - E * sc)) / sc;
      float e = uSkySprB[i].w;
      if (s.w < 0.5) e = 0.5;
      else if (s.w < 3.5) e *= 0.72;
      else if (s.w > 8.5) e = 0.3;
      else e *= 0.75;
      if (length(q * vec2(1.0, 1.0 + 3.0 * s.z / max(E * 4.0, 1.0))) < e) sh = 0.62;
    }
    {
      // his, at the foot of the screen, the same however high he is
      vec2 q = (p - uSkyShade.xy) * vec2(1.0, 4.6);
      if (length(q) < 0.16) sh = 0.55;
    }
    g *= sh;
    col = mix(haze, g, exp(-z * 0.02));
  }
  // everything standing or flying, far to near; he comes in his place among them
  vec4 flyer = skyFlyer(p);
  for (int i = 0; i < 48; i++) {
    if (i == split && flyer.a > 0.5) col = flyer.rgb;
    if (i >= n) break;
    vec4 s = uSkySpr[i];
    vec4 sb = uSkySprB[i];
    float sc = F / s.z;
    if (abs(p.x - s.x) > sb.w * sc) continue;
    float dy = (p.y - s.y) / sc;
    if (s.w < 3.5) { if (dy < -0.2 || dy > sb.x + 0.5) continue; }
    else if (abs(dy) > sb.w) continue;
    col = skySprite(col, p, i, haze);
  }
  // the drop: a white flash, and the next stage
  if (uSkyCam.w >= 0.0) col += vec3(1.0) * exp(-uSkyCam.w * 6.0) * 0.75;
  // the score, top right; his lives, top left
  for (int k = 0; k < 6; k++) {
    int dg = int(mod(floor(uSkyFx.x / pow(10.0, float(5 - k))), 10.0));
    col = mix(col, vec3(1.0, 0.95, 0.5), digit7((p - vec2(0.55 + float(k) * 0.045, 0.42)) / 0.04, dg));
  }
  for (int k = 0; k < 3; k++) {
    if (float(k) >= uSkyCam.z) break;
    vec2 q = p - vec2(-0.8 + float(k) * 0.05, 0.45);
    if (length(q * vec2(1.0, 0.8)) < 0.016) col = sky2(uSeed.w);
  }
  return col;
}
`;

const artillery = `
// The artillery: two teams of little beetles on an island in the sea, seen from
// the side, as the turn-based artillery games of the PC played it. The game runs
// as a simulation at a fixed step (src/core/sims.js): every flight, bounce and
// blast is physics, solved so the blast lands on the music. That side also
// moves the camera, so all this is drawn through it, in world units.
uniform vec4 uArtK;          // the island's waves, the round's
uniform vec4 uCam;           // what the camera looks at; world units a board unit shows (the zoom); the sea's level
uniform vec4 uCraters[64];   // x, y, radius, since (-1: a cave, no burn; radius 0 ends the list)
uniform vec4 uBeetles[10];   // x, y, roll, health left
uniform vec4 uBeetleB[10];   // team, state (0 standing, 1 aiming, 2 thrown, 3 a stone, 4 sinking, 5 gone), aim, facing
uniform vec4 uShells[8];     // x, y, kind + 10 * the fuse's seconds left, heading
uniform vec4 uPuffs[24];     // x, y, age
uniform vec4 uABooms[8];     // x, y, since, blast (negative: a splash)
uniform vec4 uPops[4];       // x, y, damage, since
uniform vec2 uDots[32];      // the trial arc
uniform vec4 uAim;           // who aims: x, y, angle, power (power < 0: nobody)
uniform vec4 uMark;          // the mark: x, y, on; how old the trial arc is (< 0: none)
uniform vec4 uFlyer;         // the great dragonfly: x, y, heading, on
uniform vec4 uArtFx;         // wind (-1 to 1), health left on each side, how far the wind has blown
uniform vec4 uMuzzle;        // where the shot left: x, y, flash; the seconds left to fire
float artGround(float x) {
  float e = clamp((820.0 - abs(x)) / 260.0, 0.0, 1.0);
  e = e * e * (3.0 - 2.0 * e);
  return -90.0 + e * (230.0 + 70.0 * cos(x * 0.0061 + uArtK.x) + 46.0 * sin(x * 0.0137 + uArtK.y) + 20.0 * sin(x * 0.031 + uArtK.z)
    + 8.0 * sin(x * 0.083 + uArtK.x) + 80.0 * uArtK.w * exp(-x * x / 90000.0));
}
vec3 teamCol(float team) {
  vec3 c = unblack(pal(team < 0.5 ? 0.05 + uSeed.x * 0.3 : 0.55 + uSeed.x * 0.3));
  return c / max(max(c.r, c.g), max(c.b, 0.3));
}
// a shape's edge, one screen pixel soft
float artFill(float d, float aa) { return 1.0 - smoothstep(0.0, aa, d); }
float artBox(vec2 q, vec2 b) { vec2 e = abs(q) - b; return length(max(e, vec2(0.0))) + min(max(e.x, e.y), 0.0); }
// a number over the world, drawn at a fixed size on the screen
float artNumber(vec2 q, float n) {
  float d = mod(floor(n / 10.0), 10.0), u = mod(floor(n), 10.0);
  float v = 0.0;
  if (q.x >= 0.0 && q.x < 1.0 && q.y >= 0.0 && q.y < 2.0) v = digit7(q, int(u));
  if (d > 0.0 && q.x >= -1.25 && q.x < -0.25 && q.y >= 0.0 && q.y < 2.0) v = digit7(q + vec2(1.25, 0.0), int(d));
  return v;
}
vec3 render(vec2 p, vec2 uv) {
  float zoom = uCam.z * (1.0 - 0.02 * uKick);
  vec2 w = uCam.xy + p * zoom;                 // the world under this pixel
  float aa = zoom / 620.0;                     // a pixel, in world units
  float sea = uCam.w + 2.5 * sin(w.x * 0.03 + uTime * 1.7) + 1.5 * sin(w.x * 0.071 - uTime * 2.3) + 3.0 * uBass;

  // the sky, seed-tinted, and two ranges far behind that scarcely move with the camera
  vec3 tint = unblack(pal(0.62 + uSeed.y * 0.2));
  tint /= max(max(tint.r, tint.g), max(tint.b, 0.3));
  vec3 hush = mix(tint, vec3(dot(tint, vec3(0.3, 0.5, 0.2))), 0.6);
  vec3 col = mix(hush * 0.2 + vec3(0.02, 0.02, 0.06), vec3(0.01, 0.01, 0.04), smoothstep(-0.3, 0.45, p.y));
  vec2 st = p * 1.0 + uCam.xy * 0.00025;
  col += vec3(0.8, 0.85, 1.0) * step(0.9965, hash12(floor(st * 240.0))) * 0.55 * smoothstep(-0.05, 0.3, p.y);
  float fx = uCam.x * 0.18 + p.x * zoom * 0.55, fy = uCam.y * 0.18 + p.y * zoom * 0.55;
  float far = 120.0 + 70.0 * sin(fx * 0.0034 + uArtK.y) + 40.0 * sin(fx * 0.0087 + uArtK.x) + 7.0 * sin(fx * 0.031 + uArtK.z);
  if (fy < far) col = hush * 0.13 + vec3(0.02, 0.025, 0.04);
  float nx = uCam.x * 0.4 + p.x * zoom * 0.75, ny = uCam.y * 0.4 + p.y * zoom * 0.75;
  float near = 60.0 + 44.0 * sin(nx * 0.0052 + uArtK.z) + 22.0 * sin(nx * 0.0141 + uArtK.x);
  if (ny < near) col = hush * 0.07 + vec3(0.012, 0.015, 0.025);
  // motes on the wind, so it can be seen
  vec2 mq = (w - vec2(uArtFx.w, -uTime * 14.0)) / 46.0;
  vec2 mi = floor(mq);
  float mh = hash12(mi + 3.7);
  if (mh > 0.86) {
    vec2 mf = fract(mq) - 0.5 - (vec2(hash12(mi + 1.3), hash12(mi + 2.9)) - 0.5) * 0.6;
    float stretch = 1.0 + abs(uArtFx.x) * 3.0;
    mf = rot(mh * 40.0 + uTime * (1.0 + mh)) * mf;
    col = mix(col, hush * 0.7 + vec3(0.12), artFill(length(mf * vec2(1.0 / stretch, 2.2)) - 0.075, 0.02 + aa / 46.0) * 0.8);
  }

  // the island: earth under a grass edge, the craters and caves dug out of it
  float g = artGround(w.x);
  if (w.y < g) {
    bool ground = true;
    float rim = 1e9, burn = 1e9;
    for (int i = 0; i < 64; i++) {
      vec4 c = uCraters[i];
      if (c.z <= 0.0) break;
      float d = length(w - c.xy) - c.z;
      if (d < 0.0) { ground = false; break; }
      rim = min(rim, d);
      if (c.w >= 0.0) burn = min(burn, d);
    }
    if (ground) {
      vec3 dark = mix(vec3(0.2, 0.12, 0.07), unblack(pal(0.1 + uSeed.z * 0.2)) * 0.28, 0.25);
      vec3 lit = mix(vec3(0.5, 0.33, 0.18), unblack(pal(0.1 + uSeed.z * 0.2)) * 0.55, 0.25);
      float wy = w.y + 26.0 * vnoise(w * vec2(0.011, 0.02));
      float layer = 0.5 + 0.5 * sin(wy * 0.075) * sin(wy * 0.031 + 1.3);
      float soil = layer * 0.66 + vnoise(w * vec2(0.09, 0.2)) * 0.34;
      col = mix(dark, lit, soil);
      vec2 cell = floor(w / 21.0), fc = fract(w / 21.0) - 0.5;
      float stoneH = hash12(cell + 11.0);
      if (stoneH > 0.74) {
        vec2 at = fc - (vec2(hash12(cell + 2.0), hash12(cell + 5.0)) - 0.5) * 0.4;
        float pebble = length(at * vec2(1.0, 1.35)) - 0.1 - 0.2 * (stoneH - 0.74) / 0.26;
        vec3 rock = mix(vec3(0.5, 0.46, 0.4), vec3(0.72, 0.68, 0.6), smoothstep(-0.2, 0.2, at.y));
        col = mix(col, col * 0.62, artFill(pebble - 0.035, 0.02 + aa / 21.0));
        col = mix(col, rock, artFill(pebble, 0.02 + aa / 21.0));
      }
      col *= 1.0 - 0.28 * smoothstep(0.0, 240.0, g - w.y);                       // darker the deeper
      float top = g - w.y;
      vec3 grass = mix(vec3(0.2, 0.6, 0.16), vec3(0.42, 0.8, 0.22), vnoise(vec2(w.x * 0.25, 0.0)));
      float blade = 4.0 + 2.5 * vnoise(vec2(w.x * 0.5, 3.0));
      col = mix(col, grass, artFill(top - blade, aa));
      col = mix(col, vec3(0.8, 0.98, 0.45), artFill(top - 1.3, aa) * 0.8);
      col *= 1.0 - 0.72 * artFill(burn - 9.0, 7.0);
      vec3 edge = mix(vec3(0.95, 0.78, 0.32), unblack(pal(0.14 + uSeed.z * 0.2)), 0.25);
      col *= 1.0 - 0.5 * artFill(rim - 7.0, 3.0);
      col = mix(col, edge, artFill(rim - 2.6, aa));
    }
  }

  // the beetles: a domed shell in the side's colour, a head with antennae, six legs; one that aims holds up its
  // launcher, one thrown tumbles with its legs out, and a fallen one leaves a stone
  for (int i = 0; i < 10; i++) {
    vec4 s = uBeetles[i], m = uBeetleB[i];
    if (m.y > 4.5) continue;
    vec2 d = w - s.xy;
    if (dot(d, d) > 1100.0) continue;
    float face = m.w;
    vec2 q = d;
    if (m.y > 1.5 && m.y < 2.5) q = rot(s.z) * q;
    q.x *= face;
    float qa = aa;
    if (m.y > 2.5 && m.y < 3.5) {
      float stone = artBox(q - vec2(0.0, -2.0), vec2(4.2, 5.0));
      stone = min(stone, length(q - vec2(0.0, 3.0)) - 4.2);
      col = mix(col, vec3(0.5, 0.5, 0.54) * (0.8 + 0.2 * step(0.0, q.x)), artFill(stone, qa));
      col = mix(col, vec3(0.28), artFill(sdSeg(q, vec2(-1.8, 1.5), vec2(1.8, 1.5)) - 0.35, qa));
      continue;
    }
    vec3 tc = teamCol(m.x);
    bool thrown = m.y > 1.5 && m.y < 2.5;
    float wig = thrown ? sin(uTime * 34.0 + float(i)) * 1.2 : sin(uBeat * 6.28318 + float(i) * 1.3) * 0.25;
    // the legs, three to a side, seen as three
    float legs = 1e9;
    for (int k = 0; k < 3; k++) {
      float fk = float(k) - 1.0;
      vec2 hip = vec2(fk * 3.6, -3.5);
      vec2 knee = hip + vec2(fk * 1.6 + 0.4, -2.0 + (mod(float(k), 2.0) - 0.5) * wig);
      vec2 foot = knee + vec2(fk * 1.2 - 0.3, -3.0 + (0.5 - mod(float(k), 2.0)) * wig);
      if (thrown) foot = knee + vec2(fk * 2.2, 2.4 * wig - 1.0);
      legs = min(legs, min(sdSeg(q, hip, knee), sdSeg(q, knee, foot)));
    }
    col = mix(col, vec3(0.06, 0.05, 0.05), artFill(legs - 0.5, qa));
    // the launcher, held out along the aim
    float ang = m.z;
    vec2 dirA = vec2(cos(ang) * face, sin(ang));
    bool aiming = m.y > 0.5 && m.y < 1.5;
    // the head and antennae, ahead of the shell
    vec2 hc = vec2(7.2, 0.8);
    float head = length(q - hc) - 3.3;
    float ant = min(sdSeg(q, hc + vec2(1.0, 2.6), hc + vec2(4.2, 7.0 + wig)), sdSeg(q, hc + vec2(-0.4, 2.8), hc + vec2(1.4, 7.8 - wig))) - 0.32;
    col = mix(col, vec3(0.07, 0.06, 0.06), artFill(ant, qa));
    col = mix(col, vec3(0.1, 0.08, 0.08), artFill(head, qa));
    col = mix(col, vec3(0.95), artFill(length(q - hc - vec2(1.2, 0.7)) - 1.25, qa));
    col = mix(col, vec3(0.03), artFill(length(q - hc - vec2(1.6, 0.6)) - 0.6, qa));
    // the shell: a dome with a seam, spots, and a shine
    float shell = max(length((q - vec2(-1.0, -0.5)) * vec2(1.0, 1.15)) - 7.8, -(q.y + 4.2));
    col = mix(col, tc * (0.55 + 0.5 * smoothstep(-5.0, 6.0, q.y)), artFill(shell, qa));
    if (shell < 0.0) {
      col = mix(col, tc * 0.28, artFill(abs(q.y + 1.0 + q.x * q.x * 0.018) - 0.35, qa));
      vec2 sp = q - vec2(-2.5, 2.2);
      col = mix(col, tc * 0.3, artFill(length(sp) - 1.2, qa));
      col = mix(col, tc * 0.3, artFill(length(q - vec2(2.2, 2.6)) - 0.9, qa));
      col += vec3(0.5) * artFill(length((q - vec2(-1.0, 4.4)) * vec2(0.5, 1.6)) - 1.2, 1.2);
    }
    if (aiming) {
      vec2 hold = vec2(0.5, 3.0);
      col = mix(col, vec3(0.16, 0.16, 0.2), artFill(sdSeg(q, hold - dirA * 7.0, hold + dirA * 13.0) - 2.2, qa));
      col = mix(col, vec3(0.55, 0.55, 0.62), artFill(sdSeg(q, hold + dirA * 12.0, hold + dirA * 13.0) - 2.7, qa));
      col = mix(col, vec3(0.08, 0.07, 0.08), artFill(sdSeg(q, hold + dirA * 2.0, hold + dirA * 2.0 + vec2(0.0, -3.0)) - 0.8, qa));
    }
    // health over its head, the same size on the screen at any zoom
    if (m.y < 2.5) {
      vec2 bq = (w - s.xy - vec2(0.0, 16.0 + 0.026 * zoom)) / zoom;
      if (abs(bq.x) < 0.03 && abs(bq.y) < 0.0165) {
        col = vec3(0.02);
        col = mix(col, tc, artNumber(bq / 0.0115 + vec2(0.5, 1.0), floor(s.w * 60.0 + 0.5)));
      }
    }
  }

  // the trail of smoke behind what flies
  for (int i = 0; i < 24; i++) {
    vec4 q = uPuffs[i];
    if (q.z > 0.9) continue;
    vec2 d = w - q.xy;
    float r = 2.5 + 11.0 * q.z;
    if (dot(d, d) > r * r * 3.0) continue;
    float e = artFill(length(d) - r, r * 0.55) * (1.0 - q.z / 0.9);
    col = mix(col, mix(vec3(0.95, 0.72, 0.4), vec3(0.62), smoothstep(0.0, 0.14, q.z)), e * 0.65);
  }

  // what flies, never smaller than a few pixels however far the camera is
  for (int i = 0; i < 8; i++) {
    vec4 s = uShells[i];
    if (s.z < 0.5) continue;
    float id = mod(s.z, 10.0), left = floor(s.z / 10.0);
    float grow = max(1.3, zoom / 230.0);
    vec2 d = (w - s.xy) / grow;
    if (dot(d, d) > 500.0) continue;
    vec2 q = rot(-s.w) * d;
    if (id < 3.5) {
      // a shell, nose first, finned, its flame behind it
      float size = id < 2.5 ? 1.0 : 0.8;
      vec2 r = q / size;
      float body = sdSeg(r, vec2(-6.0, 0.0), vec2(4.0, 0.0)) - 2.4;
      float fin = sdSeg(r, vec2(-6.0, 0.0), vec2(-8.0, 3.4)) - 0.8;
      fin = min(fin, sdSeg(r, vec2(-6.0, 0.0), vec2(-8.0, -3.4)) - 0.8);
      col = mix(col, vec3(0.32, 0.34, 0.38), artFill(min(fin, body), aa / grow));
      vec3 nose = id < 1.5 ? vec3(0.9, 0.2, 0.15) : vec3(0.95, 0.75, 0.2);
      if (id > 2.5) nose = vec3(0.55, 0.75, 0.3);
      col = mix(col, nose, artFill(sdSeg(r, vec2(3.5, 0.0), vec2(5.0, 0.0)) - 2.0, aa / grow));
      if (id < 2.5) col += vec3(1.0, 0.6, 0.2) * exp(-length(r - vec2(-11.0, 0.0)) * 0.3) * (0.9 + 0.4 * sin(uTime * 60.0));
    } else if (id < 5.5) {
      // what goes on a fuse: round, a band and a pin, and the seconds left over it
      vec3 body = id < 4.5 ? vec3(0.2, 0.42, 0.22) : vec3(0.72, 0.28, 0.22);
      float e = length(q) - 5.0;
      col = mix(col, body * (0.75 + 0.5 * smoothstep(-5.0, 5.0, d.y)), artFill(e, aa / grow));
      col = mix(col, body * 0.35, artFill(abs(q.y) - 0.7, aa / grow) * artFill(e, aa / grow));
      col = mix(col, vec3(0.6), artFill(sdSeg(q, vec2(0.0, 4.5), vec2(0.0, 7.0)) - 0.9, aa / grow));
      vec2 nq = (w - s.xy - vec2(0.0, 0.05 * zoom)) / (zoom * 0.021);
      col = mix(col, vec3(1.0, 0.95, 0.5), artNumber(nq + vec2(0.5, 1.0), left));
    } else if (id < 6.5) {
      float e = length(q) - 2.8;
      col = mix(col, vec3(0.85, 0.42, 0.18), artFill(e, aa / grow));
    } else {
      // a pod the dragonfly lets go: long and seed-shaped
      float e = length(q * vec2(0.6, 1.0)) - 3.6;
      col = mix(col, vec3(0.38, 0.5, 0.2) * (0.7 + 0.5 * smoothstep(-3.0, 3.0, q.y)), artFill(e, aa / grow));
    }
  }
  if (uMuzzle.z > 0.0) col += vec3(1.0, 0.8, 0.4) * exp(-length(w - uMuzzle.xy) / (5.0 + 0.012 * zoom)) * uMuzzle.z * 1.6;

  // the blasts: a flash, a fireball swelling and going to smoke, earth thrown out and falling by the same gravity as all else
  for (int i = 0; i < 8; i++) {
    vec4 b = uABooms[i];
    if (b.z > 1.6) continue;
    vec2 d = w - b.xy;
    float r = length(d);
    if (b.w < 0.0) {
      // a splash: drops thrown up that fall back to the sea
      float size = -b.w;
      for (int k = 0; k < 9; k++) {
        float fk = float(k), a = 0.9 + fk * 0.17 + 0.1 * hash11(fk + b.x);
        vec2 v = vec2(cos(a), sin(a)) * (190.0 + 110.0 * hash11(fk * 3.1 + b.x)) * size;
        vec2 pk = b.xy + v * b.z - vec2(0.0, 250.0 * b.z * b.z);
        col = mix(col, vec3(0.8, 0.92, 1.0), artFill(length(w - pk) - 2.4, aa) * step(uCam.w, pk.y));
      }
      continue;
    }
    if (r > b.w * 7.0 + 200.0) continue;
    float grow = sqrt(b.z);
    float fire = b.w * (0.45 + 0.95 * grow);
    float bump = 7.0 * vnoise(d * 0.09 + b.z * 2.0) - 3.5;
    if (b.z < 0.42) {
      float t01 = b.z / 0.42;
      vec3 hot = mix(vec3(1.0, 0.97, 0.75), vec3(1.0, 0.45, 0.08), smoothstep(0.0, fire, r + bump));
      col = mix(col, hot, artFill(r + bump - fire, b.w * 0.12) * (1.0 - t01 * t01));
    }
    if (b.z > 0.1) {
      for (int k = 0; k < 10; k++) {
        float fk = float(k), a = fk * 0.628 + hash11(fk + b.x * 0.3);
        float life = 0.6 + 0.7 * hash11(fk * 5.0 + b.y);
        float age = b.z / life;
        if (age > 1.0) continue;
        vec2 c = b.xy + vec2(cos(a), sin(a) * 0.85) * b.w * (0.5 + 0.55 * sqrt(age)) + vec2(0.0, 30.0 * b.z);
        float rr = b.w * (0.15 + 0.17 * hash11(fk * 9.0)) * (1.0 - age * age * 0.6);
        if (dot(w - c, w - c) > rr * rr * 1.7) continue;
        float e = artFill(length(w - c) - rr + 0.18 * rr * vnoise((w - c) * 0.3 + fk), aa + rr * 0.1);
        vec3 tone = mix(vec3(0.62), vec3(0.26), age);
        tone *= 0.84 + 0.2 * clamp((w.y - c.y) / rr, -1.0, 1.0);
        if (b.z < 0.34) tone = mix(vec3(1.0, 0.5, 0.12), tone, smoothstep(0.1, 0.34, b.z));
        col = mix(col, tone, e * (1.0 - age * age));
      }
    }
    for (int k = 0; k < 11; k++) {
      float fk = float(k), a = fk * 0.57 + 0.3 + hash11(fk + b.x * 0.13) * 0.4;
      vec2 v = vec2(cos(a), 0.35 + abs(sin(a))) * (130.0 + 240.0 * hash11(fk * 3.0 + b.y * 0.17)) * sqrt(b.w / 50.0);
      vec2 pk = b.xy + v * b.z - vec2(0.0, 250.0 * b.z * b.z);
      col = mix(col, vec3(0.34, 0.21, 0.1), artFill(length(w - pk) - 1.1 - 1.8 * hash11(fk * 7.0), aa) * step(b.z, 1.4));
    }
    col += vec3(1.0, 0.8, 0.5) * exp(-b.z * 13.0) * 0.32 * min(1.0, b.w / 50.0);
  }

  // the great dragonfly, crossing high up with its pods: a long body and two pairs of beating wings
  if (uFlyer.w > 0.5) {
    vec2 d = (w - uFlyer.xy) * vec2(uFlyer.z, 1.0);
    if (dot(d, d) < 6400.0) {
      float beat = sin(uTime * 52.0);
      float body = sdSeg(d, vec2(-46.0, 1.0 + 2.0 * sin(uTime * 7.0)), vec2(16.0, 0.0)) - 2.6;
      body = min(body, sdSeg(d, vec2(10.0, 0.0), vec2(20.0, 0.0)) - 4.6);
      vec3 tone = unblack(pal(0.3 + uSeed.w * 0.3));
      tone /= max(max(tone.r, tone.g), max(tone.b, 0.3));
      for (int k = 0; k < 2; k++) {
        float at = k == 0 ? 8.0 : -6.0, lean = k == 0 ? 0.25 : -0.2;
        vec2 tip = vec2(at + lean * 44.0, 44.0 * (0.25 + 0.75 * beat));
        float wing = sdSeg(d, vec2(at, 2.0), tip) - 5.0 * smoothstep(0.0, 1.0, clamp(length(d - vec2(at, 2.0)) / 40.0, 0.0, 1.0)) - 0.8;
        col = mix(col, mix(col, vec3(0.85, 0.95, 1.0), 0.45), artFill(wing, aa));
      }
      col = mix(col, tone * 0.7, artFill(body, aa));
      col = mix(col, vec3(0.95), artFill(length(d - vec2(21.0, 2.0)) - 2.3, aa));
      col = mix(col, vec3(0.03), artFill(length(d - vec2(22.0, 2.0)) - 1.1, aa));
    }
  }

  // the sea over it all, deepening
  if (w.y < sea) {
    float depth = sea - w.y;
    vec3 deep = mix(vec3(0.03, 0.1, 0.28), tint * 0.25, 0.25);
    vec3 shallow = mix(vec3(0.1, 0.4, 0.6), tint * 0.5, 0.25);
    vec3 water = mix(shallow, deep, smoothstep(0.0, 60.0, depth));
    water += vec3(0.25, 0.35, 0.4) * step(0.72, vnoise(vec2(w.x * 0.05 + uTime * 0.6, w.y * 0.22))) * (1.0 - smoothstep(0.0, 40.0, depth)) * 0.45;
    col = mix(col, water, 0.86);
    col = mix(col, vec3(0.86, 0.96, 1.0), artFill(depth - 2.0, aa) * 0.8);
    for (int k = 1; k < 4; k++) {
      float fk = float(k), level = uCam.w - fk * 15.0 - 3.0;
      float crest = level + (3.0 + fk) * sin(w.x * (0.022 + fk * 0.006) + uTime * (1.3 - 0.8 * mod(fk, 2.0)) + fk * 2.1);
      col = mix(col, mix(shallow, deep, fk / 4.0) * (1.25 - 0.1 * fk), artFill(w.y - crest, aa));
      col = mix(col, shallow * 1.8, artFill(abs(w.y - crest) - 0.9, aa) * 0.55);
    }
  }

  // the sum being done: the trial arc in dots, the mark, the aim and how hard
  if (uMark.w >= 0.0) {
    float fade = smoothstep(0.0, 0.08, uMark.w);
    float bestDot = 1e9, lastI = -1.0;
    for (int i = 0; i < 32; i++) {
      vec2 q = uDots[i];
      float e = length(w - q);
      if (e < bestDot) { bestDot = e; lastI = float(i); }
    }
    float rad = 1.6 + 0.0045 * zoom;
    float reach = clamp(uMark.w / 0.22, 0.0, 1.0) * 31.0;
    if (lastI <= reach) col = mix(col, vec3(1.0, 0.98, 0.72), artFill(bestDot - rad, aa) * 0.9 * fade);
  }
  if (uMark.z > 0.5) {
    vec2 d = w - uMark.xy;
    float r = 0.03 * zoom;
    float ring = abs(length(d) - r * (1.0 + 0.2 * uKick)) - 0.0028 * zoom;
    float cross2 = min(max(abs(d.x) - r * 1.5, abs(d.y) - 0.0024 * zoom), max(abs(d.y) - r * 1.5, abs(d.x) - 0.0024 * zoom));
    cross2 = max(cross2, r * 0.55 - length(d));
    col = mix(col, vec3(1.0, 0.28, 0.2), artFill(min(ring, cross2), aa) * 0.95);
  }
  if (uAim.w >= 0.0) {
    vec2 dir = vec2(cos(uAim.z), sin(uAim.z));
    vec2 d = w - uAim.xy;
    float along = dot(d, dir), off = abs(dot(d, vec2(-dir.y, dir.x)));
    float len = 26.0 + 60.0 * uAim.w;
    if (uAim.w > 0.001 && along > 8.0 && along < len && off < (along / len) * 6.5) {
      col = mix(col, mix(vec3(1.0, 0.85, 0.15), vec3(1.0, 0.15, 0.08), along / len), 0.92);
    }
    float cr = length(d - dir * 34.0);
    col = mix(col, vec3(1.0), artFill(abs(cr - 3.0) - 0.7, aa));
  }

  // the numbers that rise off what was hit
  for (int i = 0; i < 4; i++) {
    vec4 q = uPops[i];
    if (q.w > 1.3) continue;
    vec2 nq = (w - q.xy - vec2(0.0, 0.05 * zoom + 0.05 * zoom * q.w)) / (zoom * 0.021);
    float v = artNumber(nq + vec2(0.5, 1.0), q.z);
    if (v > 0.0) col = mix(col, vec3(1.0, 0.92, 0.35), v * (1.0 - smoothstep(0.9, 1.3, q.w)));
  }

  // each side's strength above, the wind below
  for (int t = 0; t < 2; t++) {
    float left = t == 0 ? uArtFx.y : uArtFx.z;
    vec2 bq = p - vec2(-0.2, t == 0 ? -0.425 : -0.463);
    if (bq.x > -0.004 && bq.x < 0.404 && abs(bq.y) < 0.017) {
      col = vec3(0.03);
      if (bq.x > 0.0 && bq.x < 0.4 * left && abs(bq.y) < 0.012) col = teamCol(float(t));
    }
  }
  vec2 cq = p - vec2(-0.82, -0.445);
  if (abs(cq.x) < 0.052 && abs(cq.y) < 0.036) {
    col = vec3(0.03);
    if (uMuzzle.w >= 0.0) col = mix(col, vec3(1.0, 0.85, 0.3), artNumber(cq / 0.021 + vec2(0.5, 1.0), ceil(uMuzzle.w)));
  }
  vec2 wq = p - vec2(0.6, -0.445);
  if (abs(wq.y) < 0.017 && abs(wq.x) < 0.24) {
    col = vec3(0.03);
    float wv = uArtFx.x * 0.23;
    if (abs(wq.y) < 0.011 && wq.x * sign(wv) > 0.0 && abs(wq.x) < abs(wv)) {
      float chev = fract((wq.x * sign(wv) - abs(wq.y)) * 40.0 - uTime * 3.0);
      col = mix(vec3(0.75, 0.15, 0.1), vec3(1.0, 0.65, 0.2), step(0.5, chev));
    }
    if (abs(wq.x) < 0.0025) col = vec3(0.7);
  }
  return col;
}
`;

const skatepark = `
// The skate park: a wooden half-pipe in a warehouse, the skater riding wall
// to wall under gravity and up into the air at every lip - a spin, a grab -
// waiting on the coping through the build and going twice as high on the
// drop. The game runs as a simulation (src/core/sims.js), which places the
// camera and the skater's limbs; this traces the ramp and the hall.
#define STAGE_OPAQUE
uniform vec4 uSkJ[16];      // the skater's joints in the hall: feet, knees, hip, neck, shoulders, elbows, hands, head
uniform vec4 uSkB[4];       // the board: its centre, along it, its up, toward its toe edge
uniform vec4 uSkV[7];       // the body's frames: trunk up, pelvis depth, shoulder line, trunk depth, head up, face, head side
uniform vec4 uSkBound;      // a sphere about the whole of it
uniform vec4 uSkHip;        // the hip, and how high in the air
uniform vec4 uSkShadow;     // the point under the skater, in the hall; grinding
uniform vec4 uCamE, uCamF, uCamR, uCamU;   // the camera: eye (and focal length), forward, right, up
uniform vec4 uSkFx;         // score, combo, since the last landing, the last was the big one
const float RF = 2.15, RR = 3.2, RV = 0.46, RL = 4.88;   // a real vert ramp's: the flat's half width, the transitions' radius, the vert, half its width
const float HX = 12.0, HB = 7.88, HF = 14.0, HT = 9.0;   // the hall round it: its walls either side, behind, in front; its roof

// the ray against the ramp: the flat, the two quarter pipes, the vert walls, the decks; t and the surface's normal
float rampHit(vec3 ro, vec3 rd, out vec3 n) {
  float best = 1e9;
  n = vec3(0.0, 1.0, 0.0);
  // the flat and the floor round it
  if (rd.y < 0.0) { float t = -ro.y / rd.y; vec3 p = ro + rd * t; if (p.z > -HB && p.z < HF && abs(p.x) < HX && t > 0.0) { best = t; n = vec3(0.0, 1.0, 0.0); } }
  for (int s = -1; s <= 1; s += 2) {
    float sd = float(s);
    // the transition: inside a cylinder along z, centred at (sd*RF, RR)
    vec2 o = ro.xy - vec2(sd * RF, RR);
    float a = dot(rd.xy, rd.xy), b = dot(o, rd.xy), c = dot(o, o) - RR * RR;
    float h = b * b - a * c;
    if (h > 0.0) {
      float t = (-b + sqrt(h)) / a;
      vec3 p = ro + rd * t;
      if (t > 0.0 && t < best && abs(p.z) < RL && p.x * sd > RF && p.y < RR) { best = t; n = normalize(vec3(-(p.x - sd * RF), RR - p.y, 0.0)); }
    }
    // the vert above it, facing in
    float tv = (sd * (RF + RR) - ro.x) / rd.x;
    vec3 pv = ro + rd * tv;
    if (tv > 0.0 && tv < best && abs(pv.z) < RL && pv.y > RR && pv.y < RR + RV) { best = tv; n = vec3(-sd, 0.0, 0.0); }
    // the deck on top (the camera stays over the ramp, so the backs of the decks never show)
    float td = (RR + RV - ro.y) / rd.y;
    vec3 pd = ro + rd * td;
    if (td > 0.0 && td < best && abs(pd.z) < RL && pd.x * sd > RF + RR && pd.x * sd < RF + RR + 1.6) { best = td; n = vec3(0.0, 1.0, 0.0); }
  }
  // the side panels closing the ramp's ends, its profile cut in them (seen only from outside: from over the ramp the curve is nearer)
  for (int e = -1; e <= 1; e += 2) {
    float te = (float(e) * RL - ro.z) / rd.z;
    vec3 pe = ro + rd * te;
    float ax = abs(pe.x);
    if (te > 0.0 && te < best && pe.y > 0.0 && ax > RF && ax < RF + RR + 1.6 && pe.y < (ax < RF + RR ? RR - sqrt(max(RR * RR - (ax - RF) * (ax - RF), 0.0)) : RR + RV)) { best = te; n = vec3(0.0, 0.0, float(e)); }
  }
  return best;
}

// ---- the skater, in the round: limbs as tapering capsules, clothes over them, a board with its trucks and wheels
// (the 32-bit games' skaters: a T-shirt over baggy trousers, bare forearms, chunky shoes, a board with a graphic)
float cone(vec3 p, vec3 a, vec3 b, float r1, float r2) {
  vec3 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - mix(r1, r2, h);
}
float rbox(vec3 q, vec3 h, float r) { vec3 d = abs(q) - h + r; return length(max(d, 0.0)) + min(max(d.x, max(d.y, d.z)), 0.0) - r; }
// the body's distance, and which part is nearest: 1 skin, 2 shirt, 3 trousers, 4 shoes, 5 soles, 6 hair, 7 deck top, 8 deck, 9 metal, 10 wheels
float skSmin(float a, float b, float k) { float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
// a cheap shell round the figure, never nearer than it: a ray is stepped by this until it is close, and only then by the
// figure itself, whose thirty-odd blended shapes are what cost
float seg(vec3 p, vec3 a, vec3 b) {
  vec3 pa = p - a, ba = b - a;
  return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0));
}
float skaterShell(vec3 p) {
  float d = seg(p, uSkB[0].xyz - uSkB[1].xyz * 0.45, uSkB[0].xyz + uSkB[1].xyz * 0.45) - 0.25;         // the board and the shoes
  d = min(d, seg(p, uSkJ[4].xyz, uSkJ[5].xyz) - 0.3);                                                  // the trunk
  d = min(d, seg(p, uSkJ[6].xyz, uSkJ[7].xyz) - 0.16);                                                 // the shoulders
  d = min(d, length(p - uSkJ[12].xyz) - 0.2);                                                          // the head
  d = min(d, min(seg(p, uSkJ[13].xyz, uSkJ[2].xyz), seg(p, uSkJ[2].xyz, uSkJ[0].xyz)) - 0.17);         // the legs
  d = min(d, min(seg(p, uSkJ[14].xyz, uSkJ[3].xyz), seg(p, uSkJ[3].xyz, uSkJ[1].xyz)) - 0.17);
  d = min(d, min(seg(p, uSkJ[6].xyz, uSkJ[8].xyz), seg(p, uSkJ[8].xyz, uSkJ[10].xyz)) - 0.12);         // the arms
  d = min(d, min(seg(p, uSkJ[7].xyz, uSkJ[9].xyz), seg(p, uSkJ[9].xyz, uSkJ[11].xyz)) - 0.12);
  return d;
}
vec2 skater(vec3 p) {
  vec3 fF = uSkJ[0].xyz, fB = uSkJ[1].xyz, kF = uSkJ[2].xyz, kB = uSkJ[3].xyz, hip = uSkJ[4].xyz, neck = uSkJ[5].xyz;
  vec3 shF = uSkJ[6].xyz, shB = uSkJ[7].xyz, eF = uSkJ[8].xyz, eB = uSkJ[9].xyz, hF = uSkJ[10].xyz, hB = uSkJ[11].xyz, head = uSkJ[12].xyz;
  vec3 bc = uSkB[0].xyz, al = uSkB[1].xyz, up = uSkB[2].xyz, toe = uSkB[3].xyz;
  // the body is modelled as one piece of clay, as the sculpture scene models its shapes: each part a simple shape,
  // blended into the next with a smooth union, so the knees, the waist, the shoulders and the neck flow; each point
  // then takes the colour of the part it is nearest - skin, shirt or trousers
  // the trousers: baggy, wide at the ankle, the knee folding into the thigh, the seat across the hips
  // each leg from its own hip joint, 9 cm either side of the middle; the pelvis a head and a half wide over them
  vec3 hjF = uSkJ[13].xyz, hjB = uSkJ[14].xyz;
  float lF = skSmin(cone(p, fF, kF, 0.072, 0.082), cone(p, kF, hjF, 0.082, 0.1), 0.05);
  float lB = skSmin(cone(p, fB, kB, 0.072, 0.082), cone(p, kB, hjB, 0.082, 0.1), 0.05);
  vec3 pu = uSkV[0].xyz, pd = uSkV[1].xyz;
  vec3 pq = p - (hip + pu * 0.035);
  float pelvis = (length(vec3(dot(pq, al), dot(pq, pu), dot(pq, pd)) / vec3(0.17, 0.12, 0.11)) - 1.0) * 0.11;
  float tr = skSmin(skSmin(lF, lB, 0.03), pelvis, 0.07);
  // the T-shirt: a back with shoulders - widest across them, narrower at the waist, shallow from chest to back - the
  // trapezius sloping from the neck down to each shoulder, the shoulders rounded, short sleeves
  vec3 sa = uSkV[2].xyz, tu = uSkV[0].xyz, dp = uSkV[3].xyz;
  vec3 top = (shF + shB) * 0.5 - tu * 0.05, base = hip + tu * 0.04;
  // the trunk as two eggs melted into one - the chest, wide at the shoulders, and the belly, narrower - and a bar
  // across the shoulders, all blended deeply so no seam shows between them
  vec3 cq = p - (top - tu * 0.1), yq = p - (base + tu * 0.13);
  float chest = (length(vec3(dot(cq, sa), dot(cq, tu), dot(cq, dp)) / vec3(0.19, 0.17, 0.095)) - 1.0) * 0.095;
  float belly = (length(vec3(dot(yq, sa), dot(yq, tu), dot(yq, dp)) / vec3(0.14, 0.16, 0.09)) - 1.0) * 0.09;
  float sh = skSmin(chest, belly, 0.1);
  sh = skSmin(sh, cone(p, shF - tu * 0.01, shB - tu * 0.01, 0.055, 0.055), 0.14);
  vec3 nb = top + tu * 0.06;
  // (melted in deeply - a smaller blend left lumps on the chest where the trapezius and the shoulders met the trunk)
  sh = skSmin(sh, min(cone(p, nb, shF, 0.05, 0.045), cone(p, nb, shB, 0.05, 0.045)), 0.1);
  sh = skSmin(sh, min(cone(p, shF, mix(shF, eF, 0.45), 0.06, 0.054), cone(p, shB, mix(shB, eB, 0.45), 0.06, 0.054)), 0.05);
  // the arms: out of the sleeves, the elbow folding, the hand at the wrist
  float aF = skSmin(skSmin(cone(p, mix(shF, eF, 0.35), eF, 0.046, 0.04), cone(p, eF, hF, 0.04, 0.032), 0.025), length(p - hF) - 0.045, 0.025);
  float aB = skSmin(skSmin(cone(p, mix(shB, eB, 0.35), eB, 0.046, 0.04), cone(p, eB, hB, 0.04, 0.032), 0.025), length(p - hB) - 0.045, 0.025);
  float arms = min(aF, aB);
  // the head on its neck: the neck out of the shoulders, the head an egg, a nose and ears
  vec3 hq = p - head;
  vec3 lh = vec3(dot(hq, uSkV[6].xyz), dot(hq, uSkV[4].xyz), dot(hq, uSkV[5].xyz));
  float hd = (length(lh / vec3(0.092, 0.124, 0.108)) - 1.0) * 0.092;
  hd = skSmin(hd, length(lh - vec3(0.0, -0.01, 0.1)) - 0.018, 0.012);
  hd = min(hd, min(length(lh - vec3(0.094, 0.0, -0.005)) - 0.022, length(lh - vec3(-0.094, 0.0, -0.005)) - 0.022));
  float nk = cone(p, top, mix(neck, head, 0.5), 0.058, 0.05);
  float headNeck = skSmin(hd, nk, 0.04);
  // all of it one piece; the colour of whichever part is nearest
  float body = skSmin(skSmin(sh, tr, 0.05), skSmin(arms, headNeck, 0.01), 0.035);
  float skin = min(arms, headNeck);
  float m = skin < sh && skin < tr ? 1.0 : sh < tr ? 2.0 : 3.0;
  vec2 r = vec2(body, m);
  // the hair: over the crown and down the back of the head, clear of the face and the ears
  float hair = (length((lh - vec3(0.0, 0.017, -0.011)) / vec3(0.099, 0.129, 0.114)) - 1.0) * 0.097;
  hair = max(hair, -(lh.y + 0.02 - max(lh.z, 0.0) * 1.6));
  r = hair < r.x ? vec2(hair, 6.0) : r;
  // the shoes: chunky, across the board as the feet stand, their soles white
  for (int k = 0; k < 2; k++) {
    vec3 f = k == 0 ? fF : fB;
    vec3 q = p - (f - up * 0.045 + toe * 0.03);
    vec3 lq = vec3(dot(q, toe), dot(q, up), dot(q, al));
    float shoe = rbox(lq, vec3(0.135, 0.045, 0.055), 0.03);
    r = shoe < r.x ? vec2(shoe, lq.y < -0.025 ? 5.0 : 4.0) : r;
  }
  // the board: the deck, its nose and tail kicked up, the trucks and four wheels under it
  vec3 q = p - bc;
  vec3 bq = vec3(dot(q, al), dot(q, up), dot(q, toe));
  float ax = abs(bq.x);
  float kick = max(ax - 0.3, 0.0);
  vec3 dq = vec3(bq.x, bq.y - kick * kick * 2.2, bq.z);
  float deck = rbox(dq, vec3(0.41, 0.008, 0.105), 0.008);
  deck = max(deck, length(vec2(max(ax - 0.31, 0.0), bq.z)) - 0.105);
  r = deck < r.x ? vec2(deck, bq.y - kick * kick * 2.2 > 0.0 ? 7.0 : 8.0) : r;
  float trucks = min(rbox(vec3(ax - 0.27, bq.y + 0.035, bq.z), vec3(0.025, 0.025, 0.09), 0.01), 1e9);
  r = trucks < r.x ? vec2(trucks, 9.0) : r;
  vec3 wq = vec3(ax - 0.27, bq.y + 0.06, abs(bq.z) - 0.1);
  float wheel = max(length(wq.xy) - 0.028, abs(wq.z) - 0.02);
  r = wheel < r.x ? vec2(wheel, 10.0) : r;
  return r;
}
vec3 skaterColour(float m, vec3 p) {
  if (m < 1.5) {
    // skin; on the face, the eyes, the brows and the mouth
    vec3 hq = p - uSkJ[12].xyz;
    vec3 lh = vec3(dot(hq, uSkV[6].xyz), dot(hq, uSkV[4].xyz), dot(hq, uSkV[5].xyz));
    vec3 skin = vec3(0.85, 0.62, 0.48);
    if (length(hq) < 0.13 && lh.z > 0.05) {
      float eyes = min(length(lh.xy - vec2(0.035, 0.02)), length(lh.xy - vec2(-0.035, 0.02)));
      float brows = min(length((lh.xy - vec2(0.036, 0.046)) * vec2(0.6, 2.5)), length((lh.xy - vec2(-0.036, 0.046)) * vec2(0.6, 2.5)));
      float mouth = length((lh.xy - vec2(0.0, -0.055)) * vec2(0.7, 3.0));
      skin = mix(skin, vec3(0.08), 1.0 - smoothstep(0.009, 0.013, eyes));
      skin = mix(skin, vec3(0.2, 0.12, 0.06), 1.0 - smoothstep(0.01, 0.014, brows));
      skin = mix(skin, vec3(0.55, 0.3, 0.28), 1.0 - smoothstep(0.012, 0.016, mouth));
    }
    return skin;
  }
  if (m < 2.5) {
    // the shirt in the seed's colour, a band printed across the chest in another
    vec3 hip = uSkJ[4].xyz, neck = uSkJ[5].xyz;
    float h = dot(p - hip, uSkV[0].xyz) / max(length(neck - hip), 0.01);
    vec3 shirt = unblack(pal(0.3 + uSeed.z)) * 0.9 + 0.1;
    return mix(shirt, unblack(pal(0.05 + uSeed.w)), step(0.52, h) * step(h, 0.66) * 0.85);
  }
  if (m < 3.5) return vec3(0.14, 0.17, 0.26) * (0.9 + 0.1 * sin(p.y * 90.0));   // baggy denim
  if (m < 4.5) return vec3(0.12, 0.12, 0.14);                         // shoes
  if (m < 5.5) return vec3(0.9);                                      // soles
  if (m < 6.5) return vec3(0.18, 0.11, 0.06);                         // hair
  if (m < 7.5) return vec3(0.06);                                     // grip tape
  if (m < 8.5) return unblack(pal(0.75 + uSeed.z));                   // the deck's graphic, underneath
  if (m < 9.5) return vec3(0.6, 0.62, 0.66);                          // trucks
  return vec3(0.95, 0.93, 0.85);                                      // wheels
}
vec3 skaterNormal(vec3 p) {
  // (four samples, on a tetrahedron's corners, in a loop so the compiler keeps one copy of the figure)
  vec3 n = vec3(0.0);
  for (int i = 0; i < 4; i++) {
    vec3 e = 0.5773 * (2.0 * vec3(float((i + 3) >> 1 & 1), float(i >> 1 & 1), float(i & 1)) - 1.0);
    n += e * skater(p + e * 0.003).x;
  }
  return normalize(n);
}

// the hall round the ramp, now the camera looks every way: walls of the seed's colours in big painted blocks, lamps along them, a roof of girders
vec3 hall(vec3 ro, vec3 rd) {
  float tx = (sign(rd.x) * HX - ro.x) / rd.x, tz = ((rd.z < 0.0 ? -HB : HF) - ro.z) / rd.z, ty = rd.y > 0.0 ? (HT - ro.y) / rd.y : 1e9;
  if (ty < tx && ty < tz) {
    vec3 w = ro + rd * ty;
    vec3 c = vec3(0.07, 0.07, 0.09) * (0.6 + 0.4 * step(0.12, abs(fract(w.z * 0.25) - 0.5)));
    c = mix(c, vec3(0.2, 0.19, 0.2), 1.0 - smoothstep(0.03, 0.06, abs(fract(w.x * 0.25) - 0.5)));
    c += vec3(1.0, 0.95, 0.8) * exp(-length(fract(w.xz * vec2(0.125, 0.167)) - 0.5) * 22.0) * (1.2 + 0.8 * uKick);
    return c;
  }
  bool side = tx < tz;
  vec3 w = ro + rd * min(tx, tz);
  float along = side ? w.z : w.x;
  float wall = side ? sign(rd.x) * 5.0 : sign(rd.z) * 11.0;
  vec2 blk = floor(vec2(along, w.y) * vec2(0.35, 0.5));
  vec3 paint = unblack(pal(hash12(blk + uSeed.xy * 9.0 + wall)));
  vec3 c = mix(vec3(0.12, 0.11, 0.12), paint * 0.55, step(0.55, hash12(blk + 3.0 + wall)));
  c *= 0.7 + 0.3 * step(0.06, abs(fract(w.y * 0.5) - 0.5));
  c += vec3(1.0, 0.95, 0.8) * exp(-length(vec2(fract(along * 0.18) - 0.5, (w.y - 6.0) * 0.18)) * 18.0) * (0.6 + 0.4 * uKick);
  return c;
}

vec3 render(vec2 p, vec2 uv) {
  vec3 ro = uCamE.xyz;
  vec3 rd = normalize(uCamF.xyz * uCamE.w + uCamR.xyz * p.x + uCamU.xyz * p.y);
  vec3 col = vec3(0.05, 0.05, 0.07);
  vec3 n;
  float t = rampHit(ro, rd, n);
  if (t >= 1e8) col = hall(ro, rd);
  else {
    vec3 h = ro + rd * t;
    bool ramp = abs(h.z) < RL && (abs(h.x) < RF + RR + 1.6 || h.y > 0.01);
    vec3 wood = vec3(0.72, 0.52, 0.3);
    if (ramp) {
      // plywood: sheets with seams, the grain along the run
      float seam = min(abs(fract(h.z / 1.2) - 0.5), abs(fract((abs(h.x) + h.y) / 1.2) - 0.5));
      wood *= 0.85 + 0.15 * sin(h.z * 40.0 + vnoise(h.xz * 3.0) * 4.0) * 0.4;
      wood *= 0.75 + 0.25 * smoothstep(0.0, 0.03, seam);
    } else {
      wood = vec3(0.16, 0.16, 0.18) * (0.8 + 0.2 * vnoise(h.xz * 2.0));   // the concrete floor
    }
    vec3 L = normalize(vec3(0.4, 1.0, 0.5));
    float dif = 0.45 + 0.55 * max(dot(n, L), 0.0);
    col = wood * dif * (0.55 + 0.45 * smoothstep(-0.2, 2.0, h.y));
    // the skater's shadow, under it
    float sh = length((h - uSkShadow.xyz) * vec3(1.0, 1.0, 0.8));
    col *= 1.0 - 0.45 * (1.0 - smoothstep(0.25, 0.6, sh)) * (1.0 - 0.25 * min(uSkHip.w, 2.0));
    col = mix(col, vec3(0.05, 0.05, 0.07), 1.0 - exp(-t * 0.025));
  }
  // the coping: a steel pipe along each lip, catching the light
  for (int s = -1; s <= 1; s += 2) {
    vec2 oc = ro.xy - vec2(float(s) * (RF + RR), RR + RV);
    float a = dot(rd.xy, rd.xy), bq = dot(oc, rd.xy), h = bq * bq - a * (dot(oc, oc) - 0.0016);
    if (h > 0.0) {
      float tc = (-bq - sqrt(h)) / a;
      if (tc > 0.0 && tc < t && abs(ro.z + rd.z * tc) < RL) {
        t = tc;
        vec2 nc = (oc + rd.xy * tc) / 0.04;
        col = vec3(0.55, 0.58, 0.62) * (0.5 + 0.5 * max(nc.y, 0.0)) + vec3(0.5) * pow(max(nc.y, 0.0), 6.0);
        col = mix(col, vec3(0.05, 0.05, 0.07), 1.0 - exp(-tc * 0.025));
      }
    }
  }
  // the skater: marched where the ray passes near him, in front of whatever of the ramp is behind him
  {
    vec3 oc = ro - uSkBound.xyz;
    float bb = dot(oc, rd), cc = dot(oc, oc) - uSkBound.w * uSkBound.w;
    float hh = bb * bb - cc;
    if (hh > 0.0) {
      float ts = max(-bb - sqrt(hh), 0.0), te = -bb + sqrt(hh);
      vec2 hit = vec2(1.0, 0.0);
      for (int k = 0; k < 48; k++) {
        if (ts > te || ts > t) break;
        vec3 q = ro + rd * ts;
        float shell = skaterShell(q);
        if (shell > 0.05) { ts += shell; continue; }
        hit = skater(q);
        if (hit.x < 0.004) break;
        ts += hit.x * 0.8;
      }
      if (hit.x < 0.004 && ts < t && ts < te) {
        vec3 sp = ro + rd * ts, sn = skaterNormal(sp);
        vec3 L = normalize(vec3(0.4, 1.0, 0.5));
        float dif = max(dot(sn, L), 0.0), rim = pow(1.0 - max(dot(sn, -rd), 0.0), 3.0);
        vec3 base = skaterColour(hit.y, sp);
        col = base * (0.35 + 0.75 * dif) + vec3(0.9, 0.85, 1.0) * rim * 0.25 + vec3(1.0) * pow(max(dot(reflect(rd, sn), L), 0.0), 24.0) * (hit.y > 8.5 && hit.y < 9.5 ? 0.6 : 0.08);
        col = mix(col, vec3(0.05, 0.05, 0.07), 1.0 - exp(-ts * 0.025));
      }
    }
  }
  // sparks off the coping in a grind
  if (uSkShadow.w > 0.5) {
    vec3 sp = uSkShadow.xyz;
    vec3 d0 = sp - ro;
    float z0 = max(dot(d0, uCamF.xyz), 0.1);
    vec2 S = vec2(dot(d0, uCamR.xyz), dot(d0, uCamU.xyz)) / z0 * uCamE.w;
    for (int j = 0; j < 8; j++) {
      float fj = float(j), a = fj * 0.8 + uTime * 9.0, r = fract(uTime * 3.0 + hash11(fj)) * 0.05;
      col += vec3(1.0, 0.8, 0.3) * (1.0 - smoothstep(0.0, 0.004, length(p - S - vec2(cos(a), abs(sin(a))) * r)));
    }
  }
  // the hud: the score, the combo counted up through the phrase, banked with a flash on the drop
  if (p.y < 0.28 || abs(p.x) < 0.6) return col;
  for (int k = 0; k < 5; k++) {
    int dg = int(mod(floor(uSkFx.x / pow(10.0, float(4 - k))), 10.0));
    col = mix(col, vec3(1.0), digit7((p - vec2(-0.84 + float(k) * 0.045, 0.37)) / 0.04, dg));
  }
  int cb = int(min(uSkFx.y, 99.0));
  vec3 cc = mix(vec3(1.0, 0.85, 0.2), vec3(1.0), uSkFx.w * exp(-max(uSkFx.z, 0.0) * 3.0));
  float pop = 1.0 + 0.4 * exp(-max(uSkFx.z, 0.0) * 6.0) * step(0.0, uSkFx.z);
  col = mix(col, cc, digit7((p - vec2(0.7, 0.36)) / (0.045 * pop), cb / 10) * float(cb >= 10));
  col = mix(col, cc, digit7((p - vec2(0.7 + 0.05 * pop, 0.36)) / (0.045 * pop), cb - 10 * (cb / 10)));
  // the x before it
  vec2 xq = p - vec2(0.67, 0.4);
  col = mix(col, cc, (1.0 - smoothstep(0.003, 0.006, min(sdSeg(xq, vec2(-0.012, -0.012), vec2(0.012, 0.012)), sdSeg(xq, vec2(-0.012, 0.012), vec2(0.012, -0.012))))));
  return col;
}
`;

const football = `
// The football match: two sides of eleven on a striped pitch seen from above,
// the camera following the ball, as the top-down football games of the
// arcades and the 16-bit computers showed it. The game runs as a simulation
// (src/core/sims.js): every pass lands on the beat, the build takes a winger
// down the line, and the header goes in on the drop, the crowd going up.
uniform vec4 uPl[22];      // x, y in metres, kit (0/1 the sides, 2/3 their keepers, +4 running), facing
uniform vec4 uBall;        // x, y, height
uniform vec4 uCam;         // what the camera looks at, in metres
uniform vec4 uFoot;        // goals each side, since the last goal, who scored it
const float PX = 52.5, PY = 34.0, SC = 0.036;     // half the pitch; screen units a metre

vec3 kit(int k, bool shorts) {
  // the two sides in the seed's colours, as far apart as the palette gives; the keepers in their own
  vec3 a = unblack(pal(0.05 + uSeed.x * 0.3)), b = unblack(pal(0.55 + uSeed.x * 0.3));
  a /= max(max(a.r, a.g), max(a.b, 0.3)); b /= max(max(b.r, b.g), max(b.b, 0.3));
  if (k == 0) return shorts ? vec3(0.95) : a;
  if (k == 1) return shorts ? b * 0.35 : b;
  if (k == 2) return shorts ? vec3(0.1) : vec3(0.95, 0.85, 0.15);
  return shorts ? vec3(0.1) : vec3(0.2, 0.85, 0.35);
}
float lineD(vec2 m) {
  // the pitch's markings, in metres: touchlines and goal lines, halfway, the centre circle and spot, the boxes,
  // the spots and their arcs, the corner arcs
  vec2 a = abs(m);
  float d = max(abs(a.x - PX), 0.0) < 1e9 ? abs(max(a.x - PX, a.y - PY)) : 1e9;
  d = min(d, abs(m.x) + step(PY, a.y) * 1e3);
  d = min(d, abs(length(m) - 9.15));
  d = min(d, length(m) - 0.25);
  vec2 q = vec2(PX - a.x, a.y);
  d = min(d, max(abs(q.x - 16.5) * step(q.y, 20.16), 0.0) + step(20.16, q.y) * 1e3);
  d = min(d, abs(q.y - 20.16) + step(16.5, q.x) * 1e3);
  d = min(d, abs(q.x - 5.5) + step(9.16, q.y) * 1e3);
  d = min(d, abs(q.y - 9.16) + step(5.5, q.x) * 1e3);
  d = min(d, length(q - vec2(11.0, 0.0)) - 0.2);
  d = min(d, abs(length(q - vec2(11.0, 0.0)) - 9.15) + step(q.x, 16.5) * 1e3);
  d = min(d, abs(length(vec2(q.x, PY - a.y)) - 1.0));
  return d;
}

vec3 render(vec2 p, vec2 uv) {
  vec2 m = uCam.xy + p / SC;
  vec2 a = abs(m);
  float goalT = uFoot.z;
  vec3 col;
  if (a.x < PX + 3.0 && a.y < PY + 3.0) {
    // the grass, mown in stripes across the pitch
    float stripe = mod(floor((m.x + PX) / 5.25), 2.0);
    col = mix(vec3(0.16, 0.5, 0.14), vec3(0.2, 0.6, 0.17), stripe);
    col *= 0.95 + 0.06 * vnoise(m * 0.8);
    col = mix(col, vec3(0.95), 1.0 - smoothstep(0.06, 0.16, lineD(m)));
  } else {
    // the stands: a crowd in both sides' colours, on its feet and flickering when a goal goes in
    vec2 seat = floor(m * vec2(1.6, 1.6));
    float h = hash12(seat + 17.0);
    vec3 fan = h < 0.45 ? kit(0, false) : h < 0.9 ? kit(1, false) : vec3(0.9, 0.8, 0.7);
    float up = exp(-goalT * 0.9) * step(0.0, goalT);
    float bob = 0.5 + 0.5 * sin(uTime * (6.0 + 6.0 * up) + h * 30.0);
    vec2 f = fract(m * 1.6) - 0.5;
    float head = 1.0 - smoothstep(0.22, 0.32, length(f - vec2(0.0, 0.08 * bob * (0.3 + up))));
    col = vec3(0.05, 0.05, 0.08) + fan * head * (0.35 + 0.35 * uKick + 0.6 * up);
    // the boards round the pitch
    if (max(a.x - PX, a.y - PY) < 4.0) col = mix(vec3(0.08, 0.1, 0.25), kit(int(mod(floor((m.x + m.y) / 6.0), 2.0)), false), 0.35);
    col += vec3(1.0) * up * step(0.985, hash12(seat + floor(uTime * 8.0))) * 0.8;
  }
  // the goals: their nets behind the line, the posts and the bar
  for (int s = -1; s <= 1; s += 2) {
    vec2 g = vec2(m.x * float(s) - PX, m.y);
    if (g.x > 0.0 && g.x < 2.2 && abs(g.y) < 3.66) {
      vec2 net = abs(fract(g * vec2(2.5, 2.5)) - 0.5);
      col = mix(col * 0.75, vec3(0.92), (1.0 - smoothstep(0.03, 0.09, min(net.x, net.y))) * 0.6);
    }
    float frame = min(abs(g.y) - 3.66 < 0.0 ? abs(g.x - 2.2) : 1e3, max(abs(abs(g.y) - 3.66), max(g.x - 2.2, -g.x)));
    col = mix(col, vec3(1.0), 1.0 - smoothstep(0.08, 0.16, frame));
  }
  // shadows first, then the players, seen from above: shoulders in the shirt, a head, legs striding when they run
  for (int i = 0; i < 22; i++) {
    vec4 P = uPl[i];
    vec2 d = (m - P.xy) / 1.4;
    if (dot(d, d) > 2.5) continue;
    col *= 1.0 - 0.35 * (1.0 - smoothstep(0.35, 0.6, length(d - vec2(0.25, -0.3))));
  }
  for (int i = 0; i < 22; i++) {
    vec4 P = uPl[i];
    vec2 d = (m - P.xy) / 1.4;                           // (drawn half as big again as a man, as the games drew them)
    if (dot(d, d) > 2.0) continue;
    int k = int(mod(P.z, 4.0));
    bool run = P.z >= 3.5;
    vec2 q = rot(-P.w + 1.5708) * d;                       // the player's own frame: facing +y
    float stride = run ? sin(uTime * 13.0 + float(i) * 1.3) : 0.0;
    float legs = min(length(q - vec2(-0.18, 0.35 * stride)) - 0.14, length(q - vec2(0.18, -0.35 * stride)) - 0.14);
    col = mix(col, kit(k, true), 1.0 - smoothstep(0.0, 0.05, legs));
    float body = length(q * vec2(0.55, 1.15)) - 0.36;
    col = mix(col, kit(k, false) * (0.85 + 0.25 * smoothstep(0.2, -0.2, q.x)), 1.0 - smoothstep(0.0, 0.05, body));
    float head = length(q - vec2(0.0, 0.02)) - 0.19;
    col = mix(col, vec3(0.9, 0.7, 0.55), 1.0 - smoothstep(0.0, 0.04, head));
    col = mix(col, vec3(0.2, 0.12, 0.06), 1.0 - smoothstep(0.0, 0.04, length(q - vec2(0.0, -0.04)) - 0.15));
  }
  // the ball: its shadow on the grass, the ball above it as high as it was kicked
  vec2 bq = m - uBall.xy;
  col *= 1.0 - 0.45 * (1.0 - smoothstep(0.15, 0.3, length(bq - vec2(0.15, -0.15))));
  vec2 bb = bq - vec2(-0.2, 0.55) * uBall.z;
  float br = 0.3 * (1.0 + uBall.z * 0.06);
  float ball = length(bb) - br;
  col = mix(col, vec3(1.0) * (0.85 + 0.15 * step(0.0, bb.x + bb.y)), 1.0 - smoothstep(0.0, 0.05, ball));
  col = mix(col, vec3(0.1), (1.0 - smoothstep(0.0, 0.04, length(bb) - br * 0.35)) * 0.8);

  // a goal: GOAL! in the scorers' colour, big dots over the pitch, for two bars
  if (goalT < 4.0) {
    vec2 g = (p - vec2(-0.42, -0.06)) / vec2(0.034, 0.034);
    vec2 cell = floor(g), f = fract(g) - 0.5;
    int ch = int(floor(cell.x / 6.0));
    int gx = int(cell.x) - ch * 6, gy = 6 - int(cell.y);
    // a 5 x 7 font: G, O, A, L, !
    const int FONT[35] = int[35](14, 17, 16, 23, 17, 17, 15,   14, 17, 17, 17, 17, 17, 14,   14, 17, 17, 31, 17, 17, 17,   16, 16, 16, 16, 16, 16, 31,   4, 4, 4, 4, 4, 0, 4);
    if (ch >= 0 && ch < 5 && gx < 5 && gy >= 0 && gy < 7) {
      int row = FONT[ch * 7 + gy];
      if (((row >> (4 - gx)) & 1) == 1) {
        float dot = 1.0 - smoothstep(0.28, 0.42, length(f));
        float on = step(0.0, goalT) * (goalT < 0.15 ? goalT / 0.15 : 1.0) * (1.0 - smoothstep(3.2, 4.0, goalT));
        col = mix(col, kit(int(uFoot.w), false) * 1.2, dot * on);
      }
    }
  }
  // the score, top left: a chip of each side's colour and its goals
  for (int s = 0; s < 2; s++) {
    vec2 o = vec2(-0.86 + float(s) * 0.13, 0.4);
    col = mix(col, kit(s, false), (1.0 - step(0.022, max(abs(p.x - o.x), abs(p.y - o.y - 0.035)))));
    int gl = int(s == 0 ? uFoot.x : uFoot.y);
    col = mix(col, vec3(1.0, 0.95, 0.4), digit7((p - vec2(o.x + 0.032, 0.392)) / 0.04, gl - 10 * (gl / 10)));
  }
  return col;
}
`;

const tanks = `
// The wireframe tank, as memory has it: the battlefield through a tank's sight,
// its lines of light now on solid, lit shapes standing on a ground that runs to
// the horizon. The game runs as a simulation (src/core/sims.js), which works out
// the world, hides what stands behind what, and hands over its lines and faces
// on the screen. The enemy closes in; the tank holds its fire until it is near,
// fires on the backbeat - the view kicks, the gun recoils - and on the next beat
// the enemy goes up: a fireball, a ring along the ground, the ground lit round
// it, its pieces flung, its turret thrown high, a scorch left behind.
uniform vec4 uSeg[180];     // the world's lines on the screen: from, to
uniform float uSegK[180];   // each: what it is (0 the plain, 1 the enemy, 2 hot, 3 the mountains) + how bright
uniform vec4 uFace[72];     // the faces, far to near: four corners on the screen, in two vec4s
uniform float uFaceK[36];   // each: what it is (0 the plain, 1 the enemy) + how lit
uniform vec4 uTank;         // lines, how near the sight is to the enemy (1 on it), since it fired, score
uniform vec4 uTankCam;      // the tank: x, z, heading; faces
uniform vec4 uTankFx;       // the view: roll, shake across, shake up; since the last burst + 100 x its kind
uniform vec4 uTarget;       // the enemy's outline on the screen: middle x, y, half its width; how far off (below 0: not in view)
uniform float uTargetH;     // half its height
uniform vec4 uBlip;         // the enemy round the tank: across, ahead, there
uniform vec4 uMoon;         // the moon on the screen: x, y, in view
uniform vec4 uTBlasts[4];   // round the tank: across, ahead, since, kind (below 0 none, 0 a shell, 1 the enemy, 2 on the drop, 3 its gun)
uniform float uTBlastH[4];  // how high above the ground each went up
uniform vec4 uTShell[2];    // shell heads on the screen: x, y, size, whose (0 none)
const float HZ = 0.1, EYE = 2.7, FL = 1.45, CELL = 6.0;
float lineGlow(float d, float w) { return 1.0 - smoothstep(w * 0.4, w, d); }
float sideOf(vec2 a, vec2 b, vec2 p) { return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x); }

vec3 render(vec2 p, vec2 uv) {
  vec3 green = vec3(0.18, 1.0, 0.42), red = vec3(1.0, 0.14, 0.1), hot = vec3(1.0, 0.72, 0.36), foe = vec3(1.0, 0.4, 0.14);
  // the last burst punches the view in
  float since = uTankFx.w > 900.0 ? 99.0 : mod(uTankFx.w, 100.0);
  float bKind = floor(uTankFx.w / 100.0);
  float punch = bKind > 0.5 && bKind < 3.0 ? exp(-since * 8.0) * (bKind > 1.5 ? 1.6 : 1.0) : 0.0;
  // what is out in the world moves with the view; the sight and the dials stay on the glass
  vec2 w = rot(uTankFx.x) * p * (1.0 - 0.018 * uKick - 0.05 * punch) + uTankFx.yz;
  float h = uTankCam.z, ch = cos(h), sh = sin(h);
  vec3 col;
  float z = 0.0;
  vec2 g = vec2(0.0);
  if (w.y >= HZ) {
    // the sky: dark overhead, a glow along the horizon that breathes with the bass, stars turning with the hull
    float up = w.y - HZ;
    col = mix(vec3(0.006, 0.05, 0.05), vec3(0.003, 0.006, 0.026), smoothstep(0.0, 0.34, up));
    vec2 sq = vec2(w.x + h * FL, w.y) * 46.0;
    vec2 sg = floor(sq);
    float st = hash12(sg + uSeed.xy * 11.0);
    if (st > 0.93) col += vec3(0.55, 0.8, 0.75) * (st - 0.93) * 14.0 * (1.0 - smoothstep(0.02, 0.09, length(sq - sg - 0.5))) * smoothstep(0.02, 0.14, up) * (0.6 + 0.6 * uHat);
    // the moon: a crescent, lit, with a halo
    if (uMoon.z > 0.5) {
      vec2 q = w - uMoon.xy;
      float rm = length(q);
      float m = max(rm - 0.038, -(length(q - vec2(0.016, 0.01)) - 0.033));
      col += vec3(0.7, 1.0, 0.82) * (1.0 - smoothstep(0.0, 0.003, m)) * 0.95;
      col += green * exp(-rm * 18.0) * 0.12;
    }
  } else {
    // the ground: its grid runs to the horizon and slides by as the tank rolls, each line one thin line on the screen
    z = EYE * FL / max(HZ - w.y, 1e-3);
    g = vec2(w.x * z / FL, z);
    vec2 wp = uTankCam.xy + vec2(g.x * ch + g.y * sh, -g.x * sh + g.y * ch);
    float dz = z * z / (EYE * FL), cx = w.x / FL * dz;
    vec2 dX = vec2(ch, -sh) * z / FL;
    vec2 dY = vec2(cx * ch + dz * sh, -cx * sh + dz * ch);
    vec2 gr = vec2(length(vec2(dX.x, dY.x)), length(vec2(dX.y, dY.y)));
    vec2 cd = abs(fract(wp / CELL + 0.5) - 0.5) * CELL / gr;
    // (each family of lines fades on its own as its lines crowd together)
    vec2 far = smoothstep(vec2(0.008), vec2(0.035), CELL / gr);
    float vis = exp(-z * 0.009);
    float gl = max(lineGlow(cd.x, 0.0026) * far.x, lineGlow(cd.y, 0.0026) * far.y);
    float gh = max(exp(-cd.x * 150.0) * far.x, exp(-cd.y * 150.0) * far.y);
    // a wave of light runs out across it once a bar
    float wave = exp(-abs(z - fract(uBar) * 72.0) * 0.32);
    col = vec3(0.005, 0.038, 0.028) + green * exp(-(HZ - w.y) * 9.0) * 0.13;
    col += green * (gl * (0.36 + 0.34 * uKick + 0.7 * wave) + gh * (0.09 + 0.1 * wave)) * vis;
    // what a burst does to the ground: lights it, runs a ring along it, leaves a scorch
    for (int k = 0; k < 4; k++) {
      vec4 b = uTBlasts[k];
      if (b.w < -0.5 || b.w > 2.5) continue;
      float size = b.w < 0.5 ? 0.55 : (b.w < 1.5 ? 1.0 : 1.6);
      float gd = length(g - b.xy);
      float cr = gd / (2.6 * size);
      col *= 1.0 - 0.8 * (1.0 - smoothstep(0.75, 1.15, cr)) * smoothstep(0.1, 0.5, b.z) * (1.0 - smoothstep(4.5, 6.3, b.z));
      col += hot * exp(-gd * 0.17 / size) * exp(-b.z * 3.4) * 1.3 * size;
      float ring = abs(gd - b.z * 34.0 * size) / gr.y;
      col += hot * (lineGlow(ring, 0.006) + exp(-ring * 60.0) * 0.4) * exp(-b.z * 3.6) * 0.9;
      col += hot * exp(-abs(cr - 1.0) * 16.0) * exp(-b.z * 1.4) * 0.45;
    }
  }
  // the horizon
  float dh = abs(w.y - HZ);
  col += green * (lineGlow(dh, 0.0026) * 0.75 + exp(-dh * 48.0) * (0.2 + 0.16 * uBass));

  // the solids' faces: each lit from one side, the nearer over the farther, hiding the ground and the sky
  int nf = int(uTankCam.w);
  for (int i = 0; i < 36; i++) {
    if (i >= nf) break;
    vec4 A = uFace[2 * i], B = uFace[2 * i + 1];
    if (sideOf(A.xy, A.zw, w) < 0.0 || sideOf(A.zw, B.xy, w) < 0.0 || sideOf(B.xy, B.zw, w) < 0.0 || sideOf(B.zw, A.xy, w) < 0.0) continue;
    float k = uFaceK[i], lit = fract(k);
    if (k < 1.0) col = vec3(0.008, 0.07, 0.05) + vec3(0.03, 0.42, 0.25) * lit;
    else col = vec3(0.075, 0.016, 0.008) + vec3(0.72, 0.22, 0.06) * lit;
    col += hot * (0.14 * punch + 0.1 * exp(-uTank.z * 14.0));
  }

  // the world's lines over them, the near thicker and brighter, each with its glow
  vec3 lines = vec3(0.0);
  int n = int(uTank.x);
  for (int i = 0; i < 180; i++) {
    if (i >= n) break;
    vec4 s = uSeg[i];
    vec2 lo = min(s.xy, s.zw) - 0.03, hi = max(s.xy, s.zw) + 0.03;
    if (w.x < lo.x || w.y < lo.y || w.x > hi.x || w.y > hi.y) continue;
    float d = sdSeg(w, s.xy, s.zw);
    float k = uSegK[i], lit = fract(k), wd = 0.0015 + 0.0032 * lit;
    vec3 c = green;
    if (k >= 3.0) c = vec3(0.13, 0.72, 0.5);
    else if (k >= 2.0) c = mix(foe, vec3(1.0, 0.9, 0.62), lit);
    else if (k >= 1.0) c = foe;
    lines = max(lines, c * ((1.0 - smoothstep(wd * 0.4, wd, d)) * (0.4 + 1.1 * lit) + exp(-d * 105.0) * 0.34 * lit));
  }
  col += lines * (1.0 + 0.3 * uKick);

  // the fire: a burst's ball, its white heart, its rays and the ring in the air; the enemy's gun going off
  for (int k = 0; k < 4; k++) {
    vec4 b = uTBlasts[k];
    if (b.w < -0.5 || b.y < 1.0) continue;
    float sc = FL / b.y;
    if (b.w > 2.5) {
      vec2 c = vec2(b.x * sc, HZ + (1.82 - EYE) * sc);
      float r = length(w - c);
      col += vec3(1.0, 0.8, 0.45) * exp(-r / (0.75 * sc)) * exp(-b.z * 16.0) * 2.4;
      continue;
    }
    if (b.z > 1.5) continue;
    float size = b.w < 0.5 ? 0.36 : (b.w < 1.5 ? 1.0 : 1.6);
    vec2 c = vec2(b.x * sc, HZ + (uTBlastH[k] + 0.3 * (1.0 - step(0.5, b.w)) - EYE) * sc);
    float R = sc * size * (0.8 + 6.0 * (1.0 - exp(-b.z * 4.2)));
    vec2 d = w - c;
    float r = length(d);
    float fade = exp(-b.z * 3.1);
    if (r < R * 2.4) {
      float nz = fbm(d / max(R, 1e-3) * 2.4 + vec2(b.z * 1.6, -b.z * 2.6) + float(k) * 5.1);
      float body = 1.0 - smoothstep(0.2, 1.0, r / R * (1.3 - 0.7 * nz));
      col += mix(vec3(1.0, 0.22, 0.03), vec3(1.0, 0.82, 0.42), body * body) * body * fade * 2.3;
      col += vec3(1.0, 0.96, 0.85) * exp(-r / (R * 0.2)) * exp(-b.z * 10.0) * 3.2;
      float a = atan(d.y, d.x);
      float ray = pow(max(0.0, cos(a * 5.0 + b.x * 9.0)), 22.0) + pow(max(0.0, cos(a * 8.0 + b.y * 7.0)), 30.0);
      col += hot * ray * exp(-r / (R * 0.9)) * exp(-b.z * 5.0) * 1.3;
    }
    col += hot * exp(-abs(r - R * 1.55) * 70.0) * exp(-b.z * 5.0);
    // the whole view lit for a moment
    col += hot * exp(-b.z * 11.0) * (b.w < 0.5 ? 0.05 : 0.2 * size);
  }
  // the shells' bright heads
  for (int k = 0; k < 2; k++) {
    vec4 s = uTShell[k];
    if (s.w < 0.5) continue;
    float r = length(w - s.xy);
    col += vec3(1.0, 0.9, 0.65) * (exp(-r / max(s.z * 0.28, 0.004)) * 2.4 + exp(-r / max(s.z * 1.1, 0.012)) * 0.5);
  }

  // the sight: at rest level with the horizon; as the gun comes round to the enemy it comes down onto it and frames it
  float lock = uTank.y;
  float on = uTarget.w > 0.0 ? smoothstep(0.4, 0.92, lock) : 0.0;
  vec2 sp = mix(p, w, on);
  vec2 sc = mix(vec2(0.0, HZ), uTarget.xy, on);
  float hw = mix(mix(0.16, 0.075, lock), uTarget.z, on), hh = mix(0.06, uTargetH, on);

  // on the glass from here on. The gun out in front, over the nose, laid on the sight: it runs back as it fires, its flash at the tip
  float kick = exp(-uTank.z * 9.0);
  vec2 gBase = vec2(0.0, -0.5);
  vec2 gDir = normalize(sc - gBase), gSide = vec2(-gDir.y, gDir.x);
  float gLen = 0.2 - 0.03 * kick;
  vec2 tip = gBase + gDir * gLen;
  float gAlong = dot(p - gBase, gDir), gAcross = dot(p - gBase, gSide);
  float gw = mix(0.075, 0.03, clamp(gAlong / gLen, 0.0, 1.0));
  if (gAlong < gLen && abs(gAcross) < gw) col = vec3(0.006, 0.05, 0.035) + green * 0.1 * (1.0 - abs(gAcross) / gw);
  float gd = min(min(sdSeg(p, gBase - gSide * 0.075, tip - gSide * 0.03), sdSeg(p, gBase + gSide * 0.075, tip + gSide * 0.03)), sdSeg(p, tip - gSide * 0.03, tip + gSide * 0.03));
  col += green * (lineGlow(gd, 0.0034) * 1.1 + exp(-gd * 100.0) * 0.28);
  float fr = length(p - tip);
  float fa = atan(dot(p - tip, gSide), dot(p - tip, gDir));
  col += vec3(1.0, 0.92, 0.6) * exp(-uTank.z * 15.0) * (exp(-fr * 16.0) * 3.0 + pow(max(0.0, cos(fa * 3.0)), 12.0) * exp(-fr * 5.5) * 1.8);
  col += hot * exp(-uTank.z * 18.0) * 0.2;

  // a post above and below, and brackets either side, lit as it fires
  float ds = min(sdSeg(sp, sc + vec2(0.0, hh + 0.015), sc + vec2(0.0, hh + 0.125)), sdSeg(sp, sc - vec2(0.0, hh + 0.015), sc - vec2(0.0, hh + 0.125)));
  for (int sx = -1; sx <= 1; sx += 2) {
    float x = float(sx) * hw;
    ds = min(ds, sdSeg(sp, sc + vec2(x, -hh), sc + vec2(x, hh)));
    ds = min(ds, sdSeg(sp, sc + vec2(x, hh), sc + vec2(x - float(sx) * 0.03, hh)));
    ds = min(ds, sdSeg(sp, sc + vec2(x, -hh), sc + vec2(x - float(sx) * 0.03, -hh)));
  }
  vec3 sightC = mix(green, vec3(1.0, 0.85, 0.3), smoothstep(0.85, 1.0, lock));
  col += sightC * (lineGlow(ds, 0.0028) + exp(-ds * 120.0) * 0.22) * (0.75 + 0.7 * exp(-uTank.z * 6.0) + 0.35 * uSnare);

  // the mark round the enemy before the sight is on it, and how far off it is: amber once it is in range
  if (uTarget.w > 0.0) {
    vec2 q = abs(w - uTarget.xy);
    float sz = uTarget.z;
    float box = abs(max(q.x - sz, q.y - uTargetH));
    float corner = step(sz * 0.62, q.x) * step(uTargetH * 0.62, q.y);
    vec3 mc = mix(vec3(0.4, 1.0, 0.6), vec3(1.0, 0.72, 0.15), step(uTarget.w, 18.0));
    col += mc * (1.0 - smoothstep(0.001, 0.0034, box)) * corner * (0.65 + 0.5 * uSnare) * (1.0 - on);
    int rg = int(min(uTarget.w, 99.0));
    vec2 rp = w - uTarget.xy - vec2(sz + 0.012, uTargetH - 0.05);
    col += mc * digit7(rp / 0.026, rg / 10);
    col += mc * digit7((rp - vec2(0.032, 0.0)) / 0.026, rg - 10 * (rg / 10));
  }

  // the radar over it all, top middle: its sweep goes round once a bar, the enemy a dot it lights
  vec2 rc = vec2(0.0, 0.392);
  vec2 q = p - rc;
  float r = length(q);
  if (r < 0.087) col *= 0.28;
  float sweep = uBar * 6.28318;
  vec2 sd = vec2(sin(sweep), cos(sweep));
  float dr = min(abs(r - 0.085), sdSeg(p, rc, rc + sd * 0.085));
  col += red * (lineGlow(dr, 0.0028) + exp(-dr * 110.0) * 0.3);
  float a = atan(q.x, q.y);
  float behind = mod(sweep - a, 6.28318);
  col += red * 0.32 * step(r, 0.085) * exp(-behind * 3.0) * smoothstep(0.0, 0.01, r);
  if (uBlip.z > 0.5) {
    vec2 b = uBlip.xy / 60.0 * 0.085;
    if (length(b) > 0.08) b = normalize(b) * 0.08;
    float ba = mod(sweep - atan(b.x, b.y), 6.28318);
    float bd = length(q - b);
    col += red * ((1.0 - smoothstep(0.003, 0.006, bd)) * (0.5 + 1.3 * exp(-ba * 2.0)) + exp(-bd * 70.0) * 0.5 * exp(-ba * 1.2));
  }
  // the score, top right: it flares on a kill
  float sb = exp(-since * 5.0) * step(0.5, bKind) * step(bKind, 2.5);
  for (int k = 0; k < 5; k++) {
    int dg = int(mod(floor(uTank.w / pow(10.0, float(4 - k))), 10.0));
    col += mix(red, vec3(1.0, 0.85, 0.5), sb) * digit7((p - vec2(0.6 + float(k) * 0.05, 0.385)) / 0.045, dg) * (0.95 + sb);
  }
  col += green * uSnare * 0.012;
  return col;
}
`;

const tube = `
// The vector tube, as memory has it: a tube seen from its open end, filling the
// screen, its lanes running down to a burning point, its walls lit and pulsing
// on the beat, each new shape its own colour. The game runs as a simulation
// (src/core/sims.js): things climb the lanes a step on each beat, the claw on
// the rim slides after the nearest and fires down its lane on the backbeats, the
// shots lighting the lane as they go; what is hit goes up in a flash, a ring and
// rays. Outside the tube stars stream past and each beat sends the tube's own
// outline rippling out across the dark. On the drop the claw dives down the
// tube into the next shape.
uniform vec2 uRim[17];     // the rim's points, in the shape's own units
uniform vec4 uTube;        // lanes, closed, how high it vanishes, level
uniform vec4 uClaw;        // its lane, there, since the dive, score
uniform vec4 uFoes[8];     // lane, depth (0 the rim, 1 the far end), kind, there
uniform vec4 uTShots[8];   // lane, depth, flying
uniform vec4 uTBooms[6];   // lane, depth, since, kind (0 shot, 1 zapped, 2 the claw)
uniform vec4 uTubeFx;      // since the claw was caught, seconds a bar, how far through the dive (-1 none), since the last shot
const vec2 TC = vec2(0.0, 0.0);
const vec2 TS = vec2(0.76, 0.44);          // wider than high, as the screen is

float gZoom = 1.0;      // the zoom of this frame, worked out once
vec2 gLook = vec2(0.0); // the far end leans toward the claw, as if the view rode with it

float tubeZoom() {
  // the dive: the tube rushes past; then the next one springs open out of the dark
  float w = uTubeFx.z;
  if (w >= 0.0) return 1.0 + 9.0 * w * w;
  float s = (uClaw.z - uTubeFx.y) / max(uTubeFx.y, 0.1) / 0.35;
  if (s < 0.0 || s >= 1.0) return 1.0;
  return mix(0.15, 1.0, 1.0 - pow(1.0 - s, 3.0) * cos(s * 7.0));
}
vec2 vanish() { return TC + vec2(0.0, uTube.z * TS.y * 1.08) + gLook; }
vec2 rimPt(int i) { return TC + uRim[i] * TS; }
// a point on the tube: lane edge i at depth z (0 the rim, 1 the far end)
vec2 tubePt(vec2 rim, float z) {
  vec2 v = vanish();
  return v + (rim - v) * gZoom / (1.0 + 5.25 * z);
}
vec2 edgeAt(float x) {
  int n = int(uTube.x);
  float fx = floor(x);
  int i = int(fx);
  if (uTube.y > 0.5) { i = i - n * (i / n); if (i < 0) i += n; }
  int j = i + 1;
  if (uTube.y > 0.5 && j >= n) j -= n;
  return mix(rimPt(i), rimPt(min(j, 16)), x - fx);
}
float lineGlow(float d, float w) { return 1.0 - smoothstep(w * 0.4, w, d); }
// how many lanes apart two places are round the tube
float lanesApart(float a, float b) {
  float d = abs(a - b);
  if (uTube.y > 0.5) d = min(d, uTube.x - d);
  return d;
}
// each new shape its own colour, the first from the seed
vec3 tubeColour(float level) {
  float i = mod(level + floor(uSeed.x * 5.0), 5.0);
  if (i < 1.0) return vec3(0.1, 0.32, 1.0);
  if (i < 2.0) return vec3(0.62, 0.14, 1.0);
  if (i < 3.0) return vec3(0.03, 0.8, 1.0);
  if (i < 4.0) return vec3(1.0, 0.12, 0.55);
  return vec3(0.1, 1.0, 0.5);
}
// stars streaming out of the point the tube vanishes to, in wedges round it
float streaks(float a, float r, float cells, float speed, float sd) {
  float u = a * cells / 6.28318;
  float h = hash11(floor(u) + sd);
  float head = fract(h * 7.0 + uTime * speed * (0.4 + h));
  float at = head * head * 1.3;
  float d = abs(fract(u) - 0.5) * 6.28318 / cells * r;
  float len = 0.008 + at * 0.13 * (0.6 + speed);
  return (1.0 - smoothstep(0.0, 0.0012 + at * 0.0032, d)) * (1.0 - smoothstep(0.0, len, abs(r - at))) * smoothstep(0.02, 0.2, head) * step(0.35, h);
}

vec3 render(vec2 p, vec2 uv) {
  // the claw caught: the view shakes
  float hurt = exp(-uTubeFx.x * 6.0);
  float jt = floor(uTime * 40.0);
  p += (vec2(hash11(jt), hash11(jt + 9.0)) - 0.5) * hurt * 0.05;
  gZoom = tubeZoom() * (1.0 + 0.034 * uKick + 0.012 * uBass);
  gLook = (edgeAt(uClaw.x + 0.5) - TC) * 0.07;
  int n = int(uTube.x);
  bool closed = uTube.y > 0.5;
  float lw = 0.0034;
  bool diving = uTubeFx.z >= 0.0;
  float fade = diving ? 1.0 - smoothstep(0.55, 0.95, uTubeFx.z) : 1.0;
  vec3 tubeC = tubeColour(uTube.w), yellow = vec3(1.0, 0.95, 0.15), white = vec3(1.0);
  vec2 v = vanish();
  vec2 q = p - v;
  float r = length(q), ang = atan(q.y, q.x);

  // the tube: its lanes' edges, the rim, the far end; and where this pixel falls on its wall, seen from the far point
  float dLane = 1e9, dRim = 1e9;
  float lane = -1.0, s = 0.0;
  int edges = closed ? n : n + 1;
  for (int i = 0; i < 17; i++) {
    if (i >= edges) break;
    vec2 ri = rimPt(i);
    vec2 a = tubePt(ri, 0.0);
    dLane = min(dLane, sdSeg(p, a, tubePt(ri, 1.0)));
    if (i < n) {
      int j = i + 1;
      if (closed && j >= n) j = 0;
      vec2 rj = rimPt(j);
      vec2 b = tubePt(rj, 0.0);
      dRim = min(dRim, sdSeg(p, a, b));
      if (r < 0.27 * gZoom) dLane = min(dLane, sdSeg(p, tubePt(ri, 1.0), tubePt(rj, 1.0)));   // (the far rim is small: only near it)
      if (lane < 0.0) {
        vec2 av = a - v, bv = b - v;
        float det = av.x * bv.y - av.y * bv.x;
        if (abs(det) > 1e-7) {
          float al = (q.x * bv.y - q.y * bv.x) / det, be = (av.x * q.y - av.y * q.x) / det;
          if (al >= 0.0 && be >= 0.0 && al + be > 1e-5) { s = al + be; lane = float(i) + be / s; }
        }
      }
    }
  }
  bool onWall = lane >= 0.0 && s <= 1.0 && s >= 0.16;
  float z = onWall ? (1.0 / s - 1.0) / 5.25 : 0.0;
  float beat = fract(uBeat);
  // the dark round the tube, where the wall does not cover it: a slow haze in the tube's colour, stars streaming past
  vec3 col = vec3(0.0);
  if (!onWall) {
    float haze = fbm(p * 2.3 + vec2(uTime * 0.03, -uTime * 0.02) + uSeed.xy * 9.0);
    col = vec3(0.004, 0.004, 0.02) + mix(tubeC, vec3(0.7, 0.12, 0.6), 0.5 + 0.5 * sin(p.x * 2.1 + p.y * 3.3 - uTime * 0.11)) * haze * haze * 0.26;
    float go = diving ? 2.4 : 0.34 + 0.3 * uEnergy;
    col += vec3(0.65, 0.78, 1.0) * (streaks(ang, r, 44.0, go, 3.0) + streaks(ang + 0.07, r, 71.0, go * 0.7, 11.0) * 0.6) * (diving ? 1.4 : 0.55 + 0.5 * uHat);
  }
  if (lane >= 0.0 && s > 1.0) {
    // outside the rim: the tube's own outline rippling out on each beat, and slower once a bar
    float e = s - 1.0, to = r / s;
    float d1 = abs(e - beat * 1.15) * to, d2 = abs(e - fract(uBar) * 2.0) * to;
    float fall = 1.0 / (1.0 + e * 2.5);
    col += tubeC * (lineGlow(d1, 0.0034) * 0.85 + exp(-d1 * 55.0) * 0.26) * (1.0 - beat) * (1.0 - beat) * fall * fade;
    col += mix(tubeC, white, 0.25) * (lineGlow(d2, 0.004) * 0.8 + exp(-d2 * 40.0) * 0.28) * (1.0 - fract(uBar)) * fall * fade;
    // the rim's own light falling on the dark
    col += tubeC * exp(-e * 5.0) * (0.09 + 0.2 * uKick) * fade;
  }
  if (onWall) {
    // the wall: every other lane a shade lighter, darker toward the far end, rungs across it, a pulse climbing it each beat
    float alt = mod(floor(lane), 2.0);
    col = tubeC * (0.075 + 0.065 * alt) * (1.0 - z * 0.45) + vec3(0.003, 0.003, 0.012);
    float rd = abs(fract(z * 7.0 + 0.5) - 0.5) / 7.0 * 5.25 * s * r;
    col += tubeC * lineGlow(rd, 0.0022) * 0.34 * (0.6 + 0.4 * s);
    float dp = z - (1.0 - beat);
    col += mix(tubeC, white, 0.15) * exp(-dp * dp * 70.0) * (0.45 - 0.2 * beat) * (0.5 + uKick * 0.8);
    col += tubeC * uSnare * 0.2 * (1.0 - z);
    // the claw's lane, a beam of its light down it
    if (uClaw.y > 0.5 && !diving) {
      float dl = lanesApart(lane, uClaw.x + 0.5);
      col += yellow * exp(-dl * dl * 5.5) * (0.17 + 0.4 * exp(-uTubeFx.w * 8.0)) * (1.0 - z * 0.5);
    }
    col *= fade;
  }
  // the far point burning, with the bass
  col += mix(tubeC, white, 0.5) * exp(-r / max(0.05 * gZoom, 0.01)) * (0.55 + 1.4 * uBass + 0.5 * uKick) * fade;

  col += tubeC * (lineGlow(dLane, lw) * 1.05 + exp(-dLane * 125.0) * 0.2) * fade * (1.0 + 0.45 * uKick);
  // the rim: thick and bright, kicking with the beat, flaring white on the snare
  col += mix(tubeC, white, 0.32 + 0.55 * uSnare) * (lineGlow(dRim, lw * 1.5) * 1.5 + exp(-dRim * 72.0) * (0.3 + 0.55 * uKick)) * fade;

  // the claw's lane's edges lit yellow; the claw itself on the rim, glowing, its gun flashing as it fires
  if (uClaw.y > 0.5 && !diving) {
    float c = uClaw.x;
    vec2 e0 = edgeAt(c), e1 = edgeAt(c + 1.0);
    float dl = min(sdSeg(p, tubePt(e0, 0.0), tubePt(e0, 1.0)), sdSeg(p, tubePt(e1, 0.0), tubePt(e1, 1.0)));
    col = mix(col, yellow * 0.85, lineGlow(dl, lw));
    vec2 a = tubePt(e0, 0.0), b = tubePt(e1, 0.0);
    vec2 m = (a + b) * 0.5, ab = b - a;
    vec2 o = normalize(m - v);
    vec2 tl = a + ab * 0.2 + o * 0.055, tr = b - ab * 0.2 + o * 0.055, notch = m + o * 0.022;
    float dc = min(min(sdSeg(p, a, tl), sdSeg(p, tl, notch)), min(sdSeg(p, notch, tr), sdSeg(p, tr, b)));
    dc = min(dc, min(sdSeg(p, a, m - o * 0.012), sdSeg(p, m - o * 0.012, b)));
    col = mix(col, yellow * 1.5, lineGlow(dc, lw * 1.3));
    col += yellow * exp(-dc * 80.0) * (0.45 + 0.4 * uKick);
    col += vec3(1.0, 0.95, 0.6) * exp(-length(p - m) * 34.0) * exp(-uTubeFx.w * 20.0) * 2.4;
  }

  // the climbers: red zigzags, magenta spinners, green orbs, each as wide as its lane, its light on the wall round it
  for (int k = 0; k < 8; k++) {
    vec4 f = uFoes[k];
    if (f.w < 0.5) continue;
    vec3 fc;
    if (f.z < 0.5) fc = vec3(1.0, 0.1, 0.1);
    else if (f.z < 1.5) fc = vec3(1.0, 0.1, 1.0);
    else fc = vec3(0.1, 1.0, 0.2);
    if (onWall) {
      float dl = lanesApart(lane, f.x + 0.5), dd = z - f.y;
      col += fc * exp(-dl * dl * 7.0 - dd * dd * 40.0) * 0.5 * (0.7 + 0.5 * uKick);
    }
    vec2 e0 = tubePt(edgeAt(f.x), f.y), e1 = tubePt(edgeAt(f.x + 1.0), f.y);
    vec2 c = (e0 + e1) * 0.5, u = (e1 - e0) * 0.5;
    float wl = length(u);
    if (length(p - c) > wl * 2.0 + 0.035) continue;
    vec2 w = normalize(c - v) * wl;
    float d = 1e9;
    if (f.z < 0.5) {
      vec2 P0 = c - u * 0.95, P1 = c - u * 0.45 + w * 0.55, P2 = c, P3 = c + u * 0.45 + w * 0.55, P4 = c + u * 0.95;
      d = min(min(sdSeg(p, P0, P1), sdSeg(p, P1, P2)), min(sdSeg(p, P2, P3), sdSeg(p, P3, P4)));
      d = min(d, min(sdSeg(p, P0, c - w * 0.3), sdSeg(p, c - w * 0.3, P4)));
    } else if (f.z < 1.5) {
      mat2 R = rot(uTime * 4.0 + float(k));
      vec2 sq = R * ((p - c) / (wl * 0.6));
      d = abs(max(abs(sq.x), abs(sq.y)) - 1.0) * wl * 0.6;
      d = min(d, abs(abs(sq.x + sq.y) - 0.0) * wl * 0.42 + step(1.0, max(abs(sq.x), abs(sq.y))));
    } else {
      vec2 oq = p - c;
      d = abs(length(oq) - wl * 0.35);
      for (int sp = 0; sp < 6; sp++) {
        float a = float(sp) * 1.0472 + uTime * 2.0;
        vec2 dir = vec2(cos(a), sin(a));
        d = min(d, sdSeg(p, c + dir * wl * 0.35, c + dir * wl * 0.62));
      }
    }
    col += fc * (lineGlow(d, lw * 1.15) * 1.5 + exp(-d * 95.0) * 0.55);
  }

  // the shots: white-hot heads, a tail back up the lane, the lane lit as they pass
  for (int k = 0; k < 8; k++) {
    vec4 sh = uTShots[k];
    if (sh.z < 0.5) continue;
    if (onWall) {
      float dl = lanesApart(lane, sh.x + 0.5), dd = z - sh.y;
      col += yellow * exp(-dl * dl * 9.0 - dd * dd * 26.0) * 0.5;
    }
    vec2 mid = (edgeAt(sh.x) + edgeAt(sh.x + 1.0)) * 0.5;
    vec2 a = tubePt(mid, sh.y), b = tubePt(mid, max(0.0, sh.y - 0.1));
    float d = sdSeg(p, a, b);
    col += vec3(1.0, 1.0, 0.7) * (lineGlow(d, lw * 1.6) * 1.8 + exp(-d * 85.0) * 0.5);
    col += white * exp(-length(p - a) * 110.0) * 1.2;
  }

  // bursts: a flash, a ring and rays flung out from where one was hit; the claw caught, a great star of every colour
  for (int k = 0; k < 6; k++) {
    vec4 b = uTBooms[k];
    if (b.z > 1.0) continue;
    vec2 c = tubePt((edgeAt(b.x) + edgeAt(b.x + 1.0)) * 0.5, b.y);
    float big = b.w > 1.5 ? 3.2 : 1.0;
    float near = big / (1.0 + 2.2 * b.y);
    vec3 bc;
    if (b.w > 1.5) bc = vec3(hash11(floor(uTime * 12.0)) > 0.5 ? 1.0 : 0.25, 1.0, hash11(floor(uTime * 12.0) + 3.0) > 0.5 ? 1.0 : 0.25);
    else if (b.w > 0.5) bc = vec3(1.0, 1.0, 1.0);
    else bc = vec3(1.0, 0.82, 0.25);
    float rb = length(p - c);
    col += mix(bc, white, 0.5) * exp(-rb / (0.05 * near)) * exp(-b.z * 9.0) * 3.0;
    float dr = abs(rb - b.z * 0.42 * near);
    col += bc * (lineGlow(dr, lw * 1.2) * 0.9 + exp(-dr * 70.0) * 0.5) * exp(-b.z * 4.2);
    col += bc * (b.w > 1.5 ? 0.3 : 0.035) * exp(-b.z * 8.0);
    if (rb > (b.z * 0.42 + 0.1) * near + 0.03) continue;
    float r0 = b.z * 0.3 * near, r1 = r0 + 0.075 * near * (1.0 - b.z * 0.5);
    float d = 1e9;
    for (int sp = 0; sp < 10; sp++) {
      float a = float(sp) * 0.62832 + hash11(float(k) + b.x * 7.0) * 0.6;
      float len = 0.65 + 0.35 * hash11(float(sp) + b.x);
      vec2 dir = vec2(cos(a), sin(a));
      d = min(d, sdSeg(p, c + dir * r0 * len, c + dir * r1 * len));
    }
    col += bc * (lineGlow(d, lw * 1.2) * 1.4 + exp(-d * 90.0) * 0.4) * (1.0 - b.z);
  }

  // the dive: a flash as it goes, the tube's outline rushing past over and over, the stars gone to streaks
  if (diving) {
    float w = uTubeFx.z;
    col += white * exp(-w * 18.0) * 0.4;
    if (lane >= 0.0) {
      float rings = abs(fract(log(max(s, 1e-3)) * 1.6 - w * 7.0) - 0.5);
      col += mix(tubeC, white, 0.4) * lineGlow(rings * 0.2, 0.014) * (1.0 - w * 0.75);
    }
    col += white * (streaks(ang, r, 40.0, 2.8, 7.0) + streaks(ang + 0.03, r, 63.0, 3.6, 17.0)) * (1.0 - w * 0.7);
  } else {
    // the next one opening: a last flash of its colour
    float op = (uClaw.z - uTubeFx.y) / max(uTubeFx.y, 0.1);
    if (op >= 0.0 && op < 0.5) col += tubeC * exp(-op * 12.0) * 0.55;
  }
  // caught: the edges flare red
  col = mix(col, vec3(1.0, 0.1, 0.06), hurt * 0.5 * smoothstep(0.25, 0.9, length(p)));

  // the score, top left, in green; the level beside it
  for (int k = 0; k < 5; k++) {
    int dg = int(mod(floor(uClaw.w / pow(10.0, float(4 - k))), 10.0));
    col += vec3(0.1, 1.0, 0.25) * digit7((p - vec2(-0.89 + float(k) * 0.033, 0.43)) / 0.027, dg) * 1.2;
  }
  int lv = int(mod(uTube.w + 1.0, 100.0));
  col += tubeC * digit7((p - vec2(-0.89, 0.385)) / 0.022, lv / 10) * float(lv >= 10);
  col += mix(tubeC, white, 0.3) * digit7((p - vec2(-0.862, 0.385)) / 0.022, lv - 10 * (lv / 10));
  return col;
}
`;

const crossing = `
// The road crossing: a hopper crossing four lanes of traffic, a verge and a
// river of logs to the five bays of the far bank. The game runs as a
// simulation (src/core/sims.js): every lane steps on the beat, as the
// arcade's traffic moved in jerks, and the hopper hops a lane on the beat,
// choosing each hop to be safe after the next; when it misjudges, it is run
// over or falls in. Five bays filled light up on the drop.
uniform vec4 uLaneA[12];   // each row: its offset, a thing's length, the pattern's period, kind (0 verge, 1 car, 2 lorry, 3 bike, 4 log, 5 bank)
uniform vec4 uLaneB[12];   // things in a period, how far apart, the way they go, colour
uniform vec4 uHop;         // x, y, facing (0 up, 1 left, 2 right, 3 down), how far through a hop (-1 resting, -2 gone)
uniform vec4 uDeath;       // x, y, since, kind (1 run over, 2 fell in)
uniform vec4 uCrossFx;     // score, bays filled, since one came home, since the five lit up
const float RH = 0.066, R0 = -0.43, FX = 0.8;
const float BAYS[5] = float[5](-0.64, -0.32, 0.0, 0.32, 0.64);

vec3 bright(float t) {
  vec3 c = unblack(pal(t));                       // (the palette can dip below zero: never black)
  return c / max(max(c.r, c.g), max(c.b, 0.3));
}
float box(vec2 q, vec2 h, float r) { vec2 d = abs(q) - h + r; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r; }
float fill(float d) { return 1.0 - smoothstep(-0.0012, 0.0012, d); }

// a car, a lorry or a bike seen from above, facing +u
vec3 vehicle(vec3 col, vec2 q, float kind, float len, vec3 paint) {
  float hl = len * 0.5;
  if (kind > 2.5) {
    // a bike: a thin frame, the rider's helmet, a lamp
    float fr = box(q, vec2(hl, 0.006), 0.004);
    col = mix(col, vec3(0.15), fill(fr));
    col = mix(col, paint, fill(length(q - vec2(-0.004, 0.0)) - 0.011));
    col = mix(col, vec3(1.0), fill(length(q - vec2(-0.004, 0.004)) - 0.004) * 0.6);
    col += vec3(1.0, 0.95, 0.7) * exp(-length((q - vec2(hl, 0.0)) * vec2(0.5, 1.6)) * 60.0) * (0.6 + 1.5 * uSnare);
    return col;
  }
  // wheels, just showing at the corners
  vec2 wq = vec2(abs(q.x) - hl * 0.62, abs(q.y) - 0.021);
  col = mix(col, vec3(0.04), fill(box(wq, vec2(0.012, 0.004), 0.002)));
  if (kind > 1.5) {
    // a lorry: a cab in the paint, a long pale box behind it with a stripe
    float cab = box(q - vec2(hl - 0.022, 0.0), vec2(0.022, 0.02), 0.006);
    float bx = box(q - vec2(-0.022, 0.0), vec2(hl - 0.022, 0.022), 0.003);
    col = mix(col, vec3(0.82, 0.84, 0.88) * (0.85 + 0.15 * step(0.0, q.y)), fill(bx));
    col = mix(col, paint, fill(bx) * step(abs(q.y), 0.005));
    col = mix(col, paint, fill(cab));
    col = mix(col, vec3(0.08, 0.12, 0.2), fill(box(q - vec2(hl - 0.012, 0.0), vec2(0.006, 0.015), 0.003)));
  } else {
    // a car: the body in its paint, the windscreen and the back window dark, the roof between them
    float body = box(q, vec2(hl, 0.02), 0.009);
    col = mix(col, paint * (0.78 + 0.22 * step(0.0, q.y)), fill(body));
    col = mix(col, vec3(0.05, 0.08, 0.16), fill(box(q - vec2(hl * 0.22, 0.0), vec2(hl * 0.13, 0.015), 0.004)));
    col = mix(col, vec3(0.05, 0.08, 0.16), fill(box(q - vec2(-hl * 0.45, 0.0), vec2(hl * 0.09, 0.014), 0.004)));
    col += vec3(1.0) * fill(box(q - vec2(-hl * 0.12, 0.007), vec2(hl * 0.18, 0.003), 0.002)) * 0.25;
  }
  // headlights forward, flaring on the snare; tail lights behind
  for (int s = -1; s <= 1; s += 2) {
    vec2 hp = vec2(hl - 0.003, float(s) * 0.012);
    col += vec3(1.0, 0.95, 0.7) * (exp(-length(q - hp) * 400.0) * 1.5
         + step(hl, q.x) * exp(-length((q - hp - vec2(0.03, 0.0)) * vec2(0.5, 1.4)) * 55.0) * (0.08 + 0.45 * uSnare));
    col += vec3(1.0, 0.1, 0.05) * exp(-length(q - vec2(-hl + 0.002, float(s) * 0.013)) * 600.0) * 1.2;
  }
  return col;
}

// the hopper seen from above, facing +y: a squat body, two eyes, its legs tucked or flung out in a hop
vec3 hopper(vec3 col, vec2 q, float air) {
  float sp = air >= 0.0 ? sin(3.14159 * air) : 0.0;
  q /= 1.0 + 0.45 * sp;
  vec3 skin = vec3(0.35, 1.0, 0.4), dark = vec3(0.05, 0.35, 0.12);
  // legs: the back pair kicked out behind in a hop, the front pair reaching
  float stretch = 0.6 + 0.9 * sp;
  float legs = 1e9;
  for (int s = -1; s <= 1; s += 2) {
    float fs = float(s);
    legs = min(legs, sdSeg(q, vec2(fs * 0.012, -0.008), vec2(fs * 0.024, -0.012 - 0.012 * stretch)));
    legs = min(legs, sdSeg(q, vec2(fs * 0.024, -0.012 - 0.012 * stretch), vec2(fs * 0.016, -0.024 - 0.008 * stretch)));
    legs = min(legs, sdSeg(q, vec2(fs * 0.01, 0.008), vec2(fs * 0.022, 0.016 + 0.006 * sp)));
  }
  col = mix(col, dark, 1.0 - smoothstep(0.003, 0.0045, legs));
  float body = length(q * vec2(1.0, 0.82) - vec2(0.0, -0.002)) - 0.016;
  col = mix(col, skin * (0.75 + 0.35 * smoothstep(0.012, -0.01, q.y + q.x * 0.3)), fill(body));
  col = mix(col, dark, fill(body + 0.006) * step(0.6, fract(q.x * 60.0 + 0.5)) * 0.25);
  for (int s = -1; s <= 1; s += 2) {
    vec2 e = q - vec2(float(s) * 0.008, 0.012);
    col = mix(col, skin, fill(length(e) - 0.0065));
    col = mix(col, vec3(1.0), fill(length(e) - 0.0045));
    col = mix(col, vec3(0.0), fill(length(e - vec2(0.0, 0.0015)) - 0.0022));
  }
  col += skin * exp(-max(body, 0.0) * 90.0) * 0.25;
  return col;
}

vec3 render(vec2 p, vec2 uv) {
  vec3 col = vec3(0.01, 0.01, 0.025);
  float r = floor((p.y - R0 + RH * 0.5) / RH);
  float ry = R0 + r * RH;
  vec2 q = vec2(p.x, p.y - ry);
  vec3 edge = bright(0.15 + uSeed.y);
  if (r >= 0.0 && r <= 11.0) {
    int ri = int(r);
    vec4 A = uLaneA[ri], B = uLaneB[ri];
    float kind = A.w;
    if (kind < 0.5) {
      // the start and the verge: dark grass, a bright kerb at each edge
      col = vec3(0.04, 0.09, 0.05) * (0.8 + 0.4 * vnoise(p * vec2(90.0, 140.0)));
      col += edge * (1.0 - smoothstep(0.0, 0.003, abs(abs(q.y) - RH * 0.5 + 0.002))) * 0.7;
    } else if (kind < 3.5) {
      // the road: asphalt, the lanes dashed apart
      col = vec3(0.05, 0.05, 0.07) * (0.85 + 0.3 * vnoise(p * 160.0));
      float dash = step(0.5, fract(p.x * 9.0)) * (1.0 - smoothstep(0.0, 0.0025, abs(q.y - RH * 0.5)));
      if (r < 4.0) col += vec3(0.75, 0.75, 0.6) * dash * 0.55;
    } else if (kind < 4.5) {
      // the river: deep water, ripples running the lane's way, glinting on the hats
      col = vec3(0.02, 0.06, 0.2) + vec3(0.02, 0.05, 0.12) * vnoise(vec2(p.x * 30.0 - B.z * uTime * 0.6, p.y * 60.0));
      float rip = sin(p.x * 55.0 - B.z * uTime * 2.0 + 6.0 * vnoise(vec2(p.x * 8.0, p.y * 40.0)));
      col += vec3(0.25, 0.5, 1.0) * smoothstep(0.92, 1.0, rip) * step(0.5, fract(p.y * 60.0)) * (0.1 + 0.15 * uBass);
      col += vec3(0.7, 0.85, 1.0) * step(0.985, hash12(floor(vec2(p.x * 120.0 - B.z * uTime * 8.0, p.y * 80.0)))) * uHat * 0.6;
    } else {
      // the bank: a hedge, and five bays of water in it
      col = vec3(0.05, 0.2, 0.08) * (0.55 + 0.6 * vnoise(p * vec2(70.0, 90.0))) * (0.85 + 0.3 * uBass);
      col += edge * (1.0 - smoothstep(0.0, 0.003, abs(q.y + RH * 0.5 - 0.002))) * 0.5;
      for (int b = 0; b < 5; b++) {
        float bd = box(q - vec2(BAYS[b], -0.006), vec2(0.04, 0.028), 0.012);
        if (bd < 0.0) {
          col = vec3(0.02, 0.06, 0.2);
          bool home = mod(floor(uCrossFx.y / exp2(float(b))), 2.0) > 0.5;
          if (home) col = hopper(col, (q - vec2(BAYS[b], -0.004)) * 1.05, -1.0);
        }
        col += edge * (1.0 - smoothstep(0.0, 0.0025, abs(bd))) * 0.6;
      }
      // one home: the bank flashes; five lit up on the drop: every bay flares in turn
      col += vec3(0.6, 1.0, 0.6) * exp(-uCrossFx.z * 5.0) * 0.25;
      float lit = uCrossFx.w;
      if (lit < 2.0) for (int b = 0; b < 5; b++)
        col += bright(float(b) * 0.2 + lit) * exp(-length(q - vec2(BAYS[b], 0.0)) * 25.0) * max(0.0, 1.0 - lit * 0.5) * (0.6 + 0.4 * sin(lit * 20.0 - float(b)));
    }
    // what moves in the lane: its things, each placed in the lane's repeating pattern
    if (kind > 0.5 && kind < 4.5) {
      float local = mod(p.x - A.x, A.z);
      vec3 paint = bright(B.w + uSeed.x);
      for (int k = 0; k < 3; k++) {
        if (float(k) >= B.x) break;
        float d = local - float(k) * B.y;
        d -= A.z * floor(d / A.z + 0.5);
        if (abs(d) > A.y * 0.5 + 0.1) continue;
        if (kind > 3.5) {
          // a log: a long round of bark, its grain along it, its cut ends pale, bobbing on the bass
          vec2 lq = vec2(d, q.y);
          float lg = box(lq, vec2(A.y * 0.5, 0.022), 0.02);
          vec3 wood = vec3(0.42, 0.24, 0.1) * (0.8 + 0.2 * sin(q.y * 300.0 + vnoise(lq * vec2(12.0, 4.0)) * 1.5));
          wood *= 0.85 + 0.25 * smoothstep(0.02, -0.02, q.y) + 0.15 * uBass;
          col = mix(col, wood, fill(lg));
          float ends = min(length((lq - vec2(A.y * 0.5 - 0.012, 0.0)) * vec2(1.6, 1.0)), length((lq + vec2(A.y * 0.5 - 0.012, 0.0)) * vec2(1.6, 1.0)));
          col = mix(col, vec3(0.75, 0.55, 0.3) * (0.8 + 0.2 * sin(ends * 900.0)), fill(ends - 0.017) * fill(lg));
          col += vec3(0.6, 0.8, 1.0) * (1.0 - smoothstep(0.0, 0.004, abs(lg))) * 0.15;
        } else {
          col = vehicle(col, vec2(d * B.z, q.y * B.z), kind, A.y, paint);
        }
      }
    }
  }
  // the field's sides: dark panels with a lit edge
  if (abs(p.x) > FX) col = vec3(0.06, 0.07, 0.12) * (0.6 + 0.4 * sin(p.y * 80.0));
  col += edge * exp(-abs(abs(p.x) - FX) * 140.0) * 0.6 * step(p.y, R0 + 11.5 * RH) * step(R0 - 0.5 * RH, p.y);

  // the hopper: its shadow on the ground while in the air, then itself
  if (uHop.w > -1.5) {
    vec2 hq = p - uHop.xy;
    float f = uHop.z;
    vec2 fq = f < 0.5 ? hq : f < 1.5 ? vec2(-hq.y, hq.x) : f < 2.5 ? vec2(hq.y, -hq.x) : -hq;
    if (uHop.w >= 0.0) col *= 1.0 - 0.6 * fill(length(hq * vec2(1.0, 1.3)) - 0.017) * sin(3.14159 * uHop.w);
    if (dot(hq, hq) < 0.004) col = hopper(col, fq - vec2(0.0, uHop.w >= 0.0 ? 0.0 : 0.0), uHop.w);
  }
  // run over: a flash and the splat left on the road; fallen in: rings spreading on the water
  float dt = uDeath.z;
  if (dt < 1.6) {
    vec2 dq = p - uDeath.xy;
    if (uDeath.w < 1.5) {
      float a = atan(dq.y, dq.x);
      float star = length(dq) - 0.03 * (0.6 + 0.4 * sin(a * 7.0)) * min(1.0, dt * 10.0);
      col = mix(col, vec3(0.3, 0.9, 0.35) * 0.7, fill(star) * max(0.0, 1.0 - dt / 1.6));
      col += vec3(1.0, 0.95, 0.8) * exp(-length(dq) * 30.0) * exp(-dt * 6.0) * 2.5;
      col += vec3(1.0, 0.9, 0.6) * (1.0 - smoothstep(0.0, 0.004, abs(length(dq) - dt * 0.25))) * max(0.0, 1.0 - dt * 2.5);
    } else {
      for (int k = 0; k < 3; k++) {
        float rr = dt * 0.06 - float(k) * 0.012;
        if (rr > 0.0) col += vec3(0.6, 0.85, 1.0) * (1.0 - smoothstep(0.0, 0.003, abs(length(dq * vec2(1.0, 1.4)) - rr))) * max(0.0, 1.0 - dt / 1.2);
      }
      for (int k = 0; k < 8; k++) {
        float fk = float(k);
        vec2 v = vec2(cos(fk * 0.785 + 0.3), sin(fk * 0.785 + 0.3)) * (0.04 + 0.02 * hash11(fk));
        vec2 sp = uDeath.xy + v * dt + vec2(0.0, 0.08 * dt - 0.22 * dt * dt);
        col += vec3(0.7, 0.9, 1.0) * fill(length(p - sp) - 0.004) * max(0.0, 1.0 - dt * 1.4);
      }
    }
  }
  // a five-bay round lit up: a flash over the field
  col += bright(uCrossFx.w * 0.3) * exp(-uCrossFx.w * 4.0) * 0.3;

  // the score, top left
  for (int k = 0; k < 5; k++) {
    int dg = int(mod(floor(uCrossFx.x / pow(10.0, float(4 - k))), 10.0));
    col += vec3(0.95, 0.95, 1.0) * digit7((p - vec2(-0.84 + float(k) * 0.045, 0.37)) / 0.04, dg) * 0.7;
  }
  return col;
}
`;

const karts = `
// The kart race: eight karts round a closed course, an animal at each wheel, the
// camera riding behind the player's as the 32-bit kart racers had it - the place
// big in a corner, the lap, the time, a map of the course. Items are thrown on
// the snare and burst on the next beat; through the build the player's kart
// boosts off a pad, and on the drop the leaders cross the line nose to nose,
// caught by the photo-finish camera. The race runs as a simulation
// (src/core/sims.js); this traces the course, the karts and what stands round it.
#define STAGE_OPAQUE
uniform vec4 uKtCam[4];     // the eye and its lens; forward; right; up
uniform vec4 uKtSeg[72];    // the course's middle, evenly round it: x, z, and its right
uniform vec4 uKtCourse;     // the lap's length, the look (0 park, 1 canyon, 2 night), seconds into the race, the shot
uniform vec4 uKtK0[8];      // each kart: x, how high it is thrown, z, its heading
uniform vec4 uKtK1[8];      // how far its wheels have turned, -, its boost, its driver
uniform vec4 uKtK2[8];      // its slide, how spun it is
uniform vec4 uKtShot[8];    // items in flight: x, y, z, kind (0 none, 1 a bomb, 2 a rocket); then its way x, z, age
uniform vec4 uKtCube[8];    // the item cubes: x, y, z, size
uniform vec4 uKtPad[4];     // the boost pads: x, z, heading, lit (above 1: the build's big one)
uniform vec4 uKtRamp[2];    // the ramps standing: x, z where they start, heading, there
uniform vec4 uKtN[3];       // how many there are: props, particles, cubes, items; pads, ramps, karts to look at for flames, karts;
                            // the course's pieces, a kart's march steps, an item's, the HUD's lines (counts the compiler cannot unroll)
uniform vec4 uKtLook[40];   // each kart's animal by numbers: ears' base and tip and radii, muzzle's, eyes and nose
uniform vec4 uKtText[32];   // the HUD's lines: top left and a font pixel and how many letters; letters 0-3; 4-7; colour
uniform vec4 uKtBeat;       // the player round the course, how hard the eye is shaken, since the place and the lap last changed
float ktWave(float along);
vec3 ktWallFace0(vec3 wq, float th);
uniform vec4 uKtProp[20];   // what stands by the track: x, z, kind (0, 1 the look's two trees, 2/3 an arrow left/right, 4 tyres), height
uniform vec4 uKtPart[32];   // sparks, smoke, blasts, glitter: where on the screen, its depth, kind + age
uniform vec4 uKtHud;        // the player's place, lap, laps, seconds since the last finish
uniform vec4 uKtHud2;       // how the last finish went (1 won, 2 second), the player's boost, the map's middle
uniform vec4 uKtMap;        // the map's half size; where the photo's line crosses the leaders
uniform vec4 uKtRank[2];    // the karts in their order
uniform vec4 uFont[24];     // the 5x7 font, two letters a vec4: rows 0-3, rows 4-6

const float KHALF = 6.0, KWALL = 8.4, KWH = 0.9;

vec3 ktHue(float h) { return clamp(abs(fract(h + vec3(0.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0) - 1.0, 0.0, 1.0); }
// each kart its own colour, spread round the wheel from the seed
vec3 ktColour(float i) { return mix(vec3(1.0), ktHue(fract(uSeed.x + i * 0.125)), 0.85) * 0.92; }

// ---- the 5x7 font
float ktBit(float g, float fx, float fy) {
  if (fx < 0.0 || fy < 0.0 || fx >= 5.0 || fy >= 7.0) return 0.0;
  int gi = int(g + 0.5);
  vec4 v = uFont[gi / 2];
  float lo = v.x, hi = v.y;
  if (gi % 2 == 1) { lo = v.z; hi = v.w; }
  float x = floor(fx), y = floor(fy);
  float bits = lo, bit = y * 5.0 + x;
  if (y >= 4.0) { bits = hi; bit = (y - 4.0) * 5.0 + x; }
  return mod(floor(bits / exp2(bit)), 2.0);
}
// the HUD's lines, each its letters with a shadow down and to the left; one piece of code draws every line
vec3 ktHudText(vec2 p, vec3 col) {
  int n = int(uKtN[2].w);
  for (int i = 0; i < n; i++) {
    vec4 a = uKtText[i * 4], c0 = uKtText[i * 4 + 1], c1 = uKtText[i * 4 + 2], cl = uKtText[i * 4 + 3];
    vec2 q = p - a.xy;
    float px = a.z;
    int len = int(a.w + 0.5);
    if (q.x < -2.0 * px || q.x > float(len) * 6.0 * px + px || q.y > 2.0 * px || q.y < -9.5 * px) continue;
    for (int s = 0; s < len + 2; s++) {
      if (s >= 2) break;
      vec2 qq = q;
      if (s == 0) qq = q + vec2(-px, px) * 1.2;
      float fx = qq.x / px, fy = -qq.y / (px * 1.15);
      int k = int(floor(fx / 6.0));
      if (fx < 0.0 || k >= len || fy < 0.0 || fy >= 7.0) continue;
      float b = ktBit(k < 4 ? c0[k] : c1[k - 4], fx - float(k) * 6.0, fy);
      if (s == 0) col = mix(col, vec3(0.05, 0.02, 0.1), b);
      else col = mix(col, cl.rgb, b);
    }
  }
  return col;
}

// ---- the course: how far a point is from the middle of the track (right positive), and how far round
// (found coarse then fine: the nearest of every fourth sample, then the pieces either side of it - the course's parts
// are never near enough each other for the coarse pass to pick the wrong one for a point on or by the track)
float ktTrack(vec2 q, out float along) {
  float best = 1e9, side = 1.0;
  along = 0.0;
  int c0 = 0;
  for (int i = 0; i < 72; i += 4) {
    vec2 e = q - uKtSeg[i].xy;
    float dd = dot(e, e);
    if (dd < best) { best = dd; c0 = i; }
  }
  best = 1e9;
  for (int k = -6; k < 6; k++) {
    int i = (c0 + k + 72) % 72;
    vec4 a = uKtSeg[i], b = uKtSeg[(i + 1) % 72];
    vec2 ab = b.xy - a.xy, qa = q - a.xy;
    float h = clamp(dot(qa, ab) / dot(ab, ab), 0.0, 1.0);
    vec2 e = qa - ab * h;
    float dd = dot(e, e);
    if (dd < best) { best = dd; along = float(i) + h; side = dot(e, a.zw + (b.zw - a.zw) * h) >= 0.0 ? 1.0 : -1.0; }
  }
  along *= uKtCourse.x / 72.0;
  return sqrt(best) * side;
}

// the barriers either side: the nearest a ray meets below their top; along the course, height, which side. Only the
// pieces between the eye's and the ground's are looked at: a ray can only meet a barrier on its way there
float ktWalls(vec3 ro, vec3 rd, float tMax, int i0, int n, int s0, int s1, out vec3 wq) {
  float best = tMax;
  wq = vec3(0.0);
  vec2 r = rd.xz;
  for (int k = 0; k < 72; k++) {
    if (k >= n) break;
    int i = (i0 + k) % 72;
    vec4 a = uKtSeg[i], b = uKtSeg[(i + 1) % 72];
    for (int s = s0; s <= s1; s += 2) {
      float sd = float(s) * KWALL;
      vec2 A = a.xy + a.zw * sd, B = b.xy + b.zw * sd, e = B - A, oa = A - ro.xz;
      float den = r.x * e.y - r.y * e.x;
      if (abs(den) < 1e-6) continue;
      float t = (oa.x * e.y - oa.y * e.x) / den;
      float u = (oa.x * r.y - oa.y * r.x) / den;
      if (t > 0.05 && t < best && u >= 0.0 && u <= 1.0) {
        float y = ro.y + rd.y * t;
        if (y > 0.0 && y < KWH) { best = t; wq = vec3((float(i) + u) * uKtCourse.x / 72.0, y, float(s)); }
      }
    }
  }
  return best;
}

// ---- the sky and the land beyond
vec3 ktSun(float th) {
  if (th < 0.5) return normalize(vec3(0.5, 0.55, 0.6));
  if (th < 1.5) return normalize(vec3(-0.7, 0.18, 0.6));
  return normalize(vec3(0.3, 0.35, 0.9));
}
vec3 ktSky(vec3 rd, float th) {
  float y = max(rd.y, 0.0), az = atan(rd.x, rd.z);
  vec3 L = ktSun(th);
  vec3 c;
  if (th < 0.5) {
    c = mix(vec3(0.62, 0.8, 1.0), vec3(0.18, 0.42, 0.92), pow(y, 0.6));
    if (y > 0.02 && y < 0.6) {
      vec2 cq = vec2(az * 3.0, y * 9.0) + vec2(uTime * 0.01, 0.0);
      float cl = smoothstep(0.55, 0.8, 0.53 * vnoise(cq) + 0.3 * vnoise(cq * 2.02) + 0.17 * vnoise(cq * 4.1)) * smoothstep(0.02, 0.12, y) * (1.0 - smoothstep(0.35, 0.6, y));
      c = mix(c, vec3(1.0), cl * 0.9);
    }
  } else if (th < 1.5) {
    c = mix(vec3(1.0, 0.72, 0.42), vec3(0.55, 0.32, 0.55), pow(y, 0.5));
    c += vec3(1.0, 0.6, 0.25) * pow(max(dot(rd, L), 0.0), 8.0) * 0.5;
  } else {
    c = mix(vec3(0.16, 0.08, 0.28), vec3(0.02, 0.02, 0.08), pow(y, 0.4));
    vec2 st = vec2(az * 40.0, y * 60.0);
    float h = hash12(floor(st));
    c += vec3(0.9, 0.9, 1.0) * step(0.985, h) * (1.0 - smoothstep(0.0, 0.25, length(fract(st) - 0.5))) * (0.6 + 0.4 * uHat);
  }
  // the sun, or the moon
  float sd = dot(rd, L);
  if (th < 1.5) c += vec3(1.0, 0.95, 0.8) * smoothstep(0.9985, 0.9992, sd) * 1.4 + vec3(1.0, 0.85, 0.6) * pow(max(sd, 0.0), 120.0) * 0.4;
  else c = mix(c, vec3(0.95, 0.95, 0.85), smoothstep(0.9993, 0.9996, sd));
  // the land beyond the course: hills, mesas or a skyline
  float h;
  vec3 land;
  if (th < 0.5) {
    h = 0.015 + 0.06 * (vnoise(vec2(az * 2.5, 1.0) + uSeed.xy * 7.0) * 0.65 + vnoise(vec2(az * 6.0, 2.0)) * 0.35);
    land = mix(vec3(0.3, 0.55, 0.4), vec3(0.5, 0.65, 0.75), 0.5);
  } else if (th < 1.5) {
    float m = vnoise(vec2(az * 1.8, 3.0) + uSeed.yz * 5.0) * 0.7 + vnoise(vec2(az * 5.0, 1.0)) * 0.3;
    h = 0.01 + 0.09 * smoothstep(0.45, 0.6, m);
    land = vec3(0.62, 0.3, 0.2) * (0.8 + 0.3 * smoothstep(0.0, 0.08, rd.y));
  } else {
    float col = floor(az * 30.0);
    h = 0.02 + 0.06 * hash11(col + 7.0) * step(0.3, hash11(col));
    land = vec3(0.04, 0.04, 0.1);
    vec2 w = fract(vec2(az * 30.0 * 4.0, rd.y * 120.0));
    land += vec3(1.0, 0.8, 0.4) * step(0.7, hash12(floor(vec2(az * 120.0, rd.y * 120.0)))) * step(0.3, w.x) * step(0.3, w.y) * 0.5;
  }
  if (rd.y < h) c = land;
  c = mix(c, c * unblack(pal(0.15 + uSeed.z)), 0.12);
  return c;
}

vec3 ktHaze(float th) {
  if (th < 0.5) return vec3(0.7, 0.82, 0.95);
  if (th < 1.5) return vec3(0.95, 0.68, 0.45);
  return vec3(0.1, 0.06, 0.2);
}

// ---- the ground: the track, its kerbs and lines, the run-off, the land
vec3 ktGround(vec3 h, float d, float along, float th, out float shine) {
  float ad = abs(d);
  shine = 0.0;
  float n = vnoise(h.xz * 2.6);
  vec3 c;
  // beyond the track: grass in mown stripes, sand, or dark grass
  if (th < 0.5) c = mix(vec3(0.22, 0.52, 0.16), vec3(0.28, 0.6, 0.2), step(0.5, fract(along / 6.0))) * (0.85 + 0.25 * n);
  else if (th < 1.5) c = vec3(0.93, 0.76, 0.5) * (0.88 + 0.2 * n);
  else c = vec3(0.05, 0.12, 0.09) * (0.8 + 0.4 * n);
  if (ad < KHALF + 0.5) {
    vec3 road;
    if (th < 0.5) road = vec3(0.36, 0.36, 0.38) * (0.85 + 0.25 * n);
    else if (th < 1.5) road = vec3(0.52, 0.3, 0.17) * (0.8 + 0.3 * n) * (1.0 - 0.18 * smoothstep(0.35, 0.0, abs(ad - 1.6)));
    else road = vec3(0.1, 0.1, 0.13) * (0.85 + 0.25 * n);
    // the lines: white edges, a dashed middle (on tarmac); on the night course they glow
    if (th < 0.5 || th > 1.5) {
      float edge = 1.0 - smoothstep(0.08, 0.12, abs(ad - (KHALF - 0.55)));
      float mid = (1.0 - smoothstep(0.06, 0.1, ad)) * step(0.5, fract(along / 5.0));
      vec3 lc = th > 1.5 ? unblack(pal(0.6 + uSeed.w)) * (1.1 + 0.6 * uBass + 0.6 * uKick) : vec3(0.95);
      lc += vec3(1.0, 0.95, 0.8) * ktWave(along) * 1.2;
      road = mix(road, lc, max(edge, mid));
      if (th > 1.5) shine = max(edge, mid);
    }
    // the kerbs, red and white
    if (ad > KHALF - 0.3) {
      float alt = step(1.0, mod(floor(along / 1.5), 2.0));
      vec3 kerb = mix(vec3(0.9, 0.15, 0.12), vec3(0.95), alt);
      if (th > 0.5 && th < 1.5) kerb = mix(vec3(0.95, 0.9, 0.78), vec3(0.72, 0.24, 0.12), alt);
      road = kerb * (0.85 + 0.15 * n);
    }
    // the finish line: two rows of checks across the track, the noses on its edge as the karts' middles reach the line
    float fl = mod(along - 0.95, uKtCourse.x);
    if (fl < 1.2 && ad < KHALF - 0.3) {
      float ch = mod(floor(fl / 0.6) + floor((d + 12.0) / 0.6), 2.0);
      road = mix(vec3(0.06), vec3(0.97), ch);
    }
    c = road;
  }
  // the boost pads: arrows that run forward a step on every beat, glowing harder on the kick
  // (every loop runs only over what is there this frame: the software renderer runs a loop no longer than that)
  int nPads = int(uKtN[1].x);
  for (int i = 0; i < nPads; i++) {
    vec4 pd = uKtPad[i];
    if (pd.w <= 0.0) continue;
    vec2 pq = h.xz - pd.xy;
    vec2 pl = vec2(dot(pq, vec2(cos(pd.z), sin(pd.z))), dot(pq, vec2(-sin(pd.z), cos(pd.z))));
    if (abs(pl.x) < 2.2 && abs(pl.y) < 1.5) {
      float chev = fract((pl.x - abs(pl.y) * 0.8) / 1.1 - floor(uTime / uSpb) * 0.25 - fract(uTime / uSpb) * 0.25);
      vec3 pc = mix(vec3(1.0, 0.45, 0.05), vec3(1.0, 0.95, 0.3), smoothstep(0.4, 0.7, chev));
      if (pd.w > 1.2) pc = mix(vec3(0.2, 0.6, 1.0), vec3(0.9, 1.0, 1.0), smoothstep(0.4, 0.7, chev));
      c = mix(vec3(0.15, 0.08, 0.02), pc * (0.6 + 0.6 * min(pd.w, 1.0)) * (1.0 + 0.8 * uKick), step(0.45, chev));
      shine = max(shine, step(0.45, chev) * min(pd.w, 1.0));
    }
  }
  // the karts' shadows
  for (int i = 0; i < 8; i++) {
    vec4 k = uKtK0[i];
    vec2 kq = h.xz - k.xz;
    vec2 kl = vec2(dot(kq, vec2(-sin(k.w), cos(k.w))), dot(kq, vec2(cos(k.w), sin(k.w))));
    float e = length(kl / vec2(0.78, 1.05));
    c *= 1.0 - 0.5 * (1.0 - smoothstep(0.75, 1.05, e)) / (1.0 + k.y * 1.5);
  }
  return c;
}

// the barrier's face: checks in two colours, a wooden fence, or a lit rail
// a wave of light that runs ahead of the player along the course once a bar, from its kart to sixty metres on
float ktWave(float along) {
  float lap = uKtCourse.x;
  float x = mod(along - uKtBeat.x - fract(uBar) * 60.0 + lap * 0.5, lap) - lap * 0.5;
  return exp(-abs(x) * 0.35) * (1.0 - fract(uBar) * 0.6);
}
vec3 ktWallFace(vec3 wq, float th) {
  vec3 lit = ktWallFace0(wq, th);
  // the barrier's top lit by the wave and the kick
  float top = smoothstep(KWH - 0.18, KWH - 0.05, wq.y);
  return lit * (1.0 + 0.35 * uKick) + (vec3(1.0, 0.95, 0.8) * ktWave(wq.x) * 1.5 + unblack(pal(0.6 + uSeed.w)) * uKick * 0.5) * top;
}
vec3 ktWallFace0(vec3 wq, float th) {
  float u = wq.x, y = wq.y;
  if (th < 0.5) {
    float ch = mod(floor(u / 1.2) + floor(y / 0.45), 2.0);
    return mix(unblack(pal(0.1 + uSeed.y)) * 0.9 + 0.1, vec3(0.95, 0.85, 0.15), ch) * (0.75 + 0.25 * step(0.06, abs(y - 0.45)));
  }
  if (th < 1.5) return vec3(0.55, 0.35, 0.18) * (0.7 + 0.3 * step(0.08, fract(u / 0.6))) * (0.85 + 0.15 * sin(y * 40.0));
  return mix(vec3(0.08, 0.08, 0.12), unblack(pal(0.6 + uSeed.w)) * 2.0, smoothstep(KWH - 0.12, KWH - 0.02, y));
}

// ---- the karts, in the round
float ktBox(vec3 q, vec3 h, float r) { vec3 d = abs(q) - h + r; return length(max(d, 0.0)) + min(max(d.x, max(d.y, d.z)), 0.0) - r; }
float ktCap(vec3 p, vec3 a, vec3 b, float r) { vec3 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h) - r; }
float ktCone(vec3 p, vec3 a, vec3 b, float r1, float r2) { vec3 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h) - mix(r1, r2, h); }
float ktSmin(float a, float b, float k) { float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
// a tyre across x: rounded at its shoulders
float ktTyre(vec3 q, float r, float w) { vec2 d = vec2(length(q.yz) - r + 0.04, abs(q.x) - w + 0.04); return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)) - 0.04; }

// the kart and its driver; q across, up, ahead; what is nearest: 1 body, 2 tyre, 3 metal, 4 seat, 5 fur, 6 muzzle, 7 shirt, 8 eyes and nose
// what makes a driver the animal it is, for a kart (a table in the shader, looked up at every step of the march, cost
// the GPU more than the rest of the kart; looked up once a kart it still cost: the numbers come from the simulation)
struct KtLook { vec3 eb, et, sb, st, eye; vec2 er, sr; float wide, nose; };
KtLook ktLook(int i) {
  // (each kart's numbers come in with the frame, from the simulation's table of the animals)
  vec4 a = uKtLook[i * 5], b = uKtLook[i * 5 + 1], c = uKtLook[i * 5 + 2], d = uKtLook[i * 5 + 3], e = uKtLook[i * 5 + 4];
  KtLook L;
  L.eb = a.xyz; L.er.x = a.w; L.et = b.xyz; L.er.y = b.w;
  L.sb = c.xyz; L.sr.x = c.w; L.st = d.xyz; L.sr.y = d.w;
  L.eye = e.xyz; L.nose = e.w;
  L.wide = L.nose == 0.0 ? 1.15 : 1.0;
  return L;
}

vec2 ktKart(vec3 q, KtLook L) {
  vec3 qs = vec3(abs(q.x), q.y, q.z);
  // the body: a low pan, the nose, side pods
  float body = ktBox(q - vec3(0.0, 0.2, 0.05), vec3(0.4, 0.06, 0.74), 0.05);
  body = min(body, ktBox(q - vec3(0.0, 0.32, 0.56), vec3(0.3, 0.1, 0.26), 0.09));
  body = min(body, ktBox(qs - vec3(0.4, 0.28, -0.08), vec3(0.1, 0.08, 0.38), 0.06));
  vec2 r = vec2(body, 1.0);
  // (each group of parts below is looked at only when the point is nearer it than what is already found)
  if (ktBox(q - vec3(0.0, 0.42, -0.32), vec3(0.28, 0.23, 0.17), 0.0) < r.x) {
    float seat = min(ktBox(q - vec3(0.0, 0.46, -0.42), vec3(0.22, 0.15, 0.05), 0.05), ktBox(q - vec3(0.0, 0.3, -0.22), vec3(0.22, 0.05, 0.17), 0.04));
    if (seat < r.x) r = vec2(seat, 4.0);
  }
  // the metal, in two groups each looked at only near it: behind, the bumper, the engine and two exhausts; in front,
  // the bumper and the wheel on its column (the wheel stands nearly upright, its face to the driver, 65 degrees
  // off the flat)
  if (ktBox(q - vec3(0.0, 0.36, -0.76), vec3(0.56, 0.2, 0.2), 0.0) < r.x) {
    float metal = ktBox(q - vec3(0.0, 0.26, -0.84), vec3(0.52, 0.04, 0.04), 0.03);
    metal = min(metal, ktBox(q - vec3(0.0, 0.42, -0.6), vec3(0.2, 0.12, 0.13), 0.04));
    metal = min(metal, ktCap(qs, vec3(0.17, 0.42, -0.66), vec3(0.17, 0.48, -0.88), 0.05));
    if (metal < r.x) r = vec2(metal, 3.0);
  }
  if (ktBox(q - vec3(0.0, 0.42, 0.58), vec3(0.46, 0.3, 0.38), 0.0) < r.x) {
    float metal = ktBox(q - vec3(0.0, 0.17, 0.92), vec3(0.42, 0.035, 0.035), 0.03);
    metal = min(metal, ktCap(q, vec3(0.0, 0.42, 0.5), vec3(0.0, 0.6, 0.23), 0.025));
    vec3 sw = q - vec3(0.0, 0.62, 0.2);
    sw.yz = mat2(0.423, -0.906, 0.906, 0.423) * sw.yz;
    metal = min(metal, length(vec2(length(sw.xz) - 0.14, sw.y)) - 0.022);
    if (metal < r.x) r = vec2(metal, 3.0);
  }
  // fat tyres at the back, small ones in front
  if (ktBox(qs - vec3(0.58, 0.27, 0.0), vec3(0.2, 0.28, 0.86), 0.0) < r.x) {
    float wh = min(ktTyre(qs - vec3(0.6, 0.27, -0.55), 0.27, 0.15), ktTyre(qs - vec3(0.56, 0.2, 0.58), 0.2, 0.1));
    if (wh < r.x) r = vec2(wh, 2.0);
  }
  // the driver, as those games drew them: sat low in the kart, a short round body no taller than the seat's back
  // and the shoulders level with the wheel, a big head on it with no neck between (all of it skipped by a ray that
  // passes well clear)
  if (ktBox(q - vec3(0.0, 0.53, -0.06), vec3(0.3, 0.2, 0.3), 0.0) < r.x) {
    float shirt = (length((q - vec3(0.0, 0.5, -0.28)) / vec3(0.21, 0.17, 0.16)) - 1.0) * 0.16;
    shirt = min(shirt, ktCap(qs, vec3(0.17, 0.6, -0.24), vec3(0.21, 0.5, -0.03), 0.062));
    shirt = min(shirt, ktCap(qs, vec3(0.21, 0.5, -0.03), vec3(0.13, 0.6, 0.15), 0.052));
    if (shirt < r.x) r = vec2(shirt, 7.0);
    // white gloves on the wheel
    float glove = length(qs - vec3(0.13, 0.61, 0.16)) - 0.065;
    if (glove < r.x) r = vec2(glove, 9.0);
  }
  if (length(q - vec3(0.0, 0.92, -0.24)) - 0.62 > r.x) return r;
  // the head, big, and what makes it the animal it is (drawn at its own size and grown by a ninth)
  const float HS = 1.12;
  vec3 h = (q - vec3(0.0, 0.88 - 0.04 * uKick, -0.24 + 0.035 * uKick)) / HS;    // (nodding to the kick)
  vec3 hs = vec3(abs(h.x), h.y, h.z);
  float head = (length(h / vec3(0.23 * L.wide, 0.21, 0.21)) - 1.0) * 0.2;
  float ears = ktCone(hs, L.eb, L.et, L.er.x, L.er.y);
  float snout = ktCone(h, L.sb, L.st, L.sr.x, L.sr.y);
  float fur = ktSmin(head, ears, 0.03) * HS;
  if (fur < r.x) r = vec2(fur, 5.0);
  if (snout * HS < r.x) r = vec2(snout * HS, 6.0);
  float dots = min(length(hs - L.eye) - 0.034, length(h - vec3(0.0, -0.05, L.nose)) - 0.035);
  if (dots * HS < r.x) r = vec2(dots * HS, 8.0);
  return r;
}

vec3 ktFur(float sp, float inner) {
  vec3 f;
  if (sp < 0.5) f = vec3(0.45, 0.28, 0.15);
  else if (sp < 1.5) f = vec3(0.95, 0.55, 0.2);
  else if (sp < 2.5) f = vec3(0.95, 0.93, 0.9);
  else if (sp < 3.5) f = vec3(0.6, 0.6, 0.66);
  else if (sp < 4.5) f = vec3(0.35, 0.75, 0.25);
  else if (sp < 5.5) f = vec3(0.98, 0.68, 0.7);
  else if (sp < 6.5) f = vec3(0.92, 0.42, 0.12);
  else f = vec3(0.85, 0.68, 0.42);
  if (inner > 0.5) {
    if (sp > 4.5 && sp < 5.5) return vec3(0.9, 0.5, 0.55);
    return mix(f, vec3(0.97, 0.92, 0.85), 0.7);
  }
  return f;
}


// the nearest kart a ray meets before tMax: which, what it met, where in the kart's own frame, and the surface's
// normal there. The kart's shape is looked at in one place only - marching, then four samples round the hit for the
// normal, in the same loop - and the loops' counts come from outside: a compiler that copies the shape for every
// step it can count took most of a minute over it
float ktMarch(vec3 ro, vec3 rd, float tMax, out int who, out float mat, out vec3 lq, out vec3 ln) {
  float best = tMax;
  who = -1; mat = 0.0; lq = vec3(0.0); ln = vec3(0.0, 1.0, 0.0);
  int nk = int(uKtN[1].w), steps = int(uKtN[2].y);
  for (int i = 0; i < nk; i++) {
    vec4 k = uKtK0[i];
    vec3 oc = ro - vec3(k.x, k.y + 0.62, k.z);
    float b = dot(oc, rd), h = b * b - dot(oc, oc) + 1.35 * 1.35;
    if (h <= 0.0) continue;
    h = sqrt(h);
    float ts = max(-b - h, 0.0), te = min(-b + h, best);
    if (ts >= te) continue;
    // (a kart passing right under the eye is let fade, in a dither as the consoles did, so it never fills the screen)
    float near = length(ro - k.xyz - vec3(0.0, 0.6, 0.0));
    if (near < 2.8 || (near < 4.2 && hash12(floor(gl_FragCoord.xy)) > (near - 2.8) / 1.4)) continue;
    vec3 f = vec3(cos(k.w), 0.0, sin(k.w)), rr = vec3(-sin(k.w), 0.0, cos(k.w));
    vec3 o = ro - k.xyz;
    vec3 lo = vec3(dot(o, rr), o.y, dot(o, f)), ld = vec3(dot(rd, rr), rd.y, dot(rd, f));
    // pitched about its middle over a jump, nose up off the lip and down to land
    float pc = cos(uKtK2[i].z), ps = sin(uKtK2[i].z);
    vec3 pv = vec3(0.0, 0.35, 0.0);
    lo = lo - pv;
    lo = vec3(lo.x, pc * lo.y - ps * lo.z, ps * lo.y + pc * lo.z) + pv;
    ld = vec3(ld.x, pc * ld.y - ps * ld.z, ps * ld.y + pc * ld.z);
    // (the kart's own box - wheels, driver and the tallest ears - is far tighter than the sphere round it)
    {
      vec3 inv = 1.0 / ld, b0 = (vec3(-0.78, 0.0, -0.98) - lo) * inv, b1 = (vec3(0.78, 1.48, 0.98) - lo) * inv;
      vec3 tn = min(b0, b1), tf = max(b0, b1);
      ts = max(ts, max(max(tn.x, tn.y), tn.z));
      te = min(te, min(min(tf.x, tf.y), tf.z));
      if (ts >= te) continue;
    }
    KtLook look = ktLook(i);
    float t = ts, hitM = 0.0;
    int phase = 0;                       // 0 marching; 1-4 the normal's samples
    vec3 hitQ = vec3(0.0), nacc = vec3(0.0);
    for (int s = 0; s < steps + 4; s++) {
      vec3 q = lo + ld * t;
      vec3 e = vec3(0.0);
      if (phase > 0) {
        int j = phase - 1;
        e = 0.5773 * (2.0 * vec3(float((j + 3) >> 1 & 1), float(j >> 1 & 1), float(j & 1)) - 1.0);
        q = hitQ + e * 0.004;
      } else {
        float shell = ktBox(q - vec3(0.0, 0.66, -0.02), vec3(0.78, 0.68, 1.0), 0.2);
        if (shell > 0.04) { t += shell; if (t > te) break; continue; }
      }
      vec2 m = ktKart(q, look);
      if (phase == 0) {
        // (as fine as a pixel at that distance needs)
        if (m.x < 0.002 + 0.0012 * t) { phase = 1; hitQ = q; hitM = m.y; continue; }
        t += m.x * 0.9;
        if (t > te) break;
      } else {
        nacc += e * m.x;
        phase++;
        if (phase == 5) {
          best = t; who = i; mat = hitM; lq = hitQ;
          // the normal back out of the pitch
          vec3 nl = normalize(nacc);
          ln = vec3(nl.x, pc * nl.y + ps * nl.z, -ps * nl.y + pc * nl.z);
          break;
        }
      }
    }
  }
  return best;
}

// a thing by the track, drawn as the 32-bit games drew them: a flat picture always facing the eye. Colour, and whether it is there
vec4 ktSprite(float kind, float h, float u, float v, float th) {
  vec4 c = vec4(0.0);
  float n = vnoise(vec2(u, v) * 3.0);
  if (kind > 3.5) {
    // a stack of tyres: three rows, the middle one painted
    if (abs(u) < 0.55 && v < 1.1) {
      float row = floor(v / 0.37), ry = fract(v / 0.37);
      vec3 t = vec3(0.07) * (0.7 + 0.6 * (1.0 - abs(ry - 0.5) * 2.0));
      if (row == 1.0 && th < 0.5) t = mix(t, vec3(0.9, 0.15, 0.1), 0.6);
      c = vec4(t, 1.0);
    }
    return c;
  }
  if (kind > 1.5) {
    // an arrow board on two legs: red, white chevrons pointing the way the bend goes
    float dir = kind > 2.5 ? 1.0 : -1.0;
    if (v < 0.4 && abs(abs(u) - 0.8) < 0.05) return vec4(0.3, 0.3, 0.32, 1.0);
    if (abs(u) < 1.2 && v > 0.35 && v < 1.4) {
      // (lit in turn, a step on every beat, as the bends' arrow lights run)
      float ch = fract((u * dir - abs(v - 0.875) * 0.9) / 0.6);
      float run = fract(floor((u * dir - abs(v - 0.875) * 0.9) / 0.6) / 4.0 - floor(uTime / uSpb) / 4.0);
      vec3 b = mix(vec3(0.85, 0.08, 0.06), vec3(1.0) * (1.0 + 1.2 * step(run, 0.2) * (0.5 + uKick)), step(0.55, ch));
      if (th > 1.5) b = mix(vec3(0.05), unblack(pal(0.6 + uSeed.w)) * 2.0, step(0.55, ch));
      if (abs(u) > 1.12 || v < 0.43 || v > 1.32) b = vec3(0.95);
      return vec4(b, 1.0);
    }
    return c;
  }
  float a = kind;    // the look's first tree, or its second
  if (th < 0.5) {
    if (a < 0.5) {
      // a round tree: a trunk, a ball of leaves lit from the side
      if (abs(u) < h * 0.035 && v < h * 0.5) return vec4(vec3(0.35, 0.22, 0.12) * (0.8 + 0.2 * n), 1.0);
      vec2 q = vec2(u, v - h * 0.62);
      float r = h * 0.32 * (0.92 + 0.12 * vnoise(vec2(atan(q.y, q.x) * 3.0, 1.0)));
      if (length(q) < r) return vec4(vec3(0.16, 0.48, 0.12) * (0.7 + 0.4 * smoothstep(-r, r, q.x * 0.6 + q.y)) * (0.85 + 0.25 * n), 1.0);
    } else {
      // a pine: tiers of green
      if (abs(u) < h * 0.03 && v < h * 0.2) return vec4(0.3, 0.2, 0.1, 1.0);
      float y = (v - h * 0.15) / (h * 0.85);
      float w = (1.0 - y) * h * 0.24 * (0.75 + 0.25 * fract(y * 4.0));
      if (y > 0.0 && y < 1.0 && abs(u) < w) return vec4(vec3(0.08, 0.36, 0.16) * (0.75 + 0.35 * smoothstep(-w, w, u)), 1.0);
    }
  } else if (th < 1.5) {
    if (a < 0.5) {
      // a palm: a leaning trunk, fronds drooping from the crown
      float lean = h * 0.06 * (v / h) * (v / h);
      if (abs(u - lean) < h * 0.03 && v < h * 0.92) return vec4(vec3(0.5, 0.36, 0.2) * (0.75 + 0.25 * step(0.5, fract(v * 2.5))), 1.0);
      vec2 q = vec2(u - h * 0.06, v - h * 0.92);
      float ang = atan(q.y, q.x), r = length(q);
      float fr = abs(fract(ang * 7.0 / 6.283) - 0.5);
      float droop = q.y + r * r / h * 1.2;
      if (r < h * 0.36 && fr < 0.22 * (1.0 - r / (h * 0.36)) + 0.05 && droop > -h * 0.15) return vec4(vec3(0.15, 0.5, 0.15) * (0.8 + 0.3 * n), 1.0);
    } else {
      // a cactus: a trunk and two arms
      float w = h * 0.06;
      bool on = abs(u) < w && v < h * 0.8;
      on = on || (abs(u - h * 0.16) < w * 0.8 && v > h * 0.35 && v < h * 0.62) || (abs(u + h * 0.15) < w * 0.8 && v > h * 0.45 && v < h * 0.7);
      on = on || (abs(v - h * 0.35) < w * 0.8 && u > 0.0 && u < h * 0.16) || (abs(v - h * 0.45) < w * 0.8 && u < 0.0 && u > -h * 0.15);
      if (on) return vec4(vec3(0.25, 0.5, 0.2) * (0.8 + 0.3 * step(0.5, fract(u * 6.0))), 1.0);
    }
  } else {
    if (a < 0.5) {
      // a lamp: a post, the light at its top
      if (abs(u) < 0.07 && v < h) return vec4(0.2, 0.2, 0.25, 1.0);
      if (abs(u) < 0.5 && abs(v - h) < 0.12) return vec4(vec3(1.0, 0.9, 0.6) * (2.0 + 1.5 * uKick), 1.0);
    } else {
      // a floodlight tower: a lattice mast, a bank of lamps at its top
      float top = h * 1.4;
      if (abs(u) < 0.12 + 0.05 * (1.0 - v / top) && v < top) return vec4(vec3(0.16, 0.16, 0.2) * (0.7 + 0.3 * step(0.5, fract(v * 3.0 + u * 4.0))), 1.0);
      vec2 lq = vec2(u, v - top - 0.5);
      if (abs(lq.x) < 1.0 && abs(lq.y) < 0.5) {
        vec2 cell = fract(lq * vec2(2.0, 2.0)) - 0.5;
        return vec4(mix(vec3(0.1), vec3(1.0, 0.97, 0.85) * (2.2 + 1.6 * uKick), 1.0 - smoothstep(0.25, 0.35, length(cell))), 1.0);
      }
    }
  }
  return c;
}

// the item cubes: turning, see-through, every face its own colour
vec4 ktCubes(vec3 ro, vec3 rd, float tMax) {
  vec4 out4 = vec4(0.0, 0.0, 0.0, tMax);
  int n = int(uKtN[0].z);
  for (int i = 0; i < n; i++) {
    vec4 c = uKtCube[i];
    if (c.w < 0.05) continue;
    vec3 oc = ro - c.xyz;
    float bb = dot(oc, rd);
    if (bb * bb - dot(oc, oc) + 0.5 * c.w < 0.0 || bb > 0.0) continue;
    float a = uTime * 1.6 + float(i) * 0.7;
    mat3 m = mat3(cos(a), 0.0, sin(a), 0.0, 1.0, 0.0, -sin(a), 0.0, cos(a)) * mat3(1.0, 0.0, 0.0, 0.0, 0.83, 0.56, 0.0, -0.56, 0.83);
    vec3 o = (ro - c.xyz) * m, d = rd * m;
    float hs = 0.4 * c.w * (1.0 + 0.15 * uKick);
    vec3 inv = 1.0 / d, t0 = (-hs - o) * inv, t1 = (hs - o) * inv;
    vec3 tn = min(t0, t1), tf = max(t0, t1);
    float tin = max(max(tn.x, tn.y), tn.z), tout = min(min(tf.x, tf.y), tf.z);
    if (tin > tout || tin < 0.0 || tin > out4.w) continue;
    vec3 q = (o + d * tin) / hs;
    vec3 aq = abs(q);
    float edge = smoothstep(0.82, 0.95, aq.x + aq.y + aq.z - max(aq.x, max(aq.y, aq.z)));
    vec3 nn = step(vec3(max(aq.x, max(aq.y, aq.z))) - 1e-3, aq) * sign(q);
    vec3 col = ktHue(fract(dot(nn, vec3(0.17, 0.41, 0.67)) + uTime * 0.25)) * 1.1;
    // a star on each face
    vec2 fq = q.xy;
    if (nn.x != 0.0) fq = q.yz;
    else if (nn.y != 0.0) fq = q.xz;
    float star = 1.0 - smoothstep(0.08, 0.14, min(abs(fq.x), abs(fq.y)) + length(fq) * 0.25);
    col = mix(col, vec3(1.0), max(edge, star * 0.8));
    out4 = vec4(col * (0.8 + 0.4 * uHat), tin);
  }
  return out4;
}

// the items in flight: bombs and rockets
vec4 ktShots(vec3 ro, vec3 rd, float tMax) {
  vec4 out4 = vec4(0.0, 0.0, 0.0, tMax);
  int n = int(uKtN[0].w);
  for (int i = 0; i < n; i++) {
    vec4 s = uKtShot[i];
    if (s.w < 0.5) continue;
    vec3 oc = ro - s.xyz;
    float b = dot(oc, rd), h = b * b - dot(oc, oc) + 0.6 * 0.6;
    if (h <= 0.0) continue;
    float t = max(-b - sqrt(h), 0.0), te = -b + sqrt(h);
    vec3 dir = vec3(uKtShot[4 + i].x, 0.0, uKtShot[4 + i].y);
    int steps = int(uKtN[2].z);
    for (int k = 0; k < steps; k++) {
      vec3 q = ro + rd * t - s.xyz;
      float d = s.w < 1.5 ? length(q) - 0.28 : ktCap(q, -dir * 0.38, dir * 0.38, 0.13);
      if (d < 0.003) {
        if (t < out4.w) {
          vec3 n = normalize(q);
          vec3 base = vec3(0.08, 0.08, 0.14);
          if (s.w > 1.5) { n = normalize(q - dir * clamp(dot(q, dir), -0.38, 0.38)); base = mix(vec3(0.9, 0.12, 0.1), vec3(0.95), step(0.25, dot(q, dir))); }
          float l = 0.4 + 0.6 * max(dot(n, normalize(vec3(0.3, 1.0, 0.2))), 0.0);
          vec3 col = base * l + vec3(1.0) * pow(max(dot(reflect(rd, n), normalize(vec3(0.3, 1.0, 0.2))), 0.0), 30.0) * 0.8;
          out4 = vec4(col, t);
        }
        break;
      }
      t += d;
      if (t > te) break;
    }
  }
  return out4;
}

vec3 render(vec2 p, vec2 uv) {
  float th = uKtCourse.y, shot = uKtCourse.w;
  // the kick punches the view in, a blast or a landing near the player shakes it, the snare leans it one way then
  // the other; the HUD stays put
  vec2 hudP = p;
  float sk = uKtBeat.y;
  p *= 1.0 - 0.035 * uKick;
  p += sk * 0.012 * vec2(sin(uTime * 73.0), cos(uTime * 61.0));
  p = rot(0.012 * uSnare * (mod(floor(uTime / uSpb), 2.0) * 2.0 - 1.0)) * p;
  vec3 ro = uKtCam[0].xyz;
  float focal = uKtCam[0].w;
  vec3 F = uKtCam[1].xyz, R = uKtCam[2].xyz, U = uKtCam[3].xyz;
  vec3 rd = normalize(F * focal + R * p.x + U * p.y);
  vec3 L = ktSun(th), haze = ktHaze(th);
  float tBest = 1e9, shine = 0.0;
  vec3 col = vec3(0.0);
  float dg = 0.0, along = 0.0;
  if (rd.y < 0.0) {
    float tg = -ro.y / rd.y;
    vec3 wq = vec3(0.0);
    float tw = 1e9;
    {
      // where the ray comes down: on the track's own stretch, inside its barriers, it met none; past them, or across
      // the infield to another part of the course, it looks at the pieces between
      vec3 g = ro + rd * min(tg, 900.0);
      dg = ktTrack(g.xz, along);
      float segLen = uKtCourse.x / 72.0;
      float ie = uKtMap.w, ig = along / segLen;
      float fwd = mod(ig - ie + 72.0, 72.0), back = 72.0 - fwd;
      float lo = fwd <= back ? ie : ig, span = min(fwd, back);
      float chord = length(g.xz - ro.xz);
      // (come down past a barrier on the track's own stretch: only that side's barrier can be in the way)
      bool across = span * segLen > chord * 1.08 + 4.0;
      if (abs(dg) > KWALL - 0.05 || across) {
        int sOne = dg > 0.0 ? 1 : -1;
        tw = ktWalls(ro, rd, tg, int(mod(floor(lo) - 3.0, 72.0)), int(min(span, 60.0)) + 8, across ? -1 : sOne, across ? 1 : sOne, wq);
      }
    }
    if (tw < tg) {
      tBest = tw;
      col = ktWallFace(wq, th) * (0.7 + 0.3 * wq.y / KWH);
      if (th > 1.5) shine = smoothstep(KWH - 0.12, KWH - 0.02, wq.y);
    } else if (tg < 600.0) {
      tBest = tg;
      col = ktGround(ro + rd * tg, dg, along, th, shine);
      if (th > 1.5) col *= 0.8;
    }
  }
  // the ramps: a wedge across the track in yellow and black, its arrows stepping on the beat, its lip lit on the kick
  int nRamps = int(uKtN[1].y);
  for (int i = 0; i < nRamps; i++) {
    vec4 rp = uKtRamp[i];
    if (rp.w < 0.5) continue;
    vec2 f2 = vec2(cos(rp.z), sin(rp.z)), r2 = vec2(-sin(rp.z), cos(rp.z));
    vec2 o2 = ro.xz - rp.xy;
    vec3 o = vec3(dot(o2, r2), ro.y, dot(o2, f2)), d = vec3(dot(rd.xz, r2), rd.y, dot(rd.xz, f2));
    float sl = 0.5 / 2.6;
    float tt = (sl * o.z - o.y) / (d.y - sl * d.z);
    vec3 q = o + d * tt;
    if (tt > 0.0 && tt < tBest && q.z > 0.0 && q.z < 2.6 && abs(q.x) < KHALF - 0.2) {
      tBest = tt;
      float chev = fract(q.z * 0.8 - abs(q.x) * 0.5 - floor(uTime / uSpb) * 0.5);
      col = mix(vec3(0.08), vec3(1.0, 0.8, 0.1), step(0.5, chev)) * (0.8 + 0.3 * uKick);
      col += vec3(1.0, 0.9, 0.6) * smoothstep(2.4, 2.6, q.z) * (0.8 + 1.2 * uKick);
      shine = 0.5;
    }
    float tb = (2.6 - o.z) / d.z;
    vec3 qb = o + d * tb;
    if (tb > 0.0 && tb < tBest && qb.y > 0.0 && qb.y < 0.5 && abs(qb.x) < KHALF - 0.2) {
      tBest = tb;
      col = vec3(0.12, 0.1, 0.08) + vec3(1.0, 0.5, 0.1) * step(0.42, qb.y) * (0.6 + uKick);
    }
  }
  // what stands by the track: the two nearest pictures the ray passes through are looked at, nearest first
  {
    vec2 n = normalize(-F.xz);
    vec2 side = vec2(-n.y, n.x);
    float den = dot(rd.xz, n);
    vec4 c1 = vec4(1e9, 0.0, 0.0, -1.0), c2 = vec4(1e9, 0.0, 0.0, -1.0);    // t, u, v, which
    if (den < -1e-4) {
      int nProps = int(uKtN[0].x);
      for (int i = 0; i < nProps; i++) {
        vec4 q = uKtProp[i];
        float t = dot(q.xy - ro.xz, n) / den;
        vec3 hp = ro + rd * t;
        float u = dot(hp.xz - q.xy, side);
        // (each by its own shape's bounds: a tree's crown, a board, a tyre stack, a floodlight's mast and lamps)
        vec2 bnd = vec2(q.w * 0.42 + 0.2, q.w * 1.02 + 0.2);
        if (q.z > 1.5) bnd = q.z > 3.5 ? vec2(0.6, 1.15) : vec2(1.25, 1.45);
        else if (th > 1.5) bnd = q.z < 0.5 ? vec2(0.55, q.w + 0.15) : vec2(1.05, q.w * 1.4 + 1.05);
        bool in_ = q.w > 0.0 && t > 0.0 && t < tBest && abs(u) < bnd.x && hp.y > 0.0 && hp.y < bnd.y;
        if (in_ && t < c1.x) { c2 = c1; c1 = vec4(t, u, hp.y, float(i)); }
        else if (in_ && t < c2.x) c2 = vec4(t, u, hp.y, float(i));
      }
    }
    int nc = c2.w >= 0.0 ? 2 : (c1.w >= 0.0 ? 1 : 0);
    for (int k = 0; k < nc; k++) {
      vec4 c = c1;
      if (k == 1) c = c2;
      if (c.w < 0.0) break;
      vec4 q = uKtProp[int(c.w)];
      vec4 sp = ktSprite(q.z, q.w, c.y, c.z, th);
      if (sp.a > 0.5) { tBest = c.x; col = sp.rgb; shine = th > 1.5 && q.z < 0.5 ? 0.6 : 0.0; break; }
    }
  }
  // (the sky only where nothing else was met: drawn everywhere, it cost a third of the scene)
  if (tBest < 1e8) col = mix(col, haze, (1.0 - exp(-tBest * 0.007)) * (1.0 - shine * 0.7));
  else col = ktSky(rd, th);
  // the karts
  int who;
  float mat;
  vec3 lq;
  vec3 ln;
  float tk = ktMarch(ro, rd, tBest, who, mat, lq, ln);
  if (who >= 0) {
    tBest = tk;
    vec4 k = uKtK0[who];
    float sp = uKtK1[who].w;
    vec3 nw = normalize(vec3(-sin(k.w), 0.0, cos(k.w)) * ln.x + vec3(0.0, 1.0, 0.0) * ln.y + vec3(cos(k.w), 0.0, sin(k.w)) * ln.z);
    vec3 base;
    float gloss = 0.1;
    if (mat < 1.5) { base = ktColour(float(who)); gloss = 0.7; }
    else if (mat < 2.5) {
      // the tyres: tread turning with the road, a hub in the kart's colour
      bool front = lq.z > 0.0;
      vec2 ax = mix(vec2(0.27, -0.55), vec2(0.2, 0.58), float(front));
      vec2 w = vec2(lq.y - ax.x, lq.z - ax.y);
      float ang = atan(w.y, w.x) + uKtK1[who].x * (front ? 1.35 : 1.0);
      base = vec3(0.07) * (0.7 + 0.5 * step(0.5, fract(ang * 14.0 / 6.283)));
      if (length(w) < (front ? 0.09 : 0.12) && abs(lq.x) > (front ? 0.6 : 0.68)) { base = ktColour(float(who)) * 0.8 + 0.2; gloss = 0.6; }
    }
    else if (mat < 3.5) { base = vec3(0.72, 0.74, 0.78); gloss = 0.9; }
    else if (mat < 4.5) base = vec3(0.1, 0.1, 0.12);
    else if (mat < 5.5) base = ktFur(sp, 0.0);
    else if (mat < 6.5) base = ktFur(sp, 1.0);
    else if (mat < 7.5) base = mix(ktColour(float(who)), vec3(1.0), 0.45);
    else if (mat < 8.5) base = vec3(0.03);
    else base = vec3(0.95);
    float dif = max(dot(nw, L), 0.0), amb = 0.42 + 0.22 * nw.y;
    if (th > 1.5) amb = 0.3 + 0.2 * nw.y;
    float spec = pow(max(dot(reflect(rd, nw), L), 0.0), 24.0) * gloss;
    float rim = pow(1.0 - max(dot(nw, -rd), 0.0), 3.0);
    col = base * (amb + 0.85 * dif) + vec3(1.0) * spec + haze * rim * 0.35;
    if (th > 1.5) col += unblack(pal(0.6 + uSeed.w)) * rim * 0.5;
    // hit: a flash as it spins
    col += vec3(1.0, 0.85, 0.4) * uKtK2[who].y * 0.35 * step(0.5, fract(uTime * 14.0));
    col = mix(col, haze, 1.0 - exp(-tk * 0.007));
  }
  // the item cubes and the items in flight
  vec4 cb = ktCubes(ro, rd, tBest);
  if (cb.w < tBest) { col = mix(col, cb.rgb, 0.8); tBest = cb.w; }
  vec4 sh = ktShots(ro, rd, tBest);
  if (sh.w < tBest) { col = sh.rgb; tBest = sh.w; }
  // flames from the exhausts of a kart on boost, and behind a rocket
  int nFlames = int(uKtN[1].z);
  for (int i = 0; i < nFlames; i++) {
    float bo = uKtK1[i].z;
    if (bo < 0.02) continue;
    vec4 k = uKtK0[i];
    vec3 f = vec3(cos(k.w), 0.0, sin(k.w)), rr = vec3(-sin(k.w), 0.0, cos(k.w));
    float len = (0.35 + 0.6 * bo) * (0.8 + 0.4 * hash11(floor(uTime * 30.0) + float(i))) * (1.0 + 0.5 * uKick);
    for (int s = -1; s <= 1; s += 2) {
      vec3 a = k.xyz + rr * (0.17 * float(s)) + vec3(0.0, 0.48, 0.0) - f * 0.9;
      vec3 b = a - f * len;
      // the ray's nearest approach to the flame's axis
      vec3 ba = b - a, oa = ro - a;
      float d1 = dot(rd, ba), d2 = dot(ba, ba), d3 = dot(rd, oa), d4 = dot(ba, oa);
      float den = d2 - d1 * d1;
      float hh = clamp((d4 - d1 * d3) / max(den, 1e-6), 0.0, 1.0);
      float tt = max(dot(a + ba * hh - ro, rd), 0.0);
      if (tt > tBest + 0.3) continue;
      float dist = length(ro + rd * tt - (a + ba * hh));
      float r = mix(0.11, 0.02, hh) * (0.7 + 0.5 * bo);
      float g = exp(-dist * dist / (r * r)) * bo;
      col += mix(vec3(0.7, 0.85, 1.0), vec3(1.0, 0.45, 0.1), hh) * g * 2.2;
    }
  }
  // sparks, smoke, blasts and glitter, at their depth (placed on the screen by the simulation)
  float zHit = tBest * dot(rd, F);
  int nParts = int(uKtN[0].y);
  for (int i = 0; i < nParts; i++) {
    vec4 q = uKtPart[i];
    if (q.w < 0.5) continue;
    if (q.z > zHit + 0.5) continue;
    float d = length(p - q.xy) * q.z / focal;    // in metres, at its depth
    if (d > 2.2) continue;
    float kind = floor(q.w), age = fract(q.w) / 0.9;
    if (kind < 1.5) col += vec3(0.4, 0.75, 1.0) * exp(-d * d / 0.0025) * (1.0 - age) * 2.0;
    else if (kind < 2.5) col += vec3(1.0, 0.6, 0.15) * exp(-d * d / 0.003) * (1.0 - age) * 2.2;
    else if (kind < 3.5) col = mix(col, vec3(0.75, 0.75, 0.78), exp(-d * d / (0.04 + age * 0.25)) * (1.0 - age) * 0.6);
    else if (kind < 4.5) {
      float r = 0.4 + age * 1.6;
      col += mix(vec3(1.0, 0.95, 0.7), vec3(1.0, 0.35, 0.05), age) * exp(-d * d / (r * r)) * (1.0 - age) * 2.5;
    }
    else col += ktHue(fract(q.w * 3.7)) * exp(-d * d / 0.004) * (1.0 - age) * 2.0;
  }
  // the photo: the frozen moment, in sepia, the line marked, a flash as it is taken
  float since = uKtHud.w, hold = max(uSpb, 0.45);
  if (shot > 1.5 && shot < 2.5) {
    float lum = dot(col, vec3(0.3, 0.55, 0.15));
    col = vec3(lum) * vec3(1.08, 0.95, 0.78);
    vec3 v = vec3(uKtMap.y, 0.5, uKtMap.z) - ro;
    float sx = dot(v, R) / max(dot(v, F), 0.1) * focal;
    col = mix(col, vec3(0.9, 0.1, 0.08), 1.0 - smoothstep(0.002, 0.004, abs(p.x - sx)));
    col += vec3(1.0) * exp(-since * 40.0) * 1.2;
    col *= 1.0 - 0.5 * smoothstep(0.35, 0.95, length(p * vec2(0.6, 1.0)));
    col = ktHudText(hudP, col);
    return col;
  }
  // a blast or a landing by the player: a warm flash
  col += vec3(1.0, 0.8, 0.5) * min(sk, 1.0) * 0.1;
  // fireworks over the course after a win: a burst every other beat for four of them
  if (tBest > 1e8 && uKtHud2.x > 0.5 && uKtHud2.x < 1.5 && since > hold && since < hold + 9.0 * uSpb) {
    for (int k = 0; k < 4; k++) {
      float a = since - hold - float(k) * 2.0 * uSpb;
      if (a < 0.0 || a > 1.4) continue;
      vec2 c = vec2(hash11(float(k) + uSeed.x * 9.0) * 1.2 - 0.6, 0.18 + 0.22 * hash11(float(k) * 3.1 + 2.0));
      vec2 dq = p - c;
      float r = length(dq), ray = pow(abs(cos(atan(dq.y, dq.x) * 8.0)), 24.0);
      col += ktHue(hash11(float(k) * 7.0 + uSeed.y)) * exp(-abs(r - a * 0.3) * 70.0) * (0.35 + ray) * (1.0 - a / 1.4) * 1.8;
    }
  }
  // the boost: speed lines rushing out from the middle; a touch of them on every kick
  float bo = max(uKtHud2.y, 0.35 * uKick);
  if (bo > 0.01 && shot < 0.5) {
    float a = atan(p.y, p.x), r = length(p);
    float line = step(0.9, hash11(floor(a * 70.0))) * smoothstep(0.3, 0.85, r) * step(0.4, fract(r * 3.0 - uTime * 6.0 + hash11(floor(a * 70.0)) * 5.0));
    col += vec3(1.0) * line * 0.35 * bo;
  }
  // ---- the HUD: the place, the lap, the time, the order, the map (not punched or shaken)
  p = hudP;
  if (shot < 0.5 || shot > 2.5) {
    // the order, down the left
    if (abs(p.x + 0.84) < 0.03 && p.y < 0.4 && p.y > 0.0) for (int i = 0; i < 8; i++) {
      float id = uKtRank[i / 4][i % 4];
      vec2 bq = p - vec2(-0.84, 0.36 - float(i) * 0.045);
      float box = max(abs(bq.x), abs(bq.y)) - 0.016;
      if (box < 0.006) col = vec3(step(id, 0.5) * (0.95 + 0.8 * uKick) + 0.05);
      if (box < 0.0) col = ktColour(id);
    }
    // the map, bottom right: the course, every kart a dot
    vec2 mq = p - vec2(0.7, -0.3);
    if (abs(mq.x) < 0.17 && abs(mq.y) < 0.17) {
      vec2 w = uKtHud2.zw + vec2(mq.x, -mq.y) / 0.16 * uKtMap.x;
      float dm = 1e9;
      // (the loop's own count keeps it to the map: the software renderer runs an if's inside everywhere, a loop only as long as a pixel needs it)
      int nm = abs(mq.x) < 0.17 && abs(mq.y) < 0.17 ? 72 : 0;
      for (int i = 0; i < nm; i++) {
        vec4 a = uKtSeg[i], b = uKtSeg[i == 71 ? 0 : i + 1];
        dm = min(dm, sdSeg(w, a.xy, b.xy));
      }
      float px = uKtMap.x / 0.16;
      col = mix(col, vec3(0.0, 0.0, 0.05), 0.35 * (1.0 - smoothstep(0.0, 0.012 * px, dm - 0.004 * px)));
      col = mix(col, vec3(1.0), 1.0 - smoothstep(0.003 * px, 0.006 * px, dm));
      for (int i = 7; i >= 0; i--) {
        vec2 kq = (uKtK0[i].xz - uKtHud2.zw) / uKtMap.x * 0.16;
        float r = length(mq - vec2(kq.x, -kq.y));
        float rr = i == 0 ? 0.013 : 0.009;
        if (r < rr + 0.003) col = vec3(0.05);
        if (r < rr) { col = ktColour(float(i)); if (i == 0) col = vec3(1.0); }
      }
    }
    // the words: the place, the lap, the time, FINAL LAP, how the last race went
    col = ktHudText(p, col);
  }
  return col;
}
`;

const SOURCES = {
  plasma, tunnel, metaballs, starfield, copper, fractal,
  shadebobs, vectorballs, dottunnel, fireworks, fire, kefrens, ball, rings, scanner, footsteps, twister, bobs, dualchess, chessfloor, rubber, bumplogo, cracktro, ansi, echolines, maze3d, moonbike, timecar, animeop, pipes, ripple, outrun, morph, prism, sculpture, fractalflight, coderain, gimbal, djdecks,
  paddles: staged(paddles, 0.55, 0.45),
  invaders: staged(invaders, 0.6, 0.35),
  rocks: staged(rocks, 0.45, 0.5),
  crossing: staged(crossing, 0.55, 0.4),
  tube: staged(tube, 0.4, 0.45),
  tanks: staged(tanks, 0.35, 0.45),
  football: staged(football, 0.6, 0.4),
  artillery: staged(artillery, 0.2, 0.2),
  skyrush: staged(skyrush, 0.4, 0.4),
  skatepark: staged(skatepark, 0.35, 0.45),
  karts: staged(karts, 0.3, 0.4),
  maze: staged(maze, 0.7, 0.4),
  bricks: staged(bricks, 0.6, 0.35),
  lightcycles: staged(lightcycles, 0.95, 0.6),
  snake: staged(snake, 0.75, 0.45),
  pyramid: staged(pyramid, 0.6, 0.4),
  lcd: staged(lcd, 0.55, 0.45, true),
  boxer: staged(boxer, 0.45, 0.4),
  starfighter: staged(starfighter, 0.4, 0.4),
  cascade: staged(cascade, 0.45, 0.4),
  about,
};

/** Post-pass effects a scene asks for: the game scenes get the beat blur. */
export const STYLE_FX = Object.fromEntries(
  ['paddles', 'invaders', 'rocks', 'crossing', 'tube', 'tanks', 'football', 'skatepark', 'karts', 'artillery', 'skyrush', 'maze', 'bricks', 'lightcycles', 'snake', 'boxer', 'starfighter', 'pipes', 'pyramid', 'lcd', 'bobs', 'rubber', 'bumplogo', 'cascade', 'ansi', 'echolines', 'maze3d', 'moonbike', 'timecar', 'scanner', 'animeop', 'djdecks',
   'prism', 'sculpture', 'fractalflight', 'gimbal']
    .map((n) => [n, { impact: 1 }]),
);
// the card cascade's trails are one-pixel edges: the era's full glow would fill them in
STYLE_FX.cascade.glow = 0.25;
// the code rain: no punch (it shook the fine glyphs) and no tear along the tape's bottom (it broke the rain there)
STYLE_FX.coderain = { tear: 0 };

export const STYLE_INFO = {
  plasma:    'Palette-cycling sine plasma with raster bars',
  tunnel:    'Texture-mapped twisting tunnel with beat zoom',
  metaballs: 'Iso-banded metaball goo',
  starfield: 'Warp starfield with a drilled glenz solid',
  copper:    'Copper bars glowing over an endless checkerboard',
  fractal:   'Orbiting Julia set with orbit-trap colouring',
  shadebobs:   'Glowing bob trails that wrap round the palette',
  vectorballs: 'Shaded spheres in 3D, morphing shape every two bars',
  dottunnel:   'Rings of dots rushing down a snaking tunnel',
  fireworks:   'A burst on every backbeat, streaks falling to earth',
  fire:        'The classic 256-colour fire: flames leap on the kick, sparks on the snare, an emblem burns at the peak',
  kefrens:     'Kefrens bars: a wall of shaded bars weaving like a ribbon, wider on the bass',
  ball:        'The bouncing checkered ball: red and white, spinning, landing on every beat',
  rings:       'Interference rings: two sets of rings drifting through each other in a moving moire',
  lcd:         'An LCD juggler in black segments: balls hop along their arcs and land on the beat',
  scanner:     'A black wedge down a desert highway at dusk, a real car on its springs: the red scanner sweeps on the beat, the boost clears a barrier and lands on the music, the dash talks with the melody',
  footsteps:   'Two cups of water on a dashboard, trembling into rings with every footstep',
  twister:     'The twister: a textured bar twisting up the screen, winding up as the music builds',
  bobs:        'Unlimited bobs: a chain of balls sliding behind its head, and a twin the other way, weaving as they cross, surging on the kick',
  dualchess:   'The dual chessboard: layers sliding past each other, then turning against each other, zooming on the beat',
  chessfloor:  'The chessboard floor: a board waving in 3D, rippling where the red cube lands, the cube mirrored in it',
  rubber:      'The rubber vector: a cube that wobbles like jelly, the jolt of each kick running down it',
  bumplogo:    'The bump-mapped logo: an emblem embossed in stone, coloured lights circling it, flaring on the snare',
  cracktro:    'The crack intro: flying through stars steered by the music, warping forward or sideways as each phrase ends',
  cascade:     'The card cascade, on a floating table: a card leaving the piles each bar, bouncing in a trail of copies that keeps every kick in colour',
  ansi:        'The ANSI board: the art of a bulletin board arriving a line a beat, the camera easing in and out, the block-letter logo landing on the drop',
  echolines:   'The bouncing lines screensaver: two figures trailing echoes, flying faster as the music builds, stretched by the kick, recoloured by the snare',
  maze3d:      'The 3D maze screensaver: brick corridors walked a move every two beats, a footfall on the kick, the world turned over on the drop',
  moonbike:    'The moon bike: a bicycle riding in and across a huge moon in silhouette, away for two bars and back, the camera following in parallax',
  timecar:     'The time car: a lap and a charge to 88 on the next big moment, the burst, the fire between the onlookers, the plate spinning like a coin',
  animeop:     'The anime opening: a cut on every bar, poses struck on the beat, speed lines bursting on the kick, the title slamming in on the drop',
  pyramid:     'The cube pyramid, played: hop on the beat, dodge the red balls, lure the snake off a disc',
  pipes:       'The 3D pipes screensaver: shiny pipes filling the screen from the distance forwards, elbows on the eighths',
  ripple:      'Drops on the beat rippling across a pool floor',
  outrun:      'Synthwave sunset: striped sun, neon grid, mountains',
  morph:       'Raymarched solid melting between shapes on the bar',
  prism:       'Shader art: a lattice of light pushed out by a wave, each colour a moment behind, a star where they meet',
  sculpture:   'Shader art: a ball travelling through an arch and a ring, melting into them as it passes, under soft shadows',
  fractalflight: 'Shader art: a slow flight round the mandelbox, its shape shifting slowly, the glow lit by the kick and each phrase',
  coderain:    'Code rain: green glyphs falling in sheets of depth, and out of the rain each phrase a face in dark glasses, the seed, SEEDSCENE',
  gimbal:      'The 64k gimbal: nested rings turning a quarter on the beat round a glowing core, in a hall of bands, haze and light',
  djdecks:     'The DJ decks: two turntables and a mixer, the live deck changing each phrase, the crossfader sliding, a scratch at the end; round them a club night of beams in the smoke, lasers and flares',
  paddles:     'Neon paddles on the beat; on an accent a paddle misses and blows up',
  invaders:    'A seed-made formation on the beat; aliens burst on the kick',
  rocks:       'A vector ship that flies, dodges and splits the rocks it hits',
  skatepark:   'A skater on a half-pipe in a warehouse, moved by gravity and its own pumping, the camera chasing behind it: an air at every lip, a grind along the coping through the build, a huge air on the drop, the combo counter',
  karts:       'A kart race of eight animal drivers round a new course each race, the camera behind the player: items thrown on the snare burst on the next beat, a boost off a pad through the build, the leaders nose to nose on the drop and the photo-finish camera',
  skyrush:     'A jetpack flyer free over a checkered plain, running a stride to the beat, seen from another side wherever he goes; the horizon rises with him, foes fly set ways and fire where he was, low things trip him and a serpent of orbs closes each stage, bursting on the drop',
  artillery:   'Two teams of beetles on an island: missiles, grenades and bounces in real physics, each blast solved to land on the snare, the camera zooming and following every shot',
  football:    'Football seen from above, the camera on the ball: a pass on every beat, a run down the wing through the build, the header in on the drop, the crowd going up',
  tanks:       'A battlefield of solid, lit shapes through a tank\'s sight: an enemy closing in round what stands in its way, the shot held until it is near, fired on the backbeat, the fireball on the next beat',
  tube:        'A claw on the rim of a tube of light filling the screen, things climbing its lanes on the beat, the shots on the backbeat, its outline rippling out into the stars, a dive down the tube on the drop',
  crossing:    'A hopper crossing traffic and a river of logs to the bays of the far bank, a hop and a step of the traffic on every beat',
  maze:        'A chomper hunting dots round a neon maze, three wisps on the chase',
  bricks:      'A neon brick wall broken on the rhythm by a ball that goes anywhere',
  lightcycles: 'Light cycles on the beat: touch a wall of light and blow up on the downbeat',
  snake:       'A neon snake that hunts, grows, and crashes on the beat',
  boxer:       'A robot title fight on the beat: moves, showboats, a knockdown and a count',
  starfighter: 'An on-rails space run in flat polygons: drones from the horizon, lock on, fire, dodge their shots',
};

// The scenes you can pick. 'about' is reserved for the About part (key A).
export const STYLE_NAMES = Object.keys(STYLE_INFO);

export function styleSource(name) {
  const src = SOURCES[name];
  if (!src) throw new Error(`Unknown style "${name}". Available: ${STYLE_NAMES.join(', ')}`);
  return COMMON + src;
}
