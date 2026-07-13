// Global variables
        let canvas = document.getElementById('mainCanvas');
        let ctx = canvas.getContext('2d');
        let currentPlatform = 'facebook';
        let bgImage = null;
        let bgImageX = null;
        let bgImageY = null;
        let imageAlign = 'center';
        let saveFormat = 'png';
        let textSettings = {
            bold: false,
            italic: false,
            underline: false,
            align: 'center',
            bgEnabled: false,
            shadowBlur: 0,
            shadowColor: '#000000',
            shadowOffsetX: 4,
            shadowOffsetY: 4,
            x: null,
            y: null,
            contrast: 100,
            brightness: 100,
            darkness: 0,
            blur: 0,
            sepia: 0,
            warmth: 0,
            tint: 0,
            hue: 0,
            rotate: 0,
            hd: 100
        };
        let adjustTarget = 'image';
        
        let selectedItem = null;
        let isDragging = false;
        let isResizing = false;
        let dragOffsetX = 0;
        let dragOffsetY = 0;
        let resizeStartDist = 0;
        let resizeInitialSize = 0;
        let resizeCenterX = 0;
        let resizeCenterY = 0;

        // Initialize
        window.onload = function() {
            drawCanvas();
        };

        // Set platform ratio and resize canvas
        function setPlatformRatio(btn, width, height) {
            canvas.width = width;
            canvas.height = height;
            
            document.querySelectorAll('.ratio-btn').forEach(b => b.classList.remove('active'));
            if (btn) btn.classList.add('active');
            
            showToast(`Canvas size: ${width}x${height}`);
            drawCanvas();
        }

        // Set save format via button
        function setFormatBtn(btn, format) {
            saveFormat = format;
            document.querySelectorAll('.format-btn').forEach(b => b.classList.remove('active'));
            if (btn) btn.classList.add('active');
            showToast(`Format set to ${format.toUpperCase()}`);
        }

        // Save image
        function saveImage() {
            try {
                const link = document.createElement('a');
                const timestamp = new Date().getTime();
                
                if (saveFormat === 'png') {
                    link.download = `social-post-${timestamp}.png`;
                    link.href = canvas.toDataURL('image/png', 1.0);
                } else if (saveFormat === 'jpg') {
                    link.download = `social-post-${timestamp}.jpg`;
                    link.href = canvas.toDataURL('image/jpeg', 0.95);
                } else if (saveFormat === 'webp') {
                    link.download = `social-post-${timestamp}.webp`;
                    link.href = canvas.toDataURL('image/webp', 0.95);
                }
                
                link.click();
                showToast('Image saved successfully!');
            } catch (error) {
                showToast('Error saving image: ' + error.message);
            }
        }

        // Draw canvas with all elements
        function drawCanvas() {
            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw background
            if (bgImage) {
                drawBackgroundImage();
            } else {
                drawGradientBackground();
            }
            
            // Draw text
            drawText();
        }

        // Draw gradient background
        function drawGradientBackground() {
            const color1 = document.getElementById('gradientColor1').value;
            const color2 = document.getElementById('gradientColor2').value;
            
            const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            gradient.addColorStop(0, color1);
            gradient.addColorStop(1, color2);
            
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Draw background image
        function drawBackgroundImage() {
            if (!bgImage) return;
            
            const size = document.getElementById('imgSize').value / 100;
            const contrast = document.getElementById('contrast').value;
            const brightness = document.getElementById('brightness').value;
            const darkness = document.getElementById('darkness').value;
            const blur = document.getElementById('blur').value;
            const opacity = document.getElementById('opacity').value / 100;
            const sepia = document.getElementById('sepia').value;
            const warmth = document.getElementById('warmth').value;
            const tint = document.getElementById('tint').value;
            const hue = document.getElementById('hue').value;
            const hd = document.getElementById('hd').value || 100;
            
            // Apply filters
            ctx.filter = `
                contrast(${contrast}%)
                brightness(${brightness - darkness}%)
                saturate(${hd}%)
                blur(${blur}px)
                opacity(${opacity})
                sepia(${sepia}%)
                hue-rotate(${hue}deg)
            `;
            
            // Calculate dimensions
            const imgWidth = bgImage.width * size;
            const imgHeight = bgImage.height * size;
            let defaultX;
            if (imageAlign === 'left') {
                defaultX = 0;
            } else if (imageAlign === 'right') {
                defaultX = canvas.width - imgWidth;
            } else {
                defaultX = (canvas.width - imgWidth) / 2;
            }
            const defaultY = (canvas.height - imgHeight) / 2;
            
            const x = bgImageX !== null ? bgImageX : defaultX;
            const y = bgImageY !== null ? bgImageY : defaultY;
            
            // Draw image
            const imageRotate = document.getElementById('rotate').value || 0;
            ctx.globalAlpha = opacity;
            
            ctx.save();
            ctx.translate(x + imgWidth / 2, y + imgHeight / 2);
            ctx.rotate(imageRotate * Math.PI / 180);
            
            ctx.drawImage(bgImage, -imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight);
            
            ctx.globalAlpha = 1;
            ctx.filter = 'none';
            
            // Draw selection box and delete button while rotated
            if (selectedItem === 'image') {
                ctx.strokeStyle = '#3b82f6';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.strokeRect(-imgWidth / 2 - 5, -imgHeight / 2 - 5, imgWidth + 10, imgHeight + 10);
                ctx.setLineDash([]);
                
                ctx.fillStyle = '#ef4444';
                ctx.beginPath();
                ctx.arc(imgWidth / 2 + 5, -imgHeight / 2 - 5, 15, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = 'white';
                ctx.font = 'bold 16px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('X', imgWidth / 2 + 5, -imgHeight / 2 - 5);
                
                // Resize button
                ctx.fillStyle = '#10b981';
                ctx.beginPath();
                ctx.arc(imgWidth / 2 + 5, imgHeight / 2 + 5, 15, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = 'white';
                ctx.font = 'bold 16px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('⤡', imgWidth / 2 + 5, imgHeight / 2 + 5);
            }
            
            ctx.restore();
            
            // Apply warmth and tint overlays
            if (warmth !== 0 || tint !== 0) {
                ctx.globalCompositeOperation = 'overlay';
                if (warmth > 0) {
                    ctx.fillStyle = `rgba(255, 160, 60, ${Math.abs(warmth) / 200})`;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                } else if (warmth < 0) {
                    ctx.fillStyle = `rgba(60, 160, 255, ${Math.abs(warmth) / 200})`;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
                
                if (tint !== 0) {
                    ctx.fillStyle = `rgba(180, 60, 255, ${Math.abs(tint) / 200})`;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
                ctx.globalCompositeOperation = 'source-over';
            }
        }

        // Draw text
        function drawText() {
            const text = document.getElementById('textContent').value;
            if (!text) return;
            
            const fontFamily = document.getElementById('fontFamily').value;
            const fontSize = document.getElementById('textSize').value;
            const color = document.getElementById('textColor').value;
            
            const defaultX = textSettings.align === 'left' ? 50 : 
                      textSettings.align === 'right' ? canvas.width - 50 : 
                      canvas.width / 2;
            const defaultY = canvas.height / 2;
            const x = textSettings.x !== null ? textSettings.x : defaultX;
            const y = textSettings.y !== null ? textSettings.y : defaultY;
            
            const offCanvas = document.createElement('canvas');
            offCanvas.width = canvas.width;
            offCanvas.height = canvas.height;
            const offCtx = offCanvas.getContext('2d');
            
            offCtx.font = `${textSettings.italic ? 'italic' : ''} ${textSettings.bold ? 'bold' : ''} ${fontSize}px ${fontFamily}`;
            offCtx.textAlign = textSettings.align;
            offCtx.textBaseline = 'middle';
            
            // Apply shadow if exists
            if (textSettings.shadowBlur > 0) {
                offCtx.shadowColor = textSettings.shadowColor;
                offCtx.shadowBlur = textSettings.shadowBlur;
                offCtx.shadowOffsetX = textSettings.shadowOffsetX;
                offCtx.shadowOffsetY = textSettings.shadowOffsetY;
            }
            
            // Draw text background if enabled
            if (textSettings.bgEnabled) {
                const metrics = offCtx.measureText(text);
                const bgPadding = 20;
                const bgHeight = parseInt(fontSize) + bgPadding;
                const bgWidth = metrics.width + bgPadding * 2;
                const bgX = textSettings.align === 'left' ? x - bgPadding :
                           textSettings.align === 'right' ? x - bgWidth + bgPadding :
                           x - bgWidth / 2;
                
                offCtx.fillStyle = document.getElementById('textBgColor').value;
                offCtx.fillRect(bgX, y - bgHeight / 2, bgWidth, bgHeight);
            }
            
            // Draw text
            offCtx.fillStyle = color;
            offCtx.fillText(text, x, y);
            
            // Reset shadow
            offCtx.shadowColor = 'transparent';
            offCtx.shadowBlur = 0;
            offCtx.shadowOffsetX = 0;
            offCtx.shadowOffsetY = 0;
            
            // Draw underline if enabled
            let metrics = offCtx.measureText(text);
            if (textSettings.underline) {
                const underlineY = y + parseInt(fontSize) / 2 + 5;
                const underlineX = textSettings.align === 'left' ? x :
                                  textSettings.align === 'right' ? x - metrics.width :
                                  x - metrics.width / 2;
                
                offCtx.beginPath();
                offCtx.moveTo(underlineX, underlineY);
                offCtx.lineTo(underlineX + metrics.width, underlineY);
                offCtx.strokeStyle = color;
                offCtx.lineWidth = 3;
                offCtx.stroke();
            }
            
            // Apply text warmth and tint overlays
            const tWarmth = textSettings.warmth || 0;
            const tTint = textSettings.tint || 0;
            if (tWarmth !== 0 || tTint !== 0) {
                offCtx.globalCompositeOperation = 'source-atop';
                if (tWarmth > 0) {
                    offCtx.fillStyle = `rgba(255, 160, 60, ${Math.abs(tWarmth) / 200})`;
                    offCtx.fillRect(0, 0, canvas.width, canvas.height);
                } else if (tWarmth < 0) {
                    offCtx.fillStyle = `rgba(60, 160, 255, ${Math.abs(tWarmth) / 200})`;
                    offCtx.fillRect(0, 0, canvas.width, canvas.height);
                }
                if (tTint !== 0) {
                    offCtx.fillStyle = `rgba(180, 60, 255, ${Math.abs(tTint) / 200})`;
                    offCtx.fillRect(0, 0, canvas.width, canvas.height);
                }
                offCtx.globalCompositeOperation = 'source-over';
            }
            
            // Draw offscreen canvas to main canvas with filters
            const tContrast = textSettings.contrast !== undefined ? textSettings.contrast : 100;
            const tBrightness = textSettings.brightness !== undefined ? textSettings.brightness : 100;
            const tDarkness = textSettings.darkness !== undefined ? textSettings.darkness : 0;
            const tBlur = textSettings.blur !== undefined ? textSettings.blur : 0;
            const tOpacity = textSettings.opacity !== undefined ? textSettings.opacity : 100;
            const tSepia = textSettings.sepia !== undefined ? textSettings.sepia : 0;
            const tHue = textSettings.hue !== undefined ? textSettings.hue : 0;
            const tHd = textSettings.hd !== undefined ? textSettings.hd : 100;
            
            ctx.filter = `
                contrast(${tContrast}%)
                brightness(${tBrightness - tDarkness}%)
                saturate(${tHd}%)
                blur(${tBlur}px)
                opacity(${tOpacity / 100})
                sepia(${tSepia}%)
                hue-rotate(${tHue}deg)
            `;
            
            ctx.font = `${textSettings.italic ? 'italic' : ''} ${textSettings.bold ? 'bold' : ''} ${fontSize}px ${fontFamily}`;
            const tWidth = ctx.measureText(text).width;
            let tLeft = x;
            if (textSettings.align === 'center') tLeft = x - tWidth / 2;
            if (textSettings.align === 'right') tLeft = x - tWidth;
            const tTop = y - parseInt(fontSize) / 2;
            const tCenterX = tLeft + tWidth / 2;
            const tCenterY = tTop + parseInt(fontSize) / 2;
            
            ctx.save();
            ctx.translate(tCenterX, tCenterY);
            ctx.rotate((textSettings.rotate || 0) * Math.PI / 180);
            
            ctx.drawImage(offCanvas, -tCenterX, -tCenterY);
            ctx.filter = 'none';
            
            // Draw selection box and delete button
            if (selectedItem === 'text') {
                const width = tWidth;
                const height = parseInt(fontSize);
                
                ctx.strokeStyle = '#3b82f6';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.strokeRect(-width/2 - 10, -height/2 - 10, width + 20, height + 20);
                ctx.setLineDash([]);
                
                ctx.fillStyle = '#ef4444';
                ctx.beginPath();
                ctx.arc(width/2 + 10, -height/2 - 10, 15, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = 'white';
                ctx.font = 'bold 16px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('X', width/2 + 10, -height/2 - 10);
                
                // Resize button
                ctx.fillStyle = '#10b981';
                ctx.beginPath();
                ctx.arc(width/2 + 10, height/2 + 10, 15, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = 'white';
                ctx.font = 'bold 16px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('⤡', width/2 + 10, height/2 + 10);
            }
            
            ctx.restore();
        }

        // Apply text effect template
        function applyTextTemplate(template) {
            const textInput = document.getElementById('textContent');
            if (!textInput.value || textInput.value === 'Your Text Here') {
                textInput.value = 'Sample Text';
            }
            
            switch(template) {
                case 'neon':
                    document.getElementById('textColor').value = '#ffffff';
                    document.getElementById('shadowColor').value = '#00ffff';
                    document.getElementById('shadowBlur').value = 20;
                    textSettings.shadowBlur = 20;
                    textSettings.bold = true;
                    document.getElementById('boldBtn').classList.add('active');
                    document.getElementById('fontFamily').value = 'Impact';
                    break;
                    
                case 'gold':
                    document.getElementById('textColor').value = '#ffd700';
                    document.getElementById('shadowColor').value = '#b8860b';
                    document.getElementById('shadowBlur').value = 5;
                    textSettings.shadowBlur = 5;
                    textSettings.bold = true;
                    document.getElementById('boldBtn').classList.add('active');
                    document.getElementById('fontFamily').value = 'Georgia';
                    break;
                    
                case 'outline':
                    document.getElementById('textColor').value = '#ffffff';
                    document.getElementById('shadowColor').value = '#000000';
                    document.getElementById('shadowBlur').value = 0;
                    textSettings.shadowBlur = 0;
                    textSettings.bold = true;
                    document.getElementById('boldBtn').classList.add('active');
                    document.getElementById('fontFamily').value = 'Arial';
                    break;
                    
                case 'shadow':
                    document.getElementById('textColor').value = '#ffffff';
                    document.getElementById('shadowColor').value = '#000000';
                    document.getElementById('shadowBlur').value = 10;
                    textSettings.shadowBlur = 10;
                    textSettings.shadowOffsetX = 8;
                    textSettings.shadowOffsetY = 8;
                    textSettings.bold = true;
                    document.getElementById('boldBtn').classList.add('active');
                    document.getElementById('fontFamily').value = 'Impact';
                    break;
                    
                case 'gradient':
                    document.getElementById('textColor').value = '#667eea';
                    document.getElementById('shadowColor').value = '#764ba2';
                    document.getElementById('shadowBlur').value = 15;
                    textSettings.shadowBlur = 15;
                    textSettings.bold = true;
                    document.getElementById('boldBtn').classList.add('active');
                    document.getElementById('fontFamily').value = 'Helvetica';
                    break;
                    
                case 'retro':
                    document.getElementById('textColor').value = '#ff6b6b';
                    document.getElementById('shadowColor').value = '#4ecdc4';
                    document.getElementById('shadowBlur').value = 8;
                    textSettings.shadowBlur = 8;
                    textSettings.shadowOffsetX = 4;
                    textSettings.shadowOffsetY = 4;
                    textSettings.bold = true;
                    document.getElementById('boldBtn').classList.add('active');
                    document.getElementById('fontFamily').value = 'Courier New';
                    break;
                    
                case 'cyber':
                    document.getElementById('textColor').value = '#00d9ff';
                    document.getElementById('shadowColor').value = '#ff00ff';
                    document.getElementById('shadowBlur').value = 15;
                    textSettings.shadowBlur = 15;
                    textSettings.bold = false;
                    document.getElementById('boldBtn').classList.remove('active');
                    document.getElementById('fontFamily').value = 'Courier New';
                    break;
                    
                case 'elegant':
                    document.getElementById('textColor').value = '#ffffff';
                    document.getElementById('shadowColor').value = '#000000';
                    document.getElementById('shadowBlur').value = 3;
                    textSettings.shadowBlur = 3;
                    textSettings.italic = true;
                    document.getElementById('italicBtn').classList.add('active');
                    document.getElementById('fontFamily').value = 'Georgia';
                    break;
            }
            
            document.getElementById('shadowBlurValue').textContent = document.getElementById('shadowBlur').value + 'px';
            updateText();
            showToast(`${template.charAt(0).toUpperCase() + template.slice(1)} template applied!`);
        }

        // Update background
        function updateBackground() {
            if (!bgImage) {
                drawCanvas();
            } else {
                drawBackgroundImage();
                drawText();
            }
        }

        // Handle background image upload
        function handleBgImage(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    bgImage = new Image();
                    bgImage.onload = function() {
                        drawCanvas();
                        showToast('Background image loaded');
                    };
                    bgImage.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        }

        // Update image adjustments
        function updateImageAdjustments() {
            drawCanvas();
        }

        // Update text
        function updateText() {
            const tsv = document.getElementById('textSizeValue');
            if (tsv) tsv.textContent = document.getElementById('textSize').value + 'px';
            textSettings.shadowBlur = parseInt(document.getElementById('shadowBlur').value);
            document.getElementById('shadowBlurValue').textContent = textSettings.shadowBlur + 'px';
            drawCanvas();
        }

        // Toggle text style
        function toggleTextStyle(style) {
            textSettings[style] = !textSettings[style];
            document.getElementById(style + 'Btn').classList.toggle('active');
            updateText();
        }

        // Set alignment for image or text
        function setAlignment(align) {
            if (adjustTarget === 'image') {
                imageAlign = align;
                bgImageX = null;
                bgImageY = null;
            } else {
                textSettings.align = align;
                textSettings.x = null; // Reset x to allow default alignment
            }
            document.querySelectorAll('.align-btn').forEach(btn => btn.classList.remove('active'));
            document.getElementById('align' + align.charAt(0).toUpperCase() + align.slice(1)).classList.add('active');
            drawCanvas();
        }

        // Toggle text background
        function toggleTextBackground() {
            textSettings.bgEnabled = !textSettings.bgEnabled;
            document.getElementById('textBgToggle').classList.toggle('active');
            document.getElementById('textBgColorGroup').style.display = textSettings.bgEnabled ? 'block' : 'none';
            updateText();
        }

        // Handle import all images
        function handleImportAll(event) {
            const files = event.target.files;
            if (files.length > 0) {
                showToast(`Imported ${files.length} image(s)`);
                // You can add logic to handle multiple images here
            }
        }

        // Show toast notification
        function showToast(message) {
            const toast = document.getElementById('toast');
            toast.textContent = message;
            toast.classList.add('show');
            setTimeout(() => {
                toast.classList.remove('show');
            }, 3000);
        }

        // Handle window resize
        window.addEventListener('resize', function() {
            // Maintain aspect ratio on resize
            drawCanvas();
        });

        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            canvas.addEventListener(eventName, preventDefaults, false);
            document.body.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        // Handle drop on canvas
        canvas.addEventListener('drop', handleDrop, false);

        function handleDrop(e) {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files.length > 0 && files[0].type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    bgImage = new Image();
                    bgImage.onload = function() {
                        drawCanvas();
                        showToast('Image dropped successfully');
                    };
                    bgImage.src = e.target.result;
                };
                reader.readAsDataURL(files[0]);
            }
        }
        // Mobile bottom navigation tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const sidebar = document.querySelector('.sidebar-right');
                
                if (tab.classList.contains('active')) {
                    sidebar.style.height = '';
                    sidebar.classList.remove('active');
                    tab.classList.remove('active');
                    return;
                }
                
                document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                sidebar.classList.add('active');
                document.querySelectorAll('.sidebar-right .control-section').forEach(sec => sec.classList.remove('active'));
                const targetId = tab.getAttribute('data-tab');
                document.getElementById(targetId).classList.add('active');
                
                // Auto adjust height to fit tools
                if (window.matchMedia("(max-width: 1023px) and (orientation: portrait)").matches) {
                    sidebar.style.height = 'auto';
                    sidebar.style.maxHeight = '85vh';
                }
            });
        });

        // Toggle sidebar from settings button
        window.toggleSidebar = function() {
            const sidebar = document.querySelector('.sidebar-right');
            if (sidebar.classList.contains('active')) {
                sidebar.style.height = '';
                sidebar.classList.remove('active');
                document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
            } else {
                sidebar.classList.add('active');
                if (window.matchMedia("(max-width: 1023px) and (orientation: portrait)").matches) {
                    sidebar.style.height = 'auto';
                    sidebar.style.maxHeight = '85vh';
                }
                const activeSection = document.querySelector('.sidebar-right .control-section.active');
                if (activeSection) {
                    const tabId = activeSection.id;
                    const tab = document.querySelector(`.nav-tab[data-tab="${tabId}"]`);
                    if (tab) tab.classList.add('active');
                } else {
                    const firstTab = document.querySelector('.nav-tab');
                    if (firstTab) firstTab.click();
                }
            }
        };

        // Zoom Logic
        let currentZoom = 1;
        window.setZoom = function(delta) {
            currentZoom += delta;
            if (currentZoom < 0.2) currentZoom = 0.2;
            if (currentZoom > 5) currentZoom = 5;
            
            const display = document.getElementById('zoomLevelDisplay');
            if (display) {
                display.textContent = Math.round(currentZoom * 100) + '%';
            }
            
            const wrapper = document.getElementById('canvasWrapper');
            if (wrapper) {
                wrapper.style.zoom = currentZoom;
            }
        };

        // Full Screen Toggle
        window.toggleFullScreen = function() {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => {
                    console.log(`Error attempting to enable fullscreen: ${err.message}`);
                });
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                }
            }
        };

        document.addEventListener('fullscreenchange', () => {
            const icon = document.getElementById('fullscreenIcon');
            if (document.fullscreenElement) {
                if (icon) icon.textContent = '✖';
            } else {
                if (icon) icon.textContent = '⛶';
            }
        });
        
        // Drag logic for sidebar (drag down to hide)
        let sidebarDragStartY = 0;
        let sidebarCurrentY = 0;
        let isSidebarDragging = false;
        let initialSidebarHeight = 0;
        const sidebarEl = document.querySelector('.sidebar-right');
        const dragHandleEl = document.getElementById('dragHandle');

        if (sidebarEl && dragHandleEl) {
            const dragStart = (e, coords) => {
                isSidebarDragging = true;
                const isRight = sidebarEl.classList.contains('position-right');
                sidebarDragStartY = isRight ? coords.clientX : coords.clientY;
                initialSidebarHeight = sidebarEl.getBoundingClientRect().height;
                sidebarEl.style.transition = 'none';
            };

            const dragMove = (e, coords) => {
                if (!isSidebarDragging) return;
                const isRight = sidebarEl.classList.contains('position-right');
                const currentPos = isRight ? coords.clientX : coords.clientY;
                const delta = currentPos - sidebarDragStartY;
                sidebarCurrentY = delta;
                
                if (isRight) {
                    if (delta > 0) sidebarEl.style.transform = `translateX(${delta}px)`;
                } else {
                    if (delta > 0) {
                        sidebarEl.style.transform = `translateY(${delta}px)`;
                    } else {
                        // Prevent dragging up to increase height
                        sidebarEl.style.transform = `translateY(0)`;
                    }
                }
            };

            const dragEnd = () => {
                if (!isSidebarDragging) return;
                isSidebarDragging = false;
                sidebarEl.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), height 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                if (sidebarCurrentY > 50) {
                    sidebarEl.classList.remove('active');
                    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
                    setTimeout(() => { sidebarEl.style.height = ''; }, 300);
                }
                sidebarEl.style.transform = '';
                sidebarCurrentY = 0;
            };

            // Touch events
            dragHandleEl.addEventListener('touchstart', (e) => dragStart(e, e.touches[0]), { passive: true });
            dragHandleEl.addEventListener('touchmove', (e) => dragMove(e, e.touches[0]), { passive: true });
            dragHandleEl.addEventListener('touchend', dragEnd);

            // Mouse events
            dragHandleEl.addEventListener('mousedown', (e) => dragStart(e, e));
            document.addEventListener('mousemove', (e) => { if (isSidebarDragging) dragMove(e, e); });
            document.addEventListener('mouseup', dragEnd);
        }


        // Dynamic Select Width Adjustment
        function adjustSelectWidth(select) {
            let temp = document.createElement('select');
            temp.className = select.className;
            temp.style.visibility = 'hidden';
            temp.style.position = 'absolute';
            let option = document.createElement('option');
            option.textContent = select.options[select.selectedIndex].text;
            temp.appendChild(option);
            document.body.appendChild(temp);
            select.style.width = temp.offsetWidth + 'px';
            temp.remove();
        }

        // Initialize widths on load
        document.addEventListener('DOMContentLoaded', () => {
            document.querySelectorAll('.header-select').forEach(select => {
                adjustSelectWidth(select);
            });
        });

        // Hide bottom nav on double click

        const bottomNav = document.querySelector('.bottom-nav');
        const sidebarRight = document.querySelector('.sidebar-right');
        const canvasContainer = document.querySelector('.canvas-container');

        if (bottomNav) {
            bottomNav.addEventListener('dblclick', () => {
                bottomNav.style.display = 'none';
                sidebarRight.style.display = 'none';
            });
        }

        if (canvasContainer) {
            canvasContainer.addEventListener('dblclick', () => {
                if (window.matchMedia("(max-width: 1023px) and (orientation: portrait)").matches) {
                    bottomNav.style.display = 'flex';
                    sidebarRight.style.display = 'block';
                }
            });
        }
        
        // Master Slider Logic for Image Adjustments
        const adjustConfig = {
            size: {
                label: 'Size',
                get min() { return adjustTarget === 'image' ? 0 : 12; },
                get max() { return adjustTarget === 'image' ? 200 : 120; },
                get suffix() { return adjustTarget === 'image' ? '%' : 'px'; },
                get slider() { return adjustTarget === 'image' ? document.getElementById('imgSize') : document.getElementById('textSize'); }
            },
            contrast: { label: 'Contrast', min: 0, max: 200, slider: document.getElementById('contrast'), suffix: '%' },
            brightness: { label: 'Brightness', min: 0, max: 200, slider: document.getElementById('brightness'), suffix: '%' },
            darkness: { label: 'Darkness', min: 0, max: 100, slider: document.getElementById('darkness'), suffix: '%' },
            blur: { label: 'Blur', min: 0, max: 20, slider: document.getElementById('blur'), suffix: 'px', step: 0.5 },
            opacity: { label: 'Opacity', min: 0, max: 100, slider: document.getElementById('opacity'), suffix: '%' },
            sepia: { label: 'Sepia', min: 0, max: 100, slider: document.getElementById('sepia'), suffix: '%' },
            warmth: { label: 'Warmth', min: -100, max: 100, slider: document.getElementById('warmth'), suffix: '' },
            tint: { label: 'Tint', min: -100, max: 100, slider: document.getElementById('tint'), suffix: '' },
            hue: { label: 'Hue', min: 0, max: 360, slider: document.getElementById('hue'), suffix: '°' },
            rotate: { label: 'Rotate', min: 0, max: 360, slider: document.getElementById('rotate'), suffix: '°' },
            hd: { label: 'HD Quality', min: 0, max: 200, slider: document.getElementById('hd'), suffix: '%' }
        };

        let activeAdjustment = 'contrast';
        const masterAdjustSlider = document.getElementById('masterAdjustSlider');
        const masterAdjustLabel = document.getElementById('masterAdjustLabel');
        const masterAdjustValue = document.getElementById('masterAdjustValue');
        
        function setAdjustTarget(target) {
            adjustTarget = target;
            document.getElementById('targetImgBtn').classList.toggle('active', target === 'image');
            document.getElementById('targetTxtBtn').classList.toggle('active', target === 'text');
            document.getElementById('targetImgBtn').style.background = target === 'image' ? 'var(--accent-color)' : 'transparent';
            document.getElementById('targetImgBtn').style.color = target === 'image' ? 'white' : 'var(--text-primary)';
            document.getElementById('targetTxtBtn').style.background = target === 'text' ? 'var(--accent-color)' : 'transparent';
            document.getElementById('targetTxtBtn').style.color = target === 'text' ? 'white' : 'var(--text-primary)';
            
            // Sync alignment buttons
            const currentAlign = target === 'image' ? imageAlign : textSettings.align;
            document.querySelectorAll('.align-btn').forEach(btn => btn.classList.remove('active'));
            const alignBtn = document.getElementById('align' + currentAlign.charAt(0).toUpperCase() + currentAlign.slice(1));
            if (alignBtn) alignBtn.classList.add('active');
            
            const config = adjustConfig[activeAdjustment];
            masterAdjustSlider.min = config.min;
            masterAdjustSlider.max = config.max;
            if(config.step) masterAdjustSlider.step = config.step; else masterAdjustSlider.removeAttribute('step');
            
            const val = (target === 'image' || activeAdjustment === 'size') ? config.slider.value : textSettings[activeAdjustment];
            masterAdjustSlider.value = val;
            masterAdjustValue.textContent = val + config.suffix;
        }

        document.querySelectorAll('#adjustOptionButtons .template-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#adjustOptionButtons .template-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                activeAdjustment = btn.getAttribute('data-adjust');
                const config = adjustConfig[activeAdjustment];
                
                masterAdjustLabel.textContent = config.label;
                masterAdjustSlider.min = config.min;
                masterAdjustSlider.max = config.max;
                if(config.step) masterAdjustSlider.step = config.step; else masterAdjustSlider.removeAttribute('step');
                
                const val = (adjustTarget === 'image' || activeAdjustment === 'size') ? config.slider.value : textSettings[activeAdjustment];
                masterAdjustSlider.value = val;
                masterAdjustValue.textContent = val + config.suffix;
            });
        });

        if(masterAdjustSlider) {
            masterAdjustSlider.addEventListener('input', () => {
                const config = adjustConfig[activeAdjustment];
                if (adjustTarget === 'image' || activeAdjustment === 'size') {
                    config.slider.value = masterAdjustSlider.value;
                    if (activeAdjustment === 'size' && adjustTarget === 'text') {
                        const tsv = document.getElementById('textSizeValue');
                        if (tsv) tsv.textContent = masterAdjustSlider.value + 'px';
                    }
                } else {
                    textSettings[activeAdjustment] = parseFloat(masterAdjustSlider.value);
                }
                masterAdjustValue.textContent = masterAdjustSlider.value + config.suffix;
                updateImageAdjustments();
            });
        }
        // Canvas Interaction
        function getCanvasPos(evt) {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            let clientX = evt.clientX;
            let clientY = evt.clientY;
            if (evt.touches && evt.touches.length > 0) {
                clientX = evt.touches[0].clientX;
                clientY = evt.touches[0].clientY;
            } else if (evt.changedTouches && evt.changedTouches.length > 0) {
                clientX = evt.changedTouches[0].clientX;
                clientY = evt.changedTouches[0].clientY;
            }
            return {
                x: (clientX - rect.left) * scaleX,
                y: (clientY - rect.top) * scaleY
            };
        }

        function checkTextBounds(x, y) {
            const text = document.getElementById('textContent').value;
            if (!text) return { inText: false, inDelete: false };
            
            const fontSize = parseInt(document.getElementById('textSize').value);
            ctx.font = `${textSettings.italic ? 'italic' : ''} ${textSettings.bold ? 'bold' : ''} ${fontSize}px ${document.getElementById('fontFamily').value}`;
            const metrics = ctx.measureText(text);
            
            const currentX = textSettings.x !== null ? textSettings.x : (textSettings.align === 'left' ? 50 : textSettings.align === 'right' ? canvas.width - 50 : canvas.width / 2);
            const currentY = textSettings.y !== null ? textSettings.y : canvas.height / 2;
            
            const width = metrics.width;
            const height = fontSize;
            let left = currentX;
            if (textSettings.align === 'center') left = currentX - width / 2;
            if (textSettings.align === 'right') left = currentX - width;
            const top = currentY - height / 2;
            
            const centerX = left + width / 2;
            const centerY = top + height / 2;
            const rotate = (textSettings.rotate || 0) * Math.PI / 180;
            
            const cos = Math.cos(-rotate);
            const sin = Math.sin(-rotate);
            const nx = (x - centerX) * cos - (y - centerY) * sin + centerX;
            const ny = (x - centerX) * sin + (y - centerY) * cos + centerY;
            
            const dx = nx - (left + width + 10);
            const dy = ny - (top - 10);
            const inDelete = (dx * dx + dy * dy) <= 225;
            
            const dxResize = nx - (left + width + 10);
            const dyResize = ny - (top + height + 10);
            const inResize = (dxResize * dxResize + dyResize * dyResize) <= 225;
            
            const inText = nx >= left - 10 && nx <= left + width + 10 && ny >= top - 10 && ny <= top + height + 10;
            return { inText, inDelete, inResize, centerX, centerY };
        }

        function checkImageBounds(x, y) {
            if (!bgImage) return { inImage: false, inDelete: false };
            const size = document.getElementById('imgSize').value / 100;
            const imgWidth = bgImage.width * size;
            const imgHeight = bgImage.height * size;
            let defaultImgX;
            if (imageAlign === 'left') {
                defaultImgX = 0;
            } else if (imageAlign === 'right') {
                defaultImgX = canvas.width - imgWidth;
            } else {
                defaultImgX = (canvas.width - imgWidth) / 2;
            }
            const defaultImgY = (canvas.height - imgHeight) / 2;
            
            const imgX = bgImageX !== null ? bgImageX : defaultImgX;
            const imgY = bgImageY !== null ? bgImageY : defaultImgY;
            
            const centerX = imgX + imgWidth / 2;
            const centerY = imgY + imgHeight / 2;
            const rotate = (document.getElementById('rotate').value || 0) * Math.PI / 180;
            
            const cos = Math.cos(-rotate);
            const sin = Math.sin(-rotate);
            const nx = (x - centerX) * cos - (y - centerY) * sin + centerX;
            const ny = (x - centerX) * sin + (y - centerY) * cos + centerY;
            
            const dx = nx - (imgX + imgWidth + 5);
            const dy = ny - (imgY - 5);
            const inDelete = (dx * dx + dy * dy) <= 225;
            
            const dxResize = nx - (imgX + imgWidth + 5);
            const dyResize = ny - (imgY + imgHeight + 5);
            const inResize = (dxResize * dxResize + dyResize * dyResize) <= 225;
            
            const inImage = nx >= imgX && nx <= imgX + imgWidth && ny >= imgY && ny <= imgY + imgHeight;
            return { inImage, inDelete, inResize, centerX, centerY };
        }

        let canvasPanEnabled = false;
        let isCanvasPanning = false;
        let canvasPanStartX = 0;
        let canvasPanStartY = 0;
        let canvasWrapperStartLeft = 0;
        let canvasWrapperStartTop = 0;

        window.updateSidebarOpacity = function(val) {
            document.getElementById('sidebarOpacityValue').textContent = val + '%';
            const sidebar = document.querySelector('.sidebar-right');
            if (sidebar) {
                if (val == 100) {
                    sidebar.style.backgroundColor = '';
                    sidebar.style.backdropFilter = '';
                } else {
                    sidebar.style.backgroundColor = `color-mix(in srgb, var(--secondary-bg) ${val}%, transparent)`;
                    sidebar.style.backdropFilter = `blur(${10 - (val / 10)}px)`;
                }
            }
        };

        window.toggleCanvasDrag = function() {
            canvasPanEnabled = document.getElementById('dragCanvasToggle').checked;
            const wrapper = document.getElementById('canvasWrapper');
            if (canvasPanEnabled) {
                wrapper.style.cursor = 'grab';
            } else {
                wrapper.style.cursor = 'default';
                wrapper.style.left = '0px';
                wrapper.style.top = '0px';
            }
        };

        function handlePointerDown(e) {
            if (e.target !== canvas) return;
            
            if (canvasPanEnabled) {
                isCanvasPanning = true;
                canvasPanStartX = e.touches ? e.touches[0].clientX : e.clientX;
                canvasPanStartY = e.touches ? e.touches[0].clientY : e.clientY;
                const wrapper = document.getElementById('canvasWrapper');
                canvasWrapperStartLeft = parseInt(wrapper.style.left || '0');
                canvasWrapperStartTop = parseInt(wrapper.style.top || '0');
                wrapper.style.cursor = 'grabbing';
                return;
            }

            const pos = getCanvasPos(e);
            
            if (selectedItem === 'text') {
                const textCheck = checkTextBounds(pos.x, pos.y);
                if (textCheck.inDelete) {
                    document.getElementById('textContent').value = '';
                    selectedItem = null;
                    textSettings.x = null;
                    textSettings.y = null;
                    updateText();
                    return;
                }
                if (textCheck.inResize) {
                    isResizing = true;
                    resizeInitialSize = parseFloat(document.getElementById('textSize').value);
                    resizeCenterX = textCheck.centerX;
                    resizeCenterY = textCheck.centerY;
                    resizeStartDist = Math.hypot(pos.x - resizeCenterX, pos.y - resizeCenterY);
                    return;
                }
            }
            
            if (selectedItem === 'image') {
                const imgCheck = checkImageBounds(pos.x, pos.y);
                if (imgCheck.inDelete) {
                    bgImage = null;
                    selectedItem = null;
                    drawCanvas();
                    return;
                }
                if (imgCheck.inResize) {
                    isResizing = true;
                    resizeInitialSize = parseFloat(document.getElementById('imgSize').value);
                    resizeCenterX = imgCheck.centerX;
                    resizeCenterY = imgCheck.centerY;
                    resizeStartDist = Math.hypot(pos.x - resizeCenterX, pos.y - resizeCenterY);
                    return;
                }
            }
            
            const textCheck = checkTextBounds(pos.x, pos.y);
            if (textCheck.inText) {
                selectedItem = 'text';
                isDragging = true;
                const currentX = textSettings.x !== null ? textSettings.x : (textSettings.align === 'left' ? 50 : textSettings.align === 'right' ? canvas.width - 50 : canvas.width / 2);
                const currentY = textSettings.y !== null ? textSettings.y : canvas.height / 2;
                dragOffsetX = pos.x - currentX;
                dragOffsetY = pos.y - currentY;
                drawCanvas();
                return;
            }
            
            const imgCheck = checkImageBounds(pos.x, pos.y);
            if (imgCheck.inImage) {
                selectedItem = 'image';
                isDragging = true;
                
                const size = document.getElementById('imgSize').value / 100;
                const imgWidth = bgImage.width * size;
                const imgHeight = bgImage.height * size;
                let defaultImgX = imageAlign === 'left' ? 0 : imageAlign === 'right' ? canvas.width - imgWidth : (canvas.width - imgWidth) / 2;
                let defaultImgY = (canvas.height - imgHeight) / 2;
                
                const currentX = bgImageX !== null ? bgImageX : defaultImgX;
                const currentY = bgImageY !== null ? bgImageY : defaultImgY;
                dragOffsetX = pos.x - currentX;
                dragOffsetY = pos.y - currentY;
                
                drawCanvas();
                return;
            }
            
            selectedItem = null;
            drawCanvas();
        }

        function handlePointerMove(e) {
            if (isCanvasPanning) {
                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                const clientY = e.touches ? e.touches[0].clientY : e.clientY;
                const dx = clientX - canvasPanStartX;
                const dy = clientY - canvasPanStartY;
                const wrapper = document.getElementById('canvasWrapper');
                wrapper.style.left = (canvasWrapperStartLeft + dx) + 'px';
                wrapper.style.top = (canvasWrapperStartTop + dy) + 'px';
                return;
            }

            const pos = getCanvasPos(e);
            
            if (isResizing && selectedItem) {
                const currentDist = Math.hypot(pos.x - resizeCenterX, pos.y - resizeCenterY);
                const ratio = currentDist / resizeStartDist;
                let newSize = resizeInitialSize * ratio;
                
                if (selectedItem === 'text') {
                    newSize = Math.max(12, Math.min(120, newSize));
                    document.getElementById('textSize').value = newSize;
                    const tsv = document.getElementById('textSizeValue');
                    if (tsv) tsv.textContent = Math.round(newSize) + 'px';
                    if (adjustTarget === 'text' && activeAdjustment === 'size') {
                        masterAdjustSlider.value = newSize;
                        masterAdjustValue.textContent = Math.round(newSize) + 'px';
                    }
                } else {
                    newSize = Math.max(0, Math.min(200, newSize));
                    document.getElementById('imgSize').value = newSize;
                    if (adjustTarget === 'image' && activeAdjustment === 'size') {
                        masterAdjustSlider.value = newSize;
                        masterAdjustValue.textContent = Math.round(newSize) + '%';
                    }
                }
                
                drawCanvas();
                return;
            }
            
            if (!isDragging) return;
            if (selectedItem === 'text') {
                textSettings.x = pos.x - dragOffsetX;
                textSettings.y = pos.y - dragOffsetY;
            } else if (selectedItem === 'image') {
                bgImageX = pos.x - dragOffsetX;
                bgImageY = pos.y - dragOffsetY;
            }
            drawCanvas();
        }

        function handlePointerUp() {
            if (isCanvasPanning) {
                isCanvasPanning = false;
                const wrapper = document.getElementById('canvasWrapper');
                if (canvasPanEnabled) wrapper.style.cursor = 'grab';
            }
            isDragging = false;
            isResizing = false;
        }

        canvas.addEventListener('mousedown', handlePointerDown);
        canvas.addEventListener('mousemove', handlePointerMove);
        window.addEventListener('mouseup', handlePointerUp);
        
        canvas.addEventListener('touchstart', (e) => { e.preventDefault(); handlePointerDown(e); }, { passive: false });
        canvas.addEventListener('touchmove', (e) => { e.preventDefault(); handlePointerMove(e); }, { passive: false });
        window.addEventListener('touchend', handlePointerUp);

        canvas.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            const pos = getCanvasPos(e);
            const textCheck = checkTextBounds(pos.x, pos.y);
            if (textCheck.inText) {
                selectedItem = 'text';
                drawCanvas();
                
                const modal = document.getElementById('textEditModal');
                const modalText = document.getElementById('modalTextContent');
                if (modal && modalText) {
                    modalText.value = document.getElementById('textContent').value;
                    modal.style.display = 'flex';
                    setTimeout(() => {
                        modalText.focus();
                        modalText.setSelectionRange(modalText.value.length, modalText.value.length);
                    }, 50);
                }
            }
        });

        window.saveModalText = function() {
            const modal = document.getElementById('textEditModal');
            const modalText = document.getElementById('modalTextContent');
            if (modal && modalText) {
                document.getElementById('textContent').value = modalText.value;
                updateText();
                modal.style.display = 'none';
            }
        };

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
                if (selectedItem === 'text') {
                    document.getElementById('textContent').value = '';
                    textSettings.x = null;
                    textSettings.y = null;
                    selectedItem = null;
                    updateText();
                } else if (selectedItem === 'image') {
                    bgImage = null;
                    selectedItem = null;
                    drawCanvas();
                }
            }
        });

        function toggleTheme() {
            const body = document.body;
            const themeIcon = document.getElementById('themeIcon');
            const themeToggleBtn = document.getElementById('themeToggleBtn');
            const btnText = themeToggleBtn.querySelector('span:last-child');
            
            if (body.getAttribute('data-theme') === 'light') {
                body.removeAttribute('data-theme');
                themeIcon.textContent = '🌙';
                if (btnText) btnText.textContent = 'Night';
            } else {
                body.setAttribute('data-theme', 'light');
                themeIcon.textContent = '☀️';
                if (btnText) btnText.textContent = 'Day';
            }
        }