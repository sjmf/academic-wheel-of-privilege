/* Academic Wheel of Privilege Visualisation Javascript */
/* Licence: CC-BY-NC-4.0 per FORRT AWOP license */

// ============================================================================
// CONSTANTS
// ============================================================================

// Ring radii - inner is most privileged (1.5 unit spacing)
const ringRadii = { inner: 4.0, middle: 5.5, outer: 7.0 };
const ringPoints = { inner: 3, middle: 2, outer: 1 };

// ============================================================================
// DOM REFERENCES
// ============================================================================

const DOM = {
    container: document.getElementById('container'),
    // Score panel
    scoreValue: document.getElementById('score-value'),
    scoreFill: document.getElementById('score-fill'),
    // Category filter
    filterContainer: document.getElementById('category-filter'),
    tooltip: document.getElementById('category-tooltip'),
    tooltipTitle: document.getElementById('tooltip-title'),
    tooltipDescription: document.getElementById('tooltip-description'),
    tooltipItems: document.getElementById('tooltip-items'),
    // Info panel
    infoPanel: document.getElementById('info-panel'),
    defaultPanel: document.getElementById('default-panel'),
    panelTitle: document.getElementById('panel-title'),
    panelCategory: document.getElementById('panel-category'),
    panelDescription: document.getElementById('panel-description'),
    panelUkLaw: document.getElementById('panel-uk-law'),
    ukLawIcon: document.getElementById('uk-law-icon'),
    ukLawTitle: document.getElementById('uk-law-title'),
    ukLawText: document.getElementById('uk-law-text'),
    spectrumItems: document.getElementById('spectrum-items'),
    navCounter: document.getElementById('nav-counter'),
    prevBtn: document.getElementById('prev-btn'),
    nextBtn: document.getElementById('next-btn'),
    burgerMenu: document.getElementById('burger-menu')
};

// ============================================================================
// THREE.JS SCENE SETUP
// ============================================================================

const container = DOM.container;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(CFG.CAMERA_FOV, window.innerWidth / window.innerHeight, CFG.CAMERA_NEAR, CFG.CAMERA_FAR);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);

// Function to calculate optimal camera distance based on screen size
function getOptimalCameraZ() {
    const width = window.innerWidth;

    // On mobile/small screens, zoom out more to fit the wheel
    if (width <= 480) {
        return CFG.CAMERA_Z_SMALL;
    } else if (width <= 768) {
        return CFG.CAMERA_Z_MEDIUM;
    } else {
        return CFG.CAMERA_Z_LARGE;
    }
}

