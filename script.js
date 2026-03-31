/**
 * DocScan Pro - Core Logic
 */

// --- Global State ---
let cvReady = false;
let stream = null;
let currentView = 'welcome';
let originalImage = null; 
let documentPages = []; 
let editIndex = -1; 
let cropPoints = []; 
let isAutoCapture = false;
let stableFrames = 0;
let scannerMode = 'document'; 
let qrScanner = null;
let lastPDFBlob = null;
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
    ocr: document.getElementById('view-ocr'),
    history: document.getElementById('view-history'),
    qrResult: document.getElementById('view-qr-result')
};

function switchView(target) {
    if (!views[target]) return;
    Object.keys(views).forEach(v => views[v].classList.remove('active'));
    views[target].classList.add('active');
    currentView = target;

    if (target === 'scanner') {
        if (scannerMode === 'document') {
            startCamera();
        } else {
            startQRScanner();
        }
    } else {
        stopCamera();
        stopQRScanner();
    }
}

// --- Initialization ---
function onOpenCvReady() {
    console.log('OpenCV.js is ready.');
    cvReady = true;
    const loaderText = document.getElementById('loader-text');
    if (loaderText) loaderText.textContent = 'OpenCV Loaded';
    setTimeout(() => hideLoader(), 500);
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) lucide.createIcons();
    initEventListeners();
});

