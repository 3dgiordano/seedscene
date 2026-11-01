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
uniform int uPalMode;          // 0 none, 1 C64, 2 levels per channel, 3 handheld greens, 4 EGA, 5 green mono, 6 grey, 7 phone LCD
uniform float uLevels, uDither;
uniform int uDisplay;          // 0 CRT, 1 LCD, 2 TV, 3 clean, 4 modern, 5 videotape
uniform float uBloom, uScan, uBarrel, uAberr, uGrain, uVignette;
uniform float uFade;           // 0..1, a fade to black between parts
uniform float uImpact;         // 0 for most scenes; 1 gives a zoom blur on the kick

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

void main() {
  vec2 c = vUv - 0.5;
  vec2 uv = vUv + c * dot(c, c) * uBarrel;          // tube curvature

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
    float hs = smoothstep(0.03, 0.0, uv.y);
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

  if (uBloom > 0.0) {
    vec3 bloom = vec3(0.0);
    float rad = 0.005 + 0.012 * uEnergy;
    for (int i = 0; i < 12; i++) {
      float a = float(i) * 0.5236;
      bloom += texture(uSceneSoft, uv + vec2(cos(a), sin(a)) * rad).rgb;
      bloom += texture(uSceneSoft, uv + vec2(cos(a), sin(a)) * rad * 0.45).rgb;
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
// The talking car of 80s television, as an idea: a black car coming down a
// night road straight at us, the red light in its nose sweeping left and right
// - one pass on every beat, a trail fading behind it. The road rushes faster
// as the music builds; the headlights glow brighter on the kick.

// the scanner: eight red lights, lit where the sweep is, fading where it has been
float scanAt(float x, float beats) {
  float seg = (floor(clamp(x, 0.0, 0.9999) * 8.0) + 0.5) / 8.0;
  float ph = mod(beats, 2.0);                    // 0..1 going right, 1..2 coming back
  float a1 = mod(ph - seg, 2.0);                 // time since it passed going right
  float a2 = mod(ph - (2.0 - seg), 2.0);         // ... and coming back
  return exp(-min(a1, a2) * 7.0);
}

vec3 render(vec2 p, vec2 uv) {
  float t = uTime;
  float beats = uTime / uSpb;
  float horizon = 0.06;
  vec3 col;

  // the night: a violet sky, a few stars, hills on the horizon
  float hill = horizon + 0.03 + 0.025 * sin(p.x * 4.0 + uSeed.x * 6.0) + 0.015 * sin(p.x * 11.0);
  if (p.y > horizon) {
    col = mix(vec3(0.16, 0.06, 0.24), vec3(0.02, 0.02, 0.08), clamp((p.y - horizon) * 2.2, 0.0, 1.0));
    vec2 g = p * 40.0;
    if (hash12(floor(g)) > 0.96) col += vec3(0.8) * smoothstep(0.3, 0.0, length(fract(g) - 0.5));
    if (p.y < hill) col = vec3(0.03, 0.02, 0.06);
  } else {
    // the road, rushing at us and narrowing to the horizon: faster as the music builds
    float z = 0.35 / (horizon - p.y + 0.002);
    float x = p.x * z;
    float run = t * (6.0 + 6.0 * uEnergy);
    float fw = fwidth(x);
    col = vec3(0.06, 0.06, 0.08);
    if (abs(x) > 0.62) col = vec3(0.02, 0.03, 0.02);                         // the verge
    col = mix(col, vec3(0.8), (1.0 - smoothstep(0.0, 1.5 * fw, abs(abs(x) - 0.55))) * 0.85);
    float dash = step(fract(z * 0.5 - run * 0.1), 0.5);
    col = mix(col, vec3(0.9, 0.78, 0.3), (1.0 - smoothstep(0.0, 1.5 * fw, abs(x) - 0.012)) * dash);
    col *= clamp(1.4 - z * 0.06, 0.25, 1.0);
  }

  // the car, head on and close: long and low, a wedge of a nose, a raked windscreen
  vec2 c = (p - vec2(0.0, -0.3 + 0.006 * uBass)) / 1.15;
  // a trapezium between heights y0 and y1, half-widths w0 at the bottom and w1 at the top
  #define TRAP(q, y0, y1, w0, w1) max(max(y0 - q.y, q.y - y1), abs(q.x) - mix(w0, w1, clamp((q.y - y0) / (y1 - y0), 0.0, 1.0)))
  float lower = TRAP(c, -0.1, 0.02, 0.43, 0.41);
  float bonnet = TRAP(c, 0.02, 0.07, 0.41, 0.33);
  float cabin = TRAP(c, 0.07, 0.17, 0.27, 0.17);
  float tyres = min(max(abs(c.x + 0.33) - 0.06, abs(c.y + 0.125) - 0.035), max(abs(c.x - 0.33) - 0.06, abs(c.y + 0.125) - 0.035));
  float car = min(min(lower, bonnet), min(cabin, tyres));
  if (car < 0.0) {
    col = vec3(0.025, 0.025, 0.035);
    // the bonnet's slope catches the sky
    if (bonnet < 0.0) col += vec3(0.06, 0.06, 0.12) * (c.y - 0.02) / 0.05;
    // the windscreen, with a streak of reflection sliding across it
    if (cabin < 0.0) {
      col = vec3(0.06, 0.04, 0.14) + vec3(0.25, 0.2, 0.45) * smoothstep(0.025, 0.0, abs(c.x + (c.y - 0.07) * 1.6 - 0.1 + 0.25 * sin(t * 0.4)));
    }
  }
  // the edges catch the light
  float shell = min(min(lower, bonnet), cabin);
  col += vec3(0.25, 0.3, 0.6) * smoothstep(0.006, 0.0, abs(shell)) * 0.7;

  // slim headlamps at the corners, brighter on the kick
  for (int k = 0; k < 2; k++) {
    vec2 hp = c - vec2(k == 0 ? -0.34 : 0.34, 0.035);
    float hd = length(max(abs(hp) - vec2(0.045, 0.006), 0.0));
    col += vec3(1.0, 0.95, 0.8) * (smoothstep(0.006, 0.0, hd) + 0.3 * exp(-hd * 25.0) * (0.5 + 0.9 * uKick));
  }

  // the scanner: a long dark slot across the nose, the red light sweeping in it
  vec2 sq = c - vec2(0.0, -0.025);
  float sw = 0.24, sh = 0.02;
  float sx = (clamp(sq.x, -sw, sw) + sw) / (2.0 * sw);
  if (abs(sq.x) < sw && abs(sq.y) < sh) {
    col = vec3(0.07, 0.0, 0.0);
    float cell = fract(sx * 8.0);
    col += vec3(1.0, 0.1, 0.05) * scanAt(sx, beats) * smoothstep(0.0, 0.1, cell) * smoothstep(1.0, 0.9, cell);
  }
  // its glow, spilling round the slot onto the black nose
  col += vec3(1.0, 0.05, 0.02) * scanAt(sx, beats) * exp(-length(max(abs(sq) - vec2(sw, sh), 0.0)) * 30.0) * 0.7;
  return col;
}
`;

const pipes = `
// The 3D pipes screensaver of the mid-90s office PC: on black, shiny pipes of
// solid colours growing cell by cell through a deep grid, turning at right
// angles - mostly a smooth elbow, now and then a ball joint - never through a
// cell another pipe holds. The growing is a simulation (src/core/sims.js) that
// also places the camera, above the tangle at an angle, new for each one; this
// draws the runs it projected, the nearest at each pixel, lit with a highlight
// as the original was. The tangle fills from the distance forwards for sixteen
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
// not the original's character) hops a cube a beat to turn them all, landing
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
// The dual chessboard of the Amiga intros (Nuance's Dual Chess, 1993): a
// chessboard on each bitplane, every board zooming and sliding on its own, and
// the palette giving each overlap of squares its own shade - so the boards
// weave a lattice that never stops shifting, unhurried - the zoom slow, by
// ratio, so no squares ever stream past. Two modes, a phrase each: the
// layers sliding sideways past each other, each at its own speed; then the
// boards turning on their own axes against each other, a quarter turn in the
// phrase, so the squares break into moire and come back square for the next. The zoom swings smoothly
// from huge squares to tiny ones and back, as Sanity's Quarters Chess Board
// did (1991). The music: the first board's squares nudge in on the kick and
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
// The chessboard floor of the Amiga intros, with its cube (Quadriga's
// Chessboard intro, 1992): a chessboard seen from above at an angle, in
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
    // grey, as the original's, a breath of the phrase's colour: the colour is the bars'
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
// The crack intro of the Amiga years, and its starfield (Skid Row's): a field
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
// The bouncing checkered ball, the Amiga's first and most famous demo: a red
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

  // its shadow on the back wall, down and to the right, as in the original
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
    // flat as the original, with only a hint of the edge
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
  vec3 rimC = pal(0.7); rimC /= max(max(rimC.r, rimC.g), max(rimC.b, 0.3));
  vec3 hue = pal(0.08); hue /= max(max(hue.r, hue.g), max(hue.b, 0.3));
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

  vec3 col = stageBackdrop(rd);
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

const SOURCES = {
  plasma, tunnel, metaballs, starfield, copper, fractal,
  shadebobs, vectorballs, dottunnel, fireworks, fire, kefrens, ball, rings, scanner, footsteps, twister, bobs, dualchess, chessfloor, rubber, bumplogo, cracktro, ansi, echolines, maze3d, moonbike, timecar, animeop, pipes, ripple, outrun, morph,
  paddles: staged(paddles, 0.55, 0.45),
  invaders: staged(invaders, 0.6, 0.35),
  rocks: staged(rocks, 0.45, 0.5),
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
  ['paddles', 'invaders', 'rocks', 'maze', 'bricks', 'lightcycles', 'snake', 'boxer', 'starfighter', 'pipes', 'pyramid', 'lcd', 'bobs', 'rubber', 'bumplogo', 'cascade', 'ansi', 'echolines', 'maze3d', 'moonbike', 'timecar', 'animeop']
    .map((n) => [n, { impact: 1 }]),
);
// the card cascade's trails are one-pixel edges: the era's full glow would fill them in
STYLE_FX.cascade.glow = 0.25;

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
  scanner:     'A black car on a night road, the red scanner in its nose sweeping on the beat',
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
  paddles:     'Neon paddles on the beat; on an accent a paddle misses and blows up',
  invaders:    'A seed-made formation on the beat; aliens burst on the kick',
  rocks:       'A vector ship that flies, dodges and splits the rocks it hits',
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
