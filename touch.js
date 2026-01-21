// Touch event handlers for mobile
// This file handles all touch interactions for the Academic Wheel of Privilege

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
function isTapGesture(startX, startY, endX, endY, threshold = CFG.TOUCH_THRESHOLDS.TAP_MAX_DISTANCE) {
    const dx = Math.abs(endX - startX);
    const dy = Math.abs(endY - startY);
    return dx < threshold && dy < threshold;
}

/**
 * Analyze swipe gesture properties
 */
function analyzeSwipeGesture(deltaX, deltaY, minDelta = CFG.TOUCH_THRESHOLDS.SWIPE_MIN_DISTANCE, aspectRatio = CFG.TOUCH_THRESHOLDS.SWIPE_ASPECT_RATIO) {
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
 * Convert touch coordinates to normalized screen coordinates (-1 to 1)
 */
function getTouchScreenCoordinates(touch) {
    return {
        x: (touch.clientX / window.innerWidth) * 2 - 1,
        y: -(touch.clientY / window.innerHeight) * 2 + 1
    };
}

/**
 * Get world position from screen coordinates via raycaster unprojection
 */
function getWorldPositionFromScreenCoords(screenX, screenY, camera, projectionZ = CFG.PROJECTION_Z) {
    const vector = new THREE.Vector3(screenX, screenY, projectionZ);
    vector.unproject(camera);
    const dir = vector.sub(camera.position).normalize();
    const distance = -camera.position.z / dir.z;
    return camera.position.clone().add(dir.multiplyScalar(distance));
}

/**
 * Calculate distance from origin
 */
function getDistanceFromOrigin(x, y) {
    return Math.sqrt(x * x + y * y);
}

/**
 * Detect if touch started on a grab bar element
 */
function detectGrabBarTouch(touchEvent, grabBarId) {
    // Check if the target element or its ancestor is a grab bar
    if (touchEvent.target.closest('.grab-bar') !== null) {
        return true;
    }
    
    // Also check if touch is within the grab bar's Y bounds (for real mobile where event target may not be grab bar)
    if (touchEvent.touches.length === 0) return false;
    
    const grabBar = document.getElementById(grabBarId);
    if (!grabBar) return false;
    
    const rect = grabBar.getBoundingClientRect();
    return touchEvent.touches[0].clientY <= rect.bottom;
}

/**
 * Get minimum panel height (50% of viewport height)
 */
function getMinPanelHeight() {
    return window.innerHeight * 0.5;
}

/**
 * Check if panel is at minimum height (within tolerance)
 */
function isAtMinHeight(panel, minHeight = getMinPanelHeight()) {
    return panel.offsetHeight <= minHeight + 10; // 10px tolerance
}

/**
 * Check if panel is scrolled to bottom
 */
function isAtBottom(panel) {
    return panel.scrollHeight - panel.scrollTop <= panel.clientHeight + 5;
}

/**
 * Check if panel is scrolled to top
 */
function isAtTop(panel) {
    return panel.scrollTop <= 0;
}

/**
 * Dismiss a panel (remove visible state and reset height)
 */
function dismissPanel(panel, toggleElement = null) {
    panel.classList.remove('visible');
    panel.style.height = '';
    if (toggleElement) {
        toggleElement.classList.remove('active');
    }
}

/**
 * Handle vertical swipe on info panel (dismiss or expand)
 */
function handleInfoPanelVerticalSwipe(deltaY, panel) {
    const minHeight = getMinPanelHeight();
    
    // Swipe down to dismiss (when at minimum height and scrolled to top)
    if (deltaY > 0 && isAtMinHeight(panel, minHeight) && isAtTop(panel)) {
        lockedBubble = null;
        hideInfoPanel();
        panel.classList.remove('expanded');
        panel.style.height = '';
        return;
    }

    // Swipe up to expand (when scrolled to bottom)
    if (deltaY < 0 && isAtBottom(panel)) {
        panel.classList.add('expanded');
    }
}

/**
 * Handle vertical swipe on default panel (dismiss)
 */
function handleDefaultPanelVerticalSwipe(deltaY, panel, toggleElement) {
    const minHeight = getMinPanelHeight();
    
    // Swipe down to dismiss (when at minimum height and scrolled to top)
    if (deltaY > 0 && isAtMinHeight(panel, minHeight) && isAtTop(panel)) {
        dismissPanel(panel, toggleElement);
    }
}

/**
 * Determine which ring a bubble should snap to based on distance
 */
function determineTargetRing(distance) {
    if (distance > (ringRadii.inner + ringRadii.middle) / 2) {
        if (distance > (ringRadii.middle + ringRadii.outer) / 2) {
            return 'outer';
        }
        return 'middle';
    }
    return 'inner';
}

/**
 * Handle bubble drag end: snap to ring and select if tapped
 */
function handleBubbleDragEnd(bubble, touch, startPosition) {
    const dist = getDistanceFromOrigin(bubble.position.x, bubble.position.y);
    const targetRing = determineTargetRing(dist);
    
    moveBubbleToRing(bubble, targetRing);
    bubble.userData.targetScale = CFG.DEFAULT_SCALE;

    // If it was a tap (not much movement), toggle selection
    if (isTapGesture(startPosition.x, startPosition.y, touch.clientX, touch.clientY)) {
        if (lockedBubble === bubble) {
            lockedBubble = null;
            hideInfoPanel();
        } else {
            lockedBubble = bubble;
            updateInfoPanel(bubble);
        }
    }
}

/**
 * Handle wheel rotation end: close panels and deselect on tap
 */
function handleWheelRotationEnd(touch, startPosition) {
    if (!isTapGesture(startPosition.x, startPosition.y, touch.clientX, touch.clientY)) {
        return;
    }

    // Close mobile panels if open
    const mobilePanel = document.getElementById('default-panel');
    const burger = document.getElementById('burger-menu');
    if (mobilePanel.classList.contains('visible')) {
        mobilePanel.classList.remove('visible');
        burger.classList.remove('active');
    }
    hideInfoPanel();

    // Check if tap was on a bubble to deselect
    if (!lockedBubble) return;

    const coords = getTouchScreenCoordinates(touch);
    mouse.x = coords.x;
    mouse.y = coords.y;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(bubbles);

    if (intersects.length === 0) {
        lockedBubble = null;
        hideInfoPanel();
    }
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
    const coords = getTouchScreenCoordinates(touch);
    mouse.x = coords.x;
    mouse.y = coords.y;

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

            // Calculate offset between click point and bubble center
            const clickPos = getWorldPositionFromScreenCoords(mouse.x, mouse.y, camera);
            const clickRadius = getDistanceFromOrigin(clickPos.x, clickPos.y);
            const bubbleRadius = getDistanceFromOrigin(
                wheelTouchState.draggedBubble.position.x,
                wheelTouchState.draggedBubble.position.y
            );
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
        const coords = getTouchScreenCoordinates(touch);
        mouse.x = coords.x;
        mouse.y = coords.y;

        if (wheelTouchState.isDraggingBubble && wheelTouchState.draggedBubble) {
            // Drag bubble between rings
            const pos = getWorldPositionFromScreenCoords(mouse.x, mouse.y, camera);
            const currentDist = getDistanceFromOrigin(pos.x, pos.y) + wheelTouchState.dragRadiusOffset;
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
        if (e.changedTouches.length > 0) {
            handleBubbleDragEnd(wheelTouchState.draggedBubble, e.changedTouches[0], wheelTouchState.startPosition);
        }
        wheelTouchState.draggedBubble = null;
    } else if (wheelTouchState.isDragging && e.changedTouches.length > 0) {
        handleWheelRotationEnd(e.changedTouches[0], wheelTouchState.startPosition);
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
    infoPanelTouchState.startedOnGrabBar = detectGrabBarTouch(e, 'info-panel-grab-bar');
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
        navigateToBubble(deltaX > 0 ? -1 : 1);
    }

    // Vertical swipe handling
    if (swipe.isVertical) {
        handleInfoPanelVerticalSwipe(deltaY, infoPanel);
    }
}, { passive: true });

