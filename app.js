(() => {
  const MAX_DIMENSION = 256;
  const MAX_IMAGE_PIXELS = 40_000_000;
  const elements = {
    dropzone: document.querySelector('#dropzone'),
    fileInput: document.querySelector('#file-input'),
    imageInfo: document.querySelector('#image-info'),
    imageThumb: document.querySelector('#image-thumb'),
    imageName: document.querySelector('#image-name'),
    imageSize: document.querySelector('#image-size'),
    removeImage: document.querySelector('#remove-image'),
    columns: document.querySelector('#columns'),
    rows: document.querySelector('#rows'),
    quickSize: document.querySelector('#quick-size'),
    quickSizeLabel: document.querySelector('#quick-size-label'),
    fitMode: document.querySelector('#fit-mode'),
    fitNote: document.querySelector('#fit-note'),
    resetGrid: document.querySelector('#reset-grid'),
    previewCanvas: document.querySelector('#preview-canvas'),
    emptyState: document.querySelector('#empty-state'),
    gridSize: document.querySelector('#grid-size'),
    cellCount: document.querySelector('#cell-count'),
    canvasLive: document.querySelector('#canvas-live'),
    canvasCaption: document.querySelector('#canvas-caption-text'),
    copyGrid: document.querySelector('#copy-grid'),
    downloadImage: document.querySelector('#download-image'),
    toast: document.querySelector('#toast')
  };
  const previewContext = elements.previewCanvas.getContext('2d', { alpha: false });
  const sampleCanvas = document.createElement('canvas');
  const sampleContext = sampleCanvas.getContext('2d', { willReadFrequently: true });

  let sourceImage = null;
  let sourceUrl = null;
  let sourceName = '';
  let toastTimer = 0;

  elements.dropzone.addEventListener('click', () => elements.fileInput.click());
  elements.fileInput.addEventListener('change', () => {
    if (elements.fileInput.files && elements.fileInput.files[0]) {
      loadImageFile(elements.fileInput.files[0]);
    }
    elements.fileInput.value = '';
  });
  elements.removeImage.addEventListener('click', clearImage);
  elements.columns.addEventListener('input', () => updateGrid('columns'));
  elements.rows.addEventListener('input', () => updateGrid('rows'));
  elements.quickSize.addEventListener('input', () => {
    const size = Number(elements.quickSize.value);
    elements.columns.value = size;
    elements.rows.value = size;
    renderGrid();
  });
  elements.fitMode.addEventListener('change', () => {
    updateFitNote();
    renderGrid();
  });
  elements.resetGrid.addEventListener('click', () => {
    elements.columns.value = 32;
    elements.rows.value = 32;
    elements.quickSize.value = 32;
    renderGrid();
  });
  elements.copyGrid.addEventListener('click', copyGridData);
  elements.downloadImage.addEventListener('click', downloadPng);

  document.addEventListener('paste', (event) => {
    const items = event.clipboardData && event.clipboardData.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) loadImageFile(file, 'Pasted image');
        return;
      }
    }
  });

  for (const eventName of ['dragenter', 'dragover']) {
    elements.dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      elements.dropzone.classList.add('is-dragging');
    });
  }
  for (const eventName of ['dragleave', 'drop']) {
    elements.dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      elements.dropzone.classList.remove('is-dragging');
    });
  }
  elements.dropzone.addEventListener('drop', (event) => {
    const file = event.dataTransfer && event.dataTransfer.files[0];
    if (file) loadImageFile(file);
  });
  document.addEventListener('dragover', (event) => event.preventDefault());
  document.addEventListener('drop', (event) => event.preventDefault());

  function updateGrid(changedDimension) {
    const columns = normalizeDimension(elements.columns);
    const rows = normalizeDimension(elements.rows);
    if (changedDimension === 'columns' && columns === rows) elements.quickSize.value = columns;
    if (changedDimension === 'rows' && columns === rows) elements.quickSize.value = columns;
    renderGrid();
  }

  function normalizeDimension(input) {
    const parsed = Number.parseInt(input.value, 10);
    const value = Number.isFinite(parsed) ? Math.min(MAX_DIMENSION, Math.max(1, parsed)) : 1;
    input.value = value;
    return value;
  }

  function loadImageFile(file, fallbackName) {
    if (!file.type.startsWith('image/')) {
      showToast('Choose a supported image file.');
      return;
    }
    const nextUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      if (image.naturalWidth * image.naturalHeight > MAX_IMAGE_PIXELS) {
        URL.revokeObjectURL(nextUrl);
        showToast('This image is very large. Choose an image under 40 megapixels.');
        return;
      }
      if (sourceUrl) URL.revokeObjectURL(sourceUrl);
      sourceUrl = nextUrl;
      sourceImage = image;
      sourceName = fallbackName || file.name || 'Pasted image';
      elements.imageThumb.style.backgroundImage = `url("${sourceUrl}")`;
      elements.imageName.textContent = sourceName;
      elements.imageSize.textContent = `${image.naturalWidth} × ${image.naturalHeight} px`;
      elements.imageInfo.hidden = false;
      elements.dropzone.hidden = true;
      elements.canvasCaption.textContent = 'Preview ready';
      renderGrid();
      showToast('Image loaded — adjust your grid anytime.');
    };
    image.onerror = () => {
      URL.revokeObjectURL(nextUrl);
      showToast('That image could not be opened. Try another file.');
    };
    image.src = nextUrl;
  }

  function clearImage() {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    sourceUrl = null;
    sourceImage = null;
    sourceName = '';
    elements.imageInfo.hidden = true;
    elements.dropzone.hidden = false;
    elements.previewCanvas.hidden = true;
    elements.emptyState.hidden = false;
    elements.canvasLive.classList.remove('active');
    elements.canvasCaption.textContent = 'Waiting for an image';
    elements.copyGrid.disabled = true;
    elements.downloadImage.disabled = true;
  }

  function renderGrid() {
    const columns = normalizeDimension(elements.columns);
    const rows = normalizeDimension(elements.rows);
    elements.gridSize.textContent = `${columns} × ${rows}`;
    elements.quickSizeLabel.textContent = `${columns} × ${rows}`;
    elements.cellCount.textContent = `${(columns * rows).toLocaleString()} ${columns * rows === 1 ? 'cell' : 'cells'}`;
    elements.quickSize.value = String(Math.min(128, Math.max(8, Math.round(Math.max(columns, rows) / 8) * 8)));
    if (!sourceImage) return;

    sampleCanvas.width = columns;
    sampleCanvas.height = rows;
    sampleContext.imageSmoothingEnabled = true;
    sampleContext.imageSmoothingQuality = 'high';
    sampleContext.clearRect(0, 0, columns, rows);
    drawFittedImage(sampleContext, sourceImage, columns, rows, elements.fitMode.value);

    elements.previewCanvas.width = columns;
    elements.previewCanvas.height = rows;
    previewContext.imageSmoothingEnabled = false;
    previewContext.drawImage(sampleCanvas, 0, 0);

    elements.previewCanvas.hidden = false;
    elements.emptyState.hidden = true;
    elements.canvasLive.classList.add('active');
    elements.canvasCaption.textContent = `Showing ${columns * rows} image cells`;
    elements.copyGrid.disabled = false;
    elements.downloadImage.disabled = false;
  }

  function drawFittedImage(context, image, width, height, fit) {
    if (fit === 'stretch') {
      context.drawImage(image, 0, 0, width, height);
      return;
    }
    const scale = fit === 'contain'
      ? Math.min(width / image.naturalWidth, height / image.naturalHeight)
      : Math.max(width / image.naturalWidth, height / image.naturalHeight);
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    const x = (width - drawWidth) / 2;
    const y = (height - drawHeight) / 2;
    if (fit === 'contain') {
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);
    }
    context.drawImage(image, x, y, drawWidth, drawHeight);
  }

  function updateFitNote() {
    const notes = {
      cover: 'Fills the grid edge to edge; some edges may be cropped.',
      contain: 'Keeps the whole image; blank space is filled with white.',
      stretch: 'Fills the grid exactly; the image may look distorted.'
    };
    elements.fitNote.textContent = notes[elements.fitMode.value];
  }

  async function copyGridData() {
    if (!sourceImage) return;
    try {
      const { width, height } = elements.previewCanvas;
      const pixels = previewContext.getImageData(0, 0, width, height).data;
      const colors = [];
      for (let y = 0; y < height; y++) {
        const row = [];
        for (let x = 0; x < width; x++) {
          const index = (y * width + x) * 4;
          row.push(`#${[pixels[index], pixels[index + 1], pixels[index + 2]]
            .map((channel) => channel.toString(16).padStart(2, '0')).join('')}`);
        }
        colors.push(row);
      }
      const data = JSON.stringify({ columns: width, rows: height, colors }, null, 2);
      await navigator.clipboard.writeText(data);
      showToast('Grid color data copied to clipboard.');
    } catch (error) {
      showToast('Could not access the clipboard. Try exporting the PNG instead.');
    }
  }

  function downloadPng() {
    if (!sourceImage) return;
    elements.previewCanvas.toBlob((blob) => {
      if (!blob) {
        showToast('Could not export this preview.');
        return;
      }
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `grid-${elements.previewCanvas.width}x${elements.previewCanvas.height}.png`;
      link.click();
      URL.revokeObjectURL(link.href);
      showToast('PNG preview exported.');
    }, 'image/png');
  }

  function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => elements.toast.classList.remove('show'), 2600);
  }

  updateFitNote();
  renderGrid();
})();