camera.position.z = getOptimalCameraZ() * CFG.CAMERA_ZOOM_FACTOR;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Slugify category names for CSS var lookup
function slugify(name) {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

// Read category color from CSS custom properties (fallback to categories map)
function getCategoryColor(categoryName) {
    try {
        const root = document.documentElement;
        const varName = '--cat-' + slugify(categoryName);
        const v = getComputedStyle(root).getPropertyValue(varName).trim();
        if (v) return v;
    } catch (e) {
        // ignore
    }
    return (categories[categoryName] && categories[categoryName].color) || '#999999';
}

// ============================================================================
// VECTOR MATH UTILITIES
// ============================================================================

// Convert normalized mouse coordinates to world position on XY plane (z=0)
function mouseToWorldPosition(mouseX, mouseY) {
    const vector = new THREE.Vector3(mouseX, mouseY, CFG.PROJECTION_Z);
    vector.unproject(camera);
    const dir = vector.sub(camera.position).normalize();
    const distance = -camera.position.z / dir.z;
    return camera.position.clone().add(dir.multiplyScalar(distance));
}

// Calculate distance from center (radius) for a position
function distanceFromCenter(pos) {
    return Math.sqrt(pos.x * pos.x + pos.y * pos.y);
}

// Determine which ring a position should snap to based on distance from center
function determineTargetRing(distance) {
    if (distance > (ringRadii.inner + ringRadii.middle) / 2) {
        if (distance > (ringRadii.middle + ringRadii.outer) / 2) {
            return 'outer';
        }
        return 'middle';
    }
    return 'inner';
}

// Set initial rotation
scene.rotation.x = CFG.INIT_ROT_X;

// ============================================================================
// INTERACTION STATE
// ============================================================================

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Bubble collection and selection state
const bubbles = [];
let hoveredBubble = null;
let lockedBubble = null;

// Mouse/drag interaction state
const dragState = {
    isDragging: false,          // Dragging the scene (rotation)
    isDraggingBubble: false,    // Dragging a bubble between rings
    draggedBubble: null,        // Currently dragged bubble
    previousPosition: { x: 0, y: 0 },
    radiusOffset: 0             // Offset between click point and bubble center radius
};

// Scene rotation momentum
let rotationVelocity = { x: 0, y: 0 };

// ============================================================================
// RING CREATION
// ============================================================================

// Create concentric rings
// Read ring colors from CSS variables so theme can be driven from CSS.
(function() {
    // Use shared helper to parse CSS vars into RGB objects
    const { minRgb, midRgb, maxRgb } = getScoreRGBs();
    const rgbToNum = ({ r, g, b }) => (r << 16) + (g << 8) + b;

    // inner should be the "max" (most privileged), middle the mid, outer the min
    window.ringColors = {
        inner: rgbToNum(maxRgb),
        middle: rgbToNum(midRgb),
        outer: rgbToNum(minRgb)
    };
})();
Object.entries(ringRadii).forEach(([name, radius]) => {
    const ringGeometry = new THREE.TorusGeometry(radius, CFG.RING_TUBE, CFG.RING_RADIAL_SEGMENTS, CFG.RING_TUBULAR_SEGMENTS);
    const ringMaterial = new THREE.MeshBasicMaterial({
        color: ringColors[name],
        transparent: true,
        opacity: CFG.RING_OPACITY
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.userData.ringName = name;
    scene.add(ring);
});

// ============================================================================
// BUBBLE CREATION
// ============================================================================

// Create text sprite for bubble labels
function createTextSprite(text, color) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = CFG.LABEL_CANVAS_W;
    canvas.height = CFG.LABEL_CANVAS_H;

    context.fillStyle = 'transparent';
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Measure text and adjust font size if needed
    let fontSize = CFG.LABEL_FONT_SIZE;
    context.font = `bold ${fontSize}px Segoe UI, sans-serif`;
    let textWidth = context.measureText(text).width;

    // Scale down font if text is too wide
    const maxWidth = canvas.width - CFG.LABEL_TEXT_PADDING;
    if (textWidth > maxWidth) {
        fontSize = Math.floor(fontSize * (maxWidth / textWidth));
        context.font = `bold ${fontSize}px Segoe UI, sans-serif`;
    }

    context.textAlign = 'center';
    context.textBaseline = 'middle';

    // Text shadow for readability
    context.fillStyle = CFG.LABEL_SHADOW_COLOR;
    context.fillText(text, canvas.width / 2 + CFG.LABEL_SHADOW_OFFSET, canvas.height / 2 + CFG.LABEL_SHADOW_OFFSET);

    context.fillStyle = '#ffffff';
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const spriteMaterial = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false,
        depthWrite: false
    });

    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(CFG.NAME_LABEL_SCALE.x, CFG.NAME_LABEL_SCALE.y, 1);
    sprite.renderOrder = CFG.SPRITE_RENDER_ORDER;

    return sprite;
}

// Create bubble with label
// globalIndex is used to equally space all 20 bubbles
function createBubble(name, data, globalIndex, totalBubbles) {
    const categoryInfo = categories[data.category];
    const categoryColor = getCategoryColor(data.category);
    // Equally space all bubbles: 360° / 20 = 18° each
    const angle = (globalIndex / totalBubbles) * Math.PI * 2;

    // All bubbles start on inner ring (most privileged)
    const radius = ringRadii.inner;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;

    const geometry = new THREE.SphereGeometry(CFG.BUBBLE_RADIUS, CFG.BUBBLE_SEGMENTS.width, CFG.BUBBLE_SEGMENTS.height);
    const material = new THREE.MeshPhongMaterial({
        color: new THREE.Color(categoryColor),
        transparent: true,
        opacity: CFG.ACTIVE_OPACITY,
        shininess: CFG.BUBBLE_SHININESS,
        emissive: new THREE.Color(categoryColor),
        emissiveIntensity: CFG.BUBBLE_EMISSIVE_INTENSITY
    });

    const bubble = new THREE.Mesh(geometry, material);
    bubble.position.set(x, y, 0);
    bubble.userData = {
        name,
        ...data,
        angle,
        currentRing: 'inner',
        points: 3,
        targetScale: CFG.DEFAULT_SCALE,
        targetOpacity: CFG.ACTIVE_OPACITY,
        isDeselected: false,
        targetPosition: { x, y, z: 0 }
    };

    // Add glow
    const glowGeometry = new THREE.SphereGeometry(CFG.GLOW_RADIUS, CFG.GLOW_SEGMENTS.width, CFG.GLOW_SEGMENTS.height);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(categoryColor),
        transparent: true,
        opacity: CFG.GLOW_OPACITY
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    bubble.add(glow);
    bubble.userData.glow = glow;

    // Add text label (name of category on bubble)
    const label = createTextSprite(name, categoryColor);
    label.position.set(0, CFG.NAME_LABEL_OFFSET_Y, 0);
    bubble.add(label);
    bubble.userData.label = label;
    bubble.userData.labelLocalPos = { x: 0, y: CFG.NAME_LABEL_OFFSET_Y, z: 0 };

    // Add status label (current position below bubble)
    const statusLabel = createTextSprite(data.spectrum.inner, categoryColor);
    statusLabel.position.set(0, CFG.STATUS_LABEL_OFFSET_Y, 0);
    statusLabel.scale.set(CFG.STATUS_LABEL_SCALE.x, CFG.STATUS_LABEL_SCALE.y, 1); // Slightly smaller than name label
    bubble.add(statusLabel);
    bubble.userData.statusLabel = statusLabel;
    bubble.userData.statusLabelLocalPos = { x: 0, y: CFG.STATUS_LABEL_OFFSET_Y, z: 0 };

    scene.add(bubble);
    bubbles.push(bubble);

    return bubble;
}

