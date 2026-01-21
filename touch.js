// Touch event handlers for mobile
// This file handles all touch interactions for the Academic Wheel of Privilege

// Touch state variables for wheel interaction
let touchStartDistance = 0;
let touchStartPosition = { x: 0, y: 0 };
let isTouchDragging = false;
let isTouchDraggingBubble = false;
let touchDraggedBubble = null;
let touchDragRadiusOffset = 0;

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

// Wheel touch handlers (requires: container, renderer, mouse, camera, raycaster, bubbles, CFG, ringRadii, moveBubbleToRing, lockedBubble, hideInfoPanel, updateInfoPanel, rotationVelocity)
container.addEventListener('touchstart', (e) => {
    // Don't prevent default for elements that need it (category buttons etc)
    if (e.target !== renderer.domElement) return;

    e.preventDefault();

    const touch = e.touches[0];
    mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;

    touchStartPosition = { x: touch.clientX, y: touch.clientY };

    if (e.touches.length === 2) {
        // Pinch zoom start
        touchStartDistance = getTouchDistance(e.touches);
    } else {
        // Single finger - check for bubble drag or rotation
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(bubbles);

        if (intersects.length > 0) {
            isTouchDraggingBubble = true;
            touchDraggedBubble = intersects[0].object;
            touchDraggedBubble.userData.targetScale = CFG.DRAG_SCALE;

            // Calculate offset
            const vector = new THREE.Vector3(mouse.x, mouse.y, CFG.PROJECTION_Z);
            vector.unproject(camera);
            const dir = vector.sub(camera.position).normalize();
            const distance = -camera.position.z / dir.z;
            const clickPos = camera.position.clone().add(dir.multiplyScalar(distance));
            const clickRadius = Math.sqrt(clickPos.x * clickPos.x + clickPos.y * clickPos.y);
            const bubbleRadius = Math.sqrt(touchDraggedBubble.position.x * touchDraggedBubble.position.x + touchDraggedBubble.position.y * touchDraggedBubble.position.y);
            touchDragRadiusOffset = bubbleRadius - clickRadius;
        } else {
            isTouchDragging = true;
        }
    }
}, { passive: false });

container.addEventListener('touchmove', (e) => {
    if (e.target !== renderer.domElement) return;
    e.preventDefault();

    if (e.touches.length === 2) {
        // Pinch zoom
        const newDistance = getTouchDistance(e.touches);
        if (touchStartDistance > 0) {
            const delta = touchStartDistance - newDistance;
            camera.position.z += delta * CFG.TOUCH_ZOOM_SENSITIVITY;
            camera.position.z = Math.max(CFG.CAMERA_Z_MIN, Math.min(CFG.CAMERA_Z_MAX, camera.position.z));
        }
        touchStartDistance = newDistance;
    } else if (e.touches.length === 1) {
        const touch = e.touches[0];
        mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;

        if (isTouchDraggingBubble && touchDraggedBubble) {
            // Drag bubble between rings
            const vector = new THREE.Vector3(mouse.x, mouse.y, CFG.PROJECTION_Z);
            vector.unproject(camera);
            const dir = vector.sub(camera.position).normalize();
            const distance = -camera.position.z / dir.z;
            const pos = camera.position.clone().add(dir.multiplyScalar(distance));

            const currentDist = Math.sqrt(pos.x * pos.x + pos.y * pos.y) + touchDragRadiusOffset;
            const clampedDist = Math.max(ringRadii.inner - CFG.RING_PADDING, Math.min(ringRadii.outer + CFG.RING_PADDING, currentDist));
            const angle = touchDraggedBubble.userData.angle;

            touchDraggedBubble.position.x = Math.cos(angle) * clampedDist;
            touchDraggedBubble.position.y = Math.sin(angle) * clampedDist;
        } else if (isTouchDragging) {
            // Rotate wheel
            const deltaMove = {
                x: touch.clientX - touchStartPosition.x,
                y: touch.clientY - touchStartPosition.y
            };
            rotationVelocity.x = deltaMove.y * CFG.TOUCH_ROTATION_SENSITIVITY;
            rotationVelocity.y = -deltaMove.x * CFG.TOUCH_ROTATION_SENSITIVITY;
            touchStartPosition = { x: touch.clientX, y: touch.clientY };
        }
    }
}, { passive: false });

