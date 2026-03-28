document.addEventListener('DOMContentLoaded', () => {

    // --- DOM Elements ---
    const textInput = document.getElementById('text-input');
    const updateTextBtn = document.getElementById('update-text-btn');
    const videoFrame = document.getElementById('video-frame');
    
    // Customizations
    const stylingPanel = document.getElementById('styling-panel');
    const fontFamily = document.getElementById('font-family');
    const customFontUpload = document.getElementById('custom-font-upload');
    const fontSize = document.getElementById('font-size');
    const sizeVal = document.getElementById('size-val');
    const textColor = document.getElementById('text-color');
    const textBgColor = document.getElementById('text-bg-color');
    const textEffect = document.getElementById('text-effect');

    const btnBold = document.getElementById('btn-bold');
    const btnItalic = document.getElementById('btn-italic');
    const btnUnderline = document.getElementById('btn-underline');
    
    // Scene Settings
    const videoBgType = document.getElementById('video-bg-type');
    const videoBgColor = document.getElementById('video-bg-color');
    
    // Gradients
    const gradientOptions = document.getElementById('gradient-options');
    const gradColor1 = document.getElementById('grad-color-1');
    const gradColor2 = document.getElementById('grad-color-2');
    const gradAngle = document.getElementById('grad-angle');
    const gradAngleVal = document.getElementById('grad-angle-val');

    // Video/Image BG
    const videoImgOptions = document.getElementById('video-img-options');
    const videoBgImage = document.getElementById('video-bg-image');
    const videoTrimOptions = document.getElementById('video-trim-options');
    const vidStart = document.getElementById('vid-start');
    const vidEnd = document.getElementById('vid-end');

    // Audio
    const audioUpload = document.getElementById('audio-upload');
    const audioFileName = document.getElementById('audio-file-name');

    // Render
    const animPreset = document.getElementById('animation-preset');
    const autoRatio = document.getElementById('auto-ratio');
    
    const generateBtn = document.getElementById('generate-video-btn');
    const overlay = document.getElementById('generation-overlay');
    const progressFill = document.getElementById('progress-fill');
    const genText = document.getElementById('generation-text');
    const downloadBtn = document.getElementById('download-video-btn');
    const closeBtn = document.getElementById('close-overlay-btn');

    let selectedText = null;
    let bgVideoElem = null;
    let bgImgElem = null;
    
    let bgAudio = new Audio();
    let audioStream = null;

    // --- Tab Switching logic ---
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.style.display = 'none');
            
            btn.classList.add('active');
            document.getElementById(btn.getAttribute('data-target')).style.display = 'block';
        });
    });

    // --- Text Creation & Dragging logic ---
    updateTextBtn.addEventListener('click', updateTextObjects);
    updateTextObjects(); // Init
    stylingPanel.classList.add('disabled-panel');

    function updateTextObjects() {
        const textStr = textInput.value || "Text Frame";
        const lines = textStr.split('\n').filter(t => t.trim() !== '').slice(0, 7);
        
        // Remove old texts
        Array.from(videoFrame.querySelectorAll('.text-element')).forEach(el => el.remove());
        selectedText = null;
        stylingPanel.classList.add('disabled-panel');
        
        const frameW = videoFrame.clientWidth;
        const frameH = videoFrame.clientHeight;

        lines.forEach((line, i) => {
            const el = document.createElement('div');
            el.className = 'text-element effect-none';
            el.innerText = line;
            
            el.style.fontSize = '36px';
            el.style.color = '#ffffff';
            el.style.backgroundColor = 'transparent';
            el.style.fontFamily = "'Inter', sans-serif";
            el.style.textAlign = 'center';
            el.style.fontWeight = '600';
            el.style.fontStyle = 'normal';
            el.style.textDecoration = 'none';
            
            videoFrame.appendChild(el); 
            
            const startX = (frameW - el.offsetWidth) / 2;
            const startY = 100 + (i * 120); 

            el.style.left = startX + 'px';
            el.style.top = startY + 'px';

            makeDraggable(el);
            
            const resizer = document.createElement('div');
            resizer.className = 'resizer';
            el.appendChild(resizer);
        });
    }

    function makeDraggable(el) {
        let isDragging = false, startX, startY, startLeft, startTop;

        el.addEventListener('mousedown', (e) => {
            if(e.target.classList.contains('resizer')) return;
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startLeft = parseInt(window.getComputedStyle(el).left) || 0;
            startTop = parseInt(window.getComputedStyle(el).top) || 0;
            selectElement(el);
            e.stopPropagation();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            el.style.left = (startLeft + dx) + 'px';
            el.style.top = (startTop + dy) + 'px';
        });

        document.addEventListener('mouseup', () => { isDragging = false; });
    }

    videoFrame.addEventListener('mousedown', (e) => {
        if (e.target === videoFrame || e.target === bgVideoElem || e.target === bgImgElem) {
            if (selectedText) {
                selectedText.classList.remove('selected');
                selectedText = null;
                stylingPanel.classList.add('disabled-panel');
            }
        }
    });

    function selectElement(el) {
        if (selectedText) selectedText.classList.remove('selected');
        selectedText = el;
        el.classList.add('selected');
        stylingPanel.classList.remove('disabled-panel');
        syncStylingPanel(el);
    }

    function syncStylingPanel(el) {
        const style = window.getComputedStyle(el);
        fontFamily.value = el.style.fontFamily.replace(/"/g, "'"); // Best effort match
        
        const fSize = parseInt(style.fontSize) || 30;
        fontSize.value = fSize;
        sizeVal.innerText = fSize;

        let bgHex = rgbToHex(style.backgroundColor);
        if (bgHex === '#000000' && style.backgroundColor.includes('0)')) bgHex = '#000000';
        textBgColor.value = bgHex;

        btnBold.classList.toggle('active', parseInt(style.fontWeight) > 600 || style.fontWeight === 'bold');
        btnItalic.classList.toggle('active', style.fontStyle === 'italic');
        btnUnderline.classList.toggle('active', style.textDecorationLine === 'underline');

        let effect = 'none';
        el.classList.forEach(c => {
            if(c.startsWith('effect-')) effect = c.substring(7);
        });
        textEffect.value = effect;
    }

    // --- Styling Panel Handlers ---
    fontFamily.addEventListener('change', () => { if(selectedText) selectedText.style.fontFamily = fontFamily.value; });
    
    customFontUpload.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file && selectedText) {
            const fontName = 'customFont_' + Date.now();
            const fontUrl = URL.createObjectURL(file);
            const myFont = new FontFace(fontName, `url(${fontUrl})`);
            try {
                const loadedFont = await myFont.load();
                document.fonts.add(loadedFont);
                selectedText.style.fontFamily = `"${fontName}"`;
                const newOption = document.createElement('option');
                newOption.value = `"${fontName}"`;
                newOption.text = `Custom Font (${file.name})`;
                newOption.selected = true;
                fontFamily.add(newOption);
            } catch (err) { console.error("Font loading error:", err); }
        }
    });

    fontSize.addEventListener('input', () => { 
        sizeVal.innerText = fontSize.value;
        if(selectedText) selectedText.style.fontSize = fontSize.value + 'px'; 
    });

    textColor.addEventListener('input', () => { if(selectedText) selectedText.style.color = textColor.value; });
    textBgColor.addEventListener('input', () => { if(selectedText) selectedText.style.backgroundColor = textBgColor.value; });

    btnBold.addEventListener('click', () => toggleStyle(btnBold, 'fontWeight', 'bold', 'normal'));
    btnItalic.addEventListener('click', () => toggleStyle(btnItalic, 'fontStyle', 'italic', 'normal'));
    btnUnderline.addEventListener('click', () => toggleStyle(btnUnderline, 'textDecoration', 'underline', 'none'));

    function toggleStyle(btn, prop, valTrue, valFalse) {
        if (!selectedText) return;
        const isActive = btn.classList.toggle('active');
        selectedText.style[prop] = isActive ? valTrue : valFalse;
    }

    textEffect.addEventListener('change', () => {
        if (!selectedText) return;
        selectedText.className = selectedText.className.replace(/effect-\w+/g, '').trim();
        selectedText.classList.add(`effect-${textEffect.value}`);
    });


    // --- Advanced Background / Scene Config ---

    function updateGradient() {
        if (videoBgType.value === 'gradient') {
            videoFrame.style.background = `linear-gradient(${gradAngle.value}deg, ${gradColor1.value}, ${gradColor2.value})`;
        }
    }

    videoBgType.addEventListener('change', (e) => {
        const type = e.target.value;
        videoBgColor.style.display = 'none';
        gradientOptions.style.display = 'none';
        videoImgOptions.style.display = 'none';
        videoFrame.style.background = ''; // reset
        
        // Remove video/img bg if there 
        if(bgVideoElem) { bgVideoElem.remove(); bgVideoElem = null; }
        if(bgImgElem) { bgImgElem.remove(); bgImgElem = null; }
        videoTrimOptions.style.display = 'none';

        if (type === 'color') {
            videoBgColor.style.display = 'inline-block';
            videoFrame.style.background = videoBgColor.value;
        } else if (type === 'gradient') {
            gradientOptions.style.display = 'flex';
            updateGradient();
        } else if (type === 'image') {
            videoImgOptions.style.display = 'block';
        }
    });

    videoBgColor.addEventListener('input', (e) => {
        if (videoBgType.value === 'color') videoFrame.style.background = e.target.value;
    });

    gradColor1.addEventListener('input', updateGradient);
    gradColor2.addEventListener('input', updateGradient);
    gradAngle.addEventListener('input', (e) => {
        gradAngleVal.innerText = e.target.value;
        updateGradient();
    });

    videoBgImage.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        if (bgVideoElem) { bgVideoElem.remove(); bgVideoElem = null; }
        if (bgImgElem) { bgImgElem.remove(); bgImgElem = null; }

        const url = URL.createObjectURL(file);

        if (file.type.startsWith('video/')) {
            videoTrimOptions.style.display = 'flex';
            bgVideoElem = document.createElement('video');
            bgVideoElem.src = url;
            bgVideoElem.autoplay = true;
            bgVideoElem.loop = true;
            bgVideoElem.muted = true; // muted during preview
            bgVideoElem.style.position = 'absolute';
            bgVideoElem.style.top = '0';
            bgVideoElem.style.left = '0';
            bgVideoElem.style.width = '100%';
            bgVideoElem.style.height = '100%';
            bgVideoElem.style.objectFit = 'cover';
            bgVideoElem.style.zIndex = '-1';
            videoFrame.appendChild(bgVideoElem);
            
            // Set default end time based on metadata
            bgVideoElem.onloadedmetadata = () => {
                vidEnd.value = Math.min(bgVideoElem.duration, 5); // Default 5s clip
            };
        } else {
            videoTrimOptions.style.display = 'none';
            bgImgElem = document.createElement('img');
            bgImgElem.src = url;
            bgImgElem.style.position = 'absolute';
            bgImgElem.style.top = '0';
            bgImgElem.style.left = '0';
            bgImgElem.style.width = '100%';
            bgImgElem.style.height = '100%';
            bgImgElem.style.objectFit = 'cover';
            bgImgElem.style.zIndex = '-1';
            videoFrame.appendChild(bgImgElem);
        }
    });

    // --- Audio Track Upload ---
    let audioCtx = null;
    audioUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            bgAudio.src = URL.createObjectURL(file);
            audioFileName.style.display = 'block';
            audioFileName.querySelector('span').innerText = file.name;
            
            // Setup Web Audio API capture
            if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioCtx.createMediaElementSource(bgAudio);
            const dest = audioCtx.createMediaStreamDestination();
            source.connect(dest);
            source.connect(audioCtx.destination);
            audioStream = dest.stream;
        }
    });

    // --- HD Video Generation & Recording ---
    const animations = ['anim-fade', 'anim-slide', 'anim-zoom', 'anim-bounce', 'anim-typewriter'];
    let generatedBlobUrl = null;

    generateBtn.addEventListener('click', async () => {
        if (selectedText) {
            selectedText.classList.remove('selected');
            selectedText = null;
            stylingPanel.classList.add('disabled-panel');
        }

        if (autoRatio.checked) {
            document.querySelectorAll('.text-element').forEach(el => {
                const currentLeft = parseInt(el.style.left) || 0;
                const offset = (Math.random() - 0.5) * 40;
                el.style.left = (currentLeft + offset) + 'px';
            });
        }

        const preset = animPreset.value;
        const texts = Array.from(videoFrame.querySelectorAll('.text-element'));
        texts.forEach(t => animations.forEach(a => t.classList.remove(a)));

        overlay.classList.remove('hidden');
        progressFill.style.width = '0%';
        genText.innerText = "Initializing High Definition Engine...";
        document.querySelector('.spinner').style.display = 'block';
        downloadBtn.classList.add('hidden');
        closeBtn.classList.add('hidden');

        // Setup MediaRecorder Canvas (HD Vertical: 720x2160)
        const canvas = document.createElement('canvas');
        canvas.width = 720; 
        canvas.height = 2160;
        const ctx = canvas.getContext('2d');
        
        // Target framerate 30
        const videoStream = canvas.captureStream(30); 
        
        let finalTracks = [...videoStream.getVideoTracks()];
        if (audioStream) finalTracks.push(...audioStream.getAudioTracks());

        const combinedStream = new MediaStream(finalTracks);
        
        let recorder;
        try {
            // Attempt standard MP4 first in supported browsers (Safari), else WebM
            recorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm; codecs=vp9' });
        } catch (e) {
            recorder = new MediaRecorder(combinedStream); 
        }
        
        const chunks = [];
        recorder.ondataavailable = e => { if(e.data.size > 0) chunks.push(e.data); };
        
        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' });
            if (generatedBlobUrl) URL.revokeObjectURL(generatedBlobUrl);
            generatedBlobUrl = URL.createObjectURL(blob);
            
            genText.innerText = "Video Generation Complete!";
            document.querySelector('.spinner').style.display = 'none';
            downloadBtn.classList.remove('hidden');
            closeBtn.classList.remove('hidden');
            progressFill.style.width = '100%';
        };

        // Clip Duration logic
        let duration = 6; // Default CSS animation length
        if (bgVideoElem) {
            const startStr = parseFloat(vidStart.value) || 0;
            const endStr = parseFloat(vidEnd.value) || 5;
            duration = Math.max(endStr - startStr, 2);
            bgVideoElem.currentTime = startStr;
            bgVideoElem.play();
        }
        if(bgAudio.src) {
            bgAudio.currentTime = 0;
            bgAudio.play();
        }

        // Capture Loop via html2canvas
        let recording = true;

        async function captureLoop() {
            if (!recording) return;

            try {
                // To avoid html2canvas bug with playing videos, we draw the video separately
                let bgVideoDrawing = false;
                if (bgVideoElem) {
                    bgVideoElem.style.opacity = '0'; // Hide from html2canvas temporarily
                    bgVideoDrawing = true;
                }

                // Render the text/DOM
                const c = await html2canvas(videoFrame, { 
                    scale: 720 / videoFrame.clientWidth, // Scale up to HD resolution automatically!
                    useCORS: true, 
                    backgroundColor: (videoBgType.value === 'image' || videoBgType.value === 'gradient') ? null : window.getComputedStyle(videoFrame).backgroundColor,
                    logging: false 
                });
                
                if (bgVideoElem) {
                    bgVideoElem.style.opacity = '1'; 
                }

                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                // 1. Draw solid or gradient if gradient is active (mostly handled by html2canvas body bg except video)
                if (videoBgType.value === 'gradient') {
                    const grd = ctx.createLinearGradient(0,0, canvas.width, canvas.height);
                    grd.addColorStop(0, gradColor1.value);
                    grd.addColorStop(1, gradColor2.value);
                    ctx.fillStyle = grd;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }

                // 2. Output Video Frame (Cropped)
                if (bgVideoDrawing) {
                    // Object-fit: cover implementation on canvas
                    const videoAspectRatio = bgVideoElem.videoWidth / bgVideoElem.videoHeight;
                    const canvasAspectRatio = canvas.width / canvas.height;
                    let drawWidth, drawHeight, startX, startY;

                    if (videoAspectRatio > canvasAspectRatio) {
                        drawHeight = canvas.height;
                        drawWidth = bgVideoElem.videoWidth * (canvas.height / bgVideoElem.videoHeight);
                        startX = (canvas.width - drawWidth) / 2;
                        startY = 0;
                    } else {
                        drawWidth = canvas.width;
                        drawHeight = bgVideoElem.videoHeight * (canvas.width / bgVideoElem.videoWidth);
                        startX = 0;
                        startY = (canvas.height - drawHeight) / 2;
                    }
                    ctx.drawImage(bgVideoElem, startX, startY, drawWidth, drawHeight);
                }

                // 3. Output texts
                ctx.drawImage(c, 0, 0, canvas.width, canvas.height);

            } catch(e) { console.error("Capture Error", e); }
            
            if (recording) {
                // Run loop, target ~24fps rendering
                setTimeout(captureLoop, 40);
            }
        }

        genText.innerText = "Encoding HD Cinematic Sequences...";
        
        // Small delay to ensure contexts wake up
        setTimeout(() => {
            recorder.start();
            captureLoop();
            
            texts.forEach((textEl, idx) => {
                textEl.style.animationDelay = `${idx * 0.5}s`;
                textEl.style.opacity = '0'; 
                
                if (preset === 'cinematic') {
                    textEl.classList.add(Math.random() > 0.5 ? 'anim-slide' : 'anim-zoom');
                } else if (preset === 'typewriter') {
                    textEl.classList.add('anim-typewriter');
                } else if (preset === 'bounce') {
                    textEl.classList.add('anim-bounce');
                } else {
                    textEl.classList.add('anim-fade');
                }
            });

            let elapsed = 0;
            const timer = setInterval(() => {
                elapsed += 1;
                progressFill.style.width = ((elapsed / duration) * 100) + '%';
                
                // Handle video end trim
                if (bgVideoElem && bgVideoElem.currentTime >= parseFloat(vidEnd.value)) {
                    bgVideoElem.pause();
                }

                if (elapsed >= duration) {
                    clearInterval(timer);
                    recording = false;
                    recorder.stop();
                    if(bgVideoElem) bgVideoElem.pause();
                    bgAudio.pause();
                }
            }, 1000);
        }, 500);
    });

    closeBtn.addEventListener('click', () => {
        overlay.classList.add('hidden');
        document.querySelector('.spinner').style.display = 'block';
    });

    downloadBtn.addEventListener('click', () => {
        if (generatedBlobUrl) {
            const a = document.createElement('a');
            a.href = generatedBlobUrl;
            // Native browsers usually default to WebM unless Safari
            const ext = generatedBlobUrl.includes('mp4') || (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/mp4')) ? 'mp4' : 'webm';
            a.download = `Studio_HD_Video_${Date.now()}.${ext}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } else {
            alert('Video not ready yet!');
        }
    });

    // Helper RGB -> Hex
    function rgbToHex(rgb) {
        if (!rgb || rgb.indexOf('rgb') === -1) return rgb;
        const result = bgToRgb(rgb);
        if(!result) return '#ffffff';
        return "#" + (1 << 24 | result[0] << 16 | result[1] << 8 | result[2]).toString(16).slice(1);
    }
    function bgToRgb(color) {
        const matches = color.match(/\d+/g);
        if(matches) return matches.map(Number);
        return [255,255,255];
    }

});