// Create all bubbles with equal spacing
const allIdentities = Object.entries(identityData);
const totalBubbles = allIdentities.length;

// Sort by category to keep category grouping, then create with equal angular spacing
const categoryOrder = Object.keys(categories);
allIdentities.sort((a, b) => {
    const catAIndex = categoryOrder.indexOf(a[1].category);
    const catBIndex = categoryOrder.indexOf(b[1].category);
    return catAIndex - catBIndex;
});

allIdentities.forEach(([name, data], globalIndex) => {
    createBubble(name, data, globalIndex, totalBubbles);
});

// ============================================================================
// CATEGORY FILTER UI
// ============================================================================

const categoryButtons = {}; // Store buttons by category name for state management

function showCategoryTooltip(name, info, btn) {
    DOM.tooltipTitle.textContent = name;
    DOM.tooltipTitle.style.color = getCategoryColor(name);
    DOM.tooltipDescription.textContent = info.description;

    // Get items in this category
    const items = Object.keys(identityData).filter(k => identityData[k].category === name);
    DOM.tooltipItems.textContent = 'Includes: ' + items.join(', ');

    // Position tooltip
    const rect = btn.getBoundingClientRect();
    DOM.tooltip.style.left = (rect.right + CFG.TOOLTIP_OFFSET) + 'px';
    DOM.tooltip.style.top = rect.top + 'px';

    DOM.tooltip.classList.add('visible');
}

function hideCategoryTooltip() {
    DOM.tooltip.classList.remove('visible');
}

Object.entries(categories).forEach(([name, info]) => {
    const btn = document.createElement('button');
    btn.className = 'category-btn active';
    btn.style.backgroundColor = getCategoryColor(name);
    btn.textContent = name;
    categoryButtons[name] = btn; // Store button reference

    // Click to toggle visibility
    btn.addEventListener('click', () => {
        btn.classList.toggle('active');
        const isActive = btn.classList.contains('active');
        bubbles.forEach(bubble => {
            if (bubble.userData.category === name) {
                bubble.userData.isDeselected = !isActive;
                bubble.userData.targetOpacity = isActive ? CFG.ACTIVE_OPACITY : CFG.DESELECTED_OPACITY;
                bubble.userData.targetScale = isActive ? CFG.DEFAULT_SCALE : CFG.DESELECTED_SCALE;
                
                // If deselecting and this bubble is locked, unlock it
                if (!isActive && lockedBubble === bubble) {
                    lockedBubble = null;
                    hideInfoPanel();
                }
            }
        });
        updateUrlHash(); // Persist category state to URL
    });

    // Hover to show tooltip
    btn.addEventListener('mouseenter', () => showCategoryTooltip(name, info, btn));
    btn.addEventListener('mouseleave', hideCategoryTooltip);

    DOM.filterContainer.appendChild(btn);
});

// Create reset button after category buttons
const resetBtn = document.createElement('button');
resetBtn.className = 'reset-btn';
resetBtn.id = 'reset-btn';
resetBtn.textContent = 'Reset All';
DOM.filterContainer.appendChild(resetBtn);

