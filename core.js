// Gradient core: the WebGL renderer shared by the app and by exported code.
// Both functions are self-contained on purpose: "Get code" embeds their source text as is,
// so an exported gradient is drawn by exactly the same shader as the preview.
//
// cfg = { type, colors: [[hex, x, y], ...], softness, warp, scale, swirl, grain, seed, angle, animate, speed }
// Types 0-2 (Mesh, Flow, Swirl) blend colour points; types 3-8 map a field onto the colours as a ramp
// (first colour = background, last = brightest): Aurora, Horizon, Fade, Glow, Waves, Prism.

function createGradient(canvas, opts) {
  const MAX = 6;
  const gl = canvas.getContext("webgl", Object.assign({ antialias: false }, opts));
  if (!gl) return null;

  const vert = "attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }";
  const frag = `
precision highp float;
uniform vec2 uRes; uniform int uCount; uniform vec2 uPos[${MAX}]; uniform vec3 uCol[${MAX}];
uniform float uSoft, uWarp, uScale, uSwirl, uGrain, uSeed, uAngle, uTime; uniform int uType;

vec3 mod289(vec3 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
vec2 mod289(vec2 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
vec3 permute(vec3 x){ return mod289(((x*34.0)+1.0)*x); }
float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy)); vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz; x12.xy -= i1; i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0); m = m*m; m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0; vec3 h = abs(x) - 0.5; vec3 ox = floor(x + 0.5); vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g; g.x = a0.x * x0.x + h.x * x0.y; g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
// Animation: uTime is a phase in [0, 2pi). Every moving term uses whole multiples of it and is zero
// at phase 0, so the motion loops seamlessly and a still frame equals the animation's first frame.
vec2 drift(){ return 0.9 * vec2(cos(uTime) - 1.0, sin(uTime)); }
vec2 field(vec2 p){ vec2 q = p * uScale + uSeed + drift(); return vec2(snoise(q), snoise(q + 31.7)); }
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + uSeed) * 43758.5453); }
vec3 toLinear(vec3 c){ return pow(c, vec3(2.2)); }
vec3 toSRGB(vec3 c){ return pow(clamp(c, 0.0, 1.0), vec3(1.0/2.2)); }
mat2 rot(float a){ float s = sin(a), k = cos(a); return mat2(k, -s, s, k); }
// Ramp colours are blended in OKLab (perceptually even) along a Catmull-Rom curve through every
// stop, so there are no visible creases where one colour hands over to the next.
vec3 toOklab(vec3 c){
  vec3 l = pow(max(vec3(
    dot(c, vec3(0.4122214708, 0.5363325363, 0.0514459929)),
    dot(c, vec3(0.2119034982, 0.6806995451, 0.1073969566)),
    dot(c, vec3(0.0883024619, 0.2817188376, 0.6299787005))), 0.0), vec3(1.0/3.0));
  return vec3(dot(l, vec3(0.2104542553, 0.7936177850, -0.0040720468)),
              dot(l, vec3(1.9779984951, -2.4285922050, 0.4505937099)),
              dot(l, vec3(0.0259040371, 0.7827717662, -0.8086757660)));
}
vec3 fromOklab(vec3 c){
  c.x = max(c.x, 0.0);
  vec3 l = vec3(dot(c, vec3(1.0, 0.3963377774, 0.2158037573)),
                dot(c, vec3(1.0, -0.1055613458, -0.0638541728)),
                dot(c, vec3(1.0, -0.0894841775, -1.2914855480)));
  l = l * l * l;
  return max(vec3(dot(l, vec3(4.0767416621, -3.3077115913, 0.2309699292)),
                  dot(l, vec3(-1.2684380046, 2.6097574011, -0.3413193965)),
                  dot(l, vec3(-0.0041960863, -0.7034186147, 1.7076147010))), 0.0);
}
vec3 stopLab(int k){ vec3 c = uCol[0]; for (int i = 0; i < ${MAX}; i++) { if (i == k) c = uCol[i]; } return toOklab(toLinear(c)); }
vec3 ramp(float t){
  float f = clamp(t, 0.0, 1.0) * float(uCount - 1);
  int k = int(min(floor(f), float(uCount - 2)));
  float u = f - float(k);
  vec3 p0 = stopLab(k > 0 ? k - 1 : 0), p1 = stopLab(k), p2 = stopLab(k + 1), p3 = stopLab(k + 2 < uCount ? k + 2 : uCount - 1);
  vec3 c = 0.5 * (2.0 * p1 + (p2 - p0) * u + (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3) * u * u + (3.0 * p1 - p0 - 3.0 * p2 + p3) * u * u * u);
  return fromOklab(c);
}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes; uv.y = 1.0 - uv.y;
  float aspect = uRes.x / uRes.y;
  vec2 c = uv - 0.5; c.x *= aspect;
  // Swirl: a twist around the centre, strongest in the middle (the Swirl type doubles it).
  c = rot(uSwirl * (uType == 2 ? 2.0 : 0.6) * exp(-dot(c, c) * 3.0)) * c;
  vec3 col;

  if (uType <= 2) {
    vec2 p = c; p.x /= aspect; p += 0.5;
    if (uType == 0) { p += uWarp * 0.12 * field(p); }
    else { vec2 q = field(p); p += uWarp * 0.16 * field(p + q * 0.35); }
    // Gaussian weights relative to the nearest point (a softmax over distances), so far from every
    // point they never underflow to zero.
    float sigma = 0.12 + uSoft * 0.55;
    float dist[${MAX}]; float nearest = 1e9;
    for (int i = 0; i < ${MAX}; i++) {
      dist[i] = 1e9;
      if (i >= uCount) continue;
      float fi = float(i);
      vec2 pos = uPos[i] + 0.08 * vec2(sin(uTime + fi * 2.1) - sin(fi * 2.1), sin(2.0 * uTime + fi * 1.3) - sin(fi * 1.3));
      vec2 d = p - pos; d.x *= aspect;
      dist[i] = dot(d, d); nearest = min(nearest, dist[i]);
    }
    col = vec3(0.0); float total = 0.0;
    for (int i = 0; i < ${MAX}; i++) {
      if (i >= uCount) break;
      float w = exp(-(dist[i] - nearest) / (sigma * sigma));
      col += w * toLinear(uCol[i]); total += w;
    }
    col /= total;
  } else {
    // Ramp types work in a centred frame rotated by Angle; +y points at the light ("down" at 0 deg).
    vec2 q = rot(radians(uAngle)) * c;
    vec2 w = q + uWarp * 0.15 * field(q);
    float ax = max(aspect, 1.0), s = uSoft, t = 0.0;
    if (uType == 3) {            // Aurora: drifting ribbons with vertical streaks
      w = mix(q, w, 0.4);
      for (int k = 0; k < 3; k++) {
        float fk = float(k);
        float line = -0.2 + 0.15 * fk + 0.1 * snoise(vec2(w.x / ax * uScale * 1.2 + fk * 4.3 + uSeed, fk) + drift() * 0.5);
        float wid = 0.02 + s * 0.05, d = w.y - line;
        float streak = 0.8 + 0.2 * snoise(vec2(w.x / ax * 9.0 * uScale + fk * 7.0, fk * 3.0) + drift());
        float curtain = d > 0.0 ? exp(-d * d / (wid * wid)) : exp(d / (wid * 5.0)); // sharp edge, long tail
        t = max(t, curtain * streak * (1.0 - fk * 0.15));
      }
    } else if (uType == 4) {     // Horizon: a glowing dome rising from the bottom edge, with soft bands
      vec2 h = vec2(mix(q.x, w.x, 0.35) / ax, mix(q.y, w.y, 0.35));
      h.x += 0.07 * sin(uTime);                                     // sway
      float e = length(vec2(h.x * 1.1, (h.y - 0.85) * 1.05)) - 0.62 - 0.035 * sin(2.0 * uTime); // breathe
      float wid = (0.05 + s * 0.2) * (e < 0.0 ? 2.6 : 1.0);
      float bands = 0.5 + 0.5 * cos(e * 30.0 * uScale / 1.4);
      t = exp(-e * e / (wid * wid)) * (0.94 + 0.06 * bands);
      t *= 1.0 - 0.55 * smoothstep(0.25, 0.5, h.y);
    } else if (uType == 5) {     // Fade: dark to light, the light edge bowed so the sides fall off first
      float x = w.x / ax + 0.1 * sin(uTime);
      float edge = 0.06 * sin(2.0 * uTime) + 0.05 * (sin(x * 4.0 + uTime) - sin(x * 4.0));
      t = smoothstep(-0.2 - s * 0.3, 0.6, w.y - 0.45 * x * x + edge);
    } else if (uType == 6) {     // Glow: a light source just past the edge, plus a smaller side flare
      vec2 g = vec2(w.x / ax, w.y);
      float k = 0.15 + s * 0.9;
      vec2 a = g - vec2(0.0, 0.72) - 0.1 * vec2(sin(uTime), 1.0 - cos(uTime));
      vec2 b = g - vec2(0.38, 0.6) - vec2(0.3 * (cos(uTime) - 1.0), 0.06 * sin(2.0 * uTime));
      t = exp(-dot(a, a) / (k * k)) + 0.45 * exp(-dot(b, b) / (k * k * 0.35));
    } else if (uType == 7) {     // Waves: layered sine bands
      float v = w.y * 2.2 + 0.25 * sin(w.x * 2.5 * uScale + uTime + uSeed) + 0.15 * sin(w.x * 4.1 * uScale - 2.0 * uTime + uSeed * 1.7);
      float b = 0.5 + 0.5 * sin(v * 3.14159 * uScale * 0.9);
      float e = 0.05 + 0.45 * s;
      t = smoothstep(0.5 - e, 0.5 + e, b);
    } else {                     // Prism: conic bands spiralling out of the centre
      // sin(angle + phi) written with a softened direction vector, so the centre is smooth, not a point.
      float r = length(w), phi = r * uScale * 2.5 + uTime;
      vec2 n = w / (r + 0.12);
      t = 0.5 + 0.5 * (n.y * cos(phi) + n.x * sin(phi));
      t = mix(t, smoothstep(0.0, 1.0, t), 1.0 - s);
    }
    col = ramp(t);
  }
  col = toSRGB(col);
  // Grain, plus a one-step dither that is always on, so smooth dark gradients never show 8-bit bands.
  col += (hash(gl_FragCoord.xy) - 0.5) * uGrain + (hash(gl_FragCoord.yx + 17.0) - 0.5) / 255.0;
  gl_FragColor = vec4(col, 1.0);
}`;

  function shader(type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  const prog = gl.createProgram();
  gl.attachShader(prog, shader(gl.VERTEX_SHADER, vert));
  gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, frag));
  gl.linkProgram(prog); gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aLoc = gl.getAttribLocation(prog, "a");
  gl.enableVertexAttribArray(aLoc); gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0);
  const U = {};
  ["uRes", "uCount", "uPos", "uCol", "uSoft", "uWarp", "uScale", "uSwirl", "uGrain", "uSeed", "uAngle", "uTime", "uType"]
    .forEach(n => { U[n] = gl.getUniformLocation(prog, n); });
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);

  return {
    gl,
    // phase: animation phase in radians (0 = still frame). Draws at the canvas's current pixel size.
    draw(cfg, phase) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(U.uRes, canvas.width, canvas.height);
      gl.uniform1i(U.uCount, cfg.colors.length);
      const pos = new Float32Array(MAX * 2), col = new Float32Array(MAX * 3);
      cfg.colors.forEach(([c, x, y], i) => { pos[i * 2] = x; pos[i * 2 + 1] = y; col.set(hex(c), i * 3); });
      gl.uniform2fv(U.uPos, pos); gl.uniform3fv(U.uCol, col);
      gl.uniform1f(U.uSoft, cfg.softness); gl.uniform1f(U.uWarp, cfg.warp); gl.uniform1f(U.uScale, cfg.scale);
      gl.uniform1f(U.uSwirl, cfg.swirl); gl.uniform1f(U.uGrain, cfg.grain); gl.uniform1f(U.uSeed, cfg.seed);
      gl.uniform1f(U.uAngle, cfg.angle || 0); gl.uniform1f(U.uTime, phase || 0); gl.uniform1i(U.uType, cfg.type);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
  };
}

// Mounts a gradient on a canvas: keeps it sharp when the canvas resizes and, when cfg.animate is on,
// loops the animation (one loop lasts 10 / cfg.speed seconds; still for prefers-reduced-motion).
// Returns a function that stops it.
function mountGradient(canvas, cfg) {
  const g = createGradient(canvas);
  if (!g) return function () {};
  const still = !cfg.animate || matchMedia("(prefers-reduced-motion: reduce)").matches;
  let raf = 0, phase = 0, last = 0;
  function resize() {
    const r = canvas.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(r.width * d)); canvas.height = Math.max(1, Math.round(r.height * d));
    g.draw(cfg, phase);
  }
  function loop(now) {
    if (last) phase = (phase + (now - last) / 1000 * cfg.speed * Math.PI / 5) % (Math.PI * 2);
    last = now; g.draw(cfg, phase); raf = requestAnimationFrame(loop);
  }
  const ro = new ResizeObserver(resize); ro.observe(canvas); resize();
  if (!still) raf = requestAnimationFrame(loop);
  return function () { cancelAnimationFrame(raf); ro.disconnect(); };
}