// ============================================================================
// DEFAULT PANEL SWIPE HANDLERS
// ============================================================================

defaultPanel.addEventListener('touchstart', (e) => {
    if (e.touches.length === 0) return;
    defaultPanelTouchState.startY = e.touches[0].clientY;
    defaultPanelTouchState.startedOnGrabBar = detectGrabBarTouch(e, 'mobile-panel-grab-bar');
}, { passive: true });

defaultPanel.addEventListener('touchend', (e) => {
    // Skip swipe handling if touch started on grab bar (handled separately)
    if (defaultPanelTouchState.startedOnGrabBar) {
        defaultPanelTouchState.startedOnGrabBar = false;
        return;
    }

    if (e.changedTouches.length === 0) return;

    const deltaY = e.changedTouches[0].clientY - defaultPanelTouchState.startY;

    // Only handle if swipe is significant
    if (Math.abs(deltaY) > CFG.TOUCH_THRESHOLDS.SWIPE_MIN_DISTANCE) {
        handleDefaultPanelVerticalSwipe(deltaY, defaultPanel, burgerMenu);
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
        const minHeight = getMinPanelHeight();
        const maxHeight = window.innerHeight - CFG.MOBILE_LAYOUT.CATEGORY_BAR_HEIGHT;
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
        if (totalDrag < CFG.TOUCH_THRESHOLDS.TAP_MAX_DISTANCE) {
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