// Reset button handler
resetBtn.addEventListener('click', () => {
    // Reset all bubbles to inner ring
    bubbles.forEach(bubble => {
        moveBubbleToRing(bubble, 'inner');
    });
    
    // Activate all categories
    Object.entries(categories).forEach(([name, _]) => {
        const btn = categoryButtons[name];
        if (!btn.classList.contains('active')) {
            btn.classList.add('active');
        }
        // Update all bubbles in this category
        bubbles.forEach(bubble => {
                if (bubble.userData.category === name) {
                    bubble.userData.isDeselected = false;
                    bubble.userData.targetOpacity = CFG.ACTIVE_OPACITY;
                    bubble.userData.targetScale = CFG.DEFAULT_SCALE;
                }
        });
    });
    
    // Unlock any locked bubble and hide panel
    if (lockedBubble) {
        lockedBubble = null;
        hideInfoPanel();
    }
    
    updateUrlHash();
});

// ============================================================================
// LIGHTING
// ============================================================================

const ambientLight = new THREE.AmbientLight(CFG.LIGHTS.AMBIENT.color, CFG.LIGHTS.AMBIENT.intensity);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(CFG.LIGHTS.POINT1.color, CFG.LIGHTS.POINT1.intensity, CFG.LIGHTS.POINT1.distance);
pointLight.position.set(CFG.LIGHTS.POINT1.position.x, CFG.LIGHTS.POINT1.position.y, CFG.LIGHTS.POINT1.position.z);
scene.add(pointLight);

const pointLight2 = new THREE.PointLight(CFG.LIGHTS.POINT2.color, CFG.LIGHTS.POINT2.intensity, CFG.LIGHTS.POINT2.distance);
pointLight2.position.set(CFG.LIGHTS.POINT2.position.x, CFG.LIGHTS.POINT2.position.y, CFG.LIGHTS.POINT2.position.z);
scene.add(pointLight2);

// ============================================================================
// COLOR UTILITIES
// ============================================================================

// Convert hex color string to RGB object
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

// Convert RGB values to hex color string
function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
        const hex = Math.round(x).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

// Linearly interpolate between two RGB colors
function lerpRgb(rgb1, rgb2, t) {
    return {
        r: rgb1.r + (rgb2.r - rgb1.r) * t,
        g: rgb1.g + (rgb2.g - rgb1.g) * t,
        b: rgb1.b + (rgb2.b - rgb1.b) * t
    };
}

// Read CSS score color variables and return parsed RGB objects.
// Keeps defaults if variables are missing.
function getScoreRGBs() {
    const root = document.documentElement;
    const colorMin = getComputedStyle(root).getPropertyValue('--color-score-min').trim();
    const colorMid = getComputedStyle(root).getPropertyValue('--color-score-mid').trim();
    const colorMax = getComputedStyle(root).getPropertyValue('--color-score-max').trim();

    return {
        minRgb: hexToRgb(colorMin) || { r: 239, g: 68, b: 68 },
        midRgb: hexToRgb(colorMid) || { r: 234, g: 179, b: 8 },
        maxRgb: hexToRgb(colorMax) || { r: 34, g: 197, b: 94 }
    };
}

// Return a hex color for a normalized score (0..1) using CSS variables
function getScoreColor(normalizedScore) {
    const { minRgb, midRgb, maxRgb } = getScoreRGBs();

    if (normalizedScore <= 0.5) {
        const rgb = lerpRgb(minRgb, midRgb, normalizedScore * 2);
        return rgbToHex(rgb.r, rgb.g, rgb.b);
    } else {
        const rgb = lerpRgb(midRgb, maxRgb, (normalizedScore - 0.5) * 2);
        return rgbToHex(rgb.r, rgb.g, rgb.b);
    }
}

// ============================================================================
// SCORE CALCULATION
// ============================================================================

// Calculate and update score
function updateScore() {
    let total = 0;
    bubbles.forEach(b => {
        total += b.userData.points;
    });
    const minScore = bubbles.length * 1; // 20 (all outer ring)
    const maxScore = bubbles.length * 3; // 60 (all inner ring)
    DOM.scoreValue.textContent = total;

    // Normalize: 20 = 0%, 60 = 100%
    const percentage = ((total - minScore) / (maxScore - minScore)) * 100;
    DOM.scoreFill.style.width = percentage + '%';
    const normalizedScore = (total - minScore) / (maxScore - minScore); // 0 to 1
    DOM.scoreValue.style.color = getScoreColor(normalizedScore);
}

