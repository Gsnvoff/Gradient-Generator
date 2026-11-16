// Gradient Creator: mesh, flow and swirl gradients drawn by a WebGL shader.
// Each colour is a point; every pixel blends the colours by distance (Gaussian weights, in linear
// light), after its position is warped by simplex noise and twisted around the centre. Grain is added
// last. The same shader draws the preview and the export, so an export is exact at any size.
(function () {
  "use strict";

  const MAX = 6;

  // Presets: four colours each, light → deep, with a default layout.
  const PRESETS = [
    ["Iridescent cloud", ["#eaf4fc", "#1e50a2", "#f09199", "#3b2a55"]],
    ["Opal", ["#e8e4f8", "#9c86e0", "#f2b8cf", "#3a2c6e"]],
    ["Lagoon", ["#c9f2ec", "#2ba8b5", "#2f6fb0", "#0e2f4f"]],
    ["Emerald", ["#cdf3dc", "#3cb878", "#1f8a8a", "#0c3a2e"]],
    ["Solar flare", ["#ffe29a", "#ffa640", "#f2543c", "#5e1630"]],
    ["Orchid", ["#f2d6f2", "#c77ddb", "#7b4fc0", "#2e1a5a"]],
    ["Peach glow", ["#ffe0cc", "#ffa884", "#ec6f73", "#6e2c45"]],
    ["Electric tide", ["#c6f1ff", "#2fc0f0", "#2550d8", "#101a55"]],
    ["Sunset", ["#ffd08a", "#ff8259", "#d9406e", "#3e1858"]],
    ["Mint ice", ["#e2fff4", "#86e0c4", "#3e97a6", "#173f55"]],
    ["Midnight bloom", ["#d2c2ff", "#7a4fd1", "#c0509a", "#120c33"]],
    ["Rose gold", ["#fbe1d2", "#e6a08f", "#b4626b", "#46242f"]],
  ];
  const LAYOUT = [[0.78, 0.18], [0.3, 0.38], [0.72, 0.78], [0.12, 0.88], [0.5, 0.55], [0.15, 0.12]];

  const state = {
    type: 1,
    colors: PRESETS[0][1].map((c, i) => ({ c, x: LAYOUT[i][0], y: LAYOUT[i][1] })),
    softness: 0.5, warp: 0.6, scale: 1.4, swirl: 1.2, grain: 0.06, seed: 7.3,
    preset: 0, size: "1080x1080", custom: [1600, 1000], format: "png",
  };

  // ---------- URL state (Copy link) ----------
  function save() {
    const s = { t: state.type, c: state.colors.map(p => [p.c, +p.x.toFixed(4), +p.y.toFixed(4)]), so: state.softness, w: state.warp,
      sc: state.scale, sw: state.swirl, g: state.grain, se: state.seed, sz: state.size, cu: state.custom };
    history.replaceState(null, "", "#" + btoa(JSON.stringify(s)));
  }
  function load() {
    if (location.hash.length < 2) return;
    try {
      const s = JSON.parse(atob(location.hash.slice(1)));
      state.type = s.t; state.colors = s.c.slice(0, MAX).map(([c, x, y]) => ({ c, x, y }));
      Object.assign(state, { softness: s.so, warp: s.w, scale: s.sc, swirl: s.sw, grain: s.g, seed: s.se, size: s.sz || state.size, custom: s.cu || state.custom });
      state.preset = -1;
    } catch (e) { /* a broken link: keep the defaults */ }
  }

  // ---------- WebGL ----------
  const canvas = document.getElementById("canvas");
  const gl = canvas.getContext("webgl", { preserveDrawingBuffer: true, antialias: false });
  if (!gl) { document.body.textContent = "This browser can't run WebGL."; return; }

  const vert = "attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }";
  const frag = `
precision highp float;
uniform vec2 uRes; uniform int uCount; uniform vec2 uPos[${MAX}]; uniform vec3 uCol[${MAX}];
uniform float uSoft, uWarp, uScale, uSwirl, uGrain, uSeed; uniform int uType;

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
vec2 field(vec2 p){ return vec2(snoise(p * uScale + uSeed), snoise(p * uScale + uSeed + 31.7)); }
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + uSeed) * 43758.5453); }
vec3 toLinear(vec3 c){ return pow(c, vec3(2.2)); }
vec3 toSRGB(vec3 c){ return pow(clamp(c, 0.0, 1.0), vec3(1.0/2.2)); }

void main(){
  vec2 uv = gl_FragCoord.xy / uRes; uv.y = 1.0 - uv.y;
  float aspect = uRes.x / uRes.y;
  vec2 p = uv;
  // Swirl: a twist around the centre, strongest in the middle (Swirl type doubles it).
  vec2 c = p - 0.5; c.x *= aspect;
  float twist = uSwirl * (uType == 2 ? 2.0 : 0.6) * exp(-dot(c, c) * 3.0);
  float s = sin(twist), co = cos(twist);
  c = mat2(co, -s, s, co) * c; c.x /= aspect; p = c + 0.5;
  // Warp: one layer for Mesh, two (domain-warped) for Flow and Swirl.
  if (uType == 0) { p += uWarp * 0.12 * field(p); }
  else { vec2 q = field(p); p += uWarp * 0.16 * field(p + q * 0.35); }
  // Gaussian weights relative to the nearest point (a softmax over distances): far from every point
  // they'd underflow to zero and blend all colours into noise; relative ones never do.
  float sigma = 0.12 + uSoft * 0.55;
  float dist[${MAX}]; float nearest = 1e9;
  for (int i = 0; i < ${MAX}; i++) {
    dist[i] = 1e9;
    if (i >= uCount) continue;
    vec2 d = p - uPos[i]; d.x *= aspect;
    dist[i] = dot(d, d); nearest = min(nearest, dist[i]);
  }
  vec3 col = vec3(0.0); float total = 0.0;
  for (int i = 0; i < ${MAX}; i++) {
    if (i >= uCount) break;
    float w = exp(-(dist[i] - nearest) / (sigma * sigma));
    col += w * toLinear(uCol[i]); total += w;
  }
  col = toSRGB(col / total);
  col += (hash(gl_FragCoord.xy) - 0.5) * uGrain;
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
  const U = n => gl.getUniformLocation(prog, n);
  const u = { res: U("uRes"), count: U("uCount"), pos: U("uPos"), col: U("uCol"), soft: U("uSoft"), warp: U("uWarp"),
    scale: U("uScale"), swirl: U("uSwirl"), grain: U("uGrain"), seed: U("uSeed"), type: U("uType") };

  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);

  function draw(grainScale) {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(u.res, canvas.width, canvas.height);
    gl.uniform1i(u.count, state.colors.length);
    const pos = new Float32Array(MAX * 2), col = new Float32Array(MAX * 3);
    state.colors.forEach((p, i) => { pos[i * 2] = p.x; pos[i * 2 + 1] = p.y; col.set(hex(p.c), i * 3); });
    gl.uniform2fv(u.pos, pos); gl.uniform3fv(u.col, col);
    gl.uniform1f(u.soft, state.softness); gl.uniform1f(u.warp, state.warp); gl.uniform1f(u.scale, state.scale);
    gl.uniform1f(u.swirl, state.swirl); gl.uniform1f(u.grain, state.grain * (grainScale || 1)); gl.uniform1f(u.seed, state.seed);
    gl.uniform1i(u.type, state.type);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  // ---------- Layout ----------
  const frame = document.getElementById("frame"), handles = document.getElementById("handles");
  function exportSize() {
    if (state.size === "custom") return state.custom.map(n => Math.max(16, Math.min(8192, Math.round(n) || 16)));
    return state.size.split("x").map(Number);
  }
  function fit() {
    const [w, h] = exportSize(), stage = frame.parentElement.getBoundingClientRect();
    const scale = Math.min((stage.width - 32) / w, (stage.height - 32) / h);
    const cw = Math.max(80, Math.floor(w * scale)), ch = Math.max(80, Math.floor(h * scale));
    frame.style.width = cw + "px"; frame.style.height = ch + "px";
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    render();
  }
  let pending = false;
  function render() {
    if (pending) return; pending = true;
    requestAnimationFrame(() => { pending = false; draw(); placeHandles(); });
  }

  // ---------- Handles ----------
  function placeHandles() {
    if (handles.children.length !== state.colors.length) {
      handles.innerHTML = "";
      state.colors.forEach((p, i) => {
        const h = document.createElement("div"); h.className = "handle"; h.dataset.i = i;
        h.addEventListener("pointerdown", startDrag); handles.appendChild(h);
      });
    }
    [...handles.children].forEach((h, i) => {
      const p = state.colors[i];
      h.style.left = (p.x * 100) + "%"; h.style.top = (p.y * 100) + "%"; h.style.background = p.c;
    });
  }
  function startDrag(e) {
    const i = +e.currentTarget.dataset.i, h = e.currentTarget;
    h.setPointerCapture(e.pointerId);
    const move = ev => {
      const r = frame.getBoundingClientRect();
      state.colors[i].x = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width));
      state.colors[i].y = Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height));
      render();
    };
    const up = () => { h.removeEventListener("pointermove", move); h.removeEventListener("pointerup", up); save(); };
    h.addEventListener("pointermove", move); h.addEventListener("pointerup", up);
  }

  // ---------- Controls ----------
  const $ = id => document.getElementById(id);
  const SLIDERS = { softness: v => Math.round(v * 100) + "%", warp: v => Math.round(v * 100) + "%", scale: v => (+v).toFixed(1),
    swirl: v => (+v).toFixed(1), grain: v => Math.round(v * 100) + "%" };

  function syncControls() {
    for (const k in SLIDERS) { $(k).value = state[k]; $(k + "-v").textContent = SLIDERS[k](state[k]); }
    [...$("type").children].forEach(b => b.classList.toggle("on", +b.dataset.type === state.type));
    [...$("format").children].forEach(b => b.classList.toggle("on", b.dataset.format === state.format));
    [...$("presets").children].forEach((b, i) => b.classList.toggle("on", i === state.preset));
    $("size").value = state.size; $("custom").hidden = state.size !== "custom";
    $("cw").value = state.custom[0]; $("ch").value = state.custom[1];
    const list = $("colors"); list.innerHTML = "";
    state.colors.forEach((p, i) => {
      const li = document.createElement("li");
      li.innerHTML = `<input type="color" value="${p.c}" aria-label="Colour ${i + 1}"><code>${p.c}</code><button class="remove" aria-label="Remove colour ${i + 1}" ${state.colors.length <= 2 ? "disabled" : ""}>×</button>`;
      li.querySelector("input").addEventListener("input", e => { p.c = e.target.value; li.querySelector("code").textContent = p.c; state.preset = -1; render(); });
      li.querySelector("input").addEventListener("change", () => { syncControls(); save(); });
      li.querySelector(".remove").addEventListener("click", () => { state.colors.splice(i, 1); state.preset = -1; changed(); });
      list.appendChild(li);
    });
    $("add").disabled = state.colors.length >= MAX;
  }
  function changed() { syncControls(); render(); save(); }

  PRESETS.forEach(([name, colors], i) => {
    const b = document.createElement("button"); b.className = "preset";
    b.innerHTML = `<i style="background:conic-gradient(${colors.map((c, j) => `${c} ${j * 25}% ${(j + 1) * 25}%`).join(",")})"></i>${name}`;
    b.addEventListener("click", () => {
      state.preset = i;
      state.colors = colors.map((c, j) => ({ c, x: LAYOUT[j][0], y: LAYOUT[j][1] }));
      changed();
    });
    $("presets").appendChild(b);
  });
  for (const k in SLIDERS) $(k).addEventListener("input", e => { state[k] = +e.target.value; $(k + "-v").textContent = SLIDERS[k](state[k]); render(); });
  for (const k in SLIDERS) $(k).addEventListener("change", save);
  $("type").addEventListener("click", e => { const b = e.target.closest("button"); if (b) { state.type = +b.dataset.type; changed(); } });
  $("format").addEventListener("click", e => { const b = e.target.closest("button"); if (b) { state.format = b.dataset.format; syncControls(); } });
  $("add").addEventListener("click", () => {
    if (state.colors.length >= MAX) return;
    const l = LAYOUT[state.colors.length];
    state.colors.push({ c: "#ffffff", x: l[0], y: l[1] }); state.preset = -1; changed();
  });
  $("shuffle").addEventListener("click", () => {
    state.seed = Math.round(Math.random() * 1000) / 10;
    state.colors.forEach(p => { p.x = 0.08 + Math.random() * 0.84; p.y = 0.08 + Math.random() * 0.84; });
    changed();
  });
  $("copylink").addEventListener("click", async () => {
    save();
    try { await navigator.clipboard.writeText(location.href); flash($("copylink"), "Copied"); } catch (e) { flash($("copylink"), "Copy failed"); }
  });
  $("size").addEventListener("change", e => { state.size = e.target.value; syncControls(); fit(); save(); });
  ["cw", "ch"].forEach((id, i) => $(id).addEventListener("change", e => { state.custom[i] = +e.target.value; syncControls(); fit(); save(); }));

  function flash(button, text) {
    const old = button.textContent; button.textContent = text; setTimeout(() => { button.textContent = old; }, 1200);
  }

  // ---------- Export ----------
  $("download").addEventListener("click", () => {
    const [w, h] = exportSize(), max = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
    if (w > max || h > max) { alert(`This browser can draw at most ${max} × ${max}.`); return; }
    const keep = [canvas.width, canvas.height, frame.style.width, frame.style.height];
    canvas.width = w; canvas.height = h;
    // Grain is per pixel: scaled so it reads the same as the preview at this size.
    draw(1);
    const type = state.format === "jpeg" ? "image/jpeg" : "image/png";
    canvas.toBlob(blob => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      const name = state.preset >= 0 ? PRESETS[state.preset][0].toLowerCase().replace(/\s+/g, "-") : "gradient";
      a.download = `${name}-${w}x${h}.${state.format === "jpeg" ? "jpg" : "png"}`;
      a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      canvas.width = keep[0]; canvas.height = keep[1]; render();
    }, type, 0.95);
  });

  load();
  syncControls();
  window.addEventListener("resize", fit);
  fit();
})();
