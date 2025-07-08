  document.addEventListener('DOMContentLoaded', () => {
    ScapeJs.updateConfig({
        type: 'image',
        imageUrl: 'logo.ico',
        count: 25,
        size: 40,
        spacing: 120,
        minDistance: 50,
        animationDuration: '4s',
        floatDistance: 20,
        rotationRange: -45.5,
        opacity: 0.8
    });
  });

// DOM Elements
const upload = document.getElementById('upload');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const stickers = document.getElementById('stickers');
const rowsInput = document.getElementById('rows');
const colsInput = document.getElementById('cols');
const stickerWidthInput = document.getElementById('stickerWidth');
const stickerHeightInput = document.getElementById('stickerHeight');
const xOffsetInput = document.getElementById('xOffset');
const yOffsetInput = document.getElementById('yOffset');
const splitBtn = document.getElementById('splitBtn');
const downloadAllBtn = document.getElementById('downloadAllBtn');
const previewBtn = document.getElementById('previewBtn');
const resetBtn = document.getElementById('resetBtn');
const gridOverlay = document.getElementById('gridOverlay');
const loadingIndicator = document.getElementById('loadingIndicator');
const fileName = document.getElementById('fileName');
const bgColor = document.getElementById('bgColor');
const fileFormat = document.getElementById('fileFormat');
const filePrefix = document.getElementById('filePrefix');
const quality = document.getElementById('quality');
const qualityValue = document.getElementById('qualityValue');
const stickerCount = document.getElementById('stickerCount');
const selectAllBtn = document.getElementById('selectAllBtn');
const downloadSelectedBtn = document.getElementById('downloadSelectedBtn');
const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
const batchActions = document.getElementById('batchActions');

// State
let img = new Image();
let imgLoaded = false;
let stickerData = [];
let selectedStickers = new Set();

// Initialize
function init() {
  // Set up event listeners
  upload.addEventListener('change', handleFileUpload);
  splitBtn.addEventListener('click', splitImage);
  downloadAllBtn.addEventListener('click', downloadAllStickers);
  previewBtn.addEventListener('click', previewGrid);
  resetBtn.addEventListener('click', resetApp);
  quality.addEventListener('input', updateQualityValue);
  selectAllBtn.addEventListener('click', toggleSelectAll);
  downloadSelectedBtn.addEventListener('click', downloadSelectedStickers);
  deleteSelectedBtn.addEventListener('click', deleteSelectedStickers);

  // Drag and drop support
  document.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  document.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files.length) {
      upload.files = e.dataTransfer.files;
      handleFileUpload({ target: upload });
    }
  });

  // Update quality display
  updateQualityValue();
}

// File Upload Handler
function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  fileName.textContent = file.name;
  showLoading(true);

  const reader = new FileReader();
  reader.onload = () => {
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      imgLoaded = true;
      showLoading(false);
    };
    img.onerror = () => {
      showError('Failed to load image');
      showLoading(false);
    };
    img.src = reader.result;
  };
  reader.onerror = () => {
    showError('Failed to read file');
    showLoading(false);
  };
  reader.readAsDataURL(file);
}

