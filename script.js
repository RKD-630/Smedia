/**
 * DocScan Pro - Core Logic
 */

// --- Global State ---
let cvReady = false;
let stream = null;
let currentView = 'welcome';
let originalImage = null; // Currently editing original image
let processedImage = null; // Currently editing processed image
let documentPages = []; // Array of processed image data URLs
let editIndex = -1; // -1 for new scan, else index in documentPages
let cropPoints = []; // [{x, y}, ...] 4 corners
let filters = {
    brightness: 100,
    contrast: 100,
    sharpness: 0,
    filter: 'original'
};

// --- View Navigation ---
const views = {
    welcome: document.getElementById('view-welcome'),
    scanner: document.getElementById('view-scanner'),
    editor: document.getElementById('view-editor'),
    list: document.getElementById('view-list'),
    export: document.getElementById('view-export'),
    success: document.getElementById('view-success'),
    ocr: document.getElementById('view-ocr')
};

function switchView(target) {
    Object.keys(views).forEach(v => views[v].classList.remove('active'));
    views[target].classList.add('active');
    currentView = target;

    // Handle specific view entrance logic
    if (target === 'scanner') {
        startCamera();
    } else {
        stopCamera();
    }
}

// --- Initialization ---
function onOpenCvReady() {
    console.log('OpenCV.js is ready.');
    cvReady = true;
    document.getElementById('loader-text').textContent = 'OpenCV Loaded';
    setTimeout(() => hideLoader(), 500);
}

document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    initEventListeners();
});

function initEventListeners() {
    // Welcome
    document.getElementById('btn-request-permission').addEventListener('click', requestCameraPermission);
    document.getElementById('btn-import-gallery-initial').addEventListener('click', () => document.getElementById('file-input-initial').click());
    document.getElementById('file-input-initial').addEventListener('change', handleInitialImport);

    // Scanner
    document.getElementById('shutter-btn').addEventListener('click', captureFrame);
    document.querySelector('.close-scanner').addEventListener('click', () => switchView('welcome'));
    document.getElementById('btn-view-list-from-scanner').addEventListener('click', () => switchView('list'));

    // Editor Tabs
    document.querySelectorAll('.tool-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const targetTab = e.currentTarget.dataset.tab;
            document.querySelectorAll('.tool-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            e.currentTarget.classList.add('active');
            document.getElementById(`tab-${targetTab}`).classList.add('active');
        });
    });

    // Editor Actions
    document.getElementById('btn-save-page').addEventListener('click', saveEditedPage);
    document.getElementById('btn-cancel-edit').addEventListener('click', () => switchView(documentPages.length > 0 ? 'list' : 'scanner'));
    document.getElementById('btn-rotate').addEventListener('click', rotateImage);
    document.getElementById('btn-reset-crop').addEventListener('click', resetCrop);

    // Filters
    document.querySelectorAll('.filter-option').forEach(opt => {
        opt.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-option').forEach(o => o.classList.remove('active'));
            e.currentTarget.classList.add('active');
            filters.filter = e.currentTarget.dataset.filter;
            applyFilters();
        });
    });

    // Adjustments
    const adjBrightness = document.getElementById('adj-brightness');
    const adjContrast = document.getElementById('adj-contrast');
    
    adjBrightness.addEventListener('input', (e) => {
        filters.brightness = e.target.value;
        applyFilters();
    });
    adjContrast.addEventListener('input', (e) => {
        filters.contrast = e.target.value;
        applyFilters();
    });

    // List View
    document.getElementById('btn-back-to-scanner').addEventListener('click', () => switchView('scanner'));
    document.getElementById('btn-prepare-pdf').addEventListener('click', () => switchView('export'));
    document.getElementById('btn-add-more').addEventListener('click', () => switchView('scanner'));

    // Export View
    document.getElementById('btn-back-to-list').addEventListener('click', () => switchView('list'));
    document.getElementById('btn-generate-pdf').addEventListener('click', generatePDF);

    // Success View
    document.getElementById('btn-download').addEventListener('click', downloadLastPDF);
    document.getElementById('btn-share').addEventListener('click', shareLastPDF);
    document.getElementById('btn-reset-app').addEventListener('click', resetApp);

    // OCR View
    document.getElementById('btn-close-ocr').addEventListener('click', () => switchView('list'));
    document.getElementById('btn-copy-ocr').addEventListener('click', copyOCRText);
    document.getElementById('btn-save-as-txt').addEventListener('click', downloadOCRText);
}