// Update status label sprite texture
// This is the label that changes on privilege level
function updateStatusLabel(bubble, text) {
    if (!bubble.userData.statusLabel) return;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = CFG.LABEL_CANVAS_W;
    canvas.height = CFG.STATUS_CANVAS_H;

    context.fillStyle = 'transparent';
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Measure and adjust font size for long text
    let fontSize = CFG.LABEL_FONT_SIZE;
    context.font = `bold ${fontSize}px Segoe UI, sans-serif`;
    let textWidth = context.measureText(text).width;
    const maxWidth = canvas.width - CFG.LABEL_TEXT_PADDING;
    if (textWidth > maxWidth) {
        fontSize = Math.floor(fontSize * (maxWidth / textWidth));
        context.font = `bold ${fontSize}px Segoe UI, sans-serif`;
    }

    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = CFG.LABEL_SHADOW_COLOR;
    context.fillText(text, canvas.width / 2 + CFG.LABEL_SHADOW_OFFSET, canvas.height / 2 + CFG.LABEL_SHADOW_OFFSET);
    context.fillStyle = 'rgba(255,255,255,0.9)';
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    // Safely dispose of old texture if it exists
    if (bubble.userData.statusLabel.material.map) {
        bubble.userData.statusLabel.material.map.dispose();
    }
    bubble.userData.statusLabel.material.map = texture;
    bubble.userData.statusLabel.material.needsUpdate = true;
}

// ============================================================================
// BUBBLE MOVEMENT & INFO PANEL
// ============================================================================

// Core bubble movement logic (no persistence side effects)
function moveBubbleToRingCore(bubble, ringName) {
    const radius = ringRadii[ringName];
    const angle = bubble.userData.angle;
    bubble.userData.currentRing = ringName;
    bubble.userData.points = ringPoints[ringName];
    bubble.userData.targetPosition = {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        z: 0
    };

    // Update status label with current spectrum text
    const statusText = bubble.userData.spectrum[ringName];
    updateStatusLabel(bubble, statusText);

    updateScore();
    if (lockedBubble === bubble) {
        updateInfoPanel(bubble);
    }
}

// Public API: moves bubble and persists state
function moveBubbleToRing(bubble, ringName) {
    moveBubbleToRingCore(bubble, ringName);
    saveSelections();
    updateUrlHash();
}

// Update basic bubble info in panel (title, category, description)
function updatePanelBasicInfo(data) {
    DOM.panelTitle.textContent = data.name;
    DOM.panelCategory.textContent = data.category;
    DOM.panelCategory.style.backgroundColor = getCategoryColor(data.category);
    DOM.panelDescription.textContent = data.description;
}

// Update UK law section in panel
function updatePanelUkLaw(ukLaw) {
    const icons = { 'protected': '✓', 'partial': '◐', 'not-protected': '✗' };
    DOM.panelUkLaw.className = `uk-law ${ukLaw.status}`;
    DOM.ukLawIcon.textContent = icons[ukLaw.status];
    DOM.ukLawTitle.textContent = ukLaw.title;
    DOM.ukLawText.textContent = ukLaw.text;
}

// Render spectrum items and attach click handlers
function updatePanelSpectrum(bubble) {
    const data = bubble.userData;

    DOM.spectrumItems.innerHTML = `
        <div class="spectrum-item outer ${data.currentRing === 'outer' ? 'selected' : ''}" data-ring="outer">
            <div style="font-weight: 600; margin-bottom: 4px;">1 point</div>
            ${data.spectrum.outer}
        </div>
        <div class="spectrum-item middle ${data.currentRing === 'middle' ? 'selected' : ''}" data-ring="middle">
            <div style="font-weight: 600; margin-bottom: 4px;">2 points</div>
            ${data.spectrum.middle}
        </div>
        <div class="spectrum-item inner ${data.currentRing === 'inner' ? 'selected' : ''}" data-ring="inner">
            <div style="font-weight: 600; margin-bottom: 4px;">3 points</div>
            ${data.spectrum.inner}
        </div>
    `;

    // Add click handlers to spectrum items
    DOM.spectrumItems.querySelectorAll('.spectrum-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const ring = item.dataset.ring;
            moveBubbleToRing(bubble, ring);
        });
    });
}

// Update navigation counter display
function updatePanelNavigation(bubble) {
    const currentIndex = bubbles.indexOf(bubble);
    DOM.navCounter.textContent = `${currentIndex + 1} / ${bubbles.length}`;
}