// Split Image Function
async function splitImage() {
  if (!imgLoaded) {
    showError('Please upload an image first.');
    return;
  }

  const rows = parseInt(rowsInput.value);
  const cols = parseInt(colsInput.value);
  const xOffset = parseInt(xOffsetInput.value);
  const yOffset = parseInt(yOffsetInput.value);
  const cellWidth = parseInt(stickerWidthInput.value) || Math.floor((canvas.width - xOffset) / cols);
  const cellHeight = parseInt(stickerHeightInput.value) || Math.floor((canvas.height - yOffset) / rows);

  if (rows <= 0 || cols <= 0 || cellWidth <= 0 || cellHeight <= 0) {
    showError('Invalid grid configuration');
    return;
  }

  showLoading(true);
  stickers.innerHTML = '';
  stickerData = [];
  selectedStickers.clear();
  batchActions.classList.add('hidden');
  selectAllBtn.classList.add('hidden');

  try {
    // Use setTimeout to allow UI to update before heavy processing
    setTimeout(async () => {
      const format = fileFormat.value;
      const qualityValue = parseFloat(quality.value);
      const bgColorValue = bgColor.value;

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const offscreen = document.createElement('canvas');
          offscreen.width = cellWidth;
          offscreen.height = cellHeight;
          const octx = offscreen.getContext('2d');

          // Fill with background color first
          octx.fillStyle = bgColorValue;
          octx.fillRect(0, 0, cellWidth, cellHeight);

          // Draw the sticker
          octx.drawImage(
            canvas,
            xOffset + x * cellWidth,
            yOffset + y * cellHeight,
            cellWidth,
            cellHeight,
            0,
            0,
            cellWidth,
            cellHeight
          );

          // Generate data URL based on selected format
          let imgURL;
          if (format === 'jpeg') {
            imgURL = offscreen.toDataURL('image/jpeg', qualityValue);
          } else if (format === 'webp') {
            imgURL = offscreen.toDataURL('image/webp', qualityValue);
          } else {
            imgURL = offscreen.toDataURL('image/png');
          }

          const filename = `${filePrefix.value}_${y + 1}_${x + 1}.${format}`;
          const id = `sticker-${y}-${x}`;
          stickerData.push({ imgURL, filename, id });

          createStickerElement(imgURL, filename, id, y, x);
        }
      }

      updateStickerCount();
      showLoading(false);
    }, 100);
  } catch (error) {
    showError('Error processing image: ' + error.message);
    showLoading(false);
  }
}

// Create Sticker Element
function createStickerElement(imgURL, filename, id, y, x) {
  const wrapper = document.createElement('div');
  wrapper.className = 'relative group';
  wrapper.dataset.id = id;

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = `select-${id}`;
  checkbox.className = 'absolute top-2 left-2 z-10 hidden group-hover:block checked:block';
  checkbox.addEventListener('change', (e) => {
    if (e.target.checked) {
      selectedStickers.add(id);
    } else {
      selectedStickers.delete(id);
    }
    updateBatchActions();
  });

  const label = document.createElement('label');
  label.htmlFor = `select-${id}`;
  label.className = 'absolute inset-0 cursor-pointer z-20';

  const a = document.createElement('a');
  a.href = imgURL;
  a.download = filename;
  a.className = 'block';
  a.innerHTML = `
        <img src="${imgURL}" class="sticker-preview w-full h-auto border rounded-md shadow" />
        <div class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 text-center truncate">
          ${filename}
        </div>
      `;

  wrapper.appendChild(checkbox);
  wrapper.appendChild(label);
  wrapper.appendChild(a);
  stickers.appendChild(wrapper);
}

// Download All Stickers
async function downloadAllStickers() {
  if (stickerData.length === 0) {
    showError('No stickers to download. Split an image first.');
    return;
  }

  showLoading(true);

  try {
    const zip = new JSZip();
    const folder = zip.folder("stickers");

    for (const { imgURL, filename } of stickerData) {
      const base64Data = imgURL.split(',')[1];
      folder.file(filename, base64Data, { base64: true });
    }

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, 'stickers.zip');
    showLoading(false);
  } catch (error) {
    showError('Error creating zip file: ' + error.message);
    showLoading(false);
  }
}

// Download Selected Stickers
async function downloadSelectedStickers() {
  if (selectedStickers.size === 0) {
    showError('No stickers selected');
    return;
  }

  showLoading(true);

  try {
    const zip = new JSZip();
    const folder = zip.folder("selected_stickers");

    for (const id of selectedStickers) {
      const sticker = stickerData.find(s => s.id === id);
      if (sticker) {
        const base64Data = sticker.imgURL.split(',')[1];
        folder.file(sticker.filename, base64Data, { base64: true });
      }
    }

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, 'selected_stickers.zip');
    showLoading(false);
  } catch (error) {
    showError('Error creating zip file: ' + error.message);
    showLoading(false);
  }
}