// --- Camera Logic ---
async function requestCameraPermission() {
    showLoader('Initializing camera...');
    try {
        const checkStream = await navigator.mediaDevices.getUserMedia({ video: true });
        checkStream.getTracks().forEach(track => track.stop());
        switchView('scanner');
    } catch (err) {
        console.error("Camera error:", err);
        document.getElementById('permission-denied').classList.remove('hidden');
        hideLoader();
    }
}

async function startCamera() {
    const video = document.getElementById('camera-preview');
    try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
        });
        video.srcObject = stream;
        video.onloadedmetadata = () => {
            video.play();
            startDetectionLoop();
        };
    } catch (err) {
        console.error("Failed to start camera:", err);
    }
}

function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
}

// --- Frame Capture & Import ---
function captureFrame() {
    const video = document.getElementById('camera-preview');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    
    processCapturedImage(canvas.toDataURL('image/jpeg', 0.95));
}

function handleInitialImport(e) {
    const files = e.target.files;
    if (!files.length) return;
    
    showLoader('Importing images...');
    let loadedCount = 0;
    
    Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
            // For now, we take the first one to edit, or add all if batch scanning was fully implemented
            if (loadedCount === 0) {
                processCapturedImage(event.target.result);
            } else {
                documentPages.push(event.target.result);
                updateBadge();
            }
            loadedCount++;
            if (loadedCount === files.length) hideLoader();
        };
        reader.readAsDataURL(file);
    });
}

function processCapturedImage(dataUrl) {
    const img = new Image();
    img.onload = () => {
        originalImage = img;
        editIndex = -1;
        initEditor();
        switchView('editor');
    };
    img.src = dataUrl;
}

// --- OpenCV Detection Loop (Simplified for Web) ---
let isDetecting = false;
function startDetectionLoop() {
    isDetecting = true;
    const video = document.getElementById('camera-preview');
    const canvas = document.getElementById('detection-overlay');
    const ctx = canvas.getContext('2d');
    
    const loop = () => {
        if (!isDetecting || currentView !== 'scanner') return;
        
        canvas.width = video.offsetWidth;
        canvas.height = video.offsetHeight;
        
        // Dynamic guide drawing (real detection would happen here with cv.Mat)
        // For performance in browser without WASM threading, we use pulse guide
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Mock detection overlay
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
        ctx.lineWidth = 4;
        ctx.setLineDash([10, 5]);
        
        const pad = 40;
        ctx.strokeRect(pad, pad, canvas.width - pad*2, canvas.height - pad*2);
        
        requestAnimationFrame(loop);
    };
    loop();
}

// --- Editor Logic ---
function initEditor() {
    const canvas = document.getElementById('editor-canvas');
    const ctx = canvas.getContext('2d');
    
    // Scale for display
    const maxDim = window.innerHeight * 0.5;
    const ratio = Math.min(maxDim / originalImage.width, maxDim / originalImage.height);
    
    canvas.width = originalImage.width * ratio;
    canvas.height = originalImage.height * ratio;
    
    ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);
    
    // Initial crop handles (Auto-detection simulation)
    const w = canvas.width;
    const h = canvas.height;
    cropPoints = [
        { x: w * 0.1, y: h * 0.1 },
        { x: w * 0.9, y: h * 0.1 },
        { x: w * 0.9, y: h * 0.9 },
        { x: w * 0.1, y: h * 0.9 }
    ];
    
    renderCropHandles();
    applyFilters(); // Apply current filter settings
}

function renderCropHandles() {
    const container = document.getElementById('crop-handles');
    container.innerHTML = '';
    
    cropPoints.forEach((p, i) => {
        const handle = document.createElement('div');
        handle.className = 'crop-handle';
        handle.style.left = `${p.x}px`;
        handle.style.top = `${p.y}px`;
        
        // Touch Draggable
        let isDragging = false;
        const onMove = (e) => {
            if (!isDragging) return;
            const touch = e.touches ? e.touches[0] : e;
            const b = document.getElementById('crop-container').getBoundingClientRect();
            const canvas = document.getElementById('editor-canvas').getBoundingClientRect();
            
            // Constrain within canvas
            let nx = touch.clientX - canvas.left;
            let ny = touch.clientY - canvas.top;
            
            nx = Math.max(0, Math.min(nx, canvas.width));
            ny = Math.max(0, Math.min(ny, canvas.height));
            
            p.x = nx;
            p.y = ny;
            handle.style.left = `${nx}px`;
            handle.style.top = `${ny}px`;
            drawCropOverlay();
        };
        
        handle.addEventListener('touchstart', () => isDragging = true);
        window.addEventListener('touchmove', onMove);
        window.addEventListener('touchend', () => isDragging = false);
        
        container.appendChild(handle);
    });
    
    drawCropOverlay();
}

