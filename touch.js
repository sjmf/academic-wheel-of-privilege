// Touch event handlers for mobile
// This file handles all touch interactions for the Academic Wheel of Privilege

// ============================================================================
// CONSTANTS
// ============================================================================

const TOUCH_THRESHOLDS = {
    TAP_MAX_DISTANCE: 10,
    SWIPE_MIN_DISTANCE: 50,
    SWIPE_ASPECT_RATIO: 1.5
};

const MOBILE_LAYOUT = {
    MIN_PANEL_HEIGHT: () => window.innerHeight * 0.5,
    CATEGORY_BAR_HEIGHT: 68,
    GRAB_BAR_TOUCH_TOLERANCE: 10
};

// ============================================================================
// STATE OBJECTS
// ============================================================================

// Wheel interaction state (THREE.js wheel canvas)
const wheelTouchState = {
    startDistance: 0,
    startPosition: { x: 0, y: 0 },
    isDragging: false,
    isDraggingBubble: false,
    draggedBubble: null,
    dragRadiusOffset: 0
};

// Info panel swipe/drag state
const infoPanelTouchState = {
    startX: 0,
    startY: 0,
    startedOnGrabBar: false
};

// Default panel swipe/drag state
const defaultPanelTouchState = {
    startY: 0,
    startedOnGrabBar: false
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getTouchDistance(touches) {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

function getTouchCenter(touches) {
    if (touches.length < 2) {
        return { x: touches[0].clientX, y: touches[0].clientY };
    }
    return {
        x: (touches[0].clientX + touches[1].clientX) / 2,
        y: (touches[0].clientY + touches[1].clientY) / 2
    };
}

/**
 * Check if a touch gesture is a tap (minimal movement)
 */
function isTapGesture(startX, startY, endX, endY, threshold = TOUCH_THRESHOLDS.TAP_MAX_DISTANCE) {
    const dx = Math.abs(endX - startX);
    const dy = Math.abs(endY - startY);
    return dx < threshold && dy < threshold;
}

/**
 * Analyze swipe gesture properties
 */
function analyzeSwipeGesture(deltaX, deltaY, minDelta = TOUCH_THRESHOLDS.SWIPE_MIN_DISTANCE, aspectRatio = TOUCH_THRESHOLDS.SWIPE_ASPECT_RATIO) {
    const isHorizontal = Math.abs(deltaX) > minDelta && Math.abs(deltaX) > Math.abs(deltaY) * aspectRatio;
    const isVertical = Math.abs(deltaY) > minDelta && Math.abs(deltaY) > Math.abs(deltaX) * aspectRatio;
    return {
        isHorizontal,
        isVertical,
        isSignificant: isHorizontal || isVertical,
        deltaX,
        deltaY
    };
}

/**
 * Check if touch target is a grab bar or within grab bar area
 */
function isTouchOnGrabBar(element, grabBarElementId) {
    const isElementGrabBar = element.closest('.grab-bar') !== null;
    if (isElementGrabBar) return true;
    
    const grabBar = document.getElementById(grabBarElementId);
    if (!grabBar) return false;
    
    const rect = grabBar.getBoundingClientRect();
    // This will be populated from the touchstart event
    return false; // Actual Y check done in the touch handler
}

// ============================================================================
// WHEEL TOUCH HANDLERS
// ============================================================================
// Dependencies: container, renderer, mouse, camera, raycaster, bubbles, CFG,
//               ringRadii, moveBubbleToRing, lockedBubble, hideInfoPanel, 
//               updateInfoPanel, rotationVelocity

container.addEventListener('touchstart', (e) => {
    // Don't prevent default for elements that need it (category buttons etc)
    if (e.target !== renderer.domElement) return;

    e.preventDefault();

    const touch = e.touches[0];
    mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;

    wheelTouchState.startPosition = { x: touch.clientX, y: touch.clientY };

    if (e.touches.length === 2) {
        // Pinch zoom start
        wheelTouchState.startDistance = getTouchDistance(e.touches);
    } else {
        // Single finger - check for bubble drag or rotation
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(bubbles);

        if (intersects.length > 0) {
            wheelTouchState.isDraggingBubble = true;
            wheelTouchState.draggedBubble = intersects[0].object;
            wheelTouchState.draggedBubble.userData.targetScale = CFG.DRAG_SCALE;

            // Calculate offset
            const vector = new THREE.Vector3(mouse.x, mouse.y, CFG.PROJECTION_Z);
            vector.unproject(camera);
            const dir = vector.sub(camera.position).normalize();
            const distance = -camera.position.z / dir.z;
            const clickPos = camera.position.clone().add(dir.multiplyScalar(distance));
            const clickRadius = Math.sqrt(clickPos.x * clickPos.x + clickPos.y * clickPos.y);
            const bubbleRadius = Math.sqrt(wheelTouchState.draggedBubble.position.x * wheelTouchState.draggedBubble.position.x + wheelTouchState.draggedBubble.position.y * wheelTouchState.draggedBubble.position.y);
            wheelTouchState.dragRadiusOffset = bubbleRadius - clickRadius;
        } else {
            wheelTouchState.isDragging = true;
        }
    }
}, { passive: false });

container.addEventListener('touchmove', (e) => {
    if (e.target !== renderer.domElement) return;
    e.preventDefault();

    if (e.touches.length === 2) {
        // Pinch zoom
        const newDistance = getTouchDistance(e.touches);
        if (wheelTouchState.startDistance > 0) {
            const delta = wheelTouchState.startDistance - newDistance;
            camera.position.z += delta * CFG.TOUCH_ZOOM_SENSITIVITY;
            camera.position.z = Math.max(CFG.CAMERA_Z_MIN, Math.min(CFG.CAMERA_Z_MAX, camera.position.z));
        }
        wheelTouchState.startDistance = newDistance;
    } else if (e.touches.length === 1) {
        const touch = e.touches[0];
        mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;

        if (wheelTouchState.isDraggingBubble && wheelTouchState.draggedBubble) {
            // Drag bubble between rings
            const vector = new THREE.Vector3(mouse.x, mouse.y, CFG.PROJECTION_Z);
            vector.unproject(camera);
            const dir = vector.sub(camera.position).normalize();
            const distance = -camera.position.z / dir.z;
            const pos = camera.position.clone().add(dir.multiplyScalar(distance));

            const currentDist = Math.sqrt(pos.x * pos.x + pos.y * pos.y) + wheelTouchState.dragRadiusOffset;
            const clampedDist = Math.max(ringRadii.inner - CFG.RING_PADDING, Math.min(ringRadii.outer + CFG.RING_PADDING, currentDist));
            const angle = wheelTouchState.draggedBubble.userData.angle;

            wheelTouchState.draggedBubble.position.x = Math.cos(angle) * clampedDist;
            wheelTouchState.draggedBubble.position.y = Math.sin(angle) * clampedDist;
        } else if (wheelTouchState.isDragging) {
            // Rotate wheel
            const deltaMove = {
                x: touch.clientX - wheelTouchState.startPosition.x,
                y: touch.clientY - wheelTouchState.startPosition.y
            };
            rotationVelocity.x = deltaMove.y * CFG.TOUCH_ROTATION_SENSITIVITY;
            rotationVelocity.y = -deltaMove.x * CFG.TOUCH_ROTATION_SENSITIVITY;
            wheelTouchState.startPosition = { x: touch.clientX, y: touch.clientY };
        }
    }
}, { passive: false });

container.addEventListener('touchend', (e) => {
    if (wheelTouchState.isDraggingBubble && wheelTouchState.draggedBubble) {
        // Snap bubble to nearest ring
        const pos = wheelTouchState.draggedBubble.position;
        const dist = Math.sqrt(pos.x * pos.x + pos.y * pos.y);

        let targetRing = 'inner';
        if (dist > (ringRadii.inner + ringRadii.middle) / 2) {
            if (dist > (ringRadii.middle + ringRadii.outer) / 2) {
                targetRing = 'outer';
            } else {
                targetRing = 'middle';
            }
        }

        moveBubbleToRing(wheelTouchState.draggedBubble, targetRing);
        wheelTouchState.draggedBubble.userData.targetScale = CFG.DEFAULT_SCALE;

        // If it was a tap (not much movement), select the bubble
        if (e.changedTouches.length > 0) {
            const touch = e.changedTouches[0];
            if (isTapGesture(wheelTouchState.startPosition.x, wheelTouchState.startPosition.y, touch.clientX, touch.clientY)) {
                // It was a tap
                if (lockedBubble === wheelTouchState.draggedBubble) {
                    lockedBubble = null;
                    hideInfoPanel();
                } else {
                    lockedBubble = wheelTouchState.draggedBubble;
                    updateInfoPanel(wheelTouchState.draggedBubble);
                }
            }
        }

        wheelTouchState.draggedBubble = null;
    } else if (wheelTouchState.isDragging && e.changedTouches.length > 0) {
        // Check if it was a tap to deselect
        const touch = e.changedTouches[0];
        if (isTapGesture(wheelTouchState.startPosition.x, wheelTouchState.startPosition.y, touch.clientX, touch.clientY)) {
            // Close mobile info panel if open
            const mobilePanel = document.getElementById('default-panel');
            const burger = document.getElementById('burger-menu');
            if (mobilePanel.classList.contains('visible')) {
                mobilePanel.classList.remove('visible');
                burger.classList.remove('active');
            }
            hideInfoPanel();

            // Check if tap was on a bubble to deselect
            if (lockedBubble) {
                mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
                mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
                raycaster.setFromCamera(mouse, camera);
                const intersects = raycaster.intersectObjects(bubbles);

                if (intersects.length === 0) {
                    lockedBubble = null;
                    hideInfoPanel();
                }
            }
        }
    }

    wheelTouchState.isDragging = false;
    wheelTouchState.isDraggingBubble = false;
    wheelTouchState.startDistance = 0;
});

// ============================================================================
// MOBILE PANEL TOUCH HANDLERS
// ============================================================================

// Mobile burger menu toggle
const burgerMenu = document.getElementById('burger-menu');
const defaultPanel = document.getElementById('default-panel');
const infoPanel = document.getElementById('info-panel');

burgerMenu.addEventListener('click', (e) => {
    e.stopPropagation();
    defaultPanel.classList.toggle('visible');
    burgerMenu.classList.toggle('active');
    infoPanel.classList.remove('visible');
});

// Close mobile info panel when tapping outside
document.addEventListener('click', (e) => {
    if (defaultPanel.classList.contains('visible') &&
        !defaultPanel.contains(e.target) &&
        !burgerMenu.contains(e.target)) {
        defaultPanel.classList.remove('visible');
        burgerMenu.classList.remove('active');
    }
});

// ============================================================================
// INFO PANEL SWIPE HANDLERS
// ============================================================================

infoPanel.addEventListener('touchstart', (e) => {
    if (e.touches.length === 0) return;
    infoPanelTouchState.startX = e.touches[0].clientX;
    infoPanelTouchState.startY = e.touches[0].clientY;
    
    // Check if touch started on grab bar
    const grabBar = document.getElementById('info-panel-grab-bar');
    infoPanelTouchState.startedOnGrabBar = 
        e.target.closest('.grab-bar') !== null ||
        (grabBar && e.touches[0].clientY <= grabBar.getBoundingClientRect().bottom);
}, { passive: true });

infoPanel.addEventListener('touchend', (e) => {
    // Skip swipe handling if touch started on grab bar (handled separately)
    if (infoPanelTouchState.startedOnGrabBar) {
        infoPanelTouchState.startedOnGrabBar = false;
        return;
    }

    if (!lockedBubble || e.changedTouches.length === 0) return;

    const deltaX = e.changedTouches[0].clientX - infoPanelTouchState.startX;
    const deltaY = e.changedTouches[0].clientY - infoPanelTouchState.startY;

    const swipe = analyzeSwipeGesture(deltaX, deltaY);

    // Horizontal swipe for prev/next navigation
    if (swipe.isHorizontal) {
        if (deltaX > 0) {
            navigateToBubble(-1);
        } else {
            navigateToBubble(1);
        }
    }

    // Vertical swipe down to dismiss (when scrolled to top AND at minimum height)
    const minHeight = MOBILE_LAYOUT.MIN_PANEL_HEIGHT();
    const isAtMinHeight = infoPanel.offsetHeight <= minHeight + 10;
    if (swipe.isVertical && deltaY > 0 && infoPanel.scrollTop <= 0 && isAtMinHeight) {
        lockedBubble = null;
        hideInfoPanel();
        infoPanel.classList.remove('expanded');
        infoPanel.style.height = '';
    }

    // Vertical swipe up to expand (when scrolled to bottom)
    const isAtBottom = infoPanel.scrollHeight - infoPanel.scrollTop <= infoPanel.clientHeight + 5;
    if (swipe.isVertical && deltaY < 0 && isAtBottom) {
        infoPanel.classList.add('expanded');
    }
}, { passive: true });

// ============================================================================
// DEFAULT PANEL SWIPE HANDLERS
// ============================================================================

defaultPanel.addEventListener('touchstart', (e) => {
    defaultPanelTouchState.startY = e.touches[0].clientY;
    defaultPanelTouchState.startedOnGrabBar = e.target.closest('.grab-bar') !== null;
}, { passive: true });

defaultPanel.addEventListener('touchend', (e) => {
    // Skip swipe handling if touch started on grab bar (handled separately)
    if (defaultPanelTouchState.startedOnGrabBar) {
        defaultPanelTouchState.startedOnGrabBar = false;
        return;
    }

    if (e.changedTouches.length === 0) return;

    const deltaY = e.changedTouches[0].clientY - defaultPanelTouchState.startY;

    // Swipe down to dismiss (when scrolled to top AND at minimum height)
    const minHeight = MOBILE_LAYOUT.MIN_PANEL_HEIGHT();
    const isAtMinHeight = defaultPanel.offsetHeight <= minHeight + 10;
    if (deltaY > TOUCH_THRESHOLDS.SWIPE_MIN_DISTANCE && defaultPanel.scrollTop <= 0 && isAtMinHeight) {
        defaultPanel.classList.remove('visible');
        burgerMenu.classList.remove('active');
        defaultPanel.style.height = '';
    }
}, { passive: true });

// ============================================================================
// GRAB BAR HANDLERS
// ============================================================================

/**
 * Set up grab bar drag/dismiss handlers for a mobile panel
 */
function setupGrabBarHandlers(grabBar, panel, onDismiss) {
    if (!grabBar) return;

    let isDragging = false;
    let dragStartY = 0;
    let startHeight = 0;

    // Ensure grab bar can receive touch events
    grabBar.style.pointerEvents = 'auto';
    grabBar.style.touchAction = 'none';

    const handleTouchStart = (e) => {
        if (e.touches.length === 0) return;
        e.preventDefault();
        e.stopPropagation();
        isDragging = true;
        dragStartY = e.touches[0].clientY;
        startHeight = panel.offsetHeight;
        panel.style.transition = 'none';
    };

    const handleTouchMove = (e) => {
        if (!isDragging || e.touches.length === 0) return;
        e.preventDefault();
        e.stopPropagation();

        const deltaY = dragStartY - e.touches[0].clientY;
        const minHeight = MOBILE_LAYOUT.MIN_PANEL_HEIGHT();
        const maxHeight = window.innerHeight - MOBILE_LAYOUT.CATEGORY_BAR_HEIGHT;
        const newHeight = Math.max(minHeight, Math.min(maxHeight, startHeight + deltaY));
        panel.style.height = newHeight + 'px';
    };

    const handleTouchEnd = (e) => {
        if (!isDragging || e.changedTouches.length === 0) return;
        e.stopPropagation();
        isDragging = false;
        panel.style.transition = '';

        const touchEndY = e.changedTouches[0].clientY;
        const deltaY = touchEndY - dragStartY;
        const totalDrag = Math.abs(deltaY);

        // If it was a tap (minimal movement), dismiss
        if (totalDrag < TOUCH_THRESHOLDS.TAP_MAX_DISTANCE) {
            onDismiss();
            panel.style.height = '';
        }
        // Otherwise keep the new height from dragging
    };

    // Use capture phase to ensure we intercept touches before parent elements
    grabBar.addEventListener('touchstart', handleTouchStart, { passive: false, capture: true });
    grabBar.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true });
    grabBar.addEventListener('touchend', handleTouchEnd, { passive: true, capture: true });
}

// Set up grab bar for bubble info panel
setupGrabBarHandlers(
    document.getElementById('info-panel-grab-bar'),
    infoPanel,
    () => {
        lockedBubble = null;
        hideInfoPanel();
        infoPanel.classList.remove('expanded');
    }
);

// Set up grab bar for mobile info panel (How to Use)
setupGrabBarHandlers(
    document.getElementById('mobile-panel-grab-bar'),
    defaultPanel,
    () => {
        defaultPanel.classList.remove('visible');
        burgerMenu.classList.remove('active');
    }
);