// Delete Selected Stickers
function deleteSelectedStickers() {
  if (selectedStickers.size === 0) {
    showError('No stickers selected');
    return;
  }

  for (const id of selectedStickers) {
    const element = document.querySelector(`[data-id="${id}"]`);
    if (element) {
      element.remove();
    }
    // Remove from stickerData
    stickerData = stickerData.filter(s => s.id !== id);
  }

  selectedStickers.clear();
  updateStickerCount();
  updateBatchActions();
}

// Toggle Select All
function toggleSelectAll() {
  const checkboxes = document.querySelectorAll('#stickers input[type="checkbox"]');
  const allSelected = Array.from(checkboxes).every(cb => cb.checked);

  checkboxes.forEach(cb => {
    cb.checked = !allSelected;
    const event = new Event('change');
    cb.dispatchEvent(event);
  });

  selectAllBtn.innerHTML = allSelected ?
    '<i class="fas fa-check-square"></i> Select All' :
    '<i class="fas fa-times"></i> Deselect All';
}

// Update Batch Actions Visibility
function updateBatchActions() {
  if (selectedStickers.size > 0) {
    batchActions.classList.remove('hidden');
  } else {
    batchActions.classList.add('hidden');
  }
}

// Update Sticker Count
function updateStickerCount() {
  const count = stickerData.length;
  stickerCount.textContent = `${count} sticker${count !== 1 ? 's' : ''}`;

  if (count > 0) {
    selectAllBtn.classList.remove('hidden');
  } else {
    selectAllBtn.classList.add('hidden');
  }
}

// Update Quality Value Display
function updateQualityValue() {
  qualityValue.textContent = `${Math.round(parseFloat(quality.value) * 100)}%`;
}

// Reset App
function resetApp() {
  upload.value = '';
  fileName.textContent = '';
  canvas.width = 0;
  canvas.height = 0;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  stickers.innerHTML = '';
  stickerData = [];
  selectedStickers.clear();
  imgLoaded = false;
  gridOverlay.innerHTML = '';
  gridOverlay.style.display = 'none';
  batchActions.classList.add('hidden');
  updateStickerCount();

  // Reset inputs to defaults
  rowsInput.value = '4';
  colsInput.value = '3';
  stickerWidthInput.value = '';
  stickerHeightInput.value = '';
  xOffsetInput.value = '0';
  yOffsetInput.value = '0';
  bgColor.value = '#ffffff';
  fileFormat.value = 'png';
  filePrefix.value = 'sticker';
  quality.value = '0.9';
  updateQualityValue();
}

// Show Loading Indicator
function showLoading(show) {
  if (show) {
    loadingIndicator.classList.remove('hidden');
    document.querySelector('.loading-spinner').style.display = 'inline-block';
  } else {
    loadingIndicator.classList.add('hidden');
    document.querySelector('.loading-spinner').style.display = 'none';
  }
}

// Show Error Message
function showError(message) {
  const existingAlert = document.querySelector('.alert-message');
  if (existingAlert) existingAlert.remove();

  const alert = document.createElement('div');
  alert.className = 'alert-message fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-md shadow-lg flex items-center space-x-2';
  alert.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>${message}</span>
      `;

  document.body.appendChild(alert);

  setTimeout(() => {
    alert.classList.add('opacity-0', 'transition-opacity', 'duration-300');
    setTimeout(() => alert.remove(), 300);
  }, 3000);
}

// Initialize the app
init();

function generatePrompt() {
  const prompt = "Convert the image into [NUMBER] digital stickers arranged in a [COLS]×[ROWS] grid. The stickers should follow a [STYLE]. Each sticker should feature a different expression or action, such as [LIST OF EXPRESSIONS/ACTIONS]. The set is intended for use as [USE CASE], with transparent background, uniform padding, and exported as high-resolution PNG."
  // copy prompt to users clipboard
  navigator.clipboard.writeText(prompt).then(() => {
    alert('Prompt copied to clipboard!');
  }).catch(() => {
    showError('Failed to copy prompt.');
  });
}