function drawCropOverlay() {
    const canvas = document.getElementById('editor-canvas');
    // We actually need a separate overlay canvas for the lines to avoid destroying filtered image
    // For simplicity, we just use the detection-overlay temporarily or redraw logic
    // In this premium version, filters are applied to a temp canvas
}

function applyFilters() {
    const canvas = document.getElementById('editor-canvas');
    const ctx = canvas.getContext('2d');
    
    ctx.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%)`;
    
    if (filters.filter === 'bw') {
        ctx.filter += ' grayscale(100%)';
    } else if (filters.filter === 'magic') {
        ctx.filter += ' saturate(1.5) contrast(1.1)';
    } else if (filters.filter === 'enhance') {
        ctx.filter += ' contrast(1.5) grayscale(100%) brightness(1.2)';
    }
    
    ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);
}

function rotateImage() {
    // Logic to rotate original image and redraw
    const offCanvas = document.createElement('canvas');
    offCanvas.width = originalImage.height;
    offCanvas.height = originalImage.width;
    const ctx = offCanvas.getContext('2d');
    ctx.translate(offCanvas.width / 2, offCanvas.height / 2);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(originalImage, -originalImage.width / 2, -originalImage.height / 2);
    
    const newImg = new Image();
    newImg.onload = () => {
        originalImage = newImg;
        initEditor();
    };
    newImg.src = offCanvas.toDataURL();
}

function resetCrop() {
    initEditor();
}

async function saveEditedPage() {
    showLoader('Applying corections...');
    
    // Perspective Transform Logic using OpenCV (if ready)
    let finalDataUrl;
    
    if (cvReady) {
        try {
            const src = cv.imread(originalImage);
            const dst = new cv.Mat();
            
            // Map crop points to original coords
            const canvas = document.getElementById('editor-canvas');
            const scaleX = originalImage.width / canvas.width;
            const scaleY = originalImage.height / canvas.height;
            
            const p1 = [cropPoints[0].x * scaleX, cropPoints[0].y * scaleY];
            const p2 = [cropPoints[1].x * scaleX, cropPoints[1].y * scaleY];
            const p3 = [cropPoints[2].x * scaleX, cropPoints[2].y * scaleY];
            const p4 = [cropPoints[3].x * scaleX, cropPoints[3].y * scaleY];
            
            // Calculate output size (width of top/bottom max)
            const w = Math.max(
                Math.hypot(p2[0]-p1[0], p2[1]-p1[1]),
                Math.hypot(p3[0]-p4[0], p3[1]-p4[1])
            );
            const h = Math.max(
                Math.hypot(p1[0]-p4[0], p1[1]-p4[1]),
                Math.hypot(p2[0]-p3[0], p2[1]-p3[1])
            );

            let srcCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [...p1, ...p2, ...p3, ...p4]);
            let dstCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, w, 0, w, h, 0, h]);
            
            let M = cv.getPerspectiveTransform(srcCoords, dstCoords);
            cv.warpPerspective(src, dst, M, new cv.Size(w, h));
            
            // Render result to canvas to apply filters
            const tempCanvas = document.createElement('canvas');
            cv.imshow(tempCanvas, dst);
            
            // Re-apply filters to perspective corrected image
            const finalCanvas = document.createElement('canvas');
            finalCanvas.width = w;
            finalCanvas.height = h;
            const finalCtx = finalCanvas.getContext('2d');
            
            finalCtx.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%)`;
            if (filters.filter === 'bw') finalCtx.filter += ' grayscale(100%)';
            if (filters.filter === 'magic') finalCtx.filter += ' saturate(1.5) contrast(1.1)';
            if (filters.filter === 'enhance') finalCtx.filter += ' contrast(1.8) grayscale(100%) brightness(1.2)';
            
            finalCtx.drawImage(tempCanvas, 0, 0);
            finalDataUrl = finalCanvas.toDataURL('image/jpeg', 0.85);
            
            src.delete(); dst.delete(); srcCoords.delete(); dstCoords.delete(); M.delete();
        } catch (e) {
            console.warn("CV Processing failed, fallback to basic save:", e);
            finalDataUrl = document.getElementById('editor-canvas').toDataURL('image/jpeg', 0.8);
        }
    } else {
        finalDataUrl = document.getElementById('editor-canvas').toDataURL('image/jpeg', 0.8);
    }
    
    documentPages.push(finalDataUrl);
    updateBadge();
    renderPages();
    hideLoader();
    switchView('list');
}