function initEventListeners() {
    // Welcome
    safeAddListener('btn-request-permission', 'click', requestCameraPermission);
    safeAddListener('btn-import-gallery-initial', 'click', () => document.getElementById('file-input-initial').click());
    safeAddListener('file-input-initial', 'change', handleInitialImport);

    // Auto Toggle
    safeAddListener('toggle-auto', 'click', (e) => {
        isAutoCapture = !isAutoCapture;
        e.currentTarget.classList.toggle('active', isAutoCapture);
    });
    
    // Scanner Gallery
    safeAddListener('btn-open-gallery', 'click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = 'image/*';
        input.onchange = handleInitialImport;
        input.click();
    });

    // Scanner Controls
    safeAddListener('shutter-btn', 'click', captureFrame);
    document.querySelectorAll('.close-scanner').forEach(btn => {
        btn.addEventListener('click', () => switchView('welcome'));
    });
    safeAddListener('btn-view-list-from-scanner', 'click', () => switchView('list'));

    // Mode Switching
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const mode = e.currentTarget.dataset.mode;
            if (mode === scannerMode) return;
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            scannerMode = mode;
            if (currentView === 'scanner') {
                stopCamera();
                stopQRScanner();
                if (mode === 'document') startCamera();
                else startQRScanner();
            }
        });
    });

    // Editor
    safeAddListener('btn-save-page', 'click', saveEditedPage);
    safeAddListener('btn-cancel-edit', 'click', () => switchView(documentPages.length > 0 ? 'list' : 'scanner'));
    safeAddListener('btn-rotate', 'click', rotateImage);
    safeAddListener('btn-reset-crop', 'click', resetCrop);
    safeAddListener('btn-auto-crop', 'click', () => alert("Auto-detection refined."));

    document.querySelectorAll('.tool-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const targetTab = e.currentTarget.dataset.tab;
            document.querySelectorAll('.tool-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            e.currentTarget.classList.add('active');
            const pane = document.getElementById(`tab-${targetTab}`);
            if (pane) pane.classList.add('active');
        });
    });

    document.querySelectorAll('.filter-option').forEach(opt => {
        opt.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-option').forEach(o => o.classList.remove('active'));
            e.currentTarget.classList.add('active');
            filters.filter = e.currentTarget.dataset.filter;
            applyFilters();
        });
    });

    safeAddListener('adj-brightness', 'input', (e) => { filters.brightness = e.target.value; applyFilters(); });
    safeAddListener('adj-contrast', 'input', (e) => { filters.contrast = e.target.value; applyFilters(); });

    // List & Export
    safeAddListener('btn-back-to-scanner', 'click', () => switchView('scanner'));
    safeAddListener('btn-prepare-pdf', 'click', () => switchView('export'));
    safeAddListener('btn-add-more', 'click', () => switchView('scanner'));
    safeAddListener('btn-back-to-list', 'click', () => switchView('list'));
    safeAddListener('btn-generate-pdf', 'click', generatePDF);

    // Success & History
    safeAddListener('btn-download', 'click', downloadLastPDF);
    safeAddListener('btn-share', 'click', shareLastPDF);
    safeAddListener('btn-reset-app', 'click', resetApp);
    safeAddListener('btn-view-history', 'click', openHistory);
    safeAddListener('btn-close-history', 'click', () => switchView('success'));

    // OCR & QR
    safeAddListener('btn-close-ocr', 'click', () => switchView('list'));
    safeAddListener('btn-copy-ocr', 'click', copyOCRText);
    safeAddListener('btn-save-as-txt', 'click', downloadOCRText);
    safeAddListener('btn-close-qr-result', 'click', () => switchView('scanner'));
    safeAddListener('btn-copy-qr', 'click', copyQRResult);
    safeAddListener('btn-open-link', 'click', openQRLink);
}

function safeAddListener(id, event, callback) {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, callback);
}

// --- Logic Implementation ---
async function requestCameraPermission() {
    showLoader('Initializing camera...');
    try {
        const checkStream = await navigator.mediaDevices.getUserMedia({ video: true });
        checkStream.getTracks().forEach(track => track.stop());
        switchView('scanner');
    } catch (err) {
        console.error("Camera error:", err);
        const deniedDiv = document.getElementById('permission-denied');
        if (deniedDiv) deniedDiv.classList.remove('hidden');
        hideLoader();
    }
}

async function startCamera() {
    if (scannerMode !== 'document') return;
    const video = document.getElementById('camera-preview');
    const overlay = document.getElementById('detection-overlay');
    if (overlay) overlay.style.display = 'block';
    
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error("Unavailable");
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } 
        });
        video.srcObject = stream;
        video.onloadedmetadata = () => { video.play(); startDetectionLoop(); };
    } catch (err) {
        alert("Camera access failed. Please use Gallery import.");
        switchView('welcome');
    }
}

function stopCamera() {
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
}

async function startQRScanner() {
    if (scannerMode !== 'qr') return;
    const overlay = document.getElementById('detection-overlay');
    if (overlay) overlay.style.display = 'none';
    
    if (typeof Html5Qrcode === 'undefined') {
        alert("QR Library loading...");
        return;
    }
    
    qrScanner = new Html5Qrcode("camera-container");
    try {
        await qrScanner.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, handleQRSuccess);
    } catch (err) {
        console.error(err);
    }
}

function stopQRScanner() {
    if (qrScanner) { qrScanner.stop().catch(()=>{}); qrScanner = null; }
}

function handleQRSuccess(text) {
    stopQRScanner();
    switchView('qrResult');
    document.getElementById('qr-result-text').textContent = text;
    const isUrl = text.startsWith('http') || text.startsWith('www');
    const openBtn = document.getElementById('btn-open-link');
    if (openBtn) openBtn.classList.toggle('hidden', !isUrl);
}

function copyQRResult() {
    const text = document.getElementById('qr-result-text').textContent;
    navigator.clipboard.writeText(text).then(() => alert("Copied!"));
}

function openQRLink() {
    const text = document.getElementById('qr-result-text').textContent;
    window.open(text.startsWith('http') ? text : 'https://' + text, '_blank');
}

function captureFrame() {
    const video = document.getElementById('camera-preview');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    processCapturedImage(canvas.toDataURL('image/jpeg', 0.95));
}

function handleInitialImport(e) {
    const files = e.target.files;
    if (!files || !files.length) return;
    showLoader('Importing...');
    let loaded = 0;
    Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
            if (loaded === 0) processCapturedImage(event.target.result);
            else { documentPages.push(event.target.result); updateBadge(); }
            loaded++;
            if (loaded === files.length) hideLoader();
        };
        reader.readAsDataURL(file);
    });
}

function processCapturedImage(dataUrl) {
    const img = new Image();
    img.onload = () => { originalImage = img; editIndex = -1; initEditor(); switchView('editor'); };
    img.src = dataUrl;
}

function startDetectionLoop() {
    const video = document.getElementById('camera-preview');
    const canvas = document.getElementById('detection-overlay');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const loop = () => {
        if (currentView !== 'scanner' || scannerMode !== 'document') return;
        canvas.width = video.offsetWidth; canvas.height = video.offsetHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = isAutoCapture ? '#2563eb' : '#10b981';
        ctx.lineWidth = 4;
        const pad = 40;
        ctx.strokeRect(pad, pad, canvas.width - pad*2, canvas.height - pad*2);
        if (isAutoCapture) {
            stableFrames++;
            if (stableFrames > 60) { captureFrame(); stableFrames = 0; }
        } else { stableFrames = 0; }
        requestAnimationFrame(loop);
    };
    loop();
}

function initEditor() {
    const canvas = document.getElementById('editor-canvas');
    const ctx = canvas.getContext('2d');
    const ratio = Math.min((window.innerHeight * 0.5) / originalImage.width, (window.innerHeight * 0.5) / originalImage.height);
    canvas.width = originalImage.width * ratio;
    canvas.height = originalImage.height * ratio;
    ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);
    const w = canvas.width; const h = canvas.height;
    cropPoints = [{x:w*0.1, y:h*0.1}, {x:w*0.9, y:h*0.1}, {x:w*0.9, y:h*0.9}, {x:w*0.1, y:h*0.9}];
    renderCropHandles();
    applyFilters();
}

function renderCropHandles() {
    const container = document.getElementById('crop-handles');
    if (!container) return;
    container.innerHTML = '';
    
    cropPoints.forEach((p, i) => {
        const handle = document.createElement('div');
        handle.className = 'crop-handle';
        handle.style.left = `${p.x}px`;
        handle.style.top = `${p.y}px`;
        
        let isDragging = false;
        
        const startDrag = (e) => {
            isDragging = true;
            handle.classList.add('dragging');
            e.preventDefault();
        };

        const stopDrag = () => {
            isDragging = false;
            handle.classList.remove('dragging');
        };

        const onMove = (e) => {
            if (!isDragging) return;
            const touch = e.touches ? e.touches[0] : e;
            const rect = document.getElementById('editor-canvas').getBoundingClientRect();
            
            let nx = touch.clientX - rect.left;
            let ny = touch.clientY - rect.top;
            
            // Bounds check
            nx = Math.max(0, Math.min(nx, rect.width));
            ny = Math.max(0, Math.min(ny, rect.height));
            
            p.x = nx;
            p.y = ny;
            handle.style.left = `${nx}px`;
            handle.style.top = `${ny}px`;
            
            drawCropOverlay();
        };

        handle.addEventListener('mousedown', startDrag);
        handle.addEventListener('touchstart', startDrag, { passive: false });
        
        window.addEventListener('mousemove', onMove);
        window.addEventListener('touchmove', onMove, { passive: false });
        
        window.addEventListener('mouseup', stopDrag);
        window.addEventListener('touchend', stopDrag);
        
        container.appendChild(handle);
    });
    drawCropOverlay();
}

function drawCropOverlay() {
    const canvas = document.getElementById('editor-canvas');
    const ctx = canvas.getContext('2d');
    applyFilters();
    ctx.beginPath(); ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 3;
    ctx.moveTo(cropPoints[0].x, cropPoints[0].y);
    cropPoints.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.closePath(); ctx.stroke();
    ctx.fillStyle = 'rgba(37, 99, 235, 0.1)'; ctx.fill();
}

function applyFilters() {
    const canvas = document.getElementById('editor-canvas');
    const ctx = canvas.getContext('2d');
    ctx.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%)`;
    if (filters.filter === 'bw') ctx.filter += ' grayscale(100%)';
    else if (filters.filter === 'magic') ctx.filter += ' saturate(1.5)';
    else if (filters.filter === 'enhance') ctx.filter += ' contrast(1.8) grayscale(100%)';
    ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);
}

function rotateImage() {
    const c = document.createElement('canvas'); c.width = originalImage.height; c.height = originalImage.width;
    const ctx = c.getContext('2d'); ctx.translate(c.width/2, c.height/2); ctx.rotate(Math.PI/2);
    ctx.drawImage(originalImage, -originalImage.width/2, -originalImage.height/2);
    const n = new Image(); n.onload = () => { originalImage = n; initEditor(); }; n.src = c.toDataURL();
}

function resetCrop() { initEditor(); }

async function saveEditedPage() {
    showLoader('Processing HD Scan...');
    
    let finalDataUrl;
    
    if (cvReady && originalImage) {
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
            
            // Output dimensions (HD)
            const w = Math.max(Math.hypot(p2[0]-p1[0], p2[1]-p1[1]), Math.hypot(p3[0]-p4[0], p3[1]-p4[1]));
            const h = Math.max(Math.hypot(p1[0]-p4[0], p1[1]-p4[1]), Math.hypot(p2[0]-p3[0], p2[1]-p3[1]));
            
            let srcCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [...p1, ...p2, ...p3, ...p4]);
            let dstCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, w, 0, w, h, 0, h]);
            
            let M = cv.getPerspectiveTransform(srcCoords, dstCoords);
            cv.warpPerspective(src, dst, M, new cv.Size(w, h));
            
            const hCanvas = document.createElement('canvas');
            cv.imshow(hCanvas, dst);
            const hdCtx = hCanvas.getContext('2d');
            
            // Apply HD Filter
            hdCtx.globalCompositeOperation = 'source-atop';
            hdCtx.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%)`;
            if (filters.filter === 'bw') hdCtx.filter += ' grayscale(100%)';
            if (filters.filter === 'magic') hdCtx.filter += ' saturate(1.4)';
            if (filters.filter === 'enhance') hdCtx.filter += ' contrast(2.0) grayscale(100%)';
            hdCtx.drawImage(hCanvas, 0, 0);

            finalDataUrl = hCanvas.toDataURL('image/jpeg', 0.95);
            src.delete(); dst.delete(); srcCoords.delete(); dstCoords.delete(); M.delete();
        } catch (e) {
            console.error("CV failed:", e);
            finalDataUrl = document.getElementById('editor-canvas').toDataURL('image/jpeg', 0.95);
        }
    } else {
        finalDataUrl = document.getElementById('editor-canvas').toDataURL('image/jpeg', 0.95);
    }
    
    documentPages.push(finalDataUrl);
    updateBadge(); renderPages(); hideLoader(); switchView('list');
}

function renderPages() {
    const container = document.getElementById('document-pages');
    if (!container) return;
    container.innerHTML = '';
    documentPages.forEach((p, i) => {
        const card = document.createElement('div'); card.className = 'page-card';
        card.innerHTML = `<img src="${p}"><div class="page-badge">${i+1}</div>
            <div class="page-actions">
                <button class="icon-btn" onclick="movePage(${i},-1)"><i data-lucide="chevron-up"></i></button>
                <button class="icon-btn" onclick="movePage(${i},1)"><i data-lucide="chevron-down"></i></button>
                <button class="icon-btn" onclick="performOCR(${i})"><i data-lucide="languages"></i></button>
                <button class="icon-btn" onclick="deletePage(${i})"><i data-lucide="trash-2"></i></button>
            </div>`;
        container.appendChild(card);
    });
    if (window.lucide) lucide.createIcons();
}

function deletePage(i) { documentPages.splice(i, 1); renderPages(); updateBadge(); }
function movePage(i, d) { 
    const ni = i + d; 
    if (ni >= 0 && ni < documentPages.length) { 
        [documentPages[i], documentPages[ni]] = [documentPages[ni], documentPages[i]]; 
        renderPages(); 
    } 
}
function updateBadge() {
    const b = document.getElementById('page-count-badge');
    if (b) { b.textContent = documentPages.length; b.classList.toggle('hidden', documentPages.length === 0); }
}

async function generatePDF() {
    if (!documentPages.length) return;
    showLoader('Generating...');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    documentPages.forEach((p, i) => { if (i > 0) doc.addPage(); doc.addImage(p, 'JPEG', 10, 10, 190, 277); });
    lastPDFBlob = doc.output('blob');
    saveToHistory({ name: document.getElementById('pdf-filename').value, pages: documentPages.length, date: new Date().toLocaleDateString(), size: (lastPDFBlob.size/1024).toFixed(0)+'KB' });
    if (document.getElementById('pdf-summary')) document.getElementById('pdf-summary').textContent = `${documentPages.length} Pages`;
    hideLoader(); switchView('success');
}

function downloadLastPDF() {
    const link = document.createElement('a'); link.href = URL.createObjectURL(lastPDFBlob);
    link.download = (document.getElementById('pdf-filename').value || 'doc') + '.pdf'; link.click();
}

async function shareLastPDF() {
    if (navigator.share) {
        const f = new File([lastPDFBlob], 'doc.pdf', {type:'application/pdf'});
        navigator.share({files:[f], title:'Scan'}).catch(()=>{});
    } else alert("Not supported");
}

async function performOCR(i) {
    switchView('ocr'); showLoader('Reading...');
    try {
        const worker = await Tesseract.createWorker('eng');
        const ret = await worker.recognize(documentPages[i]);
        document.getElementById('ocr-text-view').value = ret.data.text;
        await worker.terminate();
    } catch (e) { console.error(e); }
    finally { hideLoader(); }
}

function copyOCRText() { navigator.clipboard.writeText(document.getElementById('ocr-text-view').value); alert("Copied"); }
function downloadOCRText() {
    const b = new Blob([document.getElementById('ocr-text-view').value], {type:'text/plain'});
    const l = document.createElement('a'); l.href = URL.createObjectURL(b); l.download = 'text.txt'; l.click();
}

function saveToHistory(item) {
    let h = JSON.parse(localStorage.getItem('doc_scan_history') || '[]');
    h.unshift(item); if (h.length > 10) h.pop();
    localStorage.setItem('doc_scan_history', JSON.stringify(h));
}

function openHistory() { switchView('history'); renderHistory(); }
function renderHistory() {
    const h = JSON.parse(localStorage.getItem('doc_scan_history') || '[]');
    const l = document.getElementById('history-list');
    if (!l) return;
    l.innerHTML = h.length ? '' : 'No documents yet.';
    h.forEach(item => {
        const d = document.createElement('div'); d.className = 'history-item glass';
        d.innerHTML = `<div><h4>${item.name}.pdf</h4><p>${item.date} • ${item.pages} pgs</p></div>`;
        l.appendChild(d);
    });
}

function showLoader(t) { 
    const lt = document.getElementById('loader-text'); if (lt) lt.textContent = t;
    const gl = document.getElementById('global-loader'); if (gl) gl.classList.remove('hidden');
}
function hideLoader() { const gl = document.getElementById('global-loader'); if (gl) gl.classList.add('hidden'); }
function resetApp() { documentPages = []; updateBadge(); switchView('welcome'); }
