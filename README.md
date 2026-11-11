# Grid Studio

A standalone, browser-based image-to-grid preview app. Upload, drag in, or paste an image, adjust the grid size and image fit, then export a PNG preview or copy the cell colors as JSON. Everything is processed locally in your browser; images are not uploaded.

## Run it

Open `index.html` in a modern browser. No install, build step, server, or external runtime dependency is required.

## Use it

1. Choose an image, drop it onto the upload area, or paste one with **Ctrl+V**.
2. Set columns and rows directly, or use the quick-size slider.
3. Choose how the image fits the grid: crop to fill, contain the full image, or stretch.
4. Export the rendered grid as a PNG or copy the sampled cell colors as JSON.

Grid dimensions are limited to 256 cells per side. The preview resamples the source image with high-quality smoothing and then displays each resulting cell as a crisp pixel.
