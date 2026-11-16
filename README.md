# Gradient Creator

A small web tool for mesh, flow and swirl gradients with grain, exported as PNG or JPEG at any size.

Open `index.html` in a browser (or serve the folder, for example `python3 -m http.server`). No build step and no dependencies.

## What it does

- **Types:** Mesh (soft blends between colour points), Flow (domain-warped, flowing bands) and Swirl (a twist around the centre).
- **Colours:** 2 to 6 colour points. Drag the rings on the canvas to move them; pick each colour beside its hex value.
- **Sliders:** softness, warp, warp scale, swirl and grain. Shuffle moves the points and changes the noise.
- **Presets:** twelve four-colour palettes (Iridescent cloud, Opal, Lagoon, Emerald, Solar flare, Orchid, Peach glow, Electric tide, Sunset, Mint ice, Midnight bloom, Rose gold).
- **Export:** square, Full HD, 4K, phone, MacBook Pro or a custom size, drawn by the same shader as the preview, so it's sharp at any size.
- **Links:** the address keeps the current gradient; Copy link reopens it exactly.

## How it draws

A WebGL fragment shader blends the colours with Gaussian weights in linear light, after warping each pixel's position with simplex noise (one layer for Mesh, two for Flow and Swirl) and twisting it around the centre. Grain is added per pixel last.