container.addEventListener('touchend', (e) => {
    if (isTouchDraggingBubble && touchDraggedBubble) {
        // Snap bubble to nearest ring
        const pos = touchDraggedBubble.position;
        const dist = Math.sqrt(pos.x * pos.x + pos.y * pos.y);

        let targetRing = 'inner';
        if (dist > (ringRadii.inner + ringRadii.middle) / 2) {
            if (dist > (ringRadii.middle + ringRadii.outer) / 2) {
                targetRing = 'outer';
            } else {
                targetRing = 'middle';
            }
        }

        moveBubbleToRing(touchDraggedBubble, targetRing);
        touchDraggedBubble.userData.targetScale = CFG.DEFAULT_SCALE;

        // If it was a tap (not much movement), select the bubble
        if (e.changedTouches.length > 0) {
            const touch = e.changedTouches[0];
            const dx = Math.abs(touch.clientX - touchStartPosition.x);
            const dy = Math.abs(touch.clientY - touchStartPosition.y);
            if (dx < 10 && dy < 10) {
                // It was a tap
                if (lockedBubble === touchDraggedBubble) {
                    lockedBubble = null;
                    hideInfoPanel();
                } else {
                    lockedBubble = touchDraggedBubble;
                    updateInfoPanel(touchDraggedBubble);
                }
            }
        }

        touchDraggedBubble = null;
    } else if (isTouchDragging && e.changedTouches.length > 0) {
        // Check if it was a tap to deselect
        const touch = e.changedTouches[0];
        const dx = Math.abs(touch.clientX - touchStartPosition.x);
        const dy = Math.abs(touch.clientY - touchStartPosition.y);
        if (dx < 10 && dy < 10) {
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

    isTouchDragging = false;
    isTouchDraggingBubble = false;
    touchStartDistance = 0;
});

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

// Swipe left/right on info panel for prev/next navigation
let infoPanelTouchStartX = 0;
let infoPanelTouchStartY = 0;
let infoPanelTouchStartedOnGrabBar = false;

infoPanel.addEventListener('touchstart', (e) => {
    infoPanelTouchStartX = e.touches[0].clientX;
    infoPanelTouchStartY = e.touches[0].clientY;
    // Check if touch started on grab bar
    infoPanelTouchStartedOnGrabBar = e.target.closest('.grab-bar') !== null;
}, { passive: true });

infoPanel.addEventListener('touchend', (e) => {
    // Skip swipe handling if touch started on grab bar (handled separately)
    if (infoPanelTouchStartedOnGrabBar) {
        infoPanelTouchStartedOnGrabBar = false;
        return;
    }

    if (!lockedBubble || e.changedTouches.length === 0) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - infoPanelTouchStartX;
    const deltaY = touchEndY - infoPanelTouchStartY;

    // Only trigger if horizontal swipe is dominant and significant
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
        if (deltaX > 0) {
            // Swipe right = previous
            navigateToBubble(-1);
        } else {
            // Swipe left = next
            navigateToBubble(1);
        }
    }

    // Swipe down to dismiss (when scrolled to top AND at minimum height)
    const minHeight = window.innerHeight * 0.5;
    const isAtMinHeight = infoPanel.offsetHeight <= minHeight + 10; // 10px tolerance
    if (deltaY > 50 && Math.abs(deltaY) > Math.abs(deltaX) * 1.5 && infoPanel.scrollTop <= 0 && isAtMinHeight) {
        lockedBubble = null;
        hideInfoPanel();
        infoPanel.classList.remove('expanded');
        infoPanel.style.height = '';
    }

    // Swipe up to expand (when scrolled to bottom)
    const isAtBottom = infoPanel.scrollHeight - infoPanel.scrollTop <= infoPanel.clientHeight + 5;
    if (deltaY < -50 && Math.abs(deltaY) > Math.abs(deltaX) * 1.5 && isAtBottom) {
        infoPanel.classList.add('expanded');
    }
}, { passive: true });

// Mobile info panel (How to Use) swipe/drag handlers
let mobilePanelTouchStartY = 0;
let mobilePanelTouchStartedOnGrabBar = false;

defaultPanel.addEventListener('touchstart', (e) => {
    mobilePanelTouchStartY = e.touches[0].clientY;
    // Check if touch started on grab bar
    mobilePanelTouchStartedOnGrabBar = e.target.closest('.grab-bar') !== null;
}, { passive: true });

defaultPanel.addEventListener('touchend', (e) => {
    // Skip swipe handling if touch started on grab bar (handled separately)
    if (mobilePanelTouchStartedOnGrabBar) {
        mobilePanelTouchStartedOnGrabBar = false;
        return;
    }

    if (e.changedTouches.length === 0) return;

    const touchEndY = e.changedTouches[0].clientY;
    const deltaY = touchEndY - mobilePanelTouchStartY;

    // Swipe down to dismiss (when scrolled to top AND at minimum height)
    const minHeight = window.innerHeight * 0.5;
    const isAtMinHeight = defaultPanel.offsetHeight <= minHeight + 10; // 10px tolerance
    if (deltaY > 50 && defaultPanel.scrollTop <= 0 && isAtMinHeight) {
        defaultPanel.classList.remove('visible');
        burgerMenu.classList.remove('active');
        defaultPanel.style.height = '';
    }
}, { passive: true });

// Shared grab bar handler factory for mobile flyouts
function setupGrabBarHandlers(grabBar, panel, onDismiss) {
    if (!grabBar) return;

    let isDragging = false;
    let dragStartY = 0;
    let startHeight = 0;

    grabBar.addEventListener('touchstart', (e) => {
        e.preventDefault();
        isDragging = true;
        dragStartY = e.touches[0].clientY;
        startHeight = panel.offsetHeight;
        panel.style.transition = 'none';
    }, { passive: false });

    grabBar.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        e.preventDefault();

        const deltaY = dragStartY - e.touches[0].clientY;
        const newHeight = Math.max(window.innerHeight * 0.5, Math.min(window.innerHeight - 68, startHeight + deltaY));
        panel.style.height = newHeight + 'px';
    }, { passive: false });

    grabBar.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        isDragging = false;
        panel.style.transition = '';

        const touchEndY = e.changedTouches[0].clientY;
        const deltaY = touchEndY - dragStartY;
        const totalDrag = Math.abs(deltaY);

        // If it was a tap (minimal movement), dismiss
        if (totalDrag < 10) {
            onDismiss();
            panel.style.height = '';
        }
        // Otherwise keep the new height from dragging
    });
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
