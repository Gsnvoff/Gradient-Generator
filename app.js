// Gradient Generator: the editor around core.js (which holds the shader and is what "Get code" exports).
(function () {
  "use strict";

  const MAX = 6, TAU = Math.PI * 2;
  const TYPES = ["Mesh", "Flow", "Swirl", "Aurora", "Horizon", "Fade", "Glow", "Waves", "Prism"];
  const isRamp = t => t >= 3;

  // Soft presets keep the current pattern; hero presets also pick a pattern and its settings.
  // Hero colours run from background to brightest.
  const HERO = { swirl: 0, warp: 0.12, scale: 1.2, softness: 0.55, grain: 0.04 };
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

    ["Ember dome", ["#050302", "#3d0f02", "#ff5b12", "#ffd9bf"], 4, HERO],
    ["Acid dome", ["#030401", "#1e2a04", "#9ad11a", "#eaffb0"], 4, HERO],
    ["Cyan dome", ["#01070a", "#04324a", "#1aa8f0", "#c8f0ff"], 4, HERO],
    ["Cobalt dome", ["#02041a", "#0b1d7a", "#3d6bff", "#cfe0ff"], 4, HERO],
    ["Ultraviolet dome", ["#06020f", "#2a0a6b", "#8a3dff", "#e8d8ff"], 4, HERO],
    ["Silver dome", ["#030303", "#2a2a2a", "#9a9a9a", "#f2f2f2"], 4, HERO],
    ["Violet dusk", ["#000000", "#3b0f9e", "#8b46ff", "#d8c2ff", "#f7f4ff"], 5, { ...HERO, angle: 180 }],
    ["Ember rise", ["#000000", "#5a1a02", "#ff6a1a", "#ffe3d0"], 5, { ...HERO, warp: 0.15 }],
    ["Lime rise", ["#000000", "#243305", "#a6e22e", "#f2ffd0"], 5, { ...HERO, warp: 0.15 }],
    ["Sky rise", ["#000000", "#06304d", "#2bb3ff", "#e0f6ff"], 5, { ...HERO, warp: 0.15 }],
    ["Sunrise leak", ["#03020d", "#3b0e1a", "#ff5a2a", "#ffe08a"], 6, { ...HERO, angle: 10 }],
    ["Toxic leak", ["#03020d", "#1a3010", "#8fd13a", "#e9ff9a"], 6, { ...HERO, angle: 340 }],
    ["Corner neon", ["#03020d", "#0a1640", "#2f5bff", "#9ad8ff"], 6, { ...HERO, angle: 135 }],
    ["Northern lights", ["#020611", "#063a3a", "#22e0a0", "#c9ffe8"], 3, { ...HERO, angle: 180, warp: 0.5 }],
    ["Magenta aurora", ["#08030f", "#3b0a4a", "#d63fd0", "#ffd0f5"], 3, { ...HERO, angle: 180, warp: 0.5 }],
    ["Candy waves", ["#ffd6e8", "#ff8fb8", "#7f6cff", "#2c1f70"], 7, { ...HERO, warp: 0.25, softness: 0.7, grain: 0.05 }],
    ["Deep sea", ["#031b2e", "#0a5b7a", "#36c2c9", "#c8fff6"], 7, { ...HERO, warp: 0.4, softness: 0.8 }],
    ["Holo prism", ["#ffd1f0", "#a7c4ff", "#b8ffe6", "#fff3b0"], 8, { ...HERO, warp: 0.5, softness: 0.8, grain: 0.05 }],
    ["Night prism", ["#0b0620", "#4a1d96", "#ff4f9a", "#ffb36b"], 8, { ...HERO, warp: 0.5, softness: 0.6 }],
  ];
  const LAYOUT = [[0.78, 0.18], [0.3, 0.38], [0.72, 0.78], [0.12, 0.88], [0.5, 0.55], [0.15, 0.12]];

  const state = {
    type: 1,
    colors: PRESETS[0][1].map((c, i) => ({ c, x: LAYOUT[i][0], y: LAYOUT[i][1] })),
    softness: 0.5, warp: 0.6, scale: 1.4, swirl: 1.2, grain: 0.06, seed: 7.3, angle: 0,
    animate: false, speed: 1,
    preset: 0, size: "1080x1080", custom: [1600, 1000], format: "png",
  };
  const r4 = n => Math.round(n * 1e4) / 1e4;
  const cfg = () => ({
    type: state.type, colors: state.colors.map(p => [p.c, r4(p.x), r4(p.y)]),
    softness: state.softness, warp: state.warp, scale: state.scale, swirl: state.swirl, grain: state.grain,
    seed: state.seed, angle: state.angle, animate: state.animate, speed: state.speed,
  });

  // ---------- URL state (Copy link) ----------
  function save() {
    const s = { t: state.type, c: state.colors.map(p => [p.c, r4(p.x), r4(p.y)]), so: state.softness, w: state.warp,
      sc: state.scale, sw: state.swirl, g: state.grain, se: state.seed, a: state.angle, an: state.animate ? 1 : 0,
      sp: state.speed, sz: state.size, cu: state.custom };
    history.replaceState(null, "", "#" + btoa(JSON.stringify(s)));
    ownHash = location.hash;
  }
  let ownHash = "";
  function load() {
    if (location.hash.length < 2) return;
    try {
      const s = JSON.parse(atob(location.hash.slice(1)));
      state.type = s.t; state.colors = s.c.slice(0, MAX).map(([c, x, y]) => ({ c, x, y }));
      Object.assign(state, { softness: s.so, warp: s.w, scale: s.sc, swirl: s.sw, grain: s.g, seed: s.se,
        angle: s.a || 0, animate: !!s.an, speed: s.sp || 1, size: s.sz || state.size, custom: s.cu || state.custom });
      state.preset = -1;
    } catch (e) { /* a broken link: keep the defaults */ }
  }

  // ---------- Renderer ----------
  const canvas = document.getElementById("canvas");
  const g = createGradient(canvas, { preserveDrawingBuffer: true });
  if (!g) { document.body.textContent = "This browser can't run WebGL."; return; }
  const gl = g.gl;

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

  // One frame on demand; a continuous loop while animating. The phase advances by real time, so
  // one loop takes 10 / speed seconds, the same as exported code and video.
  let raf = 0, phase = 0, last = 0, busy = false;
  function frameTick(now) {
    raf = 0;
    if (busy) return;
    if (state.animate) {
      if (last) phase = (phase + (now - last) / 1000 * state.speed * TAU / 10) % TAU;
      last = now;
    } else { last = 0; }
    g.draw(cfg(), phase); placeHandles();
    if (state.animate) raf = requestAnimationFrame(frameTick);
  }
  function render() { if (!raf && !busy) raf = requestAnimationFrame(frameTick); }

  // ---------- Handles ----------
  // While animating, each colour point moves along the same loop as in the shader (core.js), so the
  // rings follow their colours; dragging sets the point's resting position.
  const drift = i => [0.08 * (Math.sin(phase + i * 2.1) - Math.sin(i * 2.1)), 0.08 * (Math.sin(2 * phase + i * 1.3) - Math.sin(i * 1.3))];
  function placeHandles() {
    handles.hidden = isRamp(state.type);
    if (handles.children.length !== state.colors.length) {
      handles.innerHTML = "";
      state.colors.forEach((p, i) => {
        const h = document.createElement("div"); h.className = "handle"; h.dataset.i = i;
        h.addEventListener("pointerdown", startDrag); handles.appendChild(h);
      });
    }
    [...handles.children].forEach((h, i) => {
      const p = state.colors[i], [dx, dy] = drift(i);
      h.style.left = ((p.x + dx) * 100) + "%"; h.style.top = ((p.y + dy) * 100) + "%"; h.style.background = p.c;
    });
  }
  function startDrag(e) {
    const i = +e.currentTarget.dataset.i, h = e.currentTarget;
    h.setPointerCapture(e.pointerId);
    const move = ev => {
      const r = frame.getBoundingClientRect(), [dx, dy] = drift(i);
      state.colors[i].x = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width - dx));
      state.colors[i].y = Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height - dy));
      render();
    };
    const up = () => { h.removeEventListener("pointermove", move); h.removeEventListener("pointerup", up); save(); };
    h.addEventListener("pointermove", move); h.addEventListener("pointerup", up);
  }

  // ---------- Controls ----------
  const $ = id => document.getElementById(id);
  const pct = v => Math.round(v * 100) + "%";
  const SLIDERS = { softness: pct, warp: pct, scale: v => (+v).toFixed(1), swirl: v => (+v).toFixed(1),
    angle: v => Math.round(v) + "°", grain: pct, speed: v => (+v).toFixed(2) + "×" };

  function syncControls() {
    for (const k in SLIDERS) { $(k).value = state[k]; $(k + "-v").textContent = SLIDERS[k](state[k]); }
    $("animate").checked = state.animate;
    $("angle-row").hidden = !isRamp(state.type);
    $("hint").textContent = isRamp(state.type)
      ? "The first colour is the background and the last is the brightest; the rest blend in between in order."
      : "Drag the rings on the canvas to move each colour.";
    [...$("type").children].forEach(b => b.classList.toggle("on", +b.dataset.type === state.type));
    [...$("format").children].forEach(b => b.classList.toggle("on", b.dataset.format === state.format));
    document.querySelectorAll(".preset").forEach(b => b.classList.toggle("on", +b.dataset.i === state.preset));
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

  function swatch(colors, type) {
    if (type === undefined) return `conic-gradient(${colors.map((c, j) => `${c} ${j * 25}% ${(j + 1) * 25}%`).join(",")})`;
    const rev = [...colors].reverse();
    return `radial-gradient(circle at 50% 100%, ${rev.map((c, j) => `${c} ${Math.round(j / (rev.length - 1) * 90)}%`).join(",")})`;
  }
  PRESETS.forEach(([name, colors, type, opts], i) => {
    const b = document.createElement("button"); b.className = "preset"; b.dataset.i = i;
    b.innerHTML = `<i style="background:${swatch(colors, type)}"></i>${name}`;
    b.addEventListener("click", () => {
      state.preset = i;
      state.colors = colors.map((c, j) => ({ c, x: LAYOUT[j][0], y: LAYOUT[j][1] }));
      if (type !== undefined) Object.assign(state, { angle: 0 }, opts, { type });
      changed();
    });
    $(type === undefined ? "presets-soft" : "presets-hero").appendChild(b);
  });
  for (const k in SLIDERS) $(k).addEventListener("input", e => { state[k] = +e.target.value; $(k + "-v").textContent = SLIDERS[k](state[k]); render(); });
  for (const k in SLIDERS) $(k).addEventListener("change", save);
  $("animate").addEventListener("change", e => { state.animate = e.target.checked; if (!state.animate) phase = 0; changed(); });
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
  const fileName = () => state.preset >= 0 ? PRESETS[state.preset][0].toLowerCase().replace(/\s+/g, "-") : "gradient";
  function downloadBlob(blob, name) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  // ---------- Export: image (the current frame) ----------
  $("download").addEventListener("click", () => {
    const [w, h] = exportSize(), max = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
    if (w > max || h > max) { alert(`This browser can draw at most ${max} × ${max}.`); return; }
    busy = true;
    const keep = [canvas.width, canvas.height];
    canvas.width = w; canvas.height = h;
    g.draw(cfg(), phase);
    canvas.toBlob(blob => {
      downloadBlob(blob, `${fileName()}-${w}x${h}.${state.format === "jpeg" ? "jpg" : "png"}`);
      canvas.width = keep[0]; canvas.height = keep[1]; busy = false; render();
    }, state.format === "jpeg" ? "image/jpeg" : "image/png", 0.95);
  });

  // ---------- Export: video (exactly one seamless loop, recorded in real time) ----------
  $("video").addEventListener("click", async () => {
    if (busy) return;
    const mime = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"]
      .find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m));
    if (!mime || !canvas.captureStream) { alert("This browser can't record video from a canvas."); return; }
    let [w, h] = exportSize();
    const k = Math.min(1, 1920 / Math.max(w, h)); // video encoders top out around 1080p-class sizes
    w = Math.round(w * k / 2) * 2; h = Math.round(h * k / 2) * 2;
    const btn = $("video"), label = btn.textContent, period = 10 / state.speed * 1000;
    busy = true; btn.disabled = true;
    const keep = [canvas.width, canvas.height];
    canvas.width = w; canvas.height = h;
    const rec = new MediaRecorder(canvas.captureStream(60), { mimeType: mime, videoBitsPerSecond: 20e6 });
    const chunks = [];
    rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    const stopped = new Promise(res => { rec.onstop = res; });
    g.draw(cfg(), 0); rec.start();
    const t0 = performance.now();
    let aborted = false, finish;
    // Browsers pause hidden tabs, which would leave a broken loop: stop instead.
    const onHide = () => { if (document.hidden) { aborted = true; finish(); } };
    document.addEventListener("visibilitychange", onHide);
    await new Promise(res => {
      finish = res;
      const step = now => {
        if (aborted) return;
        const e = now - t0;
        btn.textContent = `Recording… ${Math.ceil((period - e) / 1000)}s`;
        if (e >= period) { res(); return; }
        g.draw(cfg(), e / period * TAU); requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    document.removeEventListener("visibilitychange", onHide);
    rec.stop(); await stopped;
    if (aborted) alert("Recording stopped because the tab was hidden. Keep this tab visible while it records.");
    else downloadBlob(new Blob(chunks, { type: mime }), `${fileName()}-${w}x${h}.${mime.startsWith("video/mp4") ? "mp4" : "webm"}`);
    canvas.width = keep[0]; canvas.height = keep[1];
    btn.textContent = label; btn.disabled = false; busy = false; render();
  });

  // ---------- Export: code ----------
  let lang = "html";
  const indent = (src, pad) => src.split("\n").map(l => (l ? pad + l : l)).join("\n");
  const core = () => createGradient.toString() + "\n\n" + mountGradient.toString();
  const json = () => JSON.stringify(cfg());

  function htmlCode() {
    return `<!-- Gradient Generator · ${TYPES[state.type]} gradient${state.animate ? ", animated" : ""}.
     Size the canvas however you like; it redraws sharp at any size. -->
<canvas id="gradient" style="display:block;width:100%;height:100vh"></canvas>
<script>
(function () {
${indent(core(), "  ")}

  mountGradient(document.getElementById("gradient"), ${json()});
})();
</script>
`;
  }
  function reactCode() {
    return `// Gradient Generator · ${TYPES[state.type]} gradient${state.animate ? ", animated" : ""}.
// Usage: <Gradient style={{ height: "100vh" }} />
import { useEffect, useRef } from "react";

const CONFIG = ${json()};

export default function Gradient({ className, style }) {
  const ref = useRef(null);
  useEffect(() => mountGradient(ref.current, CONFIG), []);
  return <canvas ref={ref} className={className} style={{ display: "block", width: "100%", height: "100%", ...style }} />;
}

${core()}
`;
  }
  // CSS can't run the shader, so this is a close approximation built from CSS gradients plus an SVG grain layer.
  function cssCode() {
    const cs = state.colors.map(p => p.c), n = cs.length, a = state.angle;
    const stops = list => list.map((c, i) => `${c} ${Math.round(i / (list.length - 1) * 100)}%`).join(", ");
    const ax = Math.round(50 - Math.sin(a * Math.PI / 180) * 60), ay = Math.round(50 + Math.cos(a * Math.PI / 180) * 60);
    const rev = [...cs].reverse();
    let layers;
    if (!isRamp(state.type)) {
      const r = Math.round(35 + state.softness * 40);
      layers = state.colors.map(p => `radial-gradient(circle at ${Math.round(p.x * 100)}% ${Math.round(p.y * 100)}%, ${p.c} 0%, ${p.c}00 ${r}%)`);
      layers.push(cs[n - 1]);
    } else if (state.type === 5) {
      layers = [`linear-gradient(${(180 + a) % 360}deg, ${stops(cs)})`];
    } else if (state.type === 4) {
      layers = [`radial-gradient(ellipse 85% 75% at ${ax}% ${ay}%, ${rev.slice(1).map((c, i) => `${c} ${Math.round(45 + i / (n - 1) * 45)}%`).join(", ")}, ${cs[0]} 100%)`,
        `radial-gradient(ellipse 80% 60% at ${ax}% ${ay + 15}%, ${cs[0]} 40%, transparent 70%)`, cs[0]];
    } else if (state.type === 6) {
      layers = [`radial-gradient(ellipse 110% 90% at ${ax}% ${ay}%, ${stops(rev)})`];
    } else if (state.type === 8) {
      layers = [`conic-gradient(from ${a}deg at 50% 50%, ${stops([...cs, ...rev.slice(1)])})`];
    } else if (state.type === 7) {
      layers = [`repeating-linear-gradient(${(180 + a) % 360}deg, ${stops([...cs, ...rev.slice(1)]).replace(/(\d+)%/g, (_, v) => Math.round(v * 0.3) + "%")})`];
    } else {
      layers = [`linear-gradient(${(a) % 360}deg, ${cs[0]} 20%, ${cs[Math.min(2, n - 1)]}66 45%, transparent 70%)`,
        `linear-gradient(${(180 + a) % 360}deg, ${stops(cs)})`];
    }
    const grain = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;
    const anim = state.animate ? `\n  background-size: 140% 140%;\n  animation: gradient-drift ${Math.round(10 / state.speed * 10) / 10}s ease-in-out infinite alternate;` : "";
    return `/* Gradient Generator · ${TYPES[state.type]} gradient (CSS approximation).
   Usage: <div class="gradient"></div>
   For the exact look${state.animate ? " and motion" : ""}, use the HTML or React export. */
.gradient {
  position: relative;
  overflow: hidden;
  isolation: isolate;
  background: ${cs[0]};
}
.gradient::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  background:
    ${layers.join(",\n    ")};${anim}
}
.gradient::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: ${grain};
  opacity: ${Math.min(1, Math.round(state.grain * 4 * 100) / 100)};
  mix-blend-mode: overlay;
}${state.animate ? `
@keyframes gradient-drift {
  from { background-position: 0% 0%; }
  to { background-position: 100% 100%; }
}
@media (prefers-reduced-motion: reduce) {
  .gradient::before { animation: none; }
}` : ""}
`;
  }
  const CODE = {
    html: [htmlCode, "gradient.html", "text/html", "A self-contained snippet: paste it into any page. It runs the same WebGL shader as this editor, so it matches the preview exactly."],
    react: [reactCode, "Gradient.jsx", "text/javascript", "A React component with no dependencies beyond React. It runs the same WebGL shader as this editor."],
    css: [cssCode, "gradient.css", "text/css", "Pure CSS, no JavaScript. CSS can't run the shader, so this is a close approximation of the preview."],
  };
  function showCode() {
    [...$("code-lang").children].forEach(b => b.classList.toggle("on", b.dataset.lang === lang));
    $("code-out").textContent = CODE[lang][0]();
    $("code-note").textContent = CODE[lang][3];
  }
  $("code").addEventListener("click", () => { showCode(); $("code-dialog").showModal(); });
  $("code-close").addEventListener("click", () => $("code-dialog").close());
  $("code-dialog").addEventListener("click", e => { if (e.target === e.currentTarget) e.currentTarget.close(); });
  $("code-lang").addEventListener("click", e => { const b = e.target.closest("button"); if (b) { lang = b.dataset.lang; showCode(); } });
  $("code-copy").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText($("code-out").textContent); flash($("code-copy"), "Copied"); } catch (e) { flash($("code-copy"), "Copy failed"); }
  });
  $("code-save").addEventListener("click", () => downloadBlob(new Blob([$("code-out").textContent], { type: CODE[lang][2] }), CODE[lang][1]));

  load();
  syncControls();
  ownHash = location.hash;
  // A different share link pasted into this tab: load it (our own saves are ignored).
  window.addEventListener("hashchange", () => {
    if (location.hash === ownHash) return;
    ownHash = location.hash; load(); syncControls(); fit();
  });
  window.addEventListener("resize", fit);
  fit();
})();
