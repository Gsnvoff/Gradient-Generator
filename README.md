# Gradient Generator

A small web tool for mesh, flow, hero, glass and animated gradients with grain. Export as PNG/JPEG at any size, as a looping video, or as code.

Open `index.html` in a browser (or serve the folder, for example `python3 -m http.server`). No build step and no dependencies.

## What it does

- **Patterns:**
  - Point patterns: Mesh (soft blends between colour points), Flow (domain-warped bands) and Swirl (a twist around the centre).
  - Ramp patterns, mainly for hero sections: Aurora (curtains), Horizon (a glowing dome rising from the bottom edge), Fade, Glow (a light leak from just past an edge), Waves, Prism and Radial (colours running from the centre outwards). In these, the first colour is the background and the last is the brightest. The Angle slider turns them.
- **Glass:** a glass layer over any pattern, with Amount, Strips (or Tiles, or Rings), Shadows and Highlights:
  - **Fluted:** vertical reeded strips, each a cylinder-shaped lens that magnifies what's behind it.
  - **Mosaic:** square glass tiles.
  - **Ripple:** concentric waves; they travel outwards when animated.
  - **Frosted:** scattered, etched glass.
- **Presets:** 12 soft palettes, 19 dark hero presets that also pick a pattern (domes, rises, light leaks, auroras, waves, prisms), and 8 glass presets.
- **Illustrated switches:** each Pattern and Glass tile is a small live preview in your current colours and settings, so you can see what an option looks like before picking it.
- **Colours:** 2 to 6. For point patterns, drag the rings on the canvas to move each colour.
- **Sliders:** softness, warp, warp scale, swirl, angle and grain. Shuffle changes the noise and moves the points.
- **Motion:** Animate plays a seamless loop. One loop lasts 10 ÷ speed seconds.
- **Export:**
  - **Image:** square, Full HD, 4K, phone, MacBook Pro or a custom size.
  - **Video:** one exact loop as MP4 (or WebM where MP4 recording isn't supported), capped at 1920 px on the long side.
  - **Get code:**
    - **HTML:** a self-contained snippet.
    - **React:** a component with no dependencies.
    - **CSS:** an approximation for when you can't run JavaScript.

    The HTML and React exports embed the editor's own renderer (`core.js`), so they match the preview exactly, glass included. The CSS export draws glass as shading only, since CSS can't bend the gradient. They animate when Animate is on and stay still for viewers who prefer reduced motion.
- **Links:** the address keeps the current gradient; Copy link reopens it exactly.

## How it draws

`core.js` holds a WebGL fragment shader:

- **Point patterns** blend the colours with Gaussian weights in linear light, after warping each pixel with simplex noise.
- **Ramp patterns** compute a brightness field and map it through the colours in order.
- **Glass** changes where each pixel samples the gradient (each strip or tile is a small lens), then shades the edges.
- **Animation** moves the noise and points along closed loops, driven by a phase from 0 to 2π, so every animation loops seamlessly.
- **Grain** is added per pixel last.