// --- List View Logic ---
function renderPages() {
    const container = document.getElementById('document-pages');
    container.innerHTML = '';
    
    documentPages.forEach((p, i) => {
        const card = document.createElement('div');
        card.className = 'page-card';
        card.innerHTML = `
            <img src="${p}">
            <div class="page-badge">${i + 1}</div>
            <div class="page-actions">
                <button class="icon-btn" title="OCR Text" onclick="performOCR(${i})"><i data-lucide="languages"></i></button>
                <button class="icon-btn" title="Delete" onclick="deletePage(${i})"><i data-lucide="trash-2"></i></button>
            </div>
        `;
        container.appendChild(card);
    });
    lucide.createIcons();
}

function deletePage(i) {
    documentPages.splice(i, 1);
    renderPages();
    updateBadge();
}

function updateBadge() {
    const badge = document.getElementById('page-count-badge');
    badge.textContent = documentPages.length;
    badge.classList.toggle('hidden', documentPages.length === 0);
}

// --- PDF Generation Logic ---
let lastPDFBlob = null;

async function generatePDF() {
    if (documentPages.length === 0) return;
    
    showLoader('Generating your PDF...');
    
    const { jsPDF } = window.jspdf;
    const format = document.getElementById('pdf-size').value;
    const orientation = document.getElementById('pdf-orientation').value;
    const quality = parseFloat(document.getElementById('pdf-quality').value);
    
    const doc = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: format === 'auto' ? 'a4' : format
    });

    for (let i = 0; i < documentPages.length; i++) {
        if (i > 0) doc.addPage();
        
        const imgData = documentPages[i];
        
        // Calculate dimensions to fit aspect ratio
        const imgProps = doc.getImageProperties(imgData);
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        
        const margin = 5;
        const maxWidth = pageWidth - margin * 2;
        const maxHeight = pageHeight - margin * 2;
        
        const ratio = Math.min(maxWidth / imgProps.width, maxHeight / imgProps.height);
        const w = imgProps.width * ratio;
        const h = imgProps.height * ratio;
        const x = (pageWidth - w) / 2;
        const y = (pageHeight - h) / 2;
        
        doc.addImage(imgData, 'JPEG', x, y, w, h, undefined, 'FAST');
    }

    lastPDFBlob = doc.output('blob');
    
    // Success view summary
    const sizeMB = (lastPDFBlob.size / (1024 * 1024)).toFixed(1);
    document.getElementById('pdf-summary').textContent = `${documentPages.length} Pages • ${sizeMB} MB`;
    
    hideLoader();
    switchView('success');
}

function downloadLastPDF() {
    const name = document.getElementById('pdf-filename').value || 'Scanned_Doc';
    const link = document.createElement('a');
    link.href = URL.createObjectURL(lastPDFBlob);
    link.download = `${name}.pdf`;
    link.click();
}

async function shareLastPDF() {
    if (navigator.share && lastPDFBlob) {
        const name = document.getElementById('pdf-filename').value || 'Scanned_Doc';
        const file = new File([lastPDFBlob], `${name}.pdf`, { type: 'application/pdf' });
        try {
            await navigator.share({
                files: [file],
                title: 'Scanned Document',
                text: 'Sharing my scanned document via DocScan Pro'
            });
        } catch (err) {
            console.log("Sharing failed:", err);
        }
    } else {
        alert("Sharing is not supported on this browser. Please Download instead.");
    }
}

// --- OCR Logic ---
async function performOCR(index) {
    const imageData = documentPages[index];
    switchView('ocr');
    document.getElementById('ocr-text-view').value = '';
    showLoader('Recognizing text...');
    
    try {
        const worker = await Tesseract.createWorker('eng');
        const ret = await worker.recognize(imageData);
        document.getElementById('ocr-text-view').value = ret.data.text;
        await worker.terminate();
    } catch (err) {
        console.error("OCR failed:", err);
        document.getElementById('ocr-text-view').value = "Failed to recognize text. Please try a clearer scan.";
    } finally {
        hideLoader();
    }
}

function copyOCRText() {
    const text = document.getElementById('ocr-text-view');
    text.select();
    document.execCommand('copy');
    alert("Text copied to clipboard!");
}

function downloadOCRText() {
    const text = document.getElementById('ocr-text-view').value;
    const blob = new Blob([text], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'scanned_text.txt';
    link.click();
}

// --- Utils ---
function showLoader(text = 'Processing...') {
    document.getElementById('loader-text').textContent = text;
    document.getElementById('global-loader').classList.remove('hidden');
}

function hideLoader() {
    document.getElementById('global-loader').classList.add('hidden');
}

function resetApp() {
    documentPages = [];
    updateBadge();
    document.getElementById('file-input-initial').value = '';
    switchView('welcome');
}