// Show info panel and adjust UI state
function showInfoPanelUI() {
    DOM.infoPanel.classList.add('visible');
    DOM.defaultPanel.classList.add('hidden');
    DOM.defaultPanel.classList.remove('visible');
    DOM.burgerMenu.classList.remove('active');

    // Move wheel up on mobile so it's not hidden by panel
    if (window.innerWidth <= 768) {
        scene.position.y = CFG.MOBILE_PANEL_OFFSET_Y;
    }
}

// Update info panel (orchestrates all panel updates)
function updateInfoPanel(bubble) {
    const data = bubble.userData;
    updatePanelBasicInfo(data);
    updatePanelUkLaw(data.ukLaw);
    updatePanelSpectrum(bubble);
    updatePanelNavigation(bubble);
    showInfoPanelUI();
}

function hideInfoPanel() {
    DOM.infoPanel.classList.remove('visible');

    // Show default panel again (CSS hides it on mobile)
    DOM.defaultPanel.classList.remove('hidden');

    // Reset camera position on mobile when panel hides
    if (window.innerWidth <= 768) {
        scene.position.y = 0;
    }
}

// Navigation button handlers
function navigateToBubble(direction) {
    if (!lockedBubble) return;
    const currentIndex = bubbles.indexOf(lockedBubble);
    let newIndex = currentIndex + direction;
    // Wrap around
    if (newIndex < 0) newIndex = bubbles.length - 1;
    if (newIndex >= bubbles.length) newIndex = 0;
    lockedBubble = bubbles[newIndex];
    updateInfoPanel(lockedBubble);
}

DOM.prevBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    navigateToBubble(-1);
});

DOM.nextBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    navigateToBubble(1);
});

// ============================================================================
// MOUSE EVENT HANDLERS
// ============================================================================

container.addEventListener('mousedown', (e) => {
    // Only handle events on the canvas, not UI overlays
    if (e.target !== renderer.domElement) return;

    dragState.previousPosition = { x: e.clientX, y: e.clientY };

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(bubbles);

    if (intersects.length > 0) {
        dragState.isDraggingBubble = true;
        dragState.draggedBubble = intersects[0].object;
        dragState.draggedBubble.userData.targetScale = CFG.DRAG_SCALE;

        // Calculate offset: difference between click position radius and bubble radius
        const clickPos = mouseToWorldPosition(mouse.x, mouse.y);
        const clickRadius = distanceFromCenter(clickPos);
        const bubbleRadius = distanceFromCenter(dragState.draggedBubble.position);
        dragState.radiusOffset = bubbleRadius - clickRadius;
    } else {
        dragState.isDragging = true;
    }
});

container.addEventListener('mouseup', (e) => {
    if (dragState.isDraggingBubble && dragState.draggedBubble) {
        // Determine which ring to snap to based on distance from center
        const dist = distanceFromCenter(dragState.draggedBubble.position);
        const targetRing = determineTargetRing(dist);

        moveBubbleToRing(dragState.draggedBubble, targetRing);
        dragState.draggedBubble.userData.targetScale = 1;
        dragState.draggedBubble = null;
    }
    dragState.isDragging = false;
    dragState.isDraggingBubble = false;
});

container.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    if (dragState.isDraggingBubble && dragState.draggedBubble) {
        // Convert mouse to 3D position on XY plane
        const pos = mouseToWorldPosition(mouse.x, mouse.y);

        // Keep bubble at its angle, just change radius
        // Apply offset so bubble doesn't jump to cursor
        const currentDist = distanceFromCenter(pos) + dragState.radiusOffset;
        const clampedDist = Math.max(ringRadii.inner - CFG.RING_PADDING, Math.min(ringRadii.outer + CFG.RING_PADDING, currentDist));
        const angle = dragState.draggedBubble.userData.angle;

        dragState.draggedBubble.position.x = Math.cos(angle) * clampedDist;
        dragState.draggedBubble.position.y = Math.sin(angle) * clampedDist;
    } else if (dragState.isDragging) {
        const deltaMove = {
            x: e.clientX - dragState.previousPosition.x,
            y: e.clientY - dragState.previousPosition.y
        };
        rotationVelocity.x = deltaMove.y * CFG.ROTATION_SENSITIVITY;
        rotationVelocity.y = deltaMove.x * CFG.ROTATION_SENSITIVITY;
        dragState.previousPosition = { x: e.clientX, y: e.clientY };
    }
});

container.addEventListener('click', (e) => {
    // Only handle events on the canvas, not UI overlays
    if (e.target !== renderer.domElement) return;
    if (dragState.isDraggingBubble) return; // Don't trigger click after drag

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(bubbles);

    if (intersects.length > 0) {
        const clickedBubble = intersects[0].object;
        if (lockedBubble === clickedBubble) {
            lockedBubble = null;
            hideInfoPanel();
            // Restore opacity to deselected state if applicable
            clickedBubble.userData.targetOpacity = clickedBubble.userData.isDeselected ? CFG.DESELECTED_OPACITY : CFG.ACTIVE_OPACITY;
        } else {
            lockedBubble = clickedBubble;
            updateInfoPanel(clickedBubble);
            // Set full opacity for selected bubble
            clickedBubble.userData.targetOpacity = CFG.SELECTED_OPACITY;
        }
    } else {
        lockedBubble = null;
        hideInfoPanel();
    }
});

container.addEventListener('wheel', (e) => {
    camera.position.z += e.deltaY * CFG.ZOOM_SENSITIVITY;
    camera.position.z = Math.max(CFG.CAMERA_Z_MIN, Math.min(CFG.CAMERA_Z_MAX, camera.position.z));
});

// ============================================================================
// ANIMATION LOOP
// ============================================================================

function animate() {
    requestAnimationFrame(animate);


    
    // Rotation
    scene.rotation.z -= rotationVelocity.y;
    scene.rotation.x += rotationVelocity.x;
    rotationVelocity.x *= 0.95;
    rotationVelocity.y *= 0.95;

    if (!dragState.isDragging && !dragState.isDraggingBubble && !lockedBubble &&
        Math.abs(rotationVelocity.x) < CFG.AUTO_ROTATE_THRESHOLD && Math.abs(rotationVelocity.y) < CFG.AUTO_ROTATE_THRESHOLD) {
        scene.rotation.z += CFG.AUTO_ROTATE_AMOUNT;
    }

    // Hover detection
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(bubbles);

    // Reset all bubbles (but keep locked bubble highlighted and deselected state)
    bubbles.forEach(bubble => {
        if (bubble === lockedBubble) {
            bubble.userData.targetScale = CFG.SELECTED_SCALE;
            bubble.userData.targetOpacity = CFG.SELECTED_OPACITY;
            if (bubble.userData.glow) bubble.userData.glow.material.opacity = CFG.GLOW_HIGHLIGHT_OPACITY;
        } else if (bubble === dragState.draggedBubble) {
            // Keep drag scale
        } else {
            // Preserve deselected state, otherwise reset to normal size and opacity
            bubble.userData.targetScale = bubble.userData.isDeselected ? CFG.DESELECTED_SCALE : CFG.DEFAULT_SCALE;
            bubble.userData.targetOpacity = bubble.userData.isDeselected ? CFG.DESELECTED_OPACITY : CFG.ACTIVE_OPACITY;
            if (bubble.userData.glow) bubble.userData.glow.material.opacity = CFG.GLOW_OPACITY;
        }
    });

    // Only update hover state if not locked
    if (!lockedBubble && !dragState.isDraggingBubble) {
        if (intersects.length > 0) {
            const bubble = intersects[0].object;
            bubble.userData.targetScale = 1.2;
            if (bubble.userData.glow) bubble.userData.glow.material.opacity = 0.4;
            if (hoveredBubble !== bubble) {
                hoveredBubble = bubble;
            }
            document.body.style.cursor = 'pointer';
        } else {
            hoveredBubble = null;
            document.body.style.cursor = dragState.isDragging ? 'grabbing' : 'grab';
        }
    } else {
        document.body.style.cursor = intersects.length > 0 ? 'pointer' : (dragState.isDragging ? 'grabbing' : 'grab');
    }

    // Animate bubbles
    bubbles.forEach((bubble, index) => {
        // Scale animation
        const currentScale = bubble.scale.x;
        const targetScale = bubble.userData.targetScale;
        const newScale = currentScale + (targetScale - currentScale) * CFG.LERP;
        bubble.scale.set(newScale, newScale, newScale);

        // Opacity animation
        const currentOpacity = bubble.material.opacity;
        const targetOpacity = bubble.userData.targetOpacity;
        const newOpacity = currentOpacity + (targetOpacity - currentOpacity) * CFG.LERP;
        bubble.material.opacity = newOpacity;

        // Apply opacity to label sprites as well
        bubble.userData.label.material.opacity = newOpacity;
        bubble.userData.statusLabel.material.opacity = newOpacity;

        // Position animation (snap to ring)
        if (!dragState.isDraggingBubble || bubble !== dragState.draggedBubble) {
            const target = bubble.userData.targetPosition;
            bubble.position.x += (target.x - bubble.position.x) * CFG.LERP;
            bubble.position.y += (target.y - bubble.position.y) * CFG.LERP;
            bubble.position.z += (target.z - bubble.position.z) * CFG.LERP;
        }

        // Subtle floating
        const time = Date.now() * CFG.FLOAT_SPEED;
        bubble.position.z = Math.sin(time + index) * CFG.FLOAT_AMPLITUDE;

        // Make labels face camera and keep in fixed position
        if (bubble.userData.label) {
            bubble.userData.label.quaternion.copy(camera.quaternion);
            const lp = bubble.userData.labelLocalPos;
            bubble.userData.label.position.set(lp.x, lp.y, lp.z);
        }
        if (bubble.userData.statusLabel) {
            bubble.userData.statusLabel.quaternion.copy(camera.quaternion);
            const sp = bubble.userData.statusLabelLocalPos;
            bubble.userData.statusLabel.position.set(sp.x, sp.y, sp.z);
        }
    });

    renderer.render(scene, camera);
}

// ============================================================================
// WINDOW RESIZE HANDLER
// ============================================================================

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.position.z = getOptimalCameraZ();
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ============================================================================
// PERSISTENCE (localStorage & URL hash)
// ============================================================================

const STORAGE_KEY = 'wheelOfPrivilege_selections';

function saveSelections() {
    const selections = {};
    bubbles.forEach(b => {
        selections[b.userData.name] = b.userData.currentRing;
    });
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(selections));
    } catch (e) {
        console.warn('Could not save to localStorage:', e);
    }
}

function loadSelections() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const selections = JSON.parse(saved);
            bubbles.forEach(b => {
                const ring = selections[b.userData.name];
                if (ring && ['inner', 'middle', 'outer'].includes(ring)) {
                    moveBubbleToRingCore(b, ring);
                }
            });
        }
    } catch (e) {
        console.warn('Could not load from localStorage:', e);
    }
}

// URL hash encoding for shareable links
const ringToChar = { inner: 'i', middle: 'm', outer: 'o' };
const charToRing = { i: 'inner', m: 'middle', o: 'outer' };

// Validate a hash string against allowed characters and expected length
function isValidHash(hash, charMap, expectedLength) {
    return hash.length === expectedLength && [...hash].every(c => c in charMap);
}

// Build hash string from current state
function getSelectionsHash() {
    const bubbleHash = bubbles.map(b => ringToChar[b.userData.currentRing]).join('');
    const categoryHash = Object.keys(categories).map(catName =>
        categoryButtons[catName].classList.contains('active') ? 'i' : 'o'
    ).join('');
    return `${bubbleHash}/${categoryHash}`;
}

function updateUrlHash() {
    history.replaceState(null, '', '#' + getSelectionsHash());
}

// Apply category active state (shared by hash loading and button clicks)
function setCategoryActive(catName, isActive) {
    const btn = categoryButtons[catName];
    btn.classList.toggle('active', isActive);
    bubbles.forEach(bubble => {
        if (bubble.userData.category === catName) {
            bubble.userData.isDeselected = !isActive;
            bubble.userData.targetOpacity = isActive ? CFG.ACTIVE_OPACITY : CFG.DESELECTED_OPACITY;
            bubble.userData.targetScale = isActive ? CFG.DEFAULT_SCALE : CFG.DESELECTED_SCALE;
        }
    });
}

function loadFromUrlHash() {
    const hash = window.location.hash.slice(1);
    if (!hash) return false;

    const parts = hash.split('/');
    if (parts.length !== 2) return false;

    const [bubbleHash, categoryHash] = parts;
    const categoryOrder = Object.keys(categories);

    // Validate both hashes before applying any changes
    if (!isValidHash(bubbleHash, charToRing, bubbles.length)) return false;
    if (!isValidHash(categoryHash, { i: true, o: true }, categoryOrder.length)) return false;

    // Apply bubble selections (use core to avoid recursive persistence)
    bubbles.forEach((b, i) => {
        moveBubbleToRingCore(b, charToRing[bubbleHash[i]]);
    });

    // Apply category selections
    categoryOrder.forEach((catName, i) => {
        setCategoryActive(catName, categoryHash[i] === 'i');
    });

    return true;
}

// ============================================================================
// INITIALISATION
// ============================================================================

// URL hash takes priority over localStorage
if (!loadFromUrlHash()) {
    loadSelections();
}
updateScore();
updateUrlHash(); // Set initial hash

// animate() is called after touch.js loads
